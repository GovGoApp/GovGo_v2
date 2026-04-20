# Plano-Mestre de Transicao do GovGo v1 para o v2

## Finalidade deste documento

Este documento consolida o plano completo para levar o GovGo do estado atual do v1 para a aplicacao-alvo do v2.

Para retomar o contexto mais recente em uma nova conversa, ler antes `docs/DIARIO_DE_BORDO.md`.

Ele unifica quatro linhas que ja estavam definidas em documentos separados:

- estrategia de migracao do v1 para o v2;
- matriz funcional v1 -> v2;
- estrategia de teste antes da UI;
- triagem de modulos lentos, quebrados ou desatualizados.

Este passa a ser o documento central de execucao.

## Decisao central

O v2 sera a aplicacao.

O v1 nao sera levado para dentro do v2 como UI antiga. O v1 sera transformado em base de dominio, servicos, dados, jobs e API do v2.

Em resumo:

- v2 = shell, experiencia, navegacao, fluxos e interface do produto;
- v1 = backend legado reaproveitado, estabilizado, encapsulado e progressivamente reestruturado.

## Regra de cobertura funcional do v1

Tudo no v1 que ainda for util para o funcionamento do produto deve acabar funcionando no v2.

Isso nao significa copiar literalmente a UI antiga ou manter toda implementacao legada intacta.

Significa o seguinte:

- toda capacidade util do v1 precisa ter destino explicito no v2;
- esse destino pode ser reaproveitamento direto, encapsulamento, reprojeto ou substituicao equivalente;
- uma capacidade so pode ficar de fora se estiver obsoleta, quebrada sem valor de recuperacao ou substituida por solucao melhor que preserve sua funcao de negocio.

O criterio de sucesso da migracao nao e "integrar parte do v1". O criterio de sucesso e absorver no v2 tudo o que no v1 ainda gera valor real de produto e operacao.

## Estado atual resumido

### O que ja esta decidido

- navegacao principal da v2: Inicio, Busca, Empresas, Radar, Relatorios;
- o design atual da v2 continua como referencia visual e funcional;
- `design/` e a base canonica que define a camada visual da v2; a UI real nao e o codigo dessa pasta, mas deve ser implementada integralmente a partir dela;
- a interface Dash do v1 nao entra como parte da experiencia final;
- nenhum modulo legado deve entrar na UI da v2 sem passar por homologacao backend-first;
- modulos problematicos devem ser triados antes da integracao.

### O que o v1 ja oferece

O v1 ja possui base forte para:

- busca semantica, keyword e hibrida;
- pre-processamento de consulta;
- banco Supabase/PostgreSQL;
- documentos e resumos;
- exportacoes;
- autenticacao;
- favoritos, historico e artefatos do usuario;
- billing e limites;
- boletins e notificacoes;
- relatorios NL -> SQL;
- analise por CNPJ/empresa;
- pipeline de ingestao PNCP.

Essa base nao deve ser lida como lista opcional. Ela representa a cobertura funcional que o v2 precisa absorver ao longo da transicao.

### O que ainda nao esta pronto para a v2

- API estruturada e estavel para o frontend;
- camada clara de adapters e contratos de saida;
- sandbox de homologacao dos modulos legados;
- benchmarks e testes de regressao dos modulos centrais;
- service real de Radar;
- consolidacao do Inicio como composicao de servicos;
- limpeza de lentidao e falhas em Busca e Documentos.

## Objetivo de produto

Entregar uma unica aplicacao, coerente e moderna, em que o usuario trabalha dentro de um workspace comum e pode:

1. descobrir oportunidades em Busca;
2. analisar empresas em Empresas;
3. acompanhar contexto e artefatos em Inicio;
4. explorar concorrencia e mercado em Radar;
5. fazer analise assistida em Relatorios.

## Objetivo tecnico

Entregar uma arquitetura em que:

1. modulos legados do v1 sejam testaveis sem UI;
2. cada capacidade seja exposta por contratos de API claros;
3. a UI do v2 consuma apenas contratos estaveis;
4. jobs pesados rodem fora do caminho sincrono do frontend;
5. performance, observabilidade e confiabilidade sejam tratadas como gates de entrega.

## Principios de execucao

### 1. Nao integrar antes de testar

Nenhum modulo legado vai direto para a interface.

### 2. Nao migrar tudo ao mesmo tempo

Migracao sera feita por frentes e por modos, com dependencias claras.

### 3. Nao reaproveitar cegamente

Cada modulo do v1 sera classificado como:

- reaproveitar;
- encapsular;
- reprojetar;
- descartar e substituir.

Mas essa classificacao nao elimina a necessidade de cobertura funcional. Se a funcao ainda for util, ela continua tendo que existir no v2, mesmo quando a implementacao mude.

### 4. Priorizar valor com baixo risco

Primeiro entram as capacidades mais maduras do v1 e mais centrais para o produto.

### 5. Separar claramente backend, jobs e frontend

O maior risco da transicao e misturar tudo. Esse risco sera evitado desde o inicio.

### 6. Tratar `design/` como base canonica de definicao visual

O conteudo de `design/` nao deve ser lido apenas como inspiracao, nem como a UI de producao pronta. Ele deve ser tratado como a base que define a UI real da v2.

Isso inclui manter o padrao definido ali para:

- CSS;
- estrutura de layout;
- tipografia;
- fontes;
- paleta de cores;
- boxes, cards e containers;
- espacamentos;
- bordas, sombras e raios;
- comportamento visual dos componentes.

Regra pratica:

- nada disso deve ser hardcoded fora do padrao definido em `design/`;
- a UI real pode ser implementada em outra estrutura de codigo, mas deve ser derivada dessa base;
- toda migracao do prototipo para a aplicacao final deve traduzir esse padrao para a stack real sem redefinir a linguagem visual;
- qualquer novo valor visual so pode entrar se primeiro virar padrao do sistema definido a partir de `design/`.

Em outras palavras: a UI real nao e a pasta `design/`, mas deve ser totalmente definida por ela.

## Arquitetura-alvo

## Camadas

### Frontend v2

Responsavel por:

- shell da aplicacao;
- modos Inicio, Busca, Empresas, Radar e Relatorios;
- navegacao;
- componentes e estado de interface;
- consumo de API;
- traducao fiel do padrao visual ja definido em `design/` para a implementacao real da aplicacao.

### API do produto

Responsavel por:

- auth e sessao;
- contratos estaveis de request/response;
- exposicao dos servicos de dominio;
- limites, logging e tratamento de erro.

### Servicos de dominio

Servicos esperados:

- `SearchService`
- `CompanyService`
- `ReportsService`
- `UserPlatformService`
- `DocumentService`
- `NotificationService`
- `MarketService`

### Repositorios e dados

Responsavel por:

- acesso ao banco;
- queries consolidadas;
- storage de documentos e artefatos;
- cache quando necessario.

### Jobs e background

Responsavel por:

- ingestao PNCP;
- documentos pesados;
- boletins;
- calculo de agregados e precomputacao de Radar;
- limpeza e manutencao operacional.

## Frentes de trabalho

## Frente A - Fundacao tecnica

Objetivo:

Preparar o v1 para ser reutilizado como backend do v2.

Escopo:

- estrutura de API;
- modularizacao de servicos;
- schemas;
- organizacao de configuracao e ambientes;
- limpeza de dependencias da UI antiga.

## Frente B - Homologacao do legado

Objetivo:

Criar a bancada de validacao dos modulos do v1 antes da UI.

Escopo:

- adapters do legado;
- contratos de request/response;
- smoke tests;
- regressao;
- benchmarks;
- sandbox local.

## Frente C - Busca

Objetivo:

Substituir o mock do modo Busca por backend real.

Escopo:

- busca semantica;
- keyword;
- hibrida;
- filtros;
- detalhe de edital;
- documentos;
- exportacao basica.

## Frente D - Empresas

Objetivo:

Trazer o legado de CNPJ e aderencia para o modo Empresas.

Escopo:

- busca por CNPJ;
- busca por nome;
- desambiguacao;
- perfil da empresa;
- contratos e historico;
- aderencia a oportunidades.

## Frente E - Plataforma de usuario

Objetivo:

Consolidar a camada transversal do produto.

Escopo:

- autenticacao;
- sessao;
- favoritos;
- historico;
- boletins;
- notificacoes;
- billing;
- preferencias.

## Frente F - Inicio

Objetivo:

Construir o modo Inicio como composicao real dos servicos de usuario e trabalho.

Escopo:

- KPIs;
- favoritos;
- buscas recentes;
- relatorios recentes;
- artefatos do usuario;
- resumo operacional.

## Frente G - Relatorios

Objetivo:

Levar o dominio NL -> SQL do v1 para o modo Relatorios do v2.

Escopo:

- traducao da pergunta;
- SQL;
- validacao;
- execucao;
- historico;
- exportacao.

## Frente H - Radar

Objetivo:

