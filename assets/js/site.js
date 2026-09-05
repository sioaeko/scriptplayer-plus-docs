/* ============================================================
   ScriptPlayer+ Docs — site behaviour
   Hash routing · TOC · search · lazy video · lightbox
   ============================================================ */
(function () {
  "use strict";

  var pages = Array.prototype.slice.call(document.querySelectorAll(".page"));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-link"));
  var order = navLinks.map(function (a) {
    return a.getAttribute("href").slice(1);
  });

  /* ---------- strings that JS builds, per language ---------- */

  var STRINGS = {
    ko: {
      prev: "이전", next: "다음",
      titleSuffix: "ScriptPlayer+ 사용 설명서",
      noResults: "검색 결과가 없습니다.<br />다른 낱말로 찾아보세요.",
      stars: function (n) { return "GitHub 저장소 — 스타 " + n + "개"; }
    },
    en: {
      prev: "Previous", next: "Next",
      titleSuffix: "ScriptPlayer+ Documentation",
      noResults: "No results.<br />Try a different word.",
      stars: function (n) { return "GitHub repository — " + n + " stars"; }
    },
    ja: {
      prev: "前へ", next: "次へ",
      titleSuffix: "ScriptPlayer+ 取扱説明書",
      noResults: "検索結果がありません。<br />別の語句でお試しください。",
      stars: function (n) { return "GitHub リポジトリ — スター " + n + " 件"; }
    },
    zh: {
      prev: "上一页", next: "下一页",
      titleSuffix: "ScriptPlayer+ 使用手册",
      noResults: "没有搜索结果。<br />请换个词再试。",
      stars: function (n) { return "GitHub 仓库 — " + n + " 个星标"; }
    }
  };
  var T = STRINGS[document.documentElement.lang] || STRINGS.ko;

  var sidebar = document.getElementById("sidebar");
  var scrim = document.getElementById("navScrim");
  var navToggle = document.getElementById("navToggle");
  var tocList = document.getElementById("tocList");
  var tocBox = document.getElementById("toc");
  var pager = document.getElementById("pager");
  var toTop = document.getElementById("toTop");

  /* ---------- helpers ---------- */

  function pageIdOf(slug) {
    return "page-" + slug;
  }

  /** Given any hash, resolve which page slug it belongs to and the heading (if any). */
  function resolve(hash) {
    var raw = (hash || "").replace(/^#/, "");
    if (!raw) return { slug: order[0], heading: null };

    if (document.getElementById(pageIdOf(raw))) {
      return { slug: raw, heading: null };
    }

    // maybe it's a heading id inside some page
    var el = document.getElementById(raw);
    if (el) {
      var host = el.closest(".page");
      if (host) {
        return { slug: host.id.replace(/^page-/, ""), heading: raw };
      }
    }
    return { slug: order[0], heading: null };
  }

  /* ---------- video lazy-load / autoplay ---------- */

  var videoObserver = null;
  if ("IntersectionObserver" in window) {
    videoObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var v = entry.target;
          if (entry.isIntersecting) {
            if (v.dataset.src) {
              v.src = v.dataset.src;
              delete v.dataset.src;
              v.removeAttribute("data-src");
            }
            var p = v.play();
            if (p && p.catch) p.catch(function () {});
          } else if (!v.paused) {
            v.pause();
          }
        });
      },
      { rootMargin: "120px 0px", threshold: 0.15 }
    );
  }

  function observeVideos(root) {
    var vids = root.querySelectorAll("video");
    Array.prototype.forEach.call(vids, function (v) {
      if (videoObserver) {
        videoObserver.observe(v);
      } else if (v.dataset.src) {
        // no IO support — just load it
        v.src = v.dataset.src;
        v.removeAttribute("data-src");
      }
    });
  }

  function stopVideos(root) {
    var vids = root.querySelectorAll("video");
    Array.prototype.forEach.call(vids, function (v) {
      if (!v.paused) v.pause();
      if (videoObserver) videoObserver.unobserve(v);
    });
  }

  /* ---------- table of contents ---------- */

  var tocLinks = [];

  function buildToc(page) {
    tocList.innerHTML = "";
    tocLinks = [];

    var heads = page.querySelectorAll("h2[id]");
    if (!heads.length) {
      tocBox.style.visibility = "hidden";
      return;
    }
    tocBox.style.visibility = "";

    Array.prototype.forEach.call(heads, function (h) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + h.id;
      // strip the trailing "#" anchor and any pill text
      var clone = h.cloneNode(true);
      var junk = clone.querySelectorAll(".anchor, .pill");
      Array.prototype.forEach.call(junk, function (n) {
        n.remove();
      });
      a.textContent = clone.textContent.trim();
      a.dataset.target = h.id;
      li.appendChild(a);
      tocList.appendChild(li);
      tocLinks.push(a);
    });
  }

  function syncToc() {
    if (!tocLinks.length) return;
    var best = null;
    var bestTop = -Infinity;
    tocLinks.forEach(function (a) {
      var h = document.getElementById(a.dataset.target);
      if (!h) return;
      var top = h.getBoundingClientRect().top - 96;
      if (top <= 0 && top > bestTop) {
        bestTop = top;
        best = a;
      }
    });
    if (!best) best = tocLinks[0];
    tocLinks.forEach(function (a) {
      a.classList.toggle("is-active", a === best);
    });
  }

  /* ---------- pager ---------- */

  function buildPager(slug) {
    var i = order.indexOf(slug);
    var prev = i > 0 ? navLinks[i - 1] : null;
    var next = i > -1 && i < navLinks.length - 1 ? navLinks[i + 1] : null;

    function label(a) {
      var c = a.cloneNode(true);
      var n = c.querySelector(".n");
      if (n) n.remove();
      return c.textContent.trim();
    }

    pager.innerHTML = "";

    var left = document.createElement(prev ? "a" : "div");
    if (prev) {
      left.href = prev.getAttribute("href");
      left.innerHTML =
        '<span class="dir">' + T.prev + '</span><span class="ttl">' + label(prev) + "</span>";
    } else {
      left.className = "placeholder";
    }
    pager.appendChild(left);

    var right = document.createElement(next ? "a" : "div");
    if (next) {
      right.href = next.getAttribute("href");
      right.className = "next";
      right.innerHTML =
        '<span class="dir">' + T.next + '</span><span class="ttl">' + label(next) + "</span>";
    } else {
      right.className = "placeholder";
    }
    pager.appendChild(right);
  }

  /* ---------- routing ---------- */

  var currentSlug = null;

  function show(hash, opts) {
    opts = opts || {};
    var r = resolve(hash);
    var page = document.getElementById(pageIdOf(r.slug));
    if (!page) return;

    if (r.slug !== currentSlug) {
      pages.forEach(function (p) {
        if (p !== page && p.classList.contains("is-active")) {
          p.classList.remove("is-active");
          stopVideos(p);
        }
      });
      page.classList.add("is-active");
      observeVideos(page);

      navLinks.forEach(function (a) {
        a.classList.toggle("is-active", a.getAttribute("href") === "#" + r.slug);
      });

      buildToc(page);
      buildPager(r.slug);
      currentSlug = r.slug;

      document.title =
        (page.dataset.title ? page.dataset.title + " · " : "") + T.titleSuffix;
    }

    // scroll
    if (r.heading) {
      var h = document.getElementById(r.heading);
      if (h) {
        // let layout settle first
        requestAnimationFrame(function () {
          var y = h.getBoundingClientRect().top + window.pageYOffset - 76;
          window.scrollTo({ top: y, behavior: opts.instant ? "auto" : "smooth" });
        });
      }
    } else if (!opts.keepScroll) {
      window.scrollTo({ top: 0, behavior: opts.instant ? "auto" : "smooth" });
    }

    syncToc();
    closeNav();
  }

  window.addEventListener("hashchange", function () {
    show(location.hash);
  });

  /* ---------- mobile nav ---------- */

  function openNav() {
    sidebar.classList.add("is-open");
    scrim.classList.add("is-open");
    navToggle.setAttribute("aria-expanded", "true");
  }
  function closeNav() {
    sidebar.classList.remove("is-open");
    scrim.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }
  navToggle.addEventListener("click", function () {
    if (sidebar.classList.contains("is-open")) closeNav();
    else openNav();
  });
  scrim.addEventListener("click", closeNav);

  /* ---------- scroll effects ---------- */

  var ticking = false;
  window.addEventListener(
    "scroll",
    function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        syncToc();
        toTop.classList.toggle("is-shown", window.pageYOffset > 600);
        ticking = false;
      });
    },
    { passive: true }
  );

  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------- lightbox ---------- */

  var lightbox = document.getElementById("lightbox");
  // Created here so no empty image element ships in the markup.
  // alt is set from the source figure each time the lightbox opens.
  var lightboxImg = document.createElement("img");
  lightboxImg.alt = "";
  lightbox.appendChild(lightboxImg);

  document.addEventListener("click", function (e) {
    var img = e.target.closest(".shot img");
    if (img) {
      lightboxImg.src = img.currentSrc || img.src;
      lightboxImg.alt = img.alt || "";
      lightbox.classList.add("is-open");
      return;
    }
    if (e.target.closest("#lightbox")) {
      lightbox.classList.remove("is-open");
      lightboxImg.removeAttribute("src");
    }
  });

  /* ============================================================
     Search
     ============================================================ */

  var searchOverlay = document.getElementById("searchOverlay");
  var searchInput = document.getElementById("searchInput");
  var searchResults = document.getElementById("searchResults");
  var searchBtn = document.getElementById("searchBtn");

  // Build an index once, at load: one record per h2/h3 block (+ one per page).
  var index = [];

  function buildIndex() {
    pages.forEach(function (page) {
      var slug = page.id.replace(/^page-/, "");
      var pageTitle = page.dataset.title || slug;
      var group = page.dataset.group || "";

      var lede = page.querySelector(".lede, .hero-lede");
      index.push({
        slug: slug,
        anchor: slug,
        crumb: group,
        title: pageTitle,
        text: lede ? lede.textContent.trim() : "",
        weight: 3
      });

      var heads = page.querySelectorAll("h2[id], h3[id]");
      Array.prototype.forEach.call(heads, function (h) {
        var c = h.cloneNode(true);
        var junk = c.querySelectorAll(".anchor");
        Array.prototype.forEach.call(junk, function (n) {
          n.remove();
        });
        var title = c.textContent.trim();

        // gather following sibling text until the next heading
        var buf = [];
        var node = h.nextElementSibling;
        while (node && !/^H[123]$/.test(node.tagName)) {
          if (node.tagName !== "FIGURE") buf.push(node.textContent);
          node = node.nextElementSibling;
        }

        index.push({
          slug: slug,
          anchor: h.id,
          crumb: pageTitle,
          title: title,
          text: buf.join(" ").replace(/\s+/g, " ").trim(),
          weight: h.tagName === "H2" ? 2 : 1
        });
      });
    });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function highlight(text, terms) {
    var out = escapeHtml(text);
    terms.forEach(function (t) {
      if (!t) return;
      var re = new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      out = out.replace(re, "<mark>$1</mark>");
    });
    return out;
  }

  /** Return a ~140 char window around the first match. */
  function snippet(text, terms) {
    if (!text) return "";
    var lower = text.toLowerCase();
    var at = -1;
    for (var i = 0; i < terms.length; i++) {
      var p = lower.indexOf(terms[i]);
      if (p > -1 && (at === -1 || p < at)) at = p;
    }
    if (at === -1) return text.slice(0, 140);
    var start = Math.max(0, at - 45);
    return (start > 0 ? "…" : "") + text.slice(start, start + 150);
  }

  var selected = -1;
  var currentHits = [];

  function runSearch(q) {
    q = q.trim().toLowerCase();
    searchResults.innerHTML = "";
    currentHits = [];
    selected = -1;

    if (q.length < 1) return;

    var terms = q.split(/\s+/).filter(Boolean);

    var hits = [];
    index.forEach(function (rec) {
      var hayTitle = rec.title.toLowerCase();
      var hayText = rec.text.toLowerCase();
      var score = 0;
      var all = true;

      terms.forEach(function (t) {
        var inTitle = hayTitle.indexOf(t) > -1;
        var inText = hayText.indexOf(t) > -1;
        if (!inTitle && !inText) all = false;
        if (inTitle) score += 12;
        if (inText) score += 3;
        if (hayTitle.indexOf(t) === 0) score += 6;
      });

      if (!all) return;
      score += rec.weight;
      hits.push({ rec: rec, score: score });
    });

    hits.sort(function (a, b) {
      return b.score - a.score;
    });
    hits = hits.slice(0, 20);

    if (!hits.length) {
      searchResults.innerHTML =
        '<div class="search-empty">' + T.noResults + "</div>";
      return;
    }

    hits.forEach(function (h, i) {
      var rec = h.rec;
      var btn = document.createElement("button");
      btn.className = "sr-item" + (i === 0 ? " is-sel" : "");
      btn.type = "button";
      btn.innerHTML =
        (rec.crumb ? '<span class="sr-crumb">' + escapeHtml(rec.crumb) + "</span>" : "") +
        '<span class="sr-title">' + highlight(rec.title, terms) + "</span>" +
        (rec.text
          ? '<span class="sr-snip">' + highlight(snippet(rec.text, terms), terms) + "</span>"
          : "");
      btn.addEventListener("click", function () {
        go(rec);
      });
      searchResults.appendChild(btn);
      currentHits.push({ el: btn, rec: rec });
    });
    selected = 0;
  }

  function go(rec) {
    closeSearch();
    var target = "#" + rec.anchor;
    if (location.hash === target) show(target);
    else location.hash = target;
  }

  function moveSel(delta) {
    if (!currentHits.length) return;
    if (selected > -1) currentHits[selected].el.classList.remove("is-sel");
    selected = (selected + delta + currentHits.length) % currentHits.length;
    var el = currentHits[selected].el;
    el.classList.add("is-sel");
    el.scrollIntoView({ block: "nearest" });
  }

  function openSearch() {
    searchOverlay.classList.add("is-open");
    searchInput.value = "";
    searchResults.innerHTML = "";
    currentHits = [];
    selected = -1;
    searchInput.focus();
  }

  function closeSearch() {
    searchOverlay.classList.remove("is-open");
  }

  searchBtn.addEventListener("click", openSearch);
  searchInput.addEventListener("input", function () {
    runSearch(searchInput.value);
  });

  searchOverlay.addEventListener("click", function (e) {
    if (e.target === searchOverlay) closeSearch();
  });

  document.addEventListener("keydown", function (e) {
    var open = searchOverlay.classList.contains("is-open");

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      open ? closeSearch() : openSearch();
      return;
    }

    if (
      e.key === "/" &&
      !open &&
      !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)
    ) {
      e.preventDefault();
      openSearch();
      return;
    }

    if (e.key === "Escape") {
      if (open) closeSearch();
      if (lightbox.classList.contains("is-open")) {
        lightbox.classList.remove("is-open");
        lightboxImg.src = "";
      }
      closeNav();
      return;
    }

    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveSel(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveSel(-1);
    } else if (e.key === "Enter" && selected > -1 && currentHits[selected]) {
      e.preventDefault();
      go(currentHits[selected].rec);
    }
  });

  /* ---------- live GitHub star count ---------- */
  /* The baked-in number is the last known value, so the button is never empty
     if the request is blocked, rate-limited, or offline. */

  (function refreshStars() {
    var el = document.getElementById("ghStars");
    if (!el || !window.fetch) return;

    fetch("https://api.github.com/repos/sioaeko/scriptplayer-plus", {
      headers: { Accept: "application/vnd.github+json" }
    })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (j) {
        if (!j || typeof j.stargazers_count !== "number") return;
        var n = j.stargazers_count;
        el.textContent = n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
        var link = el.closest("a");
        if (link) link.setAttribute("aria-label", T.stars(n));
      })
      .catch(function () {
        /* keep the baked-in value */
      });
  })();

  /* ---------- init ---------- */

  buildIndex();
  show(location.hash, { instant: true });
})();
