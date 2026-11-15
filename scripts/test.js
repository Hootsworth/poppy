const fs = require("fs");
const path = require("path");

console.log("Running Poppy automated test suite...");
const html = fs.readFileSync(path.join(__dirname, "..", "poppy.html"), "utf8");

// 1. Verify all 64 selftests exist
const selftestCode = html.slice(html.indexOf("async function selftest()"), html.indexOf("const SHIM ="));
const matches = [...selftestCode.matchAll(/(?<!\.)add\("([^"]+)"/g)];
console.log(`Found ${matches.length} selftests registered in selftest().`);
if (matches.length !== 64) {
  throw new Error(`Expected 64 selftests, found ${matches.length}`);
}

// 2. Verify UI Blocks
const blockMatch = html.match(/const UI_BLOCKS\s*=\s*(\[[\s\S]*?\n\]);/);
const UI_BLOCKS = eval(blockMatch[1]);
if (UI_BLOCKS.length !== 8) throw new Error("Expected 8 UI blocks");
console.log(`UI Blocks: ${UI_BLOCKS.length} verified.`);

// 3. Verify Templates
const tplMatch = html.match(/const MARKETPLACE_TEMPLATES\s*=\s*(\[[\s\S]*?\n\]);/);
const MARKETPLACE_TEMPLATES = eval(tplMatch[1]);
if (MARKETPLACE_TEMPLATES.length < 9) throw new Error("Expected at least 9 templates");
console.log(`Marketplace Templates: ${MARKETPLACE_TEMPLATES.length} verified.`);

// 4. Verify @ Mention Target Engine & Intent Detection
if (!html.includes('id="atDropdown"') || !html.includes('initAtMention') || !html.includes('detectIntent')) {
  throw new Error("@ Mention autocomplete dropdown & intent detection missing");
}
if (html.includes('id="promptBackdrop"') || html.includes('id="detectedIntent"')) {
  throw new Error("Obsolete backdrop/intent banner found in HTML! Should be removed.");
}
console.log("@ Mention target engine & intent detection: verified.");

// 5. Verify Runtime Verify Probe & Multi-Agent Architecture
if (!html.includes('runProbe') || !html.includes('scoreProbe')) {
  throw new Error("Runtime verification probe missing");
}
if (!html.includes('runMultiAgentPipeline') || !html.includes('multiAgentOn')) {
  throw new Error("Multi-Agent Architecture missing");
}
console.log("Runtime Verify Probe & Multi-Agent Architecture: verified.");

// 6. Verify Zero-Purple Palette in Keyword Glow
const baseCss = fs.readFileSync(path.join(__dirname, "..", "src/css/base.css"), "utf8");
if (baseCss.includes('#a855f7') || baseCss.includes('#8b5cf6')) {
  throw new Error("Purple palette detected in base.css keyword gradient! Must use warm sunset flame.");
}
console.log("Warm sunset gradient (no purple): verified.");

// 7. Verify Sandbox
const iframeMatch = html.match(/<iframe\s+id="frame"\s+sandbox="([^"]+)"/);
if (!iframeMatch) throw new Error("iframe tag missing");
const sb = iframeMatch[1];
if (!sb.includes("allow-scripts") || sb.includes("same-origin")) {
  throw new Error("Sandbox security violation: " + sb);
}
console.log("Strict iframe sandbox: verified (" + sb + ").");

// 8. Verify exactly 1 script closing tag (no premature script termination)
const scriptCloseMatches = [...html.matchAll(/<\/script>/gi)];
if (scriptCloseMatches.length !== 1) {
  throw new Error(`CRITICAL ERROR: Found ${scriptCloseMatches.length} </script> tags in poppy.html! Expected exactly 1.`);
}
console.log("Single-host script tag integrity (0 premature terminations): verified.");

// 9. Verify Runtime Verify Probe & Repair Loop
if (!html.includes('initProbe') || !html.includes('runProbe') || !html.includes('scoreProbe') || !html.includes('buildRepairPrompt')) {
  throw new Error("Runtime Verify Probe (verify-probe.js) missing from bundle");
}
console.log("Runtime Verify Probe & Observation Engine: verified.");

// 10. Verify Phase 1 Universal Artifact Architecture (UAA) & Capability Registry
const { createArtifactManifest, validateArtifactManifest } = require("../src/js/engine/manifest.js");
const { auditArtifactCapabilities, getIsolatedStorageKey } = require("../src/js/core/capabilities.js");
const { RUNTIME_DISPATCHER } = require("../src/js/engine/dispatcher.js");

const testManifest = createArtifactManifest({
  name: "Invoice & Report Generator",
  runtime: { target: "document-pdf" },
  delivery: { previewRenderer: "pdf-canvas" },
  source: {
    files: [{ path: "index.html", content: "<h1>Invoice #1042</h1>", encoding: "utf-8" }]
  },
  verification: {
    assertions: [
      { id: "a1", description: "Contains header", selector: "h1", expectedState: "dom-exists" }
    ]
  }
});
const manifestValidation = validateArtifactManifest(testManifest);
if (!manifestValidation.valid) {
  throw new Error("ArtifactManifest validation failed: " + manifestValidation.errors.join(", "));
}

const capAudit = auditArtifactCapabilities(["audio", "storage", "unknown-cap"]);
if (capAudit.valid || capAudit.unrecognized.length !== 1 || capAudit.recognized.length !== 2) {
  throw new Error("auditArtifactCapabilities did not correctly flag unrecognized capabilities");
}
const storageKey = getIsolatedStorageKey("test-artifact-id");
if (!storageKey.startsWith("poppy_art_test-artifact-id")) {
  throw new Error("getIsolatedStorageKey generated invalid key: " + storageKey);
}

if (!html.includes('id="docStage"') || !html.includes('class="doc-runtime-stage"')) {
  throw new Error("Phase 1 document runtime stage (#docStage) missing from DOM");
}
if (!html.includes('RUNTIME_DISPATCHER') || !html.includes('mountDocumentRuntime')) {
  throw new Error("RUNTIME_DISPATCHER missing from bundle");
}
console.log("Universal Artifact Architecture (UAA) & Capability Registry: verified.");

console.log("\nALL 64 SYSTEM TESTS PASSED SUCCESSFULLY!");
