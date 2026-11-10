# Frenetic Invaders

Manual de uso. O apêndice no fim explica a arquitetura e os componentes do código.

Na tela inicial, **Manual** abre esta mesma leitura em `/manual.html`, numa janela popup do navegador. A página está em `public/manual.html`.

## Uma partida

Você abre o jogo, escreve um callsign de até 10 letras e aperta **Initiate Mission**. A canhoneira nasce no centro, com 1 laser e 3 pontos de escudo. A formação tem 5 filas por 10 colunas em toda onda. Os desenhos são seis recortes da prancha: A1, B1, D1, E2, C4 e E3. Cada fila usa um, e a onda seguinte gira qual fica no topo.

O passo da formação é discreto: ela anda, para, anda. Se encostar numa borda, desce e inverte o sentido. A cada 5 segundos um alien sorteado desce numa elipse, solta uma bomba na metade do caminho até a nave e volta ao lugar na formação. A bomba cai em linha reta.

De vez em quando um disco cruza o alto da tela. A velocidade dele sobe e desce como uma onda, e ele também balança na vertical. Destruí-lo soma 100, 150, 200, 300 ou 500 pontos e solta um módulo. Você pega o módulo encostando a nave nele antes que saia por baixo.

Quando o último alien morre, a simulação para. A tela mostra NÍVEL X COMPLETO e pede Espaço para o nível seguinte. O toque que matou o último alien, a tecla ainda segurada e a repetição do teclado não avançam: solte e aperte Espaço de novo. Nada se move nem atira nesse intervalo. Escudo, placar, tiro duplo e as cargas do canhão lateral ficam. O laser ganha uma carga, até 3, só quando a onda seguinte começa. Nas ondas 5, 10, 15… o escudo ganha um ponto, até 5. A primeira onda não pede essa tecla: Initiate Mission já a começa.

A missão acaba de dois jeitos. Um tiro ou uma bomba acerta a nave sem escudo. Ou a formação, medida pelo lugar dela e não pelo alien que está mergulhando, chega na altura da nave. O escudo não impede esse segundo caso. O score vai uma vez para o Hall of Fame.

## Como abrir

É preciso Node.js e npm. Na pasta do jogo:

```bash
npm install
npm run dev
```

O servidor sobe em `http://localhost:3000`. No macOS ou Linux, `./install.sh` faz os dois passos. No Windows, `install.bat`.

`npm run build` gera `dist/`. `npm start` serve essa pasta quando `NODE_ENV=production`. `npm run lint` é o `tsc --noEmit`.

## Controles

| Tecla | Ação |
|---|---|
| A, D ou setas | Move a nave na horizontal |
| Espaço | Tiro. Cadência de 0,35 s. Com tiro duplo, saem dois |
| X ou Shift | Laser. Gasta 1 carga. Recarga de 1 s entre disparos |
| Espaço, de novo | No intervalo entre ondas, começa a seguinte. Enter e clique não avançam |
| P | Pausa e retoma a partida e o intervalo. A tela mostra PAUSED e "Press P to continue". A tecla repetida não alterna. Soltar a pausa não começa a onda |
| Clique em Initiate Mission | Começa a partida. O campo de callsign precisa ter texto |

O callsign é gravado em maiúsculas, no máximo 10 caracteres. Enter não inicia a missão na tela de abertura e não reinicia depois do game over. Esses dois passos são botões.

## A nave

A Defender é uma canhoneira de frente: fuselagem central, canopy claro e dois pods. A caixa de colisão é 50×40 pixels. A nave anda a 288 pixels por segundo e não sai da tela.

O escudo começa em 3 e vai até 5. Com escudo, um acerto tira 1 ponto, limpa os tiros e as bombas inimigas da tela e deixa a nave invulnerável por 0,55 s. Esse acerto é dano real: somem o canhão de escolta e o tiro duplo. A invulnerabilidade desses 0,55 s nega o hit por completo, então não gasta escudo nem tira o tiro duplo. Sem escudo, o acerto seguinte encerra a partida. O laser não some num hit de escudo: é munição da onda, não um módulo do disco.

Módulos do disco, com estas chances: escolta 40%, tiro duplo 35%, escudo 25%.

