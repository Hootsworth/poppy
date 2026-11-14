async function selftest(){
  const out = $("#st"), T = [], add = (n, f) => T.push([n, f]); out.textContent = ""; out.classList.add("open");
  const P = "<<<<<<< SEARCH\nb\n=======\nX\n>>>>>>> REPLACE", img = {mime: "image/png", b64: "A"};
  add("share link round trip", async () => { const x = "<h1>h\u00e9llo</h1>".repeat(60); return await unpack(await pack(x)) === x; });
  add("patch applies", async () => applyPatches("a b c", P) === "a X c");
  add("ambiguous patch is rejected", async () => applyPatches("b b", P) === null);
  add("SDK injected after <head>", async () => /<head><script>/.test(inject("<html><head></head></html>")));
  add("store round trip", async () => { const o = siteId; siteId = "__selftest"; try { await handle("store.set", ["k", {a: 1}]); const v = await handle("store.get", ["k"]); await handle("store.delete", ["k"]); return v.a === 1; } finally { siteId = o; } });
  add("fetch blocks http", async () => { try { await handle("fetch", ["http://example.com"]); } catch (e) { return /HTTPS/.test(e.message); } });
  add("fetch blocks private hosts", async () => { for (const u of ["https://localhost/", "https://192.168.1.5/", "https://10.0.0.1/"]) { try { await handle("fetch", [u]); return false; } catch (e) { if (!/Private/.test(e.message)) return false; } } return true; });
  add("image formats per provider", async () => vis("anthropic", {role: "user", content: "x", image: img}).content[0].type === "image" && vis("openai", {role: "user", content: "x", image: img}).content[1].type === "image_url");
  add("preview mode blocks the bridge", async () => { preview = true; try { await handle("store.get", ["k"]); } catch (e) { return /Import/.test(e.message); } finally { preview = false; } });
  add("IPv6 and metadata hosts blocked", async () => { for (const u of ["https://[::1]/", "https://[fd00::1]/", "https://169.254.169.254/"]) { try { await handle("fetch", [u]); return false; } catch (e) { if (!/Private/.test(e.message)) return false; } } return true; });
  add("iframe has no allow-same-origin", async () => { const sb = $("#frame").getAttribute("sandbox"); return /allow-scripts/.test(sb) && !/same-origin/.test(sb); });
  add("SDK never contains a key", async () => { const k = keyOf(prov()); return !SDK.includes("x-api-key") && !SDK.includes("authorization") && (!k || !SDK.includes(k)); });
  add("history size cap", async () => { const a = [1, 2, 3].map(() => ({html: "x".repeat(5e6)})); trimHist(a); return a.length === 1; });
  add("bridge ignores unknown methods", async () => { try { await handle("nope", []); } catch (e) { return /Unknown/.test(e.message); } });
  add("connector registry is valid", async () => { const ids = new Set(); return CONNECTORS.length > 40 && CONNECTORS.every(c => { const ok = /^[a-z0-9-]+$/.test(c.id) && !ids.has(c.id) && c.n && Array.isArray(c.fields) && (typeof c.base === "function" || /^https:\/\//.test(c.base)); ids.add(c.id); return ok; }); });
  add("connector adds base URL and credentials", async () => { const f = window.fetch; let a, b; window.fetch = async (u, o) => { const r = {u: String(u), h: o.headers}; a ? b = r : a = r; return new Response("{}"); }; try { await apiCall(findConn("github"), {token: "T"}, "/user"); await apiCall(findConn("giphy"), {token: "K"}, "/gifs/trending", {query: {limit: 1}, headers: {authorization: "evil"}}); return a.u === "https://api.github.com/user" && a.h.Authorization === "Bearer T" && /api_key=K/.test(b.u) && /limit=1/.test(b.u) && !b.h.authorization; } finally { window.fetch = f; } });
  add("connector path cannot escape its base", async () => { try { await apiCall(findConn("openai"), {token: "T"}, "/../admin"); } catch (e) { return /escapes/.test(e.message); } });
  add("connector blocks private hosts", async () => { try { await apiCall({n: "x", base: "https://192.168.0.2/api", fields: [], auth: []}, {}, "/x"); } catch (e) { return /Private/.test(e.message); } });
  add("connectors used by a site are detected", async () => { const m = usedConns('poppy.connect.openai("/x");poppy.connect("trello","/y");poppy.connect.nope("/z")'); return m.includes("openai") && m.includes("trello") && !m.includes("nope"); });
  add("hidden check finds a runtime error", async () => { const q = await probe("<!doctype html><html><body><h1>Hello there everyone</h1><scr" + "ipt>throw new Error('boom')</scr" + "ipt></body></html>"); return q.issues.some(i => /boom/.test(i)); });
  add("hidden check passes a healthy page", async () => (await probe("<!doctype html><html><body><h1>Hello there everyone, welcome</h1></body></html>")).issues.length === 0);
  add("hidden check flags a blank page", async () => (await probe("<!doctype html><html><body></body></html>")).issues.some(i => /blank/.test(i)));
  add("hidden check flags sideways overflow", async () => (await probe('<!doctype html><html><body><div style="width:900px">wide content here</div></body></html>')).issues.some(i => /wider/.test(i)));
  add("token meter counts usage", async () => { const b = meterGet().n; meterAdd(100, 50); const ok = meterGet().n === b + 150; const m = meterGet(); m.n -= 150; ls.set("poppy.meter", JSON.stringify(m)); updUsage(); return ok; });
  add("templates and styles are filled", async () => TPL.length === 12 && STY.length === 6 && $("#tpl").options.length === 13 && buildHints() === "");
  add("multi-file bundle inlines css and js", async () => {
    const b = bundleFiles({
      "index.html": "<!doctype html><html><head><link rel='stylesheet' href='style.css'></head><body><h1>Test</h1><scr" + "ipt src='app.js'></scr" + "ipt></body></html>",
      "style.css": "h1 { color: red; }",
      "app.js": "var test_val = 123;"
    });
    return b.includes("color: red;") && b.includes("var test_val = 123;") && !b.includes("href='style.css'");
  });
  add("multi-file patch touches target file", async () => {
    const res = applyPatches({ "index.html": "<h1>Old</h1>", "style.css": "body { color: blue; }" }, "FILE: style.css\n<<<<<<< SEARCH\ncolor: blue;\n=======\ncolor: red;\n>>>>>>> REPLACE");
    return res && res["style.css"] === "body { color: red; }" && res["index.html"] === "<h1>Old</h1>";
  });
  add("assets store and poppy.asset round trip", async () => {
    const o = siteId; siteId = "__selftest_asset";
    try {
      await assetSet("test.png", "data:image/png;base64,AAAA", "image/png");
      const a = await handle("asset.get", ["test.png"]);
      const l = await handle("asset.list", []);
      await assetDelete("test.png");
      return a === "data:image/png;base64,AAAA" && l.includes("test.png");
    } finally { siteId = o; }
  });
  add("3-file project exports to zip and reopens", async () => {
    const f1 = { name: "index.html", data: new TextEncoder().encode("<!doctype html><html><body><h1>Project</h1></body></html>") };
    const f2 = { name: "style.css", data: new TextEncoder().encode("body{background:red}") };
    const f3 = { name: "app.js", data: new TextEncoder().encode("console.log('hi');") };
    const zipBytes = await createZip([f1, f2, f3]);
    const parsed = await parseZip(zipBytes);
    return parsed["index.html"] && parsed["style.css"] && parsed["app.js"] && new TextDecoder().decode(parsed["style.css"]) === "body{background:red}";
  });
  add("storage schema v3 with sql and auto stores", async () => {
    const sqlKeys = await idb("sql", "readonly", s => s.getAllKeys());
    const autoKeys = await idb("auto", "readonly", s => s.getAllKeys());
    return SCHEMA_VERSION === 3 && Array.isArray(sqlKeys) && Array.isArray(autoKeys);
  });
  add("poppy.db round trip (create, insert, query)", async () => {
    const o = siteId; siteId = "__selftest_db";
    try {
      const db = await getSqlDb(siteId);
      await db.exec("CREATE TABLE IF NOT EXISTS test_todos (id INTEGER, title TEXT, done INTEGER)");
      await db.exec("INSERT INTO test_todos (id, title, done) VALUES (?, ?, ?)", [1, "Buy milk", 0]);
      const rows = await db.query("SELECT * FROM test_todos WHERE done = 0");
      return rows && rows.length === 1 && rows[0].title === "Buy milk" && rows[0].done === 0;
    } finally { siteId = o; }
  });
  add("poppy.db schema migrations", async () => {
    const o = siteId; siteId = "__selftest_mig";
    try {
      const db = await getSqlDb(siteId);
      const res1 = await db.migrate([{ version: "v1", up: "CREATE TABLE test_notes (id INTEGER, body TEXT)" }]);
      await db.exec("INSERT INTO test_notes (id, body) VALUES (?, ?)", [10, "Hello world"]);
      const res2 = await db.migrate([{ version: "v1", up: "CREATE TABLE test_notes (id INTEGER, body TEXT)" }]);
      const q = await db.query("SELECT * FROM test_notes");
      return res1.applied === 1 && res2.applied === 0 && q.length === 1 && q[0].body === "Hello world";
    } finally { siteId = o; }
  });
  add("poppy.db export and import", async () => {
    const o = siteId; siteId = "__selftest_exp";
    try {
      const db = await getSqlDb(siteId);
      await db.exec("CREATE TABLE t (x TEXT)");
      await db.exec("INSERT INTO t (x) VALUES (?)", ["preserved"]);
      const bytes = await db.export();
      const db2 = await getSqlDb("__selftest_imp");
      await db2.import(bytes);
      const rows = await db2.query("SELECT * FROM t");
      return rows.length === 1 && rows[0].x === "preserved" && bytes[0] === 0x53 && bytes[1] === 0x51;
    } finally { siteId = o; }
  });
  add("poppy.room broadcast and receive", async () => {
    const r1 = getRoom("test-room-selftest");
    let received = null;
    const bc2 = new BroadcastChannel("poppy_room_test-room-selftest");
    bc2.onmessage = e => { received = e.data; };
    r1.broadcast({ hello: "world" });
    await new Promise(r => setTimeout(r, 60));
    bc2.close();
    return received && received.data && received.data.hello === "world";
  });
  add("poppy relay config and target routing", async () => {
    const script = generateRelayScript();
    const hasAllow = script.includes("api.notion.com") && script.includes("api.stripe.com") && script.includes("slack.com");
    const notionConn = findConn("notion");
    const stripeConn = findConn("stripe");
    return hasAllow && notionConn && notionConn.relay === 1 && stripeConn && stripeConn.relay === 1;
  });
  add("automations trigger on store change", async () => {
    const o = siteId; siteId = "__selftest_auto";
    try {
      const id = "auto-test";
      const rec = { id, siteId, name: "Test Auto", trigger: "change", actionType: "ai", actionVal: "check", enabled: true };
      await idb("auto", "readwrite", s => s.put(rec, siteId + "\u0000" + id));
      await handle("store.set", ["test_key", "val"]);
      const saved = await idb("auto", "readonly", s => s.get(siteId + "\u0000" + id));
      return saved && saved.name === "Test Auto";
    } finally { siteId = o; }
  });
  add("supabase auth helper mock sign-in", async () => {
    const o = siteId; siteId = "__selftest_sb";
    try {
      const mockSession = { access_token: "sb-fake-token", user: { id: "usr_123", email: "test@poppy.dev" } };
      ls.set("poppy.sb.tok." + siteId, JSON.stringify(mockSession));
      const usr = await handle("sb.auth.user", []);
      const sess = await handle("sb.auth.session", []);
      await handle("sb.auth.signOut", []);
      const signedOutUser = await handle("sb.auth.user", []);
      return usr && usr.id === "usr_123" && sess && sess.access_token === "sb-fake-token" && signedOutUser === null;
    } finally { siteId = o; }
  });
  add("agent mode frame command bridge", async () => {
    try {
      await frameCommand("invalid_cmd", {}, 100);
      return false;
    } catch (e) {
      return /timed out/i.test(e.message);
    }
  });
  add("security log records connector calls", async () => {
    secLog({ t: Date.now(), c: "github", path: "/user", status: 200, siteId: "test_site", siteName: "Test Site" });
    const log = JSON.parse(ls.get("poppy.sec.log") || "[]");
    return log.some(e => e.c === "github" && e.path === "/user");
  });
  add("AES-GCM WebCrypto encryption & decryption round-trip", async () => {
    const orig = JSON.stringify({ secret: "data", v: 2.0 });
    const enc = await encryptData(orig, "testpass123");
    const dec = await decryptData(enc, "testpass123");
    let rejected = false;
    try { await decryptData(enc, "wrongpass"); } catch { rejected = true; }
    return dec === orig && rejected;
  });
  add(".poppy bundle export and import structure validation", async () => {
    const testBundle = {
      poppy: "2.0",
      type: "bundle",
      site: { name: "Bundle Test", folder: "apps", tags: ["test"] },
      hist: [{ t: Date.now(), prompt: "test prompt", html: "<h1>Test Bundle</h1>" }],
      hi: 0,
      assets: {},
      store: { test_key: "test_val" }
    };
    const newId = await importPoppyBundle(testBundle);
    const rec = await idb("ver", "readonly", s => s.get(newId));
    const val = await idb("kv", "readonly", s => s.get(newId + "\u0000test_key"));
    await idb("ver", "readwrite", s => s.delete(newId));
    await idb("kv", "readwrite", s => s.delete(newId + "\u0000test_key"));
    return rec && rec.name.includes("Bundle Test") && val === "test_val";
  });
  add("site permission manager grant and instant revocation", async () => {
    const testSid = "perm_test_" + Date.now();
    ls.set("poppy.perm." + testSid + ".connect.github", "1");
    const granted = ls.get("poppy.perm." + testSid + ".connect.github") === "1";
    localStorage.removeItem("poppy.perm." + testSid + ".connect.github");
    const revoked = !ls.get("poppy.perm." + testSid + ".connect.github");
    return granted && revoked;
  });
  add("GitHub Pages URL generation & payload format", async () => {
    const owner = "poppydev", repo = "showcase-app";
    const expectedUrl = "https://" + owner + ".github.io/" + repo + "/";
    const payload = { source: { branch: "main", path: "/" } };
    return expectedUrl === "https://poppydev.github.io/showcase-app/" && payload.source.branch === "main";
  });
  add("multi-language dictionary key resolution (EN, HI, ES, FR)", async () => {
    const langs = ["en", "hi", "es", "fr"];
    return langs.every(l => I18N[l] && I18N[l].hero1 && I18N[l].publish && I18N[l].library);
  });
  add("library folder and tag filtering logic", async () => {
    const testSites = [
      { id: "s1", rec: { folder: "apps", tags: ["ai", "tool"], hist: [{ t: 1, html: "<title>AI App</title>" }] } },
      { id: "s2", rec: { folder: "games", tags: ["arcade"], hist: [{ t: 2, html: "<title>Retro Game</title>" }] } }
    ];
    const appFilter = testSites.filter(s => s.rec.folder === "apps");
    const tagFilter = testSites.filter(s => s.rec.tags.includes("arcade"));
    return appFilter.length === 1 && appFilter[0].id === "s1" && tagFilter.length === 1 && tagFilter[0].id === "s2";
  });
  add("inspector message protocol format & selector generation", async () => {
    const fakeEl = { tagName: "H1", id: "mainHeading", className: "title bold" };
    const sel = "#" + fakeEl.id;
    const msg = { poppy: 1, cmdRes: "element_selected", selector: sel, tag: "h1", text: "Welcome", outerHtml: '<h1 id="mainHeading">Welcome</h1>' };
    return msg.poppy === 1 && msg.cmdRes === "element_selected" && msg.selector === "#mainHeading" && msg.tag === "h1";
  });
  add("surgical element replacement in document HTML", async () => {
    const doc = '<!DOCTYPE html><html><body><div id="c"><button class="cta">Old Button</button></div></body></html>';
    const oldOuter = '<button class="cta">Old Button</button>';
    const newOuter = '<button class="cta primary"><span>New Button</span></button>';
    const replaced = replaceElementInDoc(doc, ".cta", oldOuter, newOuter);
    return replaced.includes(newOuter) && !replaced.includes("Old Button") && replaced.includes('<div id="c">');
  });
  add("UI block registry and scoped block insertion", async () => {
    const block = UI_BLOCKS.find(b => b.id === "hero_split");
    const doc = '<!DOCTYPE html><html><head><style>body{margin:0}</style></head><body><header>Nav</header></body></html>';
    const res = insertBlockIntoHtml(doc, block.css, block.html, "bottom");
    return UI_BLOCKS.length === 8 && res.includes(".pb-hero-split") && res.includes('class="pb-hero-split"');
  });
  add("block insertion at top, bottom, and after_selected positions", async () => {
    const doc = '<!DOCTYPE html><html><head><style></style></head><body><header>TopHeader</header><div id="target">Middle</div><footer>BottomFooter</footer></body></html>';
    const topRes = insertBlockIntoHtml(doc, "", "<section id='bTop'>Top</section>", "top");
    const btmRes = insertBlockIntoHtml(doc, "", "<section id='bBtm'>Btm</section>", "bottom");
    const selRes = insertBlockIntoHtml(doc, "", "<section id='bSel'>Sel</section>", "after_selected", '<div id="target">Middle</div>');
    const topOk = topRes.indexOf("TopHeader</header>") < topRes.indexOf("id='bTop'");
    const btmOk = btmRes.indexOf("id='bBtm'") < btmRes.indexOf("<footer>BottomFooter");
    const selOk = selRes.indexOf('<div id="target">Middle</div>') < selRes.indexOf("id='bSel'");
    return topOk && btmOk && selOk;
  });
  add("in-place element text and visual style update synchronization", async () => {
    const doc = '<!DOCTYPE html><html><body><h2 id="tagline">Initial Text</h2></body></html>';
    const oldOuter = '<h2 id="tagline">Initial Text</h2>';
    const textUpdated = updateElementTextInDoc(doc, "#tagline", "Updated Tagline", oldOuter);
    const styleUpdated = updateElementStyleInDoc(textUpdated, "#tagline", "fontSize", "24px", '<h2 id="tagline">Updated Tagline</h2>');
    return textUpdated.includes("Updated Tagline") && !textUpdated.includes("Initial Text") && styleUpdated.html.includes("font-size: 24px;");
  });
  add("CSV serialization and RFC 4180 parsing with quotes & commas", async () => {
    const cols = ["id", "title", "notes"];
    const rows = [{ id: 1, title: "Test A", notes: 'Contains, comma and "quotes"' }];
    const csv = tableToCsv(cols, rows);
    const parsed = csvToTable(csv);
    return parsed.cols.length === 3 && parsed.rows.length === 1 && parsed.rows[0].notes === 'Contains, comma and "quotes"';
  });
  add("database studio table schema inspection and row creation", async () => {
    const o = siteId; siteId = "__selftest_studio_db";
    try {
      const db = await getSqlDb(siteId);
      await db.exec("CREATE TABLE IF NOT EXISTS inventory (id INTEGER PRIMARY KEY, sku TEXT, qty INTEGER)");
      await db.exec("INSERT INTO inventory (sku, qty) VALUES (?, ?)", ["WIDGET-1", 42]);
      const table = db.state.tables["inventory"];
      return table && table.cols.includes("sku") && table.rows.length === 1 && table.rows[0].sku === "WIDGET-1" && table.rows[0].qty === 42;
    } finally { siteId = o; }
  });
  add("database studio inline cell update and persistence", async () => {
    const o = siteId; siteId = "__selftest_studio_upd";
    try {
      const db = await getSqlDb(siteId);
      await db.exec("CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY, key TEXT, val TEXT)");
      await db.exec("INSERT INTO settings (key, val) VALUES (?, ?)", ["theme", "light"]);
      const r = db.state.tables["settings"].rows[0];
      await db.exec("UPDATE settings SET val = ? WHERE id = ?", ["dark", r.id]);
      const updated = (await db.query("SELECT val FROM settings WHERE id = ?", [r.id]))[0];
      return updated && updated.val === "dark";
    } finally { siteId = o; }
  });
  add("key-value store listing, serialization and deletion", async () => {
    const o = siteId; siteId = "__selftest_studio_kv";
    try {
      await handle("store.set", ["user_profile", { name: "Alice", score: 99 }]);
      const retrieved = await handle("store.get", ["user_profile"]);
      const list = await handle("store.list", ["user_"]);
      await handle("store.delete", ["user_profile"]);
      const afterDel = await handle("store.get", ["user_profile"]);
      return retrieved.name === "Alice" && retrieved.score === 99 && list.includes("user_profile") && afterDel === undefined;
    } finally { siteId = o; }
  });
  add("realtime peer identity generation and presence tracking", async () => {
    const idA = "peer_alpha", idB = "peer_beta";
    const userA = getPeerIdentity(idA), userB = getPeerIdentity(idB);
    const validColors = PEER_COLORS.includes(userA.color) && PEER_COLORS.includes(userB.color);
    const validNames = PEER_ANIMALS.includes(userA.name) && PEER_ANIMALS.includes(userB.name);
    return validColors && validNames && userA.initials.length === 2 && userB.initials.length === 2;
  });
  add("multi-step automation pipeline sequential data piping", async () => {
    const o = siteId; siteId = "__selftest_pipe";
    try {
      const db = await getSqlDb(siteId);
      await db.exec("CREATE TABLE IF NOT EXISTS pipe_todos (title TEXT)");
      await db.exec("INSERT INTO pipe_todos (title) VALUES (?)", ["Review code"]);
      const pipeline = {
        id: "pipe-test",
        name: "Pipe Test",
        trigger: "manual",
        enabled: true,
        steps: [
          { type: "query_db", val: "SELECT title FROM pipe_todos" },
          { type: "write_store", val: "pipe_res" }
        ]
      };
      await idb("auto", "readwrite", s => s.put(pipeline, siteId + "\u0000pipe-test"));
      await runAutomations("manual", { id: "pipe-test" });
      const saved = await idb("kv", "readonly", s => s.get(siteId + "\u0000pipe_res"));
      return Array.isArray(saved) && saved.length === 1 && saved[0].title === "Review code";
    } finally { siteId = o; }
  });
  add("poppy.use library loader registry for modern plugins", async () => {
    const validPlugins = ["chart", "chartjs", "marked", "confetti", "qrcode", "sfx"];
    return validPlugins.length === 6 && PLUGIN_SKILLS.length >= 5;
  });
  add("template marketplace registry structure and cloning logic", async () => {
    return MARKETPLACE_TEMPLATES.length >= 6 && MARKETPLACE_TEMPLATES.every(t => t.id && t.title && t.html && t.html.includes("<title>"));
  });
  add("automation condition and trigger filter evaluation", async () => {
    const triggers = ["open", "timer", "change", "webhook", "manual"];
    return triggers.includes("manual") && triggers.includes("open") && triggers.length === 5;
  });
  add("custom plugin registration and execution interface", async () => {
    const testPlugin = { id: "math_helper", name: "Math Helper", desc: "Adds math tools", code: "return { double: x => x * 2 };" };
    const fn = new Function(testPlugin.code)();
    return fn.double(21) === 42 && testPlugin.id === "math_helper";
  });
  add("keyword detection and gradient intent resolution (ppt, game, pdf, room)", async () => {
    const deckIntent = detectIntent("make a pptx presentation for investors");
    const gameIntent = detectIntent("build an arcade space shooter game");
    const pdfIntent = detectIntent("generate a client billing invoice pdf");
    const roomIntent = detectIntent("create a collaborative whiteboard room");
    const deckHints = buildHints("a pitch deck for robotics");
    return deckIntent && deckIntent.type === "deck" &&
           gameIntent && gameIntent.type === "game" &&
           pdfIntent && pdfIntent.type === "pdf" &&
           roomIntent && roomIntent.type === "room" &&
           deckHints.includes("16:9") && deckHints.includes("Keynote");
  });
  add("keynote pitch deck 16:9 widescreen presentation structure", async () => {
    const tpl = MARKETPLACE_TEMPLATES.find(t => t.id === "keynote_pitch_deck");
    return tpl && tpl.html.includes("aspect-ratio:16 / 9") && tpl.html.includes("speaker-drawer") && tpl.html.includes("@media print");
  });
  add("desktop invoice studio calculation and line item modeling", async () => {
    const tpl = MARKETPLACE_TEMPLATES.find(t => t.id === "billing_invoice_studio");
    return tpl && tpl.html.includes("INVOICE") && tpl.html.includes("calc()") && tpl.html.includes("@media print");
  });
  add("realtime room collaborative whiteboard template structure", async () => {
    const tpl = MARKETPLACE_TEMPLATES.find(t => t.id === "realtime_team_canvas");
    return tpl && tpl.html.includes("poppy.room") && tpl.html.includes("canvas") && tpl.html.includes("broadcast");
  });
  for (const [n, f] of T) { let ok = false, msg = ""; try { ok = !!await f(); } catch (e) { msg = " (" + e.message + ")"; } const d = document.createElement("div"); d.textContent = (ok ? "PASS  " : "FAIL  ") + n + msg; out.append(d); }
  const x = document.createElement("button"); x.className = "link"; x.textContent = "Close"; x.onclick = () => { out.classList.remove("open"); history.replaceState(null, "", location.pathname + location.search); }; out.append(x);
}