Construir o modo Radar com base nos dados e nas capacidades do v1.

Escopo:

- top compradores;
- top players;
- share;
- series temporais;
- comparacao competitiva;
- recortes por mercado, categoria, orgao e periodo.

## Frente I - Operacao e producao

Objetivo:

Fechar performance, confiabilidade e manutencao.

Escopo:

- cache;
- observabilidade;
- limites;
- logs;
- testes e2e;
- deploy;
- runbooks.

## Ordem de execucao recomendada

## Fase 0 - Preparacao e fundacao

Objetivo:

Criar a base tecnica para a migracao controlada.

Entregas:

- estrutura inicial de API;
- organizacao do backend sandbox;
- contratos iniciais dos modulos prioritarios;
- mapa dos modulos legados a reaproveitar;
- estrategia de testes e triagem operacionalizada;
- regra de implementacao do frontend derivada de `design/`, sem redefinicao visual paralela fora do padrao.

Saida esperada:

- o time para de tratar o v1 como app Dash e passa a trata-lo como backend em formacao.

## Fase 1 - Homologacao de Busca

Objetivo:

Estabilizar e medir o modulo de busca antes da UI real.

Problemas atuais explicitados:

- busca lenta.

Entregas:

- `SearchAdapter`;
- contrato de resposta de busca;
- smoke tests;
- conjunto de regressao canonico;
- benchmark por etapa;
- relatorio de gargalos;
- definicao do que sera otimizado ou reprojetado.

Gate de saida:

- busca passa em contrato, regressao e benchmark minimo.

## Fase 2 - Busca real no v2

Objetivo:

Conectar o modo Busca do v2 a dados reais.

Entregas:

- endpoints de busca;
- filtros reais;
- listagem real;
- detalhe real de edital;
- primeiros fluxos de documentos;
- integracao do frontend com API.

Gate de saida:

- modo Busca funcionando sem mock para os casos principais.

## Fase 3 - Homologacao de Empresas

Objetivo:

Encapsular e estabilizar a analise por CNPJ e empresa.

Entregas:

- `CompanyAdapter`;
- contrato de busca e perfil de empresa;
- casos de regressao com CNPJs reais;
- benchmark de perfil e historico;
- decisao sobre o que fica como adapter e o que precisa consolidacao adicional.

Gate de saida:

- perfil, historico e aderencia com respostas consistentes.

## Fase 4 - Empresas real no v2

Objetivo:

Conectar o modo Empresas do v2 ao backend real.

Entregas:

- busca por CNPJ e nome;
- desambiguacao;
- perfil da empresa;
- contratos e historico;
- oportunidades aderentes.

Gate de saida:

- modo Empresas sem mock nos fluxos principais.

## Fase 5 - Plataforma de usuario

Objetivo:

Trazer a camada transversal do v1 para o centro da v2.

Entregas:

- auth real;
- sessao de usuario;
- favoritos;
- historico;
- boletins;
- notificacoes;
- billing e limites;
- preferencias.

Gate de saida:

- usuario autenticado, escopo por usuario e artefatos reais funcionando.

## Fase 6 - Inicio real

Objetivo:

Fazer o Inicio parar de ser mock e virar composicao do produto real.

Entregas:

- KPIs derivados de dados reais;
- favoritos reais;
- buscas recentes reais;
- relatorios recentes reais;
- resumo do usuario;
- atalhos para os outros modos.

Gate de saida:

- Inicio operacional sem depender de fixtures estaticas.

## Fase 7 - Homologacao e entrega de Relatorios

Objetivo:

Levar Relatorios para o v2 com seguranca e previsibilidade.

Entregas:

- `ReportsAdapter`;
- contrato NL -> SQL;
- validacao de seguranca;
- execucao controlada;
- historico e exportacao;
- integracao com UI do v2.

Gate de saida:

- perguntas simples e medianas funcionando com historico e export.

## Fase 8 - Homologacao de Documentos e pipeline documental

Objetivo:

Resolver lentidao e falhas da leitura de documentos de edital.

Problemas atuais explicitados:

- leitura lenta;
- leitura falhando;
- fluxo possivelmente acoplado demais.

Entregas:

- medicao separada de descoberta, download, extracao e resumo;
- testes por tipo de edital e PDF;
- cache de artefatos;
- estrategia de processamento assincrono para documentos pesados;
- fallback de parser, se necessario;
- decisao tecnica se o pipeline sera otimizado ou reprojetado.

Gate de saida:

- documentos deixam de ser gargalo imprevisivel da experiencia.

