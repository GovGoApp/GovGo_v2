# Levantamento PNCP API x Ingestao GovGo

Ultima verificacao: 2026-04-29

## Escopo

Este documento compara:

- o que os scripts atuais do GovGo v1 puxam do PNCP;
- o que existe hoje na base BDS1/Supabase;
- o que a API oficial do PNCP oferece e ainda nao persistimos;
- a suspeita de truncamento dos itens das contratacoes em apenas 10 registros.

Fontes usadas:

- `../v1/scripts/pncp/contratacao/01_processing.py`
- `../v1/scripts/pncp/contrato/01_processing.py`
- `../v1/scripts/pncp/ata/01_processing.py`
- `../v1/scripts/pncp/pca/01_processing.py`
- `../v1/db/BDS1_v7.txt`
- `src/backend/search/v1_copy/gvg_browser/gvg_database.py`
- API oficial OpenAPI: `https://pncp.gov.br/pncp-api/v3/api-docs`
- Manual oficial de consultas PNCP: `https://www.gov.br/pncp/pt-br/pncp/manuais/versoes-anteriores/ManualPNCPAPIConsultasVerso1.0.pdf/@@display-file/file`

## Resumo executivo

1. A suspeita dos "10 primeiros itens" esta confirmada para itens de contratacao.
   O script chama `/compras/{ano}/{sequencial}/itens` sem `pagina` e sem `tamanhoPagina`, e o PNCP devolve por padrao apenas 10 itens.

2. A listagem de contratacoes nao tem esse problema.
   Ela pagina por `totalPaginas` usando `pagina` e `tamanhoPagina`.

3. A listagem de contratos tambem nao tem esse problema.
   `contrato/01_processing.py` pagina por `totalPaginas` e `tamanhoPagina`.
   O problema em contratos e outro: hoje so persistimos o cabecalho/listagem do contrato, nao os anexos, historico, termos/aditivos nem instrumentos de cobranca.

4. Atas e PCA tambem paginam suas listagens.
   O que falta nelas nao e o bug dos 10 itens da contratacao, e sim cobertura de detalhes/documentos/historicos e algumas visoes consolidadas.

5. A base atual tem os nucleos `contratacao`, `item_contratacao`, `contrato`, `ata`, `pca`, `item_pca` e tabelas de embeddings, mas nao tem tabelas normalizadas para documentos, historicos, resultados de itens, imagens de itens, termos de contrato, documentos de contrato/termo, instrumentos de cobranca ou historicos de ata.

6. Sobre avisos: a classificacao "Aviso de Contratacao Direta" existe na tabela `contratacao` via `tipo_instrumento_convocatorio_*`; o que nao existe de forma propria na BD e a camada de documentos/publicacoes/avisos normalizados. Ou seja: o aviso como tipo da compra esta presente, mas o aviso como documento oficial, publicacao, retificacao e historico ainda nao esta modelado.

7. Sobre lotes: nao encontrei na API PNCP consultada nem na BD atual um campo/endpoint estruturado de "lote" para contratacao. O que temos oficialmente sao itens. Quando o edital trabalha por lote, esse lote costuma aparecer como texto na descricao do item, no objeto da compra ou nos documentos anexos. Portanto, hoje o label de UI `Itens / Lotes` conta itens, nao lotes distintos.

8. Sobre a aba/quadro `Historico` do site do PNCP: ela existe na API e nao esta na nossa BD. O endpoint testado e `GET /api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/historico`. Ele traz eventos, usuario/sistema de origem, data/hora, documento/item/resultado afetado e justificativa. E nessa `justificativa` que aparecem os textos enviados pelo sistema de origem; quando nao ha justificativa, o portal pode exibir `Exigencia Legal` para eventos obrigatorios.

9. Sobre mensagens do processo: nao encontrei no PNCP uma API de chat/feed operacional da licitacao, como mensagens do pregoeiro, perguntas/respostas, lances, sessoes, comunicados internos ou dialogo com licitantes. Quando essas informacoes entram no PNCP, elas aparecem indiretamente como historico (`justificativa`) ou como documentos/anexos publicados. A trilha completa de comunicacao costuma ficar no sistema de origem, acessivel pelo `linkSistemaOrigem` quando informado.

## Tamanho aproximado da base atual

Leitura de metadados do Postgres em 2026-04-29:

| Tabela | Estimativa de linhas |
| --- | ---: |
| `contratacao` | 1.734.432 |
| `item_contratacao` | 5.746.106 |
| `contrato` | 2.649.652 |
| `contrato_emb` | 2.719.741 |
| `contratacao_emb` | 1.739.835 |
| `ata` | 418.951 |
| `pca` | 11.387 |
| `item_pca` | 3.215.316 |

As contagens acima sao estimativas (`pg_class.reltuples`), usadas para evitar varreduras pesadas em tabelas grandes.

## Evidencia do bug dos itens de contratacao

No script `../v1/scripts/pncp/contratacao/01_processing.py`:

