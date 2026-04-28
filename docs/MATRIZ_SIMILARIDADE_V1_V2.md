# Matriz de Similaridade V1/V2

## Finalidade

Este documento consolida como o GovGo calcula, transforma, filtra, ordena e exibe os valores de similaridade no fluxo de Busca do v2.

Ele existe para evitar tres confusoes recorrentes:

1. tratar toda "similaridade" como se fosse uma conta unica;
2. confundir `similarity` com `confidence`;
3. confundir calculo de score com filtro, ordenacao ou apresentacao visual.

## Regra principal

No GovGo atual, `similarity` nao tem um significado unico.

O valor muda conforme o modo de busca:

- semantica
- palavras-chave
- hibrida
- correspondencia de categoria
- filtro por categoria
- busca apenas por filtros (`sql-only`)

Por isso, sempre que alguem disser "a similaridade do resultado", a primeira pergunta tecnica correta e:

- "de qual modo de busca estamos falando?"

---

## Cadeia completa no v2

### 1. UI monta o payload

Origem:

- `src/services/contracts/searchContracts.jsx`

Campos relevantes:

- `search_type`
- `category_search_base`
- `relevance_level`
- `sort_mode`
- `min_similarity`
- `ui_filters`

### 2. UI chama a API local

Origem:

- `src/services/api/searchApi.jsx`

A UI chama `POST /api/search`.

### 3. API cria o SearchRequest

Origem:

- `src/backend/search/api/service.py`
- `src/backend/search/core/contracts.py`

O payload vira `SearchRequest`.

### 4. O adapter do v2 orquestra o fluxo

Origem:

- `src/backend/search/core/adapter.py`

Ordem real de execucao:

1. resolve `where_sql`
2. preprocessa a consulta
3. despacha para o modo de busca
4. aplica filtro de relevancia, quando couber
5. aplica `min_similarity`
6. anexa coordenadas
7. ordena
8. normaliza para `SearchResultItem`

### 5. O core real da busca vem do v1

Bootstrap:

- `src/backend/search/core/bootstrap.py`

Hoje o v2 prefere carregar:

- `src/backend/search/v1_copy/gvg_browser/gvg_search_core.py`

Ou seja: a matematica principal da similaridade ainda mora no core legado do v1, encapsulado pelo adapter do v2.

### 6. O frontend normaliza e renderiza

Origem:

- `src/services/adapters/searchAdapter.jsx`
- `src/features/busca/BuscaWorkspace.jsx`
- `design/govgo/mode_busca_detail.jsx`

No frontend, o campo principal da UI vira `sim`, sempre tratado no intervalo `0..1`.

---

## Matriz principal

| Modo | Onde calcula | Formula principal | Faixa esperada | O que significa |
|---|---|---|---|---|
| Semantica | `gvg_search_core.semantic_search` | `1 - (distance vetorial)` | `0..1` | proximidade vetorial entre a query e o embedding do edital |
| Palavras-chave | `gvg_search_core.keyword_search` | `(rank_exact + 0.5 * rank_prefix) / denom`, truncado em `1.0` | `0..1` | relevancia textual normalizada de full-text search |
| Hibrida (fusion) | `gvg_search_core._hybrid_fusion_search` | `semantic * w + keyword * (1-w)` | `0..1` | mistura ponderada entre score semantico e score textual |
| Hibrida (sql) | `gvg_search_core.hybrid_search` | `semantic_weight * semantic_score + (1 - semantic_weight) * keyword_norm` | `0..1` | mistura ponderada feita em SQL unico |
| Correspondencia | `gvg_search_core.correspondence_search` | `max(query_similarity * result_similarity)` | `0..1` | aderencia entre categorias proximas da query e categorias do edital |
| Filtro por categoria | `gvg_search_core.category_filtered_search` | herda o score do modo-base | depende do modo-base | score do modo-base, mas dentro de um universo filtrado por categorias |
| SQL-only | `SearchAdapter._sql_only_search` | fixo em `0.0` | `0.0` | nao existe score textual nem vetorial; ha apenas filtro estrutural |

---

## Modo 1: semantica

