/* JOGO 4 — Reflexo Rápido (30 segundos) */
(function () {
  'use strict';
  const A = window.Arcade;
  const DURATION = 30;

  A.games.reflex = {
    id: 'reflex',
    title: 'Reflexo Rápido',
    color: '#8DC63F', dark: '#4F7F12', tint: '#EAF6D5', on: '#1E2A5A',
    desc: 'Toque nos alvos antes que eles sumam!',
    how: [['target', 'Toque nos alvos assim que aparecerem'], ['star', 'Alvos dourados valem o dobro'], ['xcircle', 'Tocar fora dos alvos tira pontos']],
    countdown: true,
    countdownStart: '0:30',

    create(stage, api) {
      const U = api.util;
      stage.innerHTML = '<div class="reflex"><div class="combo" id="r-combo"></div></div>';
      const arena = stage.firstChild;
      const comboEl = arena.querySelector('#r-combo');

      let score = 0, hits = 0, misses = 0, expired = 0, combo = 0, bestCombo = 0;
      let t0 = 0, running = false, ended = false, spawnT = 0, clockT = 0;
      const live = new Set();
      const timeouts = new Set();
      const later = (fn, ms) => { const id = setTimeout(() => { timeouts.delete(id); fn(); }, ms); timeouts.add(id); return id; };

      const progress = () => U.clamp((performance.now() - t0) / 1000 / DURATION, 0, 1);

      function setCombo(n) {
        combo = n;
        bestCombo = Math.max(bestCombo, n);
        comboEl.textContent = n >= 2 ? 'Combo x' + n : '';
        comboEl.classList.toggle('on', n >= 2);
      }

      function spawn() {
        if (!running) return;
        const d = progress();
        const life = 1.8 - 1.0 * d; // 1,8s -> 0,8s
        const size = Math.round(arena.clientHeight * 0.2);
        const W = arena.clientWidth, H = arena.clientHeight;
        let x = 0, y = 0;
        for (let tries = 0; tries < 14; tries++) {
          x = U.rand(14, W - size - 14); y = U.rand(14, H - size - 14);
          let ok = true;
          live.forEach((t) => { if (Math.hypot(t.x - x, t.y - y) < size * 1.15) ok = false; });
          if (ok) break;
        }
        const gold = Math.random() < 0.14;
        const el = document.createElement('div');
        el.className = 'target ' + (gold ? 'gold' : 'c' + U.randInt(0, 3));
        el.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;--life:${life}s`;
        el.innerHTML = '<i class="ring"></i><span>' + (gold ? '★' : '') + '</span>';
        const t = { el, x, y, born: performance.now(), life, gold, dead: false };
        live.add(t);
        arena.appendChild(el);
        t.timer = later(() => expire(t), life * 1000);
        later(spawn, 900 - 520 * d + U.rand(-80, 80));
      }

      function remove(t, cls) {
        t.dead = true;
        live.delete(t);
        t.el.classList.add(cls);
        later(() => t.el.remove(), 260);
      }

      function expire(t) {
        if (t.dead || ended) return;
        expired++;
        setCombo(0);
        remove(t, 'gone');
        api.sfx.play('tap');
      }

      function hit(t, e) {
        e.stopPropagation();
        if (t.dead || !running) return;
        clearTimeout(t.timer);
        const frac = 1 - (performance.now() - t.born) / (t.life * 1000);
        setCombo(combo + 1);
        let pts = 10 + Math.round(10 * U.clamp(frac, 0, 1)) + Math.min(combo, 10) * 3;
        if (t.gold) pts *= 2;
        score += pts; hits++;
        api.setScore(score);
        remove(t, 'hit');
        api.sfx.play(t.gold ? 'gold' : 'pop');
        const r = t.el.getBoundingClientRect();
        api.fx.burst(r.left + r.width / 2, r.top + r.height / 2, t.gold ? '#F7AF05' : null, t.gold ? 22 : 12);
        api.fx.floatText(r.left + r.width / 2, r.top, '+' + pts, t.gold ? 'gold' : 'good');
      }

      arena.addEventListener('pointerdown', (e) => {
        if (!running) return;
        const el = e.target.closest('.target');
        if (el) {
          for (const t of live) if (t.el === el) { hit(t, e); return; }
          return; // alvo já removido: ignora
        }
        // toque fora dos alvos = penalidade
        misses++; setCombo(0);
        score = Math.max(0, score - 25);
        api.setScore(score);
        api.sfx.play('bad');
        const r = arena.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        const mark = document.createElement('div');
        mark.className = 'miss-mark';
        mark.style.left = x + 'px'; mark.style.top = y + 'px';
        arena.appendChild(mark);
        later(() => mark.remove(), 600);
        api.fx.floatText(e.clientX, e.clientY - 30, '-25', 'bad');
      });

      function tick() {
        const left = DURATION - (performance.now() - t0) / 1000;
        api.setTime(U.fmtTime(Math.ceil(left)), left <= 5);
        if (left <= 0) finish();
      }

      function finish() {
        if (ended) return;
        ended = true; running = false;
        clearInterval(clockT);
        live.forEach((t) => { clearTimeout(t.timer); t.el.remove(); });
        live.clear();
        api.setTime('0:00', true);
        api.sfx.play('win');
        const total = hits + misses + expired;
        const acc = total ? Math.round((hits / total) * 100) : 0;
        api.finish({
          score,
          stars: score >= 900 ? 3 : score >= 450 ? 2 : 1,
          title: 'O tempo acabou!',
          stats: [
            { label: 'Acertos', value: hits },
            { label: 'Maior combo', value: 'x' + bestCombo },
            { label: 'Toques fora', value: misses },
            { label: 'Precisão', value: acc + '%' },
          ],
          delay: 600,
        });
      }

      return {
        begin() {
          running = true; t0 = performance.now();
          clockT = setInterval(tick, 200);
          spawn();
        },
        destroy() {
          ended = true; running = false;
          clearInterval(clockT);
          timeouts.forEach(clearTimeout); timeouts.clear();
        },
      };
    },
  };
})();
