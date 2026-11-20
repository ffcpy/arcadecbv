/* Sobe o servidor e abre o navegador em modo totem (tela cheia). Uso: npm run kiosk */
const { spawn } = require('child_process');
const fs = require('fs');
const { createServer, PORT } = require('../server');

const url = `http://localhost:${PORT}`;
const edge = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => fs.existsSync(p));
const chrome = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => fs.existsSync(p));

createServer().listen(PORT, () => {
  console.log(`Servidor em ${url}`);
  const flags = ['--kiosk', url, '--autoplay-policy=no-user-gesture-required', '--no-first-run', '--overscroll-history-navigation=0', '--disable-pinch'];
  if (edge) spawn(edge, flags.concat('--edge-kiosk-type=fullscreen'), { detached: true, stdio: 'ignore' }).unref();
  else if (chrome) spawn(chrome, flags, { detached: true, stdio: 'ignore' }).unref();
  else console.log('Edge/Chrome não encontrados. Abra a URL acima manualmente.');
});
