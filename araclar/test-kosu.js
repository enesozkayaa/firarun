// Tuzaksız koşu testi: botlar parkuru baştan sona geçebiliyor mu? (Firavun hiç basmaz)
// Çalıştır: node araclar/test-kosu.js [botSayisi] [zorluk]
const D = require('../dunya.js');
const n = +(process.argv[2] || 8), zorluk = process.argv[3] || 'orta';
const akt = D.bosAkt();
let sonuc = { vardi: 0, olu: {} };
for (let k = 0; k < n; k++) {
  const p = D.yeniGovde(-11 + (k % 4) * 2.6, 0, -2.7 + Math.floor(k / 4) * 2.7, 0);
  const b = D.yeniKosucuBot(zorluk, k);
  let t = -5, neden = null, takildi = 0, sonX = p.x;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 150; i++) {
    t += dt;
    const g = D.botKosucu(b, p, t, akt);
    D.adim(p, g, t, dt, akt);
    neden = D.olumKontrol(p, t, akt);
    if (neden) break;
    if (p.x > D.VARIS_X) break;
    if (i % 300 === 0) { if (Math.abs(p.x - sonX) < 0.5 && t > 2) takildi++; else takildi = 0; sonX = p.x; if (takildi > 3) { neden = 'takildi'; break; } }
  }
  const s = neden || (p.x > D.VARIS_X ? 'VARDI' : 'sure');
  if (s === 'VARDI') sonuc.vardi++; else sonuc.olu[s + '@' + Math.round(p.x)] = (sonuc.olu[s + '@' + Math.round(p.x)] || 0) + 1;
  console.log(`bot ${k}: ${s} x=${p.x.toFixed(1)} z=${p.z.toFixed(1)} y=${p.y.toFixed(2)} t=${t.toFixed(1)} dugum=${b.i}`);
}
console.log(sonuc);
