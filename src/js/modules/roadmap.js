// Poppy Roadmap Module: 6.0 to 11.0 Dialog & Navigation
(() => {
  const dlg = document.getElementById("roadmapDlg");
  if (!dlg) return;

  function openRoadmap() {
    dlg.showModal();
  }

  function closeRoadmap() {
    dlg.close();
  }

  const openBtn = document.getElementById("roadmapBtn");
  if (openBtn) openBtn.onclick = openRoadmap;

  const menuBtn = document.getElementById("roadmapMenuBtn");
  if (menuBtn) {
    menuBtn.onclick = () => {
      const menu = document.getElementById("menu");
      if (menu) menu.hidden = true;
      openRoadmap();
    };
  }

  const closeBtn = document.getElementById("roadmapClose");
  if (closeBtn) closeBtn.onclick = closeRoadmap;

  const doneBtn = document.getElementById("roadmapDoneBtn");
  if (doneBtn) doneBtn.onclick = closeRoadmap;

  const tabs = document.querySelectorAll("#roadmapTabs .roadmap-tab-btn");
  const contents = {
    blooms: document.getElementById("roadmapTabBlooms"),
    points: document.getElementById("roadmapTabPoints"),
    seeds: document.getElementById("roadmapTabSeeds"),
    history: document.getElementById("roadmapTabHistory")
  };

  tabs.forEach(btn => {
    btn.onclick = () => {
      tabs.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.dataset.tab;
      Object.keys(contents).forEach(k => {
        if (contents[k]) contents[k].style.display = k === target ? "block" : "none";
      });
    };
  });

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
