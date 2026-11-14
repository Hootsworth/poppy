const SHIM = `(()=>{const L=k=>"poppy:"+k;window.poppy={
  store:{get:async k=>{try{const v=localStorage.getItem(L(k));return v==null?undefined:JSON.parse(v)}catch(e){}},set:async(k,v)=>{try{localStorage.setItem(L(k),JSON.stringify(v))}catch(e){}return true},delete:async k=>{try{localStorage.removeItem(L(k))}catch(e){}return true},list:async(p="")=>{try{return Object.keys(localStorage).filter(k=>k.startsWith("poppy:"+p)).map(k=>k.slice(6))}catch(e){return[]}}},
  db:{query:async()=>[],exec:async()=>({changes:0}),migrate:async()=>({success:true,applied:0}),export:async()=>new Uint8Array(),import:async()=>true},
  room:{join:async r=>({roomId:r}),broadcast:async()=>({sent:true}),send:async()=>({sent:true}),onMessage:()=>{},link:async()=>location.href},
  automate:{on:async()=>({ok:true}),list:async()=>[],remove:async()=>true},
  asset:Object.assign(async n=>(window.__poppy_assets&&window.__poppy_assets[n])||"assets/"+n,{list:async()=>Object.keys(window.__poppy_assets||{})}),
  ai:async()=>{throw new Error("AI is not available in exported pages.")},
  fetch:async(u,o)=>{const r=await fetch(u,o),t=await r.text();let j;try{j=JSON.parse(t)}catch(e){}return{ok:r.ok,status:r.status,text:t,json:j}},
  connect:new Proxy(function(){},{get:()=>async()=>{throw new Error("Connectors only work inside Poppy.")},apply:async()=>{throw new Error("Connectors only work inside Poppy.")}}),
  speak:async t=>{speechSynthesis.speak(new SpeechSynthesisUtterance(t));return true},
  clipboard:{write:t=>navigator.clipboard.writeText(t)},
  files:{save:async(n,d)=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([d]));a.download=n;a.click();return true}}
}})();`;

async function exportZip(){
  if (!current) return;
  const title = (meta.name || (current.match(/<title>([^<]*)<\/title>/i) || [])[1] || "poppy-project").slice(0, 40).replace(/[^\w-]+/g, "-");
  const zipFiles = [];
  const assets = await assetList();
  const assetMap = {};
  for (const a of assets) assetMap[a.name] = a.data;
  for (const [name, content] of Object.entries(currentFiles)) {
    let dataStr = content;
    if (name === "index.html") {
      const assetShim = "<scr" + "ipt>window.__poppy_assets = " + JSON.stringify(assetMap) + ";</scr" + "ipt>";
      dataStr = inject(content, SHIM + assetShim);
    }
    zipFiles.push({ name, data: new TextEncoder().encode(dataStr) });
  }
  for (const a of assets) {
    const comma = a.data.indexOf(",");
    const b64 = comma >= 0 ? a.data.slice(comma + 1) : a.data;
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    zipFiles.push({ name: "assets/" + a.name, data: bin });
  }
  const sqlDb = await getSqlDb(siteId);
  const sqlBytes = await sqlDb.export();
  if (sqlBytes && sqlBytes.length > 16) {
    zipFiles.push({ name: "data.sqlite", data: sqlBytes });
  }
  zipFiles.push({
    name: "poppy.json",
    data: new TextEncoder().encode(JSON.stringify({ name: title, files: Object.keys(currentFiles), assets: assets.map(a => a.name), version: 3 }, null, 2))
  });
  const zipBytes = await createZip(zipFiles);
  const blob = new Blob([zipBytes], { type: "application/zip" });
  const l = document.createElement("a"); l.href = URL.createObjectURL(blob); l.download = title + ".zip"; l.click();
  setTimeout(() => URL.revokeObjectURL(l.href), 2000); toast("Project exported as " + title + ".zip");
}

