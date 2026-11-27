/* ============================================================
   EMBER 3D · world, materials, fire, water, scenes
   Voxel grid 96 x 40 x 96, cell size 2.4 m, Y up.
   ============================================================ */
'use strict';

const SX = 96, SY = 40, SZ = 96, CS = 2.4;
const WORLD_W = SX * CS, WORLD_D = SZ * CS;

const MAT = {
  AIR: 0, GRASS: 1, DIRT: 2, WOOD: 3, LEAF: 4, STONE: 5,
  WATER: 6, OIL: 7, METAL: 8, GLASS: 9, CONCRETE: 10, CHAR: 11,
};
const MATS = [
  null,
  { name: 'grass', color: 0x4b7a3b, fuel: 6, ign: 95, burn: 0.09, struct: false },
  { name: 'dirt', color: 0x5b4a35, fuel: 0, ign: 999, burn: 0, struct: false },
  { name: 'wood', color: 0x8a5a32, fuel: 22, ign: 100, burn: 0.075, struct: true },
  { name: 'leaf', color: 0x3f7a45, fuel: 9, ign: 70, burn: 0.23, struct: false },
  { name: 'stone', color: 0x7c8794, fuel: 0, ign: 999, burn: 0, struct: true },
  { name: 'water', color: 0x2a6f9a, fuel: 0, ign: 999, burn: 0, struct: false },
  { name: 'oil', color: 0x24211e, fuel: 40, ign: 55, burn: 0.16, struct: false },
  { name: 'metal', color: 0x98a3ae, fuel: 0, ign: 999, burn: 0, struct: true },
  { name: 'glass', color: 0x6fa8c0, fuel: 0, ign: 999, burn: 0, struct: true },
  { name: 'concrete', color: 0x8b877e, fuel: 0, ign: 999, burn: 0, struct: true },
  { name: 'char', color: 0x2a2622, fuel: 0, ign: 999, burn: 0, struct: false },
];

const SCENES = {
  training: {
    id: 'training', num: '01', name: 'Training Yard', tag: 'BASICS', accent: '#e0a35c',
    desc: 'A fire station yard with four burning drums. Learn the hose, the tank and the breach tool before the real thing.',
    obj: 'Put out every training fire', time: 150, metric: null, icon: '▣',
    spawn: { x: 48, z: 64, yaw: 0 },
  },
  cabin: {
    id: 'cabin', num: '02', name: 'Forest Cabin', tag: 'FOREST', accent: '#8cc46f',
    desc: 'The original pine forest, a log cabin and a campfire that has just jumped into the canopy.',
    obj: 'Save the cabin and 60% of the pines', time: 180, metric: 'trees', min: 0.6, cabin: true, icon: '⌂',
    spawn: { x: 56, z: 58, yaw: -0.35 },
  },
  deep: {
    id: 'deep', num: '03', name: 'Deep Forest', tag: 'WILDFIRE', accent: '#5f9e5b',
    desc: 'No buildings, no roads — only pines. A crown fire with three heads and nothing to hide behind.',
    obj: 'Save 40% of the forest', time: 210, metric: 'trees', min: 0.4, icon: '♠',
    spawn: { x: 48, z: 66, yaw: 0 },
  },
  city: {
    id: 'city', num: '04', name: 'City Skyline', tag: 'CITY', accent: '#7fb7d8',
    desc: 'Four connected high-rises, glass skybridges, a shared podium mall, low-rises and a park. Glass shatters; timber bands carry fire up.',
    obj: 'Save 55% of the city blocks', time: 240, metric: 'city', min: 0.55, icon: '▥',
    spawn: { x: 40, z: 56, yaw: 0, pitch: 0.22 },
  },
  refinery: {
    id: 'refinery', num: '05', name: 'Refinery', tag: 'INDUSTRIAL', accent: '#e08b4f',
    desc: 'Three oil tanks, a steaming cooling tower, two distillation columns, a chimney, a live flare, pipe racks and the control room. Tanks chain-explode.',
    obj: 'Stop the tank fire before a BLEVE', time: 210, metric: null, tank: true, icon: '◉',
    spawn: { x: 30, z: 50, yaw: 0 },
  },
  reservoir: {
    id: 'reservoir', num: '06', name: 'Reservoir', tag: 'DAM', accent: '#4cc3ff',
    desc: 'A large dam, gatehouse, spillway, hydro station, dock and boat, and forest on the right. The breach tool can open the dam.',
    obj: 'Save the forest — or flood it', time: 210, metric: 'trees', min: 0.4, dam: true, icon: '≈',
    spawn: { x: 84, z: 20, yaw: 2.35 },
  },
};

const FIRESTORM = [
  { id: 'easy', name: 'Easy', total: 8, interval: 7.0, maxFire: 500, time: 150, power: 0.8, desc: '8 ignitions, a slow burn' },
  { id: 'medium', name: 'Medium', total: 14, interval: 5.0, maxFire: 700, time: 180, power: 1.0, desc: '14 ignitions, the fire starts chasing you' },
  { id: 'hard', name: 'Hard', total: 22, interval: 3.5, maxFire: 950, time: 210, power: 1.2, desc: '22 ignitions, the fire runs' },
  { id: 'hell', name: 'Hell', total: 32, interval: 2.4, maxFire: 1300, time: 240, power: 1.45, desc: '32 ignitions, no breathing room' },
];

class World {
  constructor() {
    const n = SX * SY * SZ;
    this.mat = new Uint8Array(n);
    this.fuel = new Float32Array(n);
    this.temp = new Float32Array(n);
    this.burn = new Float32Array(n);
    this.wet = new Float32Array(n);
    this.dirty = [];
    this.events = [];
    this.burning = [];
    this.burningSet = new Set();
    this.wind = 0.35;
    this.waterActive = false;
    this.fireSources = new Set();
    this.water = {
      depth: new Float32Array(SX * SZ),
      blocked: new Uint8Array(SX * SZ),
      tmp: new Float32Array(SX * SZ),
    };
    this.refills = [];
    this.tanks = [];
    this.steamVents = [];
    this.sceneId = null;
    this.scene = null;
    this.tanksExploded = 0;
    this.glassShattered = 0;
    this.burningCount = 0;
    this.bbox = null;
    this.cabinBox = null;
    this.totalLeaf = 0;
    this.totalStruct = 0;
    this.totalCabin = 0;
    this.boat = null;
    this.damZ = 30;
    this.flare = null;
  }

  idx(x, y, z) { return (y * SZ + z) * SX + x; }
  inb(x, y, z) { return x >= 0 && x < SX && y >= 0 && y < SY && z >= 0 && z < SZ; }
  get(x, y, z) { return this.inb(x, y, z) ? this.mat[this.idx(x, y, z)] : MAT.AIR; }
  isSolid(x, y, z) { const m = this.get(x, y, z); return m !== MAT.AIR; }

