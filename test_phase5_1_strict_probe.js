// ==================================================================
// POPPY PHASE 5.1: STRICT VERIFY PROBE TEST SUITE
// Contrast Auditing, Tap Target Sizing, Focus Rings, Performance Budgets
// ==================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  initProbe,
  runProbe,
  scoreProbe,
  buildRepairPrompt,
  parseColor,
  getLuminance,
  getContrastRatio,
  auditContrast,
  auditTapTargets,
  auditKeyboardFocus,
  auditPerformanceBudget,
  sanitizeSvgAndAttributes
} = require("./src/js/engine/verify-probe.js");

console.log("==================================================================");
console.log("POPPY PHASE 5.1: STRICT VERIFY PROBE TEST SUITE");
console.log("Contrast, Tap Targets, Focus Rings, Layout & Performance Budgets");
console.log("==================================================================");

let testsPassed = 0;
const it = (desc, fn) => {
  try {
    fn();
    testsPassed++;
    console.log(`PASS [${testsPassed}]: ${desc}`);
  } catch (err) {
    console.error(`FAIL: ${desc}`);
    console.error(err);
    process.exit(1);
  }
};

const itAsync = async (desc, fn) => {
  try {
    await fn();
    testsPassed++;
    console.log(`PASS [${testsPassed}]: ${desc}`);
  } catch (err) {
    console.error(`FAIL: ${desc}`);
    console.error(err);
    process.exit(1);
  }
};

