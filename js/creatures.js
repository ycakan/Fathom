/*
 * Species catalogue. Every creature is drawn procedurally as a dark
 * silhouette facing right, centered on (0,0). `o` carries per-instance
 * animation state: { t, ph, body, rim, glowT, walk, claw, dragonAnim, dragonP }.
 */
const Creatures = (() => {

  // Tapered band used for tentacles / arms (mostly vertical strokes).
  function band(ctx, x0, y0, cx, cy, x1, y1, w0, w1) {
    ctx.beginPath();
    ctx.moveTo(x0 - w0, y0);
    ctx.quadraticCurveTo(cx - w0 * 0.6, cy, x1 - w1, y1);
    ctx.lineTo(x1 + w1, y1);
    ctx.quadraticCurveTo(cx + w0 * 0.6, cy, x0 + w0, y0);
    ctx.closePath();
  }

  function rim(ctx, o, w) {
    ctx.strokeStyle = o.rim;
    ctx.lineWidth = w || 1;
    ctx.stroke();
  }

  // Generic streamlined fish body, nose at (+s/2, 0), forked tail at (-s/2).
  function fishBody(ctx, s, H, fork) {
    ctx.beginPath();
    ctx.moveTo(s * 0.5, 0);
    ctx.quadraticCurveTo(s * 0.15, -H * 0.55, -s * 0.2, -H * 0.3);
    ctx.lineTo(-s * 0.5, -H * fork);
    ctx.quadraticCurveTo(-s * 0.3, 0, -s * 0.5, H * fork);
    ctx.lineTo(-s * 0.2, H * 0.3);
    ctx.quadraticCurveTo(s * 0.15, H * 0.55, s * 0.5, 0);
    ctx.closePath();
  }

  // Shared shark silhouette; head: "point" | "hammer" | "blunt".
  function shark(ctx, s, H, head, dorsal, o) {
    ctx.beginPath();
    if (head === "hammer") {
      // cephalofoil: a slim plate jutting forward with a notched front
      ctx.moveTo(s * 0.28, -H * 0.42);
      ctx.lineTo(s * 0.5, -H * 0.36);
      ctx.lineTo(s * 0.56, -H * 0.18);
      ctx.lineTo(s * 0.48, -H * 0.04);
      ctx.lineTo(s * 0.56, H * 0.12);
      ctx.lineTo(s * 0.5, H * 0.3);
      ctx.lineTo(s * 0.28, H * 0.34);
    } else if (head === "blunt") {
      ctx.moveTo(s * 0.32, -H * 0.5);
      ctx.quadraticCurveTo(s * 0.47, -H * 0.42, s * 0.5, -H * 0.05);
      ctx.quadraticCurveTo(s * 0.5, H * 0.3, s * 0.34, H * 0.42);
    } else {
      ctx.moveTo(s * 0.32, -H * 0.42);
      ctx.quadraticCurveTo(s * 0.44, -H * 0.28, s * 0.5, -H * 0.02);
      ctx.quadraticCurveTo(s * 0.42, H * 0.24, s * 0.3, H * 0.36);
    }
    // belly back to tail
    ctx.quadraticCurveTo(s * 0.05, H * 0.55, -s * 0.24, H * 0.26);
    // pectoral fin
    ctx.lineTo(-s * 0.14, H * 0.34);
    ctx.lineTo(-s * 0.05, H * 0.95);
    ctx.lineTo(-s * 0.22, H * 0.32);
    // taper to tail root
    ctx.quadraticCurveTo(-s * 0.34, H * 0.14, -s * 0.4, H * 0.06);
    // lower tail lobe
    ctx.lineTo(-s * 0.52, H * 0.42);
    ctx.quadraticCurveTo(-s * 0.46, H * 0.05, -s * 0.44, -H * 0.02);
    // upper tail lobe
    ctx.lineTo(-s * 0.62, -H * 0.85);
    ctx.quadraticCurveTo(-s * 0.48, -H * 0.3, -s * 0.38, -H * 0.16);
    // back with dorsal fin
    ctx.quadraticCurveTo(-s * 0.26, -H * 0.32, -s * 0.16, -H * 0.38);
    ctx.lineTo(-s * 0.04, -H * (0.38 + dorsal));
    ctx.quadraticCurveTo(s * 0.02, -H * 0.48, s * 0.08, -H * 0.5);
    ctx.closePath();
    ctx.fillStyle = o.body;
    ctx.fill();
    rim(ctx, o, 1);
  }

  const SPECIES = [
    {
      id: "minnow", name: "Minnow School", price: 1, size: 24, school: 7,
      band: [0.14, 0.7], speed: 46, behavior: "school",
      desc: "A tiny silver shoal that moves as one.",
      draw(ctx, o) {
        const s = this.size, H = s * 0.36;
        fishBody(ctx, s, H, 0.45);
        ctx.fillStyle = o.body;
        ctx.fill();
        rim(ctx, o, 0.8);
      },
    },
    {
      id: "jellyfish", name: "Jellyfish", price: 2, size: 42,
      band: [0.12, 0.6], speed: 6, behavior: "jelly",
      desc: "Drifts on faint currents, softly glowing.",
      draw(ctx, o) {
        const s = this.size;
        const p = Math.sin(o.t * 2.2 + o.ph);
        const bw = s * 0.5 * (1 + 0.09 * p);
        const bh = s * 0.46 * (1 - 0.12 * p);
        // faint glow
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, s * 0.9);
        g.addColorStop(0, "rgba(140,185,205,0.14)");
        g.addColorStop(1, "rgba(140,185,205,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2);
        ctx.fill();
        // bell
        ctx.beginPath();
        ctx.moveTo(-bw, 0);
        ctx.bezierCurveTo(-bw, -bh * 1.35, bw, -bh * 1.35, bw, 0);
        ctx.quadraticCurveTo(bw * 0.5, bh * 0.22, 0, bh * 0.1);
        ctx.quadraticCurveTo(-bw * 0.5, bh * 0.22, -bw, 0);
        ctx.closePath();
        ctx.fillStyle = "rgba(150,190,210,0.16)";
        ctx.fill();
        ctx.strokeStyle = "rgba(170,205,225,0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();
        // tentacles
        ctx.strokeStyle = "rgba(150,190,210,0.20)";
        for (let i = -2; i <= 2; i++) {
          const x = i * bw * 0.32;
          const sway = Math.sin(o.t * 1.4 + o.ph + i) * s * 0.12;
          ctx.beginPath();
          ctx.moveTo(x, bh * 0.08);
          ctx.quadraticCurveTo(x + sway, s * 0.5, x + sway * 1.6, s * (0.85 + 0.06 * ((i + 5) % 3)));
          ctx.stroke();
        }
      },
    },
    {
      id: "crab", name: "Crab", price: 2, size: 42,
      band: [1, 1], speed: 16, behavior: "crab",
      desc: "Scuttles along the seafloor. Do not startle.",
      draw(ctx, o) {
        const s = this.size, w = s * 0.44, h = s * 0.26;
        // legs (3 each side), stepping
        ctx.strokeStyle = o.body;
        ctx.lineWidth = 2;
        for (let side = -1; side <= 1; side += 2) {
          for (let i = 0; i < 3; i++) {
            const step = Math.sin(o.t * 9 + i * 2.1 + (side > 0 ? 0 : Math.PI)) * 0.3 * (o.walk || 0);
            const bx = side * w * (0.35 + i * 0.18);
            const kx = side * (w * (0.85 + i * 0.25)) + step * s * 0.25;
            ctx.beginPath();
            ctx.moveTo(bx, h * 0.4);
            ctx.quadraticCurveTo(kx, h * 0.5, kx + side * s * 0.05, h * (1.9 - step * 1.2));
            ctx.stroke();
          }
        }
        // claws — raise when provoked
        const raise = (o.claw || 0) * 0.9;
        for (let side = -1; side <= 1; side += 2) {
          const cx = side * w * 0.95;
          const cy = -h * 0.25 - raise * s * 0.22;
          ctx.beginPath();
          ctx.moveTo(side * w * 0.55, 0);
          ctx.quadraticCurveTo(side * w * 0.9, -h * 0.1 - raise * s * 0.1, cx, cy);
          ctx.lineWidth = 2.6;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx, cy, s * 0.09, Math.PI * 0.2, Math.PI * 1.6);
          ctx.lineWidth = 3.2;
          ctx.stroke();
        }
        // body
        ctx.beginPath();
        ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
        ctx.fillStyle = o.body;
        ctx.fill();
        rim(ctx, o, 1);
        // eye stalks
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = o.body;
        for (let side = -1; side <= 1; side += 2) {
          ctx.beginPath();
          ctx.moveTo(side * w * 0.24, -h * 0.7);
          ctx.lineTo(side * w * 0.3, -h * 1.35);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(side * w * 0.3, -h * 1.45, 1.6, 0, Math.PI * 2);
          ctx.fillStyle = o.rim;
          ctx.fill();
        }
      },
    },
    {
      id: "angelfish", name: "Angelfish", price: 3, size: 46,
      band: [0.25, 0.65], speed: 30, behavior: "swim",
      desc: "Tall, serene, trailing long fins.",
      draw(ctx, o) {
        const s = this.size;
        ctx.beginPath();
        ctx.moveTo(s * 0.45, 0);
        ctx.quadraticCurveTo(s * 0.18, -s * 0.3, -s * 0.02, -s * 0.32);
        ctx.lineTo(-s * 0.38, -s * 0.52);           // dorsal streamer
        ctx.quadraticCurveTo(-s * 0.18, -s * 0.12, -s * 0.3, -s * 0.06);
        ctx.lineTo(-s * 0.5, -s * 0.16);            // tail top
        ctx.quadraticCurveTo(-s * 0.4, 0, -s * 0.5, s * 0.16);
        ctx.lineTo(-s * 0.3, s * 0.06);
        ctx.quadraticCurveTo(-s * 0.18, s * 0.12, -s * 0.38, s * 0.52);  // anal streamer
        ctx.lineTo(-s * 0.02, s * 0.32);
        ctx.quadraticCurveTo(s * 0.18, s * 0.3, s * 0.45, 0);
        ctx.closePath();
        ctx.fillStyle = o.body;
        ctx.fill();
        rim(ctx, o, 1);
        // ventral streamers
        ctx.strokeStyle = o.body;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(s * 0.14, s * 0.24);
        ctx.quadraticCurveTo(s * 0.1, s * 0.5, -s * 0.02, s * 0.6);
        ctx.stroke();
      },
    },
    {
      id: "nautilus", name: "Nautilus", price: 4, size: 46,
      band: [0.4, 0.85], speed: 12, behavior: "bob",
      desc: "An ancient spiral, unhurried for 500 million years.",
      draw(ctx, o) {
        const s = this.size, r = s * 0.4;
        // shell
        ctx.beginPath();
        ctx.arc(-s * 0.06, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = o.body;
        ctx.fill();
        rim(ctx, o, 1);
        // spiral
        ctx.strokeStyle = o.rim;
        ctx.lineWidth = 1;
        ctx.beginPath();
        let a = -0.6, rad = r * 0.92;
        ctx.moveTo(-s * 0.06 + Math.cos(a) * rad, Math.sin(a) * rad);
        for (let i = 0; i < 44; i++) {
          a += 0.22;
          rad *= 0.955;
          ctx.lineTo(-s * 0.06 + Math.cos(a) * rad, Math.sin(a) * rad);
        }
        ctx.stroke();
        // tentacle fan
        ctx.strokeStyle = o.body;
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 5; i++) {
          const wig = Math.sin(o.t * 3 + o.ph + i) * s * 0.03;
          ctx.beginPath();
          ctx.moveTo(s * 0.3, s * 0.02);
          ctx.quadraticCurveTo(s * 0.42, s * (0.02 + i * 0.045), s * (0.52 + i * 0.015) + wig, s * (0.05 + i * 0.06));
          ctx.stroke();
        }
        // eye
        ctx.fillStyle = o.rim;
        ctx.beginPath();
        ctx.arc(s * 0.28, -s * 0.08, 1.8, 0, Math.PI * 2);
        ctx.fill();
      },
    },
    {
      id: "seahorse", name: "Seahorse", price: 5, size: 54,
      band: [0.42, 0.86], speed: 10, behavior: "seahorse",
      desc: "Hovers upright, its tail ready to anchor to a reed.",
      draw(ctx, o) {
        const s = this.size;
        const finWave = o.t * 6 + o.ph;

        // dorsal fin on the back, fluttering (drawn behind the body, tapered
        // at both ends so it hugs the spine like a leaf rather than a slab)
        ctx.fillStyle = o.body;
        ctx.beginPath();
        ctx.moveTo(-s * 0.08, -s * 0.16);
        for (let i = 0; i <= 8; i++) {
          const k = i / 8;
          const yy = -s * 0.16 + k * s * 0.30;
          const reach = (s * 0.055 + Math.sin(finWave + k * 4) * s * 0.02) * Math.sin(Math.PI * k);
          ctx.lineTo(-s * 0.09 - reach, yy);
        }
        ctx.lineTo(-s * 0.08, s * 0.14);
        ctx.closePath();
        ctx.fill();

        // main body: upright S-curve, snout upper-right, tail curled below
        ctx.beginPath();
        ctx.moveTo(s * 0.36, -s * 0.33);                                 // snout tip
        ctx.quadraticCurveTo(s * 0.16, -s * 0.27, s * 0.09, -s * 0.21);  // snout underside → chin
        ctx.quadraticCurveTo(s * 0.05, -s * 0.15, s * 0.13, -s * 0.09);  // throat → chest
        ctx.quadraticCurveTo(s * 0.19, s * 0.0, s * 0.13, s * 0.13);     // belly bulge → lower belly
        ctx.quadraticCurveTo(s * 0.07, s * 0.22, s * 0.06, s * 0.28);    // tail root
        ctx.quadraticCurveTo(s * 0.14, s * 0.34, s * 0.07, s * 0.42);    // outer curl → bottom
        ctx.quadraticCurveTo(s * 0.0, s * 0.46, -s * 0.04, s * 0.38);    // tail tip
        ctx.quadraticCurveTo(s * 0.02, s * 0.32, -s * 0.02, s * 0.24);   // inner tail
        ctx.quadraticCurveTo(-s * 0.08, s * 0.12, -s * 0.09, -s * 0.02); // back lower
        ctx.quadraticCurveTo(-s * 0.10, -s * 0.16, -s * 0.05, -s * 0.27);// back upper → nape
        ctx.quadraticCurveTo(-s * 0.02, -s * 0.34, s * 0.04, -s * 0.38); // back of head → crown
        ctx.quadraticCurveTo(s * 0.12, -s * 0.40, s * 0.36, -s * 0.33);  // brow → top of snout
        ctx.closePath();
        ctx.fillStyle = o.body;
        ctx.fill();
        rim(ctx, o, 1);

        // coronet spikes
        ctx.strokeStyle = o.body;
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 3; i++) {
          const bx = -s * 0.02 + i * s * 0.035;
          ctx.beginPath();
          ctx.moveTo(bx, -s * 0.37);
          ctx.lineTo(bx - s * 0.012, -s * 0.45);
          ctx.stroke();
        }

        // body ridge segments
        ctx.strokeStyle = o.rim;
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const yy = -s * 0.12 + i * s * 0.09;
          ctx.beginPath();
          ctx.moveTo(-s * 0.06, yy + s * 0.02);
          ctx.quadraticCurveTo(s * 0.05, yy, s * 0.12, yy - s * 0.01);
          ctx.stroke();
        }

        // eye
        ctx.fillStyle = o.rim;
        ctx.beginPath();
        ctx.arc(s * 0.08, -s * 0.28, 1.7, 0, Math.PI * 2);
        ctx.fill();
      },
    },
    {
      id: "turtle", name: "Sea Turtle", price: 5, size: 88,
      band: [0.2, 0.6], speed: 18, behavior: "swim",
      desc: "Glides through open water without a care.",
      draw(ctx, o) {
        const s = this.size;
        const flap = Math.sin(o.t * 1.7 + o.ph);
        // front flipper
        ctx.beginPath();
        ctx.moveTo(s * 0.12, s * 0.02);
        ctx.quadraticCurveTo(s * 0.05, s * (0.2 + 0.12 * flap), -s * 0.12, s * (0.34 + 0.18 * flap));
        ctx.quadraticCurveTo(s * 0.02, s * 0.16, s * 0.18, s * 0.08);
        ctx.closePath();
        ctx.fillStyle = o.body;
        ctx.fill();
        // rear flipper
        ctx.beginPath();
        ctx.moveTo(-s * 0.3, s * 0.04);
        ctx.quadraticCurveTo(-s * 0.4, s * (0.16 + 0.06 * flap), -s * 0.48, s * (0.2 + 0.08 * flap));
        ctx.quadraticCurveTo(-s * 0.36, s * 0.08, -s * 0.28, s * 0.06);
        ctx.closePath();
        ctx.fill();
        // shell
        ctx.beginPath();
        ctx.moveTo(-s * 0.36, s * 0.02);
        ctx.quadraticCurveTo(-s * 0.22, -s * 0.3, s * 0.06, -s * 0.26);
        ctx.quadraticCurveTo(s * 0.26, -s * 0.18, s * 0.3, s * 0.0);
        ctx.quadraticCurveTo(s * 0.0, s * 0.1, -s * 0.36, s * 0.02);
        ctx.closePath();
        ctx.fill();
        rim(ctx, o, 1);
        // neck + head
        ctx.beginPath();
        ctx.moveTo(s * 0.26, -s * 0.06);
        ctx.quadraticCurveTo(s * 0.36, -s * 0.12, s * 0.44, -s * 0.09);
        ctx.quadraticCurveTo(s * 0.52, -s * 0.06, s * 0.5, -s * 0.005);
        ctx.quadraticCurveTo(s * 0.46, s * 0.05, s * 0.36, s * 0.04);
        ctx.quadraticCurveTo(s * 0.3, s * 0.03, s * 0.26, s * 0.01);
        ctx.closePath();
        ctx.fill();
        rim(ctx, o, 0.8);
      },
    },
    {
      id: "angler", name: "Anglerfish", price: 6, size: 64,
      band: [0.66, 0.9], speed: 10, behavior: "lurk",
      desc: "Carries its own lantern into the dark.",
      draw(ctx, o) {
        const s = this.size;
        const glow = 0.5 + 0.5 * Math.sin(o.t * 2.4 + o.ph) + (o.glowT || 0) * 1.6;
        // lure glow (drawn first, additive)
        const lx = s * 0.4, ly = -s * 0.3;
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        const g = ctx.createRadialGradient(lx, ly, 0.5, lx, ly, s * 0.28 * (0.8 + 0.3 * glow));
        g.addColorStop(0, "rgba(200,230,235," + Math.min(0.85, 0.35 + 0.3 * glow) + ")");
        g.addColorStop(0.25, "rgba(140,200,210," + Math.min(0.5, 0.14 + 0.16 * glow) + ")");
        g.addColorStop(1, "rgba(140,200,210,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(lx, ly, s * 0.32 * (0.8 + 0.3 * glow), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // body — bulky head tapering to small tail
        ctx.beginPath();
        ctx.moveTo(s * 0.42, s * 0.06);
        ctx.quadraticCurveTo(s * 0.34, -s * 0.24, s * 0.02, -s * 0.26);
        ctx.quadraticCurveTo(-s * 0.3, -s * 0.22, -s * 0.42, -s * 0.04);
        ctx.lineTo(-s * 0.54, -s * 0.14);
        ctx.quadraticCurveTo(-s * 0.46, 0, -s * 0.54, s * 0.14);
        ctx.lineTo(-s * 0.42, s * 0.04);
        ctx.quadraticCurveTo(-s * 0.24, s * 0.24, s * 0.05, s * 0.26);
        // open jaw
        ctx.quadraticCurveTo(s * 0.22, s * 0.26, s * 0.3, s * 0.3);
        ctx.lineTo(s * 0.24, s * 0.16);
        ctx.lineTo(s * 0.32, s * 0.2);
        ctx.lineTo(s * 0.3, s * 0.08);
        ctx.closePath();
        ctx.fillStyle = o.body;
        ctx.fill();
        rim(ctx, o, 1);
        // teeth hints
        ctx.strokeStyle = o.rim;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s * 0.36, s * 0.1);
        ctx.lineTo(s * 0.33, s * 0.16);
        ctx.moveTo(s * 0.4, s * 0.08);
        ctx.lineTo(s * 0.38, s * 0.15);
        ctx.stroke();
        // lure stalk
        ctx.strokeStyle = o.body;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(s * 0.06, -s * 0.25);
        ctx.quadraticCurveTo(s * 0.12, -s * 0.48, lx, ly);
        ctx.stroke();
        // lure bulb
        ctx.fillStyle = "rgba(215,240,245," + Math.min(1, 0.6 + 0.3 * glow) + ")";
        ctx.beginPath();
        ctx.arc(lx, ly, 2.4, 0, Math.PI * 2);
        ctx.fill();
      },
    },
    {
      id: "octopus", name: "Octopus", price: 7, size: 72,
      band: [0.82, 0.95], speed: 9, behavior: "octo",
      desc: "Eight arms, three hearts, one attitude.",
      draw(ctx, o) {
        const s = this.size;
        // arms
        for (let i = 0; i < 5; i++) {
          const bx = -s * 0.18 + i * s * 0.09;
          const sway = Math.sin(o.t * 1.3 + o.ph + i * 1.7) * s * 0.1;
          band(
            ctx,
            bx, s * 0.02,
            bx + sway * 0.6, s * 0.24,
            bx + sway, s * 0.46,
            s * 0.05, s * 0.008
          );
          ctx.fillStyle = o.body;
          ctx.fill();
        }
        // mantle
        ctx.beginPath();
        ctx.moveTo(-s * 0.26, s * 0.06);
        ctx.quadraticCurveTo(-s * 0.3, -s * 0.3, 0, -s * 0.32);
        ctx.quadraticCurveTo(s * 0.3, -s * 0.3, s * 0.26, s * 0.06);
        ctx.quadraticCurveTo(0, s * 0.16, -s * 0.26, s * 0.06);
        ctx.closePath();
        ctx.fillStyle = o.body;
        ctx.fill();
        rim(ctx, o, 1);
        // eye
        ctx.fillStyle = o.rim;
        ctx.beginPath();
        ctx.arc(s * 0.13, -s * 0.08, 2, 0, Math.PI * 2);
        ctx.fill();
      },
    },
    {
      id: "ray", name: "Manta Ray", price: 8, size: 150,
      band: [0.3, 0.7], speed: 24, behavior: "swim",
      desc: "A slow wingbeat in the blue-black.",
      draw(ctx, o) {
        const s = this.size;
        const f = Math.sin(o.t * 1.8 + o.ph) * s * 0.06;
        ctx.beginPath();
        ctx.moveTo(s * 0.45, 0);
        // upper leading edge out to the wingtip
        ctx.quadraticCurveTo(s * 0.16, -s * 0.045, s * 0.02, -s * 0.3 - f);
        // upper trailing edge back to the tail root
        ctx.quadraticCurveTo(-s * 0.09, -s * 0.055, -s * 0.28, -s * 0.015);
        // whip tail
        ctx.lineTo(-s * 0.62, 0);
        ctx.lineTo(-s * 0.28, s * 0.015);
        // lower wing, counter-phase
        ctx.quadraticCurveTo(-s * 0.09, s * 0.055, s * 0.02, s * 0.3 - f);
        ctx.quadraticCurveTo(s * 0.16, s * 0.045, s * 0.45, 0);
        ctx.closePath();
        ctx.fillStyle = o.body;
        ctx.fill();
        rim(ctx, o, 1);
        // cephalic fins
        ctx.strokeStyle = o.body;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s * 0.43, -s * 0.012);
        ctx.quadraticCurveTo(s * 0.5, -s * 0.02, s * 0.53, -s * 0.05);
        ctx.moveTo(s * 0.43, s * 0.012);
        ctx.quadraticCurveTo(s * 0.5, s * 0.02, s * 0.53, s * 0.05);
        ctx.stroke();
      },
    },
    {
      id: "reefshark", name: "Reef Shark", price: 9, size: 150,
      band: [0.3, 0.75], speed: 34, behavior: "patrol",
      desc: "Patrols its territory in long, quiet lines.",
      draw(ctx, o) { shark(ctx, this.size, this.size * 0.2, "point", 0.5, o); },
    },
    {
      id: "axolotl", name: "Axolotl", price: 10, size: 62,
      band: [0.68, 0.92], speed: 18, behavior: "axolotl",
      desc: "A smiling little wanderer with feathery gills.",
      draw(ctx, o) {
        const s = this.size;
        const wave = Math.sin(o.t * 2.3 + o.ph);
        // feathery external gills
        ctx.strokeStyle = o.body;
        ctx.lineWidth = 1.7;
        for (let side = -1; side <= 1; side += 2) {
          for (let i = 0; i < 3; i++) {
            const yy = -s * 0.12 + i * s * 0.08;
            const sway = wave * s * 0.035 + i * side * s * 0.01;
            ctx.beginPath();
            ctx.moveTo(s * 0.18, yy);
            ctx.quadraticCurveTo(s * 0.28, yy + side * s * 0.02, s * 0.36 + sway, yy + side * s * 0.11);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(s * 0.18, yy);
            ctx.quadraticCurveTo(s * 0.08, yy + side * s * 0.02, -s * 0.01 - sway, yy + side * s * 0.11);
            ctx.stroke();
          }
        }
        // body and head
        ctx.beginPath();
        ctx.moveTo(s * 0.48, 0);
        ctx.quadraticCurveTo(s * 0.36, -s * 0.18, s * 0.1, -s * 0.16);
        ctx.quadraticCurveTo(-s * 0.2, -s * 0.13, -s * 0.45, -s * 0.04);
        ctx.lineTo(-s * 0.62, -s * 0.12);
        ctx.quadraticCurveTo(-s * 0.56, 0, -s * 0.62, s * 0.12);
        ctx.lineTo(-s * 0.45, s * 0.04);
        ctx.quadraticCurveTo(-s * 0.2, s * 0.13, s * 0.1, s * 0.16);
        ctx.quadraticCurveTo(s * 0.38, s * 0.17, s * 0.48, 0);
        ctx.closePath();
        ctx.fillStyle = o.body;
        ctx.fill();
        rim(ctx, o, 1);
        // small legs
        ctx.strokeStyle = o.body;
        ctx.lineWidth = 2;
        for (let x of [-s * 0.12, s * 0.12]) {
          ctx.beginPath();
          ctx.moveTo(x, s * 0.1);
          ctx.quadraticCurveTo(x - s * 0.02, s * 0.2, x - s * 0.11, s * 0.22 + wave * s * 0.015);
          ctx.stroke();
        }
        // face
        ctx.fillStyle = o.rim;
        ctx.beginPath();
        ctx.arc(s * 0.26, -s * 0.04, 1.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s * 0.3, s * 0.04, s * 0.035, 0, Math.PI);
        ctx.strokeStyle = o.rim;
        ctx.lineWidth = 1;
        ctx.stroke();
      },
    },
    {
      id: "hammerhead", name: "Hammerhead", price: 12, size: 175,
      band: [0.35, 0.8], speed: 32, behavior: "patrol",
      desc: "Sweeps the floor with its strange wide brow.",
      draw(ctx, o) { shark(ctx, this.size, this.size * 0.19, "hammer", 0.55, o); },
    },
    {
      id: "greatwhite", name: "Great White", price: 15, size: 230,
      band: [0.35, 0.85], speed: 30, behavior: "patrol",
      desc: "The shadow other shadows are afraid of.",
      draw(ctx, o) { shark(ctx, this.size, this.size * 0.24, "point", 0.6, o); },
    },
    {
      id: "whaleshark", name: "Whale Shark", price: 20, size: 320,
      band: [0.3, 0.75], speed: 16, behavior: "patrol",
      desc: "A gentle constellation drifting past.",
      draw(ctx, o) {
        const s = this.size, H = s * 0.22;
        shark(ctx, s, H, "blunt", 0.35, o);
        // spot constellation on the back
        ctx.fillStyle = "rgba(170,200,220,0.22)";
        for (let i = 0; i < 26; i++) {
          const px = -s * 0.32 + ((i * 73) % 60) / 60 * s * 0.72;
          const py = -H * 0.44 + ((i * 41) % 50) / 50 * H * 0.66;
          ctx.beginPath();
          ctx.arc(px, py, 1.4 + (i % 3) * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    },
    {
      id: "orca", name: "Orca", price: 50, size: 280,
      band: [0.22, 0.72], speed: 22, behavior: "patrol",
      desc: "A bold black-and-white giant with a moonlit saddle.",
      draw(ctx, o) {
        const s = this.size, H = s * 0.2;
        function bodyPath() {
          ctx.beginPath();
          ctx.moveTo(s * 0.5, -H * 0.04);
          ctx.quadraticCurveTo(s * 0.36, -H * 0.48, s * 0.1, -H * 0.56);
          ctx.lineTo(s * 0.02, -H * 1.35);
          ctx.quadraticCurveTo(-s * 0.03, -H * 0.6, -s * 0.16, -H * 0.42);
          ctx.quadraticCurveTo(-s * 0.34, -H * 0.24, -s * 0.42, -H * 0.08);
          ctx.lineTo(-s * 0.64, -H * 0.5);
          ctx.quadraticCurveTo(-s * 0.55, 0, -s * 0.64, H * 0.5);
          ctx.lineTo(-s * 0.42, H * 0.08);
          ctx.quadraticCurveTo(-s * 0.2, H * 0.34, s * 0.08, H * 0.32);
          ctx.quadraticCurveTo(s * 0.4, H * 0.28, s * 0.5, -H * 0.04);
          ctx.closePath();
        }
        bodyPath();
        ctx.fillStyle = o.body;
        ctx.fill();
        rim(ctx, o, 1);

        ctx.save();
        bodyPath();
        ctx.clip();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = "rgba(205,230,238,0.28)";
        ctx.beginPath();
        ctx.ellipse(s * 0.16, H * 0.12, s * 0.18, H * 0.2, -0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(s * 0.32, -H * 0.26, s * 0.055, H * 0.12, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-s * 0.04, -H * 0.4, s * 0.12, H * 0.1, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = o.body;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(s * 0.08, H * 0.23);
        ctx.quadraticCurveTo(s * 0.0, H * 0.7, -s * 0.12, H * 0.83);
        ctx.stroke();
      },
    },
    {
      id: "dragonfish", name: "Dragon Fish", price: 100, size: 190,
      band: [0.5, 0.9], speed: 16, behavior: "dragon",
      desc: "A rare abyssal hunter with shadowy wing-fins.",
      draw(ctx, o) {
        const s = this.size;
        const anim = o.dragonAnim || "";
        const p = Math.max(0, Math.min(1, o.dragonP || 0));
        const wingBeat = Math.sin(o.t * 3.8 + o.ph) * 0.18;
        const flare = anim === "flare" ? Math.sin(p * Math.PI) * 0.65 : 0;
        const rare = anim === "eclipse" ? Math.sin(p * Math.PI) : 0;
        const shimmer = 0.45 + 0.55 * Math.sin(o.t * 2.8 + o.ph) + rare * 1.2;

        // wing glow
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        const g = ctx.createRadialGradient(-s * 0.06, 0, 1, -s * 0.06, 0, s * (0.58 + rare * 0.24));
        g.addColorStop(0, "rgba(110,205,235," + Math.min(0.34, 0.12 + rare * 0.22) + ")");
        g.addColorStop(1, "rgba(70,145,190,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(-s * 0.06, 0, s * (0.58 + rare * 0.24), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // wing fins
        for (let side = -1; side <= 1; side += 2) {
          const lift = side * (s * (0.28 + flare * 0.12) + wingBeat * s * 0.08);
          ctx.beginPath();
          ctx.moveTo(s * 0.02, side * s * 0.04);
          ctx.quadraticCurveTo(-s * 0.08, lift * 0.72, -s * 0.42, lift);
          ctx.quadraticCurveTo(-s * 0.22, side * s * (0.14 + flare * 0.08), -s * 0.03, side * s * 0.08);
          ctx.closePath();
          ctx.fillStyle = "rgba(42,80,103," + (0.68 + rare * 0.22).toFixed(3) + ")";
          ctx.fill();
          ctx.strokeStyle = "rgba(145,210,230," + (0.18 + rare * 0.32).toFixed(3) + ")";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // long body and open head
        ctx.beginPath();
        ctx.moveTo(s * 0.48, -s * 0.04);
        ctx.quadraticCurveTo(s * 0.36, -s * 0.19, s * 0.12, -s * 0.17);
        ctx.quadraticCurveTo(-s * 0.18, -s * 0.15, -s * 0.48, -s * 0.07);
        ctx.lineTo(-s * 0.66, -s * 0.18);
        ctx.quadraticCurveTo(-s * 0.58, 0, -s * 0.66, s * 0.18);
        ctx.lineTo(-s * 0.48, s * 0.07);
        ctx.quadraticCurveTo(-s * 0.18, s * 0.14, s * 0.11, s * 0.11);
        ctx.quadraticCurveTo(s * 0.34, s * 0.08, s * 0.48, s * 0.03);
        ctx.lineTo(s * 0.35, s * 0.01);
        ctx.lineTo(s * 0.5, -s * 0.05);
        ctx.closePath();
        ctx.fillStyle = o.body;
        ctx.fill();
        rim(ctx, o, 1);

        // ragged dorsal spines
        ctx.fillStyle = o.body;
        for (let i = 0; i < 6; i++) {
          const x = -s * 0.34 + i * s * 0.095;
          const h = s * (0.08 + (i % 2) * 0.035);
          ctx.beginPath();
          ctx.moveTo(x - s * 0.025, -s * 0.12);
          ctx.lineTo(x, -s * 0.12 - h);
          ctx.lineTo(x + s * 0.04, -s * 0.11);
          ctx.closePath();
          ctx.fill();
        }

        // teeth and bioluminescent side lights
        ctx.strokeStyle = o.rim;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const x = s * (0.22 + i * 0.045);
          ctx.moveTo(x, s * 0.04);
          ctx.lineTo(x + s * 0.015, s * 0.1);
        }
        ctx.stroke();

        ctx.fillStyle = "rgba(155,225,240," + Math.min(0.95, 0.26 + shimmer * 0.16) + ")";
        for (let i = 0; i < 7; i++) {
          ctx.beginPath();
          ctx.arc(-s * 0.34 + i * s * 0.085, s * (0.015 + Math.sin(o.t * 4 + i) * 0.006), 1.4 + rare * 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    },
  ];

  function drawAnemone(ctx, s, o, arms) {
    const sway = Math.sin(o.t * 0.9 + o.ph);
    ctx.strokeStyle = o.body;
    ctx.lineCap = "round";
    for (let i = 0; i < arms; i++) {
      const k = arms === 1 ? 0 : i / (arms - 1);
      const x = (k - 0.5) * s * 0.7;
      const h = s * (0.38 + ((i * 37) % 10) / 50);
      ctx.lineWidth = s * 0.025;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.quadraticCurveTo(x + Math.sin(i + o.t * 0.7) * s * 0.08 + sway * s * 0.04, -h * 0.48, x + Math.sin(i) * s * 0.12, -h);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.36, s * 0.09, 0, 0, Math.PI * 2);
    ctx.fillStyle = o.body;
    ctx.fill();
    rim(ctx, o, 1);
  }

  const DECOR = [
    {
      id: "anemone_garden", name: "Anemone Garden", price: 6, size: 88,
      x: 0.18, scale: 0.92, kind: "fauna", limit: 1,
      desc: "Soft seafloor fauna that sways near the glass.",
      draw(ctx, o) { drawAnemone(ctx, this.size, o, 13); },
    },
    {
      id: "coral_fan", name: "Coral Fan", price: 8, size: 100,
      x: 0.78, scale: 0.9, kind: "fauna", limit: 1,
      desc: "A pale branching fan for the lower reef.",
      draw(ctx, o) {
        const s = this.size;
        ctx.strokeStyle = o.body;
        ctx.lineCap = "round";
        ctx.lineWidth = 3;
        for (let side = -1; side <= 1; side += 2) {
          for (let i = 0; i < 5; i++) {
            const ang = side * (0.18 + i * 0.16);
            const len = s * (0.34 + i * 0.045);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(Math.sin(ang) * len * 0.36, -len * 0.45, Math.sin(ang) * len, -len);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(Math.sin(ang) * len * 0.55, -len * 0.56);
            ctx.quadraticCurveTo(Math.sin(ang + side * 0.18) * len * 0.7, -len * 0.72, Math.sin(ang + side * 0.24) * len * 0.8, -len * 0.88);
            ctx.stroke();
          }
        }
        ctx.lineCap = "butt";
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.28, s * 0.08, 0, 0, Math.PI * 2);
        ctx.fillStyle = o.body;
        ctx.fill();
        rim(ctx, o, 1);
      },
    },
    {
      id: "kelp_grove", name: "Kelp Grove", price: 12, size: 130,
      x: 0.43, scale: 0.88, kind: "fauna", limit: 1,
      desc: "Tall ribbons of fauna-colored cover for small fish.",
      draw(ctx, o) {
        const s = this.size;
        ctx.strokeStyle = o.body;
        ctx.fillStyle = o.body;
        ctx.lineCap = "round";
        for (let i = 0; i < 7; i++) {
          const x = (i - 3) * s * 0.08;
          const h = s * (0.45 + ((i * 29) % 16) / 50);
          const sway = Math.sin(o.t * 0.55 + i + o.ph) * s * 0.08;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.quadraticCurveTo(x + sway * 0.4, -h * 0.45, x + sway, -h);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(x + sway * 0.55, -h * 0.52, s * 0.025, s * 0.12, sway * 0.01, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.lineCap = "butt";
      },
    },
    {
      id: "tube_worm_colony", name: "Tube Worm Colony", price: 14, size: 112,
      x: 0.57, scale: 0.82, kind: "fauna", limit: 1,
      desc: "A bright little colony clustered around the warm dark.",
      draw(ctx, o) {
        const s = this.size;
        ctx.strokeStyle = o.body;
        ctx.lineCap = "round";
        for (let i = 0; i < 9; i++) {
          const x = (i - 4) * s * 0.055;
          const h = s * (0.2 + ((i * 19) % 11) / 60);
          const sway = Math.sin(o.t * 0.75 + i + o.ph) * s * 0.035;
          ctx.lineWidth = s * 0.02;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.quadraticCurveTo(x + sway * 0.4, -h * 0.52, x + sway, -h);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x + sway, -h, s * 0.028, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.lineCap = "butt";
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.36, s * 0.07, 0, 0, Math.PI * 2);
        ctx.fillStyle = o.body;
        ctx.fill();
        rim(ctx, o, 1);
      },
    },
    {
      id: "black_coral_thicket", name: "Black Coral Thicket", price: 16, size: 118,
      x: 0.09, scale: 0.84, kind: "fauna", limit: 1,
      desc: "A branching thicket for the deepest corner.",
      draw(ctx, o) {
        const s = this.size;
        ctx.strokeStyle = o.body;
        ctx.lineCap = "round";
        ctx.lineWidth = 2;
        const branch = (x, y, len, ang, depth) => {
          if (depth <= 0) return;
          const nx = x + Math.cos(ang) * len;
          const ny = y - Math.sin(ang) * len;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo((x + nx) / 2 + Math.sin(o.t * 0.4 + depth) * 2, (y + ny) / 2, nx, ny);
          ctx.stroke();
          branch(nx, ny, len * 0.62, ang + 0.42, depth - 1);
          branch(nx, ny, len * 0.58, ang - 0.36, depth - 1);
        };
        branch(0, 0, s * 0.28, Math.PI * 0.5, 4);
        ctx.lineCap = "butt";
      },
    },
    {
      id: "glass_sponge_cluster", name: "Glass Sponge Cluster", price: 18, size: 104,
      x: 0.9, scale: 0.86, kind: "fauna", limit: 1,
      desc: "Delicate sponges catching the blue light.",
      draw(ctx, o) {
        const s = this.size;
        ctx.strokeStyle = o.rim;
        ctx.fillStyle = o.body;
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 5; i++) {
          const x = (i - 2) * s * 0.1;
          const h = s * (0.25 + ((i * 23) % 13) / 70);
          ctx.beginPath();
          ctx.ellipse(x, -h * 0.42, s * 0.045, h * 0.52, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(x, -h * 0.86, s * 0.034, s * 0.012, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      },
    },
    {
      id: "anchor_field", name: "Anchor Field", price: 18, size: 132,
      x: 0.51, scale: 0.78, kind: "wreck", limit: 1,
      desc: "Old iron scattered where maps stopped helping.",
      draw(ctx, o) {
        const s = this.size;
        ctx.strokeStyle = o.rim;
        ctx.fillStyle = o.body;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.45);
        ctx.lineTo(0, -s * 0.06);
        ctx.moveTo(-s * 0.16, -s * 0.31);
        ctx.lineTo(s * 0.16, -s * 0.31);
        ctx.moveTo(-s * 0.3, -s * 0.08);
        ctx.quadraticCurveTo(-s * 0.16, s * 0.18, 0, -s * 0.06);
        ctx.quadraticCurveTo(s * 0.16, s * 0.18, s * 0.3, -s * 0.08);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, -s * 0.5, s * 0.045, 0, Math.PI * 2);
        ctx.stroke();
      },
    },
    {
      id: "shipwreck_skiff", name: "Broken Skiff", price: 24, size: 180,
      x: 0.64, scale: 0.82, kind: "wreck", limit: 1,
      desc: "A small wreck half-buried in the sand.",
      draw(ctx, o) {
        const s = this.size;
        ctx.fillStyle = o.body;
        ctx.strokeStyle = o.rim;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-s * 0.46, -s * 0.02);
        ctx.lineTo(s * 0.38, -s * 0.1);
        ctx.lineTo(s * 0.24, s * 0.12);
        ctx.lineTo(-s * 0.32, s * 0.14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        for (let i = 0; i < 5; i++) {
          const x = -s * 0.28 + i * s * 0.14;
          ctx.beginPath();
          ctx.moveTo(x, -s * 0.05);
          ctx.lineTo(x - s * 0.03, s * 0.11);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(s * 0.02, -s * 0.1);
        ctx.lineTo(s * 0.08, -s * 0.5);
        ctx.lineTo(s * 0.12, -s * 0.12);
        ctx.stroke();
      },
    },
    {
      id: "fallen_mast", name: "Fallen Mast", price: 28, size: 188,
      x: 0.72, scale: 0.8, kind: "wreck", limit: 1,
      desc: "A snapped mast and torn spar resting in the silt.",
      draw(ctx, o) {
        const s = this.size;
        ctx.strokeStyle = o.rim;
        ctx.fillStyle = o.body;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-s * 0.42, -s * 0.02);
        ctx.lineTo(s * 0.42, -s * 0.28);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-s * 0.1, -s * 0.12);
        ctx.lineTo(-s * 0.04, -s * 0.5);
        ctx.moveTo(s * 0.08, -s * 0.18);
        ctx.lineTo(s * 0.22, -s * 0.48);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-s * 0.04, -s * 0.5);
        ctx.lineTo(s * 0.2, -s * 0.38);
        ctx.lineTo(s * 0.03, -s * 0.3);
        ctx.closePath();
        ctx.fill();
        rim(ctx, o, 1);
      },
    },
    {
      id: "shipwreck_hulk", name: "Sunken Hulk", price: 38, size: 260,
      x: 0.31, scale: 0.86, kind: "wreck", limit: 1,
      desc: "A quiet shipwreck silhouette for the back wall.",
      draw(ctx, o) {
        const s = this.size;
        ctx.fillStyle = o.body;
        ctx.strokeStyle = o.rim;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-s * 0.48, -s * 0.03);
        ctx.lineTo(-s * 0.16, -s * 0.12);
        ctx.lineTo(s * 0.42, -s * 0.08);
        ctx.lineTo(s * 0.24, s * 0.14);
        ctx.lineTo(-s * 0.34, s * 0.13);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.rect(-s * 0.24 + i * s * 0.13, -s * 0.035, s * 0.055, s * 0.045);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(-s * 0.08, -s * 0.11);
        ctx.lineTo(-s * 0.04, -s * 0.52);
        ctx.lineTo(s * 0.18, -s * 0.16);
        ctx.lineTo(-s * 0.04, -s * 0.22);
        ctx.stroke();
      },
    },
    {
      id: "split_bow", name: "Split Bow", price: 44, size: 230,
      x: 0.84, scale: 0.78, kind: "wreck", limit: 1,
      desc: "The prow of something grand, now claimed by pressure.",
      draw(ctx, o) {
        const s = this.size;
        ctx.fillStyle = o.body;
        ctx.strokeStyle = o.rim;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, s * 0.08);
        ctx.lineTo(s * 0.38, -s * 0.28);
        ctx.lineTo(s * 0.22, s * 0.18);
        ctx.lineTo(-s * 0.32, s * 0.16);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s * 0.1, -s * 0.18);
        ctx.lineTo(s * 0.0, s * 0.14);
        ctx.moveTo(s * 0.24, -s * 0.16);
        ctx.lineTo(s * 0.12, s * 0.15);
        ctx.moveTo(-s * 0.08, s * 0.02);
        ctx.lineTo(s * 0.18, -s * 0.05);
        ctx.stroke();
      },
    },
  ];

  const byId = {};
  SPECIES.forEach((sp) => { byId[sp.id] = sp; });
  const decorById = {};
  DECOR.forEach((item) => { decorById[item.id] = item; });

  return { SPECIES, DECOR, byId, decorById };
})();
