/* ============================================================
   EMBER · city landmarks
   connected high-rises · oil refinery · reservoir & dam
   ============================================================ */
'use strict';

function citySet(s, x, y, m, cells) {
  if (x < 1 || y < 1 || x > W - 2 || y > H - 2) return;
  const i = y * W + x;
  s.setMat(i, m);
  if (cells && (m === GLASS || m === WOOD)) cells.push(i);
}

/* ------------------------------------------------ reservoir & dam */
function buildReservoir(s, cells) {
  const base = 107;
  // lake
  for (let x = 2; x <= 55; x++) {
    for (let y = 76; y <= 105; y++) {
      const i = y * W + x;
      if (s.mat[i] === AIR) s.setMat(i, WATER);
    }
  }
  // dam wall, thicker at the base
  for (let y = 70; y <= base; y++) {
    const t = 3 + Math.floor((y - 70) / 9);
    for (let x = 56; x < 56 + t; x++) citySet(s, x, y, CONCRETE, cells);
  }
  // crest walkway, gatehouse and rail
  for (let x = 51; x <= 69; x++) {
    citySet(s, x, 67, CONCRETE, cells);
    citySet(s, x, 66, CONCRETE, cells);
  }
  for (let x = 52; x <= 68; x += 3) citySet(s, x, 64, METAL, cells);
  for (let y = 61; y <= 66; y++) {
    for (let x = 57; x <= 62; x++) {
      const edge = y === 61 || y === 66 || x === 57 || x === 62;
      citySet(s, x, y, edge ? CONCRETE : GLASS, cells);
    }
  }
  // buttresses on the dry face
  for (let y = 78; y <= 104; y += 12) {
    for (let yy = y; yy <= y + 5; yy++) {
      citySet(s, 62, yy, CONCRETE, cells);
      citySet(s, 63, yy, CONCRETE, cells);
    }
  }
  // spillway gate
  for (let y = 67; y <= 72; y++) citySet(s, 65, y, METAL, cells);
  citySet(s, 65, 66, METAL, cells);
  citySet(s, 59, 60, LAMP, cells);
  // hydro-electric station
  buildOffice(s, 67, base, 13, 11, cells);
  // penstock
  for (let x = 60; x <= 67; x++) citySet(s, x, 98, METAL, cells);
  // little pier and boat
  for (let x = 16; x <= 28; x++) citySet(s, x, 75, WOOD, cells);
  for (const px of [17, 22, 27]) {
    for (let y = 76; y <= 79; y++) citySet(s, px, y, METAL, cells);
  }
  citySet(s, 24, 74, LAMP, cells);
  for (let x = 33; x <= 38; x++) citySet(s, x, 75, WOOD, cells);
  for (let x = 34; x <= 37; x++) citySet(s, x, 74, WOOD, cells);
  for (let y = 70; y <= 73; y++) citySet(s, 36, y, METAL, cells);
  citySet(s, 36, 69, LAMP, cells);
  // small service tank
  for (let x = 74; x <= 78; x++) for (let y = 100; y <= 105; y++)
    citySet(s, x, y, CONCRETE, cells);
}

/* ------------------------------------------------------ buildings */
function buildOffice(s, x0, base, w, h, cells) {
  const top = base - h;
  const x1 = x0 + w;
  for (let y = top; y <= base; y++) {
    const floor = (y - top) % 4 === 0;
    for (let x = x0; x <= x1; x++) {
      const edge = x === x0 || x === x1 || y === top || y === base;
      let m = CONCRETE;
      if (!edge && !floor) m = GLASS;
      citySet(s, x, y, m, cells);
    }
    if (floor && y > top + 1) {
      citySet(s, x0 + 3, y - 1, WOOD, cells);
      citySet(s, x1 - 3, y - 1, WOOD, cells);
    }
  }
  // service core / furniture spine
  for (let y = top + 2; y < base; y++) citySet(s, x0 + 3, y, WOOD, cells);
  // entrance
  for (let y = base - 3; y <= base; y++) {
    for (let x = x0 + Math.floor(w / 2) - 1; x <= x0 + Math.floor(w / 2) + 1; x++) {
      citySet(s, x, y, AIR, cells);
    }
  }
  // roof lip
  for (let x = x0 - 1; x <= x1 + 1; x++) citySet(s, x, top - 1, CONCRETE, cells);
}

