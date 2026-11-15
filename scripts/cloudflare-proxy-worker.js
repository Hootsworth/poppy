// Poppy Free Tier Proxy - Cloudflare Worker
// Enforces 3 generations per week per client IP using Cloudflare Workers & Meta API
// Configure secret in Cloudflare: wrangler secret put META_API_KEY

export default {
  async fetch(request, env) {
    // 1. CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed. POST required." }), {
        status: 405,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const apiKey = env.META_API_KEY || env.POPPY_AI_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: "META_API_KEY secret is not set in Cloudflare Worker. Add it with wrangler secret put META_API_KEY."
      }), {
        status: 503,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const model = env.META_MODEL || "muse-spark-1.3-contributor";
    const baseUrl = (env.META_BASE_URL || "https://api.meta.ai/v1").replace(/\/+$/, "");

    // 2. Client Weekly Quota (3 Generations / Week)
    const clientIp = request.headers.get("cf-connecting-ip") || "anonymous";
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    const weekKey = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;

    const quotaKey = `usage:${clientIp}:${weekKey}`;
    let currentUsage = 0;
    if (env.POPPY_KV) {
      const val = await env.POPPY_KV.get(quotaKey);
      currentUsage = val ? parseInt(val, 10) : 0;
    }

    const MAX_WEEKLY = 3;
    if (currentUsage >= MAX_WEEKLY) {
      return new Response(JSON.stringify({
        error: `Weekly free limit reached (${MAX_WEEKLY}/${MAX_WEEKLY} builds used this week). Please add your own API key in Switch AI to continue unlimited builds!`,
        limit: MAX_WEEKLY,
        remaining: 0
      }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "X-RateLimit-Limit": String(MAX_WEEKLY),
          "X-RateLimit-Remaining": "0"
        }
      });
    }

    if (env.POPPY_KV) {
      await env.POPPY_KV.put(quotaKey, String(currentUsage + 1), { expirationTtl: 604800 });
    }

    // 3. Forward to Meta API
    const body = await request.json();
    const messages = body.messages || [];
    const system = body.system || "You are an expert web software engineer.";

    const metaPayload = {
      model,
      stream: true,
      max_tokens: 16000,
      messages: [
        { role: "developer", content: system },
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

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
        "X-RateLimit-Limit": String(MAX_WEEKLY),
        "X-RateLimit-Remaining": String(Math.max(0, MAX_WEEKLY - (currentUsage + 1)))
      }
    });
  }
};
