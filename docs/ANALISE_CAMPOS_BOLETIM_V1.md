# Análise Campo a Campo do Gerador de Boletins V1

Data de referência: 2026-04-24

## Objetivo

Este documento consolida o entendimento do fluxo de boletins do GovGo v1 a partir de duas fontes:

1. o schema real da base Supabase;
2. os scripts em `C:\Users\Haroldo Duraes\Desktop\Scripts\GovGo\v1\search\gvg_browser\scripts` e o módulo de apoio `gvg_boletim.py`.

O foco aqui é responder, com precisão:

- quais tabelas o gerador de boletins usa;
- quais campos existem de fato;
- como cada campo é utilizado no código atual;
- quais campos estão subutilizados, legados ou sem efeito prático no cron da Render.

## Escopo analisado

Arquivos lidos:

- `v1/search/gvg_browser/scripts/run_pipeline_boletim.sh`
- `v1/search/gvg_browser/scripts/00_pipeline_boletim.py`
- `v1/search/gvg_browser/scripts/00_run_pipeline_boletim.bat`
- `v1/search/gvg_browser/scripts/01_run_scheduled_boletins.py`
- `v1/search/gvg_browser/scripts/02_send_boletins_email.py`
- `v1/search/gvg_browser/scripts/03_backfill_preproc_output.py`
- `v1/search/gvg_browser/scripts/backfill_user_settings.py`
- `v1/search/gvg_browser/gvg_boletim.py`

Schema consultado ao vivo na base:

- `public.user_schedule`
- `public.user_boletim`
- índices e foreign keys dessas duas tabelas

## Visão geral do pipeline

O pipeline diário do boletim roda assim:

1. `run_pipeline_boletim.sh`
2. `00_pipeline_boletim.py`
3. `01_run_scheduled_boletins.py`
4. `02_send_boletins_email.py`

O fluxo funcional é:

1. selecionar boletins ativos e elegíveis para execução;
2. executar a busca para cada boletim;
3. gravar os resultados materializados em `user_boletim`;
4. enviar email para os boletins cujo último run ainda não foi refletido em `last_sent_at`;
5. atualizar `last_run_at`, `last_sent_at` e, quando necessário, `preproc_output`.

As tabelas centrais são:

- `public.user_schedule`: definição e estado do boletim agendado;
- `public.user_boletim`: histórico materializado dos resultados gerados por execução.

## Tabela `public.user_schedule`

### Papel da tabela

É a tabela-mãe do recurso de boletim. Cada linha representa um boletim agendado de um usuário.

Ela guarda:

- quem é o usuário;
- qual consulta será executada;
- como a busca deve ser montada;
- com que frequência deve rodar;
- e o estado operacional mínimo do ciclo.

### Campos

#### `id`

- Tipo: `bigint`
- Nulo: não
- Default: `nextval('user_boletins_id_seq'::regclass)`

Uso atual:

- chave primária do boletim;
- usada como `boletim_id` em `user_boletim`;
- usada em quase todas as operações do `gvg_boletim.py`.

Observação:

- o nome da sequência ainda remete ao schema/objeto legado `user_boletins`, o que indica rename histórico não totalmente limpo.

#### `created_at`

- Tipo: `timestamp with time zone`
- Nulo: não
- Default: `now()`

Uso atual:

- campo histórico;
- não participa da lógica de agendamento diário.

#### `updated_at`

- Tipo: `timestamp with time zone`
- Nulo: não
- Default: `now()`

Uso atual:

- atualizado nas operações de manutenção do boletim;
- não é usado como base de decisão no cron.

#### `user_id`

- Tipo: `text`
- Nulo: não

Uso atual:

- identifica o dono do boletim;
- usado para buscar email do usuário em `auth.users`;
- entra em filtros e joins lógicos do fluxo.

Observação:

- não há foreign key formal para `auth.users`.

#### `query_text`

- Tipo: `text`
- Nulo: não

Uso atual:

- texto-base da busca do boletim;
- passado para o motor de busca no `01_run_scheduled_boletins.py`.

Observação:

- é o equivalente persistido da consulta digitada pelo usuário.

#### `schedule_type`

- Tipo: `text`
- Nulo: não

Uso atual:

- define a periodicidade do boletim;
- hoje o código trabalha principalmente com lógica de `daily` e `weekly`.

