# Diario de Bordo do GovGo v2

## Finalidade

Este e o documento de continuidade do projeto.

Quando uma nova conversa for iniciada e a IA precisar retomar o trabalho de onde parou, este deve ser o primeiro documento lido.

## Regra de retomada

Em qualquer novo prompt, a ordem de leitura deve ser esta:

1. `docs/DIARIO_DE_BORDO.md`
2. `docs/PLANO_MESTRE_V1_V2.md`
3. documentos especificos da etapa atual

Se houver conflito entre documentos, vale esta ordem:

1. diario de bordo para estado atual e proximo passo;
2. plano-mestre para direcao e fases;
3. documentos especificos para execucao da etapa.

## Como este diario deve ser usado

Este documento deve ser atualizado sempre que houver novidade relevante, especialmente quando ocorrer qualquer uma destas situacoes:

- nova decisao de produto;
- nova regra de arquitetura;
- nova regra de implementacao;
- mudanca de prioridade;
- inicio ou fim de fase;
- criacao de documento importante;
- descoberta tecnica que mude o plano;
- definicao do proximo passo operacional.

## Estado atual oficial

### Data da ultima consolidacao

2026-04-23

### Documento principal do projeto

- `docs/PLANO_MESTRE_V1_V2.md`

### Regra principal de continuidade

- em novo prompt, a IA deve ler primeiro este diario;
- depois deve ler o plano-mestre;
- so depois deve abrir os documentos da etapa corrente.

## Regras ja fechadas

### 1. Regra de produto

- o v2 sera a aplicacao;
- o v1 nao sera migrado como UI antiga;
- tudo no v1 que ainda for util para o funcionamento do produto deve acabar funcionando no v2.

### 2. Regra de arquitetura

- o v1 vira backend, servicos, jobs e base operacional do v2;
- nenhum modulo legado entra na UI antes de homologacao backend-first;
- modulos lentos, quebrados ou desatualizados passam por triagem antes da integracao.

### 3. Regra visual

- `design/` nao e a UI real em producao;
- `design/` e a base canonica que define a UI real;
- a implementacao final pode ter outra estrutura tecnica, mas deve ser derivada dessa base;
- nao pode haver redesenho visual paralelo fora do que `design/` determina.

### 4. Regra de cobertura funcional

- toda funcionalidade util do v1 precisa ter destino no v2;
- esse destino pode ser reaproveitamento, encapsulamento, reprojeto ou substituicao equivalente;
- uma funcionalidade so pode ficar de fora se estiver obsoleta ou substituida explicitamente.

### 5. Regra de handoff para o usuario

- ao fechar uma rodada de trabalho, a IA deve sempre entregar um prompt de continuidade pronto para colar;
- ao fechar uma rodada de trabalho, a IA deve sempre entregar pelo menos um link clicavel do arquivo principal que deve ser aberto na retomada.
- quando existir um runner ou teste principal em CMD para a rodada, a IA deve tambem entregar o link clicavel desse arquivo CMD/Python de execucao.

## Fase atual do projeto

### Fase macro

Fase 0 de preparacao da migracao.

### Estado real atual

Ainda estamos em documentacao, consolidacao de regras e definicao de como executar.

A implementacao real do frontend foi iniciada de forma minima em `src/`, ainda derivada diretamente dos modos e componentes de `design/govgo` e dos estilos em `design/css`.

Foi criada a estrutura inicial do frontend real em `src/`, com separacao entre `app/`, `design-system/`, `pages/`, `features/`, `services/`, `assets/`, `shared/` e `mocks/`.

Tambem foram criados os documentos `docs/ESTRUTURA_FRONTEND_V2.md` e `docs/MAPA_TOKENS_RECIPES_V2.md` para fixar a traducao de `design/` para a arquitetura real da v2 e a separacao entre tokens, recipes, estilos globais e helpers de pagina.

Foi criada uma entrada minima da app real em `src/app/boot/index.html`, com roteamento simples em `src/app/router/routes.jsx`, shell em `src/app/shell/AppShell.jsx` e wrappers de paginas em `src/pages/` para Inicio, Busca, Busca Detalhe, Empresas, Radar, Relatorios e Design System.

