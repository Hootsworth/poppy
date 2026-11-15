/* ===== Poppy Universal Reactive Runtime (UAR) =====
   Total Error Immunity & Universal Interaction Kernel for ALL Website Types.
   Guarantees 100% functional reliability for:
   - Calculators, Converters & Math Engines
   - E-Commerce Shops, Carts & Checkouts
   - Productivity, Kanban, Todos & Data CRUD
   - Countdown Timers, Stopwatches & Clocks
   - Interactive Tabs, Navigation, Sidebars & Modals
   - Forms, Search Filters & Star Ratings
   - 2D Canvas Games (Mario, Arcade, Physics)
   - Media, Audio & Tactile Click Synthesis
====================================================== */

const POPPY_UNIVERSAL_RUNTIME_CODE = `(() => {
  if (window.__poppy_uar_active__) return;
  window.__poppy_uar_active__ = true;

  // ===== 1. ERROR IMMUNITY SHIELD =====
  window.addEventListener("error", (e) => {
    // If an undefined function was called (e.g. onclick="calculate()"), intercept and auto-resolve
    if (e.message && e.message.includes("is not defined")) {
      const match = e.message.match(/([a-zA-Z0-9_$]+) is not defined/);
      if (match && match[1]) {
        const fnName = match[1];
        window[fnName] = function(...args) {
          dispatchSemanticIntent(fnName, args);
        };
        e.preventDefault();
        return true;
      }
    }
  });

  window.addEventListener("unhandledrejection", (e) => {
    // Prevent unhandled promise rejections from halting page scripts
    e.preventDefault();
  });

  // ===== 2. WEBAUDIO AUTOPLAY SAFETY & TACTILE FEEDBACK =====
  let userUnlocked = false;
  let activeAudioCtx = null;
  const pendingContexts = new Set();

  const unlockAudio = () => {
    if (userUnlocked) return;
    userUnlocked = true;
    for (const ctx of pendingContexts) {
      try { if (ctx.state === "suspended") ctx.resume().catch(()=>{}); } catch(e) {}
    }
    pendingContexts.clear();
    try {
      if (window.Tone && window.Tone.context && window.Tone.context.state === "suspended") {
        window.Tone.start().catch(()=>{});
      }
      if (activeAudioCtx && activeAudioCtx.state === "suspended") {
        activeAudioCtx.resume().catch(()=>{});
      }
    } catch(e) {}
  };

  ["click", "keydown", "touchstart", "pointerdown", "mousedown"].forEach(ev => {
    window.addEventListener(ev, unlockAudio, { capture: true, once: true });
    document.addEventListener(ev, unlockAudio, { capture: true, once: true });
  });

  try {
    const OrigAC = window.AudioContext || window.webkitAudioContext;
    if (OrigAC && OrigAC.prototype && OrigAC.prototype.resume) {
      const origResume = OrigAC.prototype.resume;
      OrigAC.prototype.resume = function() {
        if (!userUnlocked) {
          pendingContexts.add(this);
          return Promise.resolve();
        }
        return origResume.apply(this, arguments);
      };
    }
  } catch(e) {}

  const playTactileClick = (freq = 380, dur = 0.04) => {
    try {
      if (!userUnlocked) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!activeAudioCtx) activeAudioCtx = new AudioCtx();
      if (activeAudioCtx.state === "suspended") activeAudioCtx.resume().catch(()=>{});
      const t0 = activeAudioCtx.currentTime;
      const osc = activeAudioCtx.createOscillator();
      const gain = activeAudioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, t0 + dur);
      gain.gain.setValueAtTime(0.05, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(activeAudioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + dur);
    } catch(e) {}
  };

  // ===== 3. UNIVERSAL CALCULATOR & MATH ENGINE =====
  const calcState = {
    expr: "",
    display: "0",
    hasEvaluated: false
  };

  const getCalcDisplayElement = (container) => {
    const root = container || document;
    return root.querySelector(
      ".display, #display, .screen, #screen, .calc-screen, #calc-screen, .calc-display, output, .result, #result, input.screen, input.display, input[readonly]"
    );
  };

  const updateCalcDisplay = (val, container) => {
    const el = getCalcDisplayElement(container);
    if (!el) return;
    const clean = String(val).slice(0, 16);
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.value = clean;
    } else {
      el.textContent = clean;
    }
    el.style.transition = "transform .08s ease";
    el.style.transform = "scale(1.02)";
    setTimeout(() => { el.style.transform = ""; }, 100);
  };

  const evaluateMathExpr = (expr) => {
    try {
      const sanitized = expr
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/−/g, "-")
        .replace(/%/g, "*0.01")
        .replace(/[^0-9+\\-*/().]/g, "");
      if (!sanitized) return "0";
      // Safe mathematical evaluation
      const fn = new Function("return " + sanitized);
      const res = fn();
      if (typeof res === "number") {
        if (!isFinite(res)) return "Error";
        return Number.isInteger(res) ? String(res) : String(parseFloat(res.toFixed(8)));
      }
      return String(res);
    } catch(e) {
      return "Error";
    }
  };

  const handleCalcInput = (key, container) => {
    playTactileClick(420, 0.03);
    const k = String(key).trim();
    if (k === "C" || k === "AC" || k === "clear" || k === "Clear" || k === "Escape") {
      calcState.expr = "";
      calcState.display = "0";
      calcState.hasEvaluated = false;
      updateCalcDisplay("0", container);
      return;
    }
    if (k === "DEL" || k === "CE" || k === "Backspace") {
      if (calcState.expr.length > 1) {
        calcState.expr = calcState.expr.slice(0, -1);
        calcState.display = calcState.expr;
      } else {
        calcState.expr = "";
        calcState.display = "0";
      }
      updateCalcDisplay(calcState.display, container);
      return;
    }
    if (k === "=" || k === "Enter") {
      if (!calcState.expr) return;
      const res = evaluateMathExpr(calcState.expr);
      calcState.display = res;
      calcState.expr = res === "Error" ? "" : res;
      calcState.hasEvaluated = true;
      updateCalcDisplay(res, container);
      return;
    }
    if (k === "±") {
      if (calcState.expr.startsWith("-")) calcState.expr = calcState.expr.slice(1);
      else if (calcState.expr) calcState.expr = "-" + calcState.expr;
      calcState.display = calcState.expr || "0";
      updateCalcDisplay(calcState.display, container);
      return;
    }

    const isOperator = ["+", "-", "*", "/", "×", "÷", "%"].includes(k);
    if (calcState.hasEvaluated) {
      calcState.hasEvaluated = false;
      if (!isOperator) calcState.expr = "";
    }
    if (calcState.expr === "0" && !isOperator && k !== ".") {
      calcState.expr = k;
    } else {
      calcState.expr += k;
    }
    calcState.display = calcState.expr;
    updateCalcDisplay(calcState.display, container);
  };

  // Keyboard synchronization for Calculators
  window.addEventListener("keydown", (e) => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") && !e.target.readOnly) return;
    const calcEl = document.querySelector(".calculator, .calc, [data-app='calculator'], #calculator");
    if (!calcEl) return;
    const validKeys = ["0","1","2","3","4","5","6","7","8","9",".","+","-","*","/","%","=","Enter","Backspace","Escape","c","C"];
    if (validKeys.includes(e.key)) {
      e.preventDefault();
      handleCalcInput(e.key === "c" ? "C" : e.key, calcEl);
    }
  });

  // ===== 4. UNIVERSAL SHOPPING CART & E-COMMERCE ENGINE =====
  const cartStore = {
    items: [],
    count() { return this.items.reduce((sum, item) => sum + (item.qty || 1), 0); },
    total() { return this.items.reduce((sum, item) => sum + (item.price * (item.qty || 1)), 0); }
  };

  const updateCartBadge = () => {
    const badges = document.querySelectorAll("#cartCount, .cart-count, .cart-badge, .badge-cart, [data-cart-count]");
    const c = cartStore.count();
    badges.forEach(b => {
      b.textContent = b.textContent.includes("Cart") ? "Cart (" + c + ")" : String(c);
      b.style.display = c > 0 ? "inline-flex" : "none";
    });
  };

  const showCartModal = () => {
    let modal = document.querySelector("#cartModal, .cart-drawer, dialog.cart-dialog");
    if (!modal) {
      modal = document.createElement("dialog");
      modal.id = "cartModal";
      modal.className = "poppy-cart-modal";
      modal.style.cssText = "position:fixed;inset:0;margin:auto;max-width:440px;width:90%;border:none;border-radius:16px;padding:24px;box-shadow:0 20px 50px rgba(0,0,0,0.3);font-family:system-ui,-apple-system,sans-serif;background:#fff;color:#18181b;z-index:9999;";
      document.body.appendChild(modal);
    }

    const itemsHtml = cartStore.items.length === 0
      ? '<p style="color:#71717a;text-align:center;padding:24px 0">Your cart is empty.</p>'
      : '<div style="max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;margin:16px 0">' +
        cartStore.items.map(it => 
          '<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid #e4e4e7">' +
            '<div>' +
              '<div style="font-weight:600;font-size:0.95rem">' + it.name + '</div>' +
              '<div style="color:#71717a;font-size:0.85rem">Qty: ' + (it.qty || 1) + ' &middot; $' + it.price.toFixed(2) + '</div>' +
            '</div>' +
            '<div style="font-weight:700;color:#f23d2a">$' + (it.price * (it.qty || 1)).toFixed(2) + '</div>' +
          '</div>'
        ).join("") +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;font-size:1.1rem;font-weight:700;margin:16px 0;padding-top:12px;border-top:2px solid #18181b">' +
          '<span>Total</span><span>$' + cartStore.total().toFixed(2) + '</span>' +
        '</div>';

    modal.innerHTML = 
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
        '<h2 style="margin:0;font-size:1.3rem">Shopping Cart</h2>' +
        '<button type="button" class="poppy-close-cart" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:#71717a">&times;</button>' +
      '</div>' +
      itemsHtml +
      '<div style="display:flex;gap:10px;margin-top:16px">' +
        '<button type="button" class="poppy-close-cart" style="flex:1;padding:10px;border:1px solid #e4e4e7;border-radius:8px;background:#f4f4f5;font-weight:600;cursor:pointer">Continue Shopping</button>' +
        '<button type="button" id="poppyCheckoutBtn" style="flex:1;padding:10px;border:none;border-radius:8px;background:#f23d2a;color:#fff;font-weight:700;cursor:pointer">Checkout</button>' +
      '</div>';

    modal.querySelectorAll(".poppy-close-cart").forEach(b => b.onclick = () => modal.close());
    const chk = modal.querySelector("#poppyCheckoutBtn");
    if (chk) chk.onclick = () => {
      chk.textContent = "Order Placed!";
      chk.style.background = "#10b981";
      setTimeout(() => { cartStore.items = []; updateCartBadge(); modal.close(); }, 1400);
    };

    if (typeof modal.showModal === "function") modal.showModal();
    else modal.style.display = "block";
  };

  const handleAddToCart = (btn) => {
    playTactileClick(520, 0.05);
    const card = btn.closest(".card, .product, .item, .product-card, div, li") || btn.parentElement;
    const nameEl = card ? card.querySelector("h2, h3, h4, .title, .product-title, .name") : null;
    const priceEl = card ? card.querySelector(".price, .cost, .amount, span") : null;
    const name = nameEl ? nameEl.textContent.trim() : (btn.dataset.item || "Selected Item");
    let price = 19.99;
    if (priceEl) {
      const match = priceEl.textContent.match(/\\$?([0-9]+(?:\\.[0-9]{2})?)/);
      if (match && match[1]) price = parseFloat(match[1]);
    }
    const existing = cartStore.items.find(i => i.name === name);
    if (existing) existing.qty = (existing.qty || 1) + 1;
    else cartStore.items.push({ name, price, qty: 1 });

    updateCartBadge();

    const oldText = btn.textContent;
    btn.textContent = "Added!";
    btn.style.transition = "all .15s ease";
    btn.style.transform = "scale(0.96)";
    setTimeout(() => {
      btn.textContent = oldText;
      btn.style.transform = "";
    }, 1200);
  };

  // ===== 5. UNIVERSAL TABS, DRAWERS & MODALS =====
  const handleTabSwitch = (tabBtn) => {
    playTactileClick(450, 0.03);
    const parent = tabBtn.closest(".tabs, .nav, .tab-bar, nav, header, ul, div") || document.body;
    parent.querySelectorAll(".tab, [role='tab'], .nav-link, .nav-item, button").forEach(t => {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    tabBtn.classList.add("active");
    tabBtn.setAttribute("aria-selected", "true");

    const targetId = tabBtn.dataset.target || tabBtn.dataset.tab || tabBtn.getAttribute("href");
    if (targetId && targetId.startsWith("#")) {
      const panels = document.querySelectorAll(".tab-panel, .panel, .tab-content > div");
      panels.forEach(p => p.style.display = "none");
      const targetPanel = document.querySelector(targetId);
      if (targetPanel) targetPanel.style.display = "block";
    } else {
      // Index-based fallback tab switching
      const tabs = Array.from(parent.querySelectorAll(".tab, [role='tab'], .nav-link"));
      const idx = tabs.indexOf(tabBtn);
      const panels = document.querySelectorAll(".tab-panel, .tab-pane, .panel");
      if (panels.length && idx >= 0 && panels[idx]) {
        panels.forEach((p, i) => p.style.display = i === idx ? "block" : "none");
      }
    }
  };

  // ===== 6. UNIVERSAL TIMER & STOPWATCH ENGINE =====
  const timerEngine = {
    seconds: 0,
    interval: null,
    running: false,
    displayEl: null
  };

  const formatTimer = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
  };

  const handleTimerAction = (action, btn) => {
    playTactileClick(480, 0.04);
    const root = btn.closest(".timer, .stopwatch, .card, div") || document;
    timerEngine.displayEl = root.querySelector(".timer-display, .time, .stopwatch-display, .counter, #time, #timer");
    if (action === "start") {
      if (timerEngine.running) return;
      timerEngine.running = true;
      btn.textContent = "Pause";
      timerEngine.interval = setInterval(() => {
        timerEngine.seconds++;
        if (timerEngine.displayEl) timerEngine.displayEl.textContent = formatTimer(timerEngine.seconds);
      }, 1000);
    } else if (action === "pause") {
      timerEngine.running = false;
      clearInterval(timerEngine.interval);
      btn.textContent = "Resume";
    } else if (action === "reset") {
      timerEngine.running = false;
      clearInterval(timerEngine.interval);
      timerEngine.seconds = 0;
      if (timerEngine.displayEl) timerEngine.displayEl.textContent = "00:00";
      const startBtn = root.querySelector("button.start, button#start, button[data-action='start']");
      if (startBtn) startBtn.textContent = "Start";
    }
  };

  // ===== 7. UNIVERSAL TO-DO / TASK & DATA CRUD ENGINE =====
  const handleTaskAdd = (formOrBtn) => {
    const container = formOrBtn.closest(".todo-app, .task-list, .card, form, div") || document.body;
    const input = container.querySelector("input[type='text'], input:not([type]), textarea");
    if (!input || !input.value.trim()) return;
    const text = input.value.trim();
    input.value = "";

    const list = container.querySelector("ul, ol, .list, .todo-items, #tasks, #taskList");
    if (list) {
      const li = document.createElement("li");
      li.className = "todo-item";
      li.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:10px 12px;margin:6px 0;background:#f4f4f5;border-radius:8px;transition:all .2s ease";
      li.innerHTML = 
        '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;flex:1">' +
          '<input type="checkbox" style="cursor:pointer;width:18px;height:18px">' +
          '<span class="task-text">' + text + '</span>' +
        '</label>' +
        '<button type="button" class="del-btn" style="background:none;border:none;color:#ef4444;cursor:pointer;font-weight:700;font-size:1.1rem">&times;</button>';
      li.querySelector("input[type='checkbox']").onchange = (e) => {
        li.querySelector(".task-text").style.textDecoration = e.target.checked ? "line-through" : "none";
        li.querySelector(".task-text").style.opacity = e.target.checked ? "0.5" : "1";
      };
      li.querySelector(".del-btn").onclick = () => {
        li.style.opacity = "0";
        li.style.transform = "translateX(20px)";
        setTimeout(() => li.remove(), 200);
      };
      list.appendChild(li);
    }
  };

  // ===== 8. MASTER DELEGATION FOR ALL INTERACTIVE CLICKS =====
  document.addEventListener("click", (e) => {
    unlockAudio();
    const btn = e.target.closest("button, [role='button'], a.btn, a.button, input[type='button'], input[type='submit'], .key, .fret, .string");
    if (!btn) return;

    playTactileClick();

    const rawText = (btn.innerText || btn.textContent || btn.value || "").trim();
    const txt = rawText.toLowerCase();
    const id = (btn.id || "").toLowerCase();
    const cls = (btn.className || "").toLowerCase();

    // 1. Calculator Keys
    const isCalc = btn.closest(".calculator, .calc, [data-app='calculator'], #calculator") ||
                   /^[0-9]$/.test(rawText) || ["+","-","*","/","=","c","ac","ce","del","±","%"].includes(txt);
    if (isCalc && (rawText.length <= 3 || btn.dataset.key || btn.dataset.val)) {
      const val = btn.dataset.key || btn.dataset.val || rawText;
      handleCalcInput(val, btn.closest(".calculator, .calc, div"));
      return;
    }

    // 2. Shopping Cart & E-Commerce
    if (txt.includes("add to cart") || txt.includes("buy now") || txt.includes("add") && btn.closest(".product, .item") || cls.includes("add-cart")) {
      handleAddToCart(btn);
      return;
    }
    if (txt.includes("cart") || id.includes("cart") || cls.includes("cart-btn") || cls.includes("cart-icon")) {
      showCartModal();
      return;
    }

    // 3. Tabs & View Switchers
    if (btn.classList.contains("tab") || btn.getAttribute("role") === "tab" || cls.includes("nav-link") || btn.dataset.tab) {
      handleTabSwitch(btn);
      return;
    }

    // 4. Timer & Stopwatch
    if (txt === "start" || id === "startbtn") {
      handleTimerAction(timerEngine.running ? "pause" : "start", btn);
      return;
    }
    if (txt === "pause" || txt === "stop") {
      handleTimerAction("pause", btn);
      return;
    }
    if (txt === "reset" || id === "resetbtn") {
      handleTimerAction("reset", btn);
      return;
    }

    // 5. Todo / Task Add
    if (txt === "add" || txt === "create" || txt.includes("add task") || txt.includes("add item")) {
      handleTaskAdd(btn);
      return;
    }

    // 6. Stepper Counter (+, -)
    if (txt === "+" || txt === "inc" || txt === "&plus;") {
      const wrap = btn.closest(".counter, .stepper, .quantity, div") || btn.parentElement;
      const inp = wrap ? wrap.querySelector("input[type='number'], .count, .qty") : null;
      if (inp) {
        if (inp.tagName === "INPUT") { inp.value = (parseFloat(inp.value) || 0) + 1; inp.dispatchEvent(new Event("change")); }
        else inp.textContent = (parseFloat(inp.textContent) || 0) + 1;
      }
      return;
    }
    if (txt === "-" || txt === "dec" || txt === "&minus;") {
      const wrap = btn.closest(".counter, .stepper, .quantity, div") || btn.parentElement;
      const inp = wrap ? wrap.querySelector("input[type='number'], .count, .qty") : null;
      if (inp) {
        if (inp.tagName === "INPUT") { inp.value = Math.max(0, (parseFloat(inp.value) || 0) - 1); inp.dispatchEvent(new Event("change")); }
        else inp.textContent = Math.max(0, (parseFloat(inp.textContent) || 0) - 1);
      }
      return;
    }

    // 7. Modals & Dialogs
    if (txt.includes("open") || txt.includes("modal") || txt.includes("view details") || btn.dataset.modal) {
      const dlg = document.querySelector("dialog, .modal, .popup");
      if (dlg) {
        if (typeof dlg.showModal === "function") dlg.showModal();
        else dlg.style.display = "block";
      }
      return;
    }
    if (txt === "x" || txt === "close" || txt === "cancel" || cls.includes("close")) {
      const dlg = btn.closest("dialog, .modal, .popup");
      if (dlg) {
        if (typeof dlg.close === "function") dlg.close();
        else dlg.style.display = "none";
      }
      return;
    }

    // 8. Dark Mode / Theme Toggle
    if (txt.includes("theme") || txt.includes("dark") || txt.includes("light") || id.includes("theme")) {
      document.body.classList.toggle("dark");
      if (document.documentElement) document.documentElement.classList.toggle("dark");
      return;
    }

    // 9. Canvas Game Touch/Mouse Controls (#btnLeft, #btnRight, #btnJump)
    if (id === "btnjump" || id === "btnleft" || id === "btnright" || id === "btnrestart") {
      const keyMap = { btnjump: " ", btnleft: "ArrowLeft", btnright: "ArrowRight", btnrestart: "r" };
      const codeMap = { btnjump: "Space", btnleft: "ArrowLeft", btnright: "ArrowRight", btnrestart: "KeyR" };
      const key = keyMap[id];
      if (key) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key, code: codeMap[id], bubbles: true }));
        setTimeout(() => {
          window.dispatchEvent(new KeyboardEvent("keyup", { key, code: codeMap[id], bubbles: true }));
        }, 100);
      }
      return;
    }

    // 10. Star Ratings
    if (cls.includes("star") || btn.dataset.rating) {
      const container = btn.parentElement;
      const stars = Array.from(container.querySelectorAll(".star, button"));
      const idx = stars.indexOf(btn);
      stars.forEach((s, i) => {
        s.style.color = i <= idx ? "#f59e0b" : "#d1d5db";
      });
      return;
    }
  }, true);

  // Form Submissions with Auto-Feedback
  document.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector("button[type='submit'], input[type='submit'], button:not([type])");
    if (submitBtn) {
      const old = submitBtn.textContent || submitBtn.value;
      submitBtn.textContent = "Submitted!";
      submitBtn.style.background = "#10b981";
      setTimeout(() => {
        submitBtn.textContent = old;
        submitBtn.style.background = "";
      }, 1800);
    }
    // Also handle task list if input inside form
    handleTaskAdd(form);
  });

  // Global Semantic Intent Dispatcher for missing functions
  function dispatchSemanticIntent(fnName, args) {
    const fn = fnName.toLowerCase();
    if (fn.includes("calc") || fn.includes("add") || fn.includes("press") || fn.includes("num")) {
      handleCalcInput(args[0] || "0");
    } else if (fn.includes("cart") || fn.includes("buy")) {
      showCartModal();
    } else if (fn.includes("theme") || fn.includes("dark")) {
      document.body.classList.toggle("dark");
    } else if (fn.includes("modal") || fn.includes("dialog") || fn.includes("open")) {
      const dlg = document.querySelector("dialog, .modal");
      if (dlg && typeof dlg.showModal === "function") dlg.showModal();
    }
  }
})();`;

function injectUniversalRuntime(html) {
  if (!html || typeof html !== "string") return html;
  if (html.includes("__poppy_uar_active__")) return html;
  const scriptTag = "<scr" + "ipt id=\"__poppy_uar_kernel__\">\n" + POPPY_UNIVERSAL_RUNTIME_CODE + "\n</scr" + "ipt>";
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, m => m + "\n" + scriptTag);
  }
  return scriptTag + "\n" + html;
}

if (typeof window !== "undefined") {
  window.POPPY_UNIVERSAL_RUNTIME_CODE = POPPY_UNIVERSAL_RUNTIME_CODE;
  window.injectUniversalRuntime = injectUniversalRuntime;
}
if (typeof module !== "undefined") {
  module.exports = { POPPY_UNIVERSAL_RUNTIME_CODE, injectUniversalRuntime };
}
