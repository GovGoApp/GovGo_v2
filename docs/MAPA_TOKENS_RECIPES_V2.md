# Mapa de Tokens e Recipes do GovGo v2

## Objetivo

Transformar a base visual atual em um mapa operacional para a implementacao real do frontend.

Este documento parte de duas fontes canonicas:

- `design/css/tokens.css`
- `design/css/govgo.css`

Regra pratica:

- `tokens.css` e a fonte de verdade dos tokens;
- `govgo.css` e a fonte de verdade das recipes, layouts e utilitarios;
- na migracao para `src/`, os tokens nao devem continuar duplicados dentro do arquivo de recipes.

## Leitura correta das duas fontes

### `design/css/tokens.css`

Este arquivo define a semantica base do sistema visual:

- brand;
- semantic colors;
- superficies e textos;
- fontes;
- elevacao;
- raios;
- dark mode.

Tambem contem um bloco pequeno de utilitarios de tipografia e scrollbar, mas isso nao muda o papel principal do arquivo: ele e a camada de token.

### `design/css/govgo.css`

Este arquivo hoje mistura quatro coisas:

1. duplicacao dos tokens;
2. reset e base global;
3. recipes de layout e componentes;
4. utilitarios e responsividade.

Na app real, essa mistura deve ser separada.

## Mapa de tokens canonicos

### 1. Brand tokens

Origem: `design/css/tokens.css`

- `--orange`, `--orange-600`, `--orange-700`, `--orange-50`, `--orange-100`
- `--deep-blue`, `--deep-blue-ink`, `--nav-bg`, `--code-bg`, `--nav-blue`, `--blue-50`, `--blue-100`, `--blue-200`

Destino no v2 real:

- `src/design-system/tokens/color.tokens.css`

Uso principal:

- CTA principal;
- identidade da navegacao;
- estados de destaque;
- acentos de shell e busca.

### 2. Semantic status tokens

Origem: `design/css/tokens.css`

- `--green`, `--green-50`, `--green-100`
- `--risk`, `--risk-50`

Destino no v2 real:

- `src/design-system/tokens/semantic.tokens.css`

Uso principal:

- sucesso;
- risco;
- delta positivo e negativo;
- badges, chips e callouts de estado.

### 3. Surface and text tokens

Origem: `design/css/tokens.css`

- `--paper`, `--workspace`, `--surface-sunk`, `--rail`, `--hairline`, `--hairline-soft`, `--divider`
- `--ink-1`, `--ink-2`, `--ink-3`, `--ink-4`

Destino no v2 real:

- `src/design-system/tokens/surface.tokens.css`
- `src/design-system/tokens/text.tokens.css`

Uso principal:

- superfices da app;
- trilhos;
- cards;
- inputs;
- hierarquia de texto.

### 4. Typography tokens

Origem: `design/css/tokens.css`

- `--font-display`
- `--font-body`
- `--font-mono`

Destino no v2 real:

- `src/design-system/tokens/typography.tokens.css`

Uso principal:

- headings;
- body;
- dados numericos e tecnicos.

### 5. Elevation and focus tokens

Origem: `design/css/tokens.css`

