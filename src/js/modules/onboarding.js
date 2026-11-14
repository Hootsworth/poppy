/* ===== Poppy Onboarding: Seven Interactive Slides ===== */
let obRoot = null;

function obStart(opts = {}){
  if (obRoot) return;
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches, root = obRoot = el("div");
  root.id = "ob"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Welcome to Poppy");
  const inerted = [...document.body.children].filter(c => c !== root && c.tagName !== "SCRIPT" && !c.inert);
  inerted.forEach(c => c.inert = true);
  const FL = '<svg viewBox="0 0 200 200" aria-hidden="true"><use href="#fl"/></svg>', timers = [];
  const T = (f, ms) => { const id = setTimeout(f, ms); timers.push(id); return id; };
  const clearT = () => { timers.splice(0).forEach(clearTimeout); };
  const mono = (id, n) => '<span class="i" style="background:hsl(' + hue(id) + ' 65% 42%)">' + n + '</span>';
  const burst = (x, y, n = 14) => {
    if (RM) return;
    for (let i = 0; i < n; i++) {
      const b = el("i", "bt"), a = i / n * 6.283 + Math.random() * .4, d = 60 + Math.random() * 100;
      b.style.cssText = "left:" + x + "px;top:" + y + "px;--dx:" + Math.cos(a) * d + "px;--dy:" + Math.sin(a) * d + "px;--r:" + Math.random() * 360 + "deg;background:" + ["#ffe6dc", "#ffb9a8", "#f23d2a", "#fffaf7"][i % 4];
      root.append(b);
      b.onanimationend = () => b.remove();
    }
  };
  const center = e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  const SLIDES = [
    {
      bg: "#f23d2a", fg: "#2a0d16", k: "01 \u00b7 Say it", h: "Say it.", p: "Describe any website, game or tool in plain words. Type it, speak it, or drop in a sketch.", next: "Show me",
      html: '<div class="s1"><div class="s1f">' + FL + '</div><div class="s1bar"><span class="s1t"></span><i class="s1c"></i><span class="s1m"><i></i><i></i><i></i><i></i></span><b class="s1g">Build</b></div><div class="s1ch"><span style="--d:0s;--tr:-2deg">Type it</span><span style="--d:.5s;--tr:2deg">Say it</span><span style="--d:1s;--tr:-1deg">Drop a sketch</span></div></div>',
      start(s){
        const prompts = ["a pomodoro timer shaped like a lighthouse", "a recipe scaler with timers", "a synth I can play with my keyboard"], t = s.querySelector(".s1t"), f = s.querySelector(".s1f"), m = s.querySelector(".s1m"), g = s.querySelector(".s1g"); let k = 0, alive = true;
        const loop = () => {
          if (!alive) return; const text = prompts[k % 3]; let i = 0; m.classList.toggle("on", k % 3 === 2);
          const type = () => { if (!alive) return; t.textContent = text.slice(0, ++i); f.style.setProperty("--lean", (-8 + i / text.length * 18) + "deg"); if (i < text.length) T(type, 38 + Math.random() * 40); else T(press, 700); };
          const press = () => { m.classList.remove("on"); g.classList.add("press"); f.classList.add("pulse"); const [x, y] = center(g); burst(x, y); T(() => { g.classList.remove("press"); f.classList.remove("pulse"); erase(); }, 600); };
          const erase = () => { if (!alive) return; if (t.textContent.length > 0) { t.textContent = t.textContent.slice(0, -2); T(erase, 12); } else { f.style.setProperty("--lean", "-8deg"); k++; T(loop, 350); } };
          type();
        };
        loop(); return () => { alive = false; };
      }
    },
    {
      bg: "#2a0d16", fg: "#ffe6dc", k: "02 \u00b7 Build", h: "Poppy builds it.", p: "The page you're looking at turns into your site, tested and fixed before you see it.", next: "Then what?",
      html: '<div class="s2"><div class="s2w"><div class="s2bar"><i></i><i></i><i></i><span class="s2u">your-idea.html</span></div><div class="s2b"><div class="s2n"><div class="b"></div><div class="b"></div><div class="b"></div></div><div class="s2h"><div class="b l1"></div><div class="b l2"></div><div class="b bt2"></div></div><div class="s2k"><div class="b c"></div><div class="b c"></div><div class="b c"></div></div></div><div class="s2s"></div></div><div class="s2t">' + FL + '<span>Planning</span></div></div>',
      start(s){
        s.classList.add("armed"); const bl = [...s.querySelectorAll(".s2 .b")], st = s.querySelector(".s2t span"), w = s.querySelector(".s2w"), words = ["Planning", "Building", "Testing", "Ready"]; let alive = true;
        bl.forEach((b, i) => { b.style.setProperty("--d", (.5 + i * .17) + "s"); b.style.setProperty("--r", (i % 2 ? -3 : 3) + "deg"); });
        const run = () => { if (!alive) return; s.classList.remove("run"); w.classList.remove("up"); void s.offsetWidth; s.classList.add("run"); words.forEach((x, i) => T(() => { st.textContent = x; st.style.animation = "none"; void st.offsetWidth; st.style.animation = ""; if (i === 3) { w.classList.add("up"); const [cx, cy] = center(w); burst(cx, cy - 40, 10); } }, i * 1250)); T(() => { s.classList.remove("run"); T(run, 500); }, 7600); };
        run(); return () => { alive = false; s.classList.remove("armed", "run"); };
      }
    },
    {
      bg: "#ffe6dc", fg: "#2a0d16", k: "03 \u00b7 Change", h: "Just chat to change it.", p: "Ask for tweaks in plain words. Every change is a version you can undo.", next: "Next",
      html: '<div class="s3"><div class="s3s"><div class="h"></div><div class="l"></div><div class="l sh"></div><div class="s3b">Buy now</div></div><div class="s3c"></div></div>',
      start(s){
        const site = s.querySelector(".s3s"), btn = s.querySelector(".s3b"), chat = s.querySelector(".s3c"), undo = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>'; let alive = true;
        const say = (t, c = "u", html) => { const m = el("div", "m " + c); if (html) m.innerHTML = t + html; else m.textContent = t; chat.append(m); while (chat.children.length > 5) chat.firstChild.remove(); };
        const cycle = () => { if (!alive) return; chat.replaceChildren(); site.classList.remove("dark"); btn.classList.remove("show");
          T(() => say("make it dark"), 600); T(() => { site.classList.add("dark"); say("Done", "p"); }, 1500);
          T(() => say("add a big red button"), 2700); T(() => { btn.classList.add("show"); say("Added", "p"); }, 3600);
          T(() => say("undo", "u", undo), 4900); T(() => { btn.classList.remove("show"); say("Back one version", "p"); }, 5700);
          T(() => { site.classList.remove("dark"); }, 6900); T(cycle, 8000); };
        cycle(); return () => { alive = false; };
      }
    },
    {
      bg: "#ffb9a8", fg: "#2a0d16", k: "04 \u00b7 Connect", h: "Plug into anything.", p: "GitHub, Spotify, Google, OpenAI and dozens more. Poppy asks you right in the chat when a site needs one.", next: "Next",
      html: '<div class="s4"><div class="s4r r1"></div><div class="s4r r2"></div><div class="s4c">' + FL + '<i class="rg"></i><i class="rg"></i></div><div class="s4l"><span class="n">0</span> services<span class="w"><b>GitHub</b></span></div></div>',
      start(s){
        const box = s.querySelector(".s4"), r1 = ["google", "spotify", "github", "openai", "supabase", "giphy"], r2 = ["discord", "trello", "airtable", "openweather", "youtube", "nasa", "tmdb", "linear"], total = typeof CONNECTORS !== "undefined" ? CONNECTORS.length : 14;
        const fill = (ring, ids, R, offs) => {
          ring.replaceChildren(); const wrap = el("div", "s4b pop"); wrap.style.setProperty("--R", R);
          ids.forEach((id, i) => {
            const c = (typeof findConn === "function" ? findConn(id) : null) || {n: id};
            const a = Math.round(i / ids.length * 360 + offs), o = el("div", "o");
            o.style.cssText = "--a:" + a + "deg;--d:" + (.3 + i * .08) + "s";
            o.innerHTML = mono(id, c.n[0].toUpperCase());
            wrap.append(o);
            if (ring.classList.contains("r1")) {
              const sp = el("i", "sp");
              sp.style.cssText = "--a:" + a + "deg;--d:" + (i * .4) + "s;--R:" + R;
              ring.append(sp);
            }
          });
          ring.append(wrap);
        };
        box.style.setProperty("--R1", "calc(var(--sz)*.3)"); fill(box.querySelector(".r1"), r1, "calc(var(--sz)*.3)", 0); fill(box.querySelector(".r2"), r2, "calc(var(--sz)*.48)", 14);
        const n = s.querySelector(".n"), w = s.querySelector(".s4l .w"), names = ["GitHub", "Spotify", "Google Calendar", "OpenAI", "Discord", "Supabase", "Giphy", "NASA", "Trello"]; let alive = true, raf, t0 = performance.now(), ni = 0;
        const tick = now => { const p = Math.min(1, (now - t0) / 1500); n.textContent = Math.round((1 - Math.pow(1 - p, 3)) * total); if (p < 1 && alive) raf = requestAnimationFrame(tick); };
        if (RM) n.textContent = total; else raf = requestAnimationFrame(tick);
        const cyc = () => { if (!alive) return; w.replaceChildren(el("b", "", names[ni++ % names.length])); T(cyc, 1200); };
        if (!RM) T(cyc, 1200);
        return () => { alive = false; cancelAnimationFrame(raf); };
      }
    },
    {
      bg: "#2a0d16", fg: "#ffe6dc", k: "05 \u00b7 Private", h: "Your keys stay yours.", p: "", next: "Next",
      html: '<div class="s5"><div class="s5p s5lock"><b>Poppy</b><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="3"/><path class="sh" d="M8 11V8a4 4 0 0 1 8 0v3"/></svg><svg class="s5key" viewBox="0 0 24 24"><circle cx="7" cy="12" r="4"/><path d="M11 12h10M17 12v4M21 12v3"/></svg><b>your browser</b></div><div class="s5w"><i style="--d:0s;--y:-30px"></i><i style="--d:.8s;--y:6px"></i><i style="--d:1.6s;--y:34px"></i></div><div class="s5p s5r"><b>Your site</b><div style="display:grid;gap:10px;width:100%;justify-items:center"><div class="pk"></div><div class="pk"></div><div class="pk"></div></div><b>sandbox</b></div></div>',
      extra: '<ul class="bul"><li class="rv" style="--rd:.8s">Keys never leave this browser</li><li class="rv" style="--rd:1s">Every site runs in a locked sandbox</li><li class="rv" style="--rd:1.2s">Only your chosen AI sees your prompts</li></ul>',
      start(){ return () => {}; }
    },
    {
      bg: "#f23d2a", fg: "#2a0d16", k: "06 \u00b7 Set up", h: "Pick your AI.", p: "Choose a provider and paste a key. It stays in this browser.", next: "I'll do this later",
      html: '<div class="s6"><div class="s6g"></div><div class="s6k"><div><div class="card"><input type="password" autocomplete="off" aria-label="API key" placeholder="Paste your API key"><p class="hint" role="status"></p><button class="go" type="button">Test and continue</button></div></div></div></div>',
      build(s){
        const g = s.querySelector(".s6g"), k = s.querySelector(".s6k"), inp = k.querySelector("input"), hint = k.querySelector(".hint"), go = k.querySelector(".go"), subs = {anthropic: "Claude", openai: "GPT", gemini: "Gemini", meta: "Llama"}; let pick = "";
        Object.keys(PROVIDERS).forEach((p, i) => {
          const b = el("button", "pc"); b.type = "button"; b.setAttribute("aria-pressed", "false"); b.style.setProperty("--d", (.5 + i * .1) + "s");
          b.innerHTML = '<span class="pm" style="background:hsl(' + hue(p) + ' 65% 42%)">' + PROVIDERS[p].name[0] + '</span><b>' + PROVIDERS[p].name + '</b><small>' + (subs[p] || "") + '</small>';
          b.onpointermove = e => { if (RM) return; const r = b.getBoundingClientRect(); b.style.setProperty("--ry", ((e.clientX - r.left) / r.width - .5) * 14 + "deg"); b.style.setProperty("--rx", (.5 - (e.clientY - r.top) / r.height) * 14 + "deg"); };
          b.onpointerleave = () => { b.style.setProperty("--rx", "0deg"); b.style.setProperty("--ry", "0deg"); };
          b.onclick = () => { pick = p; g.querySelectorAll(".pc").forEach(x => x.setAttribute("aria-pressed", String(x === b))); k.classList.add("open"); inp.value = keyOf(p); hint.textContent = PROVIDERS[p].hint; setTimeout(() => inp.focus({preventScroll: true}), 350); };
          g.append(b);
        });
        const test = async () => {
          if (!pick) return; const v = inp.value.trim();
          if (!v) { inp.classList.remove("shake"); void inp.offsetWidth; inp.classList.add("shake"); hint.textContent = "Paste a key first."; return; }
          ls.set("poppy.key." + pick, v); go.disabled = true; hint.textContent = "Testing..."; go.textContent = "Testing...";
          try {
            await tryKey(pick); ls.set("poppy.prov", pick); updateProv(); hint.textContent = "Connected.";
            const [x, y] = center(go); burst(x, y, 18); setTimeout(() => api.go(1), 700);
          } catch (e) {
            hint.textContent = e.message; inp.classList.remove("shake"); void inp.offsetWidth; inp.classList.add("shake");
          } finally { go.disabled = false; go.textContent = "Test and continue"; }
        };
        go.onclick = test; inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); test(); } };
      },
      start(){ return () => {}; }
    },
    {
      bg: "#2a0d16", fg: "#ffe6dc", k: "07 \u00b7 Ready", h: "Let's grow something.", p: "Pick an idea to start, or type your own.", next: "Start building", fin: 1,
      html: '<div class="s7"><div class="s7f">' + FL + '</div></div>',
      start(s){
        const sc = s.querySelector(".s7"); s.querySelectorAll(".fall").forEach(x => x.remove()); if (RM) return () => {};
        for (let i = 0; i < 16; i++) {
          const f = el("i", "fall");
          f.style.cssText = "left:" + (Math.random() * 100) + "%;--s:" + (10 + Math.random() * 12) + "px;--c:" + ["#ffe6dc", "#ffb9a8", "#f23d2a"][i % 3] + ";--t:" + (6 + Math.random() * 5) + "s;--d:" + (-Math.random() * 8) + "s;--sw:" + ((Math.random() - .5) * 160) + "px";
          s.append(f);
        }
        T(() => { const [x, y] = center(sc); burst(x, y, 30); }, 450);
        return () => { s.querySelectorAll(".fall").forEach(x => x.remove()); };
      }
    }
  ];

  // ---- build DOM
  const split = (h, t) => {
    h.setAttribute("aria-label", t); let i = 0;
    t.split(" ").forEach((w, wi, a) => {
      const ws = el("span", "w"); ws.setAttribute("aria-hidden", "true");
      [...w].forEach(c => { const x = el("span", "lt", c); x.style.setProperty("--i", i++); ws.append(x); });
      h.append(ws); if (wi < a.length - 1) h.append(" ");
    });
  };

  const stage = el("div", "obStage"), els = SLIDES.map((S, n) => {
    const s = el("section", "sl"); s.hidden = n > 0; s.style.setProperty("--bg", S.bg); s.style.setProperty("--fg", S.fg); s.setAttribute("aria-label", S.h);
    for (let i = 0; i < 5; i++) {
      const f = el("div", "fp"), sz = 70 + ((n * 37 + i * 53) % 190);
      f.style.cssText = "width:" + sz + "px;height:" + sz * 1.3 + "px;left:" + ((n * 29 + i * 47) % 100) + "%;top:" + ((n * 41 + i * 31) % 100) + "%;--fd:" + (10 + i * 2) + "s;--fl:-" + i * 2 + "s;--k:" + (14 + i * 10) + ";--r:" + (i * 63 % 360) + "deg";
      f.append(el("i")); s.append(f);
    }
    const tx = el("div", "tx"), h = el("h2"); tx.append(el("p", "kick", S.k), h); split(h, S.h);
    if (S.p) { const p = el("p", "rv", S.p); p.style.setProperty("--rd", ".75s"); tx.append(p); }
    if (S.extra) tx.insertAdjacentHTML("beforeend", S.extra);
    if (n === 6) {
      const c = el("div", "chips");
      IDEAS.slice(0, 4).forEach((t, i) => {
        const b = el("button", "chp", t); b.type = "button"; b.style.setProperty("--d", (1 + i * .12) + "s"); b.onclick = () => finish(t); c.append(b);
      });
      tx.append(c);
    }
    const sc = el("div", "sc"); sc.innerHTML = S.html; s.append(tx, sc); if (S.build) S.build(s); stage.append(s); return s;
  });
  els[0].classList.add("in");

  const top = el("div", "obTop"), mark = el("div", "obMark"), prog = el("div", "obProg"), skip = el("button", "obSkip", "Skip"), bot = el("div", "obBot"), back = el("button", "obBack"), cnt = el("div", "obCount"), next = el("button", "obNext"), live = el("div");
  skip.type = back.type = next.type = "button";
  mark.innerHTML = FL; live.className = "sr"; live.setAttribute("aria-live", "polite"); live.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)";
  const pps = SLIDES.map((S, i) => {
    const b = el("button", "pp"); b.type = "button"; b.setAttribute("aria-label", "Go to slide " + (i + 1)); b.append(el("i"));
    b.onclick = () => api.go(i - idx, b); prog.append(b); return b;
  });
  back.innerHTML = '<span aria-hidden="true">\u2190</span> Back';
  top.append(mark, prog, skip); bot.append(back, cnt, next); root.append(stage, top, bot, live); document.body.append(root);

  // ---- motion engine
  let idx = 0, z = 1, busy = false, stop = null;
  const label = () => {
    const S = SLIDES[idx];
    next.classList.toggle("fin", !!S.fin);
    next.replaceChildren(el("span", "t", S.next), el("span", "ar", S.fin ? "\u273f" : "\u2192"));
    next.setAttribute("aria-label", S.next);
    cnt.replaceChildren(el("b", "", String(idx + 1).padStart(2, "0")), document.createTextNode(" / " + String(SLIDES.length).padStart(2, "0")));
    back.hidden = idx === 0;
    pps.forEach((p, i) => { p.classList.toggle("on", i === idx); p.classList.toggle("done", i < idx); });
    live.textContent = "Slide " + (idx + 1) + " of " + SLIDES.length + ": " + SLIDES[idx].h;
  };
  const enter = n => {
    els[n].classList.remove("in"); void els[n].offsetWidth; els[n].classList.add("in");
    stop = SLIDES[n].start ? SLIDES[n].start(els[n]) : null;
  };

  const api = {
    go(d, from){
      const to = idx + d; if (busy || to < 0 || to >= SLIDES.length) return;
      busy = true; clearT(); const cur = els[idx], nxt = els[to], S = SLIDES[to];
      if (stop) { stop(); stop = null; }
      nxt.hidden = false; nxt.style.zIndex = ++z; nxt.classList.remove("in");
      const [x, y] = center(from || (d > 0 ? next : back));
      setTimeout(() => { root.style.setProperty("--fg", S.fg); root.style.setProperty("--bg", S.bg); }, RM ? 0 : 380);
      mark.style.transform = "rotate(" + (to * 90) + "deg) scale(1)"; idx = to; label();
      const done = () => { cur.hidden = true; cur.classList.remove("in"); nxt.getAnimations().forEach(a => a.cancel()); busy = false; enter(to); };
      if (RM) { done(); return; }
      const R = Math.hypot(innerWidth, innerHeight), a = nxt.animate({clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + R + "px at " + x + "px " + y + "px)"]}, {duration: 880, easing: "cubic-bezier(.7,0,.2,1)", fill: "both"});
      a.onfinish = done; setTimeout(() => { nxt.classList.add("in"); }, 300);
    }
  };

  let closing = false;
  function finish(idea){
    if (closing) return; closing = true; clearT(); if (stop) stop(); ls.set("poppy.onb", "1");
    const fl = document.querySelector("#flower"), r = fl ? fl.getBoundingClientRect() : {left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0}, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const end = () => {
      root.remove(); obRoot = null; inerted.forEach(c => c.inert = false); document.removeEventListener("keydown", key);
      const home = document.querySelector("#home");
      if (home) { home.classList.add("building"); setTimeout(() => home.classList.remove("building"), 900); }
      if (typeof idea === "string") {
        $("#prompt").value = idea;
        if (keyOf(prov())) $("#homeForm").requestSubmit();
        else { $("#prompt").focus(); toast("Add your key from the top right, then press Build."); }
      } else $("#prompt").focus();
    };
    if (RM) return end();
    root.animate({clipPath: ["circle(150% at " + cx + "px " + cy + "px)", "circle(0px at " + cx + "px " + cy + "px)"]}, {duration: 750, easing: "cubic-bezier(.7,0,.2,1)", fill: "forwards"}).onfinish = end;
  }

  const key = e => {
    if (e.key === "Escape") { e.preventDefault(); finish(); }
    else if (/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    else if (e.key === "ArrowRight") api.go(1);
    else if (e.key === "ArrowLeft") api.go(-1);
  };
  document.addEventListener("keydown", key);
  next.onclick = () => { if (idx === SLIDES.length - 1) finish(); else api.go(1); };
  back.onclick = () => api.go(-1);
  skip.onclick = () => finish();
  next.onpointermove = e => { if (RM) return; const r = next.getBoundingClientRect(); next.style.setProperty("--mx", (e.clientX - r.left - r.width / 2) * .18 + "px"); next.style.setProperty("--my", (e.clientY - r.top - r.height / 2) * .25 + "px"); };
  next.onpointerleave = () => { next.style.setProperty("--mx", "0px"); next.style.setProperty("--my", "0px"); };
  root.onpointermove = e => { if (RM) return; root.style.setProperty("--px", (e.clientX / innerWidth - .5) * 2); root.style.setProperty("--py", (e.clientY / innerHeight - .5) * 2); };
  let tx0 = 0; root.ontouchstart = e => { tx0 = e.touches[0].clientX; }; root.ontouchend = e => { const dx = e.changedTouches[0].clientX - tx0; if (Math.abs(dx) > 60 && !/INPUT/.test(document.activeElement.tagName)) api.go(dx < 0 ? 1 : -1); };
  root.style.setProperty("--fg", SLIDES[0].fg); root.style.setProperty("--bg", SLIDES[0].bg); label(); mark.style.transform = "rotate(0deg)"; enter(0); next.focus({preventScroll: true});
}

if (typeof window !== "undefined") {
  window.obStart = obStart;
}
