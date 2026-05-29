/* ===== Crypto Reco — interactivity ===== */
(function () {
  "use strict";

  /* ---- Mobile menu ---- */
  var burger = document.getElementById("burger");
  var menu = document.getElementById("mobileMenu");
  if (burger && menu) {
    burger.addEventListener("click", function () {
      var open = menu.classList.toggle("show");
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        menu.classList.remove("show");
        burger.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- FAQ accordion ---- */
  document.querySelectorAll(".faq-item .faq-q").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var item = btn.parentElement;
      var ans = item.querySelector(".faq-a");
      var isOpen = item.classList.contains("open");
      // close all
      document.querySelectorAll(".faq-item").forEach(function (it) {
        it.classList.remove("open");
        it.querySelector(".faq-a").style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add("open");
        ans.style.maxHeight = ans.scrollHeight + "px";
      }
    });
  });

  /* ---- Globe coverage dots ---- */
  var globe = document.getElementById("globe");
  if (globe) {
    // angle (deg), radius fraction of half-size
    var nodes = [
      [90, 0.62], [40, 0.5], [150, 0.55], [200, 0.42],
      [250, 0.58], [300, 0.5], [20, 0.34], [120, 0.3]
    ];
    nodes.forEach(function (n, i) {
      var d = document.createElement("span");
      d.className = "dot";
      var rad = (n[0] * Math.PI) / 180;
      var R = 160 * n[1]; // half of 320
      var x = 160 + Math.cos(rad) * R - 5.5;
      var y = 160 + Math.sin(rad) * R - 5.5;
      d.style.left = x + "px";
      d.style.top = y + "px";
      d.style.animationDelay = (i * 0.28) + "s";
      globe.appendChild(d);
    });
  }

  /* ---- NAV area chart ---- */
  var chart = document.getElementById("navChart");
  if (chart) {
    var W = 720, H = 200, pad = 8;
    var pts = [40, 55, 48, 70, 62, 88, 80, 110, 100, 132, 150, 140, 168];
    var max = Math.max.apply(null, pts) + 20;
    var step = (W - pad * 2) / (pts.length - 1);
    var coords = pts.map(function (p, i) {
      var x = pad + i * step;
      var y = H - pad - (p / max) * (H - pad * 2);
      return [x, y];
    });
    var line = coords.map(function (c, i) { return (i ? "L" : "M") + c[0].toFixed(1) + " " + c[1].toFixed(1); }).join(" ");
    var area = "M" + pad + " " + (H - pad) + " " +
      coords.map(function (c) { return "L" + c[0].toFixed(1) + " " + c[1].toFixed(1); }).join(" ") +
      " L" + (W - pad) + " " + (H - pad) + " Z";

    chart.innerHTML =
      '<defs>' +
        '<linearGradient id="cgFill" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#5b6ff5" stop-opacity="0.30"/>' +
          '<stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>' +
        '</linearGradient>' +
        '<linearGradient id="cgLine" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="#2f5cf0"/>' +
          '<stop offset="100%" stop-color="#7c3aed"/>' +
        '</linearGradient>' +
      '</defs>' +
      '<path d="' + area + '" fill="url(#cgFill)"/>' +
      '<path d="' + line + '" fill="none" stroke="url(#cgLine)" stroke-width="3" ' +
        'stroke-linecap="round" stroke-linejoin="round" class="chart-line"/>';

    var path = chart.querySelector(".chart-line");
    if (path) {
      var len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) {
            path.style.transition = "stroke-dashoffset 1.6s ease";
            path.style.strokeDashoffset = "0";
            io.disconnect();
          }
        });
      }, { threshold: 0.4 });
      io.observe(chart);
    }
  }

  /* ---- Scroll reveal ---- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    document.body.classList.add("js-anim");
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e, idx) {
        if (e.isIntersecting) {
          e.target.style.transitionDelay = Math.min(idx * 40, 160) + "ms";
          e.target.classList.add("in");
          ro.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { ro.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- Demo form -> POST /api/lead ---- */
  var form = document.getElementById("demoForm");
  if (form) {
    var msg = document.getElementById("formMsg");
    var ENDPOINT = window.LEAD_ENDPOINT || "/api/lead";

    function setMsg(text, kind) {
      if (!msg) return;
      msg.textContent = text;
      msg.className = "form-msg show " + (kind === "ok" ? "is-ok" : "is-error");
    }
    function clearMsg() { if (msg) msg.className = "form-msg"; }
    function clearInvalid() {
      form.querySelectorAll(".invalid").forEach(function (el) { el.classList.remove("invalid"); });
    }
    function field(name) { return form.elements[name]; }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearMsg();
      clearInvalid();

      var payload = {
        name: (field("name").value || "").trim(),
        email: (field("email").value || "").trim(),
        company: (field("company").value || "").trim(),
        needs: (field("needs").value || "").trim(),
        website: (field("website") && field("website").value) || ""
      };

      // lightweight client-side validation (server re-validates)
      var firstBad = null;
      if (!payload.name) { field("name").classList.add("invalid"); firstBad = firstBad || field("name"); }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
        field("email").classList.add("invalid"); firstBad = firstBad || field("email");
      }
      if (firstBad) { setMsg("Please add your name and a valid work email.", "error"); firstBad.focus(); return; }

      var btn = form.querySelector('button[type="submit"]');
      var original = btn.innerHTML;
      btn.disabled = true; btn.style.opacity = "0.85"; btn.innerHTML = "Submitting&hellip;";

      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (resp) {
          return resp.json().catch(function () { return {}; }).then(function (data) {
            return { ok: resp.ok, status: resp.status, data: data };
          });
        })
        .then(function (r) {
          if (r.ok) {
            form.reset();
            setMsg("Thanks! We received your request and will reach out within one business day.", "ok");
          } else if (r.status === 422 && r.data.errors) {
            Object.keys(r.data.errors).forEach(function (k) {
              if (field(k)) field(k).classList.add("invalid");
            });
            setMsg(r.data.error || "Please check the highlighted fields.", "error");
          } else {
            setMsg(r.data.error || "Something went wrong. Please try again.", "error");
          }
        })
        .catch(function () {
          setMsg("Network error — please try again, or email us directly.", "error");
        })
        .then(function () {
          btn.disabled = false; btn.style.opacity = ""; btn.innerHTML = original;
        });
    });
  }
})();
