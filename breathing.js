/* 靜心・觀呼吸 — 練習夥伴
   觀呼吸計時器 + 百日基本功打卡。純前端、資料只存在使用者本機（localStorage）。
   注意：依原文「不必數息、不用管呼吸長短，讓身體自然呼吸」，
   計時器只做安靜的時間陪伴，不做一吸一吐的節奏引導。 */
(function () {
  "use strict";

  function pulseMarkButton() {
    var b = document.getElementById("markToday");
    if (!b) return;
    b.classList.add("pulse");
    setTimeout(function () { b.classList.remove("pulse"); }, 2400);
  }

  /* ---------------- 觀呼吸計時器 ---------------- */
  (function initTimer() {
    var ring = document.getElementById("timerRing");
    if (!ring) return;

    var timeEl = document.getElementById("timerTime");
    var labelEl = document.getElementById("timerLabel");
    var toggleBtn = document.getElementById("timerToggle");
    var resetBtn = document.getElementById("timerReset");
    var presets = document.querySelectorAll("[data-min]");

    var total = 300, remaining = 300, handle = null, audioCtx = null;

    function fmt(s) {
      var m = Math.floor(s / 60), sec = s % 60;
      return String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
    }

    function paint() {
      timeEl.textContent = fmt(remaining);
      var progress = total ? (1 - remaining / total) * 100 : 0;
      ring.style.setProperty("--progress", progress + "%");
    }

    function setMinutes(min) {
      stop();
      total = remaining = min * 60;
      labelEl.textContent = "觀呼吸";
      toggleBtn.textContent = "開始";
      presets.forEach(function (b) {
        b.classList.toggle("is-active", Number(b.dataset.min) === min);
      });
      paint();
    }

    function chime() {
      try {
        if (!audioCtx) return;
        var t = audioCtx.currentTime;
        [528, 792].forEach(function (freq, i) {
          var osc = audioCtx.createOscillator();
          var gain = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          gain.gain.setValueAtTime(0, t + i * 0.04);
          gain.gain.linearRampToValueAtTime(0.16, t + i * 0.04 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.04 + 3.2);
          osc.start(t + i * 0.04);
          osc.stop(t + i * 0.04 + 3.4);
        });
      } catch (e) { /* 靜音容錯 */ }
    }

    function tick() {
      remaining = Math.max(0, remaining - 1);
      paint();
      if (remaining === 0) {
        stop();
        labelEl.textContent = "圓滿";
        toggleBtn.textContent = "再坐一次";
        chime();
        pulseMarkButton();
      }
    }

    function start() {
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === "suspended") audioCtx.resume();
      } catch (e) { /* 無音訊也可計時 */ }
      if (remaining === 0) remaining = total;
      handle = setInterval(tick, 1000);
      toggleBtn.textContent = "暫停";
      labelEl.textContent = "安住於當下";
      paint();
    }

    function stop() {
      if (handle) { clearInterval(handle); handle = null; }
      toggleBtn.textContent = remaining === 0 ? "再坐一次" : "開始";
      if (remaining !== 0 && remaining < total) labelEl.textContent = "觀呼吸";
    }

    toggleBtn.addEventListener("click", function () {
      handle ? stop() : start();
    });
    resetBtn.addEventListener("click", function () { setMinutes(total / 60); });
    presets.forEach(function (b) {
      b.addEventListener("click", function () { setMinutes(Number(b.dataset.min)); });
    });

    setMinutes(5);
  })();

  /* ---------------- 百日基本功 tracker ---------------- */
  (function initTracker() {
    var grid = document.getElementById("hundredGrid");
    if (!grid) return;

    var KEY = "haodao-guanxi-100days";
    var countEl = document.getElementById("dayCount");
    var streakEl = document.getElementById("dayStreak");
    var markBtn = document.getElementById("markToday");
    var resetBtn = document.getElementById("trackerReset");

    function load() {
      try { return JSON.parse(localStorage.getItem(KEY)) || []; }
      catch (e) { return []; }
    }
    function save(arr) {
      try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch (e) { /* 隱私模式容錯 */ }
    }
    function dayStr(d) {
      return d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
    }
    function today() { return dayStr(new Date()); }

    function currentStreak(dates) {
      var set = {}; dates.forEach(function (d) { set[d] = true; });
      var streak = 0, cursor = new Date();
      if (!set[dayStr(cursor)]) cursor.setDate(cursor.getDate() - 1); // 今天還沒打也算昨天起的連續
      while (set[dayStr(cursor)]) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }
      return streak;
    }

    // 建立 100 格
    var cells = [];
    for (var i = 0; i < 100; i++) {
      var cell = document.createElement("span");
      cell.className = "day-cell";
      cell.textContent = i + 1;
      grid.appendChild(cell);
      cells.push(cell);
    }

    function render() {
      var dates = load();
      var filled = Math.min(dates.length, 100);
      cells.forEach(function (c, idx) { c.classList.toggle("done", idx < filled); });
      countEl.textContent = dates.length;
      streakEl.textContent = currentStreak(dates);
      var done = dates.indexOf(today()) >= 0;
      markBtn.textContent = done ? "今天已打卡 ✓" : "完成一次・打卡";
      markBtn.classList.toggle("is-done", done);
    }

    markBtn.addEventListener("click", function () {
      var dates = load();
      var t = today();
      var idx = dates.indexOf(t);
      if (idx >= 0) dates.splice(idx, 1); else dates.push(t);
      save(dates);
      render();
    });

    resetBtn.addEventListener("click", function () {
      if (window.confirm("確定要清除百日打卡紀錄嗎？此動作無法復原。")) {
        save([]);
        render();
      }
    });

    render();
  })();

  /* ---------------- 章節頁：閱讀進度條 + 接續閱讀 ---------------- */
  (function initChapter() {
    var main = document.querySelector("main.chapter");
    if (!main) return;

    var KEY = "guanxi-last-read";
    var file = location.pathname.split("/").pop() || "index.html";
    var h1 = document.querySelector(".chapter-head h1");
    var title = h1 ? h1.textContent.trim() : document.title;
    var progEl = document.querySelector(".progress");
    var num = progEl ? (progEl.textContent.match(/第\s*(\d+)\s*章/) || [])[1] : "";

    // 進度條
    var bar = document.createElement("div");
    bar.className = "read-progress";
    bar.innerHTML = "<span></span>";
    document.body.insertBefore(bar, document.body.firstChild);
    var fill = bar.firstChild;

    function docHeight() {
      return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;
    }
    function onScroll() {
      var h = docHeight();
      var pct = h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0;
      fill.style.width = pct + "%";
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    // 記住閱讀位置（節流）
    var lastSave = 0;
    function save() {
      try {
        localStorage.setItem(KEY, JSON.stringify({ file: file, num: num, title: title, scroll: Math.round(window.scrollY) }));
      } catch (e) { /* 隱私模式容錯 */ }
    }
    window.addEventListener("scroll", function () {
      var t = Date.now();
      if (t - lastSave > 800) { lastSave = t; save(); }
    }, { passive: true });
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") save();
    });

    // 從目錄「繼續閱讀」進來時，捲回上次位置
    if (location.hash === "#continue") {
      try {
        var saved = JSON.parse(localStorage.getItem(KEY));
        if (saved && saved.file === file && saved.scroll) {
          requestAnimationFrame(function () { window.scrollTo(0, saved.scroll); });
        }
      } catch (e) { /* ignore */ }
    }
  })();

  /* ---------------- 著陸頁：接續閱讀 + 每日一句 ---------------- */
  (function initLanding() {
    var KEY = "guanxi-last-read";

    // 接續閱讀
    var resumeEl = document.getElementById("resumeReading");
    if (resumeEl) {
      try {
        var saved = JSON.parse(localStorage.getItem(KEY));
        if (saved && saved.file) {
          var label = saved.num ? ("第 " + saved.num + " 章　" + (saved.title || "")) : (saved.title || "上次閱讀");
          resumeEl.innerHTML = '<a href="' + saved.file + '#continue"><span class="resume-eyebrow">繼續閱讀</span>' +
            '<span class="resume-title">' + label + "</span></a>";
          resumeEl.hidden = false;
        }
      } catch (e) { /* ignore */ }
    }

    // 每日一句
    var qEl = document.getElementById("dailyQuote");
    var sEl = document.getElementById("dailySrc");
    if (qEl && window.GUANXI_QUOTES) {
      var flat = [];
      window.GUANXI_QUOTES.forEach(function (c) {
        (c.quotes || []).forEach(function (q) {
          flat.push({ text: q, file: c.file, num: c.num, title: c.title });
        });
      });
      if (flat.length) {
        var now = new Date();
        var doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
        var pick = flat[doy % flat.length];
        qEl.textContent = pick.text;
        if (sEl) sEl.innerHTML = '<a href="' + pick.file + '">第 ' + pick.num + " 章　" + pick.title + "</a>";
      }
    }
  })();
})();
