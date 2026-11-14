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
  * Mobile Touch Controls: On-screen semi-transparent buttons (#btnLeft, #btnRight, #btnJump, #btnRestart).
- WebAudio Sounds:
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
/* WebAudio oscillator sound synthesizer: playJump(), playCoin(), playStomp(), playGameOver(), playVictory() */

--- FILE: engine.js ---
/* 60fps delta-time requestAnimationFrame game loop, player physics, AABB collision engine, keyboard and touch event listeners */

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
  }
};

/**
 * Detects the optimal domain archetype based on user prompt keywords.
 */
function detectArchetype(promptText = "") {
  const p = promptText.toLowerCase();
  
  // Platformer / Mario / Sidescroller
  if (/\b(mario|super mario|platformer|jump|sidescroll|sonic|metroid|platform|obstacle course|runner)\b/i.test(p)) {
    return ARCHETYPES.platformer;
  }
  
  // Arcade / Shooter / Action / Canvas Games
  if (/\b(arcade|space invaders|shooter|asteroids|flappy|pong|breakout|snake|pacman|tetris|bullet|dodge|galaxy)\b/i.test(p)) {
    return ARCHETYPES.arcade;
  }
  
  // Audio / Synthesizer / Beats
  if (/\b(synth|synthesizer|piano|audio|instrument|guitar|drum|beat|soundboard|daw|sequencer|oscillator)\b/i.test(p)) {
    return ARCHETYPES.audio;
  }
  
  // CRUD / Data / Table / Dashboard
  if (/\b(crud|table|database|crm|inventory|contacts|records|tracker|budget|expenses|kanban|management)\b/i.test(p)) {
    return ARCHETYPES.crud;
  }
  
  return null;
}

if (typeof window !== "undefined") {
  window.ARCHETYPES = ARCHETYPES;
  window.detectArchetype = detectArchetype;
}