Para operacao local da UI no browser externo, foi criado o launcher raiz `run.py`, que serve o repositorio em `http://127.0.0.1:8765` e abre a pagina inicial em `http://127.0.0.1:8765/src/app/boot/index.html#/inicio`.

A homologacao tecnica operacional do Search do v1 foi validada no laboratorio `homologation/search/` do v2, com adapter, runner CMD, smoke runner e tester em browser.

O smoke da Busca fechou com 5 de 5 casos aprovados usando o `python` ja existente na maquina, sem criar novo ambiente.

O bootstrap da Busca no v2 foi ajustado para carregar `v2/.env` e manter a prioridade correta entre os `site-packages` do Anaconda e do usuario.

O core usado pela Busca no laboratorio passou a existir em copia local dentro de `homologation/search/v1_copy/gvg_browser`, e o bootstrap do v2 agora aponta primeiro para essa copia local.

Foi feita uma rodada de otimizacao na copia local da Busca: bypass de pre-processamento simples no adapter, reducao do universo vetorial padrao da busca semantica e troca da busca hibrida para estrategia de fusao rapida por padrao.

Com isso, o smoke da Busca continuou em 5 de 5 e os tempos cairam para aproximadamente: semantic 14,7s, keyword 1,5s, hybrid 7,6s, correspondence 3,5s e category-filtered 8,5s.

O tester em browser da Busca foi reestruturado como bancada de comparacao, com coluna de configuracao, coluna de resultados, comparacao do mesmo input entre modelos diferentes e persistencia automatica dos testes em `homologation/search/tests/`.

Foi iniciado o laboratorio de homologacao de Documentos em `homologation/documents/`, com copia local do core `gvg_documents.py` e dependencias diretas dentro de `homologation/documents/v1_copy/core/`.

O bootstrap de Documentos foi configurado para apontar primeiro para a copia local do v2 e gravar artefatos em `homologation/documents/artifacts/`.

Tambem foram criados o adapter, o runner CMD, o smoke inicial e os fixtures basicos do laboratorio de Documentos.

Na validacao do laboratorio de Documentos, o `spacy_env` configurado no workspace nao tinha dependencias basicas; a execucao homologada passou a usar o `python` do Anaconda base em `C:\ProgramData\anaconda3\python.exe`, que e o mesmo caminho pratico que sustentou a homologacao da Busca.

O healthcheck de Documentos foi validado com sucesso, a listagem de documentos foi validada em PNCPs reais via API e o primeiro `process_url` com documento real do PNCP tambem foi executado com sucesso no fluxo de resumo a partir do arquivo original.

Foi criada tambem a versao browser do laboratorio de Documentos em `homologation/documents/browser/app.py`, com formularios para healthcheck, execucao de fixtures, listagem por PNCP, processamento por URL e persistencia das execucoes em `homologation/documents/tests/runs/`.

Depois disso, o laboratorio de Documentos foi travado em pipeline MarkItDown-only: o core local em `homologation/documents/v1_copy/core/gvg_documents.py` deixou de usar Docling e de expor o fluxo de arquivo original, passando a aceitar URL, `file://` e caminho local existente.

Tambem foi criada uma matriz local de conversao em `homologation/documents/cmd/markitdown_matrix.py`, com geracao reprodutivel de amostras em `homologation/documents/tests/samples/` e validacao aprovada em 11 formatos: `txt`, `md`, `html`, `xml`, `json`, `csv`, `tsv`, `yaml`, `pdf`, `docx` e `pptx`.

O smoke do laboratorio de Documentos continuou aprovado apos a troca para MarkItDown-only, e o browser tester foi ajustado para deixar explicito que o fluxo agora e sempre MarkItDown.

Na etapa final desta rodada, um `process_url` real do PNCP foi revalidado ja no pipeline MarkItDown-only, apos um ajuste de UTF-8 no subprocesso de conversao para evitar falha de codificacao com caracteres Unicode presentes no PDF real.

