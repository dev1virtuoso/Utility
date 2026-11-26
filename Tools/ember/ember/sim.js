/* ============================================================
   EMBER · simulation core
   Stable-fluids air field + cellular fire / water / materials
   ============================================================ */
'use strict';

const W = 240;
const H = 135;
const N = W * H;
const AMBIENT = 20;
const GROUND_Y = 106;

const AIR = 0, WOOD = 1, LEAF = 2, STONE = 3, WATER = 4, OIL = 5,
      ASH = 6, CHAR = 7, GRASS = 8, SOIL = 9, CONCRETE = 10, GLASS = 11, METAL = 12, LAMP = 13;

/* per-material behaviour */
const MAT = [];
MAT[AIR]   = { fuel: 0,   ign: 1e9, burn: 0,    heat: 0,   cond: 0.42, cool: 0.10, solid: 0 };
MAT[WOOD]  = { fuel: 1.0, ign: 245, burn: 0.20, heat: 760, cond: 0.075, cool: 0.16, solid: 1 };
MAT[LEAF]  = { fuel: 0.55, ign: 170, burn: 0.42, heat: 560, cond: 0.16, cool: 0.22, solid: 1 };
MAT[STONE] = { fuel: 0,   ign: 1e9, burn: 0,    heat: 0,   cond: 0.07, cool: 0.06, solid: 1 };
MAT[WATER] = { fuel: 0,   ign: 1e9, burn: 0,    heat: 0,   cond: 0.55, cool: 0.10, solid: 0 };
MAT[OIL]   = { fuel: 2.4, ign: 105, burn: 0.34, heat: 1020, cond: 0.11, cool: 0.25, solid: 1 };
MAT[ASH]   = { fuel: 0,   ign: 1e9, burn: 0,    heat: 0,   cond: 0.10, cool: 0.12, solid: 1 };
MAT[CHAR]  = { fuel: 0,   ign: 1e9, burn: 0,    heat: 0,   cond: 0.13, cool: 0.14, solid: 1 };
MAT[GRASS] = { fuel: 0.32, ign: 125, burn: 0.62, heat: 400, cond: 0.30, cool: 0.30, solid: 1 };
MAT[SOIL]  = { fuel: 0,   ign: 1e9, burn: 0,    heat: 0,   cond: 0.08, cool: 0.07, solid: 1 };
MAT[CONCRETE] = { fuel: 0, ign: 1e9, burn: 0, heat: 0, cond: 0.07, cool: 0.05, solid: 1 };
MAT[GLASS]    = { fuel: 0, ign: 1e9, burn: 0, heat: 0, cond: 0.32, cool: 0.08, solid: 1 };
MAT[METAL]    = { fuel: 0, ign: 1e9, burn: 0, heat: 0, cond: 0.55, cool: 0.06, solid: 1 };
MAT[LAMP]     = { fuel: 0, ign: 1e9, burn: 0, heat: 0, cond: 0.10, cool: 0.05, solid: 1 };

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function hash2(x, y) {
  let n = (x | 0) * 374761393 + (y | 0) * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

class Simulation {
  constructor() {
    const n = N;
    this.n = n;
    this.mat = new Uint8Array(n);
    this.solid = new Uint8Array(n);
    this.fuel = new Float32Array(n);
    this.temp = new Float32Array(n);
    this.smoke = new Float32Array(n);
    this.flame = new Float32Array(n);
    this.wet = new Float32Array(n);
    this.burn = new Float32Array(n);
    this.boom = new Uint8Array(n);
    this.moved = new Uint8Array(n);
    this.noise = new Float32Array(n);
    for (let i = 0; i < n; i++) this.noise[i] = hash2(i % W, (i / W) | 0);

    this.u = new Float32Array(n);
    this.v = new Float32Array(n);
    this.u2 = new Float32Array(n);
    this.v2 = new Float32Array(n);
    this.p = new Float32Array(n);
    this.div = new Float32Array(n);
    this.curl = new Float32Array(n);
    this.tmp = new Float32Array(n);
    this.tmp2 = new Float32Array(n);

    this.embers = [];
    this.trees = [];
    this.cabins = [];
    this.buildings = [];
    this.ignoredFire = new Set();
    this.steamVents = [];
    this.fireSources = new Set();
    this.onSmother = null;
    this.missionTrees = null;
    this.missionCabins = null;
    this.missionBuildings = null;
    this.treeSeq = 0;

    this.wind = { x: 0.2 };
    this.windTarget = 0.2;
    this.windTimeline = null;
    this.windTime = 0;
    this.firePower = 1;
    this.rainTimer = 0;
    this.time = 0;
    this.fireCount = 0;
    this.burningTotal = 0;
    this.extinguished = 0;
    this.shake = 0;
    this.onExtinguish = null;
    this.onExplode = null;

    this.clear();
  }

  clear() {
    this.mat.fill(AIR);
    this.solid.fill(0);
    this.fuel.fill(0);
    this.temp.fill(AMBIENT);
    this.smoke.fill(0);
    this.flame.fill(0);
    this.wet.fill(0);
    this.burn.fill(0);
    this.boom.fill(0);
    this.moved.fill(0);
    this.u.fill(0);
    this.v.fill(0);
    this.u2.fill(0);
    this.v2.fill(0);
    this.p.fill(0);
    this.div.fill(0);
    this.curl.fill(0);
    this.embers.length = 0;
    this.trees.length = 0;
    this.cabins.length = 0;
    this.buildings.length = 0;
    this.ignoredFire.clear();
    this.steamVents.length = 0;
    this.fireSources.clear();
    this.missionTrees = null;
    this.missionCabins = null;
    this.missionBuildings = null;
    this.treeSeq = 0;
    this.wind.x = 0.2;
    this.windTarget = 0.2;
    this.windTimeline = null;
    this.windTime = 0;
    this.rainTimer = 0;
    this.time = 0;
    this.fireCount = 0;
    this.extinguished = 0;
    this.shake = 0;
  }

  inside(x, y) { return x >= 0 && y >= 0 && x < W && y < H; }
  idx(x, y) { return (y | 0) * W + (x | 0); }

  setMat(i, m) {
    this.mat[i] = m;
    const pr = MAT[m];
    this.solid[i] = pr.solid;
    this.fuel[i] = pr.fuel;
    this.burn[i] = 0;
    this.boom[i] = 0;
    if (m === AIR) { this.wet[i] = 0; this.smoke[i] = Math.max(this.smoke[i], 0.05); }
    if (m === WATER) { this.wet[i] = 0; this.temp[i] = Math.min(this.temp[i], 30); }
    if (pr.solid) { this.u[i] = 0; this.v[i] = 0; }
  }

  /* ---------------------------------------------------- scene pieces */
  addGround(top = GROUND_Y) {
    for (let x = 0; x < W; x++) {
      const wobble = Math.round(Math.sin(x * 0.11) * 1.2 + Math.sin(x * 0.037 + 2) * 1.1);
      const gy = top + wobble;
      for (let y = gy; y < H; y++) {
        const i = y * W + x;
        this.setMat(i, SOIL);
        this.temp[i] = AMBIENT;
      }
      if (hash2(x, 7) > 0.72) {
        const i = (gy - 1) * W + x;
        if (this.mat[i] === AIR) this.setMat(i, GRASS);
      }
    }
  }

  addGrassLine(top = GROUND_Y, from = 6, to = W - 6) {
    for (let x = from; x < to; x++) {
      const base = top - 1;
      const tall = hash2(x, 3) > 0.72 ? 1 : 0;
      for (let k = 0; k <= 2 + tall; k++) {
        const i = (base - k) * W + x;
        if (this.mat[i] === AIR || this.mat[i] === GRASS) this.setMat(i, GRASS);
      }
    }
  }

  addPine(cx, baseY, height) {
    cx = Math.round(cx);
    const tree = { id: ++this.treeSeq, leafCells: [], leafTotal: 1 };
    const trunkTop = baseY - Math.round(height * 0.3);
    for (let y = trunkTop; y <= baseY; y++) {
      for (let dx = -1; dx <= 1; dx++) {
        const i = this.idx(cx + dx, y);
        if (this.inside(cx + dx, y) && (this.mat[i] === AIR || this.mat[i] === WATER || this.mat[i] === GRASS)) {
          this.setMat(i, WOOD);
        }
      }
    }
    const top = baseY - height;
    const bottom = baseY - 2;
    for (let y = top; y <= bottom; y++) {
      const p = (y - top) / Math.max(1, bottom - top);
      let half = Math.round(1 + Math.pow(p, 0.8) * height * 0.23);
      for (let dx = -half; dx <= half; dx++) {
        const edge = Math.abs(dx) === half;
        if (edge && hash2(cx + dx, y) < 0.45) continue;
        const x = cx + dx;
        if (!this.inside(x, y)) continue;
        const i = y * W + x;
        if (this.mat[i] === AIR || this.mat[i] === WATER) {
          this.setMat(i, LEAF);
          tree.leafCells.push(i);
        }
      }
    }
    tree.leafTotal = Math.max(1, tree.leafCells.length);
    tree.x = cx; tree.y = baseY - height * 0.5;
    this.trees.push(tree);
    return tree;
  }

  addCabin(cx, baseY, w = 40, h = 20) {
    const left = Math.round(cx - w / 2);
    const right = left + w;
    const bodyTop = baseY - h;
    const cells = new Set();
    const put = (x, y, m) => {
      if (!this.inside(x, y)) return;
      const i = y * W + x;
      this.setMat(i, m);
      if (m === WOOD || m === STONE) cells.add(i);
      else cells.delete(i);
    };
    // foundation
    for (let x = left - 1; x <= right + 1; x++)
      for (let y = baseY - 2; y <= baseY; y++) put(x, y, STONE);
    // walls (solid timber body)
    for (let y = bodyTop; y < baseY - 2; y++) {
      for (let x = left; x <= right; x++) put(x, y, WOOD);
    }
    // roof (pitched)
    const roofH = Math.round(h * 0.32);
    for (let k = 0; k < roofH; k++) {
      const y = bodyTop - k;
      const inset = Math.round((k / roofH) * (w * 0.5 - 2));
      for (let x = left - 2 + inset; x <= right + 2 - inset; x++) put(x, y, WOOD);
    }
    // chimney
    const chx = right - 6;
    for (let y = bodyTop - roofH - 2; y < bodyTop + 2; y++)
      for (let x = chx; x < chx + 3; x++) put(x, y, STONE);
    // door
    for (let y = baseY - 10; y <= baseY - 3; y++)
      for (let x = cx - 2; x <= cx + 2; x++) put(x, y, AIR);
    // windows
    for (let y = bodyTop + 4; y < bodyTop + 8; y++)
      for (let x = left + 4; x < left + 8; x++) put(x, y, AIR);
    for (let y = bodyTop + 4; y < bodyTop + 8; y++)
      for (let x = right - 8; x < right - 4; x++) put(x, y, AIR);

    const cabin = { cells: [...cells], total: Math.max(1, cells.size), x: cx, y: baseY, w, h };
    this.cabins.push(cabin);
    return cabin;
  }

  addCampfire(cx, baseY) {
    cx = Math.round(cx);
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      const i = this.idx(cx + Math.cos(a) * 7, baseY - 1 + Math.sin(a) * 2.2);
      if (this.mat[i] !== AIR) continue;
      this.setMat(i, STONE);
    }
    for (let k = 0; k < 4; k++) {
      const y = baseY - 2 - k;
      const spread = k === 0 ? 6 : k === 1 ? 5 : 3;
      for (let x = cx - spread; x <= cx + spread; x++) {
        const i = this.idx(x, y);
        if (!this.inside(x, y)) continue;
        this.setMat(i, WOOD);
        this.fuel[i] = 6;
        this.temp[i] = 760 - k * 90;
        this.burn[i] = 1;
        this.wet[i] = 0;
      }
    }
    this.temp[this.idx(cx, baseY - 4)] = 520;
    this.flame[this.idx(cx, baseY - 5)] = 0.7;
    this.smoke[this.idx(cx, baseY - 6)] = 0.5;
  }

  addOilDrum(cx, baseY) {
    cx = Math.round(cx);
    for (let y = baseY - 7; y <= baseY - 1; y++) {
      for (let x = cx - 3; x <= cx + 3; x++) {
        if (!this.inside(x, y)) continue;
        const edge = Math.abs(x - cx) === 3 || y === baseY - 7 || y === baseY - 1;
        if (edge && hash2(x, y) < 0.25) continue;
        this.setMat(y * W + x, OIL);
      }
    }
  }

  igniteArea(cx, cy, r, strength = 1) {
    cx = Math.round(cx); cy = Math.round(cy);
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (!this.inside(x, y)) continue;
        const d = Math.hypot(x - cx, y - cy);
        if (d > r) continue;
        const i = y * W + x;
        const m = this.mat[i];
        if (MAT[m].fuel > 0) {
          this.wet[i] = 0;
          this.temp[i] = Math.max(this.temp[i], MAT[m].ign + 120);
          this.burn[i] = Math.max(this.burn[i], 0.25 + 0.5 * (1 - d / r) * strength);
          if (m === OIL && !this.boom[i]) {
            this.boom[i] = 1;
            this.explode(x, y);
          }
        } else if (m === AIR) {
          this.temp[i] = Math.max(this.temp[i], 550 * (1 - d / (r + 1)) * strength + 120);
          this.flame[i] = Math.min(1.4, this.flame[i] + 0.5);
        }
      }
    }
    this.temp[this.idx(cx, cy)] = 900;
  }

  explode(cx, cy) {
    if (this.time - (this.lastExplode || -99) < 0.14) return;
    this.lastExplode = this.time;
    const R = 17;
    for (let y = Math.max(1, cy - R); y <= Math.min(H - 2, cy + R); y++) {
      for (let x = Math.max(1, cx - R); x <= Math.min(W - 2, cx + R); x++) {
        const dx = x - cx, dy = y - cy;
        const d = Math.hypot(dx, dy);
        if (d > R || d < 0.001) continue;
        const i = y * W + x;
        const f = (1 - d / R) ** 2;
        if (this.solid[i]) {
          if (MAT[this.mat[i]].fuel > 0 && this.wet[i] < 0.5) {
            this.temp[i] = Math.max(this.temp[i], 500);
            this.burn[i] = Math.max(this.burn[i], 0.35);
            if (this.mat[i] === OIL) this.boom[i] = 1;
          }
          continue;
        }
        this.u[i] += (dx / d) * 260 * f;
        this.v[i] += (dy / d) * 260 * f;
        this.temp[i] = Math.max(this.temp[i], 900 * f + AMBIENT);
        this.flame[i] = Math.min(1.6, this.flame[i] + 1.2 * f);
        this.smoke[i] = Math.min(1.6, this.smoke[i] + 0.9 * f);
      }
    }
    for (let k = 0; k < 34; k++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 14 + Math.random() * 44;
      this.embers.push({
        x: cx, y: cy,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 12,
        life: 1.1 + Math.random() * 1.8, max: 3,
      });
    }
    if (this.embers.length > 460) this.embers.splice(0, this.embers.length - 460);
    this.shake = Math.min(1.4, this.shake + 1);
    if (this.onExplode) this.onExplode(cx, cy);
  }

  /* ---------------------------------------------------------- paint */
  paint(cx, cy, radius, tool, opts = {}) {
    cx = Math.round(cx); cy = Math.round(cy);
    const r2 = radius * radius;
    let painted = 0;
    const minY = Math.max(1, cy - radius), maxY = Math.min(H - 2, cy + radius);
    const minX = Math.max(1, cx - radius), maxX = Math.min(W - 2, cx + radius);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy > r2) continue;
        const i = y * W + x;
        switch (tool) {
          case 'wood':
            if (opts.smother && (this.fireSources.has(i) || this.burn[i] > 0.02)) {
              const wasSource = this.fireSources.has(i);
              this.setMat(i, WOOD);
              this.wet[i] = 1;
              this.temp[i] = 24;
              this.burn[i] = 0;
              this.flame[i] = 0;
              this.fireSources.delete(i);
              if (this.onSmother) this.onSmother(x, y, wasSource);
              painted++;
              break;
            }
            if (opts.smother && this.mat[i] !== AIR) break;
            this.setMat(i, WOOD); this.wet[i] = 0;
            break;
          case 'stone':
            this.setMat(i, STONE);
            break;
          case 'oil':
            this.setMat(i, OIL);
            break;
          case 'water': {
            if (this.mat[i] === AIR) {
              if (opts.budget != null && painted >= opts.budget) break;
              this.setMat(i, WATER);
              this.temp[i] = 22;
              painted++;
            } else if (this.solid[i]) {
              this.wet[i] = Math.min(1, this.wet[i] + 0.75);
              if (this.burn[i] > 0.02) {
                this.extinguishCell(i, x, y);
              }
              this.temp[i] = Math.max(20, this.temp[i] - 60);
            }
            break;
          }
          case 'fire': {
            const m = this.mat[i];
            if (MAT[m].fuel > 0) {
              this.wet[i] = 0;
              this.temp[i] = Math.max(this.temp[i], 640);
              this.burn[i] = Math.max(this.burn[i], 0.6);
              if (m === OIL && !this.boom[i]) { this.boom[i] = 1; this.explode(x, y); }
            } else if (m === AIR) {
              this.temp[i] = Math.max(this.temp[i], 520);
              this.flame[i] = Math.min(1.4, this.flame[i] + 0.4);
              this.smoke[i] = Math.min(1.2, this.smoke[i] + 0.08);
            }
            break;
          }
          case 'wind': {
            if (!this.solid[i]) {
              this.u[i] += (opts.dx || 0) * 110;
              this.v[i] += (opts.dy || 0) * 110;
            }
            break;
          }
          case 'erase':
            this.setMat(i, AIR);
            this.burn[i] = 0;
            this.temp[i] = AMBIENT;
            break;
          default:
            break;
        }
      }
    }
    return painted;
  }

  /* -------------------------------------------------------- physics */
  stepWind(dt) {
    this.windTime += dt;
    if (this.windTimeline) {
      this.windTarget = this.windTimeline(this.windTime);
    }
    const w = this.wind;
    w.x += (this.windTarget - w.x) * Math.min(1, dt * 2.2);
    w.x += (Math.sin(this.windTime * 2.1) * 0.012 + Math.sin(this.windTime * 0.63 + 1.1) * 0.02) * dt * 6;
    w.x = clamp(w.x, -1.4, 1.4);
  }

  applyForces(dt) {
    const { u, v, temp, flame, solid, n } = this;
    const wx = this.wind.x;
    const power = this.firePower;
    for (let y = 1; y < H - 1; y++) {
      const row = y * W;
      for (let x = 1; x < W - 1; x++) {
        const i = row + x;
        if (solid[i]) continue;
        const t = temp[i];
        const buoy = Math.max(0, t - 50) * 0.085 + flame[i] * 52;
        u[i] += (wx * 62 + Math.sin(y * 0.23 + this.windTime * 0.7) * 3.5) * dt;
        v[i] -= buoy * dt * power;
        u[i] *= 1 - 0.9 * dt;
        v[i] *= 1 - 0.9 * dt;
        const sp = Math.abs(u[i]) + Math.abs(v[i]);
        if (sp > 150) { u[i] *= 150 / sp; v[i] *= 150 / sp; }
      }
    }
  }

  advectVel(dt) {
    const { u, v, u2, v2, solid } = this;
    u2.fill(0); v2.fill(0);
    for (let y = 1; y < H - 1; y++) {
      const row = y * W;
      for (let x = 1; x < W - 1; x++) {
        const i = row + x;
        if (solid[i]) continue;
        const sx = clamp(x - u[i] * dt, 0.6, W - 1.6);
        const sy = clamp(y - v[i] * dt, 0.6, H - 1.6);
        const x0 = sx | 0, y0 = sy | 0;
        const fx = sx - x0, fy = sy - y0;
        const j = y0 * W + x0;
        // don't let zero-velocity solid cells drag the flow down at boundaries
        let w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy),
            w01 = (1 - fx) * fy, w11 = fx * fy;
        if (solid[j]) w00 = 0;
        if (solid[j + 1]) w10 = 0;
        if (solid[j + W]) w01 = 0;
        if (solid[j + W + 1]) w11 = 0;
        const tw = w00 + w10 + w01 + w11;
        if (tw > 1e-4) {
          u2[i] = (u[j] * w00 + u[j + 1] * w10 + u[j + W] * w01 + u[j + W + 1] * w11) / tw;
          v2[i] = (v[j] * w00 + v[j + 1] * w10 + v[j + W] * w01 + v[j + W + 1] * w11) / tw;
        } else {
          u2[i] = u[i]; v2[i] = v[i];
        }
      }
    }
    u.set(u2); v.set(v2);
  }

  project(iters) {
    const { u, v, p, div, solid } = this;
    p.fill(0);
    for (let y = 1; y < H - 1; y++) {
      const row = y * W;
      for (let x = 1; x < W - 1; x++) {
        const i = row + x;
        if (solid[i]) { div[i] = 0; continue; }
        div[i] = -0.5 * (
          (solid[i + 1] ? 0 : u[i + 1]) - (solid[i - 1] ? 0 : u[i - 1]) +
          (solid[i + W] ? 0 : v[i + W]) - (solid[i - W] ? 0 : v[i - W])
        );
      }
    }
    for (let k = 0; k < iters; k++) {
      for (let y = 1; y < H - 1; y++) {
        const row = y * W;
        for (let x = 1; x < W - 1; x++) {
          const i = row + x;
          if (solid[i]) continue;
          const pl = solid[i - 1] ? p[i] : p[i - 1];
          const pr = solid[i + 1] ? p[i] : p[i + 1];
          const pu = solid[i - W] ? p[i] : p[i - W];
          const pd = solid[i + W] ? p[i] : p[i + W];
          p[i] = (div[i] + pl + pr + pu + pd) * 0.25;
        }
      }
    }
    for (let y = 1; y < H - 1; y++) {
      const row = y * W;
      for (let x = 1; x < W - 1; x++) {
        const i = row + x;
        if (solid[i]) continue;
        const pl = solid[i - 1] ? p[i] : p[i - 1];
        const pr = solid[i + 1] ? p[i] : p[i + 1];
        const pu = solid[i - W] ? p[i] : p[i - W];
        const pd = solid[i + W] ? p[i] : p[i + W];
        u[i] -= 0.5 * (pr - pl);
        v[i] -= 0.5 * (pd - pu);
      }
    }
  }

  vorticity(dt) {
    const { u, v, curl, solid } = this;
    const eps = 6.5;
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (solid[i]) { curl[i] = 0; continue; }
        curl[i] = 0.5 * ((v[i + 1] - v[i - 1]) - (u[i + W] - u[i - W]));
      }
    }
    for (let y = 2; y < H - 2; y++) {
      for (let x = 2; x < W - 2; x++) {
        const i = y * W + x;
        if (solid[i]) continue;
        const gx = Math.abs(curl[i + 1]) - Math.abs(curl[i - 1]);
        const gy = Math.abs(curl[i + W]) - Math.abs(curl[i - W]);
        const len = Math.hypot(gx, gy) + 0.0001;
        const nx = gx / len, ny = gy / len;
        u[i] += eps * (ny * curl[i]) * dt;
        v[i] -= eps * (nx * curl[i]) * dt;
      }
    }
  }

  advectScalars(dt) {
    const { u, v, solid } = this;
    const advect = (field) => {
      const src = this.tmp;
      src.set(field);
      for (let y = 1; y < H - 1; y++) {
        const row = y * W;
        for (let x = 1; x < W - 1; x++) {
          const i = row + x;
          const sx = clamp(x - u[i] * dt, 0.5, W - 1.5);
          const sy = clamp(y - v[i] * dt, 0.5, H - 1.5);
          const x0 = sx | 0, y0 = sy | 0;
          const fx = sx - x0, fy = sy - y0;
          const j = y0 * W + x0;
          field[i] =
            src[j] * (1 - fx) * (1 - fy) +
            src[j + 1] * fx * (1 - fy) +
            src[j + W] * (1 - fx) * fy +
            src[j + W + 1] * fx * fy;
        }
      }
      // solids keep their own temperature, smoke never enters walls
      for (let i = 0; i < N; i++) {
        if (solid[i]) field[i] = src[i];
        else if (field[i] < 0.001) field[i] = 0;
      }
    };
    advect(this.temp);
    advect(this.smoke);
    advect(this.flame);
    void solid;
  }

  diffuse(dt) {
    const { temp, smoke, mat, solid } = this;
    // temperature conduction
    const src = this.tmp;
    src.set(temp);
    const k = Math.min(0.12, dt * 1.7);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        const m = mat[i];
        const cond = MAT[m].cond;
        const pl = src[i - 1];
        const pr = src[i + 1];
        const pu = src[i - W];
        const pd = src[i + W];
        const avg = (pl + pr + pu + pd) * 0.25;
        const cool = MAT[m].cool;
        temp[i] += (avg - src[i]) * cond * k;
        temp[i] -= (temp[i] - AMBIENT) * cool * dt * (temp[i] > AMBIENT ? 1 : 0.25);
        if (temp[i] < AMBIENT) temp[i] = AMBIENT;
      }
    }
    // smoke diffusion + decay
    const ss = this.tmp2;
    ss.set(smoke);
    const ks = Math.min(0.2, dt * 9);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (solid[i]) { smoke[i] = 0; continue; }
        const avg = (ss[i - 1] + ss[i + 1] + ss[i - W] + ss[i + W]) * 0.25;
        smoke[i] += (avg - ss[i]) * 0.45 * ks;
        smoke[i] *= 1 - dt * 0.055;
        if (smoke[i] < 0.002) smoke[i] = 0;
      }
    }
    // flame is short lived
    for (let i = 0; i < N; i++) {
      if (this.flame[i] > 0) {
        this.flame[i] *= 1 - dt * 1.25;
        if (this.flame[i] < 0.004) this.flame[i] = 0;
      }
    }
  }

  combust(dt) {
    const { mat, temp, smoke, flame, burn, fuel, wet, solid } = this;
    let fire = 0;
    for (let y = 1; y < H - 1; y++) {
      const row = y * W;
      for (let x = 1; x < W - 1; x++) {
        const i = row + x;
        const m = mat[i];
        if (m === GLASS) {
          if (temp[i] > 145) {
            this.setMat(i, AIR);
            this.smoke[i] = Math.min(1.6, this.smoke[i] + 0.28);
            this.flame[i] = Math.max(this.flame[i], 0.22);
          }
          continue;
        }
        if (m === AIR || m === WATER || m === STONE || m === SOIL || m === ASH || m === CHAR ||
            m === CONCRETE || m === METAL || m === LAMP) continue;
        const pr = MAT[m];
        if (wet[i] > 0) {
          wet[i] -= dt * (0.04 + Math.max(0, temp[i] - 90) * 0.0016);
          if (wet[i] < 0) wet[i] = 0;
        }
        if (fuel[i] <= 0) continue;
        if (temp[i] > pr.ign && wet[i] < 0.24) {
          burn[i] = Math.min(1, burn[i] + dt * 2.3);
        } else {
          burn[i] = Math.max(0, burn[i] - dt * 0.7);
        }
        if (burn[i] <= 0.015) continue;
        if (!this.ignoredFire.has(i)) fire++;
        const rate = pr.burn * burn[i] * this.firePower;
        fuel[i] -= rate * dt;
        if (fuel[i] < 0) fuel[i] = 0;
        const target = 430 + 520 * burn[i];
        if (temp[i] < target) temp[i] += (target - temp[i]) * Math.min(1, dt * 5);
        temp[i] = Math.min(1400, temp[i] + pr.heat * rate * dt * 0.28);
        smoke[i] = Math.min(1.6, smoke[i] + rate * dt * 1.35);

        // flame plume above the fuel
        const up = i - W;
        const flick = 0.75 + 0.25 * Math.sin(this.time * 7.3 + x * 0.8);
        if (mat[up] === AIR) {
          flame[up] = Math.min(2.1, flame[up] + rate * dt * 11);
          temp[up] = Math.min(1300, temp[up] + rate * dt * 3200);
          smoke[up] = Math.min(1.8, smoke[up] + rate * dt * 4.2);
          this.v[up] = Math.min(this.v[up], (-15 - 30 * burn[i]) * flick);
          this.u[up] += Math.sin(this.time * 3.1 + y * 0.7) * 26 * dt;
        }
        // burn the exposed flanks too — gives the fire a wide, rolling body
        for (let sdir = -1; sdir <= 1; sdir += 2) {
          const side = i + sdir;
          if (mat[side] === AIR) {
            flame[side] = Math.min(1.1, flame[side] + rate * dt * 2.4);
            temp[side] = Math.min(900, temp[side] + rate * dt * 700);
            this.v[side] = Math.min(this.v[side], -8 - 14 * burn[i]);
          }
        }
        const up2 = i - W * 2;
        if (mat[up2] === AIR) {
          flame[up2] = Math.min(1.8, flame[up2] + rate * dt * 5);
          temp[up2] = Math.min(1250, temp[up2] + rate * dt * 1400);
          smoke[up2] = Math.min(1.6, smoke[up2] + rate * dt * 0.9);
        }
        const up3 = i - W * 3;
        if (mat[up3] === AIR) {
          flame[up3] = Math.min(1.4, flame[up3] + rate * dt * 1.6);
          smoke[up3] = Math.min(1.6, smoke[up3] + rate * dt * 0.4);
        }

        // preheat neighbours so fire creeps through fuel
        if (burn[i] > 0.22) {
          for (let k = 0; k < 4; k++) {
            const n = k === 0 ? i - 1 : k === 1 ? i + 1 : k === 2 ? i - W : i + W;
            if (n < 0 || n >= N) continue;
            if (fuel[n] > 0 && wet[n] < 0.45) {
              temp[n] += (MAT[mat[n]].ign + 220 - temp[n]) * Math.min(0.6, dt * 1.7 * burn[i]);
              if (mat[n] === LEAF || mat[n] === GRASS) temp[n] += dt * 260 * burn[i];
            }
          }
        }

        if (m === OIL && burn[i] > 0.3 && !this.boom[i]) {
          this.boom[i] = 1;
          this.explode(x, y);
        }
        if (Math.random() < dt * 0.32 * burn[i] && this.embers.length < 380) {
          this.embers.push({
            x: x + (Math.random() - 0.5), y: y - 0.5,
            vx: (Math.random() - 0.5) * 10 + this.wind.x * 8,
            vy: -14 - Math.random() * 18,
            life: 1.4 + Math.random() * 2.2, max: 4,
          });
        }
        if (fuel[i] <= 0) {
          if (m === WOOD) { this.setMat(i, CHAR); this.temp[i] = Math.min(temp[i], 900); }
          else if (m === LEAF) { this.setMat(i, AIR); this.temp[i] = Math.min(temp[i], 400); }
          else if (m === OIL) { this.setMat(i, AIR); this.temp[i] = Math.min(temp[i], 500); }
          else if (m === GRASS) { this.setMat(i, ASH); this.temp[i] = Math.min(temp[i], 300); }
          void solid;
        }
      }
    }
    this.fireCount = fire;
    this.burningTotal = fire;
  }

  extinguishCell(i, x, y) {
    this.burn[i] = 0;
    this.flame[i] = 0;
    this.smoke[i] = Math.min(1.6, this.smoke[i] + 0.35);
    this.temp[i] = Math.max(20, this.temp[i] - 360);
    this.wet[i] = Math.min(1, this.wet[i] + 1);
    this.extinguished++;
    if (this.onExtinguish) this.onExtinguish(x, y);
  }

  waterStep(dt) {
    const { mat, temp, wet, burn, smoke, flame, solid } = this;
    this.moved.fill(0);
    for (let y = H - 2; y >= 1; y--) {
      const leftToRight = Math.random() < 0.5;
      for (let k = 1; k < W - 1; k++) {
        const x = leftToRight ? k : W - 1 - k;
        const i = y * W + x;
        if (mat[i] !== WATER) continue;
        // cool itself
        if (temp[i] > 30) temp[i] = Math.max(26, temp[i] - 420 * dt);
        // interact with nearby cells (water beats fire back)
        let killed = 0;
        for (let oy = -2; oy <= 2; oy++) {
          for (let ox = -2; ox <= 2; ox++) {
            if (!ox && !oy) continue;
            const nx = x + ox, ny = y + oy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            const n = ny * W + nx;
            if (burn[n] > 0.02) {
              this.extinguishCell(n, nx, ny);
              killed++;
              if (killed >= 2) break;
            } else if (solid[n] && MAT[mat[n]].fuel > 0 && wet[n] < 1) {
              wet[n] = Math.min(1, wet[n] + dt * 1.2);
            }
          }
          if (killed >= 2) break;
        }
        if (mat[i] !== WATER) continue;
        if (killed > 0 && Math.random() < 0.45) {
          this.setMat(i, AIR);
          temp[i] = 150;
          this.v[i] -= 18;
          smoke[i] = Math.min(1.6, smoke[i] + 0.4);
          continue;
        }
        if (temp[i] > 128) {
          this.setMat(i, AIR);
          temp[i] = 150;
          this.smoke[i] = Math.min(1.6, this.smoke[i] + 0.4);
          this.v[i] -= 30;
          this.u[i] += (Math.random() - 0.5) * 8;
          continue;
        }
        // fall / spread
        const below = i + W;
        if (y < H - 2 && mat[below] === AIR && !this.moved[below]) {
          this.moveWater(i, below);
          continue;
        }
        const dir = Math.random() < 0.5 ? 1 : -1;
        const dl = below + dir;
        if (y < H - 2 && mat[dl] === AIR && !this.moved[dl] && x + dir > 0 && x + dir < W - 1) {
          this.moveWater(i, dl);
          continue;
        }
        const dr = below - dir;
        if (y < H - 2 && mat[dr] === AIR && !this.moved[dr] && x - dir > 0 && x - dir < W - 1) {
          this.moveWater(i, dr);
          continue;
        }
        const s1 = i + dir;
        if (mat[s1] === AIR && !this.moved[s1] && x + dir > 0 && x + dir < W - 1 && Math.random() < 0.65) {
          this.moveWater(i, s1);
        }
      }
    }
  }

  moveWater(src, dst) {
    this.mat[dst] = WATER;
    this.mat[src] = AIR;
    this.solid[src] = 0;
    this.solid[dst] = 0;
    const t = this.temp[src];
    this.temp[src] = this.temp[dst];
    this.temp[dst] = t;
    this.moved[dst] = 1;
    this.fuel[src] = 0;
    this.fuel[dst] = 0;
    this.burn[src] = 0;
    this.burn[dst] = 0;
    this.wet[src] = 0;
    this.wet[dst] = 0;
  }

  rainStep(dt) {
    // a downpour douses fires across the whole map, not just where drops land
    const burning = [];
    for (let i = 0; i < N; i++) if (this.burn[i] > 0.02) burning.push(i);
    const douses = Math.min(burning.length, Math.round(dt * 110));
    for (let k = 0; k < douses; k++) {
      const i = burning[(Math.random() * burning.length) | 0];
      this.extinguishCell(i, i % W, (i / W) | 0);
      this.wet[i] = 1;
    }
    const drops = Math.round(dt * 300);
    for (let k = 0; k < drops; k++) {
      const x = 2 + ((Math.random() * (W - 4)) | 0);
      const y = 2 + ((Math.random() * H * 0.35) | 0);
      const i = y * W + x;
      if (this.mat[i] === AIR) {
        this.setMat(i, WATER);
        this.temp[i] = 12;
        this.v[i] -= 20;
      } else if (this.solid[i] && this.burn[i] > 0) {
        this.burn[i] = 0;
        this.wet[i] = 1;
        this.temp[i] = Math.max(20, this.temp[i] - 300);
        this.smoke[i] += 0.2;
        this.extinguished++;
        if (this.onExtinguish) this.onExtinguish(x, y + 3);
      } else if (this.solid[i]) {
        this.wet[i] = Math.min(1, this.wet[i] + 0.4);
      }
    }
  }

  emberStep(dt) {
    const list = this.embers;
    for (let k = list.length - 1; k >= 0; k--) {
      const e = list[k];
      e.life -= dt;
      if (e.life <= 0) { list.splice(k, 1); continue; }
      const i = clamp((e.y | 0), 1, H - 2) * W + clamp((e.x | 0), 1, W - 2);
      e.vx += (this.wind.x * 46 - e.vx * 0.6) * dt;
      e.vy += 34 * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.x < 1 || e.x > W - 2 || e.y < 1 || e.y > H - 2) { list.splice(k, 1); continue; }
      const ci = (e.y | 0) * W + (e.x | 0);
      if (this.mat[ci] === WATER) { list.splice(k, 1); continue; }
      if (this.solid[ci] && this.fuel[ci] > 0 && this.wet[ci] < 0.45) {
        this.temp[ci] = Math.max(this.temp[ci], MAT[this.mat[ci]].ign + 90);
        this.burn[ci] = Math.max(this.burn[ci], 0.22);
        list.splice(k, 1);
        continue;
      }
      void i;
    }
  }

  step(dt) {
    dt = Math.min(dt, 1 / 30);
    this.time += dt;
    this.stepWind(dt);
    this.applyForces(dt);
    this.advectVel(dt);
    this.project(14);
    this.vorticity(dt);
    this.advectScalars(dt);
    this.diffuse(dt);
    for (const v of this.steamVents) {
      for (let k = -1; k <= 1; k++) {
        const x = v.x + k, y = v.y;
        if (x < 1 || x > W - 2 || y < 1 || y > H - 2) continue;
        const i = y * W + x;
        if (this.mat[i] !== AIR) continue;
        this.smoke[i] = Math.min(1.8, this.smoke[i] + dt * 3.4);
        this.v[i] = Math.min(this.v[i], -18);
        this.temp[i] += dt * 40;
      }
    }
    for (const i of this.fireSources) {
      if (this.mat[i] !== AIR) { this.fireSources.delete(i); continue; }
      this.flame[i] = Math.min(2.2, this.flame[i] + dt * 12);
      this.temp[i] = Math.min(1300, this.temp[i] + dt * 900);
      this.smoke[i] = Math.min(1.8, this.smoke[i] + dt * 3);
      this.v[i] = Math.min(this.v[i], -6);
      if (Math.random() < dt * 5 && this.embers.length < 180) {
        this.embers.push({
          x: i % W, y: (i / W) | 0,
          vx: (Math.random() - 0.5) * 12 + this.wind.x * 10,
          vy: -10 - Math.random() * 16,
          life: 1.2 + Math.random() * 1.6, max: 3,
        });
      }
    }
    this.combust(dt);
    if (this.rainTimer > 0) {
      this.rainStep(dt);
      this.rainTimer -= dt;
    }
    this.waterStep(dt);
    this.emberStep(dt);
    this.shake *= 1 - dt * 3;
    if (this.shake < 0.002) this.shake = 0;
  }

  buildingStats() {
    const list = this.missionBuildings || this.buildings;
    if (!list.length) return { frac: 1, list: [] };
    let alive = 0, total = 0;
    for (const b of list) {
      total += b.total;
      for (const i of b.cells) {
        const m = this.mat[i];
        if (m === GLASS || m === WOOD) alive++;
      }
    }
    return { frac: total ? alive / total : 1, list };
  }

  treeStats() {
    const list = this.missionTrees || this.trees;
    if (!list.length) return { frac: 1, saved: 0, total: 0 };
    let sum = 0, saved = 0;
    for (const t of list) {
      let alive = 0;
      for (const i of t.leafCells) if (this.mat[i] === LEAF) alive++;
      const f = alive / t.leafTotal;
      sum += f;
      if (f >= 0.4) saved++;
    }
    return { frac: sum / list.length, saved, total: list.length };
  }

  cabinStats() {
    const list = this.missionCabins || this.cabins;
    if (!list.length) return { frac: 1, list: [] };
    let sum = 0;
    const out = [];
    for (const c of list) {
      let alive = 0;
      for (const i of c.cells) {
        const m = this.mat[i];
        if (m === WOOD || m === STONE) alive++;
      }
      const f = alive / c.total;
      sum += f;
      out.push(f);
    }
    return { frac: sum / list.length, list: out };
  }

  rain(seconds) { this.rainTimer = Math.max(this.rainTimer, seconds); }
}
