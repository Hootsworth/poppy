const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("==================================================================");
console.log("POPPY PHASE 5: UNIVERSAL CREATION ECOSYSTEM TEST SUITE (POPPY 5.0)");
console.log("Multi-Artifact Graph, Semantic AST Remixing, Contract Verification, Monorepo");
console.log("==================================================================\n");

const ecosystem = require("./src/js/engine/ecosystem.js");
const {
  ECOSYSTEM_ARCHETYPES,
  generateEcosystemGraph,
  extractSemanticComponents,
  remixArtifactComponents,
  verifyEcosystemIntegration,
  exportEcosystemMonorepo
} = ecosystem;

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS [${passed + 1}]: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

// --- Suite 1: Ecosystem Archetypes & Graph Generation ---
console.log("--- Suite 1: Ecosystem Archetypes & Graph Generation ---");

test("ECOSYSTEM_ARCHETYPES contains all 4 standard production blueprints", () => {
  assert(ECOSYSTEM_ARCHETYPES.saas_growth_engine, "saas_growth_engine missing");
  assert(ECOSYSTEM_ARCHETYPES.club_community_suite, "club_community_suite missing");
  assert(ECOSYSTEM_ARCHETYPES.ecommerce_retail_mesh, "ecommerce_retail_mesh missing");
  assert(ECOSYSTEM_ARCHETYPES.iot_hardware_hub, "iot_hardware_hub missing");
  assert.strictEqual(ECOSYSTEM_ARCHETYPES.saas_growth_engine.nodes.length, 6);
  assert.strictEqual(ECOSYSTEM_ARCHETYPES.saas_growth_engine.edges.length, 7);
});

test("generateEcosystemGraph instantiates archetype with version 5.0.0 and metadata", () => {
  const graph = generateEcosystemGraph("saas_growth_engine");
  assert.strictEqual(graph.id, "saas_growth_engine");
  assert.strictEqual(graph.version, "5.0.0");
  assert(graph.generatedAt, "Missing generatedAt timestamp");
  assert(Array.isArray(graph.nodes) && graph.nodes.length === 6);
  assert(Array.isArray(graph.edges) && graph.edges.length === 7);
  assert(graph.nodes.find(n => n.role === "shared-db"), "Missing shared-db node");
  assert(graph.nodes.find(n => n.role === "api-backend"), "Missing api-backend node");
});

test("generateEcosystemGraph supports custom user-defined ecosystem blueprints", () => {
  const custom = {
    id: "custom_media_mesh",
    name: "Media Streaming Mesh",
    description: "Custom video transcode and streaming mesh",
    nodes: [
      { id: "stream_player", name: "Player Web", role: "public-web", type: "web-app", files: { "index.html": "<h1>Player</h1>" } },
      { id: "transcode_api", name: "Transcode Worker", role: "api-backend", type: "dev-tool", endpoints: [{ method: "POST", path: "/api/transcode" }] }
    ],
    edges: [
      { id: "e1", source: "stream_player", target: "transcode_api", protocol: "api" }
    ]
  };
  const graph = generateEcosystemGraph(custom);
  assert.strictEqual(graph.name, "Media Streaming Mesh");
  assert.strictEqual(graph.nodes.length, 2);
  assert.strictEqual(graph.edges.length, 1);
});

// --- Suite 2: Semantic AST Component Extraction & Remixing ---
console.log("\n--- Suite 2: Semantic AST Component Extraction & Remixing ---");

test("extractSemanticComponents parses navbar, hero, datagrid, form, chart, dialog and bindings", () => {
  const sampleHtml = `<!DOCTYPE html>
<html>
<head><title>Test App</title></head>
<body>
  <header class="navbar"><h2>App Title</h2><button>Login</button></header>
  <div class="hero"><h1>Welcome</h1><p>Subtitle</p></div>
  <table class="data-table"><tr><th>Col1</th></tr><tr><td>Val1</td></tr></table>
  <form id="leadForm"><input name="email"><button type="submit">Submit</button></form>
  <canvas id="liveChart" width="400" height="200"></canvas>
  <dialog id="authModal"><p>Login modal</p></dialog>
  <script>
    async function load() {
      await poppy.db.query("SELECT * FROM users");
      await poppy.store.set("key", 123);
    }
  <\/script>
</body>
</html>`;

  const comps = extractSemanticComponents(sampleHtml);
  assert(Array.isArray(comps), "extractSemanticComponents should return an array");
  assert(comps.length >= 6, "Expected at least 6 components, found " + comps.length);

  const types = comps.map(c => c.type);
  assert(types.includes("navbar"), "navbar component missing");
  assert(types.includes("hero"), "hero component missing");
  assert(types.includes("datagrid"), "datagrid component missing");
  assert(types.includes("form"), "form component missing");
  assert(types.includes("chart"), "chart component missing");
  assert(types.includes("auth_modal"), "auth_modal component missing");
  assert(types.includes("store_binding"), "store_binding component missing");
});

test("remixArtifactComponents safely injects selected components into target HTML", () => {
  const targetHtml = "<!DOCTYPE html><html><head><title>Target</title></head><body><h1>Existing Content</h1></body></html>";
  const component = {
    id: "comp_datagrid_1",
    type: "datagrid",
    html: "<div class=\"data-table\"><table><tr><td>Injected Row</td></tr></table></div>"
  };

  const remixedBottom = remixArtifactComponents(targetHtml, [component], { position: "bottom" });
  assert(remixedBottom.includes("Injected Row"), "Component HTML missing in bottom injection");
  assert(remixedBottom.includes("Poppy 5.0 Remixed Components"), "Missing remix header marker");
  assert(remixedBottom.trim().endsWith("</html>"), "Bottom injection must preserve closing tags");

  const remixedTop = remixArtifactComponents(targetHtml, [component], { position: "top" });
  assert(remixedTop.includes("Injected Row"), "Component HTML missing in top injection");
});

