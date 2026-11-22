// =============================================================
// Firarun - oyun motoru. Sadece oda sahibinde (ya da tek kişilik oyunda) çalışır.
// Tur: herkes başlangıç odasında → kapı açılır → koşucular parkuru geçmeye çalışır,
// Firavun galeriden düğmelere basar → sona varan Firavun'la düelloya girer.
// Bütün koşucular ölürse ya da süre biterse Firavun kazanır; düelloda Firavun ölürse koşucular kazanır.
// Firavun her turda sırayla değişir. Botları da burası sürer. Node'da araclar/test-motor.js ile denenir.
// =============================================================

const Motor = (() => {
  const D = typeof Dunya !== 'undefined' ? Dunya : require('./dunya.js');
  const GERI_SAYIM = 5, DOGUS_SURE = 3, TUR_SONU_SURE = 7, DUELLO_HAZIR = 2.5, CAN = 100;
  const S = D.SILAH;
  let M = null, cikisFn = null, sayac = null, isci = null;
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
      akt: D.bosAkt(), hazirT: {}, sonDurum: 0, istat: {}, firavunCan: CAN, firavunGaleri: null, isin: {},
    };
    yay({ tip: 'basla', oyuncular: M.oyuncular.map(o => ({ no: o.no, id: o.id, ad: o.ad, bot: !!o.bot, renk: o.renk })), ayar, toplamTur: M.toplamTur });
    turBaslat();
    // gerçek saate göre ilerle (zamanlayıcı gecikse de oyun saati oyuncularınkiyle aynı kalsın)
    if (!cikis.elle) {
      let son = Date.now();
      const adimla = () => { const simdi = Date.now(), dt = Math.min(0.5, (simdi - son) / 1000); son = simdi; if (dt <= 0) return; for (let k = Math.ceil(dt / 0.05), i = 0; i < k; i++) tik(dt / k); };
      // sekme arka plandayken tarayıcı normal zamanlayıcıları yavaşlatır (botlar donmuş görünür); Worker zamanlayıcısı yavaşlamaz
      try {
        const url = URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 33);'], { type: 'text/javascript' }));
        isci = new Worker(url); URL.revokeObjectURL(url);
        isci.onmessage = adimla;
      } catch (e) { isci = null; sayac = setInterval(adimla, 1000 / 30); }
    }
  }
  function durdur() { clearInterval(sayac); sayac = null; if (isci) { isci.terminate(); isci = null; } M = null; }
  const puanlar = () => Object.fromEntries(M.oyuncular.map(o => [o.no, o.puan]));

  // ---------- Tur ----------
  function turBaslat() {
    if (aktifler().length < 2) { oyunSonu(); return; }   // tur sonu ekranında oyuncular ayrıldıysa
    M.tur++;
    // sıradaki Firavun (çıkanlar atlanır)
    let fno = null;
    for (let k = 0; k < M.sira.length; k++) { const no = M.sira[(M.tur - 1 + k) % M.sira.length]; if (!M.oyuncular[no].cikti) { fno = no; break; } }
    M.firavun = fno;
    M.faz = 'kosu'; M.t = -GERI_SAYIM;
    M.akt = D.bosAkt(); M.hazirT = {}; M.olu = {}; M.vardi = {}; M.kuyruk = []; M.duello = null; M.firavunCan = CAN; M.firavunGaleri = null;
    M.istat = { oldurme: 0, nedenler: {} }; M.bitti = false; M.dogus = {}; M.olumSay = {}; M.vardiPuan = {};
    M.govde = {}; M.bot = {};
    M.sonDurum = -Infinity;   // yeni turda saat -5'ten başlar: sıfırlanmazsa 'd' yayını eski turun süresi geçene kadar kesiliyordu (botlar donmuş görünüyordu)
    M.isin = {};
    const yerler = {};
    const kosucular = aktifler().filter(o => o.no !== fno);
    kosucular.forEach((o, i) => { yerler[o.no] = baslangicYeri(i); });
    yerler[fno] = [-8, D.GALERI_Y, D.GALERI_Z, 0];
    aktifler().forEach(o => {
      const [x, y, z, yaw] = yerler[o.no];
      M.govde[o.no] = D.yeniGovde(x, y, z, yaw, o.no === fno ? 'firavun' : 'kosucu');
      isinla(o.no, x, z);
      if (o.bot) M.bot[o.no] = o.no === fno ? D.yeniFiravunBot(M.ayar.botZorluk) : D.yeniKosucuBot(M.ayar.botZorluk, o.no);
    });
    yay({ tip: 'tur', tur: M.tur, toplamTur: M.toplamTur, firavun: fno, yerler, t: M.t, sure: M.ayar.sure, puan: puanlar(), bekleme: M.ayar.bekleme });
  }

  // ışınlanan oyuncunun eski yerden yoldaki konum mesajları, yeni yere yakın bir konum gelene kadar yok sayılır
  function isinla(no, x, z) { M.isin[no] = [x, z]; }
  function baslangicYeri(i) { return [-9 + (i % 4) * 2.2, 0, -2.7 + Math.floor(i / 4) * 2.7 + (Math.random() - 0.5) * 0.4, 0]; }
  const bastanDogar = () => M.ayar.dogma === 'bastan';
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
    M.olumSay[no] = (M.olumSay[no] || 0) + 1;
    if (bastanDogar() && neden !== 'cikti') { M.dogus[no] = M.t + DOGUS_SURE; delete M.vardi[no]; }
    M.istat.nedenler[neden] = (M.istat.nedenler[neden] || 0) + 1;
    const f = M.oyuncular[M.firavun];
    if (neden !== 'cikti' && f && !f.cikti) { f.puan += 1; M.istat.oldurme++; }
    M.kuyruk = M.kuyruk.filter(k => k !== no);
    yay({ tip: 'oldu', no, neden, x: g ? yuvarla(g.x) : 0, y: g ? yuvarla(g.y) : 0, z: g ? yuvarla(g.z) : 0, puan: puanlar(), dogus: M.dogus[no] !== undefined ? DOGUS_SURE : null });
    // baştan doğma modunda tur, süre bitene ya da Firavun ölene kadar sürer (koşucu kalmadıysa biter)
    if (bastanDogar() && aktifler().some(o => o.no !== M.firavun)) return;
    const kalan = aktifler().filter(o => o.no !== M.firavun && !M.olu[o.no]);
    if (!kalan.length) turBitti('firavun', 'hepsi');
  }
  function vardi(no) {
    if (M.vardi[no] || M.olu[no] || no === M.firavun || M.bitti) return;
    M.vardi[no] = M.t;
    if (!M.vardiPuan[no]) { M.vardiPuan[no] = true; M.oyuncular[no].puan += 1; }   // sona varma puanı turda bir kez
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
    M.duello = { k, kCan: CAN, basT: M.t + DUELLO_HAZIR, atesT: {} };
    const [kx, ky, kz, ky2] = D.DUELLO.k, [fx, fy, fz, fy2] = D.DUELLO.f;
    Object.assign(M.govde[k], { x: kx, y: ky, z: kz, vx: 0, vy: 0, vz: 0, yaw: ky2 });
    Object.assign(f, { x: fx, y: fy, z: fz, vx: 0, vy: 0, vz: 0, yaw: fy2 });
    isinla(k, kx, kz); isinla(M.firavun, fx, fz);
    yay({ tip: 'duello', k, f: M.firavun, kp: D.DUELLO.k, fp: D.DUELLO.f, kCan: CAN, fCan: M.firavunCan, hazir: DUELLO_HAZIR });
  }
  // Deagle atışı. Oyuncu kendi ekranında gördüğüne göre isabeti hesaplar (v: {o:[x,y,z], s:[x,y,z], h, k});
  // ev kabaca doğrular. Bot atışını ev hesaplar.
  function ates(no, v) {
    const d = M.duello;
    if (!d || M.bitti || M.t < d.basT || (no !== d.k && no !== M.firavun)) return;
    if (M.t - (d.atesT[no] ?? -9) < S.bekle - 0.12) return;
    d.atesT[no] = M.t;
    const hedef = no === d.k ? M.firavun : d.k;
    const a = M.govde[no], h = M.govde[hedef]; if (!a || !h) return;
    let o, son, vurdu = false, kafa = false;
    if (M.bot[no]) {
      o = [a.x + Math.cos(a.yaw) * 0.3, a.y + (no === M.firavun ? 1.75 : 1.5), a.z + Math.sin(a.yaw) * 0.3];
      const sek = D.hedefSekli(h, hedef === M.firavun);
      vurdu = Math.random() < D.botIsabet(M.ayar.botZorluk, a, h);
      kafa = vurdu && Math.random() < 0.12;
      let hx = h.x, hy = h.y + (kafa ? sek.kafaY : sek.ust * 0.65), hz = h.z;
      if (!vurdu) { const yx = -(hz - o[2]), yz = hx - o[0], yl = Math.hypot(yx, yz) || 1, sap = (0.7 + Math.random() * 0.9) * (Math.random() < 0.5 ? 1 : -1); hx += yx / yl * sap; hz += yz / yl * sap; hy += (Math.random() - 0.3) * 1.2; }
      const dx = hx - o[0], dy = hy - o[1], dz = hz - o[2], l = Math.hypot(dx, dy, dz) || 1;
      if (vurdu && !D.atesIsabet(o[0], o[1], o[2], dx / l, dy / l, dz / l, h, hedef === M.firavun)) vurdu = kafa = false;   // arada sütun var
      const duvar = D.isinKes(o[0], o[1], o[2], o[0] + dx / l * S.menzil, o[1] + dy / l * S.menzil, o[2] + dz / l * S.menzil) * S.menzil;
      const uz = vurdu ? l : Math.min(duvar, S.menzil);
      son = [o[0] + dx / l * uz, o[1] + dy / l * uz, o[2] + dz / l * uz];
    } else {
      if (!Array.isArray(v.o) || !Array.isArray(v.s) || v.o.length !== 3 || v.s.length !== 3 || ![...v.o, ...v.s].every(Number.isFinite)) return;
      o = v.o; son = v.s;
      if (Math.hypot(o[0] - a.x, o[2] - a.z) > 4) return;
      if (v.h === hedef) {
        // gecikme payı: evdeki hedef, vurulan noktaya 3 m'den yakın olmalı
        if (Math.hypot(son[0] - h.x, son[2] - h.z) < 3 && son[1] > h.y - 1 && son[1] < h.y + 3.2) { vurdu = true; kafa = !!v.k; }
      }
    }
    let can = null;
    if (vurdu) {
      const hasar = kafa ? S.kafa : S.govde;
      if (hedef === M.firavun) can = M.firavunCan = Math.max(0, M.firavunCan - hasar);
      else can = d.kCan = Math.max(0, d.kCan - hasar);
      if (M.bot[hedef]) { const dx = h.x - a.x, dz = h.z - a.z, l = Math.hypot(dx, dz) || 1; h.vx += dx / l * 2.5; h.vz += dz / l * 2.5; }
    }
    yay({ tip: 'ates', no, o: o.map(yuvarla), s: son.map(yuvarla), h: vurdu ? hedef : -1, k: kafa ? 1 : 0, can });
    if (!vurdu || can > 0) return;
    sonuclandir(no, hedef);
  }
  function sonuclandir(no, hedef) {
    if (hedef === M.firavun) {
      M.oyuncular[no].puan += 3;
      turBitti('kosucu', 'duello', no);
    } else {
      duelloKapat();
      olum(hedef, 'duello');
      if (M.bitti) return;
      if (M.kuyruk.length) M.duelloBekle = M.t + 2;
      else firavunDon();
    }
  }
  // düello bitti (koşucu öldü ya da çıktı): istemciler düello ekranını kapatsın
  function duelloKapat() { M.duello = null; yay({ tip: 'duelloBitti' }); }
  // Firavun galeriye döner
  function firavunDon() {
    const fg = M.firavunGaleri; if (!fg) return;
    M.firavunGaleri = null;
    const g = M.govde[M.firavun]; if (!g) return;
    Object.assign(g, { x: fg.x, y: fg.y, z: fg.z, vx: 0, vy: 0, vz: 0 });
    isinla(M.firavun, fg.x, fg.z);
    yay({ tip: 'donus', f: M.firavun, p: [yuvarla(fg.x), yuvarla(fg.y), yuvarla(fg.z)] });
  }

  function dogur(no) {
    delete M.dogus[no]; delete M.olu[no];
    const i = Object.keys(M.govde).indexOf(String(no));
    const [x, y, z, yaw] = baslangicYeri(Math.max(0, i) % 8);
    M.govde[no] = D.yeniGovde(x, y, z, yaw, 'kosucu');
    if (M.bot[no]) { M.bot[no] = D.yeniKosucuBot(M.ayar.botZorluk, no); M.bot[no].durT = M.t + 0.3; }
    isinla(no, x, z);
    yay({ tip: 'dogdu', no, p: [yuvarla(x), y, yuvarla(z), yaw] });
  }

  function turBitti(kazanan, neden, kahraman) {
    if (M.bitti) return;
    M.bitti = true;
    const f = M.oyuncular[M.firavun];
    if (kazanan === 'kosucu' && neden !== 'firavunCikti') aktifler().forEach(o => { if (o.no !== M.firavun) o.puan += 2; });
    if (kazanan === 'firavun' && f && !f.cikti) f.puan += 3;
    M.faz = 'turSonu'; M.fazBitis = M.t + TUR_SONU_SURE;
    const son = M.tur >= M.toplamTur || aktifler().length < 2;
    yay({ tip: 'turSonu', kazanan, neden, kahraman, firavun: M.firavun, puan: puanlar(), oldurme: M.istat.oldurme, vardi: Object.keys(M.vardiPuan).map(Number), olu: M.olu, olumSay: M.olumSay, son, kalan: TUR_SONU_SURE });
    M.sonMu = son;
  }
  function oyunSonu() {
    M.faz = 'son';
    const sira = aktifler().map(o => o.no).sort((a, b) => M.oyuncular[b].puan - M.oyuncular[a].puan);
    yay({ tip: 'son', puan: puanlar(), sira });
    clearInterval(sayac); sayac = null;
    if (isci) { isci.terminate(); isci = null; }
  }

  // ---------- Girdiler ----------
  function girdi(id, m) {
    if (!M) return;
    const o = M.oyuncular.find(x => x.id === id && !x.bot); if (!o) return;
    const no = o.no;
    switch (m.tip) {
      case 'ben': {
        const g = M.govde[no]; if (!g || !Array.isArray(m.d) || m.d.length < 4 || !m.d.slice(0, 4).every(Number.isFinite)) return;
        const is = M.isin[no];
        if (is) {
          // ışınlandıktan sonra eski yerden gelen konumları yok say (yeni yere yakın konum gelene kadar)
          if (Math.hypot(m.d[0] - is[0], m.d[2] - is[1]) > 6) return;
          delete M.isin[no];
        }
        [g.x, g.y, g.z, g.yaw] = m.d; g.anim = m.d[4] || 0; g.vx = m.d[5] || 0; g.vz = m.d[6] || 0;
        g.yerde = !!(g.anim & 1);
        break;
      }
      case 'bas': tuzakBas(no, m.id | 0); break;
      case 'oldum': if (M.faz === 'kosu') olum(no, String(m.neden || 'dustu').slice(0, 12)); break;
      case 'vardim': {
        // 'vardim' son 'ben'den önce gelebilir (çok hızlı bunnyhop): mesajdaki x'e de bak
        const g = M.govde[no]; if (!g || M.isin[no]) break;
        if (Number.isFinite(m.x) && m.x > g.x && Math.abs(m.x - g.x) < 15) g.x = m.x;
        if (g.x > D.VARIS_X - 3) vardi(no);
        break;
      }
      case 'ates': ates(no, m); break;
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
      if (M.duello && M.duello.k === o.no) { duelloKapat(); M.duelloBekle = M.t + 1; }
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
          else { const r = D.botDuello(b, g, rakip, ts); gi = r.g; if (r.ates) { ates(ono); if (!M.duello || M.bitti) break; } }
        } else if (ono === M.firavun) {
          if (M.duello) gi = { ileri: 0, yan: 0, yaw: g.yaw };
          else { const r = D.botFiravun(b, g, ts, M.akt, kosucular, hazir); gi = r.g; if (r.bas !== null && s === 0) tuzakBas(ono, r.bas); }
        } else if (M.vardi[ono]) {
          gi = { ileri: g.x < 246.5 ? 0.4 : 0, yan: Math.sin(M.t + ono) * 0.3, yaw: 0 };
        } else gi = D.botKosucu(b, g, ts, M.akt, { f: M.duello ? null : M.govde[M.firavun], hazir });
        const ol = D.adim(g, gi, ts, h, M.akt);
        if (duelloda) g.yaw = gi.yaw;   // yana kaçarken de yüzü (ve tabancası) rakibe dönük
        if (duelloda && M.duello) D.govdeIt(g, M.govde[ono === M.firavun ? M.duello.k : M.firavun], ts, M.akt);
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
    // baştan doğma
    for (const no in M.dogus) if (M.t >= M.dogus[no] && !M.oyuncular[no].cikti) dogur(+no);
    // düello
    if (!M.duello && M.kuyruk.length && M.t >= (M.duelloBekle ?? 0)) duelloBasla();
    // sıradaki koşucu çıktıysa/öldüyse Firavun arenada kalmasın
    if (!M.duello && !M.kuyruk.length && M.firavunGaleri && M.t >= (M.duelloBekle ?? 0)) firavunDon();
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