Observação:

- a elegibilidade do boletim é calculada com base neste campo, não em `next_run_at`.

#### `schedule_detail`

- Tipo: `jsonb`
- Nulo: não

Uso atual:

- guarda detalhes finos da recorrência;
- o uso mais importante hoje é `schedule_detail.days`, lido para decidir em quais dias o boletim pode rodar.

Observação:

- a estrutura é flexível e conveniente, mas empurra validação para o código.

#### `channels`

- Tipo: `jsonb`
- Nulo: não

Uso atual:

- armazenado e lido pelo pipeline;
- normalizado nos scripts;
- em tese deveria definir canais de entrega.

Situação atual:

- o cron atual não faz branching real por canal;
- o pipeline de envio acaba sendo, na prática, um pipeline de email.

Conclusão:

- o campo existe e é lido, mas está subaproveitado.

#### `config_snapshot`

- Tipo: `jsonb`
- Nulo: não

Uso atual:

- é o coração da configuração de busca do boletim;
- dele saem parâmetros como:
  - `search_type`
  - `search_approach`
  - `relevance_level`
  - `sort_mode`
  - `max_results`
  - `top_categories_count`
  - `use_search_v2`

Observação:

- este campo congela a configuração da busca no momento de criação/edição do boletim;
- isso é importante porque desacopla a execução agendada das preferências atuais da UI.

#### `next_run_at`

- Tipo: `timestamp with time zone`
- Nulo: sim

Uso atual:

- indexado;
- presente no schema;
- praticamente não utilizado pela lógica do cron atual.

Conclusão:

- hoje o cron da Render não agenda com base em `next_run_at`;
- a decisão é recalculada em tempo real via `schedule_type`, `schedule_detail`, `last_run_at` e `last_sent_at`.

Este é um dos campos mais importantes do ponto de vista de dívida técnica: parece correto no modelo, mas não é a fonte real de verdade do scheduler.

#### `last_run_at`

- Tipo: `timestamp with time zone`
- Nulo: sim

Uso atual:

- marca a última execução do boletim;
- é usado para:
  - evitar rodar o mesmo boletim fora da janela prevista;
  - filtrar só resultados novos em comparação com execuções anteriores;
  - orientar a atualização incremental do boletim.

É um dos campos mais operacionais da tabela.

#### `active`

- Tipo: `boolean`
- Nulo: não
- Default: `true`

Uso atual:

- filtra boletins ativos na seleção do pipeline;
- entra também em índices parciais.

#### `last_sent_at`

- Tipo: `timestamp with time zone`
- Nulo: sim

Uso atual:

- usado no `02_send_boletins_email.py` para decidir se já houve envio correspondente ao run mais recente;
- evita repetição de envio no mesmo ciclo.

Observação:

- o cron atual usa `last_sent_at` como principal marcador de envio, e não os campos `sent` / `sent_at` da tabela `user_boletim`.

#### `filters`

- Tipo: `jsonb`
- Nulo: sim

Uso atual:

- armazena o recorte estrutural aplicado à busca;
- o `01_run_scheduled_boletins.py` converte esse JSON em `sql_conditions`.

Observação:

- este é o canal de persistência dos filtros do boletim, não do texto livre da consulta.

#### `preproc_output`

- Tipo: `jsonb`
- Nulo: sim

Uso atual:

- cache do pré-processamento da consulta;
- se já existir, o pipeline reaproveita;
- se não existir, ele gera e depois salva de volta em `user_schedule`.

É um campo importante para performance e previsibilidade.

Conclusão:

- é um cache operacional persistido no próprio agendamento.

### Índices de `user_schedule`

- `user_schedule_pkey` em `id`
- `idx_user_boletins_next_run` em `next_run_at` com predicado `active`
- `idx_user_boletins_user_active` em `user_id` com predicado `active`

Observação importante:

- o índice de `next_run_at` hoje existe mais por intenção arquitetural do que por uso real no cron.

### Leitura arquitetural de `user_schedule`

Esta tabela mistura três naturezas de dados:

1. definição funcional do boletim (`query_text`, `filters`, `config_snapshot`);
2. definição de agenda (`schedule_type`, `schedule_detail`, `channels`);
3. estado operacional (`last_run_at`, `last_sent_at`, `preproc_output`, `active`).

