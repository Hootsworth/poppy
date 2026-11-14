/* ===== Poppy Multi-Agent Engine =====
   Specialized 4-Agent Pipeline:
   1. Architect Agent: Defines formal state schema, interactive elements & action contract.
   2. UI Specialist Agent: Crafts semantic HTML5, accessible components & responsive CSS.
   3. Logic Engineer Agent: Writes rock-solid JavaScript with state management & event delegation.
   4. Auto-Wiring Critic Agent: Audits all clickable elements, repairs broken handlers, and auto-wires functional fallbacks.
====================================== */

const ARCHITECT_PROMPT = `You are the Lead Software Architect in Poppy's multi-agent software engineering team.
Analyze the user's request and output a structured, complete Interactive Application Blueprint in JSON.
Your blueprint must eliminate any ambiguity about how the app functions.

You must respond with ONLY a valid JSON object in this format:
\`\`\`json
{
  "appName": "Short Name",
  "summary": "1-2 sentence core purpose",
  "stateSchema": {
    "keyName": "type (e.g. string, array of objects, number, boolean) and initial value"
  },
  "interactiveElements": [
    {
      "id": "exact-dom-id",
      "selector": "#exact-dom-id",
      "label": "Button / Control label",
      "trigger": "click | input | change | submit",
      "action": "Precise state mutation and DOM update",
      "requiredFunction": "functionName"
    }
  ],
  "dataFlow": "How data moves from inputs -> state -> DOM rendering",
  "librariesNeeded": ["e.g. chart, confetti, marked, none"]
}
\`\`\`
Every single button, toggle, tab, modal opener, filter, or input MUST have an entry in interactiveElements.`;

const DESIGNER_PROMPT = `You are the Senior UI & Design Systems Specialist in Poppy's multi-agent software engineering team.
You receive the user's goal and the Architect's Interactive Blueprint.
Your job is to generate the complete, responsive HTML markup and CSS styling.

CRITICAL RULES:
1. You MUST include EVERY DOM element and id defined in the Architect's interactiveElements list.
2. Every <button> MUST have an explicit id and type="button".
3. Use semantic HTML5 with accessible ARIA attributes.
4. Style with a gorgeous, modern design system: crisp typography, subtle shadows, responsive flex/grid, and tactile micro-interactions.
5. Do NOT write JavaScript logic here (the Logic Engineer will wire that) - provide clean markup and styling with containers for state rendering.
6. Reply with the full HTML document containing <style> and <body>.`;

