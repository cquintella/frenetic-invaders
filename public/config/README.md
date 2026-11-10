# Dificuldade

`difficulty.json` é lido ao abrir o jogo. Um campo ausente ou inválido volta ao padrão embutido no código, com um aviso no console. O jogo não para. Valores fora da faixa segura são limitados.

A curva sobe até `shots.knee` (onda 6) com `ratePerLevel` e, depois disso, com `ratePerLevelAfterKnee`, que é menor. `shots.volley` é 1: sai um tiro por vez, de um alien vivo que não está mergulhando. `maxAlive` recusa tiros novos quando a tela já tem esse tanto.

`levels` troca o resultado de uma onda. A chave é o número da onda. Exemplo: `"8": { "maxAlive": 4 }`.

A formação continua com 5 filas de 10. O JSON não muda essa quantidade.

| Campo | Efeito |
| --- | --- |
| `march.intervalBase` / `intervalPerLevel` / `intervalMin` | Segundos entre passos da formação. O intervalo encolhe com a onda e não passa de `intervalMin`. |
| `march.stepBase` / `stepPerLevel` / `stepMax` | Pixels de cada passo lateral. |
| `march.drop` | Pixels que a formação desce ao bater na borda. |
| `shots.rateBase` / `ratePerLevel` / `ratePerLevelAfterKnee` / `knee` / `rateMax` | Tiros inimigos por segundo. Depois da onda `knee` o acréscimo é o valor menor. |
| `shots.speedBase` / `speedPerLevel` / `speedPerLevelAfterKnee` / `speedMax` | Velocidade do tiro inimigo, em pixels por segundo. |
| `shots.maxAliveBase` / `maxAlivePerLevel` / `maxAliveMax` | Teto de tiros inimigos ao mesmo tempo. |
| `shots.volley` | Quantos tiros saem no mesmo instante. O máximo aceito é 2. |
| `bombs.ufoPerSecondBase` / `ufoPerSecondPerLevel` / `ufoPerSecondMax` | Tentativas de bomba do disco por segundo. A bomba ainda só sai perto da nave, como antes. |
| `bombs.ufoSpeedBase` / `ufoSpeedPerLevel` / `ufoSpeedMax` | Velocidade do disco. |
| `dives.intervalBase` / `intervalPerLevel` / `intervalMin` | Segundos entre mergulhos. |
| `dives.duration` | Duração de um mergulho. |