Ela funciona, mas concentra muita responsabilidade num lugar só.

## Tabela `public.user_boletim`

### Papel da tabela

É a materialização de cada execução do boletim.

Cada linha corresponde a um resultado retornado por uma execução específica.

Na prática, ela guarda:

- de qual boletim aquele resultado veio;
- em qual rodada (`run_token`) ele foi gerado;
- qual contratação PNCP entrou no boletim;
- alguns campos de ordenação/controle;
- e um `payload` JSON compacto para renderização/envio.

### Campos

#### `id`

- Tipo: `bigint`
- Nulo: não
- Default: `nextval('user_boletim_id_seq'::regclass)`

Uso atual:

- chave primária da linha materializada.

#### `created_at`

- Tipo: `timestamp with time zone`
- Nulo: não
- Default: `now()`

Uso atual:

- carimbo de criação;
- não é o principal marcador temporal da execução, porque o campo operacional real é `run_at`.

#### `boletim_id`

- Tipo: `bigint`
- Nulo: não

Uso atual:

- foreign key para `user_schedule(id)`;
- associa cada resultado ao boletim gerador.

#### `user_id`

- Tipo: `text`
- Nulo: não

Uso atual:

- redundância útil para filtragem por usuário;
- evita depender sempre de join com `user_schedule`.

#### `run_token`

- Tipo: `text`
- Nulo: não

Uso atual:

- identificador lógico de uma execução;
- agrupa todas as linhas geradas na mesma rodada.

Observação:

- é central para reconstruir “o último boletim gerado”.

#### `run_at`

- Tipo: `timestamp with time zone`
- Nulo: não

Uso atual:

- carimbo operacional da execução;
- usado para encontrar o último run do boletim;
- usado pelo sender para recuperar os registros mais recentes.

#### `numero_controle_pncp`

- Tipo: `text`
- Nulo: não

Uso atual:

- vínculo direto com `public.contratacao`;
- identifica qual edital/contratação entrou naquele boletim.

#### `similarity`

- Tipo: `numeric`
- Nulo: sim

Uso atual:

- persistência do score do resultado;
- útil para ordenação e exibição.

#### `data_publicacao_pncp`

- Tipo: `text`
- Nulo: sim

Uso atual:

- suporte ao delta incremental;
- informação de apoio para renderização/envio.

Observação:

- o fato de estar em `text` repete a fragilidade estrutural da base principal.

#### `data_encerramento_proposta`

- Tipo: `text`
- Nulo: sim

Uso atual:

- apoio para renderização do boletim;
- também sofre do mesmo problema de tipagem fraca.

#### `payload`

- Tipo: `jsonb`
- Nulo: sim

Uso atual:

- contém o “mini snapshot” do resultado para consumo do produto;
- hoje inclui principalmente:
  - `objeto`
  - `orgao`
  - `unidade`
  - `municipio`
  - `uf`
  - `valor`
  - `modalidade`
  - `modo_disputa`
  - `data_publicacao_pncp`
  - `data_encerramento_proposta`
  - `links.origem`
  - `links.processo`

Observação:

- esse campo é o principal cache de apresentação do boletim.

#### `sent`

- Tipo: `boolean`
- Nulo: não
- Default: `false`

Uso atual:

- existe no schema e em helpers do `gvg_boletim.py`;
- porém o fluxo real da Render não usa esse campo como verdade principal de envio.

Conclusão:

- campo parcialmente legado ou, no mínimo, subutilizado.

#### `sent_at`

- Tipo: `timestamp with time zone`
- Nulo: sim

Uso atual:

- mesma situação de `sent`;
- previsto no modelo, mas fora do fluxo principal do cron atual.

### Índices de `user_boletim`

- `user_boletim_pkey` em `id`
- `idx_user_boletim_boletim_pncp` em `(boletim_id, numero_controle_pncp)`
- `idx_user_boletim_run_at` em `(run_at)`
- `idx_user_boletim_run_token` em `(run_token)`
- `idx_user_boletim_user_sent` em `(user_id, sent)`

### Foreign keys de `user_boletim`

- `user_boletim_boletim_id_fkey` -> `public.user_schedule(id)`
- `user_boletim_numero_controle_pncp_fkey` -> `public.contratacao(numero_controle_pncp)`

### Leitura arquitetural de `user_boletim`

