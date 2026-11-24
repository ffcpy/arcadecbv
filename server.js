/* Servidor estático mínimo (sem dependências). Uso: node server.js  (PORT opcional) */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8080;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
};

/* ---------- Leads: POST /api/lead  ->  data/leads.csv ---------- */
const DATA_DIR = path.join(ROOT, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.csv');
const clean = (v, max) => String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').slice(0, max);
const cell = (v) => {
  v = String(v);
  if (/^[=+\-@]/.test(v)) v = "'" + v; // evita injeção de fórmula no Excel
  return '"' + v.replace(/"/g, '""') + '"';
};
function saveLead(req, res) {
  let body = '';
  req.on('data', (c) => {
    body += c;
    if (body.length > 4096) { res.writeHead(413); res.end(); req.destroy(); }
  });
  req.on('end', () => {
    if (res.writableEnded) return;
    let r;
    try { r = JSON.parse(body); } catch (e) { res.writeHead(400); return res.end('JSON inválido'); }
    if (!r || typeof r !== 'object') { res.writeHead(400); return res.end(); }
    const t = new Date(r.t);
    const line = [
      (Number.isNaN(t.getTime()) ? new Date() : t).toISOString(),
      clean(r.event, 30), clean(r.name, 60), clean(r.phone, 20).replace(/[^\d+()\- ]/g, ''), clean(r.detail, 120),
    ].map(cell).join(',') + '\r\n';
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, '﻿"datahora","evento","nome","telefone","detalhe"\r\n');
      fs.appendFileSync(LEADS_FILE, line);
      res.writeHead(204); res.end();
    } catch (e) { console.error(e); res.writeHead(500); res.end(); }
  });
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.method === 'POST' && req.url.split('?')[0] === '/api/lead') return saveLead(req, res);
    let rel;
    try { rel = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end('Bad request'); }
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT + path.sep) || file.startsWith(DATA_DIR + path.sep)) { // data/ (leads) nunca é servido
 res.writeHead(403); return res.end('Forbidden'); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  });
}

module.exports = { createServer, PORT };

if (require.main === module) {
  createServer().listen(PORT, () => console.log(`Super Arcade rodando em http://localhost:${PORT}`));
}