- **Escolta.** Até dois canhões, um de cada lado, que seguem a nave. O par divide um carregador de 6 salvas. A cada 0,52 s a salva dispara, de cada canhão montado, a mesma bomba que o disco solta: o mesmo corpo de 20×20, a mesma explosão e o mesmo som. A velocidade só troca de sinal, então a bomba sobe. Gasta uma carga só, mesmo com os dois atirando. O primeiro módulo monta o canhão esquerdo e carrega 6. O segundo monta o direito e não soma outro carregador. Com os dois já presentes, outro módulo recarrega as 6 salvas. A explosão usa o raio crescente da bomba inimiga e fere aliens e o disco. Não fere a nave. Um tiro seu não estoura a própria bomba. Se ela sai por cima da tela, some sem explodir.
- **Tiro duplo.** Não expira com o tempo nem na troca de onda. Os dois plasmas saem com 16 pixels de separação, na mesma cadência do tiro normal, até um hit que realmente cause dano. Hit negado pela invulnerabilidade mantém o upgrade. Partida nova começa sem ele.
- **Escudo.** Soma 1 ponto. No teto de 5, o módulo vira 250 pontos.

Os dois primeiros atravessam a troca de onda. Um acerto, mesmo absorvido pelo escudo, tira os dois.

## Invasores

São três desenhos, de cima para baixo: lula, caranguejo, polvo. Cada um tem dois quadros, trocados a cada passo da marcha.

| Filas | Pontos |
|---|---|
| 1 | 30 |
| 2 e 3 | 20 |
| 4 e 5 | 10 |

A marcha fica mais curta e o passo fica mais longo a cada onda. Na onda 1 o intervalo é 0,78 s e o passo é 12 pixels. Na onda N o intervalo é `0,78 / (1 + (N − 1) × 0,12)` e o passo é `12 × (1 + (N − 1) × 0,05)`. Ao virar a borda, a formação desce 25 pixels.

Um alien em mergulho não atira o tiro comum da marcha. O tiro comum sai na vertical. A bomba do mergulho também cai na vertical e pode ser destruída por um tiro seu. Se você mata o alien antes da metade da elipse, a bomba não sai.

O laser é uma coluna de 30 pixels de largura que dura 0,5 s. Apaga todo alien e o disco que cruzarem essa faixa.

## Disco, céu e placar

O primeiro disco entra entre 10 e 20 segundos de onda. Depois de cada aparição, o próximo espera outro intervalo nessa mesma faixa. A velocidade de base sobe com a onda e é multiplicada por uma onda senoidal que nunca cai abaixo de 30% da base.

O fundo troca a cada onda e repete a cada três fotos, cobrindo a tela sem distorcer:

| Onda | Fundo |
|---|---|
| 1, 4, 7… | Nebulosa roxa |
| 2, 5, 8… | Galáxia dourada |
| 3, 6, 9… | Nebulosa azul |

A lista está em `backgrounds` dentro de `public/config/difficulty.json`. As três imagens já vêm decodificadas antes da primeira onda. Um véu escuro leve deixa a nave, os tiros e o placar legíveis. Se um arquivo não carregar, aquela onda usa o céu pintado.

O céu pintado ainda existe como reserva e também troca a cada onda, repetindo a cada quatro: azul, âmbar, violeta e verde. O campo desce, em três velocidades. Longe: estrelas. No meio: planeta, luas, asteroides e um cometa. Perto: nebulosas e um meteoro. Nada disso colide com a nave.

O Hall of Fame lista os 100 maiores scores, em ordem numérica decrescente, guardados em `scores.db`. O banco não apaga o histórico. Abrir essa tela busca a lista de novo. Os nomes sobem inclinados sobre a arte de abertura, no jeito de um letreiro de cinema. Com movimento reduzido, a lista fica parada e pode ser rolada. O nome enviado é o callsign da partida, junto com o score e a onda em que a missão acabou.

## Som

A abertura toca `01_menu_starfield.mp3`, em loop. Na partida as ondas alternam `02_voo_hiperespaco.mp3`, `03_combate_enxame.mp3` e `04_chefe_nave_mae.mp3`, e a quarta onda volta à segunda faixa. A quarta faixa entra na rotação normal. Não fica reservada a chefe. A faixa da onda continua na tela de onda concluída e só troca quando a onda seguinte começa. Há um único player. M silencia, P pausa a simulação, e `[` `]` mudam o volume. Isso vale para a trilha e para os efeitos. O plasma, a explosão pequena, o disco e o jingle continuam sintetizados. A bomba tem ataque curto, corpo grave e uma cauda mais longa que a explosão de um alien.

---

# Apêndice. Making of

O jogo é um Space Invaders de canvas. React desenha as telas e o placar. A simulação não mora no estado do React.

## Mapa

