/* ============================================================
   EMBER · interface, audio, missions, game loop
   ============================================================ */
'use strict';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const sim = new Simulation();
const savedQuality = (() => {
  try { const q = Number(localStorage.getItem('ember-quality')); return q === 1 || q === 3 ? q : 2; }
  catch (e) { return 2; }
})();
Renderer.init(savedQuality);

const TOOLS = [
  {
    id: 'wood', name: 'Wood', key: '1', accent: '#d29a63',
    hint: 'Wood · fuel; it burns down to char',
    icon: '<rect x="2.5" y="8" width="14.5" height="8" rx="4"/><ellipse cx="18" cy="12" rx="2.7" ry="4"/><path d="M6 10.2h7.5"/>',
  },
  {
    id: 'pine', name: 'Pine', key: '2', accent: '#8cc46f',
    hint: 'Plant a pine · the canopy catches fast',
    icon: '<path d="M12 3 7.2 10.8h3L5.8 17h12.4l-4.4-6.2h3z"/><path d="M12 17v3.5"/>',
  },
  {
    id: 'stone', name: 'Stone', key: '3', accent: '#9da9b6',
    hint: 'Stone wall · blocks fire completely; build a firebreak',
    icon: '<path d="m3.6 15.2 1.9-5.9 4.9-3 5.8 1.9 3 5-2.2 4.1H5.6z"/><path d="m9 6.3 1.1 4.8 5-2.5"/>',
  },
  {
    id: 'water', name: 'Water', key: '4', accent: '#4cc3ff',
    hint: 'Water · cools and puts out fire; refills slowly in missions',
    icon: '<path d="M12 2.8s6 6.5 6 10.1a6 6 0 0 1-12 0C6 9.3 12 2.8 12 2.8z"/><path d="M9.6 13.4a2.4 2.4 0 0 0 2.4 2.4"/>',
  },
  {
    id: 'oil', name: 'Oil', key: '5', accent: '#d8b25f',
    hint: 'Oil · ignites fast and explodes',
    icon: '<path d="M7.5 4.2h9v3l2.2 3.2v8.6H5.3V10.4L7.5 7.2z"/><path d="M5.3 12.6h13.4"/><path d="M9 4.2V2h6v2.2"/>',
  },
  {
    id: 'fire', name: 'Ignite', key: '6', accent: '#ff8a4a',
    hint: 'Ignite · set nearby fuel alight; wind helps',
    icon: '<path d="M12 2.6c2.6 3.9 5 5.4 5 9a5 5 0 0 1-10 0c0-2 1-3.6 2.8-5.2.4 1.7 1 2.8 2 3.5.4-2.2.1-4.6.2-7.3z"/>',
  },
  {
    id: 'wind', name: 'Wind', key: '7', accent: '#8ad3ff',
    hint: 'Drag to blow · push the fire where you want',
    icon: '<path d="M2.8 8.2h8.6a2.8 2.8 0 1 0-2.8-2.8"/><path d="M2.8 12.2h12.4a2.6 2.6 0 1 1-2.6 2.6"/><path d="M2.8 16.2h5.6"/>',
  },
  {
    id: 'erase', name: 'Erase', key: '8', accent: '#b3bcc7',
    hint: 'Erase · clear the materials here',
    icon: '<path d="m5 15.6 6.2-6.2 6.2 6.2-3.2 3.2H8.2z"/><path d="m9.3 9.3 6.2 6.2"/><path d="M3 21h18"/>',
  },
];

const MISSIONS = [
  {
    id: 'cabin', name: 'Cabin Watch', tag: 'Intro',
    brief: 'A campfire caught the pines and the wind is pushing it toward the cabin. Put out the flames and save the cabin and 60% of the trees.',
    goal: 'Extinguish all fires · Trees ≥ 60% · Save the cabin',
    hint: 'Tip: soak the trunks first, then the canopy — fire will not jump as easily.',
    time: 110, water: 170, refill: 4.5, type: 'clear',
    minTrees: 0.6, star2: 0.78, star3: 0.94, rain: 0, cabins: true,
    windFn: (t) => 0.34 + Math.sin(t * 0.25) * 0.12,
    setup(s) {
      s.addGround();
      s.addPine(38, 107, 76);
      s.addPine(66, 107, 56);
      s.addPine(96, 107, 34);
      s.addCabin(152, 107, 46, 28);
      s.addPine(206, 107, 70);
      s.addPine(232, 107, 44);
      s.igniteArea(66, 76, 6);
    },
  },
  {
    id: 'line', name: 'Firebreak', tag: 'Contain',
    brief: 'Dry grass connects the whole pine grove and a strong wind is driving the flames right. Cut a firebreak before the forest burns down.',
    goal: 'Extinguish all fires · Trees ≥ 55%',
    hint: 'Tip: cut across the grass with stone; the fire cannot cross. Wet the seams.',
    time: 120, water: 200, refill: 5, type: 'clear',
    minTrees: 0.55, star2: 0.7, star3: 0.88, rain: 0,
    windFn: (t) => 0.72 + Math.sin(t * 0.33) * 0.14,
    setup(s) {
      s.addGround();
      s.addGrassLine(GROUND_Y, 4, W - 4);
      const xs = [96, 120, 142, 164, 186, 208, 230];
      xs.forEach((x, i) => s.addPine(x, 107, 34 + ((i * 9) % 24)));
      s.addOilDrum(22, 106);
      s.igniteArea(22, 102, 4);
    },
  },
  {
    id: 'spot', name: 'Spot Fires', tag: 'Chaos',
    brief: 'Two ignitions, two oil drums, two cabins. The wind keeps shifting — embers can land behind you.',
    goal: 'Extinguish all fires · Trees ≥ 65% · Both cabins',
    hint: 'Tip: oil drums explode. Soak them first, or ring them with stone.',
    time: 120, water: 230, refill: 5.5, type: 'clear',
    minTrees: 0.65, star2: 0.8, star3: 0.94, rain: 1, cabins: true,
    windFn: (t) => 0.72 * Math.tanh(Math.sin(t * 0.19 + 1.2) * 3),
    setup(s) {
      s.addGround();
      s.addCabin(76, 107, 34, 24);
      s.addCabin(196, 107, 34, 24);
      s.addPine(30, 107, 56);
      s.addPine(108, 107, 42);
      s.addPine(140, 107, 60);
      s.addPine(170, 107, 34);
      s.addPine(222, 107, 50);
      s.addPine(238, 107, 36);
      s.addOilDrum(122, 107);
      s.addOilDrum(158, 107);
      s.igniteArea(30, 77, 5);
      s.igniteArea(140, 76, 5);
    },
  },
  {
    id: 'night', name: 'Long Night', tag: 'Finale',
    brief: 'Three fires are out of control and the storm will not let up. You have three rains and one firebreak.',
    goal: 'Save 40% of the forest · Survive 150s',
    hint: 'Tip: rain douses a wide area; save it for the worst moment.',
    time: 150, water: 280, refill: 5.5, type: 'hold',
    minTrees: 0.4, star2: 0.55, star3: 0.75, rain: 3,
    windFn: (t) => 0.35 * Math.sin(t * 0.21 + 2) + 0.18 * Math.sin(t * 1.1) + 0.12,
    setup(s) {
      s.addGround();
      const hs = [40, 58, 40, 58, 40, 58, 40, 58];
      [22, 50, 80, 112, 140, 178, 206, 232].forEach((x, i) => s.addPine(x, 107, hs[i]));
      s.addCabin(160, 107, 36, 24);
      s.addOilDrum(96, 107);
      s.igniteArea(50, 76, 5);
      s.igniteArea(140, 84, 5);
      s.igniteArea(206, 84, 5);
    },
  },
  {
    id: 'city', name: 'City on Fire', tag: 'City',
    brief: 'A high-rise is burning and the refinery control room is smoking. Put out every fire before the tanks chain-explode and take the city with them.',
    goal: 'Extinguish all fires · City integrity ≥ 55%',
    hint: 'Tip: cut the oil spill with stone, soak the tanks, and if things go bad, erase the dam to flood the refinery.',
    time: 150, water: 320, refill: 6, type: 'clear',
    metric: 'buildings', minMetric: 0.55, star2: 0.7, star3: 0.88, rain: 2,
    windFn: (t) => 0.22 + Math.sin(t * 0.2) * 0.18,
    setup(s) { buildCityScene(s, { mission: true }); },
  },
];

