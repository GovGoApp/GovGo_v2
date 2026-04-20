# Estrategia para Fazer o GovGo v1 Funcionar Dentro do v2

## Objetivo

Fazer o GovGo v1 operar dentro do GovGo v2 sem tentar "encaixar" a interface Dash antiga dentro do novo produto.

Para a visao consolidada de execucao, ver `docs/PLANO_MESTRE_V1_V2.md`.

A estrategia correta e:

- manter o v1 como base de dominio, dados e integracoes;
- extrair dele servicos reutilizaveis e uma camada de API;
- usar o v2 como a nova camada de experiencia, navegacao e estado compartilhado;
- substituir os mocks do design por dados reais de forma progressiva.

Para a forma de validacao desses modulos antes da UI, ver tambem `docs/ESTRATEGIA_TESTES_ANTES_UI.md`.

Em termos de produto, o v2 passa a ser a aplicacao. O v1 passa a ser o backend operacional e de inteligencia que alimenta essa aplicacao.

## Premissas de Produto

- Navegacao principal aprovada para a v2: Inicio, Busca, Empresas, Radar, Relatorios.
- O design atual e a referencia visual e funcional da v2.
- O conteudo de `design/` ja esta pre-pronto e deve ser levado para a aplicacao final tal como esta em estrutura, CSS, fontes, paleta, boxes e padrao visual.
- Nada da camada visual deve ser hardcoded fora desse padrao; novos valores visuais so entram se forem incorporados primeiro ao proprio sistema de design em `design/`.
- O nome tecnico de alguns arquivos do design ainda pode refletir nomenclaturas antigas, mas a documentacao deve considerar o modelo de produto aprovado.
- O objetivo nao e migrar a UI do v1. O objetivo e migrar capacidades e fluxos do v1 para dentro da experiencia do v2.

## Leitura Consolidada

### O que o v1 ja entrega hoje

O v1 nao e um sistema pequeno. Ele ja contem quase toda a espinha dorsal operacional necessaria para a v2:

- motor de busca semantica, textual e hibrida;
- pre-processamento de consultas;
- conexao e acesso ao banco Supabase/PostgreSQL;
- tratamento de documentos e extracao de conteudo;
- exportacao de resultados;
- autenticacao Supabase;
- preferencias e artefatos do usuario;
- billing, limites e snapshots de uso;
- boletins, historico e bookmarks;
- notificacoes toast;
- experiencia de relatorios com NL -> SQL;
- experiencia de analise por CNPJ/empresa;
- pipeline de ingestao e atualizacao PNCP.

### Modulos centrais do v1 que devem ser aproveitados

| Area | Base no v1 | Papel na migracao |
| --- | --- | --- |
| Busca | `search/gvg_browser/gvg_search_core.py` | Nucleo de busca da v2 |
| Pre-processamento | `search/gvg_browser/gvg_preprocessing.py` | Interpretacao e normalizacao de consulta |
| Banco | `search/gvg_browser/gvg_database.py` | Acesso a dados, wrappers e queries |
| Usuario | `search/gvg_browser/gvg_user.py` | Historico, prompts, bookmarks, artefatos |
| Auth | `search/gvg_browser/gvg_auth.py` | Sessao e autenticacao via Supabase |
| Billing | `search/gvg_browser/gvg_billing.py` | Planos, limites, checkout, uso |
| Boletins | `search/gvg_browser/gvg_boletim.py` | Persistencia e agenda de boletins |
| Notificacoes | `search/gvg_browser/gvg_notifications.py` | Modelo de feedback e eventos de UI |
| Documentos | `search/gvg_browser/gvg_documents.py` | Download, resumo, processamento de PDFs |
| Exportacao | `search/gvg_browser/gvg_exporters.py` | XLSX, CSV, PDF, HTML |
| Busca Browser | `search/gvg_browser/GvG_Search_Browser.py` | Fonte de regras e fluxos, nao de UI final |
| Relatorios | `db/reports/GvG_SU_Report_v3.py` | Base funcional do modo Relatorios |
| Empresas | `scripts/cnpj_search/cnpj_search_v1_3.py` | Base funcional do modo Empresas |
| Pipeline | `scripts/`, `db/`, `doc/ARQUITETURA_V1.md` | Atualizacao de dados e operacao |

