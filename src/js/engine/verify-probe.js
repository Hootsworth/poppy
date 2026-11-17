/* ===== Poppy Verify Probe (Poppy 5.1 Stricter Edition) =====
   Runs INSIDE a rendered app and reports what actually happens:
     - Runtime errors & unhandled rejections
     - Dead buttons & state mutation tracking
     - Canvas animation & keyboard reactivity
     - Architect assertions
     - [5.1] WCAG AA Color Contrast ratio auditing
     - [5.1] Touch & Tap Target size budgeting (>= 44x44px)
     - [5.1] Keyboard Focus Ring & outline visibility
     - [5.1] Frame-time budgets & horizontal layout overflow
   Pure observation: it never fakes behaviour. */

function parseColor(str) {
  if (!str || typeof str !== "string") return { r: 0, g: 0, b: 0, a: 1 };
  const s = str.trim().toLowerCase();
  if (s === "transparent" || s === "rgba(0, 0, 0, 0)") return { r: 0, g: 0, b: 0, a: 0 };
  const rgbaMatch = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgbaMatch) {
    return {
      r: Math.round(parseFloat(rgbaMatch[1])),
      g: Math.round(parseFloat(rgbaMatch[2])),
      b: Math.round(parseFloat(rgbaMatch[3])),
      a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1
    };
  }
  if (s.startsWith("#")) {
    let hex = s.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split("").map(c => c + c).join("");
    }
    if (hex.length >= 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
      };
    }
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

function getLuminance(rgb) {
  const vals = [rgb.r, rgb.g, rgb.b].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * vals[0] + 0.7152 * vals[1] + 0.0722 * vals[2];
}

function getContrastRatio(fgRgb, bgRgb) {
  const l1 = getLuminance(fgRgb);
  const l2 = getLuminance(bgRgb);
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  return +((max + 0.05) / (min + 0.05)).toFixed(2);
}

function getEffectiveBgColor(el, getCs) {
  let curr = el;
  let bg = { r: 255, g: 255, b: 255, a: 1 };
  while (curr && curr.nodeType === 1) {
    try {
      const cs = getCs(curr);
      if (cs && cs.backgroundColor) {
        const parsed = parseColor(cs.backgroundColor);
        if (parsed.a > 0.05) {
          if (parsed.a >= 0.99) return parsed;
          // Composite alpha over background
          bg = {
            r: Math.round(parsed.r * parsed.a + bg.r * (1 - parsed.a)),
            g: Math.round(parsed.g * parsed.a + bg.g * (1 - parsed.a)),
            b: Math.round(parsed.b * parsed.a + bg.b * (1 - parsed.a)),
            a: 1
          };
          return bg;
        }
      }
    } catch (e) {}
    curr = curr.parentElement;
  }
  return bg;
}