O browser tester de Documentos agora permite escolha explicita da fonte do arquivo em tres caminhos: URL ou caminho digitado, upload de arquivo local real pelo browser e processamento direto de um documento escolhido da listagem do PNCP.

Tambem foi criado um teste dedicado em `homologation/documents/cmd/test_source_selection.py` para validar ponta a ponta os fluxos `/list-documents`, `/process-upload` e `/process-pncp-document`, com relatorio salvo em `homologation/documents/artifacts/source_selection_test_latest.json`.

Depois da correcao de UX desta rodada, os fluxos de arquivo local real e de documento escolhido do PNCP deixaram de aparecer apenas como subfluxos de processamento e passaram a existir como testes explicitos do browser, com cards proprios no mesmo padrao dos demais testes do laboratorio.

Na rodada seguinte, o browser tester de Documentos foi simplificado para um layout de duas areas bem separadas: testes/fontes na esquerda e resultado na direita, com drastica reducao do texto explicativo e foco no uso real.

Tambem nessa rodada o adapter e o core local passaram a devolver o texto extraido pelo MarkItDown como campo explicito da resposta, de forma que o browser agora mostra primeiro a extracao bruta do documento e deixa o resumo do assistant como bloco secundario.

O teste dedicado `homologation/documents/cmd/test_source_selection.py` passou a validar tambem a presenca de `extracted_text` nos processamentos de arquivo local e de documento escolhido do PNCP.

Em nova investigacao sobre DOCX, PPTX e PDF, ficou comprovado que o vazamento de XML interno em `.docx` e `.pptx` nao vinha do conversor normal do MarkItDown, mas sim do pipeline local, que estava tratando pacotes OOXML como ZIP generico e extraindo os arquivos internos antes da conversao.

Esse ponto foi corrigido no core local de Documentos: o laboratorio agora reconhece `.docx`, `.pptx` e `.xlsx` como formatos a serem enviados diretamente ao MarkItDown, inclusive quando o arquivo chega sem extensao e precisa ser identificado pelo conteudo do pacote.

Na mesma rodada foi confirmado que o `markitdown` instalado no ambiente atual e a versao `0.1.2`, cuja implementacao local de PDF usa apenas `pdfminer` e nao possui extracao estruturada de tabelas em Markdown. Para resolver isso no laboratorio atual, foi adicionada uma etapa complementar com `pdfplumber`, que anexa ao Markdown as tabelas detectadas em PDFs quando o proprio retorno do MarkItDown nao traz nenhuma tabela.

Tambem foi ampliada a matriz local `homologation/documents/cmd/markitdown_matrix.py` com regressao especifica para garantir que DOCX e PPTX nao vazem mais XML interno e que um PDF com tabela passe a gerar tabela Markdown no laboratorio.

Na consolidacao seguinte, a verificacao foi refeita com execucao atual no proprio v2 e com leitura do repositorio do MarkItDown. Ficou confirmado que o laboratorio local hoje converte `pdf` para Markdown com tabelas no caso real do PNCP e nas amostras locais, enquanto `docx` e `pptx` atuais saem sem lixo OOXML. Tambem ficou confirmado que o JSON antigo aberto em `homologation/documents/tests/runs/20260421_175309__process-pncp-document-edital-9-2026-008-alim-hospit-ass-pdf.json` e artefato stale de uma rodada anterior, porque ainda aponta `markdown_path` e `summary_path` para o `v1` fora do workspace, enquanto o bootstrap vigente do v2 ja fixa esses caminhos em `homologation/documents/artifacts/`.

Para deixar essa validacao repetivel dentro do repositorio, foi criado o runner `homologation/documents/cmd/validate_markitdown_requirements.py`, que checa no v2 os requisitos centrais desta fase: PDF com tabela Markdown, DOCX sem XML interno e PPTX sem XML interno, incluindo opcionalmente o PDF real do PNCP e arquivos reais locais quando estiverem presentes.