### O que o design do v2 ja define

O design da v2 ja descreve uma arquitetura de produto muito clara:

- um shell unico com navegacao por modos;
- um modo de entrada (Inicio) com KPIs e atalhos;
- um modo Busca orientado a descoberta de oportunidades;
- um modo Empresas orientado a CNPJ, perfil, contratos e aderencia;
- um modo Radar orientado a leitura de mercado e concorrencia;
- um modo Relatorios orientado a perguntas analiticas e SQL assistido;
- uma camada transversal de artefatos do usuario, historico, alertas e boletins.

Esse design tambem ja define o padrao de implementacao visual que deve ser preservado na aplicacao final. Isso significa que migrar o v2 nao e redesenhar interface, trocar CSS livremente ou reconstruir layout fora do sistema visual ja estabelecido em `design/`.

Isso significa que a migracao v1 -> v2 nao deve ser pensada como "reescrever do zero". Ela deve ser pensada como "reempacotar o que ja existe do v1 dentro da arquitetura de experiencia do v2".

## Mapeamento Funcional: v1 -> v2

### Inicio

O modo Inicio nao existe como modulo isolado no v1, mas pode ser montado a partir de capacidades que o v1 ja possui:

- favoritos e bookmarks do usuario;
- historico de buscas e prompts;
- boletins agendados;
- alertas/notas/notificacoes;
- indicadores derivados de resultados salvos e consultas recentes.

O Inicio deve ser uma composicao de servicos do v1, nao um dominio novo.

### Busca

Busca e a migracao mais direta do v1 para a v2.

Vem principalmente de:

- `gvg_search_core.py`
- `gvg_preprocessing.py`
- `gvg_database.py`
- `gvg_documents.py`
- `gvg_exporters.py`
- regras e fluxo da UI de `GvG_Search_Browser.py`

O modo Busca da v2 deve absorver o nucleo de busca do v1 quase sem mudar a logica de dominio. O que muda e a forma de expor essa logica: sair de callbacks Dash e entrar em endpoints e contratos de API.

### Empresas

Empresas e a evolucao do que hoje esta espalhado entre a experiencia de busca, consultas por CNPJ e o script de analise de empresa.

Vem principalmente de:

- `scripts/cnpj_search/cnpj_search_v1_3.py`
- consultas ja feitas no ecossistema do Search Browser;
- tabelas e wrappers de usuario/resultados/documentos;
- calculos de aderencia e historico competitivo.

Aqui existe reaproveitamento relevante de logica, mas provavelmente sera necessario consolidar queries e servicos que hoje ainda vivem de forma mais experimental ou orientada a script.

### Radar

Radar nao existe como um modulo pronto no v1. Ele nasce da combinacao de dados que o v1 ja possui:

- contratacoes;
- contratos;
- categorias;
- fornecedores;
- historico de compras;
- agregacoes sobre orgaos, players, volume e periodo.

Em outras palavras: Radar nao e um modulo a ser migrado pronto. E um modulo a ser construido em cima da base de dados e dos servicos do v1.

O v1 ja tem os dados e parte da inteligencia. O que falta e transformar isso em um servico de leitura de mercado/concorrencia proprio.

### Relatorios

Relatorios tambem tem migracao bastante direta.

Vem principalmente de:

- `db/reports/GvG_SU_Report_v3.py`
- assistants OpenAI ja usados no ecossistema do v1;
- camada de banco e execucao SQL;
- historico de consultas e resultados.

Assim como em Busca, a regra e reaproveitar o dominio e descartar a UI antiga.

### Camadas transversais

O v1 ja possui uma quantidade importante de servicos transversais que precisam virar plataforma compartilhada da v2:

- autenticacao;
- usuario atual e sessao;
- favoritos e bookmarks;
- historico de consultas;
- boletins e agenda;
- notificacoes;
- billing e limites;
- uso e metrica operacional;
- documentos, resumos e exportacoes.

Esses servicos nao devem ficar presos a um unico modo. Eles devem alimentar Inicio, Busca, Empresas, Radar e Relatorios.

## Estrategia Central de Migracao

### Decisao 1: nao migrar a UI do v1

O Dash do v1 deve ser tratado como referencia funcional e fonte de regra de negocio, nao como interface a ser carregada dentro da v2.

Motivos:

- quebraria a coerencia do shell da v2;
- manteria dois paradigmas de frontend convivendo no mesmo produto;
- dificultaria estado compartilhado entre modos;
- aumentaria custo de manutencao.

### Decisao 2: extrair o v1 para uma arquitetura de backend reutilizavel

O v1 precisa deixar de ser lido como "app Dash" e passar a ser organizado como:

- dominio;
- servicos;
- repositorios/acesso a dados;
- workers de background;
- API.

### Decisao 3: substituir mocks do v2 por API modo a modo

O `design/govgo/data.jsx` e util como fixture, mas ele deve ser removido como fonte principal assim que cada modo ganhar backend real.

Ordem recomendada:

1. Busca
2. Empresas
3. Inicio e camada de usuario
4. Relatorios
5. Radar

### Decisao 4: tratar Radar como produto novo sustentado pelo v1

Radar e o unico modo que nao nasce de um modulo pronto do v1. Ele precisa de um service novo, mas construido em cima dos dados e estruturas ja existentes.

## O que Reaproveitar, o que Encapsular, o que Reescrever

### Reaproveitar quase diretamente

- `gvg_search_core.py`
- `gvg_preprocessing.py`
- `gvg_database.py`
- `gvg_documents.py`
- `gvg_exporters.py`
- `gvg_user.py`
- `gvg_auth.py`
- `gvg_billing.py`
- `gvg_boletim.py`
- `gvg_notifications.py`

### Encapsular com nova interface

- `GvG_Search_Browser.py`
- `GvG_SU_Report_v3.py`
- logicas de CNPJ hoje espalhadas entre script e consultas auxiliares
- assistants OpenAI hoje chamados de forma acoplada a interfaces antigas

### Reescrever

- toda a camada de frontend final;
- contratos de API entre frontend e backend;
- estado compartilhado do produto;
- service especifico de Radar;
- consolidacao da camada de dashboard/Inicio;
- centro de artefatos do usuario para a v2.

## Arquitetura-Alvo Recomendada

## 1. Frontend v2

Responsavel por:

- shell da aplicacao;
- modos Inicio, Busca, Empresas, Radar e Relatorios;
- roteamento e navegacao;
- consumo de API;
- estado local de interacao;
- experiencia visual.

## 2. API Backend

Nova camada a ser criada sobre o v1.

Responsavel por:

- autenticar usuario;
- expor busca, empresas, radar e relatorios como endpoints;
- devolver contratos de resposta estaveis para o frontend;
- aplicar limites, logging, autorizacao e cache.

Sugestao direta: FastAPI.

## 3. Servicos de dominio

Camada que reaproveita o v1 em forma de servicos claros:

- SearchService
- CompanyService
- MarketService
- ReportsService
- UserPlatformService
- DocumentService
- NotificationService

## 4. Repositorios e acesso a dados

Camada responsavel por:

- leitura e escrita no Supabase/PostgreSQL;
- acesso a documentos e storage;
- cache Redis, se adotado;
- consolidacao de queries.

## 5. Workers e jobs

Camada responsavel por:

- pipeline PNCP;
- calculo de agregados de Radar;
- geracao de boletins;
- notificacoes e eventos agendados;
- tarefas pesadas de documentos.

## Entidades Compartilhadas que o v2 Precisa Assumir

Para o produto funcionar como workspace unico, estes objetos precisam ser tratados como comuns a todos os modos:

- `query_session`: consulta atual, filtros, termos expandidos, negativos, metadata;
- `active_entity`: edital, contrato, empresa, orgao ou categoria atualmente em foco;
- `result_sets`: resultados da busca ou da analise ativa;
- `user_artifacts`: favoritos, historico, boletins, alertas, SQL salvas, documentos;
- `market_context`: competidores, compradores, share, tendencias e recortes;
- `report_context`: pergunta, SQL, execucao, export e historico.

## Fases de Implementacao

### Fase 0 - Preparar o v1 para ser backend da v2

Objetivo: parar de depender da interface Dash como forma principal de execucao.

Entregas:

- organizar uma estrutura de API;
- separar servicos de dominio da UI antiga;
- definir schemas de request/response;
- consolidar variaveis de ambiente;
- proteger os modulos centrais com testes.

### Fase 1 - Colocar Busca de pe no v2

Objetivo: fazer a v2 buscar dados reais e abandonar o mock no modo Busca.

Entregas:

- endpoint de busca semantica, keyword e hibrida;
- filtros reais;
- detalhe de edital/documentos;
- exportacao basica;
- integracao do frontend com API.

### Fase 2 - Colocar Empresas de pe no v2

Objetivo: transformar o legado do GvG Select no modo Empresas da v2.

Entregas:

- entrada por CNPJ ou nome;
- desambiguacao;
- perfil consolidado da empresa;
- contratos e historico;
- aderencia a oportunidades.

### Fase 3 - Consolidar plataforma de usuario e Inicio

Objetivo: tirar da condicao de mock tudo o que e pessoal do usuario.

Entregas:

- auth real;
- usuario atual;
- favoritos;
- historico;
- boletins;
- preferencias;
- montagem do Inicio com dados reais.

### Fase 4 - Colocar Relatorios de pe no v2

Objetivo: ligar a experiencia NL -> SQL do v2 ao backend real do v1.

Entregas:

- traducao NL -> SQL;
- validacao de execucao;
- historico de consultas;
- exportacao de resultados;
- salvamento de relatorios.

### Fase 5 - Construir Radar em cima da base do v1

Objetivo: transformar os dados do v1 em um servico novo de inteligencia competitiva.

Entregas:

- KPIs agregados;
- series temporais;
- top compradores;
- top players;
- comparacao e concentracao;
- recortes por estado, categoria e periodo.

### Fase 6 - Operacao, qualidade e deploy

Objetivo: tornar a solucao sustentavel em producao.

Entregas:

- observabilidade;
- cache;
- controle de uso;
- limites;
- testes end-to-end;
- runbooks;
- deploy automatizado.

## Riscos Principais

### Riscos tecnicos

- manter logica demais presa a callbacks Dash;
- falta de contrato claro entre frontend e backend;
- performance de busca e agregacoes sem cache;
- acoplamento excessivo a chamadas OpenAI sem fallback;
- inconsistencias historicas de dados e schemas;
- ausencia de camada unica para documentos/export/storage.

### Riscos de produto

- tentar entregar Radar cedo demais sem base consolidada;
- misturar nome de modo com nome de tecnologia legada;
- levar UI antiga demais para dentro do novo produto;
- subestimar o peso da camada transversal de usuario;
- atrasar a definicao de auth, billing e limites.

## Recomendacao Final

Para fazer o v1 funcionar dentro do v2, a linha correta nao e "migrar telas". A linha correta e:

1. transformar o v1 em backend modular da v2;
2. migrar primeiro Busca e Empresas, porque sao os dominios mais maduros;
3. consolidar a plataforma de usuario em seguida;
4. plugar Relatorios reaproveitando os assistants e a logica SQL ja existentes;
5. construir Radar como produto novo, sustentado pela base de dados, pipeline e inteligencia do v1.

Se essa ordem for respeitada, a v2 consegue ganhar vida com baixo retrabalho e com alta reutilizacao do que o v1 ja tem de valor.