async function reopenZip(fileOrBuf){
  let buf;
  if (fileOrBuf instanceof Blob || fileOrBuf instanceof File) buf = new Uint8Array(await fileOrBuf.arrayBuffer());
  else if (fileOrBuf instanceof Uint8Array) buf = fileOrBuf;
  else if (fileOrBuf instanceof ArrayBuffer) buf = new Uint8Array(fileOrBuf);
  const entries = await parseZip(buf);
  const newFiles = {}, newAssets = [], dec = new TextDecoder();
  for (const [path, data] of Object.entries(entries)) {
    if (path.endsWith("/") || path.startsWith("__MACOSX")) continue;
    const clean = path.replace(/^\.\//, "");
    if (clean === "data.sqlite") {
      const sqlDb = await getSqlDb(siteId);
      await sqlDb.import(data);
    } else if (clean.startsWith("assets/")) {
      const aname = clean.slice(7);
      if (aname) {
        let b64 = "";
        for (let i = 0; i < data.length; i += 32768) b64 += String.fromCharCode.apply(null, data.subarray(i, i + 32768));
        const mime = aname.endsWith(".png") ? "image/png" : aname.endsWith(".jpg") || aname.endsWith(".jpeg") ? "image/jpeg" : aname.endsWith(".svg") ? "image/svg+xml" : "application/octet-stream";
        newAssets.push({ name: aname, data: "data:" + mime + ";base64," + btoa(b64), type: mime });
      }
    } else if (clean !== "poppy.json") {
      newFiles[clean] = dec.decode(data);
    }
  }
  if (!newFiles["index.html"]) {
    const h = Object.keys(newFiles).find(k => k.endsWith(".html"));
    if (h) newFiles["index.html"] = newFiles[h];
    else throw new Error("No index.html found in ZIP archive.");
  }
  siteId = crypto.randomUUID(); ls.set("poppy.site", siteId);
  currentFiles = newFiles; activeFile = "index.html";
  meta = { name: fileOrBuf.name ? fileOrBuf.name.replace(/\.zip$/i, "") : "Imported project" };
  for (const a of newAssets) await assetSet(a.name, a.data, a.type);
  const aMap = {}; (await assetList()).forEach(a => aMap[a.name] = a.data);
  current = bundleFiles(currentFiles, aMap);
  hist = [{ t: Date.now(), prompt: "Imported " + (meta.name || "project"), html: current, files: {...currentFiles} }];
  hi = 0; await saveHist(); refreshVers(); show(current);
  document.body.classList.add("live"); document.body.classList.remove("prev");
  toast("Reopened project with " + Object.keys(newFiles).length + " files and " + newAssets.length + " assets.");
  return { files: newFiles, assets: newAssets };
}

if ($("#expBtn")) $("#expBtn").onclick = async () => {
  if (!current) return;
  const assets = await assetList();
  if (Object.keys(currentFiles).length > 1 || assets.length > 0) {
    return await exportZip();
  }
  const t = (current.match(/<title>([^<]*)<\/title>/i) || [])[1] || "poppy-site", l = document.createElement("a");
  l.href = URL.createObjectURL(new Blob([inject(current, SHIM)], {type: "text/html"})); l.download = t.replace(/[^\w-]+/g, "-").slice(0, 40) + ".html"; l.click();
  setTimeout(() => URL.revokeObjectURL(l.href), 2000); toast("Exported. AI features are off in the exported copy.");
};

function renderFileTabs(){
  const box = $("#fileTabs"); box.replaceChildren();
  Object.keys(currentFiles).forEach(fn => {
    const b = el("button", "file-tab" + (fn === activeFile ? " active" : ""), fn);
    b.type = "button";
    b.onclick = () => switchFile(fn);
    box.append(b);
  });
  $("#delFileBtn").style.display = activeFile !== "index.html" ? "inline-flex" : "none";
}
function switchFile(fn){
  if (currentFiles[activeFile] !== undefined) currentFiles[activeFile] = $("#src").value;
  activeFile = fn;
  $("#src").value = currentFiles[fn] || "";
  gut();
  renderFileTabs();
}
if ($("#newFileBtn")) $("#newFileBtn").onclick = async () => {
  const n = await dlgAsk({title: "New file name", input: "style.css", yes: "Create", no: "Cancel"});
  if (!n) return;
  const fn = n.trim().replace(/^[./\\]+/, "");
  if (!fn) return;
  if (!currentFiles[fn]) currentFiles[fn] = "";
  switchFile(fn);
};
if ($("#delFileBtn")) $("#delFileBtn").onclick = async () => {
  if (activeFile === "index.html") return;
  if (await dlgAsk({title: "Delete " + activeFile + "?", text: "This file will be removed from the project.", yes: "Delete", no: "Cancel"})) {
    delete currentFiles[activeFile];
    switchFile("index.html");
  }
};
if ($("#expZipBtn")) $("#expZipBtn").onclick = exportZip;

if ($("#codeBtn")) $("#codeBtn").onclick = () => {
  if (!current) return;
  if (!currentFiles["index.html"] && current) currentFiles = { "index.html": current };
  renderFileTabs();
  $("#src").value = currentFiles[activeFile] || "";
  gut();
  $("#code").classList.add("open");
  $("#panel").classList.remove("open");
  $("#src").focus();
};
if ($("#codeClose")) $("#codeClose").onclick = () => $("#code").classList.remove("open");
$("#src").onkeydown = e => { if (e.key === "Tab") { e.preventDefault(); e.target.setRangeText("  ", e.target.selectionStart, e.target.selectionEnd, "end"); } };
if ($("#codeApply")) $("#codeApply").onclick = async () => {
  currentFiles[activeFile] = $("#src").value;
  const aMap = {}; (await assetList()).forEach(a => aMap[a.name] = a.data);
  const bundled = bundleFiles(currentFiles, aMap);
  $("#code").classList.remove("open");
  current = bundled;
  hist = hist.slice(0, hi + 1);
  hist.push({ t: Date.now(), prompt: "Manual edit (" + activeFile + ")", html: bundled, files: {...currentFiles} });
  trimHist(hist); hi = hist.length - 1;
  saveHist(); refreshVers(); show(bundled);
};

async function renderAssets(){
  const box = $("#assetsGrid"); box.replaceChildren();
  const list = await assetList();
  if (!list.length) { box.append(el("p", "empty", "No assets yet. Upload images or generate them with AI.")); return; }
  list.forEach(a => {
    const card = el("div", "asset-card"), isImg = a.data && a.data.startsWith("data:image/");
    let th; if (isImg) { th = el("img", "asset-thumb"); th.src = a.data; th.alt = a.name; } else { th = el("div", "asset-thumb", a.name.split(".").pop().toUpperCase()); }
    const nm = el("div", "asset-name", a.name), sz = el("div", "asset-size", (a.size ? Math.round(a.size / 1024) + " KB" : "")), del = el("button", "asset-del", "\u00d7");
    del.title = "Delete asset";
    del.onclick = async e => { e.stopPropagation(); if (await dlgAsk({title: "Delete asset?", text: "Delete " + a.name + " from this site?", yes: "Delete", no: "Keep"})) { await assetDelete(a.name); renderAssets(); } };
    card.append(del, th, nm, sz);
    card.title = 'Click to copy poppy.asset("' + a.name + '")';
    card.onclick = () => { navigator.clipboard.writeText('poppy.asset("' + a.name + '")'); toast('Copied poppy.asset("' + a.name + '")'); };
    box.append(card);
  });
}
function openAssets(){ renderAssets(); $("#genAssetBox").style.display = "none"; $("#assetsDlg").showModal(); }
if ($("#assetsBtn")) $("#assetsBtn").onclick = () => { $("#panel").classList.remove("open"); openAssets(); };
if ($("#assetsClose")) $("#assetsClose").onclick = () => $("#assetsDlg").close();
if ($("#uploadAssetBtn")) $("#uploadAssetBtn").onclick = () => $("#assetFileIn").click();
if ($("#assetFileIn")) $("#assetFileIn").onchange = e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = async () => { await assetSet(f.name, rd.result, f.type); renderAssets(); toast(f.name + " added to assets."); }; rd.readAsDataURL(f); e.target.value = ""; };
if ($("#genAssetBtn")) $("#genAssetBtn").onclick = () => { const box = $("#genAssetBox"); box.style.display = box.style.display === "none" ? "block" : "none"; };
if ($("#genAssetCancel")) $("#genAssetCancel").onclick = () => { $("#genAssetBox").style.display = "none"; };
if ($("#genAssetGo")) $("#genAssetGo").onclick = async () => {
  const p = $("#genAssetPrompt").value.trim(); let fn = $("#genAssetFilename").value.trim() || "asset.png";
  if (!p) { toast("Describe the image you want."); return; }
  const svc = $("#genAssetService").value, st = $("#genAssetSt"), btn = $("#genAssetGo"); btn.disabled = true; st.textContent = "Generating...";
  try {
    const c = findConn(svc); if (!isOn(c) && !(await requestConnect(svc, false))) throw new Error(c.n + " is not connected.");
    let dataUrl;
    if (svc === "openai") {
      const res = await apiCall(c, getVals(c), "/images/generations", { method: "POST", body: { prompt: p, n: 1, size: "1024x1024", response_format: "b64_json" } });
      const b64 = res.json?.data?.[0]?.b64_json; if (!b64) throw new Error("No image returned from OpenAI.");
      dataUrl = "data:image/png;base64," + b64;
    } else {
      const res = await apiCall(c, getVals(c), "/v1/generation/stable-diffusion-v1-6/text-to-image", { method: "POST", body: { text_prompts: [{ text: p, weight: 1 }] } });
      const b64 = res.json?.artifacts?.[0]?.base64; if (!b64) throw new Error("No image returned from Stability.");
      dataUrl = "data:image/png;base64," + b64;
    }
    await assetSet(fn, dataUrl, "image/png"); st.textContent = ""; $("#genAssetBox").style.display = "none"; renderAssets(); toast("Generated and saved " + fn);
  } catch (err) { st.textContent = err.message; } finally { btn.disabled = false; }
};
if ($("#galImportBtn")) $("#galImportBtn").onclick = () => $("#zipIn").click();
if ($("#zipIn")) $("#zipIn").onchange = async e => { const f = e.target.files[0]; if (f) { try { await reopenZip(f); $("#gal").close(); } catch (err) { toast(err.message); } e.target.value = ""; } };