function buildTower(s, cx, base, w, h, cells, antenna, cladSide = 'left') {
  const left = cx - Math.floor(w / 2);
  const right = left + w - 1;
  const top = base - h;
  const cladX = cladSide === 'right' ? right : left;
  for (let y = top; y <= base; y++) {
    const dy = y - top;
    const floor = dy === 0 || dy === 1 || dy % 6 === 0 || y === base;
    for (let x = left; x <= right; x++) {
      let m;
      if (dy < 2) m = CONCRETE;
      else if (floor) m = CONCRETE;
      else if (x === left || x === right || (x - left) % 6 === 0) m = CONCRETE;
      else m = GLASS;
      citySet(s, x, y, m, cells);
    }
    if (floor && dy > 2) {
      // timber floor band and balconies
      for (let x = left + 1; x <= right - 1; x++) citySet(s, x, y - 1, WOOD, cells);
    }
  }
  // flammable cladding strip runs up the facade
  for (let y = top + 3; y < base; y++) citySet(s, cladX, y, WOOD, cells);

  // crown / antenna
  for (let x = left + 3; x <= right - 3; x++) {
    citySet(s, x, top - 2, CONCRETE, cells);
    citySet(s, x, top - 3, CONCRETE, cells);
  }
  if (antenna) {
    for (let y = top - antenna; y < top - 3; y++) citySet(s, cx, y, METAL, cells);
    citySet(s, cx, top - antenna - 1, LAMP, cells);
  }
}

function buildSkybridge(s, x0, x1, y, cells) {
  for (let x = x0; x <= x1; x++) {
    citySet(s, x, y, CONCRETE, cells);
    citySet(s, x, y + 1, WOOD, cells);
    citySet(s, x, y + 2, GLASS, cells);
    citySet(s, x, y + 3, CONCRETE, cells);
  }
}

function buildSkyline(s, cells) {
  // connected podium
  const p0 = 86, p1 = 174, pBase = 107, pTop = 99;
  for (let y = pTop; y <= pBase; y++) {
    const floor = (y - pTop) % 4 === 0;
    for (let x = p0; x <= p1; x++) {
      const edge = x === p0 || x === p1 || y === pTop || y === pBase;
      let m = CONCRETE;
      if (!edge && !floor) m = GLASS;
      citySet(s, x, y, m, cells);
    }
    if (floor && y > pTop + 1) {
      for (let x = p0 + 4; x < p1; x += 11) citySet(s, x, y - 1, WOOD, cells);
    }
  }
  // three towers, connected
  buildTower(s, 101, 107, 24, 88, cells, 9, 'left');
  buildTower(s, 133, 107, 26, 102, cells, 4, 'right');
  buildTower(s, 162, 107, 20, 74, cells, 11, 'left');
  buildSkybridge(s, 112, 120, 62, cells);
  buildSkybridge(s, 145, 152, 80, cells);
  // rooftop plant boxes
  for (let x = 96; x <= 106; x += 3) citySet(s, x, 17, METAL, cells);
  // street lamps
  for (const lx of [82, 177]) {
    for (let y = 100; y <= 106; y++) citySet(s, lx, y, METAL, cells);
    citySet(s, lx, 99, LAMP, cells);
    citySet(s, lx - 1, 99, METAL, cells);
  }
}

