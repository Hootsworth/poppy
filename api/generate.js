// Serverless AI Proxy Gateway (Vercel / Netlify / Node.js)
// Enables Poppy users to make up to 3 free generations per week using a backend Meta API key
// configured via GitHub Secrets / Environment Variables:
// - POPPY_AI_KEY or META_API_KEY: Meta API Key
// - META_MODEL: Default is "Muse Spark 1.3 Contributor"
// - META_BASE_URL: (Optional) Meta endpoint base URL (default: "https://api.llama.com/compat/v1")

const crypto = require("crypto");

// In-memory cache for IP rate-limiting (keyed by client SHA256 hash)
const weeklyUsage = new Map();

function getWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function getClientIdentifier(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (forwarded ? forwarded.split(",")[0] : req.socket?.remoteAddress || "127.0.0.1").trim();
  const ua = req.headers["user-agent"] || "";
  // Hash IP + UA for privacy and consistent rate limiting
  return crypto.createHash("sha256").update(ip + "::" + ua).digest("hex").slice(0, 24);
}

module.exports = async function handler(req, res) {
  // 1. CORS Preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed. POST required." }));
    return;
  }

  // 2. Resolve Meta API Key from GitHub Secrets / Environment
  const apiKey = process.env.META_API_KEY || process.env.POPPY_AI_KEY;
  if (!apiKey) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      error: "Backend Meta API key is not configured. Please add META_API_KEY (or POPPY_AI_KEY) to your GitHub Secrets / environment, or add your own key in Switch AI."
    }));
    return;
  }

  const model = process.env.META_MODEL || "Muse Spark 1.3 Contributor";
  const baseUrl = (process.env.META_BASE_URL || "https://api.llama.com/compat/v1").replace(/\/+$/, "");

  // 3. Enforce Strict Weekly Limit (3 Generations per Week per Client)
  const currentWeek = getWeekKey();
  const clientId = getClientIdentifier(req);
  const usageRecord = weeklyUsage.get(clientId) || { week: currentWeek, count: 0 };

  // Reset counter when week flips
  if (usageRecord.week !== currentWeek) {
    usageRecord.week = currentWeek;
    usageRecord.count = 0;
  }

  const MAX_WEEKLY_BUILDS = 3;
  if (usageRecord.count >= MAX_WEEKLY_BUILDS) {
    res.statusCode = 429;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("X-RateLimit-Limit", String(MAX_WEEKLY_BUILDS));
    res.setHeader("X-RateLimit-Remaining", "0");
    res.end(JSON.stringify({
      error: `Weekly free limit reached (${MAX_WEEKLY_BUILDS}/${MAX_WEEKLY_BUILDS} builds used this week). Please add your own API key in Switch AI to continue building unlimited projects!`,
      limit: MAX_WEEKLY_BUILDS,
      remaining: 0,
      week: currentWeek
    }));
    return;
  }

  // 4. Parse request payload
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch {}
  } else if (!body) {
    body = await new Promise(resolve => {
      let data = "";
      req.on("data", chunk => data += chunk);
      req.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { resolve({}); }
      });
    });
  }

  const messages = body.messages || [];
  const system = body.system || "You are an expert web software engineer. Create complete, working single-file HTML applications.";

  // Increment usage count
  usageRecord.count += 1;
  weeklyUsage.set(clientId, usageRecord);

  const remaining = MAX_WEEKLY_BUILDS - usageRecord.count;

  // 5. Connect to Meta API
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-RateLimit-Limit", String(MAX_WEEKLY_BUILDS));
  res.setHeader("X-RateLimit-Remaining", String(remaining));

  try {
    const metaPayload = {
      model,
      stream: true,
      max_tokens: 16000,
      messages: [
        { role: "system", content: system },
        ...messages.map(m => ({ role: m.role === "model" ? "assistant" : m.role, content: m.content }))
      ]
    };

    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(metaPayload)
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      res.write(`data: ${JSON.stringify({ error: "Meta API returned error: " + errText })}\n\n`);
      res.end();
      return;
    }

    // Stream SSE directly to client
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      res.write(text);
    }
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "Meta proxy connection error: " + err.message })}\n\n`);
    res.end();
  }
};

module.exports.getWeekKey = getWeekKey;
module.exports.weeklyUsage = weeklyUsage;
