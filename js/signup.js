/* Cadastro (nome + telefone) com teclado na tela, pensado para totem touchscreen. */
(function () {
  'use strict';
  const A = window.Arcade;
  const root = document.getElementById('signup');
  const hooks = { onDone() {}, onBack() {} };
  const val = { name: '', phone: '', city: '', state: '' };
  const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  let field = 'name';

  const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM', 'ÁÉÍÓÚÃÕÇ'];
  const keyBtn = (c) => `<button class="key" type="button" data-k="${c}">${c}</button>`;

  root.innerHTML = `
    <div class="su-wrap">
      <div class="su-left">
        <img class="su-logo" src="assets/img/bv-logo.png" alt="Clínica Bem Viver">
        <h2>Antes de se divertir,<br>faça seu cadastro!</h2>
        <p class="su-sub">Assim você participa da <b>Roleta da Sorte</b> e concorre a brindes.</p>
        <button class="su-field active" type="button" data-f="name">
          <span class="su-ic">${A.icon('user')}</span>
          <span class="su-col"><small>Nome</small><span class="su-val" data-v="name"></span></span>
        </button>
        <button class="su-field" type="button" data-f="phone">
          <span class="su-ic">${A.icon('phone')}</span>
          <span class="su-col"><small>Telefone com DDD</small><span class="su-val" data-v="phone"></span></span>
        </button>
        <label class="su-location"><span>Cidade</span><input id="su-city" type="text" maxlength="60" autocomplete="address-level2" placeholder="Digite sua cidade" readonly inputmode="none" aria-label="Cidade"></label>
        <label class="su-location"><span>Estado</span><select id="su-state"><option value="">Selecione</option>${states.map((s) => `<option value="${s}">${s}</option>`).join('')}</select></label>
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
            <button class="key key-next" type="button" data-k="NEXT" aria-label="Cidade">${A.icon('next')}</button>
          </div>
        </div>
      </div>
    </div>`;

  const okBtn = root.querySelector('#su-ok');
  const cityInput = root.querySelector('#su-city');
  const stateSelect = root.querySelector('#su-state');
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
  const cityLabel = cityInput.closest('.su-location');
  const textNext = root.querySelector('.kb-text [data-k="NEXT"]');

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
    cityLabel.classList.toggle('active', field === 'city');
    textNext.innerHTML = (field === 'city' ? 'Nome' : 'Telefone') + A.icon('next');
    val.city = cityInput.value.trim();
    val.state = stateSelect.value;
    okBtn.disabled = !(nameOk() && phoneOk() && val.city.length >= 2 && val.state);
  }

  function press(k) {
    if (k === 'NEXT') {
      field = field === 'name' ? 'phone' : field === 'phone' ? 'city' : 'name';
      if (field === 'city') cityInput.focus();
      else cityInput.blur();
    }
    else if (k === 'BS') {
      if (field === 'name') val.name = val.name.slice(0, -1);
      else if (field === 'phone') val.phone = val.phone.slice(0, -1);
      else cityInput.value = Array.from(cityInput.value).slice(0, -1).join('');
    } else if (field === 'name' || field === 'city') {
      const isCity = field === 'city';
      const current = isCity ? cityInput.value : val.name;
      const prev = Array.from(current).slice(-1)[0] || '';
      if (current.length >= (isCity ? 60 : 40)) return;
      if (k === ' ' && (!current || prev === ' ')) return;
      const next = current + (!prev || prev === ' ' ? k.toUpperCase() : k.toLowerCase());
      if (isCity) cityInput.value = next;
      else val.name = next;
    } else if (/^\d$/.test(k) && val.phone.length < 11) val.phone += k;
    paint();
  }

  root.addEventListener('pointerdown', (e) => {
    const key = e.target.closest('.key');
    if (key) { e.preventDefault(); A.sfx.play('tap'); press(key.dataset.k); return; }
    const f = e.target.closest('.su-field');
    if (f) { A.sfx.play('tap'); cityInput.blur(); field = f.dataset.f; paint(); return; }
    const location = e.target.closest('.su-location');
    if (location && location.contains(cityInput)) {
      e.preventDefault(); A.sfx.play('tap'); field = 'city'; paint(); cityInput.focus();
    }
  });
  cityInput.addEventListener('input', paint);
  stateSelect.addEventListener('change', paint);

  function confirm() {
    if (!(nameOk() && phoneOk() && cityInput.value.trim().length >= 2 && stateSelect.value)) return;
    hooks.onDone({ name: val.name.trim(), phone: val.phone, city: cityInput.value.trim(), state: stateSelect.value });
  }
  okBtn.addEventListener('click', confirm);
  root.querySelector('#su-back').addEventListener('click', () => { A.sfx.play('tap'); hooks.onBack(); });

  /* teclado físico (equipe/testes) */
  window.addEventListener('keydown', (e) => {
    if (!root.classList.contains('active') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target === cityInput) {
      if (e.key === 'Backspace') { e.preventDefault(); press('BS'); }
      else if (e.key === 'Tab') { e.preventDefault(); press('NEXT'); }
      else if (e.key === 'Enter') confirm();
      else if (e.key.length === 1 && /[\p{L} ]/u.test(e.key)) { e.preventDefault(); press(e.key); }
      return;
    }
    // O seletor de estado mantém o comportamento nativo do navegador.
    if (e.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (e.key === 'Backspace') press('BS');
    else if (e.key === 'Tab') { e.preventDefault(); press('NEXT'); }
    else if (e.key === 'Enter') confirm();
    else if (e.key.length === 1 && (field === 'phone' ? /\d/.test(e.key) : /[\p{L} ]/u.test(e.key))) press(e.key);
  });

  A.signup = {
    setup(h) { Object.assign(hooks, h); },
    reset() { val.name = ''; val.phone = ''; cityInput.value = ''; cityInput.blur(); stateSelect.value = ''; field = 'name'; paint(); },
  };
  paint();
})();
