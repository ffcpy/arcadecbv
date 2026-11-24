/* Coleta de dados: guarda cadastros e resultados.
   - Com servidor (npm start): envia para POST /api/lead  ->  data/leads.csv
   - Sempre mantém cópia no navegador (localStorage); se o envio falhar, tenta de novo depois.
   - Atalho para a equipe: Ctrl+Shift+L baixa o CSV da cópia local. */
(function () {
  'use strict';
  const A = window.Arcade;
  const LOG = 'arcade_leads_log';
  const PENDING = 'arcade_leads_pending';
  const online = location.protocol === 'http:' || location.protocol === 'https:';

  const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  let flushing = false;
  async function flush() {
    if (flushing || !online) return;
    flushing = true;
    try {
      let q = read(PENDING);
      while (q.length) {
        const r = await fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(q[0]) });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        q = read(PENDING).slice(1);
        write(PENDING, q);
      }
    } catch (e) { /* sem servidor: mantém na fila */ }
    flushing = false;
  }

  const csvCell = (v) => {
    v = String(v == null ? '' : v);
    if (/^[=+\-@]/.test(v)) v = "'" + v;
    return '"' + v.replace(/"/g, '""') + '"';
  };

  A.leads = {
    save(lead, event, detail) {
      if (!lead) return;
      const rec = { t: new Date().toISOString(), event, name: lead.name, phone: lead.phone, detail: detail || '' };
      const log = read(LOG);
      log.push(rec);
      write(LOG, log.slice(-5000));
      if (online) { const q = read(PENDING); q.push(rec); write(PENDING, q); flush(); }
    },
    flush,
    csv() {
      const head = ['datahora', 'evento', 'nome', 'telefone', 'detalhe'];
      const rows = read(LOG).map((r) => [r.t, r.event, r.name, r.phone, r.detail].map(csvCell).join(','));
      return '﻿' + [head.join(',')].concat(rows).join('\r\n');
    },
  };

  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey && e.shiftKey && (e.key === 'L' || e.key === 'l'))) return;
    e.preventDefault();
    const url = URL.createObjectURL(new Blob([A.leads.csv()], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads-bem-viver.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });

  flush();
})();