## Fase 9 - Construcao de Radar

Objetivo:

Construir o dominio de Radar em cima dos dados e jobs do v1.

Entregas:

- `MarketService`;
- endpoints de KPIs e agregados;
- series temporais;
- comparacao competitiva;
- top players e compradores;
- integracao da UI do Radar.

Gate de saida:

- Radar entregue com numeros confiaveis e narrativa consistente.

## Fase 10 - Operacao, producao e endurecimento

Objetivo:

Preparar o produto para operacao real.

Entregas:

- observabilidade;
- cache;
- limites;
- tratamento de falha;
- testes e2e;
- deploy;
- runbooks;
- rotina de manutencao do pipeline e dos jobs.

Gate de saida:

- stack pronta para uso controlado por usuarios reais.

## Modulos e seu destino planejado

### Reaproveitar diretamente

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

### Encapsular

- `GvG_Search_Browser.py`
- `GvG_SU_Report_v3.py`
- `cnpj_search_v1_3.py`
- chamadas legadas de assistants acopladas a interfaces antigas

### Construir ou reprojetar

- `MarketService` para Radar;
- dashboard real do Inicio;
- contratos de API;
- camada de sandbox e homologacao;
- estado compartilhado final do frontend;
- pipeline documental, se a medicao provar necessidade de reprojeto.

## Gatilhos de triagem obrigatoria

Os modulos abaixo ja entram na fila de triagem como prioridade alta:

### Busca

Categoria inicial:

- otimizar;
- estabilizar.

### Documentos de edital

Categoria inicial:

- estabilizar;
- otimizar;
- possivel reprojeto de pipeline.

### Outros modulos

Qualquer modulo adicional que se revele:

- lento;
- instavel;
- desatualizado;
- mal acoplado ao modelo da v2;

deve entrar na mesma fila antes da integracao.

## Gates globais de passagem entre fases

Um modulo so pode seguir para a fase seguinte quando passar por estes gates:

1. contrato de entrada e saida definido;
2. smoke tests verdes;
3. regressao verde nos casos principais;
4. benchmark dentro da meta ou com plano claro de mitigacao;
5. log e erro observaveis;
6. teste manual aprovado no sandbox;
7. decisao explicita: integrar, continuar otimizando ou reprojetar.

## Dependencias entre frentes

### Dependencias duras

- Busca real depende da Fase 1 concluida;
- Empresas real depende da homologacao de Empresas;
- Inicio real depende da plataforma de usuario;
- Radar depende de dados confiaveis e agregacoes validadas;
- producao depende de observabilidade, limites e runbooks.

### Dependencias suaves

- parte da plataforma de usuario pode evoluir em paralelo com Busca e Empresas;
- Relatorios pode ser homologado em paralelo com Empresas;
- documentacao e triagem seguem continuamente durante o plano.

## Como usar este plano

O plano deve ser lido como backlog-mestre e sequencia de execucao, nao como cronograma fixo de datas.

Para a operacao do time, cada fase deve virar:

1. tarefas tecnicas concretas;
2. contratos de API;
3. testes automatizados;
4. criterios de aceite.

Todo item de frontend deve incluir tambem um criterio visual obrigatorio:

5. aderencia ao padrao definido em `design/`, sem desvio de layout, CSS, tipografia, paleta, boxes ou componentes por redefinicao visual local.

## Resultado esperado ao final

Ao final da transicao:

- o v2 sera a aplicacao usada pelo usuario;
- o v1 tera sido absorvido como backend, servicos e jobs;
- os modulos lentos ou instaveis terao sido corrigidos ou reprojetados antes de contaminar a UX;
- Busca, Empresas, Inicio, Relatorios e Radar passarao a operar sob um shell unico e coerente;
- a evolucao futura do produto passara a acontecer sobre a arquitetura da v2, e nao mais sobre a UI legada.

## Documentos complementares

- `docs/CONVENCAO_ARQUITETURA_FRONTEND.md`
- `docs/CHECKLIST_IMPLEMENTACAO_FRONTEND.md`
- `docs/CRITERIOS_REVISAO_VISUAL.md`
- `docs/DEFINICAO_DE_PRONTO_POR_TELA.md`
- `docs/ESPECIFICACAO_TELA_INICIO.md`
- `docs/ESTRATEGIA_V1_NO_V2.md`
- `docs/MATRIZ_V1_V2.md`
- `docs/ESTRATEGIA_TESTES_ANTES_UI.md`
- `docs/TRIAGEM_MODULOS_LEGADOS.md`