const SMOTHER_DIFFS = [
  { id: 'easy', name: 'Easy', total: 8, interval: 7, maxActive: 2, maxFire: 500, time: 120, power: 0.8, blurb: '8 ignitions, a slow burn' },
  { id: 'medium', name: 'Medium', total: 14, interval: 5, maxActive: 4, maxFire: 700, time: 150, power: 1.0, blurb: '14 ignitions, the fire starts chasing you' },
  { id: 'hard', name: 'Hard', total: 22, interval: 3.5, maxActive: 6, maxFire: 950, time: 180, power: 1.2, blurb: '22 ignitions, the fire runs' },
  { id: 'hell', name: 'Hell', total: 32, interval: 2.4, maxActive: 9, maxFire: 1300, time: 210, power: 1.45, blurb: '32 ignitions, no breathing room' },
];

const G = {
  mode: 'sandbox',
  scene: 'city',
  mission: null,
  missionIndex: -1,
  smother: null,
  ended: false,
  paused: false,
  modalOpen: false,
  speed: 1,
  tool: 'wood',
  brush: 6,
  timeLeft: 0,
  water: Infinity,
  refill: 0,
  score: 0,
  combo: 0,
  comboT: 0,
  calm: 0,
  rainCharges: 0,
  rainCD: 0,
  fps: 60,
  uiAcc: 0,
  painting: false,
  lastCell: null,
  lastTree: null,
  lastExt: 0,
  lastPopup: 0,
  lastEmptyWarn: 0,
  lastWindSign: 1,
  missionToken: 0,
  missionStart: 0,
  countdown: 0,
  tipShown: false,
};

/* ------------------------------------------------------------- audio */
const Sfx = {
  on: true,
  ctx: null,
  master: null,
  noise: null,
  fireGain: null,
  windGain: null,
  waterGain: null,
  fire: 0,
  wind: 0,
  water: false,
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { this.on = false; return; }
      this.ctx = new AC();
      const ctx = this.ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.on ? 0.55 : 0;
      this.master.connect(ctx.destination);

      const len = Math.floor(ctx.sampleRate * 2);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;

      const layer = (type, freq, q) => {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = q;
        const g = ctx.createGain();
        g.gain.value = 0;
        src.connect(f);
        f.connect(g);
        g.connect(this.master);
        src.start();
        return g;
      };
      this.fireGain = layer('bandpass', 480, 0.7);
      this.windGain = layer('lowpass', 300, 0.4);
      this.waterGain = layer('bandpass', 1500, 1.1);
      this.crackleTimer = setInterval(() => this.crackle(), 170);
    } catch (err) {
      this.on = false;
    }
  },
  update(fire, wind, water) {
    this.fire = fire;
    this.wind = wind;
    this.water = water;
    if (!this.ctx || !this.fireGain) return;
    const t = this.ctx.currentTime;
    this.fireGain.gain.setTargetAtTime(this.on ? fire * 0.13 : 0, t, 0.25);
    this.windGain.gain.setTargetAtTime(this.on ? wind * 0.09 : 0, t, 0.5);
    this.waterGain.gain.setTargetAtTime(this.on && water ? 0.085 : 0, t, 0.08);
  },
  crackle() {
    if (!this.on || !this.ctx || this.fire < 0.04) return;
    if (Math.random() > 0.55 + this.fire * 0.4) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 260 + Math.random() * 1100;
    f.Q.value = 1.5 + Math.random() * 3;
    const g = ctx.createGain();
    const peak = (0.02 + this.fire * 0.06) * (0.35 + Math.random() * 0.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + Math.random() * 0.12);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t, Math.random() * 1.6, 0.25);
  },
  boom() {
    if (!this.on || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(92, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 1.05);

    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 700;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.4, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    src.connect(f);
    f.connect(ng);
    ng.connect(this.master);
    src.start(t, 0.2, 0.7);
  },
  chime(win) {
    if (!this.on || !this.ctx) return;
    const ctx = this.ctx;
    const notes = win ? [523.25, 659.25, 783.99] : [392, 311, 233];
    notes.forEach((n, i) => {
      const t = ctx.currentTime + i * 0.13;
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = n;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + 0.75);
    });
  },
  click() {
    if (!this.on || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = 760;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.04, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.06);
  },
  toggle() {
    this.on = !this.on;
    if (this.ctx) this.master.gain.setTargetAtTime(this.on ? 0.55 : 0, this.ctx.currentTime, 0.05);
    $('soundBtn').classList.toggle('off', !this.on);
    if (this.on) { this.ensure(); this.click(); }
  },
};

/* --------------------------------------------------------------- utils */
function formatTime(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function toast(msg, warm = false) {
  const wrap = $('toasts');
  const el = document.createElement('div');
  el.className = 'toast' + (warm ? ' warm' : '');
  el.textContent = msg;
  wrap.appendChild(el);
  while (wrap.children.length > 3) wrap.firstChild.remove();
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 400);
  }, 2600);
}

function popup(text, cellX, cellY, big) {
  const r = stage.getBoundingClientRect();
  if (!r.width) return;
  const el = document.createElement('span');
  el.className = 'popup' + (big ? ' big' : '');
  el.textContent = text;
  el.style.left = (cellX / W) * r.width + 'px';
  el.style.top = (cellY / H) * r.height + 'px';
  $('popups').appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

function buildToolGrid() {
  const grid = $('toolGrid');
  grid.innerHTML = TOOLS.map((t) => `
    <button class="tool-btn" data-tool="${t.id}" style="--accent:${t.accent}" title="${t.hint}" type="button">
      <span class="key">${t.key}</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg>
      <span>${t.name}</span>
    </button>`).join('');
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tool]');
    if (!btn) return;
    setTool(btn.dataset.tool);
    Sfx.ensure();
    Sfx.click();
  });
}

function setTool(id) {
  if (G.mode === 'smother' && id !== 'wood') return;
  G.tool = id;
  const tool = TOOLS.find((t) => t.id === id);
  document.querySelectorAll('.tool-btn').forEach((b) => b.classList.toggle('active', b.dataset.tool === id));
  $('footHint').innerHTML = tool ? tool.hint : '';
  const ring = $('brushRing');
  if (tool) {
    ring.style.borderColor = tool.accent + 'cc';
    ring.style.boxShadow = `0 0 18px ${tool.accent}22, 0 0 0 1px rgba(0,0,0,.3)`;
  }
  updateBrushRing();
}

function updateBrushRing() {
  const r = stage.getBoundingClientRect();
  if (!r.width) return;
  const px = (G.brush * 2 / W) * r.width;
  const ring = $('brushRing');
  ring.style.width = px + 'px';
  ring.style.height = px + 'px';
}

/* -------------------------------------------------------------- layout */
function layoutStage() {
  if (window.innerWidth <= 980) {
    stage.style.width = '';
    stage.style.height = '';
    updateBrushRing();
    return;
  }
  const area = document.querySelector('.stage-area');
  const rect = area.getBoundingClientRect();
  const availW = Math.max(320, rect.width);
  const availH = Math.max(240, rect.height - 38);
  const size = Math.min(availW, (availH * 16) / 9);
  stage.style.width = Math.floor(size) + 'px';
  stage.style.height = Math.floor((size * 9) / 16) + 'px';
  updateBrushRing();
}