Na mesma rodada, tambem ficou registrado que o ambiente ainda usa `markitdown 0.1.2`, enquanto o upstream do repositorio ja tem testes e mudancas mais recentes para tabelas em PDF. Portanto, o estado oficial do laboratorio permanece este: no v2 atual, a exigencia do usuario ja esta atendida pelo pipeline local, mas a comparacao com artefatos antigos ou execucoes feitas antes do bootstrap corrigido pode induzir diagnostico errado.

Na rodada de 2026-04-22, a camada visual dos browsers de homologacao foi consolidada no v2 com a mesma base canonica de `design/css`: `homologation/browser_design.py` passou a carregar `design/css/tokens.css` e `design/css/govgo.css`, a tela de Busca v1 em `homologation/search/browser/app_v1.py` foi refinada como bancada multi-coluna com carregamento de JSON salvo, e a tela de Documentos em `homologation/documents/browser/app.py` foi reescrita para seguir a mesma linguagem visual da Busca.

Na mesma rodada, tambem foi corrigido um problema operacional no Windows: os browsers de Busca em `homologation/search/browser/app.py` e `homologation/search/browser/app_v1.py` passaram a desabilitar o Flask reloader por padrao no Windows, mantendo `debug` ativo, para permitir rodar Busca e Documentos lado a lado sem o `WinError 10038`.

Depois disso, foi feita uma investigacao especifica do travamento do Search, porque o sintoma aparecia ao mesmo tempo na homologacao do v2 e no `govgo.com.br` (backend v1 compartilhado). O resultado da analise foi este: nao ha evidencia de indisponibilidade geral de IA nem de indisponibilidade geral do banco. A IA de embeddings respondeu em aproximadamente `0,69s` a `1,43s`; a conexao basica ao banco respondeu em aproximadamente `0,30s`; e `SELECT 1` respondeu em aproximadamente `0,08s`. O gargalo apareceu nas queries reais do modulo de Busca.

Na busca por palavras-chave com a consulta `alimentacao escolar`, o preprocessamento inteligente foi bypassado e ainda assim o `db_fetch_all` da query principal consumiu cerca de `18,5s`, com tempo total da busca em cerca de `20,9s`. O `EXPLAIN ANALYZE` mostrou que a lentidao esta concentrada na query FTS da tabela `contratacao`, especialmente no caminho com `BitmapOr` + `Bitmap Heap Scan` + filtro por data de encerramento.

No caminho que no produto aparece como progresso `20% - Buscando categorias`, o embedding da IA consumiu menos de `1s`, mas `get_top_categories_for_query` consumiu cerca de `158s` a `211s` no `db_read_df`. O plano observado para a query de categorias mostrou `Seq Scan on categoria`, apesar de existir indice vetorial `idx_categoria_cat_embeddings_h_hnsw`, o que indica que a forma atual da query de similaridade de categorias nao esta aproveitando o indice HNSW.

Na verificacao seguinte, foi confirmado no proprio laboratorio que o v2 local continua delegando a Busca para `v1.gvg_search_core`, carregado a partir de `homologation/search/v1_copy/gvg_browser` via `homologation/search/core/adapter.py` e `homologation/search/core/bootstrap.py`. Ou seja: o sintoma observado no v2 local nao aponta para um backend novo isolado, mas para o mesmo caminho logico compartilhado da Busca.

Tambem foi validado por execucao comparativa com a mesma consulta `alimentação hospitalar` que a busca `keyword` direta respondeu em cerca de `4,23s`, enquanto `category_filtered` com base `keyword` respondeu em cerca de `20,75s`. Isso reforca que o custo extra relevante entra no passo de categorias, antes da busca principal.

Ao inspecionar o core, ficou claro que `get_top_categories_for_query` sempre executa a etapa vetorial de categorias por embedding e hoje ordena por `similarity DESC` sobre a expressao `1 - (cat_embeddings_hv <=> embedding)`. Essa forma de `ORDER BY` nao favorece o uso do indice HNSW do `pgvector`, o que fecha o diagnostico principal desta frente: o gargalo compartilhado entre homologacao v2 e `govgo.com.br` e estrutural no caminho de categorias e pode aparecer mesmo sem deploy recente, porque depende do estado atual do banco, do volume de dados e do plano escolhido pelo otimizador.

