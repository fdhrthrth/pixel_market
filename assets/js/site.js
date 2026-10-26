/* ============================================================
   集市 · 宣传站交互
   无构建、无依赖：入场揭示、建集动画、素材画廊、BGM 试听。
   ============================================================ */

(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  var IMG = "./assets/img/";

  /* ---------- 1. 建集动画：按 13×8 网格逐格铺瓦 ---------- */

  // g 草地 · m 青苔 · p 小径 · r 街道 · s 青石板 · d 泥地 · f 农田土
  var MARKET_MAP = [
    "ggggggpgggggg",
    "ggggggpgggggg",
    "gggggsssggggg",
    "gggggsssggmmg",
    "rrrrrrrrrrrrr",
    "ggggggpgggggg",
    "ggdgggpggggfg",
    "ggggggpgggggg"
  ];
  var TILE_FILE = {
    g: "tiles/pixel_market_tile_grass.png",
    m: "tiles/pixel_market_tile_moss.png",
    p: "tiles/pixel_market_tile_path.png",
    r: "tiles/pixel_market_tile_road.png",
    s: "tiles/pixel_market_tile_stone.png",
    d: "tiles/pixel_market_tile_dirt.png",
    f: "tiles/pixel_market_tile_farmsoil.png"
  };
  var CELL = 60;
  var X0 = 60;
  var Y0 = 40;
  var SVGNS = "http://www.w3.org/2000/svg";

  var tileGroup = document.querySelector("[data-tiles]");
  if (tileGroup) {
    var frag = document.createDocumentFragment();
    MARKET_MAP.forEach(function (row, r) {
      for (var c = 0; c < row.length; c++) {
        var file = TILE_FILE[row[c]];
        if (!file) continue;
        var img = document.createElementNS(SVGNS, "image");
        img.setAttribute("href", IMG + file);
        img.setAttribute("x", X0 + c * CELL);
        img.setAttribute("y", Y0 + r * CELL);
        img.setAttribute("width", CELL);
        img.setAttribute("height", CELL);
        img.setAttribute("preserveAspectRatio", "none");
        img.setAttribute("class", "tile-in");
        // 由西北向东南斜向铺开
        img.style.setProperty("--at", (r + c) * 26 + "ms");
        frag.appendChild(img);
      }
    });
    tileGroup.appendChild(frag);
  }

  /* ---------- 2. 一次性观察：入视野触发，滚过去的也补触发 ---------- */

  function watchOnce(nodes, opts, onFire) {
    if (!nodes.length) return;
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(onFire);
      return;
    }
    var left = nodes.slice();
    var io = new IntersectionObserver(function (entries) {
      var hit = [];
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        hit.push(e.target);
      });
      if (hit.length) fire(hit);
    }, opts);

    var fire = function (hits) {
      hits.forEach(function (el) {
        io.unobserve(el);
        var i = left.indexOf(el);
        if (i >= 0) left.splice(i, 1);
        onFire(el);
      });
      if (!left.length) {
        window.removeEventListener("scroll", sweep, { capture: true });
        return;
      }
      window.requestAnimationFrame(sweep);
    };

    // 滚得比一帧还快时，IO 可能整段跳过某些元素；滚动时顺手补一遍。
    var sweep = function () {
      var vh = window.innerHeight;
      var passed = left.filter(function (el) {
        return el.getBoundingClientRect().bottom < 0;
      });
      if (passed.length) fire(passed);
    };

    left.forEach(function (el) {
      io.observe(el);
    });
    window.addEventListener("scroll", sweep, { passive: true, capture: true });
  }

  /* ---------- 3. 滚动入场 ---------- */

  var revealTargets = [].slice.call(document.querySelectorAll("[data-reveal]"));

  if (!reduce) {
    root.setAttribute("data-reveal-arm", "");

    var order = new WeakMap();
    revealTargets.forEach(function (el, i) {
      order.set(el, i);
    });

    var pending = [];
    var flushTimer = 0;

    var arm = function () {
      pending.sort(function (a, b) {
        return order.get(a) - order.get(b);
      });
      pending.forEach(function (el, i) {
        el.style.setProperty("--reveal-delay", (i % 6) * 70 + "ms");
        el.setAttribute("data-revealed", "in");
      });
      pending = [];
      flushTimer = 0;
    };

    watchOnce(
      revealTargets,
      { rootMargin: "0px 0px -12% 0px", threshold: 0.1 },
      function (el) {
        pending.push(el);
        if (flushTimer) return;
        // 同批入场的元素依次错开，读起来才有节奏
        flushTimer = window.setTimeout(function () {
          window.clearTimeout(flushTimer);
          flushTimer = 0;
          arm();
        }, 60);
      }
    );
  } else {
    revealTargets.forEach(function (el) {
      el.setAttribute("data-revealed", "in");
    });
  }

  /* ---------- 4. 场景播放：入视野播一次，可手动重播 ---------- */

  function playScene(scene) {
    scene.removeAttribute("data-play");
    void scene.getBoundingClientRect();
    scene.setAttribute("data-play", "");
  }

  watchOnce(
    [].slice.call(document.querySelectorAll("[data-scene],[data-play-on-view]")),
    { threshold: 0.2 },
    playScene
  );

  document.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-replay]");
    if (!btn) return;
    var scene = document.getElementById(btn.getAttribute("data-replay"));
    if (scene) playScene(scene);
  });

  // 卡片悬停重播图标描线
  document.addEventListener("pointerover", function (ev) {
    var host = ev.target.closest("[data-replay-on-hover]");
    if (!host || host.__hovered === host) return;
    host.__hovered = host;
    [].forEach.call(host.children, function (cell) {
      if (cell.querySelector) playScene(cell);
    });
  });

  /* ---------- 5. 顶栏 ---------- */

  var nav = document.querySelector(".topnav");
  if (nav) {
    var onScroll = function () {
      if (window.scrollY > 8) nav.setAttribute("data-stuck", "");
      else nav.removeAttribute("data-stuck");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  var menu = document.getElementById("mobile-menu");
  var burger = document.querySelector(".topnav__burger");
  if (burger && menu) {
    burger.addEventListener("click", function () {
      var open = menu.hasAttribute("hidden");
      if (open) menu.removeAttribute("hidden");
      else menu.setAttribute("hidden", "");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.addEventListener("click", function (ev) {
      if (ev.target.closest("a")) {
        menu.setAttribute("hidden", "");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  var links = [].slice.call(document.querySelectorAll(".topnav__links a[href^='#']"));
  if (links.length && "IntersectionObserver" in window) {
    var byId = {};
    links.forEach(function (a) {
      var sec = document.querySelector(a.getAttribute("href"));
      if (sec) byId[sec.id] = a;
    });
    var lio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var a = byId[e.target.id];
        if (!a || !e.isIntersecting) return;
        links.forEach(function (l) {
          l.removeAttribute("aria-current");
        });
        a.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(byId).forEach(function (id) {
      lio.observe(document.getElementById(id));
    });
  }

  /* ---------- 6. 回到顶部 ---------- */

  var toTop = document.querySelector(".to-top");
  if (toTop) {
    var toggleTop = function () {
      if (window.scrollY > window.innerHeight * 0.8) toTop.setAttribute("data-show", "");
      else toTop.removeAttribute("data-show");
    };
    toggleTop();
    window.addEventListener("scroll", toggleTop, { passive: true });
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
  }

  /* ---------- 6. 素材画廊与走马灯 ---------- */

  var ASSETS = window.MARKET_ASSETS || [];

  var grid = document.querySelector("[data-gallery-grid]");
  if (grid && ASSETS.length) {
    var tabs = [].slice.call(document.querySelectorAll(".gal__tab"));
    var cells = [];

    ASSETS.forEach(function (item) {
      var fig = document.createElement("figure");
      fig.className = "gal__cell";
      fig.setAttribute("data-cat", item.cat);

      var img = document.createElement("img");
      img.className = "pixel";
      img.src = item.src;
      img.alt = item.name;
      img.loading = "lazy";
      img.decoding = "async";

      var cap = document.createElement("figcaption");
      cap.textContent = item.note ? item.name + " · " + item.note : item.name;

      fig.appendChild(img);
      fig.appendChild(cap);
      grid.appendChild(fig);
      cells.push(fig);
    });

    var show = function (cat) {
      cells.forEach(function (c) {
        c.hidden = c.getAttribute("data-cat") !== cat;
      });
    };

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) {
          t.setAttribute("aria-selected", "false");
        });
        tab.setAttribute("aria-selected", "true");
        show(tab.getAttribute("data-cat"));
      });
    });

    if (tabs.length) {
      tabs.forEach(function (t) {
        var n = ASSETS.filter(function (a) {
          return a.cat === t.getAttribute("data-cat");
        }).length;
        var base = t.textContent.replace(/\s*\d+\s*$/, "").trim();
        t.textContent = base + " " + n;
      });
      show(tabs[0].getAttribute("data-cat"));
    }
  }

  var track = document.querySelector("[data-marquee]");
  if (track && ASSETS.length) {
    var picks = ASSETS.filter(function (a) {
      return a.cat === "店铺" || a.cat === "建筑" || a.cat === "道具";
    });
    var build = function () {
      for (var pass = 0; pass < 2; pass++) {
        picks.forEach(function (a) {
          var fig = document.createElement("figure");
          var img = document.createElement("img");
          img.className = "pixel";
          img.src = a.src;
          img.alt = "";
          img.loading = "lazy";
          var cap = document.createElement("figcaption");
          cap.textContent = a.name;
          fig.appendChild(img);
          fig.appendChild(cap);
          track.appendChild(fig);
        });
      }
    };
    build();
  }

  /* ---------- 7. BGM 试听 ---------- */

  var audio = document.getElementById("market-audio");
  var audioBtns = [].slice.call(document.querySelectorAll("[data-audio-toggle]"));
  if (audio && audioBtns.length) {
    audio.preload = "none";

    var paint = function (on) {
      audioBtns.forEach(function (b) {
        var mine = b === active;
        b.setAttribute("aria-pressed", mine && on ? "true" : "false");
        b.classList.toggle("is-playing", mine && on);
        var label = b.querySelector("[data-audio-label]");
        if (label) {
          var dusk = b.hasAttribute("data-audio-src");
          label.textContent = (mine && on ? "暂停" : "听听") + (dusk ? "散集" : "集市");
        }
      });
    };

    var active = null;

    audioBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var src = btn.getAttribute("data-audio-src");
        if (active === btn && !audio.paused) {
          audio.pause();
          return;
        }
        if (src && audio.getAttribute("src") !== src) {
          audio.setAttribute("src", src);
          audio.load();
        }
        active = btn;
        var p = audio.play();
        if (p && p.catch) p.catch(function () {});
      });
    });

    audio.addEventListener("play", function () { paint(true); });
    audio.addEventListener("pause", function () { paint(false); });
    audio.addEventListener("ended", function () { paint(false); });
    paint(false);
  }

  /* ---------- 8. 数字滚动 ---------- */

  var nums = [].slice.call(document.querySelectorAll("[data-count]"));
  if (nums.length && !reduce && "IntersectionObserver" in window) {
    var nio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        nio.unobserve(e.target);
        var el = e.target;
        var to = parseFloat(el.getAttribute("data-count"));
        var t0 = performance.now();
        var step = function (now) {
          var k = Math.min(1, (now - t0) / 1100);
          var eased = 1 - Math.pow(1 - k, 3);
          el.textContent = Math.round(to * eased).toLocaleString("zh-CN");
          if (k < 1) requestAnimationFrame(step);
          else el.textContent = to.toLocaleString("zh-CN");
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (n) {
      nio.observe(n);
    });
  }

  /* ---------- 9. Hero 视差轻移 ---------- */

  var stage = document.querySelector("[data-parallax-root]");
  if (stage && !reduce) {
    var layers = [].slice.call(stage.querySelectorAll("[data-depth]"));
    if (layers.length) {
      var raf = 0;
      var move = function () {
        raf = 0;
        var r = stage.getBoundingClientRect();
        var p = (window.innerHeight - r.top) / (window.innerHeight + r.height);
        p = Math.max(0, Math.min(1, p)) - 0.5;
        layers.forEach(function (l) {
          var d = parseFloat(l.getAttribute("data-depth")) || 0;
          l.style.transform = "translate3d(0," + (p * d * 60).toFixed(2) + "px,0)";
        });
      };
      window.addEventListener("scroll", function () {
        if (!raf) raf = requestAnimationFrame(move);
      }, { passive: true });
      move();
    }
  }
})();
