#!/usr/bin/env node
/* Usage: node eval.js <dir-of-html> [--min 0.8] [--json results.json]
   Needs: npm i playwright && npx playwright install chromium
   Export each build from Poppy as <name>.html into the dir (names should match prompts.json ids). */
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const { initProbe, runProbe, scoreProbe, buildRepairPrompt } = require("./verify-probe.js");

const args = process.argv.slice(2);
const dir = args.find(a => !a.startsWith("--")) || "fixtures";
const opt = n => { const i = args.indexOf("--" + n); return i > -1 ? args[i + 1] : null; };
const minRate = parseFloat(opt("min") || "0.8");

(async () => {
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".html")).sort();
  const browser = await chromium.launch();
  const rows = [];
  for (const f of files) {
    const page = await (await browser.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
    await page.addInitScript(initProbe);
    let res;
    try {
      await page.goto("file://" + path.resolve(dir, f), { waitUntil: "load", timeout: 8000 });
      res = await page.evaluate(runProbe, { settle: 400 });
    } catch (e) {
      res = { loadErrors: ["harness: " + e.message.split("\n")[0]], clickErrors: [], buttons: { total: 0, dead: [] }, canvas: { present: false }, render: { textLen: 0, visual: false, placeholder: false } };
    }
    const score = scoreProbe(res);
    rows.push({ file: f, ...score, result: res, repairPrompt: buildRepairPrompt(res) });
    await page.context().close();
  }
  await browser.close();

  const mark = b => (b ? "ok " : "FAIL");
  console.log("\nfile".padEnd(28) + "load  render  interact  dead%");
  for (const r of rows) console.log(r.file.padEnd(27) + mark(r.load) + "   " + mark(r.render) + "    " + mark(r.interaction) + "      " + Math.round(r.deadRatio * 100) + "%" + (r.pass ? "" : "   <-- failing"));
  for (const r of rows.filter(r => !r.pass)) console.log("\n[" + r.file + "]\n" + r.repairPrompt);
  const rate = rows.filter(r => r.pass).length / (rows.length || 1);
  console.log("\nPASS RATE: " + Math.round(rate * 100) + "% (" + rows.filter(r => r.pass).length + "/" + rows.length + ")  threshold " + Math.round(minRate * 100) + "%");
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(rows, null, 2));
  process.exit(rate >= minRate ? 0 : 1);
})();
