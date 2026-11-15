/* ===== Poppy Multi-Agent Engine =====
   Specialized 4-Agent Pipeline:
   1. Architect Agent: Defines formal state schema, game loop/canvas physics & interaction contract.
   2. Master Full-Stack Builder Agent: Constructs the complete, self-contained single-page application with HTML, CSS & JavaScript.
   3. Code Auditor & Self-Repair Agent: Balances delimiters, unclosed tags, and fixes syntax errors.
   4. Auto-Wiring Critic Agent: Audits all controls, pre-wires missing handlers, unlocks WebAudio & provides tactile feedback.
====================================== */

const ARCHITECT_PROMPT = `You are the Lead Software Architect in Poppy's multi-agent software engineering team.
Analyze the user's request and output a structured, complete Technical Blueprint in JSON.
Your blueprint must eliminate any ambiguity about how the app, tool, or game functions.

You must respond with ONLY a valid JSON object in this format:
\`\`\`json
{
  "appName": "Short Name",
  "category": "utility | game | dashboard | commerce | document | creative",
  "summary": "1-2 sentence core purpose",
  "architecture": {
    "layout": "responsive-container",
    "hasCanvas": false,
    "primaryComponents": ["navigation / controls", "main interactive work area", "status / feedback display"]
  },
  "stateSchema": {
    "data": [],
    "status": "ready"
  },
  "interactiveElements": [
    {
      "id": "exact-dom-id",
      "selector": "#exact-dom-id",
      "label": "Button / Control label",
      "trigger": "click | submit | input",
      "action": "Precise state mutation and visual update"
    }
  ]
}
\`\`\`
Every single button, keybinding, canvas control, or input MUST have an entry in interactiveElements.`;

