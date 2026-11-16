if ($("#undo")) $("#undo").onclick = () => jump(hi - 1);
if ($("#redo")) $("#redo").onclick = () => jump(hi + 1);
if ($("#vers")) $("#vers").onchange = () => jump(+$("#vers").value);
if ($("#testKey")) $("#testKey").onclick = async () => {
  saveTab(); ls.set("poppy.prov", sel); updateProv();
  const h = $("#hint"); h.textContent = "Testing...";
  try { let o = ""; for await (const t of stream([{role: "user", content: "Reply with the single word: ok"}], "Reply briefly.")) { o += t; if (o.length > 20) break; } fillModels(sel, keyOf(sel)); h.textContent = "Key works. " + PROVIDERS[sel].name + " replied: " + o.trim().slice(0, 30); }
  catch (e) { h.textContent = e.message; }
};
(async () => {
  if (!siteId || location.hash.startsWith("#s=")) return;
  try {
    const rec = await idb("ver", "readonly", s => s.get(siteId));
    if (rec && rec.hist && rec.hist.length) { meta = {name: rec.name, thumb: rec.thumb}; hist = rec.hist; hi = Math.min(rec.hi, hist.length - 1); current = hist[hi].html; show(current); document.body.classList.add("live"); refreshVers(); }
  } catch {}
})();
{ const q = new URLSearchParams(location.search);
  if (q.get("code") && ls.get("poppy.spv")) spExchange({grant_type: "authorization_code", code: q.get("code"), redirect_uri: spRedirect(), code_verifier: ls.get("poppy.spv")}).then(() => toast("Spotify connected.")).catch(e => toast(e.message)).finally(() => { ls.set("poppy.spv", ""); history.replaceState(null, "", location.pathname); }); }
function route(){
  if (location.hash === "#intro") {
    if (typeof obStart === "function") obStart({replay: true});
  } else if (location.hash === "#evals") {
    evalsUI();
  } else if (location.hash === "#selftest") {
    selftest();
  } else if (location.hash.startsWith("#s=")) {
    loadShared();
  } else if (location.hash.startsWith("#room=")) {
    const r = location.hash.slice(6);
    if (r) switchRoom(decodeURIComponent(r));
  } else if (location.hash === "#roadmap") {
    if (typeof openPoppyRoadmap === "function") openPoppyRoadmap();
  }
}
addEventListener("hashchange", route); route();
async function tryKey(p){ let o = ""; for await (const t of stream([{role: "user", content: "Reply with the single word: ok"}], "Reply briefly.", p)) { o += t; if (o.length > 20) break; } return o; }

if ($("#replayIntro")) {
  $("#replayIntro").onclick = () => {
    if ($("#dlg")) $("#dlg").close();
    if (typeof obStart === "function") obStart({replay: true});
  };
}

if (!location.hash && !siteId && !keyOf(prov()) && !ls.get("poppy.onb")) {
  if (typeof obStart === "function") obStart();
}
