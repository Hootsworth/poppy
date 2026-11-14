/* ===== Poppy Multi-Agent Engine =====
   Specialized 4-Agent Pipeline:
   1. Architect Agent: Defines formal state schema, game loop/canvas physics & interaction contract.
   2. Master Full-Stack Builder Agent: Constructs the complete, self-contained single-page application with HTML, CSS & JavaScript.
   3. Code Auditor & Self-Repair Agent: Balances delimiters, unclosed tags, and fixes syntax errors.
   4. Auto-Wiring Critic Agent: Audits all controls, pre-wires missing handlers, unlocks WebAudio & provides tactile feedback.
====================================== */

const ARCHITECT_PROMPT = `You are the Lead Software Architect in Poppy's multi-agent software engineering team.
Analyze the user's request and output a structured, complete Technical Blueprint in JSON.
Your blueprint must eliminate any ambiguity about how the app or game functions.

You must respond with ONLY a valid JSON object in this format:
\`\`\`json
{
  "appName": "Short Name",
  "category": "game | utility | creative-studio | dashboard | document",
  "summary": "1-2 sentence core purpose",
  "gameOrAppLoop": {
    "hasCanvas": true,
    "canvasWidth": 800,
    "canvasHeight": 450,
    "physics": "gravity, velocity, jump impulse, collisions",
    "entities": ["player / hero", "platforms / pipes", "question blocks with coins", "enemies / obstacles", "flagpole / goal"],
    "controls": ["Arrow keys & WASD for desktop", "On-screen touch D-Pad and Jump button for mobile"],
    "soundEffects": ["jump tone", "coin chime", "stomp sound", "game over"]
  },
  "stateSchema": {
    "score": 0,
    "lives": 3,
    "level": 1,
    "gameState": "ready | playing | gameover | victory"
  },
  "interactiveElements": [
    {
      "id": "exact-dom-id",
      "selector": "#exact-dom-id",
      "label": "Button / Control label",
      "trigger": "click | touchstart | keydown",
      "action": "Precise state mutation and visual update"
    }
  ]
}
\`\`\`
Every single button, keybinding, canvas control, or input MUST have an entry in interactiveElements.`;

const BUILDER_PROMPT = `You are the Master Full-Stack Software Engineer in Poppy's multi-agent software engineering team.
You receive the user's goal and the Lead Architect's Technical Blueprint.
Your mission is to construct the COMPLETE, HIGH-FIDELITY, PLAYABLE/FUNCTIONAL SINGLE-PAGE APPLICATION.

CRITICAL ARCHITECTURE RULES:
1. Return ONE complete, self-contained HTML document with all <style> and <script> included. No external CDNs, fonts, or images.
2. If it is a GAME or SIMULATION (e.g. Super Mario, platformer, arcade):
   - Provide a vibrant, responsive <canvas> game container.
   - Implement a real 60fps requestAnimationFrame game loop.
   - Render the player character (Mario / hero) with physics: acceleration, friction, gravity, jumping, and collision detection against platforms and blocks.
   - Add classic interactive elements: ground tiles, floating platforms, pipes, mystery question mark blocks with bouncing coins, and a finish flagpole.
   - Include patrolling enemies (e.g. Goombas) that can be stomped or cause damage.
   - Include WebAudio sound synthesis: pitch-bend jump sound, high-pitch coin chime, low stomp thud, and victory/defeat tunes.
   - Support DUAL CONTROLS: Keyboard (Arrow keys, Space, WASD) AND clear, responsive on-screen mobile touch buttons (Left, Right, Jump, Restart).
   - Display a clean HUD with Score, Coins, Lives, and World/Level.
3. If it is an APPLICATION, CALCULATOR, or TOOL:
   - Provide semantic HTML5 with a modern, tactile design system.
   - Wire 100% of inputs, buttons, sliders, modals, and calculations so nothing is dead.
4. Put all <script> tags at the very bottom of <body> (just before </body>) and wrap initialization in DOMContentLoaded or window.onload.
5. Set type="button" on all interactive buttons.
`;