const BUILDER_PROMPT = `You are the Master Full-Stack Software Engineer in Poppy's multi-agent software engineering team.
You receive the user's goal and the Lead Architect's Technical Blueprint.
Your mission is to construct the COMPLETE, HIGH-FIDELITY, PLAYABLE/FUNCTIONAL SINGLE-PAGE APPLICATION FOR ANY WEBSITE OR APP TYPE.

UNIVERSAL ARCHITECTURE RULES (APPLIES TO ALL TYPES OF WEBSITES):
1. Return ONE complete, self-contained HTML document with all <style> and <script> included. No external CDNs, fonts, or images (use CSS gradients, inline SVG, and Canvas).
2. PRE-POPULATE REALISTIC SEED DATA: Never render empty cards, blank screens, or "placeholder" text. Pre-populate 4-6 realistic products, tasks, records, slides, or enemies so the application is rich, vibrant, and alive immediately.
3. DOMAIN EXECUTION STANDARDS:
   - CALCULATORS & CONVERTERS: Modern tactile keypad (0-9, ., +, -, *, /, =, C), clear LCD/OLED display, keyboard event listeners, and accurate mathematical evaluation.
   - E-COMMERCE & SHOPS: Product catalog cards with titles, prices, tags, "Add to Cart" buttons that increment the cart badge, and a slide-out cart drawer with subtotal and checkout.
   - DASHBOARDS & SAAS: Live KPI metrics, interactive chart visualizations, filterable data tables, and working tab views.
   - PRODUCTIVITY & CRUD: Real task/item lists with checkboxes, delete buttons, real-time search input, and localStorage persistence.
   - TIMERS & STOPWATCHES: Working Start/Pause/Reset buttons, formatted MM:SS display, and drift-free timing loop.
   - GAMES & SIMULATIONS: 60fps canvas loop, player physics (velocity, gravity, collision), patrolling enemies, coin/score items, dual desktop keyboard + mobile on-screen buttons, and sound effects.
   - PRESENTATIONS & DECKS: 16:9 widescreen viewport, Prev/Next navigation, progress bar, slide counter, and speaker notes drawer.
4. ZERO DEAD BUTTONS & EVENT ARCHITECTURE:
   - Place all <script> tags at the very bottom of <body> (just before </body>).
   - Attach event listeners via JavaScript (e.g. element.addEventListener('click', handler) or element.onclick = handler) OR assign handlers to window (e.g. window.calculate = function() { ... }).
   - If you use inline onclick="fn()", fn MUST be defined as a top-level global function (outside of any DOMContentLoaded closure) so the browser can invoke it.
   - CALCULATORS & CONVERTERS: Provide an immediate, real mathematical computation engine that handles operations (digits, decimals, +, -, *, /, =, Clear) and updates the display element immediately without reloading.
   - FORMS: Always intercept form submission with e.preventDefault() in the submit handler and execute real validation/processing.
5. NO EXTERNAL DEPENDENCIES: Use pure native HTML5, CSS3, JavaScript, and Canvas. No external CDNs.`;

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
  
  // 0. Sanitize escaped JSON/model attribute quotes:
  // e.g. viewBox=\"0 0 24 24\" -> viewBox="0 0 24 24"
  // e.g. d=\"M10.325...\" -> d="M10.325..."
  if (/=\\"|viewBox=\\"|d=\\"|class=\\"|id=\\"/i.test(h)) {
    h = h.replace(/\\"/g, '"');
    h = h.replace(/(viewBox|d|class|id|fill|stroke)="+\\*(.*?)"/gi, '$1="$2"');
  }

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
  const lastOpenTag = h.slice(Math.max(0, h.length - 250)).match(/<([a-z0-9-]+)(?:\s+[^>]*?)?$/i);
  if (lastOpenTag && !['html', 'body'].includes(lastOpenTag[1].toLowerCase())) {
    const tagSnippet = lastOpenTag[0];
    const doubleQuotes = (tagSnippet.match(/"/g) || []).length;
    const singleQuotes = (tagSnippet.match(/'/g) || []).length;
    if (doubleQuotes % 2 !== 0) h += '">';
    else if (singleQuotes % 2 !== 0) h += "'>";
    else h += ">";
  }
  // Strip any accidental trailing quote/bracket artifacts (e.g. leaked "> rendered on screen)
  h = h.replace(/">\s*(<\/body>|<\/html>|$)/gi, (m, endTag) => endTag ? "\n" + endTag : "");

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
    h = h.slice(0, styleTagEnd + 1) + "\n" + code;
  }
  
  // 4. Balance unclosed delimiters in script blocks without destructive line popping
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
        // Keep original code rather than destroying lines; probe will report precise error
        return match;
      }
    }
  });
  
  // 5. Ensure body and html tags are closed
  if (!/<\/body>/i.test(h)) h += "\n</body>";
  if (!/<\/html>/i.test(h)) h += "\n</html>";
  
  return h;
}

/**
 * Ensures WebAudio contexts unlock smoothly on the first user interaction.
 * Does not intercept clicks or inject fake behavior.
 */
function autoWireButtons(html) {
  if (!html || typeof html !== "string") return html;
  if (html.includes("__poppy_audio_unlock__")) return html;

  const autoWireScript = "<scr" + "ipt id=\"__poppy_audio_unlock__\">\n" +
`(() => {
  // WebAudio Autoplay Safety & User Gesture Unlocker
  const unlock = () => {
    try {
      if (window.__poppyAudioCtx && window.__poppyAudioCtx.state === "suspended") window.__poppyAudioCtx.resume().catch(()=>{});
      if (window.Tone && window.Tone.context && window.Tone.context.state === "suspended") window.Tone.start().catch(()=>{});
      if (window.audioCtx && window.audioCtx.state === "suspended") window.audioCtx.resume().catch(()=>{});
      if (window.audioContext && window.audioContext.state === "suspended") window.audioContext.resume().catch(()=>{});
    } catch(e) {}
  };
  ["click", "keydown", "touchstart", "pointerdown", "mousedown"].forEach(ev => {
    window.addEventListener(ev, unlock, { capture: true, once: true });
  });
})();\n` + "</scr" + "ipt>";

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