  set(x, y, z, m) {
    if (!this.inb(x, y, z)) return;
    const i = this.idx(x, y, z);
    if (this.mat[i] === m) return;
    this.mat[i] = m;
    const def = MATS[m];
    this.fuel[i] = def ? def.fuel : 0;
    if (m === MAT.AIR) {
      this.burn[i] = 0; this.temp[i] = 20; this.wet[i] = 0;
    }
    this.dirty.push(i);
  }

  setI(i, m) {
    if (this.mat[i] === m) return;
    this.mat[i] = m;
    const def = MATS[m];
    this.fuel[i] = def ? def.fuel : 0;
    if (m === MAT.AIR) { this.burn[i] = 0; this.temp[i] = 20; this.wet[i] = 0; }
    this.dirty.push(i);
  }

  setHeat(x, y, z, t) { if (this.inb(x, y, z)) this.temp[this.idx(x, y, z)] = t; }

  box(x0, y0, z0, x1, y1, z1, m) {
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++)
        for (let x = x0; x <= x1; x++) this.set(x, y, z, m);
  }

  sphere(cx, cy, cz, r, m, hollow = false) {
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++)
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          const d2 = (x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2;
          if (d2 > r2) continue;
          if (hollow && d2 < (r - 1.1) ** 2) continue;
          this.set(x, y, z, m);
        }
  }

  ground(kind = 'grass') {
    for (let z = 0; z < SZ; z++)
      for (let x = 0; x < SX; x++) {
        let m = kind === 'grass' ? MAT.GRASS : kind === 'concrete' ? MAT.CONCRETE : MAT.DIRT;
        this.set(x, 0, z, m);
      }
  }

  road(x0, z0, x1, z1, m = MAT.CONCRETE) {
    for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++)
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, 0, z, m);
  }

  round(n) { return Math.round(n); }

  pine(x, z, h = 3, radius = 2.2) {
    this.box(x, 1, z, x, h, z, MAT.WOOD);
    const levels = 4;
    for (let l = 0; l < levels; l++) {
      const r = Math.max(0.6, radius * (1 - l / (levels + 0.7)));
      const yy = h + 1 + l;
      const rr = Math.ceil(r);
      for (let dz = -rr; dz <= rr; dz++)
        for (let dx = -rr; dx <= rr; dx++) {
          if (dx * dx + dz * dz > r * r) continue;
          if (dx === 0 && dz === 0) this.set(x, yy, z, MAT.WOOD);
          else this.set(x + dx, yy, z + dz, MAT.LEAF);
        }
    }
  }

  broadleaf(x, z, h = 4, r = 3) {
    this.box(x, 1, z, x, h, z, MAT.WOOD);
    for (let dy = 1; dy <= 3; dy++)
      for (let dz = -r; dz <= r; dz++)
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dz * dz + (dy - 2) ** 2 * 1.7 > r * r) continue;
          this.set(x + dx, h + dy, z + dz, MAT.LEAF);
        }
  }

  cabin(x0, z0, w = 10, d = 8) {
    const x1 = x0 + w - 1, z1 = z0 + d - 1;
    this.box(x0, 1, z0, x1, 1, z1, MAT.STONE);
    for (let y = 2; y <= 5; y++) {
      for (let x = x0; x <= x1; x++) {
        this.set(x, y, z0, MAT.WOOD);
        this.set(x, y, z1, MAT.WOOD);
      }
      for (let z = z0; z <= z1; z++) {
        this.set(x0, y, z, MAT.WOOD);
        this.set(x1, y, z, MAT.WOOD);
      }
    }
    // door and windows
    this.box(x0 + 4, 2, z0, x0 + 5, 3, z0, MAT.AIR);
    for (let x = x0 + 1; x <= x1 - 1; x += 3) {
      this.set(x, 3, z0, MAT.GLASS);
      this.set(x, 3, z1, MAT.GLASS);
    }
    // roof
    for (let k = 0; k <= 3; k++) {
      for (let z = z0 - 1 + k; z <= z1 + 1 - k; z++)
        for (let x = x0 - 1 + k; x <= x1 + 1 - k; x++) this.set(x, 6 + k, z, k < 2 ? MAT.WOOD : MAT.STONE);
    }
    // chimney
    this.box(x0 + 2, 6, z0 + 1, x0 + 3, 10, z0 + 2, MAT.STONE);
    // porch
    this.box(x0 + 3, 2, z0 - 2, x1 - 2, 2, z0 - 1, MAT.WOOD);
    this.box(x0 + 3, 5, z0 - 2, x0 + 3, 5, z0 - 1, MAT.WOOD);
    this.box(x1 - 2, 5, z0 - 2, x1 - 2, 5, z0 - 1, MAT.WOOD);
    // campfire
    const fx = x1 + 3, fz = z1 + 3;
    this.box(fx - 1, 1, fz - 1, fx + 1, 1, fz + 1, MAT.STONE);
    this.box(fx, 2, fz, fx, 2, fz, MAT.WOOD);
    return { fx, fz };
  }

  tower(x0, z0, w, d, h, opts = {}) {
    const x1 = x0 + w - 1, z1 = z0 + d - 1;
    // lobby / ground floor
    for (let y = 1; y <= h; y++) {
      for (let x = x0; x <= x1; x++) {
        for (let z = z0; z <= z1; z++) {
          const edgeX = x === x0 || x === x1;
          const edgeZ = z === z0 || z === z1;
          if (!edgeX && !edgeZ) continue;
          const corner = (x === x0 || x === x1) && (z === z0 || z === z1);
          const band = y % 4 === 0;
          const mullion = ((x - x0) % 5 === 0) || ((z - z0) % 5 === 0);
          let m = MAT.GLASS;
          if (corner || band) m = MAT.CONCRETE;
          else if (mullion) m = MAT.WOOD;
          this.set(x, y, z, m);
        }
      }
      // balcony / timber band on the south face
      if (y % 3 === 0) {
        for (let x = x0 + 1; x <= x1 - 1; x++) {
          this.set(x, y, z1 + 1, MAT.WOOD);
          if (x % 4 === 0) this.set(x, y, z1 + 2, MAT.WOOD);
        }
      }
    }
    // roof
    this.box(x0, h + 1, z0, x1, h + 1, z1, MAT.CONCRETE);
    this.box(x0 + 2, h + 2, z0 + 2, x0 + 3, h + 3, z0 + 3, MAT.METAL);
    return { x0, x1, z0, z1, h };
  }

  skybridge(x0, z0, x1, z1, y, m = MAT.GLASS) {
    const zz0 = Math.min(z0, z1), zz1 = Math.max(z0, z1);
    for (let z = zz0; z <= zz1; z++)
      for (let x = x0; x <= x1; x++) {
        this.set(x, y, z, m);
        this.set(x, y, z, m);
        this.set(x, y + 1, z, m);
        if (z === zz0 || z === zz1) this.set(x, y + 2, z, MAT.WOOD);
      }
    for (let x = x0; x <= x1; x += 3) { this.set(x, y - 1, zz0, MAT.CONCRETE); this.set(x, y - 1, zz1, MAT.CONCRETE); }
  }

  mall(x0, z0, w, d) {
    const x1 = x0 + w - 1, z1 = z0 + d - 1;
    this.box(x0, 1, z0, x1, 1, z1, MAT.CONCRETE);
    for (let y = 2; y <= 3; y++) {
      for (let x = x0; x <= x1; x++) { this.set(x, y, z0, MAT.GLASS); this.set(x, y, z1, MAT.GLASS); }
      for (let z = z0; z <= z1; z++) { this.set(x0, y, z, MAT.GLASS); this.set(x1, y, z, MAT.GLASS); }
    }
    // roof + skylight
    for (let z = z0 + 3; z <= z1 - 3; z++)
      for (let x = x0 + 3; x <= x1 - 3; x++) {
        this.set(x, 4, z, (x + z) % 7 === 0 ? MAT.GLASS : MAT.CONCRETE);
      }
    for (let x = x0; x <= x1; x++) { this.set(x, 4, z0, MAT.CONCRETE); this.set(x, 4, z1, MAT.CONCRETE); }
    for (let z = z0; z <= z1; z++) { this.set(x0, 4, z, MAT.CONCRETE); this.set(x1, 4, z, MAT.CONCRETE); }
    // columns
    for (let x = x0 + 2; x <= x1 - 2; x += 6)
      for (let z = z0 + 2; z <= z1 - 2; z += 6) this.box(x, 2, z, x + 1, 4, z + 1, MAT.CONCRETE);
  }

  lowrise(x0, z0, w, d, h) {
    const x1 = x0 + w - 1, z1 = z0 + d - 1;
    for (let y = 1; y <= h; y++) {
      for (let x = x0; x <= x1; x++) {
        for (let z = z0; z <= z1; z++) {
          const edge = x === x0 || x === x1 || z === z0 || z === z1;
          if (!edge) continue;
          const corner = (x === x0 || x === x1) && (z === z0 || z === z1);
          this.set(x, y, z, corner || y === h ? MAT.CONCRETE : (y % 2 ? MAT.GLASS : MAT.WOOD));
        }
      }
    }
    this.box(x0, h + 1, z0, x1, h + 1, z1, MAT.CONCRETE);
  }

  park(x0, z0, x1, z1) {
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) this.set(x, 0, z, MAT.GRASS);
    // paths
    for (let x = x0; x <= x1; x++) this.set(x, 0, (z0 + z1) >> 1, MAT.DIRT);
    for (let z = z0; z <= z1; z++) this.set((x0 + x1) >> 1, 0, z, MAT.DIRT);
    // fountain
    const cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1;
    for (let dz = -3; dz <= 3; dz++)
      for (let dx = -3; dx <= 3; dx++) {
        const d = Math.hypot(dx, dz);
        if (d >= 2.5 && d <= 3.2) this.set(cx + dx, 1, cz + dz, MAT.STONE);
        if (d < 2.2) this.set(cx + dx, 1, cz + dz, MAT.WATER);
      }
    this.set(cx, 2, cz, MAT.STONE);
    // trees
    const spots = [[-7, -5], [6, -6], [-6, 6], [7, 5], [0, -8], [-9, 0]];
    for (const [dx, dz] of spots) this.broadleaf(cx + dx, cz + dz, 3, 2);
  }

  tank(x, z, r, h) {
    for (let y = 1; y <= h; y++) {
      const rr = Math.ceil(r);
      for (let dz = -rr; dz <= rr; dz++)
        for (let dx = -rr; dx <= rr; dx++) {
          const d = Math.hypot(dx, dz);
          if (d <= r && d >= r - 1.1) this.set(x + dx, y, z + dz, MAT.METAL);
        }
    }
    for (let dz = -Math.ceil(r); dz <= Math.ceil(r); dz++)
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++)
        if (Math.hypot(dx, dz) <= r - 0.6) this.set(x + dx, h, z + dz, MAT.OIL);
    this.box(x + 2, h + 1, z - 2, x + 3, h + 1, z + 2, MAT.METAL);
    this.tanks.push({ x, z, r, h, heat: 0, exploded: false });
    return { x, z, r, h };
  }

  coolingTower(x, z, r, h) {
    for (let y = 1; y <= h; y++) {
      const f = 1 - y / h;
      const rr = r * (0.72 + 0.4 * Math.pow(f, 0.7));
      for (let dz = -Math.ceil(rr); dz <= Math.ceil(rr); dz++)
        for (let dx = -Math.ceil(rr); dx <= Math.ceil(rr); dx++) {
          const d = Math.hypot(dx, dz);
          if (d <= rr && d >= rr - 1.0) this.set(x + dx, y, z + dz, MAT.CONCRETE);
        }
    }
    this.steamVents.push({ x, y: h + 2, z, kind: 'cooling', rate: 0.55 });
    return { x, z, h };
  }

  column(x, z, r, h) {
    for (let y = 1; y <= h; y++) {
      const rr = Math.ceil(r);
      for (let dz = -rr; dz <= rr; dz++)
        for (let dx = -rr; dx <= rr; dx++) {
          const d = Math.hypot(dx, dz);
          if (d <= r && d >= r - 0.9) this.set(x + dx, y, z + dz, MAT.METAL);
        }
      if (y % 4 === 0) {
        for (let dx = -r - 1; dx <= r + 1; dx++) this.set(x + dx, y, z, MAT.METAL);
      }
    }
    for (let dz = -Math.ceil(r); dz <= Math.ceil(r); dz++)
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++)
        if (Math.hypot(dx, dz) <= r - 0.5) this.set(x + dx, 1, z + dz, MAT.METAL);
    return { x, z, h };
  }

  chimney(x, z, r, h) {
    for (let y = 1; y <= h; y++) {
      const rr = Math.max(0, r - Math.floor(y / 10));
      for (let dz = -rr; dz <= rr; dz++)
        for (let dx = -rr; dx <= rr; dx++) {
          if (Math.hypot(dx, dz) > rr) continue;
          if (Math.hypot(dx, dz) >= rr - 0.8 || y % 6 === 0) this.set(x + dx, y, z + dz, MAT.CONCRETE);
        }
    }
    this.steamVents.push({ x, y: h + 1, z, kind: 'smoke', rate: 0.15 });
    return { x, z, h };
  }

  flareStack(x, z, h) {
    for (let y = 1; y <= h; y++) {
      this.set(x, y, z, MAT.METAL);
      if (y % 5 === 0) {
        this.set(x + 1, y, z, MAT.METAL);
        this.set(x, y, z + 1, MAT.METAL);
      }
    }
    this.flare = { x, y: h + 1, z };
    return this.flare;
  }

  pipes(points) {
    for (let k = 0; k < points.length - 1; k++) {
      const a = points[k], b = points[k + 1];
      const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]));
      for (let s = 0; s <= steps; s++) {
        const x = Math.round(a[0] + (b[0] - a[0]) * s / steps);
        const y = Math.round(a[1] + (b[1] - a[1]) * s / steps);
        const z = Math.round(a[2] + (b[2] - a[2]) * s / steps);
        this.set(x, y, z, MAT.METAL);
      }
    }
  }

  controlRoom(x0, z0, w, d) {
    const x1 = x0 + w - 1, z1 = z0 + d - 1;
    this.box(x0, 1, z0, x1, 1, z1, MAT.CONCRETE);
    for (let y = 2; y <= 3; y++)
      for (let x = x0; x <= x1; x++) {
        this.set(x, y, z0, MAT.GLASS); this.set(x, y, z1, MAT.GLASS);
      }
    for (let z = z0; z <= z1; z++) {
      this.set(x0, 2, z, MAT.GLASS); this.set(x1, 2, z, MAT.GLASS);
      this.set(x0, 3, z, MAT.GLASS); this.set(x1, 3, z, MAT.GLASS);
    }
    this.box(x0, 4, z0, x1, 4, z1, MAT.CONCRETE);
  }

  hydrant(x, z) { this.refills.push({ x, z, kind: 'hydrant' }); this.box(x, 1, z, x, 1, z, MAT.METAL); }
  waterPoint(x, z) { this.refills.push({ x, z, kind: 'water' }); }

  barrel(x, z) {
    for (let y = 1; y <= 2; y++)
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) {
          const d = Math.hypot(dx, dz);
          if (d > 1.05) continue;
          this.set(x + dx, y, z + dz, d >= 0.55 ? MAT.METAL : MAT.OIL);
        }
    this.set(x, 3, z, MAT.OIL);
    return { x, z, y: 3 };
  }

  build(sceneId) {
    const n = SX * SY * SZ;
    this.mat.fill(0); this.fuel.fill(0); this.temp.fill(20); this.burn.fill(0); this.wet.fill(0);
    this.dirty.length = 0; this.events.length = 0; this.burning.length = 0; this.burningSet.clear();
    this.refills.length = 0; this.tanks.length = 0; this.steamVents.length = 0;
    this.tanksExploded = 0; this.glassShattered = 0; this.burningCount = 0;
    this.fireSources.clear();
    this.waterActive = false; this.water.depth.fill(0); this.water.blocked.fill(0);
    this.boat = null; this.flare = null; this.bbox = null; this.cabinBox = null;
    this.sceneId = sceneId; this.scene = SCENES[sceneId];
    this.totalLeaf = 0; this.totalStruct = 0; this.totalCabin = 0;

    switch (sceneId) {
      case 'training': this.buildTraining(); break;
      case 'cabin': this.buildCabinScene(); break;
      case 'deep': this.buildDeepForest(); break;
      case 'city': this.buildCity(); break;
      case 'refinery': this.buildRefinery(); break;
      case 'reservoir': this.buildReservoir(); break;
    }
    this.computeTotals();
    this.markInitialFires();
  }

  buildTraining() {
    this.ground('concrete');
    // station to the east, open yard in front
    this.box(58, 1, 60, 70, 1, 68, MAT.CONCRETE);
    for (let y = 2; y <= 4; y++) {
      for (let x = 58; x <= 70; x++) { this.set(x, y, 60, MAT.CONCRETE); this.set(x, y, 68, MAT.CONCRETE); }
      for (let z = 60; z <= 68; z++) { this.set(58, y, z, MAT.CONCRETE); this.set(70, y, z, MAT.CONCRETE); }
    }
    // door on the west face + windows
    this.box(58, 2, 63, 58, 3, 65, MAT.AIR);
    for (let z = 61; z <= 67; z += 3) { this.set(58, 3, z, MAT.GLASS); this.set(70, 3, z, MAT.GLASS); }
    this.box(58, 5, 60, 70, 5, 68, MAT.CONCRETE);
    // training tower to the west
    this.tower(28, 56, 8, 7, 7);
    // drums in the open
    this.barrel(42, 52); this.barrel(48, 50); this.barrel(54, 52); this.barrel(48, 57);
    this.igniteSource(42, 3, 52); this.ignite(48, 3, 50); this.ignite(54, 3, 52);
    this.hydrant(48, 66);
    this.waterPoint(36, 70);
    this.bbox = [30, 1, 46, 72, 10, 72];
  }

  buildCabinScene() {
    this.ground('grass');
    // path
    for (let z = 44; z <= 74; z++) for (let x = 47; x <= 49; x++) this.set(x, 0, z, MAT.DIRT);
    const fire = this.cabin(41, 36, 10, 8);
    this.hydrant(48, 60);
    this.waterPoint(30, 62);
    // pines
    const rand = this.rng(1337);
    const spots = [
      [36, 32], [55, 34], [58, 42], [62, 48], [34, 50], [30, 40], [64, 28],
      [28, 28], [38, 24], [50, 26], [58, 22], [68, 38], [70, 52], [26, 56],
      [34, 62], [64, 60], [42, 64], [56, 64], [28, 70], [70, 68], [60, 56],
    ];
    for (const [x, z] of spots) {
      if (x >= 39 && x <= 53 && z >= 34 && z <= 46) continue;
      this.pine(x, z, 3 + (rand() * 2 | 0), 2.4 + rand());
    }
    for (let k = 0; k < 20; k++) {
      const x = 20 + (rand() * 56 | 0), z = 18 + (rand() * 56 | 0);
      if (x >= 36 && x <= 58 && z >= 30 && z <= 50) continue;
      this.pine(x, z, 2 + (rand() * 3 | 0), 2.0 + rand() * 1.2);
    }
    // campfire is a pile of wood + ignition
    this.box(fire.fx - 1, 2, fire.fz - 1, fire.fx + 1, 2, fire.fz + 1, MAT.WOOD);
    this.igniteSource(fire.fx, 2, fire.fz);
    this.igniteNear(58, 40, 4);
    this.igniteNear(57, 41, 4);
    this.bbox = [20, 1, 18, 74, 12, 74];
    this.cabinBox = [41, 1, 34, 51, 12, 44];
  }

  buildDeepForest() {
    this.ground('grass');
    for (let z = 48; z <= 84; z++) for (let x = 47; x <= 49; x++) this.set(x, 0, z, MAT.DIRT);
    const rand = this.rng(4242);
    for (let k = 0; k < 130; k++) {
      const x = 8 + (rand() * 80 | 0), z = 6 + (rand() * 78 | 0);
      if (x >= 45 && x <= 51 && z > 46) continue;
      if (this.get(x, 1, z) !== MAT.AIR) continue;
      this.pine(x, z, 2 + (rand() * 4 | 0), 2.0 + rand() * 1.3);
    }
    this.hydrant(48, 78);
    this.waterPoint(18, 62);
    this.igniteSourceNear(28, 40, 5);
    this.igniteNear(66, 34, 5);
    this.igniteNear(58, 56, 5);
    this.bbox = [4, 1, 4, 92, 14, 92];
  }

  buildCity() {
    this.ground('concrete');
    this.road(30, 74, 66, 88, MAT.DIRT);
    // park
    this.park(58, 60, 80, 80);
    // podium mall
    this.mall(30, 26, 30, 26);
    // four connected towers
    this.tower(32, 28, 9, 9, 15);
    this.tower(47, 28, 9, 9, 19);
    this.tower(32, 41, 9, 9, 12);
    this.tower(47, 41, 9, 9, 16);
    this.skybridge(40, 30, 47, 33, 7);
    this.skybridge(47, 35, 52, 41, 11);
    this.skybridge(40, 44, 47, 46, 6);
    this.skybridge(34, 36, 36, 41, 9);
    // low-rises
    this.lowrise(20, 26, 8, 8, 5);
    this.lowrise(66, 26, 8, 8, 4);
    this.lowrise(20, 48, 7, 8, 3);
    this.lowrise(68, 48, 7, 7, 5);
    this.lowrise(30, 56, 8, 6, 3);
    this.lowrise(42, 56, 9, 6, 2);
    // hydrants
    this.hydrant(54, 54); this.hydrant(30, 52); this.hydrant(66, 58);
    // street-level pallet fire in the plaza
    this.box(34, 1, 54, 38, 1, 54, MAT.WOOD);
    this.set(35, 2, 54, MAT.OIL);
    this.set(36, 2, 54, MAT.OIL);
    this.set(37, 2, 54, MAT.OIL);
    this.igniteSource(35, 2, 54);
    this.ignite(36, 2, 54);
    this.ignite(37, 2, 54);
    // high balcony fire on the front tower (C), visible from the plaza
    this.igniteSource(35, 6, 50);
    this.ignite(36, 6, 50);
    this.ignite(37, 6, 50);
    this.bbox = [18, 1, 24, 76, 24, 82];
  }

  buildRefinery() {
    this.ground('concrete');
    this.road(30, 72, 66, 88, MAT.DIRT);
    // tanks
    this.tank(26, 30, 6, 7);
    this.tank(44, 30, 6, 7);
    this.tank(62, 30, 6, 7);
    // cooling tower
    this.coolingTower(48, 54, 7, 11);
    // columns
    this.column(28, 54, 2.5, 13);
    this.column(36, 54, 2.5, 15);
    // chimney + flare
    this.chimney(62, 58, 2, 18);
    this.flareStack(70, 48, 21);
    // control room
    this.controlRoom(18, 62, 9, 6);
    // pipes
    this.pipes([[28, 3, 30], [28, 3, 44], [28, 5, 44], [36, 5, 48], [36, 5, 54]]);
    this.pipes([[44, 3, 30], [44, 3, 44], [44, 5, 44], [48, 5, 48]]);
    this.pipes([[62, 3, 30], [62, 3, 44], [62, 5, 44], [62, 5, 58]]);
    this.pipes([[18, 2, 62], [26, 2, 62], [26, 3, 54]]);
    // oil pool / fire
    for (let dz = -7; dz <= 7; dz++)
      for (let dx = -7; dx <= 7; dx++) {
        const d = Math.hypot(dx, dz);
        if (d < 7 && this.get(26 + dx, 0, 30 + dz) === MAT.CONCRETE) this.set(26 + dx, 1, 30 + dz, MAT.OIL);
      }
    this.igniteSource(23, 1, 30);
    this.ignite(24, 1, 32);
    this.ignite(22, 1, 28);
    this.hydrant(48, 72); this.hydrant(18, 70); this.waterPoint(30, 72);
    this.bbox = [14, 1, 24, 76, 24, 74];
  }

  buildReservoir() {
    this.ground('grass');
    // reservoir floor north is a little lower visually; water sim does depth
    this.waterActive = true;
    // dam wall
    const damZ = this.damZ;
    for (let z = damZ; z <= damZ + 3; z++)
      for (let x = 16; x <= 80; x++) {
        for (let y = 1; y <= 5; y++) this.set(x, y, z, MAT.CONCRETE);
        this.water.blocked[z * SX + x] = 1;
      }
    // crest road
    for (let x = 16; x <= 80; x++) this.set(x, 6, damZ, MAT.CONCRETE);
    // gatehouse
    this.box(41, 7, damZ - 1, 53, 7, damZ + 4, MAT.CONCRETE);
    for (let y = 8; y <= 9; y++)
      for (let x = 41; x <= 53; x++) { this.set(x, y, damZ - 1, MAT.GLASS); this.set(x, y, damZ + 4, MAT.GLASS); }
    for (let z = damZ - 1; z <= damZ + 4; z++) { this.set(41, 8, z, MAT.GLASS); this.set(53, 8, z, MAT.GLASS); }
    this.box(41, 10, damZ - 1, 53, 10, damZ + 4, MAT.CONCRETE);
    // gates
    for (let x = 43; x <= 51; x += 2) this.box(x, 1, damZ + 3, x + 1, 4, damZ + 3, MAT.METAL);
    // spillway
    for (let z = damZ + 4; z <= 46; z++)
      for (let x = 60; x <= 70; x++) {
        this.set(x, 0, z, MAT.CONCRETE);
        this.set(x, 1, z, Math.abs(x - 65) > 4 ? MAT.CONCRETE : MAT.AIR);
      }
    // hydro station downstream
    this.box(28, 1, 48, 40, 1, 56, MAT.CONCRETE);
    for (let y = 2; y <= 4; y++) {
      for (let x = 28; x <= 40; x++) { this.set(x, y, 48, MAT.CONCRETE); this.set(x, y, 56, MAT.CONCRETE); }
      for (let z = 48; z <= 56; z++) { this.set(28, y, z, MAT.CONCRETE); this.set(40, y, z, MAT.CONCRETE); }
    }
    for (let x = 30; x <= 38; x += 3) { this.set(x, 3, 48, MAT.GLASS); this.set(x, 3, 56, MAT.GLASS); }
    this.box(28, 5, 48, 40, 5, 56, MAT.CONCRETE);
    // penstock / outflow
    this.pipes([[34, 2, 56], [34, 2, 60], [34, 1, 64]]);
    this.steamVents.push({ x: 68, y: 3, z: 44, kind: 'hydro', rate: 0.45 });
    // dock + boat
    for (let x = 68; x <= 76; x++) this.box(x, 1, 16, x, 1, 18, MAT.WOOD);
    this.boat = { x: 72, z: 14 };
    // forest right / downstream
    const rand = this.rng(9001);
    for (let k = 0; k < 80; k++) {
      const x = 60 + (rand() * 32 | 0), z = 34 + (rand() * 54 | 0);
      if (x >= 58 && x <= 72 && z >= 34 && z <= 46) continue;
      if (x >= 26 && x <= 42 && z >= 46 && z <= 58) continue;
      if (this.get(x, 1, z) !== MAT.AIR) continue;
      this.pine(x, z, 2 + (rand() * 4 | 0), 2.0 + rand());
    }
    // a few pines on the far shore
    for (let k = 0; k < 20; k++) {
      const x = 4 + (rand() * 70 | 0), z = 4 + (rand() * 20 | 0);
      if (this.get(x, 1, z) !== MAT.AIR) continue;
      this.pine(x, z, 2 + (rand() * 3 | 0), 2.0 + rand());
    }
    // hydrants/water
    this.hydrant(48, 72);
    this.waterPoint(60, 34);
    this.waterPoint(76, 32);
    // fires in the forest
    this.igniteSourceNear(80, 38, 5);
    this.igniteNear(84, 52, 5);
    this.igniteNear(88, 44, 5);
    // initial reservoir depth
    for (let z = 0; z < damZ; z++)
      for (let x = 16; x <= 80; x++) this.water.depth[z * SX + x] = 3.4;
    this.bbox = [4, 1, 4, 94, 16, 92];
  }

  rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  computeTotals() {
    this.totalLeaf = 0; this.totalStruct = 0; this.totalCabin = 0;
    for (let y = 0; y < SY; y++)
      for (let z = 0; z < SZ; z++)
        for (let x = 0; x < SX; x++) {
          const m = this.mat[this.idx(x, y, z)];
          if (m === MAT.LEAF) this.totalLeaf++;
          if (this.bbox && x >= this.bbox[0] && x <= this.bbox[3] && y >= this.bbox[1] && y <= this.bbox[4] && z >= this.bbox[2] && z <= this.bbox[5]) {
            if (m === MAT.WOOD || m === MAT.GLASS || m === MAT.CONCRETE) this.totalStruct++;
            if (this.cabinBox && x >= this.cabinBox[0] && x <= this.cabinBox[3] && y >= this.cabinBox[1] && y <= this.cabinBox[4] && z >= this.cabinBox[2] && z <= this.cabinBox[5] && m === MAT.WOOD) this.totalCabin++;
          }
        }
  }

  markInitialFires() {
    // fires were ignited during build; collect them
    this.burning.length = 0;
    this.burningSet.clear();
    for (let i = 0; i < this.mat.length; i++) {
      if (this.burn[i] > 0) { this.burning.push(i); this.burningSet.add(i); }
    }
    this.burningCount = this.burning.length;
  }

  igniteSource(x, y, z) {
    if (!this.inb(x, y, z)) return;
    const i = this.idx(x, y, z);
    const m = this.mat[i];
    if (m === MAT.AIR || !MATS[m] || MATS[m].fuel <= 0) this.set(x, y, z, MAT.OIL);
    this.fireSources.add(i);
    this.ignite(x, y, z);
  }

  igniteSourceNear(x, z, r = 3) {
    const candidates = [];
    for (let y = 1; y < SY; y++)
      for (let dz = -r; dz <= r; dz++)
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dz * dz > r * r) continue;
          const nx = x + dx, nz = z + dz;
          if (!this.inb(nx, y, nz)) continue;
          const i = this.idx(nx, y, nz);
          const m = this.mat[i];
          if (m === MAT.LEAF || m === MAT.WOOD || m === MAT.OIL) candidates.push(i);
        }
    if (!candidates.length) return false;
    const i = candidates[(Math.random() * candidates.length) | 0];
    const x2 = i % SX, z2 = ((i / SX) | 0) % SZ, y2 = (i / (SX * SZ)) | 0;
    if (MATS[this.mat[i]].fuel <= 0) this.set(x2, y2, z2, MAT.OIL);
    this.fireSources.add(i);
    this.ignite(x2, y2, z2);
    return true;
  }

  ignite(x, y, z, power = 1) {
    if (!this.inb(x, y, z)) return;
    const i = this.idx(x, y, z);
    const m = this.mat[i];
    const def = MATS[m];
    if (!def || def.fuel <= 0) return;
    this.burn[i] = Math.max(this.burn[i], 0.4 * power);
    this.temp[i] = Math.max(this.temp[i], 420 * power);
    this.wet[i] = 0;
    if (!this.burningSet.has(i)) { this.burningSet.add(i); this.burning.push(i); }
  }

  igniteNear(x, z, r = 3) {
    const candidates = [];
    for (let y = 1; y < SY; y++)
      for (let dz = -r; dz <= r; dz++)
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dz * dz > r * r) continue;
          const nx = x + dx, nz = z + dz;
          if (!this.inb(nx, y, nz)) continue;
          const i = this.idx(nx, y, nz);
          const m = this.mat[i];
          if (m === MAT.LEAF || m === MAT.WOOD || m === MAT.OIL) candidates.push(i);
        }
    if (!candidates.length) return false;
    const i = candidates[(Math.random() * candidates.length) | 0];
    const x2 = i % SX, z2 = ((i / SX) | 0) % SZ, y2 = (i / (SX * SZ)) | 0;
    this.ignite(x2, y2, z2);
    return true;
  }

  igniteRadius(cx, cy, cz, r) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++)
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          if ((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2 <= r * r) this.ignite(x, y, z);
        }
  }

  waterSurfaceAt(x, z) {
    if (!this.waterActive) return -1;
    return this.water.depth[z * SX + x] || 0;
  }

  stepWater(dt) {
    if (!this.waterActive) return;
    const d = this.water.depth, tmp = this.water.tmp, blocked = this.water.blocked;
    tmp.set(d);
    for (let z = 1; z < SZ - 1; z++)
      for (let x = 1; x < SX - 1; x++) {
        const i = z * SX + x;
        const h = d[i];
        if (h < 0.01) continue;
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dx, dz] of dirs) {
          const nx = x + dx, nz = z + dz;
          if (nx < 0 || nx >= SX || nz < 0 || nz >= SZ) continue;
          const j = nz * SX + nx;
          if (blocked[j]) continue;
          const diff = (h + 0) - d[j];
          if (diff <= 0.015) continue;
          const flow = Math.min(diff * 0.28, h * 0.2, 0.16);
          if (flow <= 0) continue;
          tmp[i] -= flow; tmp[j] += flow;
        }
      }
    // clamp tiny negatives
    for (let i = 0; i < d.length; i++) d[i] = Math.max(0, tmp[i]);
  }

  breachAt(cx, cz) {
    let opened = false;
    for (let z = this.damZ; z <= this.damZ + 3; z++)
      for (let x = 16; x <= 80; x++) {
        if (Math.hypot(x - cx, z - cz) <= 3.5 && this.water.blocked[z * SX + x]) {
          this.water.blocked[z * SX + x] = 0; opened = true;
        }
      }
    if (opened) this.events.push({ type: 'breach' });
    return opened;
  }

  removeSphere(cx, cy, cz, r) {
    let removed = 0;
    for (let y = Math.max(1, Math.floor(cy - r)); y <= Math.ceil(cy + r); y++)
      for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++)
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          if (!this.inb(x, y, z)) continue;
          if ((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2 > r * r) continue;
          const m = this.mat[this.idx(x, y, z)];
          if (m === MAT.AIR || m === MAT.GRASS || m === MAT.DIRT) continue;
          this.set(x, y, z, MAT.AIR);
          removed++;
        }
    if (removed) {
      this.breachAt(cx, cz);
      this.events.push({ type: 'demolish', x: cx, y: cy, z: cz, n: removed });
    }
    return removed;
  }

  applyWater(cx, cy, cz, r, dt) {
    let hit = 0;
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(SY - 1, Math.ceil(cy + r)); y++)
      for (let z = Math.max(0, Math.floor(cz - r)); z <= Math.min(SZ - 1, Math.ceil(cz + r)); z++)
        for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(SX - 1, Math.ceil(cx + r)); x++) {
          const i = this.idx(x, y, z);
          if ((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2 > r * r) continue;
          const m = this.mat[i];
          if (m === MAT.AIR) continue;
          this.wet[i] = Math.min(1, this.wet[i] + dt * 3.2);
          if (this.fireSources && this.fireSources.has(i) && this.wet[i] > 0.55) {
            this.fireSources.delete(i);
            this.burn[i] = 0;
            this.burningSet.delete(i);
            const k = this.burning.indexOf(i);
            if (k >= 0) this.burning.splice(k, 1);
          }
          if (this.temp[i] > 120) {
            this.temp[i] = Math.max(20, this.temp[i] - dt * 260);
            if (Math.random() < dt * 1.4) this.events.push({ type: 'steam', x, y, z });
          }
          if (this.burn[i] > 0) {
            this.burn[i] -= dt * 2.8;
            if (this.burn[i] <= 0) {
              this.burn[i] = 0;
              this.burningSet.delete(i);
              this.temp[i] = Math.min(this.temp[i], 90);
              this.events.push({ type: 'douse', x, y, z });
            }
            hit++;
          }
        }
    // cool tanks near spray
    for (const t of this.tanks) {
      if (t.exploded) continue;
      const d = Math.hypot(t.x - cx, t.z - cz);
      if (d < t.r + 4) t.heat = Math.max(0, t.heat - dt * 55);
    }
    return hit;
  }

  stepFire(dt, time) {
    const wind = this.wind;
    const windX = Math.cos(time * 0.075) * wind * 0.6;
    const windZ = Math.sin(time * 0.055 + 0.7) * wind;
    const burning = this.burning;
    // cool & burn
    for (let k = burning.length - 1; k >= 0; k--) {
      const i = burning[k];
      const m = this.mat[i];
      if (m === MAT.AIR || m === MAT.CHAR) { this.burningSet.delete(i); burning.splice(k, 1); continue; }
      const def = MATS[m];
      if (!def) { this.burningSet.delete(i); burning.splice(k, 1); continue; }
      this.temp[i] = Math.min(1200, this.temp[i] + dt * 160);
      this.burn[i] += dt * 0.55;
      this.fuel[i] -= dt * (def.fuel * 0.012 + 0.02) * (this.wet[i] > 0.4 ? 0.25 : 1);
      if (this.wet[i] > 0.55) {
        this.burn[i] -= dt * 0.85;
        this.temp[i] -= dt * 110;
      }
      if (this.fuel[i] <= 0.02 || this.burn[i] < 0.04) {
        this.burn[i] = 0;
        this.burningSet.delete(i);
        burning.splice(k, 1);
        if (m === MAT.LEAF || m === MAT.GRASS || m === MAT.OIL) this.setI(i, MAT.AIR);
        else this.setI(i, MAT.CHAR);
        continue;
      }
      if (m === MAT.OIL && this.burn[i] > 2.6) {
        this.explode(i, 3.5);
      }
      // spread heat to neighbours
      const x = i % SX, z = ((i / SX) | 0) % SZ, y = (i / (SX * SZ)) | 0;
      const t = this.temp[i];
      const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
      for (const [dx, dy, dz] of dirs) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (!this.inb(nx, ny, nz)) continue;
        const j = this.idx(nx, ny, nz);
        if (this.mat[j] === MAT.AIR) {
          this.temp[j] = Math.max(this.temp[j], this.temp[j] + (t - this.temp[j]) * 0.06);
          continue;
        }
        const bias = (dx !== 0 ? windX * dx * 0.9 : 0) + (dz !== 0 ? windZ * dz * 0.9 : 0) + (dy > 0 ? 0.25 : 0);
        this.temp[j] += (t - this.temp[j]) * dt * (0.35 + Math.max(-0.2, bias));
        if (this.mat[j] === MAT.GLASS && this.temp[j] > 340) {
          this.setI(j, MAT.AIR);
          this.events.push({ type: 'glass', x: nx, y: ny, z: nz });
        }
      }
    }
    // ambient cooling + spontaneous ignition from heat
    for (let y = 0; y < SY; y++)
      for (let z = 0; z < SZ; z++)
        for (let x = 0; x < SX; x++) {
          const i = this.idx(x, y, z);
          if (this.temp[i] > 22) this.temp[i] = Math.max(22, this.temp[i] - dt * (this.mat[i] === MAT.CHAR ? 4 : 1.5));
          if (this.wet[i] > 0) this.wet[i] = Math.max(0, this.wet[i] - dt * 0.035);
          const m = this.mat[i];
          if (m === MAT.AIR || m === MAT.CHAR) continue;
          const def = MATS[m];
          if (!def || def.fuel <= 0) continue;
          if (this.burn[i] > 0) continue;
          if (this.wet[i] > 0.4) continue;
          if (this.temp[i] > def.ign) {
            const p = ((this.temp[i] - def.ign) / 500) * dt * 1.1;
            if (Math.random() < p) this.ignite(x, y, z);
          }
        }
    // persistent fire sources (main fire) keep burning until water hits them
    for (const si of this.fireSources) {
      if (this.mat[si] === MAT.AIR || this.mat[si] === MAT.CHAR) { this.fireSources.delete(si); continue; }
      if (this.wet[si] > 0.55) {
        this.fireSources.delete(si);
        this.burn[si] = 0;
        this.temp[si] = Math.min(this.temp[si], 80);
        this.burningSet.delete(si);
        const k = burning.indexOf(si);
        if (k >= 0) burning.splice(k, 1);
        continue;
      }
      if (this.burn[si] < 0.1) {
        this.fuel[si] = Math.max(this.fuel[si], 16);
        const x = si % SX, z = ((si / SX) | 0) % SZ, y = (si / (SX * SZ)) | 0;
        this.ignite(x, y, z);
      }
    }
    this.burningCount = burning.length;
    // flood extinguish
    if (this.waterActive) {
      for (let k = burning.length - 1; k >= 0; k--) {
        const i = burning[k];
        const x = i % SX, z = ((i / SX) | 0) % SZ, y = (i / (SX * SZ)) | 0;
        const depth = this.water.depth[z * SX + x];
        if (depth > 0.18 && y * CS <= depth + 0.6) {
          this.burn[i] = 0; this.burningSet.delete(i); burning.splice(k, 1);
          this.wet[i] = 1; this.temp[i] = Math.min(this.temp[i], 60);
        }
      }
    }
    // tanks heat / explode
    for (const t of this.tanks) {
      if (t.exploded) continue;
      let near = 0;
      const r2 = (t.r + 4) ** 2;
      for (const i of burning) {
        const x = i % SX, z = ((i / SX) | 0) % SZ;
        if ((x - t.x) ** 2 + (z - t.z) ** 2 < r2) near++;
      }
      if (near > 0) t.heat = Math.min(120, t.heat + dt * (near * 0.22 + 1.1));
      else t.heat = Math.max(0, t.heat - dt * 4);
      if (t.heat >= 100) {
        t.exploded = true;
        this.tanksExploded++;
        this.explodeAt(t.x, 2, t.z, 9);
        this.events.push({ type: 'tank', x: t.x, z: t.z });
      }
    }
  }

  explode(i, r) {
    const x = i % SX, z = ((i / SX) | 0) % SZ, y = (i / (SX * SZ)) | 0;
    this.explodeAt(x, y, z, r);
  }

  explodeAt(x, y, z, r) {
    this.events.push({ type: 'explode', x, y, z, r });
    this.box(Math.max(0, x - 2), 0, Math.max(0, z - 2), Math.min(SX - 1, x + 2), 0, Math.min(SZ - 1, z + 2), MAT.CHAR);
    this.igniteRadius(x, y, z, r);
  }

  raycast(ox, oy, oz, dx, dy, dz, maxDist) {
    let x = Math.floor((ox + WORLD_W / 2) / CS);
    let y = Math.floor(oy / CS) + 1;
    let z = Math.floor((oz + WORLD_D / 2) / CS);
    const stepX = Math.sign(dx), stepY = Math.sign(dy), stepZ = Math.sign(dz);
    const tDeltaX = Math.abs(CS / (dx || 1e-9));
    const tDeltaY = Math.abs(CS / (dy || 1e-9));
    const tDeltaZ = Math.abs(CS / (dz || 1e-9));
    const nX = (x + 0.5) * CS - WORLD_W / 2;
    const nY = (y + 0.5) * CS - CS;
    const nZ = (z + 0.5) * CS - WORLD_D / 2;
    let tMaxX = dx > 0 ? (nX - CS / 2 - ox) / dx : (nX + CS / 2 - ox) / dx;
    let tMaxY = dy > 0 ? (nY - CS / 2 - oy) / dy : (nY + CS / 2 - oy) / dy;
    let tMaxZ = dz > 0 ? (nZ - CS / 2 - oz) / dz : (nZ + CS / 2 - oz) / dz;
    tMaxX = Math.max(0, tMaxX); tMaxY = Math.max(0, tMaxY); tMaxZ = Math.max(0, tMaxZ);
    for (let n = 0; n < 220; n++) {
      if (!this.inb(x, y, z)) break;
      const i = this.idx(x, y, z);
      if (this.mat[i] !== MAT.AIR) {
        const wx = ox + dx * Math.max(0, Math.min(tMaxX, tMaxY, tMaxZ));
        return { x, y, z, i, dist: Math.max(0, Math.min(tMaxX, tMaxY, tMaxZ)), wx, wy: oy + dy * Math.min(tMaxX, tMaxY, tMaxZ), wz: oz + dz * Math.min(tMaxX, tMaxY, tMaxZ) };
      }
      if (tMaxX < tMaxY && tMaxX < tMaxZ) { x += stepX; tMaxX += tDeltaX; }
      else if (tMaxY < tMaxZ) { y += stepY; tMaxY += tDeltaY; }
      else { z += stepZ; tMaxZ += tDeltaZ; }
    }
    const d = Math.min(maxDist, 60);
    return { x: -1, y: -1, z: -1, i: -1, dist: d, wx: ox + dx * d, wy: oy + dy * d, wz: oz + dz * d };
  }

  metrics() {
    let leaf = 0, struct = 0, cabin = 0;
    if (this.bbox) {
      const [x0, y0, z0, x1, y1, z1] = this.bbox;
      for (let y = y0; y <= Math.min(SY - 1, y1); y++)
        for (let z = z0; z <= Math.min(SZ - 1, z1); z++)
          for (let x = x0; x <= Math.min(SX - 1, x1); x++) {
            const m = this.mat[this.idx(x, y, z)];
            if (m === MAT.LEAF) leaf++;
            if (m === MAT.WOOD || m === MAT.GLASS || m === MAT.CONCRETE) {
              struct++;
              if (this.cabinBox && x >= this.cabinBox[0] && x <= this.cabinBox[3] && y >= this.cabinBox[1] && y <= this.cabinBox[4] && z >= this.cabinBox[2] && z <= this.cabinBox[5] && m === MAT.WOOD) cabin++;
            }
          }
    }
    return {
      leaf, struct, cabin,
      leafFrac: this.totalLeaf ? leaf / this.totalLeaf : 1,
      structFrac: this.totalStruct ? struct / this.totalStruct : 1,
      cabinFrac: this.totalCabin ? cabin / this.totalCabin : 1,
    };
  }

  checkWin() {
    if (this.burningCount > 0 || this.fireSources.size > 0) return false;
    const s = this.scene;
    const m = this.metrics();
    if (!s) return false;
    switch (s.id) {
      case 'training': return true;
      case 'cabin': return m.leafFrac >= 0.6 && m.cabinFrac >= 0.5;
      case 'deep': return m.leafFrac >= 0.4;
      case 'city': return m.structFrac >= 0.55;
      case 'refinery': return this.tanksExploded === 0;
      case 'reservoir': return m.leafFrac >= 0.4;
      default: return true;
    }
  }

  checkFail() {
    const s = this.scene;
    if (!s) return null;
    const m = this.metrics();
    if (s.id === 'city' && m.structFrac < 0.55) return 'Too much of the city was lost.';
    if (s.id === 'deep' && m.leafFrac < 0.4) return 'Too much forest burned.';
    if (s.id === 'cabin' && m.cabinFrac < 0.5) return 'The cabin burned down.';
    if (s.id === 'cabin' && m.leafFrac < 0.6) return 'Too many pines burned.';
    if (s.id === 'reservoir' && m.leafFrac < 0.4) return 'Too much forest burned.';
    if (s.id === 'refinery' && this.tanksExploded > 0) return 'A tank BLEVE took the refinery.';
    return null;
  }

  takeEvents() { const e = this.events; this.events = []; return e; }
  takeDirty() { const d = this.dirty; this.dirty = []; return d; }
}

window.EMBER = window.EMBER || {};
window.EMBER.SX = SX; window.EMBER.SY = SY; window.EMBER.SZ = SZ; window.EMBER.CS = CS;
window.EMBER.MAT = MAT; window.EMBER.MATS = MATS; window.EMBER.SCENES = SCENES; window.EMBER.FIRESTORM = FIRESTORM;
window.EMBER.World = World;