/* ------------------------------------------------------------- scene */
function buildSandbox() {
  switch (G.scene) {
    case 'blank': buildBlankScene(sim); break;
    case 'forest': buildForest(); break;
    case 'deep': buildDeepForestScene(sim); break;
    case 'refinery': buildRefineryScene(sim); break;
    case 'reservoir': buildReservoirScene(sim); break;
    case 'city':
    default: buildCityOnly(sim); break;
  }
}

function buildForest() {
  sim.clear();
  sim.addGround();
  sim.addPine(28, 107, 96);
  sim.addPine(60, 107, 64);
  sim.addPine(92, 107, 36);
  sim.addCabin(136, 107, 46, 30);
  sim.addPine(216, 107, 84);
  sim.addPine(236, 107, 50);
  sim.addCampfire(176, 107);
  sim.wind.x = 0.15;
  sim.windTarget = 0.15;
  sim.windTimeline = null;
  sim.firePower = 1;
  sim.rainTimer = 0;
  sim.missionTrees = null;
  sim.missionCabins = null;
}

function startSandbox(silent) {
  closeModal();
  G.mode = 'sandbox';
  G.mission = null;
  G.missionIndex = -1;
  G.smother = null;
  $('fireAlert').hidden = true;
  G.ended = false;
  G.paused = false;
  G.timeLeft = 0;
  G.water = Infinity;
  G.refill = 0;
  G.score = 0;
  G.combo = 0;
  G.comboT = 0;
  G.calm = 0;
  G.rainCharges = 0;
  G.rainCD = 0;
  G.speed = 1;
  G.countdown = 0;
  G.missionToken++;
  $('countdown').hidden = true;
  $('windRange').disabled = false;
  $('powerRange').value = 100;
  sim.firePower = 1;
  buildSandbox();
  $('windRange').value = Math.round(sim.wind.x * 100);
  if (!G.tipShown) {
    const tips = {
      blank: 'Blank canvas: create freely with the 8 tools.<small>Draw wood, build, ignite — then deal with it.</small>',
      forest: 'Draw <strong>wood</strong>, ignite it with <strong>Fire</strong>, then put it out with <strong>Water</strong>.<small>Stone blocks fire · Wind bends it · Try a mission</small>',
      deep: 'Deep forest: nothing but trees.<small>Try wind and firebreaks — or start a forest fire.</small>',
      city: 'City skyline: glass shatters when hot, timber bands carry fire up floor by floor.<small>Try igniting a balcony, or cut it off with stone.</small>',
      refinery: 'Large refinery: tanks chain-explode.<small>Soak the tanks and cut the oil off with stone.</small>',
      reservoir: 'Reservoir: erase the dam to release the water.<small>Or keep it intact and play with wind over the lake.</small>',
    };
    $('stageTip').innerHTML = tips[G.scene] || tips.city;
  }
  setModeUI('sandbox');
  updateMissionChrome();
  updateToolsForMode();
  updateLiveUI(true);
  if (!silent) toast('Back to the sandbox · play with fire');
}

/* ------------------------------------------------------------ painting */
function toCell(e) {
  const r = stage.getBoundingClientRect();
  return {
    x: clamp(((e.clientX - r.left) / r.width) * W, 1, W - 2),
    y: clamp(((e.clientY - r.top) / r.height) * H, 1, H - 2),
  };
}

function warnEmptyWater() {
  const now = performance.now();
  if (now - G.lastEmptyWarn < 1600) return;
  G.lastEmptyWarn = now;
  toast('Tank empty · it refills over time', true);
}

function paintAt(x, y) {
  if (G.tool === 'pine') {
    sim.addPine(Math.round(x), Math.round(y) + 2, 22 + G.brush * 2);
    return;
  }
  if (G.tool === 'water' && G.mode === 'mission') {
    if (G.water <= 0.4) { warnEmptyWater(); return; }
    const budget = Math.floor(G.water / 0.22);
    const used = sim.paint(x, y, G.brush, 'water', { budget });
    G.water = Math.max(0, G.water - used * 0.22);
    return;
  }
  if (G.tool === 'wind') return;
  sim.paint(x, y, G.brush, G.tool, { smother: G.mode === 'smother' });
}

function strokeTo(cell) {
  const prev = G.lastCell;
  if (!prev) {
    paintAt(cell.x, cell.y);
    G.lastCell = cell;
    return;
  }
  const dist = Math.hypot(cell.x - prev.x, cell.y - prev.y);
  if (G.tool === 'wind') {
    let dx = cell.x - prev.x;
    let dy = cell.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    sim.paint(cell.x, cell.y, Math.max(4, G.brush), 'wind', { dx: dx * 0.95, dy: dy * 0.95 });
    G.lastCell = cell;
    return;
  }
  if (G.tool === 'pine') {
    if (!G.lastTree || Math.hypot(cell.x - G.lastTree.x, cell.y - G.lastTree.y) > 11) {
      paintAt(cell.x, cell.y);
      G.lastTree = cell;
    }
    G.lastCell = cell;
    return;
  }
  const steps = Math.max(1, Math.ceil(dist / Math.max(1.2, G.brush * 0.45)));
  for (let k = 1; k <= steps; k++) {
    paintAt(lerp(prev.x, cell.x, k / steps), lerp(prev.y, cell.y, k / steps));
    if (G.mode === 'mission' && G.water <= 0.4 && G.tool === 'water') break;
  }
  G.lastCell = cell;
}