```python
BASE_ITENS = "https://pncp.gov.br/api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{seq}/itens"

def fetch_itens_batch(numeros):
    ...
    url = BASE_ITENS.format(cnpj=cnpj, ano=ano, seq=seq)
    r = SESSION.get(url, timeout=60)
    if r.status_code == 200:
        jd = r.json() or []
```

Nao ha `pagina`, `tamanhoPagina` nem uso de `/itens/quantidade`.

Testes diretos no PNCP:

| PNCP | Chamada sem parametros | `/itens/quantidade` | Chamada com `tamanhoPagina=500` |
| --- | ---: | ---: | ---: |
| `02571718000163-1-000001/2026` | 10 itens | 49 itens | 49 itens |
| `00394460005887-1-000029/2026` | 10 itens | 333 itens | 333 itens |
| `87502894000104-1-000048/2026` | 10 itens | 10 itens | 10 itens |

Conclusao:

- alguns editais realmente tem 10 itens;
- muitos editais com 10 itens na nossa base podem estar truncados;
- a unica forma confiavel de saber e comparar `count(item_contratacao)` com `/itens/quantidade`.

## O que puxamos hoje

### Contratacoes / editais / avisos

Endpoint principal usado:

- `GET https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao`

Campos principais persistidos em `public.contratacao`:

- identificacao: `numero_controle_pncp`, `ano_compra`, `sequencial_compra`, `numero_compra`, `processo`;
- objeto: `objeto_compra`, `informacao_complementar`;
- datas: `data_abertura_proposta`, `data_encerramento_proposta`, `data_inclusao`, `data_publicacao_pncp`, `data_atualizacao`, `data_atualizacao_global`;
- valores: `valor_total_estimado`, `valor_total_homologado`;
- modalidade/situacao: `modalidade_id`, `modalidade_nome`, `modo_disputa_id`, `modo_disputa_nome`, `tipo_instrumento_convocatorio_codigo`, `tipo_instrumento_convocatorio_nome`, `situacao_compra_id`, `situacao_compra_nome`, `existe_resultado`;
- orgao/unidade: orgao entidade, unidade, UF, municipio, codigo IBGE;
- subrogacao: orgao e unidade sub-rogados;
- orcamento/amparo: `orcamento_sigiloso_*`, `fontes_orcamentarias`, `amparo_legal_*`;
- links: `link_sistema_origem`, `link_processo_eletronico`;
- documentos: `lista_documentos` em `jsonb`, preenchida sob demanda pelo browser v1, nao como coleta normalizada do pipeline.

Observacao sobre "avisos":

- No PNCP, "Aviso de Contratacao Direta" aparece em dois lugares diferentes:
  - como `tipoInstrumentoConvocatorio` da contratacao;
  - como `tipoDocumento` de um arquivo/documento anexado a contratacao.
- Como tipo de instrumento, os avisos estao na nossa BD dentro de `public.contratacao`.
- Como documento/publicacao oficial, eles nao estao normalizados; hoje dependem do cache `contratacao.lista_documentos`, que e preenchido sob demanda e quase sempre esta vazio.

Distribuicao real consultada em `public.contratacao` em 2026-04-29:

| Tipo de instrumento convocatorio | Registros |
| --- | ---: |
| `Ato que autoriza a Contratacao Direta` | 876.077 |
| `Edital` | 575.091 |
| `Aviso de Contratacao Direta` | 307.688 |
| `Edital de Chamamento Publico` | 28.502 |

Cobertura de documentos cacheados:

| Recorte | Registros |
| --- | ---: |
| Contratacoes com `lista_documentos` preenchida | 460 |
| Contratacoes sem `lista_documentos` | 1.786.898 |
| Avisos de Contratacao Direta com `lista_documentos` | 36 |
| Avisos de Contratacao Direta sem `lista_documentos` | 307.652 |

Conclusao sobre avisos:

- nao falta o aviso enquanto classificacao da contratacao;
- falta uma tabela/camada propria para documentos de aviso, edital, termo de referencia, minuta, ETP, mapa de riscos e demais anexos;
- tambem falta historico de publicacao/retificacao/cancelamento que permita tratar "avisos" como eventos acompanhaveis.

### Itens de contratacao

Endpoint usado hoje:

- `GET https://pncp.gov.br/api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/itens`

Tabela:

- `public.item_contratacao`

Campos persistidos:

- `numero_controle_pncp`
- `numero_item`
- `descricao_item`
- `material_ou_servico`
- `valor_unitario_estimado`
- `valor_total_estimado`
- `quantidade_item`
- `unidade_medida`
- `item_categoria_id`
- `item_categoria_nome`
- `criterio_julgamento_id`
- `situacao_item`
- `tipo_beneficio`
- `data_inclusao`
- `data_atualizacao`
- `ncm_nbs_codigo`
- `catalogo`

Problema:

- A coleta atual nao pagina e perde itens acima da primeira pagina.

### Lotes

Verificacao feita:

- OpenAPI oficial `https://pncp.gov.br/pncp-api/v3/api-docs`: nenhum path, schema ou propriedade com `lote`;
- manual de consultas PNCP: nao ha endpoint especifico de lote na parte de contratacoes/itens;
- payload real de `/compras/{ano}/{sequencial}/itens`: nao traz campo de lote;
- schema `BDS1_v7.txt`: nao ha tabela ou coluna de lote em `contratacao` ou `item_contratacao`;
- consulta de exemplos na BD mostrou "lote" apenas como texto livre em `descricao_item` ou `objeto_compra`.

Exemplos observados:

- `item_contratacao.descricao_item`: `Lote 1 - ALMOFADA PARA CARIMBO No 3 AZUL`;
- `item_contratacao.descricao_item`: `Lote 1 - CANETA ESFEROGRAFICA AZUL...`;
- `contratacao.objeto_compra`: `lote 02 - edital 002/2025`;
- `contratacao.objeto_compra`: `REGISTRO DE PRECOS PARA AQUISICAO DE MEDICAMENTOS (1o LOTE/2026)...`.

Conclusao:

- lote nao e hoje uma entidade oficial estruturada na nossa ingestao PNCP;
- nao existe contagem confiavel de lotes distintos na BD atual;
- o numero exibido como `Itens / Lotes` no detalhe deve ser entendido como quantidade de itens, ate que criemos uma camada derivada de lotes;
- para ter lotes no v2, o caminho seguro e primeiro completar todos os itens e documentos; depois extrair lotes por regra/IA a partir de descricoes e anexos, com campo de confianca.

### Historico visual do PNCP

A aba `Historico` vista no site do PNCP, com colunas como `Evento`, `Nome`, `Data/Hora do Evento` e `Justificativa`, corresponde ao endpoint publico:

- `GET https://pncp.gov.br/api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/historico?pagina=1&tamanhoPagina=50`
- quantidade: `GET https://pncp.gov.br/api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/historico/quantidade`

Campos retornados em chamada real:

- `tipoLogManutencao`
- `tipoLogManutencaoNome`
- `categoriaLogManutencao`
- `categoriaLogManutencaoNome`
- `logManutencaoDataInclusao`
- `justificativa`
- `usuarioNome`
- `documentoTipo`
- `documentoTitulo`
- `documentoSequencial`
- `itemNumero`
- `itemResultadoNumero`
- `itemResultadoSequencial`
- `compraOrgaoCnpj`
- `compraSequencial`
- `compraAno`

Mapeamento para a tela do PNCP:

| Coluna no site PNCP | Campo/fonte da API |
| --- | --- |
| `Evento` | combinacao de `tipoLogManutencaoNome` + `categoriaLogManutencaoNome`, por exemplo `Inclusao - Item de Contratacao` |
| `Nome` | `documentoTitulo` quando for documento; `documentoTipo` como apoio; `itemNumero` ou `itemResultadoNumero` quando for item/resultado |
| `Data/Hora do Evento` | `logManutencaoDataInclusao` |
| `Justificativa` | `justificativa`; quando vier vazio/nulo, o portal pode exibir texto padrao como `Exigencia Legal` |
| usuario/sistema de origem | `usuarioNome` |

Exemplos reais observados:

- `Inclusao - Documento de Contratacao`, nome `Edital`, data `2026-04-29T16:53:32`;
- `Retificacao - Item de Contratacao`, nome `Item 10`, justificativa `Atualizacao da situacao com a inclusao do resultado do item`;
- `Retificacao - Resultado de Item de Contratacao`, com `itemResultadoSequencial`;
- `Inclusao - Contratacao`, sem documento/item associado.

Sobre "avisos do pregoeiro":

- nao encontrei endpoint separado no OpenAPI com nomes como `pregoeiro`, `mensagem`, `comunicado`, `esclarecimento`, `impugnacao` ou `quadroInformativo`;
- no PNCP publico, os textos explicativos/avisos exibidos nesse contexto parecem vir de `historico.justificativa` e dos documentos vinculados;
- status atual da licitacao/contratacao vem do registro principal (`situacaoCompraId`, `situacaoCompraNome`) e dos estados de itens/resultados;
- para capturar esses avisos no GovGo, precisamos persistir `contratacao_historico` e relacionar com `contratacao_documento`, `item_contratacao` e `item_contratacao_resultado`.

Sobre mensagens do processo:

- nao foi encontrado endpoint de mensagens conversacionais/operacionais do processo no PNCP publico;
- termos pesquisados no OpenAPI/manual local sem endpoint correspondente: `mensagem`, `chat`, `comunicado`, `esclarecimento`, `impugnacao`, `recurso`, `pregoeiro`, `sessao`;
- isso nao significa que esses assuntos nunca aparecam no PNCP: eles podem aparecer como documentos publicados, por exemplo ata de sessao, esclarecimento, impugnacao/resposta, comunicado, aviso, edital retificado ou outros anexos;
- tambem podem aparecer resumidos na `justificativa` do historico, quando o sistema de origem envia essa informacao ao PNCP;
- a fonte completa dessas mensagens, quando existir, tende a ser o portal de origem do certame, acessivel por `linkSistemaOrigem` ou por documentos do PNCP.