/* ------------------------------------------------------- refinery */
function buildTank(s, cx, base, r, h, cells) {
  const top = base - h;
  for (let y = top; y <= base; y++) {
    const p = (y - top) / h;
    let half = r;
    if (p < 0.22) {
      const q = 1 - (0.22 - p) / 0.22;
      half = Math.max(2, Math.round(r * Math.sqrt(Math.max(0, 1 - q * q))));
    }
    for (let x = cx - half; x <= cx + half; x++) {
      const border = Math.abs(x - cx) >= half - 1 || y === top || y === base || y === base - 1;
      citySet(s, x, y, border ? METAL : OIL, cells);
    }
  }
  // vent + rim
  for (let x = cx - 2; x <= cx + 2; x++) citySet(s, x, top + 1, AIR, cells);
  for (let x = cx - 3; x <= cx + 3; x++) {
    citySet(s, x, top, METAL, cells);
    if (Math.abs(x - cx) === 3) citySet(s, x, top + 1, METAL, cells);
  }
  // ladder stripe
  for (let y = top + 3; y < base; y += 2) citySet(s, cx + r - 1, y, METAL, cells);
}

function buildRefinery(s, cells) {
  const base = 107;
  // concrete yard
  for (let x = 175; x <= 238; x++) {
    citySet(s, x, base - 1, CONCRETE, cells);
    citySet(s, x, base, CONCRETE, cells);
  }
  // control building
  buildOffice(s, 176, base, 14, 10, cells);
  // storage tanks
  buildTank(s, 203, base, 9, 17, cells);
  buildTank(s, 221, base, 7, 14, cells);
  // distillation columns
  for (let y = 60; y < base; y++) {
    for (let x = 231; x <= 235; x++) citySet(s, x, y, METAL, cells);
  }
  for (let y = 58; y <= 60; y++) for (let x = 232; x <= 234; x++) citySet(s, x, y, METAL, cells);
  for (const py of [68, 78, 88, 98]) {
    for (let x = 229; x <= 237; x++) citySet(s, x, py, METAL, cells);
  }
  // pipes
  for (let x = 213; x <= 231; x++) citySet(s, x, 94, METAL, cells);
  for (let x = 229; x <= 232; x++) citySet(s, x, 90, METAL, cells);
  for (let y = 94; y <= 106; y++) citySet(s, 226, y, METAL, cells);
  // flare stack with a three-cell burner boom
  for (let y = 44; y < base; y++) citySet(s, 238, y, METAL, cells);
  for (let x = 236; x <= 238; x++) citySet(s, x, 44, METAL, cells);
  for (let x = 236; x <= 238; x++) {
    citySet(s, x, 43, OIL, cells);
    const fi = 43 * W + x;
    s.fuel[fi] = 999;
    s.burn[fi] = 1;
    s.temp[fi] = 840;
    s.boom[fi] = 1;
    s.ignoredFire.add(fi);
    s.flame[fi - W] = 0.5;
  }
  // oil spill by the tanks
  for (let x = 191; x <= 195; x++) {
    for (let y = 104; y <= 105; y++) {
      if (s.mat[y * W + x] === AIR || s.mat[y * W + x] === CONCRETE) citySet(s, x, y, OIL, cells);
    }
  }
  // safety valves
  for (const vx of [197, 214, 228]) citySet(s, vx, 103, METAL, cells);
  // yard floodlights
  for (const lx of [192, 214]) {
    for (let y = 90; y <= 103; y++) citySet(s, lx, y, METAL, cells);
    citySet(s, lx, 89, LAMP, cells);
  }
  // tank gauge lights
  for (const [lx, ly] of [[196, 100], [211, 100], [216, 102], [226, 102]]) citySet(s, lx, ly, LAMP, cells);
  // column beacon
  citySet(s, 233, 57, LAMP, cells);
  // office roof lamp
  citySet(s, 183, 96, LAMP, cells);
}