stage.addEventListener('pointerdown', (e) => {
  if (e.button !== undefined && e.button !== 0) return;
  if (e.target.closest('button')) return;
  Sfx.ensure();
  hideTip();
  G.painting = true;
  G.lastTree = null;
  const cell = toCell(e);
  G.lastCell = null;
  strokeTo(cell);
  try { stage.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
});

stage.addEventListener('pointermove', (e) => {
  const cell = toCell(e);
  const r = stage.getBoundingClientRect();
  const ring = $('brushRing');
  ring.hidden = false;
  ring.style.left = e.clientX - r.left + 'px';
  ring.style.top = e.clientY - r.top + 'px';
  if (G.painting) strokeTo(cell);
});

stage.addEventListener('pointerup', () => {
  G.painting = false;
  G.lastCell = null;
  G.lastTree = null;
});

stage.addEventListener('pointercancel', () => {
  G.painting = false;
  G.lastCell = null;
});

stage.addEventListener('pointerleave', () => {
  if (!G.painting) $('brushRing').hidden = true;
});

stage.addEventListener('pointerenter', () => { $('brushRing').hidden = false; });

/* --------------------------------------------------------------- modal */
function openModal(html, sticky) {
  const root = $('modalRoot');
  root.innerHTML = '<div class="modal">' + html + '</div>';
  root.hidden = false;
  G.modalOpen = true;
  root.onclick = (e) => {
    if (e.target === root && !sticky) closeModal();
  };
  root.querySelectorAll('[data-close]').forEach((b) => (b.onclick = closeModal));
}

function closeModal() {
  const root = $('modalRoot');
  root.hidden = true;
  root.innerHTML = '';
  G.modalOpen = false;
  if (G.mode === 'mission') setModeUI('mission');
  else if (G.mode === 'smother') setModeUI('smother');
  else setModeUI('sandbox');
}

function loadProgress() {
  try { return JSON.parse(localStorage.getItem('ember-progress-v1') || '{}'); }
  catch (e) { return {}; }
}
function saveProgress(p) {
  try { localStorage.setItem('ember-progress-v1', JSON.stringify(p)); } catch (e) { /* noop */ }
}

function starsMarkup(n) {
  let s = '';
  for (let i = 0; i < 3; i++) s += `<span class="${i < n ? '' : 'dim'}">★</span>`;
  return s;
}

function openMissions() {
  const progress = loadProgress();
  const items = MISSIONS.map((m, i) => {
    const p = progress[m.id];
    const locked = i > 0 && !(progress[MISSIONS[i - 1].id] && progress[MISSIONS[i - 1].id].stars > 0);
    const best = p ? `Best ${p.score.toLocaleString()}` : locked ? 'Locked' : 'Unplayed';
    return `
      <button class="mission-item" data-mission="${i}" type="button" ${locked ? 'disabled' : ''}>
        <span class="mission-num">${locked ? '🔒' : String(i + 1).padStart(2, '0')}</span>
        <span class="mission-info">
          <h3>${m.name} <span style="color:var(--muted-2);font-size:9px;letter-spacing:.16em;">${m.tag}</span></h3>
          <p>${m.brief}</p>
        </span>
        <span class="mission-meta">
          <span class="stars">${starsMarkup(p ? p.stars : 0)}</span>
          <span class="mission-best">${best}</span>
        </span>
      </button>`;
  }).join('');
  openModal(`
    <div class="modal-head">
      <div>
        <div class="modal-kicker">MISSIONS</div>
        <h2>Firefighting Missions</h2>
        <p class="modal-sub">Fire spreads, wind shifts, drums explode. Finish a mission to unlock the next.</p>
      </div>
      <button class="modal-close" data-close type="button" aria-label="Close">×</button>
    </div>
    <div class="mission-list">${items}</div>
    <div class="help-note">Mission wind is scripted. Stars are based on how much forest or city survives. Progress is saved on this device.</div>
  `);
  $('modalRoot').querySelectorAll('[data-mission]').forEach((b) => {
    b.onclick = () => startMission(Number(b.dataset.mission));
  });
}

function openHelp() {
  openModal(`
    <div class="modal-head">
      <div>
        <div class="modal-kicker">HOW TO PLAY</div>
        <h2>Play with fire. Put it out.</h2>
        <p class="modal-sub">A spreading fluid-fire sandbox. Paint materials, ignite them, then find a way to control it.</p>
      </div>
      <button class="modal-close" data-close type="button" aria-label="Close">×</button>
    </div>
    <div class="help-grid">
      <div class="help-item"><h4><span>🪵</span> Wood &amp; Pines</h4><p>Wood is fuel and burns down to char. Pine canopies are dry and thin — one spark and the fire leaps with the wind.</p></div>
      <div class="help-item"><h4><span>💧</span> Water</h4><p>Water cools, soaks fuel and puts flames out; it turns to steam when hot. Missions have a limited tank that refills over time.</p></div>
      <div class="help-item"><h4><span>🪨</span> Stone</h4><p>Stone is fireproof — a reliable firebreak. Cut across grass or forest and the flames stop. Embers can still fly over.</p></div>
      <div class="help-item"><h4><span>💨</span> Wind</h4><p>Wind pushes flames, smoke and embers downwind. Drag with the Wind tool to steer a fire.</p></div>
      <div class="help-item"><h4><span>🛢️</span> Oil</h4><p>Oil burns hot and fast and explodes when ignited, throwing fire in every direction. Keep flames away from drums.</p></div>
      <div class="help-item"><h4><span>🔥</span> Ignite</h4><p>Ignite fuel or create spot fires. Want to test a firebreak? Light it up.</p></div>
    </div>
    <div class="help-note">
      City: glass shatters when hot and timber floors carry fire up; refinery tanks chain-explode; erase the dam to flood the refinery.<br>
      <strong>Smother mode</strong>: the computer keeps igniting; paint wood onto fire to smother it. Wood anywhere else becomes fuel.<br>
      Shortcuts: <kbd>1</kbd>–<kbd>8</kbd> tools · <kbd>[</kbd> <kbd>]</kbd> brush size · <kbd>Space</kbd> pause · <kbd>M</kbd> mute · <kbd>R</kbd> reset<br>
      Inspired by <em>Fluid Fire 3</em> by Escape Motions (Peter Blaskovic). This version turns the canvas into a firefighting sandbox you can actually win or lose.
    </div>
  `);
}

/* -------------------------------------------------------------- mission */
function startMission(index) {
  const def = MISSIONS[index];
  if (!def) return;
  closeModal();
  G.mode = 'mission';
  G.smother = null;
  $('fireAlert').hidden = true;
  G.mission = def;
  G.missionIndex = index;
  G.ended = false;
  G.paused = false;
  G.timeLeft = def.time;
  G.water = def.water;
  G.refill = def.refill;
  G.score = 0;
  G.combo = 0;
  G.comboT = 0;
  G.calm = 0;
  G.rainCharges = def.rain || 0;
  G.rainCD = 0;
  G.speed = 1;
  G.countdown = 3.6;
  G.lastWindSign = 1;
  G.missionStart = performance.now();
  G.missionToken++;
  G.painting = false;
  G.lastCell = null;
  $('brushRing').hidden = true;
  $('brushRing').style.left = '-120px';
  $('brushRing').style.top = '-120px';
  const token = G.missionToken;

  sim.clear();
  sim.firePower = 1;
  def.setup(sim);
  sim.shake = 0;
  sim.missionTrees = sim.trees.slice();
  sim.missionCabins = sim.cabins.slice();
  sim.missionBuildings = sim.buildings.slice();
  sim.windTimeline = def.windFn || null;
  sim.windTime = 0;
  sim.wind.x = def.windFn ? def.windFn(0) : 0.2;
  sim.windTarget = sim.wind.x;
  sim.rainTimer = 0;
  sim.extinguished = 0;

  setModeUI('mission');
  updateMissionChrome();
  updateToolsForMode();
  $('powerRange').value = 100;
  updateLiveUI(true);
  hideTip();
  toast(`Mission ${index + 1} · ${def.name}`, true);
  setTimeout(() => {
    if (G.missionToken === token && !G.ended) toast(def.hint);
  }, 3600);
  setTimeout(() => Sfx.ensure(), 30);
}

function checkMission(dt) {
  if (G.ended || G.mode !== 'mission') return;
  const tree = sim.treeStats();
  const cs = sim.cabinStats();
  const def = G.mission;
  const metric = def.metric === 'buildings' ? sim.buildingStats() : tree;
  const min = def.minMetric != null ? def.minMetric : def.minTrees;
  const isCity = def.metric === 'buildings';

  if (sim.fireCount === 0) {
    G.calm += dt;
  } else {
    G.calm = 0;
  }

  if (def.cabins && cs.list.some((f) => f < 0.4)) {
    loseMission('The cabin burned down.');
    return;
  }
  if (metric.frac < min - 0.12) {
    loseMission(isCity ? 'Too much of the city was destroyed; the skyline is lost.' : 'Too much forest burned; the line broke.');
    return;
  }

  if (G.calm > 2.2) {
    if (metric.frac >= min) winMission(tree, cs, metric);
    else loseMission(isCity ? 'The fire is out, but the city cannot be saved.' : 'The fire is out, but the forest is lost.');
    return;
  }

  if (G.timeLeft <= 0) {
    if (def.type === 'hold' && metric.frac >= min) winMission(tree, cs, metric);
    else loseMission('Time is up — the fire is still out of control.');
  }
}

function winMission(st, cs, metric) {
  if (G.ended) return;
  G.ended = true;
  G.calm = 0;
  const def = G.mission;
  const used = Math.max(1, def.time - G.timeLeft);
  const treesPct = Math.round(metric.frac * 100);
  const metricLabel = def.metric === 'buildings' ? 'city intact' : 'forest saved';
  const bonus = Math.round(metric.frac * 1000 + G.timeLeft * 6 + cs.frac * 260);
  G.score += bonus;
  let stars = 1;
  if (metric.frac >= def.star2) stars = 2;
  if (metric.frac >= def.star3) stars = 3;

  const progress = loadProgress();
  const prev = progress[def.id];
  if (!prev || prev.stars < stars || prev.score < G.score) {
    progress[def.id] = { stars: Math.max(stars, prev ? prev.stars : 0), score: Math.max(G.score, prev ? prev.score : 0) };
    saveProgress(progress);
  }

  Sfx.ensure();
  Sfx.chime(true);
  const next = G.missionIndex + 1;
  const nextExists = next < MISSIONS.length;
  openModal(`
    <div class="result">
      <div class="result-badge">✦</div>
      <div class="modal-kicker">MISSION CLEAR</div>
      <h2>Fire Under Control</h2>
      <div class="stars-big">${starsMarkup(stars)}</div>
      <p class="result-sub">${def.name} · ${treesPct}% ${metricLabel}</p>
      <div class="result-stats">
        <div class="result-stat"><b>${formatTime(used)}</b><span>Time</span></div>
        <div class="result-stat"><b>${treesPct}%</b><span>${metricLabel}</span></div>
        <div class="result-stat"><b>${Math.round(G.score).toLocaleString()}</b><span>Score</span></div>
      </div>
      <div class="result-actions">
        <button class="btn ghost" data-act="list" type="button">Mission List</button>
        <button class="btn primary" data-act="next" type="button">${nextExists ? 'Next Mission' : 'Finish'}</button>
      </div>
    </div>
  `, true);
  const root = $('modalRoot');
  root.querySelector('[data-act="list"]').onclick = () => { closeModal(); startSandbox(true); openMissions(); };
  root.querySelector('[data-act="next"]').onclick = () => {
    if (nextExists) startMission(next);
    else { closeModal(); startSandbox(true); openMissions(); toast('All missions complete — you are a true firekeeper.'); }
  };
  updateMissionChrome();
}

function loseMission(reason) {
  if (G.ended) return;
  G.ended = true;
  Sfx.ensure();
  Sfx.chime(false);
  const def = G.mission;
  const st = def.metric === 'buildings' ? sim.buildingStats() : sim.treeStats();
  const metricLabel = def.metric === 'buildings' ? 'city intact' : 'forest saved';
  openModal(`
    <div class="result">
      <div class="result-badge lose">✕</div>
      <div class="modal-kicker">MISSION FAILED</div>
      <h2>The Fire Won This Round</h2>
      <p class="result-sub">${reason}</p>
      <div class="result-stats">
        <div class="result-stat"><b>${Math.round(st.frac * 100)}%</b><span>${metricLabel}</span></div>
        <div class="result-stat"><b>${sim.fireCount}</b><span>Burning</span></div>
        <div class="result-stat"><b>${Math.round(G.score).toLocaleString()}</b><span>Score</span></div>
      </div>
      <div class="result-actions">
        <button class="btn ghost" data-act="list" type="button">Mission List</button>
        <button class="btn primary" data-act="retry" type="button">Try Again</button>
      </div>
    </div>
  `, true);
  const root = $('modalRoot');
  root.querySelector('[data-act="list"]').onclick = () => { closeModal(); startSandbox(true); openMissions(); };
  root.querySelector('[data-act="retry"]').onclick = () => startMission(G.missionIndex);
  void def;
}

/* --------------------------------------------------------------- chrome */
function setModeUI(mode) {
  const sw = $('modeSwitch');
  sw.dataset.active = mode;
  sw.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
}

function updateToolsForMode() {
  const isMission = G.mode === 'mission';
  const isSmother = G.mode === 'smother';
  const isSandbox = G.mode === 'sandbox';
  $('windRange').disabled = !isSandbox;
  $('windRange').style.opacity = isSandbox ? '' : '0.4';
  $('windLabel').textContent = isSmother
    ? 'Challenge breeze'
    : isMission
      ? 'Mission wind'
      : Math.abs(sim.wind.x).toFixed(1) + (sim.wind.x >= 0 ? ' →' : ' ←');
  $('powerRange').disabled = isSmother;
  $('powerRange').style.opacity = isSmother ? '0.4' : '';
  document.querySelectorAll('.slider-row').forEach((el) => { el.style.display = isSmother ? 'none' : ''; });
  $('speedSeg').style.display = isSmother ? 'none' : '';
  document.querySelectorAll('.tool-btn').forEach((b) => {
    b.disabled = isSmother && b.dataset.tool !== 'wood';
  });
  $('speedSeg').querySelectorAll('button').forEach((b) => {
    b.disabled = isSmother;
    if (isSmother) b.classList.toggle('active', b.dataset.speed === '1');
  });
  $('resetBtn').innerHTML = isSmother ? '<span>↺</span> Restart' : '<span>↺</span> Reset Scene';
  updateSceneUI();
  if (isSmother) {
    setTool('wood');
    $('footHint').innerHTML = 'Wood: paint onto fire to <strong>smother</strong> · wood elsewhere becomes fuel';
  }
}

function updateSceneUI() {
  const seg = $('sceneSeg');
  if (!seg) return;
  seg.querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', b.dataset.scene === G.scene);
    b.disabled = G.mode !== 'sandbox';
  });
  seg.style.opacity = G.mode !== 'sandbox' ? '0.4' : '';
  $('sceneSection').hidden = G.mode !== 'sandbox';
}

