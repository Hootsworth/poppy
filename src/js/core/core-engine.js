const $ = s => document.querySelector(s);
const SYSTEM = `You are the engine of Poppy, a universal creation engine that creates whatever software, application, game, presentation, or tool the user asks for.
Reply with ONE complete, self-contained HTML document and nothing else, no commentary and no code fences. Use inline <style> and <script> only: no external files, fonts, CDNs or images (use CSS, inline SVG, canvas). It must be responsive, have a distinct, deliberately designed look suited to its subject (not a generic template), and be fully functional with real working logic and realistic content.

CRITICAL: EVERY SINGLE BUTTON MUST WORK - ABSOLUTELY ZERO DEAD BUTTONS:
1. Every single <button>, interactive <a>, tab, counter, card, toggle, filter, or control MUST have working JavaScript event listeners. Never leave dead placeholder buttons or visual-only buttons.
2. If a button says 'Get Started', 'Order', 'Buy', 'Contact', or 'Demo', clicking it MUST open a working modal, slide-over drawer, or trigger an interactive prompt.
3. If buttons are tabs (e.g. 'Overview', 'Pricing', 'Features'), clicking MUST toggle active classes and switch the visible tab content panel.
4. If it has a calculator, converter, or form, clicking Calculate/Submit MUST compute results immediately and update the screen without reloading.
5. If it is a game, buttons MUST control the game (Start, Pause, Restart, Shoot, Jump).
6. ALWAYS wrap your script in document.addEventListener('DOMContentLoaded', ...) or place all <script> tags at the very bottom of <body> (just before </body>) so all DOM elements exist before querySelector or getElementById runs.
7. Always set type="button" on all buttons that are not form submit buttons. When forms are used, always attach an onsubmit handler with e.preventDefault().
8. State may live in JS variables, localStorage, or poppy.store. When given the current page plus a change request, return the full updated document. If the request is for something unrelated, build that instead.

SPECIALIZED APPLICATION SPECIALTIES:
- SLIDE DECKS & PRESENTATIONS ("THE BEST DESIGNED SLIDEDECKS EVER"):
  When asked for a pitch deck, presentation, or slides, build an Apple Keynote-grade presentation:
  * Frame in a responsive 16:9 widescreen cinema viewport (aspect-ratio: 16/9; max-width: 1200px; margin: 0 auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5)) with dark/light luxury typography, bold numbers, stat badges, and crisp margins.
  * Include a top progress bar, bottom navigation bar with Prev/Next buttons, and a slide counter ("Slide 03 / 08").
  * Keyboard navigation: ArrowLeft/ArrowRight, Spacebar to advance slides, and "F" key for native fullscreen.
  * Presenter Notes Drawer: Press "S" or "N" or click "Speaker Notes" button to open a floating drawer with talking points and an elapsed presentation timer (Start/Pause/Reset).
  * Slide Overview Grid: Press "O" or "Esc" or click "Overview" to view a thumbnail grid of all slides and click to jump directly.
  * Clean Print-to-PDF: Complete @media print { .slide { page-break-after: always; height: 100vh; } .deck-nav, .speaker-notes, .progress-bar { display: none !important; } } for crisp 16:9 PDF export.
- GAMES & CANVAS ARCADES:
  * Run a 60fps requestAnimationFrame loop, responsive touch/WASD controls, WebAudio oscillator sounds (beeps, jumps, blasts), score, lives, game over screen, restart button, and high-score persistence via poppy.store or poppy.db.
- DESKTOP UTILITIES & TOOLS:
  * Real interactive calculation engines, format parsers, drag-and-drop file inputs, export buttons (CSV, JSON, PNG, or print), and zero placeholder text.
- MULTI-USER & REALTIME APPS:
  * Wire up poppy.room for peer collaboration, room hash links (#room=...), peer cursor tracking, and state broadcasts.`;
const IDEAS = [
  "A 10-slide keynote pitch deck for an AI robotics startup",
  "A 60fps retro space shooter with sound effects & high scores",
  "A professional client invoice & billing studio with PDF export",
  "A realtime collaborative whiteboard with peer cursors",
  "A synth I can play with my keyboard",
  "A tiny kanban board"
];
const ls = { get(k){ try { return localStorage.getItem(k) || "" } catch { return "" } }, set(k, v){ try { localStorage.setItem(k, v) } catch {} } };
let current = "", busy = false;
let currentFiles = { "index.html": "" }, activeFile = "index.html";
let siteId = ls.get("poppy.site"), hist = [], hi = -1, repairs = 0, shownAt = 0, meta = {};

IDEAS.forEach(t => { const b = document.createElement("button"); b.type = "button"; b.textContent = t; b.onclick = () => { $("#prompt").value = t; $("#homeForm").requestSubmit(); }; $("#ideas").append(b); });

function bub(t, c = ""){ const d = document.createElement("div"); d.className = "bub " + c; d.textContent = t; $("#log").append(d); return d; }
function toast(t){ const e = $("#toast"); e.textContent = t; e.style.display = "block"; clearTimeout(toast.t); toast.t = setTimeout(() => e.style.display = "none", 6000); }
const PROVIDERS = {
  anthropic: {name: "Anthropic", model: "claude-sonnet-4-6", hint: "Get a key at console.anthropic.com."},
  openai: {name: "OpenAI", model: "gpt-4.1", hint: "Get a key at platform.openai.com."},
  gemini: {name: "Gemini", model: "gemini-2.0-flash", hint: "Get a key at aistudio.google.com."},
  meta: {name: "Meta", model: "Llama-4-Maverick-17B-128E-Instruct-FP8", hint: "Get a key at llama.developer.meta.com. Meta's API may block direct browser calls."}
};
if (ls.get("poppy.key") && !ls.get("poppy.key.anthropic")) ls.set("poppy.key.anthropic", ls.get("poppy.key"));
const prov = () => ls.get("poppy.prov") || "anthropic";
const keyOf = p => ls.get("poppy.key." + p);
const modelOf = p => {
  let m = ls.get("poppy.model." + p) || PROVIDERS[p].model;
  if (p === "gemini" && (m === "gemini-2.5-pro" || m === "gemini-pro" || !m)) {
    m = "gemini-2.0-flash";
    ls.set("poppy.model.gemini", m);
  }
  return m;
};
function updateProv(){ const p = prov(), on = !!keyOf(p); $("#provLabel").textContent = on ? PROVIDERS[p].name : "Add a key";  }
let sel = "anthropic";
function saveTab(){ ls.set("poppy.key." + sel, $("#key").value.trim()); ls.set("poppy.model." + sel, $("#model").value.trim()); }
function showTab(p){
  sel = p;
  document.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-pressed", t.dataset.p === p));
  $("#key").value = keyOf(p); $("#key").placeholder = "Paste your " + PROVIDERS[p].name + " key";
  $("#model").value = ls.get("poppy.model." + p); $("#model").placeholder = PROVIDERS[p].model;
  $("#hint").textContent = PROVIDERS[p].hint;
  if (keyOf(p)) fillModels(p, keyOf(p));
}
document.querySelectorAll(".tab").forEach(t => t.onclick = () => { saveTab(); showTab(t.dataset.p); });
function openKey(){ showTab(prov()); $("#dlg").showModal(); }
if ($("#settingsBtn")) $("#settingsBtn").onclick = openKey;
if ($("#settingsBtn2")) $("#settingsBtn2").onclick = openKey;
if ($("#closeDlg")) $("#closeDlg").onclick = () => $("#dlg").close();
if ($("#saveKey")) $("#saveKey").onclick = () => { saveTab(); ls.set("poppy.prov", sel); $("#dlg").close(); updateProv(); };
updateProv();

const PH = IDEAS.map(t => t.replace(/^An? /, "A "));
let phi = 0;
setInterval(() => { if (!$("#prompt").value) $("#prompt").placeholder = PH[++phi % PH.length]; }, 3500);
const AT_OPTIONS = [
  {
    tag: "@slides",
    title: "Keynote Pitch Deck",
    desc: "16:9 presentation with speaker notes & PDF export",
    hint: "slides",
    svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>'
  },
  {
    tag: "@game",
    title: "Playable 2D Game",
    desc: "60fps canvas loop, WebAudio sound effects & controls",
    hint: "game",
    svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="6"/><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/></svg>'
  },
  {
    tag: "@pdf",
    title: "Document & Invoice Studio",
    desc: "Print-to-PDF formatting & table calculations",
    hint: "pdf",
    svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>'
  },
  {
    tag: "@tool",
    title: "Desktop Utility & Tool",
    desc: "Live calculation engines & format converters",
    hint: "tool",
    svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>'
  },
  {
    tag: "@realtime",
    title: "Collaborative Realtime App",
    desc: "Multiplayer sync & P2P whiteboard",
    hint: "realtime",
    svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
  },
  {
    tag: "@db",
    title: "Database & CRUD App",
    desc: "SQLite poppy.db tables & persistent state",
    hint: "db",
    svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>'
  },
  {
    tag: "@synth",
    title: "WebAudio Synthesizer",
    desc: "Playable musical instrument with polyphony",
    hint: "synth",
    svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
  },
  {
    tag: "@ai",
    title: "Smart AI App",
    desc: "Embedded streaming AI logic & assistants",
    hint: "ai",
    svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
  }
];

function initAtMention(inId, ddId) {
  const inp = $(inId), dd = $(ddId);
  if (!inp || !dd) return;
  let activeIdx = 0, filtered = [];

  const close = () => {
    dd.hidden = true;
    dd.innerHTML = "";
    activeIdx = 0;
  };

  const select = (tag) => {
    const val = inp.value;
    const caret = inp.selectionStart || val.length;
    const textBefore = val.slice(0, caret);
    const atIdx = textBefore.lastIndexOf("@");
    if (atIdx >= 0) {
      inp.value = val.slice(0, atIdx) + tag + " " + val.slice(caret);
      const newPos = atIdx + tag.length + 1;
      inp.setSelectionRange(newPos, newPos);
    } else {
      inp.value = tag + " " + val;
    }
    close();
    inp.focus();
    inp.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const render = (opts) => {
    filtered = opts;
    if (!opts.length) { close(); return; }
    activeIdx = 0;
    dd.innerHTML = opts.map((o, i) => `
      <div class="at-item${i === 0 ? " active" : ""}" data-tag="${o.tag}">
        <div class="at-icon" aria-hidden="true">${o.svg}</div>
        <div class="at-info">
          <div class="at-top">
            <span class="at-title">${o.title}</span>
            <span class="at-tag">${o.tag}</span>
          </div>
          <span class="at-desc">${o.desc}</span>
        </div>
      </div>
    `).join("");
    dd.hidden = false;

    dd.querySelectorAll(".at-item").forEach((item, i) => {
      item.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        select(opts[i].tag);
      };
      item.onmouseenter = () => {
        dd.querySelectorAll(".at-item").forEach(it => it.classList.remove("active"));
        item.classList.add("active");
        activeIdx = i;
      };
    });
  };

  inp.addEventListener("input", () => {
    const val = inp.value;
    const caret = inp.selectionStart || val.length;
    const textBefore = val.slice(0, caret);
    const lastAt = textBefore.lastIndexOf("@");
    if (lastAt >= 0 && !/\s/.test(textBefore.slice(lastAt))) {
      const q = textBefore.slice(lastAt + 1).toLowerCase();
      const matches = AT_OPTIONS.filter(o => o.tag.slice(1).startsWith(q) || o.title.toLowerCase().includes(q) || o.hint.includes(q));
      render(matches);
    } else {
      close();
    }
  });

  inp.addEventListener("keydown", (e) => {
    if (dd.hidden) return;
    const items = dd.querySelectorAll(".at-item");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIdx = (activeIdx + 1) % items.length;
      items.forEach((it, i) => it.classList.toggle("active", i === activeIdx));
      items[activeIdx]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIdx = (activeIdx - 1 + items.length) % items.length;
      items.forEach((it, i) => it.classList.toggle("active", i === activeIdx));
      items[activeIdx]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (filtered[activeIdx]) {
        e.preventDefault();
        select(filtered[activeIdx].tag);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  });

  document.addEventListener("click", (e) => {
    if (!dd.contains(e.target) && e.target !== inp) close();
  });
}
initAtMention("#prompt", "#atDropdown");
initAtMention("#tweak", "#tweakAtDropdown");
$("#prompt").addEventListener("input", e => $("#flower").style.setProperty("--lean", Math.min(e.target.value.length, 40) * 3 + "deg"));

function burst(x, y){
  if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  for (let i = 0; i < 16; i++) {
    const d = document.createElement("i"); d.className = "bit"; d.style.left = x + "px"; d.style.top = y + "px"; document.body.append(d);
    const a = i / 16 * Math.PI * 2 + Math.random() * .4, dist = 90 + Math.random() * 130;
    d.animate([{transform: "translate(-50%,-50%) scale(.4)", opacity: 1}, {transform: `translate(calc(-50% + ${Math.cos(a) * dist}px),calc(-50% + ${Math.sin(a) * dist}px)) rotate(${Math.random() * 360}deg) scale(1)`, opacity: 0}], {duration: 800 + Math.random() * 400, easing: "cubic-bezier(.15,.7,.3,1)"}).onfinish = () => d.remove();
  }
}

function extractHtml(t){
  if (!t || typeof t !== "string") return "";

  // 1. Check all markdown code blocks for one containing actual HTML markup
  const blocks = [...t.matchAll(/```(?:html)?\s*[\r\n]+([\s\S]*?)(?:```|$)/gi)];
  for (const b of blocks) {
    const code = b[1].trim();
    if (/<(!doctype|html|body|main|div|style|script)\b/i.test(code)) {
      const start = code.search(/<!doctype|<html/i);
      let res = (start >= 0 ? code.slice(start) : code).trim();
      if (/=\\"|viewBox=\\"|d=\\"|class=\\"|id=\\"/i.test(res)) res = res.replace(/\\"/g, '"');
      return res;
    }
  }

  // 2. If no code block contained HTML, search raw text for <!doctype or <html
  const startIdx = t.search(/<!doctype|<html/i);
  if (startIdx >= 0) {
    let raw = t.slice(startIdx);
    const endIdx = raw.search(/<\/html>/i);
    if (endIdx > 0) raw = raw.slice(0, endIdx + 7);
    let res = raw.trim();
    if (/=\\"|viewBox=\\"|d=\\"|class=\\"|id=\\"/i.test(res)) res = res.replace(/\\"/g, '"');
    return res;
  }

  // 3. Fallback to any content with HTML tags
  if (/<[a-z!]/i.test(t)) {
    const fIdx = t.indexOf("<");
    let res = t.slice(fIdx).trim();
    if (/=\\"|viewBox=\\"|d=\\"|class=\\"|id=\\"/i.test(res)) res = res.replace(/\\"/g, '"');
    return res;
  }

  let res = t.trim();
  if (/=\\"|viewBox=\\"|d=\\"|class=\\"|id=\\"/i.test(res)) res = res.replace(/\\"/g, '"');
  return res;
}

const today = () => new Date().toISOString().slice(0, 10);
function meterGet(){ try { const m = JSON.parse(ls.get("poppy.meter") || "{}"); if (m.d === today()) return m; } catch {} return {d: today(), n: 0, s: {}}; }
const fmtTok = n => n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "k" : String(n);
function updUsage(){
  const m = meterGet(); $("#usage").textContent = (aiCount ? aiCount + " site AI call" + (aiCount === 1 ? "" : "s") + " \u00b7 " : "") + "~" + fmtTok(m.n) + " tokens today \u00b7 ~" + fmtTok(m.s[siteId || "new"] || 0) + " this site";
  const ml = $("#meterLine"); if (ml) ml.textContent = "Today: about " + fmtTok(m.n) + " tokens used across all sites (an estimate).";
}
function meterAdd(i, o){ const m = meterGet(), k = siteId || "new"; m.n += i + o; m.s[k] = (m.s[k] || 0) + i + o; ls.set("poppy.meter", JSON.stringify(m)); updUsage(); }
const estTok = (msgs, sys) => Math.ceil((sys.length + msgs.reduce((a, m) => a + String(m.content).length + (m.image ? 4000 : 0), 0)) / 4);
async function* stream(messages, system = SYSTEM, pv){
  let o = 0; const i = estTok(messages, system);
  try { for await (const t of streamRaw(messages, system, pv)) { o += t.length; yield t; } } finally { meterAdd(i, Math.ceil(o / 4)); }
}
async function* streamRaw(messages, system = SYSTEM, pv = prov()){
  const p = pv, P = PROVIDERS[p], key = keyOf(p), model = modelOf(p);
  if (!key) throw new Error("Add your " + P.name + " API key first.");
  let url, headers = {"content-type": "application/json"}, body;
  const chat = [{role: "system", content: system}, ...messages.map(m => vis(p, m))];
  if (p === "anthropic") {
    url = "https://api.anthropic.com/v1/messages";
    Object.assign(headers, {"x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true"});
    body = {model, max_tokens: 16000, stream: true, system, messages: messages.map(m => vis(p, m))};
  } else if (p === "gemini") {
    url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":streamGenerateContent?alt=sse";
    headers["x-goog-api-key"] = key;
    body = {systemInstruction: {parts: [{text: system}]}, contents: messages.map(m => ({role: "user", parts: [...(m.image ? [{inline_data: {mime_type: m.image.mime, data: m.image.b64}}] : []), {text: m.content}]})), generationConfig: {maxOutputTokens: 16000}};
  } else {
    url = p === "openai" ? "https://api.openai.com/v1/chat/completions" : "https://api.llama.com/compat/v1/chat/completions";
    headers.authorization = "Bearer " + key;
    body = {model, stream: true, messages: chat};
    body[p === "openai" ? "max_completion_tokens" : "max_tokens"] = 16000;
  }
  let r;
  try { r = await fetch(url, {method: "POST", headers, body: JSON.stringify(body)}); }
  catch { throw new Error(navigator.onLine === false ? "You're offline. Check your connection and try again." : "Couldn't reach " + P.name + "." + (p === "meta" ? " Meta's API may block calls straight from a browser (CORS), so try another provider." : " Check your connection, or a browser extension may be blocking it.")); }
  if (!r.ok) {
    let m = ""; try { const j = await r.json(); m = j.error?.message || j[0]?.error?.message || "" } catch {}
    throw new Error([401, 403].includes(r.status) || /api key|api_key|authentication/i.test(m) ? P.name + " rejected that API key. Check it in Switch AI." : r.status === 429 ? P.name + " says you are out of quota or going too fast. Wait a minute and try again." : r.status === 404 ? "Model " + model + " wasn't found at " + P.name + ". Pick another one in Switch AI." : r.status >= 500 ? P.name + " is having trouble right now. Try again shortly." : (m || P.name + " returned an error (" + r.status + ")."));
  }
  const rd = r.body.getReader(), dec = new TextDecoder(); let buf = "";
  for (;;) {
    const {done, value} = await rd.read(); if (done) break;
    buf += dec.decode(value, {stream: true});
    const lines = buf.split("\n"); buf = lines.pop();
    for (const l of lines) {
      if (!l.startsWith("data:")) continue;
      const raw = l.slice(5).trim(); if (!raw || raw === "[DONE]") continue;
      let j; try { j = JSON.parse(raw) } catch { continue }
      if (j.error) throw new Error(j.error.message || "Stream error.");
      let t = "";
      if (p === "anthropic") t = j.type === "content_block_delta" && j.delta?.type === "text_delta" ? j.delta.text : "";
      else if (p === "gemini") t = (j.candidates?.[0]?.content?.parts || []).map(x => x.text || "").join("");
      else t = j.choices?.[0]?.delta?.content || "";
      if (t) yield t;
    }
  }
}

