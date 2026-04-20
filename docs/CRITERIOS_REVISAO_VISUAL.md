# Criterios de Revisao Visual e de Layout

## Objetivo

Criar um criterio de revisao objetivo para garantir que cada tela nova ou migrada continue fiel ao padrao ja definido em `design/`.

Este documento deve ser usado em revisao de PR, homologacao visual e aceite de entrega.

## Regra de aceite

Uma implementacao frontend nao deve ser aprovada apenas porque funciona tecnicamente.

Ela tambem precisa demonstrar aderencia visual ao que ja esta pre-pronto em `design/`.

## Pergunta principal de revisao

Esta tela foi implementada como extensao do design existente ou foi redesenhada em paralelo?

Se a resposta estiver mais perto de "redesenhada em paralelo", a entrega deve voltar para ajuste.

## Criterios obrigatorios de revisao

## 1. Referencia de origem identificada

O PR ou entrega precisa informar qual arquivo ou conjunto de arquivos em `design/` serviu de referencia.

Reprova se:

- nao houver referencia clara;
- a implementacao parecer ter sido feita por interpretacao livre;
- a tela nova nao mostrar relacao objetiva com o design base.

## 2. Estrutura de layout preservada

Verificar:

- hierarquia geral da tela;
- grid e distribuicao dos blocos;
- relacao entre trilhos, paineis, cards e areas principais;
- comportamento responsivo coerente com o padrao.

Reprova se:

- a tela mudar a composicao sem motivo aprovado;
- o layout final perder a linguagem estrutural do design;
- blocos principais forem reorganizados por conveniencia tecnica.

## 3. Tipografia e fontes preservadas

Verificar:

- familia tipografica;
- tamanho;
- peso;
- altura de linha;
- hierarquia de titulos e texto auxiliar.

Reprova se:

- houver hardcode tipografico fora do padrao;
- a hierarquia visual do texto mudar sem justificativa de design;
- a tela adotar fonte diferente da referencia.

## 4. Paleta e superficies preservadas

Verificar:

- cores de fundo;
- cores de texto;
- superficies;
- linhas, bordas e divisores;
- uso de destaque e contraste.

Reprova se:

- a tela usar cores novas sem entrar antes no sistema visual;
- houver tons arbitrarios aplicados por componente;
- contraste e leitura quebrarem o padrao original.

## 5. Boxes, cards e containers preservados

Verificar:

- raios;
- bordas;
- sombras;
- padding;
- espacamento interno;
- relacao entre card e contexto da tela.

Reprova se:

- surgirem variantes nao previstas so para resolver detalhe local;
- o componente visual parecer de outro sistema;
- containers forem recriados com medidas e estilo arbitrarios.

## 6. Espacamento e densidade visual preservados

Verificar:

- margens;
- gaps;
- alturas de bloco;
- ritmo de leitura;
- equilibrio entre cheio e vazio.

Reprova se:

- a tela ficar mais densa ou mais solta sem criterio de sistema;
- o alinhamento geral parecer quebrado;
- o ritmo da composicao divergir da referencia.

## 7. Estados da interface coerentes com o sistema

Verificar:

- loading;
- vazio;
- erro;
- sucesso;
- destaque de selecao;
- hover e foco, quando aplicavel.

Reprova se:

- esses estados forem resolvidos com componentes improvisados;
- a linguagem visual dos estados nao conversar com a tela original;
- houver mudanca de tom visual entre estado normal e estado tecnico.

## 8. Ausencia de hardcode visual indevido

Verificar:

- cores escritas direto no componente;
- medidas arbitrarias sem relacao com o sistema;
- estilos inline que definem identidade visual;
- CSS duplicado com regra ja existente.

Reprova se:

- a implementacao depender de valores locais para parecer correta;
- o componente so funcionar visualmente por override pontual;
- houver divergencia entre o design system e o CSS usado na tela.

## 9. Separacao correta entre visual e dados

Verificar:

- troca de mock por dado real sem redesenho;
- estados tecnicos nao alterando a identidade visual;
- contratos de API nao comandando layout por improviso.

Reprova se:

- a mudanca de backend tiver provocado mudanca de design;
- o componente tiver sido redesenhado para acomodar dados sem passar pelo sistema visual;
- a camada tecnica tiver ditado a camada de forma.

## 10. Consistencia com telas irmas

Verificar:

- semelhanca com outras telas do mesmo shell;
- padrao de navegacao local;
- comportamento de cards, tabelas e paineis similares;
- coerencia de tom visual no conjunto da aplicacao.

Reprova se:

- a nova tela parecer de outro produto;
- a tela fugir da linguagem do restante da v2;
- a mesma solucao visual aparecer implementada de formas diferentes.

## Decisao de revisao

### Aprovar

Quando a entrega respeita o design base e so troca a camada tecnica ou de dados.

### Ajustar

Quando a entrega funciona, mas cria desvios locais de layout, estilo ou componente.

### Bloquear

Quando a implementacao introduz hardcode visual, redesenho paralelo ou quebra do sistema.

## Checklist curto para PR

Antes de aprovar, confirmar:

1. a referencia em `design/` foi indicada;
2. o layout permaneceu fiel ao original;
3. nao ha hardcode visual fora do padrao;
4. tipografia, paleta e boxes seguem o sistema;
5. estados tecnicos respeitam a mesma linguagem visual;
6. nao houve redesenho indevido por causa do backend.