/* ===== Poppy Verify Probe =====
   Runs INSIDE a rendered app and reports what actually happens.
   Used two ways:
     - Node eval (eval.js):  page.addInitScript(initProbe); page.evaluate(runProbe)
     - poppy.html (Phase 2): embed "(" + initProbe + ")()" in <head> of the preview,
       then post "(" + runProbe + ")()" results back via postMessage.
   Pure observation: it never fakes behaviour. */

function initProbe() {
  if (window.__pp_probe) return;
  const log = (window.__pp_probe = { errors: [] });
  const push = m => { if (log.errors.length < 30) log.errors.push(String(m).slice(0, 240)); };
  window.addEventListener("error", e => push((e.message || "error") + (e.lineno ? " (line " + e.lineno + ")" : "")));
  window.addEventListener("unhandledrejection", e => push("Unhandled rejection: " + ((e.reason && e.reason.message) || e.reason)));
  const ce = console.error;
  console.error = function () { push("console.error: " + [].slice.call(arguments).join(" ")); return ce.apply(console, arguments); };
  window.alert = window.confirm = () => true;
  window.prompt = () => "test";
  // bubble phase on window => runs AFTER the app's own handlers; only stops navigation
  window.addEventListener("submit", e => { if (!e.defaultPrevented) e.preventDefault(); });
  window.addEventListener("click", e => {
    const a = e.target && e.target.closest && e.target.closest("a[href]");
    if (a && !e.defaultPrevented) e.preventDefault();
  });
  window.addEventListener("message", async e => {
    if (e.data && e.data.poppy === 1 && e.data.cmd === "runProbe") {
      try {
        const res = await runProbe(e.data.opts || {});
        window.parent.postMessage({ poppy: 1, cmdRes: "probeResult", result: res }, "*");
      } catch (err) {
        window.parent.postMessage({ poppy: 1, cmdRes: "probeResult", result: { loadErrors: [err.message], clickErrors: [], buttons: { total: 0, dead: [] }, canvas: { present: false }, render: { textLen: 0, visual: false, placeholder: false } } }, "*");
      }
    }
  });
}

async function runProbe(opts) {
  opts = opts || {};
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const log = window.__pp_probe || { errors: [] };
  await sleep(opts.settle || 400);
  const loadErrors = [...new Set(log.errors)];

  const canvasHash = c => {
    try {
      const t = document.createElement("canvas"); t.width = 32; t.height = 32;
      t.getContext("2d").drawImage(c, 0, 0, 32, 32);
      return Array.prototype.join.call(t.getContext("2d").getImageData(0, 0, 32, 32).data, ",");
    } catch (e) { return "x"; }
  };
  const sig = () => {
    let s = document.body ? document.body.innerHTML : "";
    document.querySelectorAll("input,textarea,select").forEach(i => { s += "|" + (/checkbox|radio/.test(i.type) ? i.checked : i.value); });
    try { s += "|" + JSON.stringify(localStorage); } catch (e) {}
    document.querySelectorAll("canvas").forEach(c => { s += "|" + canvasHash(c); });
    return s;
  };
  const visible = el => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && !el.disabled;
  };
  const describe = el =>
    (el.id ? "#" + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/)[0] : "")) +
    ' "' + ((el.innerText || el.value || el.getAttribute("aria-label") || "").trim().slice(0, 24)) + '"';

  // --- render checks
  const text = (document.body ? document.body.innerText : "").trim();
  const render = {
    textLen: text.length,
    visual: !!document.querySelector("canvas,svg,img,video,table,input,button"),
    placeholder: /Interactive application loaded\. All controls and modules are active\./.test(text)
  };

  // --- pre-fill inputs so calculators/forms have something to work with
  document.querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=range]),textarea").forEach(i => {
    if (!visible(i) || i.value) return;
    i.value = i.type === "number" ? String(i.min && +i.min > 5 ? i.min : 5) : i.type === "email" ? "a@b.co" : "test";
    i.dispatchEvent(new Event("input", { bubbles: true })); i.dispatchEvent(new Event("change", { bubbles: true }));
  });

  // --- click every visible control, one at a time
  const els = [...document.querySelectorAll("button,input[type=button],input[type=submit],[role=button],[data-action]")].filter(visible).slice(0, opts.maxButtons || 40);
  const dead = [], exempt = [], clickErrors = [];
  for (const el of els) {
    if (!el.isConnected) continue;
    const before = sig(), n = log.errors.length;
    try { el.click(); } catch (e) { clickErrors.push(describe(el) + " -> " + e.message); }
    await sleep(60);
    if (log.errors.length > n) log.errors.slice(n).forEach(m => clickErrors.push(describe(el) + " -> " + m));
    else if (sig() === before) {
      // restart/reset/stop at initial state legitimately changes nothing
      if (/^(restart|reset|new game|play again|stop|pause|cancel|close)\b/i.test((el.innerText || el.value || "").trim())) exempt.push(describe(el));
      else dead.push(describe(el));
    }
  }

  // --- canvas: does it animate on its own, or react to keys?
  const canvases = [...document.querySelectorAll("canvas")].filter(visible);
  const canvas = { present: canvases.length > 0, animating: false, reactsToKeys: false };
  if (canvases.length) {
    const h0 = canvasHash(canvases[0]); await sleep(300);
    canvas.animating = canvasHash(canvases[0]) !== h0;
    const h1 = canvasHash(canvases[0]);
    for (const k of ["ArrowRight", " ", "ArrowUp", "Enter"]) {
      for (const t of [window, document]) {
        t.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: k === " " ? "Space" : k, bubbles: true }));
        t.dispatchEvent(new KeyboardEvent("keyup", { key: k, code: k === " " ? "Space" : k, bubbles: true }));
      }
      await sleep(120);
    }
    canvas.reactsToKeys = canvasHash(canvases[0]) !== h1;
  }

  // --- verify explicit Architect assertions if provided
  const assertionResults = [];
  if (Array.isArray(opts.assertions) && opts.assertions.length) {
    for (const a of opts.assertions) {
      let passed = false, errorMsg = "";
      try {
        const target = a.selector ? document.querySelector(a.selector) : null;
        if (a.expectedState === "dom-exists") {
          passed = !!target;
          if (!passed) errorMsg = `Element ${a.selector} not found in DOM`;
        } else if (a.action === "click" && target) {
          const before = sig();
          target.click();
          await sleep(60);
          passed = (sig() !== before) || (a.expectedState === "no-unhandled-errors");
          if (!passed) errorMsg = `Action on ${a.selector} produced no state mutation`;
        } else {
          passed = !!target;
        }
      } catch (e) {
        passed = false;
        errorMsg = e.message;
      }
      assertionResults.push({ id: a.id || a.description, description: a.description, passed, error: errorMsg });
    }
  }

  return { loadErrors, clickErrors, buttons: { total: els.length, dead }, canvas, render, assertionResults };
}

