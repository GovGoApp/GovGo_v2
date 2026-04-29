# Roadmap Completo GovGo v2 Pos-Design e v1

## Finalidade

Este documento consolida o roadmap atualizado do GovGo v2 depois da releitura de:

- `design/`, que contem os mocks e ideias de produto da v2;
- `v1/search/gvg_select`, que e a base real do Modo Empresa;
- `v1/db/reports`, que e a base real do Modo Relatorio;
- estudos anteriores em `docs/ESTUDO_PLATAFORMA_USUARIO_V1_V2.md`, `docs/PLANO_MESTRE_V1_V2.md`, `docs/ESTRATEGIA_V1_NO_V2.md` e `docs/ANALISE_BASE_SUPABASE.md`.

A decisao principal e simples:

O v2 deve ser a aplicacao final. O v1 deve virar fonte de dominio, dados, servicos, jobs e regras de negocio.

## Resumo Executivo

O mock de `design/` nao inventa tudo do zero. Ele amplia visualmente e funcionalmente algumas capacidades que ja existem no v1:

- Modo Empresa: ja existe no v1 como `gvg_select`.
- Modo Relatorio: ja existe no v1 como `gvg_report`, materializado em `db/reports/GvG_SU_Report_v3.py`.
- Busca: ja existe no v1 em `gvg_browser` e ja esta parcialmente integrada ao v2.
- Plataforma de usuario: ja existe no v1 e ja comecou a ser trazida ao v2 via auth e favoritos.

O que o mock adiciona de verdade e uma camada de produto mais integrada:

- Inicio como cockpit operacional;
- workspace com abas entre buscas, favoritos, boletins, editais e relatorios;
- Modo Empresa mais rico do que o `gvg_select` atual;
- Modo Relatorio com experiencia NL -> SQL mais limpa e persistente;
- Radar como inteligencia de mercado, ainda sem modulo pronto no v1.

## Nomenclatura Oficial

| Nome no v2 | Nome legado / fonte | Observacao |
| --- | --- | --- |
| Inicio | composicao nova | Usa dados reais de usuario, busca, favoritos, relatorios e boletins. |
| Busca | `gvg_browser` | Ja tem base real forte no v1. |
| Modo Empresa | `gvg_select` | Deve ser chamado no singular: Modo Empresa. |
| Radar | novo `MarketService` | Deve nascer dos dados do v1, mas nao ha modulo pronto equivalente. |
| Modo Relatorio | `gvg_report` | Deve ser chamado no singular: Modo Relatorio. |

## Mapa Corrigido dos Modulos v1

### Busca

Origem principal:

- `v1/search/gvg_browser/gvg_search_core.py`
- `v1/search/gvg_browser/gvg_preprocessing.py`
- `v1/search/gvg_browser/gvg_database.py`
- `v1/search/gvg_browser/gvg_documents.py`
- `v1/search/gvg_browser/gvg_user.py`
- `v1/search/gvg_browser/GvG_Search_Browser.py`

Destino:

- `src/features/busca/`
- `src/backend/search/`
- `src/services/api/searchApi.jsx`
- `src/services/adapters/searchAdapter.jsx`

Estado atual:

- Busca real ja esta parcialmente funcional no v2;
- detalhe de edital e documentos ja existem;
- favoritos ja foram ligados a busca;
- mapa e tabela precisam permanecer estaveis e nao devem ser alterados por frentes de usuario sem pedido explicito.

### Modo Empresa

Origem principal:

- `v1/search/gvg_select/GvG_Select_v4.py`
- `v1/search/gvg_select/gvg_cnpj_search.py`
- `v1/search/gvg_select/gvg_cnpj_search_v2.py`
- `v1/search/gvg_select/gvg_styles.py`
- `v1/search/gvg_select/README.md`

O que o v1 ja faz:

- entrada por CNPJ;
- normalizacao e formatacao de CNPJ;
- busca de dados cadastrais da empresa via OpenCNPJ;
- leitura de contratos historicos por `contrato.ni_fornecedor`;
- uso de embeddings de contratos em `contrato_emb`;
- fallback por CNAE usando `cnae.cnae_emb`;
- busca de editais aderentes em `contratacao_emb`;
- calculo de similaridade semantica;
- calculo de fator geografico;
- score final combinando similaridade e geografia;
- coordenadas por `municipios`;
- tabela de contratos;
- tabela de editais aderentes;
- mapa de contratos e editais;
- parametros de busca: `top_k`, candidatos iniciais, amostragem de contratos, peso geografico, tau geografico, filtro de encerrados;
- historico de CNPJ com replay e exclusao;
- snapshot de empresa, contratos e editais.

Tabelas e dados envolvidos:

- `public.contrato`
- `public.contrato_emb`
- `public.contratacao`
- `public.contratacao_emb`
- `public.cnae`
- `public.municipios`
- `public.empresa`
- `public.vw_fornecedores`
- `public.vw_contratos_por_fornecedor`
- `public.so_prompt`
- possivel schema/tabela `sommelier.prompt`, citado pelo README do `gvg_select`

Ponto de atencao:

Existe divergencia documental entre `public.so_prompt` no schema exportado e `sommelier.prompt` no README/codigo recente do `gvg_select`. Antes de implantar o Modo Empresa real no v2, e obrigatorio confirmar no banco ativo qual objeto e a fonte real de historico/snapshot.

O que o mock de `design/` adiciona ao Modo Empresa:

- busca por nome com desambiguacao visual;
- abas de empresas abertas;
- perfil mais completo;
- cards de KPIs;
- contato e conformidade;
- timeline de atividade;
- contratos historicos com UI v2;
- editais aderentes ao perfil;
- mapa de presenca geografica;
- snapshot executivo;
- favoritos de empresa;
- possivel relacao com concorrencia e Radar.

### Modo Relatorio

Origem principal:

- `v1/db/reports/GvG_SU_Report_v3.py`
- `v1/db/reports/Assistant/PNCP_SQL_SUPABASE_v1_2.txt`
- `v1/db/reports/sql_history.json`

O que o v1 ja faz:

- recebe pergunta em linguagem natural;
- envia pergunta para assistant OpenAI;
- extrai SQL da resposta;
- executa SQL no Supabase/PostgreSQL;
- renderiza conversa, SQL e tabela de resultado;
- mostra erros de execucao SQL em formato legivel;
- salva historico local de SQL em JSON;
- permite reutilizar perguntas antigas;
- limpa historico local;
- exporta resultado para XLSX.

Tabelas e dados envolvidos:

- `contratacao`
- `contrato`
- `item_contratacao`
- `categoria`
- `contratacao_emb`
- `item_classificacao`
- demais tabelas permitidas pelo prompt SQL.

O que o mock de `design/` adiciona ao Modo Relatorio:

- abas de consultas;
- trilho lateral de consultas recentes;
- SQL salvas;
- preview visual de SQL;
- status de execucao;
- exportacao CSV/XLSX;
- botao de visualizar;
- botao de salvar;
- experiencia mais parecida com um analista de dados dentro do produto.

Ponto de atencao:

No v1, a execucao SQL e direta. No v2, isso precisa ganhar uma camada obrigatoria de seguranca:

- somente `SELECT` e CTEs read-only;
- bloqueio de `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `GRANT`, `REVOKE`;
- limite padrao;
- timeout;
- whitelist de schemas/tabelas;
- logs por usuario;
- billing/limites;
- erro explicavel;
- historico persistido por usuario, nao apenas JSON local.

### Radar

Origem:

- nao existe um modulo v1 pronto equivalente.

Base possivel:

- `contratacao`;
- `contrato`;
- `item_contratacao`;
- `categoria`;
- `contratacao_emb`;
- `contrato_emb`;
- `cnae`;
- views de fornecedores;
- historico de resultados e prompts;
- dados de municipios e UF.

Conclusao:

Radar deve ser construida como `MarketService` novo. Ele nao deve ser vendido internamente como migracao direta do v1, mas como produto novo sustentado pelos dados e pipelines do v1.

## Camadas de Produto

### Camada 1 - Migracao fiel do v1

Objetivo:

Trazer ao v2 o que ja existe e funciona no v1.

Inclui:

- auth;
- sessao;
- favoritos;
- historico;
- boletins;
- documentos e resumos por usuario;
- billing e limites;
- busca real;
- Modo Empresa via `gvg_select`;
- Modo Relatorio via `gvg_report`.

### Camada 2 - UI e experiencia v2

Objetivo:

Reapresentar as mesmas capacidades com a linguagem visual de `design/`.

Inclui:

- abas;
- cards;
- trilhos;
- mapa/tabela;
- modo claro/escuro;
- chips, tags, pins e padroes de data;
- componentes consistentes;
- navegacao por modos.

### Camada 3 - Expansao v2

Objetivo:

Construir capacidades que o mock sugere, mas que nao existem completas no v1.

Inclui:

- Inicio como cockpit real;
- Radar;
- alertas persistentes alem de boletins;
- snapshots executivos mais ricos;
- analises competitivas integradas;
- relatorios salvos e compartilhaveis;
- conexao plena entre Empresa, Busca e Radar.

## Arquitetura-Alvo

### Frontend

Estrutura esperada:

- `src/pages/inicio/`
- `src/pages/busca/`
- `src/pages/empresas/`
- `src/pages/radar/`
- `src/pages/relatorios/`
- `src/features/usuario/`
- `src/features/favoritos/`
- `src/features/historico/`
- `src/features/boletins/`
- `src/features/empresas/`
- `src/features/relatorios/`
- `src/features/radar/`

Regra:

O frontend real deve seguir `design/`, mas nao deve depender de `design/govgo/*.jsx` como runtime permanente.

### Backend

Servicos esperados:

- `SearchService`
- `UserPlatformService`
- `CompanyService`
- `ReportsService`
- `MarketService`
- `DocumentService`
- `NotificationService`
- `BillingService`

### APIs Sugeridas

#### Usuario

- `GET /api/auth/me`
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/logout`
- `GET /api/user/favorites`
- `POST /api/user/favorites`
- `DELETE /api/user/favorites/:pncp`
- `GET /api/user/history`
- `DELETE /api/user/history/:id`
- `GET /api/user/boletins`
- `POST /api/user/boletins`
- `DELETE /api/user/boletins/:id`

#### Busca

- `POST /api/search`
- `GET /api/search/detail?pncp_id=...`
- `GET /api/search/items?pncp_id=...`
- `GET /api/search/documents?pncp_id=...`
- `POST /api/search/export`

#### Modo Empresa

- `GET /api/company/search?q=...`
- `GET /api/company/profile?cnpj=...`
- `GET /api/company/contracts?cnpj=...`
- `GET /api/company/opportunities?cnpj=...`
- `GET /api/company/map?cnpj=...`
- `GET /api/company/history`
- `POST /api/company/history`
- `DELETE /api/company/history/:id`
- `POST /api/company/snapshot`

#### Modo Relatorio

- `POST /api/reports/generate-sql`
- `POST /api/reports/execute`
- `POST /api/reports/run`
- `GET /api/reports/history`
- `DELETE /api/reports/history/:id`
- `POST /api/reports/save`
- `GET /api/reports/:id/export?format=xlsx`

#### Radar

- `GET /api/market/overview`
- `GET /api/market/timeseries`
- `GET /api/market/buyers`
- `GET /api/market/suppliers`
- `GET /api/market/contracts`
- `GET /api/market/geo`

## Contratos Minimos

### CompanyProfile

Campos minimos:

- `cnpj`
- `razao_social`
- `nome_fantasia`
- `municipio`
- `uf`
- `situacao_cadastral`
- `data_inicio_atividade`
- `porte_empresa`
- `cnae_principal`
- `cnaes_secundarios`
- `capital_social`
- `qsa`
- `stats`

### CompanyOpportunity

Campos minimos:

- `numero_controle_pncp`
- `orgao`
- `municipio`
- `uf`
- `objeto`
- `valor`
- `data_encerramento_proposta`
- `similarity`
- `geo_similarity`
- `final_score`
- `lat`
- `lon`
- `link_sistema_origem`

### CompanyContract

Campos minimos:

- `numero_controle_pncp`
- `numero_contrato_empenho`
- `orgao`
- `municipio`
- `uf`
- `objeto_contrato`
- `valor_global`
- `data_vigencia_inicio`
- `data_vigencia_fim`
- `lat`
- `lon`

### ReportRun

Campos minimos:

- `id`
- `user_id`
- `question`
- `sql`
- `status`
- `columns`
- `rows`
- `row_count`
- `elapsed_ms`
- `created_at`
- `error`

## Roadmap de Execucao

### Fase 0 - Fechamento de base e nao-regressao

Objetivo:

Congelar o comportamento que ja esta funcionando e impedir regressao em Busca, mapa e favoritos.

Entregas:

- checklist de smoke test de Busca;
- smoke test de mapa com coordenadas reais do Brasil;
- smoke test de favoritos;
- padrao unico de prazo/tag/pin;
- log claro de erro de API;
- documentacao de invariantes criticas.

Gate:

- salvar/remover favorito nao quebra Busca;
- mapa nao renderiza pins em `(0,0)`;
- resposta JSON nao quebra por `datetime`, `date` ou `Decimal`.

### Fase 1 - Plataforma de usuario

Objetivo:

Completar a camada transversal iniciada por auth e favoritos.

Entregas:

- historico real de buscas usando `user_prompts` e `user_results`;
- replay de historico abrindo aba de Busca;
- boletins reais usando `user_schedule` e `user_boletim`;
- listagem e replay de boletim;
- ownership de documentos e resumos por usuario;
- mensagens/avisos conforme modelo real do v1;
- billing e limites minimos para consultas, favoritos, boletins e resumos.

Gate:

- usuario logado ve apenas seus artefatos;
- usuario anonimo nao acessa recursos privados;
- Inicio, Busca e rail lateral usam a mesma fonte de usuario.

### Fase 2 - Consolidacao da Busca

Objetivo:

Transformar Busca no modo mais estavel da v2.

Entregas:

- contrato definitivo de resultados;
- contrato definitivo de detalhe;
- persistencia de historico integrada;
- exportacao basica;
- documentos e resumos com ownership;
- regressao visual dos cards, tabela, mapa e detalhe.

Gate:

- Busca pode ser usada como base confiavel por Favoritos, Historico, Boletins e Inicio.

### Fase 3 - Modo Empresa via `gvg_select`

Objetivo:

Trazer o `gvg_select` para o v2 como Modo Empresa real, sem importar a UI Dash.

Etapas:

1. Criar `CompanyAdapter` em backend, chamando a logica de `gvg_cnpj_search.py`.
2. Confirmar schema real de historico: `public.so_prompt` vs `sommelier.prompt`.
3. Definir contrato `CompanyProfile`.
4. Definir contrato `CompanyContract`.
5. Definir contrato `CompanyOpportunity`.
6. Implementar endpoint de perfil por CNPJ.
7. Implementar endpoint de contratos por CNPJ.
8. Implementar endpoint de editais aderentes por CNPJ.
9. Implementar historico/replay de CNPJ por usuario.
10. Implementar tela v2 baseada em `design/govgo/mode_fornecedores.jsx`, mas com nome de produto Modo Empresa.
11. Integrar mapa de contratos/editais usando coordenadas ja normalizadas.
12. Adicionar smoke tests para CNPJ com muitos contratos, CNPJ sem contratos e CNPJ invalido.

Gate:

- Modo Empresa abre uma empresa real;
- mostra perfil, contratos, editais aderentes e mapa;
- historico/replay funciona;
- sem dependencia runtime da UI Dash.

### Fase 4 - Modo Relatorio via `gvg_report`

Objetivo:

Trazer o `gvg_report` para o v2 como Modo Relatorio real, com seguranca de SQL.

Etapas:

1. Criar `ReportsAdapter`.
2. Encapsular geracao NL -> SQL.
3. Criar validador SQL read-only.
4. Criar executor SQL com timeout e limite.
5. Persistir historico por usuario.
6. Implementar export XLSX/CSV.
7. Implementar SQL preview e resultados na UI v2.
8. Implementar reuso de consulta do historico.
9. Implementar tratamento claro de erro do assistant e do banco.
10. Adicionar testes com perguntas simples, ambiguas e proibidas.

Gate:

- pergunta em portugues gera SQL valido;
- SQL e exibido antes/ao executar;
- somente consultas read-only rodam;
- historico e export funcionam por usuario.

### Fase 5 - Inicio real

Objetivo:

Transformar Inicio em cockpit real, nao mock.

Entregas:

- favoritos reais;
- historico real;
- boletins reais;
- relatorios recentes;
- empresas recentes;
- KPIs derivados dos artefatos do usuario;
- atalhos para Busca, Modo Empresa, Radar e Modo Relatorio.

Gate:

- Inicio deixa de depender de `DATA.*` mockado para dados principais.

### Fase 6 - Radar

Objetivo:

Construir inteligencia de mercado a partir da base do v1.

Entregas:

- `MarketService`;
- KPIs por categoria/mercado;
- series temporais;
- top compradores;
- top fornecedores;
- ranking competitivo;
- concentracao geografica;
- exportacao/briefing.

Gate:

- Radar entrega numeros reproduziveis e auditaveis.

### Fase 7 - Producao e endurecimento

Objetivo:

Preparar a aplicacao para usuarios reais.

Entregas:

- logs estruturados;
- observabilidade;
- limites por plano;
- cache;
- jobs agendados;
- runbooks;
- testes e2e;
- revisao visual final.

Gate:

- stack pronta para uso controlado.

## Ordem Recomendada Agora

Com base no estado atual do v2, a ordem pratica deve ser:

1. terminar Plataforma de usuario: historico, boletins e artefatos por usuario;
2. estabilizar Busca como dependencia central;
3. implantar Modo Empresa a partir de `gvg_select`;
4. implantar Modo Relatorio a partir de `gvg_report`;
5. transformar Inicio em painel real;
6. construir Radar;
7. endurecer producao.

Justificativa:

- Historico e boletins destravam Inicio e workspace.
- Busca precisa ser estavel porque Favoritos, Empresa e Boletins dependem dela.
- Modo Empresa tem base v1 madura e alto valor imediato.
- Modo Relatorio tem base v1 madura, mas exige seguranca SQL antes de ir ao usuario.
- Radar e mais novo e depende de agregacoes confiaveis.

## Riscos Principais

### Modo Empresa

- divergencia entre `public.so_prompt` e `sommelier.prompt`;
- alto custo de embeddings em `contrato_emb`;
- latencia de OpenCNPJ;
- coordenadas inconsistentes;
- mistura indevida entre contratos historicos e editais aderentes;
- repetir no v2 a dependencia de callbacks Dash.

### Modo Relatorio

- SQL perigoso sem validador;
- assistant gerar query invalida;
- consulta pesada demais;
- historico local JSON nao servir para ambiente multiusuario;
- vazamento de dados entre usuarios;
- falta de limite por plano.

### Inicio

- virar dashboard decorativo se nao usar dados reais;
- misturar mock com dado real sem indicacao;
- duplicar logica de favoritos/historico em vez de consumir providers centrais.

### Radar

- parecer preciso sem ter base auditavel;
- calcular agregados caros em tempo real;
- confundir ranking competitivo com prova factual sem metodologia.

## Decisoes de Produto Fechadas

1. O nome correto e Modo Empresa, no singular.
2. O nome correto e Modo Relatorio, no singular.
3. Modo Empresa vem de `gvg_select`, nao de um modulo generico.
4. Modo Relatorio vem de `gvg_report`, especialmente `GvG_SU_Report_v3.py`.
5. Radar nao deve ser tratado como migracao direta; e expansao v2.
6. `design/` e a referencia visual, nao a runtime final.
7. V1 e fonte de dominio, nao UI final.
8. Nenhum modulo legado deve chegar ao frontend sem contrato de API, smoke test e gate de seguranca.

## Proximo Passo Operacional

O proximo passo recomendado e abrir a frente de Historico real do usuario.

Motivos:

- ja temos auth e favoritos;
- historico e base para Busca, Inicio, Modo Relatorio e Modo Empresa;
- evita construir novas telas ainda dependentes de mock;
- permite replay real de trabalho do usuario.

Em paralelo, pode comecar uma homologacao backend-only do Modo Empresa:

- rodar `gvg_select` para CNPJs conhecidos;
- medir tempo de `run_search`;
- validar `contrato_emb`;
- validar historico/snapshot;
- resolver a divergencia `so_prompt` vs `sommelier.prompt`.

