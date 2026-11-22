// =============================================================
// Firarun - oyun motoru. Sadece oda sahibinde (ya da tek kişilik oyunda) çalışır.
// Tur: herkes başlangıç odasında → kapı açılır → koşucular parkuru geçmeye çalışır,
// Firavun galeriden düğmelere basar → sona varan Firavun'la düelloya girer.
// Bütün koşucular ölürse ya da süre biterse Firavun kazanır; düelloda Firavun ölürse koşucular kazanır.
// Firavun her turda sırayla değişir. Botları da burası sürer. Node'da araclar/test-motor.js ile denenir.
// =============================================================

const Motor = (() => {
  const D = typeof Dunya !== 'undefined' ? Dunya : require('./dunya.js');
  const GERI_SAYIM = 5, TUR_SONU_SURE = 7, DUELLO_HAZIR = 2.5, CAN = 100, HASAR = 25, SALLA_BEKLE = 0.7, SALLA_VURUS = 0.25;
  let M = null, cikisFn = null, sayac = null;
  const yay = m => cikisFn && cikisFn.herkese(m);
  const aktifler = () => M.oyuncular.filter(o => !o.cikti);
  const yuvarla = v => Math.round(v * 100) / 100;

  function baslat(oyuncular, ayar, cikis) {
    durdur();
    cikisFn = cikis;
    const sira = oyuncular.map((o, no) => no);
    for (let i = sira.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [sira[i], sira[j]] = [sira[j], sira[i]]; }
    M = {
      ayar, oyuncular: oyuncular.map((o, no) => ({ ...o, no, puan: 0, cikti: false })),
      sira, tur: 0, toplamTur: oyuncular.length * (ayar.kez || 1),
      faz: 'bos', t: 0, fazBitis: 0, firavun: null, govde: {}, bot: {}, olu: {}, vardi: {}, kuyruk: [], duello: null,
      akt: D.bosAkt(), hazirT: {}, sonDurum: 0, istat: {}, firavunCan: CAN, firavunGaleri: null, sonGelen: {},
    };
    yay({ tip: 'basla', oyuncular: M.oyuncular.map(o => ({ no: o.no, id: o.id, ad: o.ad, bot: !!o.bot, renk: o.renk })), ayar, toplamTur: M.toplamTur });
    turBaslat();
    if (!cikis.elle) sayac = setInterval(() => tik(1 / 30), 1000 / 30);
  }
  function durdur() { clearInterval(sayac); sayac = null; M = null; }
  const puanlar = () => Object.fromEntries(M.oyuncular.map(o => [o.no, o.puan]));

  // ---------- Tur ----------
  function turBaslat() {
    M.tur++;
    // sıradaki Firavun (çıkanlar atlanır)
    let fno = null;
    for (let k = 0; k < M.sira.length; k++) { const no = M.sira[(M.tur - 1 + k) % M.sira.length]; if (!M.oyuncular[no].cikti) { fno = no; break; } }
    M.firavun = fno;
    M.faz = 'kosu'; M.t = -GERI_SAYIM;
    M.akt = D.bosAkt(); M.hazirT = {}; M.olu = {}; M.vardi = {}; M.kuyruk = []; M.duello = null; M.firavunCan = CAN; M.firavunGaleri = null;
    M.istat = { oldurme: 0, nedenler: {} }; M.bitti = false;
    M.govde = {}; M.bot = {};
    const yerler = {};
    const kosucular = aktifler().filter(o => o.no !== fno);
    kosucular.forEach((o, i) => {
      const sx = -11 + (i % 4) * 2.6, sz = -2.7 + Math.floor(i / 4) * 2.7 + (Math.random() - 0.5) * 0.4;
      yerler[o.no] = [sx, 0, sz, 0];
    });
    yerler[fno] = [-8, D.GALERI_Y, D.GALERI_Z, 0];
    aktifler().forEach(o => {
      const [x, y, z, yaw] = yerler[o.no];
      M.govde[o.no] = D.yeniGovde(x, y, z, yaw, o.no === fno ? 'firavun' : 'kosucu');
      if (o.bot) M.bot[o.no] = o.no === fno ? D.yeniFiravunBot(M.ayar.botZorluk) : D.yeniKosucuBot(M.ayar.botZorluk, o.no);
    });
    yay({ tip: 'tur', tur: M.tur, toplamTur: M.toplamTur, firavun: fno, yerler, t: M.t, sure: M.ayar.sure, puan: puanlar(), bekleme: M.ayar.bekleme });
  }

  const hazir = id => M.t >= (M.hazirT[id] ?? -1e9);
  function tuzakBas(no, id) {
    if (M.faz !== 'kosu' || M.bitti || no !== M.firavun || M.t < 0 || M.duello) return;
    const tz = D.TUZAKLAR[id]; if (!tz || !hazir(id)) return;
    const g = M.govde[no]; if (!g || Math.abs(g.x - tz.bx) > 4.5) return;
    M.akt.t[id] = M.t; M.akt.n[id] = (M.akt.n[id] || 0) + 1;
    M.hazirT[id] = M.t + D.dolmaSuresi(tz, M.ayar.bekleme);
    yay({ tip: 'tuzak', id, t0: yuvarla(M.t), n: M.akt.n[id], hazir: yuvarla(M.hazirT[id]) });
  }

  function olum(no, neden) {
    if (M.olu[no] || no === M.firavun || M.bitti) return;
    const g = M.govde[no];
    M.olu[no] = neden;
    M.istat.nedenler[neden] = (M.istat.nedenler[neden] || 0) + 1;
    const f = M.oyuncular[M.firavun];
    if (neden !== 'cikti' && f && !f.cikti) { f.puan += 1; M.istat.oldurme++; }
    M.kuyruk = M.kuyruk.filter(k => k !== no);
    yay({ tip: 'oldu', no, neden, x: g ? yuvarla(g.x) : 0, y: g ? yuvarla(g.y) : 0, z: g ? yuvarla(g.z) : 0, puan: puanlar() });
    const kalan = aktifler().filter(o => o.no !== M.firavun && !M.olu[o.no]);
    if (!kalan.length) turBitti('firavun', 'hepsi');
  }
  function vardi(no) {
    if (M.vardi[no] || M.olu[no] || no === M.firavun || M.bitti) return;
    M.vardi[no] = M.t;
    M.oyuncular[no].puan += 1;
    M.kuyruk.push(no);
    yay({ tip: 'vardi', no, sira: Object.keys(M.vardi).length, puan: puanlar() });
    if (!M.duello) M.duelloBekle = M.t + 1.2;
  }

  // ---------- Düello ----------
  function duelloBasla() {
    const k = M.kuyruk.shift();
    if (k === undefined || M.bitti) return;
    const f = M.govde[M.firavun];
    if (!M.firavunGaleri) M.firavunGaleri = { x: f.x, y: f.y, z: f.z };
    M.duello = { k, kCan: CAN, basT: M.t + DUELLO_HAZIR, salla: {}, bekleyen: [] };
    const [kx, ky, kz, ky2] = D.DUELLO.k, [fx, fy, fz, fy2] = D.DUELLO.f;
    Object.assign(M.govde[k], { x: kx, y: ky, z: kz, vx: 0, vy: 0, vz: 0, yaw: ky2 });
    Object.assign(f, { x: fx, y: fy, z: fz, vx: 0, vy: 0, vz: 0, yaw: fy2 });
    M.sonGelen[k] = M.sonGelen[M.firavun] = 'isinlandi';
    yay({ tip: 'duello', k, f: M.firavun, kp: D.DUELLO.k, fp: D.DUELLO.f, kCan: CAN, fCan: M.firavunCan, hazir: DUELLO_HAZIR });
  }
  function salla(no) {
    const d = M.duello;
    if (!d || M.bitti || M.t < d.basT || (no !== d.k && no !== M.firavun)) return;
    if (M.t - (d.salla[no] ?? -9) < SALLA_BEKLE) return;
    d.salla[no] = M.t;
    d.bekleyen.push({ no, t: M.t + SALLA_VURUS });
    yay({ tip: 'salla', no });
  }
  function vurusDegerlendir(no) {
    const d = M.duello; if (!d) return;
    const hedef = no === d.k ? M.firavun : d.k;
    const a = M.govde[no], h = M.govde[hedef]; if (!a || !h) return;
    const dx = h.x - a.x, dz = h.z - a.z, dist = Math.hypot(dx, dz);
    let aci = Math.abs(Math.atan2(dz, dx) - a.yaw); while (aci > Math.PI) aci = Math.abs(aci - 2 * Math.PI);
    if (dist > 2.6 || aci > 1.35 || Math.abs(h.y - a.y) > 1.8) return;
    let can;
    if (hedef === M.firavun) can = M.firavunCan = Math.max(0, M.firavunCan - HASAR);
    else can = d.kCan = Math.max(0, d.kCan - HASAR);
    const kx = dx / (dist || 1), kz = dz / (dist || 1);
    if (M.bot[hedef]) { h.vx += kx * 9; h.vz += kz * 9; h.vy = 4; h.yerde = false; }
    yay({ tip: 'vurus', no, hedef, can, kx: yuvarla(kx), kz: yuvarla(kz) });
    if (can > 0) return;
    if (hedef === M.firavun) {
      M.oyuncular[no].puan += 3;
      turBitti('kosucu', 'duello', no);
    } else {
      M.duello = null;
      olum(hedef, 'duello');
      if (M.bitti) return;
      if (M.kuyruk.length) M.duelloBekle = M.t + 2;
      else { // Firavun galeriye döner
        const fg = M.firavunGaleri; M.firavunGaleri = null;
        Object.assign(M.govde[M.firavun], { x: fg.x, y: fg.y, z: fg.z, vx: 0, vy: 0, vz: 0 });
        M.sonGelen[M.firavun] = 'isinlandi';
        yay({ tip: 'donus', f: M.firavun, p: [yuvarla(fg.x), yuvarla(fg.y), yuvarla(fg.z)] });
      }
    }
  }

  function turBitti(kazanan, neden, kahraman) {
    if (M.bitti) return;
    M.bitti = true;
    const f = M.oyuncular[M.firavun];
    if (kazanan === 'kosucu' && neden !== 'firavunCikti') aktifler().forEach(o => { if (o.no !== M.firavun) o.puan += 2; });
    if (kazanan === 'firavun' && f && !f.cikti) f.puan += 3;
    M.faz = 'turSonu'; M.fazBitis = M.t + TUR_SONU_SURE;
    const son = M.tur >= M.toplamTur || aktifler().length < 2;
    yay({ tip: 'turSonu', kazanan, neden, kahraman, firavun: M.firavun, puan: puanlar(), oldurme: M.istat.oldurme, vardi: Object.keys(M.vardi).map(Number), olu: M.olu, son, kalan: TUR_SONU_SURE });
    M.sonMu = son;
  }
  function oyunSonu() {
    M.faz = 'son';
    const sira = aktifler().map(o => o.no).sort((a, b) => M.oyuncular[b].puan - M.oyuncular[a].puan);
    yay({ tip: 'son', puan: puanlar(), sira });
    clearInterval(sayac); sayac = null;
  }

  // ---------- Girdiler ----------
  function girdi(id, m) {
    if (!M) return;
    const o = M.oyuncular.find(x => x.id === id && !x.bot); if (!o) return;
    const no = o.no;
    switch (m.tip) {
      case 'ben': {
        const g = M.govde[no]; if (!g || !Array.isArray(m.d)) return;
        if (M.sonGelen[no] === 'isinlandi') {
          // ışınlandıktan sonra eski yerden gelen konumları yok say
          if (Math.abs(m.d[0] - g.x) > 20) return;
          M.sonGelen[no] = null;
        }
        [g.x, g.y, g.z, g.yaw] = m.d; g.anim = m.d[4] || 0; g.vx = m.d[5] || 0; g.vz = m.d[6] || 0;
        g.yerde = !!(g.anim & 1);
        break;
      }
      case 'bas': tuzakBas(no, m.id | 0); break;
      case 'oldum': if (M.faz === 'kosu') olum(no, String(m.neden || 'dustu').slice(0, 12)); break;
      case 'vardim': { const g = M.govde[no]; if (g && g.x > D.VARIS_X - 3) vardi(no); break; }
      case 'vur': salla(no); break;
    }
  }
  function cikis(id) {
    if (!M) return;
    const o = M.oyuncular.find(x => x.id === id && !x.bot); if (!o || o.cikti) return;
    o.cikti = true;
    yay({ tip: 'cikti', no: o.no });
    if (M.faz !== 'kosu' || M.bitti) return;
    if (o.no === M.firavun) turBitti('kosucu', 'firavunCikti');
    else {
      if (M.duello && M.duello.k === o.no) { M.duello = null; M.duelloBekle = M.t + 1; }
      if (!M.olu[o.no]) olum(o.no, 'cikti');
    }
  }

  // ---------- Zaman ----------
  function tik(dt) {
    if (!M) return;
    M.t += dt;
    if (M.faz === 'turSonu') {
      if (M.t >= M.fazBitis) { if (M.sonMu) oyunSonu(); else turBaslat(); }
      return;
    }
    if (M.faz !== 'kosu') return;
    const kosucular = aktifler().filter(o => o.no !== M.firavun && !M.olu[o.no] && !M.vardi[o.no]).map(o => M.govde[o.no]).filter(Boolean);
    // botlar
    const n = 2, h = dt / n;
    for (const no in M.bot) {
      const g = M.govde[no], b = M.bot[no], ono = +no;
      if (!g || M.olu[ono] || M.oyuncular[ono].cikti) continue;
      const duelloda = M.duello && (ono === M.duello.k || ono === M.firavun);
      for (let s = 0; s < n; s++) {
        const ts = M.t - dt + h * (s + 1);
        let gi;
        if (duelloda) {
          const rakip = M.govde[ono === M.firavun ? M.duello.k : M.firavun];
          if (M.t < M.duello.basT || !rakip) gi = { ileri: 0, yan: 0, yaw: g.yaw };
          else { const r = D.botDuello(b, g, rakip, ts); gi = r.g; if (r.vur && s === 0) salla(ono); }
        } else if (ono === M.firavun) {
          if (M.duello) gi = { ileri: 0, yan: 0, yaw: g.yaw };
          else { const r = D.botFiravun(b, g, ts, M.akt, kosucular, hazir); gi = r.g; if (r.bas !== null && s === 0) tuzakBas(ono, r.bas); }
        } else if (M.vardi[ono]) {
          gi = { ileri: g.x < 246.5 ? 0.4 : 0, yan: Math.sin(M.t + ono) * 0.3, yaw: 0 };
        } else gi = D.botKosucu(b, g, ts, M.akt, { f: M.duello ? null : M.govde[M.firavun], hazir });
        const ol = D.adim(g, gi, ts, h, M.akt);
        g.anim = (g.yerde ? 1 : 0) | (Math.hypot(g.vx, g.vz) > 1 ? 2 : 0);
        if (ono !== M.firavun && !duelloda) {
          const neden = D.olumKontrol(g, ts, M.akt);
          if (neden) { olum(ono, neden); break; }
        }
        if (ono === M.firavun && duelloda && g.y < -2) g.y = 0;
        if (M.bitti) return;
      }
      if (ono !== M.firavun && !M.olu[ono] && g.x > D.VARIS_X) vardi(ono);
      if (M.bitti) return;
    }
    // düello
    if (!M.duello && M.kuyruk.length && M.t >= (M.duelloBekle ?? 0)) duelloBasla();
    if (M.duello) {
      const d = M.duello;
      d.bekleyen = d.bekleyen.filter(v => { if (M.t >= v.t) { vurusDegerlendir(v.no); return false; } return true; });
      if (M.bitti) return;
    }
    if (M.t > M.ayar.sure && !M.duello) { turBitti('firavun', 'sure'); return; }
    if (M.t > M.ayar.sure + 60) { turBitti('firavun', 'sure'); return; }
    // durum yayını
    if (M.t - M.sonDurum >= 1 / 15) {
      M.sonDurum = M.t;
      const l = [];
      aktifler().forEach(o => {
        const g = M.govde[o.no]; if (!g || M.olu[o.no]) return;
        l.push([o.no, yuvarla(g.x), yuvarla(g.y), yuvarla(g.z), Math.round(g.yaw * 100) / 100, g.anim | 0, Math.round((g.vx || 0) * 10) / 10, Math.round((g.vz || 0) * 10) / 10]);
      });
      yay({ tip: 'd', t: yuvarla(M.t), l, fCan: M.firavunCan, kCan: M.duello ? M.duello.kCan : null });
    }
  }

  return {
    baslat, durdur, tik, girdi, cikis,
    get durum() { return M; },
  };
})();
if (typeof module !== 'undefined') module.exports = Motor;