### Contratos

Endpoints usados:

- `GET https://pncp.gov.br/api/consulta/v1/contratos`
- `GET https://pncp.gov.br/api/consulta/v1/contratos/atualizacao`

Tabela:

- `public.contrato`

Campos principais persistidos:

- identificacao do contrato: `numero_controle_pncp`, `sequencial_contrato`, `numero_contrato_empenho`, `ano_contrato`;
- vinculo com compra: `numero_controle_pncp_compra`;
- fornecedor: `ni_fornecedor`, `tipo_pessoa`, `nome_razao_social_fornecedor`;
- datas: `data_assinatura`, `data_vigencia_inicio`, `data_vigencia_fim`, `data_atualizacao_global`, `vigencia_ano`;
- valores: `valor_inicial`, `valor_parcela`, `valor_global`;
- objeto/processo: `objeto_contrato`, `processo`;
- tipo/categoria: `tipo_contrato_*`, `categoria_processo_*`;
- orgao/unidade: orgao entidade e unidade.

Paginacao:

- O script pagina por `totalPaginas`, portanto nao ha evidencia do bug dos 10 primeiros na listagem de contratos.

### Atas

Endpoints usados:

- `GET https://pncp.gov.br/api/consulta/v1/atas`
- `GET https://pncp.gov.br/api/consulta/v1/atas/atualizacao`

Tabela:

- `public.ata`

Campos principais persistidos:

- `numero_controle_ata_pncp`
- `numero_controle_pncp_compra`
- `numero_ata_registro_preco`
- `ano_ata`
- `data_assinatura`
- `vigencia_inicio`
- `vigencia_fim`
- `data_cancelamento`
- `cancelado`
- `objeto_contratacao`
- orgao/unidade e sub-rogacao
- `usuario`
- `data_publicacao_pncp`
- `data_inclusao`
- `data_atualizacao`
- `data_atualizacao_global`

Paginacao:

- O script pagina por `totalPaginas`.

### PCA

Endpoints usados:

- `GET https://pncp.gov.br/api/consulta/v1/pca/atualizacao`
- fallback por usuario/classificacao em `GET /v1/pca/usuario`

Tabelas:

- `public.pca`
- `public.item_pca`

Campos persistidos no cabecalho:

- `numero_controle_pca_pncp`
- orgao/unidade
- `ano_pca`
- `id_usuario`
- datas de publicacao/inclusao/atualizacao

Campos persistidos nos itens:

- numero item, categoria, catalogo, classificacao, PDM;
- codigo e descricao do item;
- unidade, quantidade, valores;
- data desejada, unidade requisitante, grupo de contratacao;
- datas de inclusao/atualizacao.

Paginacao:

- O script pagina por `totalPaginas` no cabecalho e busca itens do PCA por endpoint proprio.

## O que a API PNCP oferece e ainda nao persistimos

### Contratacoes

A API oficial expõe, alem da listagem que usamos:

- `GET /v1/orgaos/{cnpj}/compras/{ano}/{sequencial}`: detalhe da contratacao;
- `GET /v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/arquivos`: documentos;
- `GET /v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/arquivos/quantidade`;
- `GET /v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/historico`;
- `GET /v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/historico/quantidade`;
- `GET /v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/fonte-orcamentaria`;
- `GET /v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/atas`.

Hoje:

- documentos sao cacheados parcialmente em `contratacao.lista_documentos`, sob demanda na UI;
- nao ha tabela normalizada de documentos de contratacao;
- nao ha tabela de historico de contratacao;
- fontes orcamentarias estao em texto/json no proprio registro, nao normalizadas;
- relacao compra -> atas existe indiretamente via `ata.numero_controle_pncp_compra`, mas nao ha coleta de detalhe por compra.

Outras lacunas especificas de contratacao:

- nao usamos o endpoint de consulta por data de proposta (`/v1/contratacoes/proposta`) como visao operacional de oportunidades abertas por janela de recebimento de propostas;
- nao persistimos, como entidade propria, documentos de tipo `Aviso de Contratacao Direta`, `Edital`, `Minuta do Contrato`, `Termo de Referencia`, `Anteprojeto`, `Projeto Basico`, `Estudo Tecnico Preliminar`, `Projeto Executivo`, `Mapa de Riscos` e `DFD`;
- nao persistimos o historico da contratacao, que e exatamente a aba `Historico` do site do PNCP e traz justificativa, tipo/categoria do log, data do evento, documento afetado, item afetado, resultado de item afetado e usuario;
- nao temos uma tabela de eventos/publicacoes/retificacoes, portanto nao ha como diferenciar bem "registro atual da compra" de "avisos e alteracoes publicados ao longo da vida da compra";
- nao temos mensagens operacionais do processo como entidade PNCP; perguntas/respostas, comunicados, impugnacoes, sessoes e falas do pregoeiro so devem aparecer se forem publicados como documento ou historico/justificativa;
- nao persistimos campos do schema oficial `Compra` que podem existir no detalhe/manutencao da API: `id`, `listaItensDescricao`, `excluido`, `atributoControle`, `valorTotal`, `indicadorOrcamentoSigiloso` e `numeroControle`;
- nao guardamos a resposta bruta oficial da contratacao em `jsonb`, o que dificulta detectar rapidamente novos campos do PNCP sem alterar schema;
- contratos vinculados existem indiretamente por `contrato.numero_controle_pncp_compra`, mas a contratacao nao tem uma visao materializada propria de contratos, atas, documentos e historicos vinculados.
- nao temos lote estruturado: quando ha lote, ele aparece como texto livre em descricao/objeto/documentos, e nao como coluna ou relacao item -> lote.

