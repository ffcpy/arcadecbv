/* Ícones (linha) e ilustrações (chapadas) — linguagem visual única, cores da marca Bem Viver. */
(function () {
  'use strict';
  const A = window.Arcade;
  const C = { pink: '#E90370', blue: '#035FB2', cyan: '#1FC3EE', sun: '#F7AF05', orange: '#F58A07', green: '#8DC63F', purple: '#9B3FC0', ink: '#1E2A5A' };

  /* ---------- Ícones de linha (24x24, herdam currentColor) ---------- */
  const L = {
    tap: '<circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/><path d="M8 8a5.7 5.7 0 000 8M16 8a5.7 5.7 0 010 8M5 5a10 10 0 000 14M19 5a10 10 0 010 14"/>',
    search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
    zap: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    route: '<circle cx="6" cy="18" r="2.2"/><circle cx="12" cy="6" r="2.2"/><circle cx="18.5" cy="15" r="2.2"/><path d="M7 16l4-8M13.2 7.6l4 5.6"/>',
    sparkle: '<path d="M12 3.5l2 6.5 6.5 2-6.5 2-2 6.5-2-6.5-6.5-2 6.5-2z"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    gate: '<path d="M4 3.5h5.5v7H4zM4 13.5h5.5v7H4z"/><path d="M13 12h7M17 8.5l3.5 3.5-3.5 3.5"/>',
    trend: '<path d="M3.5 17l6-6 4 4 7-7"/><path d="M15 8h5.5v5.5"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor"/>',
    xcircle: '<circle cx="12" cy="12" r="8.5"/><path d="M9 9l6 6M15 9l-6 6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/>',
    back: '<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/>',
    restart: '<path d="M4 12a8 8 0 102.4-5.7"/><path d="M4 4.5V9h4.5"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>',
    vol: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4.2 4.2 0 010 6M18.3 6.5a8 8 0 010 11"/>',
    mute: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    /* peça de quebra-cabeça: símbolo de conscientização do autismo */
    puzzle: '<path d="M6 6H9.6a2.6 2.6 0 1 1 4.8 0H18V9.6a2.6 2.6 0 1 1 0 4.8V18H14.4a2.6 2.6 0 1 0-4.8 0H6V14.4a2.6 2.6 0 1 0 0-4.8Z"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-4 3.2-6.2 7-6.2s7 2.2 7 6.2"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2.4"/><path d="M11 18h2"/>',
    backspace: '<path d="M9 5h11a1 1 0 011 1v12a1 1 0 01-1 1H9l-6-7z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/>',
    gift: '<rect x="4" y="10" width="16" height="10" rx="1.5"/><path d="M3 7h18v3H3zM12 7v13M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0"/>',
    next: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  };
  A.icon = (name, extra) =>
    `<svg class="ic ${extra || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${L[name] || ''}</svg>`;

  /* ---------- Helpers de forma ---------- */
  function starPts(cx, cy, R, r, n) {
    const p = [];
    for (let k = 0; k < n * 2; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / n;
      const rr = k % 2 ? r : R;
      p.push((cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1));
    }
    return p.join(' ');
  }
  function rays(cx, cy, r1, r2, n, color, w) {
    let s = '';
    for (let k = 0; k < n; k++) {
      const a = (k * 2 * Math.PI) / n;
      s += `<line x1="${(cx + r1 * Math.cos(a)).toFixed(1)}" y1="${(cy + r1 * Math.sin(a)).toFixed(1)}" x2="${(cx + r2 * Math.cos(a)).toFixed(1)}" y2="${(cy + r2 * Math.sin(a)).toFixed(1)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
    }
    return s;
  }
  const svg = (vb, body, cls) => `<svg class="${cls || ''}" viewBox="${vb}" aria-hidden="true" focusable="false">${body}</svg>`;

  /* ---------- Cartas do jogo da memória (8 formas distintas, não dependem só de cor) ---------- */
  A.faces = [
    svg('0 0 100 100', `<path d="M50 86C20 62 10 46 10 32c0-12 9-20 20-20 8 0 15 4 20 11 5-7 12-11 20-11 11 0 20 8 20 20 0 14-10 30-40 54z" fill="${C.pink}"/><ellipse cx="29" cy="30" rx="7" ry="5" fill="#fff" opacity=".35" transform="rotate(-30 29 30)"/>`),
    svg('0 0 100 100', `<polygon points="${starPts(50, 54, 40, 18, 5)}" fill="${C.sun}" stroke="${C.sun}" stroke-width="8" stroke-linejoin="round"/>`),
    svg('0 0 100 100', `<circle cx="50" cy="50" r="22" fill="${C.orange}"/>${rays(50, 50, 33, 43, 8, C.sun, 8)}`),
    svg('0 0 100 100', `<g fill="${C.purple}"><circle cx="50" cy="26" r="17"/><circle cx="74" cy="44" r="17"/><circle cx="65" cy="72" r="17"/><circle cx="35" cy="72" r="17"/><circle cx="26" cy="44" r="17"/></g><circle cx="50" cy="52" r="13" fill="${C.sun}"/>`),
    svg('0 0 100 100', `<g fill="${C.blue}"><circle cx="31" cy="60" r="18"/><circle cx="53" cy="46" r="24"/><circle cx="74" cy="61" r="16"/><rect x="31" y="58" width="43" height="19" rx="9"/></g>`),
    svg('0 0 100 100', `<path d="M50 10C50 10 22 42 22 62a28 28 0 0056 0C78 42 50 10 50 10z" fill="${C.cyan}"/><ellipse cx="39" cy="62" rx="6" ry="10" fill="#fff" opacity=".45" transform="rotate(20 39 62)"/>`),
    svg('0 0 100 100', `<path d="M16 84C12 42 38 14 86 14c2 44-22 70-70 70z" fill="${C.green}"/><path d="M22 78L62 38" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/>`),
    svg('0 0 100 100', `<path d="M62 12C40 16 26 36 26 56c0 24 20 40 42 36 8-1.5 15-5 20-10C66 84 50 68 50 48c0-14 5-26 12-36z" fill="${C.sun}" stroke="${C.sun}" stroke-width="4" stroke-linejoin="round"/>`),
  ];

  /* ---------- Mascote: o "sol" do logotipo Bem Viver, com rosto amigável ---------- */
  A.art = {};
  A.art.sun = svg('0 0 120 120', `
    <circle cx="60" cy="60" r="46" fill="${C.sun}"/>
    <ellipse cx="44" cy="38" rx="20" ry="11" fill="#FFD266" opacity=".7" transform="rotate(-28 44 38)"/>
    <ellipse cx="44" cy="56" rx="5" ry="6.5" fill="${C.ink}"/><ellipse cx="76" cy="56" rx="5" ry="6.5" fill="${C.ink}"/>
    <circle cx="45.8" cy="53.6" r="1.8" fill="#fff"/><circle cx="77.8" cy="53.6" r="1.8" fill="#fff"/>
    <circle cx="33" cy="70" r="7" fill="${C.pink}" opacity=".3"/><circle cx="87" cy="70" r="7" fill="${C.pink}" opacity=".3"/>
    <path d="M45 70q15 16 30 0" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>`, 'mascot');

  /* ---------- Ilustrações dos jogos (160x160) ---------- */
  A.art.memory = svg('0 0 160 160', `
    <g transform="rotate(-11 58 88)"><rect x="24" y="38" width="70" height="92" rx="15" fill="${C.pink}"/>
      <circle cx="59" cy="84" r="20" fill="#fff"/><path d="M59 96c-10-7-14-12-14-17 0-4 3-7 7-7 3 0 5 1 7 4 2-3 4-4 7-4 4 0 7 3 7 7 0 5-4 10-14 17z" fill="${C.pink}" transform="translate(0 -1)"/></g>
    <g transform="rotate(9 102 76)"><rect x="66" y="30" width="70" height="92" rx="15" fill="#fff" stroke="#FFC4E0" stroke-width="5"/>
      <polygon points="${starPts(101, 78, 22, 10, 5)}" fill="${C.sun}" stroke="${C.sun}" stroke-width="5" stroke-linejoin="round"/></g>`);

  A.art.dots = svg('0 0 160 160', `
    <path d="M34 120L80 44l48 62" fill="none" stroke="${C.blue}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M128 106L140 124" fill="none" stroke="${C.blue}" stroke-width="7" stroke-linecap="round" stroke-dasharray="1 14" opacity=".55"/>
    <g font-family="Fredoka,Nunito,sans-serif" font-weight="700" font-size="21" text-anchor="middle" fill="${C.ink}">
      <circle cx="34" cy="120" r="17" fill="#fff" stroke="${C.blue}" stroke-width="6"/><text x="34" y="128">1</text>
      <circle cx="80" cy="44" r="17" fill="#fff" stroke="${C.blue}" stroke-width="6"/><text x="80" y="52">2</text>
      <circle cx="128" cy="106" r="17" fill="${C.cyan}" stroke="${C.blue}" stroke-width="6"/><text x="128" y="114">3</text>
    </g>
    <polygon points="${starPts(130, 38, 12, 5, 4)}" fill="${C.sun}" stroke="${C.sun}" stroke-width="3" stroke-linejoin="round"/>`);

  A.art.flappy = svg('0 0 160 160', `
    <image href="assets/img/mascot-flying.png" x="6" y="42" width="150" height="103" preserveAspectRatio="xMidYMid meet"/>
    <g fill="${C.cyan}" opacity=".8"><circle cx="30" cy="40" r="5"/><circle cx="44" cy="28" r="3.5"/><circle cx="134" cy="38" r="4"/></g>`);

  A.art.reflex = svg('0 0 160 160', `
    <circle cx="80" cy="84" r="58" fill="${C.green}"/><circle cx="80" cy="84" r="43" fill="#fff"/>
    <circle cx="80" cy="84" r="29" fill="${C.green}"/><circle cx="80" cy="84" r="16" fill="#fff"/><circle cx="80" cy="84" r="8" fill="${C.pink}"/>
    ${rays(80, 84, 66, 76, 6, C.sun, 6).replace(/<line/g, '<line transform="rotate(15 80 84)"')}`);

  /* ---------- Peça de quebra-cabeça (autismo) ---------- */
  const PUZ = 'M20 20H38a13 13 0 1 1 24 0H80V38a13 13 0 1 1 0 24V80H62a13 13 0 1 0-24 0H20V62a13 13 0 1 0 0-24Z';
  A.puzzle = (fill, cls) =>
    svg('11 -7 96 96', `<path d="${PUZ}" fill="${fill}" stroke="${fill}" stroke-width="6" stroke-linejoin="round"/><ellipse cx="38" cy="38" rx="9" ry="5" fill="#fff" opacity=".35" transform="rotate(-35 38 38)"/>`, cls || '');

  /* Roleta da Sorte: máquina com 3 peças iguais alinhadas */
  const pz = (cx, cy) => `<path transform="translate(${cx - 24.8} ${cy - 17.2}) scale(.42)" d="${PUZ}" fill="${C.blue}" stroke="${C.blue}" stroke-width="5" stroke-linejoin="round"/>`;
  A.art.roulette = svg('0 0 160 160', `
    <polygon points="${starPts(80, 26, 17, 8, 5)}" fill="${C.sun}" stroke="${C.sun}" stroke-width="5" stroke-linejoin="round"/>
    <rect x="12" y="46" width="136" height="86" rx="18" fill="${C.purple}"/>
    <rect x="20" y="54" width="120" height="68" rx="12" fill="#fff"/>
    <g fill="#F2E4FA"><rect x="26" y="60" width="32" height="56" rx="8"/><rect x="64" y="60" width="32" height="56" rx="8"/><rect x="102" y="60" width="32" height="56" rx="8"/></g>
    ${pz(42, 88)}${pz(80, 88)}${pz(118, 88)}
    <rect x="150" y="66" width="6" height="34" rx="3" fill="${C.sun}"/><circle cx="153" cy="62" r="9" fill="${C.pink}"/>
    <rect x="28" y="130" width="104" height="12" rx="6" fill="#6B2088"/>`);

  /* Figuras da roleta: marca Bem Viver, ExpoTEA e peça de quebra-cabeça do autismo */
  A.reel = [
    { id: 'puzzle', name: 'Peça de quebra-cabeça', html: A.puzzle(C.blue) },
    { id: 'bv', name: 'Bem Viver', html: '<img src="assets/img/bv-symbol.png" alt="">' },
    { id: 'expotea', name: 'ExpoTEA', html: '<span class="rs-expo"><img src="assets/img/expotea.jpg" alt=""></span>' },
    { id: 'mascot', name: 'Mascote', html: '<img src="assets/img/mascot-flying.png" alt="">' },
    { id: 'sun', name: 'Sol', html: A.art.sun },
  ];

  /* Letreiro do jogo "Flappy" etc. usa as chaves acima; ids dos jogos = chaves de A.art */
})();