function setScene(scene) {
  if (G.mode === 'mission') { toast('Mission in progress — cannot change the scene.'); return; }
  if (G.scene === scene) return;
  G.scene = scene;
  startSandbox(true);
  Sfx.click();
  const labels = {
    blank: 'Blank canvas · create freely',
    forest: 'Forest · pines and cabin',
    deep: 'Deep forest · all trees',
    city: 'City skyline · connected towers',
    refinery: 'Large refinery · tanks and flare',
    reservoir: 'Reservoir · dam and forest',
  };
  toast(labels[scene] || 'Sandbox scene');
}

function updateMissionChrome() {
  const isMission = G.mode === 'mission' && G.mission;
  const isSmother = G.mode === 'smother' && G.smother;
  $('missionHud').hidden = !isMission && !isSmother;
  $('missionCard').hidden = !isMission && !isSmother;
  $('waterWrap').hidden = !isMission;
  $('scorePill').hidden = !isMission && !isSmother;
  if (isSmother) {
    const S = G.smother;
    $('mhTag').textContent = `SMOTHER · ${S.diff.name}`;
    $('mhName').textContent = 'Wood Smother';
    $('mhGoal').textContent = 'Smother every fire with wood';
    $('mcTag').textContent = `CHALLENGE · ${S.diff.name}`;
    $('mcName').textContent = 'Wood Smother';
    $('mcGoal').textContent = 'Smother every fire · the computer keeps igniting';
    $('mcQuit').textContent = 'Quit Challenge';
    return;
  }
  $('mcQuit').textContent = 'Quit Mission';
  if (!isMission) return;
  const def = G.mission;
  $('mhTag').textContent = `MISSION ${G.missionIndex + 1} · ${def.tag}`;
  $('mhName').textContent = def.name;
  $('mhGoal').textContent = def.goal;
  $('mcTag').textContent = `MISSION ${G.missionIndex + 1}`;
  $('mcName').textContent = def.name;
  $('mcGoal').textContent = def.goal;
}