/* -------------------------------------------------------- scene */
function buildCityScene(s, opts = {}) {
  s.clear();
  s.addGround();
  const collector = [];
  buildReservoir(s, collector);
  buildSkyline(s, collector);
  buildRefinery(s, collector);
  // a park tree between the dam and the city
  s.addPine(80, 107, 18);
  // pavement seams
  for (let x = 79; x <= 175; x += 16) citySet(s, x, 106, CONCRETE);

  // only count glass/wood that actually survived construction
  const seen = new Set();
  const cells = [];
  for (const i of collector) {
    if (seen.has(i)) continue;
    const m = s.mat[i];
    if (m === GLASS || m === WOOD) { seen.add(i); cells.push(i); }
  }
  s.buildings.push({ name: 'City', cells, total: Math.max(1, cells.length) });
  s.wind.x = 0.22;
  s.windTarget = 0.22;
  s.windTimeline = null;

  if (opts.mission) {
    s.igniteArea(90, 72, 3);      // high-rise balcony
    s.igniteArea(179, 100, 2);    // refinery control room
  }
}

/* ============================================================
   Standalone sandbox presets
   ============================================================ */

function citySceneFinish(s, cells, wind = 0.2) {
  const seen = new Set();
  const out = [];
  for (const i of cells) {
    if (seen.has(i)) continue;
    const m = s.mat[i];
    if (m === GLASS || m === WOOD) { seen.add(i); out.push(i); }
  }
  s.buildings.push({ name: 'City', cells: out, total: Math.max(1, out.length) });
  s.wind.x = wind;
  s.windTarget = wind;
  s.windTimeline = null;
  s.firePower = 1;
  s.rainTimer = 0;
}

function buildCityOnly(s) {
  s.clear();
  s.addGround();
  const cells = [];
  buildSkyline(s, cells);
  // a fourth, shorter tower linked by a bridge
  buildTower(s, 198, 107, 18, 48, cells, 5, 'right');
  buildSkybridge(s, 171, 189, 70, cells);
  // low-rise blocks and a pocket park
  buildOffice(s, 18, 107, 26, 18, cells);
  buildOffice(s, 214, 107, 22, 12, cells);
  s.addPine(54, 107, 30);
  s.addPine(72, 107, 20);
  for (let x = 10; x <= 230; x += 8) citySet(s, x, 106, CONCRETE);
  citySceneFinish(s, cells, 0.2);
}

function buildCoolingTower(s, cx, base, top, cells) {
  const h = base - top;
  for (let y = top; y <= base; y++) {
    const t = (y - top) / h;
    const half = Math.max(4, Math.round(10 + 1.5 * t - 5 * Math.sin(Math.PI * t * 0.86)));
    for (let x = cx - half; x <= cx + half; x++) {
      const edge = Math.abs(x - cx) >= half - 2 || y === base || y === top;
      const inner = y < top + 3 ? AIR : CHAR;
      citySet(s, x, y, edge ? CONCRETE : inner, cells);
    }
  }
  citySet(s, cx - 3, top, LAMP, cells);
  citySet(s, cx + 3, top, LAMP, cells);
  citySet(s, cx - 4, top + 1, LAMP, cells);
  citySet(s, cx + 4, top + 1, LAMP, cells);
  for (let x = cx - 5; x <= cx + 5; x += 5) citySet(s, x, base - 1, CONCRETE, cells);
  // seed the steam plume
  for (let k = -2; k <= 2; k++) {
    const i = (53) * W + cx + k;
    if (s.mat[i] === AIR) s.smoke[i] = 0.5;
  }
}

function buildColumn(s, cx, base, h, cells) {
  const top = base - h;
  for (let y = top; y <= base; y++) {
    for (let x = cx - 2; x <= cx + 2; x++) citySet(s, x, y, METAL, cells);
  }
  for (let y = top + 8; y < base; y += 12) {
    for (let x = cx - 4; x <= cx + 4; x++) citySet(s, x, y, METAL, cells);
    citySet(s, cx - 4, y - 1, METAL, cells);
    citySet(s, cx + 4, y - 1, METAL, cells);
  }
  for (let x = cx - 1; x <= cx + 1; x++) citySet(s, x, top, METAL, cells);
  citySet(s, cx, top - 1, LAMP, cells);
}

