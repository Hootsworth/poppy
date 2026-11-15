/* ===== Poppy Archetype Skeletons & Domain Engines =====
   Pre-engineered, battle-tested foundations for:
   1. 2D Platformer / Mario Canvas Engine (physics, tilemaps, Goombas, question blocks, sound, mobile controls)
   2. 2D Arcade / Action Engine (particles, waves, collisions, sound FX)
   3. Data-Driven CRUD & Analytics Engine (table sorting, search, modals, KPI metrics, CSV export)
   4. Polyphonic WebAudio Studio Engine (ADSR, filters, oscillators, interactive keyboard, oscilloscope)
====================================================== */

const ARCHETYPES = {
  platformer: {
    type: "platformer",
    name: "2D Platformer & Mario Engine",
    spec: `Architecture Requirements for 2D Platformer / Mario:
- Canvas: Responsive 800x450 virtual resolution, auto-scaled with CSS.
- Physics: Player object with x, y, vx, vy, speed (4.5), gravity (0.55), jumpStrength (-12), grounded boolean, facing direction.
- Collision: AABB box vs box detection for platforms, ground, question blocks, and enemies.
- Interactive Blocks:
  * Question Mark Blocks ([?]): When hit from below (player.vy < 0), block bumps up 6px, spawns a bouncing gold coin (+100 pts), plays coin sound, and turns into an empty solid block.
  * Brick Blocks: Bump up when hit from below.
  * Ground Tiles & Pipes: Solid collision on top and sides.
- Enemies (Goombas):
  * Patrol horizontally at speed 1.2.
  * Reverse direction when hitting a pipe, block, or edge.
  * If player lands on top (player.vy > 0 and player.y + player.h <= enemy.y + 12): stomp enemy (squash animation, +200 pts, play stomp sound, bounce player up with vy = -8).
  * If enemy touches player from side/below: player loses a life and restarts position.
- Finish: Flagpole / Castle at the end of the level to trigger victory fanfare and next level / victory screen.
- Controls:
  * Keyboard: ArrowLeft / ArrowRight / A / D to move, Space / ArrowUp / W to jump.
  * Touch & Click Controls: On-screen buttons (#btnLeft, #btnRight, #btnJump, #btnRestart) MUST bind to BOTH touchstart/touchend AND mousedown/mouseup/click events so buttons respond instantly on desktop and mobile.
- WebAudio Sounds:
  * Initialize AudioContext lazily on the first user interaction (click, keydown, touchstart) to comply with browser autoplay policies:
    let audioCtx = null;
    function getAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); return audioCtx; }
  * Jump: Frequency ramp from 160Hz to 620Hz.
  * Coin: Dual-tone chime (987Hz -> 1318Hz, B5 -> E6).
  * Stomp: Low square impact (140Hz -> 35Hz).
  * Game Over & Victory fanfare tunes.
- HUD: Score, Coins, Lives (3), World (1-1), Time counter, Restart button.`,
    fileTemplate: `Organize the project into modular files using this exact structure:
--- FILE: index.html ---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Platformer Game</title>
</head>
<body>
  <div id="game-container">
    <div id="hud">
      <div class="hud-item"><span class="hud-label">MARIO</span><span id="scoreVal">000000</span></div>
      <div class="hud-item"><span class="hud-label">COINS</span><span id="coinVal">x00</span></div>
      <div class="hud-item"><span class="hud-label">WORLD</span><span>1-1</span></div>
      <div class="hud-item"><span class="hud-label">LIVES</span><span id="livesVal">3</span></div>
    </div>
    <canvas id="gameCanvas" width="800" height="450"></canvas>
    <div id="touch-controls">
      <div class="dpad">
        <button type="button" id="btnLeft" class="touch-btn" aria-label="Left">&#9664;</button>
        <button type="button" id="btnRight" class="touch-btn" aria-label="Right">&#9654;</button>
      </div>
      <div class="actions">
        <button type="button" id="btnJump" class="touch-btn action-btn" aria-label="Jump">A</button>
      </div>
    </div>
    <div id="overlay" class="game-overlay hidden">
      <h1 id="overlayTitle">GAME OVER</h1>
      <p id="overlaySub">Press Restart or Space to Play Again</p>
      <button type="button" id="btnRestart" class="btn-primary">Restart Level</button>
    </div>
  </div>
</body>
</html>

--- FILE: style.css ---
/* Responsive pixel-art arcade layout, HUD styling, touch controls & canvas scaling */

--- FILE: audio.js ---
/* WebAudio oscillator sound synthesizer with lazy context initialization on first interaction: playJump(), playCoin(), playStomp(), playGameOver(), playVictory() */

--- FILE: engine.js ---
/* 60fps delta-time requestAnimationFrame game loop, player physics, AABB collision engine, keyboard and touch/mouse event listeners for all buttons */

--- FILE: levels.js ---
/* Level tilemap, question mark blocks with bouncing coins, patrolling Goombas, flagpole finish, rendering routines & game state management */`
  },

  arcade: {
    type: "arcade",
    name: "2D Arcade & Action Engine",
    spec: `Architecture Requirements for 2D Arcade Game:
- Responsive 60fps Canvas with high-DPI scaling.
- Player entity with velocity, acceleration, screen wrapping / bounds clamping.
- Projectiles engine with particle sparks on impact.
- Enemy waves / obstacles spawning with health bars and attack patterns.
- Explosions and score popup animations (+50, +100).
- Dual Keyboard + Mobile Touch Joystick / buttons.
- WebAudio laser shoot, explosion, and powerup sounds.
- Game Over, High Score persistence via poppy.store or localStorage.`,
    fileTemplate: `Organize into modular files:
--- FILE: index.html ---
...
--- FILE: style.css ---
...
--- FILE: audio.js ---
...
--- FILE: engine.js ---
...
--- FILE: game.js ---
...`
  },

  crud: {
    type: "crud",
    name: "Data-Driven CRUD & Table Studio",
    spec: `Architecture Requirements for Data-Driven Application:
- Clean responsive layout with modern design tokens (cards, tables, badges).
- State store supporting Create, Read, Update, Delete with persistent storage.
- Real-time search filter and multi-column sorting.
- Modal dialog for adding and editing records with field validation.
- Live KPI metric cards (Total Records, Active Status, Computed Values).
- Export to CSV and JSON features.
- Tactile feedback on all button clicks and form submissions.`,
    fileTemplate: `Organize into modular files:
--- FILE: index.html ---
...
--- FILE: style.css ---
...
--- FILE: store.js ---
...
--- FILE: app.js ---
...`
  },

  audio: {
    type: "audio",
    name: "WebAudio Polyphonic Studio",
    spec: `Architecture Requirements for WebAudio Studio:
- Polyphonic oscillator synthesizer with waveform selection (sine, square, sawtooth, triangle).
- ADSR envelope controls (Attack, Decay, Sustain, Release sliders).
- Biquad filter with cutoff frequency and resonance control.
- Interactive piano keyboard with mouse, touch, and computer keyboard mapping.
- Real-time Canvas oscilloscope / frequency visualizer.
- Preset selector (Synth Lead, Deep Bass, 8-Bit Chiptune, Ambient Pad).`,
    fileTemplate: `Organize into modular files:
--- FILE: index.html ---
...
--- FILE: style.css ---
...
--- FILE: audio-engine.js ---
...
--- FILE: visualizer.js ---
...
--- FILE: app.js ---
...`
  },

  webcam: {
    type: "webcam",
    name: "Live Webcam FX & Photobooth Studio",
    spec: `Architecture Requirements for Live Webcam & Video Processing:
- MediaStream: Request camera with navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false }).
- Permission & Fallback: Gracefully catch permission denial and provide an interactive fallback canvas with demo animated video or test pattern so the application remains 100% functional.
- Real-Time Shaders / Canvas Filters:
  * ASCII Cam: Sample pixel brightness in 10x10 blocks and map to ASCII characters (' .:-=+*#%@') rendered onto canvas.
  * Retro VHS: Horizontal jitter, chromatic aberration (RGB channel offset), scanlines, and timestamp overlay.
  * Comic Halftone: Circular dot matrix scaling based on luminance.
  * Thermal Duotone: Map grayscale values to infrared heat gradient (blue -> cyan -> yellow -> red -> white).
  * High-Contrast Noir: Desaturated film grain with dramatic contrast curve.
- Photo Capture & Burst:
  * 3-2-1 visual and audible countdown (using WebAudio oscillator beep).
  * Flash animation on snapshot.
  * Photo strip thumbnail gallery holding captured frames.
- Export: Download full-resolution captured photo as high-quality PNG with customizable Polaroid-style border or sticker watermark.`,
    fileTemplate: `Organize into modular files:
--- FILE: index.html ---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Photobooth Studio</title>
</head>
<body>
  <div id="booth">
    <div id="viewfinder">
      <video id="cam" playsinline autoplay muted class="hidden"></video>
      <canvas id="output"></canvas>
      <div id="flash" class="flash-overlay"></div>
      <div id="countdown" class="count-overlay hidden"></div>
    </div>
    <div id="controls">
      <div class="filters-row">
        <button type="button" class="filter-btn active" data-filter="normal">Normal</button>
        <button type="button" class="filter-btn" data-filter="ascii">ASCII</button>
        <button type="button" class="filter-btn" data-filter="vhs">Retro VHS</button>
        <button type="button" class="filter-btn" data-filter="halftone">Halftone</button>
        <button type="button" class="filter-btn" data-filter="thermal">Thermal</button>
      </div>
      <button type="button" id="btnSnap" class="snap-btn" aria-label="Take Photo">SNAP</button>
    </div>
    <div id="gallery" class="photo-strip"></div>
  </div>
</body>
</html>

--- FILE: style.css ---
/* Dark studio theme, viewfinder styling, filter pills, retro film photo strip, and flash animations */

--- FILE: video-engine.js ---
/* Camera stream initialization, fallback test pattern generator, pixel manipulation filters (ASCII, VHS, Halftone, Thermal) running in 60fps requestAnimationFrame */

--- FILE: app.js ---
/* Countdown timer, audio beep synthesizer, snapshot image capture to PNG, and photo strip gallery interactions */`
  },

  audioRecorder: {
    type: "audioRecorder",
    name: "Audio Visualizer & Voice Memo Suite",
    spec: `Architecture Requirements for Audio Visualizer & Voice Suite:
- Audio Capture: navigator.mediaDevices.getUserMedia({ audio: true }).
- WebAudio Analyser:
  * AudioContext + AnalyserNode (fftSize 256 or 512, smoothingTimeConstant 0.75).
  * Real-time frequency bars visualizer with gradient coloring (sunset orange/crimson).
  * Circular oscilloscope wave reacting to mic amplitude.
- Voice Recording & MediaRecorder:
  * MediaRecorder recording chunks into Blob (audio/webm).
  * Record / Pause / Stop states with elapsed time clock (MM:SS).
  * Waveform playback scrubber with play/pause, seek, and speed multiplier (0.5x, 1x, 1.5x, 2x).
- Memo Library: Save recordings in an interactive list with timestamps, duration, and download link.`,
    fileTemplate: `Organize into modular files:
--- FILE: index.html ---
...
--- FILE: style.css ---
...
--- FILE: audio-analyser.js ---
...
--- FILE: recorder.js ---
...
--- FILE: app.js ---
...`
  },

  photoEditor: {
    type: "photoEditor",
    name: "Canvas Photo Editor & Adjustment Studio",
    spec: `Architecture Requirements for Canvas Photo Editor:
- Image Loading: Drag-and-drop file dropzone + file input button + pre-loaded sample photo presets.
- Non-Destructive Filter Pipeline:
  * Sliders: Exposure (-100 to +100), Contrast (-100 to +100), Saturation (0 to 200%), Warmth/Tint, Blur, Sharpening, and Vignette.
  * Presets: Cyberpunk, Kodachrome, Emerald, B&W High-Contrast, Polaroid Fade.
  * Pixel pipeline: Offscreen canvas rendering with original image backing so adjustments remain lossless.
- Crop & Aspect Ratio:
  * Presets: Freeform, 1:1 (Square), 4:5 (Portrait), 16:9 (Landscape), 9:16 (Story/Reel).
  * Visual draggable crop overlay bounding box with grid guidelines.
- Transform: 90-degree rotate, horizontal flip, vertical flip.
- Export: Download high-DPI lossless PNG or WebP with custom filename.`,
    fileTemplate: `Organize into modular files:
--- FILE: index.html ---
...
--- FILE: style.css ---
...
--- FILE: filters.js ---
...
--- FILE: crop.js ---
...
--- FILE: app.js ---
...`
  },

  markupMeme: {
    type: "markupMeme",
    name: "Screenshot Markup, Redaction & Meme Generator",
    spec: `Architecture Requirements for Markup & Meme Generator:
- Canvas Composition: Multi-layer canvas with base image + vector annotation overlay.
- Annotation Tools:
  * Freehand drawing brush with configurable color palette and stroke width.
  * Vector Callout Arrows: Drag to create directional arrows with solid heads.
  * Spotlight Tool: Dim outside area to highlight critical UI element.
  * Privacy Redaction Tool: Pixelate or heavy blur brush to redact sensitive emails, keys, or names.
- Meme Generator Mode:
  * Top text and Bottom text inputs in classic Impact uppercase font with black outline stroke.
  * Draggable and resizable sticker stamps.
- History: Undo / Redo state stack so any mistake can be reverted.
- Export: One-click export to clipboard or PNG download.`,
    fileTemplate: `Organize into modular files:
--- FILE: index.html ---
...
--- FILE: style.css ---
...
--- FILE: tools.js ---
...
--- FILE: app.js ---
...`
  },

  physicsSandbox: {
    type: "physicsSandbox",
    name: "Cellular Automata Falling Sand & Physics Sandbox",
    spec: `Architecture Requirements for Falling Sand & Elemental Sandbox:
- Cellular Automata Grid: High-performance 2D typed array (Uint8Array) grid mapped to an offscreen ImageData buffer.
- Elements & Physical Rules:
  * Sand: Falls downward, slides diagonally down-left/down-right if blocked, sinks in water.
  * Water: Falls downward, flows horizontally left and right, extinguishes fire.
  * Fire: Rises upward, flickers, burns plants, ignites gunpowder, turns water into steam.
  * Stone: Indestructible solid barrier that blocks falling particles.
  * Plant: Flammable organic structure; spreads when touched by water; burns when touched by fire.
  * Acid: Dissolves sand, stone, and plant upon contact.
- Interactive Tools:
  * Mouse / Touch brush with adjustable radius (1px, 4px, 8px, 16px).
  * Wall border toggle, gravity direction selector (Normal, Reverse, Left, Right).
  * Step mode, Pause, and Clear Canvas buttons.
  * Realtime particle count & 60fps monitor.`,
    fileTemplate: `Organize into modular files:
--- FILE: index.html ---
...
--- FILE: style.css ---
...
--- FILE: elements.js ---
...
--- FILE: sim-engine.js ---
...
--- FILE: app.js ---
...`
  },

  generative3D: {
    type: "generative3D",
    name: "Generative Flow Fields & 3D Spatial Art",
    spec: `Architecture Requirements for Generative & 3D Spatial Art:
- Vector Flow Field:
  * Simplex / Perlin noise generator mapping 2D coordinate space to angle vectors.
  * 3,000 to 10,000 active particles traversing the flow field with velocity and lifetime decay.
  * Multi-color palette trails with translucent fading for rich generative tapestry.
- 3D Geometry Viewer:
  * Vanilla WebGL / Canvas 3D rendering of parametric shapes (Icosahedron, Torus, Mobius strip, Wireframe cube).
  * Mouse drag / touch rotation with inertial damping and zoom controls.
  * Morphing sliders for vertex displacement, noise turbulence, and wireframe thickness.
- Export: Instant high-resolution 4K wallpaper PNG export.`,
    fileTemplate: `Organize into modular files:
--- FILE: index.html ---
...
--- FILE: style.css ---
...
--- FILE: noise.js ---
...
--- FILE: flow-engine.js ---
...
--- FILE: app.js ---
...`
  }
};

