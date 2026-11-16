// Poppy Roadmap & Ecosystem Navigation + Footer Garden
(() => {
  function openRoadmap() {
    window.location.href = "roadmap.html";
  }

  const openBtn = document.getElementById("roadmapBtn");
  if (openBtn) {
    openBtn.onclick = (e) => {
      openRoadmap();
    };
  }

  const menuBtn = document.getElementById("roadmapMenuBtn");
  if (menuBtn) {
    menuBtn.onclick = () => {
      const menu = document.getElementById("menu");
      if (menu) menu.hidden = true;
      openRoadmap();
    };
  }

  function checkHash() {
    if (window.location.hash === "#roadmap") {
      openRoadmap();
    }
  }

  window.addEventListener("hashchange", checkHash);
  if (window.location.hash === "#roadmap") {
    setTimeout(checkHash, 100);
  }

  window.openPoppyRoadmap = openRoadmap;

  // Footer Garden Renderer & Replay
  const gd = document.getElementById("gd");
  const ft = document.getElementById("end");
  if (gd && ft) {
    const pet = (n, r) => {
      let s = "";
      for (let i = 0; i < n; i++) {
        s += `<g transform="rotate(${360 * i / n})"><ellipse class="pt" style="--i:${i}" cx="0" cy="${-r * .55}" rx="${r * .24}" ry="${r * .5}"/></g>`;
      }
      return s + `<circle class="po" r="${r * .13}"/>`;
    };

    const G = [[5, 350], [6, 350], [7, 24], [8, 190], [9, 130], [10, 265], [11, 320]];
    gd.innerHTML = `<svg viewBox="0 -10 1100 245" role="img" aria-label="Seven blooms, from five petals to eleven"><path d="M10 210H1090" stroke="var(--bg)" stroke-opacity=".35" stroke-width="2" fill="none"/>${G.map(([n, h], i) => {
      const x = 100 + i * 150, sh = 80 + (n - 5) * 14, y = 210 - sh, r = 34 + (n - 5) * 2.5;
      return `<g class="sw" style="--h:${h};transform-origin:${x}px 210px;animation-delay:-${i * .8}s"><path d="M${x} 210C${x} ${210 - sh * .5} ${x + 10} ${y + sh * .3} ${x} ${y}" stroke="var(--bg)" stroke-opacity=".45" stroke-width="3" fill="none"/><g transform="translate(${x} ${y})"><g class="bl">${pet(n, r)}</g></g></g><text x="${x}" y="232" text-anchor="middle">${n}.0${n === 5 ? " (now)" : ""}</text>`;
    }).join("")}</svg>`;

    const rpBtn = document.getElementById("rp");
    if (rpBtn) {
      rpBtn.onclick = () => {
        ft.classList.remove("in");
        setTimeout(() => ft.classList.add("in"), 500);
      };
    }

    if (typeof IntersectionObserver !== "undefined") {
      const io = new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in");
        });
      }, { threshold: 0.15 });
      io.observe(ft);
    } else {
      ft.classList.add("in");
    }
  }
})();