// --- Suite 3: Cross-Artifact Schema & Contract Verification ---
console.log("\n--- Suite 3: Cross-Artifact Schema & Contract Verification ---");

test("verifyEcosystemIntegration approves valid ecosystem and creates edge audit report", () => {
  const graph = generateEcosystemGraph("saas_growth_engine");
  const audit = verifyEcosystemIntegration(graph);
  assert.strictEqual(audit.valid, true, "Valid graph failed verification: " + audit.errors.join("; "));
  assert.strictEqual(audit.errors.length, 0);
  assert(audit.edgeAudit.length >= 6, "Expected at least 6 audited edges, got " + audit.edgeAudit.length);
  assert(audit.edgeAudit.every(a => a.status === "verified"), "All edge audits should be verified");
});

test("verifyEcosystemIntegration catches missing nodes and dangling edges", () => {
  const invalidGraph = {
    id: "broken_eco",
    nodes: [{ id: "only_node", role: "public-web" }],
    edges: [{ id: "bad_edge", source: "only_node", target: "ghost_node", protocol: "api" }]
  };
  const audit = verifyEcosystemIntegration(invalidGraph);
  assert.strictEqual(audit.valid, false, "Broken graph should fail verification");
  assert(audit.errors.some(e => e.includes("ghost_node")), "Error should mention ghost_node");
});

test("verifyEcosystemIntegration detects duplicate node IDs", () => {
  const dupGraph = {
    id: "dup_eco",
    nodes: [
      { id: "node_a", role: "public-web" },
      { id: "node_a", role: "admin-crm" }
    ],
    edges: []
  };
  const audit = verifyEcosystemIntegration(dupGraph);
  assert.strictEqual(audit.valid, false, "Duplicate node IDs must fail verification");
  assert(audit.errors.some(e => e.includes("Duplicate node id")), "Error should flag duplicate id");
});

// --- Suite 4: Monorepo & Multi-Deliverable Export ---
console.log("\n--- Suite 4: Monorepo & Multi-Deliverable Export ---");

test("exportEcosystemMonorepo produces structured monorepo tree with docker-compose and package.json", () => {
  const graph = generateEcosystemGraph("saas_growth_engine");
  const repo = exportEcosystemMonorepo(graph);

  assert.strictEqual(repo.ecosystemId, "saas_growth_engine");
  assert(repo.fileCount >= 10, "Expected at least 10 files in monorepo, got " + repo.fileCount);
  assert(repo.files["package.json"], "package.json missing from monorepo");
  assert(repo.files["docker-compose.yml"], "docker-compose.yml missing from monorepo");
  assert(repo.files["README.md"], "README.md missing from monorepo");
  assert(repo.files["run-dev.sh"], "run-dev.sh missing from monorepo");
  assert(repo.files["scripts/verify-contracts.js"], "scripts/verify-contracts.js missing");

  // Inspect package.json workspaces
  const pkg = JSON.parse(repo.files["package.json"]);
  assert(Array.isArray(pkg.workspaces), "package.json missing workspaces");
  assert(pkg.workspaces.includes("services/*"), "package.json workspaces should include services/*");

  // Inspect services
  assert(repo.files["services/web_portal/index.html"], "web_portal index.html missing");
  assert(repo.files["services/admin_crm/index.html"], "admin_crm index.html missing");
  assert(repo.files["services/api_backend/server.js"], "api_backend server.js missing");
  assert(repo.files["services/api_backend/openapi.json"], "api_backend openapi.json missing");
  assert(repo.files["services/cron_worker/cron.js"], "cron_worker cron.js missing");
  assert(repo.files["services/shared_db/schema.sql"], "shared_db schema.sql missing");
  assert(repo.files["services/executive_report/index.html"], "executive_report index.html missing");
});

// --- Suite 5: UI & Production Invariants ---
console.log("\n--- Suite 5: UI & Production Invariants ---");

test("poppy.html and dist/index.html contain all Phase 5 elements and zero emojis", () => {
  const poppyHtml = fs.readFileSync(path.join(__dirname, "poppy.html"), "utf8");
  const distHtml = fs.readFileSync(path.join(__dirname, "dist", "index.html"), "utf8");

  const requiredElements = [
    'data-tab="graph"',
    'id="ecoTabGraph"',
    'id="ecoArchetypeSel"',
    'id="ecoGenBtn"',
    'id="ecoVerifyContractsBtn"',
    'id="ecoExportMonorepoBtn"',
    'id="ecoNodesContainer"',
    'id="ecoSvgCanvas"',
    'id="ecoAuditBox"',
    'id="ecoExtractCompBtn"',
    'id="ecoComponentsGrid"'
  ];

  requiredElements.forEach(el => {
    assert(poppyHtml.includes(el), "poppy.html missing Phase 5 element: " + el);
    assert(distHtml.includes(el), "dist/index.html missing Phase 5 element: " + el);
  });

  // Verify single script tag closing
  const scriptCloses = (poppyHtml.match(/<\/script>/gi) || []).length;
  assert.strictEqual(scriptCloses, 1, `Expected exactly 1 </script> tag, found ${scriptCloses}`);

  // Verify zero emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
  assert(!emojiRegex.test(poppyHtml), "poppy.html contains emojis!");
  assert(!emojiRegex.test(distHtml), "dist/index.html contains emojis!");
});

console.log("\n==================================================================");
console.log(`ALL ${passed}/${passed + failed} PHASE 5 ECOSYSTEM TESTS PASSED!`);
console.log("==================================================================");
if (failed > 0) process.exit(1);