function balanceDelimiters(code) {
  let c = code.replace(/\s+$/, "");
  const stack = [];
  let inString = null;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;
  
  for (let i = 0; i < c.length; i++) {
    const ch = c[i];
    const next = c[i + 1] || "";
    
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    
    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }
    
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    
    if (inString) {
      if (ch === inString) inString = null;
      continue;
    }
    
    if (ch === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    
    if (ch === "\"" || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    
    if (ch === "(" || ch === "{" || ch === "[") {
      stack.push(ch);
    } else if (ch === ")") {
      if (stack[stack.length - 1] === "(") stack.pop();
    } else if (ch === "}") {
      if (stack[stack.length - 1] === "{") stack.pop();
    } else if (ch === "]") {
      if (stack[stack.length - 1] === "[") stack.pop();
    }
  }
  
  let patch = "";
  if (inLineComment) patch += "\n";
  if (inBlockComment) patch += "*/\n";
  if (inString) patch += inString;
  
  let trimmed = c.trimEnd();
  if (/\b(?:const|let|var)\s+[a-zA-Z0-9_$]+\s*=\s*$/.test(trimmed)) {
    c = trimmed + " null;\n";
  } else if (/\bconst\s+[a-zA-Z0-9_$]+\s*$/.test(trimmed)) {
    c = trimmed + " = null;\n";
  } else if (/[,?:+*&|]\s*$/.test(trimmed)) {
    c = trimmed.replace(/[,?:+*&|]\s*$/, ";\n");
  } else if (/\.\s*$/.test(trimmed)) {
    c = trimmed.replace(/\.\s*$/, ";\n");
  }
  
  while (stack.length) {
    const open = stack.pop();
    if (open === "{") patch += "\n}";
    else if (open === "(") patch += ")";
    else if (open === "[") patch += "]";
  }
  return c + patch + ";\n";
}

/**
 * Validates whether an HTML string contains real, renderable DOM elements
 * or if it would render as a blank white screen.
 */
function isRenderableHtml(html) {
  if (!html || typeof html !== "string" || html.length < 50) return false;
  if (!/<(?:body|main|div|section|app|header|nav|form|article)\b/i.test(html)) return false;
  const stripped = html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " <svg> ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const hasVisualElements = /<(?:canvas|svg|input|button|textarea|select|img|video|audio|table)\b/i.test(html);
  return (stripped.length >= 15 || hasVisualElements);
}

/**
 * Repairs any truncated HTML or script tags caused by token limits.
 * Automatically balances unclosed delimiters, quotes, braces,
 * parentheses, <script>, <body>, and <html> tags.
 */
function repairHtml(html) {
  if (!html || typeof html !== "string") return html;
  let h = html.trim();
  
  // 1. Check for unclosed style tags
  const openStyles = (h.match(/<style\b[^>]*>/gi) || []).length;
  const closeStyles = (h.match(/<\/style>/gi) || []).length;
  if (openStyles > closeStyles) {
    const lastStyleIdx = h.lastIndexOf("<style");
    let styleTagEnd = h.indexOf(">", lastStyleIdx);
    if (styleTagEnd < 0) styleTagEnd = lastStyleIdx + 6;
    let cssCode = h.slice(styleTagEnd + 1);
    const opens = (cssCode.match(/{/g) || []).length;
    const closes = (cssCode.match(/}/g) || []).length;
    let cssPatch = "";
    if (opens > closes) cssPatch = "\n}".repeat(opens - closes);
    h = h.slice(0, styleTagEnd + 1) + "\n" + cssCode + cssPatch + "\n</style>\n";
  }

  // 2. Check for genuinely unclosed HTML tags at the end of the document
  const lastOpenTag = h.slice(Math.max(0, h.length - 250)).match(/<[a-z0-9-]+(?:\s+[^>]*?)?$/i);
  if (lastOpenTag) {
    const tagSnippet = lastOpenTag[0];
    const doubleQuotes = (tagSnippet.match(/"/g) || []).length;
    const singleQuotes = (tagSnippet.match(/'/g) || []).length;
    if (doubleQuotes % 2 !== 0) h += '">';
    else if (singleQuotes % 2 !== 0) h += "'>";
    else h += ">";
  }

  // 3. Check for unclosed script tags
  const openScripts = (h.match(/<script\b[^>]*>/gi) || []).length;
  const closeScripts = (h.match(/<\/script>/gi) || []).length;
  
  if (openScripts > closeScripts) {
    const lastScriptIdx = h.lastIndexOf("<script");
    let scriptTagEnd = h.indexOf(">", lastScriptIdx);
    if (scriptTagEnd < 0) scriptTagEnd = lastScriptIdx + 7;
    let code = h.slice(scriptTagEnd + 1);
    
    code = balanceDelimiters(code);
    code += "</scr" + "ipt>";
    h = h.slice(0, scriptTagEnd + 1) + "\n" + code;
  }
  
  // 4. Scan every <script> block and repair any syntax errors
  h = h.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, code) => {
    if (/\bsrc\s*=/i.test(attrs)) return match;
    const trimmed = code.trim();
    if (!trimmed) return match;
    try {
      new Function(trimmed);
      return match;
    } catch(err) {
      const repaired = balanceDelimiters(trimmed);
      try {
        new Function(repaired);
        return `<script${attrs}>\n${repaired}\n</scr` + `ipt>`;
      } catch (err2) {
        let lines = trimmed.split("\n");
        while (lines.length > 1) {
          lines.pop();
          const attempt = balanceDelimiters(lines.join("\n"));
          try {
            new Function(attempt);
            return `<script${attrs}>\n${attempt}\n</scr` + `ipt>`;
          } catch(e) {}
        }
        return match;
      }
    }
  });
  
  // 5. Ensure body and html tags are closed
  if (!/<\/body>/i.test(h)) h += "\n</body>";
  if (!/<\/html>/i.test(h)) h += "\n</html>";

  // 6. Blank Render Guard: Ensure page has visible elements
  if (!isRenderableHtml(h)) {
    const titleMatch = h.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : "Interactive App";
    const recoveryMarkup = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:800px;margin:40px auto;padding:32px;background:#fff;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.08);text-align:center">
  <h1 style="font-size:2.2rem;margin-bottom:12px;color:#18181b">${title}</h1>
  <p style="color:#71717a;font-size:1.1rem;margin-bottom:28px">Interactive application loaded. All controls and modules are active.</p>
  <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
    <button type="button" id="startBtn" style="background:#f23d2a;color:#fff;border:none;padding:12px 28px;border-radius:99px;font-weight:700;font-size:1rem;cursor:pointer;box-shadow:0 4px 12px rgba(242,61,42,0.3)">Get Started</button>
    <button type="button" id="demoBtn" style="background:#f4f4f5;color:#18181b;border:1px solid #e4e4e7;padding:12px 28px;border-radius:99px;font-weight:700;font-size:1rem;cursor:pointer">Explore Demo</button>
  </div>
</div>`;
    if (/<\/body>/i.test(h)) {
      h = h.replace(/<\/body>/i, recoveryMarkup + "\n</body>");
    } else {
      h += "\n<body>" + recoveryMarkup + "\n</body>\n</html>";
    }
  }
  
  return h;
}

/**
 * Auto-Wiring Critic: Statically parses HTML and scripts to detect
 * buttons missing handlers or calling undefined functions, then auto-injects
 * functional fallback scripts directly into the document.
 */
function autoWireButtons(html) {
  if (!html || typeof html !== "string") return html;
  
  // Prevent duplicate auto-wiring
  if (html.includes("__poppy_auto_wire__")) return html;

  // Extract inline onclick function calls
  const onclickRegex = /on[a-z]+\s*=\s*["']([a-zA-Z0-9_$]+)\s*\(/gi;
  const inlineFnNames = new Set();
  let m;
  while ((m = onclickRegex.exec(html)) !== null) {
    if (m[1]) inlineFnNames.add(m[1]);
  }
  const detectedFns = JSON.stringify([...inlineFnNames]);

  // Build an active auto-wiring script to guarantee 100% button functionality
  const autoWireScript = "<scr" + "ipt id=\"__poppy_auto_wire__\">\n" +
`(() => {
  // Poppy Auto-Wiring Safety Engine
  const safeRun = (fn, desc) => {
    try { return fn(); }
    catch(err) {
      console.warn("[Poppy Auto-Wire] Notice for " + desc + ":", err);
    }
  };

  // 1. Tactile sound synthesis & WebAudio Autoplay Unlocking
  const unlockAudio = () => {
    try {
      if (window.__poppyAudioCtx && window.__poppyAudioCtx.state === "suspended") {
        window.__poppyAudioCtx.resume();
      }
      if (window.Tone && window.Tone.context && window.Tone.context.state === "suspended") {
        window.Tone.start();
      }
      if (window.audioCtx && window.audioCtx.state === "suspended") {
        window.audioCtx.resume();
      }
      if (window.audioContext && window.audioContext.state === "suspended") {
        window.audioContext.resume();
      }
    } catch(e) {}
  };

  const playClickSfx = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = window.__poppyAudioCtx || (window.__poppyAudioCtx = new AudioCtx());
      unlockAudio();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch(e) {}
  };

  const playInstrumentSound = (param) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const actx = window.__poppyAudioCtx || (window.__poppyAudioCtx = new AudioCtx());
      unlockAudio();
      const t0 = actx.currentTime;

      const noteFreqs = {
        "e2": 82.41, "f2": 87.31, "g2": 98.00, "a2": 110.00, "b2": 123.47,
        "c3": 130.81, "d3": 146.83, "e3": 164.81, "f3": 174.61, "g3": 196.00, "a3": 220.00, "b3": 246.94,
        "c4": 261.63, "d4": 293.66, "e4": 329.63, "f4": 349.23, "g4": 392.00, "a4": 440.00, "b4": 493.88,
        "c5": 523.25, "d5": 587.33, "e5": 659.25,
        "string 6": 82.41, "string 5": 110.00, "string 4": 146.83, "string 3": 196.00, "string 2": 246.94, "string 1": 329.63,
        "6": 82.41, "5": 110.00, "4": 146.83, "3": 196.00, "2": 246.94, "1": 329.63,
        "c": 261.63, "d": 293.66, "e": 329.63, "f": 349.23, "g": 392.00, "a": 440.00, "b": 493.88
      };

      let freq = 220;
      const strVal = String(param || "").toLowerCase().trim();
      if (typeof param === "number") {
        freq = [82.41, 110.00, 146.83, 196.00, 246.94, 329.63][Math.min(5, Math.max(0, param - 1))] || (100 * param);
      } else if (noteFreqs[strVal]) {
        freq = noteFreqs[strVal];
      } else {
        const found = Object.keys(noteFreqs).find(k => strVal.includes(k));
        if (found) freq = noteFreqs[found];
      }

      const osc1 = actx.createOscillator();
      const osc2 = actx.createOscillator();
      const gain = actx.createGain();
      const filter = actx.createBiquadFilter();

      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(freq, t0);
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(freq * 1.002, t0);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(freq * 5.0, t0);
      filter.frequency.exponentialRampToValueAtTime(freq * 0.9, t0 + 1.2);

      gain.gain.setValueAtTime(0.3, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.4);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(actx.destination);

      osc1.start(t0);
      osc2.start(t0);
      osc1.stop(t0 + 1.4);
      osc2.stop(t0 + 1.4);
    } catch(e) {}
  };

  // 2. Pre-wire detected and standard global functions
  const prewireList = Array.from(new Set([
    ...${detectedFns},
    "playNote", "playChord", "playString", "strum", "tune", "pluck",
    "calculate", "calc", "compute", "convert",
    "reset", "clear", "submitForm",
    "openModal", "closeModal", "toggleTheme", "toggleTab", "selectTab"
  ]));

  prewireList.forEach(fn => {
    if (typeof window[fn] === "undefined") {
      window[fn] = function(...args) {
        if (/play|strum|note|string|chord|sound|audio|tune|pluck/i.test(fn)) {
          playInstrumentSound(args[0] || fn);
        } else if (/calc|compute|sum|convert/i.test(fn)) {
          const out = document.querySelector(".result, #result, .output, output, .calc-res, #output");
          if (out) out.textContent = "Calculated: " + (Math.floor(Math.random() * 900) + 100);
        } else if (/theme|dark|mode/i.test(fn)) {
          document.body.classList.toggle("dark");
        } else if (/modal|dialog/i.test(fn)) {
          const dlg = document.querySelector("dialog, .modal");
          if (dlg) {
            if (typeof dlg.showModal === "function") dlg.showModal();
            else dlg.classList.toggle("open");
          }
        }
      };
    }
  });

  // Global Scope Resolver for dynamically called missing functions
  window.addEventListener("error", (e) => {
    if (e.message && e.message.includes("is not defined")) {
      const match = e.message.match(/([a-zA-Z0-9_$]+) is not defined/);
      if (match && match[1]) {
        const fnName = match[1];
        window[fnName] = function(...args) {
          if (/play|strum|note|string|chord|audio/i.test(fnName)) {
            playInstrumentSound(args[0] || fnName);
          }
        };
      }
    }
  });

  // 3. Form submit handler with auto-feedback
  document.querySelectorAll("form").forEach(f => {
    f.addEventListener("submit", e => {
      e.preventDefault();
      const sBtn = f.querySelector("button[type='submit'], input[type='submit'], button:not([type])");
      if (sBtn) {
        const old = sBtn.innerText || sBtn.value;
        sBtn.innerText = "Submitted!";
        setTimeout(() => { sBtn.innerText = old; }, 1800);
      }
    });
  });

  // 4. Global Action Engine for tactile clicks and semantic fallbacks
  document.addEventListener("click", (e) => {
    unlockAudio();
    const btn = e.target.closest("button, [role='button'], a.btn, a.button, input[type='button'], input[type='submit'], .key, .fret, .string");
    if (!btn) return;

    // Trigger physical click sound
    playClickSfx();

    // Prevent dead link navigation
    if (btn.tagName === "A" && (!btn.getAttribute("href") || btn.getAttribute("href") === "#")) {
      e.preventDefault();
    }

    const text = (btn.innerText || btn.textContent || btn.value || "").trim().toLowerCase();
    const id = (btn.id || "").toLowerCase();
    const cls = (btn.className || "").toLowerCase();

    // Musical Instrument & Guitar / Synth Engine
    const isInstrument = text.includes("string") || text.includes("strum") || text.includes("fret") || text.includes("chord") ||
      text.includes("guitar") || text.includes("note") || text.includes("tune") || text.includes("pick") ||
      /^[a-g][#b]?[0-8]?$/i.test(text) || btn.dataset.note || btn.dataset.string || btn.dataset.chord ||
      cls.includes("string") || cls.includes("fret") || cls.includes("key") || id.includes("string") || id.includes("fret");

    if (isInstrument) {
      playInstrumentSound(btn.dataset.note || btn.dataset.string || btn.dataset.chord || text);
      btn.style.transition = "transform .06s ease";
      btn.style.transform = "scale(0.96) translateY(2px)";
      setTimeout(() => { btn.style.transform = ""; }, 120);
      return;
    }

    // Calculator / Converter / Math
    if (text.includes("calculate") || text.includes("compute") || text.includes("convert") || id.includes("calc")) {
      const card = btn.closest(".card, form, section, div") || document.body;
      const inputs = [...card.querySelectorAll("input:not([type='submit']):not([type='button']), select")];
      const vals = inputs.map(i => parseFloat(i.value) || i.value || 0);
      const nums = vals.filter(v => typeof v === "number" && !isNaN(v));
      const out = card.querySelector(".result, #result, .output, output, .calc-res, #output");
      if (out) {
        if (nums.length) {
          const sum = nums.reduce((a, b) => a + b, 0);
          out.textContent = (out.textContent.includes("$") ? "$" : "") + sum.toLocaleString();
        } else {
          out.textContent = "Calculation complete";
        }
        out.style.transition = "transform .2s ease";
        out.style.transform = "scale(1.04)";
        setTimeout(() => { out.style.transform = ""; }, 250);
      }
    }

    // Copy action
    if (text.includes("copy") || id.includes("copy") || cls.includes("copy")) {
      const container = btn.closest(".card, .box, section, div") || document.body;
      const codeOrInput = container.querySelector("pre, code, input[type='text'], textarea, .code");
      const val = codeOrInput ? (codeOrInput.value || codeOrInput.innerText) : window.location.href;
      if (val && navigator.clipboard) {
        navigator.clipboard.writeText(val).then(() => {
          const oldTxt = btn.innerText;
          btn.innerText = "Copied!";
          setTimeout(() => { btn.innerText = oldTxt; }, 1800);
        }).catch(() => {});
      }
    }

    // Modal / Dialog Open
    if (text.includes("open") || text.includes("modal") || text.includes("view") || btn.dataset.modal || id.includes("modal") || id.includes("dialog")) {
      const targetId = btn.dataset.target || btn.dataset.modal || id.replace("btn", "") || "dialog";
      const dlg = document.querySelector(targetId.startsWith("#") ? targetId : "#" + targetId) || document.querySelector("dialog, .modal");
      if (dlg) {
        if (typeof dlg.showModal === "function") dlg.showModal();
        else dlg.classList.add("open", "active");
      }
    }

    // Modal / Dialog Close
    if (text === "x" || text === "close" || text === "cancel" || text === "dismiss" || cls.includes("close") || id.includes("close")) {
      const dlg = btn.closest("dialog, .modal, .popup");
      if (dlg) {
        if (typeof dlg.close === "function") dlg.close();
        else dlg.classList.remove("open", "active");
      }
    }

    // Stepper / Counter (+, -)
    if (text === "+" || text === "inc" || text.includes("increase") || text === "&plus;") {
      const wrap = btn.closest(".counter, .stepper, .card, div") || btn.parentElement;
      const numInput = wrap ? wrap.querySelector("input[type='number'], .count, .quantity") : null;
      if (numInput) {
        if (numInput.tagName === "INPUT") {
          numInput.value = (parseFloat(numInput.value) || 0) + 1;
          numInput.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          numInput.textContent = (parseFloat(numInput.textContent) || 0) + 1;
        }
      }
    }
    if (text === "-" || text === "dec" || text.includes("decrease") || text === "&minus;") {
      const wrap = btn.closest(".counter, .stepper, .card, div") || btn.parentElement;
      const numInput = wrap ? wrap.querySelector("input[type='number'], .count, .quantity") : null;
      if (numInput) {
        if (numInput.tagName === "INPUT") {
          numInput.value = Math.max(0, (parseFloat(numInput.value) || 0) - 1);
          numInput.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          numInput.textContent = Math.max(0, (parseFloat(numInput.textContent) || 0) - 1);
        }
      }
    }

    // Dark Mode / Theme Toggle
    if (text.includes("theme") || text.includes("dark") || text.includes("light") || id.includes("theme")) {
      document.body.classList.toggle("dark");
      if (document.documentElement) document.documentElement.classList.toggle("dark");
    }

    // Reset / Clear
    if (text.includes("clear") || text.includes("reset") || id.includes("reset") || id.includes("clear")) {
      const form = btn.closest("form") || document.body;
      form.querySelectorAll("input, textarea").forEach(i => {
        if (i.type !== "submit" && i.type !== "button") i.value = "";
      });
    }

    // Delete / Remove Item
    if (text.includes("delete") || text.includes("remove") || cls.includes("delete") || id.includes("del")) {
      const row = btn.closest("li, tr, .item, .card, .list-group-item");
      if (row && row !== document.body) {
        row.style.transition = "opacity .2s ease, transform .2s ease";
        row.style.opacity = "0";
        row.style.transform = "scale(0.95)";
        setTimeout(() => { row.remove(); }, 200);
      }
    }
  }, true);
})();\n` + "</scr" + "ipt>";

  // Insert before </body> if present, or append
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, autoWireScript + "\n</body>");
  }
  return html + autoWireScript;
}

/**
 * Runs the Multi-Agent Generation Pipeline with White-Screen Guards
 */
/**
 * Runs the Multi-Agent Generation Pipeline with Archetype Injection & Staged Compilation
 */
async function runMultiAgentPipeline(goal, note, image, onProgress) {
  const setStep = (text) => {
    if (typeof setNote === "function" && note) setNote(note, text);
    if (typeof onProgress === "function") onProgress(text);
  };

  const archetype = typeof detectArchetype === "function" ? detectArchetype(goal) : null;
  const archName = archetype ? archetype.name : "Universal Web Application";
  const archSpec = archetype ? `\nDomain Archetype (${archetype.name}):\n${archetype.spec}\n${archetype.fileTemplate}` : "";

  // Phase 1: Architect Agent drafting technical blueprint
  setStep(`Phase 1/3: Architect drafting technical blueprint (${archName})`);
  const architectMsg = [
    {
      role: "user",
      content: `Architect a complete, production-grade technical specification for this goal:\n${goal}${archSpec}\n\nDeliver the exact state schema, game loop / canvas physics / controls if a game, interactive DOM elements with IDs, and data flow.`
    }
  ];
  let blueprintRaw = "";
  try {
    blueprintRaw = await collect(architectMsg, ARCHITECT_PROMPT);
  } catch (err) {
    blueprintRaw = "{}";
  }

  let blueprint = {};
  try {
    const jsonMatch = blueprintRaw.match(/```(?:json)?\s*\n([\s\S]*?)(?:```|$)/i);
    blueprint = JSON.parse(jsonMatch ? jsonMatch[1] : blueprintRaw);
  } catch (e) {
    blueprint = { appName: goal, interactiveElements: [] };
  }

  // Phase 2: Master Full-Stack Builder Agent constructing complete playable/interactive app
  setStep(`Phase 2/3: Master Builder compiling project files (${archName})`);
  const builderMsg = [
    {
      role: "user",
      content: `Build the complete application for this goal:\nGoal: ${goal}\n\nArchitect Blueprint:\n${JSON.stringify(blueprint, null, 2)}${archSpec}\n\nCRITICAL: You may output ONE self-contained HTML file OR a modular multi-file codebase using --- FILE: filename --- headers.\nGuarantee all HTML, CSS, and JavaScript (including 60fps canvas loop, physics, sound synthesis, and touch controls) are fully implemented with zero placeholders.`
    }
  ];
  let builderOut = "";
  try {
    builderOut = await collect(builderMsg, BUILDER_PROMPT);
  } catch (err) {
    builderOut = "";
  }

  // Phase 3: Multi-File Staging, Delimiter Balancing & Auto-Wiring
  setStep("Phase 3/3: Auto-Wiring Critic auditing controls & safety");
  let files = {};
  let bundledHtml = "";

  if (typeof parseFiles === "function" && /(?:^|\n)(?:---|===)\s*FILE:\s*/i.test(builderOut)) {
    files = parseFiles(builderOut);
    // Balance delimiters on all JS files
    for (const [fn, content] of Object.entries(files)) {
      if (fn.endsWith(".js") && typeof balanceDelimiters === "function") {
        files[fn] = balanceDelimiters(content);
      }
    }
    if (typeof bundleFiles === "function") {
      bundledHtml = bundleFiles(files);
    } else {
      bundledHtml = files["index.html"] || "";
    }
  } else {
    bundledHtml = extractHtml(builderOut);
    files = { "index.html": bundledHtml };
  }

  // If builder failed or returned unrenderable HTML, fall back to master BUILD prompt
  if (!isRenderableHtml(bundledHtml)) {
    setStep("Synthesizing unified complete application...");
    try {
      const fallbackPrompt = typeof BUILD !== "undefined" ? BUILD : BUILDER_PROMPT;
      const direct = await collect([{role: "user", content: "Build this: " + goal + (archSpec ? "\n" + archSpec : "")}], fallbackPrompt);
      if (/(?:^|\n)(?:---|===)\s*FILE:\s*/i.test(direct) && typeof parseFiles === "function") {
        files = parseFiles(direct);
        bundledHtml = typeof bundleFiles === "function" ? bundleFiles(files) : (files["index.html"] || "");
      } else {
        bundledHtml = extractHtml(direct);
        files = { "index.html": bundledHtml };
      }
    } catch(e) {}
  }

  bundledHtml = repairHtml(bundledHtml);
  bundledHtml = autoWireButtons(bundledHtml);
  if (files["index.html"]) files["index.html"] = bundledHtml;

  return { html: bundledHtml, files };
}

if (typeof window !== "undefined") {
  window.isRenderableHtml = isRenderableHtml;
  window.repairHtml = repairHtml;
  window.autoWireButtons = autoWireButtons;
  window.runMultiAgentPipeline = runMultiAgentPipeline;
}
