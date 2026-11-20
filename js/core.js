/* Núcleo compartilhado: áudio, partículas, utilitários e proteções de touch. */
(function () {
  'use strict';
  const Arcade = (window.Arcade = { games: {}, order: ['memory', 'dots', 'flappy', 'reflex'] });

  /* Respeita a preferência de movimento reduzido do sistema operacional */
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  Object.defineProperty(Arcade, 'reduceMotion', { get: () => !!(mq && mq.matches) });

  /* ---------- Utilitários ---------- */
  Arcade.util = {
    rand: (a, b) => a + Math.random() * (b - a),
    randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    fmtTime(sec) {
      sec = Math.max(0, Math.floor(sec));
      return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    },
    local(el, e) {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    },
  };

  /* ---------- Áudio (WebAudio, sem arquivos externos) ---------- */
  let actx = null;
  function ensureAudio() {
    try {
      if (!actx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) actx = new AC();
      }
      if (actx && actx.state === 'suspended') actx.resume();
    } catch (e) {}
  }
  let muted = false;
  function tone(freq, dur, type, vol, delay, slideTo) {
    if (!actx || muted) return;
    try {
      const t = actx.currentTime + (delay || 0);
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime((vol || 0.1) * 0.8, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(actx.destination);
      o.start(t);
      o.stop(t + dur + 0.03);
    } catch (e) {}
  }
  /* Sons suaves: só ondas senoidais/triangulares, volume baixo, sem timbres ásperos */
  const SFX = {
    tap: () => tone(520, 0.08, 'sine', 0.08),
    flip: () => tone(400, 0.08, 'sine', 0.1, 0, 560),
    good: () => { tone(660, 0.12, 'triangle', 0.1); tone(990, 0.18, 'triangle', 0.09, 0.08); },
    bad: () => tone(240, 0.22, 'sine', 0.09, 0, 170),
    flap: () => tone(360, 0.09, 'sine', 0.06, 0, 560),
    hit: () => { tone(200, 0.28, 'sine', 0.12, 0, 90); },
    pop: () => tone(780, 0.09, 'sine', 0.09, 0, 1100),
    gold: () => { [880, 1175, 1480].forEach((f, i) => tone(f, 0.14, 'triangle', 0.09, i * 0.06)); },
    count: () => tone(440, 0.14, 'sine', 0.09),
    go: () => tone(660, 0.28, 'triangle', 0.1, 0, 990),
    win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.24, 'triangle', 0.1, i * 0.12)); },
    step(n) { tone(420 + n * 38, 0.12, 'triangle', 0.1); },
  };

  Arcade.sfx = {
    unlock: ensureAudio,
    get muted() { return muted; },
    setMuted(v) { muted = !!v; },
    play(name, arg) {
      ensureAudio();
      const f = SFX[name];
      if (f) f(arg);
    },
  };

  /* ---------- Partículas (canvas global) + textos flutuantes ---------- */
  const fxc = document.getElementById('fx');
  const fctx = fxc.getContext('2d');
  let parts = [];
  let raf = 0;
  let last = 0;
  function resizeFx() {
    fxc.width = window.innerWidth;
    fxc.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeFx);
  resizeFx();

  function frame(t) {
    const dt = Math.min(0.04, (t - last) / 1000 || 0.016);
    last = t;
    fctx.clearRect(0, 0, fxc.width, fxc.height);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      fctx.globalAlpha = Math.min(1, p.life / (p.max * 0.5));
      fctx.fillStyle = p.color;
      fctx.save();
      fctx.translate(p.x, p.y);
      fctx.rotate(p.rot);
      if (p.shape === 'r') fctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
      else { fctx.beginPath(); fctx.arc(0, 0, p.size / 2, 0, 6.2832); fctx.fill(); }
      fctx.restore();
    }
    fctx.globalAlpha = 1;
    raf = parts.length ? requestAnimationFrame(frame) : 0;
  }
  function kick() {
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  const COLORS = ['#E90370', '#1FC3EE', '#F7AF05', '#8DC63F', '#9B3FC0', '#035FB2'];
  const U = Arcade.util;
  Arcade.fx = {
    /* Partículas suaves e curtas. Com movimento reduzido: nenhuma. */
    burst(x, y, color, n) {
      if (Arcade.reduceMotion) return;
      n = Math.round((n || 14) * 0.7);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.2832;
        const s = U.rand(70, 240);
        parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 50, g: 420, life: U.rand(0.5, 0.9), max: 0.9,
          size: U.rand(6, 12), color: color || COLORS[i % COLORS.length], rot: 0, vr: 0, shape: 'c' });
      }
      kick();
    },
    confetti(amount) {
      if (Arcade.reduceMotion) return;
      amount = Math.round((amount || 130) * 0.45);
      const w = fxc.width;
      for (let i = 0; i < amount; i++) {
        parts.push({ x: U.rand(0, w), y: U.rand(-80, -10), vx: U.rand(-50, 50), vy: U.rand(70, 200), g: 90,
          life: U.rand(2.4, 4), max: 4, size: U.rand(10, 18), color: COLORS[i % COLORS.length],
          rot: U.rand(0, 6), vr: U.rand(-2.5, 2.5), shape: i % 3 ? 'c' : 'r' });
      }
      kick();
    },
    /* kind: 'good' | 'gold' | 'bad' */
    floatText(x, y, text, kind) {
      const el = document.createElement('div');
      el.className = 'float-text ft-' + (kind || 'good');
      el.textContent = text;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      document.getElementById('app').appendChild(el);
      setTimeout(() => el.remove(), 950);
    },
  };

  /* ---------- Proteções para totem touchscreen ---------- */
  const stop = (e) => e.preventDefault();
  ['contextmenu', 'selectstart', 'dragstart', 'gesturestart', 'gesturechange', 'gestureend', 'dblclick'].forEach((ev) =>
    document.addEventListener(ev, stop, { passive: false })
  );
  document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('touchmove', stop, { passive: false });
  document.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && ['+', '-', '=', '0'].includes(e.key)) e.preventDefault();
  });
})();