/**
 * Detects the optimal domain archetype based on user prompt keywords.
 */
function detectArchetype(promptText = "") {
  const p = promptText.toLowerCase();
  
  // Webcam & Live Video Filters
  if (/\b(webcam|photobooth|camera fx|ascii cam|live video filter|video effects|live camera|selfie booth)\b/i.test(p)) {
    return ARCHETYPES.webcam;
  }

  // Audio Recorder & Visualizer
  if (/\b(voice memo|audio recorder|sound visualizer|microphone visualizer|audio spectrum|voice recording|dictaphone)\b/i.test(p)) {
    return ARCHETYPES.audioRecorder;
  }

  // Photo Editor & Crop Studio
  if (/\b(photo editor|image editor|picture editor|photo filter|image adjustments|crop image|vintage filter)\b/i.test(p)) {
    return ARCHETYPES.photoEditor;
  }

  // Screenshot Markup, Redaction & Meme Generator
  if (/\b(meme generator|screenshot markup|image annotation|redact image|meme maker|photo markup|redaction tool)\b/i.test(p)) {
    return ARCHETYPES.markupMeme;
  }

  // Falling Sand & Cellular Automata Physics
  if (/\b(falling sand|sand simulator|physics sandbox|cellular automata|powder game|particle sandbox|sand physics)\b/i.test(p)) {
    return ARCHETYPES.physicsSandbox;
  }

  // Generative Flow Fields & 3D Art
  if (/\b(generative art|flow field|perlin noise|3d visualizer|spirograph|webgl 3d|spatial art|particle flow)\b/i.test(p)) {
    return ARCHETYPES.generative3D;
  }

  // Platformer: only match explicit platformer or mario games (not "e-commerce platform" or "task runner")
  if (/\b(super mario|mario game|2d platformer|platformer game|sidescroller)\b/i.test(p)) {
    return ARCHETYPES.platformer;
  }
  
  // Arcade: only match explicit arcade games
  if (/\b(space invaders|asteroids game|flappy bird|pong game|breakout game|arcade shooter)\b/i.test(p)) {
    return ARCHETYPES.arcade;
  }
  
  // Audio: only match explicit synthesizer / DAW / audio sequencers (not "guitar shop")
  if (/\b(polyphonic synth|synthesizer with adsr|audio sequencer|drum machine|digital audio workstation)\b/i.test(p)) {
    return ARCHETYPES.audio;
  }
  
  // CRUD: only match explicit database management systems (not "table booking")
  if (/\b(crud app|database management studio|inventory management system|crm database)\b/i.test(p)) {
    return ARCHETYPES.crud;
  }
  
  return null;
}

if (typeof window !== "undefined") {
  window.ARCHETYPES = ARCHETYPES;
  window.detectArchetype = detectArchetype;
}