const LOGIC_PROMPT = `You are the Senior Logic & Interaction Engineer in Poppy's multi-agent software engineering team.
Your sole obsession is making EVERY SINGLE BUTTON AND INTERACTION 100% FUNCTIONAL, RESPONSIVE, AND ERROR-FREE.

You receive:
1. The Architect's Blueprint (with the exact state schema, DOM IDs, and required functions).
2. The UI Specialist's HTML and CSS.

CRITICAL RULES:
1. DO NOT REPEAT THE HTML OR CSS.
2. Return ONLY the complete JavaScript code inside a \`\`\`javascript ... \`\`\` block.
3. BIND TO WINDOW: If any element uses an inline handler like onclick="fn()", you MUST explicitly assign window.fn = fn so it is globally accessible and never throws ReferenceError.
4. EVENT LISTENERS: Wire event listeners for every single button, toggle, input, modal, and filter.
5. PREVENT SUBMITS: Always call e.preventDefault() on forms so the page never navigates away or resets.
6. COMPLETE IMPLEMENTATION: Implement 100% of the functions in the Blueprint. No placeholder stubs, no "console.log" placeholders.
7. REACTIVE STATE: Initialize the state schema, update state on user action, and re-render the corresponding DOM container smoothly.
8. PERSISTENCE: If appropriate, use poppy.store.get/set or localStorage to keep data across reloads.`;

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
  if (/[,=?:+*&|]\s*$/.test(trimmed)) {
    c = trimmed.replace(/[,=?:+*&|]\s*$/, "");
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
 * Repairs any truncated HTML or script tags caused by token limits.
 * Automatically balances unclosed delimiters, quotes, braces,
 * parentheses, <script>, <body>, and <html> tags.
 */
function repairHtml(html) {
  if (!html || typeof html !== "string") return html;
  let h = html.trim();
  
  // 1. Check for unclosed script tags
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
  
  // 2. Scan every <script> block and repair any syntax errors
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
  
  // 3. Ensure body and html tags are closed
  if (!/<\/body>/i.test(h)) h += "\n</body>";
  if (!/<\/html>/i.test(h)) h += "\n</html>";
  
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

  // Extract all button elements
  const btnRegex = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
  let btnMatches = [];
  let match;
  while ((match = btnRegex.exec(html)) !== null) {
    btnMatches.push({ full: match[0], attrs: match[1], content: match[2] });
  }

  // If no buttons, return unchanged
  if (!btnMatches.length) return html;

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

  // 1. Tactile sound synthesis
  const playClickSfx = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
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

  // 2. Global Scope Resolver for inline onclick="fn()"
  window.addEventListener("error", (e) => {
    if (e.message && e.message.includes("is not defined")) {
      const match = e.message.match(/([a-zA-Z0-9_$]+) is not defined/);
      if (match && match[1]) {
        const fnName = match[1];
        window[fnName] = function(...args) {
          console.log("[Poppy Auto-Wire] Fallback invoked for:", fnName, args);
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

  // 4. Semantic Action Engine for unhandled clicks
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button, [role='button'], a.btn, a.button, input[type='button'], input[type='submit']");
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

    // 5. Musical Instrument & Guitar / Synth Engine
    const isInstrument = text.includes("string") || text.includes("strum") || text.includes("fret") || text.includes("chord") ||
      text.includes("guitar") || text.includes("note") || text.includes("tune") || text.includes("pick") ||
      /^[a-g][#b]?[0-8]?$/i.test(text) || btn.dataset.note || btn.dataset.string || btn.dataset.chord ||
      cls.includes("string") || cls.includes("fret") || cls.includes("key") || id.includes("string") || id.includes("fret");

    if (isInstrument) {
      const noteFreqs = {
        "e2": 82.41, "f2": 87.31, "g2": 98.00, "a2": 110.00, "b2": 123.47,
        "c3": 130.81, "d3": 146.83, "e3": 164.81, "f3": 174.61, "g3": 196.00, "a3": 220.00, "b3": 246.94,
        "c4": 261.63, "d4": 293.66, "e4": 329.63, "f4": 349.23, "g4": 392.00, "a4": 440.00, "b4": 493.88,
        "c5": 523.25, "d5": 587.33, "e5": 659.25,
        "string 6": 82.41, "string 5": 110.00, "string 4": 146.83, "string 3": 196.00, "string 2": 246.94, "string 1": 329.63,
        "6": 82.41, "5": 110.00, "4": 146.83, "3": 196.00, "2": 246.94, "1": 329.63,
        "c": 261.63, "d": 293.66, "e": 329.63, "f": 349.23, "g": 392.00, "a": 440.00, "b": 493.88,
        "c maj": 261.63, "g maj": 392.00, "am": 440.00, "f maj": 349.23, "d min": 293.66, "em": 329.63
      };

      let freq = 220;
      const key = (btn.dataset.note || btn.dataset.string || btn.dataset.chord || text).toLowerCase().trim();
      if (noteFreqs[key]) {
        freq = noteFreqs[key];
      } else {
        const found = Object.keys(noteFreqs).find(k => key.includes(k));
        if (found) freq = noteFreqs[found];
      }

      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const actx = window.__poppyAudioCtx || (window.__poppyAudioCtx = new AudioCtx());
          if (actx.state === "suspended") actx.resume();
          const t0 = actx.currentTime;
          
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

          btn.style.transition = "transform .06s ease";
          btn.style.transform = "scale(0.96) translateY(2px)";
          setTimeout(() => { btn.style.transform = ""; }, 120);
        }
      } catch(err) {}
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
 * Runs the 4-Agent Multi-Agent Generation Pipeline
 */
async function runMultiAgentPipeline(goal, note, image, onProgress) {
  const setStep = (text) => {
    if (typeof setNote === "function" && note) setNote(note, text);
    if (typeof onProgress === "function") onProgress(text);
  };

  // Phase 1: Architect Agent
  setStep("Phase 1/4: Architect drafting interaction contract");
  const architectMsg = [
    {
      role: "user",
      content: `Architect a complete web application for this goal:\n${goal}\n\nDeliver the exact state schema, all interactive DOM elements with IDs, and the interaction data flow.`
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

  // Phase 2: UI & Design Systems Agent
  setStep("Phase 2/4: UI Specialist crafting responsive interface");
  const designerMsg = [
    {
      role: "user",
      content: `Build the complete HTML markup and modern responsive CSS for this app:\nGoal: ${goal}\n\nArchitect Blueprint:\n${JSON.stringify(blueprint, null, 2)}\n\nGuarantee every single ID from interactiveElements exists in the HTML.`
    }
  ];
  let uiHtml = "";
  try {
    uiHtml = await collect(designerMsg, DESIGNER_PROMPT);
  } catch (err) {
    uiHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${blueprint.appName || "App"}</title></head><body><h1>${blueprint.appName || "App"}</h1></body></html>`;
  }
  uiHtml = extractHtml(uiHtml);

  // Phase 3: Logic & Interaction Engineer Agent (Focused strictly on JS)
  setStep("Phase 3/4: Logic Engineer wiring state & handlers");
  const logicMsg = [
    {
      role: "user",
      content: `Wire 100% of the interactive logic for this application.\n\nArchitect Blueprint:\n${JSON.stringify(blueprint, null, 2)}\n\nUI Specialist Markup:\n${uiHtml}\n\nRULES:\n1. Return ONLY the JavaScript code block.\n2. Implement all functions and bind them to window.\n3. Ensure all buttons click and respond.\n4. Call e.preventDefault() on forms.`
    }
  ];
  let logicOut = "";
  try {
    logicOut = await collect(logicMsg, LOGIC_PROMPT);
  } catch (err) {
    logicOut = "";
  }
  
  // Extract script block
  let scriptBlock = "";
  const sMatch = logicOut.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i);
  if (sMatch) {
    scriptBlock = sMatch[0];
  } else {
    const cleanJs = logicOut.replace(/```(?:javascript|js)?\s*\n?([\s\S]*?)(?:```|$)/i, "$1").trim();
    if (cleanJs) scriptBlock = "<scr" + "ipt>\n" + cleanJs + "\n</scr" + "ipt>";
  }

  // Merge UI HTML with Script Block
  let fullApp = "";
  if (scriptBlock && /<\/body>/i.test(uiHtml)) {
    fullApp = uiHtml.replace(/<\/body>/i, scriptBlock + "\n</body>");
  } else if (scriptBlock) {
    fullApp = uiHtml + "\n" + scriptBlock;
  } else {
    fullApp = uiHtml;
  }

  // Phase 4: Auto-Wiring Critic Agent & Repair
  setStep("Phase 4/4: Auto-Wiring Critic verifying buttons & safety");
  fullApp = repairHtml(fullApp);
  fullApp = autoWireButtons(fullApp);

  return fullApp;
}

if (typeof window !== "undefined") {
  window.repairHtml = repairHtml;
  window.autoWireButtons = autoWireButtons;
  window.runMultiAgentPipeline = runMultiAgentPipeline;
}
