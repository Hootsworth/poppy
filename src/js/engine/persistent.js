/* ===== Poppy Persistent Software Engine (Poppy 3.5) =====
   Provides unattended scheduled runners (GitHub Actions & Cloudflare Workers),
   BYOI cloud database provisioning (Supabase, D1, Neon), Webhook listeners,
   agent state checkpoints, and execution heartbeat telemetry.
============================================================================= */

/**
 * Validates standard 5-part cron expressions (e.g. "0 9 * * 1-5" or "@daily").
 */
function isValidCronExpression(expr = "") {
  const trimmed = expr.trim();
  if (/^@(daily|midnight|hourly|weekly|monthly|yearly|annually)$/i.test(trimmed)) return true;
  const parts = trimmed.split(/\s+/);
  if (parts.length !== 5) return false;
  // Regex check for minute, hour, day-of-month, month, day-of-week
  const cronPartRe = /^[\*0-9,\-\/]+$/;
  return parts.every(p => cronPartRe.test(p));
}

/**
 * Generates an unattended, free, cloud-native GitHub Actions cron workflow.
 * Executes on schedule even when the user's browser, computer, or phone is offline.
 */
function generateGitHubActionsCron(jobName, cronExpr = "0 9 * * 1-5", taskScript = "", envSecrets = []) {
  const cleanName = (jobName || "Poppy Scheduled Job").replace(/[^a-zA-Z0-9 _-]/g, "").trim();
  const slug = cleanName.toLowerCase().replace(/\s+/g, "-");
  const validCron = isValidCronExpression(cronExpr) ? cronExpr.trim() : "0 9 * * 1-5";

  const secretsYaml = envSecrets.map(s => `          ${s}: \${{ secrets.${s} }}`).join("\n");
  const envBlock = envSecrets.length ? `\n        env:\n${secretsYaml}` : "";

  const yaml = `name: ${cleanName}

on:
  schedule:
    # Triggered automatically via GitHub Actions runner
    - cron: '${validCron}'
  workflow_dispatch:
    # Allows manual execution on demand from GitHub UI

jobs:
  run-scheduled-job:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js runtime
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Execute scheduled workflow
        run: |
          node -e "
${taskScript.replace(/"/g, '\\"')}
          "
${envBlock}
`;

  return {
    filename: `.github/workflows/${slug}-cron.yml`,
    content: yaml,
    slug,
    cron: validCron
  };
}

/**
 * Generates a Cloudflare Worker scheduled cron handler and wrangler.toml configuration.
 */
