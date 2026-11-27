/* ============================================================
   EMBER 3D · renderer, first-person player, hose, UI, scenes
   ============================================================ */
'use strict';

(() => {
  const E = window.EMBER;
  const { SX, SY, SZ, CS, MAT, MATS, SCENES, FIRESTORM, World } = E;
  const WORLD_W = SX * CS, WORLD_D = SZ * CS;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const cellX = (x) => (x + 0.5) * CS - WORLD_W / 2;
  const cellZ = (z) => (z + 0.5) * CS - WORLD_D / 2;
  const cellY = (y) => (y + 0.5) * CS - CS;
  const fmtTime = (s) => {
    s = Math.max(0, Math.ceil(s));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  };

  /* ------------------------------------------------------------ renderer */
  const canvas = $('scene');
  const hud = $('hud');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.setClearColor(0x05080e, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070c14, 0.0062);
  const camera = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, 0.05, 600);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  const hemi = new THREE.HemisphereLight(0x3a4a66, 0x2a1c12, 0.46);
  scene.add(hemi);
  const moonLight = new THREE.DirectionalLight(0xb8c8e8, 0.52);
  moonLight.position.set(-80, 120, 80);
  scene.add(moonLight);
  const fireLights = [];
  for (let i = 0; i < 3; i++) {
    const l = new THREE.PointLight(0xff7433, 0, 52, 1.8);
    l.position.set(0, 10, 0);
    scene.add(l);
    fireLights.push(l);
  }

  // sky, stars, moon
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(0x02040a) },
      uHorizon: { value: new THREE.Color(0x162030) },
      uGlow: { value: new THREE.Color(0x4a2214) },
    },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uGlow; varying vec3 vP;
      void main(){ float h = normalize(vP).y; vec3 c = mix(uHorizon, uTop, smoothstep(-0.02, 0.55, h));
        c += uGlow * pow(max(0.0, 1.0 - abs(h) * 2.4), 7.0) * 0.65;
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(460, 32, 18), skyMat);
  scene.add(sky);

  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(700 * 3);
  for (let i = 0; i < 700; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(0.05 + Math.random() * 0.95);
    const r = 420;
    starPos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    starPos[i * 3 + 1] = Math.cos(phi) * r;
    starPos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xbdd4ff, size: 1.1, transparent: true, opacity: 0.7, depthWrite: false, fog: false }));
  scene.add(stars);

  /* ------------------------------------------------------------ textures */
  function canvasTex(draw, size = 128) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d'); draw(ctx, size);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }
  const texFlame = canvasTex((ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,235,1)');
    g.addColorStop(0.18, 'rgba(255,230,160,0.95)');
    g.addColorStop(0.45, 'rgba(255,150,60,0.65)');
    g.addColorStop(0.75, 'rgba(220,60,20,0.2)');
    g.addColorStop(1, 'rgba(80,10,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  });
  const texSmoke = canvasTex((ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(120,120,120,0.5)');
    g.addColorStop(0.5, 'rgba(70,70,70,0.3)');
    g.addColorStop(1, 'rgba(30,30,30,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  });
  const texWater = canvasTex((ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.35, 'rgba(170,225,255,0.7)');
    g.addColorStop(0.7, 'rgba(70,160,220,0.25)');
    g.addColorStop(1, 'rgba(20,80,140,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  });
  const texSpark = canvasTex((ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,210,120,0.9)');
    g.addColorStop(1, 'rgba(255,100,20,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  });
  const texFlash = canvasTex((ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,245,1)');
    g.addColorStop(0.25, 'rgba(255,220,160,0.9)');
    g.addColorStop(0.6, 'rgba(255,120,40,0.35)');
    g.addColorStop(1, 'rgba(120,20,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  });
  const texMoon = canvasTex((ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.26, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(235,242,255,1)');
    g.addColorStop(0.3, 'rgba(190,210,240,0.55)');
    g.addColorStop(0.6, 'rgba(120,160,220,0.12)');
    g.addColorStop(1, 'rgba(40,80,160,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  });

  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: texMoon, color: 0xe8f0ff, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  moon.position.set(-170, 130, -230);
  moon.scale.set(58, 58, 1);
  scene.add(moon);

  /* ------------------------------------------------------------ particles */
  class PSys {
    constructor(max, texture, additive, gravity, drag, windFactor) {
      this.max = max; this.gravity = gravity; this.drag = drag; this.windFactor = windFactor;
      this.cursor = 0;
      this.pos = new Float32Array(max * 3);
      this.col = new Float32Array(max * 3);
      this.size = new Float32Array(max);
      this.alpha = new Float32Array(max);
      this.vel = new Float32Array(max * 3);
      this.life = new Float32Array(max);
      this.maxLife = new Float32Array(max);
      this.baseSize = new Float32Array(max);
      this.baseAlpha = new Float32Array(max);
      this.pos.fill(-9999);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
      geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
      geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
      const mat = new THREE.ShaderMaterial({
        uniforms: { uMap: { value: texture } },
        vertexShader: `attribute vec3 aColor; attribute float aSize; attribute float aAlpha; varying vec3 vC; varying float vA;
          void main(){ vC = aColor; vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (420.0 / max(1.0, -mv.z)); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform sampler2D uMap; varying vec3 vC; varying float vA;
          void main(){ vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vC, t.a * vA); }`,
        transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      this.points = new THREE.Points(geo, mat);
      this.points.frustumCulled = false;
      this.points.renderOrder = 3;
      scene.add(this.points);
    }
    spawn(x, y, z, vx, vy, vz, life, size, color, alpha = 1) {
      const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
      this.life[i] = life; this.maxLife[i] = life;
      this.baseSize[i] = size; this.baseAlpha[i] = alpha;
      this.size[i] = size; this.alpha[i] = alpha;
      this.col[i * 3] = color.r; this.col[i * 3 + 1] = color.g; this.col[i * 3 + 2] = color.b;
    }
    update(dt, windX = 0, windZ = 0) {
      for (let i = 0; i < this.max; i++) {
        if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
        this.life[i] -= dt;
        if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
        const k = i * 3;
        this.vel[k] += windX * this.windFactor * dt;
        this.vel[k + 1] += this.gravity * dt;
        this.vel[k + 2] += windZ * this.windFactor * dt;
        const f = Math.max(0, 1 - this.drag * dt);
        this.vel[k] *= f; this.vel[k + 1] *= f; this.vel[k + 2] *= f;
        this.pos[k] += this.vel[k] * dt;
        this.pos[k + 1] += this.vel[k + 1] * dt;
        this.pos[k + 2] += this.vel[k + 2] * dt;
        const t = clamp(this.life[i] / this.maxLife[i], 0, 1);
        this.alpha[i] = this.baseAlpha[i] * t;
        this.size[i] = this.baseSize[i] * (0.7 + 0.5 * (1 - t));
      }
      const a = this.points.geometry.attributes;
      a.position.needsUpdate = true; a.aColor.needsUpdate = true; a.aSize.needsUpdate = true; a.aAlpha.needsUpdate = true;
    }
  }

  const firePS = new PSys(2400, texFlame, true, 1.8, 0.9, 0.6);
  const fireGlows = [];
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFlame, color: 0xff7a30, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    sp.scale.set(9, 9, 1); sp.visible = false; scene.add(sp); fireGlows.push(sp);
  }
  const smokePS = new PSys(1400, texSmoke, false, 1.1, 0.55, 0.9);
  const steamPS = new PSys(800, texSmoke, false, 1.8, 0.7, 0.7);
  const waterPS = new PSys(1100, texWater, false, -9.8, 0.2, 0.1);
  const sparkPS = new PSys(600, texSpark, true, -4.5, 0.4, 0.2);
  const dustPS = new PSys(600, texSmoke, false, -0.4, 0.9, 0.2);

  /* ------------------------------------------------------------ world + meshes */
  const world = new World();
  let voxelMesh = null, glassMesh = null, waterMesh = null;
  let instOf = null, glassOf = null;
  const tmpM = new THREE.Matrix4();
  const tmpC = new THREE.Color();
  const props = new THREE.Group();
  scene.add(props);
  const LADDER_POS = {
    training: { x: 57, z: 70 }, cabin: { x: 50, z: 62 }, deep: { x: 48, z: 72 },
    city: { x: 44, z: 58 }, refinery: { x: 34, z: 60 }, reservoir: { x: 76, z: 32 },
  };
  const ladder = { x: 0, z: 0, height: 18, group: null, mast: null, railL: null, railR: null, bucket: null, rungs: [], light: null };
  const drone = { active: false, x: 0, y: 0, z: 0, yaw: 0, pitch: 0, model: null, rotors: [], idleT: 0 };
  const markers = [];

  function disposeMesh(m) {
    if (!m) return;
    scene.remove(m);
    if (m.geometry) m.geometry.dispose();
    if (m.material) { if (Array.isArray(m.material)) m.material.forEach(x => x.dispose()); else m.material.dispose(); }
  }

  function colorFor(i) {
    const m = world.mat[i];
    const def = MATS[m];
    if (!def) return 0x000000;
    if (m === MAT.CHAR) return 0x24201d;
    return def.color;
  }

  function buildWorldMeshes() {
    disposeMesh(voxelMesh); voxelMesh = null;
    disposeMesh(glassMesh); glassMesh = null;
    disposeMesh(waterMesh); waterMesh = null;
    world.takeDirty();
    const n = SX * SY * SZ;
    instOf = new Int32Array(n).fill(-1);
    glassOf = new Int32Array(n).fill(-1);
    const solids = [];
    const glasses = [];
    for (let i = 0; i < n; i++) {
      const m = world.mat[i];
      if (m === MAT.AIR) continue;
      if (m === MAT.GLASS) glasses.push(i); else solids.push(i);
    }
    const geo = new THREE.BoxGeometry(CS * 0.985, CS * 0.985, CS * 0.985);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    voxelMesh = new THREE.InstancedMesh(geo, mat, solids.length);
    voxelMesh.frustumCulled = false;
    for (let k = 0; k < solids.length; k++) {
      const i = solids[k]; instOf[i] = k;
      const x = i % SX, z = ((i / SX) | 0) % SZ, y = (i / (SX * SZ)) | 0;
      tmpM.makeTranslation(cellX(x), cellY(y), cellZ(z));
      voxelMesh.setMatrixAt(k, tmpM);
      const def = MATS[world.mat[i]];
      const v = 0.9 + ((x * 13 + z * 7 + y * 3) % 10) / 60;
      tmpC.setHex(def ? def.color : 0x888888).multiplyScalar(v);
      if (world.mat[i] === MAT.CHAR) tmpC.setHex(0x24201d);
      voxelMesh.setColorAt(k, tmpC);
    }
    voxelMesh.instanceMatrix.needsUpdate = true;
    if (voxelMesh.instanceColor) voxelMesh.instanceColor.needsUpdate = true;
    scene.add(voxelMesh);

    if (glasses.length) {
      const gmat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      glassMesh = new THREE.InstancedMesh(geo.clone(), gmat, glasses.length);
      glassMesh.frustumCulled = false;
      const lit = [0xffd7a0, 0xffc078, 0xa8d8ff, 0x6f9fc4];
      for (let k = 0; k < glasses.length; k++) {
        const i = glasses[k]; glassOf[i] = k;
        const x = i % SX, z = ((i / SX) | 0) % SZ, y = (i / (SX * SZ)) | 0;
        tmpM.makeTranslation(cellX(x), cellY(y), cellZ(z));
        glassMesh.setMatrixAt(k, tmpM);
        const on = ((x * 31 + z * 17 + y * 7) % 100) < 54;
        tmpC.setHex(on ? lit[(x + z + y) % lit.length] : 0x101b26);
        glassMesh.setColorAt(k, tmpC);
      }
      glassMesh.instanceMatrix.needsUpdate = true;
      if (glassMesh.instanceColor) glassMesh.instanceColor.needsUpdate = true;
      scene.add(glassMesh);
    }

    // water surface for the reservoir
    if (world.waterActive) {
      const pos = new Float32Array(SX * SZ * 3);
      const idx = [];
      for (let z = 0; z < SZ; z++)
        for (let x = 0; x < SX; x++) {
          const k = z * SX + x;
          pos[k * 3] = cellX(x);
          pos[k * 3 + 1] = -0.5;
          pos[k * 3 + 2] = cellZ(z);
          if (x < SX - 1 && z < SZ - 1) {
            const a = k, b = k + 1, c = k + SX, d = k + SX + 1;
            idx.push(a, c, b, b, c, d);
          }
        }
      const wg = new THREE.BufferGeometry();
      wg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      wg.setIndex(idx);
      wg.computeVertexNormals();
      const wm = new THREE.MeshPhongMaterial({ color: 0x2f7396, transparent: true, opacity: 0.72, shininess: 90, specular: 0x6fa8c0, side: THREE.DoubleSide, depthWrite: false });
      waterMesh = new THREE.Mesh(wg, wm);
      waterMesh.renderOrder = 2;
      waterMesh.frustumCulled = false;
      scene.add(waterMesh);
      updateWaterMesh();
    }
    world.takeDirty();
  }

  function updateWaterMesh() {
    if (!waterMesh) return;
    const pos = waterMesh.geometry.attributes.position.array;
    for (let z = 0; z < SZ; z++)
      for (let x = 0; x < SX; x++) {
        const k = z * SX + x;
        const d = world.water.depth[k] || 0;
        pos[k * 3 + 1] = d > 0.015 ? d : -0.5;
      }
    waterMesh.geometry.attributes.position.needsUpdate = true;
    waterMesh.geometry.computeVertexNormals();
  }

  function applyDirty() {
    const dirty = world.takeDirty();
    if (!dirty.length) return;
    if (!voxelMesh) return;
    let mainDirty = false, glassDirty = false;
    for (const i of dirty) {
      const m = world.mat[i];
      const k = instOf[i];
      if (m === MAT.AIR) {
        if (k >= 0) { tmpM.makeScale(0.0001, 0.0001, 0.0001); voxelMesh.setMatrixAt(k, tmpM); mainDirty = true; }
        const g = glassOf[i];
        if (g >= 0) { tmpM.makeScale(0.0001, 0.0001, 0.0001); glassMesh.setMatrixAt(g, tmpM); glassDirty = true; }
      } else if (k >= 0) {
        const def = MATS[m];
        if (def) { tmpC.setHex(m === MAT.CHAR ? 0x24201d : def.color); voxelMesh.setColorAt(k, tmpC); mainDirty = true; }
      }
    }
    if (mainDirty) { voxelMesh.instanceMatrix.needsUpdate = true; if (voxelMesh.instanceColor) voxelMesh.instanceColor.needsUpdate = true; }
    if (glassDirty && glassMesh) { glassMesh.instanceMatrix.needsUpdate = true; if (glassMesh.instanceColor) glassMesh.instanceColor.needsUpdate = true; }
  }

  /* ------------------------------------------------------------ props */
  function clearProps() {
    while (props.children.length) {
      const c = props.children.pop();
      props.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) { if (Array.isArray(c.material)) c.material.forEach(m => m.dispose()); else c.material.dispose(); }
    }
    for (const m of markers) { scene.remove(m.group); }
    markers.length = 0;
  }

  function addHydrant(x, z, waterPoint = false) {
    const g = new THREE.Group();
    const wx = cellX(x), wz = cellZ(z);
    if (waterPoint) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.12, 8, 28), new THREE.MeshBasicMaterial({ color: 0x4cc3ff, transparent: true, opacity: 0.7 }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(wx, 0.12, wz); g.add(ring);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), new THREE.MeshBasicMaterial({ color: 0x0b2a3a, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
      disc.rotation.x = -Math.PI / 2; disc.position.set(wx, 0.04, wz); g.add(disc);
    } else {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.8, 10), new THREE.MeshStandardMaterial({ color: 0xc23a2e, roughness: 0.55, metalness: 0.2 }));
      body.position.set(wx, 0.4, wz); g.add(body);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe0b04a, roughness: 0.4, metalness: 0.4 }));
      cap.position.set(wx, 0.84, wz); g.add(cap);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x8a2a20 }));
      arm.rotation.z = Math.PI / 2; arm.position.set(wx, 0.62, wz); g.add(arm);
    }
    props.add(g);
  }

  function addBoat() {
    if (!world.boat) return;
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.8, 1.5), new THREE.MeshStandardMaterial({ color: 0x24343e, roughness: 0.7 }));
    hull.position.y = 0.4; g.add(hull);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.5, 4), new THREE.MeshStandardMaterial({ color: 0x24343e, roughness: 0.7 }));
    bow.rotation.z = -Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.position.set(2.1, 0.4, 0); g.add(bow);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.1), new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.6 }));
    cabin.position.set(-0.6, 1.1, 0); g.add(cabin);
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffcf7a }));
    light.position.set(2.0, 1.0, 0); g.add(light);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), new THREE.MeshStandardMaterial({ color: 0x8a8a8a }));
    mast.position.set(-1.4, 1.6, 0); g.add(mast);
    const light2 = new THREE.PointLight(0xffb35c, 1.4, 16, 2);
    light2.position.set(0, 1.6, 0); g.add(light2);
    g.userData.boat = true;
    props.add(g);
    world.boatMesh = g;
  }

  function addFireTruck() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.2, 2.6), new THREE.MeshStandardMaterial({ color: 0xb52e22, roughness: 0.55, metalness: 0.2 }));
    body.position.set(0, 1.6, 0); g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.7, 2.5), new THREE.MeshStandardMaterial({ color: 0xc33a2b, roughness: 0.5 }));
    cab.position.set(2.2, 2.6, 0); g.add(cab);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 2.2), new THREE.MeshStandardMaterial({ color: 0x6fa8c0, roughness: 0.2, metalness: 0.5 }));
    glass.position.set(3.35, 2.8, 0); g.add(glass);
    const ladder = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.18, 0.5), new THREE.MeshStandardMaterial({ color: 0xb8b8b8, metalness: 0.7, roughness: 0.3 }));
    ladder.position.set(-0.8, 3.0, 0); g.add(ladder);
    const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    for (const [wx, wz] of [[-2.2, 1.35], [2.2, 1.35], [-2.2, -1.35], [2.2, -1.35]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat); w.rotation.x = Math.PI / 2; w.position.set(wx, 0.55, wz); g.add(w);
    }
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff5a2a }));
    beacon.position.set(2.2, 3.6, 0); g.add(beacon);
    const bl = new THREE.PointLight(0xff4a20, 1.6, 14, 2); bl.position.set(2.2, 3.8, 0); g.add(bl);
    g.position.set(cellX(57), 0, cellZ(70));
    props.add(g);
  }


  function addLadderTruck(x, z) {
    const g = new THREE.Group();
    const wx = cellX(x), wz = cellZ(z);
    ladder.x = wx; ladder.z = wz;
    const red = new THREE.MeshStandardMaterial({ color: 0xb52e22, roughness: 0.55, metalness: 0.2 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2b3036, metalness: 0.6, roughness: 0.5 });
    const steel = new THREE.MeshStandardMaterial({ color: 0xaeb6be, metalness: 0.75, roughness: 0.35 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.2, 2.6), red); body.position.y = 1.6; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.7, 2.5), red); cab.position.set(2.2, 2.6, 0); g.add(cab);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 2.2), new THREE.MeshStandardMaterial({ color: 0x6fa8c0, roughness: 0.2, metalness: 0.5 })); glass.position.set(3.35, 2.8, 0); g.add(glass);
    const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    for (const [wx2, wz2] of [[-2.2, 1.35], [2.2, 1.35], [-2.2, -1.35], [2.2, -1.35]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat); w.rotation.x = Math.PI / 2; w.position.set(wx2, 0.55, wz2); g.add(w);
    }
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff5a2a })); beacon.position.set(2.2, 3.6, 0); g.add(beacon);
    const bl = new THREE.PointLight(0xff4a20, 1.4, 14, 2); bl.position.set(2.2, 3.8, 0); g.add(bl);
    const turntable = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.4, 12), dark); turntable.position.set(-0.6, 3.0, 0); g.add(turntable);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.5), steel); mast.position.set(-0.6, 4, 0); g.add(mast);
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1, 0.08), steel); railL.position.set(-1.0, 4, 0); g.add(railL);
    const railR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1, 0.08), steel); railR.position.set(-0.2, 4, 0); g.add(railR);
    const rungs = [];
    for (let i = 0; i < 26; i++) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.08), steel);
      r.position.set(-0.6, 4 + i, 0); g.add(r); rungs.push(r);
    }
    const bucket = new THREE.Group();
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.18, 12), dark); floor.position.y = 0; bucket.add(floor);
    const rail = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.06, 6, 20), steel); rail.rotation.x = Math.PI / 2; rail.position.y = 1.0; bucket.add(rail);
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6), steel);
      post.position.set(Math.cos(a) * 1.15, 0.5, Math.sin(a) * 1.15); bucket.add(post);
    }
    const bucketLight = new THREE.PointLight(0xffd9a0, 1.5, 18, 2); bucketLight.position.y = 0.8; bucket.add(bucketLight);
    const bucketMark = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb35c })); bucketMark.position.set(1.1, 1.1, 0); bucket.add(bucketMark);
    g.add(bucket);
    g.position.set(wx, 0, wz);
    props.add(g);
    ladder.group = g; ladder.mast = mast; ladder.railL = railL; ladder.railR = railR; ladder.bucket = bucket; ladder.rungs = rungs; ladder.light = bucketLight;
    setLadderHeight(ladder.height);
  }

  function setLadderHeight(h) {
    ladder.height = clamp(h, 5, 28);
    const top = ladder.height;
    const span = Math.max(0.2, top - 3.2);
    if (ladder.mast) {
      ladder.mast.scale.y = span; ladder.mast.position.y = 3.2 + span / 2;
      ladder.railL.scale.y = span; ladder.railL.position.y = 3.2 + span / 2;
      ladder.railR.scale.y = span; ladder.railR.position.y = 3.2 + span / 2;
      for (let i = 0; i < ladder.rungs.length; i++) {
        ladder.rungs[i].visible = 4 + i <= top - 0.5;
        ladder.rungs[i].position.y = 4 + i;
      }
      ladder.bucket.position.y = top;
    }
    if (player.onLadder) { player.y = top; camera.position.set(ladder.x, top + 1.7, ladder.z); }
  }

  function addDroneModel() {
    const g = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x1d2329, roughness: 0.5, metalness: 0.5 });
    const orange = new THREE.MeshStandardMaterial({ color: 0xff6b35, roughness: 0.5, metalness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.7), dark); g.add(body);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), orange); dome.position.set(0, 0.14, 0); g.add(dome);
    const rotors = [];
    for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.08), dark);
      arm.position.set(ax * 0.45, 0, az * 0.45);
      arm.rotation.y = Math.atan2(az, ax);
      g.add(arm);
      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.02, 12), new THREE.MeshStandardMaterial({ color: 0x333b42, transparent: true, opacity: 0.85 }));
      rotor.position.set(ax * 0.9, 0.04, az * 0.9); g.add(rotor); rotors.push(rotor);
    }
    const gimbal = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), dark); gimbal.position.set(0, -0.13, -0.3); g.add(gimbal);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.25, 8), orange); nozzle.rotation.x = Math.PI / 2; nozzle.position.set(0, -0.1, -0.55); g.add(nozzle);
    const light = new THREE.PointLight(0x8fd8ff, 0.7, 6, 2); light.position.set(0, 0, -0.5); g.add(light);
    g.position.set(player.x + 1.6, 1.8, player.z + 1.2);
    props.add(g);
    drone.model = g; drone.rotors = rotors;
  }

  function updateDroneModel(dt) {
    if (!drone.model) return;
    if (drone.active) {
      drone.model.position.set(drone.x, drone.y - 0.28, drone.z);
      drone.model.rotation.y = -drone.yaw;
      drone.model.visible = true;
      for (const r of drone.rotors) r.rotation.y += dt * 42;
    } else {
      drone.idleT += dt;
      drone.model.visible = true;
      drone.model.position.set(player.x + 1.6, 1.8 + Math.sin(drone.idleT * 2.2) * 0.12, player.z + 1.2);
      drone.model.rotation.y = -player.yaw;
      for (const r of drone.rotors) r.rotation.y += dt * 8;
    }
  }

  function droneBlocked(x, y, z) {
    const cx = Math.floor((x + WORLD_W / 2) / CS), cz = Math.floor((z + WORLD_D / 2) / CS);
    if (cx < 0 || cx >= SX || cz < 0 || cz >= SZ) return true;
    const cy = Math.floor(y / CS) + 1;
    for (let yy = cy - 1; yy <= cy; yy++) {
      if (yy < 0 || yy >= SY) continue;
      const m = world.mat[world.idx(cx, yy, cz)];
      if (m !== MAT.AIR && m !== MAT.WATER) return true;
    }
    return false;
  }

  function toggleLadder() {
    if (player.onLadder) {
      player.onLadder = false;
      player.x = ladder.x + 3.2; player.z = ladder.z + 3.4; player.y = 0; player.vy = 0;
      camera.position.set(player.x, 1.7, player.z);
      toast('Ladder platform lowered. Back on the ground.');
      setTool('hose');
      return;
    }
    const d = Math.hypot(player.x - ladder.x, player.z - ladder.z);
    if (d > 12) { toast('Move closer to the aerial truck.', 'warn'); return; }
    player.onLadder = true;
    player.x = ladder.x; player.z = ladder.z; player.y = ladder.height;
    player.vy = 0;
    camera.position.set(ladder.x, ladder.height + 1.7, ladder.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
    setTool('hose');
    toast(`Aerial platform — ${ladder.height.toFixed(0)} m · Scroll to adjust height`);
  }

  function toggleDrone() {
    if (drone.active) {
      drone.active = false;
      camera.position.set(player.x, player.y + 1.7, player.z);
      camera.rotation.set(player.pitch, player.yaw, 0);
      setTool('hose');
      spraying = false;
      toast('Drone recalled.');
      return;
    }
    if (player.onLadder) { toast('Dismount the aerial platform before deploying the drone.', 'warn'); return; }
    drone.active = true;
    drone.x = player.x + Math.sin(player.yaw) * -2.5;
    drone.z = player.z + Math.cos(player.yaw) * -2.5;
    drone.y = 7;
    drone.yaw = player.yaw; drone.pitch = player.pitch;
    setTool('hose');
    if (hoseGroup) hoseGroup.visible = false;
    if (breachGroup) breachGroup.visible = false;
    spraying = false;
    camera.position.set(drone.x, drone.y + 0.75, drone.z);
    camera.rotation.set(drone.pitch, drone.yaw, 0);
    toast('Drone deployed — G recall · Space / C altitude');
  }

  function updateDrone(dt) {
    const boost = keys['shift'] ? 1.75 : 1;
    const f = (keys['w'] || keys['arrowup'] ? 1 : 0) - (keys['s'] || keys['arrowdown'] ? 1 : 0);
    const r = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
    const up = (keys[' '] ? 1 : 0) - (keys['c'] || keys['control'] ? 1 : 0);
    const sin = Math.sin(drone.yaw), cos = Math.cos(drone.yaw);
    const nx = drone.x + (-sin * f + cos * r) * 9 * boost * dt;
    const nz = drone.z + (-cos * f - sin * r) * 9 * boost * dt;
    const ny = clamp(drone.y + up * 6 * boost * dt, 2.5, 42);
    if (!droneBlocked(nx, ny, drone.z)) drone.x = nx;
    if (!droneBlocked(drone.x, ny, nz)) drone.z = nz;
    if (!droneBlocked(drone.x, ny, drone.z)) drone.y = ny;
    camera.position.set(drone.x, drone.y + 0.75, drone.z);
    camera.rotation.set(drone.pitch, drone.yaw, 0);
    updateDroneModel(dt);
  }

  function addStreetLamp(x, z) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 5.5, 6), new THREE.MeshStandardMaterial({ color: 0x2b3036, metalness: 0.6, roughness: 0.5 }));
    pole.position.set(0, 2.75, 0); g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), new THREE.MeshStandardMaterial({ color: 0x2b3036 }));
    arm.position.set(0.55, 5.35, 0); g.add(arm);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc87a }));
    bulb.position.set(1.1, 5.25, 0); g.add(bulb);
    const l = new THREE.PointLight(0xffb35c, 0.9, 16, 2); l.position.set(1.1, 5.2, 0); g.add(l);
    g.position.set(cellX(x), 0, cellZ(z));
    props.add(g);
  }

  function addFlare() {
    if (!world.flare) return;
    const f = world.flare;
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 2.5, 8), new THREE.MeshStandardMaterial({ color: 0x33383d, metalness: 0.7, roughness: 0.4 }));
    base.position.y = 1.2; g.add(base);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFlame, color: 0xffa04a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    flame.scale.set(5, 8, 1); flame.position.y = 5.2; g.add(flame);
    const l = new THREE.PointLight(0xff7a30, 2.4, 46, 1.8); l.position.y = 6; g.add(l);
    g.position.set(cellX(f.x), 0, cellZ(f.z));
    g.userData.flare = true;
    props.add(g);
    world.flareMesh = g;
  }

  function buildProps() {
    clearProps();
    world.flareMesh = null;
    world.boatMesh = null;
    for (const r of world.refills) addHydrant(r.x, r.z, r.kind === 'water');
    if (world.sceneId === 'city') { addStreetLamp(46, 70); addStreetLamp(30, 58); addStreetLamp(66, 52); }
    if (world.sceneId === 'reservoir') addBoat();
    addFlare();
    const lp = LADDER_POS[world.sceneId] || LADDER_POS.city;
    addLadderTruck(lp.x, lp.z);
    addDroneModel();
  }

  /* ------------------------------------------------------------ player */
  const player = {
    x: 0, z: 0, y: 0, vy: 0, yaw: 0, pitch: 0,
    health: 100, water: 140, maxWater: 140, bob: 0, speed: 0,
    shake: 0, tool: 'hose', onGround: true, down: false, onLadder: false,
  };
  const keys = {};
  let state = 'menu';
  let dbgFrames = 0, dbgPath = '';
  let currentScene = null;
  let currentMode = 'scene';
  let firestorm = null;
  let timeLeft = 0;
  let sceneElapsed = 0;
  let firesInitial = 0;
  let spraying = false;
  let breachCool = 0;
  let pointerLocked = false;
  let menuTab = 'deploy';
  let menuAngle = 0;
  let last = performance.now();
  let fireAcc = 0, waterAcc = 0, uiAcc = 0, simAcc = 0, sparkAcc = 0, ventAcc = 0, damageAcc = 0;
  let nearestFire = { d: 999, i: -1 };
  let calm = 0;
  let resultShown = false;
  let damBreached = false;
  let toastTimer = null;
  let stormAcc = 0;
  let stormNext = 2;
  let stormCalm = 0;
  let lastIgnition = null;

  function resetPlayer() {
    const s = world.scene;
    const sp = s ? s.spawn : { x: 48, z: 74, yaw: 0 };
    player.x = cellX(sp.x);
    player.z = cellZ(sp.z);
    player.y = 0; player.vy = 0;
    player.yaw = sp.yaw || 0; player.pitch = (sp.pitch !== undefined ? sp.pitch : -0.02);
    player.health = 100; player.water = player.maxWater;
    player.tool = 'hose'; player.bob = 0; player.shake = 0; player.down = false;
    player.onLadder = false;
    spraying = false; breachCool = 0; damageAcc = 0;
    ladder.height = 18;
    if (ladder.group) setLadderHeight(18);
    drone.active = false;
    if (drone.model) { drone.model.visible = true; drone.model.position.set(player.x + 1.6, 1.8, player.z + 1.2); }
    setTool('hose');
    camera.position.set(player.x, player.y + 1.7, player.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
  }

  function blockedAt(x, z) {
    const rad = 0.46;
    const offs = [[0, 0], [rad, 0], [-rad, 0], [0, rad], [0, -rad], [rad, rad], [-rad, -rad], [rad, -rad], [-rad, rad]];
    for (const [ox, oz] of offs) {
      const wx = x + ox, wz = z + oz;
      const cx = Math.floor((wx + WORLD_W / 2) / CS);
      const cz = Math.floor((wz + WORLD_D / 2) / CS);
      if (cx < 0 || cx >= SX || cz < 0 || cz >= SZ) return true;
      for (let y = 1; y <= 2; y++) {
        const m = world.mat[world.idx(cx, y, cz)];
        if (m !== MAT.AIR && m !== MAT.WATER) return true;
      }
      if (world.waterActive) {
        const d = world.water.depth[cz * SX + cx] || 0;
        if (d > 0.85) return true;
      }
    }
    return false;
  }

  function updatePlayer(dt) {
    if (drone.active) { updateDrone(dt); return; }
    if (player.onLadder) {
      player.y = ladder.height;
      player.water = Math.min(player.maxWater, player.water + dt * 11);
      camera.position.set(ladder.x, ladder.height + 1.7, ladder.z);
      camera.rotation.set(player.pitch, player.yaw, 0);
      player.shake = Math.max(0, player.shake - dt * 2.2);
      if (hoseGroup) {
        hoseGroup.position.set(0.34, -0.3, -0.55);
        hoseGroup.rotation.set(0, 0, 0);
      }
      return;
    }
    const sprint = keys['shift'] ? 1.62 : 1;
    let f = 0, r = 0;
    if (keys['w'] || keys['arrowup']) f += 1;
    if (keys['s'] || keys['arrowdown']) f -= 1;
    if (keys['d'] || keys['arrowright']) r += 1;
    if (keys['a'] || keys['arrowleft']) r -= 1;
    const len = Math.hypot(f, r);
    let moving = 0;
    if (len > 0) {
      f /= len; r /= len;
      const sp = 4.3 * sprint;
      const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
      const dx = (-sin * f + cos * r) * sp * dt;
      const dz = (-cos * f - sin * r) * sp * dt;
      if (!blockedAt(player.x + dx, player.z)) player.x += dx; else moving = 1;
      if (!blockedAt(player.x, player.z + dz)) player.z += dz; else moving = 1;
      player.speed = sp; moving = 2;
    } else player.speed = 0;
    player.x = clamp(player.x, -WORLD_W / 2 + 2, WORLD_W / 2 - 2);
    player.z = clamp(player.z, -WORLD_D / 2 + 2, WORLD_D / 2 - 2);

    // jump / gravity
    if (keys[' '] && player.onGround) { player.vy = 4.6; player.onGround = false; }
    player.vy -= 15 * dt;
    player.y += player.vy * dt;
    if (player.y <= 0) { player.y = 0; player.vy = 0; player.onGround = true; }

    // bob
    if (moving) player.bob += dt * (keys['shift'] ? 13 : 9);
    const bob = Math.sin(player.bob) * 0.032 * (player.onGround ? 1 : 0.3);
    player.shake = Math.max(0, player.shake - dt * 2.2);
    const sh = player.shake * 0.12;
    camera.position.set(
      player.x + (Math.random() - 0.5) * sh,
      player.y + 1.7 + bob + (Math.random() - 0.5) * sh,
      player.z + (Math.random() - 0.5) * sh
    );
    camera.rotation.set(player.pitch, player.yaw, 0);
    // viewmodel
    if (hoseGroup) {
      hoseGroup.position.set(0.34 + Math.sin(player.bob) * 0.008, -0.3 + Math.abs(Math.sin(player.bob)) * 0.012, -0.55 + (spraying ? 0.018 : 0));
      hoseGroup.rotation.z = Math.sin(player.bob) * 0.008;
      hoseGroup.rotation.x = spraying ? 0.02 : 0;
    }
    if (breachGroup) {
      breachGroup.position.set(0.4, -0.32 + Math.abs(Math.sin(player.bob)) * 0.012, -0.6);
      breachGroup.rotation.z = Math.sin(player.bob) * 0.01;
    }
    updateHealth(dt);
  }

  function updateHealth(dt) {
    if (state !== 'play') return;
    damageAcc += dt;
    if (damageAcc > 0.18) {
      damageAcc = 0;
      nearestFire = nearestBurning(player.x, player.z);
      const headY = player.y + 1.4;
      const cx = Math.floor((player.x + WORLD_W / 2) / CS);
      const cz = Math.floor((player.z + WORLD_D / 2) / CS);
      let heat = 0;
      for (let y = 1; y <= 3; y++) {
        if (cx >= 0 && cx < SX && cz >= 0 && cz < SZ) {
          const t = world.temp[world.idx(cx, y, cz)];
          if (t > 90) heat = Math.max(heat, t);
        }
      }
      const near = nearestFire.d < 7 ? 1 - nearestFire.d / 7 : 0;
      const danger = Math.min(1, near * 0.9 + clamp((heat - 90) / 450, 0, 1));
      if (danger > 0.18) {
        player.health -= danger * 10.5 * 0.18;
        player.shake = Math.max(player.shake, danger * 0.5);
      } else if (player.health < 100) {
        player.health = Math.min(100, player.health + 0.8 * 0.18);
      }
      player.health = clamp(player.health, 0, 100);
      document.body.classList.toggle('hurt', player.health < 55 || danger > 0.55);
      if (player.health <= 0 && !player.down) {
        player.down = true;
        endScene(false, 'Overcome by smoke and heat.');
      }
    }
  }

  function nearestBurning(x, z) {
    let d = 999, i = -1;
    for (const idx of world.burning) {
      const bx = idx % SX, bz = ((idx / SX) | 0) % SZ;
      const dd = Math.hypot(cellX(bx) - x, cellZ(bz) - z);
      if (dd < d) { d = dd; i = idx; }
    }
    return { d, i };
  }

  /* ------------------------------------------------------------ hose viewmodel */
  const hoseGroup = new THREE.Group();
  const breachGroup = new THREE.Group();
  const nozzleTip = new THREE.Object3D();
  let waterLine = null;
  let waterStream = null;

  function buildHose() {
    const dark = new THREE.MeshStandardMaterial({ color: 0x23272c, roughness: 0.6, metalness: 0.2, depthTest: false, depthWrite: false });
    const red = new THREE.MeshStandardMaterial({ color: 0xa32b22, roughness: 0.45, metalness: 0.25, depthTest: false, depthWrite: false });
    const brass = new THREE.MeshStandardMaterial({ color: 0xc79a4a, roughness: 0.3, metalness: 0.85, depthTest: false, depthWrite: false });
    const glove = new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.85, depthTest: false, depthWrite: false });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.095, 0.62, 12), red);
    body.rotation.x = Math.PI / 2; body.position.set(0, 0, -0.32); body.renderOrder = 999; hoseGroup.add(body);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 0.23, 12), brass);
    nozzle.rotation.x = Math.PI / 2; nozzle.position.set(0, 0, -0.74); nozzle.renderOrder = 999; hoseGroup.add(nozzle);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.018, 6, 14), dark);
    ring.position.set(0, 0, -0.6); ring.renderOrder = 999; hoseGroup.add(ring);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.12), dark);
    handle.position.set(0, -0.14, -0.48); handle.renderOrder = 999; hoseGroup.add(handle);
    const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 12), brass);
    gauge.rotation.x = Math.PI / 2; gauge.position.set(0, 0.09, -0.55); gauge.renderOrder = 999; hoseGroup.add(gauge);
    // two gloves
    for (const [gx, gy, gz, rz] of [[0.02, -0.14, -0.58, -0.12], [0.15, -0.16, -0.38, 0.18]]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.21), glove);
      h.position.set(gx, gy, gz); h.rotation.z = rz; h.renderOrder = 999; hoseGroup.add(h);
    }
    // hose tube from the bottom of the screen
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.72, -1.15, 0.1),
      new THREE.Vector3(0.62, -0.8, -0.05),
      new THREE.Vector3(0.42, -0.5, -0.3),
      new THREE.Vector3(0.08, -0.2, -0.55),
    ]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.038, 8, false), dark);
    tube.renderOrder = 999; hoseGroup.add(tube);
    nozzleTip.position.set(0, 0, -0.86);
    hoseGroup.add(nozzleTip);
    hoseGroup.position.set(0.34, -0.3, -0.55);
    camera.add(hoseGroup);

    // breach tool: a compact demolition axe
    const handleM = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.8, depthTest: false, depthWrite: false });
    const headM = new THREE.MeshStandardMaterial({ color: 0x8a919a, roughness: 0.35, metalness: 0.8, depthTest: false, depthWrite: false });
    const bHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.9, 8), handleM);
    bHandle.rotation.z = 0.25; bHandle.rotation.x = 0.15; bHandle.position.set(0, -0.1, -0.55); bHandle.renderOrder = 999; breachGroup.add(bHandle);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.14), headM);
    head.position.set(-0.12, 0.34, -0.55); head.rotation.z = 0.25; head.renderOrder = 999; breachGroup.add(head);
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 6), headM);
    spike.position.set(-0.32, 0.38, -0.55); spike.rotation.z = 1.9; spike.renderOrder = 999; breachGroup.add(spike);
    breachGroup.position.set(0.4, -0.32, -0.6);
    breachGroup.visible = false;
    camera.add(breachGroup);

    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    waterLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }));
    waterLine.frustumCulled = false;
    waterLine.visible = false;
    scene.add(waterLine);
    const sg = new THREE.CylinderGeometry(0.07, 0.11, 1, 8, 1, true);
    waterStream = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
    waterStream.frustumCulled = false;
    waterStream.visible = false;
    scene.add(waterStream);
  }

  function setTool(tool) {
    if (drone.active && tool !== 'hose') return;
    player.tool = tool;
    if (hoseGroup) hoseGroup.visible = tool === 'hose';
    if (breachGroup) breachGroup.visible = tool === 'breach';
    document.body.classList.toggle('tool-breach', tool === 'breach');
    const t = $('toolName'), k = $('toolKey');
    if (t) t.textContent = tool === 'hose' ? 'HOSE' : 'BREACH';
    if (k) k.textContent = tool === 'hose' ? '1' : '2';
  }

  /* ------------------------------------------------------------ water */
  function nozzleWorld(out) {
    nozzleTip.getWorldPosition(out);
    return out;
  }

  const rayDir = new THREE.Vector3();
  const nozzlePos = new THREE.Vector3();
  let currentHit = null;

  function updateWater(dt) {
    if (!waterLine) return;
    if (state !== 'play' || player.tool !== 'hose' || !spraying || player.water <= 0) {
      waterLine.visible = false;
      if (waterStream) waterStream.visible = false;
      return;
    }
    camera.getWorldDirection(rayDir);
    const ox = camera.position.x, oy = camera.position.y, oz = camera.position.z;
    const hit = world.raycast(ox, oy, oz, rayDir.x, rayDir.y, rayDir.z, 84);
    currentHit = hit;
    if (drone.active) {
      nozzlePos.copy(camera.position).addScaledVector(rayDir, 0.55);
      nozzlePos.y -= 0.12;
    } else {
      nozzleWorld(nozzlePos);
    }
    const end = new THREE.Vector3(hit.wx, hit.wy, hit.wz);
    const start = nozzlePos.clone();
    // gentle arc
    const mid = start.clone().lerp(end, 0.5); mid.y -= Math.min(3.5, start.distanceTo(end) * 0.1);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const arr = waterLine.geometry.attributes.position.array;
    for (let k = 0; k < 2; k++) {
      const p = curve.getPoint(k === 0 ? 0 : 1);
      arr[k * 3] = p.x; arr[k * 3 + 1] = p.y; arr[k * 3 + 2] = p.z;
    }
    waterLine.geometry.attributes.position.needsUpdate = true;
    waterLine.visible = true;
    if (waterStream) {
      const dv = end.clone().sub(start);
      const len = dv.length();
      waterStream.visible = true;
      waterStream.position.copy(start).add(end).multiplyScalar(0.5);
      waterStream.scale.set(1, len, 1);
      waterStream.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dv.normalize());
    }

    player.water = Math.max(0, player.water - dt * 6.2);
    // particles along stream
    const dist = start.distanceTo(end);
    const n = Math.min(34, Math.floor(dist * 1.3) + 8);
    const wc = new THREE.Color(0xbfe9ff);
    for (let k = 0; k < n; k++) {
      const t = Math.random();
      const p = curve.getPoint(t);
      const spread = 0.08 + t * 0.35;
      waterPS.spawn(p.x + (Math.random() - 0.5) * spread, p.y + (Math.random() - 0.5) * spread, p.z + (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * 1.5, -1 - Math.random() * 2, (Math.random() - 0.5) * 1.5,
        0.2 + Math.random() * 0.25, 0.34 + Math.random() * 0.42, wc, 0.95);
    }
    if (Math.random() < dt * 18) {
      for (let k = 0; k < 12; k++)
        waterPS.spawn(end.x, end.y, end.z, (Math.random() - 0.5) * 4, Math.random() * 4, (Math.random() - 0.5) * 4, 0.45 + Math.random() * 0.4, 0.45 + Math.random() * 0.3, wc, 0.9);
    }
    // apply extinguish at 18 Hz
    waterAcc += dt;
    if (waterAcc > 0.055) {
      const h = world.applyWater(hit.x, hit.y, hit.z, 2.15, waterAcc);
      waterAcc = 0;
      if (h > 0) Sound.splash();
    }
  }

  function tryRefill(dt) {
    if (!keys['e'] || state !== 'play') return;
    const ax = drone.active ? drone.x : player.x;
    const az = drone.active ? drone.z : player.z;
    let near = null, best = 4.2;
    for (const r of world.refills) {
      const d = Math.hypot(cellX(r.x) - ax, cellZ(r.z) - az);
      if (d < best) { best = d; near = r; }
    }
    // reservoir edge
    if (world.waterActive) {
      const cx = Math.floor((ax + WORLD_W / 2) / CS);
      const cz = Math.floor((az + WORLD_D / 2) / CS);
      for (let dz = -3; dz <= 3; dz++)
        for (let dx = -3; dx <= 3; dx++) {
          const d = world.water.depth[(cz + dz) * SX + cx + dx] || 0;
          if (d > 0.3 && Math.hypot(dx * CS, dz * CS) < best) { best = Math.hypot(dx * CS, dz * CS); near = { x: cx + dx, z: cz + dz, kind: 'water' }; }
        }
    }
    if (near && player.water < player.maxWater) {
      player.water = Math.min(player.maxWater, player.water + dt * 42);
      setPrompt('Refilling the tank…');
    }
  }

  /* ------------------------------------------------------------ breach tool */
  function useBreach() {
    if (state !== 'play' || player.tool !== 'breach' || breachCool > 0) return;
    breachCool = 0.45;
    camera.getWorldDirection(rayDir);
    const hit = world.raycast(camera.position.x, camera.position.y, camera.position.z, rayDir.x, rayDir.y, rayDir.z, 28);
    if (hit.i < 0) { toast('Nothing solid in reach.', 'warn'); return; }
    const before = world.mat[hit.i];
    if (before === MAT.GRASS || before === MAT.DIRT) { toast('The tool only breaks structures.', 'warn'); return; }
    const removed = world.removeSphere(hit.x, hit.y, hit.z, 1.45);
    if (removed > 0) {
      player.shake = Math.max(player.shake, 0.35);
      for (let k = 0; k < 22; k++) {
        const c = new THREE.Color(k % 3 ? 0x9a958a : 0x6f665a);
        dustPS.spawn(hit.wx + (Math.random() - 0.5) * 2, hit.wy + Math.random() * 2, hit.wz + (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2, 0.8 + Math.random(), 0.8, c, 0.45);
      }
      Sound.boom(0.25);
      if (world.sceneId === 'reservoir') {
        const cx = Math.floor((hit.wx + WORLD_W / 2) / CS), cz = Math.floor((hit.wz + WORLD_D / 2) / CS);
        if (cz >= world.damZ - 1 && cz <= world.damZ + 5) {
          if (!damBreached) toast('The dam is breached — get clear!', 'warn');
          damBreached = true;
          Sound.boom(0.6);
          player.shake = 0.8;
        }
      }
    }
  }

  /* ------------------------------------------------------------ scenes */
  function setPrompt(text) { $('hudPrompt').textContent = text; $('hudPrompt').classList.toggle('show', !!text); }
  function toast(text, kind = '') {
    const el = $('toast');
    el.textContent = text;
    el.className = 'toast show ' + kind;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast ' + kind; }, 2600);
  }

  function buildSceneWorld(id) {
    world.build(id);
    buildWorldMeshes();
    buildProps();
    setTool('hose');
    damBreached = false;
  }

  function startScene(id) {
    Sound.init();
    Sound.click();
    currentScene = id; currentMode = 'scene'; firestorm = null;
    buildSceneWorld(id);
    resetPlayer();
    timeLeft = world.scene.time; sceneElapsed = 0; firesInitial = world.burningCount;
    calm = 0; resultShown = false; stormNext = 2;
    state = 'lock';
    $('menu').classList.remove('show');
    $('menu').classList.add('hidden');
    $('result').classList.add('hidden');
    $('pause').classList.add('hidden');
    hud.classList.add('hidden');
    showLock(world.scene.name, 'Take the hose and make entry. Read the objective, then click to lock the mouse.');
    updateHUD(true);
    camera.position.set(player.x, player.y + 1.7, player.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
    ensureMenuHidden();
  }

  function startFirestorm(id) {
    const def = FIRESTORM.find(f => f.id === id);
    if (!def) return;
    Sound.init(); Sound.click();
    currentScene = 'city'; currentMode = 'firestorm'; firestorm = def;
    buildSceneWorld('city');
    // clear the scripted city fire
    world.burn.fill(0); world.temp.fill(20); world.burning.length = 0; world.burningSet.clear(); world.burningCount = 0;
    applyDirty();
    resetPlayer();
    timeLeft = def.time; sceneElapsed = 0; firesInitial = 0;
    stormInit(def);
    resultShown = false; damBreached = false;
    state = 'lock';
    $('menu').classList.remove('show'); $('menu').classList.add('hidden');
    $('result').classList.add('hidden'); $('pause').classList.add('hidden');
    hud.classList.add('hidden');
    showLock('Firestorm · ' + def.name, 'The city will keep reigniting. Extinguish every ignition before the fire cap or the clock runs out.');
    updateHUD(true);
    camera.position.set(player.x, player.y + 1.7, player.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
  }

  function ensureMenuHidden() {
    const m = $('menu');
    m.classList.add('hidden'); m.classList.remove('show');
  }

  function showLock(title, text) {
    $('lockTitle').textContent = title;
    $('lockText').textContent = text;
    $('lockOverlay').classList.remove('hidden');
    $('lockOverlay').classList.add('show');
  }
  function hideLock() {
    $('lockOverlay').classList.remove('show');
    $('lockOverlay').classList.add('hidden');
  }

  function beginPlay() {
    if (state !== 'lock' && state !== 'paused') return;
    state = 'play';
    hideLock();
    $('pause').classList.remove('show'); $('pause').classList.add('hidden');
    hud.classList.remove('hidden');
    document.body.classList.remove('hurt');
    Sound.init();
    if (document.pointerLockElement !== canvas) {
      try { canvas.requestPointerLock(); } catch (e) { /* noop */ }
    }
    toast(currentMode === 'firestorm' ? 'Firestorm — keep moving.' : `${world.scene.name} — ${world.scene.obj}`);
  }

  function pauseGame() {
    if (state !== 'play') return;
    state = 'paused';
    $('pause').classList.remove('hidden'); $('pause').classList.add('show');
    spraying = false;
    keys[' '] = false;
    document.body.classList.remove('hurt');
  }

  function endScene(win, reason) {
    if (state === 'result') return;
    state = 'result';
    resultShown = true;
    spraying = false;
    if (document.pointerLockElement) document.exitPointerLock();
    const m = world.metrics();
    const firesNow = world.burningCount;
    const used = Math.max(0, world.scene ? world.scene.time : 0) - timeLeft;
    const stats = [];
    if (currentMode === 'firestorm') {
      const def = firestorm;
      const progress = def.total - Math.max(0, stormAiLeft);
      stats.push({ v: progress + '/' + def.total, l: 'IGNITIONS' });
      stats.push({ v: fmtTime(timeLeft), l: 'TIME LEFT' });
      stats.push({ v: firesNow, l: 'BURNING' });
      $('resultKicker').textContent = win ? 'FIRESTORM CLEARED' : 'FIRESTORM FAILED';
      $('resultTitle').textContent = win ? 'The city holds.' : 'The fire won.';
      $('resultTitle').className = win ? 'win' : 'lose';
      $('resultSub').textContent = win ? `You cleared ${progress} ignitions and kept the city standing.` : reason;
      if (win) saveStorm(firestorm.id);
    } else {
      const pct = world.scene.metric === 'city'
        ? Math.round((m.structFrac || 0) * 100) + '%'
        : world.scene.metric === 'trees'
          ? Math.round((m.leafFrac || 0) * 100) + '%'
          : '—';
      stats.push({ v: fmtTime(used), l: 'TIME' });
      stats.push({ v: Math.max(0, firesInitial - firesNow), l: 'FIRES OUT' });
      stats.push({ v: pct, l: world.scene.metric === 'city' ? 'CITY INTACT' : 'FOREST SAVED' });
      $('resultKicker').textContent = win ? 'INCIDENT CLOSED' : 'INCIDENT LOST';
      $('resultTitle').textContent = win ? 'Fire out.' : 'The fire won.';
      $('resultTitle').className = win ? 'win' : 'lose';
      $('resultSub').textContent = win ? `${world.scene.name} — ${world.scene.obj}.` : reason;
    }
    $('resultStats').innerHTML = stats.map(s => `<div class="result-stat"><b>${s.v}</b><span>${s.l}</span></div>`).join('');
    $('result').classList.remove('hidden');
    $('result').classList.add('show');
    hud.classList.add('hidden');
    if (win) Sound.win(); else Sound.lose();
  }

  function openMenu() {
    state = 'menu';
    if (document.pointerLockElement) document.exitPointerLock();
    spraying = false;
    hud.classList.add('hidden');
    $('pause').classList.remove('show'); $('pause').classList.add('hidden');
    $('result').classList.remove('show'); $('result').classList.add('hidden');
    $('lockOverlay').classList.remove('show'); $('lockOverlay').classList.add('hidden');
    $('menu').classList.remove('hidden'); $('menu').classList.add('show');
    buildSceneWorld('city');
    player.x = 0; player.z = 70; player.y = 0; player.yaw = 0; player.pitch = 0;
    currentScene = 'city'; currentMode = 'menu'; firestorm = null;
    menuAngle = 0.7;
    renderMenu(menuTab);
  }

  /* ------------------------------------------------------------ menu */
  function loadStorm() { try { return JSON.parse(localStorage.getItem('ember3d-firestorm') || '{}'); } catch (e) { return {}; } }
  function saveStorm(id) {
    try { const p = loadStorm(); p[id] = { cleared: true, at: Date.now() }; localStorage.setItem('ember3d-firestorm', JSON.stringify(p)); } catch (e) { /* noop */ }
  }

  function renderMenu(tab) {
    menuTab = tab;
    document.querySelectorAll('#menuNav button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    const list = $('menuList');
    if (tab === 'deploy') {
      list.innerHTML = Object.values(SCENES).map(s => `
        <button class="scene-card" data-scene="${s.id}" type="button" style="--accent:${s.accent}">
          <div class="scene-num">${s.num}<span class="scene-tag">${s.tag}</span><span class="scene-badge">${s.icon}</span></div>
          <h3>${s.name}</h3>
          <p>${s.desc}</p>
          <div class="scene-meta"><span>${s.obj}</span><b>${fmtTime(s.time)}</b></div>
        </button>`).join('');
      list.querySelectorAll('[data-scene]').forEach(b => b.onclick = () => startScene(b.dataset.scene));
    } else if (tab === 'firestorm') {
      const p = loadStorm();
      list.innerHTML = FIRESTORM.map((f, i) => `
        <button class="scene-card firestorm-card" data-storm="${f.id}" type="button" style="--accent:#ff8a4c">
          <div class="scene-num">0${i + 1}<span class="scene-tag">${f.total} IGNITIONS</span></div>
          <h3>${f.name}</h3>
          <p>${f.desc}. The city keeps reigniting and you only have one hose.</p>
          <div class="scene-meta"><span>${Math.round(f.time / 60)} MIN · CAP ${f.maxFire}</span><b>${p[f.id] ? 'CLEARED' : 'NOT CLEARED'}</b></div>
        </button>`).join('');
      list.querySelectorAll('[data-storm]').forEach(b => b.onclick = () => startFirestorm(b.dataset.storm));
    } else {
      list.innerHTML = `
        <div class="help-box">
          <h3>First person. One hose. Real consequences.</h3>
          <div class="cols">
            <div>
              <p><b>Move</b> WASD · <b>look</b> mouse · <b>sprint</b> Shift · <b>jump</b> Space</p>
              <p><b>Spray</b> hold left mouse. Water drains the tank; <b>hold E</b> near a hydrant, water point or the reservoir to refill.</p>
              <p><b>Breach tool</b> press 2. It breaks concrete, stone, wood and metal — including the reservoir dam. Switch back with 1.</p>
              <p><b>Pause</b> Esc · <b>restart</b> R · <b>mute</b> M</p>
            </div>
            <div>
              <p><b>Tank fires:</b> a tank that is heated by nearby fire will BLEVE. Cool it with water before the gauge fills, or the refinery is lost.</p>
              <p><b>Reservoir:</b> breach the dam and the shallow-water sim floods the valley, dousing ground fires and changing the level of the lake. The boat floats on the live surface.</p>
              <p><b>Firestorm:</b> the AI ignites the city; the orange beam marks each ignition. Clear the budget before the fire cap or the clock.</p>
            </div>
          </div>
        </div>`;
    }
  }

  document.querySelectorAll('#menuNav button').forEach(b => {
    b.addEventListener('click', () => { Sound.init(); Sound.click(); renderMenu(b.dataset.tab); });
  });

  /* ------------------------------------------------------------ HUD */
  function updateHUD(force) {
    if (state === 'menu') return;
    const m = world.metrics();
    const fires = world.burningCount;
    $('hudFires').textContent = fires;
    $('hudFires').classList.toggle('warn', fires > 180);
    $('hudTime').textContent = fmtTime(timeLeft);
    $('hudTime').classList.toggle('warn', timeLeft < 30);
    const w = Math.round((player.water / player.maxWater) * 100);
    $('waterBar').style.width = w + '%';
    $('waterText').textContent = Math.round(player.water) + ' L';
    $('healthBar').style.width = Math.round(player.health) + '%';
    $('healthBar').classList.toggle('low', player.health < 45);
    $('healthText').textContent = Math.round(player.health);
    $('hudIgnitionsWrap').classList.toggle('hidden', currentMode !== 'firestorm');
    if (currentMode === 'firestorm') {
      $('hudIgnitions').textContent = stormAiLeft + '/' + firestorm.total;
      $('hudIgnitions').classList.toggle('warn', stormAiLeft < 4);
    }
    if (currentMode === 'firestorm') {
      $('hudScene').textContent = 'FIRESTORM · ' + firestorm.name.toUpperCase();
      $('hudObjective').textContent = 'Clear every ignition. The city keeps reigniting.';
      $('hudProgress').textContent = `IGNITIONS LEFT ${stormAiLeft} · FIRE ${fires}/${firestorm.maxFire}`;
    } else {
      const s = world.scene;
      $('hudScene').textContent = s.name.toUpperCase();
      $('hudObjective').textContent = s.obj;
      let prog = '';
      if (s.id === 'cabin') prog = `PINES ${Math.round(m.leafFrac * 100)}% · CABIN ${Math.round(m.cabinFrac * 100)}%`;
      else if (s.id === 'deep') prog = `FOREST ${Math.round(m.leafFrac * 100)}%`;
      else if (s.id === 'city') prog = `CITY INTACT ${Math.round(m.structFrac * 100)}%`;
      else if (s.id === 'refinery') {
        const hot = world.tanks.reduce((a, t) => t.exploded ? a : Math.max(a, t.heat), 0);
        prog = world.tanksExploded ? `TANKS LOST · ${world.tanksExploded}` : `TANK HEAT ${Math.round(hot)}% · ${world.tanks.length} TANKS`;
      } else if (s.id === 'reservoir') prog = `FOREST ${Math.round(m.leafFrac * 100)}%${damBreached ? ' · DAM BREACHED' : ' · DAM INTACT'}`;
      else prog = 'LIVE BURN';
      $('hudProgress').textContent = prog;
    }
    if (drone.active) { $('toolName').textContent = 'DRONE'; $('toolKey').textContent = 'G'; }
    else if (player.onLadder) { $('toolName').textContent = 'AERIAL'; $('toolKey').textContent = 'F'; }
    else { $('toolName').textContent = player.tool === 'hose' ? 'HOSE' : 'BREACH'; $('toolKey').textContent = player.tool === 'hose' ? '1' : '2'; }
  }

  function updatePrompt() {
    if (state !== 'play') return;
    if (keys['e']) { setPrompt('Refilling…'); return; }
    if (drone.active) {
      const ax = drone.x, az = drone.z;
      let near = false;
      for (const r of world.refills) if (Math.hypot(cellX(r.x) - ax, cellZ(r.z) - az) < 4.2) near = true;
      if (world.waterActive) {
        const cx = Math.floor((ax + WORLD_W / 2) / CS), cz = Math.floor((az + WORLD_D / 2) / CS);
        if ((world.water.depth[cz * SX + cx] || 0) > 0.25) near = true;
      }
      if (near && player.water < player.maxWater) { setPrompt('Hold E to refill the drone tank'); return; }
      setPrompt('G — recall drone · Space / C — altitude');
      return;
    }
    if (player.onLadder) {
      setPrompt('F — dismount · Scroll — adjust platform');
      return;
    }
    if (Math.hypot(player.x - ladder.x, player.z - ladder.z) < 12) {
      setPrompt('F — ride the aerial ladder');
      return;
    }
    let near = false;
    for (const r of world.refills) if (Math.hypot(cellX(r.x) - player.x, cellZ(r.z) - player.z) < 4.2) near = true;
    if (world.waterActive) {
      const cx = Math.floor((player.x + WORLD_W / 2) / CS), cz = Math.floor((player.z + WORLD_D / 2) / CS);
      if ((world.water.depth[cz * SX + cx] || 0) > 0.25) near = true;
    }
    if (near && player.water < player.maxWater) setPrompt(player.tool === 'breach' ? 'Hold E to refill the tank' : 'Hold E to refill');
    else if (near) setPrompt('Tank full');
    else setPrompt('G — deploy drone');
  }

  /* ------------------------------------------------------------ fire effects */
  function spawnFireEffects(dt) {
    const b = world.burning;
    if (!b.length) {
      for (const l of fireLights) l.intensity = Math.max(0, l.intensity - dt * 4);
      return;
    }
    const count = b.length;
    let accents = 0;
    const maxAccent = 70;
    for (let k = 0; k < Math.min(count, 160); k++) {
      if (Math.random() > Math.min(1, dt * 28)) continue;
      const i = b[(Math.random() * count) | 0];
      const x = i % SX, z = ((i / SX) | 0) % SZ, y = (i / (SX * SZ)) | 0;
      const wx = cellX(x) + (Math.random() - 0.5) * 1.6;
      const wy = y * CS + Math.random() * 1.6;
      const wz = cellZ(z) + (Math.random() - 0.5) * 1.6;
      const c = new THREE.Color().setHSL(0.06 + Math.random() * 0.04, 1, 0.58 + Math.random() * 0.2);
      firePS.spawn(wx, wy, wz, (Math.random() - 0.5) * 1.6, 2.4 + Math.random() * 4.4, (Math.random() - 0.5) * 1.6, 0.6 + Math.random() * 0.9, 1.3 + Math.random() * 2.4, c, 0.95);
      if (Math.random() < 0.25) {
        const sc = new THREE.Color(0x2c2a28);
        smokePS.spawn(wx, wy + 1.2, wz, (Math.random() - 0.5) * 1.4, 2.6 + Math.random() * 3.4, (Math.random() - 0.5) * 1.4, 3.0 + Math.random() * 3.2, 1.8 + Math.random() * 2.2, sc, 0.62);
      }
      if (Math.random() < 0.1) {
        sparkPS.spawn(wx, wy + 0.6, wz, (Math.random() - 0.5) * 6, 3 + Math.random() * 5, (Math.random() - 0.5) * 6, 0.5 + Math.random() * 0.8, 0.2, new THREE.Color(0xffb060), 0.9);
      }
    }
    // fire lights: strongest near the player
    const sorted = b.slice(0, Math.min(b.length, 400));
    let best = [];
    for (const i of sorted) {
      const x = cellX(i % SX), z = cellZ(((i / SX) | 0) % SZ);
      const d = Math.hypot(x - player.x, z - player.z);
      if (d < 60) best.push({ x, z, d });
    }
    best.sort((a, b2) => a.d - b2.d);
    for (let k = 0; k < fireLights.length; k++) {
      const l = fireLights[k];
      if (best[k]) {
        l.position.set(best[k].x, 4 + Math.random() * 4, best[k].z);
        l.intensity = lerp(l.intensity, 3.4 * (1 - best[k].d / 70), 0.2);
      } else {
        l.intensity = Math.max(0, l.intensity - 0.2);
      }
    }
    // big additive glows, one per nearby fire cell
    const near = [];
    for (const idx of b) {
      const x = idx % SX, z = ((idx / SX) | 0) % SZ, y = (idx / (SX * SZ)) | 0;
      const wx = cellX(x), wz = cellZ(z);
      const d = Math.hypot(wx - player.x, wz - player.z);
      if (d < 85) near.push({ wx, wy: y * CS + 1, wz, d });
    }
    near.sort((a, b2) => a.d - b2.d);
    for (let k = 0; k < fireGlows.length; k++) {
      const g = fireGlows[k];
      if (near[k]) {
        g.visible = true;
        g.position.set(near[k].wx, near[k].wy, near[k].wz);
        const s = 7 + Math.min(13, count * 0.7) + Math.sin(performance.now() * 0.006 + k) * 1.5;
        g.scale.set(s, s, 1);
        g.material.opacity = 0.38 + 0.1 * Math.sin(performance.now() * 0.009 + k);
      } else {
        g.visible = false;
      }
    }
  }

  function spawnVents(dt) {
    for (const v of world.steamVents) {
      const rate = v.kind === 'cooling' ? 8 : v.kind === 'hydro' ? 10 : 2.5;
      if (Math.random() < dt * rate) {
        const wx = cellX(v.x) + (Math.random() - 0.5) * 2;
        const wz = cellZ(v.z) + (Math.random() - 0.5) * 2;
        if (v.kind === 'cooling') {
          for (let k = 0; k < 2; k++) steamPS.spawn(wx + (Math.random() - 0.5) * 3, v.y * CS, wz + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 1.5, 2 + Math.random() * 2, (Math.random() - 0.5) * 1.5, 3 + Math.random() * 3, 1.8 + Math.random() * 2, new THREE.Color(0xcfd8de), 0.32);
        } else if (v.kind === 'hydro') {
          waterPS.spawn(wx, 2, wz, (Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3, 0.8 + Math.random(), 0.35, new THREE.Color(0xcdefff), 0.8);
          steamPS.spawn(wx, 3, wz, (Math.random() - 0.5) * 1, 2, (Math.random() - 0.5) * 1, 1.5, 0.9, new THREE.Color(0xd8e2e8), 0.25);
        } else {
          steamPS.spawn(wx, v.y * CS, wz, (Math.random() - 0.5) * 1, 1.5, (Math.random() - 0.5) * 1, 3.5, 1.6, new THREE.Color(0x5b5b5b), 0.35);
        }
      }
    }
    // flare
    if (world.flareMesh && world.flare) {
      const f = world.flare;
      const wx = cellX(f.x), wz = cellZ(f.z);
      if (Math.random() < dt * 22) {
        firePS.spawn(wx + (Math.random() - 0.5) * 0.5, f.y * CS + Math.random() * 1.2, wz + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.6, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 0.6, 0.4 + Math.random() * 0.4, 0.5 + Math.random() * 0.5, new THREE.Color(0xffa24a), 0.8);
      }
      if (Math.random() < dt * 2.5) {
        const g = world.flareMesh; g.rotation.y += dt * 0.2;
        g.children[1].scale.set(5 + Math.sin(performance.now() * 0.008) * 0.5, 8 + Math.cos(performance.now() * 0.01) * 0.7, 1);
      }
    }
  }

  function handleEvents() {
    for (const ev of world.takeEvents()) {
      if (ev.type === 'glass') {
        const wx = cellX(ev.x), wy = ev.y * CS, wz = cellZ(ev.z);
        for (let k = 0; k < 8; k++) sparkPS.spawn(wx, wy, wz, (Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4, 0.5 + Math.random() * 0.6, 0.15, new THREE.Color(0xa8d8ff), 0.8);
      } else if (ev.type === 'douse') {
        const wx = cellX(ev.x), wy = ev.y * CS, wz = cellZ(ev.z);
        for (let k = 0; k < 4; k++) steamPS.spawn(wx, wy, wz, (Math.random() - 0.5) * 1.5, 1 + Math.random() * 2, (Math.random() - 0.5) * 1.5, 1.4, 0.8, new THREE.Color(0xd0dde3), 0.28);
      } else if (ev.type === 'steam') {
        // throttled by randomness
        if (Math.random() < 0.3) {
          const wx = cellX(ev.x), wy = ev.y * CS, wz = cellZ(ev.z);
          steamPS.spawn(wx, wy, wz, (Math.random() - 0.5) * 1.2, 1 + Math.random() * 2, (Math.random() - 0.5) * 1.2, 1.4, 0.7, new THREE.Color(0xd0dde3), 0.25);
        }
      } else if (ev.type === 'explode') {
        const wx = cellX(ev.x), wz = cellZ(ev.z);
        const wy = ev.y * CS + 2;
        for (let k = 0; k < 120; k++) {
          const c = new THREE.Color(k % 2 ? 0xff7a30 : 0xffc060);
          const a = Math.random() * Math.PI * 2, sp = Math.random() * 14;
          firePS.spawn(wx, wy, wz, Math.cos(a) * sp, 2 + Math.random() * 12, Math.sin(a) * sp, 0.6 + Math.random() * 1.1, 1.2 + Math.random() * 2.4, c, 0.9);
        }
        for (let k = 0; k < 70; k++) {
          const a = Math.random() * Math.PI * 2, sp = Math.random() * 5;
          smokePS.spawn(wx, wy, wz, Math.cos(a) * sp, 2 + Math.random() * 5, Math.sin(a) * sp, 3 + Math.random() * 3, 2 + Math.random() * 2, new THREE.Color(0x2c2a28), 0.6);
        }
        player.shake = Math.max(player.shake, 1.2);
        Sound.boom(0.9);
        flash(wx, wy, wz, ev.r * 2.5);
        toast('Explosion!', 'warn');
      } else if (ev.type === 'tank') {
        flash(cellX(ev.x), 8, cellZ(ev.z), 18);
        player.shake = 1.4;
        toast('TANK BLEVE — the refinery is lost.', 'warn');
      } else if (ev.type === 'breach') {
        Sound.boom(0.7);
        toast('The dam gives way!', 'warn');
      } else if (ev.type === 'demolish') {
        Sound.boom(0.3);
      }
    }
  }

  const flashes = [];
  function flash(x, y, z, size) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFlash, color: 0xffc080, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.set(x, y, z); s.scale.set(size, size, 1);
    scene.add(s);
    flashes.push({ s, life: 0.45, max: 0.45 });
    const l = new THREE.PointLight(0xff8a40, 8, 60, 2); l.position.set(x, y + 2, z); scene.add(l);
    flashes.push({ l, life: 0.5, max: 0.5 });
  }
  function updateFlashes(dt) {
    for (let k = flashes.length - 1; k >= 0; k--) {
      const f = flashes[k];
      f.life -= dt;
      if (f.life <= 0) {
        if (f.s) { scene.remove(f.s); f.s.material.dispose(); }
        if (f.l) { scene.remove(f.l); }
        flashes.splice(k, 1);
        continue;
      }
      if (f.s) f.s.material.opacity = f.life / f.max;
      if (f.l) f.l.intensity = 8 * (f.life / f.max);
    }
  }

  /* ------------------------------------------------------------ firestorm */
  let stormAiLeft = 0;
  function stormInit(def) {
    stormAiLeft = def.total;
    stormNext = 2.5;
    stormCalm = 0;
    stormAcc = 0;
    lastIgnition = null;
  }
  function stormIgnite() {
    const f = firestorm;
    if (!f || stormAiLeft <= 0) return;
    // candidates in the city bbox
    const cand = [];
    for (let y = 1; y < 18; y++)
      for (let z = 24; z <= 80; z += 2)
        for (let x = 18; x <= 76; x += 2) {
          const i = world.idx(x, y, z);
          const m = world.mat[i];
          if ((m === MAT.WOOD || m === MAT.LEAF || m === MAT.OIL) && world.burn[i] === 0) cand.push(i);
        }
    if (!cand.length) return;
    const i = cand[(Math.random() * cand.length) | 0];
    const x = i % SX, z = ((i / SX) | 0) % SZ, y = (i / (SX * SZ)) | 0;
    world.ignite(x, y, z);
    stormAiLeft--;
    stormNext = f.interval * (0.75 + Math.random() * 0.5);
    lastIgnition = { x, z, t: 4.5 };
    const label = cityZone(x, z);
    toast('IGNITION · ' + label, 'warn');
    addMarker(cellX(x), y * CS, cellZ(z));
    Sound.boom(0.2);
  }
  function cityZone(x, z) {
    if (x >= 32 && x <= 56 && z >= 28 && z <= 50) return 'TOWERS';
    if (x >= 30 && x <= 60 && z >= 26 && z <= 52) return 'PODIUM';
    if (x >= 56 && z >= 58) return 'PARK';
    if (x < 30) return 'WEST BLOCK';
    if (x > 60) return 'EAST BLOCK';
    return 'STREET';
  }
  function addMarker(x, y, z) {
    const g = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.28, 36, 8), new THREE.MeshBasicMaterial({ color: 0xff7a3c, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.y = 18; g.add(beam);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.12, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffb15c, transparent: true, opacity: 0.9, depthWrite: false }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; g.add(ring);
    g.position.set(x, 0, z);
    scene.add(g);
    markers.push({ group: g, life: 6.5 });
  }
  function updateMarkers(dt) {
    for (let k = markers.length - 1; k >= 0; k--) {
      const m = markers[k];
      m.life -= dt;
      const s = 0.75 + Math.sin(performance.now() * 0.008) * 0.15;
      m.group.scale.set(s, 1, s);
      if (m.life <= 0) { scene.remove(m.group); markers.splice(k, 1); }
    }
  }

  function updateStorm(dt) {
    if (state !== 'play' || currentMode !== 'firestorm') return;
    timeLeft -= dt;
    if (timeLeft <= 0) { timeLeft = 0; endScene(false, 'The clock ran out; the city was still burning.'); return; }
    stormNext -= dt;
    if (stormNext <= 0 && stormAiLeft > 0) stormIgnite();
    if (world.burningCount > firestorm.maxFire) { endScene(false, 'The fire ran past the cap and took the city.'); return; }
    if (stormAiLeft <= 0 && world.burningCount === 0) stormCalm += dt; else stormCalm = 0;
    if (stormCalm > 1.5) endScene(true, '');
    updateHUD();
  }

  /* ------------------------------------------------------------ fire tick */
  function tickFire(dt) {
    world.stepFire(dt, sceneElapsed);
    if (world.waterActive) {
      world.stepWater(dt);
      if (world.boatMesh) {
        const b = world.boat;
        const k = b.z * SX + b.x;
        const d = world.water.depth[k] || 0;
        const y = Math.max(0.2, d);
        world.boatMesh.position.set(cellX(b.x), y + Math.sin(performance.now() * 0.0011) * 0.05, cellZ(b.z));
      }
      if (damBreached) {
        updateWaterMesh();
      }
    }
    applyDirty();
    handleEvents();
    spawnFireEffects(dt);
    spawnVents(dt);
    updateMarkers(dt);
  }

  /* ------------------------------------------------------------ game loop */
  function update(dt) {
    dbgPath = state;
    if (state === 'menu') {
      menuAngle += dt * 0.045;
      const r = 78;
      camera.position.set(Math.cos(menuAngle) * r - 10, 32 + Math.sin(menuAngle * 0.7) * 4, Math.sin(menuAngle) * r - 30);
      camera.lookAt(-8, 16, -32);
      fireAcc += dt;
      if (fireAcc > 0.25) { tickFire(0.25); fireAcc = 0; }
      firePS.update(dt, 0.4, 0.2); smokePS.update(dt, 0.4, 0.2); steamPS.update(dt); sparkPS.update(dt); waterPS.update(dt); dustPS.update(dt);
      updateFlashes(dt);
      Sound.updateMenu();
      return;
    }
    if (state === 'paused') {
      firePS.update(dt * 0.2, 0.3, 0); smokePS.update(dt * 0.2, 0.3, 0); steamPS.update(dt * 0.2); sparkPS.update(dt * 0.2);
      return;
    }
    if (state === 'result' || state === 'lock') {
      // subtle ambient only
      firePS.update(dt * 0.35, 0.3, 0.1); smokePS.update(dt * 0.35, 0.3, 0.1); steamPS.update(dt * 0.35); sparkPS.update(dt * 0.35); waterPS.update(dt * 0.35); dustPS.update(dt * 0.35);
      if (state === 'lock' && world.scene) {
        // look around a little with the mouse? keep still
      }
      return;
    }
    // play
    timeLeft = Math.max(0, timeLeft - dt);
    sceneElapsed += dt;
    updatePlayer(dt);
    if (!drone.active) updateDroneModel(dt);
    updateWater(dt);
    tryRefill(dt);
    updatePrompt();
    breachCool = Math.max(0, breachCool - dt);
    if (keys['e']) { /* refill handled */ }
    // fire sim at 12 Hz
    fireAcc += dt;
    while (fireAcc > 1 / 12) { tickFire(1 / 12); fireAcc -= 1 / 12; }
    if (world.waterActive) updateWaterMeshIfNeeded(dt);
    updateFlashes(dt);
    firePS.update(dt, Math.cos(sceneElapsed * 0.1) * 0.8, Math.sin(sceneElapsed * 0.08) * 0.5);
    smokePS.update(dt, Math.cos(sceneElapsed * 0.1) * 0.8, Math.sin(sceneElapsed * 0.08) * 0.5);
    steamPS.update(dt, 0.4, 0.2); waterPS.update(dt); sparkPS.update(dt); dustPS.update(dt);
    if (currentMode === 'firestorm') updateStorm(dt);
    else {
      if (timeLeft <= 0) { timeLeft = 0; endScene(false, 'The clock ran out; the fire was still burning.'); return; }
      const fail = world.checkFail();
      if (fail) { endScene(false, fail); return; }
      if (sceneElapsed > 8 && world.burningCount === 0 && world.checkWin()) calm += dt; else calm = 0;
      if (calm > 1.0) { endScene(true, ''); return; }
    }
    uiAcc += dt;
    if (uiAcc > 0.12) { updateHUD(); uiAcc = 0; }
    Sound.update(dt, nearestFire.d, spraying);
  }

  let waterTick = 0;
  function updateWaterMeshIfNeeded(dt) {
    waterTick += dt;
    if (waterTick > 0.16) { updateWaterMesh(); waterTick = 0; }
  }

  function frame(now) {
    dbgFrames++;
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    try { update(dt); } catch (e) { console.error(e); }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------ input */
  function onKey(e, down) {
    const k = e.key.toLowerCase();
    const handled = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift', 'e', 'r', 'm', '1', '2', 'f', 'g', 'c', 'control', 'escape'];
    if (handled.includes(k)) e.preventDefault();
    if (down && (k === '1' || k === '2')) {
      if (state === 'play' || state === 'lock') setTool(k === '1' ? 'hose' : 'breach');
      return;
    }
    if (down && k === 'f') { if (state === 'play') toggleLadder(); return; }
    if (down && k === 'g') { if (state === 'play') toggleDrone(); return; }
    if (down && k === 'r' && (state === 'play' || state === 'paused')) {
      if (currentMode === 'firestorm') startFirestorm(firestorm.id); else startScene(currentScene);
      return;
    }
    if (down && k === 'm') { Sound.toggle(); toast(Sound.muted ? 'Sound off' : 'Sound on'); return; }
    if (k === 'shift') keys['shift'] = down;
    else if (k === 'control') keys['control'] = down;
    else keys[k] = down;
  }
  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));

  function onMouseMove(e) {
    if (state !== 'play' || document.pointerLockElement !== canvas) return;
    if (drone.active) {
      drone.yaw -= e.movementX * 0.0021;
      drone.pitch -= e.movementY * 0.0021;
      drone.pitch = clamp(drone.pitch, -1.42, 1.42);
      return;
    }
    player.yaw -= e.movementX * 0.0021;
    player.pitch -= e.movementY * 0.0021;
    player.pitch = clamp(player.pitch, -1.42, 1.42);
  }
  document.addEventListener('mousemove', onMouseMove);

  canvas.addEventListener('wheel', (e) => {
    if (state !== 'play' || !player.onLadder) return;
    e.preventDefault();
    setLadderHeight(ladder.height - Math.sign(e.deltaY) * 1.3);
  }, { passive: false });

  document.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (state !== 'play') return;
    if (document.pointerLockElement !== canvas) return;
    if (player.tool === 'hose') spraying = true;
    else useBreach();
  });
  document.addEventListener('mouseup', (e) => {
    if (e.button === 0) spraying = false;
  });
  document.addEventListener('contextmenu', (e) => { if (state === 'play') e.preventDefault(); });

  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvas;
    if (locked) {
      pointerLocked = true;
      if (state === 'lock' || state === 'paused') {
        state = 'play';
        hideLock();
        $('pause').classList.remove('show'); $('pause').classList.add('hidden');
        hud.classList.remove('hidden');
        Sound.init();
        toast(currentMode === 'firestorm' ? 'Firestorm — keep moving.' : `${world.scene.name} — ${world.scene.obj}`);
      }
    } else {
      pointerLocked = false;
      spraying = false;
      if (state === 'play') pauseGame();
    }
  });
  document.addEventListener('pointerlockerror', () => {
    toast('Mouse lock was blocked — click the deploy button again.', 'warn');
  });

  $('lockBtn').addEventListener('click', () => {
    Sound.init();
    beginPlay();
    try { canvas.requestPointerLock(); } catch (e) { /* noop */ }
  });
  $('pauseResumeBtn').addEventListener('click', () => {
    try { canvas.requestPointerLock(); } catch (e) { /* noop */ }
    beginPlay();
  });
  $('pauseRestartBtn').addEventListener('click', () => {
    if (currentMode === 'firestorm') startFirestorm(firestorm.id); else startScene(currentScene);
  });
  $('pauseMenuBtn').addEventListener('click', () => openMenu());
  $('resultRetryBtn').addEventListener('click', () => {
    $('result').classList.remove('show'); $('result').classList.add('hidden');
    if (currentMode === 'firestorm') startFirestorm(firestorm.id); else startScene(currentScene);
  });
  $('resultMenuBtn').addEventListener('click', () => openMenu());

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'play') pauseGame();
  });

  /* ------------------------------------------------------------ audio */
  const Sound = {
    ctx: null, master: null, water: null, waterGain: null, fire: null, fireGain: null, steamGain: null,
    muted: false, inited: false,
    init() {
      if (this.inited) { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); return; }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain(); this.master.gain.value = 0.55; this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate * 2;
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        const loopSrc = (filterType, freq, q) => {
          const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
          const f = this.ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
          const g = this.ctx.createGain(); g.gain.value = 0;
          src.connect(f); f.connect(g); g.connect(this.master); src.start();
          return { src, g };
        };
        const w = loopSrc('bandpass', 1300, 0.8); this.water = w.src; this.waterGain = w.g;
        const f = loopSrc('lowpass', 380, 0.6); this.fire = f.src; this.fireGain = f.g;
        const s = loopSrc('highpass', 2200, 0.7); this.steamGain = s.g;
        this.inited = true;
      } catch (e) { /* noop */ }
    },
    update(dt, fireDist, sprayingNow) {
      if (!this.inited || this.muted) { if (this.waterGain) this.waterGain.gain.value = 0; if (this.fireGain) this.fireGain.gain.value = 0; if (this.steamGain) this.steamGain.gain.value = 0; return; }
      const t = this.ctx.currentTime;
      const waterVol = sprayingNow && state === 'play' ? 0.075 : 0;
      const fireVol = state === 'play' ? clamp(1 - fireDist / 38, 0, 1) * 0.09 : 0;
      const steamVol = state === 'play' ? 0.018 : 0;
      this.waterGain.gain.setTargetAtTime(waterVol, t, 0.08);
      this.fireGain.gain.setTargetAtTime(fireVol, t, 0.15);
      this.steamGain.gain.setTargetAtTime(steamVol, t, 0.2);
    },
    updateMenu() {
      if (!this.inited || this.muted) return;
      const t = this.ctx.currentTime;
      this.waterGain.gain.setTargetAtTime(0, t, 0.1);
      this.fireGain.gain.setTargetAtTime(0.035, t, 0.3);
      this.steamGain.gain.setTargetAtTime(0.01, t, 0.3);
    },
    boom(v = 0.7) {
      if (!this.inited || this.muted) return;
      try {
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(26, t + 0.55);
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.28 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
        o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.75);
        const len = this.ctx.sampleRate * 0.5;
        const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const n = this.ctx.createBufferSource(); n.buffer = b;
        const nf = this.ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 500;
        const ng = this.ctx.createGain(); ng.gain.value = 0.25 * v;
        n.connect(nf); nf.connect(ng); ng.connect(this.master); n.start();
      } catch (e) { /* noop */ }
    },
    splash() {
      if (!this.inited || this.muted) return;
      try {
        const t = this.ctx.currentTime;
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.02, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        g.connect(this.master);
        const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 600 + Math.random() * 400;
        o.connect(g); o.start(t); o.stop(t + 0.16);
      } catch (e) { /* noop */ }
    },
    win() {
      if (!this.inited || this.muted) return;
      try {
        const t = this.ctx.currentTime;
        [392, 523, 659].forEach((f, i) => {
          const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
          const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0, t + i * 0.13); g.gain.linearRampToValueAtTime(0.12, t + i * 0.13 + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.13 + 0.5);
          o.connect(g); g.connect(this.master); o.start(t + i * 0.13); o.stop(t + i * 0.13 + 0.55);
        });
      } catch (e) { /* noop */ }
    },
    lose() {
      if (!this.inited || this.muted) return;
      try {
        const t = this.ctx.currentTime;
        [220, 174].forEach((f, i) => {
          const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
          const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0, t + i * 0.2); g.gain.linearRampToValueAtTime(0.06, t + i * 0.2 + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.2 + 0.6);
          o.connect(g); g.connect(this.master); o.start(t + i * 0.2); o.stop(t + i * 0.2 + 0.65);
        });
      } catch (e) { /* noop */ }
    },
    click() {
      if (!this.inited || this.muted) return;
      try {
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator(); o.type = 'square'; o.frequency.value = 660;
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.02, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.07);
      } catch (e) { /* noop */ }
    },
    toggle() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.55;
    },
  };

  /* ------------------------------------------------------------ boot */
  buildHose();
  buildSceneWorld('city');
  player.x = 0; player.z = 70; player.y = 0;
  renderMenu('deploy');
  $('menu').classList.remove('hidden');
  $('menu').classList.add('show');
  updateHUD(true);
  requestAnimationFrame(frame);
  window.__EMBER3D__ = { world, player, scene, camera, renderer, startScene, startFirestorm, openMenu, setSpray: (v) => { spraying = !!v; }, drone, ladder, state: () => state, dbg: () => ({ dbgFrames, dbgPath, state, timeLeft, fireAcc }), firePS, smokePS, waterPS, steamPS, spawnFireEffects, tickFire, updateHUD };
})();
