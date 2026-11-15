/* ===== Poppy Native Creation & Hardware Software Engine (Poppy 4.0) =====
   Provides Tauri 2.0 Rust desktop software generation, Electron cross-platform scaffolding,
   Expo mobile project packaging, WebMIDI/WebSerial/WebBluetooth hardware bridges,
   and native compiler configuration validation.
============================================================================= */

/**
 * Generates a full Tauri 2.0 Rust desktop software project structure.
 */
function generateTauriProject(manifest = {}, sourceFiles = {}) {
  const name = manifest.name || "Poppy Desktop App";
  const slug = name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "poppy-desktop";
  const identifier = "com.poppy." + slug.replace(/[^a-z0-9]/g, "");

  const tauriConf = {
    $schema: "https://schema.tauri.app/config/2",
    productName: name,
    version: manifest.version || "1.0.0",
    identifier,
    build: {
      frontendDist: "../dist",
      devUrl: "http://localhost:1420"
    },
    app: {
      withGlobalTauri: true,
      windows: [
        {
          title: name,
          width: 1100,
          height: 750,
          resizable: true,
          fullscreen: false,
          center: true
        }
      ],
      security: {
        csp: "default-src 'self' 'unsafe-inline'; img-src 'self' asset: https: data:; connect-src 'self' https: ipc:"
      }
    },
    bundle: {
      active: true,
      targets: "all",
      icon: ["icons/32x32.png", "icons/128x128.png", "icons/icon.icns", "icons/icon.ico"]
    }
  };

  const cargoToml = `[package]
name = "${slug}"
version = "0.1.0"
description = "Native desktop software created with Poppy Universal Creation Platform"
authors = ["Poppy Creator"]
edition = "2021"

[lib]
name = "${slug.replace(/-/g, "_")}_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2.0.0", features = [] }

[dependencies]
tauri = { version = "2.0.0", features = [] }
tauri-plugin-shell = "2.0.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
`;

  const mainRs = `// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from native Rust inside Poppy Desktop.", name)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
`;

  const buildRs = `fn main() {
    tauri_build::build()
}
`;

  const packageJson = {
    name: slug,
    version: "1.0.0",
    description: name + " native desktop client",
    type: "module",
    scripts: {
      "tauri": "tauri",
      "dev": "tauri dev",
      "build": "tauri build"
    },
    devDependencies: {
      "@tauri-apps/cli": "^2.0.0"
    }
  };

  const readmeMd = `# ${name} (Tauri 2.0 Native Desktop Software)

High-performance native desktop application powered by **Tauri 2.0** and **Rust**.

## Prerequisites
- **Node.js** (v18+)
- **Rust Toolchain**: Install from https://rustup.rs
  \`\`\`bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  \`\`\`

## Running in Development
\`\`\`bash
npm install
npm run dev
\`\`\`

## Building Native Executable (.app / .exe / .deb)
\`\`\`bash
npm run build
\`\`\`
Compiled standalone binaries will be generated in \`src-tauri/target/release/bundle/\`.
`;

  const files = {
    "package.json": JSON.stringify(packageJson, null, 2),
    "src-tauri/tauri.conf.json": JSON.stringify(tauriConf, null, 2),
    "src-tauri/Cargo.toml": cargoToml,
    "src-tauri/build.rs": buildRs,
    "src-tauri/src/main.rs": mainRs,
    "README.md": readmeMd,
    ".gitignore": "node_modules/\\nsrc-tauri/target/\\ndist/\\n.DS_Store\\n"
  };

  // Place frontend files into dist/
  const entryHtml = sourceFiles["index.html"] || "<h1>" + name + "</h1>";
  files["dist/index.html"] = entryHtml;
  Object.keys(sourceFiles).forEach(f => {
    if (f !== "index.html") {
      files["dist/" + f] = sourceFiles[f];
    }
  });

  return { slug, files };
}

/**
 * Generates an Electron desktop application project.
 */