function scoreProbe(r) {
  r = r || {};
  const loadErrors = Array.isArray(r.loadErrors) ? r.loadErrors : [];
  const clickErrors = Array.isArray(r.clickErrors) ? r.clickErrors : [];
  const render = r.render || { textLen: 0, visual: false, placeholder: false };
  const buttons = r.buttons || { total: 0, dead: [] };
  const canvas = r.canvas || { present: false, animating: false, reactsToKeys: false };
  const assertions = Array.isArray(r.assertionResults) ? r.assertionResults : [];

  const load = loadErrors.length === 0;
  const rendered = !render.placeholder && (render.textLen >= 15 || render.visual);
  // an always-animating canvas masks click effects, so only judge buttons on non-animating pages
  const judgeButtons = !(canvas.present && canvas.animating);
  const deadRatio = judgeButtons && buttons.total ? (buttons.dead || []).length / buttons.total : 0;
  const canvasOk = !canvas.present || canvas.animating || canvas.reactsToKeys;
  const assertionsOk = assertions.length === 0 || assertions.every(a => a.passed);
  const interaction = clickErrors.length === 0 && deadRatio <= 0.34 && canvasOk && assertionsOk;
  return { load, render: rendered, interaction, pass: load && rendered && interaction, deadRatio: +deadRatio.toFixed(2), assertionsPassed: assertionsOk };
}

/* Feed this back to the model for ONE repair turn. */
function buildRepairPrompt(r) {
  r = r || {};
  const out = [];
  const render = r.render || {};
  const loadErrors = Array.isArray(r.loadErrors) ? r.loadErrors : [];
  const clickErrors = Array.isArray(r.clickErrors) ? r.clickErrors : [];
  const buttons = r.buttons || { dead: [] };
  const canvas = r.canvas || {};
  const failedAsserts = (r.assertionResults || []).filter(a => !a.passed);
  if (render.placeholder) out.push("The page rendered only a generic placeholder; build the real UI.");
  if (loadErrors.length) out.push("Errors on load:\n- " + loadErrors.join("\n- "));
  if (clickErrors.length) out.push("Errors when clicking controls:\n- " + clickErrors.join("\n- "));
  if (buttons.dead && buttons.dead.length) out.push("Controls that did nothing when clicked (no DOM, input, storage or canvas change):\n- " + buttons.dead.join("\n- "));
  if (canvas.present && !canvas.animating && !canvas.reactsToKeys) out.push("The canvas never changes: no animation loop and no response to keyboard input.");
  if (failedAsserts.length) out.push("Failed Architectural Assertions:\n- " + failedAsserts.map(a => `${a.description} (${a.error || "failed"})`).join("\n- "));
  return out.length ? "Your app was run in a browser sandbox and failed these checks. Fix exactly these problems and return the full corrected document.\n\n" + out.join("\n\n") : "";
}

if (typeof module !== "undefined") module.exports = { initProbe, runProbe, scoreProbe, buildRepairPrompt };
if (typeof window !== "undefined") Object.assign(window, { initProbe, runProbe, scoreProbe, buildRepairPrompt });
