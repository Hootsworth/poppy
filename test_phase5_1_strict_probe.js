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
  auditPerformanceBudget
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

    assert.ok(distHtml.includes("auditContrast"), "dist/index.html must contain auditContrast");

    const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
    assert.strictEqual([...poppyHtml.matchAll(emojiRegex)].length, 0, "Zero emojis in poppy.html");
    assert.strictEqual([...distHtml.matchAll(emojiRegex)].length, 0, "Zero emojis in dist/index.html");

    const scriptTags = [...poppyHtml.matchAll(/<\/script>/gi)];
    assert.strictEqual(scriptTags.length, 1, "Exactly 1 closing script tag in production bundle");
  });

  console.log("==================================================================");
  console.log(`ALL ${testsPassed}/${testsPassed} PHASE 5.1 STRICT VERIFY PROBE TESTS PASSED!`);
  console.log("==================================================================");
})();
