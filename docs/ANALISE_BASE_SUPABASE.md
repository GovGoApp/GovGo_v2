# Analise da Base Supabase do GovGo v2

## Contexto

Esta analise foi feita em `2026-04-24` diretamente sobre a base Supabase configurada no arquivo raiz `.env`, usando introspeccao de:

- `information_schema`
- `pg_catalog`
- `pg_indexes`
- `pg_stat_user_tables`

O objetivo foi responder a tres perguntas:

1. como a base esta organizada;
2. quais tabelas e campos sustentam o GovGo hoje;
3. quais sao os pontos fortes e os debitos estruturais da modelagem.

## Arquivos gerados nesta rodada

- snapshot bruto de schema: `tmp/supabase_schema_snapshot.json`
- este documento: `docs/ANALISE_BASE_SUPABASE.md`
- snapshot textual no estilo legado: `C:\Users\Haroldo Duraes\Desktop\Scripts\GovGo\v1\db\BDS1_v7.txt`

## Complemento a partir do `BDS1_v6`

Tambem foi lido o arquivo legado:

- `C:\Users\Haroldo Duraes\Desktop\Scripts\GovGo\v1\db\BDS1_v6.txt`

Esse arquivo e util porque registra, em formato DDL simplificado, o estado da base `public` em uma fotografia anterior. Ele ajuda a separar:

- o que ja existia e foi mantido;
- o que foi acrescentado depois;
- e o que mudou no desenho da base entre a geracao do `v6` e o estado atual.

### O que o `BDS1_v6` acrescenta a esta leitura

1. confirma que a base vinha sendo registrada historicamente como snapshot textual de schema;
2. mostra a ordem conceitual das tabelas no dominio do GovGo;
3. evidencia herancas legadas de nomenclatura, como:
   - `user_boletins_id_seq`
   - tabelas de teste
   - checks e defaults que continuam vivos na base atual;
4. serve como base de comparacao para verificar crescimento do schema `public`.

### Diferencas principais entre `BDS1_v6` e a base atual

Novas tabelas presentes no schema atual e ausentes no `v6`:

- `cnae`
- `municipios`
- `so_prompt`

Novas views presentes no schema atual:

- `vw_contratos_por_fornecedor`
- `vw_fornecedores`
- `vw_fornecedores_pendentes`
- `vw_index_build_progress`

Leitura pratica:

- a base atual ganhou mais apoio analitico e de referencia territorial/fiscal;
- o snapshot antigo focava essencialmente nas tabelas;
- o estado atual ja inclui tambem views operacionais e de apoio.

### Resultado desta rodada

Com base na introspeccao da base atual, foi gerado um novo snapshot textual mantendo o mesmo espirito do legado:

- `C:\Users\Haroldo Duraes\Desktop\Scripts\GovGo\v1\db\BDS1_v7.txt`

Esse `v7`:

- preserva o formato de leitura do `v6`;
- reflete o schema `public` atual;
- inclui as tabelas novas;
- e acrescenta as views atualmente existentes no `public`.

## Visao geral do banco

Banco identificado:

- engine: PostgreSQL 17
- usuario atual: `postgres`
- database atual: `postgres`

Schemas nao sistemicos encontrados:

| Schema | Qtde de objetos | Papel percebido |
|---|---:|---|
| `public` | 37 | dominio do GovGo |
| `auth` | 23 | autenticacao Supabase |
| `storage` | 8 | storage de arquivos do Supabase |
| `realtime` | 3 | realtime do Supabase |
| `cron` | 2 | jobs agendados |
| `vault` | 2 | segredos |
| `extensions` | 2 | views tecnicas |
| `sommelier` | 1 | componente auxiliar do stack Supabase |
| `graphql` | presente | schema tecnico |
| `graphql_public` | presente | schema tecnico |

Leitura pratica:

