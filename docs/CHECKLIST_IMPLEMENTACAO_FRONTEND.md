# Checklist Tecnico de Implementacao Frontend

## Objetivo

Transformar a regra visual da v2 em rotina tecnica de implementacao.

Este documento deve ser usado sempre que uma tela, componente, fluxo ou migracao do prototipo de `design/` for levada para a aplicacao final.

## Regra central

O conteudo de `design/` e a fonte obrigatoria da camada visual da v2.

Isso significa que a implementacao final deve carregar, preservar e seguir o padrao ja definido ali para:

- layout;
- CSS;
- tokens visuais;
- tipografia;
- fontes;
- paleta de cores;
- boxes, cards e containers;
- espacamentos;
- bordas, sombras e raios;
- composicao e hierarquia visual.

Nada disso deve ser recriado por hardcode local fora do padrao definido em `design/`.

## Checklist antes de implementar

1. Identificar qual arquivo em `design/` e a referencia exata da tela ou do componente.
2. Confirmar quais estilos, tokens, primitives e estruturas ja existem nessa referencia.
3. Mapear o que e regra visual e o que e dado mock.
4. Separar claramente a camada visual da camada de dados.
5. Verificar se a implementacao nova consegue reutilizar o mesmo padrao sem inventar variantes locais.

## Checklist durante a implementacao

1. Levar a estrutura visual da tela sem alterar a hierarquia principal de layout.
2. Reutilizar o mesmo padrao de classes, tokens, variaveis e primitives sempre que isso ja existir no design.
3. Substituir apenas os dados mock por dados reais, sem redesenhar a interface no processo.
4. Manter tipografia, pesos, tamanhos, alinhamentos e ritmo visual conforme a referencia.
5. Manter paleta, superficies, contraste, bordas, sombras e raios conforme a referencia.
6. Manter boxes, cards, tabelas, trilhos, paineis e modais no mesmo padrao estrutural.
7. Preservar espacamentos, respiros e densidade visual da composicao original.
8. Usar componentes compartilhados quando a mesma solucao visual aparecer em mais de um ponto.
9. Encapsular comportamento e dados sem duplicar definicoes visuais.
10. Se um valor visual nao existir no padrao atual, nao hardcodar; primeiro promover esse valor ao sistema de design.

## Proibicoes explicitas

Nao fazer:

- hardcode de cor fora dos tokens ou variaveis do sistema visual;
- hardcode de fonte, tamanho, peso ou line-height fora do padrao;
- criar cards, boxes ou containers com medidas arbitrarias sem referencia em `design/`;
- trocar espacamento, raio, sombra ou borda por preferencia local;
- recriar a tela com outro layout so porque os dados reais mudaram;
- duplicar CSS equivalente em outro lugar se a regra ja existe no design;
- introduzir biblioteca visual ou tema paralelo que brigue com o padrao existente.

## Regra para novos componentes

Se uma necessidade visual realmente nao existir em `design/`, seguir esta ordem:

1. validar que e uma necessidade nova de produto e nao apenas uma preferencia de implementacao;
2. definir como o novo elemento se encaixa no sistema visual atual;
3. registrar o novo padrao no proprio design system da v2;
4. so depois usar esse padrao na implementacao.

Em resumo: primeiro o padrao, depois o uso.

## Separacao correta de responsabilidades

### Pode mudar durante a migracao

- origem dos dados;
- contratos de API;
- fluxo de estado;
- tratamento de loading, erro e cache;
- integracao com backend;
- adaptacao de comportamento tecnico.

### Nao deve mudar sem revisao explicita do design

- estrutura principal do layout;
- identidade visual;
- tokens de estilo;
- fontes e tipografia;
- paleta e superficies;
- boxes, cards, trilhos, paineis e containers;
- padrao de composicao visual.

## Checklist de pronto para cada tela

Uma tela so e considerada pronta quando:

1. a referencia de `design/` esta identificada;
2. o layout principal da referencia foi preservado;
3. os valores visuais vieram do sistema existente, e nao de hardcode local;
4. os dados mock foram substituidos sem alterar o padrao visual;
5. estados de loading, vazio e erro respeitam a mesma linguagem visual;
6. componentes compartilhados foram reaproveitados quando aplicavel;
7. nao existe CSS paralelo conflitante com o design base;
8. a tela passa pelo checklist de revisao visual.

## Uso recomendado no projeto

Este checklist deve ser aplicado em tres momentos:

1. antes de iniciar a implementacao de uma tela;
2. durante a revisao do PR;
3. antes de considerar a migracao concluida.