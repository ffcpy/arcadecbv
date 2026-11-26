/* JOGO 5 — Roleta da Sorte (3 figuras iguais = brinde) */
(function () {
  'use strict';
  const A = window.Arcade;

  /* ===== Ajustes de premiação =====
     ATTEMPTS   : giros por visitante (vale para a sessão inteira, mesmo saindo e voltando)
     WIN_CHANCE : chance de cada giro dar 3 iguais. Com 0,35 e 3 giros, ~72% dos visitantes ganham.
     NEAR_MISS  : nos giros perdidos, chance de aparecerem 2 figuras iguais ("quase!") */
  const ATTEMPTS = 3;
  const WIN_CHANCE = 0.35;
  const NEAR_MISS = 0.6;
  const SEQ_LEN = 10; // cada figura aparece 2x na fita de cada rolo
  const mod = (n, m) => ((n % m) + m) % m;

  const usedOf = (s) => (s.roulette ? s.roulette.used : 0);

  A.games.roulette = {
    id: 'roulette',
    title: 'Roleta da Sorte',
    color: '#9B3FC0', dark: '#6B2088', tint: '#F2E4FA', on: '#ffffff',
    desc: 'Alinhe 3 figuras iguais e ganhe um brinde!',
    how: [
      ['puzzle', 'Toque em GIRAR para rodar a roleta'],
      ['sparkle', 'Alinhe 3 figuras iguais na linha rosa'],
      ['gift', `Você tem ${ATTEMPTS} tentativas — acertou, ganhou um brinde!`],
    ],
    countdown: false,
    noRestart: true, // reiniciar não pode devolver as tentativas
    locked: (s) => !!(s.roulette && (s.roulette.won || s.roulette.used >= ATTEMPTS)),
    lockedLabel: (s) => (s.roulette && s.roulette.won ? 'Brinde ganho!' : 'Já participou'),

    create(stage, api) {
      const U = api.util;
      const S = A.reel;
      const N = S.length;
      const st = api.session.roulette || (api.session.roulette = { used: 0, won: false });

      /* fita de cada rolo: todas as figuras 2x, embaralhadas, sem vizinhas iguais */
      function makeSeq() {
        const base = [];
        for (let k = 0; k < SEQ_LEN; k++) base.push(k % N);
        for (let tries = 0; tries < 60; tries++) {
          const a = U.shuffle(base);
          if (a.every((v, i) => v !== a[(i + 1) % SEQ_LEN])) return a;
        }
        return base;
      }
      const seqs = [makeSeq(), makeSeq(), makeSeq()];
      const pos = [0, 0, 0];

      stage.innerHTML = `
        <div class="rl">
          <div class="rl-side">
            <span class="chip-ic">${A.icon('puzzle')}</span>
            <small>Tentativas</small>
            <b id="rl-left">${ATTEMPTS - st.used}</b>
            <div class="rl-pieces" id="rl-pieces"></div>
          </div>
          <div class="rl-center">
            <div class="rl-machine">
              <div class="rl-reels">${[0, 1, 2].map((i) => `<div class="reel" data-i="${i}">${[0, 1, 2, 3, 4].map(() => '<div class="rcell"></div>').join('')}</div>`).join('')}</div>
              <div class="rl-line" aria-hidden="true"></div>
            </div>
            <div class="rl-msg" id="rl-msg">Toque em <b>GIRAR</b>!</div>
          </div>
          <div class="rl-side rl-right">
            <button class="rl-spin" id="rl-spin" type="button">${A.icon('puzzle')}<span>GIRAR</span></button>
          </div>
        </div>`;

      const reels = Array.from(stage.querySelectorAll('.reel'));
      const cells = reels.map((r) => Array.from(r.children));
      const elLeft = stage.querySelector('#rl-left');
      const elPieces = stage.querySelector('#rl-pieces');
      const elMsg = stage.querySelector('#rl-msg');
      const spinBtn = stage.querySelector('#rl-spin');

      const say = (html) => { elMsg.innerHTML = html; };
      function paintTries() {
        elLeft.textContent = Math.max(0, ATTEMPTS - st.used);
        elPieces.innerHTML = Array.from({ length: ATTEMPTS }, (_, i) =>
          `<span class="${i < ATTEMPTS - st.used ? 'on' : ''}">${A.puzzle(i < ATTEMPTS - st.used ? '#9B3FC0' : '#D9CFE8')}</span>`).join('');
      }

      /* Desenha um rolo na posição (float): linha 1 = linha de pagamento */
      function draw(i) {
        const p = pos[i];
        const base = Math.floor(p);
        const frac = p - base;
        const seq = seqs[i];
        for (let j = 0; j < 5; j++) {
          const row = j - 1; // -1..3
          const c = cells[i][j];
          const idx = seq[mod(base + 1 - row, SEQ_LEN)];
          if (c._idx !== idx) { c.innerHTML = S[idx].html; c._idx = idx; }
          c.style.transform = `translateY(${(row + frac) * 100}%)`;
        }
      }
      [0, 1, 2].forEach(draw);

      /* ----- sorteio do giro ----- */
      function pickOutcome() {
        if (Math.random() < WIN_CHANCE) { const s = U.randInt(0, N - 1); return { win: true, syms: [s, s, s], pair: false }; }
        if (Math.random() < NEAR_MISS) {
          const a = U.randInt(0, N - 1);
          let b;
          do { b = U.randInt(0, N - 1); } while (b === a);
          const syms = [a, a, a];
          syms[U.randInt(0, 2)] = b;
          return { win: false, syms, pair: true };
        }
        let syms;
        do { syms = [U.randInt(0, N - 1), U.randInt(0, N - 1), U.randInt(0, N - 1)]; } while (syms[0] === syms[1] && syms[1] === syms[2]);
        return { win: false, syms, pair: syms[0] === syms[1] || syms[1] === syms[2] || syms[0] === syms[2] };
      }

      /* ----- animação (rAF) ----- */
      let raf = 0, ended = false, spinning = false, t0 = 0, timer = 0, score = 0, pairs = 0;
      const anims = [null, null, null];
      const timeouts = [];
      const later = (fn, ms) => { const t = setTimeout(fn, ms); timeouts.push(t); };
      const ease = (t) => 1 - (1 - t) * (1 - t);

      function loop(now) {
        let any = false;
        for (let i = 0; i < 3; i++) {
          const a = anims[i];
          if (!a) continue;
          const k = Math.min(1, (now - a.t) / a.dur);
          pos[i] = a.from + a.dist * ease(k);
          draw(i);
          if (k >= 1) { pos[i] = a.to; draw(i); anims[i] = null; a.done(); } else any = true;
        }
        raf = any ? requestAnimationFrame(loop) : 0;
      }

      function spinReel(i, sym, dur, loops, done) {
        const from = mod(pos[i], SEQ_LEN);
        const spots = [];
        seqs[i].forEach((v, k) => { if (v === sym) spots.push(k); });
        const target = spots[U.randInt(0, spots.length - 1)];
        const dist = mod(target - from, SEQ_LEN) + SEQ_LEN * loops;
        anims[i] = { from, to: from + dist, dist, dur, t: performance.now(), done };
        pos[i] = from;
        if (!raf) raf = requestAnimationFrame(loop);
      }

      function spin() {
        if (spinning || ended || st.used >= ATTEMPTS || st.won) return;
        spinning = true;
        spinBtn.disabled = true;
        reels.forEach((r) => r.classList.remove('win'));
        const out = pickOutcome();
        st.used++;
        paintTries();
        say('Girando…');
        api.sfx.play('go');
        const calm = A.reduceMotion;
        let stopped = 0;
        [0, 1, 2].forEach((i) => {
          spinReel(i, out.syms[i], calm ? 500 + i * 250 : 1500 + i * 550, calm ? 0 : 1 + i, () => {
            api.sfx.play('step', i + 1);
            if (++stopped === 3) later(() => settle(out), 250);
          });
        });
      }

      function settle(out) {
        spinning = false;
        const left = ATTEMPTS - st.used;
        if (out.win) {
          st.won = true;
          ended = true;
          score = 1000 + left * 100;
          reels.forEach((r) => r.classList.add('win'));
          say('Três iguais! <b>Você ganhou um brinde!</b>');
          api.setScore(score);
          api.sfx.play('gold');
          reels.forEach((r) => { const b = r.getBoundingClientRect(); api.fx.burst(b.left + b.width / 2, b.top + b.height / 2, '#F7AF05', 14); });
          const b = reels[1].getBoundingClientRect();
          api.fx.floatText(b.left + b.width / 2, b.top, '+' + score, 'gold');
          api.fx.confetti(120);
          const nm = api.lead ? api.lead.name.split(' ')[0] : '';
          api.finish({
            score, stars: 3,
            title: nm ? `Parabéns, ${nm}!` : 'Parabéns!',
            msg: 'Você ganhou um brinde! Fale com à equipe da Bem Viver para retirar.',
            stats: [
              { label: 'Resultado', value: '3 iguais!' },
              { label: 'Tentativas usadas', value: st.used + '/' + ATTEMPTS },
            ],
            detail: `brinde=sim;tentativas=${st.used}`,
            delay: 2400,
          });
          return;
        }
        if (out.pair) { pairs++; score += 50; api.setScore(score); }
        api.sfx.play('bad');
        if (left > 0) {
          say(`${out.pair ? 'Quase!' : 'Não foi dessa vez.'} Tente de novo — ${left === 1 ? 'última tentativa' : left + ' tentativas'}!`);
          spinBtn.disabled = false;
        } else {
          ended = true;
          say('Acabaram as tentativas. Obrigado por jogar!');
          api.finish({
            score, stars: 1,
            title: 'Quase lá!',
            msg: 'Não foi desta vez, mas você pode se divertir com os outros jogos!',
            stats: [
              { label: 'Resultado', value: 'Sem brinde' },
              { label: 'Quase 3 iguais', value: pairs + 'x' },
            ],
            detail: `brinde=nao;tentativas=${st.used}`,
            delay: 1800,
          });
        }
      }

      paintTries();
      spinBtn.addEventListener('click', spin);

      return {
        begin() {
          t0 = performance.now();
          timer = setInterval(() => api.setTime(U.fmtTime((performance.now() - t0) / 1000)), 500);
          if (st.used >= ATTEMPTS || st.won) spinBtn.disabled = true;
          else if (st.used > 0) say(`Você ainda tem ${ATTEMPTS - st.used} ${ATTEMPTS - st.used === 1 ? 'tentativa' : 'tentativas'}!`);
        },
        destroy() {
          ended = true;
          clearInterval(timer);
          cancelAnimationFrame(raf);
          timeouts.forEach(clearTimeout);
        },
      };
    },
  };
})();
