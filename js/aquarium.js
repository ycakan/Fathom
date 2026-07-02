/*
 * The tank: canvas scene with layered haze, light shafts, marine snow,
 * seafloor, and the creatures the player owns. Creatures react to clicks.
 */
const Aquarium = (() => {
  const canvas = document.getElementById("tank");
  const ctx = canvas.getContext("2d");
  const labelEl = document.getElementById("label");

  let W = 0, H = 0, dpr = 1;
  let creatures = [];
  let decor = [];
  let effects = [];   // bubbles, ink
  let snow = [];
  let beams = [];
  let kelp = [];
  let rocks = [];
  let floorSeed = [];
  let labelTimer = null;
  let lastT = performance.now() / 1000;

  const lerp = (a, b, k) => a + (b - a) * k;
  const rand = (a, b) => a + Math.random() * (b - a);

  function stableUnit(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 10000) / 10000;
  }

  function mixColor(c1, c2, k) {
    return "rgb(" +
      Math.round(lerp(c1[0], c2[0], k)) + "," +
      Math.round(lerp(c1[1], c2[1], k)) + "," +
      Math.round(lerp(c1[2], c2[2], k)) + ")";
  }
  const FAR_BODY = [62, 91, 108];  // hazy, far
  const NEAR_BODY = [17, 31, 42];  // dark, close

  /* ---------- environment setup ---------- */

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildEnvironment();
  }

  function buildEnvironment() {
    // floor profile: sum of gentle sines
    floorSeed = [];
    for (let i = 0; i < 3; i++) {
      floorSeed.push({ f: rand(1.5, 4) / W, p: rand(0, Math.PI * 2), a: rand(6, H * 0.02) });
    }
    rocks = [];
    const nRocks = 5;
    for (let i = 0; i < nRocks; i++) {
      const x = rand(0.05, 0.95) * W;
      rocks.push({ x, w: rand(30, 90), h: rand(10, 34) });
    }
    kelp = [];
    const nKelp = Math.max(3, Math.round(W / 380));
    for (let i = 0; i < nKelp; i++) {
      const x = rand(0.02, 0.98) * W;
      kelp.push({ x, h: rand(H * 0.1, H * 0.24), ph: rand(0, 6), w: rand(2, 4.5), fg: Math.random() < 0.4 });
    }
    beams = [];
    for (let i = 0; i < 4; i++) {
      beams.push({
        x: rand(0.1, 0.9) * W,
        w: rand(40, 110),
        spread: rand(1.6, 2.6),
        ph: rand(0, 6),
        a: rand(0.1, 0.17),
      });
    }
    snow = [];
    const nSnow = Math.round((W * H) / 26000);
    for (let i = 0; i < nSnow; i++) {
      snow.push({
        x: Math.random() * W, y: Math.random() * H,
        r: rand(0.4, 1.6), v: rand(4, 14), ph: rand(0, 6), a: rand(0.08, 0.26),
      });
    }
  }

  function floorY(x) {
    let y = H * 0.955;
    for (const s of floorSeed) y -= Math.abs(Math.sin(x * s.f * Math.PI * 2 + s.p)) * s.a;
    return y;
  }

  /* ---------- creatures ---------- */

  function spawn(sp, entering) {
    const d = rand(sp.size > 120 ? 0.55 : 0.3, 1);          // visual depth: 0 far, 1 near
    const scale = lerp(0.5, 1, d);
    const c = {
      sp, d, scale,
      body: mixColor(FAR_BODY, NEAR_BODY, d),
      rim: "rgba(170,205,225," + (0.12 + 0.2 * d).toFixed(3) + ")",
      x: entering ? -sp.size * scale : rand(0.1, 0.9) * W,
      baseY: lerp(sp.band[0], sp.band[1], Math.random()) * H,
      dir: entering ? 1 : (Math.random() < 0.5 ? -1 : 1),
      face: 1,
      speed: sp.speed * rand(0.8, 1.2),
      ph: rand(0, Math.PI * 2),
      va: rand(6, 18),
      vf: rand(0.4, 0.9),
      drift: rand(-2, 2),
      fleeT: 0, glowT: 0, clawT: 0,
      dragonAnim: null, dragonT: 0, dragonDur: 0,
      state: "walk", stateT: rand(1, 4),
      offsets: null,
    };
    c.y = c.baseY;
    if (sp.behavior === "crab" || sp.behavior === "octo") {
      c.x = rand(0.1, 0.9) * W;
    }
    if (sp.school) {
      c.offsets = [];
      for (let i = 0; i < sp.school; i++) {
        c.offsets.push({
          dx: rand(-1, 1) * sp.size * 1.5,
          dy: rand(-1, 1) * sp.size * 0.9,
          ph: rand(0, 6),
          sc: rand(0.75, 1.1),
        });
      }
    }
    creatures.push(c);
    creatures.sort((a, b) => a.d - b.d);
    return c;
  }

  // Reconcile instances with what the player owns.
  function syncFromStore() {
    const want = Store.data.owned;
    const wantDecor = Store.data.decor || {};
    const have = {};
    creatures.forEach((c) => { have[c.sp.id] = (have[c.sp.id] || 0) + 1; });
    for (const sp of Creatures.SPECIES) {
      const target = want[sp.id] || 0;
      let cur = have[sp.id] || 0;
      while (cur < target) { spawn(sp, cur > 0 || target === 1); cur++; }
      while (cur > target) {
        const i = creatures.findIndex((c) => c.sp.id === sp.id);
        if (i >= 0) creatures.splice(i, 1);
        cur--;
      }
    }
    decor = Creatures.DECOR.filter((item) => !!wantDecor[item.id]);
    document.getElementById("emptyHint").classList.toggle("hidden", creatures.length > 0 || decor.length > 0);
  }

  /* ---------- behaviors ---------- */

  function update(dt, t) {
    for (const c of creatures) {
      const sp = c.sp;
      const b = sp.behavior;
      const spd = c.speed * (c.fleeT > 0 ? 3.4 : 1);
      c.fleeT = Math.max(0, c.fleeT - dt);
      c.glowT = Math.max(0, c.glowT - dt);
      c.clawT = Math.max(0, c.clawT - dt);
      if (c.dragonT > 0) {
        c.dragonT = Math.max(0, c.dragonT - dt);
        if (c.dragonT === 0) c.dragonAnim = null;
      }
      c.face += (c.dir - c.face) * Math.min(1, dt * 5);

      if (b === "crab") {
        c.stateT -= dt;
        if (c.stateT <= 0) {
          c.state = c.state === "walk" ? "pause" : "walk";
          c.stateT = c.state === "walk" ? rand(2, 5) : rand(1, 3);
          if (c.state === "walk" && Math.random() < 0.5) c.dir *= -1;
        }
        const moving = c.state === "walk" || c.fleeT > 0;
        c.walk = lerp(c.walk || 0, moving ? 1 : 0, Math.min(1, dt * 6));
        if (moving) c.x += spd * dt * c.dir;
        c.y = floorY(c.x) - 10 * c.scale;
        if (c.x < 30) c.dir = 1;
        if (c.x > W - 30) c.dir = -1;
      } else if (b === "octo") {
        c.x += spd * dt * c.dir * 0.5;
        c.y = floorY(c.x) - (26 + Math.sin(t * 0.7 + c.ph) * 7) * c.scale;
        if (c.x < 50) c.dir = 1;
        if (c.x > W - 50) c.dir = -1;
        if (Math.random() < dt * 0.08) c.dir *= -1;
      } else if (b === "axolotl") {
        c.x += spd * dt * c.dir * 0.42;
        c.baseY += c.drift * dt * 0.4;
        if (Math.random() < dt * 0.04) c.drift = rand(-2, 2);
        const top = sp.band[0] * H, bot = Math.min(sp.band[1] * H, floorY(c.x) - sp.size * c.scale * 0.12);
        if (c.baseY < top) { c.baseY = top; c.drift = Math.abs(c.drift); }
        if (c.baseY > bot) { c.baseY = bot; c.drift = -Math.abs(c.drift); }
        c.y = c.baseY + Math.sin(t * c.vf + c.ph) * c.va * 0.35;
        if (c.x < 44) c.dir = 1;
        if (c.x > W - 44) c.dir = -1;
      } else if (b === "dragon") {
        const burst = c.dragonAnim === "dash" || c.dragonAnim === "eclipse" ? 1.4 : 0.7;
        c.x += spd * dt * c.dir * burst;
        c.baseY += c.drift * dt;
        if (Math.random() < dt * 0.04) c.drift = rand(-4, 4);
        const top = sp.band[0] * H, bot = sp.band[1] * H;
        if (c.baseY < top) { c.baseY = top; c.drift = Math.abs(c.drift); }
        if (c.baseY > bot) { c.baseY = bot; c.drift = -Math.abs(c.drift); }
        c.y = c.baseY + Math.sin(t * c.vf + c.ph) * c.va;
        const m = sp.size * c.scale * 0.68;
        if (c.x > W - m) c.dir = -1;
        if (c.x < m) c.dir = 1;
      } else if (b === "jelly") {
        const pulse = Math.max(0, Math.sin(t * 2.2 + c.ph));
        c.y -= (2 + pulse * 7 + (c.fleeT > 0 ? 18 : 0)) * dt;
        c.y += 4.5 * dt; // sink baseline
        c.x += (Math.sin(t * 0.3 + c.ph) * 4 + c.drift) * dt;
        const top = sp.band[0] * H, bot = sp.band[1] * H;
        if (c.y < top) c.y = top;
        if (c.y > bot) c.y = bot;
        if (c.x < -40) c.x = W + 40;
        if (c.x > W + 40) c.x = -40;
      } else {
        // swim / school / patrol / bob / lurk
        c.x += spd * dt * c.dir;
        c.baseY += c.drift * dt;
        if (Math.random() < dt * 0.05) c.drift = rand(-3, 3);
        const top = sp.band[0] * H, bot = sp.band[1] * H;
        if (c.baseY < top) { c.baseY = top; c.drift = Math.abs(c.drift); }
        if (c.baseY > bot) { c.baseY = bot; c.drift = -Math.abs(c.drift); }
        c.y = c.baseY + Math.sin(t * c.vf + c.ph) * c.va;
        const m = sp.size * c.scale * 0.6;
        if (c.x > W - m) c.dir = -1;
        if (c.x < m) c.dir = 1;
        if (b === "swim" && Math.random() < dt * 0.02) c.dir *= -1;
      }
    }

    // effects
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      e.life -= dt;
      if (e.kind === "bubble") {
        e.y -= e.v * dt;
        e.x += Math.sin(e.y * 0.05 + e.ph) * 12 * dt;
      } else if (e.kind === "ink") {
        e.r += e.grow * dt;
      } else if (e.kind === "spark") {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.vy -= 8 * dt;
      } else if (e.kind === "ring" || e.kind === "eclipse") {
        e.r += e.grow * dt;
      }
      if (e.life <= 0) effects.splice(i, 1);
    }

    for (const p of snow) {
      p.y += p.v * dt;
      p.x += Math.sin(t * 0.4 + p.ph) * 3 * dt;
      if (p.y > H + 4) { p.y = -4; p.x = Math.random() * W; }
    }
  }

  /* ---------- drawing ---------- */

  function drawBackground(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#326579");
    g.addColorStop(0.45, "#1b3c51");
    g.addColorStop(1, "#10283a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // distant ridge silhouettes
    ctx.fillStyle = "rgba(27,61,78,0.54)";
    ctx.beginPath();
    ctx.moveTo(0, H * 0.9);
    for (let x = 0; x <= W; x += 40) {
      ctx.lineTo(x, H * (0.86 + 0.045 * Math.sin(x * 0.004 + 1.7) + 0.02 * Math.sin(x * 0.011)));
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    // light shafts
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const b of beams) {
      const sway = Math.sin(t * 0.1 + b.ph) * W * 0.04;
      const bg = ctx.createLinearGradient(0, 0, 0, H * 0.85);
      bg.addColorStop(0, "rgba(130,170,200," + b.a + ")");
      bg.addColorStop(0.7, "rgba(130,170,200," + (b.a * 0.25).toFixed(3) + ")");
      bg.addColorStop(1, "rgba(130,170,200,0)");
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(b.x - b.w * 0.5, -10);
      ctx.lineTo(b.x + b.w * 0.5, -10);
      ctx.lineTo(b.x + b.w * b.spread * 0.5 + sway, H * 0.85);
      ctx.lineTo(b.x - b.w * b.spread * 0.5 + sway, H * 0.85);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFloor(t, foreground) {
    if (!foreground) {
      // seafloor silhouette
      ctx.fillStyle = "#0d2230";
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, floorY(0));
      for (let x = 0; x <= W; x += 24) ctx.lineTo(x, floorY(x));
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
      // rocks
      for (const r of rocks) {
        ctx.beginPath();
        ctx.ellipse(r.x, floorY(r.x) + 4, r.w, r.h, 0, Math.PI, Math.PI * 2);
        ctx.fill();
      }
    }
    // kelp (some strands in front of creatures)
    for (const k of kelp) {
      if (k.fg !== foreground) continue;
      const base = floorY(k.x) + 2;
      const sway = Math.sin(t * 0.5 + k.ph);
      ctx.strokeStyle = foreground ? "#0b1c25" : "#123043";
      ctx.lineCap = "round";
      let px = k.x, py = base;
      const segs = 4;
      for (let i = 1; i <= segs; i++) {
        const yy = base - (k.h / segs) * i;
        const xx = k.x + Math.sin(t * 0.5 + k.ph + i * 0.8) * (6 + i * 5) + sway * i * 2;
        ctx.lineWidth = k.w * (1 - i / (segs + 1));
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px, py - k.h / segs / 2, xx, yy);
        ctx.stroke();
        px = xx; py = yy;
      }
    }
    ctx.lineCap = "butt";
  }

  function drawDecor(t) {
    for (const item of decor) {
      const x = item.x * W;
      const y = floorY(x) + 2;
      const responsive = Math.max(0.58, Math.min(1, W / 1050));
      const k = (item.scale || 1) * responsive;
      const ph = stableUnit(item.id) * Math.PI * 2;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(k, k);
      item.draw(ctx, {
        t, ph,
        body: item.kind === "wreck" ? "rgba(8,18,25,0.9)" : "rgba(7,24,32,0.88)",
        rim: item.kind === "wreck" ? "rgba(150,205,220,0.2)" : "rgba(140,220,220,0.22)",
      });
      ctx.restore();
    }
  }

  function drawCreature(c, t) {
    const sp = c.sp;
    const dragonP = c.dragonT > 0 && c.dragonDur > 0 ? 1 - c.dragonT / c.dragonDur : 0;
    const o = {
      t, ph: c.ph, body: c.body, rim: c.rim,
      glowT: c.glowT, walk: c.walk || 0, claw: Math.min(1, c.clawT * 2),
      dragonAnim: c.dragonAnim, dragonP,
    };
    const wobble = sp.behavior === "crab" || sp.behavior === "jelly" || sp.behavior === "octo"
      ? 0
      : Math.sin(t * 2.4 + c.ph) * 0.045;
    const dragonRoll = c.dragonAnim === "roll" ? Math.sin(dragonP * Math.PI * 2) * 0.55 : 0;
    const dragonScale = c.dragonAnim === "eclipse" ? 1 + Math.sin(dragonP * Math.PI) * 0.16 : 1;

    if (c.offsets) {
      for (const m of c.offsets) {
        ctx.save();
        ctx.translate(c.x + m.dx * c.face + Math.sin(t * 2.6 + m.ph) * 3, c.y + m.dy + Math.sin(t * 3.1 + m.ph) * 2.5);
        ctx.scale(c.scale * m.sc * (c.face >= 0 ? 1 : -1), c.scale * m.sc);
        ctx.rotate(wobble * (c.face >= 0 ? 1 : -1));
        sp.draw(ctx, { ...o, ph: m.ph });
        ctx.restore();
      }
      return;
    }

    ctx.save();
    ctx.translate(c.x, c.y);
    const fx = sp.behavior === "jelly" ? 1 : (Math.abs(c.face) < 0.12 ? (c.face < 0 ? -0.12 : 0.12) : c.face);
    ctx.scale(c.scale * fx * dragonScale, c.scale * dragonScale);
    ctx.rotate((wobble + dragonRoll) * (fx >= 0 ? 1 : -1));
    sp.draw(ctx, o);
    ctx.restore();
  }

  function drawEffects() {
    for (const e of effects) {
      if (e.kind === "bubble") {
        ctx.strokeStyle = "rgba(170,205,225," + (0.25 * Math.min(1, e.life)).toFixed(3) + ")";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.kind === "ink") {
        ctx.fillStyle = "rgba(2,4,6," + (0.5 * Math.min(1, e.life / e.max)).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.kind === "spark") {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = "rgba(145,225,245," + (0.75 * Math.min(1, e.life / e.max)).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (e.kind === "ring") {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.strokeStyle = "rgba(145,225,245," + (0.45 * Math.min(1, e.life / e.max)).toFixed(3) + ")";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (e.kind === "eclipse") {
        const a = Math.min(1, e.life / e.max);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        const g = ctx.createRadialGradient(e.x, e.y, e.r * 0.08, e.x, e.y, e.r);
        g.addColorStop(0, "rgba(205,245,255," + (0.32 * a).toFixed(3) + ")");
        g.addColorStop(0.4, "rgba(80,175,220," + (0.18 * a).toFixed(3) + ")");
        g.addColorStop(1, "rgba(80,175,220,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(200,245,255," + (0.45 * a).toFixed(3) + ")";
        ctx.lineWidth = 1;
        for (let i = 0; i < 9; i++) {
          const ang = e.ph + i * Math.PI * 2 / 9 + e.r * 0.002;
          ctx.beginPath();
          ctx.moveTo(e.x + Math.cos(ang) * e.r * 0.16, e.y + Math.sin(ang) * e.r * 0.16);
          ctx.lineTo(e.x + Math.cos(ang) * e.r * 0.95, e.y + Math.sin(ang) * e.r * 0.95);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  function drawSnow() {
    for (const p of snow) {
      ctx.fillStyle = "rgba(180,205,220," + p.a + ")";
      ctx.fillRect(p.x, p.y, p.r, p.r);
    }
  }

  function frame(nowMs) {
    const t = nowMs / 1000;
    let dt = t - lastT;
    lastT = t;
    if (dt > 0.1) dt = 0.1; // tab was hidden

    update(dt, t);

    drawBackground(t);
    drawFloor(t, false);
    for (const c of creatures) drawCreature(c, t);
    drawEffects();
    drawDecor(t);
    drawFloor(t, true);
    drawSnow();

    requestAnimationFrame(frame);
  }

  /* ---------- interaction ---------- */

  function hitTest(mx, my) {
    // nearest creatures drawn last are visually on top — search from the end
    for (let i = creatures.length - 1; i >= 0; i--) {
      const c = creatures[i];
      let r = c.sp.size * c.scale * 0.55;
      if (c.offsets) r = c.sp.size * c.scale * 2;
      const dx = mx - c.x, dy = my - c.y;
      if (dx * dx + dy * dy < r * r) return c;
    }
    return null;
  }

  function bubbles(x, y, n) {
    for (let i = 0; i < n; i++) {
      effects.push({
        kind: "bubble",
        x: x + rand(-8, 8), y: y + rand(-6, 6),
        r: rand(1, 3.2), v: rand(26, 60),
        ph: rand(0, 6), life: rand(1.2, 2.6),
      });
    }
  }

  function dragonSparks(x, y, n, force) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(force * 0.35, force);
      effects.push({
        kind: "spark",
        x: x + rand(-10, 10), y: y + rand(-8, 8),
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        r: rand(1.1, 3.4), life: rand(0.65, 1.35), max: 1.35,
      });
    }
  }

  function dragonBurst(c, mx) {
    const rare = Math.random() < 0.1;
    const common = ["flare", "dash", "roll"];
    const anim = rare ? "eclipse" : common[Math.floor(Math.random() * common.length)];
    c.dragonAnim = anim;
    c.dragonDur = rare ? 3.2 : 1.25;
    c.dragonT = c.dragonDur;
    c.glowT = rare ? 3.2 : 1.2;
    c.dir = mx < c.x ? 1 : -1;

    if (anim === "dash") {
      c.fleeT = 1.1;
      bubbles(c.x + c.dir * c.sp.size * 0.25, c.y, 6);
      dragonSparks(c.x, c.y, 12, 120);
    } else if (anim === "roll") {
      c.fleeT = 0.35;
      effects.push({ kind: "ring", x: c.x, y: c.y, r: c.sp.size * 0.12, grow: c.sp.size * 0.45, life: 1.15, max: 1.15, ph: c.ph });
      dragonSparks(c.x, c.y, 10, 90);
    } else if (anim === "flare") {
      c.fleeT = 0.45;
      effects.push({ kind: "ring", x: c.x, y: c.y, r: c.sp.size * 0.08, grow: c.sp.size * 0.35, life: 0.95, max: 0.95, ph: c.ph });
      dragonSparks(c.x, c.y, 16, 70);
    } else {
      c.fleeT = 1.8;
      effects.push({ kind: "eclipse", x: c.x, y: c.y, r: c.sp.size * 0.1, grow: c.sp.size * 0.75, life: 3.2, max: 3.2, ph: c.ph });
      effects.push({ kind: "ring", x: c.x, y: c.y, r: c.sp.size * 0.2, grow: c.sp.size * 0.9, life: 1.8, max: 1.8, ph: c.ph + 1 });
      bubbles(c.x, c.y, 16);
      dragonSparks(c.x, c.y, 42, 180);
    }
  }

  function interact(c, mx) {
    const sp = c.sp;
    switch (sp.behavior) {
      case "crab":
        c.clawT = 1.4;
        c.fleeT = 1.1;
        c.state = "walk";
        c.stateT = 2;
        c.dir = mx < c.x ? 1 : -1;
        break;
      case "octo":
        effects.push({ kind: "ink", x: c.x, y: c.y, r: sp.size * 0.2, grow: sp.size * 0.55, life: 2.4, max: 2.4 });
        c.fleeT = 1.2;
        c.dir = mx < c.x ? 1 : -1;
        bubbles(c.x, c.y, 3);
        break;
      case "jelly":
        c.fleeT = 1.6;
        bubbles(c.x, c.y - 10, 2);
        break;
      case "lurk":
        c.glowT = 2.2;
        c.fleeT = 0.6;
        c.dir = mx < c.x ? 1 : -1;
        break;
      case "dragon":
        dragonBurst(c, mx);
        break;
      case "patrol":
        c.fleeT = 1.6; // lunge
        bubbles(c.x + c.dir * sp.size * 0.3, c.y, 4);
        break;
      default:
        c.fleeT = 1.3;
        c.dir = mx < c.x ? 1 : -1;
        bubbles(c.x, c.y, 3);
    }
    showLabel(sp.name, c.x, c.y - sp.size * c.scale * 0.5 - 14);
  }

  function showLabel(text, x, y) {
    labelEl.textContent = text;
    labelEl.style.left = Math.max(60, Math.min(W - 60, x)) + "px";
    labelEl.style.top = Math.max(30, y) + "px";
    labelEl.classList.remove("hidden");
    labelEl.style.opacity = "1";
    clearTimeout(labelTimer);
    labelTimer = setTimeout(() => { labelEl.style.opacity = "0"; }, 1200);
  }

  canvas.addEventListener("pointerdown", (e) => {
    const c = hitTest(e.clientX, e.clientY);
    if (c) interact(c, e.clientX);
  });

  let hoverThrottle = 0;
  canvas.addEventListener("pointermove", (e) => {
    const now = performance.now();
    if (now - hoverThrottle < 60) return;
    hoverThrottle = now;
    canvas.style.cursor = hitTest(e.clientX, e.clientY) ? "pointer" : "default";
  });

  window.addEventListener("resize", resize);

  /* ---------- boot ---------- */

  function start() {
    resize();
    syncFromStore();
    requestAnimationFrame(frame);
  }

  return { start, syncFromStore };
})();