/* --------------------------------------------------------------- UI tick */
function updateLiveUI(force) {
  const st = sim.treeStats();
  const cs = sim.cabinStats();
  const wx = sim.wind.x;
  const power = Math.abs(wx);

  $('windArrow').textContent = wx >= 0 ? '→' : '←';
  $('windVal').textContent = power.toFixed(1);
  const bars = $('windBars').children;
  const lit = Math.min(4, Math.round(power * 3.4));
  for (let i = 0; i < bars.length; i++) bars[i].classList.toggle('on', i < lit);

  if (G.mode === 'sandbox') {
    $('windRange').value = Math.round(wx * 100);
    $('windRange').style.setProperty('--p', ((wx + 1) / 2) * 100 + '%');
    $('windLabel').textContent = power.toFixed(1) + (wx >= 0 ? ' →' : ' ←');
  }

  $('statFire').textContent = `Fire ${sim.fireCount}`;
  $('statTrees').textContent = G.mode === 'smother'
    ? `Sources ${sim.fireSources.size}`
    : sim.trees.length ? `Trees ${Math.round(st.frac * 100)}%` : 'Trees —';
  $('statFps').textContent = `${Math.round(G.fps)} FPS`;
  $('footStats').textContent = G.mode === 'smother' && G.smother
    ? `FPS ${Math.round(G.fps)} · Fire ${sim.fireCount}/${G.smother.diff.maxFire} · Sources ${sim.fireSources.size}`
    : `FPS ${Math.round(G.fps)} · Fire ${sim.fireCount} · Embers ${sim.embers.length}`;

  if (G.mode === 'smother' && G.smother) {
    const S = G.smother;
    $('mhTime').textContent = formatTime(S.timeLeft);
    $('mhTime').classList.toggle('warn', S.timeLeft < 15);
    $('mcTime').textContent = formatTime(S.timeLeft);
    $('mcTime').classList.toggle('warn', S.timeLeft < 15);
    const danger = Math.min(1, sim.fireCount / S.diff.maxFire);
    $('mhGoal').textContent = `Fire ${sim.fireCount}/${S.diff.maxFire} · Ignitions left ${S.aiLeft}`;
    $('mcTrees').textContent = `Sources ${sim.fireSources.size} · Fire ${sim.fireCount}/${S.diff.maxFire}`;
    $('mcProgress').style.width = Math.max(2, danger * 100) + '%';
    $('mcProgress').style.background = danger > 0.66
      ? 'linear-gradient(90deg,#ff4d3d,#ff9a52)'
      : danger > 0.3
        ? 'linear-gradient(90deg,#ffb15c,#ffd27a)'
        : 'linear-gradient(90deg,#6ec49a,#b7e38a)';
    $('scoreNum').textContent = Math.round(S.score).toLocaleString();
    $('comboTag').classList.remove('show');
    $('rainBtn').disabled = true;
    $('rainCount').textContent = '';
  } else if (G.mode === 'mission' && G.mission) {
    const def = G.mission;
    const m = def.metric === 'buildings' ? sim.buildingStats() : st;
    const min = def.minMetric != null ? def.minMetric : def.minTrees;
    const label = def.metric === 'buildings' ? 'City' : 'Trees';
    $('mhTime').textContent = formatTime(G.timeLeft);
    $('mhTime').classList.toggle('warn', G.timeLeft < 15);
    $('mcTime').textContent = formatTime(G.timeLeft);
    $('mcTime').classList.toggle('warn', G.timeLeft < 15);
    $('mcTrees').textContent = `${label} ${Math.round(m.frac * 100)}%`;
    $('mcProgress').style.width = Math.max(2, m.frac * 100) + '%';
    $('mcProgress').style.background = m.frac < min
      ? 'linear-gradient(90deg,#ff6b4a,#ffb15c)'
      : 'linear-gradient(90deg,#6ec49a,#b7e38a)';

    const pct = Math.max(0, Math.min(1, G.water / def.water));
    $('waterFill').style.width = pct * 100 + '%';
    $('waterNum').textContent = Math.ceil(G.water);
    $('waterWrap').classList.toggle('low', pct < 0.2);
    $('scoreNum').textContent = Math.round(G.score).toLocaleString();
    $('comboTag').classList.toggle('show', G.comboT > 0 && G.combo > 1);
    $('comboTag').textContent = '×' + G.combo;

    $('rainBtn').disabled = G.rainCharges <= 0;
    $('rainCount').textContent = '×' + Math.max(0, G.rainCharges);
  } else {
    $('rainBtn').disabled = G.rainCD > 0;
    $('rainCount').textContent = G.rainCD > 0 ? Math.ceil(G.rainCD) + 's' : '';
  }

  if (force) {
    $('brushVal').textContent = G.brush;
    const p = ((G.brush - 2) / 12) * 100;
    $('brushRange').style.setProperty('--p', p + '%');
    $('powerLabel').textContent = sim.firePower.toFixed(1) + '×';
    $('powerRange').style.setProperty('--p', ((sim.firePower - 0.4) / 1.5) * 100 + '%');
  }

  const active = !G.paused && !G.ended && !G.modalOpen;
  let fx = 0, fy = 0, mass = 0;
  for (let i = 0; i < sim.n; i += 1) {
    if (sim.burn[i] > 0.08) { fx += i % W; fy += (i / W) | 0; mass++; }
  }
  const fl = $('firelight');
  if (mass > 2) {
    fl.style.left = (fx / mass / W) * 100 + '%';
    fl.style.top = (fy / mass / H) * 100 + '%';
    const size = Math.min(760, 220 + mass * 2.2);
    fl.style.width = size + 'px';
    fl.style.height = size + 'px';
    fl.style.opacity = String(Math.min(0.85, mass / 90));
  } else {
    fl.style.opacity = '0';
  }

  const fireNorm = active ? Math.min(1, sim.fireCount / 140) : 0;
  Sfx.update(fireNorm, active ? Math.min(1, power) : 0, active && G.painting && G.tool === 'water');
}

/* -------------------------------------------------------- smother mode */
let smotherAlertTimer = null;

function loadSmotherProgress() {
  try { return JSON.parse(localStorage.getItem('ember-smother-v1') || '{}'); }
  catch (e) { return {}; }
}
function saveSmotherProgress(id, score) {
  try {
    const p = loadSmotherProgress();
    p[id] = p[id] || { best: 0, wins: 0 };
    p[id].best = Math.max(p[id].best, score);
    p[id].wins += 1;
    localStorage.setItem('ember-smother-v1', JSON.stringify(p));
  } catch (e) { /* noop */ }
}

function showFireAlert(x, y) {
  const el = $('fireAlert');
  const r = stage.getBoundingClientRect();
  if (!r.width) return;
  el.style.left = (x / W) * r.width + 'px';
  el.style.top = (y / H) * r.height + 'px';
  el.hidden = false;
  if (smotherAlertTimer) clearTimeout(smotherAlertTimer);
  smotherAlertTimer = setTimeout(() => { el.hidden = true; }, 1800);
}

function openSmotherMenu() {
  const progress = loadSmotherProgress();
  const items = SMOTHER_DIFFS.map((d, i) => `
    <button class="mission-item" data-diff="${d.id}" type="button">
      <span class="mission-num">0${i + 1}</span>
      <span class="mission-info">
        <h3>${d.name} <span style="color:var(--muted-2);font-size:9px;letter-spacing:.16em;">${d.total} IGNITIONS</span></h3>
        <p>${d.blurb} · ${Math.round(d.time / 60)} MIN</p>
      </span>
      <span class="mission-meta">
        <span class="mission-best">${progress[d.id] ? 'Best ' + progress[d.id].best.toLocaleString() : 'Not played'}</span>
      </span>
    </button>`).join('');
  setModeUI('smother');
  openModal(`
    <div class="modal-head">
      <div>
        <div class="modal-kicker">SMOTHER CHALLENGE</div>
        <h2>Wood Smother</h2>
        <p class="modal-sub">The computer keeps igniting. Paint wood onto the flames to cover them; wood anywhere else becomes fuel. Smother every fire to win.</p>
      </div>
      <button class="modal-close" data-close type="button" aria-label="Close">×</button>
    </div>
    <div class="mission-list">${items}</div>
    <div class="help-note">Wood only. Painting onto a burning cell smothers it instantly; smothered wood stays wet and resists fire for a while. Clear every fire before the timer runs out; if the fire grows past the limit, you lose.</div>
  `);
  $('modalRoot').querySelectorAll('[data-diff]').forEach((b) => {
    b.onclick = () => startSmother(b.dataset.diff);
  });
}

