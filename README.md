# GovGo v2

Nova base de trabalho da versao v2 do GovGo.

## Estado atual

- O repositorio foi iniciado como um projeto separado de `GovGo_v1`.
- A base inicial presente hoje esta em `design/`.
- O prototipo atual roda a partir de `design/GovGo v2.html`.
- Os componentes de interface estao em `design/govgo/`.

## Objetivo imediato

Organizar a v2 como um repositorio proprio, conectado a `GovGo_v2`, para evoluir do prototipo atual para a nova aplicacao.

## Documentacao de migracao

- `docs/ESTRATEGIA_V1_NO_V2.md`: estrategia para transformar o v1 em backend e servicos da v2.
- `docs/MATRIZ_V1_V2.md`: matriz funcional v1 -> v2 com prioridades de migracao.
- `docs/ESTRATEGIA_TESTES_ANTES_UI.md`: estrategia para homologar modulos do v1 antes de conecta-los a interface da v2.
- `docs/TRIAGEM_MODULOS_LEGADOS.md`: backlog de triagem para modulos lentos, quebrados ou que precisem de reprojeto.

## Proximos passos sugeridos

1. Criar o repositorio remoto `GovGo_v2` na organizacao `GovGoApp`.
2. Fazer o primeiro commit desta base inicial.
3. Definir a stack oficial da aplicacao v2.
4. Migrar o prototipo de `design/` para a estrutura definitiva do projeto.