Na verificacao seguinte, o diagnostico foi refinado para incluir tambem pressao operacional local sobre o banco na homologacao. Em `homologation/search/v1_copy/gvg_browser/gvg_database.py`, o caminho `db_read_df` estava criando um novo engine SQLAlchemy por chamada sem `dispose()` explicito, o que podia reter conexoes idle no pool entre execucoes repetidas do browser e agravar sintomas de saturacao no Supabase.

Como mitigacao imediata no laboratorio local, o wrapper de banco passou a usar `NullPool`, `engine.dispose()` ao fim de `db_read_df`, `application_name` explicito e timeouts de sessao (`statement_timeout`, `lock_timeout` e `idle_in_transaction_session_timeout`) configuraveis por ambiente. Isso nao substitui a correcao estrutural da query de categorias, mas reduz o risco de degradacao acumulada por repeticao de testes na homologacao.

Tambem foi identificado que o browser `homologation/search/browser/app_v1.py` adicionava sobrecarga local desnecessaria: fazia prewarm sincrono no startup, abria `ThreadPoolExecutor` mesmo quando havia apenas uma coluna ativa e rodava o servidor Flask com threading padrao. Esse conjunto piorava o startup, dificultava `Ctrl+C` e aumentava concorrencia desnecessaria contra o banco.

Como correcao local do browser v1, o prewarm passou a ser opcional e nao bloqueante, a execucao de uma unica coluna passou a rodar inline sem `ThreadPoolExecutor`, o query default foi alinhado ao fluxo real com acento e o servidor ficou single-thread por padrao no laboratorio. Na validacao imediata apos essas mudancas, o caminho padrao de uma coluna no `app_v1.py` respondeu em aproximadamente `5,6s` a `7,3s`, abaixo da medicao local anterior de aproximadamente `16s` para o mesmo fluxo do browser.

Na rodada seguinte, foi corrigido tambem o problema operacional de encerramento no Windows: `homologation/search/browser/app_v1.py` deixou de usar `APP.run()` no caminho principal do laboratorio local e passou a subir, no Windows, um servidor WSGI simples com encerramento explicito por `KeyboardInterrupt`. A validacao foi feita com interrupcao programatica equivalente a `Ctrl+C`, e o processo passou a sair limpo, imprimindo o encerramento e devolvendo o shell sem precisar fechar o terminal inteiro.

Como mitigacao local na homologacao de Busca v1, o `app_v1.py` recebeu defaults mais leves, deixou de inicializar o filtro de relevancia quando nenhuma coluna ativa usa relevancia e ganhou prewarm opcional do caminho default. Isso melhora a experiencia do browser de homologacao, mas nao resolve a causa raiz compartilhada entre v2 e `govgo.com.br`.

Na retomada seguinte, o usuario confirmou que o problema compartilhado de Search foi resolvido no banco e recolocou a prioridade oficial do projeto no frontend do v2. A diretriz arquitetural fechada passou a ser esta: o codigo homologado que vai sustentar a Busca real nao deve ficar dependente de `homologation/`; ele deve existir dentro de `src/`.

Com isso, foi criada a arvore real inicial da Busca em `src/backend/search/` e `src/devtools/search/`. O core homologado foi copiado para `src/backend/search/core/` e `src/backend/search/v1_copy/gvg_browser/`; os runners e browsers de apoio foram copiados para `src/devtools/search/`; e o helper visual compartilhado foi copiado para `src/devtools/browser_design.py`.

Na mesma rodada, os imports e bootstraps do Search copiado foram ajustados para apontar para `src.backend...` e `src.devtools...`, sem dependencia runtime de `homologation`. A validacao minima ja foi feita no caminho novo: `src/devtools/search/cmd/run_search.py` executou a consulta `alimentação hospitalar` com `search_type=keyword`, gravou artefato em `src/devtools/search/artifacts/` e respondeu com 10 resultados em cerca de `4,1s`; alem disso, `src/devtools/search/browser/app_v1.py` tambem subiu corretamente no caminho novo e encerrou limpo no Windows sob interrupcao programatica equivalente a `Ctrl+C`.