Ela cumpre dois papéis ao mesmo tempo:

1. trilha histórica de execuções;
2. cache materializado para renderização e envio.

Esse desenho é pragmático e funciona bem para boletim, porque evita rerodar busca no momento do envio.

## Como os campos entram no fluxo real

### Etapa 1: seleção dos boletins a executar

Fonte principal: `user_schedule`

Campos efetivamente relevantes:

- `active`
- `schedule_type`
- `schedule_detail`
- `last_run_at`
- `last_sent_at`
- `query_text`
- `filters`
- `config_snapshot`
- `preproc_output`

Campos irrelevantes para a elegibilidade imediata:

- `next_run_at`
- `updated_at`

### Etapa 2: execução da busca

Fonte principal: `user_schedule`

Campos relevantes:

- `query_text`
- `filters`
- `config_snapshot`
- `preproc_output`
- `last_run_at`

Resultado:

- geração de um `run_token`
- construção das linhas de `user_boletim`

### Etapa 3: persistência do run

Fonte principal: `user_boletim`

Campos preenchidos:

- `boletim_id`
- `user_id`
- `run_token`
- `run_at`
- `numero_controle_pncp`
- `similarity`
- `data_publicacao_pncp`
- `data_encerramento_proposta`
- `payload`

E atualização em `user_schedule`:

- `last_run_at`
- `preproc_output` se necessário

### Etapa 4: envio por email

Fonte principal:

- `user_schedule`
- `user_boletim`
- `auth.users`

Campos realmente usados:

- `user_schedule.last_sent_at`
- `user_boletim.run_at`
- `user_boletim.payload`

Observação importante:

- o envio atual se ancora em `last_sent_at`, e não em `user_boletim.sent`.

### Etapa 5: marcação de envio

Atualização real hoje:

- `user_schedule.last_sent_at`

Campos que poderiam ser usados, mas não são o centro do fluxo:

- `user_boletim.sent`
- `user_boletim.sent_at`

## Campos subutilizados ou com dívida técnica

### `user_schedule.next_run_at`

Existe, é indexado, parece importante, mas não é a fonte de verdade do scheduler atual.

Isso cria divergência entre:

- o que o schema sugere;
- e o que o cron realmente faz.

### `user_schedule.channels`

O campo já existe para multi-canal, mas o pipeline concreto está basicamente hardcoded para email.

### `user_boletim.sent` / `sent_at`

O modelo sugere controle por linha materializada, mas o fluxo produtivo usa `last_sent_at` em `user_schedule`.

Resultado:

- há duas camadas possíveis de controle de envio;
- a camada por linha materializada ficou em segundo plano.

### Datas em `text`

Tanto `data_publicacao_pncp` quanto `data_encerramento_proposta` permanecem em `text`, repetindo a fragilidade da modelagem PNCP principal.

## Conclusões

### O que está bem resolvido

- separação entre agenda (`user_schedule`) e materialização (`user_boletim`);
- uso de `run_token` para agrupar execuções;
- persistência de `preproc_output` para evitar retrabalho;
- cache de payload que elimina rerun da busca no momento do envio.

### O que está desalinhado

- `next_run_at` não governa de fato o scheduler;
- `channels` não está plenamente operacionalizado;
- `sent` / `sent_at` em `user_boletim` existem, mas não comandam o fluxo atual;
- datas continuam fracamente tipadas.

### Leitura final

O gerador de boletins do v1 está funcional e pragmaticamente bom, mas ele carrega sinais claros de evolução incremental:

- parte do schema aponta para uma arquitetura mais rica;
- o cron da Render usa uma versão mais simples e direta dessa arquitetura.

Em outras palavras:

- a base já prevê mais capacidades do que o pipeline diário realmente exerce.

## Recomendações para migração futura ao v2

1. Escolher uma única fonte de verdade para agenda:
   - ou `next_run_at`
   - ou recálculo por `schedule_type` e `schedule_detail`

2. Escolher uma única fonte de verdade para status de envio:
   - ou `user_schedule.last_sent_at`
   - ou `user_boletim.sent/sent_at`

3. Tipar datas do histórico materializado.

4. Tornar `channels` realmente operacional, ou simplificar o modelo enquanto houver só email.

5. Manter `payload` como cache de apresentação, porque essa parte do desenho é boa e reduz custo operacional.
