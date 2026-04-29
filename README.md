# GovGo v2

Repositorio principal da nova aplicacao GovGo.

Este projeto nao e apenas um "redesign" do GovGo v1. Ele e a nova base da aplicacao, com tres objetivos simultaneos:

1. preservar o que o v1 ja resolve bem no dominio;
2. substituir a UI legada por uma aplicacao nova, com arquitetura controlada;
3. transformar o v1 em backend, pipelines, jobs, adapters e servicos reaproveitaveis.

Hoje o v2 ja roda localmente, tem fluxo real de busca, filtros, configuracao persistida, detalhe de edital com itens reais, documentos reais, markdown dos documentos e resumo consolidado dos documentos.

---

## 1. Visao executiva

O GovGo v2 e uma aplicacao web orientada a compras publicas, com foco em:

- busca de editais e oportunidades;
- leitura estruturada de contratacoes PNCP;
- comparacao, priorizacao e detalhamento de oportunidades;
- processamento de documentos do edital;
- continuidade dos pipelines de dados e boletins herdados do v1.

Na pratica, o projeto esta organizado em quatro camadas:

1. `design/`: fonte canonica de linguagem visual, layout, tokens e componentes-base;
2. `src/`: aplicacao real do v2, incluindo shell, router, pages, services e backend local;
3. `homologation/`: laboratorios para validar modulos reaproveitados antes de acopla-los de vez a UI;
4. `v1` externo ao repositorio: base legada que continua sendo referencia de pipelines, busca, documentos, jobs e schema historico.

O estado atual e hibrido de forma intencional:

- a aplicacao roda em `src/`;
- mas ainda carrega partes importantes de `design/govgo/*.jsx` no runtime;
- e reaproveita modulos legados copiados para `src/backend/search/v1_copy/`.

Esse estado nao e "acidente". Ele e parte da estrategia oficial de transicao descrita nos documentos de `/docs`.

---

## 2. Principios do projeto

Os documentos centrais do repositorio definem algumas regras que precisam ser entendidas antes de qualquer alteracao significativa:

### 2.1 `design/` e a fonte visual canonica

O layout, a composicao, as proporcoes, os tokens, a tipografia, a densidade visual e os padroes de componentes devem nascer de `design/`.

Isso significa:

- nao redesenhar a interface "por fora" em `src/`;
- traduzir `design/` em arquitetura real;
- preservar o idioma visual ja consolidado.

Documentos principais sobre isso:

- [docs/CONVENCAO_ARQUITETURA_FRONTEND.md](docs/CONVENCAO_ARQUITETURA_FRONTEND.md)
- [docs/ESTRUTURA_FRONTEND_V2.md](docs/ESTRUTURA_FRONTEND_V2.md)
- [docs/MAPA_TOKENS_RECIPES_V2.md](docs/MAPA_TOKENS_RECIPES_V2.md)
- [docs/CHECKLIST_IMPLEMENTACAO_FRONTEND.md](docs/CHECKLIST_IMPLEMENTACAO_FRONTEND.md)
- [docs/CRITERIOS_REVISAO_VISUAL.md](docs/CRITERIOS_REVISAO_VISUAL.md)

### 2.2 O v1 nao deve ser "portado" como UI

A estrategia oficial nao e migrar a interface Dash do v1. A estrategia e reaproveitar o que importa do v1 como:

- backend;
- adapters;
- pipeline de dados;
- jobs periodicos;
- logica de dominio;
- runtime de documentos;
- schema e contratos de persistencia.

Documentos principais:

- [docs/ESTRATEGIA_V1_NO_V2.md](docs/ESTRATEGIA_V1_NO_V2.md)
- [docs/PLANO_MESTRE_V1_V2.md](docs/PLANO_MESTRE_V1_V2.md)
- [docs/MATRIZ_V1_V2.md](docs/MATRIZ_V1_V2.md)
- [docs/TRIAGEM_MODULOS_LEGADOS.md](docs/TRIAGEM_MODULOS_LEGADOS.md)

### 2.3 Backend e homologacao vem antes de UI definitiva

O projeto adota um fluxo repetido:

1. homologar o modulo legado;
2. provar comportamento fora da UI;
3. adaptar contratos;
4. integrar no v2;
5. so depois estabilizar a experiencia final na interface.

Documento principal:

- [docs/ESTRATEGIA_TESTES_ANTES_UI.md](docs/ESTRATEGIA_TESTES_ANTES_UI.md)

