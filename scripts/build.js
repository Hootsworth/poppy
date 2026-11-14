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

console.log(`Build complete! Output written to index.html, poppy.html, and dist/index.html (${bundle.length} bytes). Verified exactly 1 script closing tag.`);