### Itens de contratacao

A API oficial expõe:

- `GET /itens` com `pagina` e `tamanhoPagina`;
- `GET /itens/quantidade`;
- `GET /itens/{numeroItem}`;
- `GET /itens/{numeroItem}/resultados`;
- `GET /itens/{numeroItem}/resultados/{sequencialResultado}`;
- `GET /itens/{numeroItem}/imagem`;
- `GET /itens/{numeroItem}/imagem/{sequencialImagem}`.

Campos existentes na API e nao persistidos em `item_contratacao`:

- `materialOuServicoNome`
- `orcamentoSigiloso`
- `patrimonio`
- `codigoRegistroImobiliario`
- `criterioJulgamentoNome`
- `situacaoCompraItemNome`
- `tipoBeneficioNome`
- `incentivoProdutivoBasico`
- `temResultado`
- `imagem`
- `aplicabilidadeMargemPreferenciaNormal`
- `aplicabilidadeMargemPreferenciaAdicional`
- `percentualMargemPreferenciaNormal`
- `percentualMargemPreferenciaAdicional`
- `ncmNbsDescricao`
- `categoriaItemCatalogo`
- `catalogoCodigoItem`
- `informacaoComplementar`
- `tipoMargemPreferencia`
- `exigenciaConteudoNacional`

Resultados/homologacao de item ainda nao persistidos:

- fornecedor vencedor/classificado;
- CNPJ/NI, tipo pessoa, razao social;
- quantidade e valor homologado;
- desconto;
- data de resultado;
- motivo/data de cancelamento;
- ordem de classificacao SRP;
- aplicacao de margem de preferencia, beneficio ME/EPP e criterio de desempate;
- natureza juridica;
- dados de moeda estrangeira.

### Contratos

A API oficial expõe, alem da listagem que usamos:

- `GET /v1/orgaos/{cnpj}/contratos/{ano}/{sequencial}`;
- `GET /v1/orgaos/{cnpj}/contratos/{ano}/{sequencial}/arquivos`;
- `GET /v1/orgaos/{cnpj}/contratos/{ano}/{sequencial}/historico`;
- `GET /v1/orgaos/{cnpj}/contratos/{ano}/{sequencial}/termos`;
- `GET /v1/orgaos/{cnpj}/contratos/{ano}/{sequencial}/termos/{sequencialTermoContrato}`;
- `GET /v1/orgaos/{cnpj}/contratos/{ano}/{sequencial}/termos/{sequencialTermo}/arquivos`;
- `GET /v1/orgaos/{cnpj}/contratos/{ano}/{sequencialContrato}/instrumentocobranca`.

Campos do contrato oficial que hoje nao aparecem na tabela `contrato`:

- `dataAtualizacao`
- `dataPublicacaoPncp`
- `informacaoComplementar`
- `receita`
- `valorAcumulado`
- `tipoPessoaSubContratada`
- `niFornecedorSubContratado`
- `nomeFornecedorSubContratado`
- `unidadeSubRogada`
- `orgaoSubRogado`
- `identificadorCipi`
- `urlCipi`
- `usuarioNome`
- `codigoPaisFornecedor`

Familias inteiras ainda ausentes:

- documentos do contrato;
- historico do contrato;
- termos/aditivos;
- documentos dos termos;
- instrumentos de cobranca / nota fiscal eletronica.

Resposta a pergunta especifica:

- Nao encontrei evidencia de que a listagem de contratos so puxe 10.
- O que acontece e que contratos estao incompletos em profundidade: temos o cabecalho/listagem, mas nao os detalhes derivados.

### Atas

A API oficial expõe:

- atas por compra;
- detalhe de ata;
- documentos de ata;
- quantidade de documentos de ata;
- historico de ata.

Campos do detalhe de ata que nao estao claros/completos na tabela atual:

- `modalidadeNome`
- `objetoCompra`
- `informacaoComplementarCompra`
- dados completos de orgao/unidade como objetos;
- detalhes normalizados dos documentos.

Familias ainda ausentes:

- documentos de ata;
- historico de ata.

### PCA

A API oficial expõe:

- PCA por ano;
- quantidade de PCA por ano;
- consolidado por orgao/ano;
- consolidado por sequencial;
- valores por categoria do item;
- CSV;
- itens do PCA;
- quantidade de itens;
- relacoes de itens com contratacao/plano.

Hoje:

- persistimos cabecalho e itens;
- nao persistimos visoes consolidadas;
- nao persistimos valores agregados por categoria;
- nao guardamos snapshot CSV;
- nao exploramos explicitamente os endpoints de relacao item/plano/contratacao.

## Riscos tecnicos atuais

### Risco 1: item truncado e analise errada

Busca, detalhe, exportacao, boletim, relatorio e classificacao podem estar trabalhando com so os 10 primeiros itens de editais que possuem dezenas ou centenas de itens.

Impactos provaveis:

- valor e quantidade por item incompletos;
- descricao incompleta do objeto real;
- analise por itens enviesada;
- boletins e relatorios com baixa cobertura;
- perda de fornecedores/resultados de item, quando existirem.

### Risco 2: backfill comum nao corrige registros ja truncados

Se a rotina atual so busca itens para contratacoes "sem itens", registros que ja tem 10 itens ficam parecendo preenchidos.

Portanto, corrigir apenas o fetch novo nao basta. E preciso um backfill que compare quantidade oficial com quantidade local.

### Risco 3: documentos em `lista_documentos` nao substituem uma tabela

O cache `lista_documentos jsonb` ajuda a UI, mas dificulta:

- auditoria de documentos;
- busca por tipo de documento;
- atualizacao incremental;
- historico de alteracoes;
- metricas por documento;
- vinculacao com conversao/resumo/IA.

### Risco 4: contratos sem termos/aditivos ficam subrepresentados

Para modo empresa, relatorios, risco competitivo e acompanhamento de fornecedor, os termos/aditivos, vigencia alterada, valor acumulado e instrumentos de cobranca podem ser tao importantes quanto o contrato original.

## Correcoes recomendadas

### P0 - Corrigir itens de contratacao

Alterar a coleta de itens para:

1. consultar `/itens/quantidade`;
2. buscar `/itens?pagina=N&tamanhoPagina=500` ate completar a quantidade;
3. manter fallback por paginas ate resposta vazia quando `/quantidade` falhar;
4. fazer upsert por `(numero_controle_pncp, numero_item)`;
5. criar auditoria `qtd_itens_pncp`, `qtd_itens_local`, `last_checked_at` ou uma tabela de controle equivalente;
6. backfill por prioridade:
   - primeiro contratações com exatamente 10 itens locais;
   - depois editais recentes/ativos;
   - depois todo o historico.

### P1 - Ampliar o schema dos itens

Adicionar campos faltantes de `RecuperarCompraItemSigiloDTO` que sejam uteis para busca, analise e UI:

- nomes legiveis de material/servico, criterio, situacao e beneficio;
- `tem_resultado`;
- `informacao_complementar`;
- margem de preferencia;
- NCM/NBS descricao;
- indicadores de imagem/orcamento sigiloso/patrimonio.

### P1 - Persistir resultados de itens

Criar tabela sugerida:

- `item_contratacao_resultado`

Chave sugerida:

- `(numero_controle_pncp, numero_item, sequencial_resultado)`

Uso:

- fornecedor vencedor;
- homologacao;
- classificacao;
- valores finais;
- cancelamentos;
- margem/preferencia/desempate.

### P2 - Extrair lotes como camada derivada

Nao criar lote como se fosse campo oficial PNCP enquanto a API nao entregar isso de forma estruturada.

Criar, se o produto precisar de navegacao/analise por lote:

- `contratacao_lote`
- `item_contratacao_lote_map`

Origem sugerida:

- regex conservadora em `descricao_item` e `objeto_compra`;
- documentos normalizados de edital/termo de referencia;
- IA apenas como enriquecimento com `confidence`, nunca como verdade primaria sem fonte;
- guardar `source_field`, `source_documento_id`, `source_excerpt` e `confidence`.

Uso:

- agrupar itens por lote quando o edital explicitar lotes;
- permitir analise por lote no detalhe do edital;
- evitar que a UI conte itens como se fossem lotes distintos;
- suportar alertas como "lote alterado" apenas quando vier de historico/documento ou extracao confiavel.

### P1 - Normalizar documentos

Criar tabelas:

- `contratacao_documento`
- `contrato_documento`
- `ata_documento`
- `contrato_termo_documento`

Preservar `lista_documentos` temporariamente para compatibilidade da UI, mas passar a tratar documentos como entidades.

Para contratacoes, essa etapa precisa cobrir explicitamente os documentos que hoje ficam invisiveis como registros proprios:

- Aviso de Contratacao Direta;
- Edital;
- Minuta do Contrato;
- Termo de Referencia;
- Anteprojeto;
- Projeto Basico;
- Estudo Tecnico Preliminar;
- Projeto Executivo;
- Mapa de Riscos;
- DFD;
- outros anexos que o PNCP passar a expor por `tipoDocumentoId`.

Mensagens do processo devem ser tratadas aqui quando aparecerem como documento:

- esclarecimentos;
- respostas a impugnacao;
- comunicados;
- atas de sessao;
- avisos do pregoeiro;
- editais/termos retificados;
- relacao de lotes e anexos operacionais.