---

## 3. Estado atual do projeto

O estado vivo do projeto deve ser acompanhado primeiro por:

- [docs/DIARIO_DE_BORDO.md](docs/DIARIO_DE_BORDO.md)

No momento desta versao do README, o quadro e:

- a aplicacao local principal roda em `http://127.0.0.1:8765/src/app/boot/index.html#/inicio`;
- `run.py` serve os arquivos estaticos e os endpoints locais da aplicacao;
- a tela `Busca` esta funcional com busca real, configuracao real, filtros reais, persistencia local e dois modos de visualizacao dos resultados (`Tabela` e `Mapa`);
- o detalhe do edital esta funcional com:
  - cabecalho real;
  - itens reais;
  - documentos reais;
  - markdown de documento;
  - resumo consolidado dos documentos;
- o modo visual derivado de `design/` hoje esta nomeado como `mode_busca` / `mode_busca_detail`, substituindo o nome antigo `mode_oportunidades` e mantendo compatibilidade de runtime durante a transicao;
- `Empresas`, `Radar`, `Relatorios` e `Design System` ainda estao majoritariamente em modo wrapper sobre componentes vindos de `design/`;
- parte da UI ainda e carregada diretamente de `design/govgo/*.jsx`;
- a plataforma de usuario do v1 (auth, favoritos, historico, boletins, billing e artefatos pessoais) ainda nao foi trazida de forma real para o v2; hoje ela aparece majoritariamente como placeholder visual no shell;
- a migracao completa dessas partes para `src/` continua sendo uma prioridade estrutural.

---

## 4. Como rodar localmente

### 4.1 Pre-requisitos

- Windows com PowerShell;
- Python instalado;
- ambiente com dependencias necessarias para os modulos herdados de busca e documentos;
- variaveis de ambiente corretas para acesso a base Supabase, OpenAI e rotinas do legado quando necessario.

### 4.2 Comando principal

Na raiz do projeto:

```powershell
python .\run.py
```

O servidor local sobe em:

```text
http://127.0.0.1:8765/src/app/boot/index.html#/inicio
```

### 4.3 O que `run.py` faz

`run.py` e o entrypoint local do v2. Ele:

- serve arquivos estaticos a partir da raiz do repositorio;
- expõe endpoints HTTP usados pela UI;
- abre o navegador automaticamente;
- verifica se ja existe processo escutando a porta `8765`;
- detecta instancias antigas/incompativeis para evitar que a UI converse com um servidor errado.

### 4.4 Quando a UI parece "nao atualizar"

Como a aplicacao ainda carrega JSX no browser via Babel e usa muito estado local persistido, os dois procedimentos mais importantes de troubleshooting sao:

1. fazer `Ctrl+F5`;
2. reiniciar o `run.py`.

Quando ha endpoints novos, tambem vale garantir que nao ficou uma instancia antiga ocupando a `8765`.

---

## 5. Rotas e telas atuais

As rotas estao definidas em [src/app/router/routes.jsx](src/app/router/routes.jsx).

### 5.1 Rotas do app

| Rota | Tela | Status atual |
| --- | --- | --- |
| `#/inicio` | Inicio | wrapper real sobre `ModeHome` vindo de `design/` |
| `#/busca` | Busca | tela mais madura do v2; workspace real |
| `#/busca/detalhe/:id` | Detalhe do edital | fluxo real/hibrido com dados reais |
| `#/empresas` | Empresas | wrapper sobre `ModeFornecedores` |
| `#/radar` | Radar | wrapper sobre `ModeMercado` |
| `#/relatorios` | Relatorios | wrapper sobre `ModeRelatorios` |
| `#/design-system` | Design System | wrapper sobre `ModeDesignSystem` |

### 5.2 Mapeamento com modos legados

Ainda existe compatibilidade com o conceito de `legacyMode`, para ajudar a transicao entre `design/`, v1 e router atual do v2.

---

## 6. Arquitetura atual em runtime

### 6.1 Carregamento da aplicacao

O boot principal esta em:

- [src/app/boot/index.html](src/app/boot/index.html)
- [src/app/boot/GovGoV2App.jsx](src/app/boot/GovGoV2App.jsx)

O `index.html` ainda carrega:

- CSS canonico de `design/css/`;
- React UMD;
- Babel standalone;
- varios arquivos `design/govgo/*.jsx`;
- e os modulos reais em `src/`.