- o schema realmente importante para o produto e o `public`;
- `auth`, `storage`, `realtime`, `vault`, `graphql` e `cron` sao infraestrutura do ecossistema Supabase;
- a modelagem do GovGo mistura **catalogo PNCP**, **camada semantica por embeddings** e **camada de produto SaaS**.

## Conclusoes executivas

### 1. O eixo central da base e `numero_controle_pncp`

Em vez de depender principalmente de IDs internos, a base usa `numero_controle_pncp` como chave de ligacao entre:

- `contratacao`
- `item_contratacao`
- `contrato`
- `user_results`
- `user_documents`
- `user_resumos`
- `user_boletim`

Isso casa muito bem com o dominio do produto e com a navegacao da UI.

### 2. Existe uma camada semantica separada e madura

As tabelas `_emb` mostram um desenho claro:

- `contratacao` -> `contratacao_emb`
- `contrato` -> `contrato_emb`
- `ata` -> `ata_emb`
- `pca` -> `pca_emb`

Essas tabelas ja armazenam:

- embeddings completos
- halfvec
- top categories
- metadata
- confidence

E ha indices vetoriais reais em producao:

- HNSW em `categoria.cat_embeddings_hv`
- HNSW e IVFFLAT em `contratacao_emb.embeddings`
- IVFFLAT em `contrato_emb.embeddings_hv`

### 3. A base ja sustenta um SaaS completo, nao so um buscador

A camada `user_*` e `system_*` indica que o produto foi pensado como aplicacao comercial com:

- usuarios
- planos
- billing
- eventos de uso
- prompts persistidos
- resultados persistidos
- bookmarks
- boletins
- resumos
- documentos do usuario

### 4. O principal debito estrutural e tipagem fraca em tabelas de negocio

Varios campos centrais do PNCP estao em `text`, inclusive:

- datas
- codigos numericos
- parte dos valores monetarios

Exemplo importante:

- `contratacao.valor_total_estimado` esta em `text`
- `item_contratacao.valor_total_estimado` esta em `numeric`

Isso aumenta:

- custo de normalizacao na aplicacao
- risco em filtros
- risco em ordenacao
- risco em comparacoes e agregacoes

### 5. O maior volume esta em `contrato_emb`

Estimativa atual de linhas:

- `contrato_emb`: ~2.712.720
- `item_contratacao`: ~35.662
- `contrato`: ~20.405
- `contratacao`: ~10.920
- `contratacao_emb`: ~10.920

Isso indica que:

- o custo operacional da base esta mais concentrado em embeddings de contrato do que na tabela principal de editais;
- qualquer tuning semantico pesado precisa olhar primeiro para `contrato_emb` e seus indices.

## Modelo logico macro

O desenho geral da base pode ser lido assim:

### Catalogo principal

- `contratacao` = oportunidade / edital / compra
- `item_contratacao` = itens do edital
- `contrato` = contratos derivados da compra
- `ata` = atas
- `pca` = PCA

### Taxonomias

- `categoria` = taxonomia governamental usada na busca
- `cnae` = taxonomia CNAE
- `municipios` = dicionario geografico

### Camada semantica

- `contratacao_emb`
- `contrato_emb`
- `ata_emb`
- `pca_emb`

### Camada de produto

- `user_prompts`
- `user_results`
- `user_documents`
- `user_resumos`
- `user_settings`
- `user_usage_events`
- `user_usage_counters`
- `user_bookmarks`
- `user_boletim`
- `user_payment`
- `system_plans`
- `system_config`

## Relacionamentos principais

FKs mais relevantes encontrados:

