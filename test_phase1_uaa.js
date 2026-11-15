const assert = require("assert");
const vm = require("vm");
const fs = require("fs");
const path = require("path");

console.log("==================================================================");
console.log("POPPY PHASE 1: COMPREHENSIVE VERIFICATION & TEST SUITE");
console.log("Universal Artifact Architecture (UAA), Capability Registry & Dispatcher");
console.log("==================================================================\n");

// 1. Load Modules
const { createArtifactManifest, validateArtifactManifest, filesDictToArray, filesArrayToDict } = require("./src/js/engine/manifest.js");
const { CAPABILITY_DEFINITIONS, auditArtifactCapabilities, getIsolatedStorageKey } = require("./src/js/core/capabilities.js");
const { RUNTIME_DISPATCHER } = require("./src/js/engine/dispatcher.js");
const { initProbe, runProbe, scoreProbe, buildRepairPrompt } = require("./src/js/engine/verify-probe.js");

let totalTests = 0;
let passedTests = 0;

async function it(desc, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`PASS [${totalTests}]: ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`FAIL [${totalTests}]: ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

async function runAll() {

// -------------------------------------------------------------
// TEST SUITE 1: ArtifactManifest v2.0 Specification & Schema
// -------------------------------------------------------------
console.log("--- Suite 1: ArtifactManifest v2.0 Schema & Utilities ---");

  await it("createArtifactManifest creates default valid schema-compliant manifest", () => {
  const m = createArtifactManifest({ name: "Test App" });
  assert.strictEqual(m.manifestVersion, "2.0");
  assert.strictEqual(m.name, "Test App");
  assert.strictEqual(m.runtime.target, "browser-app");
  assert.strictEqual(m.delivery.previewRenderer, "iframe");
  assert.ok(Array.isArray(m.source.files));
  assert.ok(Array.isArray(m.verification.assertions));
  
  const val = validateArtifactManifest(m);
  assert.strictEqual(val.valid, true, "Manifest should be valid: " + val.errors.join(", "));
});

  await it("validateArtifactManifest rejects missing or invalid required fields", () => {
  assert.strictEqual(validateArtifactManifest(null).valid, false);
  assert.strictEqual(validateArtifactManifest({}).valid, false);
  
  // Invalid version
  const badVer = createArtifactManifest();
  badVer.manifestVersion = "1.0";
  assert.strictEqual(validateArtifactManifest(badVer).valid, false);

  // Invalid runtime target
  const badTarget = createArtifactManifest();
  badTarget.runtime.target = "unsupported-target";
  const valTarget = validateArtifactManifest(badTarget);
  assert.strictEqual(valTarget.valid, false);
  assert.ok(valTarget.errors.some(e => e.includes("runtime.target")));

  // Invalid delivery renderer
  const badRenderer = createArtifactManifest();
  badRenderer.delivery.previewRenderer = "hologram";
  const valRenderer = validateArtifactManifest(badRenderer);
  assert.strictEqual(valRenderer.valid, false);
  assert.ok(valRenderer.errors.some(e => e.includes("delivery.previewRenderer")));

  // Invalid files
  const badFiles = createArtifactManifest();
  badFiles.source.files = [{ path: "app.js" }]; // missing content
  assert.strictEqual(validateArtifactManifest(badFiles).valid, false);
});

  await it("validateArtifactManifest accepts all recognized polymorphic runtime targets", () => {
  const targets = ["browser-app", "document-pdf", "data-workbench", "cli-script", "extension-mv3", "headless-worker"];
  targets.forEach(t => {
    const m = createArtifactManifest({
      name: "Polymorphic App: " + t,
      runtime: { target: t },
      delivery: { previewRenderer: t === "document-pdf" ? "pdf-canvas" : "iframe" }
    });
    const val = validateArtifactManifest(m);
    assert.strictEqual(val.valid, true, `Target ${t} should be valid: ${val.errors.join(", ")}`);
  });
});

  await it("filesDictToArray and filesArrayToDict convert bidirectionally without loss", () => {
  const original = {
    "index.html": "<!DOCTYPE html><html><body><h1>Hello</h1></body></html>",
    "style.css": "body { background: #000; color: #fff; }",
    "app.js": "console.log('App initialized');"
  };

  const arr = filesDictToArray(original);
  assert.strictEqual(arr.length, 3);
  assert.strictEqual(arr[0].path, "index.html");
  assert.strictEqual(arr[0].content, original["index.html"]);

  const back = filesArrayToDict(arr);
  assert.deepStrictEqual(back, original);
});

// -------------------------------------------------------------
// TEST SUITE 2: Capability Registry & Storage Isolation
// -------------------------------------------------------------
console.log("\n--- Suite 2: Capability Registry & Storage Isolation ---");

  await it("Capability registry defines all standard device & hardware capabilities", () => {
  const requiredCaps = ["camera", "mic", "audio", "canvas", "webgl", "midi", "storage"];
  requiredCaps.forEach(c => {
    assert.ok(CAPABILITY_DEFINITIONS[c], `Capability ${c} must be defined`);
    assert.ok(typeof CAPABILITY_DEFINITIONS[c].name === "string");
    assert.ok(typeof CAPABILITY_DEFINITIONS[c].api === "string");
  });
});

  await it("auditArtifactCapabilities correctly segregates recognized vs unrecognized capabilities", () => {
  const auditAllValid = auditArtifactCapabilities(["camera", "mic", "storage"]);
  assert.strictEqual(auditAllValid.valid, true);
  assert.strictEqual(auditAllValid.recognized.length, 3);
  assert.strictEqual(auditAllValid.unrecognized.length, 0);

  const auditMixed = auditArtifactCapabilities(["audio", "quantum-accelerator", "midi", "direct-root-exec"]);
  assert.strictEqual(auditMixed.valid, false);
  assert.strictEqual(auditMixed.recognized.length, 2);
  assert.deepStrictEqual(auditMixed.unrecognized, ["quantum-accelerator", "direct-root-exec"]);
});

  await it("getIsolatedStorageKey generates strictly isolated and sanitized keys", () => {
  const key1 = getIsolatedStorageKey("user-site-101");
  assert.strictEqual(key1, "poppy_art_user-site-101");

  // Sanitizes dangerous path or script injection characters
  const key2 = getIsolatedStorageKey("../root/admin'; DROP TABLE;");
  assert.strictEqual(key2.includes(".."), false);
  assert.strictEqual(key2.includes(";"), false);
  assert.strictEqual(key2.includes("/"), false);
  assert.ok(key2.startsWith("poppy_art_"));

  // Empty / null fallback
  const key3 = getIsolatedStorageKey(null);
  assert.ok(key3.startsWith("poppy_art_anon_"));
});

// -------------------------------------------------------------
// TEST SUITE 3: Polymorphic Runtime Dispatcher
// -------------------------------------------------------------
console.log("\n--- Suite 3: Polymorphic Runtime Dispatcher ---");

  await it("RUNTIME_DISPATCHER routes browser-app to standard iframe viewport", () => {
  // Setup minimal DOM mock
  const dom = {
    elements: {
      "#frame": { style: { display: "none" }, srcdoc: "" },
      "#docStage": { style: { display: "none" }, innerHTML: "" },
      "#stage": { append: el => { dom.elements["#" + el.id] = el; } }
    },
    title: "",
    querySelector(sel) { return this.elements[sel] || null; },
    createElement(tag) { return { tagName: tag, style: {}, className: "", id: "", innerHTML: "" }; }
  };
  global.document = dom;

  const appManifest = createArtifactManifest({
    name: "Interactive Task Board",
    runtime: { target: "browser-app", entrypoint: "index.html" },
    delivery: { previewRenderer: "iframe" },
    source: { files: [{ path: "index.html", content: "<div>Task Board Active</div>" }] }
  });

  const dispatched = RUNTIME_DISPATCHER.dispatch(appManifest);
  assert.strictEqual(dispatched, true);
  assert.strictEqual(RUNTIME_DISPATCHER.activeRuntime, "browser-app");
  assert.strictEqual(dom.elements["#frame"].style.display, "block");
  assert.strictEqual(dom.elements["#docStage"].style.display, "none");
  assert.strictEqual(dom.elements["#frame"].srcdoc, "<div>Task Board Active</div>");
});

  await it("RUNTIME_DISPATCHER routes document-pdf to dedicated vector print viewport", () => {
  const frameEl = { style: { display: "block" }, srcdoc: "" };
  let docStageEl = null;

  const dom = {
    elements: {
      "#frame": frameEl,
      "#stage": {
        append: el => {
          docStageEl = el;
          dom.elements["#docStage"] = el;
        }
      }
    },
    title: "",
    querySelector(sel) { return this.elements[sel] || null; },
    createElement(tag) {
      const el = {
        tagName: tag,
        style: {},
        className: "",
        id: "",
        innerHTML: "",
        querySelector(subSel) {
          if (subSel === "#docFrame") return this._docFrame || (this._docFrame = { srcdoc: "" });
          return null;
        }
      };
      return el;
    }
  };
  global.document = dom;

  const docManifest = createArtifactManifest({
    name: "Consulting Invoice #2026-A",
    runtime: { target: "document-pdf", entrypoint: "index.html" },
    delivery: { previewRenderer: "pdf-canvas" },
    source: { files: [{ path: "index.html", content: "<h1>INVOICE</h1><p>Total: $1,250.00</p>" }] }
  });

  const dispatched = RUNTIME_DISPATCHER.dispatch(docManifest);
  assert.strictEqual(dispatched, true);
  assert.strictEqual(RUNTIME_DISPATCHER.activeRuntime, "document-pdf");
  assert.strictEqual(frameEl.style.display, "none", "Standard iframe should be hidden");
  assert.ok(docStageEl, "#docStage should have been created");
  assert.strictEqual(docStageEl.style.display, "flex", "Document stage should be visible");
  assert.ok(docStageEl.innerHTML.includes("DOCUMENT RUNTIME"));
  assert.ok(docStageEl.innerHTML.includes("Consulting Invoice #2026-A"));
  assert.ok(docStageEl.innerHTML.includes("Print / Save PDF"));
});

// -------------------------------------------------------------
// TEST SUITE 4: Architect Assertions & Verify Probe
// -------------------------------------------------------------
console.log("\n--- Suite 4: Architect Assertions & Verify Probe ---");

  await it("Verify Probe executes and passes valid assertions", async () => {
  // Mock browser DOM for runProbe
  global.Event = class Event { constructor(type, opts) { this.type = type; this.bubbles = opts?.bubbles; } };
  const elements = [
    { tagName: "h1", id: "header", className: "", innerText: "Dashboard", isConnected: true, getBoundingClientRect: () => ({ width: 200, height: 40 }), disabled: false, dispatchEvent: () => {} },
    {
      tagName: "button",
      id: "calcBtn",
      className: "",
      innerText: "Calculate",
      isConnected: true,
      getBoundingClientRect: () => ({ width: 100, height: 30 }),
      disabled: false,
      dispatchEvent: () => {},
      click() {
        document.body.innerHTML += "<div class='result'>42</div>";
      }
    }
  ];

  global.window = {
    __pp_probe: { errors: [] },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {}
  };
  global.getComputedStyle = () => ({ visibility: "visible", display: "block" });
  global.document = {
    body: { innerText: "Dashboard content with lots of rich application data and controls.", innerHTML: "<div>Dashboard</div>" },
    documentElement: { scrollWidth: 390 },
    querySelectorAll: sel => {
      if (sel.includes("canvas")) return [];
      if (sel.includes("button")) return [elements[1]];
      if (sel.includes("input")) return [];
      return elements;
    },
    querySelector: sel => {
      if (sel === "#header") return elements[0];
      if (sel === "#calcBtn") return elements[1];
      if (sel.includes("button")) return elements[1];
      if (sel.includes("canvas")) return null;
      return null;
    }
  };

  const assertions = [
    { id: "a1", description: "Header exists in DOM", selector: "#header", expectedState: "dom-exists" },
    { id: "a2", description: "Calculate button responds to click", selector: "#calcBtn", action: "click", expectedState: "no-unhandled-errors" }
  ];

  const probeRes = await runProbe({ settle: 10, assertions, maxButtons: 2 });
  assert.strictEqual(probeRes.assertionResults.length, 2);
  assert.strictEqual(probeRes.assertionResults[0].passed, true);
  assert.strictEqual(probeRes.assertionResults[1].passed, true);

  const score = scoreProbe(probeRes);
  assert.strictEqual(score.assertionsPassed, true);
  assert.strictEqual(score.pass, true);

  const repairPrompt = buildRepairPrompt(probeRes);
  assert.strictEqual(repairPrompt, "", "Passing assertions should produce no repair prompt");
});

  await it("Verify Probe fails and generates diagnostic repair prompt when assertions fail", async () => {
  global.window = {
    __pp_probe: { errors: [] },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {}
  };
  global.document = {
    body: { innerText: "Minimal text here that renders fine.", innerHTML: "<div>Minimal</div>" },
    documentElement: { scrollWidth: 390 },
    querySelectorAll: () => [],
    querySelector: () => null // Missing required element
  };

  const failingAssertions = [
    { id: "a_missing", description: "Tax calculation table must render", selector: "#taxTable", expectedState: "dom-exists" }
  ];

  const probeRes = await runProbe({ settle: 10, assertions: failingAssertions, maxButtons: 0 });
  assert.strictEqual(probeRes.assertionResults.length, 1);
  assert.strictEqual(probeRes.assertionResults[0].passed, false);
  assert.ok(probeRes.assertionResults[0].error.includes("#taxTable not found"));

  const score = scoreProbe(probeRes);
  assert.strictEqual(score.assertionsPassed, false);
  assert.strictEqual(score.pass, false, "Overall probe must fail when assertions fail");

  const repairPrompt = buildRepairPrompt(probeRes);
  assert.ok(repairPrompt.includes("Failed Architectural Assertions:"));
  assert.ok(repairPrompt.includes("Tax calculation table must render"));
});

// -------------------------------------------------------------
// TEST SUITE 5: Production Bundle & Asset Verification
// -------------------------------------------------------------
console.log("\n--- Suite 5: Production Bundle & Distribution Artifacts ---");

  await it("poppy.html and dist/index.html contain complete Phase 1 code with 0 emojis and 1 script tag", () => {
    const poppyHtml = fs.readFileSync("poppy.html", "utf8");
    const distHtml = fs.readFileSync("dist/index.html", "utf8");

    assert.strictEqual(poppyHtml, distHtml, "dist/index.html must match poppy.html");

    // Single script tag
    const scriptTags = [...poppyHtml.matchAll(/<\/script>/gi)];
    assert.strictEqual(scriptTags.length, 1, "Must contain exactly 1 closing script tag");

    // Zero emojis
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
    assert.strictEqual([...poppyHtml.matchAll(emojiRegex)].length, 0, "Must contain zero emojis");

    // Phase 1 UAA markers
    assert.ok(poppyHtml.includes("createArtifactManifest"), "createArtifactManifest must be bundled");
    assert.ok(poppyHtml.includes("auditArtifactCapabilities"), "auditArtifactCapabilities must be bundled");
    assert.ok(poppyHtml.includes("RUNTIME_DISPATCHER"), "RUNTIME_DISPATCHER must be bundled");
    assert.ok(poppyHtml.includes('id="docStage"'), "#docStage must be present in HTML");
    assert.ok(poppyHtml.includes(".doc-runtime-stage"), "document.css must be bundled in style tag");
  });

  console.log("\n==================================================================");
  console.log(`ALL ${passedTests}/${totalTests} PHASE 1 COMPREHENSIVE VERIFICATION TESTS PASSED!`);
  console.log("==================================================================");
}

runAll().catch(err => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