Depois disso, a tela real de Busca do frontend foi ligada pela primeira vez ao Search migrado para `src/`. O launcher raiz `run.py` deixou de ser apenas servidor estatico e passou a expor tambem o endpoint `POST /api/search`, que delega para `src/backend/search/api/service.py` e para o adapter homologado em `src/backend/search/core/`.

Tambem foi criada a ponte minima do frontend em `src/services/contracts/searchContracts.jsx`, `src/services/api/searchApi.jsx`, `src/services/adapters/searchAdapter.jsx` e `src/features/busca/BuscaWorkspace.jsx`. Com isso, `src/pages/busca/BuscaPage.jsx` deixou de ser apenas um wrapper visual e passou a consultar resultados reais do Search no browser externo pelo caminho `http://127.0.0.1:8765/src/app/boot/index.html#/busca`.

Essa integracao ja foi validada ponta a ponta no caminho real do v2: o `run.py` subiu o frontend, o `POST /api/search` respondeu com `source = v1.gvg_search_core`, `result_count = 10`, `elapsed_ms = 506` e `search_root` apontando para `src/backend/search/v1_copy/gvg_browser`.

## Prioridades imediatas

As proximas prioridades concretas sao estas:

1. refinar a UX da tela real de Busca agora que ela ja consulta o backend em tempo real;
2. decidir como a tela de detalhe da Busca vai consumir os resultados reais em vez do mock visual atual;
3. manter `homologation/` apenas como laboratorio legado e referencia historica, sem dependencia runtime do fluxo real do v2;
4. estabilizar logs, tratamento de erro e estados vazios da integracao frontend-backend da Busca;
5. so depois expandir o mesmo padrao para os demais modulos homologados.

## Ordem pratica que deve ser seguida agora

Se a retomada acontecer em um novo prompt, a IA deve continuar nesta ordem:

1. continuar evoluindo a Busca a partir da pagina real `#/busca`, ja conectada ao Search em `src/`;
2. definir o fluxo da tela `#/busca/detalhe` com dados reais ou estado compartilhado entre pagina de lista e detalhe;
3. reforcar estados de erro, carregamento e vazios da UX da Busca no frontend real;
4. manter a validacao sempre pelo browser externo no launcher raiz `run.py` e pelo endpoint `POST /api/search`;
5. so depois seguir para refinamentos adicionais ou para o proximo modulo homologado.

## Documentos que mandam em cada assunto

### Continuidade e estado atual

- `docs/DIARIO_DE_BORDO.md`

### Direcao geral, fases e ordem do projeto

- `docs/PLANO_MESTRE_V1_V2.md`

### Como traduzir `design/` para frontend real

- `docs/CONVENCAO_ARQUITETURA_FRONTEND.md`
- `docs/ESTRUTURA_FRONTEND_V2.md`
- `docs/MAPA_TOKENS_RECIPES_V2.md`

### Como implementar uma tela do frontend

- `docs/CHECKLIST_IMPLEMENTACAO_FRONTEND.md`

### Como saber se uma tela esta pronta

- `docs/DEFINICAO_DE_PRONTO_POR_TELA.md`

### Como revisar aderencia visual

- `docs/CRITERIOS_REVISAO_VISUAL.md`

### Primeira tela real especificada

- `docs/ESPECIFICACAO_TELA_INICIO.md`

### Como testar modulos do v1 antes da UI

- `docs/ESTRATEGIA_TESTES_ANTES_UI.md`

### Como classificar legado problemático

- `docs/TRIAGEM_MODULOS_LEGADOS.md`

### Como garantir cobertura funcional do v1 no v2

- `docs/MATRIZ_V1_V2.md`
- `docs/ESTRATEGIA_V1_NO_V2.md`

## Resumo do que ja foi produzido