- `contratacao.cod_cat` -> `categoria.cod_cat`
- `item_contratacao.numero_controle_pncp` -> `contratacao.numero_controle_pncp`
- `contrato.numero_controle_pncp_compra` -> `contratacao.numero_controle_pncp`
- `contrato_emb.numero_controle_pncp` -> `contrato.numero_controle_pncp`
- `ata_emb.numero_controle_pncp_ata` -> `ata.numero_controle_ata_pncp`
- `pca_emb.id_pca_pncp` -> `pca.numero_controle_pca_pncp`
- `user_results.prompt_id` -> `user_prompts.id`
- `user_results.numero_controle_pncp` -> `contratacao.numero_controle_pncp`
- `user_documents.numero_controle_pncp` -> `contratacao.numero_controle_pncp`
- `user_resumos.numero_controle_pncp` -> `contratacao.numero_controle_pncp`
- `user_boletim.numero_controle_pncp` -> `contratacao.numero_controle_pncp`
- `user_payment.plan_id` -> `system_plans.id`
- `user_settings.plan_id` -> `system_plans.id`
- `user_settings.next_plan_id` -> `system_plans.id`

Leitura pratica:

- o grafo de negocio gira em torno de `contratacao`;
- `contrato` e `item_contratacao` sao satelites principais da compra;
- quase toda a camada de produto que precisa referenciar um edital referencia `numero_controle_pncp`.

## Tabelas principais detalhadas

### 1. `public.contratacao`

Funcao:

- tabela central de oportunidades/editais/compras do PNCP

Volume estimado:

- ~10.920 linhas

PK:

- `id_contratacao`

Chaves uteis:

- `numero_controle_pncp` (unique)
- `cod_cat` -> `categoria.cod_cat`

Campos principais por grupo:

**Identificacao**
- `numero_controle_pncp`
- `ano_compra`
- `sequencial_compra`
- `numero_compra`
- `processo`

**Objeto e negocio**
- `objeto_compra`
- `informacao_complementar`
- `fontes_orcamentarias`
- `srp`

**Datas**
- `data_abertura_proposta`
- `data_encerramento_proposta`
- `data_publicacao_pncp`
- `data_inclusao`
- `data_atualizacao`
- `data_atualizacao_global`

**Valores**
- `valor_total_estimado` (`text`)
- `valor_total_homologado` (`numeric`)

**Classificacao e status**
- `modalidade_id`
- `modalidade_nome`
- `modo_disputa_id`
- `modo_disputa_nome`
- `situacao_compra_id`
- `situacao_compra_nome`
- `tipo_instrumento_convocatorio_codigo`
- `tipo_instrumento_convocatorio_nome`
- `cod_cat`
- `score`

**Orgao e unidade**
- `orgao_entidade_cnpj`
- `orgao_entidade_razao_social`
- `orgao_entidade_poder_id`
- `orgao_entidade_esfera_id`
- `unidade_orgao_codigo_unidade`
- `unidade_orgao_nome_unidade`
- `unidade_orgao_codigo_ibge`
- `unidade_orgao_uf_nome`
- `unidade_orgao_uf_sigla`
- `unidade_orgao_municipio_nome`

**Subrogacao**
- `orgao_subrogado_cnpj`
- `orgao_subrogado_razao_social`
- `orgao_subrogado_poder_id`
- `orgao_subrogado_esfera_id`
- `unidade_subrogada_codigo_unidade`
- `unidade_subrogada_nome_unidade`
- `unidade_subrogada_codigo_ibge`
- `unidade_subrogada_uf_nome`
- `unidade_subrogada_uf_sigla`
- `unidade_subrogada_municipio_nome`

**Links**
- `link_sistema_origem`
- `link_processo_eletronico`

**Documentos**
- `lista_documentos` (`jsonb`)

Indices relevantes:

- unique em `numero_controle_pncp`
- B-tree em `cod_cat`
- B-tree em `modalidade_id`
- B-tree em `unidade_orgao_municipio_nome`
- B-tree em `unidade_orgao_uf_sigla`
- B-tree em `valor_total_estimado`
- GIN FTS em `to_tsvector('portuguese', objeto_compra)`

Leitura:

- e a tabela mais importante da aplicacao;
- concentra tanto os dados operacionais quanto parte da UX do detalhe, porque `lista_documentos` ja mora aqui.