Isso significa que o runtime atual nao usa bundler frontend tradicional. O browser interpreta JSX em tempo de execucao.

### 6.2 Shell principal

O shell do app vive em:

- [src/app/shell/AppShell.jsx](src/app/shell/AppShell.jsx)

Ele organiza:

- `TopBar`;
- `LeftRail`;
- `SearchRail` quando aplicavel;
- area central de conteudo.

Hoje `TopBar`, `LeftRail` e `SearchRail` ainda sao definidos majoritariamente em:

- [design/govgo/shell.jsx](design/govgo/shell.jsx)
- [design/govgo/mode_busca.jsx](design/govgo/mode_busca.jsx)
- [design/govgo/mode_busca_detail.jsx](design/govgo/mode_busca_detail.jsx)

Ou seja: o shell visual ainda vem de `design/`, mas ja conversa com servicos reais do `src/`.

### 6.3 Logos do cabecalho

O header usa os assets:

- [src/assets/logos/govgo_logo_light_mode.png](src/assets/logos/govgo_logo_light_mode.png)
- [src/assets/logos/govgo_logo_dark_mode.png](src/assets/logos/govgo_logo_dark_mode.png)

A escolha do asset e feita pelo estado de tema do shell.

---

## 7. Mapa de diretorios

### 7.1 Raiz do projeto

| Diretorio / arquivo | Papel |
| --- | --- |
| `run.py` | servidor local HTTP + APIs do v2 |
| `README.md` | guia principal do projeto |
| `design/` | fonte visual canonica; ainda parcialmente usada no runtime |
| `src/` | aplicacao real do v2 |
| `docs/` | estrategia, arquitetura, estado, analises da base e pipelines |
| `homologation/` | laboratorios de validacao de modulos reutilizados |
| `db/` | snapshots e artefatos de schema localmente relevantes |
| `data/` | persistencia local do v2 (`govgo_v2.sqlite3`) |
| `tmp/` | snapshots e arquivos temporarios de analise |
| `cmd/` | utilitarios e comandos auxiliares, quando existirem |

### 7.2 `src/`

| Diretorio | Papel |
| --- | --- |
| `src/app/` | boot, router e shell da aplicacao |
| `src/pages/` | wrappers de tela por rota |
| `src/features/` | features reais; destaque para `busca/` |
| `src/services/` | API client, adapters e contratos frontend |
| `src/backend/` | backend local do v2 e adapters de busca/documentos |
| `src/assets/` | assets locais, incluindo logos |
| `src/devtools/` | ferramentas e copias de apoio para desenvolvimento/homologacao |

### 7.3 `src/backend/search/`

| Diretorio | Papel |
| --- | --- |
| `api/` | camada HTTP/servico usada por `run.py` |
| `core/` | contratos, adapter de busca e filtros SQL |
| `v1_copy/` | copia controlada dos modulos legados reutilizados pelo v2 |

### 7.4 `homologation/`

Hoje existem ao menos dois laboratorios centrais:

- `homologation/search/`
- `homologation/documents/`

Eles servem para provar fluxos e integrar no v2 sem depender primeiro da UI final.

---

## 8. Frontend: como esta organizado

### 8.1 Regra de ouro

`design/` define o idioma visual.
`src/` implementa a aplicacao real.

### 8.2 Estado atual de migracao

Hoje coexistem tres tipos de componente:

1. componentes ainda executados diretamente de `design/`;
2. wrappers leves em `src/pages/*` que apenas montam esses componentes dentro do router real;
3. features reais em `src/features/*`, especialmente a busca.

### 8.3 Paginas atuais em `src/pages/`

- [src/pages/inicio/InicioPage.jsx](src/pages/inicio/InicioPage.jsx)
- [src/pages/busca/BuscaPage.jsx](src/pages/busca/BuscaPage.jsx)
- [src/pages/busca-detalhe/BuscaDetalhePage.jsx](src/pages/busca-detalhe/BuscaDetalhePage.jsx)
- [src/pages/empresas/EmpresasPage.jsx](src/pages/empresas/EmpresasPage.jsx)
- [src/pages/radar/RadarPage.jsx](src/pages/radar/RadarPage.jsx)
- [src/pages/relatorios/RelatoriosPage.jsx](src/pages/relatorios/RelatoriosPage.jsx)
- [src/pages/design-system/DesignSystemPage.jsx](src/pages/design-system/DesignSystemPage.jsx)

Em termos práticos:

- `BuscaPage` aponta para a implementacao mais real do v2;
- `BuscaDetalhePage` resolve o edital selecionado e reaproveita o componente de detalhe;
- as demais telas ainda estao mais proximas de wrappers sobre o design.

### 8.4 CSS

O app carrega principalmente:

- `design/css/tokens.css`
- `design/css/govgo.css`

Os tokens e recipes desta camada estao documentados em:

- [docs/MAPA_TOKENS_RECIPES_V2.md](docs/MAPA_TOKENS_RECIPES_V2.md)

---

## 9. A busca no v2

A busca e hoje a area mais avancada do projeto.

### 9.1 Componentes principais

- [src/features/busca/BuscaWorkspace.jsx](src/features/busca/BuscaWorkspace.jsx)
- [src/services/api/searchApi.jsx](src/services/api/searchApi.jsx)
- [src/services/contracts/searchContracts.jsx](src/services/contracts/searchContracts.jsx)
- [src/services/adapters/searchAdapter.jsx](src/services/adapters/searchAdapter.jsx)
- [design/govgo/shell.jsx](design/govgo/shell.jsx)

### 9.2 O que ela ja faz

- consulta real ao motor de busca;
- configuracao persistida de busca;
- filtros persistidos;
- buscas com texto;
- buscas so por filtro;
- abertura de nova aba por busca;
- persistencia de abas e estado do workspace;
- ordenacao local da tabela de resultados;
- abertura de detalhe de edital em aba propria;
- resumo visual de configuracao e filtros ativos.

### 9.3 Fluxo tecnico da busca

1. o usuario interage com o `SearchRail`;
2. `window._govgoBuscaSearch(...)` dispara uma nova busca;
3. `BuscaWorkspace` cria ou ativa uma aba de resultado;
4. `searchApi.jsx` monta a chamada HTTP;
5. `searchContracts.jsx` normaliza configuracao, abordagem, tipo e filtros;
6. `run.py` recebe `POST /api/search`;
7. `service.py` cria um `SearchRequest`;
8. `SearchAdapter` executa o fluxo real;
9. o adapter usa modulos herdados do v1 em `src/backend/search/v1_copy/`;
10. os resultados voltam normalizados para a UI.

### 9.4 Configuracao de busca

A configuracao e persistida localmente em SQLite por:

- [src/backend/search/api/config_store.py](src/backend/search/api/config_store.py)

Chave principal:

- `search.default_config`

Campos relevantes:

- `searchType`
- `searchApproach`
- `relevanceLevel`
- `sortMode`
- `limit`
- `topCategoriesLimit`
- `filterExpired`
- `minSimilarity`
- `categorySearchBase`

### 9.5 Filtros de busca

Os filtros reais tambem sao persistidos em SQLite por:

- [src/backend/search/api/filter_store.py](src/backend/search/api/filter_store.py)

Chave principal:

- `search.default_filters`

Normalizacao e SQL:

- [src/backend/search/core/ui_filters.py](src/backend/search/core/ui_filters.py)

Hoje o v2 suporta, entre outros:

- PNCP
- orgao
- CNPJ
- UASG
- UF
- municipio
- modalidade
- modo de disputa
- tipo de periodo
- periodo

O builder gera `where_sql` para o adapter, preservando compatibilidade com o comportamento homologado do v1.

---

## 10. Detalhe do edital

O detalhe do edital e renderizado hoje por um componente que ainda nasce em `design/`, mas trabalha com dados reais.

Arquivo principal:

- [design/govgo/mode_busca_detail.jsx](design/govgo/mode_busca_detail.jsx)

Entrada de pagina:

- [src/pages/busca-detalhe/BuscaDetalhePage.jsx](src/pages/busca-detalhe/BuscaDetalhePage.jsx)

### 10.1 Estrutura funcional do detalhe

Hoje o detalhe trabalha com:

- cabecalho real do edital;
- KPIs;
- sub-abas:
  - `Itens`
  - `Documentos`
  - `Resumo`
  - `Historico`
  - `Concorrencia`
  - `Analise IA`

### 10.2 Itens

Os itens saem do mock e vem de:

- `POST /api/edital-items`

Backend:

- [src/backend/search/core/adapter.py](src/backend/search/core/adapter.py)
- [src/backend/search/api/service.py](src/backend/search/api/service.py)

Fonte de dados:

- `public.item_contratacao`

Referencia funcional:

- fluxo herdado do v1 por `numero_controle_pncp`.

