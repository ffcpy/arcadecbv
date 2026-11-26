/* Servidor estático e endpoint de leads. Uso: node server.js (PORT opcional) */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomInt } = require('crypto');

const ROOT = __dirname;
const ENV_FILE = path.join(ROOT, '.env');
try {
  if (typeof process.loadEnvFile === 'function') process.loadEnvFile(ENV_FILE);
  else if (fs.existsSync(ENV_FILE)) throw new Error('Carregar .env requer Node.js 20.12 ou superior.');
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}
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
const PRIZE_FILE = path.join(DATA_DIR, 'prize-inventory.json');
const PRIZES = [
  { key: 'copo-personalizado', name: 'Copo Personalizado', quantity: 66 },
  { key: 'caneta', name: 'Caneta', quantity: 66 },
  { key: 'chaveiro-cbv', name: 'Chaveiro CBV', quantity: 40 },
  { key: 'presilha-em-flor', name: 'Presilha em Flor', quantity: 30 },
  { key: 'boton', name: 'Botón', quantity: 50 },
  { key: 'relogio', name: 'Relógio', quantity: 26 },
];
let dbPool = null;
let localDrawQueue = Promise.resolve();
const clean = (v, max) => String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').slice(0, max);
const useDatabase = () => String(process.env.DB_ENABLED || 'true').toLowerCase() !== 'false' && !!process.env.DB_HOST;

