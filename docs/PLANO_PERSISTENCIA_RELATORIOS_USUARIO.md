# Plano de Persistencia de Chats e Relatorios por Usuario

## Objetivo

Este documento define como o Modo Relatorio do GovGo v2 deve persistir, no BDS1/Supabase, os chats, mensagens, relatorios, favoritos de relatorio e estado visual de workspace de cada usuario.

A premissa principal e preservar a UI atual do Modo Relatorio. A mudanca proposta e de persistencia e arquitetura: substituir os arquivos locais em `data/` por tabelas Supabase ligadas ao usuario autenticado.

## Contexto Verificado

### BDS1

O BDS1 ja possui uma camada de usuario para outras frentes:

- `public.user_prompts`: historico/configuracao de buscas.
- `public.user_results`: snapshot dos resultados de busca por prompt.
- `public.user_bookmarks`: favoritos de editais.
- `public.user_resumos`: resumos por usuario e edital.
- `public.user_schedule` e `public.user_boletim`: boletins.
- `public.user_settings`, `public.user_usage_events`, `public.user_usage_counters`: plano, uso e limites.

Nao ha, no schema atual, tabelas especificas para:

- chats do Modo Relatorio;
- mensagens do chat NL -> SQL;
- relatorios SQL gerados;
- favoritos/salvos do Modo Relatorio;
- estado de abas abertas do workspace de Relatorios.

### V2 Atual

O Modo Relatorio hoje esta funcional, mas a persistencia e local:

- `data/reports_chats.json`
- `data/reports_history.json`
- `data/reports_workspace.json`

O backend atual ja expoe rotas autenticadas:

- `GET /api/reports/history`
- `GET /api/reports/history/:id`
- `POST /api/reports/run`
- `POST /api/reports/execute`
- `POST /api/reports/save`
- `GET /api/reports/workspace`
- `POST /api/reports/workspace`
- `DELETE /api/reports/history/:id`
- `DELETE /api/reports/chats/:id`
- `GET /api/reports/:id/export`

Essas rotas devem permanecer como contrato de UI. A troca deve acontecer por baixo, no repositorio de dados.

## Decisao de Modelo

Nao salvar todas as linhas de todos os relatorios por padrao.

O banco deve guardar:

- pergunta original;
- SQL gerado;
- SQL executado;
- titulo/subtitulo gerados pelo assistant;
- colunas;
- preview pequeno;
- contagem de linhas;
- status/erro;
- metadados de execucao.

Ao abrir um relatorio, exportar ou restaurar uma aba, o backend deve reexecutar o SQL em modo somente leitura, aplicando os limites atuais do Modo Relatorio.

Motivo:

- evita inflar o banco com resultados enormes;
- preserva a paginacao de 10 linhas no frontend;
- permite exportar com limite maior;
- mantem o relatorio como consulta reproduzivel.

Se no futuro houver necessidade de snapshot imutavel, deve-se criar uma tabela ou storage separado para cache de resultados.

## Tabelas Propostas

### `public.user_report_chats`

Guarda cada conversa do Modo Relatorio.

Campos:

| Campo | Tipo | Observacao |
| --- | --- | --- |
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `user_id` | `uuid` | Usuario dono, referencia `auth.users(id)` |
| `openai_thread_id` | `text` | Thread do assistant SQL, quando existir |
| `title` | `text` | Titulo do chat, preferencialmente titulo do primeiro relatorio |
| `active` | `boolean` | Controle simples de ativo/inativo |
| `created_at` | `timestamptz` | Criacao |
| `updated_at` | `timestamptz` | Ultima mensagem/alteracao |
| `deleted_at` | `timestamptz` | Soft delete |
| `metadata` | `jsonb` | Extensoes futuras |

### `public.user_report_messages`

Guarda os baloes do chat.

Campos:

| Campo | Tipo | Observacao |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `user_id` | `uuid` | Redundante de proposito para RLS e filtros |
| `chat_id` | `uuid` | FK para `user_report_chats(id)` |
| `role` | `text` | `user` ou `assistant` |
| `content` | `text` | Texto do balao |
| `sql` | `text` | SQL do assistant, quando houver |
| `report_id` | `uuid` | Relatorio gerado por essa resposta |
| `report_title` | `text` | Snapshot do titulo para renderizacao rapida |
| `report_subtitle` | `text` | Snapshot do subtitulo |
| `row_count` | `integer` | Numero de linhas do relatorio |
| `status` | `text` | `ok`, `error`, `deleted` |
| `error` | `text` | Erro de SQL/execucao, quando houver |
| `message_order` | `integer` | Ordem explicita da mensagem dentro do chat |
| `created_at` | `timestamptz` | Criacao |
| `metadata` | `jsonb` | Extensoes futuras |

### `public.user_reports`

Guarda cada relatorio gerado ou salvo.

Campos:

| Campo | Tipo | Observacao |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `user_id` | `uuid` | Usuario dono |
| `chat_id` | `uuid` | Chat de origem, opcional |
| `message_id` | `uuid` | Mensagem assistant de origem, opcional |
| `question` | `text` | Pergunta em linguagem natural |
| `sql` | `text` | SQL salvo |
| `executed_sql` | `text` | SQL efetivamente executado apos validacao/limite |
| `title` | `text` | Titulo gerado pelo assistant `OPENAI_ASSISTANT_REPORT_TITLE_v0` |
| `subtitle` | `text` | Subtitulo gerado pelo assistant |
| `columns` | `jsonb` | Lista de colunas |
| `preview_rows` | `jsonb` | Preview pequeno, por exemplo 20 linhas |
| `row_count` | `integer` | Total retornado dentro do limite de execucao |
| `elapsed_ms` | `integer` | Tempo de execucao |
| `status` | `text` | `ok` ou `error` |
| `error` | `text` | Mensagem de erro, quando houver |
| `is_favorite` | `boolean` | Relatorio favoritado/salvo |
| `favorited_at` | `timestamptz` | Quando foi favoritado |
| `created_at` | `timestamptz` | Criacao |
| `updated_at` | `timestamptz` | Atualizacao |
| `last_opened_at` | `timestamptz` | Ultima abertura |
| `deleted_at` | `timestamptz` | Soft delete |
| `metadata` | `jsonb` | Detalhes extras, versao de assistant, limites, etc. |

### `public.user_report_workspace`

Guarda estado visual da tela de Relatorios por usuario.

Campos:

| Campo | Tipo | Observacao |
| --- | --- | --- |
| `user_id` | `uuid` | PK, referencia `auth.users(id)` |
| `active_chat_id` | `uuid` | Chat ativo |
| `active_report_id` | `uuid` | Relatorio/aba ativa |
| `history_mode` | `text` | `chats`, `reports` ou `favorites` |
| `chat_open` | `boolean` | Box de chat expandido/colapsado |
| `tabs` | `jsonb` | Lista compacta de abas abertas |
| `updated_at` | `timestamptz` | Ultima persistencia |

## DDL Inicial Sugerido

Este DDL e um ponto de partida para migration. Ele ainda deve ser revisado antes de rodar em producao.