Como a API de documentos usa `tipoDocumentoId` relativamente generico em alguns casos, guardar tambem `titulo`, `tipoDocumentoNome`, `tipoDocumentoDescricao` e metadados brutos e essencial para descobrir esses documentos por nome e conteudo.

### P1 - Contratos completos

Criar tabelas:

- `contrato_termo`
- `contrato_historico`
- `contrato_instrumento_cobranca`

E ampliar `contrato` com campos oficiais faltantes, especialmente:

- `data_publicacao_pncp`
- `data_atualizacao`
- `informacao_complementar`
- `receita`
- `valor_acumulado`
- dados de subcontratado;
- dados de CIP/usuario/pais.

### P2 - Historicos

Criar tabelas:

- `contratacao_historico`
- `ata_historico`
- `contrato_historico`

Uso:

- avisos de alteracao;
- mudancas de documentos;
- cancelamentos;
- retificacoes;
- alteracoes relevantes para favoritos/boletins/alertas.
- mensagens/justificativas enviadas pelo sistema de origem e exibidas no portal na aba `Historico`.
- ponte entre a publicacao oficial do PNCP e eventuais mensagens/processos que so existam no sistema de origem.

Essa e a camada correta para transformar "avisos" em alertas do produto: nao basta saber que a contratacao e do tipo aviso; e preciso saber quando houve publicacao, inclusao/troca de documento, suspensao, revogacao, anulacao, resultado de item ou outra alteracao relevante.

### P2 - Atas completas

Adicionar:

- documentos de ata;
- historico de ata;
- campos faltantes do detalhe oficial.

### P2 - PCA consolidado

Adicionar:

- `pca_consolidado`
- `pca_valores_categoria`
- relacoes item PCA -> item/plano/contratacao, se forem uteis para Modo Empresa/Radar.

## Procedimento operacional com corte em 2026-01-01

Data de corte sugerida pelo usuario: `20260101`.

Essa data deve ser usada como filtro local sobre `public.contratacao.data_publicacao_pncp`, nao como parametro unico para todos os endpoints PNCP. O motivo: itens, documentos, historico e resultados sao endpoints por contratacao.

### O que pode rodar com os scripts atuais

Para garantir que as contratacoes publicadas desde 2026-01-01 existam na base, o script atual aceita intervalo:

```powershell
cd ..\v1\scripts\pncp
python .\contratacao\01_processing.py --start 20260101 --end 20260430 --workers 8
```

Limites importantes:

- isso preenche contratacoes que estejam faltando;
- nao atualiza contratacoes ja existentes, porque `insert_contratacoes` usa `ON CONFLICT DO NOTHING`;
- `--refresh-items` nao corrige o bug dos 10 itens, porque a selecao de itens pendentes busca apenas contratacoes sem nenhum item;
- portanto, rodar o script atual com `--refresh-items` ainda nao completa editais que ja tenham 10 itens truncados.

Para contratos, atas e PCA, o runner atual cobre atualizacoes por data:

```powershell
cd ..\v1\scripts\pncp
python .\run_atualizacao_all.py --from 20260101 --to 20260430
```

Limites:

- cobre listagens/upserts de `contrato`, `ata` e `pca`;
- nao busca documentos, historicos, termos/aditivos, instrumentos de cobranca nem mensagens/documentos da contratacao.

### Script novo recomendado

Criar um script separado, para nao misturar backfill corretivo com o pipeline diario:

- caminho sugerido: `../v1/scripts/pncp/contratacao/04_backfill_related.py`;
- nao deve atualizar `system_config.last_processed_date`;
- deve ter `--from`, `--to`, `--scope`, `--workers`, `--limit`, `--dry-run` e `--resume`;
- deve trabalhar em lotes pequenos e gravar auditoria por PNCP.

Exemplos de uso desejado:

```powershell
python .\contratacao\04_backfill_related.py --from 20260101 --to 20260430 --scope items --workers 8 --dry-run
python .\contratacao\04_backfill_related.py --from 20260101 --to 20260430 --scope items --workers 8
python .\contratacao\04_backfill_related.py --from 20260101 --to 20260430 --scope documents,history --workers 6
python .\contratacao\04_backfill_related.py --from 20260101 --to 20260430 --scope results --workers 4
```

### Seleção de candidatos

Base recomendada:

```sql
SELECT
  c.numero_controle_pncp,
  c.data_publicacao_pncp,
  c.modalidade_id,
  c.tipo_instrumento_convocatorio_codigo,
  COUNT(i.numero_item) AS qtd_itens_local
FROM public.contratacao c
LEFT JOIN public.item_contratacao i
  ON i.numero_controle_pncp = c.numero_controle_pncp
WHERE c.data_publicacao_pncp::date >= DATE '2026-01-01'
GROUP BY
  c.numero_controle_pncp,
  c.data_publicacao_pncp,
  c.modalidade_id,
  c.tipo_instrumento_convocatorio_codigo
ORDER BY c.data_publicacao_pncp, c.numero_controle_pncp;
```