function buildRefineryScene(s) {
  s.clear();
  s.addGround();
  const cells = [];
  const base = 107;
  buildOffice(s, 10, base, 24, 12, cells);
  // tank farm
  buildTank(s, 60, base, 11, 22, cells);
  buildTank(s, 92, base, 11, 22, cells);
  buildTank(s, 124, base, 12, 24, cells);
  // cooling tower and steam
  buildCoolingTower(s, 154, base, 54, cells);
  s.steamVents.push({ x: 154, y: 53 });
  // tall process towers
  buildColumn(s, 180, base, 90, cells);
  buildColumn(s, 196, base, 66, cells);
  // chimney
  for (let y = 8; y < base; y++) {
    for (let x = 208; x <= 212; x++) citySet(s, x, y, CONCRETE, cells);
  }
  for (let x = 207; x <= 213; x++) citySet(s, x, 7, CONCRETE, cells);
  citySet(s, 210, 6, LAMP, cells);
  // flare stack
  for (let y = 20; y < base; y++) citySet(s, 232, y, METAL, cells);
  for (let x = 230; x <= 232; x++) citySet(s, x, 20, METAL, cells);
  for (let x = 230; x <= 232; x++) {
    citySet(s, x, 19, OIL, cells);
    const fi = 19 * W + x;
    s.fuel[fi] = 999;
    s.burn[fi] = 1;
    s.temp[fi] = 840;
    s.boom[fi] = 1;
    s.ignoredFire.add(fi);
    s.flame[fi - W] = 0.5;
  }
  // pipework
  for (let x = 138; x <= 174; x++) citySet(s, x, 94, METAL, cells);
  for (let x = 182; x <= 194; x++) citySet(s, x, 94, METAL, cells);
  for (let x = 200; x <= 208; x++) citySet(s, x, 94, METAL, cells);
  for (let x = 168; x <= 230; x++) citySet(s, x, 70, METAL, cells);
  for (const px of [140, 172, 186, 202, 220]) {
    for (let y = 70; y <= 104; y++) citySet(s, px, y, METAL, cells);
  }
  // spill puddles
  for (const [a, b] of [[72, 76], [104, 108], [138, 142]]) {
    for (let x = a; x <= b; x++) {
      for (let y = 104; y <= 105; y++) citySet(s, x, y, OIL, cells);
    }
  }
  // floodlights
  for (const lx of [44, 76, 108, 140, 172, 200, 226]) {
    for (let y = 92; y <= 104; y++) citySet(s, lx, y, METAL, cells);
    citySet(s, lx, 91, LAMP, cells);
  }
  s.addPine(4, 107, 18);
  citySceneFinish(s, cells, 0.22);
}