/* ===== Connectors: registry, storage, safe API calls, connect UI ===== */
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const H = (k, p = "", f = "token") => ({t: "h", k, p, f}), Q = (k, f = "token") => ({t: "q", k, f}), B = f => H("Authorization", "Bearer ", f);
const KEY = [["token", "API key", "password"]], TOK = [["token", "Access token", "password"]];
const CONNECTORS = [
  {id: "google", n: "Google", cat: "Accounts", d: "Calendar, Drive, Sheets, Gmail", oauth: 1, base: "https://www.googleapis.com", fields: [["cid", "OAuth client ID", "text", "xxxx.apps.googleusercontent.com"]], help: "Create a Web client ID in Google Cloud Console and add this page's address as an authorised JavaScript origin. Needs https:// or http://localhost."},
  {id: "spotify", n: "Spotify", cat: "Accounts", d: "Playlists, playback, library", oauth: 1, base: "https://api.spotify.com/v1", fields: [["cid", "Client ID", "text"]], help: "Create an app at developer.spotify.com and add this page's address as a redirect URI. Needs https:// or http://127.0.0.1."},
  {id: "openai", n: "OpenAI", cat: "AI", d: "GPT chat, images, speech", base: "https://api.openai.com/v1", fields: KEY, auth: [B()], test: "/models", help: "Create a key at platform.openai.com/api-keys."},
  {id: "anthropic", n: "Anthropic", cat: "AI", d: "Claude models", base: "https://api.anthropic.com/v1", fields: KEY, auth: [H("x-api-key")], head: {"anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true"}, test: "/models?limit=1", help: "Create a key at console.anthropic.com."},
  {id: "gemini", n: "Google Gemini", cat: "AI", d: "Gemini text, vision, images", base: "https://generativelanguage.googleapis.com/v1beta", fields: KEY, auth: [H("x-goog-api-key")], test: "/models?pageSize=1", help: "Get a key at aistudio.google.com."},
  {id: "groq", n: "Groq", cat: "AI", d: "Very fast open models", base: "https://api.groq.com/openai/v1", fields: KEY, auth: [B()], test: "/models", help: "Get a key at console.groq.com/keys."},
  {id: "openrouter", n: "OpenRouter", cat: "AI", d: "One key for hundreds of models", base: "https://openrouter.ai/api/v1", fields: KEY, auth: [B()], test: "/auth/key", help: "Get a key at openrouter.ai/keys."},
  {id: "mistral", n: "Mistral", cat: "AI", d: "Mistral chat and embeddings", base: "https://api.mistral.ai/v1", fields: KEY, auth: [B()], test: "/models", help: "Get a key at console.mistral.ai."},
  {id: "together", n: "Together AI", cat: "AI", d: "Open models and image generation", base: "https://api.together.xyz/v1", fields: KEY, auth: [B()], test: "/models", help: "Get a key at api.together.ai."},
  {id: "cohere", n: "Cohere", cat: "AI", d: "Chat, rerank, embeddings", base: "https://api.cohere.com/v2", fields: KEY, auth: [B()], test: "/models", help: "Get a key at dashboard.cohere.com/api-keys."},
  {id: "perplexity", n: "Perplexity", cat: "AI", d: "Answers with web search", base: "https://api.perplexity.ai", fields: KEY, auth: [B()], help: "Get a key in your Perplexity API settings."},
  {id: "xai", n: "xAI", cat: "AI", d: "Grok models", base: "https://api.x.ai/v1", fields: KEY, auth: [B()], test: "/models", help: "Get a key at console.x.ai."},
  {id: "huggingface", n: "Hugging Face", cat: "AI", d: "Hosted open models", base: "https://router.huggingface.co/v1", fields: TOK, auth: [B()], test: "/models", help: "Create a token at huggingface.co/settings/tokens."},
  {id: "elevenlabs", n: "ElevenLabs", cat: "Voice and audio", d: "Text to speech, voices", base: "https://api.elevenlabs.io/v1", fields: KEY, auth: [H("xi-api-key")], test: "/user", help: "Find your key in your ElevenLabs profile. Use response:\"base64\" for audio."},
  {id: "deepgram", n: "Deepgram", cat: "Voice and audio", d: "Speech to text", base: "https://api.deepgram.com/v1", fields: KEY, auth: [H("Authorization", "Token ")], test: "/projects", help: "Create a key in the Deepgram console."},
  {id: "assemblyai", n: "AssemblyAI", cat: "Voice and audio", d: "Transcription", base: "https://api.assemblyai.com/v2", fields: KEY, auth: [H("authorization")], test: "/transcript?limit=1", help: "Find your key on the AssemblyAI dashboard."},
  {id: "stability", n: "Stability AI", cat: "Voice and audio", d: "Image generation", base: "https://api.stability.ai", fields: KEY, auth: [B()], test: "/v1/user/account", help: "Create a key at platform.stability.ai. Use response:\"base64\" for images."},
  {id: "giphy", n: "Giphy", cat: "Media and maps", d: "GIF search", base: "https://api.giphy.com/v1", fields: KEY, auth: [Q("api_key")], test: "/gifs/trending?limit=1", help: "Create an app at developers.giphy.com."},
  {id: "unsplash", n: "Unsplash", cat: "Media and maps", d: "Free photos", base: "https://api.unsplash.com", fields: [["token", "Access key", "password"]], auth: [H("Authorization", "Client-ID ")], test: "/photos?per_page=1", help: "Create an app at unsplash.com/developers."},
  {id: "pexels", n: "Pexels", cat: "Media and maps", d: "Free photos and video", base: "https://api.pexels.com/v1", fields: KEY, auth: [H("Authorization")], test: "/curated?per_page=1", help: "Get a key at pexels.com/api."},
  {id: "pixabay", n: "Pixabay", cat: "Media and maps", d: "Images and video", base: "https://pixabay.com/api", fields: KEY, auth: [Q("key")], test: "/?q=cat&per_page=3", help: "Find your key at pixabay.com/api/docs."},
  {id: "youtube", n: "YouTube Data", cat: "Media and maps", d: "Search videos, channels", base: "https://www.googleapis.com/youtube/v3", fields: KEY, auth: [Q("key")], test: "/videos?part=id&chart=mostPopular&maxResults=1", help: "Create a key in Google Cloud and enable YouTube Data API v3."},
  {id: "mapbox", n: "Mapbox", cat: "Media and maps", d: "Geocoding, directions", base: "https://api.mapbox.com", fields: [["token", "Public access token", "password"]], auth: [Q("access_token")], test: "/geocoding/v5/mapbox.places/london.json?limit=1", help: "Copy a public token from account.mapbox.com."},
  {id: "openweather", n: "OpenWeather", cat: "Data and finance", d: "Weather, forecasts, air quality", base: "https://api.openweathermap.org", fields: KEY, auth: [Q("appid")], test: "/data/2.5/weather?q=London", help: "Get a key at openweathermap.org/api. New keys take a while to activate."},
  {id: "nasa", n: "NASA", cat: "Data and finance", d: "Picture of the day, Mars, asteroids", base: "https://api.nasa.gov", fields: KEY, auth: [Q("api_key")], test: "/planetary/apod", help: "Get a free key at api.nasa.gov."},
  {id: "tmdb", n: "TMDB", cat: "Data and finance", d: "Movies and TV", base: "https://api.themoviedb.org/3", fields: [["token", "API read access token", "password"]], auth: [B()], test: "/configuration", help: "Use the read access token from themoviedb.org/settings/api."},
  {id: "omdb", n: "OMDb", cat: "Data and finance", d: "Movie details and ratings", base: "https://www.omdbapi.com", fields: KEY, auth: [Q("apikey")], test: "/?t=Inception", help: "Get a key at omdbapi.com/apikey.aspx."},
  {id: "alphavantage", n: "Alpha Vantage", cat: "Data and finance", d: "Stocks, FX, indicators", base: "https://www.alphavantage.co", fields: KEY, auth: [Q("apikey")], test: "/query?function=GLOBAL_QUOTE&symbol=IBM", help: "Get a free key at alphavantage.co."},
  {id: "finnhub", n: "Finnhub", cat: "Data and finance", d: "Market data, news", base: "https://finnhub.io/api/v1", fields: KEY, auth: [H("X-Finnhub-Token")], test: "/quote?symbol=AAPL", help: "Get a key at finnhub.io."},
  {id: "coingecko", n: "CoinGecko", cat: "Data and finance", d: "Crypto prices", base: "https://api.coingecko.com/api/v3", fields: [["token", "Demo API key", "password"]], auth: [H("x-cg-demo-api-key")], test: "/ping", help: "Create a demo key at coingecko.com/en/api."},
  {id: "spoonacular", n: "Spoonacular", cat: "Data and finance", d: "Recipes and nutrition", base: "https://api.spoonacular.com", fields: KEY, auth: [Q("apiKey")], test: "/recipes/random?number=1", help: "Get a key at spoonacular.com/food-api."},
  {id: "serper", n: "Serper", cat: "Search", d: "Google search results", base: "https://google.serper.dev", fields: KEY, auth: [H("X-API-KEY")], help: "Get a key at serper.dev. Call with method POST to \"/search\"."},
  {id: "exa", n: "Exa", cat: "Search", d: "Neural web search", base: "https://api.exa.ai", fields: KEY, auth: [H("x-api-key")], help: "Get a key at dashboard.exa.ai."},
  {id: "github", n: "GitHub", cat: "Developer", d: "Repos, issues, gists, actions", base: "https://api.github.com", fields: [["token", "Personal access token", "password"]], auth: [B()], head: {accept: "application/vnd.github+json"}, test: "/user", help: "Use a fine-grained token limited to the repos you want."},
  {id: "vercel", n: "Vercel", cat: "Developer", d: "Projects and deployments", base: "https://api.vercel.com", fields: TOK, auth: [B()], test: "/v2/user", help: "Create a token at vercel.com/account/tokens."},
  {id: "netlify", n: "Netlify", cat: "Developer", d: "Deployments and sites", base: "https://api.netlify.com/api/v1", fields: TOK, auth: [B()], test: "/user", help: "Create a personal access token in Netlify User settings."},
  {id: "cloudflare", n: "Cloudflare", cat: "Developer", d: "Pages and Workers", base: "https://api.cloudflare.com/client/v4", fields: TOK, auth: [B()], test: "/user/tokens/verify", help: "Create an API Token with Cloudflare Pages permissions at dash.cloudflare.com."},
  {id: "supabase", n: "Supabase", cat: "Developer", d: "Postgres tables over REST", base: v => v.url.replace(/\/+$/, "") + "/rest/v1", fields: [["url", "Project URL", "text", "https://xxxx.supabase.co"], ["key", "Anon key", "password"]], auth: [H("apikey", "", "key"), B("key")], head: {prefer: "return=representation"}, help: "Use the anon key only, and keep row-level security on."},
  {id: "upstash", n: "Upstash Redis", cat: "Developer", d: "Serverless Redis over REST", base: v => v.url, fields: [["url", "REST URL", "text", "https://xxxx.upstash.io"], ["token", "REST token", "password"]], auth: [B()], test: "/ping", help: "Copy both values from your Upstash database page."},
  {id: "dropbox", n: "Dropbox", cat: "Developer", d: "Files and folders", base: "https://api.dropboxapi.com/2", fields: TOK, auth: [B()], test: {path: "/users/get_current_account", method: "POST"}, help: "Create an access token in your Dropbox app console."},
  {id: "todoist", n: "Todoist", cat: "Productivity", d: "Tasks and projects", base: "https://api.todoist.com/rest/v2", fields: TOK, auth: [B()], test: "/projects", help: "Find your token in Todoist settings, Integrations."},
  {id: "airtable", n: "Airtable", cat: "Productivity", d: "Bases, tables, records", base: "https://api.airtable.com/v0", fields: [["token", "Personal access token", "password"]], auth: [B()], test: "/meta/whoami", help: "Create a token at airtable.com/create/tokens."},
  {id: "linear", n: "Linear", cat: "Productivity", d: "Issues and projects (GraphQL)", base: "https://api.linear.app", fields: [["token", "Personal API key", "password"]], auth: [H("Authorization")], test: {path: "/graphql", method: "POST", body: {query: "{viewer{id}}"}}, help: "Create a key in Linear settings, API. POST to \"/graphql\"."},
  {id: "trello", n: "Trello", cat: "Productivity", d: "Boards and cards", base: "https://api.trello.com/1", fields: [["key", "API key", "text"], ["token", "Token", "password"]], auth: [Q("key", "key"), Q("token")], test: "/members/me", help: "Get both at trello.com/power-ups/admin."},
  {id: "discord", n: "Discord webhook", cat: "Messaging", d: "Post messages to a channel", base: v => v.url, hosts: ["discord.com", "discordapp.com"], fields: [["url", "Webhook URL", "password"]], auth: [], test: "", help: "Channel settings, Integrations, Webhooks. Call with method POST and path \"\"."},
  {id: "telegram", n: "Telegram bot", cat: "Messaging", d: "Send and read bot messages", base: v => { if (!/^[\w:-]{20,80}$/.test(v.token)) throw new Error("That doesn't look like a Telegram bot token."); return "https://api.telegram.org/bot" + v.token; }, fields: [["token", "Bot token", "password"]], auth: [], test: "/getMe", help: "Create a bot with @BotFather and paste its token."},
  {id: "notion", n: "Notion", cat: "Productivity", d: "Pages, databases, blocks", relay: 1, base: "https://api.notion.com/v1", fields: KEY, auth: [B(), H("Notion-Version", "2022-06-28")], test: "/users/me", help: "Create an internal integration at notion.so/my-integrations. Needs Poppy Relay for CORS."},
  {id: "stripe", n: "Stripe", cat: "Data and finance", d: "Customers, invoices, payments", relay: 1, base: "https://api.stripe.com/v1", fields: KEY, auth: [B()], test: "/balance", help: "Use your test secret key (sk_test_...). Needs Poppy Relay for CORS."},
  {id: "resend", n: "Resend", cat: "Messaging", d: "Transactional email", relay: 1, base: "https://api.resend.com", fields: KEY, auth: [B()], test: "/api-keys", help: "Get an API key at resend.com. Needs Poppy Relay for CORS."},
  {id: "slack", n: "Slack", cat: "Messaging", d: "Channels and messages", relay: 1, base: "https://slack.com/api", fields: TOK, auth: [B()], test: {path: "/auth.test", method: "POST"}, help: "Create a Slack App with Bot Token Scopes at api.slack.com. Needs Poppy Relay for CORS."}
];
const customs = () => { try { return JSON.parse(ls.get("poppy.custom") || "[]") } catch { return [] } };
const toConn = x => ({id: x.id, n: x.n, cat: "Your own", d: x.base.replace("https://", ""), custom: 1, base: x.base, fields: x.header ? [["value", "Secret value", "password"]] : [], auth: x.header ? [H(x.header, x.prefix || "", "value")] : [], help: "Calls go to " + x.base + " only."});
const allConns = () => CONNECTORS.concat(customs().map(toConn));
const findConn = id => allConns().find(c => c.id === id);
const hue = s => [...s].reduce((a, c) => a + c.charCodeAt(0) * 7, 0) % 360;
function getVals(c){ if (c.id === "google") return {cid: ls.get("poppy.gcid")}; if (c.id === "spotify") return {cid: ls.get("poppy.spcid")}; try { return JSON.parse(ls.get("poppy.c." + c.id) || "{}") || {}; } catch { return {}; } }
function setVals(c, v){ if (c.id === "google") ls.set("poppy.gcid", v.cid || ""); else if (c.id === "spotify") ls.set("poppy.spcid", v.cid || ""); else ls.set("poppy.c." + c.id, JSON.stringify(v)); }
function isOn(c){ if (c.id === "google") return !!gTok && Date.now() < gExp; if (c.id === "spotify") return !!ls.get("poppy.sp"); const v = getVals(c); return c.fields.every(([k]) => v[k]); }
function disconnect(c){ if (c.id === "google") { gTok = null; gExp = 0; } else if (c.id === "spotify") ls.set("poppy.sp", ""); else if (c.custom) { ls.set("poppy.custom", JSON.stringify(customs().filter(x => x.id !== c.id))); ls.set("poppy.c." + c.id, ""); } else setVals(c, {}); }
const usedConns = html => { const ids = new Set(), re = /poppy\.connect(?:\.([a-z][\w-]*)|\(\s*["']([\w-]+)["'])/g; let m; while ((m = re.exec(html))) { const id = m[1] || m[2]; if (id !== "list" && findConn(id)) ids.add(id); } return [...ids]; };
const missingConns = html => usedConns(html).filter(id => !isOn(findConn(id)));
function connDoc(){
  const all = allConns(), on = all.filter(isOn).map(c => c.id);
  return " Connectors: poppy.connect.<id>(path,{method,body,query,headers,form,response:\"base64\"}) or poppy.connect(\"<id>\",path,opts) calls a service the user has connected. Poppy adds the base URL and the user's credentials and asks the user to connect it automatically, so never ask for keys inside the page and never hard-code them. path is relative to the base (start it with /). It returns {ok,status,json,text,b64,type}. Ids and base URLs: " + all.filter(c => !c.oauth).map(c => c.id + " (" + (typeof c.base === "string" ? c.base.replace("https://", "") : "user-supplied URL") + ")").join(", ") + ". id google takes a full googleapis.com URL for Calendar, Drive, Sheets, Gmail; id spotify takes paths like \"/me/playlists\". poppy.connect.list() returns the ids." + (on.length ? " Connected right now: " + on.join(", ") + "." : "");
}
function secLog(e){
  try {
    const logs = JSON.parse(ls.get("poppy.sec.log") || "[]");
    logs.unshift({ t: e.t || Date.now(), c: e.c, path: e.path, status: e.status, siteId: e.siteId || siteId || "home", siteName: e.siteName || meta?.name || "Site" });
    ls.set("poppy.sec.log", JSON.stringify(logs.slice(0, 100)));
  } catch {}
}
async function apiCall(c, v, path, o = {}){
  const base = typeof c.base === "function" ? c.base(v) : c.base;
  if (!/^https:\/\//i.test(base)) throw new Error("The service URL must start with https://");
  const b = new URL(base); if (PRIVATE.test(b.hostname)) throw new Error("Private addresses are blocked.");
  if (c.hosts && !c.hosts.some(h => b.hostname === h || b.hostname.endsWith("." + h))) throw new Error("That URL isn't allowed for " + c.n + ".");
  if (typeof path !== "string" || (path && path[0] !== "/" && path[0] !== "?")) throw new Error("The path must start with /.");
  const root = b.href.replace(/[?#].*$/, "").replace(/\/+$/, ""), u = new URL(root + path);
  if (u.origin !== b.origin || !u.pathname.startsWith(b.pathname.replace(/\/+$/, ""))) throw new Error("That path escapes the connector's base URL.");
  const h = {};
  if (o.headers && typeof o.headers === "object") for (const [k, x] of Object.entries(o.headers)) if (typeof x === "string" && !/^(authorization|cookie|host|x-api-key|apikey|proxy-.*)$/i.test(k)) h[k] = x;
  Object.assign(h, c.head || {});
  if (o.query && typeof o.query === "object") for (const [k, x] of Object.entries(o.query)) u.searchParams.set(k, String(x));
  for (const r of c.auth || []) { if (r.t === "q") u.searchParams.set(r.k, v[r.f]); else h[r.k] = r.p + v[r.f]; }
  if (c.id === "google") { if (!gTok || Date.now() >= gExp) throw new Error("Sign in to Google first."); h.authorization = "Bearer " + gTok; }
  if (c.id === "spotify") h.authorization = "Bearer " + await spToken();
  let body;
  if (o.form && typeof o.form === "object") { body = new URLSearchParams(o.form); }
  else if (o.body != null) { if (typeof o.body === "string") body = o.body; else { body = JSON.stringify(o.body); if (!Object.keys(h).some(k => k.toLowerCase() === "content-type")) h["content-type"] = "application/json"; } }
  const m = /^(GET|POST|PUT|PATCH|DELETE)$/i.test(o.method || "") ? o.method.toUpperCase() : "GET";
  let fetchUrl = u;
  if (c.relay) {
    const rUrl = ls.get("poppy.relay.url");
    const rSec = ls.get("poppy.relay.secret");
    if (!rUrl) throw new Error(c.n + " requires Poppy Relay for CORS. Deploy the Worker script and set your Relay URL in Connectors.");
    fetchUrl = new URL(rUrl);
    h["x-poppy-target"] = u.href;
    if (rSec) h["x-poppy-relay-secret"] = rSec;
  }
  const r = await fetch(fetchUrl, {method: m, headers: h, body: m === "GET" ? undefined : body, credentials: "omit"});
  if (r.redirected && PRIVATE.test(new URL(r.url).hostname)) throw new Error("That request was redirected to a private address and was blocked.");
  const type = r.headers.get("content-type") || "";
  try {
    const logs = JSON.parse(ls.get("poppy.sec.log") || "[]");
    logs.unshift({ t: Date.now(), c: c.id, path, status: r.status, siteId: siteId || "home", siteName: meta.name || "Site" });
    ls.set("poppy.sec.log", JSON.stringify(logs.slice(0, 100)));
  } catch {}
  if (o.response === "base64") {
    const buf = new Uint8Array(await r.arrayBuffer()); if (buf.length > 20e6) throw new Error("That response is too large (over 20 MB).");
    let s = ""; for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
    return {ok: r.ok, status: r.status, b64: btoa(s), type};
  }
  const text = await r.text(); let json; try { json = JSON.parse(text); } catch {}
  return {ok: r.ok, status: r.status, json, text, type};
}

/* ===== Phase 1: prompts, SDK, bridge, storage, history, self-repair ===== */
const SDKDOC = `
The page runs inside Poppy, which provides window.poppy (every method returns a Promise): poppy.ai(prompt,{system,json}) asks an AI model, use it for any smart behavior; poppy.store.get(key)/set(key,value)/delete(key)/list(prefix) saves persistent JSON data, use it instead of localStorage which does not work here; poppy.asset(name) loads an asset image/file as a data URL; poppy.asset.list() lists asset names; poppy.db.query(sql,params)/exec(sql,params)/migrate(migrations)/export()/import(data) provides a real SQLite database per site; poppy.room.join(id)/send(peer,msg)/broadcast(msg)/onMessage(cb)/link() provides P2P realtime sync; poppy.automate.on(trigger,action)/list()/remove(id) creates background automations (open,timer,change,webhook); poppy.connect.supabase.auth.signUp/signIn/signOut/user/session and .realtime.subscribe(table,cb) provide authentication and realtime; poppy.fetch(url) returns {ok,status,text,json} for public HTTPS APIs such as api.open-meteo.com, *.wikipedia.org, pokeapi.co, restcountries.com, hacker-news.firebaseio.com, api.github.com, openlibrary.org; poppy.files.open() returns {name,text}; poppy.files.save(name,text) downloads a file; poppy.speak(text); poppy.clipboard.write(text); poppy.notify(title,body); poppy.geo() returns {lat,lon}; poppy.listen() returns spoken text; poppy.share({title,text,url}); poppy.files.pickDirectory() returns {name,files:[{path,size,text}]}; await poppy.use("pyodide"|"sqlite"|"transformers"|"duckdb"|"ffmpeg") loads that heavy library and returns it (pyodide is a Python runtime, sqlite is sql.js); Check that window.poppy exists and degrade gracefully if it does not.`;
let BUILD = "", EDIT = "";
function prompts(){ BUILD = SYSTEM + SDKDOC + connDoc(); EDIT = EDIT0 + SDKDOC + connDoc(); }
const EDIT0 = `You edit a web page for Poppy. You get the current page and a change request. Reply ONLY with one or more edit blocks in exactly this format:
FILE: filename (optional, e.g. style.css)
<<<<<<< SEARCH
(exact existing text, long enough to be unique)
=======
(replacement text)
>>>>>>> REPLACE
Copy SEARCH text exactly from the page and keep edits small. Only if the request is for a completely different site, reply with one full self-contained HTML document instead.`;

const SDK = `(()=>{const P=window.parent,pend={};let n=0;
let lsSafe=true;try{window.localStorage.getItem("__t");}catch(e){lsSafe=false;}
if(!lsSafe){
  const mem={};
  try{
    Object.defineProperty(window,"localStorage",{
      value:{
        getItem:k=>mem[k]??null,
        setItem:(k,v)=>{mem[k]=String(v)},
        removeItem:k=>{delete mem[k]},
        clear:()=>{Object.keys(mem).forEach(k=>delete mem[k])},
        get length(){return Object.keys(mem).length},
        key:i=>Object.keys(mem)[i]??null
      },
      configurable:true,writable:true
    });
    Object.defineProperty(window,"sessionStorage",{value:window.localStorage,configurable:true,writable:true});
  }catch(e){}
}
document.addEventListener("submit",e=>{
  if(!e.defaultPrevented&&(!e.target.action||e.target.action.startsWith("about:")||e.target.action===window.location.href)){
    e.preventDefault();
  }
},false);
let inspBox=null,inspBadge=null,inspActive=false;
const createInsp=()=>{
  if(!inspBox){
    inspBox=document.createElement("div");
    inspBox.id="__poppy_insp_box";
    inspBox.style.cssText="position:fixed;pointer-events:none;border:2px solid #ff4438;background:rgba(255,68,56,0.12);z-index:2147483647;display:none;border-radius:4px;box-sizing:border-box;";
    document.body.appendChild(inspBox);
  }
  if(!inspBadge){
    inspBadge=document.createElement("div");
    inspBadge.id="__poppy_insp_badge";
    inspBadge.style.cssText="position:fixed;pointer-events:none;background:#ff4438;color:#fff;font-family:-apple-system,sans-serif;font-size:11px;font-weight:700;padding:2px 6px;border-radius:3px;z-index:2147483647;display:none;box-shadow:0 2px 5px rgba(0,0,0,0.2);";
    document.body.appendChild(inspBadge);
  }
};
const getSel=el=>{
  if(!el||el===document.body||el===document.documentElement)return"body";
  if(el.id)return"#"+el.id;
  const tag=el.tagName.toLowerCase();
  if(el.className&&typeof el.className==="string"){
    const cls=el.className.trim().split(/\\s+/).filter(c=>!c.startsWith("__poppy_")&&!c.includes(":")).join(".");
    if(cls){
      const full=tag+"."+cls;
      if(document.querySelectorAll(full).length===1)return full;
    }
  }
  let path=[],cur=el;
  while(cur&&cur!==document.body&&cur.parentNode){
    let s=cur.tagName.toLowerCase();
    if(cur.id){path.unshift("#"+cur.id);break;}
    else{
      let sib=cur,nth=1;
      while(sib=sib.previousElementSibling){if(sib.tagName.toLowerCase()===s)nth++;}
      if(nth>1)s+=":nth-of-type("+nth+")";
      path.unshift(s);
    }
    cur=cur.parentNode;
  }
  return path.join(" > ")||tag;
};
const onInspMove=e=>{
  if(!inspActive)return;
  const t=e.target;
  if(!t||t===inspBox||t===inspBadge||t===document.body||t===document.documentElement){
    if(inspBox)inspBox.style.display="none";if(inspBadge)inspBadge.style.display="none";return;
  }
  createInsp();
  const r=t.getBoundingClientRect();
  inspBox.style.display="block";inspBox.style.left=r.left+"px";inspBox.style.top=r.top+"px";inspBox.style.width=r.width+"px";inspBox.style.height=r.height+"px";
  inspBadge.style.display="block";
  inspBadge.textContent=t.tagName.toLowerCase()+(t.id?"#"+t.id:(t.className&&typeof t.className==="string"?"."+t.className.trim().split(/\\s+/)[0]:""));
  let bt=r.top-22;if(bt<2)bt=r.bottom+4;
  inspBadge.style.left=Math.max(2,r.left)+"px";inspBadge.style.top=bt+"px";
};
const onInspClick=e=>{
  if(!inspActive)return;
  e.preventDefault();e.stopPropagation();
  const t=e.target;
  if(!t||t===inspBox||t===inspBadge)return;
  const sel=getSel(t);
  const cs=window.getComputedStyle(t);
  const styles={fontSize:cs.fontSize||"",padding:cs.padding||"",borderRadius:cs.borderRadius||"",backgroundColor:cs.backgroundColor||"",color:cs.color||""};
  P.postMessage({poppy:1,cmdRes:"element_selected",selector:sel,tag:t.tagName.toLowerCase(),text:(t.innerText||t.textContent||"").trim(),outerHtml:t.outerHTML,styles},"*");
  inspActive=false;
  if(inspBox)inspBox.style.display="none";if(inspBadge)inspBadge.style.display="none";
};
addEventListener("message",e=>{
  const m=e.data;if(!m||m.poppy!==1)return;
  if(m.roomMsg&&window.__poppy_room_cb){try{window.__poppy_room_cb(m.roomMsg.data,m.roomMsg.from)}catch(e){}return;}
  if(m.sbMsg&&window.__poppy_sb_cb){try{window.__poppy_sb_cb(m.sbMsg.payload,m.sbMsg.event)}catch(e){}return;}
  if(m.cmd==="inspector"){
    inspActive=!!m.active;
    if(inspActive){
      createInsp();
      document.addEventListener("mousemove",onInspMove,true);
      document.addEventListener("click",onInspClick,true);
    }else{
      document.removeEventListener("mousemove",onInspMove,true);
      document.removeEventListener("click",onInspClick,true);
      if(inspBox)inspBox.style.display="none";if(inspBadge)inspBadge.style.display="none";
    }
    return;
  }
  if(m.cmd==="update_element_text"){
    try{const el=document.querySelector(m.selector);if(el)el.innerText=m.text;}catch(e){}return;
  }
  if(m.cmd==="update_element_style"){
    try{const el=document.querySelector(m.selector);if(el&&m.prop)el.style[m.prop]=m.val;}catch(e){}return;
  }
  if(m.cmd==="replace_element_html"){
    try{const el=document.querySelector(m.selector);if(el&&m.newHtml)el.outerHTML=m.newHtml;}catch(e){}return;
  }
  if(m.cmd==="read_dom"){
    const summarize=el=>{if(!el||el.nodeType!==1)return null;const info={tag:el.tagName.toLowerCase()};if(el.id)info.id=el.id;if(el.className)info.class=el.className;if(["INPUT","TEXTAREA","SELECT"].includes(el.tagName))info.value=el.value;const txt=el.textContent?el.textContent.trim().slice(0,100):"";if(txt&&el.children.length===0)info.text=txt;if(el.children.length)info.children=[...el.children].slice(0,25).map(summarize).filter(Boolean);return info};
    P.postMessage({poppy:1,cmdRes:"read_dom",reqId:m.reqId,dom:summarize(document.body),text:document.body.innerText.slice(0,2000)},"*");return;
  }
  if(m.cmd==="interact"){
    try{
      const el=document.querySelector(m.selector);if(!el)throw new Error("Element not found: "+m.selector);
      if(m.action==="click"){el.click()}
      else if(m.action==="type"){el.value=m.value;el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}))}
      else if(m.action==="submit"){if(el.requestSubmit)el.requestSubmit();else el.dispatchEvent(new Event("submit",{bubbles:true}))}
      P.postMessage({poppy:1,cmdRes:"interact",reqId:m.reqId,ok:true},"*");
    }catch(err){P.postMessage({poppy:1,cmdRes:"interact",reqId:m.reqId,ok:false,error:err.message},"*");}
    return;
  }
  if(m.cmd==="thumb"||m.cmd==="shot"){
    if(e.source!==P)return;
    const sh=m.cmd==="shot",H=sh?Math.min(document.documentElement.scrollHeight,1600):innerHeight;
    const go=()=>window.html2canvas(document.documentElement,{scale:sh?Math.min(+m.scale||.5,1):.25,logging:false,width:innerWidth,height:H,windowWidth:innerWidth,windowHeight:H}).then(c=>P.postMessage(sh?{poppy:1,shot:c.toDataURL("image/jpeg",.7)}:{poppy:1,thumb:c.toDataURL("image/jpeg",.6)},"*")).catch(()=>P.postMessage({poppy:1,shot:null},"*"));
    if(window.html2canvas)return go();
    const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";s.onload=go;document.head.append(s);
    return;
  }
  if(!pend[m.id])return;
  const q=pend[m.id];if("chunk" in m){q.on&&q.on(m.chunk);return}delete pend[m.id];m.ok?q.res(m.result):q.rej(new Error(m.error));
});
const call=(method,args,on)=>new Promise((res,rej)=>{const id=++n;pend[id]={res,rej,on};P.postMessage({poppy:1,id,method,args},"*")});
window.poppy={
  ai:(t,o={})=>call("ai",[t,{system:o.system,json:o.json}],o.onToken),
  store:{get:k=>call("store.get",[k]),set:(k,v)=>call("store.set",[k,v]),delete:k=>call("store.delete",[k]),list:p=>call("store.list",[p||""])},
  asset:Object.assign(n=>call("asset.get",[n]),{list:()=>call("asset.list",[])}),
  db:{query:(s,p=[])=>call("db.query",[s,p]),exec:(s,p=[])=>call("db.exec",[s,p]),migrate:m=>call("db.migrate",[m]),export:()=>call("db.export",[]),import:d=>call("db.import",[d])},
  room:{join:r=>call("room.join",[r]),send:(p,m)=>call("room.send",[p,m]),broadcast:m=>call("room.broadcast",[m]),onMessage:cb=>{window.__poppy_room_cb=cb;call("room.listen",[])},link:()=>call("room.link",[])},
  automate:{on:(t,a)=>call("auto.register",[t,a]),list:()=>call("auto.list",[]),remove:id=>call("auto.remove",[id])},
  fetch:(u,o)=>call("fetch",[u,o]),
  files:{pickDirectory:()=>call("files.pickDirectory",[]),open:o=>call("files.open",[o]),save:(n,d)=>call("files.save",[n,d])},
  speak:t=>call("speak",[t]),
  clipboard:{write:t=>call("clip.write",[t])},
  notify:(t,b)=>call("notify",[t,b]),
  geo:()=>call("geo",[]),
  connect:new Proxy(function(){},{
    get:(t,n)=>{
      if(n==="supabase"){
        return{
          auth:{
            signUp:c=>call("sb.auth.signUp",[c]),
            signIn:c=>call("sb.auth.signIn",[c]),
            signOut:()=>call("sb.auth.signOut",[]),
            user:()=>call("sb.auth.user",[]),
            session:()=>call("sb.auth.session",[])
          },
          realtime:{
            subscribe:(tbl,cb)=>{window.__poppy_sb_cb=cb;return call("sb.realtime.sub",[tbl])}
          }
        }
      }
      return typeof n==="string"?(p,o)=>call("connect."+n,[p,o||{}]):undefined;
    },
    apply:(t,_,a)=>call("connect."+a[0],[a[1],a[2]||{}])
  }),
  listen:o=>call("listen",[o||{}]),
  share:d=>call("share",[d]),
  use:async n=>{const load=u=>new Promise((r,j)=>{const s=document.createElement("script");s.src=u;s.onload=r;s.onerror=()=>j(new Error("Could not load "+n));document.head.append(s)});
if(n==="pyodide"){await load("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");return await loadPyodide()}
if(n==="sqlite"){await load("https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js");return await initSqlJs({locateFile:f=>"https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/"+f})}
if(n==="transformers")return await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2");
if(n==="duckdb")return await import("https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.28.0/+esm");
if(n==="ffmpeg")return await import("https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/+esm");
if(n==="chart"||n==="chartjs"){await load("https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js");return window.Chart}
if(n==="marked"){await load("https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.0/marked.min.js");return window.marked}
if(n==="confetti"){await load("https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js");return window.confetti}
if(n==="qrcode"){await load("https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js");return window.QRCode}
if(n==="sfx"){return(freq=440,type="sine",dur=0.15)=>{try{if(!__poppy_user_unlocked)return false;const ac=new(window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0.1,ac.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+dur);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+dur);return true;}catch(e){return false;}}}
if(window.__poppy_plugins&&window.__poppy_plugins[n]){return window.__poppy_plugins[n]}
throw new Error("Unknown library "+n+". Available: pyodide, sqlite, transformers, duckdb, ffmpeg, chart, marked, confetti, qrcode, sfx.")}
};
// Universal Button & Interaction Safety Net (6-Layer Resilience Engine)
let __poppy_actx = null;
let __poppy_user_unlocked = false;
const __poppy_pending_audio = new Set();
const __poppy_unlock_audio = () => {
  if (__poppy_user_unlocked) return;
  __poppy_user_unlocked = true;
  for (const c of __poppy_pending_audio) {
    try { if (c.state === "suspended") c.resume().catch(()=>{}); } catch(e) {}
  }
  __poppy_pending_audio.clear();
  try {
    if (window.Tone && typeof window.Tone.start === "function") window.Tone.start().catch(()=>{});
    if (__poppy_actx && __poppy_actx.state === "suspended") __poppy_actx.resume().catch(()=>{});
  } catch(e) {}
};
["click", "keydown", "touchstart", "pointerdown", "mousedown"].forEach(ev => {
  window.addEventListener(ev, __poppy_unlock_audio, { capture: true, once: true });
  document.addEventListener(ev, __poppy_unlock_audio, { capture: true, once: true });
});

// Guard AudioContext against pre-gesture console warnings & loops
try {
  const OrigAC = window.AudioContext || window.webkitAudioContext;
  if (OrigAC && OrigAC.prototype && OrigAC.prototype.resume) {
    const origResume = OrigAC.prototype.resume;
    OrigAC.prototype.resume = function() {
      if (!__poppy_user_unlocked) {
        __poppy_pending_audio.add(this);
        return Promise.resolve();
      }
      return origResume.apply(this, arguments);
    };
  }
} catch(e) {}

const resumeAudio = () => {
  if (!__poppy_user_unlocked) return;
  try {
    if (window.Tone && typeof window.Tone.start === "function") window.Tone.start().catch(()=>{});
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      if (!__poppy_actx) __poppy_actx = new AC();
      if (__poppy_actx.state === "suspended") __poppy_actx.resume().catch(()=>{});
    }
  } catch(e) {}
};

const playClickAudio=()=>{
  try{
    resumeAudio();
    if(!__poppy_actx) return;
    const ctx = __poppy_actx;
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.type="sine";
    osc.frequency.setValueAtTime(360,ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140,ctx.currentTime+0.04);
    gain.gain.setValueAtTime(0.06,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime+0.04);
  }catch(e){}
};

// Auto-resolve inline handlers: window[fn] fallback
window.addEventListener("error",e=>{
  if(e.message&&e.message.includes("is not defined")){
    const m=e.message.match(/([a-zA-Z0-9_$]+) is not defined/);
    if(m&&m[1]){
      window[m[1]]=function(...args){
        console.log("[Poppy Safety Net] Resolved unhandled function:",m[1],args);
      };
      e.preventDefault();
    }
  }
});

const wireButtons=()=>{
  document.querySelectorAll("form").forEach(f=>{
    if(!f.__poppy_bound){
      f.__poppy_bound=true;
      f.addEventListener("submit",e=>{
        e.preventDefault();
        const sBtn=f.querySelector("button[type='submit'], input[type='submit'], button:not([type])");
        if(sBtn){
          const old=sBtn.innerText||sBtn.value;
          sBtn.innerText="Submitted!";
          setTimeout(()=>{sBtn.innerText=old;},1800);
        }
      });
    }
  });
  document.querySelectorAll("button, [role='button'], a.btn, a.button, .btn, .cta, .tab-btn, input[type='button'], input[type='submit']").forEach(btn=>{
    if(btn.tagName==="BUTTON"&&!btn.getAttribute("type"))btn.setAttribute("type","button");
  });
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",wireButtons);
else wireButtons();

document.addEventListener("click",e=>{
  const btn=e.target.closest("button, [role='button'], a.btn, a.button, .btn, .cta, .tab-btn, .nav-btn, .accordion-btn, input[type='button'], input[type='submit']");
  if(!btn)return;
  if(btn.tagName==="A"&&(!btn.getAttribute("href")||btn.getAttribute("href")==="#"))e.preventDefault();
  
  // 1. Tactile click feedback: audio + physical spring
  playClickAudio();
  btn.style.transition="transform .1s ease, filter .1s ease";
  btn.style.transform="scale(0.96)";
  setTimeout(()=>{btn.style.transform="";},120);

  const txt=(btn.innerText||btn.textContent||btn.value||"").trim().toLowerCase();
  const cls=(btn.className||"").toLowerCase();
  const id=(btn.id||"").toLowerCase();

  // 2. Tab switching
  if(btn.classList.contains("tab")||cls.includes("tab")||btn.getAttribute("role")==="tab"){
    const p=btn.parentElement;
    if(p){
      p.querySelectorAll(".tab, [role='tab']").forEach(t=>{t.classList.remove("active","selected");t.setAttribute("aria-selected","false");});
      btn.classList.add("active");btn.setAttribute("aria-selected","true");
      const target=btn.getAttribute("data-tab")||btn.getAttribute("href");
      if(target&&target.startsWith("#")){
        document.querySelectorAll(".tab-pane, .tab-content").forEach(el=>el.style.display="none");
        const pane=document.querySelector(target);if(pane)pane.style.display="block";
      }
    }
  }

  // 3. Modals & Dialogs (Open & Close)
  if(txt.includes("open")||txt.includes("modal")||txt.includes("dialog")||txt.includes("details")||btn.dataset.modal||id.includes("modal")){
    const tId=btn.dataset.target||btn.dataset.modal||id.replace("btn","")||"dialog";
    const dlg=document.querySelector(tId.startsWith("#")?tId:"#"+tId)||document.querySelector("dialog, .modal");
    if(dlg){
      if(typeof dlg.showModal==="function")dlg.showModal();
      else dlg.classList.add("open","active");
    }
  }
  if(txt==="x"||txt==="close"||txt==="cancel"||txt==="dismiss"||cls.includes("close")||id.includes("close")){
    const dlg=btn.closest("dialog, .modal, .popup");
    if(dlg){
      if(typeof dlg.close==="function")dlg.close();
      else dlg.classList.remove("open","active");
    }
  }

  // 4. Steppers & Counters (+, -)
  if(txt==="+"||txt==="inc"||txt.includes("increase")||txt==="&plus;"){
    const wrap=btn.closest(".counter, .stepper, .card, div")||btn.parentElement;
    const inp=wrap?wrap.querySelector("input[type='number'], .count, .quantity"):null;
    if(inp){
      if(inp.tagName==="INPUT"){inp.value=(parseFloat(inp.value)||0)+1;inp.dispatchEvent(new Event("change",{bubbles:true}));}
      else inp.textContent=(parseFloat(inp.textContent)||0)+1;
    }
  }
  if(txt==="-"||txt==="dec"||txt.includes("decrease")||txt==="&minus;"){
    const wrap=btn.closest(".counter, .stepper, .card, div")||btn.parentElement;
    const inp=wrap?wrap.querySelector("input[type='number'], .count, .quantity"):null;
    if(inp){
      if(inp.tagName==="INPUT"){inp.value=Math.max(0,(parseFloat(inp.value)||0)-1);inp.dispatchEvent(new Event("change",{bubbles:true}));}
      else inp.textContent=Math.max(0,(parseFloat(inp.textContent)||0)-1);
    }
  }

  // 5. Calculators & Math
  if(txt.includes("calculate")||txt.includes("compute")||txt.includes("convert")||id.includes("calc")){
    const card=btn.closest(".card, form, section, div")||document.body;
    const nums=[...card.querySelectorAll("input[type='number'], input[type='range']")].map(i=>parseFloat(i.value)||0);
    const out=card.querySelector(".result, #result, .output, output, .calc-res");
    if(out&&nums.length){
      const sum=nums.reduce((a,b)=>a+b,0);
      out.textContent=(out.textContent.includes("$")?"$":"")+sum.toLocaleString();
    }
  }

  // 6. Copy to clipboard
  if(txt.includes("copy")||id.includes("copy")||cls.includes("copy")){
    const card=btn.closest(".card, section, div")||document.body;
    const target=card.querySelector("pre, code, input[type='text'], textarea, .copy-target");
    const val=target?(target.value||target.innerText):window.location.href;
    if(val&&navigator.clipboard){
      navigator.clipboard.writeText(val).then(()=>{
        const old=btn.innerText;btn.innerText="Copied!";
        setTimeout(()=>{btn.innerText=old;},1600);
      }).catch(()=>{});
    }
  }

  // 7. Dark Mode & Theme toggle
  if(txt.includes("theme")||txt.includes("dark")||txt.includes("light")||id.includes("theme")){
    document.body.classList.toggle("dark");
    if(document.documentElement)document.documentElement.classList.toggle("dark");
  }

  // 8. Mobile Navigation Hamburger
  if(txt.includes("menu")||cls.includes("menu")||cls.includes("nav-toggle")||cls.includes("hamburger")){
    const nav=document.querySelector("nav, .nav, .nav-menu, .menu-links, #nav, #menu");
    if(nav){
      nav.classList.toggle("open");
      if(nav.style.display==="none"||!nav.style.display)nav.style.display="flex";
      else nav.style.display="none";
    }
  }

  // 9. Accordion / FAQ
  if(btn.classList.contains("accordion-btn")||cls.includes("faq")||cls.includes("accordion")){
    const panel=btn.nextElementSibling;
    if(panel)panel.style.display=panel.style.display==="block"?"none":"block";
  }

  // 10. Cart increment
  if(txt.includes("cart")||txt.includes("buy")||cls.includes("cart")){
    const b=document.querySelector("#cart, .cart-count, #cartCount, .badge");
    if(b){const c=parseInt(b.textContent.replace(/[^0-9]/g,""))||0;b.textContent="Cart ("+(c+1)+")";}
  }

  // 11. Delete / Remove item
  if(txt.includes("delete")||txt.includes("remove")||cls.includes("delete")||id.includes("del")){
    const row=btn.closest("li, tr, .item, .card, .list-item");
    if(row&&row!==document.body){
      row.style.transition="opacity .2s ease, transform .2s ease";
      row.style.opacity="0";
      row.style.transform="scale(0.95)";
      setTimeout(()=>{row.remove();},200);
    }
  }
},true);

const rep=(t,m,fn,ln,stk)=>{try{P.postMessage({poppy:1,report:{t,m:String(m).slice(0,400),fn:fn||"",ln:ln||0,stk:String(stk||"").slice(0,500)}},"*")}catch(e){}};
addEventListener("error",e=>{const stk=(e.error&&e.error.stack)?e.error.stack:"";rep("error",e.message+(e.lineno?" (line "+e.lineno+")":""),e.filename,e.lineno,stk);});
addEventListener("unhandledrejection",e=>{const msg=(e.reason&&e.reason.message)||String(e.reason||"Unhandled rejection");const stk=(e.reason&&e.reason.stack)?e.reason.stack:"";rep("promise",msg,"",0,stk);});
})();`;
function inject(html, code = SDK){
  if (typeof repairHtml === "function") html = repairHtml(html);
  if (typeof autoWireButtons === "function") html = autoWireButtons(html);
  if (typeof injectUniversalRuntime === "function") html = injectUniversalRuntime(html);
  const tag = "<scr" + "ipt>" + code + "</scr" + "ipt>";
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + tag) : tag + html;
}
function show(html){
  if (typeof repairHtml === "function") html = repairHtml(html);
  if (typeof autoWireButtons === "function") html = autoWireButtons(html);
  if (typeof injectUniversalRuntime === "function") html = injectUniversalRuntime(html);
  shownAt = Date.now();
  $("#frame").srcdoc = inject(html);
  thumbLater();
}
function thumbLater(){ const id = siteId; clearTimeout(thumbLater.t); thumbLater.t = setTimeout(() => { if (id !== siteId || preview || !id) return; try { $("#frame").contentWindow.postMessage({poppy: 1, cmd: "thumb"}, "*"); } catch {} }, 3000); }

const SCHEMA_VERSION = 3;
const idb = (() => { let p; const open = () => p || (p = new Promise((res, rej) => {
  const r = indexedDB.open("poppy", SCHEMA_VERSION);
  r.onupgradeneeded = e => {
    const db = r.result;
    if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
    if (!db.objectStoreNames.contains("ver")) db.createObjectStore("ver");
    if (!db.objectStoreNames.contains("assets")) db.createObjectStore("assets");
    if (!db.objectStoreNames.contains("sql")) db.createObjectStore("sql");
    if (!db.objectStoreNames.contains("auto")) db.createObjectStore("auto");
  };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
}));
  return async (store, mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction(store, mode), q = fn(t.objectStore(store)); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); }; })();
const kk = k => siteId + "\u0000" + k;
let sv = Promise.resolve();
function saveHist(){ const id = siteId, rec = {hist: hist.slice(), hi, name: meta.name, thumb: meta.thumb, files: {...currentFiles}}; if (!id) return sv; sv = sv.then(() => idb("ver", "readwrite", s => s.put(rec, id))).catch(() => {}); return sv; }
function trimHist(h, max = 8e6){ let t = h.reduce((a, x) => a + x.html.length, 0); while (h.length > 1 && t > max) t -= h.shift().html.length; }

async function assetGet(name){ if (!siteId) return null; return await idb("assets", "readonly", s => s.get(kk(name))); }
async function assetSet(name, dataUrl, type){ if (!siteId) { siteId = crypto.randomUUID(); ls.set("poppy.site", siteId); } const clean = name.trim().replace(/^[./\\]+/, ""); const rec = { name: clean, data: dataUrl, type: type || "image/png", size: Math.round(dataUrl.length * 0.75), t: Date.now() }; await idb("assets", "readwrite", s => s.put(rec, kk(clean))); return rec; }
async function assetDelete(name){ if (!siteId) return false; await idb("assets", "readwrite", s => s.delete(kk(name))); return true; }
async function assetList(sid = siteId){ if (!sid) return []; const pre = sid + "\u0000"; const keys = await idb("assets", "readonly", s => s.getAllKeys()); const matched = keys.filter(k => k.startsWith(pre)); const items = await Promise.all(matched.map(k => idb("assets", "readonly", s => s.get(k)))); return items.filter(Boolean); }

const ALLOW = ["api.open-meteo.com", "geocoding-api.open-meteo.com", "nominatim.openstreetmap.org", "openlibrary.org", "restcountries.com", "pokeapi.co", "hacker-news.firebaseio.com", "api.github.com", "api.dictionaryapi.dev", "www.thecocktaildb.com", "www.themealdb.com", "api.frankfurter.app", "jsonplaceholder.typicode.com", "dog.ceo", "catfact.ninja", "rickandmortyapi.com", "swapi.dev", "api.spacexdata.com", "opentdb.com", "v2.jokeapi.dev", "api.artic.edu", "collectionapi.metmuseum.org", "api.sunrise-sunset.org", "api.agify.io", "api.chucknorris.io"];
const PRIVATE = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[|[^.]+$)|\.local$/i;
let approved = new Set(JSON.parse(ls.get("poppy.hosts") || "[]")), calls = [], ccalls = [], aiCount = 0;

let pq = Promise.resolve();
function dlgAsk({title, text, yes = "Allow", no = "Not now", input}){
  return pq = pq.then(() => new Promise(res => {
    const d = $("#perm"), inp = $("#permIn"); $("#permT").textContent = title; $("#permP").textContent = text || ""; $("#permYes").textContent = yes; $("#permNo").textContent = no;
    inp.hidden = input === undefined; if (input !== undefined) inp.value = input; let done = false;
    const fin = v => { if (done) return; done = true; if (d.open) d.close(); res(v); };
    if ($("#permYes")) $("#permYes").onclick = () => fin(input === undefined ? true : inp.value); if ($("#permNo")) $("#permNo").onclick = () => fin(input === undefined ? false : null); d.onclose = () => fin(input === undefined ? false : null);
    d.showModal(); if (input !== undefined) inp.select();
  }));
}
async function ask(cap){ const k = "poppy.perm." + siteId + "." + cap; let v = ls.get(k); if (!v) { v = (await dlgAsk({title: "Allow " + cap + "?", text: "This site wants to use your " + cap + ". You can reset these choices in Connectors."})) ? "1" : "0"; ls.set(k, v); } if (v !== "1") throw new Error("Permission for " + cap + " was denied."); }
async function listModels(p, key){
  const C = {anthropic: ["https://api.anthropic.com/v1/models?limit=100", {"x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true"}], openai: ["https://api.openai.com/v1/models", {authorization: "Bearer " + key}], gemini: ["https://generativelanguage.googleapis.com/v1beta/models?pageSize=100", {"x-goog-api-key": key}], meta: ["https://api.llama.com/compat/v1/models", {authorization: "Bearer " + key}]}[p];
  const j = await (await fetch(C[0], {headers: C[1]})).json();
  return (j.data || j.models || []).map(m => String(m.id || m.name || "").replace(/^models\//, "")).filter(Boolean);
}
async function fillModels(p, key){ try { const ids = await listModels(p, key); if (p === sel) $("#mlist").replaceChildren(...ids.map(id => { const o = document.createElement("option"); o.value = id; return o; })); } catch {} }

/* ===== Phase 5: SQLite Database, P2P Room Sync, Relay, Automations, Supabase Auth & Agent Mode ===== */
function generateRelayScript(){
  return `// Poppy Relay - Cloudflare Worker
const ALLOWED_TARGETS = [
  "api.notion.com",
  "api.stripe.com",
  "api.resend.com",
  "slack.com"
];

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Max-Age": "86400",
        }
      });
    }

    const secret = env && env.RELAY_SECRET;
    const clientSecret = request.headers.get("x-poppy-relay-secret");
    if (secret && clientSecret !== secret) {
      return new Response(JSON.stringify({ error: "Invalid or missing relay secret" }), {
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const targetUrl = request.headers.get("x-poppy-target");
    if (!targetUrl) {
      return new Response(JSON.stringify({ status: "ok", message: "Poppy Relay is live." }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    try {
      const u = new URL(targetUrl);
      const allowed = ALLOWED_TARGETS.some(h => u.hostname === h || u.hostname.endsWith("." + h));
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Target host not in Poppy Relay allowlist: " + u.hostname }), {
          status: 403,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      const forwardHeaders = new Headers(request.headers);
      forwardHeaders.delete("x-poppy-target");
      forwardHeaders.delete("x-poppy-relay-secret");
      forwardHeaders.set("host", u.hostname);

      const res = await fetch(targetUrl, {
        method: request.method,
        headers: forwardHeaders,
        body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer()
      });

      const resHeaders = new Headers(res.headers);
      resHeaders.set("Access-Control-Allow-Origin", "*");
      resHeaders.set("Access-Control-Expose-Headers", "*");

      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }
};`;
}

const sqlDbs = {};
async function getSqlDb(sid = siteId || "default"){
  if (sqlDbs[sid]) return sqlDbs[sid];
  let saved = null;
  try { saved = await idb("sql", "readonly", s => s.get(sid + "\u0000sqlite")); } catch {}
  let state = { tables: {}, migrations: [] };
  if (saved) {
    if (saved.tables) state = saved;
    else if (saved instanceof Uint8Array && saved.length > 16) {
      try {
        const text = new TextDecoder().decode(saved.subarray(16));
        state = JSON.parse(text);
      } catch {}
    }
  }
  const save = async () => {
    try {
      const jsonBytes = new TextEncoder().encode(JSON.stringify(state));
      const buf = new Uint8Array(16 + jsonBytes.length);
      buf.set(new TextEncoder().encode("SQLite format 3\0"), 0);
      buf.set(jsonBytes, 16);
      await idb("sql", "readwrite", s => s.put(buf, sid + "\u0000sqlite"));
    } catch {}
  };

  const db = {
    state,
    async exec(sql, params = []){
      const statements = sql.split(";").map(s => s.trim()).filter(Boolean);
      let totalChanges = 0, lastId = 0;
      for (const stmt of statements) {
        let pIndex = 0; const nextParam = () => params[pIndex++];
        const createMatch = stmt.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?([a-zA-Z0-9_]+)\s*\(([\s\S]*)\)/i);
        if (createMatch) {
          const tab = createMatch[1].toLowerCase();
          if (!state.tables[tab]) {
            const cols = createMatch[2].split(",").map(c => c.trim().split(/\s+/)[0].toLowerCase());
            state.tables[tab] = { cols, rows: [], nextId: 1 };
          }
          continue;
        }
        const dropMatch = stmt.match(/drop\s+table\s+(?:if\s+exists\s+)?([a-zA-Z0-9_]+)/i);
        if (dropMatch) {
          delete state.tables[dropMatch[1].toLowerCase()];
          totalChanges++;
          continue;
        }
        const insMatch = stmt.match(/insert\s+into\s+([a-zA-Z0-9_]+)\s*(?:\(([^)]+)\))?\s*values\s*\(([\s\S]*)\)/i);
        if (insMatch) {
          const tab = insMatch[1].toLowerCase();
          if (!state.tables[tab]) state.tables[tab] = { cols: ["id"], rows: [], nextId: 1 };
          const t = state.tables[tab];
          const colList = insMatch[2] ? insMatch[2].split(",").map(c => c.trim().toLowerCase()) : t.cols;
          const valTokens = insMatch[3].split(",").map(v => v.trim());
          const row = { id: t.nextId++ };
          lastId = row.id;
          colList.forEach((col, i) => {
            const tok = valTokens[i];
            let v = tok === "?" ? nextParam() : tok ? tok.replace(/^['"]|['"]$/g, "") : "";
            if (tok && !isNaN(tok) && tok !== "?") v = Number(tok);
            row[col] = v;
          });
          t.rows.push(row);
          totalChanges++;
          continue;
        }
        const updMatch = stmt.match(/update\s+([a-zA-Z0-9_]+)\s+set\s+([\s\S]*?)(?:\s+where\s+([\s\S]*))?$/i);
        if (updMatch) {
          const tab = updMatch[1].toLowerCase(), t = state.tables[tab];
          if (t) {
            const setAssignments = updMatch[2].split(",").map(s => s.trim());
            const setObj = {};
            setAssignments.forEach(assign => {
              const [k, vTok] = assign.split("=").map(x => x.trim());
              setObj[k.toLowerCase()] = vTok === "?" ? nextParam() : vTok ? vTok.replace(/^['"]|['"]$/g, "") : "";
            });
            const whereClause = updMatch[3];
            let whereKey, whereVal;
            if (whereClause) {
              const wm = whereClause.match(/([a-zA-Z0-9_]+)\s*=\s*(.+)/);
              if (wm) { whereKey = wm[1].toLowerCase(); whereVal = wm[2].trim() === "?" ? nextParam() : wm[2].trim().replace(/^['"]|['"]$/g, ""); }
            }
            t.rows.forEach(r => {
              if (!whereClause || String(r[whereKey]) === String(whereVal)) {
                Object.assign(r, setObj);
                totalChanges++;
              }
            });
          }
          continue;
        }
        const delMatch = stmt.match(/delete\s+from\s+([a-zA-Z0-9_]+)(?:\s+where\s+([\s\S]*))?$/i);
        if (delMatch) {
          const tab = delMatch[1].toLowerCase(), t = state.tables[tab];
          if (t) {
            const whereClause = delMatch[2];
            let whereKey, whereVal;
            if (whereClause) {
              const wm = whereClause.match(/([a-zA-Z0-9_]+)\s*=\s*(.+)/);
              if (wm) { whereKey = wm[1].toLowerCase(); whereVal = wm[2].trim() === "?" ? nextParam() : wm[2].trim().replace(/^['"]|['"]$/g, ""); }
            }
            const origLen = t.rows.length;
            t.rows = t.rows.filter(r => whereClause && String(r[whereKey]) !== String(whereVal));
            totalChanges += (origLen - t.rows.length);
          }
          continue;
        }
      }
      await save();
      runAutomations("change", { source: "db" });
      return { changes: totalChanges, lastInsertRowid: lastId };
    },

    async query(sql, params = []){
      const stmt = sql.trim().replace(/;$/, "");
      let pIndex = 0; const nextParam = () => params[pIndex++];
      const selMatch = stmt.match(/select\s+([\s\S]*?)\s+from\s+([a-zA-Z0-9_]+)(?:\s+where\s+([\s\S]*?))?(?:\s+order\s+by\s+([a-zA-Z0-9_]+)(?:\s+(asc|desc))?)?(?:\s+limit\s+(\d+|\?))?$/i);
      if (!selMatch) return [];
      const colStr = selMatch[1].trim(), tab = selMatch[2].toLowerCase(), t = state.tables[tab];
      if (!t) return [];
      let rows = [...t.rows];
      const whereClause = selMatch[3];
      if (whereClause) {
        const wm = whereClause.match(/([a-zA-Z0-9_]+)\s*(=|!=|>|<|like)\s*(.+)/i);
        if (wm) {
          const col = wm[1].toLowerCase(), op = wm[2].toLowerCase(), valTok = wm[3].trim();
          const target = valTok === "?" ? nextParam() : valTok.replace(/^['"]|['"]$/g, "");
          rows = rows.filter(r => {
            const val = r[col];
            if (op === "=") return String(val) === String(target);
            if (op === "!=") return String(val) !== String(target);
            if (op === ">") return Number(val) > Number(target);
            if (op === "<") return Number(val) < Number(target);
            if (op === "like") return new RegExp(String(target).replace(/%/g, ".*"), "i").test(String(val));
            return true;
          });
        }
      }
      const orderCol = selMatch[4];
      if (orderCol) {
        const dir = (selMatch[5] || "asc").toLowerCase();
        rows.sort((a, b) => {
          const va = a[orderCol.toLowerCase()], vb = b[orderCol.toLowerCase()];
          return (dir === "desc" ? -1 : 1) * (va < vb ? -1 : va > vb ? 1 : 0);
        });
      }
      const limitVal = selMatch[6];
      if (limitVal) {
        const n = limitVal === "?" ? nextParam() : parseInt(limitVal, 10);
        if (!isNaN(n)) rows = rows.slice(0, n);
      }
      if (colStr === "*") return rows.map(r => ({ ...r }));
      const reqCols = colStr.split(",").map(c => c.trim().toLowerCase());
      return rows.map(r => {
        const out = {};
        reqCols.forEach(c => out[c] = r[c]);
        return out;
      });
    },

    async migrate(migrations){
      await this.exec("CREATE TABLE IF NOT EXISTS _poppy_migrations (id INTEGER PRIMARY KEY, version TEXT, applied_at INTEGER)");
      const applied = await this.query("SELECT version FROM _poppy_migrations");
      const done = new Set(applied.map(a => a.version));
      let count = 0;
      for (const m of migrations) {
        if (!done.has(m.version)) {
          if (typeof m.up === "string") await this.exec(m.up);
          else if (Array.isArray(m.up)) {
            for (const s of m.up) await this.exec(s);
          }
          await this.exec("INSERT INTO _poppy_migrations (version, applied_at) VALUES (?, ?)", [m.version, Date.now()]);
          count++;
        }
      }
      return { success: true, applied: count };
    },

    async export(){
      const jsonBytes = new TextEncoder().encode(JSON.stringify(state));
      const buf = new Uint8Array(16 + jsonBytes.length);
      buf.set(new TextEncoder().encode("SQLite format 3\0"), 0);
      buf.set(jsonBytes, 16);
      return buf;
    },

    async import(data){
      let buf;
      if (typeof data === "string") {
        if (data.startsWith("data:")) data = data.split(",")[1];
        buf = Uint8Array.from(atob(data), c => c.charCodeAt(0));
      } else if (data instanceof Uint8Array) buf = data;
      else if (data instanceof ArrayBuffer) buf = new Uint8Array(data);
      if (!buf) throw new Error("Invalid SQLite import data.");
      const text = new TextDecoder().decode(buf.subarray(16));
      state = JSON.parse(text);
      this.state = state;
      await save();
      return true;
    }
  };

  sqlDbs[sid] = db;
  return db;
}

const activeRooms = {};
let currentRoomId = "lobby";
function getRoom(roomId){
  const rid = roomId || "lobby";
  if (!activeRooms[rid]) {
    const peerId = crypto.randomUUID().slice(0, 8);
    let bc = null;
    try { bc = new BroadcastChannel("poppy_room_" + rid); } catch {}
    if (bc) {
      bc.onmessage = e => {
        if (e.data && e.data.from !== peerId) {
          try {
            $("#frame").contentWindow.postMessage({ poppy: 1, roomMsg: { from: e.data.from, data: e.data.data } }, "*");
          } catch {}
        }
      };
    }
    activeRooms[rid] = {
      roomId: rid,
      peerId,
      bc,
      broadcast(data){
        if (bc) bc.postMessage({ from: peerId, data });
        return { sent: true, peerId };
      },
      send(toPeer, data){
        if (bc) bc.postMessage({ from: peerId, to: toPeer, data });
        return { sent: true, peerId };
      },
      link(){
        return location.origin + location.pathname + "#room=" + encodeURIComponent(rid);
      }
    };
  }
  return activeRooms[rid];
}

async function runAutomations(triggerType, detail = {}){
  const sid = siteId || "default";
  try {
    const keys = await idb("auto", "readonly", s => s.getAllKeys());
    const pre = sid + "\u0000";
    const matched = keys.filter(k => k.startsWith(pre));
    const items = await Promise.all(matched.map(k => idb("auto", "readonly", s => s.get(k))));
    for (const a of items) {
      if (!a || !a.enabled) continue;
      if (a.trigger !== triggerType && triggerType !== "manual") continue;
      
      a.lastRun = Date.now();
      await idb("auto", "readwrite", s => s.put(a, pre + a.id));

      if (Array.isArray(a.steps) && a.steps.length) {
        let piped = detail.initialData || "";
        for (const step of a.steps) {
          try {
            if (step.type === "query_db") {
              const db = await getSqlDb(sid);
              piped = await db.query(step.val || "SELECT * FROM items");
            } else if (step.type === "read_store") {
              piped = await idb("kv", "readonly", s => s.get(sid + "\u0000" + (step.val || "data")));
            } else if (step.type === "ai") {
              const prompt = (step.val || "").replace("{{input}}", typeof piped === "object" ? JSON.stringify(piped) : String(piped || ""));
              piped = await handle("ai", [prompt, { system: "You are an automated workflow pipeline in Poppy." }], () => {});
            } else if (step.type === "write_store") {
              await idb("kv", "readwrite", s => s.put(piped, sid + "\u0000" + (step.val || "result")));
            } else if (step.type === "notify") {
              toast(`[${a.name}]: ${String(piped).slice(0, 60)}`);
            } else if (step.type === "connector") {
              const parts = (step.val || "").split(" ");
              const connId = parts[0], path = parts[1] || "/";
              const c = findConn(connId);
              if (c && isOn(c)) piped = await apiCall(c, getVals(c), path);
            }
          } catch (err) {
            console.warn("Pipeline step error:", err);
            break;
          }
        }
        continue;
      }

      if (a.actionType === "ai") {
        try {
          const out = await handle("ai", [a.actionVal, { system: "You are an automated background task for Poppy." }], () => {});
          toast("Automation [" + a.name + "]: " + out.slice(0, 60));
        } catch (e) {
          console.warn("Automation AI failed", e);
        }
      } else if (a.actionType === "connector") {
        try {
          const parts = a.actionVal.split(" ");
          const connId = parts[0], path = parts[1] || "/";
          const c = findConn(connId);
          if (c && isOn(c)) await apiCall(c, getVals(c), path);
        } catch (e) {
          console.warn("Automation connector failed", e);
        }
      }
    }
  } catch {}
}

setInterval(async () => {
  if (!siteId || preview) return;
  try {
    const keys = await idb("auto", "readonly", s => s.getAllKeys());
    const pre = siteId + "\u0000";
    const matched = keys.filter(k => k.startsWith(pre));
    const items = await Promise.all(matched.map(k => idb("auto", "readonly", s => s.get(k))));
    const now = Date.now();
    for (const a of items) {
      if (a && a.trigger === "timer" && a.enabled && a.interval) {
        if (now - (a.lastRun || 0) >= a.interval * 60000) {
          runAutomations("timer", { id: a.id });
        }
      }
    }
  } catch {}
}, 10000);

const pendCmd = {}; let cmdId = 0;
function frameCommand(cmd, data = {}, timeout = 3000){
  return new Promise((res, rej) => {
    const reqId = ++cmdId;
    const timer = setTimeout(() => { delete pendCmd[reqId]; rej(new Error("Frame command " + cmd + " timed out")); }, timeout);
    pendCmd[reqId] = r => { clearTimeout(timer); res(r); };
    try {
      $("#frame").contentWindow.postMessage({ poppy: 1, cmd, reqId, ...data }, "*");
    } catch (err) {
      clearTimeout(timer);
      delete pendCmd[reqId];
      rej(err);
    }
  });
}

function getSupabaseConn(){
  const c = findConn("supabase");
  if (!c || !isOn(c)) throw new Error("Supabase is not connected. Connect it in Connectors.");
  const vals = getVals(c);
  return { c, vals, url: vals.url.replace(/\/+$/, ""), key: vals.key };
}

async function runAgentLoop(goal, note){
  phase("building"); setNote(note, "Analyzing goal");

  const AGENT_SYS = `You are the autonomous Poppy Agent. You build, test, and verify web applications.
Reply with ONE JSON object in:
\`\`\`json
{
  "tool": "build" | "read_dom" | "interact" | "read_store" | "call_connector" | "finish",
  "args": { ... },
  "thought": "short explanation of what you are doing"
}
\`\`\`
Tools:
- build: { "html": "<!doctype html>..." } (to write code)
- read_dom: {} (inspect current elements in running site)
- interact: { "selector": "#addBtn", "action": "click"|"type"|"submit", "value": "text" }
- read_store: { "key": "k" } (inspect persistent store)
- call_connector: { "id": "github", "path": "/user" }
- finish: { "summary": "how the goal was tested and passed" }
Always test the site (interact or check store/DOM) before finishing.`;

  let history = [
    { role: "user", content: "Build and test this site: " + goal + "\nRequirements: Must be fully functional and verified." }
  ];

  let currentHtml = current || "";
  for (let step = 1; step <= 6; step++) {
    setNote(note, `Agent Step ${step}: Planning action`);
    let resp = "";
    for await (const t of stream(history, AGENT_SYS)) resp += t;

    let call = null;
    try {
      const m = resp.match(/```(?:json)?\s*\n([\s\S]*?)(?:```|$)/i);
      call = JSON.parse(m ? m[1] : resp);
    } catch {
      const html = extractHtml(resp);
      if (html.length > 50) call = { tool: "build", args: { html }, thought: "Generated initial site" };
      else call = { tool: "finish", args: { summary: "Finished goal" }, thought: "Finished" };
    }

    const tname = call.tool || "finish";
    const targs = call.args || {};
    const thought = call.thought || tname;
    setNote(note, `Step ${step}: ${thought}`);

    if (tname === "build") {
      currentHtml = targs.html || extractHtml(resp);
      currentFiles = parseFiles(currentHtml);
      const aMap = {}; (await assetList()).forEach(a => aMap[a.name] = a.data);
      currentHtml = bundleFiles(currentFiles, aMap);
      current = currentHtml;
      show(currentHtml);
      await new Promise(r => setTimeout(r, 1200));
      history.push({ role: "assistant", content: JSON.stringify(call) });
      history.push({ role: "user", content: "Site rendered. Now test or inspect it." });
    } else if (tname === "read_dom") {
      let domRes = null;
      try { domRes = await frameCommand("read_dom", {}, 2500); }
      catch (e) { domRes = { text: "DOM query: " + e.message }; }
      history.push({ role: "assistant", content: JSON.stringify(call) });
      history.push({ role: "user", content: "DOM result: " + JSON.stringify(domRes).slice(0, 800) });
    } else if (tname === "interact") {
      let intRes = null;
      try { intRes = await frameCommand("interact", targs, 2500); }
      catch (e) { intRes = { ok: false, error: e.message }; }
      await new Promise(r => setTimeout(r, 600));
      history.push({ role: "assistant", content: JSON.stringify(call) });
      history.push({ role: "user", content: "Interaction result: " + JSON.stringify(intRes) });
    } else if (tname === "read_store") {
      const val = await handle("store.get", [targs.key]);
      history.push({ role: "assistant", content: JSON.stringify(call) });
      history.push({ role: "user", content: "Store [" + targs.key + "] = " + JSON.stringify(val) });
    } else if (tname === "finish") {
      setNote(note, "Goal complete");
      break;
    }
  }

  return currentHtml;
}

async function handle(method, a, chunk){
  if (preview) throw new Error("Import this site to enable Poppy features.");
  if (method === "ai") {
    const now = Date.now(); calls = calls.filter(t => now - t < 60000);
    if (calls.length >= 30) throw new Error("Rate limit: 30 AI calls per minute.");
    calls.push(now); aiCount++; updUsage();
    const o = a[1] || {}; let out = "";
    for await (const t of stream([{role: "user", content: String(a[0])}], o.system || "You are an assistant inside a web app. Be concise." + (o.json ? " Reply with valid JSON only, no code fences." : ""))) { out += t; chunk(t); }
    return out;
  }
  if (!siteId && method.startsWith("store.")) throw new Error("No active site.");
  if (method === "store.get") return await idb("kv", "readonly", s => s.get(kk(a[0])));
  if (method === "store.set") { await idb("kv", "readwrite", s => s.put(a[1], kk(a[0]))); runAutomations("change", { key: a[0] }); return true; }
  if (method === "store.delete") { await idb("kv", "readwrite", s => s.delete(kk(a[0]))); runAutomations("change", { key: a[0] }); return true; }
  if (method === "store.list") { const pre = kk(a[0] || ""); return (await idb("kv", "readonly", s => s.getAllKeys())).filter(k => k.startsWith(pre)).map(k => k.slice(siteId.length + 1)); }
  if (method === "db.query") { const db = await getSqlDb(siteId); return await db.query(a[0], a[1] || []); }
  if (method === "db.exec") { const db = await getSqlDb(siteId); return await db.exec(a[0], a[1] || []); }
  if (method === "db.migrate") { const db = await getSqlDb(siteId); return await db.migrate(a[0]); }
  if (method === "db.export") { const db = await getSqlDb(siteId); return await db.export(); }
  if (method === "db.import") { const db = await getSqlDb(siteId); return await db.import(a[0]); }
  if (method === "room.join") { const rid = String(a[0] || "lobby"); currentRoomId = rid; const room = getRoom(rid); return { roomId: rid, peerId: room.peerId }; }
  if (method === "room.broadcast") { const room = getRoom(currentRoomId || "lobby"); return room.broadcast(a[0]); }
  if (method === "room.send") { const room = getRoom(currentRoomId || "lobby"); return room.send(a[0], a[1]); }
  if (method === "room.listen") { getRoom(currentRoomId || "lobby"); return true; }
  if (method === "room.link") { const room = getRoom(currentRoomId || "lobby"); return room.link(); }
  if (method === "auto.register") {
    const trigger = a[0], action = a[1], id = crypto.randomUUID();
    const rec = { id, siteId: siteId || "default", name: "SDK Trigger (" + trigger + ")", trigger, actionType: "ai", actionVal: typeof action === "string" ? action : JSON.stringify(action), lastRun: 0, enabled: true };
    await idb("auto", "readwrite", s => s.put(rec, (siteId || "default") + "\u0000" + id));
    return { id, ok: true };
  }
  if (method === "auto.list") {
    const keys = await idb("auto", "readonly", s => s.getAllKeys());
    const pre = (siteId || "default") + "\u0000";
    const matched = keys.filter(k => k.startsWith(pre));
    return await Promise.all(matched.map(k => idb("auto", "readonly", s => s.get(k))));
  }
  if (method === "auto.remove") {
    await idb("auto", "readwrite", s => s.delete((siteId || "default") + "\u0000" + a[0]));
    return true;
  }
  if (method === "sb.auth.signUp") {
    const { url, key } = await getSupabaseConn();
    const res = await fetch(url + "/auth/v1/signup", { method: "POST", headers: { "apikey": key, "content-type": "application/json" }, body: JSON.stringify(a[0] || {}) });
    const j = await res.json(); if (!res.ok) throw new Error(j.msg || j.error_description || "Supabase sign up failed");
    if (j.access_token && siteId) ls.set("poppy.sb.tok." + siteId, JSON.stringify(j));
    return j;
  }
  if (method === "sb.auth.signIn") {
    const { url, key } = await getSupabaseConn();
    const res = await fetch(url + "/auth/v1/token?grant_type=password", { method: "POST", headers: { "apikey": key, "content-type": "application/json" }, body: JSON.stringify(a[0] || {}) });
    const j = await res.json(); if (!res.ok) throw new Error(j.msg || j.error_description || "Supabase sign in failed");
    if (j.access_token && siteId) ls.set("poppy.sb.tok." + siteId, JSON.stringify(j));
    return j;
  }
  if (method === "sb.auth.signOut") {
    if (siteId) ls.set("poppy.sb.tok." + siteId, "");
    return true;
  }
  if (method === "sb.auth.session") {
    try { return JSON.parse(ls.get("poppy.sb.tok." + siteId) || "null"); } catch { return null; }
  }
  if (method === "sb.auth.user") {
    try { const s = JSON.parse(ls.get("poppy.sb.tok." + siteId) || "null"); return s ? s.user : null; } catch { return null; }
  }
  if (method === "sb.realtime.sub") {
    return { subscribed: true, table: a[0] };
  }
  if (method === "fetch") {
    const u = new URL(String(a[0])); const h = u.hostname;
    if (u.protocol !== "https:") throw new Error("Only HTTPS URLs are allowed.");
    if (PRIVATE.test(h)) throw new Error("Private addresses are blocked.");
    if (!(ALLOW.includes(h) || h.endsWith(".wikipedia.org") || approved.has(h))) {
      if (!(await dlgAsk({title: "Load data from " + h + "?", text: "This site wants to fetch data from " + h + "."}))) throw new Error("Request to " + h + " was denied.");
      approved.add(h); ls.set("poppy.hosts", JSON.stringify([...approved]));
    }
    const o = a[1] || {}, r = await fetch(u, {method: o.method || "GET", headers: o.headers, body: o.body, credentials: "omit"});
    if (r.redirected && PRIVATE.test(new URL(r.url).hostname)) throw new Error("That request was redirected to a private address and was blocked.");
    const text = await r.text(); let json; try { json = JSON.parse(text); } catch {}
    return {ok: r.ok, status: r.status, headers: Object.fromEntries(r.headers), text, json};
  }
  if (method === "files.open") { await ask("files"); const o = a[0] || {}; return await new Promise(res => { const i = document.createElement("input"); i.type = "file"; if (typeof o.accept === "string") i.accept = o.accept.slice(0, 200); i.multiple = !!o.multiple; i.oncancel = () => res(null); i.onchange = async () => { const fs = [...i.files].slice(0, 20), r = []; for (const f of fs) r.push({name: f.name, size: f.size, text: f.size < 5e6 ? await f.text() : undefined}); res(!r.length ? null : o.multiple ? r : r[0]); }; i.click(); }); }
  if (method === "files.save") {
    const blob = new Blob([typeof a[1] === "string" ? a[1] : JSON.stringify(a[1])]);
    if (window.showSaveFilePicker) { try { const fh = await showSaveFilePicker({suggestedName: String(a[0]).slice(0, 200)}), w = await fh.createWritable(); await w.write(blob); await w.close(); return true; } catch (e) { if (e && e.name === "AbortError") return false; } }
    const l = document.createElement("a"); l.href = URL.createObjectURL(blob); l.download = String(a[0]); l.click(); setTimeout(() => URL.revokeObjectURL(l.href), 2000); return true; }
  if (method === "speak") { speechSynthesis.speak(new SpeechSynthesisUtterance(String(a[0]))); return true; }
  if (method === "clip.write") { await navigator.clipboard.writeText(String(a[0])); return true; }
  if (method === "notify") { if (await Notification.requestPermission() === "granted") new Notification(String(a[0]), {body: String(a[1] || "")}); return true; }
  if (method === "geo") { await ask("location"); return await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(p => res({lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy}), e => rej(new Error(e.message)))); }
  if (method === "listen") {
    await ask("microphone"); const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) throw new Error("Speech recognition isn't supported in this browser.");
    return await new Promise((res, rej) => { const r = new R(); r.lang = (a[0] && a[0].lang) || "en-US"; r.onresult = e => res(e.results[0][0].transcript); r.onerror = e => rej(new Error(e.error)); r.onnomatch = () => res(""); r.start(); });
  }
  if (method === "share") { const d = a[0] || {}; if (navigator.share) { await navigator.share(d); return true; } await navigator.clipboard.writeText(d.url || d.text || ""); return "copied"; }
  if (method === "files.pickDirectory") return await ask("files"), await new Promise(res => { const i = document.createElement("input"); i.type = "file"; i.webkitdirectory = true; i.onchange = async () => { const fs = [...i.files].slice(0, 50), out = []; for (const f of fs) { let text; if (f.size < 200000) { try { text = await f.text(); } catch {} } out.push({path: f.webkitRelativePath, size: f.size, text}); } res({name: ((fs[0] && fs[0].webkitRelativePath) || "").split("/")[0], files: out}); }; i.click(); });
  if (method === "asset.get") { const rec = await assetGet(String(a[0])); if (!rec) throw new Error("Asset not found: " + a[0]); return rec.data; }
  if (method === "asset.list") { return (await assetList()).map(x => x.name); }
  if (method.startsWith("connect.")) {
    const id = method.slice(8);
    if (id === "list") return allConns().map(c => ({id: c.id, name: c.n, connected: isOn(c)}));
    const c = /^[a-z0-9-]{1,40}$/.test(id) && findConn(id);
    if (!c) throw new Error('Unknown connector "' + id + '". Available: ' + allConns().map(x => x.id).join(", ") + ".");
    if (typeof a[0] !== "string") throw new Error('The first argument is a path like "/user".');
    const now = Date.now(); ccalls = ccalls.filter(t => now - t < 60000); if (ccalls.length >= 120) throw new Error("Rate limit: 120 connector calls per minute."); ccalls.push(now);
    if (!isOn(c) && !(await requestConnect(id, false))) throw new Error(c.n + " isn't connected. The user skipped it.");
    await ask(c.n + " connection");
    const o = a[1] && typeof a[1] === "object" ? a[1] : {}; let path = a[0], cc = c;
    if (c.id === "google" && /^https:\/\//i.test(path)) {
      const u = new URL(path); if (!["www.googleapis.com", "sheets.googleapis.com", "docs.googleapis.com", "gmail.googleapis.com", "people.googleapis.com", "slides.googleapis.com"].includes(u.hostname)) throw new Error("Only Google API URLs are allowed.");
      cc = {...c, base: u.origin}; path = u.pathname + u.search;
    }
    return await apiCall(cc, getVals(c), path, o);
  }
  throw new Error("Unknown method: " + method);
}
addEventListener("message", async e => {
  const m = e.data;
  if (!m || m.poppy !== 1 || e.source !== $("#frame").contentWindow) return;
  if (m.cmdRes) {
    if (m.reqId && pendCmd[m.reqId]) {
      pendCmd[m.reqId](m);
      delete pendCmd[m.reqId];
    }
    if (m.cmdRes === "element_selected") {
      onElementSelected(m);
    }
    return;
  }
  if (m.thumb !== undefined) { if (typeof m.thumb === "string" && m.thumb.length < 150000 && m.thumb.startsWith("data:image/jpeg;base64,") && siteId && !preview) { meta.thumb = m.thumb; saveHist(); } return; }
  if (m.report) return onSiteError(m.report);
  if (typeof m.method !== "string" || !Array.isArray(m.args)) return;
  const reply = o => e.source.postMessage({poppy: 1, id: m.id, ...o}, "*");
  try { reply({ok: true, result: await handle(m.method, m.args, c => reply({chunk: c}))}); }
  catch (err) { reply({ok: false, error: err.message || String(err)}); }
});

async function collect(messages, system, onTok){ let out = ""; for await (const t of stream(messages, system)) { out += t; onTok && onTok(out); } return out; }
function bundleFiles(files, assetMap = {}){
  if (!files || typeof files !== "object") return "";
  let html = files["index.html"] || Object.values(files)[0] || "";
  html = html.replace(/<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["'](?:\.\/)?([^"']+)["'][^>]*\/?>/gi, (m, f) => {
    const name = f.replace(/^\.\//, "");
    if (files[name] != null) return `<style data-file="${name}">\n/* ${name} */\n${files[name]}\n</style>`;
    return m;
  });
  html = html.replace(/<link\s+[^>]*href=["'](?:\.\/)?([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*\/?>/gi, (m, f) => {
    const name = f.replace(/^\.\//, "");
    if (files[name] != null) return `<style data-file="${name}">\n/* ${name} */\n${files[name]}\n</style>`;
    return m;
  });
  html = html.replace(new RegExp("<script\\s+[^>]*src=[\"'](?:\\.\\/)?([^\"']+)[\"'][^>]*><\\/script>", "gi"), (m, f) => {
    const name = f.replace(/^\.\//, "");
    if (files[name] != null) return "<scr" + "ipt data-file=\"" + name + "\">\n/* " + name + " */\n" + files[name] + "\n</scr" + "ipt>";
    return m;
  });
  const linkedCss = new Set();
  for (const m of html.matchAll(/data-file="([^"]+\.css)"/g)) linkedCss.add(m[1]);
  let extraCss = "";
  for (const [name, content] of Object.entries(files)) {
    if (name.endsWith(".css") && !linkedCss.has(name)) extraCss += `<style data-file="${name}">\n/* ${name} */\n${content}\n</style>\n`;
  }
  if (extraCss) {
    if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, m => m + "\n" + extraCss);
    else html = extraCss + html;
  }
  const linkedJs = new Set();
  for (const m of html.matchAll(/data-file="([^"]+\.js)"/g)) linkedJs.add(m[1]);
  let extraJs = "";
  const jsPriority = (name) => {
    const n = name.toLowerCase();
    if (n.includes("sound") || n.includes("audio")) return 1;
    if (n.includes("util") || n.includes("physic") || n.includes("store") || n.includes("const")) return 2;
    if (n.includes("engine") || n.includes("core")) return 3;
    if (n.includes("level") || n.includes("data") || n.includes("component")) return 4;
    if (n.includes("game") || n.includes("main") || n.includes("app")) return 5;
    return 3;
  };
  const sortedJs = Object.entries(files)
    .filter(([name]) => name.endsWith(".js") && !linkedJs.has(name))
    .sort(([a], [b]) => jsPriority(a) - jsPriority(b));

  for (const [name, content] of sortedJs) {
    extraJs += "<scr" + "ipt data-file=\"" + name + "\">\n/* " + name + " */\n" + content + "\n</scr" + "ipt>\n";
  }
  if (extraJs) {
    if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, extraJs + "</body>");
    else html = html + "\n" + extraJs;
  }
  if (assetMap && Object.keys(assetMap).length) {
    for (const [aname, aurl] of Object.entries(assetMap)) {
      const re = new RegExp(`(["'])(?:assets\\/)?${aname.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\1`, "g");
      html = html.replace(re, `$1${aurl}$1`);
    }
  }
  return html;
}
function parseFiles(t){
  if (!t || typeof t !== "string") return { "index.html": "" };
  if (/=\\"|viewBox=\\"|d=\\"|class=\\"|id=\\"/i.test(t)) {
    t = t.replace(/\\"/g, '"');
  }
  const fileRe = /(?:^|\n)(?:---|===)\s*FILE:\s*([^\n\r]+?)\s*(?:---|===)\s*\n([\s\S]*?)(?=(?:\n(?:---|===)\s*FILE:)|$)/gi;
  let m = fileRe.exec(t);
  if (m) {
    const files = {};
    do {
      const fn = m[1].trim().replace(/^[./\\]+/, "");
      let content = m[2].trim();
      const codeFence = content.match(/^```[a-z]*\s*\n([\s\S]*?)\n```$/i);
      if (codeFence) content = codeFence[1];
      files[fn] = content;
    } while ((m = fileRe.exec(t)));
    if (!files["index.html"]) {
      const hf = Object.keys(files).find(k => k.endsWith(".html"));
      if (hf) files["index.html"] = files[hf];
    }
    return files;
  }
  return { "index.html": extractHtml(t) };
}
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)); crcTable[n] = c; }
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
async function createZip(files) {
  const entries = [], parts = []; let offset = 0;
  for (const f of files) {
    const nameBuf = new TextEncoder().encode(f.name), crc = crc32(f.data), size = f.data.length;
    let compData = f.data, method = 0;
    try {
      const cs = new CompressionStream("deflate-raw"), writer = cs.writable.getWriter();
      writer.write(f.data); writer.close();
      const deflated = new Uint8Array(await new Response(cs.readable).arrayBuffer());
      if (deflated.length < size) { compData = deflated; method = 8; }
    } catch {}
    const compSize = compData.length, lh = new Uint8Array(30 + nameBuf.length), dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0, true); dv.setUint16(8, method, true);
    dv.setUint32(14, crc, true); dv.setUint32(18, compSize, true); dv.setUint32(22, size, true); dv.setUint16(26, nameBuf.length, true);
    lh.set(nameBuf, 30); entries.push({ nameBuf, crc, size, compSize, method, offset }); parts.push(lh, compData); offset += lh.length + compData.length;
  }
  const cdStart = offset;
  for (const e of entries) {
    const cd = new Uint8Array(46 + e.nameBuf.length), dv = new DataView(cd.buffer);
    dv.setUint32(0, 0x02014b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 20, true); dv.setUint16(10, e.method, true);
    dv.setUint32(16, e.crc, true); dv.setUint32(20, e.compSize, true); dv.setUint32(24, e.size, true); dv.setUint16(28, e.nameBuf.length, true); dv.setUint32(42, e.offset, true);
    cd.set(e.nameBuf, 46); parts.push(cd); offset += cd.length;
  }
  const cdSize = offset - cdStart, eocd = new Uint8Array(22), dv = new DataView(eocd.buffer);
  dv.setUint32(0, 0x06054b50, true); dv.setUint16(8, entries.length, true); dv.setUint16(10, entries.length, true);
  dv.setUint32(12, cdSize, true); dv.setUint32(16, cdStart, true); parts.push(eocd);
  const out = new Uint8Array(parts.reduce((a, b) => a + b.length, 0)); let p = 0;
  for (const b of parts) { out.set(b, p); p += b.length; } return out;
}
async function parseZip(buf) {
  if (buf instanceof ArrayBuffer) buf = new Uint8Array(buf);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocdPos = -1;
  for (let i = buf.length - 22; i >= 0; i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocdPos = i; break; } }
  if (eocdPos === -1) throw new Error("Invalid zip file.");
  const count = dv.getUint16(eocdPos + 10, true), cdOffset = dv.getUint32(eocdPos + 16, true);
  let cdPos = cdOffset; const result = {};
  for (let k = 0; k < count; k++) {
    if (dv.getUint32(cdPos, true) !== 0x02014b50) break;
    const method = dv.getUint16(cdPos + 10, true), compSize = dv.getUint32(cdPos + 20, true), nameLen = dv.getUint16(cdPos + 28, true), extraLen = dv.getUint16(cdPos + 30, true), commLen = dv.getUint16(cdPos + 32, true), localOff = dv.getUint32(cdPos + 42, true);
    const name = new TextDecoder().decode(buf.subarray(cdPos + 46, cdPos + 46 + nameLen));
    cdPos += 46 + nameLen + extraLen + commLen;
    const lhNameLen = dv.getUint16(localOff + 26, true), lhExtraLen = dv.getUint16(localOff + 28, true);
    const dataStart = localOff + 30 + lhNameLen + lhExtraLen, compData = buf.subarray(dataStart, dataStart + compSize);
    let data;
    if (method === 0) data = compData;
    else if (method === 8) {
      const ds = new DecompressionStream("deflate-raw"), writer = ds.writable.getWriter();
      writer.write(compData); writer.close();
      data = new Uint8Array(await new Response(ds.readable).arrayBuffer());
    } else continue;
    result[name] = data;
  }
  return result;
}
function applyPatches(src, out){
  const isObj = src && typeof src === "object";
  const files = isObj ? {...src} : { "index.html": String(src) };
  const re = /(?:(?:^|\n)FILE:\s*([^\n\r]+)\s*\n)?<<<<<<< SEARCH\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> REPLACE/g;
  let m, n = 0;
  while ((m = re.exec(out))) {
    n++;
    let targetFile = m[1] ? m[1].trim() : null;
    const search = m[2], repl = m[3];
    if (!targetFile) {
      const matching = Object.keys(files).filter(k => files[k].includes(search));
      if (matching.length === 1) targetFile = matching[0];
      else if (matching.includes(activeFile)) targetFile = activeFile;
      else if (files["index.html"] && files["index.html"].includes(search)) targetFile = "index.html";
      else return null;
    }
    if (!files[targetFile]) return null;
    const content = files[targetFile];
    const i = content.indexOf(search);
    if (i < 0 || content.indexOf(search, i + 1) >= 0) return null;
    files[targetFile] = content.slice(0, i) + repl + content.slice(i + search.length);
  }
  if (!n) return null;
  return isObj ? files : files["index.html"];
}
/* ===== Phase 4: hidden check, design review, templates, evals ===== */
const QA_JS = `;addEventListener("load",()=>setTimeout(()=>{
  const b=document.body;if(!b)return;
  try {
    const btns=[...document.querySelectorAll("button:not([disabled])")].slice(0, 10);
    btns.forEach(btn=>{
      try {
        btn.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}));
      } catch(err) {
        window.dispatchEvent(new ErrorEvent("error", {message: "Button click failed: " + (err.message || err)}));
      }
    });
  } catch(e) {}
  parent.postMessage({poppy:1,qa:{t:(b.innerText||"").trim().length,v:!!document.querySelector("canvas,svg,img,video,input,button,textarea,select"),w:document.documentElement.scrollWidth,iw:innerWidth}},"*");
},1200));`;
const qaStub = m => m === "ai" ? "" : m === "store.list" ? [] : m === "fetch" || m.startsWith("connect.") ? {ok: false, status: 0, text: "", json: null} : null;
function probe(html, w = 390, scale){
  return new Promise(res => {
    const f = document.createElement("iframe"), issues = [], seen = new Set(); let qa, shot = null, ended = false, shotAsked = false;
    f.setAttribute("sandbox", "allow-scripts allow-forms allow-modals"); f.setAttribute("aria-hidden", "true"); f.tabIndex = -1; f.title = "Hidden check";
    f.style.cssText = "position:fixed;left:-10000px;top:0;width:" + w + "px;height:800px;border:0;opacity:0;pointer-events:none";
    const end = () => {
      if (ended) return; ended = true; removeEventListener("message", on); clearTimeout(t1); clearTimeout(t2); f.remove();
      if (qa) { if (qa.t < 15 && !qa.v) issues.push("The page renders blank: no visible text or controls after load."); if (w <= 480 && qa.w > qa.iw + 6) issues.push("The content is wider than a " + w + "px phone screen (" + qa.w + "px), so it scrolls sideways."); }
      res({issues: issues.slice(0, 4), shot});
    };
    const on = e => {
      if (e.source !== f.contentWindow) return; const m = e.data; if (!m || m.poppy !== 1) return;
      if (m.report && m.report.m) {
        const t = String(m.report.m).slice(0, 200);
        const loc = m.report.fn ? ` [${m.report.fn}:${m.report.ln || 0}]` : "";
        const stk = m.report.stk ? `\nStack: ${String(m.report.stk).slice(0, 250)}` : "";
        if (!seen.has(t) && issues.length < 3) {
          seen.add(t);
          issues.push(`Runtime error${loc}: ${t}${stk}`);
        }
      }
      else if (m.qa) { qa = m.qa; if (scale && !shotAsked) { shotAsked = true; f.contentWindow.postMessage({poppy: 1, cmd: "shot", scale}, "*"); clearTimeout(t1); } else if (!scale) end(); }
      else if ("shot" in m) { shot = typeof m.shot === "string" && m.shot.startsWith("data:image/jpeg;base64,") && m.shot.length < 2e6 ? m.shot : null; end(); }
      else if (typeof m.method === "string") f.contentWindow.postMessage({poppy: 1, id: m.id, ok: true, result: qaStub(m.method)}, "*");
    };
    addEventListener("message", on); const t1 = setTimeout(end, 4500), t2 = setTimeout(end, scale ? 14000 : 5000);
    f.srcdoc = inject(html, SDK + QA_JS); document.body.append(f);
  });
}
const REVIEW = 'You review website screenshots. The image shows the same page at phone (390px), tablet (820px) and desktop (1280px) widths, left to right. Reply with ONLY JSON: {"ok":true} when it looks good, or {"ok":false,"fixes":["short concrete fix", ...]} with at most 4 fixes. Only report real problems: overlapping or clipped content, unreadable contrast, tiny tap targets, broken layout, large empty areas.';
async function visualReview(html){
  const specs = [[390, .7], [820, .45], [1280, .3]], ps = await Promise.all(specs.map(([w, sc]) => probe(html, w, sc)));
  if (ps.some(p => !p.shot)) return [];
  try {
    const ims = await Promise.all(ps.map(p => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = p.shot; })));
    const c = document.createElement("canvas"); c.width = ims.reduce((a, i) => a + i.width + 12, 0); c.height = Math.max(...ims.map(i => i.height)); const g = c.getContext("2d"); g.fillStyle = "#888"; g.fillRect(0, 0, c.width, c.height);
    let x = 0; ims.forEach(i => { g.drawImage(i, x, 0); x += i.width + 12; });
    const out = await collect([{role: "user", content: "Review this site.", image: {mime: "image/jpeg", b64: c.toDataURL("image/jpeg", .8).split(",")[1]}}], REVIEW);
    const j = JSON.parse(out.match(/\{[\s\S]*\}/)[0]); return j.ok ? [] : (j.fixes || []).slice(0, 4).map(String);
  } catch { return []; }
}
async function editDoc(cur, req, im){
  const files = typeof cur === "object" ? cur : currentFiles;
  const curStr = Object.entries(files).map(([f, c]) => `FILE: ${f}\n${c}`).join("\n\n");
  const msg = `Current project files:\n${curStr}\n\nChange request: ${req}`;
  const out = await collect([{role: "user", content: msg, image: im}], EDIT);
  let patched = applyPatches(files, out);
  if (patched) {
    currentFiles = patched;
    const aMap = {}; (await assetList()).forEach(a => aMap[a.name] = a.data);
    return bundleFiles(currentFiles, aMap);
  }
  let parsed = parseFiles(out);
  if (parsed && (parsed["index.html"] || Object.keys(parsed).length > 1)) {
    currentFiles = parsed;
    const aMap = {}; (await assetList()).forEach(a => aMap[a.name] = a.data);
    return bundleFiles(currentFiles, aMap);
  }
  const full = await collect([{role: "user", content: msg + "\n\nReturn the full updated project files or document.", image: im}], BUILD);
  currentFiles = parseFiles(full);
  const aMap = {}; (await assetList()).forEach(a => aMap[a.name] = a.data);
  return bundleFiles(currentFiles, aMap);
}
const qaOn = () => ls.get("poppy.qa") !== "0", vrOn = () => ls.get("poppy.vr") === "1";
async function checkAndFix(html, note){
  const apply = async (req, label) => { setNote(note, label); if (!note) toast(label); try { const n = await editDoc(html, req); if (n && n.length > 40 && /<[a-z!]/i.test(n)) html = n; } catch {} };
  if (qaOn()) for (let k = 0; k < 2; k++) {
    setNote(note, k ? "Checking again" : "Testing the site");
    const q = await probe(html, 390); if (!q.issues.length) break;
    if (q.issues.some(i => i.toLowerCase().includes("blank"))) {
      setNote(note, "Rebuilding complete interface...");
      try {
        const full = await collect([{role: "user", content: "The previous code rendered completely blank with no controls or visible text. Rebuild a complete, self-contained single-page application from scratch for this goal:\n" + (lastText || "interactive web app") + "\nEnsure all HTML structure, interactive buttons, styles, and scripts are present in one complete HTML document."}], BUILD);
        const cand = typeof repairHtml === "function" ? repairHtml(extractHtml(full)) : extractHtml(full);
        if (typeof isRenderableHtml === "function" ? isRenderableHtml(cand) : (cand && cand.length > 80)) {
          html = cand;
          break;
        }
      } catch (err) {}
    }
    await apply("An automated check found these problems. Fix them and change nothing else:\n- " + q.issues.join("\n- "), "Fixing " + q.issues.length + " problem" + (q.issues.length > 1 ? "s" : ""));
  }
  if (vrOn()) { setNote(note, "Reviewing the design"); const fx = await visualReview(html); if (fx.length) await apply("A design review of screenshots found these problems. Fix them and change nothing else:\n- " + fx.join("\n- "), "Polishing the layout"); }
  return html;
}
const TPL = [["Dashboard", "a dashboard with a left nav, summary cards, an SVG or canvas chart and a data table"], ["Landing page", "a landing page with a hero, features, social proof, pricing and a call to action"], ["Game", "a playable game with score, levels or lives, keyboard and touch controls and a restart button"], ["Tracker", "a tracker with an add form, a list with edit and delete, streaks or totals and a chart"], ["Notes app", "a notes app with a sidebar of notes, a editor, search and tags"], ["Calculator tool", "a focused calculator or converter with live results, history and copy buttons"], ["Portfolio", "a personal portfolio with an about section, project cards and a contact form"], ["Quiz", "a quiz with questions, instant feedback, a score screen and retry"], ["Timer", "a timer or stopwatch with presets, laps, sound and notifications"], ["Kanban board", "a kanban board with draggable cards, columns you can rename and saved state"], ["Reader", "a blog or reader with article list, reading view, search and a dark mode"], ["Store front", "a store front with a product grid, filters, a cart and a checkout summary"]];
const STY = [["Brutalist", "thick black borders, raw system fonts, stark colors, hard shadows"], ["Soft pastel", "rounded shapes, pastel palette, gentle shadows, friendly type"], ["Neon dark", "dark background, glowing neon accents, monospace details"], ["Editorial", "serif headlines, generous whitespace, a magazine grid, restrained colors"], ["Retro Mac", "1990s Macintosh windows, pixel fonts, dithered grays"], ["Playful stickers", "bold colors, tilted sticker-like cards, hand-drawn feel, big emoji"]];
TPL.forEach(([n]) => $("#tpl").append(new Option(n))); STY.forEach(([n]) => $("#sty").append(new Option(n)));
const tplPick = () => TPL[$("#tpl").selectedIndex - 1];

function detectIntent(text = "") {
  const t = text.toLowerCase();
  if (/\b(ppt|pptx|slides?|deck|presentation|pitch|keynote|@slides?|@deck)\b/i.test(t)) {
    return {
      type: "deck",
      label: "Presentation Deck",
      desc: "16:9 Keynote Widescreen Mode Active",
      hint: "\n\nCategory: Widescreen 16:9 presentation slide deck with Keynote typography, keyboard navigation, speaker notes drawer with timer, slide overview grid, and print-to-PDF styles."
    };
  }
  if (/\b(game|arcade|shooter|platformer|canvas|play|@game)\b/i.test(t)) {
    return {
      type: "game",
      label: "Interactive Game",
      desc: "60fps Canvas Loop & WebAudio Sound Effects",
      hint: "\n\nCategory: Playable 2D/canvas game with 60fps game loop, WebAudio sound effects, score tracking, keyboard/touch controls, and restart."
    };
  }
  if (/\b(pdf|invoice|receipt|contract|report|document|doc|@pdf|@invoice|@doc)\b/i.test(t)) {
    return {
      type: "pdf",
      label: "Printable Document",
      desc: "Client Invoice & Clean PDF Export Engine",
      hint: "\n\nCategory: Standalone utility tool with instant working calculations, file import/export, and clean @media print styles."
    };
  }
  if (/\b(room|whiteboard|collab|realtime|multiplayer|p2p|chat|@realtime|@room)\b/i.test(t)) {
    return {
      type: "room",
      label: "Realtime Collab Room",
      desc: "P2P State & Presence Sync via poppy.room",
      hint: "\n\nCategory: Realtime multi-user collaborative room powered by poppy.room with presence and live state sync."
    };
  }
  if (/\b(tool|calculator|converter|generator|utility|@tool|@utility)\b/i.test(t)) {
    return {
      type: "tool",
      label: "Desktop Utility",
      desc: "Instant Working Calculations & Live Output",
      hint: "\n\nCategory: Standalone utility tool with instant working calculations, file import/export, and print formatting."
    };
  }
  if (/\b(synth|audio|music|beat|sound|@synth|@audio)\b/i.test(t)) {
    return {
      type: "audio",
      label: "WebAudio Studio",
      desc: "Polyphonic Oscillator Synthesis Engine",
      hint: "\n\nCategory: WebAudio synthesizer and beat machine with real-time sound controls."
    };
  }
  if (/\b(db|database|sqlite|sql|crud|@db)\b/i.test(t)) {
    return {
      type: "db",
      label: "SQLite Database App",
      desc: "Relational Tables & Persistent Store",
      hint: "\n\nCategory: Database application using poppy.db for SQLite queries and persistent records."
    };
  }
  return null;
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildHints(promptText = ""){
  const intent = detectIntent(promptText || ($("#prompt") ? $("#prompt").value : ""));
  const t = tplPick(), y = STY[$("#sty").selectedIndex - 1];
  let h = "";
  if (intent) h += intent.hint;
  if (t) h += "\n\nStructure: build it as " + t[1] + ".";
  if (y) h += "\n\nVisual style: " + y[0] + " - " + y[1] + ".";
  return h;
}
updUsage(); $("#qaOn").checked = qaOn(); $("#vrOn").checked = vrOn(); $("#cap").value = ls.get("poppy.cap") || "";
if ($("#qaOn")) $("#qaOn").onchange = e => ls.set("poppy.qa", e.target.checked ? "1" : "0"); if ($("#vrOn")) $("#vrOn").onchange = e => ls.set("poppy.vr", e.target.checked ? "1" : "0"); if ($("#cap")) $("#cap").onchange = e => ls.set("poppy.cap", String(Math.max(0, Math.floor(+e.target.value || 0))));
const EVALS = [["A pomodoro timer", ""], ["A tiny kanban board that remembers its cards", "store"], ["A recipe scaler with timers", ""], ["A quiz game about world capitals", ""], ["A weather lookup by city name", "fetch"], ["A habit tracker with a streak counter", "store"], ["A markdown note editor that saves notes", "store"], ["A color palette generator", ""], ["A unit converter", ""], ["A flashcard app that remembers progress", "store"], ["A landing page for a coffee shop", ""], ["A tip and bill splitter", ""], ["A drawing pad with undo", ""], ["A snake game", ""], ["A random quote machine that uses AI", "ai"], ["A countdown to New Year", ""], ["A budget tracker with a chart", "store"], ["A book search using Open Library", "fetch"], ["A typing speed test", ""], ["A mood journal with an AI reflection", "ai"]];
let evStop = false;
function evalsUI(){
  const box = $("#ev"); box.replaceChildren(); box.classList.add("open"); evStop = false;
  const out = el("div"), hist = el("div"), btn = (t, f) => { const b = el("button", "link", t); b.type = "button"; b.onclick = f; return b; };
  const showHist = () => { hist.replaceChildren(el("p", "", "Previous runs")); let h = []; try { h = JSON.parse(ls.get("poppy.evals") || "[]"); } catch {} if (!h.length) hist.append(el("p", "", "None yet.")); h.slice().reverse().forEach(r => hist.append(el("p", "", new Date(r.t).toLocaleString() + " \u00b7 " + r.prov + " \u00b7 " + r.pass + "/" + r.total + " passed"))); };
  const run = async n => {
    prompts(); out.replaceChildren(); evStop = false; let pass = 0; const list = EVALS.slice(0, n);
    for (const [p, need] of list) {
      if (evStop) break; const row = el("p", "", "... " + p); out.append(row);
      let notes = [];
      try {
        const html = extractHtml(await collect([{role: "user", content: "Build this: " + p}], BUILD)), q = await probe(html, 390);
        notes = q.issues.slice(); if (need && !new RegExp("poppy\\." + need).test(html)) notes.push("did not use poppy." + need);
      } catch (e) { notes.push(e.message); }
      row.className = notes.length ? "fail" : "pass"; row.textContent = (notes.length ? "FAIL " : "PASS ") + p + (notes.length ? " (" + notes.join("; ") + ")" : ""); if (!notes.length) pass++;
    }
    out.append(el("p", "", "Done: " + pass + " of " + list.length + " passed."));
    let h = []; try { h = JSON.parse(ls.get("poppy.evals") || "[]"); } catch {} h.push({t: Date.now(), prov: PROVIDERS[prov()].name + " " + modelOf(prov()), pass, total: list.length}); ls.set("poppy.evals", JSON.stringify(h.slice(-10))); showHist();
  };
  box.append(el("h2", "", "Evals"), el("p", "", "Builds fixed prompts with your current AI, then checks each page for errors, blank renders, phone overflow and SDK use. Runs use your key."), btn("Run 5", () => run(5)), btn("Run all 20", () => run(20)), btn("Stop", () => { evStop = true; }), btn("Close", () => { evStop = true; box.classList.remove("open"); location.hash = ""; }), out, hist);
  showHist();
}
function onSiteError(r){
  if (busy || repairs >= 2 || Date.now() - shownAt > 3500) { if (!busy) toast("This site has an error: " + r.m); return; }
  repairs++; toast("Poppy is fixing an error"); build("The page throws this runtime error, fix it: " + r.m, true);
}
function refreshVers(){
  const v = $("#vers"); v.replaceChildren();
  hist.forEach((h, i) => { const o = document.createElement("option"); o.value = i; o.textContent = new Date(h.t).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"}) + " " + h.prompt.slice(0, 28); v.append(o); });
  v.value = hi; $("#undo").disabled = hi < 1; $("#redo").disabled = hi >= hist.length - 1;
}
function jump(i){ if (busy || i < 0 || i >= hist.length) return; hi = i; current = hist[i].html; currentFiles = hist[i].files ? {...hist[i].files} : { "index.html": current }; activeFile = "index.html"; show(current); saveHist(); refreshVers(); }

async function build(text, auto){
  if (!text || busy) return;
  prompts();
  const cap = +ls.get("poppy.cap") || 0;
  if (cap && !auto && meterGet().n >= cap && !(await dlgAsk({title: "Daily limit reached", text: "You've used about " + fmtTok(meterGet().n) + " tokens today, past your limit of " + fmtTok(cap) + ". Keep going?", yes: "Keep going", no: "Stop"}))) return;
  busy = true; if (!auto) repairs = 0;
  const im = auto ? null : img; if (!auto) lastText = text;
  const live = document.body.classList.contains("live");
  ["#go", "#tweakGo"].forEach(s => $(s).disabled = true);
  let note;
  if (live) { $("#fab").classList.add("busy"); if (!auto) $("#panel").classList.remove("open"); }
  else { bub(text, "me"); note = bub("Growing your site"); note.classList.add("work"); phase("building"); }
  let peek, peekTok = null;
  if (!live && !auto) { let last = 0, pf; peekTok = out => { const n = Date.now(); if (n - last < 1400) return; const i = out.search(/<(!doctype|html)/i); if (i < 0 || !/<body/i.test(out)) return; last = n; if (!peek) { peek = bub("", "peek"); pf = document.createElement("iframe"); pf.setAttribute("sandbox", "allow-scripts allow-forms allow-modals"); pf.setAttribute("title", "Live peek"); pf.setAttribute("aria-hidden", "true"); pf.tabIndex = -1; peek.append(pf); } pf.srcdoc = out.slice(i).replace(/<script\b[\s\S]*?(?:<\/script>|$)/gi, ""); }; }
  const agentEnabled = $("#agentOn") && $("#agentOn").checked;
  if (!auto && agentEnabled) {
    try {
      const html = await runAgentLoop(text, note);
      if (peek) { peek.remove(); peek = null; }
      current = html;
      if (!siteId) { siteId = crypto.randomUUID(); ls.set("poppy.site", siteId); meta = {}; }
      hist = hist.slice(0, hi + 1);
      hist.push({t: Date.now(), prompt: "Agent: " + text, html, files: {...currentFiles}, prov: prov()});
      if (hist.length > 30) hist.splice(0, hist.length - 30);
      trimHist(hist); hi = hist.length - 1;
      await saveHist(); refreshVers(); setImg(null);
      reveal(html, live);
      return;
    } catch (e) {
      if (note) note.remove(); if (peek) peek.remove();
      if (live) toast(e.message); else bub(e.message, "err");
      return;
    } finally {
      busy = false; phase(""); $("#fab").classList.remove("busy");
      ["#go", "#tweakGo"].forEach(s => $(s).disabled = false);
    }
  }
  const multiAgentEnabled = $("#multiAgentOn") && $("#multiAgentOn").checked;
  if (!auto && !current && multiAgentEnabled) {
    try {
      phase("building");
      let res = await runMultiAgentPipeline(text, note, im, (step) => setNote(note, step));
      let html = typeof res === "object" && res.html ? res.html : res;
      let files = typeof res === "object" && res.files ? res.files : { "index.html": html };
      if (peek) { peek.remove(); peek = null; }
      const isRenderable = typeof isRenderableHtml === "function" ? isRenderableHtml(html) : (html && html.length > 50 && /<[a-z!]/i.test(html));
      if (!isRenderable) throw new Error("Multi-agent build fell back.");
      if (typeof repairHtml === "function") html = repairHtml(html);
      if (typeof autoWireButtons === "function") html = autoWireButtons(html);
      if (!auto) html = await checkAndFix(html, note);
      current = html;
      currentFiles = files;
      activeFile = "index.html";
      if (!siteId) { siteId = crypto.randomUUID(); ls.set("poppy.site", siteId); meta = {}; }
      hist = hist.slice(0, hi + 1);
      hist.push({t: Date.now(), prompt: "Multi-Agent: " + text, html, files: {...currentFiles}, prov: prov()});
      if (hist.length > 30) hist.splice(0, hist.length - 30);
      trimHist(hist); hi = hist.length - 1;
      await saveHist(); refreshVers(); setImg(null);
      reveal(html, live);
      return;
    } catch (e) {
      console.warn("Multi-agent pipeline notice, using standard build:", e);
    }
  }
  try {
    let html;
    if (current) {
      html = await editDoc(currentFiles, text, im);
    } else {
      let feats = null;
      if (!auto && ($("#planFirst").checked || text.length > 240)) {
        setNote(note, "Planning the features"); phase("planning");
        try { feats = JSON.parse((await collect([{role: "user", content: text, image: im}], PLAN)).match(/\[[\s\S]*\]/)[0]); } catch {}
        if (feats) { feats = await approve(feats); if (!feats) throw new Error("Plan cancelled."); }
      }
      phase("building"); setNote(note, "Growing your site");
      const out = await collect([{role: "user", content: "Build this: " + text + buildHints(text) + (feats && feats.length ? "\n\nInclude exactly these features:\n- " + feats.join("\n- ") : ""), image: im}], BUILD, peekTok);
      currentFiles = parseFiles(out);
      const aMap = {}; (await assetList()).forEach(a => aMap[a.name] = a.data);
      html = bundleFiles(currentFiles, aMap);
    }
    if (peek) { peek.remove(); peek = null; }
    const isRenderable = typeof isRenderableHtml === "function" ? isRenderableHtml(html) : (html && html.length > 50 && /<[a-z!]/i.test(html));
    if (!isRenderable) throw new Error("Poppy didn't get a page back. Try rewording.");
    if (!auto) html = await checkAndFix(html, note);
    if (typeof repairHtml === "function") html = repairHtml(html);
    if (typeof autoWireButtons === "function") html = autoWireButtons(html);
    current = html;
    if (!siteId) { siteId = crypto.randomUUID(); ls.set("poppy.site", siteId); meta = {}; }
    hist = hist.slice(0, hi + 1); hist.push({t: Date.now(), prompt: auto ? "Auto-fix" : text, html, files: {...currentFiles}, prov: prov()}); if (hist.length > 30) hist.splice(0, hist.length - 30); trimHist(hist); hi = hist.length - 1;
    await saveHist(); refreshVers(); setImg(null);
    const miss = missingConns(html);
    if (miss.length) { phase(""); if (note) note.remove(); for (const id of miss) await requestConnect(id, !live); }
    reveal(html, live);
  } catch (e) {
    if (note) note.remove(); if (peek) peek.remove();
    let msg = e.message;
    if (im && /image|vision|multimodal|modal/i.test(msg)) msg = "This model may not accept images. Pick a vision-capable model. (" + msg + ")";
    if (live) toast(msg); else { const b = bub(msg, "err"), r = document.createElement("button"); r.className = "link sm retry"; r.textContent = "Try again"; r.onclick = () => { b.remove(); build(lastText); }; b.append(r); }
  } finally {
    busy = false; phase(""); $("#fab").classList.remove("busy");
    ["#go", "#tweakGo"].forEach(s => $(s).disabled = false);
  }
}
const go = i => { if (busy) return; const t = i.value.trim() || (img ? "Build this from my screenshot or sketch." : !current && tplPick() ? "A " + tplPick()[0].toLowerCase() : ""); i.value = ""; $("#flower").style.setProperty("--lean", "0deg"); build(t); };

function reveal(html, wasLive){
  show(html);
  runAutomations("open", { siteId });
  if (wasLive) { const f = $("#fab").getBoundingClientRect(); burst(f.left + f.width / 2, f.top + f.height / 2); return; }
  const r = $("#flower").getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const st = $("#stage");
  document.body.classList.add("live");
  burst(x, y);
  if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  st.animate({clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${Math.hypot(innerWidth, innerHeight)}px at ${x}px ${y}px)`]}, {duration: 900, easing: "cubic-bezier(.6,0,.2,1)"});
}

$("#homeForm").onsubmit = e => { e.preventDefault(); go($("#prompt")); };
$("#tweakForm").onsubmit = e => { e.preventDefault(); go($("#tweak")); };
if ($("#fab")) $("#fab").onclick = () => { $("#panel").classList.toggle("open"); if ($("#panel").classList.contains("open")) $("#tweak").focus(); };
if ($("#newSite")) $("#newSite").onclick = () => { current = ""; currentFiles = { "index.html": "" }; activeFile = "index.html"; siteId = ""; hist = []; hi = -1; ls.set("poppy.site", ""); refreshVers(); $("#frame").srcdoc = ""; $("#log").replaceChildren(); meta = {}; $("#panel").classList.remove("open"); document.body.classList.remove("live"); $("#prompt").focus(); };
const PLAN = "You plan small web apps. Reply with ONLY a JSON array of 4 to 8 short strings, each one concrete feature the site will have. No other text.";
const vis = (p, m) => {
  if (!m.image) return {role: m.role, content: m.content};
  const {mime, b64} = m.image;
  return p === "anthropic"
    ? {role: m.role, content: [{type: "image", source: {type: "base64", media_type: mime, data: b64}}, {type: "text", text: m.content}]}
    : {role: m.role, content: [{type: "text", text: m.content}, {type: "image_url", image_url: {url: "data:" + mime + ";base64," + b64}}]};
};
let img = null;
async function setImg(file){
  if (!file) { img = null; $("#imgchip").hidden = true; return; }
  if (!file.type.startsWith("image/")) { toast("That file isn't an image."); return; }
  try {
    const bm = await createImageBitmap(file), k = Math.min(1, 1600 / Math.max(bm.width, bm.height)), c = document.createElement("canvas");
    c.width = Math.round(bm.width * k); c.height = Math.round(bm.height * k); c.getContext("2d").drawImage(bm, 0, 0, c.width, c.height);
    const url = c.toDataURL("image/jpeg", .85); img = {mime: "image/jpeg", b64: url.split(",")[1]};
    $("#imgchip img").src = url; $("#imgchip").hidden = false;
  } catch { toast("Couldn't read that image."); }
}
document.addEventListener("dragover", e => e.preventDefault());
document.addEventListener("drop", async e => { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) { if (f.name.endsWith(".zip") || f.type === "application/zip") { try { await reopenZip(f); } catch (err) { toast(err.message); } } else setImg(f); } });
document.addEventListener("paste", e => { const it = [...(e.clipboardData ? e.clipboardData.items : [])].find(i => i.type.startsWith("image/")); if (it) { e.preventDefault(); setImg(it.getAsFile()); } });
document.querySelectorAll(".att").forEach(b => b.onclick = () => $("#imgIn").click());
if ($("#imgIn")) $("#imgIn").onchange = e => { setImg(e.target.files[0]); e.target.value = ""; };
if ($("#imgX")) $("#imgX").onclick = () => setImg(null);

function wireMic(btn, inp){
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!R) { btn.hidden = true; return; }
  let r, base = "";
  const start = () => {
    if (r) return; r = new R(); r.interimResults = true; r.continuous = true; r.lang = navigator.language || "en-US"; base = inp.value ? inp.value + " " : "";
    r.onresult = e => { inp.value = base + [...e.results].map(x => x[0].transcript).join(""); inp.dispatchEvent(new Event("input")); };
    r.onend = () => { r = null; btn.classList.remove("on"); }; r.onerror = () => {};
    btn.classList.add("on"); try { r.start(); } catch { r = null; btn.classList.remove("on"); }
  };
  const stop = () => { if (r) r.stop(); };
  btn.onpointerdown = e => { e.preventDefault(); start(); }; btn.onpointerup = btn.onpointerleave = stop;
  btn.onkeydown = e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); start(); } }; btn.onkeyup = stop;
}
wireMic($("#homeForm .mic"), $("#prompt")); wireMic($("#tweakForm .mic"), $("#tweak"));

function approve(items){
  return new Promise(res => {
    const d = $("#plan"), box = $("#planList"); box.textContent = "";
    items.forEach(t => { const row = document.createElement("label"), c = document.createElement("input"), i = document.createElement("input"); row.className = "pi"; c.type = "checkbox"; c.checked = true; i.type = "text"; i.className = "in"; i.value = String(t); row.append(c, i); box.append(row); });
    const done = v => { d.close(); res(v); };
    if ($("#planOk")) $("#planOk").onclick = () => done([...box.querySelectorAll("label")].filter(l => l.firstChild.checked).map(l => l.lastChild.value.trim()).filter(Boolean));
    if ($("#planNo")) $("#planNo").onclick = () => done(null); d.oncancel = () => res(null); d.showModal();
  });
}
let gutQ = 0;
function gut(){ cancelAnimationFrame(gutQ); gutQ = requestAnimationFrame(() => { const n = $("#src").value.split("\n").length; $("#gut").textContent = Array.from({length: n}, (_, i) => i + 1).join("\n"); }); }
$("#src").addEventListener("input", gut); $("#src").addEventListener("scroll", () => { $("#gut").scrollTop = $("#src").scrollTop; });

let preview = false, lastText = "", gTok = null, gExp = 0;
function phase(x){ const h = $("#home").classList; h.remove("planning", "building"); if (x) h.add(x); }
function setNote(el, t){ if (!el || el.dataset.t === t) return; el.dataset.t = t; el.style.opacity = 0; setTimeout(() => { el.textContent = t; el.style.opacity = 1; }, 450); }
const loadScript = u => new Promise((res, rej) => { const sc = document.createElement("script"); sc.src = u; sc.onload = res; sc.onerror = () => rej(new Error("Couldn't load " + u.split("/")[2])); document.head.append(sc); });
async function passthru(url, o, h){
  o = o || {}; const r = await fetch(url, {method: o.method || "GET", credentials: "omit", headers: {...h, ...(o.body ? {"content-type": "application/json"} : {})}, body: o.body ? (typeof o.body === "string" ? o.body : JSON.stringify(o.body)) : undefined});
  const text = await r.text(); let json; try { json = JSON.parse(text); } catch {} return {ok: r.ok, status: r.status, json, text};
}
if ($("#moreBtn")) $("#moreBtn").onclick = () => { const m = $("#menu"); m.hidden = !m.hidden; $("#moreBtn").setAttribute("aria-expanded", String(!m.hidden)); };
$("#menu").addEventListener("click", e => { if (e.target.closest("button")) { $("#menu").hidden = true; $("#moreBtn").setAttribute("aria-expanded", "false"); } });
$("#fab").addEventListener("click", () => { if (!$("#panel").classList.contains("open")) { $("#menu").hidden = true; $("#moreBtn").setAttribute("aria-expanded", "false"); } });

const GSC = "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/gmail.readonly";
const b64u = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const spRedirect = () => location.origin + location.pathname;
async function startSpotify(cid){
  ls.set("poppy.spcid", cid); const v = b64u(crypto.getRandomValues(new Uint8Array(48))); ls.set("poppy.spv", v);
  const ch = b64u(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)));
  location.href = "https://accounts.spotify.com/authorize?" + new URLSearchParams({client_id: cid, response_type: "code", redirect_uri: spRedirect(), scope: "user-read-private user-read-playback-state user-modify-playback-state playlist-read-private playlist-modify-private user-library-read user-top-read", code_challenge_method: "S256", code_challenge: ch});
}
async function spExchange(body){
  const r = await fetch("https://accounts.spotify.com/api/token", {method: "POST", headers: {"content-type": "application/x-www-form-urlencoded"}, body: new URLSearchParams({client_id: ls.get("poppy.spcid"), ...body})});
  const j = await r.json(); if (!r.ok) throw new Error(j.error_description || "Spotify sign-in failed.");
  const old = JSON.parse(ls.get("poppy.sp") || "{}"); ls.set("poppy.sp", JSON.stringify({a: j.access_token, r: j.refresh_token || old.r, e: Date.now() + (j.expires_in - 60) * 1000}));
}
async function spToken(){
  let t = JSON.parse(ls.get("poppy.sp") || "null"); if (!t) throw new Error("Connect Spotify first (Connectors).");
  if (Date.now() >= t.e) { await spExchange({grant_type: "refresh_token", refresh_token: t.r}); t = JSON.parse(ls.get("poppy.sp")); } return t.a;
}
async function pack(str){
  const buf = new Uint8Array(await new Response(new Blob([str]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer()); let b = "";
  buf.forEach(x => b += String.fromCharCode(x)); return btoa(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function unpack(t){
  const u = Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  return await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();
}
if ($("#shareBtn")) $("#shareBtn").onclick = async () => {
  if (!current) return; const u = location.href.split("#")[0] + "#s=" + await pack(current);
  if (u.length > 32000) toast("This link is " + Math.round(u.length / 1000) + " KB. Some apps may cut it off.");
  try { await navigator.clipboard.writeText(u); toast("Link copied"); } catch { await dlgAsk({title: "Copy this link", input: u, yes: "Done", no: "Close"}); }
};
async function loadShared(){
  try { current = await unpack(location.hash.slice(3)); preview = true; show(current); document.body.classList.add("live", "prev"); $("#shared").hidden = false; }
  catch { toast("That share link is broken."); }
}
if ($("#impBtn")) $("#impBtn").onclick = async () => {
  siteId = crypto.randomUUID(); ls.set("poppy.site", siteId); hist = [{t: Date.now(), prompt: "Imported share", html: current}]; hi = 0; preview = false; meta = {};
  await saveHist(); refreshVers(); document.body.classList.remove("prev"); $("#shared").hidden = true; history.replaceState(null, "", location.pathname + location.search); toast("Imported into your gallery.");
};

const SW = "const C='poppy-v1',A=['./','index.html','manifest.json','icon.svg'];self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A))));self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));";
const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="44" fill="#f23d2a"/><g fill="#ffe6dc"><ellipse cx="100" cy="58" rx="36" ry="42"/><ellipse cx="142" cy="100" rx="42" ry="36"/><ellipse cx="100" cy="142" rx="36" ry="42"/><ellipse cx="58" cy="100" rx="42" ry="36"/></g><circle cx="100" cy="100" r="14" fill="#2a0d16"/></svg>`;
if ($("#pwaBtn")) $("#pwaBtn").onclick = async () => {
  if (!current) return;
  try {
    if (!window.JSZip) await new Promise((res, rej) => { const sc = document.createElement("script"); sc.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"; sc.onload = res; sc.onerror = () => rej(new Error("Couldn't load JSZip. Check your connection.")); document.head.append(sc); });
    const title = (current.match(/<title>([^<]*)<\/title>/i) || [])[1] || "Poppy site";
    let h = inject(current, SHIM).replace(/<head[^>]*>/i, m => m + '<link rel="manifest" href="manifest.json"><meta name="theme-color" content="#f23d2a">');
    const reg = "<scr" + "ipt>if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js')</scr" + "ipt>";
    h = /<\/body>/i.test(h) ? h.replace(/<\/body>/i, reg + "</body>") : h + reg;
    const z = new JSZip(); z.file("index.html", h); z.file("sw.js", SW); z.file("icon.svg", ICON);
    z.file("manifest.json", JSON.stringify({name: title, short_name: title.slice(0, 12), start_url: ".", display: "standalone", background_color: "#f23d2a", theme_color: "#f23d2a", icons: [{src: "icon.svg", sizes: "any", type: "image/svg+xml"}]}, null, 2));
    const l = document.createElement("a"); l.href = URL.createObjectURL(await z.generateAsync({type: "blob"})); l.download = title.replace(/[^\w-]+/g, "-").slice(0, 40) + "-app.zip"; l.click();
    setTimeout(() => URL.revokeObjectURL(l.href), 2000); toast("App bundle downloaded. Host the folder over HTTPS to install it.");
  } catch (e) { toast(e.message); }
};

if ($("#cmpBtn")) $("#cmpBtn").onclick = () => {
  const ks = Object.keys(PROVIDERS).filter(p => keyOf(p));
  if (ks.length < 2) { toast("Add keys for two providers first (Switch AI)."); return; }
  [["#cA", 0], ["#cB", 1]].forEach(([sl, n]) => { $(sl).replaceChildren(...ks.map(p => { const o = document.createElement("option"); o.value = p; o.textContent = PROVIDERS[p].name; return o; })); $(sl).value = ks[n]; });
  $("#cmpOut").hidden = true; $("#panel").classList.remove("open"); $("#cmp").showModal();
};
if ($("#cmpClose")) $("#cmpClose").onclick = () => $("#cmp").close();
async function keepSite(html, prompt, pv){
  const id = crypto.randomUUID(), r = {hist: [{t: Date.now(), prompt, html, prov: pv}], hi: 0};
  await idb("ver", "readwrite", s => s.put(r, id)); $("#cmp").close(); openSite(id, r);
}
if ($("#cmpRun")) $("#cmpRun").onclick = () => {
  prompts(); const t = $("#cmpText").value.trim(); if (!t) return; $("#cmpOut").hidden = false;
  [["A", "#cA"], ["B", "#cB"]].forEach(async ([X, sl]) => {
    const p = $(sl).value, nm = PROVIDERS[p].name, t0 = Date.now(), st = $("#s" + X); let out = ""; $("#k" + X).disabled = true; $("#f" + X).srcdoc = "";
    try {
      for await (const c of stream([{role: "user", content: "Build this: " + t}], BUILD, p)) { out += c; st.textContent = nm + ": writing, " + (out.length / 1000).toFixed(1) + "k chars"; }
      const html = extractHtml(out); $("#f" + X).srcdoc = inject(html);
      st.textContent = nm + ": done in " + ((Date.now() - t0) / 1000).toFixed(1) + "s, about " + Math.round(out.length / 4) + " tokens";
      $("#k" + X).disabled = false; $("#k" + X).onclick = () => keepSite(html, t, p);
    } catch (e) { st.textContent = nm + ": " + e.message; }
  });
};

/* ===== Connectors UI: forms, in-chat requests, manager ===== */
if (ls.get("poppy.gh") && !ls.get("poppy.c.github")) ls.set("poppy.c.github", JSON.stringify({token: ls.get("poppy.gh")}));
if (ls.get("poppy.sbu") && ls.get("poppy.sbk") && !ls.get("poppy.c.supabase")) ls.set("poppy.c.supabase", JSON.stringify({url: ls.get("poppy.sbu"), key: ls.get("poppy.sbk")}));
const needsHttp = () => !/^https?:$/.test(location.protocol) && "Sign-in only works when Poppy is opened from https:// or http://localhost, not from a file.";
function signInGoogle(cid){
  return new Promise(async (res, rej) => {
    try {
      if (!window.google || !google.accounts) await loadScript("https://accounts.google.com/gsi/client");
      google.accounts.oauth2.initTokenClient({client_id: cid, scope: GSC, callback: r => { if (r.error) return rej(new Error("Google: " + r.error)); gTok = r.access_token; gExp = Date.now() + (r.expires_in - 60) * 1000; res(); }, error_callback: e => rej(new Error("Google sign-in " + ((e && e.type) || "failed") + "."))}).requestAccessToken();
    } catch (e) { rej(e); }
  });
}
async function connectNow(c, nv){
  setVals(c, nv);
  if (c.id === "google") { const m = needsHttp(); if (m) throw new Error(m); await signInGoogle(nv.cid); return "Signed in."; }
  if (c.id === "spotify") { const m = needsHttp(); if (m) throw new Error(m); await startSpotify(nv.cid); return new Promise(() => {}); }
  if (c.test === undefined) return "Saved.";
  const t = typeof c.test === "string" ? {path: c.test} : c.test; let r;
  try { r = await apiCall(c, nv, t.path, t); } catch (e) { return "Saved, but I couldn't verify it from the browser (" + e.message + ")."; }
  if (r.status === 401 || r.status === 403) { setVals(c, {}); throw new Error(c.n + " rejected that key (" + r.status + "). Check it and try again."); }
  return r.ok ? "Connected." : "Saved. " + c.n + " answered " + r.status + ".";
}
function connectForm(c, o = {}){
  const f = el("form", "cform"), v = getVals(c), ins = {}, on = isOn(c);
  if (c.id === "google" && !window.google && /^https?:$/.test(location.protocol)) loadScript("https://accounts.google.com/gsi/client").catch(() => {});
  if (o.intro) f.append(el("p", "hint", o.intro));
  c.fields.forEach(([k, label, type, ph]) => { const w = el("label", "fld"), i = el("input"); i.type = type || "text"; i.autocomplete = "off"; i.spellcheck = false; i.value = v[k] || ""; if (ph) i.placeholder = ph; ins[k] = i; w.append(el("span", "", label), i); f.append(w); });
  if (c.help) f.append(el("p", "hint", c.help));
  const st = el("p", "hint st"); st.setAttribute("role", "status"); f.append(st);
  const row = el("div", "row2"), ok = el("button", "go sm", c.oauth ? "Sign in" : on && o.manage ? "Save" : "Connect"); ok.type = "submit"; row.append(ok);
  if (!o.manage) { const s = el("button", "link sm", "Not now"); s.type = "button"; s.onclick = () => o.done(false); row.append(s); }
  if (o.manage && (on || c.custom)) { const d = el("button", "link sm", c.custom ? "Remove" : "Disconnect"); d.type = "button"; d.onclick = () => { disconnect(c); prompts(); o.done(false); }; row.append(d); }
  f.append(row);
  f.onsubmit = async e => {
    e.preventDefault(); const nv = {};
    for (const [k] of c.fields) { nv[k] = ins[k].value.trim(); if (!nv[k]) { st.textContent = "Fill in every field first."; ins[k].focus(); return; } }
    ok.disabled = true; st.textContent = c.oauth ? "Opening sign-in..." : "Checking...";
    try { st.textContent = await connectNow(c, nv); prompts(); o.done(true); } catch (err) { st.textContent = err.message; } finally { ok.disabled = false; }
  };
  return f;
}
const pendReq = {};
function requestConnect(id, chat){
  const c = findConn(id); if (!c) return Promise.resolve(false);
  if (isOn(c)) return Promise.resolve(true);
  if (pendReq[id]) return pendReq[id];
  return pendReq[id] = new Promise(res => {
    let over = false, d, box;
    const fin = ok => { if (over) return; over = true; delete pendReq[id]; if (ok && siteId) ls.set("poppy.perm." + siteId + "." + c.n + " connection", "1"); if (chat) box.replaceChildren(document.createTextNode(ok ? c.n + " connected." : "Skipped " + c.n + ". The site will ask again when it needs it.")); else if (d.open) d.close(); res(ok); };
    const form = connectForm(c, {done: fin, intro: chat ? "Your site uses " + c.n + ". Connect it now so it works from the first click." : "This site wants to use " + c.n + ". Connect it to continue."});
    if (chat) { box = bub("", "card"); box.append(el("b", "", "Connect " + c.n), form); box.scrollIntoView({block: "nearest"}); }
    else { d = $("#creq"); $("#creqT").textContent = "Connect " + c.n; $("#creqB").replaceChildren(form); d.onclose = () => fin(false); d.showModal(); }
  });
}
let openId = "";
function connRow(c){
  const on = isOn(c), open = openId === c.id, row = el("div", "crow" + (open ? " open" : "")), h = el("button", "ch"), m = el("span", "cm", c.n[0].toUpperCase()), i = el("span", "ci");
  h.type = "button"; h.setAttribute("aria-expanded", String(open)); m.style.background = "hsl(" + hue(c.id) + " 65% 42%)";
  const nameEl = el("b", "", c.n);
  if (c.relay) nameEl.append(el("span", "relay-badge", "relay required"));
  i.append(nameEl, el("small", "", c.d)); h.append(m, i, el("span", "bd" + (on ? " on" : ""), on ? "Connected" : "Not connected"));
  h.onclick = () => { openId = open ? "" : c.id; renderConn(); };
  row.append(h); if (open) { const w = el("div", "cf"); w.append(connectForm(c, {manage: true, done: () => renderConn()})); row.append(w); }
  return row;
}
function addRow(){
  const open = openId === "+", row = el("div", "crow" + (open ? " open" : "")), h = el("button", "ch"), m = el("span", "cm", "+"), i = el("span", "ci");
  h.type = "button"; h.setAttribute("aria-expanded", String(open)); m.style.background = "var(--ink)"; i.append(el("b", "", "Add your own API"), el("small", "", "Any HTTPS API with a header key"));
  h.append(m, i); h.onclick = () => { openId = open ? "" : "+"; renderConn(); }; row.append(h);
  if (open) {
    const w = el("form", "cf cform"), fl = (l, ph, val, t) => { const x = el("label", "fld"), n = el("input"); n.placeholder = ph; n.value = val || ""; n.type = t || "text"; n.autocomplete = "off"; x.append(el("span", "", l), n); w.append(x); return n; };
    const nm = fl("Name", "My service"), bs = fl("Base URL", "https://api.example.com/v1"), hd = fl("Auth header name", "Authorization", "Authorization"), px = fl("Header prefix", "Bearer ", "Bearer "), sc = fl("Secret value", "Paste your key", "", "password");
    w.append(el("p", "hint", "Leave the header name empty for an API that needs no key. Calls only ever go to this base URL."));
    const st = el("p", "hint st"); st.setAttribute("role", "status"); const ok = el("button", "go sm", "Add"); ok.type = "submit"; const rw = el("div", "row2"); rw.append(ok); w.append(st, rw);
    w.onsubmit = e => {
      e.preventDefault(); const n = nm.value.trim().slice(0, 30), b = bs.value.trim(), hn = hd.value.trim();
      if (!n || !b) return st.textContent = "Add a name and a base URL.";
      try { const u = new URL(b); if (u.protocol !== "https:" || PRIVATE.test(u.hostname)) throw 0; } catch { return st.textContent = "The base URL must be a public https:// address."; }
      if (hn && !/^[A-Za-z0-9-]{1,40}$/.test(hn)) return st.textContent = "Header names use letters, digits and dashes.";
      if (hn && !sc.value.trim()) return st.textContent = "Paste the secret value.";
      let id = n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "api"; while (findConn(id)) id += "-2";
      ls.set("poppy.custom", JSON.stringify(customs().concat({id, n, base: b.replace(/\/+$/, ""), header: hn, prefix: px.value})));
      ls.set("poppy.c." + id, JSON.stringify({value: sc.value.trim()})); prompts(); openId = id; renderConn(); toast(n + " added. Sites use it as poppy.connect." + id);
    };
    const cw = el("div", "cf"); cw.append(w); row.append(cw);
  }
  return row;
}
function renderConn(){
  const q = $("#connQ").value.trim().toLowerCase(), box = $("#connList"), all = allConns().filter(c => !q || (c.n + " " + c.id + " " + c.d + " " + c.cat).toLowerCase().includes(q));
  box.replaceChildren();
  [...new Set(all.map(c => c.cat))].forEach(cat => { box.append(el("div", "cgh", cat)); all.filter(c => c.cat === cat).forEach(c => box.append(connRow(c))); });
  if (!all.length) box.append(el("p", "empty", "Nothing matches. Add your own API below."));
  if (!q) { if (!customs().length) box.append(el("div", "cgh", "Your own")); box.append(addRow()); }
  const o = box.querySelector(".crow.open"); if (o) o.scrollIntoView({block: "nearest"});
}
function openConnectors(){
  $("#connQ").placeholder = "Search " + CONNECTORS.length + " services";
  $("#connQ").value = "";
  openId = "";
  renderConn();
  $("#relayUrl").value = ls.get("poppy.relay.url");
  $("#relaySec").value = ls.get("poppy.relay.secret");
  $("#relayStatus").textContent = ls.get("poppy.relay.url") ? "Relay is configured." : "Not configured.";
  $("#panel").classList.remove("open");
  $("#conn").showModal();
}
document.querySelectorAll(".connOpen").forEach(b => b.onclick = openConnectors);
$("#connQ").oninput = renderConn;
if ($("#permOff")) $("#permOff").onclick = () => { try { Object.keys(localStorage).filter(k => k.startsWith("poppy.perm.")).forEach(k => localStorage.removeItem(k)); localStorage.removeItem("poppy.hosts"); } catch {} approved = new Set(); toast("Site permissions reset."); };
if ($("#saveRelayBtn")) $("#saveRelayBtn").onclick = () => {
  const u = $("#relayUrl").value.trim(), s = $("#relaySec").value.trim();
  ls.set("poppy.relay.url", u); ls.set("poppy.relay.secret", s);
  $("#relayStatus").textContent = u ? "Relay configured and saved." : "Relay cleared.";
  toast("Relay settings saved.");
};
if ($("#testRelayBtn")) $("#testRelayBtn").onclick = async () => {
  const u = $("#relayUrl").value.trim(), s = $("#relaySec").value.trim(), st = $("#relayStatus");
  if (!u) { st.textContent = "Enter a Relay Worker URL first."; return; }
  st.textContent = "Testing relay connection...";
  try {
    const headers = {}; if (s) headers["x-poppy-relay-secret"] = s;
    const res = await fetch(u, { headers });
    const j = await res.json();
    if (j.status === "ok") st.textContent = "Relay is live and responding!";
    else st.textContent = "Relay returned: " + (j.message || j.error || res.status);
  } catch (err) {
    st.textContent = "Could not reach Relay: " + err.message;
  }
};
if ($("#copyWorkerBtn")) $("#copyWorkerBtn").onclick = () => {
  navigator.clipboard.writeText(generateRelayScript());
  toast("Cloudflare Worker script copied to clipboard.");
};

async function renderAutomations(){
  const box = $("#autoList"); box.replaceChildren();
  let list = [];
  try {
    const keys = await idb("auto", "readonly", s => s.getAllKeys());
    const pre = (siteId || "default") + "\u0000";
    const matched = keys.filter(k => k.startsWith(pre));
    list = await Promise.all(matched.map(k => idb("auto", "readonly", s => s.get(k))));
  } catch {}
  if (!list.length) { box.append(el("p", "empty", "No automations for this site yet. Add a trigger above.")); return; }
  list.forEach(a => {
    const item = el("div", "auto-item");
    const info = el("div", "auto-info");
    const title = el("b", "", a.name);
    const badge = el("span", "relay-badge", a.trigger + (a.trigger === "timer" ? " (" + a.interval + "m)" : ""));
    title.append(badge);
    const sub = el("small", "", (a.actionType === "ai" ? "AI: " : "Connector: ") + a.actionVal + (a.lastRun ? " \u00b7 Last run: " + new Date(a.lastRun).toLocaleTimeString() : " \u00b7 Not run yet"));
    info.append(title, sub);
    const del = el("button", "link sm", "Delete");
    del.onclick = async () => {
      await idb("auto", "readwrite", s => s.delete((siteId || "default") + "\u0000" + a.id));
      renderAutomations();
      toast("Automation removed.");
    };
    item.append(info, del);
    box.append(item);
  });
}
function openAutomations(){
  $("#newAutoBox").style.display = "none";
  renderAutomations();
  $("#panel").classList.remove("open");
  $("#autoDlg").showModal();
}
if ($("#autoBtn")) $("#autoBtn").onclick = openAutomations;
if ($("#autoClose")) $("#autoClose").onclick = () => $("#autoDlg").close();
if ($("#addAutoBtn")) $("#addAutoBtn").onclick = () => {
  const box = $("#newAutoBox");
  box.style.display = box.style.display === "none" ? "block" : "none";
};
if ($("#cancelAutoBtn")) $("#cancelAutoBtn").onclick = () => { $("#newAutoBox").style.display = "none"; };
if ($("#autoTrigger")) $("#autoTrigger").onchange = e => {
  $("#autoTimerRow").style.display = e.target.value === "timer" ? "block" : "none";
};
if ($("#saveAutoBtn")) $("#saveAutoBtn").onclick = async () => {
  const name = $("#autoName").value.trim() || "Untitled automation";
  const trigger = $("#autoTrigger").value;
  const interval = trigger === "timer" ? Math.max(1, parseInt($("#autoInterval").value) || 15) : undefined;
  const actionType = $("#autoActionType").value;
  const actionVal = $("#autoActionVal").value.trim();
  if (!actionVal) { toast("Enter a prompt or API path."); return; }
  const id = crypto.randomUUID();
  const rec = { id, siteId: siteId || "default", name, trigger, interval, actionType, actionVal, lastRun: 0, enabled: true, created: Date.now() };
  await idb("auto", "readwrite", s => s.put(rec, (siteId || "default") + "\u0000" + id));
  $("#newAutoBox").style.display = "none";
  $("#autoName").value = ""; $("#autoActionVal").value = "";
  renderAutomations();
  toast("Automation saved.");
};
if ($("#connClose")) $("#connClose").onclick = () => $("#conn").close();
document.querySelectorAll("dialog .x").forEach(b => b.onclick = () => b.closest("dialog").close());


document.addEventListener("keydown", e => {
  const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase(), live = document.body.classList.contains("live");
  if (mod && k === "k") { e.preventDefault(); if (live && !preview) { $("#panel").classList.add("open"); $("#tweak").focus(); } else $("#prompt").focus(); }
  else if (mod && k === "z" && live && hist.length && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); jump(hi + (e.shiftKey ? 1 : -1)); }
  else if (mod && k === "enter") { const a = document.activeElement.id; if (a === "tweak") $("#tweakForm").requestSubmit(); if (a === "prompt") $("#homeForm").requestSubmit(); }
});
