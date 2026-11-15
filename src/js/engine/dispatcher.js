/* ===== Poppy Universal Artifact Architecture (UAA): Runtime Dispatcher =====
   Decouples execution from the standard website iframe. Dispatches artifacts
   to their designated execution viewports:
   - "browser-app": Responsive sandboxed iframe + Poppy In-Frame SDK
   - "document-pdf": Dedicated vector document preview with simulated page breaks,
                     paper sizing (Letter/A4), and 1-click print/PDF stream.
   - "data-workbench": Data grid viewport with virtualized columns & SQLite/CSV controls.
================================================================================ */

const RUNTIME_DISPATCHER = {
  currentArtifact: null,
  activeRuntime: "browser-app",

  /**
   * Dispatches an ArtifactManifest to its dedicated runtime stage.
   */
  dispatch(manifest, stageContainer = null) {
    if (!manifest) return false;
    this.currentArtifact = manifest;
    const target = manifest.runtime?.target || "browser-app";
    const renderer = manifest.delivery?.previewRenderer || "iframe";
    this.activeRuntime = target;

    const frame = document.querySelector("#frame");
    const docStage = document.querySelector("#docStage");
    const stage = stageContainer || document.querySelector("#stage");

    if (renderer === "pdf-canvas" || target === "document-pdf") {
      this.mountDocumentRuntime(manifest, frame, docStage);
    } else {
      this.mountBrowserAppRuntime(manifest, frame, docStage);
    }

    // Update document title and status
    document.title = (manifest.name || "Poppy") + " - Poppy Universal Studio";
    return true;
  },

  /**
   * Mounts a standard interactive Web Application inside the sandboxed iframe.
   */
  mountBrowserAppRuntime(manifest, frame, docStage) {
    if (docStage) docStage.style.display = "none";
    if (frame) {
      frame.style.display = "block";
      // Find entrypoint or bundle html
      const files = manifest.source?.files || [];
      const entry = files.find(f => f.path === (manifest.runtime?.entrypoint || "index.html")) || files[0];
      const htmlContent = entry ? entry.content : "";
      
      // If bundleFiles / repairHtml exists in host, ensure SDK is wired
      if (typeof show === "function") {
        show(htmlContent);
      } else {
        frame.srcdoc = htmlContent;
      }
    }
  },

  /**
   * Mounts a vector document/PDF runtime with paginated paper layout and print controls.
   */
  mountDocumentRuntime(manifest, frame, docStage) {
    if (frame) frame.style.display = "none";
    
    // Ensure #docStage exists in DOM
    let stage = docStage || document.querySelector("#docStage");
    if (!stage) {
      stage = document.createElement("div");
      stage.id = "docStage";
      stage.className = "doc-runtime-stage";
      const mainStage = document.querySelector("#stage");
      if (mainStage) mainStage.append(stage);
    }
    stage.style.display = "flex";

    const files = manifest.source?.files || [];
    const entry = files.find(f => f.path === (manifest.runtime?.entrypoint || "index.html")) || files[0];
    const htmlContent = entry ? entry.content : "";

    // Render document viewport with simulated paper sheet & print header
    stage.innerHTML = `
      <div class="doc-viewer-bar">
        <div class="doc-title-info">
          <span class="doc-badge">DOCUMENT RUNTIME</span>
          <strong>${manifest.name || "Untitled Document"}</strong>
          <span class="doc-meta-pages">Vector Print Preview (A4 / Letter)</span>
        </div>
        <div class="doc-actions">
          <button type="button" class="doc-btn" onclick="RUNTIME_DISPATCHER.printDocument()">Print / Save PDF</button>
          <button type="button" class="doc-btn sec" onclick="RUNTIME_DISPATCHER.toggleRawView()">Toggle Code</button>
        </div>
      </div>
      <div class="doc-sheet-container">
        <div class="doc-paper-sheet" id="docPaper">
          <iframe id="docFrame" sandbox="allow-scripts allow-forms allow-modals allow-popups" title="Document Print Preview"></iframe>
        </div>
      </div>
    `;

    const docFrame = stage.querySelector("#docFrame");
    if (docFrame) {
      docFrame.srcdoc = htmlContent;
    }
  },

  /**
   * Triggers native print dialog on the active document runtime.
   */
  printDocument() {
    const docFrame = document.querySelector("#docFrame") || document.querySelector("#frame");
    if (docFrame && docFrame.contentWindow) {
      try {
        docFrame.contentWindow.focus();
        docFrame.contentWindow.print();
      } catch (err) {
        window.print();
      }
    } else {
      window.print();
    }
  },

  toggleRawView() {
    if (typeof $("#code") !== "undefined" && $("#code")) {
      $("#code").classList.toggle("open");
    }
  }
};

if (typeof module !== "undefined") {
  module.exports = { RUNTIME_DISPATCHER };
}
if (typeof window !== "undefined") {
  window.RUNTIME_DISPATCHER = RUNTIME_DISPATCHER;
}
