# Arcade Bem Viver • ExpoTEA — totem touchscreen

5 mini games em HTML/CSS/JS puro. Sem build, sem dependências, sem internet. Cadastro (nome + telefone) na entrada e Roleta da Sorte com brinde.

## Cadastro e leads
- Ao tocar em "Começar" o visitante preenche **nome e telefone** (teclado na tela) antes de ver os jogos.
- Com `npm start`, cada cadastro e cada resultado de jogo é gravado em `data/leads.csv` (datahora, evento, nome, telefone, detalhe). A pasta `data/` nunca é servida pelo navegador e está no `.gitignore`.
- Uma cópia fica no navegador (localStorage); se o servidor estiver fora, os registros ficam na fila e são reenviados depois. Abrindo `index.html` direto, só há a cópia local: **Ctrl+Shift+L** baixa o CSV.

## Fluxo por visitante
- Ao fim de cada partida aparece o resultado com o botão **Próximo jogador** (volta sozinho após 12 s, `NEXT_SECS` em `js/app.js`): a sessão é zerada e a tela de cadastro (nome + telefone) reaparece para a próxima pessoa.
- Jogo da Memória: cartas com Bem Viver, ExpoTEA, mascote, sol, peça de quebra-cabeça do autismo + coração, estrela e flor.

## Roleta da Sorte
- 3 figuras iguais na linha = brinde. Figuras: símbolo Bem Viver, ExpoTEA, mascote, sol e a **peça de quebra-cabeça do autismo**.
- Ajustes no topo de `js/games/roulette.js`: `ATTEMPTS` (giros por visitante, padrão 3), `WIN_CHANCE` (chance por giro, padrão 0,35 ≈ 72% dos visitantes ganham), `NEAR_MISS`.
- O limite de tentativas vale para a sessão inteira (sair e voltar não devolve giros). O evento `roulette` no CSV traz `brinde=sim/nao`.

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
- `js/leads.js` (coleta) · `js/signup.js` (cadastro) · `js/games/roulette.js` (roleta)
- Para adicionar um jogo: crie o arquivo, registre em `Arcade.games` e inclua o id em `Arcade.order` (core.js) + `<script>` no index.html
