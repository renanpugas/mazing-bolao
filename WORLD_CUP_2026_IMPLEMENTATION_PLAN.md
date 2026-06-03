# Plano de Implementacao: Copa do Mundo 2026

## Objetivo

Usar a API gratuita `worldcup2026` como fonte de dados da Copa do Mundo 2026, salvando as informacoes no banco da aplicacao. A API externa sera usada para importacao e sincronizacao, nao como dependencia direta das telas.

A estrutura principal do produto deve continuar sendo:

```text
pool
  -> match
    -> prediction
```

`prediction` continua representando exclusivamente o palpite do usuario para uma partida.

## Fonte De Dados

Endpoints principais:

```text
GET https://worldcup26.ir/get/games
GET https://worldcup26.ir/get/teams
GET https://worldcup26.ir/get/groups
GET https://worldcup26.ir/get/stadiums
```

Arquivos raw do GitHub como fallback:

```text
https://raw.githubusercontent.com/rezarahiminia/worldcup2026/main/football.matches.json
https://raw.githubusercontent.com/rezarahiminia/worldcup2026/main/football.teams.json
https://raw.githubusercontent.com/rezarahiminia/worldcup2026/main/football.matchtables.json
https://raw.githubusercontent.com/rezarahiminia/worldcup2026/main/football.stadiums.json
```

## Decisoes Do MVP

- Usar `worldcup2026` como fonte principal para calendario, selecoes, grupos e estadios.
- Salvar os dados no nosso banco antes de exibir na UI.
- Usar emoji de bandeira no lugar de fotos/URLs de bandeiras.
- Manter uma copia das informacoes principais diretamente em `match` para facilitar a tela de palpites.
- Criar uma acao manual para importar/sincronizar a Copa em um bolao.
- Nao criar previsoes estatisticas externas neste momento, porque essa API nao fornece endpoint de predictions.

## Mudancas No Banco

### Tabela `match`

Expandir a tabela atual com campos da Copa 2026:

```text
external_source
external_id
season
stage
group_name
matchday
home_team_external_id
away_team_external_id
home_team_label
away_team_label
home_team_emoji
away_team_emoji
stadium_external_id
stadium_name
stadium_city
home_score
away_score
finished
time_elapsed
raw_payload
last_synced_at
```

Indice recomendado:

```text
unique(pool_id, external_source, external_id)
```

### Tabela `team`

Criar tabela para selecoes:

```text
id
external_source
external_id
name
fifa_code
iso2
group_name
emoji
raw_payload
last_synced_at
```

O campo `emoji` deve ser derivado do `iso2` quando possivel. Para casos especiais como `ENG` e `SCO`, usar mapeamento manual.

### Tabela `stadium`

Criar tabela para estadios:

```text
id
external_source
external_id
name
fifa_name
city
country
capacity
region
raw_payload
last_synced_at
```

### Tabela `group_standing`

Criar tabela para classificacao dos grupos:

```text
id
external_source
season
group_name
team_external_id
played
wins
draws
losses
points
goals_for
goals_against
goals_diff
raw_payload
last_synced_at
```

## Normalizacao Dos Dados

A API retorna diversos valores como string. Normalizar antes de persistir:

```text
"0" -> 0
"FALSE" -> false
"TRUE" -> true
"null" -> null
"notstarted" -> "notstarted"
"06/11/2026 13:00" -> Date/timestamp
```

Para mata-mata, a API retorna times ainda indefinidos:

```text
home_team_id = "0"
away_team_id = "0"
home_team_label = "Winner Match 101"
away_team_label = "Winner Match 102"
```

Nesses casos, a UI deve exibir `home_team_label` e `away_team_label` ate que os times reais sejam definidos.

## Emojis De Bandeira

Usar emoji em vez de URL de imagem para selecoes.

Regra geral:

- Converter `iso2` para regional indicator symbols quando for codigo ISO valido.
- Exemplo: `BR` -> `🇧🇷`, `AR` -> `🇦🇷`, `PT` -> `🇵🇹`.

Mapeamentos manuais necessarios:

```text
ENG -> 🏴
SCO -> 🏴
```