### 10.3 Documentos

A aba `Documentos` trabalha com:

- lista real de documentos do edital;
- processamento de markdown;
- cache local do artefato processado;
- resumo consolidado de documentos.

Endpoints:

- `POST /api/edital-documentos`
- `POST /api/edital-document-view`
- `POST /api/edital-documents-summary`

### 10.4 Cache local de artefatos de documentos

Persistencia local em SQLite:

- [src/backend/search/api/document_cache_store.py](src/backend/search/api/document_cache_store.py)

Tabelas locais:

- `edital_document_artifacts`
- `edital_document_summaries`

### 10.5 Runtime de documentos

O v2 nao implementa do zero o processamento de documentos. Ele reaproveita a homologacao de documentos:

- [src/backend/search/api/documents_homologation_runtime.py](src/backend/search/api/documents_homologation_runtime.py)
- [homologation/documents/cmd/run_document.py](homologation/documents/cmd/run_document.py)

Esse runtime:

- baixa documento por URL quando necessario;
- processa documento individual;
- monta bundle zip para resumo consolidado de multiplos documentos;
- reaproveita o pipeline homologado;
- grava cache local no v2.

### 10.6 Resumo consolidado do edital

A sub-aba `Resumo` do edital deixou de ser apenas um texto fixo e passou a comportar:

- o objeto da contratacao;
- o resumo consolidado dos documentos do edital;
- geracao automatica ou sob demanda, conforme o estado do cache e do fluxo da tela.

---

## 11. Backend local do v2

### 11.1 Entry point

- [run.py](run.py)

### 11.2 Endpoints atualmente expostos

#### GET

- `/api/search-config`
- `/api/search-filters`

#### POST

- `/api/search`
- `/api/search-config`
- `/api/search-filters`
- `/api/edital-items`
- `/api/edital-documentos`
- `/api/edital-document-view`
- `/api/edital-documents-summary`

### 11.3 Service layer

Arquivo central:

- [src/backend/search/api/service.py](src/backend/search/api/service.py)

Responsabilidades:

- executar busca;
- carregar/salvar configuracao;
- carregar/salvar filtros;
- buscar itens;
- buscar documentos;
- carregar ou gerar markdown de documento;
- carregar ou gerar resumo consolidado;
- deduplicar processamento de artefatos com locks por documento.

### 11.4 Search core

Arquivos centrais:

- [src/backend/search/core/contracts.py](src/backend/search/core/contracts.py)
- [src/backend/search/core/adapter.py](src/backend/search/core/adapter.py)
- [src/backend/search/core/ui_filters.py](src/backend/search/core/ui_filters.py)

O adapter faz a ponte entre:

- o contrato do v2;
- os filtros/ordenacoes/config do frontend;
- e o motor herdado do v1 copiado para `v1_copy/`.

---

## 12. Relacao entre v2 e codigo legado

O v2 depende hoje de dois grandes blocos de legado:

1. o legado copiado para dentro do repositorio;
2. o conhecimento historico e documental que continua no `v1` externo.

### 12.1 Legado copiado para dentro do v2

Pasta principal:

- `src/backend/search/v1_copy/`

Ali vivem copias controladas de:

- modulos de busca;
- scripts;
- runtime de documentos;
- utilitarios do browser legado;
- parte da logica que o v2 ja reaproveita.

### 12.2 Legado que segue como referencia externa

Fora deste repositorio, o v1 continua sendo referencia para:

- pipelines PNCP;
- jobs de boletim;
- schema historico;
- scripts operacionais.

Referencias documentadas no v2:

- pipelines PNCP em `v1/scripts/pncp`
- gerador de boletins em `v1/search/gvg_browser/scripts`
- snapshot de schema em `v1/db/BDS1_v7.txt`

---

## 13. Base de dados e persistencia

### 13.1 Base principal

A base principal de negocio continua sendo Supabase/PostgreSQL.

Analise detalhada:

- [docs/ANALISE_BASE_SUPABASE.md](docs/ANALISE_BASE_SUPABASE.md)
- [db/BDS1_v7.txt](db/BDS1_v7.txt)

### 13.2 Conclusao estrutural da base

Os documentos de analise mostram que:

- o schema de interesse e `public`;
- a chave estrutural do dominio e `numero_controle_pncp`;
- `contratacao` e a tabela central de editais/oportunidades;
- `item_contratacao` guarda os itens do edital;
- `contrato`, `ata` e `pca` complementam o dominio;
- tabelas `_emb` materializam a camada semantica;
- tabelas `user_*` e `system_*` sustentam a camada SaaS/produto.

