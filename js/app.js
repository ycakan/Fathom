/* Bootstrap + small shared UI helpers. */
const UI = (() => {
  const coinCount = document.getElementById("coinCount");
  const coinCountShop = document.getElementById("coinCountShop");
  const toastEl = document.getElementById("toast");
  let toastTimer = null;

  function refreshCoins() {
    coinCount.textContent = Store.data.coins;
    coinCountShop.textContent = Store.data.coins;
  }

  function toast(html, ms) {
    toastEl.innerHTML = html;
    toastEl.classList.remove("hidden");
    // force reflow so the transition replays on back-to-back toasts
    void toastEl.offsetWidth;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), ms || 3000);
  }

  return { refreshCoins, toast };
})();

UI.refreshCoins();
Aquarium.start();
Timer.render();
Shop.render();

// offline cache — lets the home-screen app launch without a connection
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => { /* http or unsupported */ });
}
