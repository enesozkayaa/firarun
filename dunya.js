// =============================================================
// Firarun - dünya: piramit parkuru, fizik, tuzaklar ve botların aklı.
// Hem tarayıcıda hem Node'da çalışır (motor testi için).
// Eksenler: x = parkur boyunca ileri, y = yukarı, z = yan (koridor z -4..4).
// Firavun parkurun sol üstündeki galeride yürür (y 5.5) ve düğmelere basar.
// =============================================================

const Dunya = (() => {
  const R = 0.38, BOY = 1.8, HIZ = 7, FIR_HIZ = 9, G = 24, ZIPLA = 8.4;
  const GALERI_Y = 5.5, GALERI_Z = -6.2;
  const VARIS_X = 243.5;
  const LAV_Y = -1.2;
  const KAYA_R = 3.7;
  const BHOP_SINIR = 1.1, BHOP_IVME = 12, BHOP_AZAMI = 1.85;   // havada yön başına hız sınırı, hava ivmesi, en yüksek hız katı
  const BALTA_PIVOT = 11, BALTA_L = 9.4;
  const DUELLO = { k: [253, 0, 0, 0], f: [276, 0, 0, Math.PI] };
  const ARENA = { x1: 249.6, x2: 281, z1: -14, z2: 14 };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;

  // ---------- Tuzaklar (Firavun'un düğmeleri) ----------
  const TUZAKLAR = [
    { id: 0, tur: 'diken', ad: 'Akrep Dikenleri', em: '🦂', x1: 7, x2: 15, bx: 9, dolma: 1 },
    { id: 1, tur: 'cokme', ad: 'Çöken Zemin', em: '🕳️', x1: 24, x2: 34, bx: 26, z1: -4, z2: 4, dolma: 1 },
    { id: 2, tur: 'batan', ad: 'Batan Taşlar', em: '🟫', x1: 39, x2: 55, bx: 41, dolma: 1 },
    { id: 3, tur: 'tavan', ad: 'Ezen Tavan', em: '🧱', x1: 58, x2: 72, bx: 60, dolma: 1 },
    { id: 4, tur: 'kaya', ad: 'Yuvarlanan Kaya', em: '🪨', x1: 75, x2: 97, bx: 84, dolma: 1.3 },
    { id: 5, tur: 'lav', ad: 'Yükselen Lav', em: '🌋', x1: 97, x2: 116, bx: 100, dolma: 1.2 },
    { id: 6, tur: 'kaygan', ad: 'Yağlı Zemin', em: '🛢️', x1: 118, x2: 134, bx: 120, dolma: 1 },
    { id: 7, tur: 'lazer', ad: "Ra'nın Işını", em: '☀️', x1: 136, x2: 156, bx: 146, dolma: 0.8 },
    { id: 8, tur: 'balta', ad: 'Çılgın Baltalar', em: '🪓', x1: 157, x2: 177, bx: 160, dolma: 1 },
    { id: 9, tur: 'cokme', ad: 'Çöken Köprü', em: '🌉', x1: 181, x2: 191, bx: 182, z1: -1.1, z2: 1.1, dolma: 1 },
    { id: 10, tur: 'batan', ad: 'Batan Sallar', em: '🛶', x1: 197, x2: 211.5, bx: 199, dolma: 1 },
    { id: 11, tur: 'alev', ad: 'Anubis Alevi', em: '🔥', x1: 215, x2: 231, bx: 217, dolma: 1 },
  ];
  const TUR_SURE = { diken: 2.7, cokme: 4.1, batan: 6.7, tavan: 4.3, kaya: 2.5, lav: 6.3, kaygan: 6.3, lazer: 3.6, balta: 5, alev: 2.9 };
  const BEKLEME = { kisa: 8, orta: 14, uzun: 22 };
  const dolmaSuresi = (tz, ayar) => Math.max(TUR_SURE[tz.tur] + 1, (BEKLEME[ayar] || 14) * tz.dolma);

  // ---------- Tuzak zamanlamaları (faz = tuzağa basıldıktan beri geçen süre) ----------
  const faz = (akt, id, t) => t - (akt.t[id] ?? -1e9);
  const dikenBoy = f => (f < 0 ? 0 : f < 0.7 ? 0.2 * (f / 0.7) : f < 0.8 ? lerp(0.2, 1, (f - 0.7) / 0.1) : f < 2.4 ? 1 : f < 2.7 ? 1 - (f - 2.4) / 0.3 : 0);
  const dikenOlumcul = f => f > 0.75 && f < 2.45;
  const cokmeAci = f => (f < 0.5 || f > 4.1 ? 0 : f < 0.7 ? (f - 0.5) / 0.2 : f < 3.7 ? 1 : 1 - (f - 3.7) / 0.4);   // 0 kapalı, 1 açık
  const cokmeAcik = f => f > 0.55 && f < 3.95;
  const batanY = f => (f < 0.8 ? 0 : f < 1.3 ? lerp(0, -2.4, (f - 0.8) / 0.5) : f < 4.1 ? -2.4 : f < 4.9 ? lerp(-2.4, 0, (f - 4.1) / 0.8) : 0);
  const batanSalla = f => (f > 0 && f < 0.9 ? Math.sin(f * 70) * 0.06 : 0);
  const tasY = (i, t, akt) => batanY(faz(akt, 2, t) - i * 0.45);
  const TAVAN_UST = 6.5;
  const TAVANLAR = [[58, 62.4], [62.8, 67.2], [67.6, 72]];
  function tavanAlt(f, i) {
    const a = f - i * 0.3;
    if (a < 0.4) return TAVAN_UST;
    if (a < 0.6) { const k = (a - 0.4) / 0.2; return lerp(TAVAN_UST, 0, k * k); }
    if (a < 1.6) return 0;
    if (a < 3.6) return lerp(0, TAVAN_UST, (a - 1.6) / 2);
    return TAVAN_UST;
  }
  function kayaPos(f) {
    if (f < 0 || f > 2.4) return null;
    if (f < 0.7) { const k = f / 0.7; return { x: 97, y: lerp(11, KAYA_R, k * k), z: 0, don: 0 }; }
    const x = 97 - 13 * (f - 0.7);
    if (x < 75) return null;
    return { x, y: KAYA_R, z: 0, don: (97 - x) / KAYA_R };
  }
  const LAV_TABAN = -0.6, LAV_TEPE = 0.85;
  const lavY = f => (f < 0 ? LAV_TABAN : f < 1.6 ? lerp(LAV_TABAN, LAV_TEPE, f / 1.6) : f < 5 ? LAV_TEPE : f < 6.2 ? lerp(LAV_TEPE, LAV_TABAN, (f - 5) / 1.2) : LAV_TABAN);
  const kayganAktif = f => f > 0.2 && f < 6.2;
  const LAZER_N = 3;
  function lazerX(f, j) { const s = 0.5 + j; if (f < s) return null; const x = 156 - 8 * (f - s); return x >= 136 ? x : null; }
  const alevAktif = f => f > 0.8 && f < 2.8;
  const alevUyari = f => f > 0 && f <= 0.8;
  const BALTALAR = [159.5, 164.5, 169.5, 174.5];
  function baltaAci(i, t, akt) {
    const t0 = akt.t[8], n = akt.n[8] || 0;
    const ek = 5 * Math.max(0, n - 1) + (t0 === undefined ? 0 : clamp(t - t0, 0, 5));
    return 0.42 * Math.sin(2.1 * (t + ek) + i * 1.4);
  }
  function baltaUc(i, t, akt, out = {}) {
    const a = baltaAci(i, t, akt);
    out.x = BALTALAR[i]; out.y = BALTA_PIVOT - BALTA_L * Math.cos(a); out.z = BALTA_L * Math.sin(a); out.a = a;
    return out;
  }
  const PLATFORMLAR = [[199.5, 0], [204, 2.1], [208.5, 4.2]];   // x, faz kayması
  function platMerkez(i, t, akt, out = {}) {
    const [x, k] = PLATFORMLAR[i];
    out.x = x; out.z = 2.2 * Math.sin(1.8 * t + k); out.vz = 2.2 * 1.8 * Math.cos(1.8 * t + k);
    out.y = akt ? batanY(faz(akt, 10, t) - i * 0.6) : 0;
    return out;
  }

  // ---------- Harita: duvarlar, zeminler (sabit kutular) ----------
  const KUTULAR = [];
  const K = (x1, x2, y1, y2, z1, z2, m = 'zemin') => { const b = { x1, x2, y1, y2, z1, z2, m }; KUTULAR.push(b); return b; };
  const ZEM = (x1, x2, z1 = -4, z2 = 4, m = 'zemin') => K(x1, x2, -1, 0, z1, z2, m);
  const TASLAR = [[40.5, -1.5], [43.5, 1], [46.5, -1], [49.5, 1.5], [52.5, 0]];
  const TAS_YARI = 1.1;
  const SUTUNLAR = [[99.5, 1.8], [103, -1.8], [106.5, 1.8], [110, -1.8], [113.5, 1.8]];
  const SUTUN_Y = 1.1;
  const NISLER = [79, 86, 93];     // sağ duvardaki kaçış girintileri (2.5 m genişlik)
  const LAV_CUKUR = [{ x1: 39, x2: 55, z1: -4, z2: 4 }, { x1: 118, x2: 134, z1: 2, z2: 4 }, { x1: 197, x2: 211.5, z1: -4, z2: 4 }];
  const CUKURLAR = [{ x1: 24, x2: 34, z1: -4, z2: 4 }, { x1: 177, x2: 195, z1: -4, z2: 4 }];
  (function haritaKur() {
    // başlangıç odası + ilk bölümler
    ZEM(-14, 24);
    ZEM(34, 39);
    TASLAR.forEach(([x, z]) => { /* dinamik (batan taşlar) */ });
    ZEM(55, 118);
    NISLER.forEach(a => ZEM(a, a + 2.5, 4, 6.2));
    SUTUNLAR.forEach(([x, z]) => K(x - 1, x + 1, 0, SUTUN_Y, z - 1, z + 1, 'sutunTas'));
    ZEM(118, 134, -4, 2);
    ZEM(134, 177);
    ZEM(177, 181, -1.1, 1.1); ZEM(191, 195, -1.1, 1.1);
    ZEM(195, 197);
    ZEM(211.5, 249.6);
    // arena (Firavun'un mezar odası)
    ZEM(249.6, 281, -14, 14, 'arenaZemin');
    // sol duvar (galerinin altı) ve sağ duvar (girintiler hariç)
    K(-14, 249, -10, 4.9, -4.6, -4, 'duvar');
    let x0 = -14;
    NISLER.forEach(a => { K(x0, a, -10, 12, 4, 6.8, 'duvar'); K(a, a + 2.5, -10, 12, 6.2, 6.8, 'duvar'); K(a, a + 2.5, 3.2, 12, 4, 6.2, 'duvar'); x0 = a + 2.5; });
    K(x0, 249, -10, 12, 4, 6.8, 'duvar');
    K(-14.6, -14, -10, 13, -8.6, 6.8, 'duvar');                 // arka duvar
    K(-14, 249, 12, 13, -8.6, 6.8, 'tavan');                     // tavan
    // galeri
    K(-14, 246, 4.9, 5.5, -8, -4, 'galeri');
    K(-14, 249, 5.5, 12, -8.6, -8, 'duvar');
    K(-14, 246, 5.5, 12, -4.25, -4.0, 'gorunmez');               // galeri korkuluğu (aşağı atlanmaz)
    K(246, 246.6, 5.5, 12, -8, -4, 'duvar');
    // bekleme salonu kapısı (parmaklık) ve arena duvarları
    K(248.2, 248.8, 0, 7, -4, 4, 'kapi');
    K(249, 249.6, -1, 14, -14.6, -4, 'duvar'); K(249, 249.6, -1, 14, 4, 14.6, 'duvar'); K(249, 249.6, 7, 14, -4, 4, 'duvar');
    K(281, 281.6, -1, 15, -14.6, 14.6, 'duvar');
    K(249, 281.6, -1, 15, -14.6, -14, 'duvar'); K(249, 281.6, -1, 15, 14, 14.6, 'duvar');
    K(249, 281.6, 14, 15, -14.6, 14.6, 'tavan');
    [[256, -7.2], [256, 7.2], [272, -7.2], [272, 7.2]].forEach(([x, z]) => K(x - 0.8, x + 0.8, 0, 14, z - 0.8, z + 0.8, 'sutun'));
  })();

  // ---------- Hareketli kutular ----------
  const DINAMIK = [];
  const D = (x1, x2, kutu, bilgi = {}) => { const d = { x1, x2, kutu, b: {}, ...bilgi }; DINAMIK.push(d); return d; };
  const kopyala = (b, x1, x2, y1, y2, z1, z2, m, vz = 0) => { b.x1 = x1; b.x2 = x2; b.y1 = y1; b.y2 = y2; b.z1 = z1; b.z2 = z2; b.m = m; b.vz = vz; return b; };
  D(0, 0.4, function (t) { return t < 0 ? kopyala(this.b, 0, 0.4, 0, 5, -4, 4, 'kapi') : null; }, { tip: 'basKapi' });
  TUZAKLAR.filter(tz => tz.tur === 'cokme').forEach(tz => {
    const n = Math.round((tz.x2 - tz.x1) / 2);
    for (let i = 0; i < n; i++) {
      const x1 = tz.x1 + i * 2, x2 = x1 + 2;
      D(x1, x2, function (t, akt) { return cokmeAcik(faz(akt, tz.id, t)) ? null : kopyala(this.b, x1, x2, -0.5, 0, tz.z1, tz.z2, 'kapak'); }, { tip: 'kapak', tuzak: tz.id, i, z1: tz.z1, z2: tz.z2 });
    }
  });
  TASLAR.forEach(([x, z], i) => D(x - TAS_YARI, x + TAS_YARI, function (t, akt) {
    const y = tasY(i, t, akt);
    return kopyala(this.b, x - TAS_YARI, x + TAS_YARI, y - 6, y, z - TAS_YARI, z + TAS_YARI, 'tas');
  }, { tip: 'tas', i, x, z }));
  const PM = {};
  PLATFORMLAR.forEach(([x], i) => D(x - 1.5, x + 1.5, function (t, akt) {
    const c = platMerkez(i, t, akt, PM);
    return kopyala(this.b, x - 1.5, x + 1.5, c.y - 0.6, c.y, c.z - 1.5, c.z + 1.5, 'sal', c.vz);
  }, { tip: 'sal', i }));

  // ---------- Kutu sorguları ----------
  const KOVA = 8, kovalar = new Map();
  KUTULAR.forEach(b => { for (let k = Math.floor(b.x1 / KOVA); k <= Math.floor(b.x2 / KOVA); k++) { if (!kovalar.has(k)) kovalar.set(k, []); kovalar.get(k).push(b); } });
  let damga = 0;
  function yakinKutular(x1, x2, t, akt, out = []) {
    out.length = 0; damga++;
    for (let k = Math.floor(x1 / KOVA); k <= Math.floor(x2 / KOVA); k++) {
      const l = kovalar.get(k); if (!l) continue;
      for (const b of l) if (b._d !== damga) { b._d = damga; out.push(b); }
    }
    for (const d of DINAMIK) if (d.x2 > x1 && d.x1 < x2) { const b = d.kutu(t, akt); if (b) out.push(b); }
    return out;
  }
  const TMP = [], TMP2 = [];
  // (x,z) noktasında, yUst'ten aşağıdaki en yüksek zemin
  function zeminY(x, z, yUst, t, akt) {
    let en = -Infinity;
    for (const b of yakinKutular(x - 0.5, x + 0.5, t, akt, TMP2)) {
      if (b.m === 'gorunmez') continue;
      if (x >= b.x1 && x <= b.x2 && z >= b.z1 && z <= b.z2 && b.y2 <= yUst + 0.05 && b.y2 > en) en = b.y2;
    }
    return en;
  }
  // Kamera için ışın: a'dan b'ye ilk çarpma oranı (0..1)
  function isinKes(ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    let en = 1;
    for (const b of yakinKutular(Math.min(ax, bx) - 1, Math.max(ax, bx) + 1, 0, { t: {}, n: {} }, TMP2)) {
      if (b.m === 'gorunmez' || b.m === 'kapi' || b.m === 'kapak' || b.m === 'tas' || b.m === 'sal') continue;
      let t0 = 0, t1 = en;
      const eks = [[ax, dx, b.x1, b.x2], [ay, dy, b.y1, b.y2], [az, dz, b.z1, b.z2]];
      let ok = true;
      for (const [o, d, mn, mx] of eks) {
        if (Math.abs(d) < 1e-9) { if (o < mn || o > mx) { ok = false; break; } continue; }
        let ta = (mn - o) / d, tb = (mx - o) / d; if (ta > tb) { const s = ta; ta = tb; tb = s; }
        if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) { ok = false; break; }
      }
      if (ok && t0 < en && t0 > 0) en = t0;
    }
    return en;
  }

  // ---------- Ölüm kontrolü ----------
  const BU = {};
  function olumKontrol(p, t, akt) {
    const { x, y, z } = p;
    if (y < -2.5) return 'dustu';
    for (const L of LAV_CUKUR) if (x > L.x1 && x < L.x2 && z > L.z1 && z < L.z2 && y < LAV_Y + 0.5) return 'lav';
    if (y > 4.6 || x > 236) return null;
    if (x > 7 - R && x < 15 + R && y < 0.7 && dikenOlumcul(faz(akt, 0, t))) return 'diken';
    if (x > 57 && x < 73) {
      const f = faz(akt, 3, t);
      for (let i = 0; i < 3; i++) {
        const [a, b] = TAVANLAR[i]; if (x + R < a || x - R > b) continue;
        const k = f - i * 0.3;
        if (k > 0.4 && k < 1.65 && tavanAlt(f, i) < y + BOY - 0.1) return 'tavan';
      }
    }
    if (x > 70 && x < 102) {
      const k = kayaPos(faz(akt, 4, t));
      if (k) { const cy = clamp(k.y, y + R, y + BOY - R); const d = Math.hypot(x - k.x, cy - k.y, z - k.z); if (d < KAYA_R + R - 0.05) return 'kaya'; }
    }
    if (x > 97 && x < 116 && y < lavY(faz(akt, 5, t)) - 0.02) return 'lav';
    if (x > 135 && x < 157 && y < 0.55) {
      const f = faz(akt, 7, t);
      for (let j = 0; j < LAZER_N; j++) { const lx = lazerX(f, j); if (lx !== null && Math.abs(x - lx) < R + 0.12) return 'lazer'; }
    }
    if (x > 157 && x < 177) {
      for (let i = 0; i < BALTALAR.length; i++) {
        if (Math.abs(x - BALTALAR[i]) > 1.6) continue;
        const u = baltaUc(i, t, akt, BU);
        // bıçak: uçtan pivota doğru 1 m'lik parça; iki noktayla yoklanır
        for (let s = 0; s <= 1; s += 0.5) {
          const px = u.x, py = u.y + Math.cos(u.a) * s, pz = u.z - Math.sin(u.a) * s;
          const cy = clamp(py, y + 0.2, y + BOY - 0.2);
          if (Math.hypot(x - px, cy - py, z - pz) < 0.72 + R) return 'balta';
        }
      }
    }
    if (x > 215 - R && x < 231 + R && y < 2.6 && alevAktif(faz(akt, 11, t))) return 'alev';
    return null;
  }
  function zeminEtkisi(p, t, akt) {
    if (p.x > 118 && p.x < 134 && p.y < 0.3 && kayganAktif(faz(akt, 6, t))) return { kaygan: true, itme: 4.5 };
    return null;
  }

  // ---------- Fizik ----------
  function yeniGovde(x, y, z, yaw = 0, rol = 'kosucu') {
    return { x, y, z, vx: 0, vy: 0, vz: 0, yaw, yerde: false, havaT: 0, uzerinde: null, rol };
  }
  let igDamga = 0;
  function eksen(p, kutular, e, d, yerde) {
    if (e !== 'y' && !d) return;
    p[e] += d;
    for (const b of kutular) {
      if (b._ig === igDamga) continue;
      if (b.m === 'gorunmez' && p.rol !== 'firavun' && p.y < 4) continue;
      if (!(p.x + R > b.x1 && p.x - R < b.x2 && p.y + BOY > b.y1 && p.y < b.y2 && p.z + R > b.z1 && p.z - R < b.z2)) continue;
      if (e === 'y') {
        if (d <= 0) { p.y = b.y2; p.vy = 0; p.yerde = true; p.uzerinde = b; }
        else { p.y = b.y1 - BOY - 0.001; p.vy = Math.min(0, p.vy); }
      } else {
        if (yerde && b.y2 - p.y <= 0.45 && b.y2 - p.y > 0) { p.y = b.y2; continue; }   // küçük basamağa çık
        if (e === 'x') { p.x = d > 0 ? b.x1 - R - 0.001 : b.x2 + R + 0.001; p.vx = 0; }
        else { p.z = d > 0 ? b.z1 - R - 0.001 : b.z2 + R + 0.001; p.vz = 0; }
      }
    }
  }
  // g: { ileri, yan (-1..1), zipla, yaw }  → olay listesi döner
  function adim(p, g, t, dt, akt) {
    const ol = [];
    const hiz = p.rol === 'firavun' ? FIR_HIZ : HIZ;
    const fx = Math.cos(g.yaw), fz = Math.sin(g.yaw);
    let ix = fx * (g.ileri || 0) - fz * (g.yan || 0), iz = fz * (g.ileri || 0) + fx * (g.yan || 0);
    const l = Math.hypot(ix, iz); if (l > 1) { ix /= l; iz /= l; }
    const ze = p.yerde ? zeminEtkisi(p, t, akt) : null;
    p.kaygan = !!ze;
    const yatayHiz = Math.hypot(p.vx, p.vz);
    const ziplayacak = g.zipla && (p.yerde || p.havaT < 0.1) && p.vy <= 0.5;
    if (p.yerde && !(ziplayacak && yatayHiz > hiz)) {
      // yerde: istenen hıza hızla yaklaş (sürtünme). Bunnyhop: yere değdiği an zıplarsa sürtünme yok, hız korunur.
      const a = Math.min(1, (ze ? 1.0 : 14) * dt);
      p.vx += (ix * hiz - p.vx) * a; p.vz += (iz * hiz - p.vz) * a;
    } else if (!p.yerde) {
      // havada (CS tarzı): istenen yöne, o yöndeki hız küçük bir sınırı geçmeyecek kadar ivme eklenir.
      // Havada yana basıp fareyle o yöne dönünce hız birikir (bunnyhop). Normal hızın altındayken eski kolay hava kontrolü de var.
      const il = Math.hypot(ix, iz);
      if (il > 0.01) {
        const wx = ix / il, wz = iz / il, simdiki = p.vx * wx + p.vz * wz;
        const ekle = Math.min(BHOP_SINIR * il - simdiki, BHOP_IVME * hiz * il * dt);
        if (ekle > 0) { p.vx += wx * ekle; p.vz += wz * ekle; }
      }
      if (yatayHiz <= hiz + 0.05 && Math.abs(g.ileri || 0) > 0.1) { const a = Math.min(1, 3.5 * dt); p.vx += (ix * hiz - p.vx) * a; p.vz += (iz * hiz - p.vz) * a; }
      const yeni = Math.hypot(p.vx, p.vz), azami = hiz * BHOP_AZAMI;
      if (yeni > azami) { p.vx *= azami / yeni; p.vz *= azami / yeni; }
    }
    if (ze) p.vz += ze.itme * dt;
    if (p.yerde) p.havaT = 0; else p.havaT += dt;
    if (g.zipla && (p.yerde || p.havaT < 0.1) && p.vy <= 0.5) { p.vy = ZIPLA; p.yerde = false; p.havaT = 1; ol.push({ tip: 'zipla' }); }
    p.vy = Math.max(-30, p.vy - G * dt);
    if (p.yerde && p.uzerinde && p.uzerinde.vz) p.z += p.uzerinde.vz * dt;
    const kutular = yakinKutular(p.x - 3, p.x + 3, t, akt, TMP);
    // içine girdiğimiz kutu (yükselen taş vb.) bizi yukarı iter; derinse yok sayılır
    igDamga++;
    for (const b of kutular) {
      if (b.m === 'gorunmez') continue;
      if (p.x + R > b.x1 && p.x - R < b.x2 && p.y + BOY > b.y1 && p.y < b.y2 && p.z + R > b.z1 && p.z - R < b.z2) {
        if (b.y2 - p.y < 0.7) { p.y = b.y2; if (p.vy < 0) p.vy = 0; } else b._ig = igDamga;
      }
    }
    const eskiYerde = p.yerde, vyOnce = p.vy;
    p.yerde = false; p.uzerinde = null;
    eksen(p, kutular, 'x', p.vx * dt, eskiYerde);
    eksen(p, kutular, 'z', p.vz * dt, eskiYerde);
    eksen(p, kutular, 'y', p.vy * dt, eskiYerde);
    if (p.yerde && !eskiYerde && vyOnce < -5) ol.push({ tip: 'indi', guc: -vyOnce });
    if (Math.hypot(ix, iz) > 0.1) p.yaw = Math.atan2(iz, ix);
    return ol;
  }

  // ---------- Botlar ----------
  // Koşucu botların yolu: düğümler (x, z) ya da hareketli sal (plat)
  const YOL = [
    [-3, 0], [6, 0], [16, 0], [24, 0], [34, 0], [38.7, 0],
    ...TASLAR.map(([x, z]) => ({ x, z, y: 0, tas: true })),
    [56, 0], [58, 0], [72, 0], [75, 0], [97.5, 0],
    ...SUTUNLAR.map(([x, z]) => ({ x, z, y: SUTUN_Y })),
    [117, -2.4], [134, -2.4], [136, 0], [156, 0], [157.5, 0], [162, 0], [167, 0], [172, 0], [177.3, 0],
    [181, 0], [191, 0], [195.5, 0], [196.7, 0],
    { plat: 0 }, { plat: 1 }, { plat: 2 },
    [212.3, 0], [215, 0], [231, 0], [VARIS_X + 2, 0],
  ].map(n => (Array.isArray(n) ? { x: n[0], z: n[1] } : n));
  const PMB = {};
  function dugumPos(n, t, akt) { if (n.plat !== undefined) { const c = platMerkez(n.plat, t, akt, PMB); return { x: c.x, z: c.z, y: c.y, plat: n.plat }; } return n; }
  const sahte = { x: 0, y: 0, z: 0 };
  function noktaTehlike(x, y, z, t, akt) { sahte.x = x; sahte.y = y; sahte.z = z; return olumKontrol(sahte, t, akt); }
  // düz yürürsem önümüzdeki ~1 sn güvenli mi?
  function yolGuvenli(p, dx, dz, maxD, hiz, t, akt) {
    for (const tau of [0, 0.15, 0.3, 0.5, 0.7, 0.95]) {
      const d = Math.min(hiz * tau, maxD + 0.4);
      const x = p.x + dx * d, z = p.z + dz * d;
      let y = zeminY(x, z, p.y + 0.6, t + tau, akt);
      if (y === -Infinity || y < p.y - 1.4) y = p.y;   // boşluk: atlama mantığı karar verir
      if (noktaTehlike(x, y, z, t + tau, akt)) return false;
    }
    return true;
  }
  function burasiGuvenli(p, t, akt, sure = 1.2) {
    for (let tau = 0; tau <= sure; tau += 0.2) {
      let y = p.yerde ? zeminY(p.x, p.z, p.y + 0.3, t + tau, akt) : p.y;
      if (y === -Infinity) y = p.y - 3;
      if (noktaTehlike(p.x, y, p.z, t + tau, akt)) return false;
    }
    return true;
  }
  // zıplarsam güvenli bir yere konar mıyım?
  function atlamaGuvenli(p, dx, dz, vh, t, akt) {
    for (let tau = 0.1; tau <= 1.3; tau += 0.05) {
      const y = p.y + ZIPLA * tau - G * tau * tau / 2, vy = ZIPLA - G * tau;
      const x = p.x + dx * vh * tau, z = p.z + dz * vh * tau;
      if (noktaTehlike(x, Math.max(y, -0.5), z, t + tau, akt) && y < 4) return false;
      if (vy < 0) {
        const zy = zeminY(x, z, y + 0.3, t + tau, akt);
        if (zy > -Infinity && y <= zy + 0.05 && zy > p.y - 1.3) return !noktaTehlike(x, zy, z, t + tau + 0.2, akt);
      }
      if (y < p.y - 1.3) return false;
    }
    return false;
  }
  function engelOnde(p, dx, dz, t, akt) {
    const x = p.x + dx * 0.75, z = p.z + dz * 0.75;
    for (const b of yakinKutular(x - 0.5, x + 0.5, t, akt, TMP2)) {
      if (b.m === 'gorunmez') continue;
      if (x > b.x1 && x < b.x2 && z > b.z1 && z < b.z2 && b.y2 > p.y + 0.45 && b.y1 < p.y + 1.3 && b.y2 <= p.y + 1.35) return true;
    }
    return false;
  }
  function aktGecikmeli(akt, sinir) {
    const o = { t: {}, n: akt.n };
    for (const k in akt.t) if (akt.t[k] <= sinir) o.t[k] = akt.t[k];
    return o;
  }
  function yeniKosucuBot(zorluk, no) {
    const Z = { kolay: { hata: 0.3, hiz: 0.86, tepki: 0.55 }, orta: { hata: 0.12, hiz: 0.95, tepki: 0.32 }, zor: { hata: 0.04, hiz: 1, tepki: 0.16 } }[zorluk] || { hata: 0.12, hiz: 0.95, tepki: 0.3 };
    return { i: 0, ...Z, hiz: Z.hiz * (0.92 + Math.random() * 0.08), no, kontrol: true, kararT: 0, nis: null, atlaHiz: null, yanSap: (Math.random() - 0.5) * 1.6, durT: Math.random() * 2.5, bekledi: {}, bekleBas: null, sabir: 0 };
  }
  // ek: { f: Firavun'un gövdesi, hazir: id => tuzak dolu mu }
  function botKosucu(b, p, t, aktGercek, ek) {
    const akt = aktGecikmeli(aktGercek, t - b.tepki);
    const g = { ileri: 0, yan: 0, zipla: false, yaw: p.yaw };
    if (t < b.durT) { if (t > -1.2) { g.ileri = 0.35; g.yaw = 0; } return g; }
    const hiz = HIZ * b.hiz;
    // Taktik: önümüzdeki tuzak doluysa ve Firavun düğmesinin başındaysa girişte biraz bekle (Firavun uzaklaşsın)
    if (ek && ek.f && p.yerde) {
      // tuzak şu an çalışıyorsa bitmesini bekle, sonra koş (dolması sürer)
      const calisan = TUZAKLAR.find(z => z.x1 - p.x > 0.3 && z.x1 - p.x < 4.5 && z.tur !== 'balta' && z.tur !== 'lazer' && faz(aktGercek, z.id, t - b.tepki * 0.5) < TUR_SURE[z.tur] + 0.1);
      if (calisan && b.kontrol) return g;
      const tz = TUZAKLAR.find(z => z.x1 - p.x > 0.5 && z.x1 - p.x < 4 && !b.bekledi[z.id]);
      if (tz && ek.hazir(tz.id) && Math.abs(ek.f.x - tz.bx) < 7 && ek.f.y > 4) {
        if (b.bekleBas === null) { b.bekleBas = t; b.sabir = 1.5 + Math.random() * 6; }
        if (t - b.bekleBas < b.sabir) return g;
        b.bekledi[tz.id] = true; b.bekleBas = null;
      } else if (b.bekleBas !== null) { if (tz) b.bekledi[tz.id] = true; b.bekleBas = null; }
    }
    if (t > b.kararT) { b.kararT = t + 0.5; b.kontrol = Math.random() > b.hata; }
    // düğüm ilerlet
    for (let s = 0; s < 3 && b.i < YOL.length - 1; s++) {
      const n = YOL[b.i], np = dugumPos(n, t, aktGercek);
      const d = Math.hypot(np.x - p.x, np.z - p.z);
      let vardi = d < 0.9;
      if (n.y !== undefined) vardi = d < (n.tas ? 1.0 : 0.85) && p.yerde && Math.abs(p.y - n.y) < 0.3;
      if (n.plat !== undefined) vardi = p.yerde && p.uzerinde && p.uzerinde.m === 'sal' && Math.abs(p.uzerinde.x1 + 1.5 - np.x) < 0.1;
      // geride kalan düğümleri atla (ör. itildiyse)
      const sonraki = YOL[b.i + 1];
      if (!vardi && sonraki && sonraki.x !== undefined && n.y === undefined && n.plat === undefined && p.x > n.x + 0.5 && Math.abs(p.z - n.z) < 3) vardi = true;
      if (!vardi) break;
      b.i++;
    }
    let hedef = dugumPos(YOL[b.i], t + (YOL[b.i].plat !== undefined ? 0.5 : 0), aktGercek);
    let hx = hedef.x, hz = hedef.z + (YOL[b.i].y === undefined && YOL[b.i].plat === undefined ? b.yanSap * 0.5 : 0);
    // yuvarlanan kaya: girintiye kaç
    const fk = faz(akt, 4, t);
    if (fk >= 0 && fk < 2.5 && p.x > 72.5 && p.x < 98) {
      const kx = f => { const k = kayaPos(f); return k ? k.x : (f < 0.7 ? 97 : 0); };
      if (b.nis === null) {
        b.nis = -1;
        let enIyi = 1e9;
        NISLER.forEach((a, i) => {
          const ax = a + 1.25, tr = Math.hypot(ax - p.x, 5 - p.z) / hiz + 0.25;
          let ta = 9; for (let tau = 0; tau < 3; tau += 0.05) { if (kx(fk + tau) - KAYA_R - 0.6 < ax + 1.25 && fk + tau > 0.7) { ta = tau; break; } }
          if (tr < ta && tr < enIyi) { enIyi = tr; b.nis = i; }
        });
      }
      if (b.nis >= 0) { hx = NISLER[b.nis] + 1.25; hz = 5.4; }
      else if (p.x < 79) { hx = 73; hz = 0; }
    } else b.nis = null;
    let dx = hx - p.x, dz = hz - p.z;
    const dist = Math.hypot(dx, dz) || 1;
    dx /= dist; dz /= dist;
    const nisteBekle = b.nis >= 0 && b.nis !== null && dist < 0.6;
    if (nisteBekle) return g;
    // yağlı zemin: kenara doğru itiliyor, karşı koy
    if (zeminEtkisi(p, t, akt)) { dz -= 0.9; const l = Math.hypot(dx, dz); dx /= l; dz /= l; }
    let ileri = 1;
    if (b.kontrol && b.nis === null) {
      if (!yolGuvenli(p, dx, dz, dist, hiz, t, akt)) {
        if (burasiGuvenli(p, t, akt)) ileri = 0;
        else {
          // geri kaç: bir önceki düğüme
          const onceki = YOL[Math.max(0, b.i - 1)], op = dugumPos(onceki, t, aktGercek);
          let bx = op.x - p.x, bz = op.z - p.z; const bl = Math.hypot(bx, bz) || 1; bx /= bl; bz /= bl;
          if (yolGuvenli(p, bx, bz, bl, hiz, t, akt)) { dx = bx; dz = bz; }
        }
      }
    }
    // zıplama: önde boşluk ya da basamak
    if (p.yerde && ileri > 0) {
      const ax = p.x + dx * 0.85, az = p.z + dz * 0.85;
      const zy = zeminY(ax, az, p.y + 0.5, t, aktGercek);
      if (zy < p.y - 1.4) {
        const sonrakiDugum = YOL[b.i];
        const hp = sonrakiDugum.plat !== undefined ? dugumPos(sonrakiDugum, t + 0.65, aktGercek) : hedef;
        const hd = Math.hypot(hp.x - p.x, hp.z - p.z);
        let jx = (hp.x - p.x) / (hd || 1), jz = (hp.z - p.z) / (hd || 1);
        const vh = clamp(hd / 0.68, 2.5, hiz);
        if (!b.kontrol || atlamaGuvenli(p, jx, jz, vh, t, aktGercek)) { g.zipla = true; b.atlaHiz = vh; dx = jx; dz = jz; }
        else ileri = 0;
      } else if (engelOnde(p, dx, dz, t, aktGercek)) g.zipla = true;
    }
    if (!p.yerde && b.atlaHiz) ileri = b.atlaHiz / hiz; else if (p.yerde && !g.zipla) b.atlaHiz = null;
    if (g.zipla && b.atlaHiz) ileri = b.atlaHiz / hiz;
    g.ileri = ileri * b.hiz; g.yaw = Math.atan2(dz, dx);
    return g;
  }

  // Firavun bot: koşucuların en kalabalık olduğu tuzağa koşar, doğru anda basar
  function yeniFiravunBot(zorluk) {
    const Z = { kolay: { tepki: [0.55, 1.2], kacir: 0.35 }, orta: { tepki: [0.3, 0.75], kacir: 0.2 }, zor: { tepki: [0.12, 0.35], kacir: 0.05 } }[zorluk] || { tepki: [0.3, 0.75], kacir: 0.2 };
    return { ...Z, hedef: null, basT: null, basId: null };
  }
  function tuzakSkoru(tz, kosucular, t, akt) {
    let n = 0;
    for (const k of kosucular) {
      const w = { diken: 0.5, cokme: 0.35, batan: 0.8, tavan: 0.55, kaya: 1.2, lav: 0.9, kaygan: 0.6, lazer: 0.8, balta: 0, alev: 0.7 }[tz.tur];
      const px = k.x + Math.max(0, k.vx || 0) * w * 0.8;
      if (tz.tur === 'kaya') { if (k.x > 76 && k.x < 97 && k.z < 4) n += k.x > 90 ? 0.6 : 1; continue; }
      if (tz.tur === 'lav') { if (px > 97.5 && px < 115.5 && k.y < 0.6) n++; continue; }
      if (tz.tur === 'batan') { if (k.x > tz.x1 + 0.5 && k.x < tz.x2 - 0.5 && k.y > -0.3) n++; continue; }
      if (tz.tur === 'cokme') { if (px > tz.x1 + 0.4 && px < tz.x2 - 0.4 && k.y < 1) n++; continue; }
      if (tz.tur === 'lazer') { if (k.x > 137 && k.x < 154) n += 0.7; continue; }
      if (tz.tur === 'balta') { if (k.x > 156 && k.x < 175) n += 0.6; continue; }
      if (px > tz.x1 + 0.6 && px < tz.x2 - 0.4) n++;
    }
    return n;
  }
  function botFiravun(b, p, t, akt, kosucular, hazir) {
    const g = { ileri: 0, yan: 0, zipla: false, yaw: p.yaw };
    let bas = null;
    if (t < 0) return { g, bas };
    // hedef tuzak seç
    let enIyi = null, enSkor = -1;
    TUZAKLAR.forEach(tz => {
      if (!hazir(tz.id)) return;
      let s = 0;
      kosucular.forEach(k => { if (k.x > tz.x1 - 28 && k.x < tz.x2) s += 1 - Math.max(0, tz.x1 - k.x) / 40; });
      if (s > enSkor + 0.3 || (Math.abs(s - enSkor) <= 0.3 && enIyi && tz.x1 < enIyi.x1 && s > 0)) { enSkor = s; enIyi = tz; }
    });
    b.hedef = enIyi;
    const hx = enIyi ? enIyi.bx : (kosucular[0] ? kosucular[0].x : p.x);
    const dx = hx - p.x;
    if (Math.abs(dx) > 0.6) { g.ileri = Math.min(1, Math.abs(dx) / 2); g.yaw = dx > 0 ? 0 : Math.PI; }
    const dz = GALERI_Z - p.z; if (Math.abs(dz) > 0.3) g.yan = clamp(dz, -1, 1) * (dx > 0 ? 1 : -1) * 0.5;
    // basma kararı
    if (b.basId !== null) {
      if (t >= b.basT) { bas = b.basId; b.basId = null; }
    } else {
      for (const tz of TUZAKLAR) {
        if (!hazir(tz.id) || Math.abs(p.x - tz.bx) > 3.5) continue;
        if (tuzakSkoru(tz, kosucular, t, akt) >= 1) {
          if (Math.random() < b.kacir * 0.05) continue;
          b.basId = tz.id; b.basT = t + b.tepki[0] + Math.random() * (b.tepki[1] - b.tepki[0]);
          break;
        }
      }
    }
    return { g, bas };
  }
  // Düello botu: rakibe yaklaş, yanlara kay, menzildeyken asayı savur
  function botDuello(b, p, rakip, t) {
    const g = { ileri: 0, yan: 0, zipla: false, yaw: p.yaw };
    const dx = rakip.x - p.x, dz = rakip.z - p.z, d = Math.hypot(dx, dz);
    g.yaw = Math.atan2(dz, dx);
    b.duS = b.duS ?? Math.random() * 10;
    g.ileri = d > 1.7 ? 1 : d < 1.1 ? -0.6 : 0;
    g.yan = Math.sin(t * 1.7 + b.duS) * 0.8;
    if (Math.random() < 0.008) g.zipla = true;
    const vur = d < 2.3 && Math.random() < 0.12;
    return { g, vur };
  }

  return {
    R, BOY, HIZ, FIR_HIZ, G, ZIPLA, GALERI_Y, GALERI_Z, VARIS_X, LAV_Y, KAYA_R, BALTA_PIVOT, BALTA_L, DUELLO, ARENA,
    TUZAKLAR, TUR_SURE, dolmaSuresi, KUTULAR, DINAMIK, TASLAR, TAS_YARI, SUTUNLAR, SUTUN_Y, NISLER, LAV_CUKUR, CUKURLAR, TAVANLAR, TAVAN_UST,
    BALTALAR, PLATFORMLAR, LAZER_N, LAV_TABAN, LAV_TEPE, YOL,
    faz, dikenBoy, cokmeAci, cokmeAcik, batanY, batanSalla, tasY, tavanAlt, kayaPos, lavY, kayganAktif, lazerX, alevAktif, alevUyari, baltaAci, baltaUc, platMerkez,
    yakinKutular, zeminY, isinKes, olumKontrol, zeminEtkisi, yeniGovde, adim,
    yeniKosucuBot, botKosucu, yeniFiravunBot, botFiravun, botDuello, clamp, lerp,
    bosAkt: () => ({ t: {}, n: {} }),
  };
})();
if (typeof module !== 'undefined') module.exports = Dunya;