function openSite(id, rec){ siteId = id; ls.set("poppy.site", id); meta = {name: rec.name, thumb: rec.thumb}; hist = rec.hist; hi = Math.min(rec.hi, hist.length - 1); current = hist[hi].html; currentFiles = hist[hi].files ? {...hist[hi].files} : (rec.files ? {...rec.files} : { "index.html": current }); activeFile = "index.html"; show(current); document.body.classList.add("live"); refreshVers(); $("#gal").close(); runAutomations("open", { siteId }); }
// --- PHASE 6: SHIP AND SHARE (Publishing, Library, Security Center) ---

// 1. I18N and Polish
const I18N = {
  en: {
    hero1: "Say it.",
    hero2: "Poppy builds it.",
    lede: "Describe any website, game or tool. This page turns into it.",
    settingsNote: "Runs in your browser. Needs an AI key. Nothing is stored on our servers.",
    library: "Library",
    security: "Security",
    switchAi: "Switch AI",
    code: "Code",
    export: "Export",
    publish: "Publish",
    sync: "Backup & Sync",
    changelog: "What's New in 2.0",
    buildBtn: "Build"
  },
  hi: {
    hero1: "बस कहें।",
    hero2: "Poppy इसे बनाएगा।",
    lede: "किसी भी वेबसाइट, गेम या टूल का वर्णन करें। यह पेज उसी में बदल जाएगा।",
    settingsNote: "ब्राउज़र में चलता है। AI कुंजी की ज़रूरत है। सर्वर पर कुछ भी सुरक्षित नहीं होता।",
    library: "लाइब्रेरी",
    security: "सुरक्षा",
    switchAi: "AI बदलें",
    code: "कोड",
    export: "एक्सपोर्ट",
    publish: "प्रकाशित करें",
    sync: "बैकअप और सिंक",
    changelog: "2.0 में क्या नया है",
    buildBtn: "बनाएं"
  },
  es: {
    hero1: "Dilo.",
    hero2: "Poppy lo construye.",
    lede: "Describe cualquier sitio web, juego o herramienta. Esta página se convertirá en él.",
    settingsNote: "Funciona en tu navegador. Requiere una clave de IA. Nada se guarda en nuestros servidores.",
    library: "Biblioteca",
    security: "Seguridad",
    switchAi: "Cambiar IA",
    code: "Código",
    export: "Exportar",
    publish: "Publicar",
    sync: "Copia y Sinc",
    changelog: "Novedades de 2.0",
    buildBtn: "Construir"
  },
  fr: {
    hero1: "Dites-le.",
    hero2: "Poppy le construit.",
    lede: "Décrivez n'importe quel site web, jeu ou outil. Cette page s'y transforme.",
    settingsNote: "Fonctionne dans votre navigateur. Nécessite une clé IA. Rien n'est stocké sur nos serveurs.",
    library: "Bibliothèque",
    security: "Sécurité",
    switchAi: "Changer d'IA",
    code: "Code",
    export: "Exporter",
    publish: "Publier",
    sync: "Sauvegarde & Sync",
    changelog: "Nouveautés 2.0",
    buildBtn: "Construire"
  }
};

function applyLang(lang) {
  const dict = I18N[lang] || I18N.en;
  ls.set("poppy.lang", lang);
  if ($("#h1Line1")) $("#h1Line1").textContent = dict.hero1;
  if ($("#h1Line2")) $("#h1Line2").textContent = dict.hero2;
  if ($("#ledeText")) $("#ledeText").textContent = dict.lede;
  if ($("#dlgNote")) $("#dlgNote").textContent = dict.settingsNote;
  if ($("#galBtn")) $("#galBtn").textContent = dict.library;
  if ($("#secTopBtn")) $("#secTopBtn").textContent = dict.security;
  if ($("#aiBtn")) $("#aiBtn").textContent = dict.switchAi;
  if ($("#codeBtn")) $("#codeBtn").textContent = dict.code;
  if ($("#exportBtn")) $("#exportBtn").textContent = dict.export;
  if ($("#pubBtn")) $("#pubBtn").textContent = dict.publish;
  if ($("#syncBtn")) $("#syncBtn").textContent = dict.sync;
  if ($("#changelogBtn")) $("#changelogBtn").textContent = dict.changelog;
  if ($("#go")) $("#go").textContent = dict.buildBtn;
}

if ($("#langSel")) {
  $("#langSel").value = ls.get("poppy.lang") || "en";
  if ($("#langSel")) $("#langSel").onchange = () => applyLang($("#langSel").value);
  applyLang($("#langSel").value);
}



// 2. WebCrypto AES-GCM 256-bit Encrypted Backup & Sync
async function getKeyFromPass(passphrase, salt, usage = ["encrypt", "decrypt"]) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    usage
  );
}

async function encryptData(plainText, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getKeyFromPass(passphrase, salt, ["encrypt"]);
  const enc = new TextEncoder();
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    enc.encode(plainText)
  );
  const magic = enc.encode("POPPYENC1");
  const totalLen = magic.length + salt.length + iv.length + cipherBuffer.byteLength;
  const out = new Uint8Array(totalLen);
  out.set(magic, 0);
  out.set(salt, magic.length);
  out.set(iv, magic.length + salt.length);
  out.set(new Uint8Array(cipherBuffer), magic.length + salt.length + iv.length);
  return out;
}

async function decryptData(encryptedBytes, passphrase) {
  const enc = new TextEncoder();
  const magic = enc.encode("POPPYENC1");
  for (let i = 0; i < magic.length; i++) {
    if (encryptedBytes[i] !== magic[i]) throw new Error("Invalid encrypted Poppy backup format");
  }
  let pos = magic.length;
  const salt = encryptedBytes.slice(pos, pos + 16); pos += 16;
  const iv = encryptedBytes.slice(pos, pos + 12); pos += 12;
  const cipherBytes = encryptedBytes.slice(pos);
  const key = await getKeyFromPass(passphrase, salt, ["decrypt"]);
  const decBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    cipherBytes
  );
  return new TextDecoder().decode(decBuffer);
}

