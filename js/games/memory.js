/* JOGO 1 — Jogo da Memória */
(function () {
  'use strict';
  const A = window.Arcade;
  const PAIRS = [0, 1, 2, 3, 4, 5, 6, 7]; // índices de FACES
  // Marcas (Bem Viver, ExpoTEA, mascote, sol), peça do autismo (A.reel) + 3 formas ilustradas
  const FACES = () => A.reel.map((r) => r.html).concat([A.faces[0], A.faces[1], A.faces[3]]);

  A.games.memory = {
    id: 'memory',
    title: 'Jogo da Memória',
    color: '#E90370', dark: '#A8004F', tint: '#FFE4F1', on: '#ffffff',
    desc: 'Vire as cartas e encontre os pares!',
    how: [['tap', 'Toque nas cartas para virar'], ['search', 'Encontre os 8 pares iguais'], ['zap', 'Menos tentativas e mais rapidez = mais pontos']],
    countdown: true,

    create(stage, api) {
      const U = api.util;
      const faces = FACES();
      const deck = U.shuffle(PAIRS.concat(PAIRS));
      stage.innerHTML = `
        <div class="mem">
          <div class="mem-side"><span class="chip-ic">${A.icon('tap')}</span><small>Tentativas</small><b id="m-att">0</b></div>
          <div class="mem-board">${deck
            .map((ic, i) => `<div class="mcard" data-i="${i}"><div class="mcard-in"><div class="mface mback"><span class="plate"><img src="assets/img/bv-symbol.png" alt=""></span></div><div class="mface mfront">${faces[ic]}</div></div></div>`)
            .join('')}</div>
          <div class="mem-side"><span class="chip-ic">${A.icon('check')}</span><small>Pares</small><b id="m-hit">0/8</b></div>
        </div>`;
      const board = stage.querySelector('.mem-board');
      const cards = Array.from(board.children);
      const elAtt = stage.querySelector('#m-att');
      const elHit = stage.querySelector('#m-hit');

      let first = -1, lock = true, attempts = 0, matches = 0, t0 = 0, timer = 0, ended = false;
      const timeouts = [];
      const later = (fn, ms) => { const t = setTimeout(fn, ms); timeouts.push(t); };
      const live = () => Math.max(0, matches * 100 - (attempts - matches) * 10);

      function onDown(e) {
        const c = e.target.closest('.mcard');
        if (!c || lock || ended) return;
        const i = +c.dataset.i;
        if (c.classList.contains('flip') || c.classList.contains('done')) return;
        c.classList.add('flip');
        api.sfx.play('flip');
        if (first < 0) { first = i; return; }
        const a = first;
        first = -1;
        attempts++;
        elAtt.textContent = attempts;
        if (deck[a] === deck[i]) {
          matches++;
          elHit.textContent = matches + '/8';
          lock = true;
          later(() => {
            [a, i].forEach((k) => {
              cards[k].classList.add('done');
              const r = cards[k].getBoundingClientRect();
              api.fx.burst(r.left + r.width / 2, r.top + r.height / 2, '#F7AF05', 12);
            });
            const r = cards[i].getBoundingClientRect();
            api.fx.floatText(r.left + r.width / 2, r.top, '+100', 'gold');
            api.sfx.play('good');
            api.setScore(live());
            lock = false;
            if (matches === 8) finish();
          }, 350);
        } else {
          lock = true;
          api.setScore(live());
          later(() => {
            cards[a].classList.add('wrong');
            cards[i].classList.add('wrong');
            api.sfx.play('bad');
          }, 300);
          later(() => {
            [a, i].forEach((k) => cards[k].classList.remove('flip', 'wrong'));
            lock = false;
          }, 900);
        }
      }

      function finish() {
        ended = true;
        clearInterval(timer);
        const secs = (performance.now() - t0) / 1000;
        const bonus = Math.round(Math.max(0, 90 - secs) * 6);
        const score = live() + bonus;
        api.setScore(score);
        api.sfx.play('win');
        cards.forEach((c, k) => { c.style.animationDelay = k * 40 + 'ms'; c.classList.add('celebrate'); });
        api.fx.confetti(70);
        api.finish({
          score,
          stars: score >= 1000 ? 3 : score >= 700 ? 2 : 1,
          title: 'Todos os pares!',
          stats: [
            { label: 'Tempo', value: U.fmtTime(secs) },
            { label: 'Tentativas', value: attempts },
            { label: 'Acertos', value: matches + '/8' },
            { label: 'Bônus de velocidade', value: '+' + bonus },
          ],
          delay: 1500,
        });
      }

      board.addEventListener('pointerdown', onDown);

      return {
        begin() {
          lock = false;
          t0 = performance.now();
          timer = setInterval(() => api.setTime(U.fmtTime((performance.now() - t0) / 1000)), 250);
        },
        destroy() {
          ended = true;
          clearInterval(timer);
          timeouts.forEach(clearTimeout);
        },
      };
    },
  };
})();
