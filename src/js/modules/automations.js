// 2. Built-in Skill Plugins
const PLUGIN_SKILLS = [
  {
    id: "chart",
    name: "Chart.js Visualizer",
    badge: "Visualization",
    desc: "Create responsive bar, line, pie, and doughnut charts with zero configuration.",
    example: 'const Chart = await poppy.use("chart");\nnew Chart(ctx, { type: "bar", data: { ... } });'
  },
  {
    id: "marked",
    name: "Marked.js Markdown Parser",
    badge: "Content",
    desc: "High-speed compiler turning Markdown into sanitized HTML instantaneously.",
    example: 'const marked = await poppy.use("marked");\nconst html = marked.parse("# Hello World");'
  },
  {
    id: "confetti",
    name: "Canvas Confetti",
    badge: "Animation",
    desc: "Celebratory confetti particle animations for user milestones and rewards.",
    example: 'const confetti = await poppy.use("confetti");\nconfetti({ particleCount: 100, spread: 70 });'
  },
  {
    id: "qrcode",
    name: "QR Code Generator",
    badge: "Utility",
    desc: "Render dynamic, scannable QR codes for payments, links, and quick pairings.",
    example: 'const QRCode = await poppy.use("qrcode");\nnew QRCode(container, "https://poppy.dev");'
  },
  {
    id: "sfx",
    name: "WebAudio SFX Synthesizer",
    badge: "Audio",
    desc: "Procedural sound effects synthesizer for games and UI feedback without audio files.",
    example: 'const sfx = await poppy.use("sfx");\nsfx(440, "sine", 0.15); // freq, type, duration'
  }
];

// 3. Automation Multi-Step Pipeline Builder State & Handlers
let activePipelineSteps = [];

function renderPipelineSteps() {
  const container = $("#autoStepsContainer");
  if (!container) return;
  container.textContent = "";

  if (!activePipelineSteps.length) {
    container.innerHTML = `<p style="font-size:.8rem;color:var(--sub);margin:4px 0">No steps added. Click "+ Add Step" to build a sequential pipeline.</p>`;
    return;
  }

  activePipelineSteps.forEach((st, idx) => {
    if (idx > 0) {
      const arrow = document.createElement("div");
      arrow.className = "step-arrow";
      arrow.textContent = "↓";
      container.append(arrow);
    }

    const node = document.createElement("div");
    node.className = "step-node";

    const topRow = document.createElement("div");
    topRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:6px";
    
    const stepLabel = document.createElement("strong");
    stepLabel.style.fontSize = ".8rem";
    stepLabel.textContent = `Step ${idx + 1}: ${st.type}`;

    const delBtn = document.createElement("button");
    delBtn.className = "link sm del";
    delBtn.style.color = "var(--red)";
    delBtn.textContent = "×";
    delBtn.onclick = () => {
      activePipelineSteps.splice(idx, 1);
      renderPipelineSteps();
    };
    topRow.append(stepLabel, delBtn);

    const sel = document.createElement("select");
    sel.className = "pick sm";
    sel.style.width = "100%";
    sel.style.marginBottom = "6px";
    [
      ["query_db", "Query Database (SQL)"],
      ["read_store", "Read from poppy.store"],
      ["ai", "AI Transformation (poppy.ai)"],
      ["write_store", "Save to poppy.store"],
      ["notify", "Show Toast Notification"],
      ["connector", "Call External Connector"]
    ].forEach(([val, label]) => {
      const opt = new Option(label, val);
      if (val === st.type) opt.selected = true;
      sel.append(opt);
    });
    sel.onchange = e => {
      st.type = e.target.value;
      renderPipelineSteps();
    };

    const valIn = document.createElement("input");
    valIn.className = "in sm";
    valIn.style.width = "100%";
    valIn.style.boxSizing = "border-box";
    valIn.placeholder = st.type === "ai" ? "Prompt with {{input}}" : st.type === "query_db" ? "SELECT * FROM items" : "Key or argument";
    valIn.value = st.val || "";
    valIn.oninput = e => { st.val = e.target.value; };

    node.append(topRow, sel, valIn);
    container.append(node);
  });
}

function addPipelineStep(type = "query_db", val = "") {
  activePipelineSteps.push({ type, val });
  renderPipelineSteps();
}

