(function () {
  "use strict";

  var $ = function (selector, root) { return (root || document).querySelector(selector); };
  var $$ = function (selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var toast = $("#toast");
  var toastTimer = null;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("show");
    }, 3200);
  }

  function copyText(text) {
    return new Promise(function (resolve) {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () {
          resolve(true);
        }).catch(function () {
          resolve(fallbackCopy(text));
        });
        return;
      }
      resolve(fallbackCopy(text));
    });
  }

  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;top:-1000px;left:-1000px;opacity:0;";
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (error) { ok = false; }
    document.body.removeChild(area);
    return ok;
  }

  /* ---------------- Mobile navigation ---------------- */

  var menuBtn = $("#menuBtn");
  var mobileMenu = $("#mobileMenu");

  function setMenu(open) {
    if (!menuBtn || !mobileMenu) return;
    mobileMenu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    menuBtn.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  }

  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      setMenu(mobileMenu.hidden);
    });

    $$("a", mobileMenu).forEach(function (link) {
      link.addEventListener("click", function () { setMenu(false); });
    });

    document.addEventListener("click", function (event) {
      if (!mobileMenu.hidden && !event.target.closest(".nav")) setMenu(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !mobileMenu.hidden) {
        setMenu(false);
        menuBtn.focus();
      }
    });

    var wide = window.matchMedia("(min-width: 961px)");
    var onWide = function (event) { if (event.matches) setMenu(false); };
    if (wide.addEventListener) wide.addEventListener("change", onWide);
    else if (wide.addListener) wide.addListener(onWide);
  }

  /* ---------------- Downloads data ---------------- */

  var AGENT_VERSION = "1.4.2";

  var AGENT_BUILDS = {
    windows: {
      osName: "Windows",
      file: "NevadAgent-" + AGENT_VERSION + "-win-x64.exe",
      size: "148 МБ",
      button: "Скачать для Windows",
      cli: "winget install --id Nevad.Agent -e",
      sha: "9f2c4b7e…a71e"
    },
    macos: {
      osName: "macOS",
      file: "NevadAgent-" + AGENT_VERSION + "-universal.dmg",
      size: "162 МБ",
      button: "Скачать для macOS",
      cli: "brew install --cask nevad-agent",
      sha: "4d8e1f2a…c903"
    },
    linux: {
      osName: "Linux",
      file: "NevadAgent-" + AGENT_VERSION + "-x86_64.AppImage",
      size: "154 МБ",
      button: "Скачать для Linux",
      cli: "curl -fsSL https://get.nevad.dev/install.sh | sh",
      sha: "b72a9d14…e6f0"
    }
  };

  var MODELS = {
    pro: {
      title: "Nevad 3 Pro",
      file: "nevad-3-pro-q4_k_m.gguf",
      size: "42 ГБ",
      meta: "Q4_K_M · 70B · 48 ГБ RAM",
      sha: "c81d6a02…4f9b"
    },
    air: {
      title: "Nevad 3 Air",
      file: "nevad-3-air-q4_k_m.gguf",
      size: "14,5 ГБ",
      meta: "Q4_K_M · 24B · 24 ГБ RAM",
      sha: "77b1e9c4…2d08"
    },
    embed: {
      title: "Nevad 3 Embed",
      file: "nevad-3-embed-f16.gguf",
      size: "80 МБ",
      meta: "F16 · 40M · 2 ГБ RAM",
      sha: "a13f0b9d…5c77"
    }
  };

  function detectOS() {
    var ua = navigator.userAgent || "";
    if (/Windows|Win64|Win32/i.test(ua)) return "windows";
    if (/Mac OS X|Macintosh|MacIntel/i.test(ua)) return "macos";
    if (/Linux|X11|Ubuntu|Fedora/i.test(ua)) return "linux";
    return "windows";
  }

  var currentOS = detectOS();
  var osTabs = $$(".os-tab");
  var osHint = $("[data-os-hint]");

  function setOS(os, automatic) {
    if (!AGENT_BUILDS[os]) os = "windows";
    currentOS = os;
    var build = AGENT_BUILDS[os];

    osTabs.forEach(function (tab) {
      var active = tab.dataset.os === os;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-pressed", active ? "true" : "false");
    });

    $$("[data-os-name]").forEach(function (element) {
      element.textContent = build.osName;
    });
    $$("[data-agent-file]").forEach(function (element) {
      element.textContent = build.file;
    });
    $$("[data-agent-size]").forEach(function (element) {
      element.textContent = build.size;
    });
    $$("[data-agent-button]").forEach(function (element) {
      element.textContent = build.button;
    });
    $$("[data-agent-sha]").forEach(function (element) {
      element.textContent = build.sha;
    });
    $$("[data-cli]").forEach(function (element) {
      element.textContent = build.cli;
    });
    if (osHint) {
      osHint.textContent = (automatic ? "Определено автоматически: " : "Выбрано: ") + build.osName;
    }
  }

  osTabs.forEach(function (tab) {
    tab.addEventListener("click", function () { setOS(tab.dataset.os, false); });
  });

  setOS(currentOS, true);

  /* ---------------- Download dialog ---------------- */

  var dialog = $("#downloadDialog");
  var dlKind = $("#dlKind");
  var dlTitle = $("#dlTitle");
  var dlMeta = $("#dlMeta");
  var dlFile = $("#dlFile");
  var dlSize = $("#dlSize");
  var dlHash = $("#dlHash");
  var dlBar = $("#dlBar");
  var dlStatus = $("#dlStatus");
  var dlPercent = $("#dlPercent");
  var dlProgress = $("#dlProgress");
  var dlClose = $("#dlClose");
  var dlDone = $("#dlDone");
  var dlCopy = $("#dlCopy");
  var progressTimer = null;
  var finishTimer = null;
  var currentDownload = null;
  var lastTrigger = null;

  function buildDownload(kind, variant) {
    if (kind === "agent") {
      var build = AGENT_BUILDS[currentOS];
      return {
        label: "Загрузка · приложение",
        title: "Nevad Agent",
        meta: AGENT_VERSION + " · " + build.osName + " · " + build.size,
        file: build.file,
        size: build.size,
        sha: build.sha
      };
    }
    var model = MODELS[variant] || MODELS.pro;
    return {
      label: "Загрузка · модель",
      title: model.title,
      meta: model.meta + " · " + model.size,
      file: model.file,
      size: model.size,
      sha: model.sha
    };
  }

  function resetProgress() {
    window.clearInterval(progressTimer);
    window.clearTimeout(finishTimer);
    progressTimer = null;
    finishTimer = null;
    dlBar.style.width = "0%";
    dlPercent.textContent = "0%";
    dlStatus.textContent = "Подключение к зеркалу…";
    dlStatus.classList.remove("is-done");
    dlProgress.setAttribute("aria-valuenow", "0");
  }

  function startProgress() {
    var progress = 0;
    progressTimer = window.setInterval(function () {
      var step = progress < 65 ? 4 + Math.random() * 10 : 2 + Math.random() * 5;
      progress = Math.min(100, progress + step);
      var rounded = Math.floor(progress);
      dlBar.style.width = progress + "%";
      dlPercent.textContent = rounded + "%";
      dlProgress.setAttribute("aria-valuenow", String(rounded));

      if (progress < 100) {
        dlStatus.textContent = progress < 14 ? "Подключение к зеркалу…" : "Загрузка · " + rounded + "%";
        return;
      }

      window.clearInterval(progressTimer);
      progressTimer = null;
      dlStatus.textContent = "Проверка SHA-256…";
      finishTimer = window.setTimeout(function () {
        dlStatus.textContent = "Демо завершено · файл не сохранялся";
        dlStatus.classList.add("is-done");
        finishTimer = null;
      }, 550);
    }, 150);
  }

  function openDownload(kind, variant, trigger) {
    if (!dialog) return;
    currentDownload = buildDownload(kind, variant);
    lastTrigger = trigger || null;

    dlKind.textContent = currentDownload.label;
    dlTitle.textContent = currentDownload.title;
    dlMeta.textContent = currentDownload.meta;
    dlFile.textContent = currentDownload.file;
    dlSize.textContent = currentDownload.size;
    dlHash.textContent = currentDownload.sha;

    resetProgress();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    startProgress();
  }

  function closeDownload() {
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  if (dialog) {
    if (dlClose) dlClose.addEventListener("click", closeDownload);
    if (dlDone) dlDone.addEventListener("click", closeDownload);

    if (dlCopy) {
      dlCopy.addEventListener("click", function () {
        if (!currentDownload) return;
        var url = "https://get.nevad.dev/downloads/" + encodeURIComponent(currentDownload.file);
        copyText(url).then(function (ok) {
          showToast(ok ? "Ссылка на файл скопирована" : "Не удалось скопировать ссылку");
        });
      });
    }

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) closeDownload();
    });

    dialog.addEventListener("close", function () {
      window.clearInterval(progressTimer);
      window.clearTimeout(finishTimer);
      progressTimer = null;
      finishTimer = null;
      if (lastTrigger && typeof lastTrigger.focus === "function") {
        lastTrigger.focus({ preventScroll: true });
      }
    });
  }

  $$("[data-download]").forEach(function (button) {
    button.addEventListener("click", function () {
      var kind = button.dataset.download === "model" ? "model" : "agent";
      var variant = button.dataset.model || "pro";
      openDownload(kind, variant, button);
    });
  });

  /* ---------------- Copy controls ---------------- */

  $$("[data-copy]").forEach(function (button) {
    button.addEventListener("click", function () {
      var selector = button.dataset.copy === "agent-sha" ? "[data-agent-sha]" : "[data-model-sha]";
      var target = $(selector);
      if (!target) return;
      copyText(target.textContent.trim()).then(function (ok) {
        if (!ok) {
          showToast("Не удалось скопировать — выделите значение вручную");
          return;
        }
        showToast("Контрольная сумма скопирована");
        button.classList.add("is-copied");
        window.setTimeout(function () { button.classList.remove("is-copied"); }, 1400);
      });
    });
  });

  var copyCommandBtn = $("[data-copy-command]");
  if (copyCommandBtn) {
    copyCommandBtn.addEventListener("click", function () {
      var code = $("[data-cli]");
      if (!code) return;
      var label = copyCommandBtn.querySelector("span");
      var original = label ? label.textContent : "";
      copyText(code.textContent.trim()).then(function (ok) {
        if (!ok) {
          showToast("Не удалось скопировать — выделите команду вручную");
          return;
        }
        showToast("Команда скопирована");
        copyCommandBtn.classList.add("is-copied");
        if (label) label.textContent = "Скопировано";
        window.setTimeout(function () {
          copyCommandBtn.classList.remove("is-copied");
          if (label) label.textContent = original;
        }, 1500);
      });
    });
  }

  /* ---------------- Demo-only links ---------------- */

  $$("[data-demo-link]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      showToast("Демо-макет: этот раздел не подключён.");
    });
  });

  /* ---------------- Product window tabs ---------------- */

  var segButtons = $$(".seg-btn");
  var segPanels = $$("[data-panel]");

  function activateTab(name) {
    segButtons.forEach(function (button) {
      var active = button.dataset.tab === name;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
      button.setAttribute("tabindex", active ? "0" : "-1");
    });
    segPanels.forEach(function (panel) {
      panel.hidden = panel.dataset.panel !== name;
    });
  }

  segButtons.forEach(function (button) {
    button.addEventListener("click", function () { activateTab(button.dataset.tab); });
    button.addEventListener("keydown", function (event) {
      var index = segButtons.indexOf(button);
      var next = -1;
      if (event.key === "ArrowRight") next = (index + 1) % segButtons.length;
      else if (event.key === "ArrowLeft") next = (index - 1 + segButtons.length) % segButtons.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = segButtons.length - 1;
      else return;
      event.preventDefault();
      activateTab(segButtons[next].dataset.tab);
      segButtons[next].focus();
    });
  });

  /* ---------------- Statement word reveal ---------------- */

  var statement = $("#statement");
  var words = [];

  if (statement) {
    var walker = document.createTreeWalker(statement, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement && node.parentElement.closest(".chip")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach(function (node) {
      var parts = node.nodeValue.split(/(\s+)/);
      var fragment = document.createDocumentFragment();
      parts.forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          fragment.appendChild(document.createTextNode(part));
        } else {
          var span = document.createElement("span");
          span.className = "word";
          span.textContent = part;
          fragment.appendChild(span);
        }
      });
      node.parentNode.replaceChild(fragment, node);
    });

    words = $$(".word", statement);
  }

  var statementFrame = null;

  function updateStatement() {
    statementFrame = null;
    if (!statement || !words.length) return;

    if (reduceMotion.matches) {
      words.forEach(function (word) { word.classList.add("is-read"); });
      return;
    }

    var rect = statement.getBoundingClientRect();
    var viewport = window.innerHeight || 800;
    var start = viewport * 0.82;
    var end = viewport * 0.34;
    var total = Math.max(rect.height + (start - end), 1);
    var progress = Math.min(1, Math.max(0, (start - rect.top) / total));
    var count = Math.round(progress * words.length);

    words.forEach(function (word, index) {
      word.classList.toggle("is-read", index < count);
    });
  }

  function scheduleStatement() {
    if (statementFrame) return;
    statementFrame = window.requestAnimationFrame(updateStatement);
  }

  window.addEventListener("scroll", scheduleStatement, { passive: true });
  window.addEventListener("resize", scheduleStatement);
  scheduleStatement();

  if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", scheduleStatement);
  else if (reduceMotion.addListener) reduceMotion.addListener(scheduleStatement);

  /* ---------------- Reveal on scroll ---------------- */

  var revealElements = $$("[data-reveal]");
  if (revealElements.length) {
    if (!("IntersectionObserver" in window) || reduceMotion.matches) {
      revealElements.forEach(function (element) { element.classList.add("in"); });
    } else {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });
      revealElements.forEach(function (element) { observer.observe(element); });
    }
  }

  /* ---------------- Keyboard shortcut ---------------- */

  document.addEventListener("keydown", function (event) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    var target = event.target;
    var typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
    if (typing) return;
    if (dialog && dialog.open) return;
    if (event.key.toLowerCase() !== "d") return;

    var downloadSection = $("#download");
    if (!downloadSection) return;
    downloadSection.scrollIntoView({
      behavior: reduceMotion.matches ? "auto" : "smooth",
      block: "start"
    });
  });
})();
