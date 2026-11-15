const assert = require("assert");
const fs = require("fs");

console.log("==================================================================");
console.log("POPPY PHASE 3: PERSISTENT SOFTWARE TEST SUITE (POPPY 3.5)");
console.log("Unattended Cron Runners, BYOI Databases, Checkpoints, Telemetry");
console.log("==================================================================\n");

const {
  isValidCronExpression,
  generateGitHubActionsCron,
  generateCloudflareWorkerCron,
  generateWebhookHandler,
  saveAgentCheckpoint,
  loadAgentCheckpoint,
  clearAgentCheckpoint,
  recordExecutionHeartbeat,
  getHeartbeatLogs,
  resetCircuitBreaker,
  generateSupabaseSchema,
  generateCloudflareD1Schema,
  generateOpenApiSpec
} = require("./src/js/engine/persistent.js");

let totalTests = 0;
let passedTests = 0;

async function it(desc, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`PASS [${totalTests}]: ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`FAIL [${totalTests}]: ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

async function runAll() {
  // -------------------------------------------------------------
  // TEST SUITE 1: Cron Expression Validation & Cloud Runners
  // -------------------------------------------------------------
  console.log("--- Suite 1: Cron Expression Validation & Cloud Runners ---");

  await it("isValidCronExpression correctly validates standard and descriptor cron expressions", () => {
    assert.strictEqual(isValidCronExpression("0 9 * * 1-5"), true);
    assert.strictEqual(isValidCronExpression("*/15 * * * *"), true);
    assert.strictEqual(isValidCronExpression("0 0 1 * *"), true);
    assert.strictEqual(isValidCronExpression("@daily"), true);
    assert.strictEqual(isValidCronExpression("@hourly"), true);

    // Invalid expressions
    assert.strictEqual(isValidCronExpression("not-a-cron"), false);
    assert.strictEqual(isValidCronExpression("0 9 *"), false); // 3 parts
    assert.strictEqual(isValidCronExpression("0 9 * * 1 2"), false); // 6 parts
  });

  await it("generateGitHubActionsCron generates unattended cloud workflow with secret injection", () => {
    const job = generateGitHubActionsCron(
      "Daily Market Digest",
      "0 8 * * 1-5",
      "console.log('Running daily digest...');",
      ["OPENAI_API_KEY", "DATABASE_URL"]
    );

    assert.strictEqual(job.slug, "daily-market-digest");
    assert.strictEqual(job.cron, "0 8 * * 1-5");
    assert.strictEqual(job.filename, ".github/workflows/daily-market-digest-cron.yml");

    assert.ok(job.content.includes("name: Daily Market Digest"));
    assert.ok(job.content.includes("- cron: '0 8 * * 1-5'"));
    assert.ok(job.content.includes("workflow_dispatch:"));
    assert.ok(job.content.includes("OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}"));
    assert.ok(job.content.includes("DATABASE_URL: ${{ secrets.DATABASE_URL }}"));
  });

  await it("generateCloudflareWorkerCron generates edge scheduled cron handler and config", () => {
    const worker = generateCloudflareWorkerCron("sync-bot", "*/30 * * * *");
    assert.strictEqual(worker.slug, "sync-bot");
    assert.strictEqual(worker.cron, "*/30 * * * *");

    assert.ok(worker.files["wrangler.toml"].includes('crons = ["*/30 * * * *"]'));
    assert.ok(worker.files["src/index.js"].includes("async scheduled(event, env, ctx)"));
    assert.ok(worker.files["src/index.js"].includes('url.pathname === "/health"'));

    const pkg = JSON.parse(worker.files["package.json"]);
    assert.strictEqual(pkg.name, "sync-bot");
    assert.strictEqual(pkg.type, "module");
  });

  await it("generateWebhookHandler generates secret-verified HTTP receiver", () => {
    const wh = generateWebhookHandler("stripe-ingest", "x-custom-secret");
    assert.strictEqual(wh.slug, "stripe-ingest");
    assert.strictEqual(wh.secretHeader, "x-custom-secret");
    assert.ok(wh.code.includes('request.headers.get("x-custom-secret")'));
    assert.ok(wh.code.includes("Unauthorized: Invalid webhook secret"));
  });

  // -------------------------------------------------------------
  // TEST SUITE 2: Agent State Checkpointing & Telemetry
  // -------------------------------------------------------------
  console.log("\n--- Suite 2: Agent State Checkpointing & Telemetry ---");

  await it("saveAgentCheckpoint and loadAgentCheckpoint preserve deep state snapshots", () => {
    const state = { step: 3, memory: ["recordA", "recordB"], completed: false };
    const saved = saveAgentCheckpoint("job-101", state);

    assert.strictEqual(saved.jobId, "job-101");
    assert.ok(saved.timestamp > 0);
    assert.deepStrictEqual(saved.state, state);

    // Deep copy verification (mutating original does not corrupt checkpoint)
    state.memory.push("recordC");
    const loaded = loadAgentCheckpoint("job-101");
    assert.strictEqual(loaded.state.memory.length, 2);

    // Clear
    assert.strictEqual(clearAgentCheckpoint("job-101"), true);
    assert.strictEqual(loadAgentCheckpoint("job-101"), null);
  });

  await it("recordExecutionHeartbeat logs telemetry and trips circuit breaker on repeat failures", () => {
    resetCircuitBreaker("test-service");

    // Success 1
    const hb1 = recordExecutionHeartbeat("test-service", "success", { message: "Task 1 complete", durationMs: 120 });
    assert.strictEqual(hb1.circuitTripped, false);
    assert.strictEqual(hb1.consecutiveFailures, 0);

    // Failure 1
    const f1 = recordExecutionHeartbeat("test-service", "failure", { message: "Network timeout" });
    assert.strictEqual(f1.circuitTripped, false);
    assert.strictEqual(f1.consecutiveFailures, 1);

    // Failure 2
    const f2 = recordExecutionHeartbeat("test-service", "failure", { message: "Auth expired" });
    assert.strictEqual(f2.circuitTripped, false);
    assert.strictEqual(f2.consecutiveFailures, 2);

    // Failure 3 (trips circuit breaker)
    const f3 = recordExecutionHeartbeat("test-service", "failure", { message: "Rate limit exceeded" });
    assert.strictEqual(f3.circuitTripped, true, "Circuit breaker must trip after 3 consecutive failures");
    assert.strictEqual(f3.consecutiveFailures, 3);

    // Query logs
    const logs = getHeartbeatLogs("test-service", 10);
    assert.strictEqual(logs.length, 4);

    // Reset circuit breaker
    resetCircuitBreaker("test-service");
    const recovered = recordExecutionHeartbeat("test-service", "success", { message: "Service restored" });
    assert.strictEqual(recovered.circuitTripped, false);
    assert.strictEqual(recovered.consecutiveFailures, 0);
  });

  // -------------------------------------------------------------
  // TEST SUITE 3: BYOI Database Provisioning & OpenAPI Spec
  // -------------------------------------------------------------
  console.log("\n--- Suite 3: BYOI Database Provisioning & OpenAPI Spec ---");

  await it("generateSupabaseSchema outputs production Postgres schema with RLS", () => {
    const tables = [
      {
        name: "customers",
        columns: [
          { name: "id", type: "uuid DEFAULT gen_random_uuid() PRIMARY KEY" },
          { name: "email", type: "text UNIQUE NOT NULL" },
          { name: "created_at", type: "timestamptz DEFAULT now() NOT NULL" }
        ]
      }
    ];

    const sql = generateSupabaseSchema(tables);
    assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS public.customers"));
    assert.ok(sql.includes("email text UNIQUE NOT NULL"));
    assert.ok(sql.includes("ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;"));
    assert.ok(sql.includes("CREATE POLICY \"Users can access their own data\""));
  });

  await it("generateCloudflareD1Schema outputs valid edge SQLite schema", () => {
    const tables = [
      {
        name: "events",
        columns: [
          { name: "id", type: "TEXT PRIMARY KEY" },
          { name: "event_name", type: "TEXT NOT NULL" },
          { name: "timestamp", type: "INTEGER NOT NULL" }
        ]
      }
    ];

    const sql = generateCloudflareD1Schema(tables);
    assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS events"));
    assert.ok(sql.includes("event_name TEXT NOT NULL"));
  });

  await it("generateOpenApiSpec generates valid OpenAPI 3.1 specification", () => {
    const spec = generateOpenApiSpec("Inventory Service", [
      { path: "/api/items", method: "get", summary: "Fetch inventory items" },
      { path: "/api/items", method: "post", summary: "Add new item" }
    ]);

    assert.strictEqual(spec.openapi, "3.1.0");
    assert.strictEqual(spec.info.title, "Inventory Service");
    assert.ok(spec.paths["/api/items"].get);
    assert.ok(spec.paths["/api/items"].post);
  });

  // -------------------------------------------------------------
  // TEST SUITE 4: UI & Production Bundle Conformance
  // -------------------------------------------------------------
  console.log("\n--- Suite 4: UI & Production Bundle Conformance ---");

  await it("poppy.html contains all Phase 3 persistent elements and zero emojis", () => {
    const html = fs.readFileSync("poppy.html", "utf8");

    // UI elements
    assert.ok(html.includes('id="persistCloudDrawer"'), "persistCloudDrawer must exist");
    assert.ok(html.includes('id="persistHeartbeatDot"'), "persistHeartbeatDot must exist");
    assert.ok(html.includes('id="btnExportGhCron"'), "btnExportGhCron must exist");
    assert.ok(html.includes('id="btnExportCfWorker"'), "btnExportCfWorker must exist");
    assert.ok(html.includes('id="btnExportWebhook"'), "btnExportWebhook must exist");
    assert.ok(html.includes('id="persistTerminalLogs"'), "persistTerminalLogs must exist");

    // Zero emojis check
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
    const emojis = [...html.matchAll(emojiRegex)];
    assert.strictEqual(emojis.length, 0, "Zero emojis across bundle");

    // Exactly 1 script closing tag
    const scriptTags = [...html.matchAll(/<\/script>/gi)];
    assert.strictEqual(scriptTags.length, 1, "Exactly 1 closing script tag in HTML");
  });

  console.log("\n==================================================================");
  console.log(`ALL ${passedTests}/${totalTests} PHASE 3 PERSISTENCE TESTS PASSED!`);
  console.log("==================================================================");
}

runAll().catch(err => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
