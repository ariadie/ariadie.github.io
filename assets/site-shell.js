(function () {
  "use strict";

  const sections = {
    ai: "Kecerdasan Artifisial",
    control: "Sistem Kendali",
    conv: "Convex Optimization",
    "moo-mrpp": "MOO-MRPP",
    pymoo: "Pymoo",
    signal: "Signals & Systems"
  };

  function appendLink(parent, label, href, className) {
    const link = document.createElement("a");
    link.textContent = label;
    link.href = href;
    if (className) link.className = className;
    parent.appendChild(link);
  }

  function appendSeparator(parent) {
    const separator = document.createElement("span");
    separator.className = "acn-site-shell__separator";
    separator.setAttribute("aria-hidden", "true");
    separator.textContent = "›";
    parent.appendChild(separator);
  }

  function renderSiteShell() {
    if (document.querySelector(".acn-site-shell")) return;

    const script = document.currentScript || document.querySelector('script[src*="site-shell.js"]');
    if (!script || !script.src) return;

    const rootUrl = new URL("../", script.src);
    const currentUrl = new URL(window.location.href);
    let relativePath = decodeURIComponent(currentUrl.pathname.slice(rootUrl.pathname.length)).replace(/^\/+/, "");
    if (!relativePath || relativePath.endsWith("/")) relativePath += "index.html";

    const parts = relativePath.split("/");
    const sectionKey = parts.length > 1 ? parts[0] : "";
    const sectionLabel = sections[sectionKey];
    if (!sectionLabel) return;

    const main = document.querySelector("main, .content, .container");
    if (main && !main.id) main.id = "main-content";

    const nav = document.createElement("nav");
    nav.className = "acn-site-shell";
    nav.setAttribute("aria-label", "Breadcrumb situs");

    if (main) appendLink(nav, "Lewati ke konten", "#" + main.id, "acn-site-shell__skip");
    appendLink(nav, "Beranda Situs", new URL("index.html", rootUrl).href);
    appendSeparator(nav);

    const isSectionIndex = parts.length === 2 && parts[1] === "index.html";
    if (isSectionIndex) {
      const current = document.createElement("span");
      current.className = "acn-site-shell__current";
      current.setAttribute("aria-current", "page");
      current.textContent = sectionLabel;
      nav.appendChild(current);
    } else {
      appendLink(nav, sectionLabel, new URL(sectionKey + "/", rootUrl).href);
      appendSeparator(nav);
      const current = document.createElement("span");
      current.className = "acn-site-shell__current";
      current.setAttribute("aria-current", "page");
      current.textContent = (document.querySelector("h1")?.textContent || document.title).trim();
      nav.appendChild(current);
    }

    document.body.insertBefore(nav, document.body.firstChild);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderSiteShell, { once: true });
  } else {
    renderSiteShell();
  }
})();