```text
server.ts                 Express, API de scores, Vite em desenvolvimento
src/main.tsx              Monta o App
src/App.tsx               Telas, teclado, loop e envio do score
src/types.ts              Score e GameState
src/services/soundService.ts
src/game/engine.ts        Regras
src/game/types.ts         World e o que cabe nele
src/game/constants.ts     Números da simulação
src/game/drops.ts         Sorteio puro do disco
src/game/sprites.ts       Bitmaps
src/game/draw.ts          Desenho do quadro
src/game/sky.ts           Céu pintado, reserva
src/game/backgrounds.ts   Fotos do fundo, em ciclo
public/manual.html        Página da janela popup
```

`@google/genai` está no `package.json` e o Vite injeta `GEMINI_API_KEY`. Nenhum arquivo em `src/` chama esse cliente. A partida não usa modelo de linguagem.

## Quem manda em quê

Um exemplo. O alien morre, o score sobe, o React mostra o número novo.

1. `App` guarda as teclas em `GameEngine.setKey`.
2. O `requestAnimationFrame` acumula o tempo real e chama `engine.update(1/60)` no máximo três vezes por quadro. O passo fixo está em `STEP`.
3. `update` devolve um `HudSnapshot`: score, onda, lasers, escudo, tempos de módulo, `over` e `bannerLevel`.
4. Se a chave do snapshot mudou, `App` copia isso para o estado do React. O canvas não espera esse estado. `engine.draw` lê o `World` direto.

O `World` é o estado da partida: nave, invasores, tiros, bombas, feixe, disco, módulos, partículas, céu, score, onda, invulnerabilidade e o banner da onda limpa. O React não guarda posição de alien.

Telas, no tipo `GameState`:

| Estado | O que a tela faz |
|---|---|
| `START` | Callsign, missão, Hall of Fame, Manual. Música de abertura |
| `PLAYING` | Loop ligado |
| `LEVEL_UP` | Intervalo. O loop para. `engine.advance()` só roda num Espaço novo |
| `GAME_OVER` | Um `POST /api/scores`. Retry chama `engine.start()` |
| `LEADERBOARD` | `GET /api/scores` |

O botão Manual chama `window.open('/manual.html', 'frenetic-manual', 'popup=yes,…')` a partir do clique. Se o navegador bloquear a popup, a tela inicial avisa.

A API é pequena. `GET /api/scores` devolve no máximo os 100 maiores, por score numérico e, no empate, pelo id mais antigo. `POST /api/scores` exige `name`, `score` e `level` e grava sem apagar os registros antigos (`scores.db`, tabela `high_scores`). Em desenvolvimento o Express usa o Vite como middleware. Em produção serve `dist/`, inclusive `musica/` e `title/`.

## O passo de simulação

`update` sai na hora se `over` ou se `bannerLevel` está preenchido. Por isso o intervalo congela marcha, módulos, tiros e céu. Nada se move, nada atira e não há dano.

Na ordem, quando a partida corre: mover a nave, tiro, laser, tiros amigos, feixe, disco, tiros inimigos, bombas, módulos caindo, escoltas, marcha, mergulho, acertos nos aliens. Se todos estão mortos e a lista não está vazia, `openBanner` guarda o número da onda atual, limpa tiros, bombas, feixe, disco e explosões, corta o som do disco e toca o jingle. Não incrementa a onda. Escudo, placar, tiro duplo, escoltas e cargas do canhão lateral ficam. Um módulo que ainda estava caindo atravessa o intervalo e continua na onda seguinte.

A tela mostra `NÍVEL X COMPLETO` e pede Espaço para o nível `X+1`. O primeiro nível não usa esse aviso: o botão da tela inicial já começa a onda 1. O Espaço que matou o último alien, a tecla ainda segurada e a repetição automática do teclado não contam. O jogo espera soltar e apertar de novo. `P` durante o intervalo pausa por cima do aviso; soltar a pausa não começa a onda. `advance` é que zera o banner e chama `nextLevel`.

`nextLevel` soma 1 na onda, dá o laser, dá o escudo nas múltiplas de 5, limpa tiros, bombas, feixe, disco e flutuadores, troca o céu e gera outra formação. Não mexe em escolta nem em tiro duplo. A faixa da onda seguinte entra no ciclo 02/03/04 só nesse momento. Durante o intervalo a faixa da onda que acabou continua.

O acerto na nave está em `hurt`. Com escudo, desce um ponto e zera `wings` e `twin`. Sem escudo, `fail` marca `over`, para a música e toca o game over. A formação usa a mesma `fail` quando `homeY` passa de `player.y - 20`.

## Componentes da simulação

