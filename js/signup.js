/* Cadastro (nome + telefone) com teclado na tela, pensado para totem touchscreen. */
(function () {
  'use strict';
  const A = window.Arcade;
  const root = document.getElementById('signup');
  const hooks = { onDone() {}, onBack() {} };
  const val = { name: '', phone: '' };
  let field = 'name';

  const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM', 'ÁÉÍÓÚÃÕÇ'];
  const keyBtn = (c) => `<button class="key" type="button" data-k="${c}">${c}</button>`;

  root.innerHTML = `
    <div class="su-wrap">
      <div class="su-left">
        <img class="su-logo" src="assets/img/bv-logo.png" alt="Clínica Bem Viver">
        <h2>Antes de jogar,<br>faça seu cadastro!</h2>
        <p class="su-sub">Assim você participa da <b>Roleta da Sorte</b> e concorre a brindes.</p>
        <button class="su-field active" type="button" data-f="name">
          <span class="su-ic">${A.icon('user')}</span>
          <span class="su-col"><small>Nome</small><span class="su-val" data-v="name"></span></span>
        </button>
        <button class="su-field" type="button" data-f="phone">
          <span class="su-ic">${A.icon('phone')}</span>
          <span class="su-col"><small>Telefone com DDD</small><span class="su-val" data-v="phone"></span></span>
        </button>
        <p class="su-lgpd">Usamos seus dados apenas para contato da Clínica Bem Viver e entrega de brindes.</p>
        <div class="su-actions">
          <button id="su-back" class="btn btn-sm btn-ghost" type="button">${A.icon('back')}Voltar</button>
          <button id="su-ok" class="btn btn-big btn-pink" type="button" disabled>Confirmar${A.icon('check')}</button>
        </div>
      </div>
      <div class="su-kb">
        <div class="kb kb-text">
          ${ROWS.map((r) => `<div class="kb-row">${r.split('').map(keyBtn).join('')}</div>`).join('')}
          <div class="kb-row">
            <button class="key key-wide" type="button" data-k="BS" aria-label="Apagar">${A.icon('backspace')}</button>
            <button class="key key-space" type="button" data-k=" ">Espaço</button>
            <button class="key key-wide key-next" type="button" data-k="NEXT">Telefone${A.icon('next')}</button>
          </div>
        </div>
        <div class="kb kb-num">
          <div class="pad">
            ${'123456789'.split('').map(keyBtn).join('')}
            <button class="key" type="button" data-k="BS" aria-label="Apagar">${A.icon('backspace')}</button>
            ${keyBtn('0')}
            <button class="key key-next" type="button" data-k="NEXT" aria-label="Nome">${A.icon('user')}</button>
          </div>
        </div>
      </div>
    </div>`;

  const okBtn = root.querySelector('#su-ok');
  const fmtPhone = (d) => {
    if (!d) return '';
    const a = d.slice(0, 2);
    const r = d.slice(2);
    if (!r) return d.length < 2 ? '(' + a : '(' + a + ') ';
    const cut = d.length > 10 ? 5 : 4;
    return '(' + a + ') ' + r.slice(0, cut) + (r.length > cut ? '-' + r.slice(cut) : '');
  };
  const nameOk = () => val.name.trim().length >= 2;
  const phoneOk = () => val.phone.length === 10 || val.phone.length === 11;

  function paint() {
    root.dataset.field = field;
    root.querySelectorAll('.su-field').forEach((b) => b.classList.toggle('active', b.dataset.f === field));
    const n = root.querySelector('[data-v="name"]');
    const p = root.querySelector('[data-v="phone"]');
    n.textContent = val.name;
    p.textContent = fmtPhone(val.phone);
    n.classList.toggle('empty', !val.name);
    p.classList.toggle('empty', !val.phone);
    root.querySelector('[data-f="name"]').classList.toggle('done', nameOk());
    root.querySelector('[data-f="phone"]').classList.toggle('done', phoneOk());
    okBtn.disabled = !(nameOk() && phoneOk());
  }

  function press(k) {
    if (k === 'NEXT') field = field === 'name' ? 'phone' : 'name';
    else if (k === 'BS') {
      if (field === 'name') val.name = val.name.slice(0, -1);
      else val.phone = val.phone.slice(0, -1);
    } else if (field === 'name') {
      const prev = val.name.slice(-1);
      if (val.name.length >= 40) return;
      if (k === ' ' && (!val.name || prev === ' ')) return;
      val.name += !prev || prev === ' ' ? k.toUpperCase() : k.toLowerCase();
    } else if (/^\d$/.test(k) && val.phone.length < 11) val.phone += k;
    paint();
  }

  root.addEventListener('pointerdown', (e) => {
    const key = e.target.closest('.key');
    if (key) { e.preventDefault(); A.sfx.play('tap'); press(key.dataset.k); return; }
    const f = e.target.closest('.su-field');
    if (f) { A.sfx.play('tap'); field = f.dataset.f; paint(); }
  });

  function confirm() {
    if (!(nameOk() && phoneOk())) return;
    hooks.onDone({ name: val.name.trim(), phone: val.phone });
  }
  okBtn.addEventListener('click', confirm);
  root.querySelector('#su-back').addEventListener('click', () => { A.sfx.play('tap'); hooks.onBack(); });

  /* teclado físico (equipe/testes) */
  window.addEventListener('keydown', (e) => {
    if (!root.classList.contains('active') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Backspace') press('BS');
    else if (e.key === 'Tab') { e.preventDefault(); press('NEXT'); }
    else if (e.key === 'Enter') confirm();
    else if (e.key.length === 1 && (field === 'phone' ? /\d/.test(e.key) : /[\p{L} ]/u.test(e.key))) press(e.key);
  });

  A.signup = {
    setup(h) { Object.assign(hooks, h); },
    reset() { val.name = ''; val.phone = ''; field = 'name'; paint(); },
  };
  paint();
})();
