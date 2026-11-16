// Poppy Roadmap Module: 6.0 to 11.0 Navigation
(() => {
  function openRoadmap() {
    window.location.href = "roadmap.html";
  }

  const openBtn = document.getElementById("roadmapBtn");
  if (openBtn) {
    openBtn.onclick = (e) => {
      // Allow standard link navigation or programmatic redirect
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
})();