**Constantes.** Tudo que é velocidade está em pixels por segundo. O tiro sobe a 480. O módulo cai a 140. A tela lógica é 800×600, desenhada com o `devicePixelRatio` limitado a 2. O CSS pede o mesmo tamanho em pixels CSS.

**Drops.** `ufoPoints` e `rollPickup` recebem um número em `[0, 1)` e não leem o `World`. O motor passa `Math.random()`. Dá para testar o sorteio sem canvas.

**Dificuldade.** `public/config/difficulty.json` define marcha, tiros inimigos, bomba do disco e mergulho. A quantidade de aliens continua 5×10. O formato está em `public/config/README.md`. Se o arquivo faltar ou um campo for inválido, o jogo usa o padrão embutido e avisa no console. Depois da onda 6 o acréscimo de tiros por segundo é menor, há um teto de tiros na tela e sai um tiro por vez, fora do passo da marcha.

**Naves.** Os mapas 8×8, 16×14 e 8×6 continuam no código como referência de forma. A nave do jogador é o recorte da folha 2×2: pose neutra e as duas inclinações de 15%. O quadrante dos disparos azuis não é usado. A proporção da folha entra na caixa 50×40 com o nariz no mesmo ponto nas três poses. A inclinação segue o movimento e para junto com a pausa, porque usa o tempo da simulação. A escolta continua o pod. O disco continua o anel na caixa 60×25. Entram seis recortes da prancha, A1, B1, D1, E2, C4 e E3, com o fundo, a grade e o rótulo fora. C3 e D5 não entram. A fila e a onda escolhem qual recorte aparece e não mudam tipo, pontos ou caixa. Cada recorte gera oito poses uma vez (respiração curta e um balanço na base). O quadro sai do tempo da simulação: parado, a pose não avança. A chama da nave é um efeito à parte, no mesmo tempo, e não usa o quadrante dos disparos azuis. O canvas usa o `devicePixelRatio` até 2 e não força pixelização. O plasma é a mesma gota de antes, com 40% da largura; o comprimento e a caixa de 4×12 não mudaram.

**Desenho.** `drawWorld` pinta o céu, a formação, o mergulhador por cima com um fantasma, o disco, módulos, bombas, tiros, feixe, escoltas, nave, partículas e os números que flutuam. O HUD de canvas fica na faixa de baixo. O shake de impacto é um `translate` em volta do quadro, tirado antes do HUD.

**Céu.** A foto da onda é `(level - 1) % backgrounds.length`, desenhada em cover no canvas lógico. O mesmo enquadramento vale com `devicePixelRatio` 2, porque o contexto já está escalado. Se a imagem não chegou, `createSky(level)` escolhe `(level - 1) % 4` e monta o tema com um gerador `mulberry32` semeado pelo índice. O tema da onda se repete. O número de luas (de uma a quatro) e a rota do cometa são sorteados de novo a cada onda. Planeta, lua e asteroide descem com `speed`. O cometa guarda `vx` e `vy` constantes, ângulo uniforme em 360°, e a cauda aponta para o lado oposto. `drift` desloca tudo na lateral quando a nave se move. A câmera é um número perto de −1…1 derivado do x da nave, filtrado em `updateDecor`. Estrelas são as mais lentas. Corpos do meio vêm depois. Nebulosas e meteoros são os mais rápidos, e não compartilham o mesmo valor entre si. A nebulosa é um conjunto de gradientes radiais com um núcleo claro e nós escuros, não uma elipse chapada.

**Som.** Um `AudioContext` com ganho master em 0,28 e um compressor. A trilha é um único `HTMLAudioElement` em loop, ligado nesse ganho, servido de `public/musica`. A mesma faixa não reinicia entre `PLAYING` e `LEVEL_UP`. Troca de onda ou nova partida troca ou recomeça o arquivo. O disco segura um seno contínuo enquanto existe. A explosão da bomba é síntese local: estalo, corpo no médio (para o alto-falante), grave e cauda. O disco e o canhão lateral disparam esse som uma vez, na detonação. P pausa a simulação e o contexto de áudio; soltar P retoma sem pular o tempo. Mute e volume permanecem. O círculo que piscava virou flash curto, onda de choque, brasas, detritos e fumaça. O shake só aparece se o sistema não pediu movimento reduzido.

## O que o código não faz

Não há bunkers no chão. A proteção é o escudo da nave. O README antigo descrevia barreiras, três lasers iniciais e Enter para começar. Isso não corresponde ao jogo atual.

O mergulho não tira o alien da formação para sempre. `homeX` e `homeY` continuam sendo a vaga. A marcha anda a vaga. O desenho só sai dela enquanto `dive` existe.
