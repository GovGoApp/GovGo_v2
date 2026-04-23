src/
  app/                      # frontend shell, boot, router
  pages/                    # páginas reais
  features/                 # features reais da UI
  services/                 # ponte frontend -> backend
    api/
    adapters/
    contracts/

  backend/                  # runtime Python real do produto
    search/
      api/
      core/
      v1_copy/
        gvg_browser/

  devtools/                 # runners, browser testers, smoke tests
    search/
      browser/
      cmd/
      fixtures/
      tests/# Tokens do GovGo v2

Esta pasta recebe a camada canonica de tokens do frontend real.

Fonte principal:

- `design/css/tokens.css`

Arquivos esperados nesta pasta:

- `color.tokens.css`
- `semantic.tokens.css`
- `surface.tokens.css`
- `text.tokens.css`
- `typography.tokens.css`
- `elevation.tokens.css`
- `radius.tokens.css`
- `layout.tokens.css`

Regra:

- valores entram aqui primeiro;
- components e recipes apenas consomem estes tokens;
- nao duplicar os mesmos tokens dentro de `recipes/`.