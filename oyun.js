// =============================================================
// Firarun - oyuncu tarafı: menüler, bekleme odası, kontroller, kamera, ekran yazıları.
// Herkes kendi karakterini kendi bilgisayarında yürütür ve konumunu oda sahibine gönderir;
// tuzakları, botları, ölümleri ve düelloyu oda sahibindeki motor yönetir (motor.js).
// =============================================================

const Oyun = (() => {
  const SURUM = 5;   // sw.js ONBELLEK numarasıyla aynı tut; oyuncular farklı sürümdeyse uyarı çıkar
  const $ = id => document.getElementById(id);
  const D = Dunya;
  const dokun = matchMedia('(pointer: coarse)').matches;
  if (dokun) document.body.classList.add('dokun');
  $('surumYazi').textContent = 'Sürüm ' + SURUM;
  const kacis = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  const renkHex = no => hex(Sahne.RENKLER[no % Sahne.RENKLER.length]);
  const BOT_ADLARI = ['Skarabe', 'Mumyacık', 'Kum Kedisi', 'Papirüs', 'Kobra', 'Sfenks', 'Lotus', 'Hurma', 'Deve', 'Nil'];
  const AZAMI = 10;
  const NEDEN = { diken: '🦂 dikenlere takıldı', dustu: '🕳️ boşluğa düştü', lav: '🌋 lava düştü', tavan: '🧱 tavanın altında ezildi', kaya: '🪨 kayanın altında kaldı', lazer: "☀️ Ra'nın ışınına yakalandı", balta: '🪓 baltaya çarptı', alev: '🔥 Anubis alevinde yandı', duello: '⚔️ düelloda yenildi', cikti: '🚪 oyundan çıktı' };

  Sahne.kur($('sahne'));
  let mod = null;   // 'yerel' | 'ev' | 'misafir'
  const ayarVarsayilan = () => ({ kez: 1, sure: 180, bekleme: 'orta', botZorluk: 'orta' });
  let lobi = { ayar: ayarVarsayilan(), botlar: [] };
  try { const k = JSON.parse(localStorage.getItem('ft.ayar') || 'null'); if (k) lobi.ayar = { ...lobi.ayar, ...k }; } catch (e) { }
  let O = null;   // oyun durumu
  let adim = '';
  const kam = { yaw: 0, pitch: 0.25, birinci: false };
  try { kam.birinci = localStorage.getItem('ft.birinci') === '1'; } catch (e) { }

  // ---------- Giriş ----------
  try { $('adim').value = localStorage.getItem('ft.ad') || ''; } catch (e) { }
  function adAl() {
    const ad = $('adim').value.trim().slice(0, 14);
    if (!ad) { $('girisDurum').textContent = 'Önce adını yaz.'; $('adim').focus(); return null; }
    try { localStorage.setItem('ft.ad', ad); } catch (e) { }
    Ses.baslat(); adim = ad;
    return ad;
  }
  $('botlaBtn').onclick = () => {
    if (!adAl()) return;
    Ag.kapat(); mod = 'yerel';
    if (!lobi.botlar.length) for (let i = 0; i < 5; i++) botEkle(true);
    ekranGoster('lobi'); lobiCiz(); mikCiz();
  };
  $('odaKurBtn').onclick = () => { const ad = adAl(); if (!ad) return; mod = 'ev'; lobi.botlar = []; $('girisDurum').textContent = 'Oda açılıyor…'; Ag.odaAc(ad); };
  $('katilBtn').onclick = () => {
    const ad = adAl(); if (!ad) return;
    const kod = $('odaKoduGir').value.trim().toUpperCase();
    if (kod.length < 5) { $('girisDurum').textContent = 'Oda kodunu yaz (5 harf).'; return; }
    mod = 'misafir'; $('girisDurum').textContent = 'Bağlanılıyor…'; Ag.katil(kod, ad);
  };
  $('odaKoduGir').addEventListener('keydown', e => { if (e.key === 'Enter') $('katilBtn').click(); });
  function ekranGoster(ad) {
    ['giris', 'lobi', 'turSonu', 'sonuc'].forEach(e => $(e).classList.toggle('gizli', e !== ad));
    $('hud').classList.toggle('gizli', !['hud', 'turSonu', 'sonuc'].includes(ad));
    if (ad !== 'hud' && document.pointerLockElement) document.exitPointerLock?.();
  }

  // ---------- Ağ ----------
  const benimId = () => (mod === 'yerel' ? 'ben' : Ag.benimId);
  const insanlar = () => (mod === 'yerel' ? [{ id: 'ben', ad: adim }] : Ag.oyuncular);
  const tumOyuncular = () => [...insanlar().map(o => ({ id: o.id, ad: o.ad, ses: o.ses })), ...lobi.botlar.map(b => ({ ...b, bot: true }))];
  const yonetici = () => mod === 'ev' || mod === 'yerel';
  function yay(m) { if (mod === 'yerel') mesaj(m); else Ag.yayinla(m); }
  function eve(m) { if (mod === 'yerel') Motor.girdi('ben', m); else Ag.eveGonder(m); }
  const motorCikis = { herkese: m => yay(m) };
  Ag.kabulKurali(n => {
    if (O && !O.bitti) return 'Oyun başladı; bitince tekrar dene.';
    if (n + lobi.botlar.length >= AZAMI) return `Oda dolu (en fazla ${AZAMI} kişi).`;
    return true;
  });
  Ag.on('oda', ({ kod }) => { $('lobiKod').textContent = kod; ekranGoster('lobi'); lobiYay(); lobiCiz(); mikCiz(); });
  Ag.on('hata', m => { $('girisDurum').textContent = m; $('lobiDurum').textContent = m; });
  Ag.on('oyuncular', () => { if (mod === 'ev') { while (Ag.oyuncular.length + lobi.botlar.length > AZAMI && lobi.botlar.length) lobi.botlar.pop(); lobiYay(); } lobiCiz(); });
  Ag.on('mesaj', m => mesaj(m));
  Ag.on('evMesaj', (m, id) => { if (O && !O.bitti) Motor.girdi(id, m); });
  Ag.on('koptu', o => { if (mod === 'ev' && O && !O.bitti) Motor.cikis(o.id); });
  Ag.on('evKoptu', () => menuyeDon('Oda sahibiyle bağlantı koptu.'));

  // ---------- Bekleme odası ----------
  const SECIMLER = [['secKez', 'kez', Number], ['secSure', 'sure', Number], ['secBekleme', 'bekleme', String], ['secZorluk', 'botZorluk', String]];
  function botEkle(sessiz) {
    if (tumOyuncular().length >= AZAMI) { if (!sessiz) $('lobiDurum').textContent = `En fazla ${AZAMI} oyuncu.`; return; }
    const kullanilan = new Set(lobi.botlar.map(b => b.ad));
    const ad = BOT_ADLARI.find(a => !kullanilan.has(a)) || 'Bot';
    lobi.botlar.push({ id: 'bot-' + Math.random().toString(36).slice(2, 7), ad });
    if (!sessiz) lobiDegisti();
  }
  $('botEkleBtn').onclick = () => { if (yonetici()) botEkle(); };
  function lobiYay() { if (mod === 'ev') Ag.yayinla({ tip: 'lobi', lobi, surum: SURUM }); }
  function lobiDegisti() { try { localStorage.setItem('ft.ayar', JSON.stringify(lobi.ayar)); } catch (e) { } if (mod === 'ev') lobiYay(); lobiCiz(); }
  function lobiCiz() {
    const L = tumOyuncular();
    $('lobiBaslik').textContent = mod === 'yerel' ? '🤖 Botlarla oyun' : 'Bekleme odası';
    $('odaBilgi').classList.toggle('gizli', mod === 'yerel');
    $('lobiMikBtn').classList.toggle('gizli', mod === 'yerel');
    $('lobiListe').innerHTML = L.map((p, i) => `<li style="--r:${renkHex(i)}"><span>${p.id === benimId() ? '⭐ ' : ''}${p.bot ? '🤖 ' : ''}${kacis(p.ad)}${p.ses ? ' 🎤' : ''}</span><span>${p.bot && yonetici() ? `<button data-sil="${p.id}">✖</button>` : ''}</span></li>`).join('');
    $('lobiListe').querySelectorAll('[data-sil]').forEach(b => { b.onclick = () => { lobi.botlar = lobi.botlar.filter(x => x.id !== b.dataset.sil); lobiDegisti(); }; });
    SECIMLER.forEach(([el, k]) => $(el).querySelectorAll('button').forEach(b => { b.classList.toggle('secili', b.dataset.v === String(lobi.ayar[k])); b.disabled = !yonetici(); }));
    $('satirZorluk').classList.toggle('gizli', !lobi.botlar.length);
    $('botEkleBtn').classList.toggle('gizli', !yonetici() || L.length >= AZAMI);
    const a = lobi.ayar;
    $('ayarOzet').textContent = `${L.length} oyuncu · ${L.length * a.kez} tur · her tur ${a.sure / 60} dk`;
    $('baslaBtn').classList.toggle('gizli', !yonetici());
    if (yonetici()) $('lobiDurum').textContent = L.length < 2 ? (mod === 'yerel' ? 'En az 1 bot ekle.' : 'En az 2 oyuncu gerekli. Oda kodunu gönder ya da bot ekle.') : 'Hazır olunca oyunu başlat.';
    else if (!/Sürümün/.test($('lobiDurum').textContent)) $('lobiDurum').textContent = 'Oda sahibi oyunu başlatacak…';
  }
  SECIMLER.forEach(([el, k, f]) => $(el).querySelectorAll('button').forEach(b => { b.onclick = () => { if (!yonetici()) return; lobi.ayar[k] = f(b.dataset.v); Ses.tik(); lobiDegisti(); }; }));
  $('kodKopyalaBtn').onclick = () => { navigator.clipboard?.writeText(Ag.kod).then(() => { $('lobiDurum').textContent = 'Kod kopyalandı.'; }).catch(() => {}); };
  $('lobiCikBtn').onclick = () => menuyeDon('');
  $('lobiMikBtn').onclick = mikDegistir;
  $('baslaBtn').onclick = baslat;
  function baslat() {
    if (!yonetici()) return;
    const L = tumOyuncular();
    if (L.length < 2) { if (O) { oyunTemizle(); ekranGoster('lobi'); lobiCiz(); } $('lobiDurum').textContent = 'En az 2 oyuncu gerekli (bot ekleyebilirsin).'; return; }
    Ses.baslat();
    Motor.baslat(L.map((p, i) => ({ id: p.id, ad: p.ad, bot: !!p.bot, renk: i })), { ...lobi.ayar }, motorCikis);
  }
  function menuyeDon(neden) {
    Motor.durdur();
    Ag.kapat();
    oyunTemizle();
    mod = null;
    ekranGoster('giris');
    $('girisDurum').textContent = neden || '';
    mikCiz();
  }
  $('lobiyeBtn').onclick = () => {
    if (mod === 'ev') { Motor.durdur(); Ag.yayinla({ tip: 'lobiyeDon' }); }
    else { if (mod === 'yerel') Motor.durdur(); oyunTemizle(); ekranGoster('lobi'); lobiCiz(); }
  };
  $('tekrarBtn').onclick = () => { if (yonetici()) baslat(); };
  $('cikBtn').onclick = () => { if (document.pointerLockElement) document.exitPointerLock(); if (confirm('Oyundan çıkılsın mı?')) menuyeDon(''); };
  $('sesBtn').onclick = () => { const a = Ses.degistir(); $('sesBtn').textContent = a ? '🔊' : '🔇'; };
  $('sesBtn').textContent = Ses.acik ? '🔊' : '🔇';
  $('mikBtn').onclick = mikDegistir;
  $('kameraBtn').onclick = kameraDegistir;
  async function mikDegistir() {
    if (mod === 'yerel' || !mod) return;
    if (Ag.sesAcik) Ag.sesKapat(); else if (!(await Ag.sesAc())) { akis('🎤 Mikrofona izin verilmedi.', 'kotu'); $('lobiDurum').textContent = 'Mikrofona izin verilmedi.'; }
    mikCiz();
  }
  function mikCiz() {
    const a = Ag.sesAcik;
    $('lobiMikBtn').textContent = a ? '🎤 Mikrofon açık' : '🎤 Mikrofon kapalı';
    $('mikBtn').classList.toggle('acik', a); $('mikBtn').classList.toggle('kapali', !a);
    $('mikBtn').classList.toggle('gizli', mod === 'yerel');
  }
  function kameraDegistir() { kam.birinci = !kam.birinci; try { localStorage.setItem('ft.birinci', kam.birinci ? '1' : '0'); } catch (e) { } akis(kam.birinci ? '👁️ Birinci şahıs' : '🎥 Üçüncü şahıs'); }

  // ---------- Küçük yardımcılar ----------
  function akis(yazi, tur) {
    const d = document.createElement('div'); d.textContent = yazi; if (tur) d.className = tur;
    $('akis').prepend(d);
    while ($('akis').children.length > 5) $('akis').lastChild.remove();
    setTimeout(() => d.remove(), 6000);
  }
  let buyukZaman = null;
  function buyuk(yazi, alt, sure = 1600) {
    $('buyukYazi').innerHTML = kacis(yazi) + (alt ? `<small>${kacis(alt)}</small>` : '');
    $('buyukYazi').classList.add('goster');
    clearTimeout(buyukZaman); buyukZaman = setTimeout(() => $('buyukYazi').classList.remove('goster'), sure);
  }
  const ad = no => O?.oyuncular[no]?.ad || '?';
  // kameraya uzaklığa göre ses gücü
  function sesGucu(x, y, z) { const c = Sahne.camera.position; const d = Math.hypot(c.x - x, c.y - y, c.z - z); return Math.max(0.06, Math.min(1, 1.15 - d / 45)); }

  // ---------- Oyun kurulumu ----------
  function oyunTemizle() {
    if (O) O.govdeler.forEach(c => { Sahne.karakterSil(c.K); Sahne.scene.remove(c.et); });
    O = null;
    ['duelloPanel', 'tuzakSerit', 'izlePanel', 'rolYazi', 'nisangah', 'hizGosterge'].forEach(e => $(e).classList.add('gizli'));
    kontrolGoster(false);
    $('akis').innerHTML = ''; $('ipucu').textContent = '';
    if (document.pointerLockElement) document.exitPointerLock?.();
  }
  function oyunKur(m) {
    oyunTemizle();
    const benNo = m.oyuncular.findIndex(p => p.id === benimId() && !p.bot);
    O = { oyuncular: m.oyuncular, ayar: m.ayar, benNo, toplamTur: m.toplamTur, tur: 0, firavun: null, t: -5, akt: D.bosAkt(), hazirT: {}, govdeler: new Map(), ben: null, puan: Object.fromEntries(m.oyuncular.map(p => [p.no, 0])), olu: new Set(), vardi: new Set(), cikti: new Set(), duello: null, faz: 'kosu', bitti: false, izle: null };
    ekranGoster('hud');
    ilerlemeKur();
    tuzakSeridiKur();
  }
  function turKur(m) {
    O.govdeler.forEach(c => { Sahne.karakterSil(c.K); Sahne.scene.remove(c.et); }); O.govdeler.clear();
    Object.assign(O, { tur: m.tur, toplamTur: m.toplamTur, firavun: m.firavun, t: m.t, sure: m.sure, akt: D.bosAkt(), hazirT: {}, olu: new Set(), vardi: new Set(), duello: null, faz: 'kosu', izle: null, oldumGitti: false, vardimGitti: false, sonGonder: 0, sonGeriSayi: null, adimT: 0 });
    if (m.puan) O.puan = m.puan;
    O.ben = null;
    for (const [nos, [x, y, z, yaw]] of Object.entries(m.yerler)) {
      const no = +nos, p = O.oyuncular[no]; if (!p || O.cikti.has(no)) continue;
      const firavun = no === m.firavun;
      const K = Sahne.karakterYap(p.renk, firavun);
      const et = Sahne.etiketYap((firavun ? '🪬 ' : '') + p.ad, renkHex(p.renk)); Sahne.scene.add(et);
      const s = { x, y, z, yaw, hiz: 0, yerde: true, salla: 0, duello: false };
      O.govdeler.set(no, { K, et, s, hedef: { x, y, z, yaw, vx: 0, vz: 0, anim: 1, zaman: performance.now() } });
      if (no === O.benNo) O.ben = D.yeniGovde(x, y, z, yaw, firavun ? 'firavun' : 'kosucu');
    }
    kam.yaw = O.ben?.rol === 'firavun' ? 0.55 : 0; kam.pitch = O.ben?.rol === 'firavun' ? 0.5 : 0.22;
    const benFiravun = O.benNo === O.firavun;
    $('fazYazi').textContent = `${O.tur}/${O.toplamTur}. tur · 🪬 ${ad(O.firavun)}`;
    $('rolYazi').classList.toggle('gizli', !O.ben);
    $('rolYazi').innerHTML = benFiravun ? '🪬 Sen <b>FİRAVUN</b>sun: galeride yürü, düğmeye gelince <b>E</b>' : '🏃 Koşucusun: tuzaklardan kaç, sona var!';
    $('tuzakSerit').classList.toggle('gizli', !benFiravun);
    $('duelloPanel').classList.add('gizli'); $('izlePanel').classList.add('gizli');
    $('turSonu').classList.add('gizli'); ekranGoster('hud');
    kontrolGoster(!!O.ben);
    buyuk(benFiravun ? '🪬 FİRAVUN SENSİN!' : `🪬 Firavun: ${ad(O.firavun)}`, benFiravun ? 'Düğmelere bas, koşucuları durdur!' : 'Kapı açılınca koş! Tuzaklara dikkat.', 3200);
    if (!O.ben) izlemeyeBasla();
    puanCiz();
  }
  function puanCiz() {
    if (!O) return;
    const sira = O.oyuncular.map(p => p.no).sort((a, b) => O.puan[b] - O.puan[a]);
    $('puanTablo').innerHTML = sira.map(no => {
      const p = O.oyuncular[no];
      const ik = no === O.firavun ? '🪬' : O.olu.has(no) ? '💀' : O.vardi.has(no) ? '🏁' : '';
      return `<li class="${no === O.benNo ? 'ben' : ''} ${O.cikti.has(no) ? 'cikti' : ''} ${O.olu.has(no) ? 'olu' : ''}" style="--r:${renkHex(p.renk)}"><span><i></i>${p.bot ? '🤖' : ''}${kacis(p.ad)} ${ik}</span><b>${O.puan[no] ?? 0}</b></li>`;
    }).join('');
  }
  // üstteki ilerleme çubuğu: tuzak bölgeleri + oyuncu noktaları
  const UZUNLUK = D.VARIS_X + 2;
  const xYuzde = x => Math.max(0, Math.min(100, (x + 12) / (UZUNLUK + 12) * 100));
  function ilerlemeKur() {
    $('ilerlemeCubuk').innerHTML = D.TUZAKLAR.map(tz => `<div class="tz" data-id="${tz.id}" style="left:${xYuzde(tz.x1)}%;width:${xYuzde(tz.x2) - xYuzde(tz.x1)}%"></div>`).join('');
  }
  function ilerlemeCiz() {
    const C = $('ilerlemeCubuk');
    C.querySelectorAll('.tz').forEach(e => e.classList.toggle('dolu', hazirMi(+e.dataset.id)));
    C.querySelectorAll('.nokta').forEach(e => e.remove());
    O.govdeler.forEach((c, no) => {
      if (O.olu.has(no)) return;
      const d = document.createElement('div');
      const fir = no === O.firavun;
      d.className = 'nokta' + (no === O.benNo ? ' ben' : '') + (fir ? ' firavun' : '');
      if (fir) d.textContent = '🪬';
      d.style.left = xYuzde(fir && O.duello ? UZUNLUK : c.s.x) + '%'; d.style.setProperty('--r', renkHex(O.oyuncular[no].renk));
      C.appendChild(d);
    });
  }
  const hazirMi = id => !O || O.t >= (O.hazirT[id] ?? -1e9);

  // ---------- Firavun: tuzak şeridi ----------
  function tuzakSeridiKur() {
    $('tuzakSerit').innerHTML = D.TUZAKLAR.map(tz => `<div class="tb" data-id="${tz.id}" title="${kacis(tz.ad)}">${tz.em}<div class="dol"></div><span class="sn"></span></div>`).join('');
    $('tuzakSerit').querySelectorAll('.tb').forEach(b => { b.onpointerdown = e => { e.preventDefault(); tuzakBasDene(+b.dataset.id); }; });
  }
  function yakinTuzak() {
    if (!O?.ben || O.benNo !== O.firavun || O.duello) return null;
    let en = null, ed = 4.2;
    D.TUZAKLAR.forEach(tz => { const d = Math.abs(O.ben.x - tz.bx); if (d < ed && O.ben.y > 4) { ed = d; en = tz; } });
    return en;
  }
  function tuzakBasDene(id) {
    const yt = yakinTuzak();
    if (id === undefined) id = yt?.id;
    if (id === undefined || id === null) { if (O?.benNo === O?.firavun) akis('🪬 Önce bir düğmenin yanına yürü.'); return; }
    if (!yt || yt.id !== id) { akis(`🪬 ${D.TUZAKLAR[id].em} düğmesi uzakta: oraya yürü.`); return; }
    if (!hazirMi(id)) { akis(`⏳ ${D.TUZAKLAR[id].ad} doluyor…`); return; }
    eve({ tip: 'bas', id });
  }
  function seritCiz() {
    const yt = yakinTuzak();
    $('tuzakSerit').querySelectorAll('.tb').forEach(b => {
      const id = +b.dataset.id, tz = D.TUZAKLAR[id], h = hazirMi(id);
      b.classList.toggle('hazir', h); b.classList.toggle('yakin', yt?.id === id);
      const kalan = Math.max(0, (O.hazirT[id] ?? 0) - O.t), top = D.dolmaSuresi(tz, O.ayar.bekleme);
      b.querySelector('.dol').style.height = h ? '0%' : (kalan / top * 100).toFixed(0) + '%';
      b.querySelector('.sn').textContent = h ? '' : Math.ceil(kalan);
    });
    Sahne.dugmeVurgula(yt ? yt.id : null);
    $('eylemBtn').classList.toggle('gizli2', !(yt || O.duello && (O.benNo === O.duello.k || O.benNo === O.duello.f)));
    $('eylemBtn').textContent = O.duello ? '⚔️' : '👆';
  }

  // ---------- Mesajlar ----------
  function mesaj(m) {
    switch (m.tip) {
      case 'lobi':
        if (mod === 'ev' || mod === 'yerel') return;
        lobi = m.lobi;
        if (m.surum !== SURUM) $('lobiDurum').textContent = `⚠️ Sürümün farklı (sen ${SURUM}, oda ${m.surum}). Sayfayı yenile.`;
        lobiCiz(); return;
      case 'lobiyeDon': oyunTemizle(); ekranGoster('lobi'); lobiCiz(); return;
      case 'basla': oyunKur(m); return;
    }
    if (!O) return;
    switch (m.tip) {
      case 'tur': turKur(m); break;
      case 'd': durumGeldi(m); break;
      case 'tuzak': {
        O.akt.t[m.id] = m.t0; O.akt.n[m.id] = m.n; O.hazirT[m.id] = m.hazir;
        const tz = D.TUZAKLAR[m.id], k = sesGucu((tz.x1 + tz.x2) / 2, 1, 0);
        if (O.benNo === O.firavun) { Ses.dugme(); akis(`🪬 ${tz.em} ${tz.ad} çalıştı!`, 'iyi'); }
        else Ses.dugme(k * 0.4);
        tuzakSesi(tz, k);
        break;
      }
      case 'oldu': {
        O.olu.add(m.no); O.puan = m.puan;
        const c = O.govdeler.get(m.no);
        if (c) { c.K.g.visible = false; c.et.visible = false; Sahne.ruh(c.s.x, c.s.y, c.s.z, m.neden); }
        Ses.olum(m.neden, c ? sesGucu(c.s.x, c.s.y, c.s.z) : 0.5);
        akis(`💀 ${ad(m.no)} ${NEDEN[m.neden] || ''}`, m.no === O.benNo ? 'kotu' : '');
        if (m.no === O.benNo) { O.olumYeri = c ? { x: c.s.x, y: c.s.y, z: c.s.z } : null; O.ben = null; kontrolGoster(false); $('rolYazi').classList.add('gizli'); $('hizGosterge').classList.add('gizli'); sonHizGoster = false; buyuk('💀 ÖLDÜN!', NEDEN[m.neden] || '', 2200); setTimeout(() => { if (O && !O.ben) izlemeyeBasla(); }, 1800); }
        else if (O.benNo === O.firavun && m.neden !== 'cikti') buyuk('+1', `${ad(m.no)} ${NEDEN[m.neden] || ''}`, 1100);
        puanCiz();
        break;
      }
      case 'vardi':
        O.vardi.add(m.no); O.puan = m.puan;
        akis(`🏁 ${ad(m.no)} sona vardı! (+1)`, 'iyi'); Ses.vardi();
        if (m.no === O.benNo) buyuk('🏁 VARDIN!', 'Firavun’la düello sırası bekleniyor…', 2400);
        puanCiz();
        break;
      case 'duello': {
        O.duello = { k: m.k, f: m.f, kCan: m.kCan, fCan: m.fCan, basT: O.t + m.hazir };
        [[m.k, m.kp], [m.f, m.fp]].forEach(([no, p]) => {
          const c = O.govdeler.get(no);
          if (c) { c.s.x = c.hedef.x = p[0]; c.s.y = c.hedef.y = p[1]; c.s.z = c.hedef.z = p[2]; c.s.yaw = c.hedef.yaw = p[3]; }
          if (no === O.benNo && O.ben) { Object.assign(O.ben, { x: p[0], y: p[1], z: p[2], vx: 0, vy: 0, vz: 0, yaw: p[3] }); kam.yaw = p[3]; kam.pitch = 0.2; }
        });
        Sahne.duelloHalkasi(D.DUELLO.k[0], 0); Sahne.duelloHalkasi(D.DUELLO.f[0], 0);
        Ses.duello();
        buyuk('⚔️ DÜELLO!', `${ad(m.k)} ⚔️ ${ad(m.f)}`, 2200);
        akis(`⚔️ ${ad(m.k)} Firavun'un odasına girdi!`);
        $('duelloPanel').classList.remove('gizli'); duelloCiz();
        if (O.izle && O.izle.mod === 'oyuncu') { O.izle.no = m.k; izlePanelCiz(); }
        break;
      }
      case 'salla': {
        const c = O.govdeler.get(m.no);
        if (c && !(m.no === O.benNo && performance.now() - (O.sonSalla || 0) < 400)) c.s.salla = 1;
        if (c) Ses.salla(sesGucu(c.s.x, c.s.y, c.s.z));
        break;
      }
      case 'vurus': {
        if (O.duello) { if (m.hedef === O.duello.f) O.duello.fCan = m.can; else O.duello.kCan = m.can; duelloCiz(); }
        const c = O.govdeler.get(m.hedef);
        if (c) { Sahne.vurusEfekt(c.s.x, c.s.y + 1.3, c.s.z); Ses.vurus(sesGucu(c.s.x, c.s.y, c.s.z)); }
        if (m.hedef === O.benNo && O.ben) { O.ben.vx += m.kx * 9; O.ben.vz += m.kz * 9; O.ben.vy = 4; O.ben.yerde = false; Sahne.sarsinti(0.4); }
        break;
      }
      case 'donus': {
        O.duello = null; $('duelloPanel').classList.add('gizli');
        const c = O.govdeler.get(m.f);
        if (c) { c.s.x = c.hedef.x = m.p[0]; c.s.y = c.hedef.y = m.p[1]; c.s.z = c.hedef.z = m.p[2]; }
        if (m.f === O.benNo && O.ben) { Object.assign(O.ben, { x: m.p[0], y: m.p[1], z: m.p[2], vx: 0, vy: 0, vz: 0 }); akis('🪬 Galeriye döndün. Tuzaklara devam!', 'iyi'); }
        break;
      }
      case 'turSonu': turSonu(m); break;
      case 'cikti': {
        O.cikti.add(m.no); akis(`🚪 ${ad(m.no)} oyundan çıktı`, 'kotu');
        const c = O.govdeler.get(m.no); if (c) { Sahne.karakterSil(c.K); Sahne.scene.remove(c.et); O.govdeler.delete(m.no); }
        puanCiz(); break;
      }
      case 'son': oyunSonu(m); break;
    }
  }
  function tuzakSesi(tz, k) {
    switch (tz.tur) {
      case 'diken': Ses.tikirti(k); Ses.diken(k); break;
      case 'cokme': Ses.tikirti(k); Ses.cokme(k); break;
      case 'batan': Ses.gumburtu(2.5, k); break;
      case 'tavan': Ses.gumburtu(1, k); break;
      case 'kaya': Ses.gumburtu(2.6, k); break;
      case 'lav': Ses.lav(k); break;
      case 'kaygan': Ses.kaygan(k); break;
      case 'lazer': Ses.lazer(k); break;
      case 'balta': Ses.balta(k); break;
      case 'alev': Ses.alev(k); break;
    }
  }
  function durumGeldi(m) {
    const fark = m.t - O.t;
    if (Math.abs(fark) > 0.3) O.t = m.t; else O.t += fark * 0.1;
    const simdi = performance.now();
    m.l.forEach(([no, x, y, z, yaw, anim, vx, vz]) => {
      if (no === O.benNo && O.ben) return;
      const c = O.govdeler.get(no); if (!c) return;
      if (Math.abs(c.hedef.x - x) > 15) { c.s.x = x; c.s.y = y; c.s.z = z; }
      c.hedef = { x, y, z, yaw, anim, vx, vz, zaman: simdi };
    });
    if (O.duello) { if (m.fCan != null) O.duello.fCan = m.fCan; if (m.kCan != null) O.duello.kCan = m.kCan; duelloCiz(); }
  }
  function duelloCiz() {
    const d = O.duello; if (!d) return;
    $('dkAd').textContent = '🏃 ' + ad(d.k); $('dfAd').textContent = '🪬 ' + ad(d.f);
    $('dkCan').style.width = d.kCan + '%'; $('dfCan').style.width = d.fCan + '%';
  }
  function turSonu(m) {
    O.faz = 'turSonu'; O.puan = m.puan; O.duello = null;
    kontrolGoster(false); $('duelloPanel').classList.add('gizli'); $('tuzakSerit').classList.add('gizli'); $('izlePanel').classList.add('gizli');
    if (document.pointerLockElement) document.exitPointerLock();
    const benFiravun = O.benNo === O.firavun;
    const kazandim = (m.kazanan === 'firavun') === benFiravun;
    const yazi = m.kazanan === 'firavun' ? '🪬 FİRAVUN KAZANDI' : '🏃 KOŞUCULAR KAZANDI';
    const neden = { hepsi: 'Bütün koşucular tuzaklara yakalandı.', sure: 'Süre bitti, kimse Firavun’u yenemedi.', duello: `${ad(m.kahraman)} düelloda Firavun’u yendi!`, firavunCikti: 'Firavun oyundan çıktı.' }[m.neden] || '';
    $('turSonuBaslik').textContent = yazi;
    $('turSonuAlt2').textContent = `${neden} Firavun ${m.oldurme} koşucu yakaladı.`;
    const sira = O.oyuncular.map(p => p.no).sort((a, b) => O.puan[b] - O.puan[a]);
    $('turTablo').innerHTML = '<tr><th>Oyuncu</th><th>Bu tur</th><th>Toplam</th></tr>' + sira.map(no => {
      const p = O.oyuncular[no];
      const durum = no === m.firavun ? '🪬 Firavun' : m.kahraman === no ? '⚔️ Firavun’u yendi' : m.vardi.includes(no) ? '🏁 Vardı' : m.olu[no] ? (NEDEN[m.olu[no]] || '💀').split(' ')[0] + ' öldü' : O.cikti.has(no) ? '🚪' : '🙂 Hayatta';
      return `<tr class="${no === O.benNo ? 'ben' : ''}"><td class="ad" style="--r:${renkHex(p.renk)}">${p.bot ? '🤖 ' : ''}${kacis(p.ad)}</td><td>${durum}</td><td><b>${O.puan[no]}</b></td></tr>`;
    }).join('');
    $('turSonuAlt').textContent = m.son ? 'Oyun bitiyor…' : 'Sonraki tur birazdan… Sıradaki Firavun hazırlansın!';
    ekranGoster('turSonu');
    if (O.benNo >= 0) { if (kazandim) Ses.kazandi(); else Ses.kaybetti(); }
    if (m.kazanan === 'kosucu') Sahne.konfeti(D.DUELLO.f[0], 0, 0);
    puanCiz();
  }
  function oyunSonu(m) {
    O.bitti = true; O.faz = 'son'; O.puan = m.puan;
    const kazananlar = m.sira.filter(no => m.puan[no] === m.puan[m.sira[0]]);
    const benKazandim = kazananlar.includes(O.benNo);
    $('sonucBaslik').textContent = benKazandim ? 'KAZANDIN!' : kazananlar.length > 1 ? 'BERABERE!' : `${ad(kazananlar[0])} KAZANDI!`;
    $('sonucSira').innerHTML = m.sira.map(no => `<li><span style="--r:${renkHex(O.oyuncular[no].renk)}">${O.oyuncular[no].bot ? '🤖 ' : ''}${kacis(ad(no))}</span> · ${m.puan[no]} puan</li>`).join('');
    $('tekrarBtn').classList.toggle('gizli', !yonetici());
    $('sonucBekle').classList.toggle('gizli', yonetici());
    ekranGoster('sonuc');
    if (benKazandim) Ses.kazandi(); else Ses.kaybetti();
  }

  // ---------- Klavye / fare / dokunmatik ----------
  const tus = new Set();
  let ziplaBas = false, otopilot = null;
  const joy = { x: 0, y: 0, id: null };
  addEventListener('keydown', e => {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (!e.repeat) {
      if (k === ' ') ziplaBas = true;
      if (k === 'e' && O?.ben) { if (O.duello) vurDene(); else tuzakBasDene(); }
      if (k === 'v') kameraDegistir();
      if (k === 'm') mikDegistir();
      if (O?.izle && !O.ben) { if (k === 'q') izleDegistir(-1); else if (k === 'e') izleDegistir(1); else if (k === 'f') izleSerbest(O.izle.mod !== 'serbest'); }
    }
    tus.add(k);
  });
  addEventListener('keyup', e => tus.delete(e.key.toLowerCase()));
  addEventListener('blur', () => { tus.clear(); joy.x = joy.y = 0; });
  const kanvas = $('sahne');
  let surukle = null;
  const oyunda = () => O && O.faz === 'kosu' && !$('hud').classList.contains('gizli');
  kanvas.addEventListener('pointerdown', e => {
    Ses.baslat();
    if (!oyunda()) return;
    if (e.pointerType === 'mouse') {
      if (document.pointerLockElement === kanvas) { if (e.button === 0 && O.duello) vurDene(); return; }
      if (e.button === 0 && O.duello && O.ben) vurDene();
      try { kanvas.requestPointerLock?.(); } catch (x) { }
    }
    surukle = { id: e.pointerId, x: e.clientX, y: e.clientY };
    try { kanvas.setPointerCapture(e.pointerId); } catch (x) { }
  });
  kanvas.addEventListener('pointermove', e => {
    if (document.pointerLockElement === kanvas) return;
    if (!surukle || surukle.id !== e.pointerId) return;
    kameraCevir(e.clientX - surukle.x, e.clientY - surukle.y, e.pointerType === 'touch' ? 1.5 : 1);
    surukle.x = e.clientX; surukle.y = e.clientY;
  });
  const birak = e => { if (surukle && surukle.id === e.pointerId) surukle = null; };
  kanvas.addEventListener('pointerup', birak); kanvas.addEventListener('pointercancel', birak);
  kanvas.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('mousemove', e => { if (document.pointerLockElement === kanvas && oyunda()) kameraCevir(e.movementX, e.movementY, 0.9); });
  document.addEventListener('pointerlockchange', () => { if (O && O.faz === 'kosu') ipucuCiz(); });
  kanvas.addEventListener('wheel', e => { const I = O?.izle; if (I?.mod === 'serbest' && I.poz) { e.preventDefault(); const k = e.deltaY > 0 ? -1.5 : 1.5, cp = Math.cos(I.pitch); I.poz.x += Math.cos(I.yaw) * cp * k; I.poz.y -= Math.sin(I.pitch) * k; I.poz.z += Math.sin(I.yaw) * cp * k; } }, { passive: false });
  function kameraCevir(dx, dy, k = 1) {
    const hedef = O?.izle?.mod === 'serbest' ? O.izle : kam;
    hedef.yaw += dx * 0.0042 * k;
    const serbest = hedef !== kam;
    hedef.pitch = Math.max(serbest || kam.birinci ? -1.45 : -0.5, Math.min(serbest ? 1.45 : 1.3, hedef.pitch + dy * 0.0036 * k));
  }
  // joystick
  const J = $('joystick'), JT = $('joyTop');
  J.addEventListener('pointerdown', e => { e.preventDefault(); Ses.baslat(); joy.id = e.pointerId; try { J.setPointerCapture(e.pointerId); } catch (x) { } joyAyarla(e); });
  J.addEventListener('pointermove', e => { if (joy.id === e.pointerId) joyAyarla(e); });
  const joyBirak = e => { if (joy.id !== e.pointerId) return; joy.id = null; joy.x = joy.y = 0; JT.style.transform = ''; };
  J.addEventListener('pointerup', joyBirak); J.addEventListener('pointercancel', joyBirak); J.addEventListener('lostpointercapture', joyBirak);
  function joyAyarla(e) {
    const r = J.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2;
    let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    joy.x = dx; joy.y = dy; JT.style.transform = `translate(${dx * R * 0.6}px, ${dy * R * 0.6}px)`;
  }
  $('ziplaBtn').addEventListener('pointerdown', e => { e.preventDefault(); ziplaBas = true; $('ziplaBtn').classList.add('basili'); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => $('ziplaBtn').addEventListener(t, () => $('ziplaBtn').classList.remove('basili')));
  $('eylemBtn').addEventListener('pointerdown', e => { e.preventDefault(); if (O?.duello) vurDene(); else tuzakBasDene(); });
  function kontrolGoster(v) { document.querySelectorAll('.kontrol').forEach(e => e.classList.toggle('gizli2', !v)); }
  kontrolGoster(false);
  function girdiAl() {
    const v = k => tus.has(k);
    let ileri = (v('w') || v('arrowup') ? 1 : 0) - (v('s') || v('arrowdown') ? 1 : 0);
    let yan = (v('d') || v('arrowright') ? 1 : 0) - (v('a') || v('arrowleft') ? 1 : 0);
    if (joy.id !== null) { ileri = -joy.y; yan = joy.x; }
    const g = { ileri, yan, zipla: ziplaBas || v(' '), yaw: kam.yaw };
    if (otopilot && O?.ben) {
      if (O.ben.rol === 'firavun') { const r = D.botFiravun(otopilot.f ||= D.yeniFiravunBot('orta'), O.ben, O.t, O.akt, kosucuGovdeleri(), hazirMi); if (r.bas !== null) eve({ tip: 'bas', id: r.bas }); return r.g; }
      return D.botKosucu(otopilot.k ||= D.yeniKosucuBot('zor', 0), O.ben, O.t, O.akt, { f: O.govdeler.get(O.firavun)?.s, hazir: hazirMi });
    }
    return g;
  }
  const kosucuGovdeleri = () => [...O.govdeler.entries()].filter(([no]) => no !== O.firavun && !O.olu.has(no) && !O.vardi.has(no)).map(([, c]) => ({ x: c.s.x, y: c.s.y, z: c.s.z, vx: c.hedef.vx || 0 }));
  function vurDene() {
    const d = O?.duello; if (!d || !O.ben || (O.benNo !== d.k && O.benNo !== d.f) || O.t < d.basT) return;
    if (performance.now() - (O.sonSalla || 0) < 700) return;
    O.sonSalla = performance.now();
    const c = O.govdeler.get(O.benNo); if (c) c.s.salla = 1;
    Ses.salla();
    eve({ tip: 'vur' });
  }
  function ipucuCiz() {
    if (!O || dokun) { $('ipucu').textContent = ''; return; }
    if (!O.ben) { $('ipucu').textContent = O.izle ? (O.izle.mod === 'serbest' ? 'Fareyle bak · W baktığın yöne git · A D yana · Boşluk yukarı · Shift aşağı · F: oyuncuyu izle' : '◀ ▶ (Q / E): başka oyuncuyu izle · F: serbest bakış · fareyle sürükle: döndür') : ''; return; }
    const kilit = document.pointerLockElement === kanvas;
    const fare = kilit ? 'Esc: fareyi bırak' : 'Sahneye tıkla: fareyle bak';
    if (O.duello && (O.benNo === O.duello.k || O.benNo === O.duello.f)) $('ipucu').textContent = `WASD yürü · Boşluk zıpla · Tıkla / E: asayla vur · ${fare}`;
    else if (O.ben.rol === 'firavun') $('ipucu').textContent = `WASD yürü · E: yanındaki düğmeye bas · V: kamera · ${fare}`;
    else $('ipucu').textContent = `WASD yürü · Boşluk zıpla · V: birinci/üçüncü şahıs · ${fare}`;
  }

  // ---------- Kendi karakterim ----------
  function benimKare(dt) {
    const p = O.ben;
    const g = girdiAl();
    ziplaBas = false;
    // geri sayımda başlangıç odasında gezinebilirsin (kapı kapalı)
    const n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
    for (let i = 0; i < n; i++) {
      const ts = O.t - dt + h * (i + 1);
      const ol = D.adim(p, g, ts, h, O.akt);
      if (!otopilot && Math.hypot(g.ileri, g.yan) > 0.1) p.yaw = kam.yaw + Math.atan2(g.yan, g.ileri);
      ol.forEach(o => { if (o.tip === 'zipla') { Ses.zipla(); } else if (o.tip === 'indi') { Ses.indi(o.guc); if (o.guc > 9) Sahne.toz(p.x, p.y, p.z, 8, 0xc8a878, 1); } });
      g.zipla = false;
      if (p.rol === 'kosucu' && !(O.duello && O.duello.k === O.benNo) && !O.oldumGitti) {
        const neden = D.olumKontrol(p, ts, O.akt);
        if (neden) { O.oldumGitti = true; eve({ tip: 'oldum', neden }); break; }
      }
      if (p.rol === 'firavun' && O.duello && p.y < -2) p.y = 0;
    }
    if (p.rol === 'kosucu' && !O.vardimGitti && p.x > D.VARIS_X) { O.vardimGitti = true; eve({ tip: 'vardim' }); }
    // adım sesi + toz
    const hiz = Math.hypot(p.vx, p.vz);
    hizCiz(hiz, p);
    if (p.yerde && hiz > 2) { O.adimT -= dt * hiz / 7; if (O.adimT <= 0) { O.adimT = 0.33; Ses.adim(); Sahne.ayakTozu(p.x, p.y, p.z); } }
    if (p.kaygan && Math.random() < 0.3) Sahne.parcacik(0, { x: p.x, y: p.y + 0.05, z: p.z, vz: 1, renk: 0x2a1404, boy: 0.4, omur: 0.5 });
    // konum gönder
    if (O.t - O.sonGonder > 1 / 15 || O.t < O.sonGonder) {
      O.sonGonder = O.t;
      const anim = (p.yerde ? 1 : 0) | (hiz > 1 ? 2 : 0);
      eve({ tip: 'ben', d: [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +p.yaw.toFixed(2), anim, +p.vx.toFixed(1), +p.vz.toFixed(1)] });
    }
  }

  // bunnyhop: normal koşu hızının üstündeyken hız göstergesi
  let sonHizGoster = false;
  function hizCiz(hiz, p) {
    const normal = p.rol === 'firavun' ? D.FIR_HIZ : D.HIZ;
    const goster = hiz > normal + 0.4;
    if (goster) { const e = $('hizGosterge'); e.textContent = `🐇 ${Math.round(hiz * 3.6)} km/s ×${(hiz / normal).toFixed(1)}`; e.classList.toggle('cok', hiz > normal * 1.5); }
    if (goster !== sonHizGoster) { sonHizGoster = goster; $('hizGosterge').classList.toggle('gizli', !goster); }
  }

  // ---------- Ölünce: izleme ----------
  function izlemeyeBasla() {
    if (!O || O.faz !== 'kosu' || O.ben) return;
    O.izle = { mod: 'oyuncu', no: null, yaw: 0, pitch: 0.5, uzak: 18, odak: { x: 0, y: 1, z: 0 } };
    $('izlePanel').classList.remove('gizli');
    izleDegistir(0);
    ipucuCiz();
  }
  function izleAdaylari() {
    const l = [...O.govdeler.keys()].filter(no => no !== O.benNo && !O.olu.has(no));
    if (O.duello) return [O.duello.k, O.duello.f, ...l.filter(no => no !== O.duello.k && no !== O.duello.f)];
    return l.sort((a, b) => (O.govdeler.get(b).s.x - O.govdeler.get(a).s.x));
  }
  function izleDegistir(yon) {
    if (!O?.izle) return;
    const l = izleAdaylari(); if (!l.length) { izleSerbest(true); return; }
    let i = l.indexOf(O.izle.no);
    i = i < 0 ? 0 : (i + yon + l.length) % l.length;
    O.izle.no = l[i]; O.izle.mod = 'oyuncu';
    izlePanelCiz();
  }
  function izleSerbest(ac) {
    if (!O?.izle) return;
    O.izle.mod = ac ? 'serbest' : 'oyuncu';
    if (ac) { const p = Sahne.camera.position; O.izle.poz = { x: p.x, y: p.y, z: p.z }; O.izle.yaw = kam.yaw; O.izle.pitch = 0.25; }
    else izleDegistir(0);
    $('joystick').classList.toggle('gizli2', !ac);
    izlePanelCiz();
  }
  function izlePanelCiz() {
    const serbest = O.izle.mod === 'serbest';
    $('izleAd').textContent = serbest ? '🎥 Serbest bakış' : `👀 ${O.izle.no === O.firavun ? '🪬 ' : ''}${ad(O.izle.no)}`;
    $('izleSerbestBtn').textContent = serbest ? '👀 Oyuncuyu izle' : '🎥 Serbest bakış';
  }
  $('izleOnceBtn').onclick = () => izleDegistir(-1);
  $('izleSonraBtn').onclick = () => izleDegistir(1);
  $('izleSerbestBtn').onclick = () => izleSerbest(O?.izle?.mod !== 'serbest');

  // ---------- Ana döngü ----------
  let son = performance.now(), elleSur = 0, menuT = 0, ipucuT = 0, seritT = 0;
  function kare(dt) {
    if (O && O.faz !== 'son') {
      O.t += dt;
      const t = O.t;
      // geri sayım
      if (O.faz === 'kosu' && t < 0.9) {
        const n = Math.ceil(-t);
        if (n !== O.sonGeriSayi) { O.sonGeriSayi = n; if (n > 0 && n <= 3) { buyuk(String(n), n === 3 ? 'Hazır ol!' : '', 900); Ses.geriSayim(); } else if (n <= 0) { buyuk(O.benNo === O.firavun ? 'TUZAKLARI KUR!' : 'KOŞ!', '', 800); Ses.basla(); } }
      }
      if (O.ben && O.faz === 'kosu') benimKare(dt);
      // karakterler
      const simdi = performance.now();
      O.govdeler.forEach((c, no) => {
        if (O.olu.has(no)) return;
        if (no === O.benNo && O.ben) {
          const p = O.ben;
          Object.assign(c.s, { x: p.x, y: p.y, z: p.z, yaw: p.yaw, hiz: Math.hypot(p.vx, p.vz), yerde: p.yerde });
        } else {
          const H = c.hedef, s = c.s;
          const gecen = Math.min(0.15, (simdi - H.zaman) / 1000);
          const tx = H.x + (H.vx || 0) * gecen, tz = H.z + (H.vz || 0) * gecen;
          const k = 1 - Math.exp(-dt * 14);
          s.x += (tx - s.x) * k; s.y += (H.y - s.y) * k; s.z += (tz - s.z) * k;
          let fark = H.yaw - s.yaw; while (fark > Math.PI) fark -= 2 * Math.PI; while (fark < -Math.PI) fark += 2 * Math.PI; s.yaw += fark * k;
          s.hiz = Math.hypot(H.vx || 0, H.vz || 0); s.yerde = !!(H.anim & 1);
        }
        c.s.duello = !!(O.duello && (no === O.duello.k || no === O.duello.f));
        if (c.s.salla > 0) c.s.salla = Math.max(0, c.s.salla - dt / 0.45);
        Sahne.karakterGuncelle(c.K, c.s, dt);
        c.K.g.visible = !(no === O.benNo && O.ben && kam.birinci);
        c.et.position.set(c.s.x, c.s.y + (no === O.firavun ? 2.6 : 2.3), c.s.z);
        c.et.visible = no !== O.benNo;
      });
      // kamera
      if (O.ben) Sahne.kameraTakip(O.ben, kam.yaw, kam.pitch, kam.birinci);
      else if (O.izle) {
        if (O.izle.mod === 'serbest') {
          // uçan kamera: W baktığın yöne (aşağı bakıyorsan aşağı) götürür, A/D yana, Boşluk yukarı, Shift aşağı
          const I = O.izle, v = k => tus.has(k), hz = 14 * dt;
          let ileri = (v('w') || v('arrowup') ? 1 : 0) - (v('s') || v('arrowdown') ? 1 : 0), yan = (v('d') || v('arrowright') ? 1 : 0) - (v('a') || v('arrowleft') ? 1 : 0);
          if (joy.id !== null) { ileri = -joy.y; yan = joy.x; }
          const yuk = (v(' ') ? 1 : 0) - (v('shift') ? 1 : 0);
          const cp = Math.cos(I.pitch), fx = Math.cos(I.yaw) * cp, fy = -Math.sin(I.pitch), fz = Math.sin(I.yaw) * cp;
          I.poz.x += (fx * ileri - Math.sin(I.yaw) * yan) * hz;
          I.poz.y += (fy * ileri + yuk) * hz;
          I.poz.z += (fz * ileri + Math.cos(I.yaw) * yan) * hz;
          I.poz.x = Math.max(-13.5, Math.min(280.5, I.poz.x)); I.poz.y = Math.max(0.3, Math.min(13.5, I.poz.y)); I.poz.z = Math.max(-13.5, Math.min(13.5, I.poz.z));
          Sahne.kameraUcan(I.poz, I.yaw, I.pitch);
        } else {
          let c = O.govdeler.get(O.izle.no);
          if (!c || O.olu.has(O.izle.no)) { izleDegistir(0); c = O.govdeler.get(O.izle.no); }
          if (c) Sahne.kameraTakip(c.s, kam.yaw, kam.pitch, false, 6);
        }
      } else if (O.olumYeri) Sahne.kameraTakip(O.olumYeri, kam.yaw, kam.pitch, false, 7);
      else Sahne.menuKamera(performance.now() / 1000);
      Sahne.tuzakGuncelle(t, O.akt, hazirMi, O.benNo === O.firavun);
      // ekran yazıları
      seritT -= dt;
      if (seritT <= 0 && O.faz === 'kosu') {
        seritT = 0.15;
        const kalan = Math.max(0, O.sure - Math.max(0, t));
        $('sayac').textContent = t < 0 ? `⏳ ${Math.ceil(-t)}` : `${Math.floor(kalan / 60)}:${String(Math.floor(kalan % 60)).padStart(2, '0')}`;
        $('sayac').classList.toggle('az', t >= 0 && kalan < 15);
        ilerlemeCiz();
        if (O.benNo === O.firavun) seritCiz();
        else { $('eylemBtn').classList.toggle('gizli2', !(O.duello && O.benNo === O.duello.k)); $('eylemBtn').textContent = '⚔️'; }
        $('nisangah').classList.toggle('gizli', !(O.ben && kam.birinci));
      }
      ipucuT -= dt; if (ipucuT <= 0) { ipucuT = 0.5; ipucuCiz(); }
    } else {
      menuT += dt;
      Sahne.menuKamera(menuT);
      Sahne.tuzakGuncelle(menuT, menuAkt(menuT), null, false);
    }
    Sahne.ciz(dt, O ? O.t : menuT);
  }
  // menüde arka planda tuzaklar kendiliğinden çalışsın
  const mAkt = D.bosAkt(); let mSon = {};
  function menuAkt(t) {
    D.TUZAKLAR.forEach(tz => { if (!mSon[tz.id] || t - mSon[tz.id] > 9 + tz.id * 0.7) { mSon[tz.id] = t; mAkt.t[tz.id] = t; mAkt.n[tz.id] = (mAkt.n[tz.id] || 0) + 1; } });
    return mAkt;
  }
  function dongu(simdi) {
    const dt = Math.min(0.05, Math.max(0, (simdi - son) / 1000)); son = simdi;
    // test kapısı elle kare ilerletiyorsa bekle; yarım saniye çağrılmazsa oyun kendi kendine devam eder (asla donmaz)
    if (!elleSur || simdi - elleSur > 500) { elleSur = 0; kare(dt); }
    requestAnimationFrame(dongu);
  }
  requestAnimationFrame(dongu);

  // Test kapısı: önizleme gizliyken kareyi elle ilerletmek ve durumu okumak için
  return {
    kare(ms = 16, n = 1) { elleSur = performance.now(); for (let i = 0; i < n; i++) kare(ms / 1000); return Oyun.durum(); },
    serbest() { elleSur = 0; },
    durum() { return O ? { faz: O.faz, tur: O.tur, t: +O.t.toFixed(2), benNo: O.benNo, firavun: O.firavun, puan: O.puan, ben: O.ben && { x: +O.ben.x.toFixed(1), y: +O.ben.y.toFixed(1), z: +O.ben.z.toFixed(1), rol: O.ben.rol }, olu: [...O.olu], vardi: [...O.vardi], duello: O.duello } : { mod }; },
    otopilot(v = true) { otopilot = v ? {} : null; },
    tusBas(k, v = true) { if (v) tus.add(k); else tus.delete(k); },
    bas: id => tuzakBasDene(id), vur: () => vurDene(),
    get O() { return O; }, kam,
  };
})();
