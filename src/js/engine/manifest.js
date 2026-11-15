/* ===== Poppy Universal Artifact Architecture (UAA): Manifest Specification =====
   Defines the formal v2.0 ArtifactManifest schema, capability boundaries,
   and validation utilities for universal software deliverables.
================================================================================== */

/**
 * Creates a default, schema-compliant ArtifactManifest object.
 */
function createArtifactManifest(opts = {}) {
  const now = Date.now();
  return {
    manifestVersion: "2.0",
    id: opts.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "art_" + now),
    name: opts.name || "Untitled Artifact",
    description: opts.description || "",
    version: opts.version || "1.0.0",
    createdAt: opts.createdAt || now,
    updatedAt: now,

    runtime: {
      target: opts.runtime?.target || "browser-app", // "browser-app" | "document-pdf" | "data-workbench" | "cli-script"
      entrypoint: opts.runtime?.entrypoint || "index.html",
      dependencies: Array.isArray(opts.runtime?.dependencies) ? opts.runtime.dependencies : [],
      buildMetadata: {
        bundler: opts.runtime?.buildMetadata?.bundler || "none",
        compilerFlags: Array.isArray(opts.runtime?.buildMetadata?.compilerFlags) ? opts.runtime.buildMetadata.compilerFlags : []
      }
    },

    source: {
      files: Array.isArray(opts.source?.files) ? opts.source.files : [],
      entrypointFile: opts.source?.entrypointFile || "index.html"
    },

    security: {
      network: {
        allowedOrigins: Array.isArray(opts.security?.network?.allowedOrigins) ? opts.security.network.allowedOrigins : [],
        allowWebSockets: !!opts.security?.network?.allowWebSockets
      },
      storage: {
        quotaBytes: typeof opts.security?.storage?.quotaBytes === "number" ? opts.security.storage.quotaBytes : 50 * 1024 * 1024,
        isolatedKey: opts.security?.storage?.isolatedKey || ("poppy_art_" + (opts.id || now))
      },
      hardware: Array.isArray(opts.security?.hardware) ? opts.security.hardware : [],
      secrets: {
        requiredKeys: Array.isArray(opts.security?.secrets?.requiredKeys) ? opts.security.secrets.requiredKeys : []
      }
    },

    persistence: {
      engine: opts.persistence?.engine || "ephemeral", // "ephemeral" | "indexeddb" | "sqlite-wasm" | "byoi-remote"
      tables: Array.isArray(opts.persistence?.tables) ? opts.persistence.tables : [],
      migrations: Array.isArray(opts.persistence?.migrations) ? opts.persistence.migrations : []
    },

    delivery: {
      previewRenderer: opts.delivery?.previewRenderer || "iframe", // "iframe" | "pdf-canvas" | "data-grid" | "terminal-log"
      exportTargets: Array.isArray(opts.delivery?.exportTargets) ? opts.delivery.exportTargets : ["single-html", "zip-bundle"]
    },

    verification: {
      assertions: Array.isArray(opts.verification?.assertions) ? opts.verification.assertions : [],
      status: opts.verification?.status || "pending",
      errors: Array.isArray(opts.verification?.errors) ? opts.verification.errors : []
    }
  };
}

/**
 * Validates that an object strictly adheres to the ArtifactManifest v2.0 schema.
 * Returns { valid: boolean, errors: string[] }.
 */
function validateArtifactManifest(m) {
  const errors = [];
  if (!m || typeof m !== "object") return { valid: false, errors: ["Manifest must be an object"] };

  if (m.manifestVersion !== "2.0") errors.push("manifestVersion must be '2.0'");
  if (!m.id || typeof m.id !== "string") errors.push("Manifest requires a string id");
  if (!m.name || typeof m.name !== "string") errors.push("Manifest requires a string name");

  const validTargets = ["browser-app", "document-pdf", "data-workbench", "cli-script", "extension-mv3", "headless-worker"];
  if (!m.runtime || !validTargets.includes(m.runtime.target)) {
    errors.push("Invalid or missing runtime.target. Must be one of: " + validTargets.join(", "));
  }

  if (!m.source || !Array.isArray(m.source.files)) {
    errors.push("source.files must be an array of ArtifactFile");
  } else {
    m.source.files.forEach((f, idx) => {
      if (!f.path || typeof f.path !== "string") errors.push(`source.files[${idx}] requires a string path`);
      if (typeof f.content !== "string") errors.push(`source.files[${idx}] requires string content`);
    });
  }

  const validRenderers = ["iframe", "pdf-canvas", "data-grid", "terminal-log"];
  if (!m.delivery || !validRenderers.includes(m.delivery.previewRenderer)) {
    errors.push("delivery.previewRenderer must be one of: " + validRenderers.join(", "));
  }

  if (!m.verification || !Array.isArray(m.verification.assertions)) {
    errors.push("verification.assertions must be an array");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Converts a raw multi-file object { "index.html": "...", "style.css": "..." }
 * into a typed ArtifactFile array.
 */
function filesDictToArray(filesDict = {}) {
  return Object.keys(filesDict).map(p => ({
    path: p,
    content: filesDict[p] || "",
    encoding: "utf-8"
  }));
}

/**
 * Converts a typed ArtifactFile array back into a files dictionary { [path]: content }.
 */
function filesArrayToDict(filesArr = []) {
  const dict = {};
  filesArr.forEach(f => {
    dict[f.path] = f.content || "";
  });
  return dict;
}

if (typeof module !== "undefined") {
  module.exports = { createArtifactManifest, validateArtifactManifest, filesDictToArray, filesArrayToDict };
}
if (typeof window !== "undefined") {
  window.createArtifactManifest = createArtifactManifest;
  window.validateArtifactManifest = validateArtifactManifest;
  window.filesDictToArray = filesDictToArray;
  window.filesArrayToDict = filesArrayToDict;
}
