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
  "src/css/onboarding.css",
  "src/css/studio.css",
  "src/css/ecosystem.css"
];
cssFiles.forEach(file => {
  const content = readFile(file);
  let open = 0;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "{") open++;
    else if (content[i] === "}") open--;
  }
  if (open !== 0) {
    throw new Error(`CRITICAL BUILD ERROR: CSS file ${file} has unbalanced braces (open: ${open})`);
  }
});
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
  "src/js/engine/verify-probe.js",
  "src/js/core/core-engine.js",
  "src/js/tests/selftest.js",
  "src/js/engine/exporters.js",
  "src/js/engine/archetypes.js",
  "src/js/engine/multi-agent.js",
  "src/js/modules/inspector.js",
  "src/js/modules/db-studio.js",
  "src/js/templates/marketplace.js",
  "src/js/modules/automations.js",
  "src/js/modules/onboarding.js",
  "src/js/app.js"
];
const js = jsFiles.map(readFile).join("\n\n");

const fav32B64 = fs.readFileSync(path.join(__dirname, "..", "favicon-32x32.png")).toString("base64");
const logoB64 = fs.readFileSync(path.join(__dirname, "..", "logo.png")).toString("base64");
const htmlWithLogo = html.replace(/src="logo\.png"/g, `src="data:image/png;base64,${logoB64}"`);

// 4. Assemble HTML Template
const bundle = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Poppy</title>
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
<link rel="icon" href="favicon.ico">
<link rel="icon" type="image/png" href="data:image/png;base64,${fav32B64}">
<style>
${css}
</style>
</head>
<body>
${htmlWithLogo}

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

// 7. Ensure favicon.ico and logo assets are copied to dist
if (fs.existsSync(path.join(__dirname, "..", "favicon.ico"))) {
  fs.copyFileSync(path.join(__dirname, "..", "favicon.ico"), path.join(__dirname, "..", "dist", "favicon.ico"));
}
if (fs.existsSync(path.join(__dirname, "..", "favicon-32x32.png"))) {
  fs.copyFileSync(path.join(__dirname, "..", "favicon-32x32.png"), path.join(__dirname, "..", "dist", "favicon-32x32.png"));
}
if (fs.existsSync(path.join(__dirname, "..", "favicon-16x16.png"))) {
  fs.copyFileSync(path.join(__dirname, "..", "favicon-16x16.png"), path.join(__dirname, "..", "dist", "favicon-16x16.png"));
}
if (fs.existsSync(path.join(__dirname, "..", "apple-touch-icon.png"))) {
  fs.copyFileSync(path.join(__dirname, "..", "apple-touch-icon.png"), path.join(__dirname, "..", "dist", "apple-touch-icon.png"));
}
if (fs.existsSync(path.join(__dirname, "..", "logo.png"))) {
  fs.copyFileSync(path.join(__dirname, "..", "logo.png"), path.join(__dirname, "..", "dist", "logo.png"));
}

console.log(`Build complete! Output written to index.html, poppy.html, dist/index.html, and favicon.ico (${bundle.length} bytes). Verified exactly 1 script closing tag.`);