- plano-mestre da migracao;
- estrategia de migracao v1 -> v2;
- matriz funcional v1 -> v2;
- estrategia de testes antes da UI;
- triagem dos modulos legados;
- checklist de implementacao frontend;
- criterios de revisao visual;
- definicao de pronto por tela;
- template de PR;
- convencao de arquitetura frontend derivada de `design/`;
- estrutura inicial do frontend real em `src/`;
- mapa de tokens e recipes para a migracao de `design/css`;
- especificacao da tela Inicio.
- laboratorio inicial de homologacao da Busca em `homologation/search/`.
- entrada minima da app real em `src/app/boot/index.html`, com roteamento simples e wrappers de paginas em `src/pages/`.
- launcher local `run.py` para subir e abrir a UI da v2 no browser externo.

## O que ainda falta iniciar de verdade

- correcao estrutural do gargalo compartilhado do Search;
- logs permanentes de performance no core da Busca;
- definicao da stack final do frontend;
- internalizacao do shell real em `src/`, sem depender diretamente de `design/govgo/shell.jsx`;
- internalizacao real da tela Inicio em `src/pages/inicio` e `src/features/inicio`;
- substituicao gradual dos wrappers que ainda reutilizam diretamente `design/govgo`;
- integracao real do primeiro modulo do v1.
- estabilizacao do comportamento do assistant de resumo quando recebe Markdown local curto.
- ampliacao dos testes end-to-end do laboratorio de Documentos sobre as amostras locais ja geradas.

## Proximo passo oficial

O proximo passo oficial do projeto e:

fechar o diagnostico tecnico do gargalo compartilhado do Search, com foco nas queries da tabela `contratacao` e da tabela `categoria`, consolidando logs por etapa e correcoes para uso correto dos indices no banco.

Logo em seguida:

revalidar a Busca no browser de homologacao e no fluxo do produto; depois disso, retomar a definicao da stack e da estrutura real do frontend do v2.

## Regra de atualizacao deste diario

Sempre que houver novidade relevante, atualizar pelo menos estes blocos:

1. data da ultima consolidacao;
2. fase atual;
3. prioridades imediatas;
4. proximo passo oficial;
5. resumo do que mudou.

## Resumo do que mudou nesta consolidacao

- foi iniciada a estrutura real do frontend em `src/`, com arvore base para `app`, `design-system`, `pages`, `features`, `services`, `assets`, `shared` e `mocks`.
- foram criados os documentos `docs/ESTRUTURA_FRONTEND_V2.md` e `docs/MAPA_TOKENS_RECIPES_V2.md` para orientar a migracao do design para a app real.
- foi criada uma entrada minima da UI em `src/app/boot/index.html`, apoiada por `src/app/router/routes.jsx` e `src/app/shell/AppShell.jsx`.
- foram criados wrappers de paginas em `src/pages/` para Inicio, Busca, Busca Detalhe, Empresas, Radar, Relatorios e Design System, mantendo a linguagem visual original de `design/`.
- foi criado o launcher raiz `run.py`, que sobe a pagina inicial da v2 em `http://127.0.0.1:8765/src/app/boot/index.html#/inicio`.

- o comportamento atual de `pdf`, `docx` e `pptx` foi revalidado por execucao real no v2;
- foi confirmado que o PDF real do PNCP atual gera tabelas Markdown no pipeline do laboratorio;
- foi confirmado que DOCX e PPTX atuais nao estao vazando XML interno;
- foi isolado que parte da contradicao vinha de artefatos antigos ainda apontando para caminhos do `v1`;
- foi criado o runner `homologation/documents/cmd/validate_markitdown_requirements.py` para repetir essa verificacao.