### 13.3 Persistencia local do v2

Arquivo:

- `data/govgo_v2.sqlite3`

Usos atuais:

- configuracao de busca;
- filtros persistidos;
- cache de markdown de documentos;
- cache de resumos consolidados de documentos.

### 13.4 Snapshot de schema

Arquivos principais:

- [db/BDS1_v7.txt](db/BDS1_v7.txt)
- [tmp/supabase_schema_snapshot.json](tmp/supabase_schema_snapshot.json)

---

## 14. Pipelines e jobs herdados

### 14.1 Pipeline PNCP

O estudo do pipeline que alimenta a base foi consolidado em documentos proprios.

Referencias:

- [docs/ANALISE_BASE_SUPABASE.md](docs/ANALISE_BASE_SUPABASE.md)
- `v1/scripts/pncp`

Hoje o cron principal observado roda:

- `bash pipeline.sh`

no diretorio:

- `v1/scripts/pncp`

Esse pipeline cobre principalmente:

- `contratacao`
- `contrato`

com etapas:

- `01_processing`
- `02_embeddings`
- `03_categorization`

### 14.2 Pipeline de boletins

Analises prontas:

- [docs/ANALISE_PIPELINE_BOLETIM_V1.md](docs/ANALISE_PIPELINE_BOLETIM_V1.md)
- [docs/ANALISE_CAMPOS_BOLETIM_V1.md](docs/ANALISE_CAMPOS_BOLETIM_V1.md)

Diretorio de referencia:

- `v1/search/gvg_browser/scripts`

O job observado roda:

- `bash run_pipeline_boletim.sh`

Esse pipeline:

- le agendamentos;
- executa buscas programadas;
- grava `user_boletim`;
- envia email;
- atualiza `last_run_at` e `last_sent_at`.

---

## 15. Homologacoes existentes

### 15.1 Busca

Pasta:

- `homologation/search/`

Papel:

- validar o motor de busca do v1 fora da UI Dash;
- comparar modelos e configuracoes;
- executar smoke tests;
- preparar integracao no v2.

### 15.2 Documentos

Pasta:

- `homologation/documents/`

Papel:

- validar download, transcricao, markdown e resumo de documentos;
- provar o runtime antes da integracao no detalhe de edital do v2.

As funcionalidades de documento atualmente integradas no detalhe do edital reaproveitam exatamente essa homologacao.

---

## 16. Documentacao em `/docs`

### 16.1 Leitura recomendada para onboarding

Se alguem chegar do zero no projeto, a ordem recomendada e:

1. [docs/DIARIO_DE_BORDO.md](docs/DIARIO_DE_BORDO.md)
2. [docs/PLANO_MESTRE_V1_V2.md](docs/PLANO_MESTRE_V1_V2.md)
3. [docs/MATRIZ_V1_V2.md](docs/MATRIZ_V1_V2.md)
4. [docs/ESTRATEGIA_V1_NO_V2.md](docs/ESTRATEGIA_V1_NO_V2.md)
5. [docs/CONVENCAO_ARQUITETURA_FRONTEND.md](docs/CONVENCAO_ARQUITETURA_FRONTEND.md)
6. [docs/ESTRUTURA_FRONTEND_V2.md](docs/ESTRUTURA_FRONTEND_V2.md)
7. [docs/MAPA_TOKENS_RECIPES_V2.md](docs/MAPA_TOKENS_RECIPES_V2.md)
8. [docs/CHECKLIST_IMPLEMENTACAO_FRONTEND.md](docs/CHECKLIST_IMPLEMENTACAO_FRONTEND.md)
9. [docs/CRITERIOS_REVISAO_VISUAL.md](docs/CRITERIOS_REVISAO_VISUAL.md)
10. [docs/DEFINICAO_DE_PRONTO_POR_TELA.md](docs/DEFINICAO_DE_PRONTO_POR_TELA.md)
11. [docs/ANALISE_BASE_SUPABASE.md](docs/ANALISE_BASE_SUPABASE.md)
12. [docs/ANALISE_PIPELINE_BOLETIM_V1.md](docs/ANALISE_PIPELINE_BOLETIM_V1.md)
13. [docs/ANALISE_CAMPOS_BOLETIM_V1.md](docs/ANALISE_CAMPOS_BOLETIM_V1.md)
14. [docs/MATRIZ_SIMILARIDADE_V1_V2.md](docs/MATRIZ_SIMILARIDADE_V1_V2.md)
15. [docs/ESTUDO_PLATAFORMA_USUARIO_V1_V2.md](docs/ESTUDO_PLATAFORMA_USUARIO_V1_V2.md)

