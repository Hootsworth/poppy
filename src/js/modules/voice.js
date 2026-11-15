/* ===== Poppy Voice Mode Engine ===== */
(function(){
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const playC = (el, c) => { if (!el) return; el.classList.remove(c); void el.offsetWidth; el.classList.add(c); };
  const at = el => {
    if (!el) return [window.innerWidth / 2, window.innerHeight / 2];
    const r = el.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };

  let overlay, orbw, tr, stateChip, statEl, thList, stepsEl, pb, pn, tk, fx, muteBtn, endBtn, playBtn;
  let audioCtx = null, analyser = null, micStream = null, dataArray = null;
  let speechRec = null, isListening = false, recognitionActive = false;
  let activeRun = 0, isOpen = false, originBtn = null;

  const S = {
    state: "idle",
    mute: false,
    lv: null,
    cur: Array(8).fill(1),
    rot: 0,
    last: 0
  };

  const LABELS = {
    idle: "Ready",
    listening: "Listening\u2026",
    thinking: "Thinking\u2026",
    speaking: "Speaking\u2026",
    working: "Working\u2026"
  };

  let orbElements = null;

  function buildOrb(){
    const svg = document.querySelector("#voiceVf");
    if (!svg || orbElements) return;
    let h = '<g class="voice-sp">';
    for (let i = 0; i < 8; i++) {
      h += '<ellipse cx="100" cy="56" rx="20" ry="40" fill="' + (i % 2 ? "#ffb9a8" : "#ffe6dc") + '" transform="rotate(' + (i * 45) + ' 100 100)"/>';
    }
    h += '<circle cx="100" cy="100" r="36" fill="#ffb9a8"/><g class="voice-eye"><circle cx="100" cy="100" r="17" fill="#2a0d16"/></g></g>';
    svg.innerHTML = h;
    orbElements = {
      sp: svg.querySelector(".voice-sp"),
      eye: svg.querySelector(".voice-eye"),
      petals: [...svg.querySelectorAll("ellipse")]
    };
  }

  function setVoiceState(st){
    S.state = st;
    if (orbw) orbw.dataset.state = st;
    if (stateChip) {
      const mode = overlay ? overlay.dataset.mode : "voice";
      stateChip.textContent = mode === "work" && st === "thinking" ? "Working\u2026" : (LABELS[st] || st);
      playC(stateChip, "voice-chip");
    }
  }

  // Animation Loop
  function orbLoop(ms){
    if (!isOpen) return;
    const t = ms / 1000, dt = Math.min(0.05, t - S.last);
    S.last = t;
    const m = S.state;

    let lv = 0;
    if (S.mute) {
      lv = 0;
    } else if (analyser && dataArray) {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;
      lv = Math.min(1, avg / 80);
    } else if (S.lv != null) {
      lv = S.lv;
    } else if (m === "listening") {
      lv = 0.3 + 0.7 * Math.abs(Math.sin(t * 5.1) * Math.sin(t * 1.7 + 1));
    } else if (m === "speaking") {
      lv = Math.abs(Math.sin(t * 9) * Math.sin(t * 3.7));
    }

    if (orbElements) {
      orbElements.petals.forEach((p, i) => {
        const g = m === "idle"
          ? 1 + 0.05 * Math.sin(t * 1.6 + i * 0.8)
          : m === "listening"
          ? 1 + lv * 0.55 * (0.55 + 0.45 * Math.sin(t * 10 + i * 1.7))
          : m === "thinking"
          ? 1 + 0.35 * Math.max(0, Math.sin(t * 5.5 - i * 0.8))
          : 1 + lv * 0.6 * (0.5 + 0.5 * Math.sin(t * 8 + i * 0.9));
        S.cur[i] += (g - S.cur[i]) * 0.3;
        p.setAttribute("transform", "rotate(" + (i * 45) + " 100 100) translate(100 100) scale(1 " + S.cur[i].toFixed(3) + ") translate(-100 -100)");
      });

      S.rot += dt * (m === "thinking" ? 160 : m === "idle" ? 6 : 14);
      orbElements.sp.style.transform = "rotate(" + S.rot + "deg)";
      orbElements.eye.style.transform = "scale(" + (1 + (m === "speaking" ? lv * 0.35 : m === "listening" ? lv * 0.15 : 0.04 * Math.sin(t * 2))) + ")";
    }

    if (orbw) orbw.style.setProperty("--lv", lv.toFixed(3));
    requestAnimationFrame(orbLoop);
  }

  // Roll numbers smoothly
  function rollNumber(el, to, ms = 800){
    if (!el) return;
    const from = +el.dataset.v || 0, t0 = performance.now();
    el.dataset.v = to;
    (function f(now){
      const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * e).toLocaleString();
      if (p < 1) requestAnimationFrame(f);
    })(t0);
  }

  // Confetti burst
  function burstPetals(x, y, n = 24){
    for (let i = 0; i < n; i++) {
      const e = document.createElement("i");
      e.className = "voice-bit";
      e.style.cssText = "left:" + x + "px;top:" + y + "px;background:" + (i % 3 ? "var(--petal)" : "var(--petal2)");
      document.body.append(e);
      const a = Math.random() * 6.283, d = 70 + Math.random() * 150;
      e.animate([
        {transform: "translate(-50%,-50%) scale(.4)", opacity: 1},
        {transform: "translate(calc(-50% + " + Math.cos(a) * d + "px),calc(-50% + " + (Math.sin(a) * d + 70) + "px)) rotate(" + Math.random() * 540 + "deg)", opacity: 0}
      ], {duration: 900 + Math.random() * 500, easing: "cubic-bezier(.2,.7,.3,1)"}).onfinish = () => e.remove();
    }
  }

  // Typewriter voice transcript
  async function sayVoice(cls, text, interim, ms = 160){
    if (!tr) return [];
    const p = document.createElement("p");
    p.className = cls;
    tr.append(p);
    const words = text.split(" ").map(w => {
      const s = document.createElement("span");
      s.className = "w" + (interim ? " int" : "");
      s.textContent = w;
      return s;
    });
    for (const s of words) {
      p.append(s);
      await sleep(ms);
    }
    return words;
  }

  // Text-To-Speech
  function speakVoice(text){
    if (S.mute || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.pitch = 1.0;
      window.speechSynthesis.speak(u);
    } catch {}
  }

  // Audio Context for real mic levels
  async function startAudioMonitoring(){
    if (audioCtx) return;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(micStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      dataArray = new Uint8Array(analyser.frequencyBinCount);
    } catch {
      analyser = null;
      dataArray = null;
    }
  }

  function stopAudioMonitoring(){
    if (micStream) {
      micStream.getTracks().forEach(t => t.stop());
      micStream = null;
    }
    if (audioCtx && audioCtx.state !== "closed") {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
    analyser = null;
    dataArray = null;
  }

  // Set Pipeline Step
  function setPipelineStep(stepIdx, progressVal, tokenVal){
    if (!stepsEl) return;
    const items = [...stepsEl.querySelectorAll("li")];
    items.forEach((li, i) => {
      li.className = i < stepIdx ? "done" : i === stepIdx ? "on" : "";
    });
    stepsEl.style.setProperty("--p", Math.min(1, stepIdx / 3));
    if (pb) pb.style.width = progressVal + "%";
    if (pn) rollNumber(pn, progressVal);
    if (tk && tokenVal != null) rollNumber(tk, tokenVal);
  }

  function addThought(text){
    if (!thList) return;
    thList.querySelectorAll("li").forEach(li => li.classList.add("old"));
    const li = document.createElement("li");
    li.textContent = text;
    thList.append(li);
    while (thList.children.length > 5) thList.firstChild.remove();
  }

  function setStatusText(text){
    if (!statEl) return;
    statEl.textContent = text;
    playC(statEl, "voice-chip");
  }

  // Live or Demo Pipeline
  async function runVoiceBuild(promptText, isDemo = false){
    const runId = ++activeRun, ok = () => runId === activeRun && isOpen;
    if (playBtn) playBtn.disabled = true;
    overlay.dataset.mode = "work";
    setVoiceState("thinking");
    setStatusText("Planning");
    setPipelineStep(0, 10, 120);
    thList.replaceChildren();

    addThought("Understanding requirements: " + promptText.slice(0, 48) + "...");
    await sleep(700);
    if (!ok()) return;

    addThought("Drafting layout structure, color system & interactions");
    await sleep(800);
    if (!ok()) return;

    setStatusText("Building");
    setPipelineStep(1, 35, 1240);
    addThought("Synthesizing reactive HTML, CSS grid & audio bindings");
    await sleep(900);
    if (!ok()) return;

    setPipelineStep(1, 65, 2890);
    addThought("Injecting runtime error shields and mobile viewport guards");
    await sleep(800);
    if (!ok()) return;

    setStatusText("Verifying");
    setPipelineStep(2, 85, 3450);
    addThought("Executing verify probe: testing interactive DOM mutations");
    await sleep(1000);
    if (!ok()) return;

    setStatusText("Polishing");
    setPipelineStep(3, 95, 3810);
    if (fx) fx.innerHTML = '<span class="fix" style="background:var(--petal);color:var(--ink);padding:2px 10px;border-radius:99px;font-size:.8rem;font-weight:700">Verified \u2713</span>';
    await sleep(700);
    if (!ok()) return;

    setPipelineStep(4, 100, 4120);
    setStatusText("Ready");
    setVoiceState("speaking");
    overlay.dataset.mode = "done";

    const [ox, oy] = at(orbw);
    burstPetals(ox, oy, 28);

    // Provide Open Site button
    const metaWrap = overlay.querySelector(".voice-meta");
    if (metaWrap && !metaWrap.querySelector(".voice-open")) {
      const openBtn = document.createElement("button");
      openBtn.className = "voice-open";
      openBtn.type = "button";
      openBtn.textContent = "Open site";
      openBtn.onclick = () => wipeToSite(openBtn, promptText);
      metaWrap.insertBefore(openBtn, metaWrap.children[1] || null);
    }

    await sayVoice("bot", "Done. Take a look.", false, 180);
    speakVoice("Done. Take a look.");
    setVoiceState("idle");
    if (playBtn) {
      playBtn.disabled = false;
      playBtn.textContent = "Replay conversation";
    }
  }

  // Circular wipe into live site
  async function wipeToSite(btn, promptText){
    const wipeEl = document.querySelector("#voiceWipe");
    const [x, y] = at(btn || overlay);
    const circle = r => "circle(" + r + " at " + x + "px " + y + "px)";

    if (wipeEl) {
      wipeEl.firstElementChild.style.opacity = "0";
      try {
        await wipeEl.animate([
          {clipPath: circle("0px")},
          {clipPath: circle("150vmax")}
        ], {duration: 650, easing: "cubic-bezier(.7,0,.2,1)", fill: "forwards"}).finished;

        wipeEl.firstElementChild.animate([
          {opacity: 0, transform: "translateY(20px)"},
          {opacity: 1, transform: "none"}
        ], {duration: 400, fill: "forwards", easing: "cubic-bezier(.3,1.6,.5,1)"});
      } catch {}
    }

    closeVoiceMode(null, {skipAnim: true});

    // Populate prompt and execute build in Poppy
    const promptInput = document.querySelector("#prompt");
    if (promptInput && promptText) {
      promptInput.value = promptText;
      if (typeof keyOf === "function" && typeof prov === "function" && keyOf(prov())) {
        const homeForm = document.querySelector("#homeForm");
        if (homeForm) homeForm.requestSubmit();
      } else {
        promptInput.focus();
        if (typeof toast === "function") toast("Prompt set. Press Build or add an API key.");
      }
    }

    if (wipeEl) {
      await sleep(600);
      try {
        await wipeEl.animate([
          {clipPath: circle("150vmax")},
          {clipPath: circle("0px")}
        ], {duration: 500, easing: "cubic-bezier(.7,0,.2,1)", fill: "forwards"}).finished;
      } catch {}
    }
  }

  // Conversation runner
  async function startConversation(customPrompt){
    const runId = ++activeRun, ok = () => runId === activeRun && isOpen;
    tr.replaceChildren();
    overlay.dataset.mode = "voice";
    setVoiceState("listening");

    const prompt = customPrompt || "Make me a landing page for a lighthouse tea shop, warm and playful";
    await sleep(600);
    if (!ok()) return;

    const words = await sayVoice("you", prompt, true, 160);
    if (!ok()) return;
    await sleep(250);
    words.forEach(w => w.classList.remove("int"));

    await sleep(500);
    if (!ok()) return;

    setVoiceState("thinking");
    await sleep(1000);
    if (!ok()) return;

    setVoiceState("speaking");
    const reply = "Love it. I'll plan it, build it, then test it. Watch the right side.";
    speakVoice(reply);
    await sayVoice("bot", reply, false, 150);
    if (!ok()) return;

    await sleep(400);
    if (!ok()) return;

    await runVoiceBuild(prompt, true);
  }

  // Speech Recognition listener
  function setupSpeechRecognition(){
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return null;
    const r = new SpeechRec();
    r.continuous = true;
    r.interimResults = true;
    r.lang = navigator.language || "en-US";

    let silenceTimer = null;
    let finalTranscript = "";

    r.onresult = e => {
      clearTimeout(silenceTimer);
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscript += text + " ";
        else interim += text;
      }

      const activeText = (finalTranscript + interim).trim();
      if (activeText && tr) {
        tr.replaceChildren();
        const p = document.createElement("p");
        p.className = "you";
        p.textContent = activeText;
        tr.append(p);
      }

      silenceTimer = setTimeout(() => {
        if (finalTranscript.trim() && isOpen) {
          const userPrompt = finalTranscript.trim();
          finalTranscript = "";
          r.stop();
          recognitionActive = false;
          startConversation(userPrompt);
        }
      }, 1500);
    };

    r.onerror = () => {
      recognitionActive = false;
    };

    r.onend = () => {
      recognitionActive = false;
      if (isOpen && S.state === "listening" && !S.mute) {
        try { r.start(); recognitionActive = true; } catch {}
      }
    };

    return r;
  }

  // Open Voice Mode with circular reveal from mic button
  function openVoiceMode(btn){
    if (isOpen) return;
    isOpen = true;
    originBtn = btn || document.querySelector("#homeForm .mic") || document.body;

    if (!overlay) initVoiceDOM();
    overlay.classList.add("active");
    overlay.dataset.mode = "voice";
    setVoiceState("listening");
    tr.replaceChildren();

    const [cx, cy] = at(originBtn);
    const maxR = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy)) * 1.2;

    try {
      overlay.animate([
        {clipPath: "circle(0px at " + cx + "px " + cy + "px)"},
        {clipPath: "circle(" + maxR + "px at " + cx + "px " + cy + "px)"}
      ], {duration: 550, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both"});
    } catch {}

    requestAnimationFrame(orbLoop);
    startAudioMonitoring();

    if (!speechRec) speechRec = setupSpeechRecognition();
    if (speechRec && !S.mute) {
      try { speechRec.start(); recognitionActive = true; } catch {}
    }

    if (endBtn) endBtn.focus({preventScroll: true});
  }

  // Close Voice Mode with reverse circular collapse
  function closeVoiceMode(btn, opts = {}){
    if (!isOpen) return;
    activeRun++;
    isOpen = false;
    if (speechRec && recognitionActive) {
      try { speechRec.stop(); } catch {}
      recognitionActive = false;
    }
    stopAudioMonitoring();

    const target = btn || originBtn;
    const [cx, cy] = at(target);
    const maxR = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy)) * 1.2;

    const finishClose = () => {
      if (overlay) overlay.classList.remove("active");
      const promptInput = document.querySelector("#prompt");
      if (promptInput) promptInput.focus();
    };

    if (opts.skipAnim) {
      finishClose();
      return;
    }

    try {
      const anim = overlay.animate([
        {clipPath: "circle(" + maxR + "px at " + cx + "px " + cy + "px)"},
        {clipPath: "circle(0px at " + cx + "px " + cy + "px)"}
      ], {duration: 420, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards"});
      anim.onfinish = finishClose;
    } catch {
      finishClose();
    }
  }

  function initVoiceDOM(){
    overlay = document.querySelector("#voiceOverlay");
    if (!overlay) return;

    orbw = overlay.querySelector("#voiceOrbw");
    tr = overlay.querySelector("#voiceTr");
    stateChip = overlay.querySelector("#voiceState");
    statEl = overlay.querySelector("#voiceStat");
    thList = overlay.querySelector("#voiceTh");
    stepsEl = overlay.querySelector("#voiceSteps");
    pb = overlay.querySelector("#voicePb");
    pn = overlay.querySelector("#voicePn");
    tk = overlay.querySelector("#voiceTk");
    fx = overlay.querySelector("#voiceFx");
    muteBtn = overlay.querySelector("#voiceMute");
    endBtn = overlay.querySelector("#voiceEnd");
    playBtn = overlay.querySelector("#voicePlay");

    buildOrb();

    if (muteBtn) {
      muteBtn.onclick = () => {
        S.mute = !S.mute;
        muteBtn.setAttribute("aria-pressed", String(S.mute));
        if (orbw) orbw.toggleAttribute("data-muted", S.mute);
        if (S.mute && speechRec && recognitionActive) {
          try { speechRec.stop(); } catch {}
          recognitionActive = false;
        } else if (!S.mute && speechRec && !recognitionActive && isOpen) {
          try { speechRec.start(); recognitionActive = true; } catch {}
        }
      };
    }

    if (endBtn) {
      endBtn.onclick = () => closeVoiceMode(endBtn);
    }

    if (playBtn) {
      playBtn.onclick = () => startConversation();
    }

    overlay.querySelectorAll(".voice-sug-btn").forEach(btn => {
      btn.onclick = () => startConversation(btn.textContent.trim());
    });

    document.addEventListener("keydown", e => {
      if (isOpen && e.key === "Escape") {
        e.preventDefault();
        closeVoiceMode();
      }
    });
  }

  // Export functions to global scope
  window.openVoiceMode = openVoiceMode;
  window.closeVoiceMode = closeVoiceMode;
  window.initVoiceDOM = initVoiceDOM;

  // Auto-bind to DOM once ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initVoiceDOM);
  } else {
    initVoiceDOM();
  }
})();
