# Dificuldade

`difficulty.json` é lido ao abrir o jogo. Um campo ausente ou inválido volta ao padrão embutido no código, com um aviso no console. O jogo não para. Valores fora da faixa segura são limitados.

A curva sobe até `shots.knee` (onda 6) com `ratePerLevel` e, depois disso, com `ratePerLevelAfterKnee`, que é menor. `shots.volley` é 1: sai um tiro por vez, de um alien vivo que não está mergulhando. `maxAlive` recusa tiros novos quando a tela já tem esse tanto.

`levels` troca o resultado de uma onda. A chave é o número da onda. Exemplo: `"8": { "maxAlive": 4 }` ou `"3": { "count": 12 }`. `rows` e `columns` juntos fixam o retângulo daquela onda.

A quantidade de aliens começa em 6 e sobe 4 por onda, até 50. O jogo escolhe um bloco perto de 2 colunas por fila, no máximo 5×10, e centra cada fila.

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
| `formation.countBase` / `countPerLevel` / `countMax` | Aliens na onda. A onda 1 usa a base. O teto é 50, a formação antiga de 5×10. |
| `formation.columnsMax` / `rowsMax` | Limite do bloco. Cada fila é centrada na tela. |
