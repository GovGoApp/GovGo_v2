# Estrutura Frontend Real do GovGo v2

## Objetivo

Definir a arvore inicial do frontend real da v2 antes da implementacao das paginas.

Esta estrutura parte de duas regras ja fechadas:

- a UI real nao nasce dentro de `design/`;
- a UI real deve ser derivada diretamente de `design/` e de `design/css`.

## Raiz da aplicacao real

O frontend real passa a nascer em `src/`.

`design/` continua sendo a base canonica de referencia visual e de composicao.

## Arvore inicial

```text
src/
  app/
    boot/
    providers/
    router/
    shell/
    styles/
  design-system/
    tokens/
    theme/
    icons/
    primitives/
    recipes/
  pages/
    inicio/
    busca/
    busca-detalhe/
    empresas/
    radar/
    relatorios/
    design-system/
  features/
    inicio/
    busca/
    documentos/
    favoritos/
    historico/
    empresas/
    radar/
    relatorios/
    auth/
    usuario/
  services/
    api/
    adapters/
    contracts/
  assets/
    fonts/
    icons/
    images/
    illustrations/
    logos/
  shared/
    components/
    hooks/
    lib/
    types/
    utils/
  mocks/
    fixtures/
    scenarios/
```

## Papel de cada camada

### `app/`

Infraestrutura da aplicacao.

- `boot/`: entrada real da app, inicializacao de tema, providers e bootstrap.
- `providers/`: providers globais de auth, dados, tema e sessao.
- `router/`: definicao de rotas e composicao por pagina.
- `shell/`: `AppShell`, `TopBar`, `LeftRail` e moldura do workspace.
- `styles/`: CSS global temporario da app real, incluindo a ponte inicial com `design/css/govgo.css`.

### `design-system/`

Camada central da linguagem visual do produto.

- `tokens/`: cores, superficies, tipografia, espacamentos, sombras e raios.
- `theme/`: light mode, dark mode e regras de tema.
- `icons/`: traducao de `design/govgo/icons.jsx`.
- `primitives/`: `Button`, `Card`, `Chip`, `Input`, `Tabs` e demais blocos base.
- `recipes/`: combinacoes visuais repetidas, como hero, cards principais e variantes de status.

### `pages/`

Entradas de rota e composicao final por tela.

- `inicio/`: landing autenticada do workspace.
- `busca/`: tela principal de busca de oportunidades.
- `busca-detalhe/`: detalhe de oportunidade, documentos e contexto.
- `empresas/`: tela derivada do modo hoje representado por `mode_fornecedores.jsx`.
- `radar/`: tela de mercado e sinais.
- `relatorios/`: analise assistida e relatorios.
- `design-system/`: pagina interna de revisao visual e homologacao do sistema de design.

### `features/`

Funcionalidades de negocio reutilizaveis entre paginas.

- `inicio/`: hero, cards de entrada e resumo do dia.
- `busca/`: filtros, listagem, comparacoes e interacoes da busca.
- `documentos/`: leitura, preview, resumo e anexos ligados ao detalhe.
- `favoritos/`: acoes e listagens de itens acompanhados.
- `historico/`: buscas recentes, relatorios recentes e retomadas.
- `empresas/`: modulos de analise de empresa.
- `radar/`: blocos de sinais, movimentos e tendencias.
- `relatorios/`: perguntas, execucao e historico de relatorios.
- `auth/`: login, sessao e guardas de acesso.
- `usuario/`: perfil, preferencias e configuracoes de workspace.

### `services/`

Integracao com backend e transformacao de contratos.

- `api/`: clientes HTTP e funcoes de acesso.
- `adapters/`: adaptacao do backend real para o shape que cada tela espera.
- `contracts/`: contratos de request/response usados pela UI.

### `assets/`

Arquivos visuais e static media da app real.

- `fonts/`: fontes locais quando deixarem de vir apenas por CDN.
- `icons/`: SVGs e arquivos auxiliares de icones.
- `images/`: imagens de conteudo.
- `illustrations/`: ilustracoes de hero, vazio e onboarding.
- `logos/`: marca e variacoes de logotipo.

### `shared/`

Codigo transversal que nao pertence a uma feature especifica.

- `components/`: componentes compartilhados fora do design system base.
- `hooks/`: hooks comuns.
- `lib/`: helpers tecnicos pequenos.
- `types/`: tipos compartilhados.
- `utils/`: utilitarios puros.

### `mocks/`

Base de fixtures e cenarios da UI antes da integracao completa com backend.

- `fixtures/`: dados derivados de `design/govgo/data.jsx`.
- `scenarios/`: estados de tela, loading, vazio e erro.

## Traducao direta de `design/` para `src/`

| Origem | Destino inicial no v2 real | Observacao |
| --- | --- | --- |
| `design/GovGo v2.html` | `src/app/boot/` | bootstrap real da aplicacao |
| `design/css/tokens.css` | `src/design-system/tokens/` | fonte canonica dos tokens |
| `design/css/govgo.css` | `src/app/styles/` e `src/design-system/recipes/` | base global e recipes iniciais |
| `design/govgo/icons.jsx` | `src/design-system/icons/` | linguagem iconografica |
| `design/govgo/primitives.jsx` | `src/design-system/primitives/` | biblioteca base |
| `design/govgo/shell.jsx` | `src/app/shell/` | moldura oficial da app |
| `design/govgo/mode_home.jsx` | `src/pages/inicio/` e `src/features/inicio/` | tela Inicio |
| `design/govgo/mode_busca.jsx` | `src/pages/busca/` e `src/features/busca/` | tela Busca |
| `design/govgo/mode_busca_detail.jsx` | `src/pages/busca-detalhe/` e `src/features/documentos/` | detalhe e documentos |
| `design/govgo/mode_fornecedores.jsx` | `src/pages/empresas/` e `src/features/empresas/` | nomenclatura de produto aprovada |
| `design/govgo/mode_mercado.jsx` | `src/pages/radar/` e `src/features/radar/` | tela Radar |
| `design/govgo/mode_relatorios.jsx` | `src/pages/relatorios/` e `src/features/relatorios/` | tela Relatorios |
| `design/govgo/mode_designsystem.jsx` | `src/pages/design-system/` | pagina interna de referencia |
| `design/govgo/data.jsx` | `src/mocks/fixtures/` e `src/services/adapters/` | mocks e contratos de tela |
| `design/govgo/app.jsx` | `src/app/router/` e `src/app/boot/` | orquestracao real |

## Ordem para pensar as paginas

Depois do scaffold, a sequencia recomendada para desenho de paginas e esta:

1. `inicio/`
2. `busca/`
3. `busca-detalhe/`
4. `empresas/`
5. `relatorios/`
6. `radar/`

## Regra pratica para a proxima etapa

Quando comecarmos a pensar as paginas, a conversa deve seguir sempre este encadeamento:

1. ler o modo correspondente em `design/govgo/`;
2. identificar os tokens e recipes usados em `design/css/`;
3. decompor a pagina em `pages/` e `features/`;
4. so depois pensar em dados e contratos.