Arquivos:

- `src/backend/search/v1_copy/gvg_browser/gvg_schema.py`
- `src/backend/search/v1_copy/gvg_browser/gvg_search_core.py`

### Formula

O builder semantico gera:

```sql
1 - (ce.embeddings_hv <=> %s::halfvec(3072)) AS similarity
```

### Leitura tecnica

- a query vira embedding OpenAI;
- o embedding e comparado com `contratacao_emb.embeddings_hv`;
- o operador `<=>` devolve distancia vetorial;
- o core transforma isso em similaridade com `1 - distancia`.

### O que pode mudar a conta

#### 1. Negacao

Origem:

- `src/backend/search/v1_copy/gvg_browser/gvg_ai_utils.py`

Se `use_negation=True`, a embedding da query pode virar:

```text
embedding_final = embedding_positivo - peso * embedding_negativo
```

Isso altera a posicao dos resultados sem mudar a formula final do `1 - distance`.

#### 2. Filtros SQL

`ui_filters`, `where_sql` e `sql_conditions` nao mudam a formula.

Eles apenas mudam o conjunto candidato antes da comparacao.

#### 3. Base semantica com categoria

Se o modo for `category_filtered` com base semantica, a conta continua semantica. O que muda e apenas o universo de itens elegiveis.

### Range

Na pratica, costuma aparecer em torno de:

- `0.45` a `0.70` para casos normais
- podendo subir ou descer conforme a qualidade da query e do embedding

---

## Modo 2: palavras-chave

Arquivo:

- `src/backend/search/v1_copy/gvg_browser/gvg_search_core.py`

### Componentes usados

- `rank_exact`
- `rank_prefix`

### Formula

```text
combined = rank_exact + 0.5 * rank_prefix
denom = (0.1 * numero_de_termos) + 1e-6
similarity = combined / denom
similarity = min(similarity, 1.0)
```

### Leitura tecnica

Nao e embedding.

Aqui o score mede quao bem o objeto textual do edital casa com a consulta em full-text search, incluindo:

- match exato
- match por prefixo

### O que pode distorcer

- queries muito curtas;
- queries com termos muito comuns;
- prefix match inflando resultados medianos;
- numero de termos alterando o denominador.

### Range

Sempre normalizado para `0..1`.

---

## Modo 3: hibrida

Arquivo:

- `src/backend/search/v1_copy/gvg_browser/gvg_search_core.py`

O projeto hoje suporta duas matematicas hibridas.

### 3.1. Hibrida por fusao

Se `GVG_HYBRID_MODE != "sql"`, a conta e:

```text
similarity = semantic_similarity * semantic_weight
           + keyword_similarity * (1 - semantic_weight)
```

Peso default:

```text
SEMANTIC_WEIGHT = 0.75
```

Entao, por padrao:

- 75% semantica
- 25% palavras-chave

### 3.2. Hibrida por SQL unico

Se `GVG_HYBRID_MODE = "sql"`, a conta muda para:

```text
combined_score =
  semantic_weight * semantic_score
+ (1 - semantic_weight) *
  LEAST((0.7 * rank_exact + 0.3 * rank_prefix) / max_possible_keyword_score, 1.0)
```

Ou seja:

- semantico segue igual;
- keyword muda de ponderacao:
  - `0.7` para exato
  - `0.3` para prefixo

### Leitura tecnica

As duas hibridas produzem um unico campo `similarity`, mas ele e um score misto.

Por isso, no modo hibrido, o texto "calculo ponderado" faz sentido tecnico.

---

## Modo 4: correspondencia de categoria

Arquivo:

- `src/backend/search/v1_copy/gvg_browser/gvg_search_core.py`

### Passo a passo

1. gera embedding da query;
2. busca top categorias da query em `categoria`;
3. le `top_categories` e `top_similarities` de `contratacao_emb`;
4. cruza categorias iguais entre query e edital;
5. usa o melhor produto entre elas.

### Formula

```text
correspondence_similarity = max(query_similarity * result_similarity)
```

### Leitura tecnica

Esse score nao mede "proximidade direta entre query e edital".

