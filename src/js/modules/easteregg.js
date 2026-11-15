// Poppy Easter Egg: 1-in-50 Party Mode
(() => {
  let eggAudio = null;
  let eggTimer = null;

  const CAT_COLORS = ["#facc15", "#fb923c", "#f43f5e", "#38bdf8", "#a78bfa", "#34d399"];

  function createCatSvg(color) {
    return `<svg viewBox="0 0 64 64" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 12L24 24H40L48 12L44 28C48 32 50 38 50 44C50 54 42 60 32 60C22 60 14 54 14 44C14 38 16 32 20 28L16 12Z" fill="${color}" stroke="#0f172a" stroke-width="2"/>
      <ellipse cx="26" cy="40" rx="3" ry="4" fill="#0f172a"/>
      <ellipse cx="38" cy="40" rx="3" ry="4" fill="#0f172a"/>
      <polygon points="32,46 29,43 35,43" fill="#f43f5e"/>
      <path d="M28 48C29 50 31 51 32 51C33 51 35 50 36 48" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
      <path d="M22 44L12 42M22 47L14 48M42 44L52 42M42 47L50 48" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`;
  }

  function triggerEasterEgg() {
    if (document.getElementById("poppyEasterEgg")) return;

    const overlay = document.createElement("div");
    overlay.id = "poppyEasterEgg";

    // Center party content
    overlay.innerHTML = `
      <div class="egg-party-box">
        <div class="egg-title">PARTY MODE ACTIVATED</div>
        <div class="egg-subtitle">You discovered the 1-in-50 Poppy easter egg!</div>
        <div class="egg-track-badge">Now Playing: Justin Bieber - Beauty and a Beat</div>
        <div class="egg-timer-bar-wrap">
          <div class="egg-timer-bar"></div>
        </div>
        <button type="button" class="egg-skip-btn" id="eggSkipBtn">Skip to Poppy</button>
      </div>
    `;

    // Spawn floating cats
    for (let i = 0; i < 14; i++) {
      const cat = document.createElement("div");
      cat.className = "egg-floating-cat";
      cat.style.left = (Math.random() * 88 + 2) + "vw";
      cat.style.top = (Math.random() * 82 + 5) + "vh";
      cat.style.animationDuration = (3.5 + Math.random() * 3) + "s";
      cat.style.animationDelay = (Math.random() * 2) + "s";
      const size = Math.floor(48 + Math.random() * 36);
      cat.style.width = size + "px";
      cat.style.height = size + "px";
      const color = CAT_COLORS[i % CAT_COLORS.length];
      cat.innerHTML = createCatSvg(color);
      overlay.appendChild(cat);
    }

    document.body.appendChild(overlay);

    // Audio stream via iTunes JSONP
    const cbName = "poppy_egg_cb_" + Math.random().toString(36).slice(2, 8);
    const script = document.createElement("script");
    window[cbName] = data => {
      delete window[cbName];
      if (script.parentNode) script.remove();
      const track = data.results && data.results[0];
      if (track && track.previewUrl) {
        eggAudio = new Audio(track.previewUrl);
        eggAudio.volume = 0.65;
        const p = eggAudio.play();
        if (p !== undefined) {
          p.catch(() => {
            window.addEventListener("click", () => {
              if (eggAudio) eggAudio.play().catch(() => {});
            }, { once: true });
          });
        }
      }
    };
    script.onerror = () => {
      delete window[cbName];
      if (script.parentNode) script.remove();
    };
    script.src = `https://itunes.apple.com/search?term=Justin+Bieber+Beauty+and+a+Beat&entity=song&limit=1&callback=${cbName}`;
    document.body.appendChild(script);

    // Auto-dismiss after 10 seconds
    function closeEgg() {
      if (eggTimer) clearTimeout(eggTimer);
      if (eggAudio) {
        try { eggAudio.pause(); } catch (e) {}
        eggAudio = null;
      }
      overlay.classList.add("closing");
      setTimeout(() => {
        if (overlay.parentNode) overlay.remove();
      }, 500);
    }

    document.getElementById("eggSkipBtn").onclick = closeEgg;
    eggTimer = setTimeout(closeEgg, 10000);
  }

  window.triggerPoppyParty = triggerEasterEgg;

  // 1-in-50 chance on initial launch, or manually via #party hash
  const shouldTrigger = (Math.floor(Math.random() * 50) === 0) || (window.location && window.location.hash === "#party");
  if (shouldTrigger) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", triggerEasterEgg);
    } else {
      setTimeout(triggerEasterEgg, 100);
    }
  }
})();