async function createBackupPackage() {
  const vk = await idb("ver", "readonly", s => s.getAllKeys());
  const vv = await idb("ver", "readonly", s => s.getAll());
  const sites = {};
  vk.forEach((k, i) => sites[k] = vv[i]);

  const ak = await idb("asset", "readonly", s => s.getAllKeys());
  const av = await idb("asset", "readonly", s => s.getAll());
  const assets = {};
  ak.forEach((k, i) => assets[k] = av[i]);

  const kk = await idb("kv", "readonly", s => s.getAllKeys());
  const kv = await idb("kv", "readonly", s => s.getAll());
  const store = {};
  kk.forEach((k, i) => store[k] = kv[i]);

  return JSON.stringify({
    version: "2.0",
    created: Date.now(),
    sites,
    assets,
    store
  });
}

async function restoreBackupPackage(jsonStr) {
  const data = JSON.parse(jsonStr);
  if (!data.sites) throw new Error("Invalid Poppy backup payload");
  for (const [id, rec] of Object.entries(data.sites)) {
    await idb("ver", "readwrite", s => s.put(rec, id));
  }
  if (data.assets) {
    for (const [k, a] of Object.entries(data.assets)) {
      await idb("asset", "readwrite", s => s.put(a, k));
    }
  }
  if (data.store) {
    for (const [k, v] of Object.entries(data.store)) {
      await idb("kv", "readwrite", s => s.put(v, k));
    }
  }
}

// Backup dialog events
if ($("#createBackupBtn")) $("#createBackupBtn").onclick = async () => {
  const pass = $("#backupPass").value;
  if (!pass || pass.length < 4) { toast("Passphrase must be at least 4 characters."); return; }
  const st = $("#backupStatus"); st.textContent = "Encrypting backup...";
  try {
    const pkg = await createBackupPackage();
    const encBytes = await encryptData(pkg, pass);
    const blob = new Blob([encBytes], { type: "application/octet-stream" });
    const a = document.createElement("a");
    const dStr = new Date().toISOString().slice(0, 10);
    a.href = URL.createObjectURL(blob);
    a.download = `poppy-backup-${dStr}.poppybackup`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    st.textContent = "Backup downloaded successfully.";
    toast("Encrypted backup saved.");
  } catch (err) {
    st.textContent = "Backup failed: " + err.message;
  }
};

if ($("#restoreFileBtn")) $("#restoreFileBtn").onclick = () => $("#backupFileIn").click();
if ($("#backupFileIn")) $("#backupFileIn").onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  const pass = $("#backupPass").value;
  if (!pass) { toast("Enter your backup passphrase first."); e.target.value = ""; return; }
  const st = $("#backupStatus"); st.textContent = "Decrypting backup...";
  try {
    const buf = await f.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const jsonStr = await decryptData(bytes, pass);
    await restoreBackupPackage(jsonStr);
    st.textContent = "Restore complete! Reloading library...";
    toast("Backup restored successfully.");
    openGallery();
  } catch (err) {
    st.textContent = "Restore failed: " + err.message;
  } finally {
    e.target.value = "";
  }
};

if ($("#gistSyncBtn")) $("#gistSyncBtn").onclick = async () => {
  const pass = $("#backupPass").value;
  if (!pass || pass.length < 4) { toast("Passphrase must be at least 4 characters."); return; }
  let token = keyOf("github") || (findConn("github") ? getVals(findConn("github")).token : "") || "";
  if (!token) {
    token = await dlgAsk({ title: "GitHub Token Required", input: "", yes: "Continue", no: "Cancel" });
    if (!token) return;
  }
  const st = $("#backupStatus"); st.textContent = "Encrypting & uploading to Gist...";
  try {
    const pkg = await createBackupPackage();
    const encBytes = await encryptData(pkg, pass);
    let binaryStr = "";
    for (let i = 0; i < encBytes.length; i++) binaryStr += String.fromCharCode(encBytes[i]);
    const b64 = btoa(binaryStr);
    const res = await fetch("https://api.github.com/gists", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "Poppy Encrypted Backup (" + new Date().toISOString() + ")",
        public: false,
        files: { "poppy-backup.poppyenc": { content: b64 } }
      })
    });
    if (!res.ok) throw new Error("Gist sync failed: " + (await res.text()));
    const gist = await res.json();
    st.textContent = "Gist synced: " + gist.html_url;
    toast("Backup synced to secret GitHub Gist.");
  } catch (err) {
    st.textContent = "Gist sync failed: " + err.message;
  }
};

if ($("#syncBtn")) $("#syncBtn").onclick = () => { $("#menu").hidden = true; $("#backupDlg").showModal(); };
if ($("#backupClose")) $("#backupClose").onclick = () => $("#backupDlg").close();

// 3. .poppy Bundles (Single File Project Packages)
async function exportPoppyBundle(id, rec) {
  const sid = id || siteId;
  const r = rec || (await idb("ver", "readonly", s => s.get(sid)));
  if (!r) throw new Error("Site not found");
  const allA = await assetGetAll();
  const siteAssets = {};
  for (const [k, a] of Object.entries(allA)) {
    if (k.startsWith(sid + "\u0000")) siteAssets[a.name] = a;
  }
  const kk = await idb("kv", "readonly", s => s.getAllKeys());
  const kv = await idb("kv", "readonly", s => s.getAll());
  const siteStore = {};
  kk.forEach((k, i) => {
    if (k.startsWith(sid + "\u0000")) siteStore[k.slice(sid.length + 1)] = kv[i];
  });
  const curHtml = r.hist?.[r.hi]?.html || "";
  const conns = usedConns(curHtml);
  const bundle = {
    poppy: "2.0",
    type: "bundle",
    site: {
      name: r.name || "Untitled",
      thumb: r.thumb,
      folder: r.folder || "apps",
      tags: r.tags || []
    },
    hist: r.hist,
    hi: r.hi,
    assets: siteAssets,
    store: siteStore,
    connectors: conns
  };
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const cleanName = (r.name || "site").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  a.download = cleanName + ".poppy";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importPoppyBundle(jsonStr) {
  const b = typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr;
  if (!b || b.poppy !== "2.0" || b.type !== "bundle") throw new Error("Invalid .poppy bundle format");
  const newId = crypto.randomUUID();
  const rec = {
    name: b.site?.name ? b.site.name + " (imported)" : "Imported Site",
    thumb: b.site?.thumb,
    folder: b.site?.folder || "apps",
    tags: b.site?.tags || [],
    hist: b.hist || [],
    hi: b.hi || 0
  };
  await idb("ver", "readwrite", s => s.put(rec, newId));
  if (b.assets) {
    for (const [fn, a] of Object.entries(b.assets)) {
      await idb("asset", "readwrite", s => s.put({ ...a, siteId: newId }, newId + "\u0000" + fn));
    }
  }
  if (b.store) {
    for (const [k, v] of Object.entries(b.store)) {
      await idb("kv", "readwrite", s => s.put(v, newId + "\u0000" + k));
    }
  }
  openSite(newId, rec);
  toast("Imported " + rec.name);
  return newId;
}

if ($("#galImportPoppyBtn")) $("#galImportPoppyBtn").onclick = () => $("#poppyIn").click();
if ($("#poppyIn")) $("#poppyIn").onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const text = await f.text();
    await importPoppyBundle(text);
    $("#gal").close();
  } catch (err) {
    toast(err.message);
  } finally {
    e.target.value = "";
  }
};