async function testRunActivePipeline() {
  const logBox = $("#autoTestLog");
  logBox.style.display = "block";
  logBox.textContent = "Starting pipeline test run...\n";

  let piped = "";
  for (let i = 0; i < activePipelineSteps.length; i++) {
    const st = activePipelineSteps[i];
    logBox.textContent += `[Step ${i + 1}: ${st.type}] executing with: "${st.val}"\n`;
    try {
      if (st.type === "query_db") {
        const db = await getSqlDb(siteId);
        piped = await db.query(st.val || "SELECT * FROM items");
        logBox.textContent += `  Output: ${JSON.stringify(piped).slice(0, 80)}\n`;
      } else if (st.type === "read_store") {
        piped = await idb("kv", "readonly", s => s.get(siteId + "\u0000" + (st.val || "data")));
        logBox.textContent += `  Output: ${JSON.stringify(piped).slice(0, 80)}\n`;
      } else if (st.type === "ai") {
        const prompt = (st.val || "").replace("{{input}}", typeof piped === "object" ? JSON.stringify(piped) : String(piped || ""));
        logBox.textContent += `  AI prompt: "${prompt.slice(0, 60)}"\n`;
        piped = await handle("ai", [prompt, { system: "You are an automated workflow pipeline in Poppy." }], () => {});
        logBox.textContent += `  AI response: "${String(piped).slice(0, 80)}"\n`;
      } else if (st.type === "write_store") {
        await idb("kv", "readwrite", s => s.put(piped, siteId + "\u0000" + (st.val || "result")));
        logBox.textContent += `  Saved to store[${st.val || "result"}]\n`;
      } else if (st.type === "notify") {
        toast(`[Pipeline]: ${String(piped).slice(0, 60)}`);
        logBox.textContent += `  Dispatched notification.\n`;
      }
    } catch (err) {
      logBox.textContent += `  Error: ${err.message}\n`;
      break;
    }
  }
  logBox.textContent += "Pipeline test run complete!\n";
}

// 4. Ecosystem & Marketplace Controllers
function openEcosystemDialog() {
  renderPluginSkills();
  renderMarketplace();
  $("#ecosystemDlg").showModal();
}

function renderPluginSkills() {
  const grid = $("#ecoPluginsGrid");
  if (!grid) return;
  grid.textContent = "";

  PLUGIN_SKILLS.forEach(p => {
    const card = document.createElement("div");
    card.className = "eco-card";

    const top = document.createElement("div");
    const h4 = document.createElement("h4");
    h4.style.margin = "0 0 4px";
    h4.textContent = p.name;
    const badge = document.createElement("span");
    badge.className = "eco-badge";
    badge.textContent = p.badge;
    const desc = document.createElement("p");
    desc.style.cssText = "font-size:.85rem;color:var(--sub);margin:8px 0 12px;line-height:1.4";
    desc.textContent = p.desc;

    const pre = document.createElement("pre");
    pre.style.cssText = "background:#f8f9fa;border:1px solid var(--line);border-radius:8px;padding:8px;font-size:.75rem;margin:0 0 12px;overflow-x:auto";
    pre.textContent = p.example;

    top.append(badge, h4, desc, pre);

    const btm = document.createElement("div");
    const statusTag = document.createElement("span");
    statusTag.className = "studio-badge";
    statusTag.style.cssText = "background:#e5fbe9;color:#047857";
    statusTag.textContent = "Built-in / Ready";
    btm.append(statusTag);

    card.append(top, btm);
    grid.append(card);
  });
}

function renderMarketplace() {
  const grid = $("#ecoTemplatesGrid");
  if (!grid) return;
  grid.textContent = "";

  MARKETPLACE_TEMPLATES.forEach(t => {
    const card = document.createElement("div");
    card.className = "eco-card";

    const top = document.createElement("div");
    const badge = document.createElement("span");
    badge.className = "eco-badge";
    badge.textContent = t.badge;

    const h4 = document.createElement("h4");
    h4.style.margin = "6px 0 4px";
    h4.textContent = t.title;

    const desc = document.createElement("p");
    desc.style.cssText = "font-size:.85rem;color:var(--sub);margin:0 0 12px;line-height:1.4";
    desc.textContent = t.desc;

    top.append(badge, h4, desc);

    const btm = document.createElement("div");
    const cloneBtn = document.createElement("button");
    cloneBtn.className = "go sm";
    cloneBtn.textContent = "Clone Template";
    cloneBtn.onclick = () => {
      cloneMarketplaceTemplate(t);
      $("#ecosystemDlg").close();
    };
    btm.append(cloneBtn);

    card.append(top, btm);
    grid.append(card);
  });
}

function cloneMarketplaceTemplate(template) {
  siteId = crypto.randomUUID();
  ls.set("poppy.site", siteId);
  meta = { name: template.title, thumb: null };
  current = template.html;
  currentFiles = { "index.html": current };
  activeFile = "index.html";
  hist = [{ t: Date.now(), prompt: `Cloned template: ${template.title}`, html: current, files: {...currentFiles}, prov: prov() }];
  hi = 0;
  saveHist();
  refreshVers();
  show(current);
  document.body.classList.add("live");
  toast(`Cloned "${template.title}" as new project`);
}

function addCustomPlugin() {
  const name = prompt("Enter Plugin Name (e.g. Canvas Fireworks):");
  if (!name) return;
  const id = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  const desc = prompt("Enter short description:", "Custom user plugin");
  const code = prompt("Enter JavaScript code or return object expression:", "return { run: () => console.log('Plugin running') };");
  if (!code) return;

  try {
    const fn = new Function(code);
    if (!window.__poppy_plugins) window.__poppy_plugins = {};
    window.__poppy_plugins[id] = fn();
    PLUGIN_SKILLS.push({
      id,
      name,
      badge: "Custom",
      desc: desc || "User-authored plugin",
      example: `const plugin = await poppy.use("${id}");`
    });
    renderPluginSkills();
    toast(`Plugin "${name}" installed! Callable with poppy.use("${id}")`);
  } catch (err) {
    toast("Plugin compilation error: " + err.message);
  }
}

