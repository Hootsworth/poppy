/* ===== Party mode: a 1-in-50 chance the homepage becomes a meme party ===== */
(() => {
  try {
    const ODDS = 50;
    const urlParams = new URLSearchParams(window.location.search);
    const Q = urlParams.get("party") || (window.location.hash === "#party" ? "1" : null);
    const LS = (() => { try { return localStorage; } catch { return null; } })();
    const RM = matchMedia("(prefers-reduced-motion:reduce)").matches;
    const $ = s => document.querySelector(s);
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = a => a[Math.random() * a.length | 0];
    let live = null;

    const COL = ["#ffe6dc", "#ffb9a8", "#fff1a8", "#c9f0ff", "#e3d1ff", "#ffd1ec"];
    const EMO = ["*", "+", "#", "~", "^", "o", "x"];
    const CAP = ["much party", "very beat", "wow", "cat.exe has joined", "deal with it", "beauty and a beat", "no thoughts just vibes", "it is giving build"];

    const cat = c => {
      const shades = Math.random() < 0.35, hat = Math.random() < 0.3;
      return `<svg viewBox="0 0 100 100" aria-hidden="true">${hat ? `<path d="M50 -2l-14 24h28z" fill="#7b3cff" stroke="#2a0d16" stroke-width="4" stroke-linejoin="round"/><circle cx="50" cy="-4" r="5" fill="#ffd447" stroke="#2a0d16" stroke-width="3"/>` : ""}
      <path d="M14 42 8 12l30 18zM86 42 92 12 62 30z" fill="${c}" stroke="#2a0d16" stroke-width="4" stroke-linejoin="round"/>
      <ellipse cx="50" cy="58" rx="40" ry="34" fill="${c}" stroke="#2a0d16" stroke-width="4"/>
      ${shades ? `<path d="M16 50h68v9q0 9-11 9H60q-7 0-10-6-3 6-10 6H27q-11 0-11-9z" fill="#2a0d16"/>` : `<circle cx="35" cy="54" r="6" fill="#2a0d16"/><circle cx="65" cy="54" r="6" fill="#2a0d16"/><circle cx="37" cy="52" r="2" fill="#fff"/><circle cx="67" cy="52" r="2" fill="#fff"/>`}
      <path d="M45 66h10l-5 6z" fill="#f23d2a"/><path d="M50 72q-6 9-14 3M50 72q6 9 14 3" fill="none" stroke="#2a0d16" stroke-width="3" stroke-linecap="round"/>
      <path d="M8 62 26 66M8 74 26 71M92 62 74 66M92 74 74 71" stroke="#2a0d16" stroke-width="2.5" stroke-linecap="round"/></svg>`;
    };

    // Find the 30-second preview through iTunes Search API (JSONP)
    const jsonp = u => new Promise((ok, no) => {
      const n = "_pty" + Date.now();
      const s = document.createElement("script");
      window[n] = d => { ok(d); s.remove(); delete window[n]; };
      s.onerror = no;
      s.src = u + "&callback=" + n;
      document.head.append(s);
      setTimeout(no, 6000);
    });

    const find = async () => {
      const u = "https://itunes.apple.com/search?term=" + encodeURIComponent("Justin Bieber Beauty And A Beat") + "&media=music&entity=song&limit=10";
      let j;
      try { j = await jsonp(u); } catch { return null; }
      const h = (j.results || []).find(x => /beauty and a beat/i.test(x.trackName) && /bieber/i.test(x.artistName) && x.previewUrl);
      return h && { src: h.previewUrl, title: h.trackName, artist: h.artistName, art: h.artworkUrl100 };
    };

    function start() {
      if (live) return;
      const root = document.documentElement, body = document.body;
      const h1 = $("#home h1"), lede = $("#home .lede"), inp = $("#prompt");
      if (!h1 || !inp) return;
      const old = { h: h1.innerHTML, l: lede ? lede.textContent : "", p: inp.placeholder, t: document.title };

      body.classList.add("party");
      h1.innerHTML = '<span>Say it.</span><br><span style="--d:.12s">Poppy parties.</span>';
      if (lede) lede.textContent = "Beauty. A beat. Cats. Also, it builds websites.";
      inp.placeholder = "A website for my cat party";
      document.title = "Poppy Party Mode";

      const L = document.createElement("div");
      L.id = "pty";
      L.setAttribute("aria-hidden", "true");
      body.prepend(L);

      const place = w => {
        w.style.setProperty("--x0", rnd(-5, 100) + "vw");
        w.style.setProperty("--x1", rnd(-5, 100) + "vw");
        w.style.setProperty("--r0", rnd(-25, 25) + "deg");
        w.style.setProperty("--r1", rnd(-60, 60) + "deg");
      };

      const item = (kind, html, size, dur) => {
        const w = document.createElement("div"), c = document.createElement("span");
        w.className = "pc " + kind;
        c.className = "c";
        c.innerHTML = html;
        w.append(c);
        w.style.setProperty("--s", size + "px");
        w.style.setProperty("--d", dur + "s");
        w.style.setProperty("--dl", -rnd(0, dur) + "s");
        place(w);
        if (RM) {
          w.style.animation = "none";
          w.style.transform = `translate(${rnd(2, 90)}vw,${rnd(6, 80)}vh)`;
        } else {
          w.addEventListener("animationiteration", e => { if (e.target === w) place(w); });
        }
        if (kind === "cat") {
          c.onclick = () => {
            w.classList.add("pop");
            setTimeout(() => { w.classList.remove("pop"); place(w); }, 650);
          };
        }
        L.append(w);
      };

      const nCat = RM ? 6 : 13, nEmo = RM ? 4 : 10, nCap = RM ? 3 : 6;
      for (let i = 0; i < nCat; i++) item("cat", cat(pick(COL)), rnd(56, 120), rnd(14, 26));
      for (let i = 0; i < nEmo; i++) item("emo", `<span style="font-weight:900;color:#ffd447">${pick(EMO)}</span>`, rnd(20, 36), rnd(10, 20));
      for (let i = 0; i < nCap; i++) item("cap", pick(CAP), rnd(18, 30), rnd(18, 30));

      const bar = document.createElement("div");
      bar.id = "ptybar";
      bar.setAttribute("role", "region");
      bar.setAttribute("aria-label", "Party mode");
      bar.innerHTML = '<div class="rec" hidden><img alt=""></div><div class="meta"><b>PARTY MODE (10s) · 1 IN 50</b><span id="ptynow" aria-live="polite">Finding the beat...</span></div><button type="button" id="ptymute" aria-pressed="false">Mute</button><button type="button" id="ptyexit">Exit</button>';
      body.append(bar);
      const now = $("#ptynow"), rec = $(".rec", bar);

      const au = new Audio();
      au.loop = true;
      au.preload = "auto";
      au.volume = 0;

      let fr, raf, armed = false;
      const fade = (to, ms = 1200, done) => {
        cancelAnimationFrame(fr);
        const f = au.volume, t0 = performance.now();
        const s = t => {
          const p = Math.min(1, (t - t0) / ms);
          au.volume = Math.max(0, Math.min(1, f + (to - f) * p));
          if (p < 1) fr = requestAnimationFrame(s);
          else if (done) done();
        };
        fr = requestAnimationFrame(s);
      };

      const kick = () => { au.play().then(() => { fade(0.7); disarm(); }).catch(() => {}); };
      const EV = ["pointerdown", "keydown", "touchstart"];
      const arm = () => {
        if (armed) return;
        armed = true;
        bar.classList.add("wait");
        now.textContent = "Tap anywhere to start the beat";
        EV.forEach(e => addEventListener(e, kick, true));
      };
      const disarm = () => {
        if (!armed) return;
        armed = false;
        bar.classList.remove("wait");
        now.textContent = au.dataset.t;
        EV.forEach(e => removeEventListener(e, kick, true));
      };

      const tryPlay = async () => {
        try { await au.play(); fade(0.7); disarm(); }
        catch (e) { if (e.name !== "AbortError") arm(); }
      };

      find().then(m => {
        if (!live) return;
        if (!m) { now.textContent = "Could not reach iTunes. Silent disco!"; return; }
        au.dataset.t = m.title + " - " + m.artist;
        au.src = m.src;
        now.textContent = au.dataset.t;
        if (m.art) {
          rec.hidden = false;
          const img = $("img", rec);
          if (img) img.src = m.art.replace("100x100", "200x200");
        }
        tryPlay();
      });

      $("#ptymute").onclick = e => {
        au.muted = !au.muted;
        e.currentTarget.textContent = au.muted ? "Unmute" : "Mute";
        e.currentTarget.setAttribute("aria-pressed", au.muted);
      };

      const onVis = () => {
        if (!au.src) return;
        if (document.hidden) au.pause();
        else if (!armed) au.play().catch(() => {});
      };
      const onKey = e => { if (e.key === "Escape") stop(); };
      document.addEventListener("visibilitychange", onVis);
      document.addEventListener("keydown", onKey);

      $("#ptyexit").onclick = () => stop();
      const homeForm = $("#homeForm");
      if (homeForm) homeForm.addEventListener("submit", () => stop(), { once: true });

      // Dancing flower, disco floor, spotlights, equalizer, ticker
      const bloom = $("#home .bloom"), fl = $("#flower");
      let ro = null;
      if (bloom && fl) {
        bloom.insertAdjacentHTML("beforeend", `<svg class="pdance" viewBox="0 0 200 200" aria-hidden="true"><g class="leg"><path d="M88 190l-8 36"/><ellipse cx="74" cy="230" rx="14" ry="7" fill="#2a0d16"/></g><g class="leg r"><path d="M112 190l8 36"/><ellipse cx="126" cy="230" rx="14" ry="7" fill="#2a0d16"/></g><g class="arm"><path d="M10 104Q-26 98-34 56"/><circle class="hand" cx="-34" cy="56" r="10"/></g><g class="arm r"><path d="M190 104Q226 98 234 56"/><circle class="hand" cx="234" cy="56" r="10"/></g><path d="M62 88h76v11q0 15-17 15h-3q-11 0-15-9-4 9-15 9h-3q-17 0-17-15z" fill="#2a0d16"/><path d="M70 95h10M122 95h10" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/><path d="M100 -46L70 12Q100 24 130 12z" fill="#7b3cff" stroke="#2a0d16" stroke-width="5" stroke-linejoin="round"/><path d="M86 -14l30 10M80 0l40 12" stroke="#ffd447" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="-48" r="9" fill="#ffd447" stroke="#2a0d16" stroke-width="4"/></svg>`);
        const ov = bloom.lastElementChild;
        ro = new ResizeObserver(([e]) => { if (ov) ov.style.width = e.contentRect.width + "px"; });
        ro.observe(fl);
      }

      L.insertAdjacentHTML("afterbegin", `<div id="pyfloor"></div><div class="spot"></div><div class="spot r"></div><div id="pymq"><span>${"PARTY MODE * MEOW * BEAUTY AND A BEAT * NO THOUGHTS JUST VIBES * DEAL WITH IT ".repeat(2)}</span></div><div id="pyeq">${Array.from({ length: 28 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div>`);
      const bars = [...L.querySelectorAll("#pyeq i")];
      const WOO = ["WOOO!", "LETS GOOO", "YASSS", "MEOW!", "DROP IT", "HEY!"];

      const confetti = () => {
        if (!bloom) return;
        const r = bloom.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        for (let i = 0; i < 35; i++) {
          const e = document.createElement("i"), w = rnd(6, 11);
          e.className = "pcf";
          e.style.cssText = `left:${cx}px;top:${cy}px;width:${w}px;height:${w * 1.5}px;background:hsl(${rnd(0, 360) | 0} 95% 60%);border-radius:${Math.random() < 0.4 ? "50%" : "2px"}`;
          document.body.append(e);
          const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05), v = rnd(160, 400), dx = Math.cos(a) * v, dy = Math.sin(a) * v;
          e.animate([
            { transform: "translate(-50%,-50%) rotate(0)", opacity: 1 },
            { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) rotate(${rnd(180, 540)}deg)`, opacity: 1, offset: 0.45 },
            { transform: `translate(calc(-50% + ${dx * 1.3}px),calc(-50% + ${dy + 500}px)) rotate(${rnd(540, 1080)}deg)`, opacity: 0 }
          ], { duration: rnd(1400, 2200), easing: "cubic-bezier(.2,.7,.4,1)" }).onfinish = () => e.remove();
        }
      };

      const shout = () => {
        if (!bloom) return;
        const r = bloom.getBoundingClientRect(), e = document.createElement("div");
        e.className = "pwoo";
        e.textContent = pick(WOO);
        e.style.cssText = `left:${r.left + r.width * (Math.random() < 0.5 ? 0.15 : 0.85)}px;top:${r.top + r.height * 0.1}px;rotate:${rnd(-14, 14)}deg`;
        document.body.append(e);
        e.animate([
          { transform: "translate(-50%,0) scale(.3)", opacity: 0 },
          { transform: "translate(-50%,-14px) scale(1.2)", opacity: 1, offset: 0.25 },
          { transform: "translate(-50%,-70px) scale(1)", opacity: 0 }
        ], { duration: 1500, easing: "ease-out" }).onfinish = () => e.remove();
      };

      let lsTime = 0;
      const spark = e => {
        if (RM || e.timeStamp - lsTime < 60) return;
        lsTime = e.timeStamp;
        const s = document.createElement("i");
        s.className = "pcf";
        s.textContent = pick(["*", "+", "#", "~"]);
        s.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;font-size:${rnd(14, 24)}px;font-style:normal;font-weight:900;color:#ffd447`;
        document.body.append(s);
        s.animate([
          { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
          { transform: `translate(${rnd(-30, 30)}px,${rnd(30, 80)}px) rotate(${rnd(-90, 90)}deg) scale(.3)`, opacity: 0 }
        ], { duration: 900, easing: "ease-out" }).onfinish = () => s.remove();
      };
      addEventListener("pointermove", spark);

      const dance = (bt, ph, mv) => {
        if (!bloom) return;
        const ov = bloom.querySelector(".pdance");
        const bn = Math.abs(Math.sin(Math.PI * bt)), g = 1 - bn;
        let x = 0, y = -bn * 26, r = 0;
        if (mv === 0) r = Math.sin(Math.PI * bt / 2) * 14;
        if (mv === 1) { const k = (bt % 4) / 4, e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; r = e * 360; }
        if (mv === 2) { x = Math.sin(Math.PI * bt * 4) * 14; r = Math.sin(Math.PI * bt * 4) * 6; y *= 0.4; }
        if (mv === 3) y = -Math.pow(Math.abs(Math.sin(Math.PI * bt / 2)), 0.7) * 70;
        if (mv === 4) r = ((bt | 0) % 2 ? 1 : -1) * 24 * Math.sin(Math.PI * ph);
        bloom.style.translate = `${x}px ${y}px`;
        bloom.style.rotate = r + "deg";
        bloom.style.scale = `${0.84 * (1 + g * 0.1)} ${0.84 * (1 - g * 0.14 + bn * 0.06)}`;
        if (ov) ov.style.setProperty("--b", Math.sin(Math.PI * bt).toFixed(3));
      };

      let lastMv = -1, lastBeat = -1;
      const tick = () => {
        const t = au.src && !au.paused ? au.currentTime : performance.now() / 1000;
        const bt = t * 128 / 60, ph = bt % 1, beat = bt | 0, mv = ((beat / 8) | 0) % 5;
        root.style.setProperty("--beat", RM ? 0 : Math.pow(1 - ph, 3).toFixed(3));
        if (beat !== lastBeat) {
          lastBeat = beat;
          root.style.setProperty("--hue", (beat * 28) % 360);
        }
        if (!RM) {
          dance(bt, ph, mv);
          bars.forEach((b, i) => b.style.transform = `scaleY(${(0.12 + 0.88 * Math.abs(Math.sin(bt * Math.PI * (0.5 + i * 0.11) + i * 1.7)) * (0.45 + 0.55 * Math.pow(1 - ph, 1.5))).toFixed(3)})`);
          if (mv !== lastMv) {
            if (lastMv >= 0) { confetti(); shout(); }
            lastMv = mv;
          }
        }
        raf = requestAnimationFrame(tick);
      };
      tick();

      // Exactly 10 seconds duration
      const autoDismissTimer = setTimeout(() => {
        stop();
      }, 10000);

      function stop() {
        if (!live) return;
        live = null;
        clearTimeout(autoDismissTimer);
        cancelAnimationFrame(raf);
        disarm();
        fade(0, 600, () => {
          au.pause();
          au.removeAttribute("src");
          au.load();
        });
        document.removeEventListener("visibilitychange", onVis);
        document.removeEventListener("keydown", onKey);
        removeEventListener("pointermove", spark);
        if (ro) ro.disconnect();
        const ov = bloom ? bloom.querySelector(".pdance") : null;
        if (ov) ov.remove();
        L.remove();
        bar.remove();
        if (bloom) bloom.style.translate = bloom.style.rotate = bloom.style.scale = "";
        root.style.removeProperty("--hue");
        root.style.removeProperty("--beat");
        body.classList.remove("party");
        h1.innerHTML = old.h;
        if (lede) lede.textContent = old.l;
        inp.placeholder = old.p;
        document.title = old.t;
      }

      live = { stop };
    }

    window.poppyParty = { start, stop: () => live && live.stop(), odds: ODDS };
    const hit = Q === "1" || (Q !== "0" && !(LS && LS.getItem("poppy.noparty")) && !window.location.hash && Math.random() < 1 / ODDS);
    if (hit) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
      } else {
        setTimeout(start, 50);
      }
    }
  } catch (e) {
    console.warn("party mode skipped", e);
  }
})();