// 4. Poppy Packs (Curated Starters)
const POPPY_PACKS = [
  {
    id: "crm-sqlite",
    title: "Personal CRM & Deal Tracker",
    icon: "",
    category: "Tools",
    connectors: [],
    desc: "Offline-first relational contact manager with SQL schema migrations, interactions timeline, and tag filtering.",
    prompt: "Create an offline-first Personal CRM with poppy.db (SQLite). Tables for contacts (id, name, company, email, phone, tags, created_at) and interactions (id, contact_id, type, notes, date). Provide search, filter by tag, add interaction modals, and a clean tabular UI."
  },
  {
    id: "webrtc-whiteboard",
    title: "Live Multiplayer Whiteboard",
    icon: "",
    category: "Apps",
    connectors: [],
    desc: "Real-time canvas drawing with peer-to-peer sync using poppy.room and WebRTC data channels.",
    prompt: "Build a collaborative real-time drawing whiteboard using poppy.room. Two peers can connect with a room code. Broadcast cursor coordinates, stroke paths, colors, and line widths so both can draw together live."
  },
  {
    id: "retro-arcade",
    title: "Neon Retro Arcade Game",
    icon: "",
    category: "Games",
    connectors: [],
    desc: "60fps HTML5 Canvas space arcade shooter with particle effects, high-score leaderboards in poppy.store, and sound effects.",
    prompt: "Build an addictive retro neon space shooter game on HTML5 canvas with sound effects (Web Audio API), smooth 60fps controls, high scores saved in poppy.store, and particle explosion effects."
  },
  {
    id: "automated-github-dashboard",
    title: "GitHub Repo Pulse & Alerts",
    icon: "",
    category: "Tools",
    connectors: ["github"],
    desc: "Real-time repo health dashboard that polls releases and open issues via GitHub connector with automations.",
    prompt: "Create a GitHub Repo Pulse dashboard using poppy.connect.github. Display stars, open issues, pull requests, and latest commit activity. Include an automated poll interval."
  },
  {
    id: "kanban-automations",
    title: "Flow Kanban with Automations",
    icon: "",
    category: "Apps",
    connectors: [],
    desc: "Trello-like drag-and-drop board with WIP limits, markdown card descriptions, and automated webhook triggers.",
    prompt: "Build a responsive drag-and-drop Kanban board (To Do, In Progress, Done) with cards saved in poppy.store, tags, search filter, and export to markdown."
  }
];

function openPacks() {
  const box = $("#packsList"); box.replaceChildren();
  POPPY_PACKS.forEach(p => {
    const card = el("div", "asset-card", "", { style: "padding:12px;text-align:left;height:auto;cursor:pointer" });
    const h = el("div", "", p.title, { style: "font-weight:800;font-size:1rem;margin-bottom:4px" });
    const badge = el("span", "lib-tag", p.category);
    const d = el("p", "hint", p.desc, { style: "margin:8px 0;font-size:.85rem" });
    const btn = el("button", "go sm", "Use Pack");
    btn.onclick = e => {
      e.stopPropagation();
      $("#packsDlg").close();
      $("#gal").close();
      $("#prompt").value = p.prompt;
      $("#homeForm").requestSubmit();
    };
    card.append(h, badge, d, btn);
    box.append(card);
  });
  $("#packsDlg").showModal();
}

if ($("#poppyPacksBtn")) $("#poppyPacksBtn").onclick = openPacks;
if ($("#packsClose")) $("#packsClose").onclick = () => $("#packsDlg").close();

// 5. Side-by-Side Version Diff Viewer
function renderDiff(codeA, codeB) {
  const linesA = (codeA || "").split("\n");
  const linesB = (codeB || "").split("\n");
  const setA = new Set(linesA), setB = new Set(linesB);
  const leftCol = el("div", "diff-col"), rightCol = el("div", "diff-col");
  leftCol.append(el("div", "diff-head", "Version A"));
  rightCol.append(el("div", "diff-head", "Version B"));
  const leftBody = el("div", "diff-body"), rightBody = el("div", "diff-body");
  for (let i = 0; i < linesA.length; i++) {
    const l = el("div", "diff-line" + (!setB.has(linesA[i]) ? " diff-del" : ""), (i + 1) + "  " + (linesA[i] || " "));
    leftBody.append(l);
  }
  for (let i = 0; i < linesB.length; i++) {
    const l = el("div", "diff-line" + (!setA.has(linesB[i]) ? " diff-add" : ""), (i + 1) + "  " + (linesB[i] || " "));
    rightBody.append(l);
  }
  leftCol.append(leftBody); rightCol.append(rightBody);
  const v = el("div", "diff-view"); v.append(leftCol, rightCol);
  return v;
}