Prioridade de execucao:

1. `qtd_itens_local = 10`, porque e o principal sintoma do truncamento;
2. `qtd_itens_local = 0`, porque ainda falta item;
3. favoritos de usuarios, historicos recentes e editais ativos;
4. todos os demais desde `20260101`.

### Correção dos itens maiores que 10

Para cada `numero_controle_pncp`:

1. quebrar o PNCP em `cnpj`, `ano`, `sequencial`;
2. chamar `GET /api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/itens/quantidade`;
3. comparar `qtd_itens_pncp` com `qtd_itens_local`;
4. se `qtd_itens_local < qtd_itens_pncp`, baixar todas as paginas:
   - `GET /itens?pagina=N&tamanhoPagina=500`;
5. normalizar;
6. gravar com upsert por `(numero_controle_pncp, numero_item)`.

Mudanca necessaria no upsert:

- o atual `insert_itens` usa `ON CONFLICT DO NOTHING`;
- para backfill corretivo, usar `ON CONFLICT DO UPDATE` para atualizar tambem itens ja existentes com campos novos/corrigidos.

Auditoria minima:

- `numero_controle_pncp`;
- `qtd_itens_local_before`;
- `qtd_itens_pncp`;
- `qtd_itens_local_after`;
- `status`;
- `error_message`;
- `checked_at`.

### Documentos, historico e "mensagens"

Para cada contratacao do corte:

Documentos:

- `GET /api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/arquivos?pagina=1&tamanhoPagina=500`;
- gravar em `contratacao_documento`;
- chave natural sugerida: `(numero_controle_pncp, sequencial_documento)`;
- guardar tambem `raw jsonb`.

Historico:

- `GET /api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/historico?pagina=1&tamanhoPagina=500`;
- gravar em `contratacao_historico`;
- como o retorno nao traz ID unico, criar uma chave/fingerprint com PNCP, tipo/categoria do log, data, item, resultado, documento, justificativa e usuario;
- guardar tambem `raw jsonb`.

Mensagens do processo:

- nao ha endpoint de chat/mensagens do processo no PNCP publico;
- capturar o que estiver em `historico.justificativa`;
- capturar documentos com titulos/tipos que indiquem comunicado, esclarecimento, impugnacao, resposta, ata de sessao, aviso, relacao de lotes ou edital retificado;
- para a trilha completa, seguir `linkSistemaOrigem` quando o sistema de origem disponibilizar essas informacoes.

### Resultados de itens

Depois de completar os itens, buscar resultados somente para itens com sinal de resultado:

- ideal: persistir `temResultado` em `item_contratacao`;
- enquanto isso nao existir, usar o payload recem-baixado de `/itens`, que traz `temResultado`;
- endpoint: `GET /api/pncp/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/itens/{numeroItem}/resultados`;
- gravar em `item_contratacao_resultado`;
- chave natural sugerida: `(numero_controle_pncp, numero_item, sequencial_resultado)`.

### Ordem pratica para executar

1. Criar migracoes das tabelas novas: `contratacao_documento`, `contratacao_historico`, `item_contratacao_resultado` e auditoria do backfill.
2. Criar o script `04_backfill_related.py` com `--dry-run`.
3. Testar com 3 PNCPs conhecidos:
   - um com 49 itens;
   - um com 333 itens;
   - um com exatamente 10 itens.
4. Rodar `--scope items --dry-run` para `20260101..20260430`.
5. Rodar `--scope items` em lotes pequenos.
6. Rodar `--scope documents,history`.
7. Rodar `--scope results` depois de itens completos.
8. So depois integrar isso a boletins, avisos, alertas e detalhe do edital no v2.

## Ordem segura de implantacao

1. Fazer patch pequeno no fetch de itens de contratacao, sem tocar na UI.
2. Rodar teste com 3 PNCPs conhecidos:
   - um com 49 itens;
   - um com 333 itens;
   - um com exatamente 10 itens.
3. Criar rotina de auditoria/backfill apenas para itens.
4. Rodar backfill incremental em lotes pequenos.
5. Somente depois ampliar schema e UI para resultados de item/documentos/historicos.
6. Antes de boletins e alertas, priorizar historico/documentos/resultados, porque sao as fontes naturais de "avisos" reais.

## Conclusao

O problema mais urgente e objetivo e a coleta incompleta de `item_contratacao`.

Contratos, atas e PCA nao apresentam a mesma falha de paginacao nas listagens atuais, mas estao incompletos em profundidade. O PNCP tem muito mais informacao do que hoje gravamos, principalmente:

- resultados/homologacao de itens;
- imagens e campos ricos de itens;
- documentos normalizados;
- historicos;
- termos/aditivos de contratos;
- instrumentos de cobranca;
- consolidados de PCA;
- documentos/historicos de atas.

Para o v2, a recomendacao e nao inventar funcionalidades novas nessa camada antes de corrigir a fundacao: primeiro completar itens, depois documentos/historicos/resultados, depois usar isso em boletins, avisos, modo empresa, radar e relatorios.
