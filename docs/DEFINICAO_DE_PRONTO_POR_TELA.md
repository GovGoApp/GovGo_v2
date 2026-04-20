# Definicao de Pronto por Tela

## Objetivo

Estabelecer quando uma tela da v2 pode ser considerada realmente pronta.

Este documento vale para:

- telas novas;
- telas migradas do prototipo de `design/`;
- telas existentes que estejam trocando mock por backend real;
- telas que recebam novos estados, fluxos ou componentes importantes.

## Regra central

Uma tela nao esta pronta apenas porque funciona.

Ela so esta pronta quando passa ao mesmo tempo por quatro gates:

1. gate visual;
2. gate funcional;
3. gate tecnico;
4. gate de revisao.

O gate visual e obrigatoriamente ancorado em `design/`, que funciona como base de definicao da UI real.

## Gate 1 - Visual

A tela precisa demonstrar aderencia clara ao sistema visual definido em `design/` para a UI real.

Condicoes obrigatorias:

1. existe referencia explicita da tela ou componente em `design/`;
2. o layout principal foi preservado na implementacao real;
3. tipografia, fontes, paleta, boxes, espacamentos, bordas, sombras e raios seguem o padrao existente;
4. nao existe hardcode visual fora do sistema;
5. nao existe CSS local conflitante com a linguagem base;
6. estados normais e tecnicos pertencem ao mesmo sistema visual.

## Gate 2 - Funcional

A tela precisa cumprir seu papel de produto.

Condicoes obrigatorias:

1. os dados corretos aparecem na tela;
2. a navegacao principal e local funciona;
3. os fluxos centrais da tela funcionam de ponta a ponta;
4. a troca de mock por dado real nao quebrou a experiencia;
5. os casos de vazio, loading e erro foram tratados;
6. a tela continua coerente com o modo em que esta inserida.

## Gate 3 - Tecnico

A tela precisa estar implementada de forma sustentavel.

Condicoes obrigatorias:

1. contratos de dados consumidos pela tela estao claros;
2. estados e comportamento nao dependem de improviso visual;
3. nao houve duplicacao evitavel de componente ou estilo;
4. a tela usa o sistema compartilhado quando ele ja existe;
5. a integracao com backend foi validada;
6. nao ha dependencia conhecida que inviabilize a entrega em uso real.

## Gate 4 - Revisao

A tela precisa ser revisavel e aprovavel pelo time.

Condicoes obrigatorias:

1. o PR informa a referencia em `design/`;
2. o PR usa o template de revisao do repositorio;
3. o checklist tecnico de implementacao foi aplicado;
4. os criterios de revisao visual foram usados;
5. ha evidencia suficiente para comparar entrega e referencia;
6. riscos e desvios conhecidos estao declarados.

## Gate obrigatorio de documentacao

Uma tela nao pode ser marcada como pronta sem cumprir estes tres documentos:

1. `docs/CHECKLIST_IMPLEMENTACAO_FRONTEND.md`
2. `docs/CRITERIOS_REVISAO_VISUAL.md`
3. `.github/PULL_REQUEST_TEMPLATE.md`

## Definition of done curta

Uma tela esta pronta quando:

1. e implementada a partir de `design/` e preserva fielmente seu padrao visual;
2. entrega os fluxos funcionais esperados;
3. integra dados reais sem redesenhar a interface;
4. trata estados tecnicos sem quebrar a linguagem visual;
5. passa na revisao tecnica e visual;
6. nao depende de hardcode visual fora do sistema.

## Checklist de pronto por tela

Antes de encerrar uma tela, confirmar:

1. a referencia em `design/` esta registrada como base da implementacao;
2. o layout foi mantido;
3. tipografia, fontes, paleta, boxes e espacamentos seguem o sistema;
4. nao ha hardcode visual indevido;
5. dados reais ou mocks previstos estao corretos;
6. loading, vazio e erro foram tratados;
7. componentes compartilhados foram reaproveitados quando aplicavel;
8. o PR foi preenchido com o template padrao;
9. a revisao visual foi feita;
10. nao existe desvio aberto sem registro.

## Quando a tela nao esta pronta

Nao considerar pronta quando:

- funciona, mas saiu visualmente do padrao;
- consome dado real, mas redesenhou a estrutura para acomodar o backend;
- depende de CSS local improvisado para fechar a composicao;
- nao trata loading, erro ou vazio;
- nao informa referencia de `design/`;
- nao passou por revisao visual objetiva.

## Uso no fluxo do projeto

Este documento deve ser usado:

1. no planejamento da tela;
2. na implementacao;
3. na abertura do PR;
4. na revisao;
5. no aceite final.