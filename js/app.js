/* Fluxo principal: telas, sessão, HUD, resultado e retorno por inatividade. */
(function () {
  'use strict';
  const A = window.Arcade;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const IDLE_WARN = 45; // s sem toque até o aviso
  const IDLE_RESET = 60; // s sem toque até voltar ao início

  const screens = { home: $('#home'), signup: $('#signup'), select: $('#select'), game: $('#game'), prize: $('#prize'), result: $('#result') };
  const stage = $('#stage');
  const overlay = $('#overlay');
  const hudScore = $('#hud-score');
  const hudTime = $('#hud-time');
  let current = 'home';

  /* Sessão: existe só em memória */
  const session = { total: 0, best: {}, plays: {}, lead: null, roulette: null, prize: null };
  const run = { id: null, ctrl: null, token: 0 };

  function show(name) {
    current = name;
    for (const k in screens) screens[k].classList.toggle('active', k === name);
  }

  /* Cores do jogo aplicadas como variáveis CSS (cartões, HUD, botões, resultado) */
  function paint(el, g) {
    el.style.setProperty('--c', g.color);
    el.style.setProperty('--c-d', g.dark);
    el.style.setProperty('--c-t', g.tint);
    el.style.setProperty('--c-on', g.on);
  }
  const paintStyle = (g) => `--c:${g.color};--c-d:${g.dark};--c-t:${g.tint};--c-on:${g.on}`;

  /* ---------- Ícones estáticos da interface ---------- */
  $('#btn-play').innerHTML = A.icon('play') + 'Começar';
  $('#btn-home').innerHTML = A.icon('home') + 'Início';
  $('#btn-exit').innerHTML = A.icon('back') + 'Voltar';
  $('#btn-restart').innerHTML = A.icon('restart') + 'Reiniciar';
  $('#sel-ic').innerHTML = A.icon('star');
  $('#hud-clock').innerHTML = A.icon('clock');
  $('#hud-star').innerHTML = A.icon('star');
  $('#idle-mascot').innerHTML = A.art.sun;
  $('#rot-ic').innerHTML = A.icon('restart');
  $('#home-tiles').innerHTML =
    A.order.map((id) => `<div class="tile" style="${paintStyle(A.games[id])}">${A.art[id]}</div>`).join('') +
    `<div class="mascot-wrap">${A.art.sun}</div>`;
  if (document.fonts && document.fonts.load) { document.fonts.load('600 1rem Fredoka'); document.fonts.load('700 1rem Nunito'); }

  /* ---------- Som ligado/desligado ---------- */
  function paintSound() {
    $$('.btn-sound').forEach((b) => { b.innerHTML = A.icon(A.sfx.muted ? 'mute' : 'vol'); b.setAttribute('aria-pressed', A.sfx.muted ? 'true' : 'false'); });
  }
  paintSound();
  $$('.btn-sound').forEach((b) =>
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      A.sfx.setMuted(!A.sfx.muted);
      paintSound();
      A.sfx.play('tap');
    })
  );

  /* ---------- Tela de seleção ---------- */
  function playedCount() {
    return A.order.filter((id) => session.plays[id] > 0).length;
  }
  const T = A.order.length;
  function renderSelect() {
    $('#sel-total').textContent = session.total;
    const n = playedCount();
    $('#medals').innerHTML = A.order
      .map((id) => `<span class="medal ${session.plays[id] ? 'on' : ''}" style="${paintStyle(A.games[id])}">${session.plays[id] ? A.art[id] : '?'}</span>`)
      .join('');
    $('#progress-text').innerHTML =
      n === 0 ? `Experimente os <b>${T} brincadeiras</b> e vire <b>Mestre do Arcade</b>!` :
      n < T ? `<b>${n} de ${T}</b> brincadeiras exploradas — faltam ${T - n}!` :
      '<b>Mestre do Arcade!</b> Que tal bater seus recordes?';
    $('#cards').innerHTML = A.order
      .map((id) => {
        const g = A.games[id];
        const played = session.plays[id] > 0;
        const locked = !!(g.locked && g.locked(session));
        return `<button class="card-game ${locked ? 'locked' : ''}" type="button" data-id="${id}" style="${paintStyle(g)}">
          ${played ? `<span class="badge ok">${A.icon('check')}Jogado</span>` : '<span class="badge new">Novo</span>'}
          <span class="cg-art">${A.art[id]}</span>
          <span class="cg-title">${g.title}</span>
          <span class="cg-desc">${g.desc}</span>
          <span class="cg-cta">${locked ? `${A.icon('gift')}${g.lockedLabel(session)}` : played ? `${A.icon('star')}Recorde <b>${session.best[id]}</b>` : `${A.icon('play')}Jogar`}</span>
        </button>`;
      })
      .join('');
  }
  $('#cards').addEventListener('click', (e) => {
    const b = e.target.closest('.card-game');
    if (!b) return;
    A.sfx.play('tap');
    if (b.classList.contains('locked')) return;
    startGame(b.dataset.id, false);
  });

  /* ---------- Jogo ---------- */
  function stopGame() {
    run.token++;
    if (run.ctrl) { try { run.ctrl.destroy(); } catch (e) { console.error(e); } }
    run.ctrl = null;
    run.id = null;
    stage.innerHTML = '';
    stage.className = 'stage';
    overlay.innerHTML = '';
    overlay.classList.remove('show');
  }

  function setScore(n) {
    hudScore.textContent = n;
    if (A.reduceMotion) return;
    hudScore.classList.remove('bump');
    void hudScore.offsetWidth;
    hudScore.classList.add('bump');
  }

  function makeApi(token, id) {
    let done = false;
    return {
      sfx: A.sfx, fx: A.fx, util: A.util,
      session,
      get lead() { return session.lead; },
      setScore,
      setTime(txt, warn) {
        hudTime.textContent = txt;
        hudTime.classList.toggle('warn', !!warn);
      },
      finish(res) {
        if (done) return;
        done = true;
        setTimeout(() => {
          if (token === run.token) showResult(id, res);
        }, res.delay == null ? 900 : res.delay);
      },
    };
  }

  function exitToSelect() {
    A.sfx.play('tap');
    stopGame();
    renderSelect();
    show('select');
  }

  function startGame(id, skipIntro) {
    const g = A.games[id];
    stopGame();
    const token = run.token;
    run.id = id;
    paint($('#game'), g);
    $('#hud-art').innerHTML = A.art[id];
    $('#hud-name').textContent = g.title;
    hudScore.textContent = '0';
    hudTime.textContent = g.countdownStart || '0:00';
    hudTime.classList.remove('warn');
    stage.className = 'stage s-' + id;
    $('#btn-restart').hidden = !!g.noRestart;
    show('game');
    run.ctrl = g.create(stage, makeApi(token, id));

    const go = () => {
      if (token !== run.token) return;
      if (g.countdown === false) { overlay.classList.remove('show'); overlay.innerHTML = ''; run.ctrl.begin(); return; }
      let n = 3;
      overlay.classList.add('show');
      const tick = () => {
        if (token !== run.token) return;
        if (n > 0) {
          overlay.innerHTML = `<div class="count">${n}</div>`;
          A.sfx.play('count');
          n--;
          setTimeout(tick, 650);
        } else {
          overlay.innerHTML = '<div class="count go">Vai!</div>';
          A.sfx.play('go');
          run.ctrl.begin();
          setTimeout(() => { if (token === run.token) { overlay.classList.remove('show'); overlay.innerHTML = ''; } }, 600);
        }
      };
      tick();
    };

    if (skipIntro) { go(); return; }
    overlay.classList.add('show');
    overlay.innerHTML = `<div class="intro">
        <div class="intro-art">${A.art[id]}</div>
        <div class="intro-body">
          <h2>${g.title}</h2>
          <ul class="steps">${g.how.map((h) => `<li><span class="step-ic">${A.icon(h[0])}</span><span>${h[1]}</span></li>`).join('')}</ul>
          <div class="intro-actions">
            <button class="btn btn-big btn-game gentle-pulse" id="btn-start" type="button">${A.icon('play')}Começar</button>
            <button class="btn btn-big btn-ghost" id="btn-intro-back" type="button">${A.icon('back')}Voltar</button>
          </div>
        </div>
      </div>`;
    $('#btn-start').addEventListener('click', () => { A.sfx.play('tap'); go(); });
    $('#btn-intro-back').addEventListener('click', exitToSelect);
  }

  $('#btn-exit').addEventListener('click', exitToSelect);
  $('#btn-restart').addEventListener('click', () => {
    if (!run.id) return;
    A.sfx.play('tap');
    startGame(run.id, true);
  });

  /* ---------- Resultado ---------- */
  const MSGS = {
    3: ['Incrível! Você arrasou!', 'Que partida maravilhosa!', 'Você foi muito longe!'],
    2: ['Muito bem! Quase perfeito!', 'Mandou bem demais!', 'Show! Dá para ir ainda mais longe!'],
    1: ['Bom começo! Que tal mais uma vez?', 'Você consegue mais! Tente de novo.', 'Aquecimento feito! Vamos de novo?'],
  };
  const NEXT_SECS = 35; // tempo na tela de resultado antes do próximo visitante
  let nextTimer = 0;

  function showResult(id, res) {
    const g = A.games[id];
    const score = Math.max(0, Math.round(res.score));
    const stars = res.stars || 1;
    session.total += score;
    session.plays[id] = (session.plays[id] || 0) + 1;
    const newRecord = score > (session.best[id] || 0);
    if (newRecord) session.best[id] = score;

    stopGame();
    paint($('#result'), g);
    $('#res-mascot').innerHTML = A.art.sun;
    $('#res-title').textContent = res.title || 'Fim de jogo!';
    $('#res-stars').innerHTML = [1, 2, 3]
      .map((i) => `<span class="star ${i <= stars ? 'on' : ''}" style="animation-delay:${0.5 + i * 0.25}s">${A.icon('star')}</span>`)
      .join('');
    $('#res-stats').innerHTML = (res.stats || [])
      .map((s) => `<div><small>${s.label}</small><b>${s.value}</b></div>`)
      .join('');
    const msgs = MSGS[stars];
    $('#res-msg').textContent = res.msg || (newRecord && session.plays[id] > 1 ? 'Novo recorde! ' : '') + msgs[Math.floor(Math.random() * msgs.length)];
    A.leads.save(session.lead, id, res.detail || 'pontos=' + score);

    const prizeWheel = $('#prize-wheel');
    const prizeButton = $('#btn-prize-spin');
    const prizeResult = $('#prize-result');
    const prizeContinue = $('#btn-prize-continue');
    const prizes = ['Copo Personalizado', 'Caneta', 'Chaveiro CBV', 'Presilha em Flor', 'Botón', 'Relógio'];
    prizeWheel.classList.remove('spinning', 'won');
    prizeWheel.classList.add('resetting');
    prizeWheel.style.transition = 'none';
    prizeWheel.style.setProperty('--spin-angle', '0deg');
    prizeWheel.style.setProperty('--counter-angle', '0deg');
    prizeWheel.style.transform = '';
    void prizeWheel.offsetWidth;
    prizeWheel.classList.remove('resetting');
    prizeWheel.style.removeProperty('transition');
    prizeResult.classList.remove('revealed');
    prizeButton.disabled = false;
    prizeButton.hidden = false;
    prizeContinue.hidden = true;
    prizeResult.textContent = 'Toque para descobrir seu brinde!';
    session.prize = null;
    clearInterval(nextTimer);
    show('prize');

    function showFinalResult() {
      if (current !== 'prize') return;
      $('#res-session').innerHTML = `Obrigado por participar! Total: <b>${score}</b> pontos` + (session.prize
        ? `<div class="res-prize"><b>Você ganhou: ${session.prize}!</b><br>Fale com a equipe e retire seu brinde.</div>`
        : '');
      show('result');
      clearInterval(nextTimer);
      let secs = NEXT_SECS;
      const btnNext = $('#btn-next');
      const paintNext = () => { btnNext.innerHTML = A.icon('play') + `Próximo jogador (${secs})`; };
      paintNext();
      nextTimer = setInterval(() => {
        if (current !== 'result') { clearInterval(nextTimer); return; }
        if (--secs <= 0) { nextPlayer(); return; }
        paintNext();
      }, 1000);

      const el = $('#res-score');
      const t0 = performance.now();
      el.textContent = '0';
      (function count(t) {
        const k = Math.max(0, Math.min(1, (t - t0) / 900));
        el.textContent = Math.round(score * (1 - Math.pow(1 - k, 3)));
        if (k < 1 && current === 'result') requestAnimationFrame(count);
      })(t0);
      A.sfx.play('win');
      A.fx.confetti(stars === 3 ? 160 : stars === 2 ? 90 : 40);
    }

    prizeButton.onclick = async () => {
      if (session.prize) return;
      const prizeLead = session.lead;
      prizeButton.disabled = true;
      prizeResult.textContent = 'Preparando seu sorteio…';
      let draw;
      try {
        const response = await fetch('/api/prize/draw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ t: new Date().toISOString() }),
        });
        draw = await response.json();
        if (response.status === 409) {
          prizeResult.innerHTML = '<b>Os brindes de hoje acabaram.</b><small>Fale com a equipe da Bem Viver.</small>';
          prizeResult.classList.add('revealed');
          prizeButton.hidden = true;
          prizeContinue.hidden = false;
          return;
        }
        if (!response.ok) throw new Error(draw.error || 'Falha ao sortear.');
      } catch (e) {
        prizeResult.textContent = 'Não foi possível sortear. Verifique a conexão e tente novamente.';
        prizeButton.disabled = false;
        return;
      }
      const prize = draw.prize;
      const idx = prizes.indexOf(prize);
      if (idx < 0) {
        prizeResult.textContent = 'Brinde inválido retornado pelo servidor. Tente novamente.';
        prizeButton.disabled = false;
        return;
      }
      prizeWheel.classList.add('spinning');
      A.sfx.play('go');
      const rotation = 360 * 6 - idx * (360 / prizes.length);
      prizeWheel.style.setProperty('--spin-angle', `${rotation}deg`);
      prizeWheel.style.setProperty('--counter-angle', `${-rotation}deg`);
      prizeWheel.style.transform = `rotate(${rotation}deg)`;
      session.prize = prize;
      setTimeout(() => {
        prizeWheel.classList.remove('spinning');
        prizeWheel.classList.add('won');
        prizeResult.classList.add('revealed');
        prizeResult.innerHTML = `Você ganhou <b>${prize}!</b><small>Fale com a equipe e retire seu brinde.</small>`;
        prizeButton.hidden = true;
        prizeContinue.hidden = false;
        A.sfx.play('gold');
        A.fx.confetti(90);
        A.leads.save(prizeLead, 'brinde', `premio=${prize};jogo=${id}`);
        setTimeout(showFinalResult, 6500);
      }, 4200);
    };
    prizeContinue.onclick = () => { A.sfx.play('tap'); showFinalResult(); };

  }

  /* Fim da partida: zera a sessão e volta ao cadastro para o próximo visitante */
  function nextPlayer() {
    clearInterval(nextTimer);
    stopGame();
    session.total = 0; session.best = {}; session.plays = {}; session.lead = null; session.roulette = null; session.prize = null;
    A.signup.reset();
    show('signup');
  }
  $('#btn-next').addEventListener('click', () => { A.sfx.play('tap'); nextPlayer(); });

  /* ---------- Início / sessão ---------- */
  function resetSession() {
    stopGame();
    session.total = 0;
    session.best = {};
    session.plays = {};
    session.lead = null;
    session.roulette = null;
    session.prize = null;
    A.signup.reset();
    show('home');
  }
  function startFromHome() {
    A.sfx.play('good');
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    } catch (e) {}
    A.signup.reset();
    show('signup');
  }
  A.signup.setup({
    onDone(lead) {
      session.lead = lead;
    A.leads.save(lead, 'cadastro');
      A.sfx.play('good');
      renderSelect();
      show('select');
    },
    onBack() { resetSession(); },
  });
  // a tela inicial inteira é um grande alvo de toque
  screens.home.addEventListener('click', () => { if (current === 'home') startFromHome(); });
  $('#btn-home').addEventListener('click', () => { A.sfx.play('tap'); resetSession(); });

  /* ---------- Inatividade: volta ao início para o próximo visitante ---------- */
  let lastActivity = Date.now();
  const idleEl = $('#idle');
  const onActivity = () => { lastActivity = Date.now(); idleEl.classList.remove('show'); };
  ['pointerdown', 'pointermove', 'touchstart', 'keydown', 'mousedown'].forEach((ev) =>
    window.addEventListener(ev, onActivity, { capture: true, passive: true })
  );
  setInterval(() => {
    if (current === 'home') { idleEl.classList.remove('show'); return; }
    const idle = (Date.now() - lastActivity) / 1000;
    if (idle >= IDLE_RESET) { idleEl.classList.remove('show'); resetSession(); }
    else if (idle >= IDLE_WARN) {
      idleEl.classList.add('show');
      $('#idle-count').textContent = Math.max(0, Math.ceil(IDLE_RESET - idle));
    }
  }, 500);

  // exposto para testes/diagnóstico
  A._app = { get ctrl() { return run.ctrl; }, startGame, showResult, renderSelect, resetSession, session, show, get current() { return current; } };
})();