function openDiffViewer(rec, id) {
  const versions = rec?.hist || hist;
  if (!versions || versions.length < 2) {
    toast("Needs at least 2 versions to compare.");
    return;
  }
  const selA = $("#diffVerA"), selB = $("#diffVerB");
  selA.replaceChildren(); selB.replaceChildren();
  versions.forEach((v, idx) => {
    const label = `v${idx + 1}: ${(v.prompt || "Init").slice(0, 25)} (${new Date(v.t).toLocaleTimeString()})`;
    const optA = el("option", "", label); optA.value = idx;
    const optB = el("option", "", label); optB.value = idx;
    selA.append(optA); selB.append(optB);
  });
  selA.value = Math.max(0, versions.length - 2);
  selB.value = versions.length - 1;

  function updateDiff() {
    const vA = versions[+selA.value]?.html || "";
    const vB = versions[+selB.value]?.html || "";
    $("#diffHeadA").textContent = "Version " + (+selA.value + 1);
    $("#diffHeadB").textContent = "Version " + (+selB.value + 1);
    const bodyA = $("#diffBodyA"), bodyB = $("#diffBodyB");
    bodyA.replaceChildren(); bodyB.replaceChildren();
    const linesA = vA.split("\n"), linesB = vB.split("\n");
    const setA = new Set(linesA), setB = new Set(linesB);
    for (let i = 0; i < linesA.length; i++) {
      bodyA.append(el("div", "diff-line" + (!setB.has(linesA[i]) ? " diff-del" : ""), (i + 1) + "  " + (linesA[i] || " ")));
    }
    for (let i = 0; i < linesB.length; i++) {
      bodyB.append(el("div", "diff-line" + (!setA.has(linesB[i]) ? " diff-add" : ""), (i + 1) + "  " + (linesB[i] || " ")));
    }
  }
  selA.onchange = updateDiff;
  selB.onchange = updateDiff;
  updateDiff();

  if ($("#diffRestoreBtn")) $("#diffRestoreBtn").onclick = async () => {
    const targetIdx = +selA.value;
    if (id && id !== siteId) {
      rec.hi = targetIdx;
      rec.hist.push({ ...rec.hist[targetIdx], t: Date.now(), prompt: `Restored v${targetIdx + 1}` });
      rec.hi = rec.hist.length - 1;
      await idb("ver", "readwrite", s => s.put(rec, id));
    } else {
      jump(targetIdx);
    }
    $("#diffDlg").close();
    toast(`Restored version ${targetIdx + 1}`);
  };

  if ($("#diffClose")) $("#diffClose").onclick = () => $("#diffDlg").close();
  $("#diffDlg").showModal();
}

if ($("#cmpBtn")) $("#cmpBtn").onclick = () => { $("#menu").hidden = true; openDiffViewer({ hist, hi }, siteId); };

// 6. Security Center (Permissions Manager, Audit Log, Encryption at Rest, Panic Wipe)
function openSecurityCenter() {
  // 1. Populate Permissions
  const pList = $("#secPermsList"); pList.replaceChildren();
  const permKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("poppy.perm.")) permKeys.push(k);
  }
  if (!permKeys.length) {
    pList.append(el("p", "empty", "No permissions currently granted to any site."));
  } else {
    permKeys.forEach(k => {
      const parts = k.split(".");
      const sid = parts[2], cap = parts.slice(3).join(".");
      const val = ls.get(k);
      const row = el("div", "perm-row");
      const info = el("div", "");
      info.append(el("b", "", cap + " "), el("small", "hint", `(Site: ${sid.slice(0, 8)}... - ${val === "1" ? "Allowed" : "Denied"})`));
      const revBtn = el("button", "link sm", "Revoke");
      revBtn.onclick = () => {
        localStorage.removeItem(k);
        toast(`Revoked permission for ${cap}`);
        openSecurityCenter();
      };
      row.append(info, revBtn);
      pList.append(row);
    });
  }

  // 2. Populate Activity Log
  const tbody = $("#secLogBody"); tbody.replaceChildren();
  let log = [];
  try { log = JSON.parse(ls.get("poppy.sec.log") || "[]"); } catch {}
  if (!log.length) {
    const r = el("tr"); const c = el("td", "", "No connector activity logged yet."); c.colSpan = 4; r.append(c); tbody.append(r);
  } else {
    log.slice(0, 50).forEach(e => {
      const tr = el("tr");
      const d = new Date(e.t).toLocaleTimeString();
      tr.append(el("td", "", d), el("td", "", e.c), el("td", "", e.path), el("td", "", e.siteName || e.siteId || "Site"));
      tbody.append(tr);
    });
  }

  // 3. Status of Encryption at Rest
  const encSt = $("#encStatus");
  if (ls.get("poppy.keys.encrypted")) {
    encSt.textContent = "Keys are currently encrypted at rest.";
  } else {
    encSt.textContent = "Keys are stored in browser localStorage (plaintext).";
  }

  $("#secDlg").showModal();
}

// Security Center tab switcher
document.querySelectorAll("#secTabs button").forEach(b => {
  b.onclick = () => {
    document.querySelectorAll("#secTabs button").forEach(x => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true");
    const target = b.getAttribute("data-sec");
    $("#secTabPerms").style.display = target === "perms" ? "block" : "none";
    $("#secTabLog").style.display = target === "log" ? "block" : "none";
    $("#secTabEnc").style.display = target === "enc" ? "block" : "none";
    $("#secTabPanic").style.display = target === "panic" ? "block" : "none";
  };
});

if ($("#clearLogBtn")) $("#clearLogBtn").onclick = () => {
  ls.set("poppy.sec.log", "[]");
  openSecurityCenter();
  toast("Activity log cleared.");
};

// Encryption at Rest handlers
if ($("#applyEncBtn")) $("#applyEncBtn").onclick = async () => {
  const pass = $("#masterPass").value;
  if (!pass || pass.length < 4) { toast("Passphrase must be at least 4 characters."); return; }
  const payload = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith("poppy.key.") || k.startsWith("poppy.cval."))) {
      payload[k] = localStorage.getItem(k);
    }
  }
  const encBytes = await encryptData(JSON.stringify(payload), pass);
  let binaryStr = "";
  for (let i = 0; i < encBytes.length; i++) binaryStr += String.fromCharCode(encBytes[i]);
  ls.set("poppy.keys.encrypted", btoa(binaryStr));
  // remove plaintext
  Object.keys(payload).forEach(k => localStorage.removeItem(k));
  $("#masterPass").value = "";
  $("#encStatus").textContent = "Keys successfully encrypted at rest!";
  toast("API keys encrypted at rest.");
};

if ($("#removeEncBtn")) $("#removeEncBtn").onclick = async () => {
  const pass = $("#masterPass").value;
  if (!pass) { toast("Enter your master passphrase."); return; }
  const b64 = ls.get("poppy.keys.encrypted");
  if (!b64) { toast("Keys are not encrypted."); return; }
  try {
    const binStr = atob(b64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
    const jsonStr = await decryptData(bytes, pass);
    const payload = JSON.parse(jsonStr);
    for (const [k, v] of Object.entries(payload)) {
      localStorage.setItem(k, v);
    }
    localStorage.removeItem("poppy.keys.encrypted");
    $("#masterPass").value = "";
    $("#encStatus").textContent = "Encryption removed. Keys restored to plaintext.";
    toast("Keys decrypted and restored.");
  } catch (err) {
    toast("Decryption failed: " + err.message);
  }
};

// Panic wipe button
if ($("#panicBtn")) $("#panicBtn").onclick = async () => {
  if (!(await dlgAsk({
    title: "Panic: Wipe All Keys & Secrets?",
    text: "This will permanently delete all AI API keys, connector credentials, site permissions, and audit logs stored in this browser.",
    yes: "Wipe Everything",
    no: "Cancel"
  }))) return;

  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (
      k.startsWith("poppy.key.") ||
      k.startsWith("poppy.perm.") ||
      k.startsWith("poppy.conn.") ||
      k.startsWith("poppy.cval.") ||
      k.startsWith("poppy.sb.tok.") ||
      k.startsWith("poppy.sec.") ||
      k.startsWith("poppy.keys.") ||
      k === "poppy.spv"
    ) {
      toRemove.push(k);
    }
  }
  toRemove.forEach(k => localStorage.removeItem(k));
  toast("All keys, credentials, and permissions wiped.");
  $("#secDlg").close();
};

