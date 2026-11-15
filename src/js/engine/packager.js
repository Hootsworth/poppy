/* ===== Poppy External Distribution Engine (Poppy 3.0) =====
   Provides project packaging, Chrome/Firefox Manifest V3 extension generation,
   CLI tool packaging (Node.js & Python), GitHub repository scaffolding,
   and automated build/permission validation.
============================================================================= */

// A 1x1 transparent PNG data buffer for default extension icons
const DEFAULT_ICON_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/**
 * Analyzes permissions required by an extension manifest against Chrome Web Store security guidelines.
 * Returns { valid: boolean, warnings: string[], errors: string[], riskScore: "low"|"medium"|"high", auditedPermissions: object[] }
 */
function analyzeExtensionPermissions(manifest) {
  const errors = [];
  const warnings = [];
  const audited = [];
  let riskLevel = "low";

  if (!manifest || typeof manifest !== "object") {
    return { valid: false, errors: ["Invalid manifest object"], warnings: [], riskScore: "high", auditedPermissions: [] };
  }

  // MV3 structural checks
  if (manifest.manifest_version !== 3) {
    errors.push("Manifest V3 requires manifest_version: 3. Found: " + manifest.manifest_version);
  }
  if (manifest.browser_action) {
    errors.push("browser_action is deprecated in Manifest V3. Use 'action' instead.");
  }
  if (manifest.background && Array.isArray(manifest.background.scripts)) {
    errors.push("background.scripts array is deprecated in Manifest V3. Use 'service_worker' instead.");
  }

  const permissions = Array.isArray(manifest.permissions) ? manifest.permissions : [];
  const hostPermissions = Array.isArray(manifest.host_permissions) ? manifest.host_permissions : [];

  const PERMISSION_RISK_MAP = {
    storage: { risk: "low", desc: "Allows isolated client-side key-value persistence without cookies" },
    activeTab: { risk: "low", desc: "Allows temporary access to current active tab on user invocation" },
    alarms: { risk: "low", desc: "Allows periodic background event wakeups without persistent CPU" },
    contextMenus: { risk: "low", desc: "Allows adding items to browser right-click context menu" },
    notifications: { risk: "low", desc: "Allows displaying system desktop notifications" },
    offscreen: { risk: "low", desc: "Allows offscreen document processing for audio/DOM parsers" },
    scripting: { risk: "medium", desc: "Allows programmatic script injection into web pages" },
    tabs: { risk: "medium", desc: "Allows inspecting tab URLs and status beyond current active tab" },
    webNavigation: { risk: "medium", desc: "Allows tracking web navigation transitions" },
    cookies: { risk: "high", desc: "Allows reading and modifying browser cookies" },
    webRequest: { risk: "high", desc: "Allows observing in-flight HTTP network requests" },
    debugger: { risk: "high", desc: "Allows attaching Chrome DevTools Protocol debugger to browser tabs" }
  };

  permissions.forEach(p => {
    const info = PERMISSION_RISK_MAP[p] || { risk: "medium", desc: "Standard extension permission" };
    audited.push({ permission: p, risk: info.risk, description: info.desc });
    if (info.risk === "high") riskLevel = "high";
    else if (info.risk === "medium" && riskLevel !== "high") riskLevel = "medium";
  });

  // Host permissions audit
  hostPermissions.forEach(h => {
    if (h === "<all_urls>" || h === "*://*/*" || h.includes("://*/*")) {
      warnings.push("Broad host permission '" + h + "' triggers intense Chrome Web Store review. Prefer targeted domains.");
      riskLevel = "high";
      audited.push({ permission: h, risk: "high", description: "Universal host permission grants access to all web pages" });
    } else {
      audited.push({ permission: h, risk: "medium", description: "Domain host access for " + h });
      if (riskLevel !== "high") riskLevel = "medium";
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    riskScore: riskLevel,
    auditedPermissions: audited
  };
}

/**
 * Extracts inline <script> blocks from HTML and returns separate clean HTML and JS content.
 * Critical for Manifest V3 which strictly forbids inline scripts.
 */
function extractInlineScripts(html = "", fallbackScript = "") {
  let combinedJs = "";
  const scriptRegex = new RegExp("<script\\b[^>]*>([\\s\\S]*?)<\\/script>", "gi");
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    if (match[1] && match[1].trim()) {
      combinedJs += match[1].trim() + "\n\n";
    }
  }

  // Remove existing inline scripts and inject external script tag
  let cleanHtml = html.replace(new RegExp("<script\\b[^>]*>[\\s\\S]*?<\\/script>", "gi"), "");
  if (!combinedJs.trim() && fallbackScript) {
    combinedJs = fallbackScript;
  }

  // Inject script src="popup.js" right before </body> or at end
  const popupScriptTag = '<script src="popup.js"></scr' + 'ipt>';
  if (/<\/body>/i.test(cleanHtml)) {
    cleanHtml = cleanHtml.replace(/<\/body>/i, popupScriptTag + "\n</body>");
  } else {
    cleanHtml += "\n" + popupScriptTag;
  }

  return { html: cleanHtml, js: combinedJs || "console.log('Poppy Extension Popup loaded.');" };
}

/**
 * Generates a full Manifest V3 browser extension project files tree.
 */
function generateExtensionProject(manifest = {}, sourceFiles = {}) {
  const name = manifest.name || "Poppy Extension";
  const slug = name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "poppy-extension";
  const description = manifest.description || "Generated by Poppy Universal Creation Platform";

  // Derive permissions from manifest capabilities or source files
  const permissions = ["storage"];
  const caps = manifest.security?.hardware || [];
  if (caps.includes("mic") || caps.includes("audio")) permissions.push("offscreen");
  if (manifest.source?.files?.some(f => f.content && f.content.includes("chrome.tabs"))) permissions.push("activeTab");

  const manifestJson = {
    manifest_version: 3,
    name: name,
    version: manifest.version || "1.0.0",
    description: description.slice(0, 130),
    action: {
      default_popup: "popup.html",
      default_icon: {
        "16": "icons/icon-16.png",
        "48": "icons/icon-48.png",
        "128": "icons/icon-128.png"
      }
    },
    background: {
      service_worker: "background.js",
      type: "module"
    },
    permissions,
    icons: {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  };

  const rawHtml = sourceFiles["index.html"] || "<h1>" + name + "</h1><p>Extension Popup View</p>";
  const extracted = extractInlineScripts(rawHtml);

  const backgroundJs = `// Poppy Extension Service Worker (Manifest V3)
chrome.runtime.onInstalled.addListener(() => {
  console.log("${name} installed successfully.");
  chrome.storage.local.set({ installedAt: Date.now(), appName: "${name}" });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "PING") {
    sendResponse({ status: "OK", timestamp: Date.now() });
  }
  return true;
});
`;

  const readmeMd = `# ${name} (Chrome & Edge Extension)

Built with **Poppy Universal Creation Platform**.

## How to Install in Chrome / Edge / Brave

1. Download and unzip this archive.
2. In your browser, navigate to: \`chrome://extensions/\` (or \`edge://extensions/\`).
3. Toggle on **Developer mode** in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select this unzipped project folder.
6. Click the extension icon in your browser toolbar to open the popup.

## Project Structure
- \`manifest.json\`: Manifest V3 extension configuration and permissions.
- \`popup.html\`: The interactive toolbar popup interface.
- \`popup.js\`: Popup script logic.
- \`background.js\`: Event-driven background service worker.
- \`icons/\`: Extension toolbar and management icons.
`;

  const files = {
    "manifest.json": JSON.stringify(manifestJson, null, 2),
    "popup.html": extracted.html,
    "popup.js": extracted.js,
    "background.js": backgroundJs,
    "README.md": readmeMd,
    "icons/icon-16.png": DEFAULT_ICON_PNG_B64,
    "icons/icon-48.png": DEFAULT_ICON_PNG_B64,
    "icons/icon-128.png": DEFAULT_ICON_PNG_B64
  };

  // Carry over any extra css or js files from sourceFiles
  Object.keys(sourceFiles).forEach(f => {
    if (f !== "index.html" && !files[f] && !f.startsWith("icons/")) {
      files[f] = sourceFiles[f];
    }
  });

  return { files, slug, manifestJson };
}

/**
 * Generates a CLI project file tree (Node.js or Python).
 */
function generateCliProject(manifest = {}, language = "node") {
  const name = manifest.name || "poppy-cli";
  const slug = name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "poppy-cli";
  const desc = manifest.description || "CLI tool generated by Poppy Universal Studio";

  if (language === "python") {
    const cliPy = `#!/usr/bin/env python3
"""
${name}
${desc}
"""

import sys
import argparse
import json

def main():
    parser = argparse.ArgumentParser(
        prog="${slug}",
        description="${desc}"
    )
    parser.add_argument("--version", action="version", version="%(prog)s 1.0.0")
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable verbose diagnostic logs")
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    run_parser = subparsers.add_parser("run", help="Execute the primary workflow")
    run_parser.add_argument("--input", "-i", type=str, default="data.json", help="Input file path")
    run_parser.add_argument("--output", "-o", type=str, default="output.json", help="Output destination")
    
    status_parser = subparsers.add_parser("status", help="Display health and system status")

    args = parser.parse_args()

    if not args.command or args.command == "run":
        print(f"\\033[1;32m[${slug}]\\033[0m Starting execution...")
        print(f"Processing input from: {getattr(args, 'input', 'data.json')}")
        print(f"\\033[1;32m[${slug}]\\033[0m Task completed successfully.")
    elif args.command == "status":
        status_info = {
            "name": "${name}",
            "version": "1.0.0",
            "status": "ready",
            "pythonVersion": sys.version.split()[0]
        }
        print(json.dumps(status_info, indent=2))

if __name__ == "__main__":
    main()
`;

    const pyproject = `[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"

[project]
name = "${slug}"
version = "1.0.0"
description = "${desc}"
readme = "README.md"
requires-python = ">=3.9"
classifiers = [
    "Programming Language :: Python :: 3",
    "License :: OSI Approved :: MIT License",
    "Operating System :: OS Independent",
]

[project.scripts]
${slug} = "cli:main"
`;

    const readmeMd = `# ${name} (Python CLI)

${desc}

## Requirements
- Python 3.9+

## Quickstart

\`\`\`bash
# 1. Create a virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install editable CLI command
pip install -e .

# 3. Run the tool
${slug} --help
${slug} run --input data.json
${slug} status
\`\`\`
`;

    return {
      slug,
      files: {
        "cli.py": cliPy,
        "pyproject.toml": pyproject,
        "requirements.txt": "# Core Python standard library\\n",
        "README.md": readmeMd,
        ".gitignore": "__pycache__/\\n*.pyc\\nvenv/\\n.env\\n*.egg-info/\\ndist/\\nbuild/\\n"
      }
    };
  }

  // Default: Node.js CLI
  const cliJs = `#!/usr/bin/env node

/**
 * ${name}
 * ${desc}
 */

import { parseArgs } from "node:util";

const USAGE = \`
\x1b[1m\x1b[38;2;242;61;42m${name}\x1b[0m v1.0.0
${desc}

\x1b[1mUSAGE:\x1b[0m
  ${slug} [command] [options]

\x1b[1mCOMMANDS:\x1b[0m
  run           Execute the tool's primary engine
  status        Check system status and configuration
  help          Display this help documentation

\x1b[1mOPTIONS:\x1b[0m
  -i, --input   Path to input data file (default: data.json)
  -o, --output  Path to write output results (default: output.json)
  -v, --version Print version number
  -h, --help    Print usage guide
\`;

function main() {
  const args = process.argv.slice(2);
  const options = {
    input: { type: "string", short: "i", default: "data.json" },
    output: { type: "string", short: "o", default: "output.json" },
    version: { type: "boolean", short: "v" },
    help: { type: "boolean", short: "h" }
  };

  try {
    const { values, positionals } = parseArgs({ args, options, allowPositionals: true });
    
    if (values.help || positionals[0] === "help") {
      console.log(USAGE);
      process.exit(0);
    }
    
    if (values.version) {
      console.log("1.0.0");
      process.exit(0);
    }

    const command = positionals[0] || "run";

    if (command === "run") {
      console.log("\\x1b[1;32m[${slug}]\\x1b[0m Starting execution...");
      console.log(\`Reading data from: \${values.input}\`);
      console.log(\`Output will be saved to: \${values.output}\`);
      console.log("\\x1b[1;32m[${slug}]\\x1b[0m Completed successfully.");
    } else if (command === "status") {
      console.log(JSON.stringify({
        name: "${name}",
        version: "1.0.0",
        nodeVersion: process.version,
        platform: process.platform,
        status: "ready"
      }, null, 2));
    } else {
      console.error(\`\\x1b[31mUnknown command: "\${command}".\\x1b[0m Run "${slug} --help" for options.\`);
      process.exit(1);
    }
  } catch (err) {
    console.error("\\x1b[31mError:\\x1b[0m " + err.message);
    process.exit(1);
  }
}

main();
`;

  const packageJson = {
    name: slug,
    version: "1.0.0",
    description: desc,
    type: "module",
    bin: {
      [slug]: "./bin/cli.js"
    },
    scripts: {
      start: "node ./bin/cli.js",
      test: "node --test"
    },
    engines: {
      node: ">=18.0.0"
    },
    license: "MIT"
  };

  const readmeMd = `# ${name} (Node.js CLI)

${desc}

## Installation

\`\`\`bash
# Option 1: Link globally for local development
npm link

# Option 2: Run directly
./bin/cli.js --help
\`\`\`

## Usage

\`\`\`bash
${slug} run --input data.json --output results.json
${slug} status
${slug} --help
\`\`\`
`;

  return {
    slug,
    files: {
      "package.json": JSON.stringify(packageJson, null, 2),
      "bin/cli.js": cliJs,
      "README.md": readmeMd,
      ".gitignore": "node_modules/\\n.DS_Store\\n*.log\\ndist/\\n.env\\n"
    }
  };
}

/**
 * Generates a full GitHub Repository scaffolding.
 */
function generateGitHubRepo(manifest = {}, sourceFiles = {}, projectType = "web") {
  const name = manifest.name || "poppy-project";
  const slug = name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "poppy-project";
  const desc = manifest.description || "Created with Poppy Universal Creation Platform";

  const gitignore = `node_modules/
.DS_Store
dist/
build/
*.log
.env
.env.local
coverage/
.vscode/
`;

  const ciWorkflow = `name: CI

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run validation check
        run: |
          echo "Validating project artifacts..."
          test -f README.md && echo "README verified."
`;

  const licenseText = `MIT License

Copyright (c) ${new Date().getFullYear()} ${name} Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

  const readmeMd = `# ${name}

${desc}

## Overview
This repository was scaffolded and verified by the **Poppy Universal Creation Platform**.

## Getting Started
\`\`\`bash
# 1. Clone the repository
git clone https://github.com/<your-username>/${slug}.git
cd ${slug}

# 2. View in browser or serve locally
# Open index.html in any modern browser
\`\`\`

## Architecture
- Standalone zero-dependency runtime
- Strict client-side sandbox execution
- Offline-first local storage

## License
MIT
`;

  const files = {
    ...sourceFiles,
    ".gitignore": gitignore,
    ".github/workflows/ci.yml": ciWorkflow,
    "LICENSE": licenseText
  };

  if (!files["README.md"]) {
    files["README.md"] = readmeMd;
  }

  return { slug, files };
}

/**
 * Validates a generated project tree before packaging to ensure zero missing dependencies or bad configs.
 */
function validateProjectBuild(files = {}, projectType = "extension") {
  const errors = [];
  const warnings = [];

  if (projectType === "extension") {
    if (!files["manifest.json"]) {
      errors.push("Missing manifest.json in extension project");
    } else {
      try {
        const m = JSON.parse(files["manifest.json"]);
        const audit = analyzeExtensionPermissions(m);
        errors.push(...audit.errors);
        warnings.push(...audit.warnings);
      } catch (err) {
        errors.push("manifest.json contains invalid JSON: " + err.message);
      }
    }

    if (!files["popup.html"]) errors.push("Missing popup.html");
    if (!files["background.js"]) errors.push("Missing background.js");

    // Check for forbidden inline script in popup.html
    const inlineScriptCheck = new RegExp("<script\\b(?![^>]*\\bsrc=)[^>]*>[\\s\\S]+?<\\/script>", "i");
    if (files["popup.html"] && inlineScriptCheck.test(files["popup.html"])) {
      errors.push("popup.html contains forbidden inline script. MV3 requires external script file (e.g. popup.js).");
    }
  } else if (projectType === "cli-node") {
    if (!files["package.json"]) {
      errors.push("Missing package.json in Node CLI project");
    } else {
      try {
        const pkg = JSON.parse(files["package.json"]);
        if (!pkg.bin || Object.keys(pkg.bin).length === 0) errors.push("package.json requires a 'bin' mapping");
      } catch (err) {
        errors.push("package.json contains invalid JSON: " + err.message);
      }
    }
    const binFile = files["bin/cli.js"] || files["cli.js"];
    if (!binFile) {
      errors.push("Missing executable entrypoint (bin/cli.js)");
    } else if (!binFile.startsWith("#!/usr/bin/env node")) {
      errors.push("Executable entrypoint must begin with shebang '#!/usr/bin/env node'");
    }
  } else if (projectType === "cli-python") {
    if (!files["cli.py"]) {
      errors.push("Missing cli.py entrypoint in Python project");
    } else if (!files["cli.py"].startsWith("#!/usr/bin/env python")) {
      errors.push("cli.py must begin with shebang '#!/usr/bin/env python3'");
    }
    if (!files["README.md"]) warnings.push("Python projects should include README.md setup instructions");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

if (typeof module !== "undefined") {
  module.exports = {
    analyzeExtensionPermissions,
    extractInlineScripts,
    generateExtensionProject,
    generateCliProject,
    generateGitHubRepo,
    validateProjectBuild
  };
}

if (typeof window !== "undefined") {
  window.analyzeExtensionPermissions = analyzeExtensionPermissions;
  window.extractInlineScripts = extractInlineScripts;
  window.generateExtensionProject = generateExtensionProject;
  window.generateCliProject = generateCliProject;
  window.generateGitHubRepo = generateGitHubRepo;
  window.validateProjectBuild = validateProjectBuild;
}