function generateElectronProject(manifest = {}, sourceFiles = {}) {
  const name = manifest.name || "Poppy Electron App";
  const slug = name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "poppy-electron";

  const mainJs = `const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    title: "${name}",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadFile("dist/index.html");
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// IPC Handler for safe desktop interactions
ipcMain.handle("desktop:ping", async () => {
  return { status: "pong", timestamp: Date.now(), platform: process.platform };
});
`;

  const preloadJs = `const { contextBridge, ipcRenderer } = require("electron");

// Secure bridge exposing only safe desktop APIs to webview
contextBridge.exposeInMainWorld("electronAPI", {
  ping: () => ipcRenderer.invoke("desktop:ping"),
  platform: process.platform
});
`;

  const packageJson = {
    name: slug,
    version: "1.0.0",
    description: name + " Electron desktop application",
    main: "main.js",
    scripts: {
      start: "electron .",
      dist: "electron-builder"
    },
    devDependencies: {
      electron: "^30.0.0"
    }
  };

  const readmeMd = `# ${name} (Electron Desktop Software)

Cross-platform desktop application created with **Poppy Universal Studio**.

## Quickstart
\`\`\`bash
npm install
npm start
\`\`\`
`;

  const files = {
    "package.json": JSON.stringify(packageJson, null, 2),
    "main.js": mainJs,
    "preload.js": preloadJs,
    "README.md": readmeMd,
    ".gitignore": "node_modules/\\ndist-packages/\\n.DS_Store\\n"
  };

  const entryHtml = sourceFiles["index.html"] || "<h1>" + name + "</h1>";
  files["dist/index.html"] = entryHtml;
  Object.keys(sourceFiles).forEach(f => {
    if (f !== "index.html") {
      files["dist/" + f] = sourceFiles[f];
    }
  });

  return { slug, files };
}

/**
 * Generates an Expo / React Native mobile software project structure.
 */
function generateExpoProject(manifest = {}, sourceFiles = {}) {
  const name = manifest.name || "Poppy Mobile App";
  const slug = name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "poppy-mobile";
  const bundleId = "com.poppy." + slug.replace(/[^a-z0-9]/g, "");

  const appJson = {
    expo: {
      name,
      slug,
      version: manifest.version || "1.0.0",
      orientation: "portrait",
      icon: "./assets/icon.png",
      userInterfaceStyle: "automatic",
      splash: {
        image: "./assets/splash.png",
        resizeMode: "contain",
        backgroundColor: "#09090b"
      },
      ios: {
        supportsTablet: true,
        bundleIdentifier: bundleId
      },
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/adaptive-icon.png",
          backgroundColor: "#09090b"
        },
        package: bundleId
      }
    }
  };

  const appJs = `import React from "react";
import { StyleSheet, SafeAreaView, StatusBar } from "react-native";
import { WebView } from "react-native-webview";

export default function App() {
  const localHtml = \`${(sourceFiles["index.html"] || "<h1>" + name + "</h1>").replace(/`/g, "\\`").replace(/\${/g, "\\${")}\`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <WebView
        originWhitelist={["*"]}
        source={{ html: localHtml }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b"
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent"
  }
});
`;

  const packageJson = {
    name: slug,
    version: "1.0.0",
    main: "node_modules/expo/AppEntry.js",
    scripts: {
      start: "expo start",
      android: "expo start --android",
      ios: "expo start --ios",
      web: "expo start --web"
    },
    dependencies: {
      "expo": "~51.0.0",
      "expo-status-bar": "~1.12.1",
      "react": "18.2.0",
      "react-native": "0.74.1",
      "react-native-webview": "13.8.6"
    }
  };

  const readmeMd = `# ${name} (Expo / React Native Mobile App)

Mobile application created with **Poppy Universal Creation Platform**.

## Running on iOS or Android

\`\`\`bash
# 1. Install dependencies
npm install

# 2. Start Expo dev server
npx expo start

# 3. Press 'i' to open iOS Simulator, or 'a' to open Android Emulator
\`\`\`
`;

  return {
    slug,
    files: {
      "package.json": JSON.stringify(packageJson, null, 2),
      "app.json": JSON.stringify(appJson, null, 2),
      "App.js": appJs,
      "README.md": readmeMd,
      ".gitignore": "node_modules/\\n.expo/\\ndist/\\n.DS_Store\\n"
    }
  };
}

/**
 * Generates an in-browser mock bridge for testing hardware (WebSerial, WebMIDI, WebBluetooth)
 * and native desktop invoke APIs inside Poppy's sandbox before exporting to native compilers.
 */
