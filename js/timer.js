/*
 * Focus session timer. One gold coin per 15 focused minutes; the focused
 * time is floored to a multiple of 15 minutes. Sessions survive reloads —
 * everything is timestamp-based, so background tabs stay accurate.
 */
const Timer = (() => {
  const COIN_MS = 15 * 60 * 1000;

  const setupView = document.getElementById("setupView");
  const runView = document.getElementById("runView");
  const timeLeft = document.getElementById("timeLeft");
  const progressFill = document.getElementById("progressFill");
  const pauseBtn = document.getElementById("pauseBtn");
  const endBtn = document.getElementById("endBtn");
  const startBtn = document.getElementById("startBtn");
  const sessionCoins = document.getElementById("sessionCoins");
  const setupNote = document.getElementById("setupNote");
  const customMin = document.getElementById("customMin");
  const customChip = document.getElementById("customChip");
  const chips = Array.from(document.querySelectorAll(".chip[data-min]"));

  let selectedMin = 15;
  let customSelected = false;

  /* ---------- helpers ---------- */

  const s = () => Store.data.session;

  function elapsed(sess) {
    return (sess.pausedAt || Date.now()) - sess.startAt - sess.pausedTotal;
  }

  function fmt(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(sec).padStart(2, "0");
    return h > 0 ? h + ":" + mm + ":" + ss : mm + ":" + ss;
  }

  function chosenMinutes() {
    if (customSelected) {
      const v = parseInt(customMin.value, 10);
      if (!v || v < 5) return null;
      return Math.min(v, 360);
    }
    return selectedMin;
  }

  function updateNote() {
    const min = chosenMinutes();
    if (min !== null && min < 15) {
      setupNote.innerHTML = "sessions under 15 minutes earn no coins";
    } else {
      setupNote.innerHTML =
        '1 <span class="coin-dot small"></span> per 15 minutes of focus';
    }
  }

  /* ---------- screen wake lock ---------- */

  // Keep the screen on while a session runs (the timer itself is
  // timestamp-based, so it stays correct even if the lock is unavailable).
  let wakeLock = null;

  async function acquireWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
    } catch (e) { wakeLock = null; /* low battery or not allowed */ }
  }

  function releaseWakeLock() {
    if (wakeLock) {
      try { wakeLock.release(); } catch (e) { /* already released */ }
      wakeLock = null;
    }
  }

  // The lock is dropped automatically when the tab is hidden; re-acquire
  // when the user comes back to a running session.
  document.addEventListener("visibilitychange", () => {
    const sess = s();
    if (document.visibilityState === "visible" && sess && !sess.pausedAt) acquireWakeLock();
  });

  /* ---------- session lifecycle ---------- */

  function start() {
    const min = chosenMinutes();
    if (min === null) {
      customMin.focus();
      return;
    }
    Store.data.session = {
      targetMs: min * 60000,
      startAt: Date.now(),
      pausedAt: null,
      pausedTotal: 0,
    };
    Store.save();
    acquireWakeLock();
    render();
  }

  function pauseResume() {
    const sess = s();
    if (!sess) return;
    if (sess.pausedAt) {
      sess.pausedTotal += Date.now() - sess.pausedAt;
      sess.pausedAt = null;
      acquireWakeLock();
    } else {
      sess.pausedAt = Date.now();
      releaseWakeLock();
    }
    Store.save();
    render();
  }

  function finish(completed) {
    const sess = s();
    if (!sess) return;
    let el = elapsed(sess);
    if (completed) el = sess.targetMs;
    const coins = Math.floor(el / COIN_MS);

    Store.data.totalFocusMs += el;
    Store.data.coins += coins;
    Store.data.lifetimeCoins += coins;
    Store.data.session = null;
    Store.save();
    releaseWakeLock();

    UI.refreshCoins();
    document.title = "Fathom — Deep-Sea Focus Aquarium";
    render();

    if (coins > 0) {
      UI.toast(
        "+" + coins + ' <span class="coin-dot small"></span> ' +
        (completed ? "— session complete" : "earned"),
        3800
      );
      if (completed) chime();
    } else {
      UI.toast(
        completed
          ? "session complete — under 15 min, no coins"
          : "session ended — focus at least 15 minutes to earn a coin",
        3800
      );
    }
  }

  /* ---------- rendering ---------- */

  function render() {
    const sess = s();
    setupView.classList.toggle("hidden", !!sess);
    runView.classList.toggle("hidden", !sess);
    if (sess) {
      pauseBtn.textContent = sess.pausedAt ? "RESUME" : "PAUSE";
      timeLeft.classList.toggle("paused", !!sess.pausedAt);
      tick();
    } else {
      updateNote();
    }
  }

  function tick() {
    const sess = s();
    if (!sess) return;
    const el = elapsed(sess);
    if (el >= sess.targetMs) {
      finish(true);
      return;
    }
    const remaining = sess.targetMs - el;
    timeLeft.textContent = fmt(remaining);
    progressFill.style.width = ((el / sess.targetMs) * 100).toFixed(2) + "%";
    document.title = fmt(remaining) + " · Fathom";

    const earned = Math.floor(el / COIN_MS);
    sessionCoins.innerHTML = earned > 0
      ? earned + ' <span class="coin-dot small"></span> secured so far'
      : "";
  }

  function chime() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const now = ac.currentTime;
      [523.25, 783.99].forEach((f, i) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = "sine";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, now + i * 0.22);
        g.gain.exponentialRampToValueAtTime(0.09, now + i * 0.22 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.22 + 1.4);
        o.connect(g).connect(ac.destination);
        o.start(now + i * 0.22);
        o.stop(now + i * 0.22 + 1.5);
      });
    } catch (e) { /* audio unavailable */ }
  }

  /* ---------- wiring ---------- */

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("selected"));
      customChip.classList.remove("selected");
      chip.classList.add("selected");
      selectedMin = parseInt(chip.dataset.min, 10);
      customSelected = false;
      updateNote();
    });
  });

  customMin.addEventListener("focus", () => {
    chips.forEach((c) => c.classList.remove("selected"));
    customChip.classList.add("selected");
    customSelected = true;
    updateNote();
  });
  customMin.addEventListener("input", updateNote);
  customMin.addEventListener("keydown", (e) => {
    if (e.key === "Enter") start();
  });

  startBtn.addEventListener("click", start);
  pauseBtn.addEventListener("click", pauseResume);
  endBtn.addEventListener("click", () => finish(false));

  setInterval(tick, 250);

  // page (re)opened with a session already running
  if (s() && !s().pausedAt) acquireWakeLock();

  return { render };
})();
