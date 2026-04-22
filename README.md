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

## Homologacao inicial do v1 no v2

O primeiro laboratorio concreto de homologacao foi criado em `homologation/search/`.

Ele traz a Busca do v1 para dentro do v2 por adapter, sem depender da UI Dash.

Comandos previstos:

```powershell
python homologation/search/cmd/run_search.py "alimentacao hospitalar" --search-type hybrid
python homologation/search/cmd/smoke_search.py
python homologation/search/browser/app.py
```

Uso rapido do browser de homologacao:

Diretorio:

`C:\Users\Haroldo Duraes\Desktop\Scripts\GovGo\v2\homologation\search\browser`

Comando:

```powershell
Set-Location "C:\Users\Haroldo Duraes\Desktop\Scripts\GovGo\v2\homologation\search\browser"
python .\app.py
```

Depois abra `http://127.0.0.1:8011`.

Fluxo atual do browser:

1. escreva uma `Consulta base`
2. selecione os modelos que quer comparar na mesma consulta
3. clique em `Comparar modelos`
4. use `Rodar suite simples` para executar os casos-base do laboratorio
5. carregue um `Caso base` quando quiser partir de um teste predefinido

Persistencia dos testes:

- modelos de teste: `homologation/search/tests/models/search_models.json`
- execucoes salvas: `homologation/search/tests/runs/`

Observacao:

- esses comandos dependem de um ambiente Python configurado com as dependencias do core do v1.