- foi definido que este diario e o ponto oficial de retomada em novos prompts;
- foi consolidado que tudo no v1 que ainda for util deve acabar funcionando no v2;
- foi consolidado que `design/` define a UI real, mas nao e a UI de producao em si;
- foi fixada a prioridade imediata de homologar Busca e Documentos antes da integracao com frontend.
- foi criado o laboratorio inicial de homologacao da Busca em `homologation/search/`, com versoes em CMD e browser dentro do v2.
- a homologacao da Busca foi validada com smoke 5 de 5 no laboratorio `homologation/search/`.
- o laboratorio da Busca ficou operacional com o `python` atual da maquina, carregando `v2/.env` e reordenando `site-packages` para evitar conflito entre `numpy/pandas` e `openai`.
- a Busca do laboratorio passou a usar primeiro a copia local em `homologation/search/v1_copy/gvg_browser`, em vez de depender do repositorio externo do v1.
- foi adicionada saida direta UTF-8 no runner da Busca para gerar JSON sem depender do redirecionamento do PowerShell.
- foi feita uma rodada de otimizacao no core local da Busca, reduzindo fortemente os tempos do smoke sem perder aprovacao funcional.
- o browser tester da Busca foi transformado em bancada de comparacao entre modelos, com salvamento automatico das execucoes em `homologation/search/tests/runs/` e catalogo de modelos em `homologation/search/tests/models/search_models.json`.
- o proximo passo oficial passou a ser a homologacao de Documentos do v1.
- a homologacao de Documentos foi iniciada com copia local do core e dependencia direta dentro de `homologation/documents/v1_copy/core/`.
- o browser tester de Documentos foi refeito em duas areas claras de teste e resultado, com forte reducao do texto explicativo e foco explicito nos testes de arquivo local e arquivo do PNCP.
- o retorno do laboratorio de Documentos passou a carregar `extracted_text` alem do resumo, e o browser agora exibe primeiro o texto extraido pelo MarkItDown.
- foi comprovado que o vazamento de XML em DOCX/PPTX vinha do pipeline local tratando OOXML como ZIP generico, e isso foi corrigido no core local de Documentos.
- como o `markitdown` instalado no ambiente atual ainda nao extrai tabelas de PDF em Markdown, o laboratorio passou a complementar PDFs com tabelas detectadas via `pdfplumber`.
- a matriz local de MarkItDown foi ampliada com regressao para DOCX, PPTX e PDF com tabela, e voltou a fechar sem falhas.
- foi criado o laboratorio minimo de Documentos no v2, com bootstrap, adapter, runner CMD, smoke inicial e artefatos locais em `homologation/documents/artifacts/`.
- o laboratorio de Documentos foi validado com healthcheck, com listagem real de documentos via API PNCP e com um primeiro resumo real em `process_url` usando o fluxo de arquivo original.
- o browser tester do modulo de Documentos foi criado e passa a oferecer uma bancada local para healthcheck, fixtures, listagem por PNCP e processamento por URL, com salvamento de runs em `homologation/documents/tests/runs/`.
- o laboratorio de Documentos foi convertido para pipeline MarkItDown-only, eliminando Docling e a alternancia com fluxo de arquivo original.
- foi adicionada uma matriz local de conversao aprovada em 11 formatos, com amostras reprodutiveis dentro do proprio v2.
- o smoke de Documentos permaneceu aprovado apos a troca para MarkItDown-only e o browser tester foi reescrito para refletir esse comportamento.
- o `process_url` real do PNCP voltou a fechar com sucesso no pipeline MarkItDown-only depois do ajuste de UTF-8 no subprocesso do MarkItDown.
- foi consolidada no diario a regra de handoff com o usuario: sempre entregar prompt de continuidade e link clicavel do arquivo principal a abrir.
- o browser tester de Documentos passou a oferecer escolha explicita entre URL/caminho, upload local real e documento escolhido da listagem do PNCP.
- foi criado e validado um teste dedicado de selecao de fonte em `homologation/documents/cmd/test_source_selection.py`, com relatorio em `homologation/documents/artifacts/source_selection_test_latest.json`.
- os fluxos de arquivo local real e de documento PNCP escolhido foram promovidos a testes explicitos do browser, com cards proprios no padrao visual dos outros testes do laboratorio.
- o teste automatizado de selecao de fonte passou a validar tambem a existencia desses cards explicitos na pagina inicial do browser tester.