```sql
CREATE TABLE public.user_report_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  openai_thread_id text,
  title text NOT NULL DEFAULT 'Novo chat',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id uuid REFERENCES public.user_report_chats(id),
  message_id uuid,
  question text,
  sql text NOT NULL,
  executed_sql text,
  title text NOT NULL DEFAULT 'Relatorio',
  subtitle text,
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  preview_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  row_count integer NOT NULL DEFAULT 0,
  elapsed_ms integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ok',
  error text,
  is_favorite boolean NOT NULL DEFAULT false,
  favorited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_opened_at timestamptz,
  deleted_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.user_report_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id uuid NOT NULL REFERENCES public.user_report_chats(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  sql text,
  report_id uuid REFERENCES public.user_reports(id),
  report_title text,
  report_subtitle text,
  row_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ok',
  error text,
  message_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.user_reports
  ADD CONSTRAINT user_reports_message_id_fkey
  FOREIGN KEY (message_id) REFERENCES public.user_report_messages(id);

CREATE TABLE public.user_report_workspace (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_chat_id uuid REFERENCES public.user_report_chats(id),
  active_report_id uuid REFERENCES public.user_reports(id),
  history_mode text NOT NULL DEFAULT 'chats',
  chat_open boolean NOT NULL DEFAULT true,
  tabs jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

## Indices Recomendados

```sql
CREATE INDEX idx_user_report_chats_user_updated
  ON public.user_report_chats (user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_user_report_messages_chat_created
  ON public.user_report_messages (chat_id, created_at ASC);

CREATE INDEX idx_user_report_messages_chat_order
  ON public.user_report_messages (chat_id, message_order ASC, created_at ASC);

CREATE INDEX idx_user_reports_user_created
  ON public.user_reports (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_user_reports_user_favorite
  ON public.user_reports (user_id, is_favorite, favorited_at DESC, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_user_reports_chat_created
  ON public.user_reports (chat_id, created_at DESC)
  WHERE deleted_at IS NULL;
```

## Processos CRUD

### Chats

Criar:

- Quando o usuario envia a primeira pergunta em um chat novo.
- Criar linha em `user_report_chats`.
- Guardar `openai_thread_id` quando o assistant SQL criar ou reaproveitar thread.

Ler:

- `GET /api/reports/history` deve retornar tambem `chats`.
- Listar por `user_id`, `deleted_at IS NULL`, ordenando por `updated_at DESC`.

Atualizar:

- Atualizar `title` quando o primeiro relatorio receber titulo do assistant.
- Atualizar `updated_at` a cada mensagem.
- Atualizar `openai_thread_id` quando houver troca/recuperacao de thread.

Apagar:

- `DELETE /api/reports/chats/:id`.
- Usar soft delete em `user_report_chats.deleted_at`.
- Nao apagar relatorios automaticamente; eles podem continuar no historico de Relatorios.

### Mensagens

Criar:

- Antes de executar: criar mensagem `role = user`.
- Depois de executar: criar mensagem `role = assistant` com SQL, status, erro e `report_id`.

Ler:

- Ao abrir chat, buscar mensagens por `chat_id`, ordenadas por `message_order`, com `created_at` e `id` apenas como desempate.

Atualizar:

- Se o relatorio relacionado for apagado, marcar a mensagem assistant como `status = deleted` ou limpar `report_id`, mantendo o texto do chat.

Apagar:

- Preferir nao apagar mensagem isolada nesta fase.
- Apagar por soft delete do chat, se necessario em fase futura.

### Relatorios

Criar:

- Ao concluir `POST /api/reports/run` ou `POST /api/reports/execute`.
- Salvar pergunta, SQL, preview, colunas, status e titulo/subtitulo.

Ler lista:

- `GET /api/reports/history` retorna:
  - `history`: todos os relatorios do usuario;
  - `saved`: relatorios com `is_favorite = true`;
  - `chats`: lista de chats.

Ler detalhe:

- `GET /api/reports/history/:id`.
- Buscar metadados em `user_reports`.
- Reexecutar SQL read-only com limite padrao.
- Atualizar `last_opened_at`.

Atualizar:

- Favoritar/salvar: `is_favorite = true`, `favorited_at = now()`.
- Eventualmente desfavoritar: `is_favorite = false`, `favorited_at = null`.
- Regerar titulo em manutencao futura, se necessario.

Apagar:

- `DELETE /api/reports/history/:id`.
- Usar soft delete em `user_reports.deleted_at`.
- Limpar ou marcar referencias em `user_report_messages`.

Exportar:

- `GET /api/reports/:id/export`.
- Reexecutar SQL read-only com limite de exportacao.
- Gerar CSV/XLSX em memoria, como hoje.

### Workspace

Criar/Atualizar:

- `POST /api/reports/workspace`.
- Upsert em `user_report_workspace`.
- Salvar somente estado compacto:
  - abas;
  - relatorio ativo;
  - chat ativo;
  - modo do historico;
  - chat aberto/fechado.

Ler:

- `GET /api/reports/workspace`.
- Restaurar UI sem buscar todos os dados pesados.
- Hidratar relatorio ativo pelo endpoint de detalhe quando necessario.

Apagar:

- Normalmente nao apaga.
- Ao apagar chat ou relatorio, limpar referencias invalidas na proxima gravacao.

## Alteracoes de Backend

Criar um repositorio de dados para o Modo Relatorio, por exemplo:

- `src/backend/reports/api/repository.py`

Responsabilidades:

- encapsular SQL de `user_report_*`;
- serializar/deserializar `jsonb`;
- expor funcoes equivalentes aos helpers atuais de JSON;
- manter a API publica atual do `service.py`.

Trocas previstas:

- `_load_history_all` / `_save_history_all` devem virar queries em `user_reports`;
- `_load_chats_all` / `_save_chats_all` devem virar queries em `user_report_chats` e `user_report_messages`;
- `_load_workspace_all` / `_save_workspace_all` devem virar upsert em `user_report_workspace`;
- `_history_for_user`, `_chats_for_user`, `_record_report`, `_save_chat`, `_mark_saved`, `_delete_history_item`, `_delete_chat_item` devem chamar o repositorio.

Manter:

- validacao read-only de SQL;
- bloqueio de SQL destrutivo;
- `statement_timeout`;
- limite padrao de execucao;
- limite maior de exportacao;
- assistant SQL atual;
- assistant de titulo `OPENAI_ASSISTANT_REPORT_TITLE_v0`;
- rotas atuais.

## Alteracoes de UI

A UI deve permanecer como esta.

Mudancas esperadas apenas por dados:

- Historico `Chats` vem de `user_report_chats`.
- Historico `Relatorios` vem de `user_reports`.
- Historico `Favoritos` vem de `user_reports.is_favorite`.
- Cards continuam com toggle titulo/SQL, copiar e apagar.
- Chat continua com textarea de tres linhas.
- Abas continuam persistidas por usuario.
- Tabela continua paginada em 10 linhas.

Estados a manter:

- carregando chat;
- carregando relatorio;
- erro ao reexecutar SQL salvo;
- relatorio apagado;
- chat apagado;
- sessao expirada/renovada.

## Migracao dos JSONs Atuais

Etapa temporaria, para nao perder o que ja foi testado no v2.

Origem:

- `data/reports_chats.json`
- `data/reports_history.json`
- `data/reports_workspace.json`

Destino:

- `user_report_chats`
- `user_report_messages`
- `user_reports`
- `user_report_workspace`

Regras:

- preservar IDs UUID existentes quando validos;
- mapear `userId` para `user_id`;
- mapear `threadId` para `openai_thread_id`;
- mapear `saved` para `is_favorite`;
- mapear `reportIds` para relacao por mensagens e `chat_id`;
- preservar `previewRows`, `columns`, `rowCount`, `elapsedMs`, `status`, `error`;
- se `title == question` em registros antigos, manter como legado, mas deixar a UI continuar sem subtitulo falso.

## RLS e Seguranca

As tabelas devem ser protegidas por usuario.

Politica conceitual:

```sql
-- Exemplo conceitual
user_id = auth.uid()
```

Para `user_report_workspace`, a chave e o proprio `user_id`.

Mesmo que o v2 use backend local com cookie de sessao e queries server-side, RLS no Supabase e importante para proteger acesso direto futuro.

## Eventos de Uso

O BDS1 possui `user_usage_events` com tipos atuais limitados. Para rastrear relatorios, ha duas opcoes:

1. Expandir o check constraint de `user_usage_events.event_type`.
2. Criar eventos apenas depois da estabilizacao da persistencia.

Eventos recomendados para fase futura:

- `report_query`
- `report_success`
- `report_error`
- `report_save`
- `report_delete`
- `report_export`
- `report_chat_create`
- `report_chat_delete`

## Ordem de Implantacao

1. Criar migration SQL das quatro tabelas e indices.
2. Criar `repository.py` para acesso ao Supabase/Postgres.
3. Adaptar `service.py` mantendo as rotas atuais.
4. Implementar script de backfill dos JSONs locais para as novas tabelas.
5. Rodar validacao CRUD com usuario autenticado:
   - criar chat;
   - gerar relatorio;
   - listar chats;
   - listar relatorios;
   - abrir relatorio;
   - favoritar;
   - exportar;
   - apagar relatorio;
   - apagar chat;
   - restaurar workspace.
6. Validar que a UI nao mudou visualmente.
7. Manter fallback JSON por uma janela curta de homologacao, se necessario.
8. Remover fallback JSON quando a persistencia Supabase estiver homologada.

## Riscos

- Inconsistencia historica de tipo em tabelas antigas: algumas usam `user_id text`, outras `uuid`. Para as novas tabelas, a recomendacao e `uuid`.
- Relatorios antigos em JSON podem ter `title == question`; a migracao deve preservar, mas a UI ja trata esse legado.
- SQL salvo pode deixar de executar se o schema mudar; nesse caso, a tela deve mostrar o erro e manter o historico.
- Resultados reexecutados podem mudar com o tempo, pois a base PNCP muda. Se for necessario snapshot imutavel, criar cache separado.
- Relatorios muito pesados precisam continuar sob `statement_timeout` e limites de linhas.

## Resultado Esperado

Com essa implantacao, cada usuario tera:

- seus chats reais de Modo Relatorio salvos no Supabase;
- historico completo de mensagens;
- relatorios gerados com titulo, SQL, preview e metadados;
- favoritos de relatorio;
- abas e workspace restaurados ao voltar para a tela;
- exportacao e reabertura funcionando sem depender de arquivos locais.

## Status de Implantacao

Atualizado em 2026-05-01.

Concluido:

- migration criada em `db/migrations/20260501_user_report_persistence.sql`;
- migration incremental criada em `db/migrations/20260501_user_report_message_order.sql`;
- tabelas aplicadas no Supabase/BDS1:
  - `public.user_report_chats`;
  - `public.user_report_messages`;
  - `public.user_reports`;
  - `public.user_report_workspace`;
- indices e RLS aplicados;
- repositiorio de persistencia criado em `src/backend/reports/api/repository.py`;
- `src/backend/reports/api/service.py` passou a usar Supabase quando as tabelas existem, mantendo fallback JSON se `GOVGO_REPORTS_STORAGE=json` ou se o schema nao estiver disponivel;
- scripts criados:
  - `scripts/apply_reports_persistence_migration.py`;
  - `scripts/migrate_reports_json_to_db.py`;
  - `scripts/backfill_report_message_order.py`;
- JSONs locais migrados para o banco:
  - 47 relatorios ativos;
  - 10 chats ativos;
  - 94 mensagens;
  - 2 workspaces.

Validacoes executadas:

- `py_compile` em `run.py`, `service.py`, `repository.py` e scripts;
- smoke test CRUD direto no servico:
  - criar chat;
  - criar relatorio;
  - listar historico;
  - favoritar relatorio;
  - salvar/restaurar workspace;
  - apagar relatorio;
  - apagar chat;
- leitura do servico confirmou dados vindo do banco novo:
  - historico retornando relatorios;
  - favoritos retornando registros;
  - chats retornando mensagens;
  - workspace restaurando aba ativa.
- `message_order` foi adicionado a `user_report_messages` e preenchido:
  - primeiro por fallback `created_at + role + id`;
  - depois pela ordem exata preservada em `data/reports_chats.json`, quando existente;
  - validacao confirmou ausencia de ordens duplicadas em chats ativos e ausencia de `message_order` nulo.

Observacao:

- um registro legado de smoke test com `userId` textual (`codex-smoke-title-ui`) foi ignorado na migracao porque as novas tabelas usam `uuid` com FK para `auth.users`, como planejado.
