const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

console.log("==================================================================");
console.log("POPPY PHASE 4: DEEP E2E NATIVE & HARDWARE VERIFICATION");
console.log("==================================================================\n");

const {
  generateTauriProject,
  generateElectronProject,
  generateExpoProject,
  generateHardwareBridgeMock,
  validateNativeProjectBuild
} = require("./src/js/engine/native.js");

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
  // 1. Live Tauri 2.0 Rust Desktop Project Verification
  test("Tauri 2.0 Rust desktop project compilation readiness", () => {
    const manifest = {
      name: "3D CAD Model Inspector",
      description: "Desktop GPU mesh renderer and STL export tool",
      version: "1.0.4"
    };
    const files = {
      "index.html": "<canvas id='viewport'></canvas>",
      "style.css": "canvas { width: 100%; height: 100%; }"
    };

    const tauri = generateTauriProject(manifest, files);
    assert.strictEqual(tauri.slug, "3d-cad-model-inspector");

    // Check Tauri configuration
    const conf = JSON.parse(tauri.files["src-tauri/tauri.conf.json"]);
    assert.strictEqual(conf.productName, "3D CAD Model Inspector");
    assert.strictEqual(conf.build.frontendDist, "../dist");
    assert.ok(conf.bundle.active);

    // Check Cargo manifest
    const cargo = tauri.files["src-tauri/Cargo.toml"];
    assert.ok(cargo.includes("[package]"));
    assert.ok(cargo.includes('name = "3d-cad-model-inspector"'));
    assert.ok(cargo.includes('name = "3d_cad_model_inspector_lib"'));
    assert.ok(cargo.includes("tauri = { version = \"2.0.0\""));

    // Check Rust source file
    const mainRs = tauri.files["src-tauri/src/main.rs"];
    assert.ok(mainRs.includes("#[tauri::command]"));
    assert.ok(mainRs.includes("fn greet(name: &str) -> String"));
    assert.ok(mainRs.includes("tauri::Builder::default()"));

    // Check frontend distribution files
    assert.ok(tauri.files["dist/index.html"].includes("<canvas id='viewport'></canvas>"));
    assert.ok(tauri.files["dist/style.css"].includes("width: 100%"));

    const val = validateNativeProjectBuild(tauri.files, "tauri");
    assert.strictEqual(val.valid, true, "Tauri project must pass build audit");
  });

  // 2. Live Electron Main & Preload Syntax Verification
  test("Electron main.js and preload.js syntax verification", () => {
    const manifest = {
      name: "Audio Mastering Studio",
      description: "Local DAW with multi-track mixing"
    };
    const files = {
      "index.html": "<div id='mixer'>Tracks</div>"
    };

    const el = generateElectronProject(manifest, files);

    // Syntax check on main.js and preload.js using node --check
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "poppy-electron-"));
    try {
      const mainPath = path.join(tmpDir, "main.js");
      const preloadPath = path.join(tmpDir, "preload.js");

      fs.writeFileSync(mainPath, el.files["main.js"], "utf8");
      fs.writeFileSync(preloadPath, el.files["preload.js"], "utf8");

      execSync(`node --check "${mainPath}"`);
      execSync(`node --check "${preloadPath}"`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    const val = validateNativeProjectBuild(el.files, "electron");
    assert.strictEqual(val.valid, true, "Electron project must pass validation");
  });

  // 3. Live Expo Mobile Configuration & WebView Bridge Verification
  test("Expo React Native mobile app schema & bundle validation", () => {
    const manifest = {
      name: "Expense Lens",
      description: "Mobile receipt scanner and expense categorizer"
    };
    const files = {
      "index.html": "<div id='camera'>Scan Receipt</div>"
    };

    const expo = generateExpoProject(manifest, files);
    const appConf = JSON.parse(expo.files["app.json"]);

    assert.strictEqual(appConf.expo.name, "Expense Lens");
    assert.strictEqual(appConf.expo.ios.bundleIdentifier, "com.poppy.expenselens");
    assert.strictEqual(appConf.expo.android.package, "com.poppy.expenselens");

    const appJs = expo.files["App.js"];
    assert.ok(appJs.includes("import { WebView } from \"react-native-webview\";"));
    assert.ok(appJs.includes("Scan Receipt"));

    const val = validateNativeProjectBuild(expo.files, "expo");
    assert.strictEqual(val.valid, true, "Expo project must pass validation");
  });

  // 4. Live Hardware Simulator (WebMIDI, WebSerial, WebBluetooth)
  await testAsync("Live execution of WebMIDI, WebSerial, and WebBluetooth simulators", async () => {
    const mockCode = generateHardwareBridgeMock();

    const mockWindow = {};
    const mockNavigator = {};
    const fn = new Function("window", "navigator", "console", mockCode);
    fn(mockWindow, mockNavigator, { log: () => {} });

    // 1. WebMIDI simulation
    assert.ok(typeof mockNavigator.requestMIDIAccess === "function");
    const midiAccess = await mockNavigator.requestMIDIAccess();
    const input = midiAccess.inputs.get("midi_in_0");
    assert.strictEqual(input.name, "Virtual MIDI Synth Input");
    const output = midiAccess.outputs.get("midi_out_0");
    assert.strictEqual(output.state, "connected");

    // 2. WebSerial simulation
    assert.ok(typeof mockNavigator.serial.requestPort === "function");
    const port = await mockNavigator.serial.requestPort();
    await port.open();
    const reader = port.readable.getReader();
    const chunk = await reader.read();
    assert.strictEqual(chunk.done, false);
    assert.ok(chunk.value instanceof Uint8Array);

    // 3. WebBluetooth simulation
    assert.ok(typeof mockNavigator.bluetooth.requestDevice === "function");
    const bleDevice = await mockNavigator.bluetooth.requestDevice({ filters: [] });
    assert.strictEqual(bleDevice.id, "ble_mock_01");
    assert.strictEqual(bleDevice.gatt.connected, true);

    // 4. Tauri Desktop invoke simulation
    assert.ok(typeof mockWindow.__TAURI__.invoke === "function");
    const res = await mockWindow.__TAURI__.invoke("greet", { name: "Creator" });
    assert.ok(res.includes("Poppy Desktop"));
  });

  // 5. Invariant Checks across Bundled Deliverables
  test("Production deliverables enforce single script tag and zero emojis", () => {
    const poppyHtml = fs.readFileSync("poppy.html", "utf8");
    const distHtml = fs.readFileSync("dist/index.html", "utf8");

    assert.strictEqual(poppyHtml, distHtml);

    // Zero emojis check
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
    assert.strictEqual([...poppyHtml.matchAll(emojiRegex)].length, 0, "No emojis allowed");

    // Exactly 1 closing script tag
    const scriptTags = [...poppyHtml.matchAll(/<\/script>/gi)];
    assert.strictEqual(scriptTags.length, 1, "Exactly 1 closing script tag in HTML");

    // UI Buttons
    assert.ok(poppyHtml.includes('id="btnExpTauri"'));
    assert.ok(poppyHtml.includes('id="btnExpElectron"'));
    assert.ok(poppyHtml.includes('id="btnExpExpo"'));
  });

  console.log("\n==================================================================");
  console.log(`ALL ${step}/${step} PHASE 4 E2E VERIFICATION CHECKS PASSED WITH ZERO ERRORS!`);
  console.log("==================================================================");
}

runVerification().catch(err => {
  console.error("Verification error:", err);
  process.exit(1);
});