function auditContrast(doc, getCs, describeFn) {
  const failed = [];
  let total = 0;
  if (!doc || !doc.querySelectorAll) return { total: 0, failed: [] };
  const textEls = doc.querySelectorAll("p, span, h1, h2, h3, h4, h5, h6, a, button, label, li, td, th");
  const seen = new Set();

  for (const el of textEls) {
    if (!el || !el.getBoundingClientRect) continue;
    const txt = (el.innerText || el.textContent || "").trim();
    if (!txt || txt.length < 2) continue;
    const cs = getCs(el);
    if (!cs || cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    const desc = describeFn(el);
    if (seen.has(desc)) continue;
    seen.add(desc);
    total++;

    const fg = parseColor(cs.color || "#000000");
    const bg = getEffectiveBgColor(el, getCs);
    const ratio = getContrastRatio(fg, bg);

    const fSize = parseFloat(cs.fontSize || "16");
    const isBold = parseInt(cs.fontWeight || "400", 10) >= 700 || cs.fontWeight === "bold";
    const isLargeText = fSize >= 24 || (fSize >= 18.66 && isBold);
    const required = isLargeText ? 3.0 : 4.5;

    if (ratio < required) {
      failed.push({
        element: desc,
        ratio,
        required,
        fg: `rgb(${fg.r},${fg.g},${fg.b})`,
        bg: `rgb(${bg.r},${bg.g},${bg.b})`
      });
    }
  }
  return { total, failed };
}

function auditTapTargets(doc, getCs, describeFn) {
  const small = [];
  let total = 0;
  if (!doc || !doc.querySelectorAll) return { total: 0, small: [] };
  const targets = doc.querySelectorAll("button, input[type=button], input[type=submit], a[href], [role=button], [data-action]");

  for (const el of targets) {
    if (!el || !el.getBoundingClientRect) continue;
    const cs = getCs(el);
    if (!cs || cs.display === "none" || cs.visibility === "hidden" || el.disabled) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    total++;

    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    // Standard touch budget minimum is 44x44px
    if (w < 44 || h < 44) {
      small.push({
        element: describeFn(el),
        width: w,
        height: h,
        required: "44x44px"
      });
    }
  }
  return { total, small };
}

function auditKeyboardFocus(doc, getCs, describeFn) {
  const missing = [];
  let total = 0;
  if (!doc || !doc.querySelectorAll) return { total: 0, missing: [] };
  const focusables = doc.querySelectorAll("button, a[href], input, select, textarea, [tabindex]");

  for (const el of focusables) {
    if (!el || !el.getBoundingClientRect) continue;
    const cs = getCs(el);
    if (!cs || cs.display === "none" || cs.visibility === "hidden" || el.disabled) continue;
    const tabIdx = parseInt(el.getAttribute ? el.getAttribute("tabindex") || "0" : "0", 10);
    if (tabIdx < 0) continue;
    total++;

    const outlineStyle = cs.outlineStyle || "none";
    const outlineWidth = parseFloat(cs.outlineWidth || "0");
    const boxShadow = cs.boxShadow || "none";

    // Detect outline: none without fallback focus shadow or ring
    if ((outlineStyle === "none" || outlineWidth === 0) && boxShadow === "none") {
      missing.push({
        element: describeFn(el),
        reason: "No visible outline or box-shadow focus indicator"
      });
    }
  }
  return { total, missing };
}

async function auditPerformanceBudget(win, doc) {
  let avgFrameMs = 16.6;
  let maxFrameMs = 16.6;
  let jank = false;
  let overflow = false;

  try {
    if (doc && doc.documentElement && win && typeof win.innerWidth === "number") {
      const scrollW = doc.documentElement.scrollWidth || 0;
      if (scrollW > win.innerWidth + 6) {
        overflow = true;
      }
    }

    if (win && typeof win.requestAnimationFrame === "function" && win.performance && typeof win.performance.now === "function") {
      const frames = [];
      let last = win.performance.now();
      for (let i = 0; i < 5; i++) {
        await new Promise(r => win.requestAnimationFrame(r));
        const now = win.performance.now();
        frames.push(now - last);
        last = now;
      }
      if (frames.length) {
        const sum = frames.reduce((a, b) => a + b, 0);
        avgFrameMs = +(sum / frames.length).toFixed(1);
        maxFrameMs = +Math.max(...frames).toFixed(1);
        if (maxFrameMs > 50 || avgFrameMs > 25) {
          jank = true;
        }
      }
    }
  } catch (e) {}

  return { avgFrameMs, maxFrameMs, jank, overflow };
}

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
    if (document.querySelectorAll) {
      document.querySelectorAll("input,textarea,select").forEach(i => { s += "|" + (/checkbox|radio/.test(i.type) ? i.checked : i.value); });
    }
    try { s += "|" + JSON.stringify(localStorage); } catch (e) {}
    if (document.querySelectorAll) {
      document.querySelectorAll("canvas").forEach(c => { s += "|" + canvasHash(c); });
    }
    return s;
  };
  const getCs = typeof getComputedStyle === "function" ? getComputedStyle : () => ({ visibility: "visible", display: "block" });
  const visible = el => {
    if (!el || !el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect(), cs = getCs(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && !el.disabled;
  };
  const describe = el =>
    (el.id ? "#" + el.id : (el.tagName ? el.tagName.toLowerCase() : "element") + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/)[0] : "")) +
    ' "' + (((el.innerText || el.value || (el.getAttribute ? el.getAttribute("aria-label") : "") || "").trim()).slice(0, 24)) + '"';

  // --- render checks
  const text = (document.body ? document.body.innerText || document.body.textContent || "" : "").trim();
  const render = {
    textLen: text.length,
    visual: document.querySelector ? !!document.querySelector("canvas,svg,img,video,table,input,button") : false,
    placeholder: /Interactive application loaded\. All controls and modules are active\./.test(text)
  };

  // --- pre-fill inputs so calculators/forms have something to work with
  if (document.querySelectorAll) {
    document.querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=range]),textarea").forEach(i => {
      if (!visible(i) || i.value) return;
      i.value = i.type === "number" ? String(i.min && +i.min > 5 ? i.min : 5) : i.type === "email" ? "a@b.co" : "test";
      if (typeof i.dispatchEvent === "function" && typeof Event !== "undefined") {
        i.dispatchEvent(new Event("input", { bubbles: true }));
        i.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }

  // --- click every visible control, one at a time
  const els = (document.querySelectorAll ? [...document.querySelectorAll("button,input[type=button],input[type=submit],[role=button],[data-action]")] : []).filter(visible).slice(0, opts.maxButtons || 40);
  const dead = [], exempt = [], clickErrors = [];
  for (const el of els) {
    if (!el.isConnected) continue;
    const before = sig(), n = log.errors.length;
    try { el.click(); } catch (e) { clickErrors.push(describe(el) + " -> " + e.message); }
    await sleep(60);
    if (log.errors.length > n) log.errors.slice(n).forEach(m => clickErrors.push(describe(el) + " -> " + m));
    else if (sig() === before) {
      if (/^(restart|reset|new game|play again|stop|pause|cancel|close)\b/i.test((el.innerText || el.value || "").trim())) exempt.push(describe(el));
      else dead.push(describe(el));
    }
  }

  // --- canvas: does it animate on its own, or react to keys?
  const canvases = (document.querySelectorAll ? [...document.querySelectorAll("canvas")] : []).filter(visible);
  const canvas = { present: canvases.length > 0, animating: false, reactsToKeys: false };
  if (canvases.length) {
    const h0 = canvasHash(canvases[0]); await sleep(300);
    canvas.animating = canvasHash(canvases[0]) !== h0;
    const h1 = canvasHash(canvases[0]);
    for (const k of ["ArrowRight", " ", "ArrowUp", "Enter"]) {
      for (const t of [window, document]) {
        if (typeof t.dispatchEvent === "function" && typeof KeyboardEvent !== "undefined") {
          t.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: k === " " ? "Space" : k, bubbles: true }));
          t.dispatchEvent(new KeyboardEvent("keyup", { key: k, code: k === " " ? "Space" : k, bubbles: true }));
        }
      }
      await sleep(120);
    }
    canvas.reactsToKeys = canvasHash(canvases[0]) !== h1;
  }

  // --- Architect assertions
  const assertionResults = [];
  if (Array.isArray(opts.assertions) && opts.assertions.length) {
    for (const a of opts.assertions) {
      let passed = false, errorMsg = "";
      try {
        const target = a.selector && document.querySelector ? document.querySelector(a.selector) : null;
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

  // --- [5.1] Strict Audits: Contrast, Tap Targets, Focus Rings, Performance
  const contrast = auditContrast(document, getCs, describe);
  const tapTargets = auditTapTargets(document, getCs, describe);
  const focusRings = auditKeyboardFocus(document, getCs, describe);
  const performance = await auditPerformanceBudget(window, document);
  const isStrict = !!(opts.strict || opts.strictChecks || opts.strict51);

  return {
    loadErrors,
    clickErrors,
    buttons: { total: els.length, dead },
    canvas,
    render,
    assertionResults,
    contrast,
    tapTargets,
    focusRings,
    performance,
    strict: isStrict,
    opts
  };
}

function scoreProbe(r, scoreOpts) {
  r = r || {};
  scoreOpts = scoreOpts || {};
  const loadErrors = Array.isArray(r.loadErrors) ? r.loadErrors : [];
  const clickErrors = Array.isArray(r.clickErrors) ? r.clickErrors : [];
  const render = r.render || { textLen: 0, visual: false, placeholder: false };
  const buttons = r.buttons || { total: 0, dead: [] };
  const canvas = r.canvas || { present: false, animating: false, reactsToKeys: false };
  const assertions = Array.isArray(r.assertionResults) ? r.assertionResults : [];

  const load = loadErrors.length === 0;
  const rendered = !render.placeholder && (render.textLen >= 15 || render.visual);
  const judgeButtons = !(canvas.present && canvas.animating);
  const deadRatio = judgeButtons && buttons.total ? (buttons.dead || []).length / buttons.total : 0;
  const canvasOk = !canvas.present || canvas.animating || canvas.reactsToKeys;
  const assertionsOk = assertions.length === 0 || assertions.every(a => a.passed);
  const interaction = clickErrors.length === 0 && deadRatio <= 0.34 && canvasOk && assertionsOk;
  const standardPass = load && rendered && interaction;

  // 5.1 Strict Scoring
  const contrastPass = !r.contrast || (r.contrast.failed || []).length === 0;
  const tapTargetsPass = !r.tapTargets || (r.tapTargets.small || []).length === 0;
  const focusPass = !r.focusRings || (r.focusRings.missing || []).length === 0;
  const perfPass = !r.performance || (!r.performance.overflow && !r.performance.jank);
  const strictPass = contrastPass && tapTargetsPass && focusPass && perfPass;

  const isStrict = !!(scoreOpts.strict || (r.opts && r.opts.strict) || r.strict);
  const finalPass = isStrict ? (standardPass && strictPass) : standardPass;

  return {
    load,
    render: rendered,
    interaction,
    pass: finalPass,
    deadRatio: +deadRatio.toFixed(2),
    assertionsPassed: assertionsOk,
    strict: {
      contrast: contrastPass,
      tapTargets: tapTargetsPass,
      focus: focusPass,
      performance: perfPass,
      pass: strictPass
    }
  };
}

/* Feed this back to the model for ONE repair turn. */
function buildRepairPrompt(r, promptOpts) {
  r = r || {};
  promptOpts = promptOpts || {};
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

  // [5.1] Strict Verify Diagnostics
  const includeStrict = !!(promptOpts.strict || (r.opts && (r.opts.strict || r.opts.strict51)) || r.strict);
  if (includeStrict) {
    if (r.contrast && Array.isArray(r.contrast.failed) && r.contrast.failed.length) {
      out.push("Color Contrast Violations (fails WCAG AA threshold):\n- " +
        r.contrast.failed.slice(0, 4).map(c => `${c.element}: contrast ratio ${c.ratio}:1 (required: ${c.required}:1). Increase foreground/background contrast.`).join("\n- "));
    }

    if (r.tapTargets && Array.isArray(r.tapTargets.small) && r.tapTargets.small.length) {
      out.push("Touch / Tap Target Size Violations (minimum 44x44px budget):\n- " +
        r.tapTargets.small.slice(0, 4).map(t => `${t.element}: current size is ${t.width}x${t.height}px. Increase padding or min-width/min-height to at least 44px.`).join("\n- "));
    }

    if (r.focusRings && Array.isArray(r.focusRings.missing) && r.focusRings.missing.length) {
      out.push("Missing Keyboard Focus Indicators (Accessibility):\n- " +
        r.focusRings.missing.slice(0, 4).map(f => `${f.element}: outline is disabled without a visible focus-visible indicator. Add :focus-visible { outline: 2px solid ... }`).join("\n- "));
    }

    if (r.performance && (r.performance.overflow || r.performance.jank)) {
      const pIssues = [];
      if (r.performance.overflow) pIssues.push("Horizontal layout overflow detected: content exceeds viewport width causing accidental horizontal scrolling.");
      if (r.performance.jank) pIssues.push(`Frame time budget exceeded (${r.performance.maxFrameMs}ms > 50ms): optimize animation loops and reduce layout thrashing.`);
      out.push("Performance & Layout Budget Violations:\n- " + pIssues.join("\n- "));
    }
  }

  return out.length ? "Your app was run in a browser sandbox and failed these checks. Fix exactly these problems and return the full corrected document.\n\n" + out.join("\n\n") : "";
}

/**
 * Sanitizes HTML & SVG attributes and fixes common LLM malformations:
 * 1. Escaped quotes inside attributes (e.g. viewBox="\"0 0 24 24\"", d="\"M10.325...", viewBox=\"0 0 24 24\")
 * 2. Missing elliptical arc sweep-flags in path d attributes (e.g. "a3 3 0 0 6 0", "a3 3 0 0 3-")
 */
function sanitizeSvgAndAttributes(html) {
  if (!html || typeof html !== "string") return html;
  let h = html;

  // 1. Normalize escaped attribute assignments:
  // e.g. viewBox=\"0 0 24 24\" -> viewBox="0 0 24 24"
  // e.g. d=\"M...\" -> d="M..."
  // e.g. class=\"...\" -> class="..."
  h = h.replace(/=\\+["']/g, '="');
  h = h.replace(/([a-zA-Z0-9_:-]+)\s*=\s*\\+["']([\s\S]*?)\\+["'](?=[\s\/>])/g, '$1="$2"');

  // 2. Fix nested/escaped quotes inside any HTML/SVG attributes:
  // e.g. attr="\"value\"" -> attr="value"
  // e.g. attr="\"value"   -> attr="value"
  // e.g. attr='\"value\'' -> attr='value'
  // e.g. attr="\\\"value\\\"" -> attr="value"
  h = h.replace(/([a-zA-Z0-9_:-]+)\s*=\s*(["'])(?:\\*["']|&quot;)+([\s\S]*?)(?:\\*["']|&quot;)*\2/g, '$1=$2$3$2');
  h = h.replace(/([a-zA-Z0-9_:-]+)\s*=\s*(["'])([\s\S]*?)(?:\\*["']|&quot;)+\2/g, '$1=$2$3$2');

  // 3. Specifically sanitize viewBox and d (and other SVG numeric/path attributes):
  // Clean any residual backslashes, quotes, or HTML entities from viewBox and d:
  h = h.replace(/\b(viewBox|d|points|transform|fill|stroke)\s*=\s*(["'])([\s\S]*?)\2/gi, (match, attr, q, val) => {
    let clean = val;
    // Strip leading/trailing escaped or unescaped quotes, backslashes, entities
    clean = clean.replace(/^(?:[\s\\"'&]|&quot;)+/g, '');
    clean = clean.replace(/(?:[\s\\"'&]|&quot;)+$/g, '');
    // Clean any remaining internal escaped quotes: e.g. \"
    clean = clean.replace(/\\+["']/g, ' ');

    // 4. For path "d" attribute, repair malformed arc syntax:
    if (attr.toLowerCase() === 'd') {
      // Fix missing sweep-flag when rx ry rot flag1 are followed by coordinate (number >= 2 or negative)
      clean = clean.replace(/([aA]\s*\d+(?:\.\d+)?[\s,]+\d+(?:\.\d+)?[\s,]+-?\d+(?:\.\d+)?[\s,]+[01])([\s,]+)([2-9]|\d{2,}|-[0-9])/g, "$1 0$2$3");
      clean = clean.replace(/([aA]\s*\d+(?:\.\d+)?[\s,]+\d+(?:\.\d+)?[\s,]+-?\d+(?:\.\d+)?[\s,]+[01])([\s,]+)([2-9])/g, "$1 0$2$3");
      clean = clean.replace(/([aA]\s*\d+(?:\.\d+)?[\s,]+\d+(?:\.\d+)?[\s,]+-?\d+(?:\.\d+)?[\s,]+[01])(-[0-9])/g, "$1 0 $2");
    }

    return `${attr}=${q}${clean}${q}`;
  });

  return h;
}

const exported = {
  initProbe,
  runProbe,
  scoreProbe,
  buildRepairPrompt,
  parseColor,
  getLuminance,
  getContrastRatio,
  getEffectiveBgColor,
  auditContrast,
  auditTapTargets,
  auditKeyboardFocus,
  auditPerformanceBudget,
  sanitizeSvgAndAttributes
};

if (typeof module !== "undefined") module.exports = exported;
if (typeof window !== "undefined") Object.assign(window, exported);
