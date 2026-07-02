/* Shop panel - buy sea creatures and one-time tank finds with focus coins. */
const Shop = (() => {
  const panel = document.getElementById("shopPanel");
  const list = document.getElementById("shopList");
  const statsLine = document.getElementById("statsLine");

  function thumbState() {
    return {
      t: 1.2, ph: 0,
      body: "#22374a",
      rim: "rgba(185,220,240,0.45)",
      glowT: 0.3, walk: 1, claw: 0,
      dragonAnim: "flare", dragonP: 0.45,
    };
  }

  // Species and decor drawings have irregular extents, so measure the real
  // pixel bounding box once and fit that into the shop frame.
  const bounds = {};
  function measureBounds(entry) {
    if (bounds[entry.id]) return bounds[entry.id];
    const dim = Math.ceil(entry.size * 2.8) + 32;
    const cv = document.createElement("canvas");
    cv.width = dim;
    cv.height = dim;
    const c = cv.getContext("2d", { willReadFrequently: true });
    c.setTransform(1, 0, 0, 1, dim / 2, dim / 2);
    entry.draw(c, thumbState());
    const a = c.getImageData(0, 0, dim, dim).data;
    let minX = dim, minY = dim, maxX = 0, maxY = 0;
    for (let y = 0; y < dim; y++) {
      for (let x = 0; x < dim; x++) {
        if (a[(y * dim + x) * 4 + 3] > 40) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX <= minX) { minX = 0; maxX = dim; minY = 0; maxY = dim; }
    bounds[entry.id] = {
      cx: (minX + maxX) / 2 - dim / 2,
      cy: (minY + maxY) / 2 - dim / 2,
      w: maxX - minX,
      h: maxY - minY,
    };
    return bounds[entry.id];
  }

  function thumb(entry) {
    const cv = document.createElement("canvas");
    cv.className = "shop-thumb";
    cv.width = 180;  // 2x of the 90x60 CSS size for crisp rendering
    cv.height = 120;
    const c = cv.getContext("2d");
    const b = measureBounds(entry);
    const k = Math.min(62 / b.w, 38 / b.h, 1.15);
    c.setTransform(2, 0, 0, 2, 0, 0);
    c.translate(45 - b.cx * k, 30 - b.cy * k);
    c.scale(k, k);
    entry.draw(c, thumbState());
    return cv;
  }

  function fmtDuration(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? h + "h " + m + "m" : m + "m";
  }

  function render() {
    list.innerHTML = "";
    section("CREATURES");
    for (const sp of Creatures.SPECIES) renderItem(sp, "creature");
    section("TANK FINDS");
    for (const item of Creatures.DECOR) renderItem(item, "decor");

    statsLine.textContent =
      "focused " + fmtDuration(Store.data.totalFocusMs) +
      " · earned " + Store.data.lifetimeCoins + " coins";
  }

  function section(label) {
    const el = document.createElement("div");
    el.className = "shop-section";
    el.textContent = label;
    list.appendChild(el);
  }

  function renderItem(entry, type) {
    const decorOwned = Store.data.decor || {};
    const owned = type === "decor" ? (decorOwned[entry.id] ? 1 : 0) : (Store.data.owned[entry.id] || 0);
    const soldOut = type === "decor" && owned >= 1;
    const canBuy = Store.data.coins >= entry.price && !soldOut;

    const item = document.createElement("div");
    item.className = "shop-item";

    const info = document.createElement("div");
    info.className = "shop-info";
    info.innerHTML =
      '<div class="shop-name">' + entry.name + "</div>" +
      '<div class="shop-desc">' + entry.desc + "</div>" +
      (owned > 0
        ? '<div class="shop-owned">' + (type === "decor" ? "placed" : "in tank &times; " + owned) + "</div>"
        : "");

    const buy = document.createElement("div");
    buy.className = "shop-buy";
    const price = document.createElement("div");
    price.className = "shop-price";
    price.innerHTML = '<span class="coin-dot small"></span>' + entry.price;
    const btn = document.createElement("button");
    btn.className = "buy-btn";
    btn.textContent = soldOut ? "OWNED" : "BUY";
    btn.disabled = !canBuy;
    btn.addEventListener("click", () => purchase(entry, type));
    buy.appendChild(price);
    buy.appendChild(btn);

    item.appendChild(thumb(entry));
    item.appendChild(info);
    item.appendChild(buy);
    list.appendChild(item);
  }

  function purchase(entry, type) {
    if (Store.data.coins < entry.price) return;
    if (type === "decor" && Store.data.decor && Store.data.decor[entry.id]) return;

    Store.data.coins -= entry.price;
    if (type === "decor") {
      if (!Store.data.decor) Store.data.decor = {};
      Store.data.decor[entry.id] = 1;
    } else {
      Store.data.owned[entry.id] = (Store.data.owned[entry.id] || 0) + 1;
    }

    Store.save();
    Aquarium.syncFromStore();
    UI.refreshCoins();
    render();
    UI.toast(purchaseMessage(entry, type), 3200);
  }

  function purchaseMessage(entry, type) {
    if (type !== "decor") return entry.name + " has arrived into the depths";
    if (entry.kind === "fauna") return "A new " + entry.name + " has blossomed";
    if (entry.kind === "wreck") return "And what if one of the gods does wreck me out on the wine-dark sea?";
    return entry.name + " has settled into the depths";
  }

  function toggle(open) {
    const willOpen = open !== undefined ? open : !panel.classList.contains("open");
    panel.classList.toggle("open", willOpen);
    if (willOpen) render();
  }

  document.getElementById("shopToggle").addEventListener("click", () => toggle());
  document.getElementById("shopClose").addEventListener("click", () => toggle(false));

  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("Reset everything? Coins, creatures and focus history will be lost.")) {
      Store.wipe();
      location.reload();
    }
  });

  return { render, toggle };
})();
