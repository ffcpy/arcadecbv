/* JOGO 2 — Ligue os Pontos (3 níveis: fácil, médio, difícil) */
(function () {
  'use strict';
  const A = window.Arcade;

  function star() {
    const p = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const r = k % 2 === 0 ? 0.46 : 0.2;
      p.push([0.5 + r * Math.cos(a), 0.54 + r * Math.sin(a)]);
    }
    return p;
  }
  function heart() {
    // amostra a curva densamente e escolhe 16 pontos igualmente espaçados por comprimento de arco
    const N = 600, raw = [];
    for (let k = 0; k <= N; k++) {
      const t = Math.PI + (k * 2 * Math.PI) / N;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      raw.push([0.5 + x / 36, 0.5 + (y - 2.5) / 36]);
    }
    const cum = [0];
    for (let k = 1; k <= N; k++) cum.push(cum[k - 1] + Math.hypot(raw[k][0] - raw[k - 1][0], raw[k][1] - raw[k - 1][1]));
    const p = [];
    for (let i = 0, k = 0; i < 16; i++) {
      const target = (cum[N] * i) / 16;
      while (cum[k] < target) k++;
      p.push(raw[k]);
    }
    return p;
  }
  const SHAPES = [
    { level: 'Fácil', name: 'Estrela!', color: '#F7AF05', num: '#1E2A5A', pts: star() },
    { level: 'Médio', name: 'Casinha!', color: '#1FC3EE', num: '#1E2A5A',
      pts: [[.18, .88], [.18, .5], [.5, .14], [.62, .275], [.62, .1], [.74, .1], [.74, .41], [.82, .5], [.82, .88]] },
    { level: 'Difícil', name: 'Coração!', color: '#E90370', num: '#ffffff', pts: heart() },
  ];
  const TOTAL_TIME = 60;

  A.games.dots = {
    id: 'dots',
    title: 'Ligue os Pontos',
    color: '#035FB2', dark: '#02427F', tint: '#DDF0FF', on: '#ffffff',
    desc: 'Una os pontos na ordem e revele a figura!',
    how: [['route', 'Toque ou arraste seguindo os números: 1, 2, 3…'], ['sparkle', 'Complete a figura para revelar a surpresa'], ['target', 'Escolha o ponto certo — são 3 níveis!']],
    countdown: true,
    countdownStart: '1:00',

    create(stage, api) {
      const U = api.util;
      const cv = document.createElement('canvas');
      cv.className = 'full-canvas';
      stage.appendChild(cv);
      const ctx = cv.getContext('2d');
      let W = 0, H = 0, dpr = 1, S = 1, cx = 0, cy = 0;

      let round = 0, dots = [], next = 0, score = 0, correct = 0, errors = 0;
      let phase = 'idle'; // idle | play | reveal | end
      let revealT = 0, drag = false, pos = { x: 0, y: 0 }, lastHit = -1, lastWrongAt = 0;
      let tStart = 0, running = false, raf = 0, ended = false, figures = 0, lastT = 0;
      const timeouts = [];
      const later = (fn, ms) => { const t = setTimeout(fn, ms); timeouts.push(t); };

      function layout() {
        W = stage.clientWidth || 800; H = stage.clientHeight || 450;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = W * dpr; cv.height = H * dpr;
        S = Math.min(W * 0.9, H * 0.86);
        cx = W / 2; cy = H / 2 + H * 0.02;
        placeDots();
      }
      function placeDots() {
        const sh = SHAPES[round];
        const old = dots;
        dots = sh.pts.map((p, i) => ({
          x: cx + (p[0] - 0.5) * S, y: cy + (p[1] - 0.5) * S,
          done: old[i] ? old[i].done : false, shake: 0,
        }));
      }
      const R = () => Math.max(20, Math.min(W, H) * 0.04);

      function loadRound() {
        phase = 'play'; next = 0; revealT = 0; lastHit = -1; drag = false;
        dots = []; placeDots();
      }

      function hit(p, mult) {
        const r = R() * mult;
        let best = -1, bd = 1e9;
        for (let i = 0; i < dots.length; i++) {
          const d = Math.hypot(dots[i].x - p.x, dots[i].y - p.y);
          if (d <= r && d < bd) { bd = d; best = i; }
        }
        return best;
      }

      function connect(i) {
        const d = dots[i];
        d.done = true; next++; correct++; score += 50;
        api.setScore(score);
        api.sfx.play('step', next);
        const r = cv.getBoundingClientRect();
        api.fx.burst(r.left + d.x, r.top + d.y, SHAPES[round].color, 8);
        if (next === dots.length) completeRound();
      }

      function wrong(i) {
        const now = performance.now();
        if (i === lastHit && now - lastWrongAt < 500) return;
        lastWrongAt = now;
        dots[i].shake = 0.35;
        errors++; score = Math.max(0, score - 20);
        api.setScore(score);
        api.sfx.play('bad');
        const r = cv.getBoundingClientRect();
        api.fx.floatText(r.left + dots[i].x, r.top + dots[i].y - 30, '-20', 'bad');
      }

      function attempt(i, isTap) {
        if (phase !== 'play') return;
        if (i === next) connect(i);
        else if (i > next && (isTap || i !== lastHit)) wrong(i);
        lastHit = i;
      }

      function completeRound() {
        phase = 'reveal'; revealT = 0; figures++;
        score += 100;
        api.setScore(score);
        api.sfx.play('win');
        const r = cv.getBoundingClientRect();
        api.fx.burst(r.left + cx, r.top + cy, null, 36);
        later(() => {
          if (ended) return;
          if (round < SHAPES.length - 1) { round++; loadRound(); }
          else finish(true);
        }, 1900);
      }

      function finish(complete) {
        if (ended) return;
        ended = true; phase = 'end'; running = false;
        const left = complete ? Math.max(0, TOTAL_TIME - (performance.now() - tStart) / 1000) : 0;
        const bonus = Math.round(left * 8);
        score += bonus;
        api.setScore(score);
        const prec = correct + errors ? Math.round((correct / (correct + errors)) * 100) : 0;
        if (complete) api.fx.confetti(120);
        api.finish({
          score,
          stars: score >= 1900 ? 3 : score >= 1200 ? 2 : 1,
          title: complete ? 'Todas as figuras!' : 'O tempo acabou!',
          stats: [
            { label: 'Figuras', value: figures + '/3' },
            { label: 'Precisão', value: prec + '%' },
            { label: 'Erros', value: errors },
            { label: 'Bônus de tempo', value: '+' + bonus },
          ],
          delay: complete ? 1200 : 700,
        });
      }

      /* ----- entrada ----- */
      cv.addEventListener('pointerdown', (e) => {
        if (phase !== 'play') return;
        try { cv.setPointerCapture(e.pointerId); } catch (err) {}
        pos = U.local(cv, e); drag = true;
        const i = hit(pos, 1.5);
        if (i >= 0) {
          const nxt = hit(pos, 1.6);
          if (nxt === next) attempt(next, true);
          else { const w = hit(pos, 1.0); if (w >= 0) attempt(w, true); }
        } else api.sfx.play('tap');
      });
      cv.addEventListener('pointermove', (e) => {
        if (!drag || phase !== 'play') return;
        pos = U.local(cv, e);
        if (next < dots.length && Math.hypot(dots[next].x - pos.x, dots[next].y - pos.y) <= R() * 1.6) { attempt(next, false); return; }
        const w = hit(pos, 1.0);
        if (w >= 0 && w !== next) attempt(w, false); else if (w < 0) lastHit = -1;
      });
      const up = () => { drag = false; lastHit = -1; };
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', up);

      /* ----- desenho ----- */
      const FONT = '"Fredoka","Nunito","Segoe UI",sans-serif';
      function draw(dt) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        const sh = SHAPES[round];
        const r = R();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';

        // indicador da figura e do nível (canto superior esquerdo)
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillStyle = '#1E2A5A';
        ctx.font = `600 ${Math.round(H * 0.052)}px ${FONT}`;
        ctx.fillText(`Figura ${round + 1} de 3`, 28, 20);
        const lw = H * 0.05;
        ctx.fillStyle = sh.color;
        ctx.beginPath(); ctx.arc(28 + lw * 0.45, 20 + H * 0.075 + lw * 0.5, lw * 0.4, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#4A5687';
        ctx.font = `700 ${Math.round(H * 0.044)}px ${FONT}`;
        ctx.fillText(sh.level, 28 + lw * 1.1, 20 + H * 0.075 + lw * 0.12);

        // revelação
        if (phase === 'reveal') {
          revealT += dt;
          const k = Math.min(1, revealT / 0.8);
          ctx.beginPath();
          dots.forEach((d, i) => (i ? ctx.lineTo(d.x, d.y) : ctx.moveTo(d.x, d.y)));
          ctx.closePath();
          const g = ctx.createLinearGradient(cx, cy - S / 2, cx, cy + S / 2);
          g.addColorStop(0, sh.color); g.addColorStop(1, '#ffffff');
          ctx.globalAlpha = 0.85 * k; ctx.fillStyle = g; ctx.fill(); ctx.globalAlpha = 1;
        }

        // linhas conectadas
        ctx.strokeStyle = sh.color; ctx.lineWidth = r * 0.42;
        ctx.beginPath();
        for (let i = 0; i < next; i++) (i ? ctx.lineTo(dots[i].x, dots[i].y) : ctx.moveTo(dots[i].x, dots[i].y));
        if (phase === 'reveal' && dots.length) ctx.closePath();
        ctx.stroke();
        // linha seguindo o dedo
        if (drag && phase === 'play' && next > 0) {
          ctx.globalAlpha = 0.5; ctx.beginPath();
          ctx.moveTo(dots[next - 1].x, dots[next - 1].y); ctx.lineTo(pos.x, pos.y); ctx.stroke(); ctx.globalAlpha = 1;
        }

        // pontos (o próximo "respira" devagar; parado se o sistema pede menos movimento)
        const pulse = A.reduceMotion ? 1 : 1 + Math.sin(performance.now() / 420) * 0.06;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        dots.forEach((d, i) => {
          let ox = 0;
          if (d.shake > 0) { d.shake -= dt; ox = A.reduceMotion ? 0 : Math.sin(d.shake * 50) * 5; }
          const isNext = phase === 'play' && i === next;
          const rr = r * (isNext ? pulse : 1);
          if (isNext) {
            ctx.strokeStyle = sh.color; ctx.lineWidth = 6; ctx.globalAlpha = 0.45;
            ctx.beginPath(); ctx.arc(d.x, d.y, rr * 1.42, 0, 6.2832); ctx.stroke(); ctx.globalAlpha = 1;
          }
          ctx.beginPath(); ctx.arc(d.x + ox, d.y, rr, 0, 6.2832);
          ctx.fillStyle = d.shake > 0 ? '#FFD9E8' : d.done ? sh.color : '#ffffff';
          ctx.fill();
          ctx.lineWidth = 5; ctx.strokeStyle = d.shake > 0 ? '#E90370' : d.done ? '#ffffff' : sh.color; ctx.stroke();
          ctx.fillStyle = d.shake > 0 || !d.done ? '#1E2A5A' : sh.num;
          ctx.font = `600 ${Math.round(r * 1.05)}px ${FONT}`;
          ctx.fillText(i + 1, d.x + ox, d.y + 2);
        });

        // nome da figura revelada
        if (phase === 'reveal') {
          const k = Math.min(1, revealT / 0.6);
          ctx.font = `700 ${Math.round(S * 0.14)}px ${FONT}`;
          ctx.globalAlpha = k;
          ctx.lineWidth = S * 0.025; ctx.strokeStyle = '#ffffff'; ctx.strokeText(sh.name, cx, cy + S * 0.02);
          ctx.fillStyle = '#1E2A5A'; ctx.fillText(sh.name, cx, cy + S * 0.02);
          ctx.globalAlpha = 1;
        }
      }

      function loop(t) {
        raf = requestAnimationFrame(loop);
        const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
        lastT = t;
        if (running && !ended) {
          const left = TOTAL_TIME - (performance.now() - tStart) / 1000;
          api.setTime(U.fmtTime(Math.ceil(left)), left <= 10);
          if (left <= 0) finish(false);
        }
        draw(dt);
      }

      const ro = new ResizeObserver(layout);
      ro.observe(stage);
      layout();
      loadRound();
      phase = 'idle';
      raf = requestAnimationFrame(loop);

      return {
        debug() { const r = cv.getBoundingClientRect(); return { next, round, dots: dots.map((p) => ({ x: r.left + p.x, y: r.top + p.y })) }; },
        begin() { phase = 'play'; running = true; tStart = performance.now(); },
        destroy() {
          ended = true; running = false;
          cancelAnimationFrame(raf); ro.disconnect(); timeouts.forEach(clearTimeout);
        },
      };
    },
  };
})();