### 2. `public.item_contratacao`

Funcao:

- itens/lotes de cada contratacao

Volume estimado:

- ~35.662 linhas

PK:

- `id_item`

Unique de negocio:

- `(numero_controle_pncp, numero_item)`

Campos principais:

- `numero_controle_pncp`
- `numero_item`
- `descricao_item`
- `material_ou_servico`
- `quantidade_item`
- `unidade_medida`
- `valor_unitario_estimado`
- `valor_total_estimado`
- `item_categoria_id`
- `item_categoria_nome`
- `criterio_julgamento_id`
- `situacao_item`
- `tipo_beneficio`
- `ncm_nbs_codigo`
- `catalogo`

Indices relevantes:

- `numero_controle_pncp`
- `numero_item`
- `valor_total_estimado`

Leitura:

- tabela bem tipada para o que importa em UI;
- faz sentido como fonte da aba `Itens` do edital.

### 3. `public.contrato`

Funcao:

- contratos/resultados derivados de uma contratacao

Volume estimado:

- ~20.405 linhas

PK:

- `id_contrato`

Ligacao principal:

- `numero_controle_pncp_compra` -> `contratacao.numero_controle_pncp`

Campos principais:

- `numero_controle_pncp`
- `numero_controle_pncp_compra`
- `numero_contrato_empenho`
- `ano_contrato`
- `sequencial_contrato`
- `processo`
- `objeto_contrato`
- `nome_razao_social_fornecedor`
- `ni_fornecedor`
- `valor_inicial`
- `valor_parcela`
- `valor_global`
- `data_assinatura`
- `data_vigencia_inicio`
- `data_vigencia_fim`
- `tipo_contrato_id`
- `tipo_contrato_nome`

Leitura:

- sustenta radar de fornecedor, aderencia historica e inteligencia concorrencial.

### 4. `public.categoria`

Funcao:

- taxonomia governamental com embeddings

Campos principais:

- `cod_cat`
- `nom_cat`
- `cod_nv0`, `nom_nv0`
- `cod_nv1`, `nom_nv1`
- `cod_nv2`, `nom_nv2`
- `cod_nv3`, `nom_nv3`
- `cat_embeddings`
- `cat_embeddings_hv`

Indices relevantes:

- unique em `cod_cat`
- HNSW em `cat_embeddings_hv`
- B-tree em `cod_cat`, `cod_nv0`, `cod_nv1`, `nom_cat`

Leitura:

- e a ponte entre busca semantica e busca por categoria.

### 5. `public.cnae`

Funcao:

- tabela CNAE com embedding

Campos:

- `cod_total`
- `nome_total`
- niveis `nv0` a `nv4`
- `cnae_emb`

Leitura:

- parece usada em justificativas de aderencia, matching e enriquecimento.

### 6. Tabelas `_emb`

#### `public.contratacao_emb`

Volume:

- ~10.920

Campos centrais:

- `numero_controle_pncp`
- `embeddings`
- `embeddings_hv`
- `top_categories`
- `top_similarities`
- `metadata`
- `confidence`

Indices:

- HNSW e IVFFLAT em embeddings
- GIN em `top_categories`

#### `public.contrato_emb`

Volume:

- ~2.712.720

Campos centrais:

- `numero_controle_pncp`
- `embeddings`
- `embeddings_hv`
- `top_categories`
- `top_similarities`

Leitura:

- e o maior volume da base;
- merece cuidado especial em tuning e storage.

#### `public.ata_emb` e `public.pca_emb`

Mesma ideia:

- espelho vetorial de `ata` e `pca`

## Camada de produto e usuario

### `public.user_prompts`

Funcao:

- persistencia de consultas/configuracoes de busca

Campos fortes:

- `title`
- `text`
- `embedding`
- `search_type`
- `search_approach`
- `relevance_level`
- `sort_mode`
- `max_results`
- `top_categories_count`
- `filter_expired`
- `filters` (`jsonb`)
- `preproc_output` (`jsonb`)

Leitura:

- esta muito alinhada com a configuracao da Busca que estamos trazendo para o v2.

### `public.user_results`

Funcao:

- resultados persistidos de uma busca

Campos:

- `user_id`
- `prompt_id`
- `numero_controle_pncp`
- `rank`
- `similarity`
- `valor`
- `data_encerramento_proposta`

Leitura:

- parece ser historico/snapshot de ranking por busca executada.

### `public.user_documents`

Funcao:

- documentos do usuario vinculados a um edital

Campos:

- `user_id`
- `numero_controle_pncp`
- `doc_name`
- `doc_type`
- `storage_url`
- `size_bytes`

Leitura:

- camada de storage do produto, nao da fonte PNCP em si.

### `public.user_resumos`

Funcao:

- resumo em Markdown por usuario e por `numero_controle_pncp`

Campos:

- `user_id`
- `numero_controle_pncp`
- `resumo_md`

Unique:

- `(user_id, numero_controle_pncp)`

Leitura:

- e praticamente a tabela ideal para guardar resumo consolidado do edital.

### `public.user_settings`

Funcao:

- plano e configuracoes comerciais do usuario

Campos:

- `user_id`
- `name`
- `plan_id`
- `next_plan_id`
- `plan_status`
- `plan_started_at`
- `plan_renews_at`
- `trial_ends_at`
- `gateway_customer_id`
- `gateway_subscription_id`

Leitura:

- coracao do billing e do entitlement.

### `public.user_usage_events`

Funcao:

- trilha de auditoria e consumo de uso

Campos:

- `event_type`
- `ref_type`
- `ref_id`
- `meta`
- `plan_id_at_event`
- `created_at_date`

Leitura:

- bom candidato para analise de limite e observabilidade de produto.

### `public.system_plans`

Funcao:

- catalogo de planos comerciais

Campos:

- `code`
- `name`
- `price_month_brl`
- `limit_consultas_per_day`
- `limit_favoritos_capacity`
- `limit_boletim_per_day`
- `limit_resumos_per_day`
- `stripe_product_id`
- `stripe_price_id`
- `active`

Leitura:

- esta bem modelada para integrar Stripe e enforcement de limites.

### `public.system_config`

Funcao:

- chave-valor de configuracao do sistema

Campos:

- `key`
- `value`
- `description`
- `updated_at`
- `created_at`

### `public.pipeline_run_stats`

Funcao:

- estatistica de ingestao/pipeline

Campos:

- `ts_run`
- `stage`
- `date_ref`
- `inserted_contratacoes`
- `inserted_itens`

Leitura:

- suporte operacional da pipeline de carga.

## Inventario completo do schema `public`

### Tabelas de dominio

- `ata` - ata de registro de preco
- `ata_emb` - embeddings de ata
- `categoria` - taxonomia governamental com embeddings
- `cnae` - taxonomia CNAE com embeddings
- `contratacao` - edital/compra/oportunidade principal
- `contratacao_emb` - embeddings de contratacao
- `contrato` - contrato derivado da contratacao
- `contrato_emb` - embeddings de contrato
- `empresa` - empresa/fornecedor
- `item_classificacao` - classificacao IA de itens
- `item_contratacao` - itens da contratacao
- `item_pca` - itens do PCA
- `municipios` - base de municipios
- `pca` - PCA
- `pca_emb` - embeddings de PCA

### Tabelas de produto

- `user_boletim`
- `user_bookmarks`
- `user_documents`
- `user_message`
- `user_payment`
- `user_prompts`
- `user_results`
- `user_resumos`
- `user_schedule`
- `user_settings`
- `user_usage_counters`
- `user_usage_events`

### Tabelas de sistema

