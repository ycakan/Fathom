/* Persistent state — everything lives in localStorage, no server. */
const Store = (() => {
  const KEY = "fathom-save-v1";
  const OLD_KEYS = ["aquafocus-save-v1", "depths-save-v1"];

  const defaults = () => ({
    coins: 0,
    owned: {},          // speciesId -> count
    decor: {},          // decorId -> owned once
    totalFocusMs: 0,
    lifetimeCoins: 0,
    session: null,      // { targetMs, startAt, pausedAt, pausedTotal }
  });

  let data = defaults();
  try {
    let raw = localStorage.getItem(KEY);
    for (const old of OLD_KEYS) {
      const prev = localStorage.getItem(old);
      if (prev) {
        if (!raw) raw = prev; // migrate saves from earlier app names
        localStorage.removeItem(old);
      }
    }
    if (raw) data = Object.assign(defaults(), JSON.parse(raw));
  } catch (e) { /* corrupted save — start fresh */ }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* quota */ }
  }

  function wipe() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  return { data, save, wipe };
})();
