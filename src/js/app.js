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
function route(){ if (location.hash === "#evals") evalsUI(); else if (location.hash === "#selftest") selftest(); else if (location.hash.startsWith("#s=")) loadShared(); else if (location.hash.startsWith("#room=")) { const r = location.hash.slice(6); if (r) switchRoom(decodeURIComponent(r)); } }
addEventListener("hashchange", route); route();
async function tryKey(p){ let o = ""; for await (const t of stream([{role: "user", content: "Reply with the single word: ok"}], "Reply briefly.", p)) { o += t; if (o.length > 20) break; } return o; }
function onboard(n, p){
  const d = $("#onb"), B = $("#onbB"), A = $("#onbA"); B.replaceChildren(); A.replaceChildren();
  const btn = (t, f, c = "link") => { const b = el("button", c, t); b.type = "button"; b.onclick = f; return b; };
  $("#onbT").textContent = ["Pick your AI", "Paste your key", "Build something"][n - 1];
  B.append(el("p", "hint", "Step " + n + " of 3"));
  if (n === 1) { const g = el("div", "tabs"); Object.keys(PROVIDERS).forEach(k => g.append(btn(PROVIDERS[k].name, () => onboard(2, k), "tab"))); B.append(g); A.append(btn("Skip for now", () => d.close())); }
  if (n === 2) {
    const l = el("label", "fld"), i = el("input"), h = el("p", "hint", PROVIDERS[p].hint + " It stays in this browser."); i.type = "password"; i.autocomplete = "off"; i.value = keyOf(p); h.setAttribute("role", "status");
    l.append(el("span", "", PROVIDERS[p].name + " API key"), i); B.append(l, h);
    A.append(btn("Test and continue", async () => { ls.set("poppy.key." + p, i.value.trim()); h.textContent = "Testing..."; try { await tryKey(p); ls.set("poppy.prov", p); updateProv(); onboard(3); } catch (e) { h.textContent = e.message; } }, "go"), btn("Back", () => onboard(1)));
  }
  if (n === 3) { const g = el("div", "ideas"); g.style.marginTop = "0"; IDEAS.slice(0, 4).forEach(t => g.append(btn(t, () => { d.close(); $("#prompt").value = t; $("#homeForm").requestSubmit(); }))); B.append(g); A.append(btn("I'll type my own", () => { d.close(); $("#prompt").focus(); })); }
  if (!d.open) d.showModal();
}
if (!location.hash && !siteId && !keyOf(prov()) && !ls.get("poppy.onb")) { ls.set("poppy.onb", "1"); onboard(1); }
