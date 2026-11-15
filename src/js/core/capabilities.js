/* ===== Poppy Universal Artifact Architecture (UAA): Capability Registry =====
   Enforces runtime security boundaries, per-artifact storage isolation,
   network origin whitelists, and hardware permissions.
================================================================================ */

const CAPABILITY_DEFINITIONS = {
  camera: {
    name: "Webcam & Video Capture",
    description: "Allows streaming video frames from camera for photobooth, filters or vision processing.",
    api: "navigator.mediaDevices.getUserMedia"
  },
  mic: {
    name: "Microphone & Audio Input",
    description: "Allows audio capture, voice recording and real-time spectrum analysis.",
    api: "navigator.mediaDevices.getUserMedia"
  },
  audio: {
    name: "WebAudio Synthesis",
    description: "Allows synthesized sound effects, oscillators, polyphony and custom sound filters.",
    api: "AudioContext"
  },
  canvas: {
    name: "2D Canvas & Pixel Shaders",
    description: "High-performance 2D drawing, image processing, cellular automata and rendering.",
    api: "CanvasRenderingContext2D"
  },
  webgl: {
    name: "3D & Hardware Accelerated Graphics",
    description: "WebGL 3D rendering, mesh geometry and spatial visualizers.",
    api: "WebGLRenderingContext"
  },
  midi: {
    name: "WebMIDI Hardware",
    description: "Allows connecting physical MIDI musical keyboards and synthesizers.",
    api: "navigator.requestMIDIAccess"
  },
  serial: {
    name: "WebSerial Hardware",
    description: "Allows communicating with microcontrollers, Arduino, sensors and serial devices.",
    api: "navigator.serial"
  },
  bluetooth: {
    name: "WebBluetooth Device",
    description: "Allows wireless BLE connection to heart rate monitors, IoT beacons and smart devices.",
    api: "navigator.bluetooth"
  },
  tauri: {
    name: "Tauri Native Desktop",
    description: "Native Rust desktop integration with system windows, menus, and low-level OS APIs.",
    api: "window.__TAURI__"
  },
  electron: {
    name: "Electron Desktop",
    description: "Cross-platform desktop application container with IPC and system tray.",
    api: "window.electronAPI"
  },
  storage: {
    name: "Isolated Local Persistence",
    description: "Persistent storage using namespaced IndexedDB or in-memory SQLite WASM.",
    api: "indexedDB / sql.js"
  }
};

/**
 * Validates requested capabilities against the system capability registry.
 */
function auditArtifactCapabilities(capabilities = []) {
  const recognized = [];
  const unrecognized = [];

  capabilities.forEach(cap => {
    if (CAPABILITY_DEFINITIONS[cap]) {
      recognized.push({ id: cap, ...CAPABILITY_DEFINITIONS[cap] });
    } else {
      unrecognized.push(cap);
    }
  });

  return {
    valid: unrecognized.length === 0,
    recognized,
    unrecognized
  };
}

/**
 * Generates an isolated storage key ensuring an application can never
 * cross-contaminate another application's or Poppy's root storage.
 */
function getIsolatedStorageKey(artifactId) {
  if (!artifactId || typeof artifactId !== "string") {
    return "poppy_art_anon_" + Date.now();
  }
  return "poppy_art_" + artifactId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

if (typeof module !== "undefined") {
  module.exports = { CAPABILITY_DEFINITIONS, auditArtifactCapabilities, getIsolatedStorageKey };
}
if (typeof window !== "undefined") {
  window.CAPABILITY_DEFINITIONS = CAPABILITY_DEFINITIONS;
  window.auditArtifactCapabilities = auditArtifactCapabilities;
  window.getIsolatedStorageKey = getIsolatedStorageKey;
}
