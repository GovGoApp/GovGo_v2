# GovGo v2

Nova base de trabalho da versao v2 do GovGo.

## Estado atual

- O repositorio foi iniciado como um projeto separado de `GovGo_v1`.
- A base inicial presente hoje esta em `design/`.
- O prototipo atual roda a partir de `design/GovGo v2.html`.
- Os componentes de interface estao em `design/govgo/`.
- `design/` nao e a UI real em producao; ele e a base obrigatoria a partir da qual a UI real deve ser definida.
- Layout, CSS, fontes, paleta, boxes e padroes visuais da aplicacao devem nascer dessa base, sem redesenho paralelo fora dela.

## Objetivo imediato

Organizar a v2 como um repositorio proprio, conectado a `GovGo_v2`, para evoluir do prototipo atual para a nova aplicacao.

Regra central do projeto: tudo no v1 que ainda for util para o funcionamento do produto deve acabar funcionando no v2, seja por reaproveitamento, encapsulamento, reprojeto ou substituicao equivalente.

## Documentacao de migracao

- `docs/DIARIO_DE_BORDO.md`: primeiro documento a ser lido em novos prompts; registra estado atual, fase corrente, prioridades e proximo passo oficial.
- `docs/PLANO_MESTRE_V1_V2.md`: plano central e sequenciado da transicao completa do v1 para o v2.
- `docs/CONVENCAO_ARQUITETURA_FRONTEND.md`: convencao para traduzir `design/` em arquitetura real de frontend sem redesenho paralelo.
- `docs/CHECKLIST_IMPLEMENTACAO_FRONTEND.md`: checklist tecnico para implementar a UI real a partir da base visual definida em `design/`.
- `docs/CRITERIOS_REVISAO_VISUAL.md`: criterios objetivos para revisar PRs e garantir aderencia visual ao design definido em `design/`.
- `docs/DEFINICAO_DE_PRONTO_POR_TELA.md`: gate de aceite para considerar uma tela realmente pronta na v2.
- `docs/ESPECIFICACAO_TELA_INICIO.md`: primeira especificacao de tela real derivada do design atual, usando Inicio como prova de implementacao.
- `docs/ESTRATEGIA_V1_NO_V2.md`: estrategia para transformar o v1 em backend e servicos da v2.
- `docs/MATRIZ_V1_V2.md`: matriz funcional v1 -> v2 com prioridades de migracao.
- `docs/ESTRATEGIA_TESTES_ANTES_UI.md`: estrategia para homologar modulos do v1 antes de conecta-los a interface da v2.
- `docs/TRIAGEM_MODULOS_LEGADOS.md`: backlog de triagem para modulos lentos, quebrados ou que precisem de reprojeto.

## Proximos passos sugeridos

1. Criar o repositorio remoto `GovGo_v2` na organizacao `GovGoApp`.
2. Fazer o primeiro commit desta base inicial.
3. Definir a stack oficial da aplicacao v2.
4. Migrar o prototipo de `design/` para a estrutura definitiva do projeto.