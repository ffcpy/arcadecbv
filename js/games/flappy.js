/* JOGO 3 — Flappy Challenge */
(function () {
  'use strict';
  const A = window.Arcade;
  const WH = 600; // altura lógica do mundo
  const GROUND = 70;
  const BIRD_X = 210;
  const BIRD_R = 22;
  const PIPE_W = 96;
  const GRAVITY = 1650;
  const FLAP = -520;

  A.games.flappy = {
    id: 'flappy',
    title: 'Flappy Challenge',
    color: '#F7AF05', dark: '#B67900', tint: '#FFF1CC', on: '#1E2A5A',
    desc: 'Toque para voar e passe entre as colunas!',
    how: [['tap', 'Toque na tela para voar mais alto'], ['gate', 'Passe pelos espaços entre as colunas'], ['trend', 'A cada coluna, o voo fica um pouco mais rápido']],
    countdown: false,

    create(stage, api) {
      const U = api.util;
      const cv = document.createElement('canvas');
      cv.className = 'full-canvas';
      stage.appendChild(cv);
      const ctx = cv.getContext('2d');
      let W = 800, s = 1, dpr = 1;

      let state = 'idle'; // idle | ready | play | dead
      let bird, pipes, score, speed, gap, t, groundX, shake, flash, deadT, raf, lastT, tStart, ended = false;
      const clouds = Array.from({ length: 6 }, () => ({ x: U.rand(0, 1600), y: U.rand(30, 280), r: U.rand(30, 60), v: A.reduceMotion ? 0 : U.rand(6, 14) }));
      const hills = Array.from({ length: 6 }, (_, i) => ({ x: i * 340, h: U.rand(70, 150) }));

      function layout() {
        const cw = stage.clientWidth || 800, ch = stage.clientHeight || 450;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = cw * dpr; cv.height = ch * dpr;
        s = (ch * dpr) / WH;
        W = (cw * dpr) / s;
      }

      function reset() {
        bird = { y: WH / 2 - 30, vy: 0, rot: 0 };
        pipes = []; score = 0; speed = 200; gap = 220; t = 0; groundX = 0; shake = 0; flash = 0; deadT = 0;
        api.setScore(0); api.setTime('0:00');
      }

      function spawnPipe(x) {
        const margin = 70;
        const top = U.rand(margin, WH - GROUND - gap - margin);
        pipes.push({ x, top, gap, passed: false });
      }

      function flap() {
        bird.vy = FLAP;
        api.sfx.play('flap');
      }

      function die() {
        if (state === 'dead') return;
        state = 'dead'; deadT = 0; shake = 0; flash = 0; // sem tremor nem clarão: conforto sensorial
        api.sfx.play('hit');
        const r = cv.getBoundingClientRect();
        api.fx.burst(r.left + BIRD_X * s / dpr, r.top + bird.y * s / dpr, '#F7AF05', 16);
        const elapsed = (performance.now() - tStart) / 1000;
        api.finish({
          score: score * 10,
          stars: score >= 10 ? 3 : score >= 5 ? 2 : 1,
          title: 'Boa tentativa!',
          stats: [
            { label: 'Colunas', value: score },
            { label: 'Tempo', value: U.fmtTime(elapsed) },
            { label: 'Velocidade máx.', value: Math.round(speed / 2) + ' km/h' },
          ],
          delay: 1600,
        });
      }

      function update(dt) {
        t += dt;
        if (state !== 'dead') groundX = (groundX + speed * dt) % 60;
        clouds.forEach((c) => { c.x -= c.v * dt; if (c.x < -120) c.x = W + 120; });
        if (state === 'ready') { bird.y = WH / 2 - 30 + Math.sin(t * 5) * 10; bird.rot = 0; return; }

        if (state === 'play') api.setTime(U.fmtTime((performance.now() - tStart) / 1000));
        bird.vy = Math.min(760, bird.vy + GRAVITY * dt);
        bird.y += bird.vy * dt;
        bird.rot = U.clamp(bird.vy / 650, -0.5, 1.3);
        if (state === 'dead') {
          deadT += dt; shake = Math.max(0, shake - dt);
          if (bird.y > WH - GROUND - BIRD_R) { bird.y = WH - GROUND - BIRD_R; bird.vy = 0; }
          return;
        }
        if (bird.y < BIRD_R) { bird.y = BIRD_R; bird.vy = Math.max(bird.vy, 0); }

        // canos
        const last = pipes[pipes.length - 1];
        const spacing = 330 + speed * 0.35;
        if (!last || last.x < W - spacing) spawnPipe(W + 60);
        for (let i = pipes.length - 1; i >= 0; i--) {
          const p = pipes[i];
          p.x -= speed * dt;
          if (p.x + PIPE_W < -20) { pipes.splice(i, 1); continue; }
          if (!p.passed && p.x + PIPE_W < BIRD_X - BIRD_R) {
            p.passed = true; score++;
            speed = Math.min(360, speed + 7);
            gap = Math.max(158, gap - 4);
            api.setScore(score * 10);
            api.sfx.play('good');
            const r = cv.getBoundingClientRect();
            api.fx.floatText(r.left + BIRD_X * s / dpr + 40, r.top + bird.y * s / dpr - 40, '+10', 'good');
          }
          // colisão círculo × retângulos
          if (circleRect(BIRD_X, bird.y, BIRD_R - 3, p.x, 0, PIPE_W, p.top) ||
              circleRect(BIRD_X, bird.y, BIRD_R - 3, p.x, p.top + p.gap, PIPE_W, WH)) { die(); return; }
        }
        if (bird.y + BIRD_R - 3 >= WH - GROUND) { bird.y = WH - GROUND - BIRD_R + 3; die(); }
      }

      function circleRect(cx, cy, r, rx, ry, rw, rh) {
        const nx = U.clamp(cx, rx, rx + rw), ny = U.clamp(cy, ry, ry + rh);
        return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) < r * r;
      }

      /* ----- desenho (paleta Bem Viver, tons suaves) ----- */
      const FONT = '"Fredoka","Nunito","Segoe UI",sans-serif';
      function draw() {
        ctx.setTransform(s, 0, 0, s, 0, 0);
        const sky = ctx.createLinearGradient(0, 0, 0, WH);
        sky.addColorStop(0, '#BFE8FF'); sky.addColorStop(0.65, '#E6F6FF'); sky.addColorStop(1, '#FFF4D6');
        ctx.fillStyle = sky; ctx.fillRect(-20, -20, W + 40, WH + 40);

        // sol (o "sol" da marca)
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(W - 120, 100, 78, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#F7AF05'; ctx.beginPath(); ctx.arc(W - 120, 100, 50, 0, 6.2832); ctx.fill();
        // nuvens
        ctx.fillStyle = 'rgba(255,255,255,.95)';
        clouds.forEach((c) => {
          ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 6.2832); ctx.arc(c.x + c.r * 0.9, c.y + 6, c.r * 0.75, 0, 6.2832);
          ctx.arc(c.x - c.r * 0.9, c.y + 8, c.r * 0.65, 0, 6.2832); ctx.fill();
        });
        // colinas em duas camadas (lilás ao fundo, verde à frente)
        const off = A.reduceMotion ? 0 : (t * speed * 0.25) % 340;
        ctx.fillStyle = '#D9CCF2';
        hills.forEach((h, i) => {
          const x = i * 340 - off * 0.5;
          ctx.beginPath(); ctx.ellipse(x + 220, WH - GROUND, 260, h.h + 40, 0, Math.PI, 0); ctx.fill();
        });
        ctx.fillStyle = '#B8E08A';
        hills.forEach((h, i) => {
          const x = i * 340 - off;
          ctx.beginPath(); ctx.ellipse(x + 170, WH - GROUND, 220, h.h, 0, Math.PI, 0); ctx.fill();
        });
        ctx.beginPath(); ctx.ellipse(6 * 340 - off + 170, WH - GROUND, 220, hills[0].h, 0, Math.PI, 0); ctx.fill();

        // colunas
        pipes.forEach((p) => { drawPipe(p.x, 0, p.top, true); drawPipe(p.x, p.top + p.gap, WH - GROUND - (p.top + p.gap), false); });

        // chão
        ctx.fillStyle = '#F2DDA6'; ctx.fillRect(-20, WH - GROUND, W + 40, GROUND + 20);
        ctx.fillStyle = '#8DC63F'; ctx.fillRect(-20, WH - GROUND, W + 40, 18);
        ctx.fillStyle = '#7AB32F';
        for (let x = -groundX; x < W + 60; x += 60) {
          ctx.beginPath(); ctx.moveTo(x, WH - GROUND); ctx.lineTo(x + 30, WH - GROUND); ctx.lineTo(x + 10, WH - GROUND + 18); ctx.lineTo(x - 20, WH - GROUND + 18); ctx.fill();
        }

        drawBird();

        // placar grande
        if (state !== 'idle') {
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = `700 84px ${FONT}`;
          ctx.lineWidth = 14; ctx.strokeStyle = '#ffffff'; ctx.lineJoin = 'round'; ctx.strokeText(score, W / 2, 80);
          ctx.fillStyle = '#1E2A5A'; ctx.fillText(score, W / 2, 80);
        }
        if (state === 'ready') banner('Toque para voar!', 'Passe entre as colunas sem encostar');
        if (state === 'dead' && deadT > 0.25) {
          const k = Math.min(1, (deadT - 0.25) * 3);
          ctx.save(); ctx.translate(W / 2, WH / 2 - 20); ctx.scale(0.92 + 0.08 * k, 0.92 + 0.08 * k); ctx.globalAlpha = k;
          ctx.fillStyle = '#ffffff'; roundRect(-260, -110, 520, 220, 40); ctx.fill();
          ctx.lineWidth = 6; ctx.strokeStyle = '#FFF1CC'; ctx.stroke();
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = '#B67900'; ctx.font = `700 70px ${FONT}`; ctx.fillText('Boa tentativa!', 0, -32);
          ctx.fillStyle = '#1E2A5A'; ctx.font = `600 42px ${FONT}`; ctx.fillText(score + (score === 1 ? ' coluna' : ' colunas'), 0, 42);
          ctx.restore();
        }
      }

      function banner(title, sub) {
        ctx.save();
        ctx.translate(W / 2, WH / 2 - 92);
        ctx.fillStyle = '#ffffff'; roundRect(-320, -66, 640, 132, 36); ctx.fill();
        ctx.lineWidth = 6; ctx.strokeStyle = '#FFF1CC'; ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1E2A5A'; ctx.font = `700 54px ${FONT}`; ctx.fillText(title, 0, -14);
        ctx.fillStyle = '#4A5687'; ctx.font = `700 28px ${FONT}`; ctx.fillText(sub, 0, 34);
        ctx.restore();
      }

      function roundRect(x, y, w, h, r) {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
      }

      function drawPipe(x, y, h, top) {
        if (h <= 0) return;
        const g = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
        g.addColorStop(0, '#0B6FC9'); g.addColorStop(0.4, '#35A8E8'); g.addColorStop(1, '#035FB2');
        ctx.fillStyle = g; ctx.strokeStyle = '#02427F'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
        ctx.fillRect(x + 8, y, PIPE_W - 16, h); ctx.strokeRect(x + 8, y, PIPE_W - 16, h);
        const capH = 40, cy = top ? y + h - capH : y;
        ctx.fillStyle = g; roundRect(x - 4, cy, PIPE_W + 8, capH, 16); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; roundRect(x + 10, cy + 8, 10, capH - 16, 5); ctx.fill();
      }

      const hero = new Image();
      hero.src = 'assets/img/mascot-flying.png';
      function drawBird() {
        if (!hero.complete || !hero.naturalWidth) return drawBirdFallback();
        const w = 150, h = (w * hero.naturalHeight) / hero.naturalWidth;
        ctx.save();
        ctx.translate(BIRD_X, bird.y);
        ctx.rotate(bird.rot * 0.45); // inclina pouco: voo suave
        ctx.drawImage(hero, -w * 0.56, -h * 0.5, w, h);
        ctx.restore();
      }
      function drawBirdFallback() {
        ctx.save();
        ctx.translate(BIRD_X, bird.y); ctx.rotate(bird.rot);
        ctx.lineJoin = 'round';
        ctx.fillStyle = '#F7AF05'; ctx.strokeStyle = '#B67900'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, BIRD_R + 2, 0, 6.2832); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#FFE08A'; ctx.beginPath(); ctx.ellipse(-3, 9, 13, 8, 0, 0, 6.2832); ctx.fill();
        // asa (azul da marca)
        const wy = A.reduceMotion || state === 'dead' ? 0 : Math.sin(t * 14) * 4;
        ctx.fillStyle = '#035FB2'; ctx.strokeStyle = '#02427F'; ctx.beginPath(); ctx.ellipse(-10, 3 + wy, 13, 8, -0.4, 0, 6.2832); ctx.fill(); ctx.stroke();
        // olho
        ctx.strokeStyle = '#B67900'; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(10, -7, 8, 0, 6.2832); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#1E2A5A'; ctx.beginPath(); ctx.arc(12, -7, 3.6, 0, 6.2832); ctx.fill();
        // bico (rosa da marca) e bochecha
        ctx.fillStyle = '#E90370'; ctx.strokeStyle = '#A8004F'; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(34, 5); ctx.lineTo(18, 11); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(233,3,112,.3)'; ctx.beginPath(); ctx.arc(8, 6, 5, 0, 6.2832); ctx.fill();
        ctx.restore();
      }

      function loop(now) {
        raf = requestAnimationFrame(loop);
        const dt = Math.min(0.033, (now - lastT) / 1000 || 0.016);
        lastT = now;
        if (state !== 'idle') update(dt); else t += dt;
        draw();
      }

      cv.addEventListener('pointerdown', () => {
        if (state === 'ready') { state = 'play'; tStart = performance.now(); flap(); }
        else if (state === 'play') flap();
      });

      const ro = new ResizeObserver(layout);
      ro.observe(stage);
      layout(); reset();
      lastT = performance.now();
      raf = requestAnimationFrame(loop);

      return {
        debug() { return { state, y: bird.y, pipes: pipes.map((p) => ({ x: p.x, top: p.top, gap: p.gap })), score, s, dpr }; },
        begin() { reset(); state = 'ready'; },
        destroy() { ended = true; cancelAnimationFrame(raf); ro.disconnect(); },
      };
    },
  };
})();
