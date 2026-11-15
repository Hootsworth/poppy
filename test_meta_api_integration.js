const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("=== Testing Meta Model API Integration & Cancel Button Decoupling ===");

// 1. Check core-engine.js provider configuration
const core = fs.readFileSync(path.join(__dirname, "src/js/core/core-engine.js"), "utf8");

assert.ok(core.includes('meta: {name: "Meta", model: "muse-spark-1.3-contributor"'), "core-engine PROVIDERS.meta must default to muse-spark-1.3-contributor");
assert.ok(core.includes("https://api.meta.ai/v1/chat/completions"), "core-engine must target official Meta Chat Completions endpoint");
assert.ok(core.includes("https://api.meta.ai/v1/models"), "core-engine must target official Meta Models endpoint");
assert.ok(!core.includes("api.llama.com/compat/v1/chat/completions"), "core-engine must not target deprecated api.llama.com endpoint");

// 2. Check model normalization in core-engine
assert.ok(core.includes("muse-spark-1.3-contributor"), "core-engine must normalize model name to muse-spark-1.3-contributor");

// 3. Check proxy gateway api/generate.js
const proxy = fs.readFileSync(path.join(__dirname, "api/generate.js"), "utf8");
assert.ok(proxy.includes("https://api.meta.ai/v1"), "api/generate.js must use https://api.meta.ai/v1 as base URL");
assert.ok(proxy.includes("muse-spark-1.3-contributor"), "api/generate.js must default to muse-spark-1.3-contributor");
assert.ok(proxy.includes('role: "developer"'), "api/generate.js must use developer role for system instructions");

// 4. Check Cloudflare proxy worker
const worker = fs.readFileSync(path.join(__dirname, "scripts/cloudflare-proxy-worker.js"), "utf8");
assert.ok(worker.includes("https://api.meta.ai/v1"), "cloudflare worker must default to https://api.meta.ai/v1");
assert.ok(worker.includes("muse-spark-1.3-contributor"), "cloudflare worker must default to muse-spark-1.3-contributor");
assert.ok(worker.includes('role: "developer"'), "cloudflare worker must use developer role");

// 5. Check Cancel button decoupling from .sp
const keyHtml = fs.readFileSync(path.join(__dirname, "src/components/dialogs/key.html"), "utf8");
assert.ok(!keyHtml.includes('class="link sp" id="closeDlg"'), "#closeDlg must not use class sp");
assert.ok(keyHtml.includes('id="closeDlg"'), "#closeDlg must exist");

const bundleHtml = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
assert.ok(!bundleHtml.includes('class="link sp" id="closeDlg"'), "bundled #closeDlg must not use class sp");

console.log("ALL META MODEL API & CANCEL BUTTON CHECKS PASSED!");
