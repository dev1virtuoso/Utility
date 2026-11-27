/* ============================================================
   EMBER · renderer (3× supersampled material pass)
   ============================================================ */
'use strict';

const FIRE_LUT = (() => {
  const stops = [
    [0.0, 46, 8, 0],
    [0.12, 150, 28, 2],
    [0.28, 244, 82, 8],
    [0.45, 255, 128, 18],
    [0.62, 255, 170, 44],
    [0.78, 255, 199, 92],
    [0.9, 255, 231, 158],
    [1.0, 255, 250, 224],
  ];
  const out = new Uint8Array(128 * 3);
  for (let i = 0; i < 128; i++) {
    const t = i / 127;
    let a = stops[0], b = stops[stops.length - 1];
    for (let k = 0; k < stops.length - 1; k++) {
      if (t >= stops[k][0] && t <= stops[k + 1][0]) { a = stops[k]; b = stops[k + 1]; break; }
    }
    const f = (t - a[0]) / Math.max(0.0001, b[0] - a[0]);
    out[i * 3] = Math.round(lerp(a[1], b[1], f));
    out[i * 3 + 1] = Math.round(lerp(a[2], b[2], f));
    out[i * 3 + 2] = Math.round(lerp(a[3], b[3], f));
  }
  return out;
})();

