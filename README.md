# Arcade Bem Viver • ExpoTEA — totem touchscreen

4 mini games em HTML/CSS/JS puro. Sem backend, sem build, sem dependências, sem internet.

## Executar
```
npm start          # http://localhost:8080  (PORT=3000 npm start para mudar a porta)
npm run kiosk      # sobe o servidor e abre Edge/Chrome em tela cheia (modo totem)
```
Não precisa de `npm install` (zero dependências). Também funciona abrindo `index.html` direto.

### Modo totem manual (tela cheia, sem barras)
```
msedge --kiosk file:///C:/caminho/gamecbv/index.html --edge-kiosk-type=fullscreen
chrome --kiosk --autoplay-policy=no-user-gesture-required file:///C:/caminho/gamecbv/index.html
```
O toque em "JOGAR AGORA" também pede tela cheia ao navegador.

## Estrutura
- `js/core.js` — áudio (WebAudio), partículas, proteções de touch/zoom
- `js/app.js` — telas, sessão em memória, HUD, resultado, retorno por inatividade (aviso aos 45 s, reset aos 60 s)
- `js/games/*.js` — cada jogo é independente: `Arcade.games.<id> = { meta, create(stage, api) -> { begin, destroy } }`
- `js/icons.js` — ícones e ilustrações SVG (mascote sol, arte dos jogos, cartas da memória)
- `css/style.css` — identidade visual (paleta Bem Viver, Fredoka + Nunito em `assets/fonts`, logos em `assets/img`)
- Conforto sensorial: sem flashes/tremores, sons suaves, botão de som, respeita `prefers-reduced-motion`

## Ajustes rápidos
- Inatividade: `IDLE_WARN` / `IDLE_RESET` no topo de `js/app.js`
- Duração: `TOTAL_TIME` (dots.js), `DURATION` (reflex.js)
- Para adicionar um jogo: crie o arquivo, registre em `Arcade.games` e inclua o id em `Arcade.order` (core.js) + `<script>` no index.html