Se algum `iso2` nao puder ser convertido, usar `null` e deixar a UI ocultar a bandeira.

## Servico De Integracao

Criar um modulo interno para a integracao:

```text
packages/api/src/services/worldcup2026.ts
```

Responsabilidades:

```text
fetchGames()
fetchTeams()
fetchGroups()
fetchStadiums()
normalizeGame()
normalizeTeam()
normalizeGroup()
normalizeStadium()
getFlagEmoji()
syncWorldCup2026(poolId)
```

## Fluxo De Sincronizacao

`syncWorldCup2026(poolId)` deve:

1. Buscar times.
2. Buscar estadios.
3. Buscar grupos.
4. Buscar jogos.
5. Fazer upsert de times.
6. Fazer upsert de estadios.
7. Fazer upsert de grupos/classificacao.
8. Fazer upsert das partidas do `poolId`.

Cada bolao tera suas proprias linhas em `match`:

```text
pool A -> match external_id 1
pool B -> match external_id 1
```

Isso preserva o modelo atual e permite que cada bolao tenha seus proprios palpites.

## Rotas Internas

MVP minimo:

```text
worldCup.sync({ poolId })
```

Evolucao possivel:

```text
worldCup.status
worldCup.teams
worldCup.groups
worldCup.stadiums
worldCup.matches
```

## Atualizacoes Em Predictions

Atualizar `predictions.list` para retornar dados enriquecidos da partida:

```text
match: {
  id
  homeTeam
  awayTeam
  homeTeamLabel
  awayTeamLabel
  homeTeamEmoji
  awayTeamEmoji
  startsAt
  stage
  groupName
  matchday
  stadiumName
  stadiumCity
  homeScore
  awayScore
  finished
  timeElapsed
}
```

Adicionar validacoes em `predictions.create` e `predictions.update`:

- Bloquear palpite apos `startsAt`.
- Garantir que a partida pertence ao `poolId` informado.
- Garantir que o usuario participa do bolao.

## Frontend

Trocar a tela `predictions.vue`, que hoje usa mocks, para dados reais:

1. Listar boloes reais.
2. Selecionar bolao.
3. Buscar partidas e palpites do bolao.
4. Renderizar jogos agrupados por fase, grupo ou rodada.
5. Mostrar horario, estadio, cidade, status e emojis de bandeira.
6. Permitir palpite apenas antes do inicio da partida.
7. Mostrar labels de mata-mata quando os times ainda nao existem.

## Ranking

Criar depois uma camada de ranking usando `prediction + match`.

Pontuacao inicial sugerida:

```text
5 pontos: placar exato
3 pontos: acertou vencedor ou empate
1 ponto: acertou gols do mandante
1 ponto: acertou gols do visitante
0 pontos: errou tudo
```

Recomendacao inicial: calcular dinamicamente. Persistir `points` em `prediction` apenas se houver necessidade de performance ou auditoria.

## Testes

Adicionar testes para:

- Normalizacao de jogo.
- Conversao de data.
- Conversao de boolean/numeros.
- Conversao de `iso2` para emoji.
- Importacao cria 104 partidas no bolao.
- Sync nao duplica partidas.
- Usuario nao palpita em bolao que nao participa.
- Usuario nao altera palpite apos inicio do jogo.
- Mata-mata com `team_id = 0` mostra labels corretamente.

## Ordem De Execucao

1. Criar schema/migrations para novos campos e tabelas.
2. Criar normalizadores da API `worldcup2026`.
3. Criar servico de sync.
4. Criar rota protegida para sincronizar um bolao.
5. Atualizar `predictions.list`.
6. Atualizar tela de palpites para usar dados reais.
7. Adicionar bloqueio de palpite apos inicio.
8. Criar testes.
9. Implementar ranking.

## Riscos E Mitigacoes

- API sem SLA: salvar snapshot no banco e usar GitHub raw como fallback.
- Dados podem mudar: permitir resync manual/admin.
- Datas em formato nao ideal: centralizar parse em normalizador testado.
- Mata-mata com times indefinidos: suportar labels no banco e na UI.
- Campos externos inconsistentes: salvar `raw_payload` para auditoria e correcoes futuras.
