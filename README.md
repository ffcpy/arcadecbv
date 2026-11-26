# Arcade Bem Viver • ExpoTEA — totem touchscreen

5 mini games em HTML/CSS/JS puro, servidos por Node.js. O backend usa `mysql2` para persistir leads no MySQL quando configurado; sem configuração do banco, mantém o CSV local como alternativa. Cadastro de nome, telefone, cidade e estado na entrada, com Roleta da Sorte ao fim de cada partida.

## Cadastro e leads
- Ao tocar em "Começar" o visitante preenche **nome e telefone** (teclado na tela), cidade e estado antes de ver os jogos.
- Com MySQL configurado, cada cadastro, resultado e brinde é inserido em `arcade_bem_viver.leads` (datahora, evento, nome, telefone, detalhe, cidade e estado). Sem `DB_HOST`, o servidor grava em `data/leads.csv`.
- Uma cópia fica no navegador (localStorage); se o servidor estiver fora, os registros ficam na fila e são reenviados depois. Abrindo `index.html` direto, só há a cópia local: **Ctrl+Shift+L** baixa o CSV.

### Conectar ao MySQL
1. Execute no MySQL Workbench o SQL de criação do banco e da tabela `leads`.
2. Copie `.env.example` para `.env` e preencha `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`.
3. No Workbench, selecione o mesmo schema e execute [`sql/prize_daily_stock.sql`](sql/prize_daily_stock.sql).
4. Rode `npm install` uma vez e depois `npm start` (ou `npm run kiosk`). O `.env` é local e está ignorado pelo Git.

Requer Node.js 20.12 ou superior para carregar o arquivo `.env`. O usuário MySQL configurado precisa inserir na tabela `leads` e ler/inserir/atualizar `prize_daily_stock`.

## Cotas diárias de brindes
- Por dia (fuso de São Paulo): 66 copos personalizados, 66 canetas, 40 chaveiros CBV, 30 presilhas em flor, 50 botons e 26 relógios.
- O servidor sorteia com probabilidade proporcional ao estoque restante e baixa a unidade dentro de uma transação MySQL. Assim, sorteios simultâneos em vários totens não ultrapassam as cotas. A contagem diária começa no primeiro sorteio daquele dia.
- Sem MySQL, as cotas são mantidas em `data/prize-inventory.json` para o servidor local. Essa alternativa é adequada a um único servidor; para vários totens, todos devem usar o mesmo banco.
- Ao esgotarem os brindes do dia, a roleta informa a equipe e permite seguir para a tela de resultado. Quando há prêmio, nome e instrução de retirada também aparecem nessa tela junto ao QR code.

## Fluxo por visitante
- Ao fim de cada partida aparece a roleta de brindes e depois o resultado com o botão **Próximo jogador** (volta sozinho após 35 s, `NEXT_SECS` em `js/app.js`): a sessão é zerada e a tela de cadastro reaparece para a próxima pessoa.
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
Rode `npm install` uma vez para instalar o driver MySQL. Também funciona abrindo `index.html` direto, mas nesse modo os leads ficam apenas no navegador.

### Modo totem manual (tela cheia, sem barras)
```
msedge --kiosk file:///C:/caminho/gamecbv/index.html --edge-kiosk-type=fullscreen
chrome --kiosk --autoplay-policy=no-user-gesture-required file:///C:/caminho/gamecbv/index.html
```
O toque em "JOGAR AGORA" também pede tela cheia ao navegador.

## Estrutura
- `js/core.js` — áudio (WebAudio), trilha instrumental, partículas, proteções de touch/zoom
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
