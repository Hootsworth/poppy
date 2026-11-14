const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const html = fs.readFileSync("poppy.html", "utf8");

// 1. Script compilation
const hostScriptStart = html.indexOf("<script>\nconst $ = s => document.querySelector(s);");
assert.ok(hostScriptStart > 0, "Host script tag exists");
const hostScriptEnd = html.lastIndexOf("</script>");
const code = html.slice(hostScriptStart + 9, hostScriptEnd);
new vm.Script(code, { filename: "poppy_host.js" });
console.log("Check 1 passed: Script compiles with 0 syntax errors.");

// 2. No emojis
const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
const emojis = [...html.matchAll(emojiRegex)];
assert.strictEqual(emojis.length, 0, "Zero emojis in entire file");
console.log("Check 2 passed: Zero emojis found.");

// 3. UI elements exist
assert.ok(html.includes('id="inspectBtn"'), "inspectBtn exists");
assert.ok(html.includes('id="blocksBtn"'), "blocksBtn exists");
assert.ok(html.includes('id="inspectMenuBtn"'), "inspectMenuBtn exists");
assert.ok(html.includes('id="blocksMenuBtn"'), "blocksMenuBtn exists");
assert.ok(html.includes('id="inspectDlg"'), "inspectDlg exists");
assert.ok(html.includes('id="blocksDlg"'), "blocksDlg exists");
assert.ok(html.includes('id="multiAgentOn"'), "multiAgentOn exists");
console.log("Check 3 passed: All Phase UI elements and dialogs exist in DOM.");

// 4. SDK has inspector handler
assert.ok(html.includes('m.cmd==="inspector"'), "SDK handles cmd inspector");
assert.ok(html.includes('m.cmd==="update_element_text"'), "SDK handles cmd update_element_text");
assert.ok(html.includes('m.cmd==="update_element_style"'), "SDK handles cmd update_element_style");
assert.ok(html.includes('m.cmd==="replace_element_html"'), "SDK handles cmd replace_element_html");
console.log("Check 4 passed: SDK bridge contains all inspector message handlers.");

// 5. Host handles element_selected
assert.ok(html.includes('m.cmdRes === "element_selected"'), "Host handles element_selected response");
console.log("Check 5 passed: Host listener handles element_selected.");

// 6. 64 selftests present
const selftestCode = html.slice(html.indexOf("async function selftest()"), html.indexOf("const SHIM ="));
const testMatches = [...selftestCode.matchAll(/(?<!\.)add\("([^"]+)"/g)];
assert.strictEqual(testMatches.length, 64, "64 selftests registered");
console.log(`Check 6 passed: Exactly ${testMatches.length} selftests registered.`);

// 7. Zero purple in base.css keyword styling
const baseCss = fs.readFileSync("src/css/base.css", "utf8");
assert.ok(!baseCss.includes('#a855f7') && !baseCss.includes('#8b5cf6'), "No purple in keyword gradient");
console.log("Check 7 passed: Zero purple in gradient CSS.");

console.log("\nALL ACCEPTANCE CRITERIA SATISFIED FOR POPPY 2.0!");