### 16.2 O que cada documento cobre

| Documento | Papel |
| --- | --- |
| `DIARIO_DE_BORDO.md` | estado vivo do projeto e proximo passo oficial |
| `PLANO_MESTRE_V1_V2.md` | estrategia global de transicao v1 -> v2 |
| `MATRIZ_V1_V2.md` | mapa funcional entre o que existe no v1 e o que deve existir no v2 |
| `ESTRATEGIA_V1_NO_V2.md` | como tratar o v1 como backend/servico e nao como UI |
| `ESTRATEGIA_TESTES_ANTES_UI.md` | ordem correta de homologar antes de plugar na UI |
| `TRIAGEM_MODULOS_LEGADOS.md` | backlog tecnico do legado |
| `CONVENCAO_ARQUITETURA_FRONTEND.md` | regras de traducao de `design/` para `src/` |
| `ESTRUTURA_FRONTEND_V2.md` | organizacao esperada do frontend |
| `MAPA_TOKENS_RECIPES_V2.md` | design tokens e receitas |
| `CHECKLIST_IMPLEMENTACAO_FRONTEND.md` | checklist tecnico de implementacao |
| `CRITERIOS_REVISAO_VISUAL.md` | criterio objetivo de revisao visual |
| `DEFINICAO_DE_PRONTO_POR_TELA.md` | criterio de aceite por tela |
| `ESPECIFICACAO_TELA_INICIO.md` | especificacao inicial da Home/Inicio |
| `ANALISE_BASE_SUPABASE.md` | leitura arquitetural da base atual |
| `ANALISE_PIPELINE_BOLETIM_V1.md` | entendimento do pipeline de boletins do v1 |
| `ANALISE_CAMPOS_BOLETIM_V1.md` | analise campo a campo de `user_schedule` e `user_boletim` |
| `MATRIZ_SIMILARIDADE_V1_V2.md` | matriz tecnica dos calculos, ranges e exibicao da similaridade |
| `ESTUDO_PLATAFORMA_USUARIO_V1_V2.md` | estudo completo de auth, historico, favoritos, boletins, billing e artefatos de usuario do v1 e como trazelos ao v2 |

---

## 17. Debitos tecnicos e tensoes atuais

### 17.1 Runtime frontend ainda hibrido demais

Hoje o app ainda depende de:

- JSX executado no browser via Babel;
- componentes `design/govgo/*.jsx` carregados diretamente por `index.html`.

Isso acelera a evolucao, mas aumenta fragilidade de runtime, cache e depuracao.

### 17.2 Encoding

Ja houve varios incidentes de encoding em arquivos JSX de `design/`.
Ao editar esses arquivos, cuidado redobrado com charset e ferramentas usadas.

O repositorio agora possui [`.editorconfig`](.editorconfig) forçando `utf-8`, e essa configuracao deve ser tratada como baseline para qualquer edicao em UI e docs.

### 17.3 Persistencia local espalhada

Hoje o projeto usa:

- `localStorage`
- `sessionStorage`
- SQLite local
- Supabase

Isso e funcional, mas exige criterio claro para cada tipo de estado.

### 17.4 Fronteira `design/` vs `src/`

O caminho desejado e internalizar cada vez mais da UI canonica para `src/`, sem perder aderencia visual.

### 17.5 Tipagem da base de negocio

A analise da base mostrou um debito estrutural forte:

- datas, IDs e valores importantes ainda aparecem como `text` em tabelas centrais.

Isso impacta filtros, ordenacoes, casting e manutencao.

---

## 18. Roadmap tecnico imediato

As prioridades tecnicas mais naturais hoje sao:

1. estabilizar a UX da aba `Documentos` no detalhe do edital;
2. reduzir dependencia de `design/govgo/*.jsx` em runtime;
3. corrigir os ultimos pontos de encoding em componentes ainda herdados;
4. fortalecer logs e estados de erro;
5. consolidar a internalizacao progressiva da UI de busca e detalhe em `src/`;
6. continuar a documentacao tecnica da base, pipelines e fluxos reais.

