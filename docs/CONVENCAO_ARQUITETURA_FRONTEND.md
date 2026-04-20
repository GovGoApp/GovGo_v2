# Convencao de Arquitetura Frontend Derivada de design/

## Objetivo

Definir como a pasta `design/` deve ser traduzida para a arquitetura real do frontend da v2.

Este documento existe para evitar dois erros opostos:

1. tratar `design/` como se ja fosse a UI de producao;
2. ignorar `design/` e redesenhar a aplicacao por interpretacao livre.

## Principio central

`design/` e a base canonica que define a UI real.

A UI real da aplicacao pode viver em outra estrutura de codigo, com outra organizacao de componentes, roteamento, estado e integracao.

Mas ela deve ser derivada integralmente do que `design/` ja estabelece para:

- layout;
- shell;
- tipografia;
- fontes;
- tokens de cor e superficie;
- composicao de componentes;
- densidade visual;
- hierarquia de informacao;
- comportamento visual.

## Leitura estrutural do design atual

Hoje, `design/` ja esta organizado em camadas que podem ser traduzidas para a stack real.

| Origem em design/ | Papel | Destino esperado na app real |
| --- | --- | --- |
| `design/GovGo v2.html` | bootstrap de pagina, fontes, ordem de carga, inicializacao de tema | bootstrap real da aplicacao |
| `design/govgo/tokens.css` | sistema visual base | camada central de tokens e theme |
| `design/govgo/primitives.jsx` | receitas de primitives | biblioteca de componentes base |
| `design/govgo/icons.jsx` | linguagem iconografica | modulo de icones do design system |
| `design/govgo/shell.jsx` | contrato estrutural do shell | `AppShell`, `TopBar`, `LeftRail` e trilhos auxiliares |
| `design/govgo/mode_*.jsx` | composicao das telas e modos | paginas e componentes de feature |
| `design/govgo/data.jsx` | fixtures e cenarios de mock | fixtures de teste, story states e contratos de referencia |
| `design/govgo/app.jsx` | orquestracao de modo e encaixe da UI | composicao do shell, roteamento e bootstrap da app |

## O que isso significa na pratica

### `design/` nao e a app final

O codigo de `design/` pode continuar sendo um prototipo navegavel, com inline styles, mocks e carregamento simples por HTML.

### A app final nao nasce do zero

A app final precisa ser implementada em cima das decisoes visuais e estruturais ja fixadas nesse prototipo.

## Regra de traducao para a stack real

Cada camada do design deve ser promovida para uma camada equivalente na aplicacao real.

### 1. Tokens

Tudo que esta em `design/govgo/tokens.css` deve virar a fonte central do sistema visual real.

Isso inclui:

- cores de marca;
- superficies;
- textos;
- fontes;
- sombras;
- raios;
- tema claro/escuro.

Regra:

- a app real nao deve redefinir esses valores por pagina;
- se um valor novo for necessario, ele deve entrar na camada central de tokens antes de aparecer em uma tela.

### 2. Primitives

Receitas hoje descritas em `primitives.jsx` devem virar componentes reais reutilizaveis.

Exemplos:

- `Button`
- `Chip`
- `Input`
- `Card`
- `Tabs`
- `Collapsible`
- `SectionHead`

Regra:

- a app real pode reimplementar esses componentes com tipagem, testes e estrutura propria;
- o contrato visual e comportamental deles deve continuar vindo do design.

### 3. Shell

O shell descrito em `shell.jsx` deve virar a moldura oficial da aplicacao real.

Isso inclui:

- `TopBar`;
- `LeftRail`;
- regioes de conteudo;
- trilhos auxiliares por modo, quando aplicavel.

Regra:

- a implementacao real pode mudar a engenharia do shell;
- nao pode mudar sua linguagem estrutural sem revisao de design.

### 4. Modos e paginas

Cada `mode_*.jsx` deve ser tratado como especificacao de composicao da respectiva tela real.

Em outras palavras:

- `mode_home.jsx` define a base da tela Inicio;
- `mode_oportunidades.jsx` define a base da tela Busca;
- `mode_fornecedores.jsx` define a base da tela Empresas;
- `mode_mercado.jsx` define a base da tela Radar;
- `mode_relatorios.jsx` define a base da tela Relatorios.

Regra:

- a pagina real pode ser decomposta em componentes menores;
- a decomposicao nao autoriza redesenho visual paralelo.

### 5. Dados mock

`data.jsx` nao e o backend real.

Ele deve ser usado como:

- referencia de composicao;
- fixture de teste;
- base para estados de story e homologacao;
- apoio para modelar contratos de tela.

Regra:

- o backend real pode ter contratos internos diferentes;
- a camada de adaptacao do frontend deve moldar o dado real para a composicao que a tela espera.

## Como lidar com valores literais existentes no design

Alguns arquivos de `design/` contem valores visuais literais dentro da propria composicao, como:

- gradientes;
- tamanhos especificos;
- opacidades;
- estados decorativos;
- combinacoes locais de cor.

Na app real, esses valores nao devem ser espalhados novamente por hardcode local.

Eles devem seguir esta ordem:

1. identificar se o valor e uma decisao visual real ou apenas um detalhe do prototipo;
2. se for decisao visual real, promover para token, recipe ou variant central;
3. so depois consumir isso na pagina implementada.

Exemplo direto:

- se o hero da tela Inicio usa um gradiente especifico no design, a app real deve transformar isso em uma recipe nomeada do sistema, e nao repetir as cores inline em varios pontos.

## Estrutura-alvo recomendada

Os nomes exatos podem variar, mas a separacao recomendada e esta:

```text
src/
  app/
    shell/
      AppShell.tsx
      TopBar.tsx
      LeftRail.tsx
  design-system/
    tokens/
    theme/
    icons/
    primitives/
    recipes/
  features/
    home/
    busca/
    empresas/
    radar/
    relatorios/
  services/
    api/
    adapters/
  mocks/
    fixtures/
```

O importante nao e o nome das pastas. O importante e manter clara a separacao entre:

- sistema visual;
- shell;
- features;
- integracao de dados;
- mocks de teste.

## O que pode mudar na app real

- estrutura de arquivos;
- divisao de componentes;
- roteamento;
- estrategia de estado;
- camada de fetch e cache;
- contratos internos com backend;
- uso de TypeScript ou outra organizacao moderna.

## O que nao pode mudar sem revisao explicita

- identidade visual;
- hierarquia principal de layout;
- sistema de tipografia;
- paleta e superficies;
- boxes, cards, paineis e trilhos;
- densidade visual;
- comportamento visual principal dos componentes.

## Fluxo recomendado de migracao por tela

1. identificar os arquivos-fonte em `design/`;
2. separar tokens, shell, primitives, composicao e mocks;
3. definir a arvore real de componentes da tela;
4. definir o contrato de dados da tela real;
5. promover valores visuais literais para tokens ou recipes quando necessario;
6. implementar a tela real;
7. revisar contra a base de `design/`;
8. validar com o checklist e a definicao de pronto.

## Ordem de traducao recomendada

1. extrair tokens e tema;
2. extrair primitives;
3. implementar o shell real;
4. implementar a tela Inicio;
5. implementar Busca;
6. implementar Empresas;
7. implementar Relatorios;
8. implementar Radar.

## Documentos que trabalham juntos

- `docs/CHECKLIST_IMPLEMENTACAO_FRONTEND.md`
- `docs/CRITERIOS_REVISAO_VISUAL.md`
- `docs/DEFINICAO_DE_PRONTO_POR_TELA.md`
- `docs/ESPECIFICACAO_TELA_INICIO.md`

## Regra final

O frontend real da v2 deve ser uma implementacao derivada de `design/`.

Nem copia literal do prototipo.

Nem redesenho paralelo.

A regra correta e: traduzir `design/` para a stack real sem perder a linguagem do produto.