function getDbPool() {
  if (dbPool) return dbPool;
  const required = ['DB_NAME', 'DB_USER'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Configuração MySQL incompleta: ${missing.join(', ')}`);

  const mysql = require('mysql2/promise');
  dbPool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: 'Z',
  });
  return dbPool;
}

function businessDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (type) => parts.find((p) => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function choosePrize(remaining) {
  const total = remaining.reduce((sum, n) => sum + n, 0);
  if (!total) return null;
  let target = randomInt(total);
  for (let i = 0; i < remaining.length; i++) {
    if (target < remaining[i]) return { prize: PRIZES[i], remaining: remaining[i] - 1 };
    target -= remaining[i];
  }
  return null;
}

async function drawPrizeDatabase(date) {
  const pool = getDbPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const values = PRIZES.map(() => '(?, ?, ?)').join(', ');
    const params = PRIZES.flatMap((p) => [date, p.key, p.quantity]);
    await conn.execute(
      `INSERT IGNORE INTO prize_daily_stock (stock_date, prize_key, remaining) VALUES ${values}`,
      params
    );
    const [rows] = await conn.execute(
      'SELECT prize_key, remaining FROM prize_daily_stock WHERE stock_date = ? ORDER BY prize_key FOR UPDATE',
      [date]
    );
    const remaining = PRIZES.map((p) => Number(rows.find((r) => r.prize_key === p.key)?.remaining || 0));
    const chosen = choosePrize(remaining);
    if (!chosen) {
      await conn.commit();
      return null;
    }
    await conn.execute(
      'UPDATE prize_daily_stock SET remaining = remaining - 1 WHERE stock_date = ? AND prize_key = ? AND remaining > 0',
      [date, chosen.prize.key]
    );
    await conn.commit();
    return { prize: chosen.prize.name, remaining: chosen.remaining };
  } catch (e) {
    try { await conn.rollback(); } catch (_) {}
    throw e;
  } finally {
    conn.release();
  }
}

function drawPrizeLocal(date) {
  const current = localDrawQueue.then(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    let state;
    try { state = JSON.parse(fs.readFileSync(PRIZE_FILE, 'utf8')); } catch (_) {}
    if (!state || state.date !== date || !Array.isArray(state.remaining)) {
      state = { date, remaining: PRIZES.map((p) => p.quantity) };
    }
    const chosen = choosePrize(state.remaining);
    if (!chosen) {
      fs.writeFileSync(PRIZE_FILE, JSON.stringify(state));
      return null;
    }
    const index = PRIZES.indexOf(chosen.prize);
    state.remaining[index] = chosen.remaining;
    fs.writeFileSync(PRIZE_FILE, JSON.stringify(state));
    return { prize: chosen.prize.name, remaining: chosen.remaining };
  });
  localDrawQueue = current.then(() => undefined, () => undefined);
  return current;
}

async function drawPrize(req, res) {
  try {
    await readLead(req); // require a valid JSON request before consuming stock
    const result = useDatabase() ? await drawPrizeDatabase(businessDate()) : await drawPrizeLocal(businessDate());
    if (!result) {
      res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'Os brindes de hoje acabaram.' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(result));
  } catch (e) {
    if (e.statusCode) {
      res.writeHead(e.statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(e.message);
    }
    console.error('Falha ao sortear brinde:', e.code || e.message);
    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Não foi possível sortear agora.' }));
  }
}
const cell = (v) => {
  v = String(v);
  if (/^[=+\-@]/.test(v)) v = "'" + v; // evita injeção de fórmula no Excel
  return '"' + v.replace(/"/g, '""') + '"';
};
function readLead(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let tooLarge = false;
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 4096) tooLarge = true;
    });
    req.on('end', () => {
      if (tooLarge) return reject(Object.assign(new Error('Lead excede o limite'), { statusCode: 413 }));
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(Object.assign(new Error('JSON inválido'), { statusCode: 400 })); }
    });
    req.on('error', reject);
  });
}

function normalizeLead(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) throw Object.assign(new Error('Lead inválido'), { statusCode: 400 });
  const parsed = new Date(r.t);
  return {
    createdAt: (Number.isNaN(parsed.getTime()) ? new Date() : parsed).toISOString().slice(0, 23).replace('T', ' '),
    event: clean(r.event, 30),
    name: clean(r.name, 60),
    phone: clean(r.phone, 20).replace(/[^\d+()\- ]/g, ''),
    detail: clean(r.detail, 120),
    city: clean(r.city, 60),
    state: clean(r.state, 2).toUpperCase(),
  };
}

function saveLeadCsv(lead) {
  const line = [lead.createdAt, lead.event, lead.name, lead.phone, lead.detail, lead.city, lead.state].map(cell).join(',') + '\r\n';
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, '﻿"datahora","evento","nome","telefone","detalhe","cidade","estado"\r\n');
  else {
    const existing = fs.readFileSync(LEADS_FILE, 'utf8');
    const rows = existing.split(/\r?\n/);
    if (rows[0] && !rows[0].includes('"cidade"')) {
      rows[0] += ',"cidade","estado"';
      for (let i = 1; i < rows.length; i++) if (rows[i]) rows[i] += ',"",""';
      fs.writeFileSync(LEADS_FILE, rows.join('\r\n'));
    }
  }
  fs.appendFileSync(LEADS_FILE, line);
}

async function saveLead(req, res) {
  try {
    const lead = normalizeLead(await readLead(req));
    if (useDatabase()) {
      const pool = getDbPool();
      await pool.execute(
        'INSERT INTO leads (created_at, event, name, phone, detail, city, state) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [lead.createdAt, lead.event, lead.name, lead.phone, lead.detail, lead.city, lead.state]
      );
    } else {
      saveLeadCsv(lead);
    }
    res.writeHead(204);
    res.end();
  } catch (e) {
    if (e.statusCode) {
      res.writeHead(e.statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(e.message);
    }
    console.error(useDatabase() ? 'Falha ao gravar lead no MySQL:' : 'Falha ao gravar lead no CSV:', e.code || e.message);
    res.writeHead(useDatabase() ? 503 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(useDatabase() ? 'Banco de dados indisponível; o lead será reenviado.' : 'Não foi possível gravar o lead.');
  }
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.method === 'POST' && req.url.split('?')[0] === '/api/lead') return saveLead(req, res);
    if (req.method === 'POST' && req.url.split('?')[0] === '/api/prize/draw') return drawPrize(req, res);
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