function startSmother(id) {
  const diff = SMOTHER_DIFFS.find((d) => d.id === id);
  if (!diff) return;
  closeModal();
  G.mode = 'smother';
  G.smother = {
    diff, timeLeft: diff.time, aiTotal: diff.total, aiLeft: diff.total,
    nextSpawn: 2.0, score: 0, covered: 0, calm: 0, ended: false,
  };
  G.mission = null;
  G.missionIndex = -1;
  G.ended = false;
  G.paused = false;
  G.speed = 1;
  G.countdown = 3.4;
  G.water = Infinity;
  G.refill = 0;
  G.score = 0;
  G.combo = 0;
  G.comboT = 0;
  G.rainCharges = 0;
  G.rainCD = 0;
  sim.clear();
  sim.firePower = diff.power;
  buildBlankScene(sim);
  sim.firePower = diff.power;
  sim.wind.x = 0.1;
  sim.windTarget = 0.1;
  sim.windTimeline = null;
  sim.onSmother = (x, y, wasSource) => {
    if (G.mode !== 'smother' || !G.smother || G.smother.ended) return;
    const S = G.smother;
    S.covered += 1;
    const p = wasSource ? 150 : 12;
    S.score += p;
    if (wasSource || Math.random() < 0.22) popup('+' + p, x, y, wasSource);
  };
  G.tool = 'wood';
  G.brush = 8;
  $('brushRange').value = 8;
  $('brushVal').textContent = '8';
  $('brushRange').style.setProperty('--p', '50%');
  updateBrushRing();
  setTool('wood');
  $('footHint').innerHTML = 'Wood: paint onto fire to <strong>smother</strong> · wood elsewhere becomes fuel';
  $('fireAlert').hidden = true;
  $('countdown').hidden = true;
  setModeUI('smother');
  updateMissionChrome();
  updateToolsForMode();
  updateLiveUI(true);
  hideTip();
  toast(`Smother Challenge · ${diff.name}`, true);
  setTimeout(() => { if (G.mode === 'smother' && G.smother) toast('The computer keeps igniting — cover the flames with wood!'); }, 3800);
  Sfx.ensure();
}

function spawnComputerFire() {
  const S = G.smother;
  if (!S || S.aiLeft <= 0 || S.ended) return;
  const woods = [];
  for (let i = 0; i < sim.n; i++) {
    if (sim.mat[i] === WOOD && sim.burn[i] < 0.01 && sim.wet[i] < 0.65) {
      woods.push(i);
      if (woods.length > 500) break;
    }
  }
  let x = 0, y = 0, source = false, ok = false;
  if (woods.length && Math.random() < 0.64) {
    const i = woods[(Math.random() * woods.length) | 0];
    x = i % W;
    y = (i / W) | 0;
    sim.igniteArea(x, y, 2);
    ok = true;
  } else if (sim.fireSources.size < S.diff.maxActive) {
    for (let k = 0; k < 110; k++) {
      const tx = 10 + ((Math.random() * (W - 20)) | 0);
      const ty = 32 + ((Math.random() * 66) | 0);
      const i = ty * W + tx;
      if (sim.mat[i] === AIR && !sim.fireSources.has(i)) {
        sim.fireSources.add(i);
        sim.temp[i] = 800;
        sim.flame[i] = 1;
        sim.smoke[i] = 0.4;
        x = tx; y = ty; source = true; ok = true;
        break;
      }
    }
  }
  if (!ok) { S.nextSpawn = 0.9; return; }
  S.aiLeft -= 1;
  S.nextSpawn = S.diff.interval * (0.8 + Math.random() * 0.45);
  showFireAlert(x, y);
  toast(source ? 'The computer ignites a fire! A fire source appeared.' : 'The computer lights your wood on fire!', true);
  Sfx.ensure();
}

function updateSmother(dt) {
  const S = G.smother;
  if (!S || S.ended || G.ended) return;
  S.timeLeft -= dt;
  if (S.timeLeft <= 0) {
    S.timeLeft = 0;
    loseSmother('Time is up — fires remain.');
    return;
  }
  S.nextSpawn -= dt;
  if (S.aiLeft > 0 && S.nextSpawn <= 0) spawnComputerFire();
  if (S.aiLeft === 0 && sim.fireCount === 0 && sim.fireSources.size === 0) S.calm += dt;
  else S.calm = 0;
  if (S.calm > 1.4) { winSmother(); return; }
  if (sim.fireCount > S.diff.maxFire) loseSmother('The fire is out of control — it grew too large.');
}

function bindSmotherResult(diff) {
  const root = $('modalRoot');
  const retry = root.querySelector('[data-act="retry"]');
  if (retry) retry.onclick = () => startSmother(diff.id);
  const other = root.querySelector('[data-act="diff"]');
  if (other) other.onclick = () => { closeModal(); startSandbox(true); openSmotherMenu(); };
  const back = root.querySelector('[data-act="back"]');
  if (back) back.onclick = () => startSandbox();
}

function winSmother() {
  const S = G.smother;
  if (!S || S.ended) return;
  S.ended = true;
  G.ended = true;
  S.score += Math.round(S.timeLeft * 10) + 300;
  saveSmotherProgress(S.diff.id, S.score);
  Sfx.ensure();
  Sfx.chime(true);
  openModal(`
    <div class="result">
      <div class="result-badge">✦</div>
      <div class="modal-kicker">FIRE OUT</div>
      <h2>All Fires Out</h2>
      <p class="result-sub">${S.diff.name} · You smothered ${S.covered} fire cells</p>
      <div class="result-stats">
        <div class="result-stat"><b>${formatTime(S.timeLeft)}</b><span>Time left</span></div>
        <div class="result-stat"><b>${S.covered}</b><span>Cells smothered</span></div>
        <div class="result-stat"><b>${Math.round(S.score).toLocaleString()}</b><span>Score</span></div>
      </div>
      <div class="result-actions">
        <button class="btn ghost" data-act="back" type="button">Back to Sandbox</button>
        <button class="btn ghost" data-act="diff" type="button">Other Difficulty</button>
        <button class="btn primary" data-act="retry" type="button">Play Again</button>
      </div>
    </div>
  `, true);
  bindSmotherResult(S.diff);
}

function loseSmother(reason) {
  const S = G.smother;
  if (!S || S.ended) return;
  S.ended = true;
  G.ended = true;
  Sfx.ensure();
  Sfx.chime(false);
  openModal(`
    <div class="result">
      <div class="result-badge lose">✕</div>
      <div class="modal-kicker">CHALLENGE FAILED</div>
      <h2>The Fire Got Away</h2>
      <p class="result-sub">${S.diff.name} · ${reason}</p>
      <div class="result-stats">
        <div class="result-stat"><b>${S.aiTotal - S.aiLeft}/${S.aiTotal}</b><span>Ignitions</span></div>
        <div class="result-stat"><b>${S.covered}</b><span>Cells smothered</span></div>
        <div class="result-stat"><b>${Math.round(S.score).toLocaleString()}</b><span>Score</span></div>
      </div>
      <div class="result-actions">
        <button class="btn ghost" data-act="back" type="button">Back to Sandbox</button>
        <button class="btn ghost" data-act="diff" type="button">Other Difficulty</button>
        <button class="btn primary" data-act="retry" type="button">Try Again</button>
      </div>
    </div>
  `, true);
  bindSmotherResult(S.diff);
}

function setQuality(q) {
  Renderer.setScale(q);
  try { localStorage.setItem('ember-quality', String(q)); } catch (e) { /* noop */ }
  document.querySelectorAll('#qualitySeg button').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.q) === q);
  });
  toast(q === 1 ? 'Quality: Fast 1×' : q === 3 ? 'Quality: Ultra 3×' : 'Quality: Clear 2×');
}