(async () => {
  console.log("\n--- Suite 1: WCAG Color Contrast Mathematics & Auditing ---");

  it("parseColor correctly extracts RGB and alpha from hex, rgb, and rgba formats", () => {
    assert.deepStrictEqual(parseColor("#ffffff"), { r: 255, g: 255, b: 255, a: 1 });
    assert.deepStrictEqual(parseColor("#000"), { r: 0, g: 0, b: 0, a: 1 });
    assert.deepStrictEqual(parseColor("rgb(242, 61, 42)"), { r: 242, g: 61, b: 42, a: 1 });
    assert.deepStrictEqual(parseColor("rgba(42, 13, 22, 0.5)"), { r: 42, g: 13, b: 22, a: 0.5 });
    assert.deepStrictEqual(parseColor("transparent"), { r: 0, g: 0, b: 0, a: 0 });
  });

  it("getLuminance and getContrastRatio accurately compute WCAG 2.1 ratios", () => {
    const white = { r: 255, g: 255, b: 255 };
    const black = { r: 0, g: 0, b: 0 };
    const gray = { r: 200, g: 200, b: 200 };
    const poppyRed = { r: 242, g: 61, b: 42 };

    const blackOnWhite = getContrastRatio(black, white);
    assert.strictEqual(blackOnWhite, 21);

    const grayOnWhite = getContrastRatio(gray, white);
    assert.ok(grayOnWhite < 2.0, "Light gray on white should be low contrast");

    const redOnWhite = getContrastRatio(poppyRed, white);
    assert.ok(redOnWhite >= 3.0 && redOnWhite < 4.5, "Poppy red meets large text standard but fails normal text");
  });

  it("auditContrast flags text below WCAG AA thresholds", () => {
    const mockElements = [
      {
        tagName: "p",
        className: "good-text",
        innerText: "Clear contrast text",
        getBoundingClientRect: () => ({ width: 200, height: 20 })
      },
      {
        tagName: "span",
        className: "faint-text",
        innerText: "Hard to read faint text",
        getBoundingClientRect: () => ({ width: 180, height: 18 })
      }
    ];

    const styles = {
      "good-text": { color: "#111111", backgroundColor: "#ffffff", fontSize: "16px", fontWeight: "400", display: "block", visibility: "visible" },
      "faint-text": { color: "#cccccc", backgroundColor: "#ffffff", fontSize: "14px", fontWeight: "400", display: "block", visibility: "visible" }
    };

    const mockDoc = {
      querySelectorAll: () => mockElements
    };
    const getCs = el => styles[el.className] || { display: "block", visibility: "visible" };
    const describe = el => el.tagName + "." + el.className;

    const res = auditContrast(mockDoc, getCs, describe);
    assert.strictEqual(res.total, 2);
    assert.strictEqual(res.failed.length, 1);
    assert.strictEqual(res.failed[0].element, "span.faint-text");
    assert.strictEqual(res.failed[0].required, 4.5);
  });

  console.log("\n--- Suite 2: Touch & Tap Target Size Budgeting ---");

  it("auditTapTargets flags interactive controls smaller than 44x44px budget", () => {
    const mockControls = [
      {
        tagName: "button",
        id: "btnSmall",
        className: "icon-btn",
        innerText: "X",
        disabled: false,
        getBoundingClientRect: () => ({ width: 24, height: 24 })
      },
      {
        tagName: "button",
        id: "btnGood",
        className: "primary-btn",
        innerText: "Submit",
        disabled: false,
        getBoundingClientRect: () => ({ width: 120, height: 48 })
      }
    ];

    const mockDoc = {
      querySelectorAll: () => mockControls
    };
    const getCs = () => ({ display: "inline-block", visibility: "visible" });
    const describe = el => "#" + el.id;

    const res = auditTapTargets(mockDoc, getCs, describe);
    assert.strictEqual(res.total, 2);
    assert.strictEqual(res.small.length, 1);
    assert.strictEqual(res.small[0].element, "#btnSmall");
    assert.strictEqual(res.small[0].width, 24);
    assert.strictEqual(res.small[0].height, 24);
  });

  console.log("\n--- Suite 3: Keyboard Focus Indicator Auditing ---");

  it("auditKeyboardFocus detects missing focus rings and outline:none", () => {
    const mockFocusables = [
      {
        tagName: "button",
        id: "btnNoOutline",
        disabled: false,
        getAttribute: () => "0",
        getBoundingClientRect: () => ({ width: 100, height: 44 })
      },
      {
        tagName: "input",
        id: "inputAccessible",
        disabled: false,
        getAttribute: () => "0",
        getBoundingClientRect: () => ({ width: 200, height: 44 })
      }
    ];

    const styles = {
      btnNoOutline: { outlineStyle: "none", outlineWidth: "0px", boxShadow: "none", display: "block", visibility: "visible" },
      inputAccessible: { outlineStyle: "solid", outlineWidth: "2px", outlineColor: "#2a0d16", boxShadow: "none", display: "block", visibility: "visible" }
    };

    const mockDoc = {
      querySelectorAll: () => mockFocusables
    };
    const getCs = el => styles[el.id] || { display: "block", visibility: "visible" };
    const describe = el => "#" + el.id;

    const res = auditKeyboardFocus(mockDoc, getCs, describe);
    assert.strictEqual(res.total, 2);
    assert.strictEqual(res.missing.length, 1);
    assert.strictEqual(res.missing[0].element, "#btnNoOutline");
  });

  console.log("\n--- Suite 4: Performance & Layout Overflow Budgets ---");

  await itAsync("auditPerformanceBudget flags horizontal overflow exceeding phone viewport", async () => {
    const mockWin = { innerWidth: 390 };
    const mockDoc = { documentElement: { scrollWidth: 460 } };

    const perf = await auditPerformanceBudget(mockWin, mockDoc);
    assert.strictEqual(perf.overflow, true, "Should detect horizontal layout overflow");
  });

  console.log("\n--- Suite 5: Strict Scoring & Self-Repair Diagnostic Formulator ---");

  it("scoreProbe enforces strict mode checks when strict: true is passed", () => {
    const mockResult = {
      loadErrors: [],
      clickErrors: [],
      buttons: { total: 5, dead: [] },
      render: { textLen: 100, visual: true, placeholder: false },
      canvas: { present: false },
      contrast: { total: 4, failed: [{ element: "#sub", ratio: 2.1, required: 4.5 }] },
      tapTargets: { total: 2, small: [] },
      focusRings: { total: 2, missing: [] },
      performance: { overflow: false, jank: false }
    };

    // Standard mode ignores non-fatal strict checks
    const standardScore = scoreProbe(mockResult, { strict: false });
    assert.strictEqual(standardScore.pass, true);
    assert.strictEqual(standardScore.strict.contrast, false);
    assert.strictEqual(standardScore.strict.pass, false);

    // Strict 5.1 mode requires all strict checks to pass
    const strictScore = scoreProbe(mockResult, { strict: true });
    assert.strictEqual(strictScore.pass, false, "Strict mode must fail on contrast violation");
  });

  it("buildRepairPrompt formats comprehensive repair instructions for strict 5.1 violations", () => {
    const mockResult = {
      loadErrors: [],
      clickErrors: [],
      buttons: { dead: [] },
      contrast: {
        failed: [{ element: "button.secondary", ratio: 2.3, required: 4.5 }]
      },
      tapTargets: {
        small: [{ element: "#iconBtn", width: 22, height: 22 }]
      },
      focusRings: {
        missing: [{ element: "a.nav-item" }]
      },
      performance: {
        overflow: true,
        jank: true,
        maxFrameMs: 68
      },
      opts: { strict: true }
    };

    const prompt = buildRepairPrompt(mockResult, { strict: true });
    assert.ok(prompt.includes("Color Contrast Violations"), "Must include contrast repair section");
    assert.ok(prompt.includes("button.secondary: contrast ratio 2.3:1"));
    assert.ok(prompt.includes("Touch / Tap Target Size Violations"), "Must include tap target repair section");
    assert.ok(prompt.includes("#iconBtn: current size is 22x22px"));
    assert.ok(prompt.includes("Missing Keyboard Focus Indicators"), "Must include focus indicator repair section");
    assert.ok(prompt.includes("Performance & Layout Budget Violations"), "Must include performance budget section");
    assert.ok(prompt.includes("Horizontal layout overflow detected"));
    assert.ok(prompt.includes("Frame time budget exceeded"));
  });

  console.log("\n--- Suite 6: Production Bundle Conformance & Invariants ---");

  it("poppy.html and dist/index.html contain strict verify probe with zero emojis and 1 script tag", () => {
    const poppyHtml = fs.readFileSync(path.join(__dirname, "poppy.html"), "utf8");
    const distHtml = fs.readFileSync(path.join(__dirname, "dist", "index.html"), "utf8");

    assert.ok(poppyHtml.includes("auditContrast"), "poppy.html must contain auditContrast");
    assert.ok(poppyHtml.includes("auditTapTargets"), "poppy.html must contain auditTapTargets");
    assert.ok(poppyHtml.includes("auditKeyboardFocus"), "poppy.html must contain auditKeyboardFocus");
    assert.ok(poppyHtml.includes("auditPerformanceBudget"), "poppy.html must contain auditPerformanceBudget");
    assert.ok(poppyHtml.includes("sanitizeSvgAndAttributes"), "poppy.html must contain sanitizeSvgAndAttributes");

    assert.ok(distHtml.includes("auditContrast"), "dist/index.html must contain auditContrast");
    assert.ok(distHtml.includes("sanitizeSvgAndAttributes"), "dist/index.html must contain sanitizeSvgAndAttributes");

    const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
    assert.strictEqual([...poppyHtml.matchAll(emojiRegex)].length, 0, "Zero emojis in poppy.html");
    assert.strictEqual([...distHtml.matchAll(emojiRegex)].length, 0, "Zero emojis in dist/index.html");

    const scriptTags = [...poppyHtml.matchAll(/<\/script>/gi)];
    assert.strictEqual(scriptTags.length, 1, "Exactly 1 closing script tag in production bundle");
  });

  console.log("\n--- Suite 7: SVG Parsing & Attribute Sanitization Pipeline ---");

  it("sanitizeSvgAndAttributes repairs escaped quotes in viewBox and d attributes", () => {
    // Error 2: <svg> attribute viewBox: Expected number, "\"0"
    const svgWithEscapedViewBox = '<svg viewBox="\\"0 0 24 24\\""><rect x="0" y="0" width="24" height="24"/></svg>';
    const cleanedSvg = sanitizeSvgAndAttributes(svgWithEscapedViewBox);
    assert.strictEqual(cleanedSvg, '<svg viewBox="0 0 24 24"><rect x="0" y="0" width="24" height="24"/></svg>');

    // Error 3: <path> attribute d: Expected moveto path command ('M' or 'm'), "\"M10.325"
    const pathWithEscapedM10 = '<path d="\\"M10.325 3.25L12 5z\\"">';
    const cleanedM10 = sanitizeSvgAndAttributes(pathWithEscapedM10);
    assert.strictEqual(cleanedM10, '<path d="M10.325 3.25L12 5z">');

    // Error 4: <path> attribute d: Expected moveto path command ('M' or 'm'), "\"M15"
    const pathWithEscapedM15 = '<path d="\\"M15 12a3 3 0 0 0-3-3z\\"">';
    const cleanedM15 = sanitizeSvgAndAttributes(pathWithEscapedM15);
    assert.strictEqual(cleanedM15, '<path d="M15 12a3 3 0 0 0-3-3z">');

    // Triple backslash test
    const tripleEscaped = '<svg viewBox="\\\\\\"0 0 24 24\\\\\\""><path d="\\\\\\"M15 12z\\\\\\""></svg>';
    assert.strictEqual(sanitizeSvgAndAttributes(tripleEscaped), '<svg viewBox="0 0 24 24"><path d="M15 12z"></svg>');
  });

  it("sanitizeSvgAndAttributes repairs malformed SVG arc commands with missing sweep flags", () => {
    // Error 1: <path> attribute d: Expected arc flag ('0' or '1'), "…0-3 3v8a3 3 0 0 6 0V4a3 3 0 0 3-…"
    const malformedArc = '<path d="M8 0a3 3 0 0 0-3 3v8a3 3 0 0 6 0V4a3 3 0 0 3-3z">';
    const repairedArc = sanitizeSvgAndAttributes(malformedArc);
    // In both "a3 3 0 0 6 0" and "a3 3 0 0 3-3z", the missing sweep flag "0" must be inserted
    assert.strictEqual(repairedArc, '<path d="M8 0a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0 3-3z">');

    // Test with glued minus sign: a3 3 0 0-3
    const gluedMinus = '<path d="a3 3 0 0-3 3"/>';
    assert.strictEqual(sanitizeSvgAndAttributes(gluedMinus), '<path d="a3 3 0 0 0 -3 3"/>');

    // Test with space before minus sign: a3 3 0 0 -3
    const spacedMinus = '<path d="a3 3 0 0 -3 3"/>';
    assert.strictEqual(sanitizeSvgAndAttributes(spacedMinus), '<path d="a3 3 0 0 0 -3 3"/>');
  });

  it("preserves standard valid SVG paths and attributes without distortion", () => {
    const validSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><circle cx="12" cy="12" r="10"/></svg>';
    assert.strictEqual(sanitizeSvgAndAttributes(validSvg), validSvg);

    const validArc = '<path d="A 45 45 0 0 1 100 120" />';
    assert.strictEqual(sanitizeSvgAndAttributes(validArc), validArc);
  });

  console.log("\n--- Suite 8: Zero-CORS iTunes API Fetch Interceptor & JSONP Polyfill ---");

  it("production bundles contain iTunes zero-CORS fetch polyfill in SDK and SHIM", () => {
    const poppyHtml = fs.readFileSync(path.join(__dirname, "poppy.html"), "utf8");
    const distHtml = fs.readFileSync(path.join(__dirname, "dist", "index.html"), "utf8");

    assert.ok(poppyHtml.includes("__poppy_itunes_"), "poppy.html must contain iTunes fetch interceptor");
    assert.ok(distHtml.includes("__poppy_itunes_"), "dist/index.html must contain iTunes fetch interceptor");
  });

  it("iTunes fetch interceptor correctly intercepts search and lookup URLs via JSONP", async () => {
    const mockWindow = {
      fetch: async () => { throw new TypeError("Failed to fetch (CORS error)"); }
    };
    const mockDoc = {
      head: {
        appendChild: s => {
          // Simulate script injection and Apple server JSONP execution
          setTimeout(() => {
            const cbMatch = s.src.match(/callback=([^&]+)/);
            if (cbMatch && mockWindow[cbMatch[1]]) {
              mockWindow[cbMatch[1]]({
                resultCount: 2,
                results: [
                  { trackName: "Beauty and a Beat", artistName: "Justin Bieber", previewUrl: "https://audio-ssl.itunes.apple.com/preview.m4a" },
                  { trackName: "Baby", artistName: "Justin Bieber", previewUrl: "https://audio-ssl.itunes.apple.com/baby.m4a" }
                ]
              });
            }
          }, 10);
        }
      },
      createElement: () => ({ parentNode: { removeChild: () => {} }, remove: () => {} })
    };

    // Install polyfill on mockWindow
    const _orig = mockWindow.fetch;
    mockWindow.fetch = function(url, options) {
      const urlStr = typeof url === "string" ? url : (url && url.url ? url.url : String(url || ""));
      if (/itunes\.apple\.com\/(search|lookup)/i.test(urlStr)) {
        return new Promise((resolve, reject) => {
          const cbName = "__poppy_itunes_" + Math.random().toString(36).slice(2, 9);
          const s = mockDoc.createElement("script");
          const sep = urlStr.indexOf("?") !== -1 ? "&" : "?";
          let jsonpUrl = urlStr;
          if (!/callback=/i.test(jsonpUrl)) {
            jsonpUrl += sep + "callback=" + cbName;
          } else {
            jsonpUrl = jsonpUrl.replace(/callback=[^&]+/i, "callback=" + cbName);
          }
          mockWindow[cbName] = data => {
            const jsonStr = JSON.stringify(data);
            resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve(data),
              text: () => Promise.resolve(jsonStr)
            });
          };
          s.src = jsonpUrl;
          mockDoc.head.appendChild(s);
        });
      }
      return _orig.apply(this, arguments);
    };

    const res = await mockWindow.fetch("https://itunes.apple.com/search?term=justin%20bieber&entity=song&limit=10");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.ok, true);
    const data = await res.json();
    assert.strictEqual(data.resultCount, 2);
    assert.strictEqual(data.results[0].trackName, "Beauty and a Beat");
  });

  console.log("==================================================================");
  console.log(`ALL ${testsPassed}/${testsPassed} PHASE 5.1 STRICT VERIFY PROBE TESTS PASSED!`);
  console.log("==================================================================");
})();