const Renderer = {
  init(scale) {
    this.S = scale || 2;
    this.main = document.getElementById('mainCanvas');
    this.glow = document.getElementById('glowCanvas');
    this.mctx = this.main.getContext('2d', { alpha: false });
    this.gctx = this.glow.getContext('2d');
    this.glow.width = W;
    this.glow.height = H;
    this.gimg = this.gctx.createImageData(W, H);
    this.time = 0;
    this.alloc();
  },
  alloc() {
    this.rw = W * this.S;
    this.rh = H * this.S;
    this.main.width = this.rw;
    this.main.height = this.rh;
    this.img = this.mctx.createImageData(this.rw, this.rh);
    this.bg = new Uint8ClampedArray(this.rw * this.rh * 4);
    this.fine = new Float32Array(this.rw * this.rh);
    for (let i = 0; i < this.fine.length; i++) this.fine[i] = Math.random();
    this.buildBackground();
  },
  setScale(scale) {
    if (scale === this.S) return;
    this.S = scale;
    this.alloc();
  },

  buildBackground() {
    const S = this.S, rw = this.rw, rh = this.rh;
    const d = this.bg;
    const moonX = W * 0.76, moonY = H * 0.1;
    for (let py = 0; py < rh; py++) {
      const cy = py / S;
      for (let px = 0; px < rw; px++) {
        const cx = px / S;
        const p = (py * rw + px) * 4;
        const t = cy / H;
        let r = 5 + 4.5 * t;
        let g = 7 + 4.5 * t;
        let b = 12 + 7 * t;
        const dx = (cx - moonX) / 90, dy = (cy - moonY) / 55;
        const md = Math.sqrt(dx * dx + dy * dy);
        const moon = Math.max(0, 1 - md) ** 3;
        r += 22 * moon; g += 34 * moon; b += 58 * moon;
        const horizon = Math.max(0, 1 - Math.abs(cy - H * 0.9) / (H * 0.4));
        r += 12 * horizon * horizon;
        g += 7 * horizon * horizon;
        b += 5 * horizon * horizon;
        const n = hash2(px, py);
        if (cy < H * 0.72 && n > 0.9975) {
          const star = (n - 0.9975) / 0.0025;
          const s = 35 + star * 120;
          r += s; g += s * 0.95; b += s * 0.85;
        }
        // moon disc
        const mdx = cx - 196, mdy = cy - 18;
        const mr = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mr < 7) {
          const k = mr < 5 ? 1 : (7 - mr) / 2;
          r = lerp(r, 214, k * 0.85);
          g = lerp(g, 222, k * 0.85);
          b = lerp(b, 236, k * 0.85);
        }
        // distant ridges
        const r1 = 95 + Math.sin(cx * 0.047) * 4.5 + Math.sin(cx * 0.014 + 2.1) * 6.5;
        const r2 = 101 + Math.sin(cx * 0.031 + 1.2) * 2.5;
        if (cy >= r1) { r = 8; g = 10; b = 14; }
        if (cy >= r2) { r = 11; g = 13; b = 17; }
        if (Math.abs(cy - r1) < 0.35) { r += 12; g += 16; b += 22; }
        // distant pine silhouettes
        const pxc = (cx % 15) - 7.5;
        const dh = 6 + 9 * hash2(Math.floor(cx / 15), 4);
        const ptop = 104 - dh;
        if (cy >= ptop && cy < 106 && Math.abs(pxc) < (cy - ptop) * 0.5) {
          r = 15; g = 20; b = 27;
        }
        d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255;
      }
    }
  },

  draw(sim, dt) {
    this.time += dt;
    const time = this.time;
    const S = this.S, rw = this.rw;
    const data = this.img.data;
    data.set(this.bg);
    const gd = this.gimg.data;
    gd.fill(0);
    const { mat, temp, smoke, flame, burn, fuel, wet, noise } = sim;
    const lut = FIRE_LUT;
    const embers = sim.embers;
    const fine = this.fine;

    for (let y = 1; y < H - 1; y++) {
      const row = y * W;
      for (let x = 1; x < W - 1; x++) {
        const i = row + x;
        const m = mat[i];
        const nz = noise[i];
        let r = 0, g = 0, b = 0;
        if (m !== AIR) {
          switch (m) {
            case WOOD: {
              r = 111 + nz * 30;
              g = 77 + nz * 23;
              b = 51 + nz * 17;
              if (wet[i] > 0.2) { r *= 0.8; g *= 0.86; b *= 0.95; }
              const gone = 1 - Math.min(1, fuel[i]);
              r *= 1 - gone * 0.62;
              g *= 1 - gone * 0.68;
              b *= 1 - gone * 0.66;
              break;
            }
            case LEAF: {
              r = 52 + nz * 26;
              g = 101 + nz * 44;
              b = 58 + nz * 26;
              if (nz < 0.18) { r *= 0.72; g *= 0.78; b *= 0.72; }
              if (wet[i] > 0.2) { r *= 0.8; g *= 0.9; b *= 1.0; }
              break;
            }
            case GRASS: {
              r = 101 + nz * 38;
              g = 113 + nz * 40;
              b = 56 + nz * 22;
              break;
            }
            case STONE: {
              r = 86 + nz * 24;
              g = 93 + nz * 24;
              b = 103 + nz * 26;
              if (wet[i] > 0.2) { r *= 0.78; g *= 0.82; b *= 0.86; }
              break;
            }
            case SOIL: {
              r = 54 + nz * 18;
              g = 44 + nz * 14;
              b = 35 + nz * 11;
              break;
            }
            case WATER: {
              r = 26 + nz * 16;
              g = 78 + nz * 44;
              b = 126 + nz * 52;
              break;
            }
            case OIL: {
              r = 30 + nz * 10;
              g = 27 + nz * 8;
              b = 22 + nz * 6;
              if (nz > 0.8) { r += 26; g += 20; b += 6; }
              break;
            }
            case ASH: {
              r = 54 + nz * 16;
              g = 52 + nz * 14;
              b = 50 + nz * 13;
              break;
            }
            case CHAR: {
              r = 26 + nz * 8;
              g = 21 + nz * 6;
              b = 19 + nz * 5;
              if (temp[i] > 320) {
                const e = Math.min(1, (temp[i] - 320) / 600);
                r += e * 150; g += e * 44; b += e * 6;
              }
              break;
            }
            case CONCRETE: {
              r = 82 + nz * 18;
              g = 88 + nz * 18;
              b = 97 + nz * 20;
              if (wet[i] > 0.2) { r *= 0.8; g *= 0.84; b *= 0.9; }
              break;
            }
            case GLASS: {
              const lit = hash2(x * 7 + 3, y * 11 + 5) > 0.58;
              const hot = smoothstep(120, 320, temp[i]);
              if (lit) {
                const warm = 0.75 + nz * 0.25;
                r = 210 * warm + 20;
                g = 158 * warm + 14;
                b = 92 * warm + 18;
              } else {
                r = 28 + nz * 16;
                g = 48 + nz * 20;
                b = 64 + nz * 24;
              }
              if (hot > 0.02) {
                r = lerp(r, 255, hot * 0.45);
                g = lerp(g, 190, hot * 0.3);
                b = lerp(b, 90, hot * 0.15);
              }
              break;
            }
            case METAL: {
              r = 105 + nz * 18;
              g = 112 + nz * 18;
              b = 120 + nz * 18;
              if (wet[i] > 0.2) { r *= 0.8; g *= 0.84; b *= 0.9; }
              break;
            }
            case LAMP: {
              r = 255; g = 205; b = 132;
              break;
            }
            default: break;
          }
        }

        const sm = smoke[i];
        const warm = smoothstep(450, 950, temp[i]);
        let heat = (temp[i] - 150) / 900;
        const fl = flame[i] * 1.25;
        if (fl > heat) heat = fl;
        if (burn[i] > 0.02) {
          const bh = burn[i] * 0.62;
          if (bh > heat) heat = bh;
        }
        const hasHeat = heat > 0.018;
        if (hasHeat) heat = clamp(heat, 0, 1);

        /* glow buffer (cell resolution) */
        const gp = i * 4;
        if (m === GLASS && hash2(x * 7 + 3, y * 11 + 5) > 0.58) {
          gd[gp] = 255; gd[gp + 1] = 188; gd[gp + 2] = 110; gd[gp + 3] = 26;
        } else if (m === LAMP) {
          gd[gp] = 255; gd[gp + 1] = 194; gd[gp + 2] = 120; gd[gp + 3] = 190;
        }
        if (hasHeat) {
          const li = (heat * 127) | 0;
          gd[gp] = lut[li * 3];
          gd[gp + 1] = lut[li * 3 + 1];
          gd[gp + 2] = lut[li * 3 + 2];
          gd[gp + 3] = Math.min(255, heat * heat * 2.0 * 255);
        }

        /* material block with fine texture */
        const bx = x * S, by = y * S;
        const smA = sm > 0.012 ? Math.min(0.82, sm * 0.62) : 0;
        const sr = lerp(104, 168, warm), sg = lerp(111, 136, warm), sb = lerp(122, 112, warm);
        let fr = 0, fg = 0, fb = 0, add = 0;
        if (hasHeat) {
          const li = (heat * 127) | 0;
          fr = lut[li * 3]; fg = lut[li * 3 + 1]; fb = lut[li * 3 + 2];
          add = Math.min(1, Math.pow(heat, 1.2) * 2.1);
        }
        for (let dy = 0; dy < S; dy++) {
          const py = by + dy;
          const frow = py * rw;
          for (let dx = 0; dx < S; dx++) {
            const px = bx + dx;
            const p = (frow + px) * 4;
            const fn = fine[frow + px];
            let rr, gg, bb;
            if (m === AIR) {
              rr = data[p]; gg = data[p + 1]; bb = data[p + 2];
            } else {
              rr = r; gg = g; bb = b;
              const grain = (fn - 0.5) * 12;
              rr += grain; gg += grain; bb += grain;
              if (m === WOOD) {
                const g2 = Math.sin(px * 1.15 + py * 0.38 + nz * 8);
                rr *= 0.86 + g2 * 0.14;
                gg *= 0.86 + g2 * 0.14;
                bb *= 0.86 + g2 * 0.14;
                if ((px + py * 2) % 23 === 0) { rr *= 0.78; gg *= 0.78; bb *= 0.8; }
              } else if (m === LEAF) {
                const g2 = (fn - 0.5) * 34;
                rr += g2; gg += g2 * 0.9; bb += g2 * 0.7;
                if (fn > 0.9) { rr += 16; gg += 22; bb += 8; }
              } else if (m === SOIL) {
                rr += (fn - 0.5) * 22; gg += (fn - 0.5) * 16; bb += (fn - 0.5) * 12;
                if (fn > 0.985) { rr = 92; gg = 92; bb = 96; }
                if (y > 1 && mat[i - W] !== SOIL) {
                  if (hash2(px, 9) > 0.55) { rr = 52 + nz * 22; gg = 70 + nz * 30; bb = 38 + nz * 12; }
                  else { rr += 18; gg += 14; bb += 8; }
                }
              } else if (m === WATER) {
                const rip = Math.sin(px * 0.6 + py * 0.85 + time * 5.2 + nz * 5);
                const crest = Math.max(0, rip);
                rr += crest * 10; gg += crest * 26; bb += crest * 24;
                const above = y > 1 ? mat[i - W] : AIR;
                if (above !== WATER) { rr += 38; gg += 44; bb += 30; }
                if (fn > 0.986) { rr = 176; gg = 228; bb = 248; }
              } else if (m === CONCRETE) {
                if ((px + py * 3) % 31 === 0) { rr *= 0.8; gg *= 0.82; bb *= 0.84; }
                if (fn > 0.94) { rr += 18; gg += 18; bb += 18; }
              } else if (m === METAL) {
                if ((px * 5 + py * 3) % 47 < 2) { rr += 30; gg += 30; bb += 30; }
              } else if (m === GLASS) {
                const refl = Math.sin(px * 0.4 + py * 0.13 + 1.3);
                if (refl > 0.9) { rr += 26; gg += 32; bb += 34; }
              } else if (m === LAMP) {
                rr = 255; gg = 210; bb = 140;
              }
            }
            if (smA > 0) {
              rr = rr * (1 - smA) + sr * smA;
              gg = gg * (1 - smA) + sg * smA;
              bb = bb * (1 - smA) + sb * smA;
            }
            if (add > 0) {
              const flick = 0.8 + 0.2 * Math.sin(time * 4.6 + px * 0.4 + py * 0.55 + nz * 7);
              rr = Math.min(255, rr + fr * add * flick * 0.92);
              gg = Math.min(255, gg + fg * add * flick * 0.8);
              bb = Math.min(255, bb + fb * add * flick * 0.7);
            }
            data[p] = rr; data[p + 1] = gg; data[p + 2] = bb; data[p + 3] = 255;
          }
        }
      }
    }

    this.mctx.putImageData(this.img, 0, 0);
    this.gctx.putImageData(this.gimg, 0, 0);

    /* persistent rings around fire sources */
    if (sim.fireSources && sim.fireSources.size) {
      this.mctx.save();
      this.mctx.globalCompositeOperation = 'lighter';
      const pulse = 0.55 + 0.35 * Math.sin(time * 5.5);
      this.mctx.strokeStyle = `rgba(255, 148, 74, ${pulse.toFixed(2)})`;
      this.mctx.lineWidth = Math.max(1, S * 1.1);
      for (const si of sim.fireSources) {
        const sx = si % W, sy = (si / W) | 0;
        this.mctx.beginPath();
        this.mctx.arc((sx + 0.5) * S, (sy + 0.5) * S, 5.5 * S, 0, Math.PI * 2);
        this.mctx.stroke();
      }
      this.mctx.restore();
    }

    /* embers */
    if (embers.length) {
      this.mctx.globalCompositeOperation = 'lighter';
      this.mctx.fillStyle = 'rgba(255, 205, 130, 0.95)';
      for (let k = 0; k < embers.length; k++) {
        const e = embers[k];
        this.mctx.globalAlpha = Math.min(1, e.life * 1.4);
        this.mctx.fillRect((e.x * S) | 0, (e.y * S) | 0, 2, 2);
      }
      this.mctx.globalAlpha = 1;
      this.mctx.globalCompositeOperation = 'source-over';

      this.gctx.globalCompositeOperation = 'lighter';
      this.gctx.fillStyle = 'rgba(255, 172, 92, 0.9)';
      for (let k = 0; k < embers.length; k++) {
        const e = embers[k];
        this.gctx.globalAlpha = Math.min(1, e.life);
        this.gctx.fillRect(e.x | 0, e.y | 0, 1, 1);
      }
      this.gctx.globalAlpha = 1;
      this.gctx.globalCompositeOperation = 'source-over';
    }
  },
};