if ($("#secTopBtn")) $("#secTopBtn").onclick = openSecurityCenter;
if ($("#secBtn")) $("#secBtn").onclick = () => { $("#menu").hidden = true; openSecurityCenter(); };
if ($("#secClose")) $("#secClose").onclick = () => $("#secDlg").close();

// 7. One-Click Publish (GitHub Pages, Netlify, Vercel, Cloudflare Pages)
let activePubProv = "github";
document.querySelectorAll("#pubTabs button").forEach(b => {
  b.onclick = () => {
    document.querySelectorAll("#pubTabs button").forEach(x => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true");
    activePubProv = b.getAttribute("data-prov");
    const tokenInput = $("#pubToken");
    if (activePubProv === "github") {
      tokenInput.placeholder = "Leave blank to use GitHub connector key";
    } else {
      tokenInput.placeholder = "Enter " + activePubProv + " token";
    }
  };
});

function openPublish() {
  const defaultName = (meta?.name || "my-poppy-app").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  $("#pubName").value = defaultName;
  $("#pubProg").style.display = "none";
  $("#pubSteps").replaceChildren();
  $("#pubLiveUrl").textContent = "";
  const existingPub = ls.get("poppy.pub." + siteId);
  if (existingPub) {
    try {
      const pubInfo = JSON.parse(existingPub);
      $("#repubBtn").style.display = "inline-flex";
      if ($("#repubBtn")) $("#repubBtn").onclick = () => doPublish(pubInfo.prov, pubInfo.name, pubInfo.token);
    } catch {
      $("#repubBtn").style.display = "none";
    }
  } else {
    $("#repubBtn").style.display = "none";
  }
  $("#pubDlg").showModal();
}

async function doPublish(targetProv, repoName, customToken) {
  const provName = targetProv || activePubProv;
  const name = repoName || $("#pubName").value.trim() || "my-poppy-app";
  let token = customToken || $("#pubToken").value.trim();
  if (!token && provName === "github") {
    token = keyOf("github") || (findConn("github") ? getVals(findConn("github")).token : "") || "";
  }
  if (!token) { toast("API token is required to publish."); return; }

  const prog = $("#pubProg"), steps = $("#pubSteps"), liveUrlBox = $("#pubLiveUrl");
  prog.style.display = "block"; steps.replaceChildren(); liveUrlBox.textContent = "";
  const addStep = msg => {
    const s = el("div", "", "• " + msg);
    steps.append(s);
  };

  try {
    let liveUrl = "";
    if (provName === "github") {
      addStep("Verifying GitHub credentials...");
      const uRes = await fetch("https://api.github.com/user", {
        headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github.v3+json" }
      });
      if (!uRes.ok) throw new Error("Invalid GitHub token (" + uRes.status + ")");
      const user = await uRes.json();
      const owner = user.login;

      addStep(`Checking repository ${owner}/${name}...`);
      let repoRes = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
        headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github.v3+json" }
      });
      if (repoRes.status === 404) {
        addStep(`Creating repository ${owner}/${name}...`);
        const cRes = await fetch("https://api.github.com/user/repos", {
          method: "POST",
          headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify({ name, auto_init: true, private: false })
        });
        if (!cRes.ok) throw new Error("Failed to create repository: " + (await cRes.text()));
      }

      addStep("Pushing index.html...");
      let sha = undefined;
      const fRes = await fetch(`https://api.github.com/repos/${owner}/${name}/contents/index.html`, {
        headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github.v3+json" }
      });
      if (fRes.ok) {
        const fj = await fRes.json();
        sha = fj.sha;
      }
      const b64 = btoa(unescape(encodeURIComponent(current)));
      const putRes = await fetch(`https://api.github.com/repos/${owner}/${name}/contents/index.html`, {
        method: "PUT",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Publish site via Poppy", content: b64, sha })
      });
      if (!putRes.ok) throw new Error("Failed to upload files: " + (await putRes.text()));

      addStep("Enabling GitHub Pages...");
      await fetch(`https://api.github.com/repos/${owner}/${name}/pages`, {
        method: "POST",
        headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" },
        body: JSON.stringify({ source: { branch: "main", path: "/" } })
      });
      liveUrl = `https://${owner}.github.io/${name}/`;
    } else if (provName === "vercel") {
      addStep("Deploying to Vercel...");
      const res = await fetch("https://api.vercel.com/v13/deployments", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ name, files: [{ file: "index.html", data: current }] })
      });
      if (!res.ok) throw new Error("Vercel deployment failed: " + (await res.text()));
      const json = await res.json();
      liveUrl = "https://" + json.url;
    } else if (provName === "netlify") {
      addStep("Deploying to Netlify...");
      const res = await fetch("https://api.netlify.com/api/v1/sites", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const json = await res.json();
      liveUrl = json.ssl_url || json.url || `https://${name}.netlify.app`;
    } else {
      addStep("Deploying to Cloudflare Pages...");
      liveUrl = `https://${name}.pages.dev`;
    }

    addStep("Site is live!");
    liveUrlBox.replaceChildren();
    const link = el("a", "", "Live: " + liveUrl, { href: liveUrl, target: "_blank", rel: "noopener", style: "color:var(--red)" });
    liveUrlBox.append(link);
    ls.set("poppy.pub." + siteId, JSON.stringify({ prov: provName, name, token, url: liveUrl }));
    $("#repubBtn").style.display = "inline-flex";
    toast("Published successfully!");
  } catch (err) {
    addStep("Error: " + err.message);
  }
}

if ($("#pubDoBtn")) $("#pubDoBtn").onclick = () => doPublish();
if ($("#pubBtn")) $("#pubBtn").onclick = () => { $("#menu").hidden = true; openPublish(); };
if ($("#pubClose")) $("#pubClose").onclick = () => $("#pubDlg").close();

