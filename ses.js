// =============================================================
// Firarun - oyun sesleri (hepsi kodla üretilir, dosya yok)
// Çoğu fonksiyon bir "k" (0..1 ses gücü) alır: uzaktaki tuzak daha kısık duyulur.
// =============================================================

const Ses = (() => {
  let ctx = null, ana = null, acik = true, ruzgar = null;
  try { acik = localStorage.getItem('ft.ses') !== '0'; } catch (e) { }
  const SEVIYE = 0.55;
  function baslat() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); ana = ctx.createGain(); ana.gain.value = acik ? SEVIYE : 0; ana.connect(ctx.destination); } catch (e) { return; }
      ambiyans();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  }
  addEventListener('storage', e => { if (e.key === 'ft.ses') { acik = e.newValue !== '0'; if (ana) ana.gain.value = acik ? SEVIYE : 0; } });
  function degistir() { acik = !acik; if (ana) ana.gain.value = acik ? SEVIYE : 0; try { localStorage.setItem('ft.ses', acik ? '1' : '0'); } catch (e) { } return acik; }
  function ton(f, sure, tip = 'sine', ses = 0.3, f2 = null, gecikme = 0) {
    if (!ctx || !acik || ses < 0.003) return;
    const t = ctx.currentTime + gecikme, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tip; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + sure);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(ses, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + sure);
    o.connect(g).connect(ana); o.start(t); o.stop(t + sure + 0.02);
  }
  let gB = null;
  function gurultuB() { if (!gB) { gB = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = gB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return gB; }
  function gurultu(sure, ses = 0.3, fGecis = 1200, tip = 'bandpass', gecikme = 0, q = 1, f2 = null, atak = 0) {
    if (!ctx || !acik || ses < 0.003) return;
    const t = ctx.currentTime + gecikme, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = gurultuB(); f.type = tip; f.frequency.setValueAtTime(fGecis, t); if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + sure); f.Q.value = q;
    if (atak) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(ses, t + atak); } else g.gain.setValueAtTime(ses, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + sure);
    s.connect(f).connect(g).connect(ana); s.start(t, Math.random()); s.stop(t + sure + 0.02);
  }
  // Piramidin içinde uğuldayan rüzgâr
  function ambiyans() {
    if (!ctx || ruzgar) return;
    const s = ctx.createBufferSource(); s.buffer = gurultuB(); s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260; f.Q.value = 3;
    const g = ctx.createGain(); g.gain.value = 0.05;
    const l = ctx.createOscillator(); l.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 120; l.connect(lg).connect(f.frequency);
    s.connect(f).connect(g).connect(ana); s.start(); l.start();
    ruzgar = { g };
  }

  return {
    baslat, degistir, get acik() { return acik; },
    adim(k = 1) { gurultu(0.07, 0.08 * k, 900 + Math.random() * 500, 'bandpass', 0, 1.5); },
    zipla(k = 1) { gurultu(0.12, 0.08 * k, 1800, 'bandpass', 0, 1); ton(300, 0.12, 'sine', 0.05 * k, 520); },
    indi(guc = 8, k = 1) { gurultu(0.18, Math.min(0.25, guc * 0.02) * k, 500, 'lowpass'); },
    dugme(k = 1) { ton(180, 0.08, 'square', 0.12 * k, 90); gurultu(0.12, 0.2 * k, 2500, 'bandpass', 0, 3); ton(70, 0.4, 'sine', 0.25 * k, 40, 0.05); },
    diken(k = 1) { for (let i = 0; i < 5; i++) gurultu(0.25, 0.22 * k, 3500 + i * 600, 'bandpass', 0.7 + i * 0.01, 6); ton(1200, 0.3, 'sawtooth', 0.04 * k, 600, 0.7); gurultu(0.6, 0.06 * k, 4000, 'highpass', 0, 1); },
    tikirti(k = 1) { for (let i = 0; i < 6; i++) gurultu(0.04, 0.12 * k, 2500, 'bandpass', i * 0.08, 8); },
    cokme(k = 1) { gurultu(0.5, 0.3 * k, 300, 'lowpass', 0.45); ton(110, 0.5, 'sawtooth', 0.12 * k, 40, 0.45); for (let i = 0; i < 4; i++) gurultu(0.05, 0.15 * k, 1500, 'bandpass', i * 0.1, 6); },
    gumburtu(sure = 1.5, k = 1) { gurultu(sure, 0.35 * k, 120, 'lowpass', 0, 2, 60, 0.3); ton(45, sure, 'sine', 0.2 * k, 35); },
    carp(k = 1) { gurultu(0.9, 0.5 * k, 400, 'lowpass', 0, 1, 80); ton(60, 0.6, 'sine', 0.4 * k, 30); gurultu(0.3, 0.2 * k, 2000, 'bandpass', 0, 1); },
    lav(k = 1) { for (let i = 0; i < 8; i++) { const g = Math.random() * 1.2; ton(120 + Math.random() * 160, 0.12, 'sine', 0.12 * k, 60, g); } gurultu(1.6, 0.18 * k, 300, 'lowpass', 0, 1, null, 0.4); },
    kaygan(k = 1) { gurultu(0.8, 0.15 * k, 600, 'bandpass', 0, 4, 200, 0.1); ton(200, 0.6, 'sine', 0.05 * k, 80); },
    lazer(k = 1) { ton(880, 2.6, 'sawtooth', 0.05 * k, 820, 0.5); ton(440, 2.6, 'sine', 0.08 * k, 430, 0.5); gurultu(0.4, 0.1 * k, 5000, 'highpass', 0.5); },
    balta(k = 1) { for (let i = 0; i < 8; i++) gurultu(0.3, 0.12 * k, 900, 'bandpass', i * 0.6, 2, 2400, 0.12); ton(150, 0.4, 'square', 0.06 * k, 300); },
    alev(k = 1) { gurultu(0.5, 0.12 * k, 800, 'bandpass', 0, 1, 1600, 0.3); gurultu(2.2, 0.35 * k, 900, 'lowpass', 0.8, 0.7, 500, 0.08); ton(80, 2, 'sawtooth', 0.04 * k, 60, 0.8); },
    // Deagle: sert patlama + alçak gümbürtü
    ates(k = 1) { gurultu(0.09, 0.7 * k, 2600, 'lowpass', 0, 0.7); gurultu(0.35, 0.35 * k, 500, 'lowpass', 0.01, 1, 140); ton(90, 0.2, 'sine', 0.35 * k, 40); },
    bos() { ton(1400, 0.03, 'square', 0.08); },
    doldur() { ton(600, 0.05, 'square', 0.1); ton(420, 0.05, 'square', 0.1, null, 0.5); ton(900, 0.06, 'square', 0.12, null, 1.3); },
    isabet(kafa) { ton(kafa ? 1900 : 1300, 0.06, 'triangle', 0.18); },
    salla(k = 1) { gurultu(0.22, 0.18 * k, 700, 'bandpass', 0, 2, 2500, 0.05); },
    vurus(k = 1) { gurultu(0.15, 0.4 * k, 1200, 'lowpass'); ton(140, 0.18, 'square', 0.15 * k, 60); },
    olum(neden, k = 1) {
      if (neden === 'dustu') { ton(700, 1.1, 'triangle', 0.15 * k, 120); return; }
      if (neden === 'lav' || neden === 'alev') { gurultu(0.8, 0.3 * k, 2000, 'highpass', 0, 1); ton(500, 0.6, 'sawtooth', 0.08 * k, 150); return; }
      gurultu(0.25, 0.35 * k, 600, 'lowpass'); ton(420, 0.5, 'triangle', 0.14 * k, 140, 0.03);
      ton(1200, 1.4, 'sine', 0.05 * k, 1800, 0.2);
    },
    geriSayim() { ton(660, 0.15, 'square', 0.12); },
    basla() { ton(880, 0.12, 'square', 0.12); ton(1320, 0.4, 'square', 0.12, null, 0.1); gurultu(1.2, 0.25, 200, 'lowpass', 0.05, 1, 80); },
    vardi() { [523, 659, 784, 1046].forEach((f, i) => ton(f, 0.25, 'triangle', 0.15, null, i * 0.09)); },
    duello() { ton(220, 0.6, 'sawtooth', 0.12, 110); ton(330, 0.6, 'sawtooth', 0.1, 165, 0.15); gurultu(1, 0.2, 150, 'lowpass', 0, 1); },
    kazandi() { [523, 659, 784, 1046, 1318].forEach((f, i) => ton(f, 0.35, 'triangle', 0.16, null, i * 0.11)); },
    kaybetti() { [392, 330, 262, 196].forEach((f, i) => ton(f, 0.4, 'triangle', 0.14, null, i * 0.16)); },
    tik() { ton(1000, 0.04, 'square', 0.05); },
  };
})();