function buildReservoirScene(s) {
  s.clear();
  s.addGround();
  const cells = [];
  const base = 107;
  // lake
  for (let x = 2; x <= 113; x++) {
    for (let y = 72; y <= 105; y++) {
      const i = y * W + x;
      if (s.mat[i] === AIR) s.setMat(i, WATER);
    }
  }
  // dam wall, thick gravity profile
  for (let y = 56; y <= base; y++) {
    const t = 8 + Math.floor((y - 56) / 5);
    for (let x = 114; x < 114 + t; x++) citySet(s, x, y, CONCRETE, cells);
  }
  // crest road + rail
  for (let x = 104; x <= 140; x++) {
    citySet(s, x, 55, CONCRETE, cells);
    citySet(s, x, 54, CONCRETE, cells);
  }
  for (let x = 105; x <= 139; x += 4) citySet(s, x, 52, METAL, cells);
  // gatehouse on the crest
  for (let y = 44; y <= 53; y++) {
    for (let x = 116; x <= 122; x++) {
      const edge = y === 44 || y === 53 || x === 116 || x === 122;
      citySet(s, x, y, edge ? CONCRETE : GLASS, cells);
    }
  }
  citySet(s, 116, 49, WOOD, cells);
  citySet(s, 122, 49, WOOD, cells);
  citySet(s, 119, 43, LAMP, cells);
  // buttresses on the dry face
  for (const by of [78, 90, 100]) {
    for (let y = by; y <= by + 5; y++) {
      citySet(s, 128, y, CONCRETE, cells);
      citySet(s, 129, y, CONCRETE, cells);
    }
  }
  // spillway channel
  for (let y = 56; y <= base; y++) {
    citySet(s, 132, y, CONCRETE, cells);
    citySet(s, 139, y, CONCRETE, cells);
    if (y % 9 === 0) {
      for (let x = 132; x <= 139; x++) citySet(s, x, y, CONCRETE, cells);
    }
  }
  for (let y = 54; y <= 59; y++) citySet(s, 135, y, METAL, cells);
  // hydro station
  buildOffice(s, 144, base, 20, 16, cells);
  for (let x = 143; x <= 165; x++) citySet(s, x, 90, METAL, cells);
  for (let x = 126; x <= 144; x++) citySet(s, x, 96, METAL, cells);
  for (let x = 146; x <= 152; x++) {
    for (let y = 98; y <= 104; y++) citySet(s, x, y, METAL, cells);
  }
  // tailrace river
  for (let x = 165; x <= 208; x++) {
    for (let y = 104; y <= 105; y++) {
      if (s.mat[y * W + x] === AIR) citySet(s, x, y, WATER, cells);
    }
  }
  // pier, boat
  for (let x = 40; x <= 54; x++) citySet(s, x, 71, WOOD, cells);
  for (const px of [41, 47, 53]) {
    for (let y = 72; y <= 75; y++) citySet(s, px, y, METAL, cells);
  }
  citySet(s, 49, 70, LAMP, cells);
  for (let x = 58; x <= 63; x++) citySet(s, x, 71, WOOD, cells);
  for (let x = 59; x <= 62; x++) citySet(s, x, 70, WOOD, cells);
  for (let y = 66; y <= 69; y++) citySet(s, 61, y, METAL, cells);
  citySet(s, 61, 65, LAMP, cells);
  // forest on the far bank
  const xs = [174, 190, 206, 220, 232, 240];
  const hs = [30, 52, 38, 64, 44, 28];
  xs.forEach((x, i) => s.addPine(x, 107, hs[i]));
  // shoreline rocks
  for (const [x, y] of [[20, 105], [64, 105], [92, 105], [108, 104], [120, 104]]) {
    citySet(s, x, y, STONE, cells);
    citySet(s, x + 1, y, STONE, cells);
  }
  // station lamp
  citySet(s, 162, 89, LAMP, cells);
  citySceneFinish(s, cells, 0.18);
}

function buildDeepForestScene(s) {
  s.clear();
  s.addGround();
  const xs = [8, 24, 40, 56, 72, 88, 104, 120, 136, 152, 168, 184, 200, 216, 232];
  const hs = [60, 44, 80, 34, 96, 52, 70, 40, 88, 30, 64, 48, 76, 38, 56];
  xs.forEach((x, i) => {
    if (x > 98 && x < 128) return; // central clearing
    s.addPine(x, 107, hs[i]);
  });
  // clearing details
  for (const [x, y] of [[108, 104], [112, 105], [120, 104]]) {
    citySet(s, x, y, STONE, null);
  }
  s.addPine(100, 107, 20);
  s.addPine(128, 107, 16);
  s.wind.x = 0.15;
  s.windTarget = 0.15;
  s.windTimeline = null;
  s.firePower = 1;
  s.rainTimer = 0;
}

function buildBlankScene(s) {
  s.clear();
  s.addGround();
  s.wind.x = 0.15;
  s.windTarget = 0.15;
  s.windTimeline = null;
  s.firePower = 1;
  s.rainTimer = 0;
}
