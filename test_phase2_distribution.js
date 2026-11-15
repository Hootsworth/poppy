const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

console.log("==================================================================");
console.log("POPPY PHASE 2: EXTERNAL DISTRIBUTION TEST SUITE (POPPY 3.0)");
console.log("Manifest V3, CLI Packaging, Permission Analyser, GitHub Repos");
console.log("==================================================================\n");

const {
  analyzeExtensionPermissions,
  extractInlineScripts,
  generateExtensionProject,
  generateCliProject,
  generateGitHubRepo,
  validateProjectBuild
} = require("./src/js/engine/packager.js");

const coreCode = fs.readFileSync("./src/js/core/core-engine.js", "utf8");
// Extract createZip and crc32 from core-engine.js for node testing
const createZipFn = new Function(`
  ${coreCode.slice(coreCode.indexOf("const crcTable"), coreCode.indexOf("async function parseZip"))}
  return createZip;
`)();

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
  // TEST SUITE 1: Manifest V3 Extension Generation & Security
  // -------------------------------------------------------------
  console.log("--- Suite 1: Manifest V3 Extension Generation & Security ---");

  await it("extractInlineScripts separates inline script tags into external popup.js", () => {
    const rawHtml = `<!DOCTYPE html>
<html>
<head><title>Test Popup</title></head>
<body>
  <h1>Counter</h1>
  <button id="inc">Add</button>
  <script>
    document.getElementById("inc").onclick = () => console.log("clicked");
  </script>
</body>
</html>`;

    const { html, js } = extractInlineScripts(rawHtml);
    assert.ok(!html.includes('document.getElementById("inc")'), "Inline script content must be stripped from HTML");
    assert.ok(html.includes('<script src="popup.js"></script>'), "External popup.js script tag must be injected");
    assert.ok(js.includes('document.getElementById("inc").onclick'), "Script content must be preserved in js");
  });

  await it("generateExtensionProject builds complete, valid MV3 project tree", () => {
    const manifest = {
      name: "Tab Highlighter Studio",
      description: "Colorizes web links and highlights keywords",
      version: "1.2.0"
    };
    const sourceFiles = {
      "index.html": "<h1>Tab Highlighter</h1><script>console.log('init');</script>",
      "style.css": "body { background: #111; color: #eee; }"
    };

    const proj = generateExtensionProject(manifest, sourceFiles);
    assert.strictEqual(proj.slug, "tab-highlighter-studio");
    assert.ok(proj.files["manifest.json"], "manifest.json must exist");
    assert.ok(proj.files["popup.html"], "popup.html must exist");
    assert.ok(proj.files["popup.js"], "popup.js must exist");
    assert.ok(proj.files["background.js"], "background.js must exist");
    assert.ok(proj.files["README.md"], "README.md must exist");
    assert.ok(proj.files["icons/icon-16.png"], "icons/icon-16.png must exist");

    const m = JSON.parse(proj.files["manifest.json"]);
    assert.strictEqual(m.manifest_version, 3);
    assert.strictEqual(m.action.default_popup, "popup.html");
    assert.strictEqual(m.background.service_worker, "background.js");
    assert.strictEqual(m.background.type, "module");

    // Validate project build
    const validation = validateProjectBuild(proj.files, "extension");
    assert.strictEqual(validation.valid, true, "Generated extension must pass validation: " + validation.errors.join(", "));
  });

  await it("analyzeExtensionPermissions accurately grades permission risk tiers", () => {
    // Low risk
    const safeManifest = {
      manifest_version: 3,
      permissions: ["storage", "activeTab", "alarms"]
    };
    const safeAudit = analyzeExtensionPermissions(safeManifest);
    assert.strictEqual(safeAudit.valid, true);
    assert.strictEqual(safeAudit.riskScore, "low");

    // High risk broad hosts
    const broadManifest = {
      manifest_version: 3,
      permissions: ["storage", "scripting"],
      host_permissions: ["<all_urls>"]
    };
    const broadAudit = analyzeExtensionPermissions(broadManifest);
    assert.strictEqual(broadAudit.riskScore, "high");
    assert.ok(broadAudit.warnings.some(w => w.includes("<all_urls>")));

    // Deprecated MV2 fields
    const mv2Manifest = {
      manifest_version: 2,
      browser_action: { default_popup: "popup.html" },
      background: { scripts: ["bg.js"] }
    };
    const mv2Audit = analyzeExtensionPermissions(mv2Manifest);
    assert.strictEqual(mv2Audit.valid, false);
    assert.ok(mv2Audit.errors.some(e => e.includes("manifest_version: 3")));
    assert.ok(mv2Audit.errors.some(e => e.includes("browser_action")));
    assert.ok(mv2Audit.errors.some(e => e.includes("background.scripts")));
  });

  // -------------------------------------------------------------
  // TEST SUITE 2: CLI Project Generation (Node.js & Python)
  // -------------------------------------------------------------
  console.log("\n--- Suite 2: CLI Project Generation (Node.js & Python) ---");

  await it("generateCliProject creates executable Node.js CLI project", () => {
    const manifest = {
      name: "Data Transformer CLI",
      description: "Processes CSV records into normalized JSON"
    };

    const cli = generateCliProject(manifest, "node");
    assert.strictEqual(cli.slug, "data-transformer-cli");
    assert.ok(cli.files["package.json"]);
    assert.ok(cli.files["bin/cli.js"]);
    assert.ok(cli.files["README.md"]);

    const pkg = JSON.parse(cli.files["package.json"]);
    assert.strictEqual(pkg.type, "module");
    assert.ok(pkg.bin["data-transformer-cli"]);
    assert.strictEqual(pkg.bin["data-transformer-cli"], "./bin/cli.js");

    assert.ok(cli.files["bin/cli.js"].startsWith("#!/usr/bin/env node"));

    const val = validateProjectBuild(cli.files, "cli-node");
    assert.strictEqual(val.valid, true, "Node CLI project must pass validation");

    // Syntax check on cli.js as an ES Module
    require("child_process").execSync("node --input-type=module --check", {
      input: cli.files["bin/cli.js"].replace(/^#![^\n]+/, "")
    });
  });

  await it("generateCliProject creates clean Python 3 CLI project", () => {
    const manifest = {
      name: "Log Auditing Tool",
      description: "Scans log files for security anomalies"
    };

    const pyCli = generateCliProject(manifest, "python");
    assert.strictEqual(pyCli.slug, "log-auditing-tool");
    assert.ok(pyCli.files["cli.py"]);
    assert.ok(pyCli.files["pyproject.toml"]);
    assert.ok(pyCli.files["requirements.txt"]);
    assert.ok(pyCli.files["README.md"]);

    assert.ok(pyCli.files["cli.py"].startsWith("#!/usr/bin/env python3"));
    assert.ok(pyCli.files["pyproject.toml"].includes('name = "log-auditing-tool"'));

    const val = validateProjectBuild(pyCli.files, "cli-python");
    assert.strictEqual(val.valid, true, "Python CLI project must pass validation");
  });

  // -------------------------------------------------------------
  // TEST SUITE 3: GitHub Repository Scaffolding & CI
  // -------------------------------------------------------------
  console.log("\n--- Suite 3: GitHub Repository Scaffolding & CI ---");

  await it("generateGitHubRepo creates full git repo structure with CI workflow", () => {
    const manifest = {
      name: "Offline Note Vault",
      description: "Encrypted note taking studio"
    };
    const files = {
      "index.html": "<h1>Note Vault</h1>",
      "app.js": "console.log('Vault ready');"
    };

    const repo = generateGitHubRepo(manifest, files, "web");
    assert.ok(repo.files[".gitignore"]);
    assert.ok(repo.files[".github/workflows/ci.yml"]);
    assert.ok(repo.files["LICENSE"]);
    assert.ok(repo.files["README.md"]);
    assert.ok(repo.files["index.html"]);

    assert.ok(repo.files[".github/workflows/ci.yml"].includes("name: CI"));
    assert.ok(repo.files["LICENSE"].includes("MIT License"));
    assert.ok(repo.files[".gitignore"].includes("node_modules/"));
  });

  // -------------------------------------------------------------
  // TEST SUITE 4: ZIP Packaging & Archive Integrity
  // -------------------------------------------------------------
  console.log("\n--- Suite 4: ZIP Packaging & Archive Integrity ---");

  await it("createZip compiles valid PK-header zip buffers for distribution", async () => {
    const extProj = generateExtensionProject({ name: "Mini Utility" }, { "index.html": "<p>Hello</p>" });
    const zipFiles = Object.entries(extProj.files).map(([name, content]) => ({
      name,
      data: new TextEncoder().encode(content)
    }));

    const zipBuffer = await createZipFn(zipFiles);
    assert.ok(zipBuffer instanceof Uint8Array, "Result must be a Uint8Array");
    assert.ok(zipBuffer.length > 100, "ZIP buffer must be non-empty");

    // Standard ZIP signature is 0x50, 0x4B, 0x03, 0x04 ('PK\x03\x04')
    assert.strictEqual(zipBuffer[0], 0x50, "ZIP byte 0 must be 'P'");
    assert.strictEqual(zipBuffer[1], 0x4B, "ZIP byte 1 must be 'K'");
    assert.strictEqual(zipBuffer[2], 0x03, "ZIP byte 2 must be 0x03");
    assert.strictEqual(zipBuffer[3], 0x04, "ZIP byte 3 must be 0x04");
  });

  // -------------------------------------------------------------
  // TEST SUITE 5: UI & Bundle Conformance
  // -------------------------------------------------------------
  console.log("\n--- Suite 5: UI & Production Bundle Conformance ---");

  await it("poppy.html contains all Phase 2 dialog elements and zero emojis", () => {
    const html = fs.readFileSync("poppy.html", "utf8");

    // All export dialog buttons exist
    assert.ok(html.includes('id="exportDlg"'), "exportDlg exists");
    assert.ok(html.includes('id="btnExpSingleHtml"'), "btnExpSingleHtml exists");
    assert.ok(html.includes('id="btnExpWebZip"'), "btnExpWebZip exists");
    assert.ok(html.includes('id="btnExpExtension"'), "btnExpExtension exists");
    assert.ok(html.includes('id="btnExpCliNode"'), "btnExpCliNode exists");
    assert.ok(html.includes('id="btnExpCliPy"'), "btnExpCliPy exists");
    assert.ok(html.includes('id="btnExpGithub"'), "btnExpGithub exists");

    // JS functions bundled
    assert.ok(html.includes("generateExtensionProject"), "generateExtensionProject bundled");
    assert.ok(html.includes("analyzeExtensionPermissions"), "analyzeExtensionPermissions bundled");
    assert.ok(html.includes("generateCliProject"), "generateCliProject bundled");
    assert.ok(html.includes("generateGitHubRepo"), "generateGitHubRepo bundled");

    // Zero emojis check
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
    assert.strictEqual([...html.matchAll(emojiRegex)].length, 0, "Zero emojis in poppy.html");

    // Exactly 1 closing script tag
    const scriptTags = [...html.matchAll(/<\/script>/gi)];
    assert.strictEqual(scriptTags.length, 1, "Exactly 1 closing script tag in bundle");
  });

  console.log("\n==================================================================");
  console.log(`ALL ${passedTests}/${totalTests} PHASE 2 DISTRIBUTION TESTS PASSED!`);
  console.log("==================================================================");
}

runAll().catch(err => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
