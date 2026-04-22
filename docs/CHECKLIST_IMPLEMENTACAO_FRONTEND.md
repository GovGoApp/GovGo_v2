# Checklist Tecnico de Implementacao Frontend

## Objetivo

Transformar a regra visual da v2 em rotina tecnica de implementacao.

Este documento deve ser usado sempre que uma tela, componente, fluxo ou migracao do prototipo de `design/` for levada para a aplicacao final.

Este checklist e gate obrigatorio da definicao de pronto descrita em `docs/DEFINICAO_DE_PRONTO_POR_TELA.md`.

Para a traducao de `design/` para a arquitetura real da app, ver tambem `docs/CONVENCAO_ARQUITETURA_FRONTEND.md`.

## Regra central

O conteudo de `design/` e a base obrigatoria de definicao da camada visual da v2.

Ele nao e a UI real em producao, mas a UI real deve ser definida integralmente a partir dele.

Isso significa que a implementacao final deve traduzir, preservar e seguir o padrao ja definido ali para:

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

O codigo final pode ter outra organizacao de componentes, outra estrutura de arquivos e outra camada tecnica.

O que nao pode acontecer e a interface ser redefinida visualmente fora do que `design/` estabelece.

Isso vale tambem para paginas internas de homologacao, laboratorios e bancadas de teste.

Mesmo quando a tela for operacional ou temporaria, ela deve seguir a mesma linguagem de layout, tipografia, fontes, organizacao e densidade visual derivada de `design/`.

Regra adicional para esse tipo de pagina:

- a interface deve falar a linguagem do usuario e da tarefa que ele esta executando;
- termos tecnicos de implementacao como `fixture`, `bootstrap`, `core ativo`, caminhos internos, JSON bruto e detalhes operacionais equivalentes nao devem aparecer como bloco principal da UI;
- esses detalhes podem existir em logs, arquivos salvos, rotas auxiliares ou diagnosticos, mas nao como texto dominante da pagina.

## Checklist antes de implementar

1. Identificar qual arquivo em `design/` e a referencia exata da tela ou do componente.
2. Confirmar quais estilos, tokens, primitives e estruturas ja existem nessa referencia.
3. Mapear o que e regra visual e o que e dado mock.
4. Separar claramente a camada visual da camada de dados.
5. Verificar como a stack real vai transpor esse padrao sem inventar variantes locais.

## Checklist durante a implementacao

1. Levar a estrutura visual da tela sem alterar a hierarquia principal de layout.
2. Transpor para a stack real o mesmo padrao de tokens, variaveis, primitives, proporcoes e estruturas sempre que isso ja estiver definido no design.
3. Substituir apenas os dados mock por dados reais, sem redesenhar a interface no processo.
4. Manter tipografia, pesos, tamanhos, alinhamentos e ritmo visual conforme a referencia.
5. Manter paleta, superficies, contraste, bordas, sombras e raios conforme a referencia.
6. Manter boxes, cards, tabelas, trilhos, paineis e modais no mesmo padrao estrutural.
7. Preservar espacamentos, respiros e densidade visual da composicao original.
8. Usar componentes compartilhados quando a mesma solucao visual aparecer em mais de um ponto.
9. Encapsular comportamento e dados sem duplicar definicoes visuais.
10. Se um valor visual nao existir no padrao atual, nao inventar localmente; primeiro promover esse valor ao sistema de design.
11. Em paginas de homologacao e teste, expor os fluxos como acoes de usuario reais, e nao como jargao tecnico de implementacao.

## Proibicoes explicitas

Nao fazer:

- hardcode de cor fora dos tokens ou variaveis do sistema visual;
- hardcode de fonte, tamanho, peso ou line-height fora do padrao;
- criar cards, boxes ou containers com medidas arbitrarias sem referencia em `design/`;
- trocar espacamento, raio, sombra ou borda por preferencia local;
- recriar a tela por interpretacao livre, sem partir da base definida em `design/`;
- duplicar CSS equivalente em outro lugar se a regra ja existe no design;
- usar em destaque na interface termos internos como `fixture`, `bootstrap`, `core`, paths locais ou JSON bruto quando isso nao for a tarefa principal do usuario;
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
2. o layout principal da referencia foi preservado na implementacao real;
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

Na abertura do PR, ele deve ser refletido tambem no template de revisao em `.github/PULL_REQUEST_TEMPLATE.md`.