function generateCloudflareWorkerCron(workerName, cronExpr = "0 * * * *", workerHandler = "") {
  const cleanName = (workerName || "poppy-cron-worker").toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const validCron = isValidCronExpression(cronExpr) ? cronExpr.trim() : "0 * * * *";

  const wranglerToml = `name = "${cleanName}"
main = "src/index.js"
compatibility_date = "2024-04-01"

[triggers]
crons = ["${validCron}"]
`;

  const workerJs = `// Cloudflare Worker Scheduled Cron Handler
export default {
  // 1. Scheduled cron trigger (unattended background runner)
  async scheduled(event, env, ctx) {
    console.log(\`[${cleanName}] Scheduled execution triggered at: \${new Date(event.scheduledTime).toISOString()}\`);
    ctx.waitUntil(handleScheduledTask(env));
  },

  // 2. HTTP listener for webhook and on-demand status probes
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "healthy", worker: "${cleanName}", timestamp: Date.now() }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/run" && request.method === "POST") {
      ctx.waitUntil(handleScheduledTask(env));
      return new Response(JSON.stringify({ status: "dispatched", message: "Task execution started in background" }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response("Not Found", { status: 404 });
  }
};

async function handleScheduledTask(env) {
  try {
${workerHandler ? workerHandler : `    console.log("Executing background workflow...");\n    // Automated workflow logic here`}
    console.log(\`[${cleanName}] Scheduled task completed successfully.\`);
  } catch (err) {
    console.error(\`[${cleanName}] Execution error:\`, err);
  }
}
`;

  return {
    slug: cleanName,
    cron: validCron,
    files: {
      "wrangler.toml": wranglerToml,
      "src/index.js": workerJs,
      "package.json": JSON.stringify({
        name: cleanName,
        version: "1.0.0",
        type: "module",
        scripts: { deploy: "wrangler deploy", dev: "wrangler dev" }
      }, null, 2),
      "README.md": `# ${cleanName} (Cloudflare Worker Cron)

## Deployment
\`\`\`bash
npm install -g wrangler
wrangler login
wrangler deploy
\`\`\`
`
    }
  };
}

/**
 * Generates an authenticated HTTP Webhook endpoint receiver.
 */
function generateWebhookHandler(endpointName, secretHeader = "x-poppy-secret") {
  const clean = endpointName.toLowerCase().replace(/[^a-z0-9_-]/g, "-") || "webhook-handler";

  const code = `// Webhook Receiver with Secret Verification
export default async function handleWebhook(request, expectedSecret) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const clientSecret = request.headers.get("${secretHeader}");
  if (!clientSecret || clientSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized: Invalid webhook secret" }), { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: "Malformed JSON payload" }), { status: 400 });
  }

  console.log("Webhook payload received:", payload);
  return new Response(JSON.stringify({ ok: true, receivedAt: Date.now() }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
`;

  return { slug: clean, code, secretHeader };
}

/**
 * Agent State Checkpointing Engine.
 * Serializes and restores execution state and memory checkpoints.
 */
const CHECKPOINT_STORE = new Map();

function saveAgentCheckpoint(jobId, stateData = {}) {
  if (!jobId) throw new Error("jobId is required for checkpointing");
  const checkpoint = {
    jobId,
    timestamp: Date.now(),
    state: JSON.parse(JSON.stringify(stateData)),
    version: 1
  };
  CHECKPOINT_STORE.set(jobId, checkpoint);
  return checkpoint;
}

function loadAgentCheckpoint(jobId) {
  if (!jobId) return null;
  const cp = CHECKPOINT_STORE.get(jobId);
  return cp ? JSON.parse(JSON.stringify(cp)) : null;
}

function clearAgentCheckpoint(jobId) {
  return CHECKPOINT_STORE.delete(jobId);
}

/**
 * Heartbeat & Execution Telemetry Engine.
 * Tracks job health, prevents infinite loops via circuit breaker.
 */
const HEARTBEAT_LOGS = [];
const CIRCUIT_BREAKER_THRESHOLDS = { maxConsecutiveFailures: 3 };
const JOB_FAILURE_COUNTERS = new Map();

function recordExecutionHeartbeat(jobId, status = "success", details = {}) {
  const now = Date.now();
  const entry = {
    id: "hb_" + now + "_" + Math.random().toString(36).slice(2, 6),
    jobId,
    timestamp: now,
    status, // "success" | "warning" | "failure"
    durationMs: details.durationMs || 0,
    message: details.message || (status === "success" ? "Execution healthy" : "Failure encountered"),
    meta: details.meta || {}
  };

  HEARTBEAT_LOGS.unshift(entry);
  if (HEARTBEAT_LOGS.length > 200) HEARTBEAT_LOGS.pop();

  // Track circuit breaker
  let currentFailures = JOB_FAILURE_COUNTERS.get(jobId) || 0;
  if (status === "failure") {
    currentFailures++;
    JOB_FAILURE_COUNTERS.set(jobId, currentFailures);
  } else if (status === "success") {
    JOB_FAILURE_COUNTERS.set(jobId, 0);
  }

  const isTripped = currentFailures >= CIRCUIT_BREAKER_THRESHOLDS.maxConsecutiveFailures;

  return {
    entry,
    circuitTripped: isTripped,
    consecutiveFailures: currentFailures
  };
}

function getHeartbeatLogs(jobId = null, limit = 50) {
  if (!jobId) return HEARTBEAT_LOGS.slice(0, limit);
  return HEARTBEAT_LOGS.filter(l => l.jobId === jobId).slice(0, limit);
}

function resetCircuitBreaker(jobId) {
  JOB_FAILURE_COUNTERS.set(jobId, 0);
  return true;
}

/**
 * BYOI (Bring Your Own Infrastructure) Database Schema Provisioner.
 * Generates production DDL for Supabase (Postgres) and Cloudflare D1 (SQLite).
 */
function generateSupabaseSchema(tables = []) {
  if (!tables.length) {
    tables = [
      {
        name: "records",
        columns: [
          { name: "id", type: "uuid DEFAULT gen_random_uuid() PRIMARY KEY" },
          { name: "created_at", type: "timestamptz DEFAULT now() NOT NULL" },
          { name: "data", type: "jsonb NOT NULL" }
        ]
      }
    ];
  }

  let sql = `-- Supabase Postgres Provisioning Schema\n-- Generated by Poppy Universal Creation Platform\n\n`;

  tables.forEach(t => {
    sql += `CREATE TABLE IF NOT EXISTS public.${t.name} (\n`;
    const colDefs = t.columns.map(c => `  ${c.name} ${c.type}`).join(",\n");
    sql += colDefs + "\n);\n\n";

    // Enable Row Level Security (RLS) by default
    sql += `ALTER TABLE public.${t.name} ENABLE ROW LEVEL SECURITY;\n`;
    sql += `CREATE POLICY "Users can access their own data" ON public.${t.name} FOR ALL USING (auth.uid() IS NOT NULL);\n\n`;
  });

  return sql;
}

function generateCloudflareD1Schema(tables = []) {
  if (!tables.length) {
    tables = [
      {
        name: "records",
        columns: [
          { name: "id", type: "TEXT PRIMARY KEY" },
          { name: "created_at", type: "INTEGER NOT NULL" },
          { name: "data", type: "TEXT NOT NULL" }
        ]
      }
    ];
  }

  let sql = `-- Cloudflare D1 (SQLite) Provisioning Schema\n-- Execute with: wrangler d1 execute <db-name> --file=schema.sql\n\n`;

  tables.forEach(t => {
    sql += `CREATE TABLE IF NOT EXISTS ${t.name} (\n`;
    const colDefs = t.columns.map(c => `  ${c.name} ${c.type}`).join(",\n");
    sql += colDefs + "\n);\n\n";
  });

  return sql;
}

/**
 * Declarative OpenAPI 3.1 Spec Generator for Generated Endpoints.
 */
function generateOpenApiSpec(serviceName, endpoints = []) {
  const name = serviceName || "Poppy Service API";
  const paths = {};

  if (!endpoints.length) {
    endpoints = [
      { path: "/api/health", method: "get", summary: "Health check probe" },
      { path: "/api/records", method: "post", summary: "Ingest record data" }
    ];
  }

  endpoints.forEach(ep => {
    const p = ep.path.startsWith("/") ? ep.path : "/" + ep.path;
    const m = (ep.method || "get").toLowerCase();
    if (!paths[p]) paths[p] = {};
    paths[p][m] = {
      summary: ep.summary || "Endpoint handler",
      responses: {
        "200": {
          description: "Successful response",
          content: {
            "application/json": {
              schema: { type: "object" }
            }
          }
        }
      }
    };
  });

  return {
    openapi: "3.1.0",
    info: {
      title: name,
      version: "1.0.0",
      description: "Generated by Poppy Universal Studio"
    },
    paths
  };
}

if (typeof module !== "undefined") {
  module.exports = {
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
  };
}

if (typeof window !== "undefined") {
  window.PERSISTENT_ENGINE = {
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
  };
}