function generateHardwareBridgeMock() {
  return `/* Poppy In-Browser Native & Hardware Bridge Simulator */
(() => {
  // 1. WebMIDI Mock Bridge
  if (!navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess = async () => ({
      inputs: new Map([["midi_in_0", { id: "midi_in_0", name: "Virtual MIDI Synth Input", state: "connected" }]]),
      outputs: new Map([["midi_out_0", { id: "midi_out_0", name: "Virtual MIDI Output Port", state: "connected", send: () => {} }]]),
      onstatechange: null
    });
  }

  // 2. WebSerial Mock Bridge
  if (!navigator.serial) {
    navigator.serial = {
      requestPort: async () => ({
        open: async () => {},
        close: async () => {},
        readable: { getReader: () => ({ read: async () => ({ value: new Uint8Array(), done: false }), releaseLock: () => {} }) },
        writable: { getWriter: () => ({ write: async () => {}, releaseLock: () => {} }) }
      }),
      getPorts: async () => []
    };
  }

  // 3. WebBluetooth Mock Bridge
  if (!navigator.bluetooth) {
    navigator.bluetooth = {
      requestDevice: async () => ({
        id: "ble_mock_01",
        name: "Virtual BLE Sensor",
        gatt: {
          connected: true,
          connect: async () => ({}),
          disconnect: () => {}
        }
      })
    };
  }

  // 4. Tauri Desktop API Mock
  if (!window.__TAURI__) {
    window.__TAURI__ = {
      invoke: async (cmd, args) => {
        console.log("[Tauri Mock] invoke:", cmd, args);
        if (cmd === "greet") return "Hello, " + (args && args.name ? args.name : "User") + "! You've been greeted from native Rust inside Poppy Desktop.";
        return { status: "ok", cmd, mock: true };
      }
    };
  }

  // 5. Electron API Mock
  if (!window.electronAPI) {
    window.electronAPI = {
      ping: async () => ({ status: "pong", mock: true, timestamp: Date.now() }),
      platform: "browser"
    };
  }
})();
`;
}

/**
 * Validates generated native desktop/mobile project files against compiler requirements.
 */
function validateNativeProjectBuild(files = {}, target = "tauri") {
  const errors = [];
  const warnings = [];

  if (target === "tauri") {
    if (!files["src-tauri/tauri.conf.json"]) {
      errors.push("Missing src-tauri/tauri.conf.json in Tauri project");
    } else {
      try {
        const conf = JSON.parse(files["src-tauri/tauri.conf.json"]);
        if (!conf.productName) errors.push("tauri.conf.json missing productName");
        if (!conf.identifier) errors.push("tauri.conf.json missing bundle identifier");
      } catch (err) {
        errors.push("Invalid JSON in tauri.conf.json: " + err.message);
      }
    }

    if (!files["src-tauri/Cargo.toml"]) {
      errors.push("Missing src-tauri/Cargo.toml");
    } else if (!files["src-tauri/Cargo.toml"].includes("tauri =")) {
      errors.push("Cargo.toml must declare tauri dependency");
    }

    if (!files["src-tauri/src/main.rs"]) {
      errors.push("Missing src-tauri/src/main.rs entrypoint");
    }
  } else if (target === "electron") {
    if (!files["main.js"]) errors.push("Missing main.js in Electron project");
    if (!files["preload.js"]) errors.push("Missing preload.js in Electron project");
    if (!files["package.json"]) {
      errors.push("Missing package.json in Electron project");
    } else {
      try {
        const pkg = JSON.parse(files["package.json"]);
        if (!pkg.main) errors.push("package.json missing main entrypoint pointing to main.js");
      } catch (err) {
        errors.push("Invalid package.json: " + err.message);
      }
    }
  } else if (target === "expo") {
    if (!files["app.json"]) {
      errors.push("Missing app.json in Expo project");
    } else {
      try {
        const conf = JSON.parse(files["app.json"]);
        if (!conf.expo || !conf.expo.name) errors.push("app.json requires expo.name configuration");
      } catch (err) {
        errors.push("Invalid app.json: " + err.message);
      }
    }
    if (!files["App.js"]) errors.push("Missing App.js component");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

if (typeof module !== "undefined") {
  module.exports = {
    generateTauriProject,
    generateElectronProject,
    generateExpoProject,
    generateHardwareBridgeMock,
    validateNativeProjectBuild
  };
}

if (typeof window !== "undefined") {
  window.generateTauriProject = generateTauriProject;
  window.generateElectronProject = generateElectronProject;
  window.generateExpoProject = generateExpoProject;
  window.generateHardwareBridgeMock = generateHardwareBridgeMock;
  window.validateNativeProjectBuild = validateNativeProjectBuild;
}
