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

2026-04-21

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

A implementacao real do frontend ainda nao foi iniciada.

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

## Prioridades imediatas

As proximas prioridades concretas sao estas:

1. iniciar a homologacao do v1 pelo modulo de Documentos;
2. definir a stack real do frontend do v2;
3. montar a estrutura real do frontend;
4. implementar o shell real da aplicacao;
5. implementar a tela Inicio real a partir da especificacao ja criada.

## Ordem pratica que deve ser seguida agora

Se a retomada acontecer em um novo prompt, a IA deve continuar nesta ordem:

1. homologacao de Documentos do v1;
2. definicao da stack e estrutura do frontend real;
3. implementacao do shell real;
4. implementacao da tela Inicio;
5. depois avancar para Busca real com backend.

## Documentos que mandam em cada assunto

### Continuidade e estado atual

- `docs/DIARIO_DE_BORDO.md`

### Direcao geral, fases e ordem do projeto

- `docs/PLANO_MESTRE_V1_V2.md`

### Como traduzir `design/` para frontend real

- `docs/CONVENCAO_ARQUITETURA_FRONTEND.md`

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
- especificacao da tela Inicio.
- laboratorio inicial de homologacao da Busca em `homologation/search/`.

## O que ainda falta iniciar de verdade

- homologacao operacional de Documentos do v1;
- definicao da stack final do frontend;
- estrutura real do frontend no repositorio;
- implementacao real do shell;
- implementacao real da tela Inicio;
- integracao real do primeiro modulo do v1.
- estabilizacao do comportamento do assistant de resumo quando recebe Markdown local curto.
- ampliacao dos testes end-to-end do laboratorio de Documentos sobre as amostras locais ja geradas.

## Proximo passo oficial

O proximo passo oficial do projeto e:

fechar a homologacao operacional do modulo de Documentos no v2, agora em pipeline MarkItDown-only, com foco em validacao reprodutivel do comportamento atual, limpeza de artefatos stale e consolidacao do runner de verificacao real.

Logo em seguida:

definir a stack e a estrutura real do frontend do v2.

## Regra de atualizacao deste diario

Sempre que houver novidade relevante, atualizar pelo menos estes blocos:

1. data da ultima consolidacao;
2. fase atual;
3. prioridades imediatas;
4. proximo passo oficial;
5. resumo do que mudou.

## Resumo do que mudou nesta consolidacao

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