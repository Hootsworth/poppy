const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

console.log("==================================================================");
console.log("POPPY PHASE 2: DEEP END-TO-END VERIFICATION & EXECUTION SUITE");
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
// Extract createZip and parseZip from core-engine.js
const { createZip, parseZip } = new Function(`
  ${coreCode.slice(coreCode.indexOf("const crcTable"), coreCode.indexOf("/* ===== Phase 4: hidden check"))}
  return { createZip, parseZip };
`)();

let step = 0;
function test(name, fn) {
  step++;
  process.stdout.write(`[Step ${step}] ${name}... `);
  try {
    fn();
    console.log("PASSED");
  } catch (err) {
    console.log("FAILED");
    console.error(err);
    process.exit(1);
  }
}

async function testAsync(name, fn) {
  step++;
  process.stdout.write(`[Step ${step}] ${name}... `);
  try {
    await fn();
    console.log("PASSED");
  } catch (err) {
    console.log("FAILED");
    console.error(err);
    process.exit(1);
  }
}

async function runVerification() {
  // 1. Live Execution of Generated Node.js CLI Tool
  await testAsync("Live runtime execution of generated Node.js CLI tool", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "poppy-cli-node-"));
    try {
      const manifest = {
        name: "Telemetry Scanner",
        description: "Scans network ports and outputs latency telemetry"
      };
      const proj = generateCliProject(manifest, "node");

      // Write files
      for (const [relPath, content] of Object.entries(proj.files)) {
        const fullPath = path.join(tmpDir, relPath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content, "utf8");
      }

      const cliPath = path.join(tmpDir, "bin", "cli.js");
      fs.chmodSync(cliPath, 0o755);

      // 1. Test --help
      const helpOutput = execSync(`node "${cliPath}" --help`, { encoding: "utf8" });
      assert.ok(helpOutput.includes("USAGE:"), "Must display usage documentation");
      assert.ok(helpOutput.includes("Telemetry Scanner"), "Must display project name");
      assert.ok(helpOutput.includes("--input"), "Must list input option");

      // 2. Test status command
      const statusOutput = execSync(`node "${cliPath}" status`, { encoding: "utf8" });
      const statusJson = JSON.parse(statusOutput);
      assert.strictEqual(statusJson.name, "Telemetry Scanner");
      assert.strictEqual(statusJson.status, "ready");

      // 3. Test run command
      const runOutput = execSync(`node "${cliPath}" run --input test-data.json --output out.json`, { encoding: "utf8" });
      assert.ok(runOutput.includes("Starting execution..."), "Must report start of run");
      assert.ok(runOutput.includes("test-data.json"), "Must log input path");
      assert.ok(runOutput.includes("Completed successfully."), "Must report completion");

      // 4. Test error handling on bad command
      let threw = false;
      try {
        execSync(`node "${cliPath}" invalidCommand`, { stdio: "pipe" });
      } catch (err) {
        threw = true;
        assert.strictEqual(err.status, 1, "Must exit with status code 1");
      }
      assert.ok(threw, "Invalid command must fail with non-zero exit code");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // 2. Live Execution of Generated Python CLI Tool
  await testAsync("Live runtime execution of generated Python 3 CLI tool", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "poppy-cli-py-"));
    try {
      const manifest = {
        name: "Audit Pipeline",
        description: "Validates security compliance across datasets"
      };
      const proj = generateCliProject(manifest, "python");

      for (const [relPath, content] of Object.entries(proj.files)) {
        const fullPath = path.join(tmpDir, relPath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content, "utf8");
      }

      const cliPath = path.join(tmpDir, "cli.py");
      fs.chmodSync(cliPath, 0o755);

      // 1. Test --help
      const helpOutput = execSync(`python3 "${cliPath}" --help`, { encoding: "utf8" });
      assert.ok(helpOutput.includes("usage:"), "Python argparse must output usage");
      assert.ok(helpOutput.includes("Available commands"), "Must list subparsers");

      // 2. Test status command
      const statusOutput = execSync(`python3 "${cliPath}" status`, { encoding: "utf8" });
      const statusJson = JSON.parse(statusOutput);
      assert.strictEqual(statusJson.name, "Audit Pipeline");
      assert.strictEqual(statusJson.status, "ready");

      // 3. Test run command
      const runOutput = execSync(`python3 "${cliPath}" run --input dataset.csv`, { encoding: "utf8" });
      assert.ok(runOutput.includes("Starting execution..."));
      assert.ok(runOutput.includes("dataset.csv"));
      assert.ok(runOutput.includes("Task completed successfully."));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // 3. Manifest V3 Extension Script & CSP Hygiene
  test("Manifest V3 inline script extraction & CSP hygiene", () => {
    const complexHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Complex Popup</title>
  <style>body { font-family: sans-serif; }</style>
  <script>
    const state = { count: 0 };
  </script>
</head>
<body>
  <div id="app">
    <button id="btn">Click</button>
  </div>
  <script>
    document.getElementById("btn").addEventListener("click", () => state.count++);
  </script>
</body>
</html>`;

    const { html, js } = extractInlineScripts(complexHtml);

    // Guarantee ZERO inline script tags
    const inlineMatches = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi)];
    assert.strictEqual(inlineMatches.length, 0, "No inline script tags allowed in MV3 HTML");

    // Guarantee external popup.js linked
    assert.ok(html.includes('<script src="popup.js"></script>'), "Must link external popup.js");

    // Guarantee extracted script contains all blocks
    assert.ok(js.includes("const state = { count: 0 };"));
    assert.ok(js.includes('state.count++'));
  });

  // 4. Manifest V3 Extension Generation & Manifest Schema Conformance
  test("Extension generator produces valid Manifest V3 schema & files", () => {
    const manifest = {
      name: "Smart Page Annotator",
      description: "Draws vector notes over any web article",
      version: "2.1.0",
      security: { hardware: ["audio"] }
    };
    const sourceFiles = {
      "index.html": "<div id='toolbar'>Annotator</div><script>console.log('active');</script>",
      "style.css": ".toolbar { background: red; }"
    };

    const proj = generateExtensionProject(manifest, sourceFiles);
    const m = JSON.parse(proj.files["manifest.json"]);

    assert.strictEqual(m.manifest_version, 3);
    assert.strictEqual(m.name, "Smart Page Annotator");
    assert.strictEqual(m.version, "2.1.0");
    assert.strictEqual(m.action.default_popup, "popup.html");
    assert.strictEqual(m.background.service_worker, "background.js");
    assert.strictEqual(m.background.type, "module");

    // Icons existence
    assert.ok(m.icons["16"] && proj.files[m.icons["16"]]);
    assert.ok(m.icons["48"] && proj.files[m.icons["48"]]);
    assert.ok(m.icons["128"] && proj.files[m.icons["128"]]);

    // Validation engine test
    const val = validateProjectBuild(proj.files, "extension");
    assert.strictEqual(val.valid, true, "Project validation must succeed: " + val.errors.join(", "));
  });

  // 5. Extension Permission Analyser Comprehensive Audit
  test("Permission Analyser categorizes security tiers accurately", () => {
    // 1. Safe permissions
    const safe = analyzeExtensionPermissions({
      manifest_version: 3,
      permissions: ["storage", "alarms", "contextMenus", "notifications", "activeTab"]
    });
    assert.strictEqual(safe.valid, true);
    assert.strictEqual(safe.riskScore, "low");
    assert.strictEqual(safe.warnings.length, 0);

    // 2. Medium risk permissions
    const medium = analyzeExtensionPermissions({
      manifest_version: 3,
      permissions: ["storage", "scripting", "tabs"]
    });
    assert.strictEqual(medium.valid, true);
    assert.strictEqual(medium.riskScore, "medium");

    // 3. High risk broad wildcard hosts
    const highHosts = analyzeExtensionPermissions({
      manifest_version: 3,
      permissions: ["storage"],
      host_permissions: ["<all_urls>"]
    });
    assert.strictEqual(highHosts.valid, true);
    assert.strictEqual(highHosts.riskScore, "high");
    assert.ok(highHosts.warnings.some(w => w.includes("triggers intense Chrome Web Store review")));

    // 4. Invalid MV2 keys flagged as errors
    const badKeys = analyzeExtensionPermissions({
      manifest_version: 2,
      browser_action: { default_title: "Hello" },
      background: { scripts: ["worker.js"] }
    });
    assert.strictEqual(badKeys.valid, false);
    assert.strictEqual(badKeys.errors.length, 3);
  });

  // 6. Lossless ZIP Binary Encoding and Roundtrip Decoding
  await testAsync("ZIP binary encoding and lossless decompression roundtrip", async () => {
    const testFiles = {
      "manifest.json": '{"manifest_version": 3, "name": "ZipTest"}',
      "popup.html": "<!DOCTYPE html><html><body>Test</body></html>",
      "src/engine.js": "export function run() { return 42; }",
      "docs/README.md": "# Readme Content\nLine 2\nLine 3"
    };

    const enc = new TextEncoder();
    const zipInput = Object.entries(testFiles).map(([name, text]) => ({
      name,
      data: enc.encode(text)
    }));

    // Compress
    const zipBytes = await createZip(zipInput);
    assert.ok(zipBytes instanceof Uint8Array);
    assert.strictEqual(zipBytes[0], 0x50); // 'P'
    assert.strictEqual(zipBytes[1], 0x4B); // 'K'

    // Decompress & verify every single file and byte matches exactly
    const unpacked = await parseZip(zipBytes);
    const dec = new TextDecoder();

    for (const [expectedPath, expectedText] of Object.entries(testFiles)) {
      assert.ok(unpacked[expectedPath], `Unpacked archive must contain ${expectedPath}`);
      const unpackedText = dec.decode(unpacked[expectedPath]);
      assert.strictEqual(unpackedText, expectedText, `Content mismatch on ${expectedPath}`);
    }
  });

  // 7. GitHub Repository Scaffolding & CI Workflow Validation
  test("GitHub repository scaffold contains complete valid CI and license", () => {
    const manifest = {
      name: "Universal Visualizer",
      description: "High-performance WebGL charting engine"
    };
    const sourceFiles = {
      "index.html": "<canvas id='cv'></canvas>",
      "render.js": "const cv = document.getElementById('cv');"
    };

    const repo = generateGitHubRepo(manifest, sourceFiles, "web");
    assert.ok(repo.files[".gitignore"]);
    assert.ok(repo.files[".github/workflows/ci.yml"]);
    assert.ok(repo.files["LICENSE"]);
    assert.ok(repo.files["README.md"]);
    assert.ok(repo.files["index.html"]);
    assert.ok(repo.files["render.js"]);

    // Verify .gitignore covers sensitive local items
    assert.ok(repo.files[".gitignore"].includes(".env"));
    assert.ok(repo.files[".gitignore"].includes("node_modules/"));

    // Verify CI workflow triggers on push & PR
    assert.ok(repo.files[".github/workflows/ci.yml"].includes("branches: [ main, master ]"));
    assert.ok(repo.files[".github/workflows/ci.yml"].includes("uses: actions/checkout@v4"));

    // Verify MIT license text
    assert.ok(repo.files["LICENSE"].includes("Permission is hereby granted, free of charge"));
    assert.ok(repo.files["LICENSE"].includes("Universal Visualizer Contributors"));
  });

  // 8. Bundle & UI Elements Integrity Verification
  test("Poppy production bundle contains all export dialog controls and 0 emojis", () => {
    const poppyHtml = fs.readFileSync("poppy.html", "utf8");
    const distHtml = fs.readFileSync("dist/index.html", "utf8");

    assert.strictEqual(poppyHtml, distHtml, "dist/index.html must match poppy.html");

    // All export buttons present
    const requiredButtons = [
      'id="exportDlg"',
      'id="btnExpSingleHtml"',
      'id="btnExpWebZip"',
      'id="btnExpExtension"',
      'id="btnExpCliNode"',
      'id="btnExpCliPy"',
      'id="btnExpGithub"',
      'id="expAuditSection"',
      'id="expAuditList"'
    ];
    for (const b of requiredButtons) {
      assert.ok(poppyHtml.includes(b), `Missing required UI element: ${b}`);
    }

    // Zero emojis check
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
    const emojis = [...poppyHtml.matchAll(emojiRegex)];
    assert.strictEqual(emojis.length, 0, "Entire poppy.html must contain zero emojis");

    // Exactly one script tag
    const scriptTags = [...poppyHtml.matchAll(/<\/script>/gi)];
    assert.strictEqual(scriptTags.length, 1, "Must contain exactly 1 closing script tag in HTML");
  });

  console.log("\n==================================================================");
  console.log(`ALL ${step}/${step} DEEP VERIFICATION CHECKS PASSED WITH ZERO ERRORS!`);
  console.log("==================================================================");
}

runVerification().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
