# Triagem dos Modulos Legados do v1 Antes da Integracao no v2

## Objetivo

Nem tudo que vem do v1 precisa do mesmo tratamento.

Alguns modulos:

- funcionam, mas estao lentos;
- funcionam parcialmente, mas erram casos importantes;
- estao quebrados em partes da execucao;
- ainda funcionam tecnicamente, mas precisam ser repensados como produto;
- dependem de infraestrutura ou integracoes externas que ja nao estao confiaveis.

Por isso, antes de integrar qualquer modulo na UI do v2, ele deve passar por uma triagem.

## Regra Central

Cada modulo legado deve ser classificado em uma destas categorias:

### 1. Estabilizar

Use quando o modulo ainda faz sentido, mas tem bugs ou comportamento inconsistente.

Exemplos:

- falha em alguns cenarios;
- retorna campos incompletos;
- quebra com dados reais especificos;
- tem erro intermitente.

### 2. Otimizar

Use quando o modulo cumpre a funcao principal, mas esta lento demais para o padrao da v2.

Exemplos:

- busca responde, mas demora demais;
- leitura de documento termina, mas a latencia inviabiliza a UX;
- agregacoes pesadas travam o fluxo.

### 3. Reprojetar

Use quando o modulo ate funciona, mas o modelo conceitual esta fraco, obsoleto ou inadequado para a arquitetura do v2.

Exemplos:

- fluxo bom para Dash, ruim para API + SPA;
- resposta muito acoplada a UI antiga;
- experiencia pouco clara para o modelo do v2;
- modulo virou remendo de varias iteracoes antigas.

### 4. Descartar e substituir

Use quando o custo de consertar o legado e maior do que reconstruir a capacidade com base melhor.

Exemplos:

- modulo muito quebrado;
- dependencia externa morta;
- codigo altamente acoplado sem valor de reaproveitamento;
- comportamento imprevisivel sem forma economica de estabilizar.

## Como decidir o destino de um modulo

Use esta sequencia:

1. O modulo ainda resolve um problema importante do produto?
2. O comportamento principal e tecnicamente recuperavel?
3. O tempo de resposta pode ficar dentro de uma meta realista?
4. A saida pode ser normalizada para um contrato estavel?
5. O codigo pode ser isolado da UI antiga sem custo absurdo?

Se a resposta for majoritariamente sim, o modulo entra em estabilizacao ou otimizacao.

Se a resposta for majoritariamente nao, o modulo entra em reprojeto ou substituicao.

## Tipos de Teste por Sintoma

### Quando o problema e lentidao

Precisa de:

- benchmark;
- perfil de execucao por etapa;
- medicao com dados reais;
- definicao de meta de tempo;
- decisao objetiva entre otimizar ou reprojetar.

### Quando o problema e erro funcional

Precisa de:

- conjunto de casos validos e invalidos;
- fixtures reais de regressao;
- validacao de schema;
- log estruturado da falha;
- comparacao entre comportamento esperado e observado.

### Quando o problema e desenho ruim ou desatualizado

Precisa de:

- avaliacao de aderencia ao modelo da v2;
- definicao do contrato ideal da funcionalidade;
- separacao entre o que vale reaproveitar e o que nao vale;
- decisao de reprojeto antes da integracao.

## Backlog Inicial de Triagem

## 1. Busca

### Sintoma atual

- o search esta muito lento.

### Classificacao inicial

- Otimizar
- Estabilizar
- Possivel reprojeto parcial de pipeline interno

### O que precisa ser medido

- tempo de pre-processamento;
- tempo de embedding;
- tempo de query SQL;
- tempo de reranking;
- tempo total de resposta;
- taxa de timeout;
- qualidade do top 10 em casos canonicos.

### Testes obrigatorios

- consulta simples com retorno rapido;
- consulta longa;
- consulta com negacao;
- busca semantica pura;
- busca hibrida;
- filtros pesados;
- consulta sem resultados;
- caso com alto volume de resultados.