- `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- `--ring-focus`

Destino no v2 real:

- `src/design-system/tokens/elevation.tokens.css`

Uso principal:

- profundidade de componentes;
- foco acessivel;
- sobreposicoes.

### 6. Radius tokens

Origem: `design/css/tokens.css`

- `--r-xs`, `--r-sm`, `--r-md`, `--r-lg`, `--r-xl`, `--r-pill`

Destino no v2 real:

- `src/design-system/tokens/radius.tokens.css`

Uso principal:

- inputs;
- cards;
- pills;
- modais;
- containers.

### 7. Layout tokens

Origem: `design/css/govgo.css`

- `--s-1`, `--s-2`, `--s-3`, `--s-4`, `--s-5`, `--s-6`, `--s-8`, `--s-10`
- `--left-rail-w`, `--topbar-h`, `--search-rail-w`, `--activity-rail-w`, `--activity-rail-collapsed`

Destino no v2 real:

- `src/design-system/tokens/layout.tokens.css`

Uso principal:

- grid do shell;
- largura dos trilhos;
- escala de espacamento.

### 8. Theme tokens

Origem: `design/css/tokens.css` e `design/css/govgo.css`

O dark mode hoje espelha a mesma taxonomia do light mode com overrides em `[data-theme="dark"]`.

Destino no v2 real:

- `src/design-system/theme/light.css`
- `src/design-system/theme/dark.css`

Regra:

- manter os mesmos nomes de token;
- trocar apenas os valores por tema.

## O que nao e token

Os itens abaixo nao devem ficar na camada de tokens:

- `.mono`, `.display`, `.gg-display`, `.gg-mono`, `.gg-tabular`;
- regras de scrollbar;
- reset global;
- media queries;
- classes utilitarias de margem, padding, flex e texto.

Esses itens devem ir para:

- `src/app/styles/base.css`
- `src/app/styles/utilities.css`

## Mapa de recipes por familia

### 1. Shell recipes

Origem principal: `design/css/govgo.css`

- `.gg-app`
- `.gg-app--with-search-rail`
- `.gg-app--with-activity-rail`
- `.gg-app--activity-collapsed`
- `.gg-app--full`
- `.gg-topbar*`
- `.gg-rail*`
- `.gg-search-rail*`
- `.gg-activity-rail*`
- `.gg-main*`

Destino no v2 real:

- `src/app/shell/`
- `src/design-system/recipes/shell.recipe.css`

Papel:

- definir a moldura do produto;
- sustentar navegacao, topbar e trilhos laterais.

### 2. Typography and surface recipes

Origem principal: `design/css/govgo.css`

- `.gg-h1`, `.gg-h2`, `.gg-h3`, `.gg-h4`
- `.gg-eyebrow`, `.gg-label`, `.gg-body`, `.gg-body-sm`, `.gg-caption`
- `.gg-surface`

Destino no v2 real:

- `src/design-system/recipes/typography.recipe.css`
- `src/design-system/recipes/surface.recipe.css`

Papel:

- aplicar os tokens como linguagem reutilizavel.

### 3. Primitive recipes

Origem principal: `design/css/govgo.css`

- `.gg-btn*`
- `.gg-iconbtn*`
- `.gg-chip*`
- `.gg-input*`
- `.gg-kbd`
- `.gg-card*`
- `.gg-tabs*`
- `.gg-collapsible*`
- `.gg-badge*`
- `.gg-dot*`

Destino no v2 real:

- `src/design-system/primitives/`
- `src/design-system/recipes/button.recipe.css`
- `src/design-system/recipes/chip.recipe.css`
- `src/design-system/recipes/input.recipe.css`
- `src/design-system/recipes/card.recipe.css`
- `src/design-system/recipes/tabs.recipe.css`

Papel:

- blocos base da interface.

### 4. Data-display recipes

Origem principal: `design/css/govgo.css`

- `.gg-kpi*`
- `.gg-barrow*`
- `.gg-score*`
- `.gg-table*`
- `.gg-result*`
- `.gg-dotlabel`

Destino no v2 real:

- `src/design-system/recipes/kpi.recipe.css`
- `src/design-system/recipes/table.recipe.css`
- `src/design-system/recipes/result.recipe.css`

Papel:

- exibir numeros, tabelas, cards de resultado e comparacoes.

### 5. Feedback and state recipes

Origem principal: `design/css/govgo.css`

- `.gg-callout*`
- `.gg-empty*`
- `.gg-skeleton`
- `.gg-toast`
- `.gg-modal*`
- `.gg-divider*`

Destino no v2 real:

- `src/design-system/recipes/feedback.recipe.css`
- `src/design-system/recipes/overlay.recipe.css`

Papel:

- estados de loading, vazio, alerta e sobreposicao.

### 6. Search and command recipes

Origem principal: `design/css/govgo.css`

- `.gg-modesearch*`
- `.gg-cmdbar*`

Destino no v2 real:

- `src/design-system/recipes/search.recipe.css`

Papel:

- barra principal de busca por modo;
- entrada central de comando ou IA.

### 7. Mode-specific layout helpers

Origem principal: `design/css/govgo.css`

- `.gg-home-grid`
- `.gg-busca-split`
- `.gg-empresas-split`
- `.gg-kpi-strip`
- `.gg-relatorios-split`
- `.gg-terminal`

Destino no v2 real:

- `src/pages/inicio/InicioPage.css`
- `src/pages/busca/BuscaPage.css`
- `src/pages/empresas/EmpresasPage.css`
- `src/pages/relatorios/RelatoriosPage.css`
- `src/features/inicio/`
- `src/features/busca/`
- `src/features/relatorios/`

Regra:

- esses helpers nao devem virar token;
- eles tambem nao devem ficar todos como recipe global se forem de uso estritamente de pagina.

## Separacao recomendada ao portar `govgo.css`

### Vai para `src/design-system/`

- recipes de componente;
- recipes de shell;
- typography recipes reutilizaveis;
- surface recipes reutilizaveis.

### Vai para `src/app/styles/`

- reset global;
- base do `body` e `html`;
- scrollbar;
- utilitarios;
- responsive global;
- print styles.

### Vai para `src/pages/` ou `src/features/`

- helpers de grid e split que pertencem a uma pagina especifica;
- ajustes estruturais de hero, paines e composicoes locais.

## Estrutura de arquivos recomendada agora

```text
src/
  app/
    styles/
      base.css
      utilities.css
      responsive.css
      print.css
  design-system/
    tokens/
      color.tokens.css
      semantic.tokens.css
      surface.tokens.css
      text.tokens.css
      typography.tokens.css
      elevation.tokens.css
      radius.tokens.css
      layout.tokens.css
    theme/
      light.css
      dark.css
    recipes/
      shell.recipe.css
      typography.recipe.css
      surface.recipe.css
      button.recipe.css
      chip.recipe.css
      input.recipe.css
      card.recipe.css
      kpi.recipe.css
      table.recipe.css
      feedback.recipe.css
      overlay.recipe.css
      search.recipe.css
      result.recipe.css
```

## Decisoes praticas para a migracao

1. `design/css/tokens.css` deve ser a fonte de verdade para valores; ao portar, remover a duplicacao de tokens de `govgo.css`.
2. Manter o prefixo `gg-` na primeira migracao reduz risco de drift visual e facilita comparacao com o prototipo.
3. Utilities devem ser tratados como camada separada, nao como primitives.
4. Helpers especificos de pagina devem sair do global assim que a pagina correspondente nascer em `src/pages/`.
5. O shell deve ser migrado antes das paginas, porque varias recipes dependem dos layout tokens e das regioes `topbar`, `rail`, `search`, `main` e `activity`.

## Proximo uso deste mapa

Quando formos pensar as paginas, a sequencia recomendada e:

1. ler o `mode_*.jsx` correspondente;
2. identificar quais tokens esse modo usa;
3. identificar quais recipes globais ele consome;
4. separar o que e global e o que e especifico da pagina;
5. desenhar a decomposicao da pagina em `pages/` e `features/`.

## Primeira pagina recomendada

Com este mapa pronto, a melhor proxima pagina para decompor e `Inicio`, partindo de:

- `design/govgo/mode_home.jsx`
- `design/govgo/shell.jsx`
- `design/css/tokens.css`
- `design/css/govgo.css`