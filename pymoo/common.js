document.addEventListener("DOMContentLoaded", function () {
  const root = document.documentElement;
  const themeToggle = document.getElementById("themeToggle");
  const hamBtn = document.getElementById("hamBtn");
  const sidebar = document.getElementById("sidebar");

  // Sync theme with the main site
  const savedTheme = localStorage.getItem("theme-index-site");

  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (themeToggle) {
      themeToggle.innerHTML = theme === "dark" ? "☀️ <span>Mode Terang</span>" : "🌙 <span>Mode Gelap</span>";
    }
    localStorage.setItem("theme-index-site", theme);
  }

  if (savedTheme) {
    setTheme(savedTheme);
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    setTheme("dark");
  } else {
    setTheme("light");
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      const current = root.getAttribute("data-theme") || "light";
      setTheme(current === "dark" ? "light" : "dark");
    });
  }

  // Mobile Menu Toggle
  if (hamBtn && sidebar) {
    // Create overlay
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
    overlay.style.zIndex = "95";
    overlay.style.opacity = "0";
    overlay.style.pointerEvents = "none";
    overlay.style.transition = "opacity 0.25s ease";
    document.body.appendChild(overlay);

    function openSidebar() {
      sidebar.classList.add("open");
      overlay.style.opacity = "1";
      overlay.style.pointerEvents = "auto";
      document.body.style.overflow = "hidden";
    }

    function closeSidebar() {
      sidebar.classList.remove("open");
      overlay.style.opacity = "0";
      overlay.style.pointerEvents = "none";
      document.body.style.overflow = "";
    }

    hamBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      openSidebar();
    });

    overlay.addEventListener("click", closeSidebar);

    // Close sidebar on link click in mobile
    const sidebarLinks = sidebar.querySelectorAll(".menu-item a");
    sidebarLinks.forEach(link => {
      link.addEventListener("click", closeSidebar);
    });
  }
});