Consulte sempre o [docs/DIARIO_DE_BORDO.md](docs/DIARIO_DE_BORDO.md) para o estado mais atual.

---

## 19. Checklist rapido para quem esta chegando agora

Se voce vai mexer no projeto pela primeira vez:

1. leia [docs/DIARIO_DE_BORDO.md](docs/DIARIO_DE_BORDO.md);
2. leia [docs/PLANO_MESTRE_V1_V2.md](docs/PLANO_MESTRE_V1_V2.md);
3. rode `python .\run.py`;
4. navegue em `#/busca` e `#/busca/detalhe/:id`;
5. leia:
   - [src/app/boot/index.html](src/app/boot/index.html)
   - [src/app/router/routes.jsx](src/app/router/routes.jsx)
   - [src/app/shell/AppShell.jsx](src/app/shell/AppShell.jsx)
   - [src/features/busca/BuscaWorkspace.jsx](src/features/busca/BuscaWorkspace.jsx)
   - [src/services/api/searchApi.jsx](src/services/api/searchApi.jsx)
   - [src/backend/search/api/service.py](src/backend/search/api/service.py)
   - [src/backend/search/core/adapter.py](src/backend/search/core/adapter.py)
6. depois leia [docs/ANALISE_BASE_SUPABASE.md](docs/ANALISE_BASE_SUPABASE.md);
7. se o assunto envolver boletins, leia tambem:
   - [docs/ANALISE_PIPELINE_BOLETIM_V1.md](docs/ANALISE_PIPELINE_BOLETIM_V1.md)
   - [docs/ANALISE_CAMPOS_BOLETIM_V1.md](docs/ANALISE_CAMPOS_BOLETIM_V1.md)

---

## 20. Referencias importantes

### Arquivos de entrada mais importantes

- [run.py](run.py)
- [src/app/boot/index.html](src/app/boot/index.html)
- [src/app/boot/GovGoV2App.jsx](src/app/boot/GovGoV2App.jsx)
- [src/app/router/routes.jsx](src/app/router/routes.jsx)
- [src/app/shell/AppShell.jsx](src/app/shell/AppShell.jsx)
- [design/govgo/shell.jsx](design/govgo/shell.jsx)
- [design/govgo/mode_busca.jsx](design/govgo/mode_busca.jsx)
- [src/features/busca/BuscaWorkspace.jsx](src/features/busca/BuscaWorkspace.jsx)
- [design/govgo/mode_busca_detail.jsx](design/govgo/mode_busca_detail.jsx)
- [src/backend/search/api/service.py](src/backend/search/api/service.py)
- [src/backend/search/core/adapter.py](src/backend/search/core/adapter.py)

### Documentos estruturais mais importantes

- [docs/DIARIO_DE_BORDO.md](docs/DIARIO_DE_BORDO.md)
- [docs/PLANO_MESTRE_V1_V2.md](docs/PLANO_MESTRE_V1_V2.md)
- [docs/MATRIZ_V1_V2.md](docs/MATRIZ_V1_V2.md)
- [docs/ESTRATEGIA_V1_NO_V2.md](docs/ESTRATEGIA_V1_NO_V2.md)
- [docs/ANALISE_BASE_SUPABASE.md](docs/ANALISE_BASE_SUPABASE.md)
- [docs/MATRIZ_SIMILARIDADE_V1_V2.md](docs/MATRIZ_SIMILARIDADE_V1_V2.md)
- [db/BDS1_v7.txt](db/BDS1_v7.txt)

---

## 21. Resumo final

Se voce leu ate aqui, a ideia central do projeto e:

- `design/` define o idioma visual;
- `src/` e a aplicacao real em construcao;
- `run.py` e o entrypoint local;
- `Busca` e o fluxo mais avancado do v2 hoje;
- `Detalhe do edital` ja trabalha com itens, documentos, markdown e resumo real;
- o legado do v1 continua essencial, mas como backend, pipeline e runtime, nao como UI final;
- `/docs` e parte do produto de engenharia, nao acessorio.

Este README deve ser tratado como guia principal de onboarding tecnico do GovGo v2.
Quando houver conflito entre este arquivo e o estado vivo do projeto, a prioridade de consulta deve ser:

1. [docs/DIARIO_DE_BORDO.md](docs/DIARIO_DE_BORDO.md)
2. o codigo em `src/`, `design/`, `run.py` e `src/backend/search/`
3. os documentos de estrategia e analise em `/docs`
