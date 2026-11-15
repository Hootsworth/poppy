const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { execSync } = require("child_process");

console.log("==================================================================");
console.log("POPPY PHASE 5: DEEP END-TO-END ECOSYSTEM VERIFICATION & EXECUTION");
console.log("==================================================================\n");

const {
  ECOSYSTEM_ARCHETYPES,
  generateEcosystemGraph,
  extractSemanticComponents,
  remixArtifactComponents,
  verifyEcosystemIntegration,
  exportEcosystemMonorepo
} = require("./src/js/engine/ecosystem.js");

let checksPassed = 0;

function step(name, fn) {
  try {
    fn();
    checksPassed++;
    console.log(`[Step ${checksPassed}] ${name}... PASSED`);
  } catch (err) {
    console.error(`[Step ${checksPassed + 1}] FAILED: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// Step 1: Multi-Archetype Graph Synthesis & Contract Integrity
step("Multi-archetype graph synthesis & contract verification across all 4 blueprints", () => {
  const archetypes = ["saas_growth_engine", "club_community_suite", "ecommerce_retail_mesh", "iot_hardware_hub"];
  archetypes.forEach(arch => {
    const graph = generateEcosystemGraph(arch);
    assert(graph, "Failed to generate graph for " + arch);
    assert(graph.nodes.length >= 4, "Too few nodes in " + arch);
    assert(graph.edges.length >= 3, "Too few edges in " + arch);

    const audit = verifyEcosystemIntegration(graph);
    assert.strictEqual(audit.valid, true, `Verification failed for archetype ${arch}: ${audit.errors.join("; ")}`);
    assert.strictEqual(audit.errors.length, 0);
    assert(audit.edgeAudit.length >= 3);
  });
});

// Step 2: Semantic Component AST Deconstruction & Real-World Remixing
step("Live semantic component AST deconstruction and cross-artifact remixing", () => {
  const richSourceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Apex Analytics Hub</title>
  <style>
    .navbar { display: flex; justify-content: space-between; padding: 12px; background: #0f172a; color: #fff; }
    .hero { padding: 48px 24px; text-align: center; background: #1e293b; }
    .data-grid { width: 100%; border-collapse: collapse; }
    .auth-dialog { padding: 24px; border-radius: 12px; }
  </style>
</head>
<body>
  <header class="navbar">
    <div class="brand">Apex Autonomous</div>
    <nav><a href="#dashboard">Dashboard</a><a href="#settings">Settings</a></nav>
  </header>

  <section class="hero">
    <h1>Autonomous Fleet Intelligence</h1>
    <p>Zero-latency telemetry across 14,000 active nodes.</p>
    <button id="ctaBtn">Launch Flight Controller</button>
  </section>

  <table class="data-grid">
    <thead><tr><th>Node ID</th><th>Altitude</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>SAT-01</td><td>420km</td><td>Nominal</td></tr>
      <tr><td>SAT-02</td><td>550km</td><td>Nominal</td></tr>
    </tbody>
  </table>

  <form id="commandForm">
    <label for="cmd">Vector Command:</label>
    <input type="text" id="cmd" name="cmd" placeholder="THRUST_VECTOR 0.4">
    <button type="submit">Execute Vector</button>
  </form>

  <canvas id="orbitTelemetry" width="600" height="300"></canvas>

  <dialog class="auth-dialog" id="authModal">
    <h3>Staff Authentication</h3>
    <input type="password" placeholder="Hardware Token">
    <button type="button">Verify</button>
  </dialog>

  <script>
    async function syncState() {
      if (window.poppy && window.poppy.db) {
        await poppy.db.query("SELECT * FROM telemetry_frames ORDER BY ts DESC LIMIT 50");
      }
      if (window.poppy && window.poppy.store) {
        await poppy.store.set("last_sync", Date.now());
      }
    }
    syncState();
  <\/script>
</body>
</html>`;

  const components = extractSemanticComponents(richSourceHtml);
  assert(components.length >= 6, "Expected at least 6 components, got " + components.length);

  const foundTypes = new Set(components.map(c => c.type));
  assert(foundTypes.has("navbar"), "Expected navbar component");
  assert(foundTypes.has("hero"), "Expected hero component");
  assert(foundTypes.has("datagrid"), "Expected datagrid component");
  assert(foundTypes.has("form"), "Expected form component");
  assert(foundTypes.has("chart"), "Expected chart component");
  assert(foundTypes.has("auth_modal"), "Expected auth_modal component");
  assert(foundTypes.has("store_binding"), "Expected store_binding component");

  // Remix into a minimalist landing page
  const minimalistTarget = `<!DOCTYPE html>
<html>
<head><title>Minimal Portal</title></head>
<body>
  <div class="welcome">Welcome to Minimal Portal</div>
</body>
</html>`;

  const selectedComps = components.filter(c => c.type === "navbar" || c.type === "datagrid" || c.type === "chart");
  const remixed = remixArtifactComponents(minimalistTarget, selectedComps, { position: "bottom" });

  assert(remixed.includes("Apex Autonomous"), "Remixed HTML missing navbar brand");
  assert(remixed.includes("SAT-01"), "Remixed HTML missing datagrid rows");
  assert(remixed.includes("orbitTelemetry"), "Remixed HTML missing telemetry canvas");
  assert(remixed.includes("Poppy 5.0 Remixed Components"), "Missing remix header marker");
  assert(remixed.includes("</body>") && remixed.trim().endsWith("</html>"), "Remix did not preserve closing HTML tags");
});

// Step 3: Full Monorepo Packaging & Execution of Embedded Contract Tests
step("Monorepo generation & live execution of generated contract verification script", () => {
  const graph = generateEcosystemGraph("saas_growth_engine");
  const repo = exportEcosystemMonorepo(graph);

  assert(repo.files["scripts/verify-contracts.js"], "scripts/verify-contracts.js missing");
  const verifyScript = repo.files["scripts/verify-contracts.js"];

  // Execute the generated verification script using node child_process
  const output = execSync("node", { input: verifyScript, encoding: "utf8" });
  assert(output.includes("All contracts and cross-artifact schemas PASSED"), "Unexpected script output: " + output);
});

// Step 4: Docker Compose Configuration Validation
step("Docker Compose multi-service architecture & port mapping validation", () => {
  const graph = generateEcosystemGraph("saas_growth_engine");
  const repo = exportEcosystemMonorepo(graph);

  assert(repo.files["docker-compose.yml"], "docker-compose.yml missing");
  const compose = JSON.parse(repo.files["docker-compose.yml"]);

  assert.strictEqual(compose.version, "3.8");
  assert(compose.services, "compose services missing");
  assert(compose.services.api_backend, "api_backend service missing");
  assert(compose.services.web_portal, "web_portal service missing");
  assert(compose.services.cron_worker, "cron_worker service missing");

  // Check port mappings
  assert(compose.services.api_backend.ports.includes("3000:3000"));
  assert(compose.services.web_portal.ports.includes("8080:80"));
});

// Step 5: Distribution Bundle Constraints (Zero Emojis, 1 Script Tag, Strict Sandbox)
step("Production bundles enforce strict single-script tag, zero emojis and sandbox flags", () => {
  const poppyHtml = fs.readFileSync(path.join(__dirname, "poppy.html"), "utf8");
  const distHtml = fs.readFileSync(path.join(__dirname, "dist", "index.html"), "utf8");

  // Script closing tag count check
  const scriptCloses = (poppyHtml.match(/<\/script>/gi) || []).length;
  assert.strictEqual(scriptCloses, 1, `Expected 1 closing script tag in poppy.html, found ${scriptCloses}`);

  // Zero emojis check
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
  assert.strictEqual([...poppyHtml.matchAll(emojiRegex)].length, 0, "No emojis in poppy.html");
  assert.strictEqual([...distHtml.matchAll(emojiRegex)].length, 0, "No emojis in dist/index.html");

  // Sandbox attribute check on #frame
  const iframeMatch = poppyHtml.match(/<iframe\s+id="frame"\s+sandbox="([^"]+)"/);
  assert(iframeMatch, "iframe#frame not found in poppy.html");
  const sb = iframeMatch[1];
  assert.strictEqual(sb, "allow-scripts allow-forms allow-modals allow-popups", "Unexpected sandbox value: " + sb);
  assert(!sb.includes("allow-same-origin"), "iframe must never have allow-same-origin");
});

console.log("\n==================================================================");
console.log(`ALL ${checksPassed}/5 PHASE 5 DEEP VERIFICATION CHECKS PASSED WITH ZERO ERRORS!`);
console.log("==================================================================");