Ele mede:

- quao bem as categorias derivadas da query
- combinam com as categorias preclassificadas do edital

### O que pode distorcer

- qualidade da categorizacao da query;
- qualidade da categorizacao do edital;
- quantidade de categorias top armazenadas;
- peso implicito de pegar apenas o melhor produto.

---

## Modo 5: filtro por categoria

Arquivo:

- `src/backend/search/v1_copy/gvg_browser/gvg_search_core.py`

Esse modo nao inventa uma nova similaridade.

Ele faz:

1. roda uma busca-base;
2. filtra os resultados pela intersecao de categorias.

### Se a base for semantica

O score continua sendo semantico.

### Se a base for keyword

O score continua sendo keyword.

### Se a base for hibrida

O score continua sendo hibrido.

### Consequencia importante

Dois resultados com score identico podem entrar ou sair apenas por pertencerem ou nao ao subconjunto de categorias.

---

## Modo 6: busca so por filtros (`sql-only`)

Arquivo:

- `src/backend/search/core/adapter.py`

Quando nao existe query textual e so ha filtros ativos:

- o adapter vai direto para SQL;
- nao usa embeddings;
- nao usa full-text;
- nao calcula rank vetorial nem textual.

### Regra

```text
similarity = 0.0
confidence = 1.0 se houver resultado, senao 0.0
```

### Leitura tecnica

O resultado e estruturado, nao ranqueado semanticamente.

---

## `confidence`: o que e e o que nao e

Arquivo:

- `src/backend/search/v1_copy/gvg_browser/gvg_ai_utils.py`

### Formula

```text
confidence = media(scores_validos) * 100
```

### O que significa

E apenas a media dos scores da lista final de resultados.

### O que nao significa

- nao e probabilidade;
- nao e calibragem estatistica;
- nao e certeza do modelo;
- nao e `contratacao_emb.confidence`.

### Exemplo

Se os resultados vierem com:

```text
[0.62, 0.58, 0.54]
```

entao:

```text
confidence = 58.0
```

---

## O que o filtro de relevancia faz

Arquivo:

- `src/backend/search/v1_copy/gvg_browser/gvg_search_core.py`

Niveis:

- `1 = sem filtro`
- `2 = flexivel`
- `3 = restritivo`

### O que ele faz

- envia payload para Assistant/OpenAI;
- escolhe subconjunto;
- pode reordenar os resultados;
- renumera `rank`.

### O que ele nao faz

- nao recalcula `similarity`;
- nao recalcula `confidence` pela propria logica;
- nao muda a formula do score base.

### Consequencia

Depois do filtro de relevancia, o score continua sendo o mesmo score do modo-base, mas a lista pode ficar menor e em outra ordem.

---

## O que `min_similarity` faz

Arquivo:

- `src/backend/search/core/adapter.py`

### Regra

```text
mantem item se similarity >= threshold
```

### O que ele nao faz

- nao normaliza;
- nao recalcula;
- nao reescala a distribuicao.

Ele apenas corta os itens abaixo do piso.

---

## O que `sort_mode` faz

Arquivo:

- `src/backend/search/core/adapter.py`

No backend:

- `1 = similaridade desc`
- `2 = data asc`
- `3 = valor desc`

No frontend:

- `src/features/busca/BuscaWorkspace.jsx`

O toggle `Similaridade | Valor | Encerramento` tambem altera `localSort`.

### Regra importante

Ordenacao muda:

- a ordem
- o rank

Mas nao muda:

- o score de similaridade do item

---

## Como o frontend transforma isso em `sim`

Arquivo:

- `src/services/adapters/searchAdapter.jsx`

### Regra

O frontend le `item.similarity` e normaliza assim:

- se `<= 1`, mantem entre `0..1`
- se `> 1`, divide por `100`

Depois, em `toEditalShape(...)`, isso vira:

```text
sim: similarityRatio
```

### Consequencia

No frontend, a similaridade sempre e tratada como razao `0..1`.

---

## Onde o score aparece na UI

### Tabela da busca

- `src/features/busca/BuscaWorkspace.jsx`

