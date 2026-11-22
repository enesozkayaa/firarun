// =============================================================
// Firarun - 3D görüntü (Three.js). Piramidin içi: kumtaşı duvarlar, hiyeroglifler,
// meşaleler, lav, tuzaklar, kaşifler ve Firavun, parçacık efektleri ve kamera.
// Kurallar ve fizik burada değil (dunya.js). Model +x'e bakar: mesh.rotation.y = -yaw.
// =============================================================

const Sahne = (() => {
  const RENKLER = [0xe8413a, 0x2f7de1, 0x34b45a, 0xf2a01e, 0x9a4ae0, 0x1ab8b8, 0xff6aa8, 0x8a5a2a, 0xd0d0d0, 0x2a2a6a];
  const T = THREE;
  let renderer, scene, camera, ustIsik, hemi;
  const kam = { x: 0, y: 3, z: 0, bx: 1, by: 3, bz: 0, sars: 0, fov: 70 };
  let zaman = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  let tohum = 7; const srnd = (a, b) => { tohum = (tohum * 16807) % 2147483647; return a + (tohum / 2147483647) * (b - a); };

  // ---------- Malzemeler / dokular ----------
  function tuval(w, h, ciz) { const c = document.createElement('canvas'); c.width = w; c.height = h; ciz(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = T.RepeatWrapping; return t; }
  function lekeler(g, w, h, n, koyu = 0.08) {
    for (let i = 0; i < n; i++) { const v = Math.random() < 0.5; g.fillStyle = v ? `rgba(70,40,15,${Math.random() * koyu})` : `rgba(255,235,190,${Math.random() * koyu})`; const s = 1 + Math.random() * 4; g.fillRect(Math.random() * w, Math.random() * h, s, s); }
  }
  function bloklar(g, w, h, bh, bw, kalin = 3, renk = 'rgba(60,32,12,0.55)') {
    for (let r = 0; r * bh < h; r++) {
      const off = (r % 2) * bw / 2;
      for (let x = -off; x < w; x += bw) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '40,20,5' : '255,230,180'},${Math.random() * 0.09})`; g.fillRect(x, r * bh, bw, bh); }
      g.fillStyle = renk; g.fillRect(0, r * bh, w, kalin);
      for (let x = -off; x < w; x += bw) g.fillRect(x, r * bh, kalin, bh);
    }
  }
  // Hiyeroglif benzeri işaretler (kendi çizimimiz)
  const ISARETLER = [
    (g, s) => { g.beginPath(); g.ellipse(0, 0, s * 0.42, s * 0.2, 0, 0, 6.283); g.stroke(); g.beginPath(); g.arc(0, 0, s * 0.12, 0, 6.283); g.fill(); g.beginPath(); g.moveTo(-s * 0.1, s * 0.2); g.quadraticCurveTo(-s * 0.15, s * 0.45, s * 0.05, s * 0.42); g.stroke(); g.beginPath(); g.moveTo(-s * 0.42, -s * 0.3); g.lineTo(s * 0.42, -s * 0.28); g.stroke(); },
    (g, s) => { g.beginPath(); g.ellipse(0, -s * 0.22, s * 0.15, s * 0.2, 0, 0, 6.283); g.stroke(); g.fillRect(-s * 0.32, -s * 0.04, s * 0.64, s * 0.1); g.fillRect(-s * 0.05, -s * 0.04, s * 0.1, s * 0.5); },
    (g, s) => { g.beginPath(); g.ellipse(0, s * 0.05, s * 0.3, s * 0.16, -0.3, 0, 6.283); g.fill(); g.beginPath(); g.arc(s * 0.28, -s * 0.18, s * 0.1, 0, 6.283); g.fill(); g.beginPath(); g.moveTo(s * 0.36, -s * 0.2); g.lineTo(s * 0.5, -s * 0.15); g.lineTo(s * 0.36, -s * 0.12); g.fill(); g.fillRect(-s * 0.05, s * 0.18, s * 0.04, s * 0.28); g.fillRect(s * 0.08, s * 0.18, s * 0.04, s * 0.28); g.beginPath(); g.moveTo(-s * 0.28, 0); g.lineTo(-s * 0.48, s * 0.15); g.lineTo(-s * 0.25, s * 0.12); g.fill(); },
    (g, s) => { g.beginPath(); for (let i = 0; i <= 6; i++) g.lineTo(-s * 0.45 + i * s * 0.15, i % 2 ? -s * 0.06 : s * 0.06); g.stroke(); g.beginPath(); for (let i = 0; i <= 6; i++) g.lineTo(-s * 0.45 + i * s * 0.15, s * 0.2 + (i % 2 ? -s * 0.06 : s * 0.06)); g.stroke(); },
    (g, s) => { g.beginPath(); g.arc(0, 0, s * 0.25, 0, 6.283); g.fill(); g.beginPath(); g.moveTo(-s * 0.25, s * 0.05); g.quadraticCurveTo(-s * 0.5, s * 0.3, -s * 0.2, s * 0.35); g.stroke(); g.beginPath(); g.moveTo(s * 0.25, s * 0.05); g.quadraticCurveTo(s * 0.5, s * 0.3, s * 0.2, s * 0.35); g.stroke(); },
    (g, s) => { g.beginPath(); g.ellipse(0, 0, s * 0.1, s * 0.42, 0.15, 0, 6.283); g.fill(); g.beginPath(); g.moveTo(0, -s * 0.4); g.lineTo(s * 0.05, s * 0.45); g.stroke(); },
    (g, s) => { g.lineWidth *= 1.6; g.beginPath(); g.moveTo(-s * 0.4, s * 0.3); g.bezierCurveTo(-s * 0.1, -s * 0.4, s * 0.1, s * 0.4, s * 0.35, -s * 0.2); g.stroke(); g.beginPath(); g.arc(s * 0.36, -s * 0.24, s * 0.07, 0, 6.283); g.fill(); },
    (g, s) => { g.beginPath(); g.arc(0, -s * 0.05, s * 0.32, Math.PI, 0); g.closePath(); g.fill(); g.fillRect(-s * 0.36, s * 0.05, s * 0.72, s * 0.06); },
    (g, s) => { g.fillRect(-s * 0.08, -s * 0.42, s * 0.16, s * 0.84); g.fillRect(-s * 0.28, -s * 0.42, s * 0.56, s * 0.1); g.fillRect(-s * 0.22, -s * 0.1, s * 0.44, s * 0.08); g.fillRect(-s * 0.22, s * 0.15, s * 0.44, s * 0.08); },
    (g, s) => { g.beginPath(); g.moveTo(0, -s * 0.42); g.lineTo(s * 0.32, s * 0.38); g.lineTo(-s * 0.32, s * 0.38); g.closePath(); g.stroke(); g.beginPath(); g.arc(0, s * 0.1, s * 0.08, 0, 6.283); g.fill(); },
  ];
  let D_ = null;
  function dokular() {
    tohum = 11;
    const kumtasi = tuval(512, 512, (g, w, h) => { g.fillStyle = '#b48a52'; g.fillRect(0, 0, w, h); lekeler(g, w, h, 30000, 0.1); bloklar(g, w, h, 64, 128); });
    const hiyeroglif = tuval(512, 512, (g, w, h) => {
      g.fillStyle = '#c29a5e'; g.fillRect(0, 0, w, h); lekeler(g, w, h, 26000, 0.09); bloklar(g, w, h, 128, 256, 2, 'rgba(60,32,12,0.35)');
      const sutun = 64, renkler = ['#2a5a9a', '#a83a20', '#2a7a5a', '#d8a030'];
      g.lineWidth = 4; g.lineCap = 'round';
      for (let c = 0; c < w / sutun; c++) {
        g.fillStyle = 'rgba(70,40,15,0.6)'; g.fillRect(c * sutun, 0, 2, h);
        for (let r = 0; r < h / sutun; r++) {
          const x = c * sutun + sutun / 2, y = r * sutun + sutun / 2;
          const fn = ISARETLER[Math.floor(srnd(0, ISARETLER.length))];
          g.save(); g.translate(x + 1.5, y + 1.5); g.fillStyle = g.strokeStyle = 'rgba(40,20,5,0.55)'; fn(g, sutun * 0.8); g.restore();
          g.save(); g.translate(x, y); const rr = renkler[Math.floor(srnd(0, 6)) % 4]; g.fillStyle = g.strokeStyle = srnd(0, 1) < 0.3 ? rr : '#6a4420'; fn(g, sutun * 0.8); g.restore();
        }
      }
    });
    const zemin = tuval(256, 256, (g, w, h) => {
      g.fillStyle = '#a07a48'; g.fillRect(0, 0, w, h); lekeler(g, w, h, 12000, 0.12);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '50,25,5' : '255,230,180'},${0.05 + Math.random() * 0.08})`; g.fillRect(i * 128, j * 128, 128, 128); }
      g.fillStyle = 'rgba(50,25,8,0.7)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 128, w, 3); g.fillRect(0, 0, 3, h); g.fillRect(128, 0, 3, h);
      g.strokeStyle = 'rgba(50,25,8,0.35)'; g.lineWidth = 1.5; for (let i = 0; i < 6; i++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += rnd(-14, 14); y += rnd(-14, 14); g.lineTo(x, y); } g.stroke(); }
    });
    const kapak = tuval(128, 128, (g, w, h) => {
      g.fillStyle = '#9a7244'; g.fillRect(0, 0, w, h); lekeler(g, w, h, 4000, 0.12);
      g.fillStyle = 'rgba(40,20,5,0.75)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h);
      g.strokeStyle = 'rgba(60,30,10,0.45)'; g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 26, 0, 6.283); g.stroke(); g.beginPath(); g.ellipse(64, 64, 10, 16, 0, 0, 6.283); g.stroke();
    });
    const lav = tuval(256, 256, (g, w, h) => {
      g.fillStyle = '#5a0e02'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        const x = Math.random() * w, y = Math.random() * h, r = rnd(10, 40);
        for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
          const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
          gr.addColorStop(0, i % 3 ? '#ffb020' : '#fff080'); gr.addColorStop(0.5, '#ff5a08'); gr.addColorStop(1, 'rgba(160,20,0,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(x + dx, y + dy, r, 0, 6.283); g.fill();
        }
      }
      g.strokeStyle = 'rgba(40,5,0,0.7)'; g.lineWidth = 3; for (let i = 0; i < 18; i++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += rnd(-25, 25); y += rnd(-25, 25); g.lineTo(x, y); } g.stroke(); }
    });
    const tahta = tuval(128, 128, (g, w, h) => { g.fillStyle = '#7a4a22'; g.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#6a3e1a' : '#845226'; g.fillRect(0, i * 16, w, 15); } lekeler(g, w, h, 3000, 0.15); g.strokeStyle = 'rgba(40,20,5,0.4)'; for (let i = 0; i < 20; i++) { g.beginPath(); const y = Math.random() * h; g.moveTo(0, y); g.bezierCurveTo(40, y + rnd(-4, 4), 80, y + rnd(-4, 4), w, y); g.stroke(); } });
    const kaya = tuval(256, 128, (g, w, h) => { g.fillStyle = '#8a6a48'; g.fillRect(0, 0, w, h); lekeler(g, w, h, 12000, 0.25); g.strokeStyle = 'rgba(40,25,10,0.6)'; g.lineWidth = 2; for (let i = 0; i < 25; i++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += rnd(-20, 20); y += rnd(-20, 20); g.lineTo(x, y); } g.stroke(); } });
    const kum = tuval(256, 256, (g, w, h) => { g.fillStyle = '#c8a064'; g.fillRect(0, 0, w, h); lekeler(g, w, h, 20000, 0.18); });
    const tavan = tuval(256, 256, (g, w, h) => { g.fillStyle = '#5a4026'; g.fillRect(0, 0, w, h); lekeler(g, w, h, 9000, 0.12); bloklar(g, w, h, 128, 128, 3, 'rgba(20,10,2,0.6)'); g.fillStyle = 'rgba(220,180,60,0.35)'; for (let i = 0; i < 9; i++) { const x = rnd(10, w - 10), y = rnd(10, h - 10); g.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5, r = k % 2 ? 3 : 8; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.fill(); } });
    const delik = tuval(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(20,10,2,0.85)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(16 + i * 32, 16 + j * 32, 5, 0, 6.283); g.fill(); } });
    D_ = { kumtasi, hiyeroglif, zemin, kapak, lav, tahta, kaya, kum, tavan, delik };
  }
  const M = {};
  function malzemeler() {
    const S = (o) => new T.MeshStandardMaterial(o);
    M.duvar = S({ map: D_.kumtasi, roughness: 0.92 });
    M.hiyeroglif = S({ map: D_.hiyeroglif, roughness: 0.9 });
    M.zemin = S({ map: D_.zemin, roughness: 0.85 });
    M.arenaZemin = S({ map: D_.zemin, roughness: 0.6, color: 0xd8c0a0 });
    M.kapak = S({ map: D_.kapak, roughness: 0.85 });
    M.tavan = S({ map: D_.tavan, roughness: 1 });
    M.galeri = S({ map: D_.zemin, roughness: 0.6, color: 0xe8d8b8 });
    M.cam = new T.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.16, depthWrite: false, side: T.DoubleSide });
    M.tas = S({ map: D_.kaya, roughness: 0.95, color: 0xc8a888 });
    M.sutunTas = S({ map: D_.kumtasi, roughness: 0.9, color: 0xe8d0b0 });
    M.sutun = S({ map: D_.hiyeroglif, roughness: 0.85 });
    M.kapi = S({ color: 0xb8902a, metalness: 0.6, roughness: 0.35, emissive: 0x3a2400 });
    M.altin = S({ color: 0xe0b030, metalness: 0.65, roughness: 0.3, emissive: 0x4a3000, emissiveIntensity: 0.6 });
    M.bronz = S({ color: 0x8a6a3a, metalness: 0.7, roughness: 0.4 });
    M.lav = new T.MeshStandardMaterial({ map: D_.lav, emissive: 0xffffff, emissiveMap: D_.lav, emissiveIntensity: 0.95, roughness: 0.6 });
    M.kum = S({ map: D_.kum, roughness: 1 });
    M.tahta = S({ map: D_.tahta, roughness: 0.85 });
    M.kaya = S({ map: D_.kaya, roughness: 0.95 });
    M.siyah = S({ color: 0x15100a, roughness: 0.9 });
    M.lacivert = S({ color: 0x1a3a8a, roughness: 0.5, metalness: 0.2 });
    M.ten = S({ color: 0xe0b088, roughness: 0.7 });
    M.haki = S({ color: 0xc8b07a, roughness: 0.9 });
    M.kahve = S({ color: 0x6a4424, roughness: 0.9 });
    M.bez = S({ color: 0xe8e0c8, roughness: 0.95 });
    M.goz = new T.MeshBasicMaterial({ color: 0x111111 });
  }

  // Kutu: dünya ölçüsüne göre doku tekrarı (uv = metre / olcek)
  function kutuGeo(w, h, d, olcek = 4) {
    const geo = new T.BoxGeometry(w, h, d);
    const uv = geo.attributes.uv;
    const yuz = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * yuz[f][0] / olcek, uv.getY(i) * yuz[f][1] / olcek); }
    return geo;
  }
  function ms(geo, m, x = 0, y = 0, z = 0, golge = false) { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = golge; o.receiveShadow = true; return o; }

  // ---------- Kurulum ----------
  function kur(kanvas) {
    renderer = new T.WebGLRenderer({ canvas: kanvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
    scene = new T.Scene();
    scene.background = new T.Color(0x140c06);
    scene.fog = new T.Fog(0x1a1008, 18, 85);
    camera = new T.PerspectiveCamera(70, 1, 0.1, 400);
    hemi = new T.HemisphereLight(0xffd8a0, 0x4a2a10, 0.75); scene.add(hemi);
    scene.add(new T.AmbientLight(0x6a4a2a, 0.5));
    ustIsik = new T.DirectionalLight(0xffe2b0, 1.1);
    ustIsik.castShadow = true; ustIsik.shadow.mapSize.set(1024, 1024);
    Object.assign(ustIsik.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 60 });
    ustIsik.shadow.bias = -0.0005; ustIsik.shadow.normalBias = 0.05;
    scene.add(ustIsik); scene.add(ustIsik.target);
    dokular(); malzemeler();
    parcacikKur();
    elSilahKur();
    haritaKur();
    boyutla();
    addEventListener('resize', boyutla);
  }
  function boyutla() {
    const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  // ---------- Harita ----------
  const meşaleler = [], isikHavuzu = [], lavIsiklari = [];
  const TZ = {};   // tuzak görselleri
  let basKapi = null, dugmeler = [];
  function haritaKur() {
    const D = Dunya;
    const g = new T.Group(); scene.add(g);
    // sabit kutular
    D.KUTULAR.forEach(b => {
      if (b.m === 'gorunmez' || b.m === 'kapi') return;
      const w = b.x2 - b.x1, h = b.y2 - b.y1, d = b.z2 - b.z1;
      let m = M[b.m] || M.duvar;
      if (b.m === 'duvar' && h > 6) m = M.hiyeroglif;
      const o = ms(kutuGeo(w, h, d, b.m === 'zemin' || b.m === 'arenaZemin' ? 4 : b.m === 'hiyeroglif' || m === M.hiyeroglif ? 3.2 : 4), m, (b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2, (b.z1 + b.z2) / 2);
      g.add(o);
    });
    // çukur dipleri (kum + kazıklar) ve lav yüzeyleri
    D.CUKURLAR.forEach(c => {
      const w = c.x2 - c.x1, d = c.z2 - c.z1;
      g.add(ms(kutuGeo(w, 0.5, d, 3), M.kum, (c.x1 + c.x2) / 2, -8.2, (c.z1 + c.z2) / 2));
      const n = Math.floor(w * d / 2.2), kazik = new T.InstancedMesh(new T.ConeGeometry(0.18, 1.6, 6), M.bronz, n), mt = new T.Matrix4();
      for (let i = 0; i < n; i++) { mt.makeTranslation(rnd(c.x1 + 0.3, c.x2 - 0.3), -7.2, rnd(c.z1 + 0.3, c.z2 - 0.3)); kazik.setMatrixAt(i, mt); }
      g.add(kazik);
    });
    D.LAV_CUKUR.forEach(c => {
      const w = c.x2 - c.x1, d = c.z2 - c.z1;
      const geo = new T.PlaneGeometry(w, d); geo.rotateX(-Math.PI / 2);
      const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 6, uv.getY(i) * d / 6);
      g.add(ms(geo, M.lav, (c.x1 + c.x2) / 2, D.LAV_Y, (c.z1 + c.z2) / 2));
      const l = new T.PointLight(0xff5a10, 30, 16, 1.6); l.position.set((c.x1 + c.x2) / 2, D.LAV_Y + 1.5, (c.z1 + c.z2) / 2); scene.add(l); lavIsiklari.push({ l, taban: 30 });
    });
    // başlangıç kapısı (altın)
    basKapi = new T.Group();
    const kp = ms(kutuGeo(0.4, 5, 8, 2), M.kapi, 0.2, 2.5, 0, true); basKapi.add(kp);
    for (let i = -3; i <= 3; i += 1.5) basKapi.add(ms(new T.CylinderGeometry(0.12, 0.12, 5, 8), M.altin, 0, 2.5, i));
    const goz = gozDiski(1.1); goz.position.set(-0.05, 3.2, 0); goz.rotation.y = -Math.PI / 2; basKapi.add(goz);
    g.add(basKapi);
    // bekleme salonu parmaklığı
    for (let z = -3.7; z <= 3.7; z += 0.6) g.add(ms(new T.CylinderGeometry(0.07, 0.07, 7, 6), M.altin, 248.5, 3.5, z));
    g.add(ms(kutuGeo(0.3, 0.3, 8), M.altin, 248.5, 6.9, 0)); g.add(ms(kutuGeo(0.3, 0.3, 8), M.altin, 248.5, 3, 0));
    // Firavun'un cam kabini: altın çerçeveli cam paneller, altta ve üstte altın çıta
    g.add(ms(kutuGeo(263, 0.12, 0.35), M.altin, 117.5, 1.26, -4.12));
    g.add(ms(kutuGeo(263, 0.18, 0.3), M.altin, 117.5, 11.9, -4.12));
    g.add(ms(kutuGeo(263, 0.08, 0.2), M.altin, 117.5, 6.4, -4.12));
    for (let x = -14; x <= 249; x += 4) g.add(ms(kutuGeo(0.12, 10.8, 0.26), M.altin, x, 6.6, -4.12));
    // camın iç yüzüne hafif parıltı şeridi (camı belli etmek için)
    const parilti = new T.Mesh(new T.PlaneGeometry(263, 10.8), new T.MeshBasicMaterial({ map: tuval(256, 64, (x, w, h) => { const gr = x.createLinearGradient(0, 0, w, h); for (let i = 0; i < 8; i++) { gr.addColorStop(i / 8, 'rgba(255,255,255,0)'); gr.addColorStop(i / 8 + 0.03, 'rgba(255,255,255,0.18)'); gr.addColorStop(i / 8 + 0.06, 'rgba(255,255,255,0)'); } x.fillStyle = gr; x.fillRect(0, 0, w, h); }), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    parilti.material.map.repeat.set(20, 1); parilti.position.set(117.5, 6.6, -4.1); g.add(parilti);    // meşaleler
    for (let x = -10; x < 248; x += 9) {
      meşaleEkle(g, x + 4.5, 3.4, 3.85, -1);
      meşaleEkle(g, x + 1, 4.2, -12.1, 1);
    }
    [[252, 4, -13.6, 1], [252, 4, 13.6, -1], [266, 4, -13.6, 1], [266, 4, 13.6, -1], [280.6, 4, -6, 0], [280.6, 4, 6, 0]].forEach(([x, y, z, s]) => meşaleEkle(g, x, y, z, s));
    for (let i = 0; i < 8; i++) { const l = new T.PointLight(0xff9a40, 0, 13, 1.7); scene.add(l); isikHavuzu.push(l); }
    // süsler: heykeller, vazolar, kum yığınları
    firavunHeykeli(g, -12.8, 0, -2.8, 0); firavunHeykeli(g, -12.8, 0, 2.8, 0);
    firavunHeykeli(g, 279.5, 0, -9, Math.PI); firavunHeykeli(g, 279.5, 0, 9, Math.PI);
    tahtKur(g, 279.6, 0, 0);
    tohum = 21;
    for (let x = 2; x < 240; x += srnd(6, 14)) { if ((x > 38 && x < 56) || (x > 96 && x < 136) || (x > 176 && x < 214)) continue; vazo(g, x, 0, srnd(0, 1) < 0.5 ? -3.6 : 3.6, srnd(0.7, 1.1)); }
    for (let i = 0; i < 40; i++) { const x = srnd(-12, 245); if ((x > 22 && x < 56) || (x > 96 && x < 136) || (x > 176 && x < 214)) continue; const k = ms(new T.ConeGeometry(srnd(0.5, 1.2), srnd(0.3, 0.7), 10), M.kum, x, 0.15, srnd(0, 1) < 0.5 ? -3.7 : 3.7); g.add(k); }
    [[256, 6], [272, 6], [256, -6], [272, -6]].forEach(([x, z]) => mangalKur(g, x, z));
    tuzaklariKur(g);
  }
  function gozDiski(r) {
    const gg = new T.Group();
    gg.add(ms(new T.CircleGeometry(r, 32), M.altin));
    const c = tuval(128, 128, (x) => { x.lineWidth = 7; x.strokeStyle = x.fillStyle = '#1a2a6a'; x.translate(64, 64); ISARETLER[0](x, 100); });
    const p = new T.Mesh(new T.CircleGeometry(r * 0.85, 32), new T.MeshBasicMaterial({ map: c, transparent: true })); p.position.z = 0.01; gg.add(p);
    return gg;
  }
  function meşaleEkle(g, x, y, z, yon) {
    const tut = ms(kutuGeo(0.18, 0.5, 0.18), M.bronz, x, y - 0.2, z); g.add(tut);
    const kase = ms(new T.CylinderGeometry(0.22, 0.12, 0.25, 10), M.bronz, x, y + 0.1, z - yon * 0.05); g.add(kase);
    const alev = new T.Sprite(new T.SpriteMaterial({ map: alevDokusu(), color: 0xffb050, blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
    alev.position.set(x, y + 0.5, z - yon * 0.05); alev.scale.set(0.7, 1.0, 1); g.add(alev);
    const parilti = new T.Sprite(new T.SpriteMaterial({ map: parilti_(), color: 0xff8a30, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 }));
    parilti.position.copy(alev.position); parilti.scale.set(3, 3, 1); g.add(parilti);
    meşaleler.push({ x, y: y + 0.5, z: z - yon * 0.35, alev, parilti, s: Math.random() * 10 });
  }
  let _alevD = null, _parD = null;
  function alevDokusu() { return _alevD || (_alevD = tuval(64, 128, (g, w, h) => { const gr = g.createRadialGradient(32, 90, 2, 32, 80, 50); gr.addColorStop(0, 'rgba(255,255,220,1)'); gr.addColorStop(0.3, 'rgba(255,190,60,0.9)'); gr.addColorStop(0.7, 'rgba(255,80,10,0.4)'); gr.addColorStop(1, 'rgba(255,40,0,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(32, 4); g.quadraticCurveTo(62, 70, 52, 100); g.quadraticCurveTo(32, 128, 12, 100); g.quadraticCurveTo(2, 70, 32, 4); g.fill(); })); }
  function parilti_() { return _parD || (_parD = tuval(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); })); }
  function vazo(g, x, y, z, s) {
    const p = [[0, 0], [0.18, 0], [0.3, 0.15], [0.34, 0.4], [0.26, 0.7], [0.12, 0.85], [0.14, 1], [0.2, 1.05]].map(([a, b]) => new T.Vector2(a * s, b * s));
    const v = ms(new T.LatheGeometry(p, 14), new T.MeshStandardMaterial({ color: srnd(0, 1) < 0.5 ? 0xa0582a : 0x8a6a3a, roughness: 0.7 }), x, y, z); g.add(v);
    const bant = ms(new T.TorusGeometry(0.33 * s, 0.025 * s, 6, 18).rotateX(Math.PI / 2), M.altin, x, y + 0.4 * s, z); g.add(bant);
  }
  function firavunHeykeli(g, x, y, z, yon) {
    const h = new T.Group(); h.position.set(x, y, z); h.rotation.y = yon;
    h.add(ms(kutuGeo(1.6, 1.2, 1.6), M.sutunTas, 0, 0.6, 0));
    h.add(ms(kutuGeo(1.0, 2.0, 0.9), M.sutunTas, 0, 2.2, 0, true));
    h.add(ms(new T.SphereGeometry(0.42, 16, 12), M.sutunTas, 0, 3.6, 0));
    const nemes = ms(new T.CylinderGeometry(0.3, 0.75, 1.1, 4, 1), M.lacivert, -0.05, 3.55, 0); nemes.rotation.y = Math.PI / 4; h.add(nemes);
    h.add(ms(kutuGeo(0.12, 0.5, 0.14), M.altin, 0.42, 3.25, 0));
    h.add(ms(kutuGeo(0.8, 0.5, 1.2), M.altin, 0.15, 3.0, 0));
    g.add(h);
  }
  function tahtKur(g, x, y, z) {
    g.add(ms(kutuGeo(2, 0.6, 3), M.altin, x, 0.3, z)); g.add(ms(kutuGeo(0.5, 3.5, 3), M.altin, x + 0.75, 1.9, z));
    g.add(ms(kutuGeo(1.6, 0.4, 2.6), M.lacivert, x - 0.1, 0.8, z));
    const gd = gozDiski(0.9); gd.position.set(x + 0.48, 3, z); gd.rotation.y = -Math.PI / 2; g.add(gd);
  }
  function mangalKur(g, x, z) {
    g.add(ms(new T.CylinderGeometry(0.2, 0.35, 1.4, 8), M.bronz, x, 0.7, z));
    g.add(ms(new T.CylinderGeometry(0.7, 0.35, 0.4, 12), M.altin, x, 1.5, z));
    const alev = new T.Sprite(new T.SpriteMaterial({ map: alevDokusu(), color: 0xffa040, blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
    alev.position.set(x, 2.3, z); alev.scale.set(1.4, 2, 1); g.add(alev);
    meşaleler.push({ x, y: 2.3, z, alev, parilti: null, s: Math.random() * 10, buyuk: true });
  }

  // ---------- Tuzak görselleri ----------
  function tuzaklariKur(g) {
    const D = Dunya;
    // 0: dikenler
    {
      const tz = D.TUZAKLAR[0], nx = Math.round((tz.x2 - tz.x1) / 0.5), nz = 16;
      const geo = new T.ConeGeometry(0.11, 0.9, 6); geo.translate(0, 0.45, 0);
      const im = new T.InstancedMesh(geo, new T.MeshStandardMaterial({ color: 0x6a5a48, metalness: 0.8, roughness: 0.35 }), nx * nz), mt = new T.Matrix4();
      let i = 0; for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) { mt.makeTranslation(tz.x1 + 0.25 + a * 0.5, 0, -3.75 + b * 0.5); im.setMatrixAt(i++, mt); }
      im.castShadow = true; const grp = new T.Group(); grp.add(im); grp.position.y = -0.92; g.add(grp);
      const plane = new T.Mesh(new T.PlaneGeometry(tz.x2 - tz.x1, 8).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: D_.delik, transparent: true, depthWrite: false }));
      D_.delik.repeat.set((tz.x2 - tz.x1) / 2, 4); plane.position.set((tz.x1 + tz.x2) / 2, 0.01, 0); g.add(plane);
      TZ.diken = { grp };
    }
    // kapaklar (çöken zemin / köprü): her kapak iki kanat
    TZ.kapak = [];
    D.DINAMIK.filter(d => d.tip === 'kapak').forEach(d => {
      const w = 2, zz = d.z2 - d.z1, kanatlar = [];
      [[d.z1, 1], [d.z2, -1]].forEach(([zp, s]) => {
        const piv = new T.Group(); piv.position.set(d.x1 + w / 2, -0.25, zp);
        const k = ms(kutuGeo(w - 0.04, 0.5, zz / 2 - 0.02, 2), M.kapak, 0, 0, s * zz / 4); k.castShadow = true; piv.add(k);
        g.add(piv); kanatlar.push({ piv, s });
      });
      TZ.kapak.push({ d, kanatlar });
    });
    // batan taşlar
    TZ.tas = D.TASLAR.map(([x, z], i) => { const o = ms(kutuGeo(D.TAS_YARI * 2, 3, D.TAS_YARI * 2, 2.2), M.tas, x, -1.5, z, true); g.add(o); return { o, x, z, i }; });
    // ezen tavan blokları
    TZ.tavan = D.TAVANLAR.map(([a, b], i) => {
      const grp = new T.Group();
      grp.add(ms(kutuGeo(b - a, 2.2, 8, 3), M.tas, 0, 1.1, 0, true));
      const n = 8 * 4, im = new T.InstancedMesh(new T.ConeGeometry(0.16, 0.6, 6).rotateX(Math.PI), M.bronz, n), mt = new T.Matrix4();
      let k = 0; for (let ix = 0; ix < 4; ix++) for (let iz = 0; iz < 8; iz++) { mt.makeTranslation(-(b - a) / 2 + 0.55 + ix * (b - a - 1.1) / 3, -0.3, -3.5 + iz); im.setMatrixAt(k++, mt); }
      grp.add(im);
      for (const zc of [-2.5, 2.5]) grp.add(ms(new T.CylinderGeometry(0.08, 0.08, 6, 6), M.bronz, 0, 5.2, zc));
      grp.position.set((a + b) / 2, D.TAVAN_UST, 0); g.add(grp);
      return { grp, i };
    });
    // tavan bölgesinin üst boşluğu (tavanın oturduğu yuva) — karanlık
    g.add(ms(kutuGeo(14.4, 0.2, 8), M.siyah, 65, 11.9, 0));
    // yuvarlanan kaya
    {
      const o = ms(new T.IcosahedronGeometry(D.KAYA_R, 2), M.kaya, 97, -20, 0, true);
      const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const v = new T.Vector3().fromBufferAttribute(p, i); v.multiplyScalar(1 + (Math.sin(v.x * 3.1) * Math.cos(v.y * 2.7) + Math.sin(v.z * 2.3)) * 0.035); p.setXYZ(i, v.x, v.y, v.z); }
      o.geometry.computeVertexNormals(); g.add(o);
      TZ.kaya = { o, vardi: false };
      g.add(ms(new T.CylinderGeometry(3.9, 3.9, 0.3, 24), M.siyah, 97, 11.9, 0));
    }
    // yükselen lav
    {
      const geo = new T.PlaneGeometry(19, 8).rotateX(-Math.PI / 2);
      const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 19 / 6, uv.getY(i) * 8 / 6);
      const o = ms(geo, M.lav, 106.5, D.LAV_TABAN, 0); g.add(o);
      // zeminde lav sızan çatlaklar
      const cat = new T.Mesh(new T.PlaneGeometry(19, 8).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: tuval(256, 128, (x, w, h) => { x.strokeStyle = '#ff7a20'; x.lineWidth = 2.5; x.shadowColor = '#ff5a00'; x.shadowBlur = 6; for (let i = 0; i < 26; i++) { x.beginPath(); let a = Math.random() * w, b = Math.random() * h; x.moveTo(a, b); for (let k = 0; k < 5; k++) { a += rnd(-16, 16); b += rnd(-10, 10); x.lineTo(a, b); } x.stroke(); } }), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      cat.position.set(106.5, 0.012, 0); g.add(cat);
      const l = new T.PointLight(0xff5a10, 0, 22, 1.5); l.position.set(106.5, 2, 0); scene.add(l);
      TZ.lav = { o, l, cat };
    }
    // yağlı zemin
    {
      const o = new T.Mesh(new T.PlaneGeometry(16, 6).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0x2a1404, roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0 }));
      o.position.set(126, 0.015, -1); g.add(o);
      // yağ kazanları (galeri altında)
      for (const x of [119, 126, 133]) { g.add(ms(new T.CylinderGeometry(0.5, 0.4, 0.8, 12), M.bronz, x, 4.5, 3.7)); }
      TZ.kaygan = { o };
    }
    // Ra'nın ışını: güneş diskleri + ışınlar
    {
      const diskler = [];
      for (const z of [-3.85, 3.85]) { const d = gozDiski(0.7); d.position.set(156.5, 0.9, z); d.rotation.y = z < 0 ? 0 : Math.PI; g.add(d); diskler.push(d); }
      const isinlar = [];
      for (let j = 0; j < D.LAZER_N; j++) {
        const grp = new T.Group();
        grp.add(new T.Mesh(new T.BoxGeometry(0.08, 0.08, 8), new T.MeshBasicMaterial({ color: 0xfff4c0 })));
        grp.add(new T.Mesh(new T.BoxGeometry(0.35, 0.35, 8), new T.MeshBasicMaterial({ color: 0xffa020, transparent: true, opacity: 0.45, blending: T.AdditiveBlending, depthWrite: false })));
        grp.position.y = 0.35; grp.visible = false; g.add(grp);
        const l = new T.PointLight(0xffb040, 0, 7, 1.8); grp.add(l);
        isinlar.push(grp);
      }
      TZ.lazer = { diskler, isinlar };
    }
    // baltalar
    {
      const sekil = new T.Shape();
      sekil.moveTo(-1.1, 0); sekil.quadraticCurveTo(0, -1.0, 1.1, 0); sekil.quadraticCurveTo(0, -0.45, -1.1, 0);
      const bicak = new T.ExtrudeGeometry(sekil, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 1 });
      bicak.translate(0, 0, -0.03); bicak.rotateY(Math.PI / 2);
      TZ.balta = D.BALTALAR.map(x => {
        const piv = new T.Group(); piv.position.set(x, D.BALTA_PIVOT, 0);
        const cubuk = ms(new T.CylinderGeometry(0.07, 0.07, D.BALTA_L, 6), M.bronz, 0, -D.BALTA_L / 2, 0); piv.add(cubuk);
        const b = new T.Mesh(bicak, new T.MeshStandardMaterial({ color: 0xc8c0b0, metalness: 0.9, roughness: 0.25 })); b.position.y = -D.BALTA_L + 0.35; b.castShadow = true; piv.add(b);
        piv.add(ms(new T.SphereGeometry(0.2, 10, 8), M.altin, 0, -D.BALTA_L + 0.5, 0));
        g.add(piv); return { piv };
      });
      g.add(ms(kutuGeo(20, 0.4, 0.6), M.bronz, 167, D.BALTA_PIVOT + 0.2, 0));
    }
    // sallar
    TZ.sal = D.PLATFORMLAR.map(([x], i) => {
      const grp = new T.Group();
      grp.add(ms(kutuGeo(3, 0.6, 3, 1.5), M.tahta, 0, -0.3, 0, true));
      for (const zz of [-1.3, 1.3]) grp.add(ms(new T.CylinderGeometry(0.2, 0.2, 3.1, 8).rotateZ(Math.PI / 2), M.kahve, 0, -0.1, zz));
      g.add(grp); return { grp, i };
    });
    // Anubis heykelleri (alev)
    TZ.alev = [];
    for (const x of [216, 220, 224, 228]) for (const z of [-3.4, 3.4]) {
      const h = anubis(); h.position.set(x, 0, z); h.rotation.y = z < 0 ? -Math.PI / 2 : Math.PI / 2; g.add(h);
      TZ.alev.push({ h, x, z, gozler: h.userData.gozler });
    }
    // Firavun'un düğmeleri (galeride)
    dugmeler = D.TUZAKLAR.map(tz => {
      const grp = new T.Group(); grp.position.set(tz.bx, D.GALERI_Y, -4.85);   // camın hemen önünde: Firavun koşuculara bakarak basar
      grp.add(ms(new T.CylinderGeometry(0.45, 0.55, 1.0, 12), M.sutunTas, 0, 0.5, 0));
      grp.add(ms(new T.CylinderGeometry(0.5, 0.5, 0.08, 16), M.altin, 0, 1.02, 0));
      const dm = new T.MeshStandardMaterial({ color: 0x30d060, emissive: 0x30d060, emissiveIntensity: 0.8, roughness: 0.3 });
      const bt = ms(new T.SphereGeometry(0.32, 16, 10, 0, 6.283, 0, Math.PI / 2), dm, 0, 1.06, 0); bt.scale.set(1.15, 0.6, 0.9); grp.add(bt);
      const lbl = etiketYap(tz.em, '#0000', 64); lbl.position.set(0, 2.0, 0); lbl.scale.multiplyScalar(1.3); grp.add(lbl);
      // galeriden aşağı inen ince işaret çizgisi
      scene.add(grp);
      return { grp, bt, dm, lbl, tz, hazir: null };
    });
  }
  function anubis() {
    const h = new T.Group();
    h.add(ms(kutuGeo(0.9, 0.5, 0.9), M.sutunTas, 0, 0.25, 0));
    h.add(ms(kutuGeo(0.6, 1.6, 0.5), M.siyah, 0, 1.3, 0, true));
    h.add(ms(kutuGeo(0.7, 0.25, 0.55), M.altin, 0, 2.0, 0));
    const bas = new T.Group(); bas.position.set(0, 2.45, 0);
    bas.add(ms(new T.SphereGeometry(0.3, 12, 10), M.siyah));
    const burun = ms(new T.ConeGeometry(0.16, 0.6, 8).rotateZ(-Math.PI / 2), M.siyah, 0.38, -0.05, 0); bas.add(burun);
    for (const z of [-0.14, 0.14]) { const k = ms(new T.ConeGeometry(0.09, 0.45, 6), M.siyah, -0.05, 0.38, z); bas.add(k); }
    const gm = new T.MeshBasicMaterial({ color: 0x552200 });
    const gozler = [-0.11, 0.11].map(z => { const o = new T.Mesh(new T.SphereGeometry(0.05, 6, 6), gm); o.position.set(0.22, 0.06, z); bas.add(o); return o; });
    h.add(bas);
    h.userData.gozler = gm;
    return h;
  }

  function etiketYap(yazi, renk, boy = 40) {
    const c = document.createElement('canvas'), g = c.getContext('2d');
    g.font = `900 ${boy}px Nunito, "Segoe UI Emoji", sans-serif`;
    const w = Math.ceil(g.measureText(yazi).width) + boy; c.width = w; c.height = boy * 1.6;
    g.font = `900 ${boy}px Nunito, "Segoe UI Emoji", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (renk !== '#0000') { g.fillStyle = '#000a'; g.beginPath(); g.roundRect(2, 2, w - 4, c.height - 4, boy * 0.5); g.fill(); g.strokeStyle = renk; g.lineWidth = 5; g.stroke(); }
    g.fillStyle = '#fff'; g.fillText(yazi, w / 2, c.height / 2 + 2);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
    const sp = new T.Sprite(new T.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
    const k = 0.0055 * boy / 40; sp.scale.set(w * k, c.height * k, 1); sp.renderOrder = 10;
    return sp;
  }

  // ---------- Tuzakların her kare güncellenmesi ----------
  const onceki = {};
  const BU = {}, PM = {};
  function tuzakGuncelle(t, akt, hazirFn, benFiravun) {
    const D = Dunya, f = id => D.faz(akt, id, t);
    // başlangıç kapısı
    if (basKapi) basKapi.position.y = t < 0 ? 0 : Math.min(5.5, t * 4);
    // dikenler
    { const fz = f(0); TZ.diken.grp.position.y = -0.92 + 0.92 * D.dikenBoy(fz); gecis('diken', fz > 0.75 && fz < 1, () => { toz(11, 0.2, 0, 30, 0xb89868, 4); }); }
    // kapaklar
    TZ.kapak.forEach(k => { const a = D.cokmeAci(f(k.d.tuzak)); k.kanatlar.forEach(kn => { kn.piv.rotation.x = kn.s * a * 1.65; }); });
    gecis('cokme1', f(1) > 0.5 && f(1) < 0.8, () => toz(29, 0, 0, 30, 0xb89868, 4));
    gecis('cokme9', f(9) > 0.5 && f(9) < 0.8, () => toz(186, 0, 0, 20, 0xb89868, 3));
    // taşlar
    TZ.tas.forEach(s => { const fz = f(2) - s.i * 0.45; s.o.position.y = D.tasY(s.i, t, akt) - 1.5; s.o.position.x = s.x + D.batanSalla(fz); gecis('tas' + s.i, fz > 1.0 && fz < 1.3, () => lavSicra(s.x, D.LAV_Y + 0.2, s.z, 14)); });
    // tavan
    TZ.tavan.forEach(s => { const y = D.tavanAlt(f(3), s.i); s.grp.position.y = y; const k = f(3) - s.i * 0.3; gecis('tavan' + s.i, k > 0.58 && k < 0.9, () => { toz(s.grp.position.x, 0.3, 0, 40, 0xc0a070, 5); sarsinti(0.35); Ses?.carp?.(); }); });
    // kaya
    {
      const k = D.kayaPos(f(4)); const o = TZ.kaya.o;
      if (k) { o.visible = true; o.position.set(k.x, k.y, k.z); o.rotation.z = k.don; if (k.y <= D.KAYA_R + 0.01 && Math.random() < 0.7) toz(k.x + 1.5, 0.2, rnd(-3, 3), 2, 0xb89868, 2); TZ.kaya.vardi = true; }
      else { if (TZ.kaya.vardi) { TZ.kaya.vardi = false; kayaParcala(75.5, 2, 0); } o.visible = false; }
      gecis('kayaIndi', f(4) > 0.68 && f(4) < 0.9, () => { toz(97, 0.3, 0, 40, 0xb89868, 5); sarsinti(0.5); });
    }
    // lav
    { const y = D.lavY(f(5)); TZ.lav.o.position.y = y; TZ.lav.l.intensity = y > -0.1 ? 40 * Math.min(1, (y + 0.1) * 2) : 0; TZ.lav.cat.material.opacity = y > -0.05 ? 0 : 0.5 + 0.5 * Math.sin(zaman * 3); if (y > 0.2 && Math.random() < 0.5) lavSicra(rnd(98, 115), y, rnd(-3.5, 3.5), 2); }
    // yağ
    { const fz = f(6), a = D.kayganAktif(fz) ? 1 : fz > 0 && fz < 6.6 ? Math.max(0, 1 - (fz - 6.2) / 0.4) : 0; const o = TZ.kaygan.o; o.material.opacity += ((fz > 0 && fz < 0.2 ? fz / 0.2 : a) * 0.9 - o.material.opacity) * 0.2; o.visible = o.material.opacity > 0.01; if (D.kayganAktif(fz) && Math.random() < 0.4) parcacik(0, { x: rnd(118, 134), y: 0.1, z: rnd(-4, 1), vz: 3, renk: 0x3a2008, boy: 0.4, omur: 0.6 }); }
    // ışın
    { const fz = f(7); TZ.lazer.isinlar.forEach((gr, j) => { const x = D.lazerX(fz, j); gr.visible = x !== null; if (x !== null) { gr.position.x = x; gr.children[2].intensity = 12; if (Math.random() < 0.5) parcacik(1, { x, y: 0.35, z: rnd(-4, 4), vy: 1, renk: 0xffd060, boy: 0.15, omur: 0.3 }); } }); }
    // baltalar
    TZ.balta.forEach((b, i) => { b.piv.rotation.x = -D.baltaAci(i, t, akt); });
    // sallar
    TZ.sal.forEach(s => { const c = D.platMerkez(s.i, t, akt, PM); s.grp.position.set(c.x, c.y + Math.sin(zaman * 2 + s.i) * 0.03, c.z); s.grp.rotation.z = Math.sin(zaman * 1.3 + s.i) * 0.02; });
    // Anubis alevleri
    {
      const fz = f(11), uy = D.alevUyari(fz), ak = D.alevAktif(fz);
      TZ.alev[0].gozler.color.setHex(uy || ak ? 0xff2200 : 0x552200);
      if (ak) TZ.alev.forEach(a => { const s = a.z < 0 ? 1 : -1; if (Math.random() < 0.75) parcacik(1, { x: a.x + rnd(-0.1, 0.1), y: 2.4 + rnd(-0.1, 0.1), z: a.z + s * 0.5, vx: rnd(-1, 1), vy: rnd(-0.3, 1.2), vz: s * rnd(7, 10), renk: [0xff9a20, 0xff6a10, 0xffc040][Math.floor(Math.random() * 3)], boy: rnd(0.5, 1.0), omur: rnd(0.35, 0.6), buyu: 1.4 }); if (Math.random() < 0.15) parcacik(0, { x: a.x, y: 2.8, z: a.z + s * 2, vx: rnd(-0.5, 0.5), vy: rnd(1, 2), vz: s * 2, renk: 0x3a2a20, boy: rnd(1, 1.6), omur: 1.2, buyu: 1.5 }); });
      gecis('alev', ak, () => sarsinti(0.15));
    }
    // düğmeler
    dugmeler.forEach(d => {
      const h = hazirFn ? hazirFn(d.tz.id) : true;
      if (h !== d.hazir) { d.hazir = h; d.dm.color.setHex(h ? 0x30d060 : 0x8a1a10); d.dm.emissive.setHex(h ? 0x30d060 : 0x5a0a04); }
      d.bt.position.y = 1.06 - (D.faz(akt, d.tz.id, t) < 0.3 ? 0.08 : 0);
      d.lbl.visible = true;
    });
  }
  function gecis(ad, kosul, fn) { if (kosul && !onceki[ad]) fn(); onceki[ad] = kosul; }
  function dugmeIsaretle(id) { dugmeler.forEach(d => { d.grp.scale.setScalar(d.tz.id === id ? 1.15 + Math.sin(zaman * 8) * 0.05 : 1); }); }

  // ---------- Karakterler ----------
  function karakterYap(renkNo, firavun = false) {
    const g = new T.Group(), govde = new T.Group(); g.add(govde);
    const renk = RENKLER[renkNo % RENKLER.length];
    const P = {};
    if (!firavun) {
      const gomlek = new T.MeshStandardMaterial({ color: renk, roughness: 0.8 });
      P.bacakL = uzuv(0.16, 0.85, M.haki, -0.0, 0.85, -0.13, M.kahve); P.bacakR = uzuv(0.16, 0.85, M.haki, 0, 0.85, 0.13, M.kahve);
      govde.add(P.bacakL.p, P.bacakR.p);
      govde.add(ms(kutuGeo(0.34, 0.62, 0.5, 1), gomlek, 0, 1.15, 0, true));
      govde.add(ms(kutuGeo(0.36, 0.08, 0.52, 1), M.kahve, 0, 0.88, 0));
      govde.add(ms(kutuGeo(0.22, 0.45, 0.38, 1), M.kahve, -0.27, 1.2, 0, true));
      P.kolL = uzuv(0.12, 0.62, gomlek, 0, 1.43, -0.32, M.ten, true); P.kolR = uzuv(0.12, 0.62, gomlek, 0, 1.43, 0.32, M.ten, true);
      govde.add(P.kolL.p, P.kolR.p);
      const bas = new T.Group(); bas.position.y = 1.62; govde.add(bas); P.bas = bas;
      bas.add(ms(new T.SphereGeometry(0.2, 14, 12), M.ten, 0, 0.05, 0, true));
      for (const z of [-0.07, 0.07]) bas.add(ms(new T.SphereGeometry(0.03, 6, 6), M.goz, 0.18, 0.08, z));
      bas.add(ms(new T.SphereGeometry(0.23, 14, 8, 0, 6.283, 0, Math.PI / 2), M.haki, 0, 0.12, 0, true));
      bas.add(ms(new T.CylinderGeometry(0.36, 0.36, 0.03, 18), M.haki, 0, 0.12, 0));
      bas.add(ms(new T.CylinderGeometry(0.235, 0.235, 0.05, 18), M.kahve, 0, 0.15, 0));
    } else {
      const sargi = M.bez;
      P.bacakL = uzuv(0.17, 0.9, sargi, 0, 0.9, -0.14, M.altin); P.bacakR = uzuv(0.17, 0.9, sargi, 0, 0.9, 0.14, M.altin);
      govde.add(P.bacakL.p, P.bacakR.p);
      govde.add(ms(kutuGeo(0.38, 0.7, 0.56, 1), sargi, 0, 1.25, 0, true));
      govde.add(ms(new T.CylinderGeometry(0.42, 0.42, 0.1, 16, 1, false, -Math.PI / 2, Math.PI), M.altin, 0.03, 1.55, 0));
      govde.add(ms(kutuGeo(0.42, 0.14, 0.6, 1), M.altin, 0, 0.92, 0));
      govde.add(ms(kutuGeo(0.06, 0.45, 0.3, 1), new T.MeshStandardMaterial({ color: renk }), 0.2, 0.7, 0));
      P.kolL = uzuv(0.13, 0.66, sargi, 0, 1.55, -0.36, M.altin, true); P.kolR = uzuv(0.13, 0.66, sargi, 0, 1.55, 0.36, M.altin, true);
      govde.add(P.kolL.p, P.kolR.p);
      const bas = new T.Group(); bas.position.y = 1.78; govde.add(bas); P.bas = bas;
      bas.add(ms(new T.SphereGeometry(0.22, 14, 12), M.altin, 0, 0.05, 0, true));
      const nemesMat = new T.MeshStandardMaterial({ map: tuval(64, 64, (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#1a3a9a' : '#e8b830'; x.fillRect(0, i * 8, 64, 8); } }), roughness: 0.5, metalness: 0.3 });
      const nemes = ms(new T.CylinderGeometry(0.24, 0.5, 0.8, 4, 1, true), nemesMat, -0.06, -0.05, 0); nemes.rotation.y = Math.PI / 4; nemes.material.side = T.DoubleSide; bas.add(nemes);
      bas.add(ms(new T.SphereGeometry(0.25, 14, 8, 0, 6.283, 0, Math.PI / 2), nemesMat, -0.02, 0.1, 0));
      bas.add(ms(new T.ConeGeometry(0.05, 0.16, 6), M.altin, 0.2, 0.3, 0));
      const gm = new T.MeshBasicMaterial({ color: 0x40e0ff });
      for (const z of [-0.08, 0.08]) bas.add(ms(new T.SphereGeometry(0.035, 6, 6), gm, 0.2, 0.08, z));
      bas.add(ms(kutuGeo(0.06, 0.25, 0.06), M.lacivert, 0.18, -0.25, 0));
      g.scale.setScalar(1.12);
    }
    // asa (düello / Firavun)
    const asa = new T.Group();
    asa.add(ms(new T.CylinderGeometry(0.035, 0.035, 1.5, 6), firavun ? M.altin : M.kahve, 0, 0, 0, true));
    if (firavun) { const k = ms(new T.TorusGeometry(0.13, 0.035, 6, 12, Math.PI), M.altin, 0.13, 0.75, 0); k.rotation.z = Math.PI; asa.add(k); }
    else asa.add(ms(new T.SphereGeometry(0.09, 8, 6), M.altin, 0, 0.75, 0));
    asa.position.set(0.04, -0.02, 0); asa.rotation.z = -1.3;
    P.kolR.alt.add(asa); asa.visible = firavun;
    // Deagle (düelloda): namlu kolun uzandığı yöne bakar
    const silah = silahYap(); silah.rotation.z = -Math.PI / 2; silah.position.set(0.02, -0.06, 0); silah.visible = false;
    P.kolR.alt.add(silah);
    const gl = new T.Mesh(new T.CircleGeometry(0.45, 16).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })); gl.position.y = 0.02; g.add(gl);
    scene.add(g);
    return { g, govde, P, asa, silah, firavun, faz: 0, salla: 0, golge: gl };
  }
  // Deagle modeli: kendi ekseninde namlu +x, üstü +y
  let silahMat = null;
  function silahYap(olcek = 1) {
    if (!silahMat) silahMat = { govde: new T.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.85, roughness: 0.3 }), kabza: new T.MeshStandardMaterial({ color: 0x1e1e22, roughness: 0.7 }), altin: new T.MeshStandardMaterial({ color: 0xd8a830, metalness: 0.9, roughness: 0.3 }) };
    const g = new T.Group();
    g.add(ms(kutuGeo(0.36, 0.08, 0.055, 1), silahMat.govde, 0.1, 0.035, 0, true));          // sürgü
    g.add(ms(kutuGeo(0.3, 0.05, 0.05, 1), silahMat.govde, 0.08, -0.025, 0));                // gövde altı
    const kabza = ms(kutuGeo(0.075, 0.2, 0.05, 1), silahMat.kabza, -0.03, -0.12, 0, true); kabza.rotation.z = 0.25; g.add(kabza);
    g.add(ms(kutuGeo(0.02, 0.05, 0.02, 1), silahMat.altin, 0.26, 0.085, 0));                // arpacık
    const tetik = ms(kutuGeo(0.06, 0.02, 0.02, 1), silahMat.kabza, 0.04, -0.07, 0); g.add(tetik);
    g.scale.setScalar(olcek);
    return g;
  }
  // birinci şahıs: kameraya bağlı tabanca
  let elSilahi = null, elTepme = 0;
  function elSilahKur() {
    elSilahi = silahYap(1.1); elSilahi.rotation.y = Math.PI / 2; elSilahi.position.set(0.2, -0.2, -0.42); elSilahi.visible = false;
    elSilahi.traverse(o => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 10; } });
    camera.add(elSilahi); scene.add(camera);
  }
  // mermi izleri ve namlu alevi
  const izler = [];
  let namluIsik = null;
  function iz(o, s) {
    const geo = new T.BufferGeometry().setFromPoints([new T.Vector3(o[0], o[1], o[2]), new T.Vector3(s[0], s[1], s[2])]);
    const m = new T.LineBasicMaterial({ color: 0xffe8a0, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false });
    const l = new T.Line(geo, m); scene.add(l); izler.push({ l, omur: 0.12 });
  }
  function namlu(x, y, z) {
    if (!namluIsik) { namluIsik = new T.PointLight(0xffc060, 0, 9, 2); scene.add(namluIsik); }
    namluIsik.position.set(x, y, z); namluIsik.intensity = 30;
    for (let i = 0; i < 6; i++) parcacik(1, { x, y, z, vx: rnd(-1.5, 1.5), vy: rnd(-0.5, 1.5), vz: rnd(-1.5, 1.5), renk: i % 2 ? 0xffd060 : 0xff8a20, boy: rnd(0.25, 0.45), omur: 0.08 });
  }
  function kanEfekt(x, y, z, kafa) {
    for (let i = 0; i < (kafa ? 26 : 14); i++) parcacik(0, { x, y, z, vx: rnd(-2.5, 2.5), vy: rnd(0, 3), vz: rnd(-2.5, 2.5), renk: i % 3 ? 0x9a0a0a : 0xd02020, boy: rnd(0.12, 0.3), omur: rnd(0.3, 0.6), yer: 12 });
  }
  function duvarIzi(x, y, z) { toz(x, y, z, 5, 0xc8a878, 0.4); kivilcim(x, y, z, 5, 0xffe0a0); }
  // Uzuv: omuz/kalça (p) → üst parça → dirsek/diz (orta) → alt parça → el/ayak (alt)
  function uzuv(r, boy, m, x, y, z, ucMat, kol = false) {
    const p = new T.Group(); p.position.set(x, y, z);
    const u = boy / 2;
    p.add(ms(kutuGeo(r * 1.65, u + 0.04, r * 1.65, 1), m, 0, -u / 2, 0, true));
    const orta = new T.Group(); orta.position.y = -u; p.add(orta);
    orta.add(ms(new T.SphereGeometry(r * 0.85, 8, 6), m));
    orta.add(ms(kutuGeo(r * 1.45, u, r * 1.45, 1), kol ? ucMat : m, 0, -u / 2, 0, true));
    const alt = new T.Group(); alt.position.y = -u; orta.add(alt);
    if (kol) alt.add(ms(new T.SphereGeometry(r * 0.95, 8, 6), ucMat, 0, -0.02, 0, true));
    else alt.add(ms(kutuGeo(r * 2.1, r * 1.1, r * 1.6, 1), ucMat, r * 0.45, -r * 0.1, 0, true));
    return { p, orta, alt };
  }
  const yumusat = (o, eksen, hedef, k) => { o.rotation[eksen] += (hedef - o.rotation[eksen]) * k; };
  // s: { x, y, z, yaw, hiz, yerde, salla (0..1), duello }
  // Koşu: kalça ileri-geri, diz geri bükülür (bacak öne gelirken), kollar ters yönde ve dirsekler kırık,
  // gövde öne eğik ve hafif zıplar. Havada: çıkarken dizler karna çekilir, düşerken bacaklar açılır, kollar dengede.
  function karakterGuncelle(K, s, dt) {
    K.g.position.set(s.x, s.y, s.z);
    let fark = -s.yaw - K.g.rotation.y; while (fark > Math.PI) fark -= 2 * Math.PI; while (fark < -Math.PI) fark += 2 * Math.PI;
    K.g.rotation.y += fark * Math.min(1, dt * 14);
    // dikey hız tahmini (havadayken çıkış / iniş pozu için)
    const vy = K.oncekiY === undefined || dt <= 0 ? 0 : (s.y - K.oncekiY) / dt;
    K.oncekiY = s.y; K.vy = (K.vy || 0) + (vy - (K.vy || 0)) * Math.min(1, dt * 12);
    const hiz = s.hiz || 0;
    const P = K.P, k = 1 - Math.exp(-dt * 16);
    let kalcaL, kalcaR, dizL, dizR, omuzL, omuzR, dirsekL, dirsekR, egil, sicra, yanKol = 0;
    if (s.yerde) {
      const sal = Math.min(1, hiz / 6.5);
      K.faz += dt * (hiz > 0.3 ? 3.2 + hiz * 1.05 : 0);
      const f = K.faz, sn = Math.sin(f), cs = Math.cos(f);
      kalcaL = sn * 0.95 * sal; kalcaR = -sn * 0.95 * sal;
      // diz: bacak öne savrulurken (kalça hızı +) çok bükülür, yere basarken az
      dizL = -(0.12 + 1.35 * Math.max(0, cs)) * sal - 0.05; dizR = -(0.12 + 1.35 * Math.max(0, -cs)) * sal - 0.05;
      omuzL = -sn * 0.85 * sal; omuzR = sn * 0.85 * sal;
      dirsekL = 0.25 + 1.1 * sal + Math.max(0, -sn) * 0.3 * sal; dirsekR = 0.25 + 1.1 * sal + Math.max(0, sn) * 0.3 * sal;
      egil = -0.16 * sal;
      sicra = Math.abs(cs) * 0.09 * sal - 0.04 * sal;
      if (hiz < 0.3) { const n = Math.sin(performance.now() / 600) * 0.03; omuzL = n; omuzR = -n; dirsekL = dirsekR = 0.15; sicra = 0; }
    } else if (K.vy > 0.5) {
      // yükselirken: ön diz karna, arka bacak geride bükük, kollar öne-yukarı
      kalcaL = 1.25; dizL = -1.6; kalcaR = -0.25; dizR = -1.1;
      omuzL = 0.9; omuzR = -0.5; dirsekL = 1.0; dirsekR = 0.9; yanKol = 0.25;
      egil = -0.12; sicra = 0;
    } else {
      // düşerken: bacaklar inişe hazır, kollar yana açık (denge)
      kalcaL = 0.55; dizL = -0.7; kalcaR = 0.1; dizR = -0.35;
      omuzL = 0.35; omuzR = 0.2; dirsekL = 0.6; dirsekR = 0.6; yanKol = 0.75;
      egil = -0.05; sicra = 0;
    }
    // eğilme: kalçalar öne, dizler çok bükük, gövde alçak ve öne eğik; havada dizler karna çekilir
    if (s.egik) {
      if (s.yerde) { kalcaL += 1.05; kalcaR += 1.05; dizL -= 1.55; dizR -= 1.55; egil -= 0.3; sicra -= 0.55; omuzL += 0.3; omuzR += 0.3; }
      else { kalcaL = 1.6; kalcaR = 1.4; dizL = -2.1; dizR = -2.0; sicra = 0.1; egil = -0.25; }
    }
    yumusat(P.bacakL.p, 'z', kalcaL, k); yumusat(P.bacakR.p, 'z', kalcaR, k);
    yumusat(P.bacakL.orta, 'z', dizL, k); yumusat(P.bacakR.orta, 'z', dizR, k);
    yumusat(P.kolL.p, 'z', omuzL, k); yumusat(P.kolL.orta, 'z', dirsekL, k);
    yumusat(P.kolL.p, 'x', -yanKol, k); yumusat(P.kolR.p, 'x', yanKol, k);
    // sağ kol: asa savurma ya da Firavun'un asayı tutuşu
    if (s.duello) {
      // düello: tabancayı öne doğrultur, sol el destek; ateş edince kol yukarı teper
      const tep = s.ates || 0;
      P.kolR.p.rotation.z = 1.5 + tep * 0.45; P.kolR.orta.rotation.z = 0.04; P.kolR.p.rotation.x = 0.1;
      yumusat(P.kolL.p, 'z', 1.3, k); yumusat(P.kolL.orta, 'z', 0.55, k);
    } else if (K.firavun && !s.duello && s.yerde && hiz < 3) { yumusat(P.kolR.p, 'z', 0.35, k); yumusat(P.kolR.orta, 'z', 1.2, k); }
    else { yumusat(P.kolR.p, 'z', omuzR, k); yumusat(P.kolR.orta, 'z', dirsekR, k); }
    K.govde.rotation.z += (egil - K.govde.rotation.z) * k;
    K.govde.position.y += (sicra - K.govde.position.y) * k;
    if (P.bas) P.bas.rotation.z = -K.govde.rotation.z * 0.6;
    K.asa.visible = K.firavun && !s.duello;
    K.silah.visible = !!s.duello;
    K.golge.position.y = 0.02;
  }
  const lerpS = (a, b, t) => a + (b - a) * t;  function karakterSil(K) { if (K) scene.remove(K.g); }

  // ---------- Parçacıklar ----------
  const PN = 2400, sistemler = [];
  function parcacikKur() {
    [T.NormalBlending, T.AdditiveBlending].forEach(karisim => {
      const geo = new T.BufferGeometry();
      const poz = new Float32Array(PN * 3), renk = new Float32Array(PN * 3), boy = new Float32Array(PN), alfa = new Float32Array(PN);
      geo.setAttribute('position', new T.BufferAttribute(poz, 3)); geo.setAttribute('renk', new T.BufferAttribute(renk, 3));
      geo.setAttribute('boy', new T.BufferAttribute(boy, 1)); geo.setAttribute('alfa', new T.BufferAttribute(alfa, 1));
      const m = new T.ShaderMaterial({
        transparent: true, depthWrite: false, blending: karisim, uniforms: { olcek: { value: innerHeight } },
        vertexShader: `attribute vec3 renk; attribute float boy; attribute float alfa; varying vec3 vR; varying float vA; uniform float olcek;
          void main(){ vR = renk; vA = alfa; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = boy * olcek * 0.9 / -mv.z; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `varying vec3 vR; varying float vA; void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p); if (d > 0.5) discard; gl_FragColor = vec4(vR, smoothstep(0.5, 0.15, d) * vA); }`,
      });
      const pts = new T.Points(geo, m); pts.frustumCulled = false; scene.add(pts);
      sistemler.push({ geo, poz, renk, boy, alfa, m, v: new Float32Array(PN * 3), omur: new Float32Array(PN), azami: new Float32Array(PN), b0: new Float32Array(PN), buyu: new Float32Array(PN), yer: new Float32Array(PN), sira: 0 });
    });
  }
  const tmpR = new T.Color();
  function parcacik(si, o) {
    const S = sistemler[si]; const i = S.sira; S.sira = (S.sira + 1) % PN;
    S.poz[i * 3] = o.x; S.poz[i * 3 + 1] = o.y; S.poz[i * 3 + 2] = o.z;
    S.v[i * 3] = o.vx || 0; S.v[i * 3 + 1] = o.vy || 0; S.v[i * 3 + 2] = o.vz || 0;
    tmpR.setHex(o.renk); S.renk[i * 3] = tmpR.r; S.renk[i * 3 + 1] = tmpR.g; S.renk[i * 3 + 2] = tmpR.b;
    S.omur[i] = S.azami[i] = o.omur || 1; S.b0[i] = o.boy || 0.5; S.buyu[i] = o.buyu || 0; S.yer[i] = o.yer ?? 0;
  }
  function parcacikGuncelle(dt) {
    sistemler.forEach(S => {
      S.m.uniforms.olcek.value = innerHeight;
      for (let i = 0; i < PN; i++) {
        if (S.omur[i] <= 0) { if (S.alfa[i]) S.alfa[i] = 0; continue; }
        S.omur[i] -= dt;
        const k = 1 - S.omur[i] / S.azami[i];
        S.v[i * 3 + 1] -= S.yer[i] * dt;
        const s = Math.exp(-1.6 * dt); S.v[i * 3] *= s; S.v[i * 3 + 2] *= s; if (!S.yer[i]) S.v[i * 3 + 1] *= s;
        S.poz[i * 3] += S.v[i * 3] * dt; S.poz[i * 3 + 1] += S.v[i * 3 + 1] * dt; S.poz[i * 3 + 2] += S.v[i * 3 + 2] * dt;
        S.boy[i] = Math.max(0.01, S.b0[i] * (1 + S.buyu[i] * k));
        S.alfa[i] = Math.min(1, (1 - k) * 1.6);
      }
      ['position', 'renk', 'boy', 'alfa'].forEach(a => { S.geo.attributes[a].needsUpdate = true; });
    });
  }
  function toz(x, y, z, n = 10, renk = 0xc8a878, yay = 1.5) {
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283; parcacik(0, { x: x + Math.cos(a) * yay * 0.5 * Math.random(), y, z: z + Math.sin(a) * yay * 0.5 * Math.random(), vx: Math.cos(a) * rnd(1.5, 4.5), vy: rnd(0.3, 1.8), vz: Math.sin(a) * rnd(1.5, 4.5), renk, boy: rnd(0.6, 1.3), omur: rnd(0.5, 1.0), buyu: 1.6 }); }
  }
  function kivilcim(x, y, z, n = 14, renk) {
    for (let i = 0; i < n; i++) parcacik(1, { x, y, z, vx: rnd(-6, 6), vy: rnd(2, 6), vz: rnd(-6, 6), renk: renk || (Math.random() < 0.5 ? 0xffe060 : 0xff9a30), boy: rnd(0.15, 0.3), omur: rnd(0.25, 0.55), yer: 16 });
  }
  function lavSicra(x, y, z, n = 8) {
    for (let i = 0; i < n; i++) parcacik(1, { x, y, z, vx: rnd(-2.5, 2.5), vy: rnd(2, 6), vz: rnd(-2.5, 2.5), renk: [0xffd040, 0xff7a10, 0xff4a00][i % 3], boy: rnd(0.2, 0.45), omur: rnd(0.4, 0.8), yer: 14 });
  }
  function kayaParcala(x, y, z) {
    for (let i = 0; i < 50; i++) { const a = Math.random() * 6.283; parcacik(0, { x, y: y + rnd(-1.5, 1.5), z: z + rnd(-2, 2), vx: Math.cos(a) * rnd(2, 8) - 3, vy: rnd(1, 7), vz: Math.sin(a) * rnd(2, 8), renk: [0x8a6a48, 0x6a4a30, 0xb89868][i % 3], boy: rnd(0.4, 1.0), omur: rnd(0.6, 1.2), yer: 12 }); }
    toz(x, 0.5, z, 40, 0xb89868, 6); sarsinti(0.6);
  }
  // ölüm: ruh yükselir
  function ruh(x, y, z, neden) {
    if (neden === 'lav' || neden === 'alev') { for (let i = 0; i < 30; i++) parcacik(1, { x: x + rnd(-0.3, 0.3), y: y + rnd(0, 1.6), z: z + rnd(-0.3, 0.3), vx: rnd(-2, 2), vy: rnd(1, 5), vz: rnd(-2, 2), renk: [0xffe080, 0xff8a20, 0xff4a10][i % 3], boy: rnd(0.4, 1), omur: rnd(0.4, 0.9), buyu: 1 }); }
    else if (neden !== 'dustu') toz(x, y + 0.5, z, 24, 0xc8a878, 2);
    for (let i = 0; i < 26; i++) parcacik(1, { x: x + rnd(-0.25, 0.25), y: y + 0.4 + i * 0.06, z: z + rnd(-0.25, 0.25), vx: rnd(-0.3, 0.3), vy: rnd(1.5, 3), vz: rnd(-0.3, 0.3), renk: [0xd0f0ff, 0xffffff, 0x9ad8ff][i % 3], boy: rnd(0.3, 0.7), omur: rnd(1.2, 2), buyu: 0.6 });
    if (neden === 'diken' || neden === 'kaya' || neden === 'tavan' || neden === 'balta') kivilcim(x, y + 0.8, z, 10, 0xffe0a0);
  }
  function konfeti(x, y, z) {
    for (let i = 0; i < 90; i++) { const a = Math.random() * 6.283; parcacik(1, { x, y: y + 1, z, vx: Math.cos(a) * rnd(1, 6), vy: rnd(4, 10), vz: Math.sin(a) * rnd(1, 6), renk: [0xffd040, 0x40c0ff, 0xff5a8a, 0x60ff80, 0xffffff][i % 5], boy: rnd(0.15, 0.3), omur: rnd(1, 2), yer: 8 }); }
  }
  function vurusEfekt(x, y, z) { kivilcim(x, y, z, 18, 0xfff0a0); for (let i = 0; i < 10; i++) parcacik(0, { x, y, z, vx: rnd(-3, 3), vy: rnd(0, 3), vz: rnd(-3, 3), renk: 0xe8e0d0, boy: rnd(0.4, 0.8), omur: 0.5, buyu: 1 }); }
  function sarsinti(g) { kam.sars = Math.max(kam.sars, g); }
  function ayakTozu(x, y, z) { parcacik(0, { x: x + rnd(-0.2, 0.2), y: y + 0.05, z: z + rnd(-0.2, 0.2), vx: rnd(-0.5, 0.5), vy: rnd(0.2, 0.6), vz: rnd(-0.5, 0.5), renk: 0xc8a878, boy: rnd(0.3, 0.6), omur: 0.5, buyu: 1.2 }); }
  function duelloHalkasi(x, z) { for (let i = 0; i < 60; i++) { const a = i / 60 * 6.283; parcacik(1, { x: x + Math.cos(a) * 1.2, y: 0.2, z: z + Math.sin(a) * 1.2, vy: rnd(1, 3), renk: 0xffd040, boy: 0.3, omur: 0.8 }); } }

  // ---------- Kamera ----------
  // mod: 'takip' (arkadan), 'birinci' (gözden), 'serbest' (bir noktanın çevresinde dönen)
  const kamTmp = { yaw: 0, pitch: 0.3 };
  // göz yüksekliği: eğilince alçalır (kamera yumuşakça iner)
  let gozY = 1.62;
  const basY = h => { const hedef = (h.boy || (h.egik ? Dunya.EGIK_BOY : Dunya.BOY)) - 0.18; gozY += (hedef - gozY) * 0.25; return gozY; };
  function kameraTakip(h, yaw, pitch, birinci, uzak = 5.2) {
    const cy = Math.cos(pitch), sy = Math.sin(pitch);
    const fx = Math.cos(yaw) * cy, fz = Math.sin(yaw) * cy;
    if (birinci) {
      kam.x = h.x + Math.cos(yaw) * 0.15; kam.y = h.y + basY(h); kam.z = h.z + Math.sin(yaw) * 0.15;
      kam.bx = kam.x + fx; kam.by = kam.y - sy; kam.bz = kam.z + fz;
      kam.ani = true;
      return;
    }
    const hx = h.x, hy = h.y + basY(h) - 0.05, hz = h.z;
    // omuz üstü: biraz sağa kaydır
    const sagx = -Math.sin(yaw) * 0.45, sagz = Math.cos(yaw) * 0.45;
    let cx = hx - fx * uzak + sagx, cyy = hy + sy * uzak + 0.3, cz = hz - fz * uzak + sagz;
    const k = Dunya.isinKes(hx, hy, hz, cx, cyy, cz);
    if (k < 1) { const kk = Math.max(0.08, k - 0.06); cx = hx + (cx - hx) * kk; cyy = hy + (cyy - hy) * kk; cz = hz + (cz - hz) * kk; }
    kam.x = cx; kam.y = cyy; kam.z = cz;
    kam.bx = hx + fx * 6 + sagx; kam.by = hy - sy * 6 + 0.2; kam.bz = hz + fz * 6 + sagz;
    kam.ani = true;
  }
  function kameraSerbest(odak, yaw, pitch, uzak) {
    const cy = Math.cos(pitch);
    kam.x = odak.x - Math.cos(yaw) * cy * uzak; kam.y = odak.y + Math.sin(pitch) * uzak; kam.z = odak.z - Math.sin(yaw) * cy * uzak;
    kam.bx = odak.x; kam.by = odak.y; kam.bz = odak.z;
    kam.ani = false;
  }
  // uçan kamera: poz'da durur, baktığı yöne (yaw, pitch) bakar
  function kameraUcan(poz, yaw, pitch) {
    const cp = Math.cos(pitch);
    kam.x = poz.x; kam.y = poz.y; kam.z = poz.z;
    kam.bx = poz.x + Math.cos(yaw) * cp; kam.by = poz.y - Math.sin(pitch); kam.bz = poz.z + Math.sin(yaw) * cp;
    kam.ani = false;
  }
  function menuKamera(t) {
    const x = ((t * 3.2) % 270) - 12;
    kam.x = x; kam.y = 3 + Math.sin(t * 0.3) * 1.2; kam.z = Math.sin(t * 0.2) * 2;
    kam.bx = x + 8; kam.by = 2; kam.bz = Math.sin(t * 0.2 + 1) * 2;
  }
  const yon = new T.Vector3();

  // ---------- Çizim ----------
  function ciz(dt, t) {
    zaman += dt;
    // kamera
    let sx = 0, sy = 0;
    if (kam.sars > 0) { sx = rnd(-1, 1) * kam.sars * 0.3; sy = rnd(-1, 1) * kam.sars * 0.3; kam.sars = Math.max(0, kam.sars - dt * 1.8); }
    camera.position.set(kam.x + sx, kam.y + sy, kam.z);
    camera.lookAt(kam.bx + sx, kam.by + sy, kam.bz);
    // gölge ışığı kamerayı izler
    ustIsik.position.set(kam.x + 4, 22, kam.z + 6); ustIsik.target.position.set(kam.x + 4, 0, kam.z);
    // meşaleler: titreşim + en yakın 8 tanesine gerçek ışık
    camera.getWorldDirection(yon);
    const ox = kam.x + yon.x * 6, oz = kam.z + yon.z * 6, oy = kam.y;
    meşaleler.forEach(m => {
      const fl = 0.85 + Math.sin(zaman * 13 + m.s) * 0.08 + Math.sin(zaman * 23 + m.s * 2) * 0.06;
      m.alev.scale.set((m.buyuk ? 1.4 : 0.7) * fl, (m.buyuk ? 2 : 1) * (0.9 + (fl - 0.85)), 1);
      m.d = (m.x - ox) ** 2 + (m.z - oz) ** 2 + (m.y - oy) ** 2 * 0.5;
      if (Math.random() < dt * 0.6) parcacik(1, { x: m.x, y: m.y + 0.3, z: m.z, vx: rnd(-0.2, 0.2), vy: rnd(0.8, 1.6), vz: rnd(-0.2, 0.2), renk: 0xffb040, boy: 0.08, omur: 1.2 });
    });
    const yakin = meşaleler.slice().sort((a, b) => a.d - b.d);
    isikHavuzu.forEach((l, i) => { const m = yakin[i]; if (!m) { l.intensity = 0; return; } l.position.set(m.x, m.y, m.z); l.intensity = (m.buyuk ? 28 : 16) * (0.85 + Math.sin(zaman * 11 + m.s) * 0.12); });
    lavIsiklari.forEach(L => { L.l.intensity = L.taban * (0.85 + Math.sin(zaman * 2.3 + L.l.position.x) * 0.15); });
    D_.lav.offset.set((zaman * 0.02) % 1, (zaman * 0.013) % 1);
    // ortamda uçuşan toz zerreleri
    if (Math.random() < dt * 14) parcacik(1, { x: kam.x + rnd(-8, 14), y: kam.y + rnd(-2, 4), z: kam.z + rnd(-4, 4), vx: rnd(-0.1, 0.3), vy: rnd(-0.05, 0.1), vz: rnd(-0.1, 0.1), renk: 0xffd8a0, boy: 0.04, omur: 3 });
    parcacikGuncelle(dt);
    for (let i = izler.length - 1; i >= 0; i--) { const z = izler[i]; z.omur -= dt; z.l.material.opacity = Math.max(0, z.omur / 0.12) * 0.9; if (z.omur <= 0) { scene.remove(z.l); z.l.geometry.dispose(); z.l.material.dispose(); izler.splice(i, 1); } }
    if (namluIsik && namluIsik.intensity > 0) namluIsik.intensity = Math.max(0, namluIsik.intensity - dt * 400);
    if (elSilahi) { elTepme = Math.max(0, elTepme - dt * 6); elSilahi.rotation.x = 0; elSilahi.rotation.z = elTepme * 0.5; elSilahi.position.z = -0.42 + elTepme * 0.07; }
    dugmeIsaretle(dugmeVurgu);
    renderer.render(scene, camera);
  }
  let dugmeVurgu = null;

  return {
    RENKLER, kur, ciz, karakterYap, karakterGuncelle, karakterSil, etiketYap, tuzakGuncelle,
    kameraTakip, kameraSerbest, kameraUcan, menuKamera,
    toz, kivilcim, lavSicra, ruh, konfeti, vurusEfekt, sarsinti, ayakTozu, duelloHalkasi, parcacik,
    iz, namlu, kanEfekt, duvarIzi,
    elSilah(gorunsun, tepme) { if (!elSilahi) return; elSilahi.visible = !!gorunsun; if (tepme) elTepme = 1; },
    dugmeVurgula(id) { dugmeVurgu = id; },
    get scene() { return scene; }, get camera() { return camera; }, get renderer() { return renderer; },
  };
})();
