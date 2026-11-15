const assert = require("assert");
const fs = require("fs");
const path = require("path");
const os = require("os");

console.log("==================================================================");
console.log("POPPY PHASE 3: DEEP E2E PERSISTENCE & EXECUTION VERIFICATION");
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

let step = 0;
function test(name, fn) {
  step++;
  process.stdout.write(`[Step ${step}] ${name}... `);
  try {
    fn();
    console.log("PASSED");
  } catch (err) {
    console.log("FAILED");
    console.error(err);
    process.exit(1);
  }
}

async function testAsync(name, fn) {
  step++;
  process.stdout.write(`[Step ${step}] ${name}... `);
  try {
    await fn();
    console.log("PASSED");
  } catch (err) {
    console.log("FAILED");
    console.error(err);
    process.exit(1);
  }
}

async function runVerification() {
  // 1. Live Runtime Execution of Generated Cloudflare Worker Handler
  await testAsync("Live mock execution of Cloudflare Worker scheduled & fetch handlers", async () => {
    const workerGen = generateCloudflareWorkerCron("billing-sync", "0 0 * * *", "    env.executed = true;");
    const workerCode = workerGen.files["src/index.js"];

    const moduleObj = {};
    const wrappedCode = workerCode.replace("export default {", "moduleObj.default = {");
    
    // Evaluate module export
    const fn = new Function("moduleObj", "Response", "URL", wrappedCode);
    fn(moduleObj, Response, URL);

    const worker = moduleObj.default;
    assert.ok(typeof worker.scheduled === "function", "Must export scheduled handler");
    assert.ok(typeof worker.fetch === "function", "Must export fetch handler");

    // Test scheduled execution
    const mockEnv = { executed: false };
    const mockCtx = {
      promises: [],
      waitUntil(p) { this.promises.push(p); }
    };
    await worker.scheduled({ scheduledTime: Date.now() }, mockEnv, mockCtx);
    await Promise.all(mockCtx.promises);
    assert.strictEqual(mockEnv.executed, true, "Scheduled task must execute in background");

    // Test /health endpoint
    const healthReq = new Request("https://billing-sync.workers.dev/health");
    const healthRes = await worker.fetch(healthReq, mockEnv, mockCtx);
    assert.strictEqual(healthRes.status, 200);
    const healthJson = await healthRes.json();
    assert.strictEqual(healthJson.status, "healthy");
    assert.strictEqual(healthJson.worker, "billing-sync");

    // Test /run POST endpoint
    const runReq = new Request("https://billing-sync.workers.dev/run", { method: "POST" });
    const runRes = await worker.fetch(runReq, mockEnv, mockCtx);
    assert.strictEqual(runRes.status, 200);
    const runJson = await runRes.json();
    assert.strictEqual(runJson.status, "dispatched");
  });

  // 2. Live Runtime Execution of Generated Webhook Receiver
  await testAsync("Live execution of webhook handler with secret verification", async () => {
    const wh = generateWebhookHandler("order-events", "x-poppy-webhook-token");
    const wrappedCode = wh.code.replace("export default async function handleWebhook", "return async function handleWebhook");
    const handler = new Function("Response", wrappedCode)(Response);

    // 1. Rejects non-POST
    const getReq = new Request("https://api.poppy.dev/webhook", { method: "GET" });
    const getRes = await handler(getReq, "super-secret-key");
    assert.strictEqual(getRes.status, 405);

    // 2. Rejects unauthorized / wrong secret
    const badReq = new Request("https://api.poppy.dev/webhook", {
      method: "POST",
      headers: { "x-poppy-webhook-token": "wrong-secret", "content-type": "application/json" },
      body: JSON.stringify({ event: "order.created" })
    });
    const badRes = await handler(badReq, "super-secret-key");
    assert.strictEqual(badRes.status, 401);

    // 3. Accepts authorized request
    const goodReq = new Request("https://api.poppy.dev/webhook", {
      method: "POST",
      headers: { "x-poppy-webhook-token": "super-secret-key", "content-type": "application/json" },
      body: JSON.stringify({ event: "order.created", id: 1042 })
    });
    const goodRes = await handler(goodReq, "super-secret-key");
    assert.strictEqual(goodRes.status, 200);
    const goodJson = await goodRes.json();
    assert.strictEqual(goodJson.ok, true);
    assert.ok(goodJson.receivedAt > 0);
  });

  // 3. Agent Checkpointing & Crash Recovery Simulation
  test("Agent checkpointing & crash recovery simulation", () => {
    const jobId = "autonomous-researcher-01";
    clearAgentCheckpoint(jobId);

    // Simulate multi-step agent progress
    saveAgentCheckpoint(jobId, { step: 1, query: "Solar energy advancements", sources: ["source1.org"] });
    saveAgentCheckpoint(jobId, { step: 2, query: "Solar energy advancements", sources: ["source1.org", "source2.org"], summary: "High efficiency perovkites" });

    // Crash simulation
    const restored = loadAgentCheckpoint(jobId);
    assert.strictEqual(restored.jobId, jobId);
    assert.strictEqual(restored.state.step, 2);
    assert.strictEqual(restored.state.sources.length, 2);
    assert.strictEqual(restored.state.summary, "High efficiency perovkites");

    // Clean up
    clearAgentCheckpoint(jobId);
    assert.strictEqual(loadAgentCheckpoint(jobId), null);
  });

  // 4. Telemetry Heartbeat & Circuit Breaker Trips
  test("Telemetry heartbeats trip circuit breaker on cascading failures", () => {
    const svc = "crypto-price-feed";
    resetCircuitBreaker(svc);

    // 1 healthy run
    const h1 = recordExecutionHeartbeat(svc, "success", { message: "Price fetched", durationMs: 45 });
    assert.strictEqual(h1.circuitTripped, false);

    // 3 successive failures
    recordExecutionHeartbeat(svc, "failure", { message: "502 Bad Gateway" });
    recordExecutionHeartbeat(svc, "failure", { message: "503 Service Unavailable" });
    const tripped = recordExecutionHeartbeat(svc, "failure", { message: "Connection reset by peer" });

    assert.strictEqual(tripped.circuitTripped, true, "Circuit breaker must trip after threshold");
    assert.strictEqual(tripped.consecutiveFailures, 3);

    // Recovery
    resetCircuitBreaker(svc);
    const recovery = recordExecutionHeartbeat(svc, "success", { message: "Reconnected" });
    assert.strictEqual(recovery.circuitTripped, false);
    assert.strictEqual(recovery.consecutiveFailures, 0);
  });

  // 5. BYOI Database DDL Syntax & Migration Validity
  test("BYOI schema generators produce valid SQL tables with constraints", () => {
    // Supabase
    const pgSql = generateSupabaseSchema([
      {
        name: "projects",
        columns: [
          { name: "id", type: "uuid DEFAULT gen_random_uuid() PRIMARY KEY" },
          { name: "title", type: "text NOT NULL" }
        ]
      }
    ]);
    assert.ok(pgSql.includes("CREATE TABLE IF NOT EXISTS public.projects"));
    assert.ok(pgSql.includes("ENABLE ROW LEVEL SECURITY"));

    // D1
    const d1Sql = generateCloudflareD1Schema([
      {
        name: "messages",
        columns: [
          { name: "id", type: "INTEGER PRIMARY KEY AUTOINCREMENT" },
          { name: "text", type: "TEXT NOT NULL" }
        ]
      }
    ]);
    assert.ok(d1Sql.includes("CREATE TABLE IF NOT EXISTS messages"));
  });

  // 6. Production Bundle & Zero Emojis Verification
  test("Production bundles poppy.html and dist/index.html contain zero emojis and 1 script tag", () => {
    const poppyHtml = fs.readFileSync("poppy.html", "utf8");
    const distHtml = fs.readFileSync("dist/index.html", "utf8");

    assert.strictEqual(poppyHtml, distHtml);

    const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
    assert.strictEqual([...poppyHtml.matchAll(emojiRegex)].length, 0, "No emojis in poppy.html");

    const scriptTags = [...poppyHtml.matchAll(/<\/script>/gi)];
    assert.strictEqual(scriptTags.length, 1, "Exactly 1 script tag");
  });

  console.log("\n==================================================================");
  console.log(`ALL ${step}/${step} PHASE 3 E2E VERIFICATION CHECKS PASSED WITH ZERO ERRORS!`);
  console.log("==================================================================");
}

runVerification().catch(err => {
  console.error("Verification error:", err);
  process.exit(1);
});