/* ---------------------------------------------------------------- loop */
let lastFrame = performance.now();
function loop(now) {
  const raw = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (raw > 0) G.fps = G.fps * 0.92 + (1 / raw) * 0.08;

  if (G.countdown > 0) {
    G.countdown -= raw;
    const cd = $('countdown');
    cd.hidden = false;
    const n = Math.ceil(G.countdown - 0.5);
    cd.textContent = n > 0 ? String(n) : 'GO';
    if (G.countdown <= 0) {
      cd.hidden = true;
      $('countdown').hidden = true;
    }
  } else if (!G.paused && !G.ended && !G.modalOpen) {
    const dt = raw * G.speed;
    if (G.mode === 'mission') {
      G.timeLeft -= dt;
      G.water = Math.min(G.mission.water, G.water + G.refill * dt);
      G.comboT -= raw;
      if (G.comboT <= 0) G.combo = 0;
      if (G.rainCD > 0) G.rainCD -= raw;
    } else if (G.rainCD > 0) {
      G.rainCD -= raw;
    }
    sim.step(dt);
    if (G.mode === 'mission') checkMission(raw * G.speed);
    else if (G.mode === 'smother') updateSmother(raw * G.speed);
  }

  Renderer.draw(sim, raw);

  if (sim.shake > 0.01) {
    const s = sim.shake * 5;
    stage.style.transform = `translate(${(Math.random() - 0.5) * s}px, ${(Math.random() - 0.5) * s}px)`;
  } else if (stage.style.transform) {
    stage.style.transform = '';
  }

  G.uiAcc += raw;
  if (G.uiAcc > 0.1) {
    G.uiAcc = 0;
    updateLiveUI();
  }
  requestAnimationFrame(loop);
}

/* ------------------------------------------------------------- controls */
$('brushRange').addEventListener('input', (e) => {
  G.brush = Number(e.target.value);
  $('brushVal').textContent = G.brush;
  $('brushRange').style.setProperty('--p', ((G.brush - 2) / 12) * 100 + '%');
  updateBrushRing();
});

$('windRange').addEventListener('input', (e) => {
  const v = Number(e.target.value) / 100;
  sim.windTarget = Math.abs(v) < 0.04 ? 0 : v;
  sim.windTimeline = null;
  sim.wind.x += (v - sim.wind.x) * 0.5;
  e.target.style.setProperty('--p', ((v + 1) / 2) * 100 + '%');
  Sfx.ensure();
});

$('powerRange').addEventListener('input', (e) => {
  sim.firePower = Number(e.target.value) / 100;
  $('powerLabel').textContent = sim.firePower.toFixed(1) + '×';
  e.target.style.setProperty('--p', ((sim.firePower - 0.4) / 1.5) * 100 + '%');
});

$('speedSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-speed]');
  if (!b) return;
  G.speed = Number(b.dataset.speed);
  $('speedSeg').querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
  Sfx.click();
});

$('rainBtn').addEventListener('click', () => {
  if (G.mode === 'smother') return;
  Sfx.ensure();
  if (G.mode === 'mission') {
    if (G.rainCharges <= 0) return;
    G.rainCharges--;
    sim.rain(5);
    toast('A timely rain ☂', true);
  } else {
    if (G.rainCD > 0) return;
    sim.rain(5.5);
    G.rainCD = 14;
    toast('It is raining ☂');
  }
  Sfx.click();
});

$('resetBtn').addEventListener('click', () => {
  Sfx.click();
  if (G.mode === 'smother' && G.smother) startSmother(G.smother.diff.id);
  else if (G.mode === 'mission' && G.mission) startMission(G.missionIndex);
  else startSandbox(true);
});

$('mcQuit').addEventListener('click', () => startSandbox());

$('playBtn').addEventListener('click', () => togglePause());

function togglePause() {
  if (G.ended) return;
  G.paused = !G.paused;
  stage.classList.toggle('paused', G.paused);
  updatePlayIcon();
  toast(G.paused ? 'Paused · press Space to resume' : 'Resumed');
  Sfx.click();
}

function updatePlayIcon() {
  $('playBtn').innerHTML = G.paused
    ? '<svg viewBox="0 0 12 12"><path d="M3 1.6v8.8L10 6z" fill="currentColor"/></svg>'
    : '<svg viewBox="0 0 12 12"><rect x="2.4" y="1.6" width="2.7" height="8.8" rx="1" fill="currentColor"/><rect x="6.9" y="1.6" width="2.7" height="8.8" rx="1" fill="currentColor"/></svg>';
}

$('soundBtn').addEventListener('click', () => Sfx.toggle());
$('helpBtn').addEventListener('click', () => { Sfx.ensure(); openHelp(); });

$('modeSwitch').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-mode]');
  if (!b) return;
  Sfx.ensure();
  if (b.dataset.mode === 'missions') {
    setModeUI('missions');
    openMissions();
  } else if (b.dataset.mode === 'smother') {
    openSmotherMenu();
  } else if (G.mode !== 'sandbox' || G.mission || G.smother) {
    startSandbox();
  } else {
    closeModal();
    setModeUI('sandbox');
  }
});

$('qualitySeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-q]');
  if (!b) return;
  setQuality(Number(b.dataset.q));
  Sfx.click();
});
document.querySelectorAll('#qualitySeg button').forEach((b) => {
  b.classList.toggle('active', Number(b.dataset.q) === savedQuality);
});

document.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (k === 'Escape') {
    if (G.modalOpen && !G.ended) closeModal();
    return;
  }
  if (G.modalOpen) return;
  if (k === ' ') {
    e.preventDefault();
    togglePause();
    return;
  }
  if (k === 'm' || k === 'M') { Sfx.toggle(); return; }
  if (k === 'r' || k === 'R') {
    if (G.mode === 'smother' && G.smother) startSmother(G.smother.diff.id);
    else if (G.mode === 'mission' && G.mission) startMission(G.missionIndex);
    else startSandbox(true);
    return;
  }
  if (k === '[' || k === ']') {
    G.brush = clamp(G.brush + (k === ']' ? 1 : -1), 2, 14);
    $('brushRange').value = G.brush;
    $('brushVal').textContent = G.brush;
    $('brushRange').style.setProperty('--p', ((G.brush - 2) / 12) * 100 + '%');
    updateBrushRing();
    return;
  }
  const tool = TOOLS.find((t) => t.key === k);
  if (tool) { setTool(tool.id); Sfx.click(); }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && (G.mode === 'mission' || G.mode === 'smother') && !G.ended) {
    G.paused = true;
    stage.classList.add('paused');
    updatePlayIcon();
  }
});

/* ------------------------------------------------------------- boot */
sim.onExtinguish = (x, y) => {
  if (G.mode !== 'mission' || G.ended) return;
  const now = performance.now();
  if (now - G.lastExt < 1500) G.combo = Math.min(6, G.combo + 1);
  else G.combo = 1;
  G.lastExt = now;
  G.comboT = 1.6;
  G.score += 12 * G.combo;
  if (now - G.lastPopup > 80) {
    G.lastPopup = now;
    popup('+' + 12 * G.combo, x, y, G.combo >= 3);
  }
};

sim.onExplode = () => {
  Sfx.boom();
  if (navigator.vibrate) navigator.vibrate(40);
};

$('sceneSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-scene]');
  if (!b) return;
  Sfx.ensure();
  setScene(b.dataset.scene);
});

buildToolGrid();
setTool('wood');
updatePlayIcon();
startSandbox(true);
updateMissionChrome();
updateLiveUI(true);
layoutStage();
setTimeout(layoutStage, 60);
setTimeout(layoutStage, 300);
new ResizeObserver(() => requestAnimationFrame(layoutStage)).observe(document.querySelector('.stage-area'));
window.addEventListener('resize', () => requestAnimationFrame(layoutStage));

// hide the intro tip on first interaction / after a while
function hideTip() {
  G.tipShown = true;
  $('stageTip').classList.remove('show');
}
setTimeout(() => { if (!G.tipShown) $('stageTip').classList.add('show'); }, 700);
setTimeout(hideTip, 10000);
window.addEventListener('pointerdown', hideTip, { once: true });

window.__EMBER__ = { sim, G, MISSIONS, startMission, startSandbox };

requestAnimationFrame(loop);