### Gate tecnico sugerido

- p50 dentro da meta definida;
- p95 dentro de tolerancia aceitavel;
- sem quebra de schema;
- top 10 coerente nos casos canonicos.

### Possiveis causas a investigar

- pre-processamento excessivo;
- embeddings sendo recalculados sem cache;
- query SQL pouco seletiva;
- joins pesados;
- ranking feito em camada errada;
- falta de cache de consulta;
- dependencia de OpenAI no caminho sincrono sem fallback.

### Possiveis saidas

- otimizar query e indices;
- adicionar cache;
- reduzir custo do pipeline sincrono;
- quebrar a busca em estagios;
- mover parte do trabalho para precomputacao.

## 2. Leitura de documentos dos editais

### Sintoma atual

- a leitura dos documentos dos editais esta lenta ou nao esta funcionando corretamente.

### Classificacao inicial

- Estabilizar
- Otimizar
- Reprojetar pipeline de documentos, se necessario

### O que precisa ser separado na medicao

- tempo de descobrir links dos documentos;
- tempo de download;
- tempo de conversao/extracao;
- tempo de resumo;
- taxa de falha por tipo de arquivo;
- taxa de falha por origem;
- tamanho medio dos documentos processados.

### Testes obrigatorios

- edital com PDF simples;
- edital com PDF grande;
- edital com PDF escaneado;
- edital com muitos anexos;
- edital com link quebrado;
- edital sem documento principal claro;
- edital com timeout de origem.

### Gate tecnico sugerido

- identificar corretamente o documento principal quando existir;
- devolver erro tratavel quando nao conseguir ler;
- nao travar a UX em falhas externas;
- ter cache para documentos ja lidos;
- separar falha de download, extracao e resumo.

### Possiveis causas a investigar

- download sincrono demais;
- dependencia de parser fraco para certos PDFs;
- timeout curto ou mal tratado;
- falta de cache de artefatos;
- ausencia de fila/background para documentos pesados;
- mistura de leitura, extracao e resumo em um unico fluxo bloqueante.

### Possiveis saidas

- pipeline em duas etapas: download/extracao e depois resumo;
- cache de documentos processados;
- fila para processamento pesado;
- fallback quando parser principal falhar;
- resposta parcial para a UI enquanto o processamento termina.

## 3. Outros modulos com problemas ainda nao detalhados

### Regra

Todo modulo adicional que o time identificar deve entrar nesta tabela antes de qualquer integracao.

| Modulo | Sintoma | Categoria inicial | Risco | Proximo passo |
| --- | --- | --- | --- | --- |
| Busca | Lento | Otimizar + estabilizar | Alto | Benchmark e perfil por etapa |
| Documentos de editais | Lento ou falhando | Estabilizar + otimizar | Alto | Separar download, extracao e resumo |
| A definir | A definir | A definir | A definir | A definir |

## Roteiro de Execucao Recomendado

Para cada modulo legado problemático, seguir esta ordem:

1. Registrar o sintoma.
2. Classificar como estabilizar, otimizar, reprojetar ou substituir.
3. Definir contrato minimo de entrada e saida.
4. Medir comportamento atual.
5. Montar casos de regressao.
6. Corrigir ou reprojetar fora da UI.
7. Revalidar benchmark e regressao.
8. Liberar para integracao no v2.

## Recomendacao Final

Os problemas que voce citou confirmam que a fase anterior de estrategia estava correta: antes da UI, o legado precisa passar por uma fase de triagem tecnica.

No GovGo, o correto agora e tratar cada modulo em uma fila de homologacao com tres perguntas objetivas:

1. ele ainda serve ao produto?
2. ele pode ser estabilizado com custo razoavel?
3. ele consegue atender a meta de latencia e confiabilidade da v2?

Se a resposta for sim, ele segue para ajuste e integracao.

Se a resposta for nao, ele deve ser reprojetado antes de entrar no v2.