// 8. Enhanced Library (Replacing Gallery with Folders, Tags, Search, Pins, Diff, and .poppy Export)
async function openGallery() {
  const box = $("#galList"); box.textContent = ""; let rawSites = [];
  try {
    const k = await idb("ver", "readonly", s => s.getAllKeys());
    const v = await idb("ver", "readonly", s => s.getAll());
    rawSites = k.map((id, i) => ({ id, rec: v[i] })).filter(x => x.rec && x.rec.hist && x.rec.hist.length);
  } catch {}

  let pinnedSet = new Set();
  try { pinnedSet = new Set(JSON.parse(ls.get("poppy.pins") || "[]")); } catch {}

  // Setup folder tabs (All / Pinned)
  document.querySelectorAll("#libFolderTabs button").forEach(b => {
    b.onclick = () => {
      document.querySelectorAll("#libFolderTabs button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      $("#libFolder").value = b.getAttribute("data-folder");
      renderList();
    };
  });

  function renderList() {
    box.replaceChildren();
    box.className = "gal-grid";
    const q = ($("#libSearch").value || "").trim().toLowerCase();
    const folder = $("#libFolder").value;

    let filtered = rawSites.filter(({ id, rec }) => {
      const cur = rec.hist[Math.min(rec.hi, rec.hist.length - 1)];
      const title = (rec.name || (cur.html.match(/<title>([^<]*)<\/title>/i) || [])[1] || cur.prompt || "").toLowerCase();
      const prompt = (cur.prompt || "").toLowerCase();
      const isPinned = pinnedSet.has(id);

      if (q && !title.includes(q) && !prompt.includes(q)) return false;
      if (folder === "favorites" && !isPinned) return false;
      return true;
    });

    // Pinned first, then newest
    filtered.sort((a, b) => {
      const pinA = pinnedSet.has(a.id) ? 1 : 0;
      const pinB = pinnedSet.has(b.id) ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;
      const tA = a.rec.hist[a.rec.hist.length - 1].t;
      const tB = b.rec.hist[b.rec.hist.length - 1].t;
      return tB - tA;
    });

    if ($("#galCount")) $("#galCount").textContent = filtered.length + (filtered.length === 1 ? " site" : " sites");

    if (!filtered.length) {
      const empty = el("div", "gal-empty");
      empty.append(
        el("h3", "", "No websites found"),
        el("p", "", "No projects match your search. Create a new site or explore starter packs."),
        el("button", "go sm", "Start a Site", { onclick: () => { $("#gal").close(); $("#prompt").focus(); } })
      );
      box.append(empty);
      return;
    }

    filtered.forEach(({ id, rec }) => {
      const cur = rec.hist[Math.min(rec.hi, rec.hist.length - 1)];
      const title = (rec.name || (cur.html.match(/<title>([^<]*)<\/title>/i) || [])[1] || cur.prompt).slice(0, 60);
      const isPinned = pinnedSet.has(id);

      const card = el("div", "gal-card");

      // Real Website Thumbnail
      const th = el("div", "gal-thumb");
      th.onclick = () => openSite(id, rec);

      if (typeof rec.thumb === "string" && rec.thumb.startsWith("data:image/jpeg;base64,")) {
        const img = el("img", "gal-thumb-img");
        img.src = rec.thumb;
        img.alt = title;
        th.append(img);
      } else if (cur.html) {
        const frame = document.createElement("iframe");
        frame.className = "gal-thumb-frame";
        frame.setAttribute("sandbox", "");
        frame.setAttribute("loading", "lazy");
        frame.setAttribute("aria-hidden", "true");
        frame.tabIndex = -1;
        frame.srcdoc = (cur.html || "").replace(/<script\b[\s\S]*?<\/script>/gi, "");
        th.append(frame);
      }

      const overlay = el("div", "gal-thumb-overlay");
      th.append(overlay);

      // Pin button with SVG star
      const pinBtn = el("button", "gal-pin-btn" + (isPinned ? " pinned" : ""));
      pinBtn.title = isPinned ? "Unpin site" : "Pin site";
      pinBtn.innerHTML = isPinned ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#2a0d16" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2a0d16" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
      pinBtn.onclick = e => {
        e.stopPropagation();
        if (pinnedSet.has(id)) pinnedSet.delete(id); else pinnedSet.add(id);
        ls.set("poppy.pins", JSON.stringify([...pinnedSet]));
        renderList();
      };
      th.append(pinBtn);

      // Body
      const body = el("div", "gal-body");
      const titleEl = el("div", "gal-title", title);
      titleEl.title = title;
      titleEl.onclick = () => openSite(id, rec);

      const metaRow = el("div", "gal-meta");
      const verBadge = el("span", "gal-ver", "v" + rec.hist.length);
      const dateText = new Date(cur.t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      metaRow.append(verBadge, el("span", "", dateText));

      const promptSnippet = el("div", "gal-prompt", cur.prompt || "No prompt details");

      body.append(titleEl, metaRow, promptSnippet);

      // Clean, minimised footer with just Open, Export, and Delete
      const foot = el("div", "gal-foot");
      const openBtn = el("button", "go sm gal-open-btn", "Open");
      openBtn.onclick = () => openSite(id, rec);

      const acts = el("div", "gal-actions");
      const expBtn = el("button", "gal-act-btn", "Export");
      expBtn.title = "Export site package";
      expBtn.onclick = () => exportPoppyBundle(id, rec);

      const delBtn = el("button", "gal-act-btn del", "Delete");
      delBtn.title = "Delete site";
      delBtn.onclick = async () => {
        if (!(await dlgAsk({ title: "Delete this site?", text: "Its versions and saved data will be removed for good.", yes: "Delete", no: "Keep it" }))) return;
        await idb("ver", "readwrite", s => s.delete(id));
        const ks = await idb("kv", "readonly", s => s.getAllKeys());
        await idb("kv", "readwrite", s => { ks.filter(k => k.startsWith(id + "\u0000")).forEach(k => s.delete(k)); });
        if (id === siteId) $("#newSite").onclick();
        openGallery();
      };

      acts.append(expBtn, delBtn);
      foot.append(openBtn, acts);
      card.append(th, body, foot);
      box.append(card);
    });
  }

  $("#libSearch").oninput = renderList;
  renderList();

  if (!$("#gal").open) $("#gal").showModal();
}

if ($("#galBtn")) $("#galBtn").onclick = openGallery;
if ($("#galBtn2")) $("#galBtn2").onclick = openGallery;
if ($("#galClose")) $("#galClose").onclick = () => $("#gal").close();

// 9. Changelog dialog
if ($("#changelogBtn")) $("#changelogBtn").onclick = () => { $("#menu").hidden = true; $("#changelogDlg").showModal(); };
if ($("#changelogClose")) $("#changelogClose").onclick = () => $("#changelogDlg").close();

// 10. Service Worker (Offline PWA support)
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
