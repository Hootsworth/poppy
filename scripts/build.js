const fs = require("fs");
const path = require("path");

function readFile(p) {
  return fs.readFileSync(path.join(__dirname, "..", p), "utf8").trim();
}

console.log("Building Poppy from modular src/ files...");

// 1. Gather CSS
const cssFiles = [
  "src/css/base.css",
  "src/css/components.css",
  "src/css/studio.css",
  "src/css/ecosystem.css"
];
const css = cssFiles.map(readFile).join("\n\n");

// 2. Gather HTML Components
const htmlFiles = [
  "src/components/symbols.html",
  "src/components/home.html",
  "src/components/stage.html",
  "src/components/dialogs/key.html",
  "src/components/dialogs/compare.html",
  "src/components/dialogs/inspector.html",
  "src/components/dialogs/blocks.html",
  "src/components/dialogs/db-studio.html",
  "src/components/dialogs/room.html",
  "src/components/dialogs/automations.html",
  "src/components/dialogs/ecosystem.html",
  "src/components/dialogs/assets.html",
  "src/components/dialogs/advanced.html",
  "src/components/dialogs/extras.html"
];
const html = htmlFiles.map(readFile).join("\n\n");

// 3. Gather JavaScript Modules
const jsFiles = [
  "src/js/core/core-engine.js",
  "src/js/tests/selftest.js",
  "src/js/engine/exporters.js",
  "src/js/engine/multi-agent.js",
  "src/js/modules/inspector.js",
  "src/js/modules/db-studio.js",
  "src/js/templates/marketplace.js",
  "src/js/modules/automations.js",
  "src/js/app.js"
];
const js = jsFiles.map(readFile).join("\n\n");

// 4. Assemble HTML Template
const bundle = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Poppy</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' rx='44' fill='%23f23d2a'/%3E%3Cg fill='%23ffe6dc'%3E%3Cellipse cx='100' cy='58' rx='36' ry='42'/%3E%3Cellipse cx='142' cy='100' rx='42' ry='36'/%3E%3Cellipse cx='100' cy='142' rx='36' ry='42'/%3E%3Cellipse cx='58' cy='100' rx='42' ry='36'/%3E%3C/g%3E%3Ccircle cx='100' cy='100' r='14' fill='%232a0d16'/%3E%3C/svg%3E">
<link rel="alternate icon" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAWElEQVR42mP8z8BQDwAEhQGAhKmMIQBDvQ5m/P///1+YGEgywmgGEGMjNsb/j//jC3FZh8v1mFwNy3p0l2NzCSzrcbmEmKDH5w5iwhiXu4h1DTp2A7EZjwcA7r9y1a3s2k8AAAAASUVORK5CYII=">
<style>
${css}
</style>
</head>
<body>
${html}

<script>
${js}
</script>
</body>
</html>
`;

// 5. Validate that host script does not terminate prematurely
const scriptCloseMatches = [...bundle.matchAll(/<\/script>/gi)];
if (scriptCloseMatches.length !== 1) {
  throw new Error(`CRITICAL BUILD ERROR: Expected exactly 1 </script> tag in poppy.html, but found ${scriptCloseMatches.length}! A JS string contains an unescaped </script> tag.`);
}

// 6. Output
fs.writeFileSync(path.join(__dirname, "..", "index.html"), bundle, "utf8");
fs.writeFileSync(path.join(__dirname, "..", "poppy.html"), bundle, "utf8");
fs.writeFileSync(path.join(__dirname, "..", "dist", "index.html"), bundle, "utf8");

// 7. Write static favicon.ico
const icoBuf = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAWElEQVR42mP8z8BQDwAEhQGAhKmMIQBDvQ5m/P///1+YGEgywmgGEGMjNsb/j//jC3FZh8v1mFwNy3p0l2NzCSzrcbmEmKDH5w5iwhiXu4h1DTp2A7EZjwcA7r9y1a3s2k8AAAAASUVORK5CYII=", "base64");
fs.writeFileSync(path.join(__dirname, "..", "favicon.ico"), icoBuf);
fs.writeFileSync(path.join(__dirname, "..", "dist", "favicon.ico"), icoBuf);

console.log(`Build complete! Output written to index.html, poppy.html, dist/index.html, and favicon.ico (${bundle.length} bytes). Verified exactly 1 script closing tag.`);