Usa:

- `e.sim`

### Mapa

- `src/features/busca/BuscaWorkspace.jsx`

Usa:

- `buildMapMetricValue(edital, "similarity")`

### Detalhe do edital

- `design/govgo/mode_busca_detail.jsx`

O KPI `Similaridade IA` so exibe:

```text
e.sim.toFixed(3)
```

Nao existe recalc local nesse ponto.

### Observacao sobre o texto "calculo ponderado"

Esse subtitulo e tecnicamente apropriado sobretudo para:

- busca hibrida
- correspondencia de categoria

Para:

- semantica
- keyword
- category_filtered

ele e mais um rotulo geral de UX do que uma descricao exata da formula.

---

## Outros scores que parecem similares, mas nao sao a mesma coisa

### 1. `contratacao_emb.confidence`

E a confianca da categorizacao do edital na base.

Pode ser usada em filtros e analises, mas nao e o score principal da busca.

### 2. `top_similarities`

Sao as similaridades da tabela `contratacao_emb` entre o edital e as categorias da taxonomia.

Elas sao fundamentais para:

- correspondencia de categoria

### 3. `score` da aba/mock de concorrencia

Na homologacao ha outra conta:

```text
score = (presence_ratio * 0.55) + (best_quality * 0.30) + (average_quality * 0.15)
```

Esse score e de ensemble/aderencia agregada, nao e a similaridade principal da busca.

### 4. Similaridade gravada em boletins

O pipeline de boletins persiste `similarity` em `user_boletim`, mas esse valor e apenas o score ja calculado pela busca naquele run.

---

## Matriz rapida de interpretacao

| Se eu vejo... | Significa... |
|---|---|
| `similarity` em busca semantica | proximidade vetorial query-edital |
| `similarity` em keyword | relevancia textual normalizada |
| `similarity` em hibrida | fusao ponderada entre score vetorial e textual |
| `similarity` em correspondence | produto de aderencia entre categorias da query e do edital |
| `confidence` da resposta | media dos scores da lista final vezes 100 |
| `confidence` na base `_emb` | confianca da categorizacao do embedding |
| `score` da aba concorrencia | ranking/ensemble de aderencia agregada, outra metrica |

---

## Implicacoes praticas para produto e UX

1. O mesmo numero visual (`0.612`) pode nascer de contas diferentes conforme o modo.
2. Comparar `similaridade` entre modos diferentes nem sempre e semantica ou estatisticamente justo.
3. `confidence` e um resumo da lista, nao uma garantia do modelo.
4. `min_similarity` so corta; nao melhora score.
5. `sort_mode` e `localSort` so reordenam; nao recalculam score.
6. O detalhe do edital herda o `sim` da busca; ele nao recalcula sozinho.

---

## Recomendacao tecnica

Se o produto quiser mais transparencia futura, o passo ideal e passar a expor no payload:

- `similarity_origin`
  - `semantic`
  - `keyword`
  - `hybrid_fusion`
  - `hybrid_sql`
  - `correspondence`
  - `category_filtered_semantic`
  - `category_filtered_keyword`
  - `category_filtered_hybrid`
  - `sql_only`

- `semantic_similarity`
- `keyword_similarity`
- `correspondence_similarity`
- `confidence_formula = average_result_similarity`

Assim a UI poderia explicar corretamente o numero que esta mostrando.

---

## Arquivos-chave

### Core de busca

- `src/backend/search/v1_copy/gvg_browser/gvg_search_core.py`
- `src/backend/search/v1_copy/gvg_browser/gvg_ai_utils.py`
- `src/backend/search/v1_copy/gvg_browser/gvg_schema.py`

### Orquestracao v2

- `src/backend/search/core/bootstrap.py`
- `src/backend/search/core/adapter.py`
- `src/backend/search/core/contracts.py`
- `src/backend/search/api/service.py`

### Frontend

- `src/services/contracts/searchContracts.jsx`
- `src/services/adapters/searchAdapter.jsx`
- `src/features/busca/BuscaWorkspace.jsx`
- `design/govgo/mode_busca_detail.jsx`

