// Firarun - motor testi: sadece botlarla bütün bir oyun oynatır.
// Çalıştır: node araclar/test-motor.js [botSayisi] [zorluk] [bekleme]
const Motor = require('../motor.js');
const D = require('../dunya.js');
const n = +(process.argv[2] || 6);
const ayar = { kez: 1, sure: 180, botZorluk: process.argv[3] || 'orta', bekleme: process.argv[4] || 'orta' };
let son = null, tur = null, ozet = { firavun: 0, kosucu: 0 };
const olumler = {};
Motor.baslat(Array.from({ length: n }, (_, i) => ({ id: 'b' + i, ad: 'Bot' + i, bot: true, renk: i })), ayar, {
  elle: true,
  herkese: m => {
    if (m.tip === 'tur') tur = { basT: Date.now(), tuzak: [], olu: [], enIleri: 0 };
    if (m.tip === 'tuzak') tur.tuzak.push(D.TUZAKLAR[m.id].tur);
    if (m.tip === 'oldu') { tur.olu.push(`${m.neden}@${Math.round(m.x)}`); olumler[m.neden] = (olumler[m.neden] || 0) + 1; }
    if (m.tip === 'duello') tur.duello = (tur.duello || 0) + 1;
    if (m.tip === 'turSonu') {
      ozet[m.kazanan]++;
      const M = Motor.durum;
      console.log(`Tur ${M.tur}: ${m.kazanan} kazandı (${m.neden}) t=${M.t.toFixed(0)}s · vardı ${m.vardi.length} · düello ${tur.duello || 0} · ölümler: ${tur.olu.join(' ')} · basılan: ${tur.tuzak.length}`);
    }
    if (m.tip === 'son') son = m;
  },
});
let enIleri = {};
for (let i = 0; i < 30 * 60 * 60 && !son; i++) Motor.tik(1 / 30);
console.log('son', son && son.puan, ozet, olumler);
if (!son) { console.log('HATA: oyun bitmedi'); process.exit(1); }
