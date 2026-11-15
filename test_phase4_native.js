const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

console.log("==================================================================");
console.log("POPPY PHASE 4: NATIVE CREATION TEST SUITE (POPPY 4.0)");
console.log("Tauri 2.0 Rust Desktop, Electron, Expo Mobile & Hardware Bridges");
console.log("==================================================================\n");

const {
  generateTauriProject,
  generateElectronProject,
  generateExpoProject,
  generateHardwareBridgeMock,
  validateNativeProjectBuild
} = require("./src/js/engine/native.js");

const { CAPABILITY_DEFINITIONS, auditArtifactCapabilities } = require("./src/js/core/capabilities.js");

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
  // TEST SUITE 1: Native & Hardware Capability Definitions
  // -------------------------------------------------------------
  console.log("--- Suite 1: Native & Hardware Capability Registry ---");

  await it("Capability registry defines hardware & native desktop bridges", () => {
    const caps = ["midi", "serial", "bluetooth", "tauri", "electron"];
    caps.forEach(c => {
      assert.ok(CAPABILITY_DEFINITIONS[c], `Capability ${c} must be defined`);
      assert.ok(typeof CAPABILITY_DEFINITIONS[c].api === "string");
    });

    const audit = auditArtifactCapabilities(["serial", "bluetooth", "tauri"]);
    assert.strictEqual(audit.valid, true);
    assert.strictEqual(audit.recognized.length, 3);
  });

  // -------------------------------------------------------------
  // TEST SUITE 2: Tauri 2.0 Desktop Software Generation
  // -------------------------------------------------------------
  console.log("\n--- Suite 2: Tauri 2.0 Rust Desktop Software ---");

  await it("generateTauriProject creates valid Tauri 2.0 Rust configuration & main.rs", () => {
    const manifest = {
      name: "Synthesizer Workstation",
      description: "Low-latency polyphonic synthesizer studio",
      version: "2.0.1"
    };
    const sourceFiles = {
      "index.html": "<h1>Synthesizer</h1>",
      "synth.js": "console.log('Audio engine ready');"
    };

    const proj = generateTauriProject(manifest, sourceFiles);
    assert.strictEqual(proj.slug, "synthesizer-workstation");
    assert.ok(proj.files["src-tauri/tauri.conf.json"]);
    assert.ok(proj.files["src-tauri/Cargo.toml"]);
    assert.ok(proj.files["src-tauri/src/main.rs"]);
    assert.ok(proj.files["src-tauri/build.rs"]);
    assert.ok(proj.files["dist/index.html"]);
    assert.ok(proj.files["dist/synth.js"]);
    assert.ok(proj.files["package.json"]);

    const conf = JSON.parse(proj.files["src-tauri/tauri.conf.json"]);
    assert.strictEqual(conf.productName, "Synthesizer Workstation");
    assert.strictEqual(conf.identifier, "com.poppy.synthesizerworkstation");
    assert.strictEqual(conf.app.windows[0].title, "Synthesizer Workstation");

    const cargo = proj.files["src-tauri/Cargo.toml"];
    assert.ok(cargo.includes('tauri = { version = "2.0.0"'));
    assert.ok(cargo.includes("tauri-build"));

    const mainRs = proj.files["src-tauri/src/main.rs"];
    assert.ok(mainRs.includes("#[tauri::command]"));
    assert.ok(mainRs.includes("tauri::Builder::default()"));

    const val = validateNativeProjectBuild(proj.files, "tauri");
    assert.strictEqual(val.valid, true, "Tauri project must pass build validation: " + val.errors.join(", "));
  });

  // -------------------------------------------------------------
  // TEST SUITE 3: Electron Desktop Packaging
  // -------------------------------------------------------------
  console.log("\n--- Suite 3: Electron Desktop Packaging ---");

  await it("generateElectronProject creates sandboxed main.js and preload.js bridge", () => {
    const manifest = {
      name: "Desktop Ledger",
      description: "Local accounting and invoice ledger"
    };
    const sourceFiles = {
      "index.html": "<h1>Ledger</h1>"
    };

    const el = generateElectronProject(manifest, sourceFiles);
    assert.strictEqual(el.slug, "desktop-ledger");
    assert.ok(el.files["main.js"]);
    assert.ok(el.files["preload.js"]);
    assert.ok(el.files["package.json"]);
    assert.ok(el.files["dist/index.html"]);

    const mainJs = el.files["main.js"];
    assert.ok(mainJs.includes('contextIsolation: true'));
    assert.ok(mainJs.includes('sandbox: true'));
    assert.ok(mainJs.includes('ipcMain.handle'));

    const preloadJs = el.files["preload.js"];
    assert.ok(preloadJs.includes('contextBridge.exposeInMainWorld("electronAPI"'));

    const pkg = JSON.parse(el.files["package.json"]);
    assert.strictEqual(pkg.main, "main.js");
    assert.ok(pkg.devDependencies.electron);

    const val = validateNativeProjectBuild(el.files, "electron");
    assert.strictEqual(val.valid, true, "Electron project must pass validation");
  });

  // -------------------------------------------------------------
  // TEST SUITE 4: Expo Mobile Packaging
  // -------------------------------------------------------------
  console.log("\n--- Suite 4: Expo / React Native Mobile Packaging ---");

  await it("generateExpoProject generates valid React Native WebView mobile app", () => {
    const manifest = {
      name: "Pocket Habit Tracker",
      description: "Daily habit streaks and metrics"
    };
    const sourceFiles = {
      "index.html": "<div id='streaks'>Streaks: 14</div>"
    };

    const expo = generateExpoProject(manifest, sourceFiles);
    assert.strictEqual(expo.slug, "pocket-habit-tracker");
    assert.ok(expo.files["app.json"]);
    assert.ok(expo.files["App.js"]);
    assert.ok(expo.files["package.json"]);

    const appConf = JSON.parse(expo.files["app.json"]);
    assert.strictEqual(appConf.expo.name, "Pocket Habit Tracker");
    assert.strictEqual(appConf.expo.ios.bundleIdentifier, "com.poppy.pockethabittracker");

    const appJs = expo.files["App.js"];
    assert.ok(appJs.includes('import { WebView } from "react-native-webview";'));
    assert.ok(appJs.includes('Streaks: 14'));

    const val = validateNativeProjectBuild(expo.files, "expo");
    assert.strictEqual(val.valid, true, "Expo project must pass validation");
  });

  // -------------------------------------------------------------
  // TEST SUITE 5: Hardware Device Bridge Mocks
  // -------------------------------------------------------------
  console.log("\n--- Suite 5: Hardware Device Bridge Mocks ---");

  await it("generateHardwareBridgeMock polyfills WebMIDI, WebSerial, WebBluetooth and Tauri invoke", async () => {
    const mockScript = generateHardwareBridgeMock();
    assert.ok(mockScript.includes("navigator.requestMIDIAccess"));
    assert.ok(mockScript.includes("navigator.serial"));
    assert.ok(mockScript.includes("navigator.bluetooth"));
    assert.ok(mockScript.includes("window.__TAURI__"));

    // Evaluate in sandbox
    const sandbox = {
      navigator: {},
      window: {},
      console: { log: () => {} }
    };
    vm.createContext(sandbox);
    vm.runInContext(mockScript, sandbox);

    // Test WebMIDI
    assert.ok(typeof sandbox.navigator.requestMIDIAccess === "function");
    const midi = await sandbox.navigator.requestMIDIAccess();
    assert.ok(midi.inputs.has("midi_in_0"));
    assert.ok(midi.outputs.has("midi_out_0"));

    // Test WebSerial
    assert.ok(typeof sandbox.navigator.serial.requestPort === "function");
    const port = await sandbox.navigator.serial.requestPort();
    assert.ok(typeof port.open === "function");

    // Test WebBluetooth
    assert.ok(typeof sandbox.navigator.bluetooth.requestDevice === "function");
    const ble = await sandbox.navigator.bluetooth.requestDevice();
    assert.strictEqual(ble.id, "ble_mock_01");

    // Test Tauri invoke
    assert.ok(typeof sandbox.window.__TAURI__.invoke === "function");
    const greeting = await sandbox.window.__TAURI__.invoke("greet", { name: "Alice" });
    assert.ok(greeting.includes("Poppy Desktop") || greeting.includes("Rust"));

    // Test Electron API
    assert.ok(typeof sandbox.window.electronAPI.ping === "function");
    const pong = await sandbox.window.electronAPI.ping();
    assert.strictEqual(pong.status, "pong");
  });

  // -------------------------------------------------------------
  // TEST SUITE 6: UI & Production Invariants
  // -------------------------------------------------------------
  console.log("\n--- Suite 6: UI & Production Invariants ---");

  await it("poppy.html contains Phase 4 export triggers and zero emojis", () => {
    const html = fs.readFileSync("poppy.html", "utf8");

    // Buttons exist
    assert.ok(html.includes('id="btnExpTauri"'), "btnExpTauri must exist");
    assert.ok(html.includes('id="btnExpElectron"'), "btnExpElectron must exist");
    assert.ok(html.includes('id="btnExpExpo"'), "btnExpExpo must exist");

    // Bundled functions exist
    assert.ok(html.includes("generateTauriProject"), "generateTauriProject must be bundled");
    assert.ok(html.includes("generateElectronProject"), "generateElectronProject must be bundled");
    assert.ok(html.includes("generateExpoProject"), "generateExpoProject must be bundled");
    assert.ok(html.includes("generateHardwareBridgeMock"), "generateHardwareBridgeMock must be bundled");

    // Zero emojis check
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
    const emojis = [...html.matchAll(emojiRegex)];
    assert.strictEqual(emojis.length, 0, "No emojis allowed in poppy.html");

    // Exactly 1 script closing tag
    const scriptTags = [...html.matchAll(/<\/script>/gi)];
    assert.strictEqual(scriptTags.length, 1, "Exactly 1 closing script tag in HTML");
  });

  console.log("\n==================================================================");
  console.log(`ALL ${passedTests}/${totalTests} PHASE 4 NATIVE TESTS PASSED!`);
  console.log("==================================================================");
}

runAll().catch(err => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