- `pipeline_run_stats`
- `so_prompt`
- `system_config`
- `system_plans`

### Tabelas de apoio/teste

- `test_categoria`
- `test_contrato_emb`

### Views

- `vw_contratos_por_fornecedor`
- `vw_fornecedores`
- `vw_fornecedores_pendentes`
- `vw_index_build_progress`

## Indices que merecem atencao

### Busca textual

- `idx_contratacao_objeto_gin` em `contratacao.objeto_compra`

### Busca vetorial

- `idx_categoria_cat_embeddings_h_hnsw`
- `contratacao_emb_embeddings_cos_hnsw`
- `contratacao_emb_embeddings_cos_ivf`
- `idx_contrato_emb_ivfflat`

### Filtros operacionais

- `idx_contratacao_uf`
- `idx_contratacao_municipio`
- `idx_contratacao_modalidade`
- `idx_contratacao_valor`
- `idx_item_contratacao_numero_controle_pncp`

## Pontos fortes do desenho

- chave de negocio forte baseada em `numero_controle_pncp`
- catalogo PNCP + itens + contratos + documentos no mesmo dominio
- camada semantica separada e ja indexada
- persistencia de prompts/resultados alinhada ao produto
- billing e limites ja contemplados
- `lista_documentos` em `jsonb` evita join obrigatorio para o caso comum do detalhe

## Debitos e riscos estruturais

### 1. Campos de negocio em `text`

Especialmente em `contratacao`, muitos campos deveriam ser:

- `date` / `timestamp`
- `numeric`
- `integer`

e ainda estao em `text`.

Impactos:

- sort fragil
- filtro mais caro
- cast na aplicacao
- risco de inconsistencias silenciosas

### 2. Duplicidade de alguns indices/unicidades

Exemplo:

- `contratacao_numero_controle_pncp_key`
- `contratacao_numero_controle_unique`

As duas parecem cumprir o mesmo papel.

### 3. Estatisticas possivelmente desatualizadas em algumas tabelas

Varias tabelas aparecem com `est_rows = 0` apesar de serem claramente relevantes.

Isso pode significar:

- tabela realmente vazia
- ou estatistica ainda nao atualizada

### 4. Grande volume em embeddings de contrato

`contrato_emb` e de longe a tabela mais pesada.

Isso deve ser levado em conta em:

- custo
- manutencao de indices
- tempo de vacuum/analyze
- estrategia de busca semantica historica

## Leitura arquitetural final

Hoje a base do GovGo parece estar em um bom ponto conceitual.

Ela ja tem:

- base de negocio
- base de IA
- base de produto

O que falta nao e inventar tabela nova. O que mais parece faltar e:

1. normalizacao tipada dos campos mais usados em filtros e ordenacao;
2. limpeza de redundancias;
3. observabilidade operacional;
4. uma camada documental oficial explicando a semantica de cada tabela.

## Recomendacoes praticas

### Curto prazo

- documentar formalmente `contratacao`, `item_contratacao`, `contrato`, `contratacao_emb`, `user_prompts`, `user_results`, `user_resumos`
- revisar campos `text` usados em sort/filtro no backend
- revisar indices redundantes

### Medio prazo

- criar uma camada de views tipadas para o app, se a migracao fisica for arriscada
- separar claramente o que e dado PNCP bruto, dado normalizado e dado de produto

### Longo prazo

- avaliar se `lista_documentos` deve continuar apenas em `jsonb` dentro de `contratacao` ou ganhar tabela canonica normalizada de documentos do PNCP
- revisar se o volume de `contrato_emb` justifica estrategia de particionamento ou tuning especifico

## Proximo passo sugerido apos esta analise

O proximo trabalho mais util sobre a base seria um destes:

1. mapa ER simplificado das tabelas centrais;
2. plano de normalizacao tipada dos campos criticos da `contratacao`;
3. documentacao semantica campo a campo das tabelas centrais do GovGo.
