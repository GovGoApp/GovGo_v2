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

2026-04-20

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

## Fase atual do projeto

### Fase macro

Fase 0 de preparacao da migracao.

### Estado real atual

Ainda estamos em documentacao, consolidacao de regras e definicao de como executar.

Ainda nao foi iniciada a implementacao real do frontend nem a homologacao tecnica operacional dos modulos do v1.

## Prioridades imediatas

As proximas prioridades concretas sao estas:

1. iniciar a homologacao do v1 pelos modulos de Busca e Documentos;
2. definir a stack real do frontend do v2;
3. montar a estrutura real do frontend;
4. implementar o shell real da aplicacao;
5. implementar a tela Inicio real a partir da especificacao ja criada.

## Ordem pratica que deve ser seguida agora

Se a retomada acontecer em um novo prompt, a IA deve continuar nesta ordem:

1. homologacao de Busca do v1;
2. homologacao de Documentos do v1;
3. definicao da stack e estrutura do frontend real;
4. implementacao do shell real;
5. implementacao da tela Inicio;
6. depois avancar para Busca real com backend.

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

## O que ainda falta iniciar de verdade

- homologacao operacional do Search do v1;
- homologacao operacional de Documentos do v1;
- definicao da stack final do frontend;
- estrutura real do frontend no repositorio;
- implementacao real do shell;
- implementacao real da tela Inicio;
- integracao real do primeiro modulo do v1.

## Proximo passo oficial

O proximo passo oficial do projeto e:

montar o plano operacional de homologacao do modulo de Busca do v1.

Logo em seguida:

montar o plano operacional de homologacao do modulo de Documentos do v1.

## Regra de atualizacao deste diario

Sempre que houver novidade relevante, atualizar pelo menos estes blocos:

1. data da ultima consolidacao;
2. fase atual;
3. prioridades imediatas;
4. proximo passo oficial;
5. resumo do que mudou.

## Resumo do que mudou nesta consolidacao

- foi definido que este diario e o ponto oficial de retomada em novos prompts;
- foi consolidado que tudo no v1 que ainda for util deve acabar funcionando no v2;
- foi consolidado que `design/` define a UI real, mas nao e a UI de producao em si;
- foi fixada a prioridade imediata de homologar Busca e Documentos antes da integracao com frontend.