// Wire up Ecosystem dialog
if ($("#ecoTabs")) $("#ecoTabs").onclick = e => {
  const b = e.target.closest("button.tab");
  if (!b) return;
  $("#ecoTabs").querySelectorAll(".tab").forEach(t => t.setAttribute("aria-pressed", "false"));
  b.setAttribute("aria-pressed", "true");
  const tab = b.dataset.tab;
  $("#ecoTabPlugins").style.display = tab === "plugins" ? "flex" : "none";
  $("#ecoTabTemplates").style.display = tab === "templates" ? "flex" : "none";
};

if ($("#ecoClose")) $("#ecoClose").onclick = () => $("#ecosystemDlg").close();
if ($("#ecoMenuBtn")) $("#ecoMenuBtn").onclick = () => { $("#menu").hidden = true; openEcosystemDialog(); };
if ($("#ecoAddPluginBtn")) $("#ecoAddPluginBtn").onclick = addCustomPlugin;

// Wire up automation multi-step builder
if ($("#autoAddStepBtn")) $("#autoAddStepBtn").onclick = () => addPipelineStep();
if ($("#testPipelineBtn")) $("#testPipelineBtn").onclick = testRunActivePipeline;

// Persistent Cloud Software (Poppy 3.5) Handlers
async function exportGitHubActionsCronJob() {
  const name = (meta && meta.name) || "poppy-scheduled-job";
  const cron = prompt("Enter 5-part cron expression (e.g. '0 9 * * 1-5' for weekdays at 9am):", "0 9 * * 1-5");
  if (!cron) return;

  const res = typeof PERSISTENT_ENGINE !== "undefined"
    ? PERSISTENT_ENGINE.generateGitHubActionsCron(name, cron, "// Poppy Scheduled Task\nconsole.log('Automated cloud task executed successfully');")
    : null;
  if (!res) return;

  const enc = new TextEncoder();
  const zipFiles = [{ name: res.filename, data: enc.encode(res.content) }];
  const zipBytes = await createZip(zipFiles);
  const blob = new Blob([zipBytes], { type: "application/zip" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${res.slug}-github-cron.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);

  recordHeartbeatLog("github-actions", "success", `Exported scheduled cron: ${cron}`);
  toast(`Exported GitHub Actions cron workflow (${cron})`);
}

async function exportCloudflareWorkerCronJob() {
  const name = (meta && meta.name) || "poppy-cron-worker";
  const cron = prompt("Enter 5-part cron expression for Cloudflare Worker:", "0 * * * *");
  if (!cron) return;

  const res = typeof PERSISTENT_ENGINE !== "undefined"
    ? PERSISTENT_ENGINE.generateCloudflareWorkerCron(name, cron)
    : null;
  if (!res) return;

  const enc = new TextEncoder();
  const zipFiles = Object.entries(res.files).map(([fn, c]) => ({ name: fn, data: enc.encode(c) }));
  const zipBytes = await createZip(zipFiles);
  const blob = new Blob([zipBytes], { type: "application/zip" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${res.slug}-cloudflare-worker.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);

  recordHeartbeatLog("cloudflare-worker", "success", `Exported Cloudflare Worker cron: ${cron}`);
  toast(`Exported Cloudflare Worker cron bundle`);
}

async function exportWebhookReceiver() {
  const name = (meta && meta.name) || "poppy-webhook";
  const res = typeof PERSISTENT_ENGINE !== "undefined"
    ? PERSISTENT_ENGINE.generateWebhookHandler(name)
    : null;
  if (!res) return;

  const enc = new TextEncoder();
  const zipFiles = [{ name: "webhook.js", data: enc.encode(res.code) }];
  const zipBytes = await createZip(zipFiles);
  const blob = new Blob([zipBytes], { type: "application/zip" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${res.slug}-webhook.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);

  recordHeartbeatLog("webhook", "success", `Exported webhook receiver for ${name}`);
  toast(`Exported webhook receiver script`);
}

function recordHeartbeatLog(jobId, status, message) {
  if (typeof PERSISTENT_ENGINE !== "undefined") {
    PERSISTENT_ENGINE.recordExecutionHeartbeat(jobId, status, { message });
  }
  const term = $("#persistTerminalLogs");
  if (term) {
    const line = document.createElement("div");
    line.className = "persist-log-line";
    const time = new Date().toLocaleTimeString();
    line.innerHTML = `<span class="persist-log-time">[${time}]</span><span class="persist-log-status ${status}">${status.toUpperCase()}</span><span>${message}</span>`;
    term.prepend(line);
  }
}

if ($("#btnExportGhCron")) $("#btnExportGhCron").onclick = exportGitHubActionsCronJob;
if ($("#btnExportCfWorker")) $("#btnExportCfWorker").onclick = exportCloudflareWorkerCronJob;
if ($("#btnExportWebhook")) $("#btnExportWebhook").onclick = exportWebhookReceiver;
