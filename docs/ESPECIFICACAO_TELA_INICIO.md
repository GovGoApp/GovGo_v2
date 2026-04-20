# Especificacao da Tela Inicio

## Objetivo

Definir a primeira tela real da v2 a ser implementada a partir da base existente em `design/`.

Esta especificacao usa a tela atualmente representada por `mode_home.jsx` como base visual e estrutural da tela Inicio do produto.

## Papel da tela no produto

Inicio e a porta de entrada do workspace.

Ela precisa cumprir quatro funcoes ao mesmo tempo:

1. orientar o usuario para os modos principais;
2. resumir o que exige atencao no dia;
3. expor artefatos recentes do usuario;
4. acelerar a ida para Busca e Relatorios.

## Referencias obrigatorias em design/

- `design/govgo/mode_home.jsx`
- `design/govgo/shell.jsx`
- `design/govgo/primitives.jsx`
- `design/govgo/tokens.css`
- `design/govgo/data.jsx`
- `design/govgo/app.jsx`
- `design/GovGo v2.html`

## Alinhamento de nomenclatura

A base visual vem de `mode_home.jsx`, mas a nomenclatura de produto deve seguir a decisao aprovada:

- Inicio
- Busca
- Empresas
- Radar
- Relatorios

Se algum texto no prototipo ainda refletir nomes antigos, a implementacao real deve preservar a estrutura visual, mas aplicar a nomenclatura oficial do produto.

## Posicao da tela na arquitetura real

### Rota ou entrada

A tela Inicio deve ser o primeiro estado da aplicacao autenticada.

### Shell esperado

Inicio usa:

- `TopBar`;
- `LeftRail`;
- area principal de conteudo.

Inicio nao usa o `SearchRail` lateral da Busca.

## Contrato visual da tela

## 1. Estrutura macro

A tela deve manter esta composicao:

1. shell superior com `TopBar`;
2. rail de navegacao esquerda;
3. workspace principal com fundo de workspace;
4. conteudo interno com padding generoso;
5. primeira dobra com hero e painel de resumo;
6. grade de cards de entrada por modo;
7. area inferior com favoritos, buscas recentes e relatorios recentes.

## 2. Hero principal

O hero e o bloco de boas-vindas e aceleracao.

Ele deve conter:

- saudacao ao usuario;
- resumo curto do momento;
- campo de busca rapida;
- atalhos de consulta sugerida.

Regra de implementacao:

- a linguagem visual do hero deve seguir a base de `mode_home.jsx`;
- o gradiente e seus acentos devem ser promovidos a recipe do sistema visual na app real;
- o campo de busca do hero e um atalho para Busca, nao substitui o modo Busca.

## 3. Painel de resumo do dia

O painel lateral do topo deve consolidar KPIs do usuario e do pipeline.

Blocos minimos:

- editais aderentes abertos;
- itens que vencem em breve;
- favoritos acompanhados;
- valor estimado de pipeline.

Regra de implementacao:

- os cards pequenos devem manter a mesma densidade e hierarquia do design;
- os tons por status devem vir do sistema de tokens e recipes;
- essa area nao deve virar dashboard genérico separado da linguagem da tela.

## 4. Cards de entrada por modo

Deve existir uma grade de cards grandes com acesso a:

- Busca;
- Empresas;
- Radar;
- Relatorios.

Cada card deve manter:

- icone principal;
- tag curta de funcao;
- titulo;
- descricao curta;
- estatistica inferior;
- affordance de clique.

Regra de implementacao:

- o comportamento visual de hover deve seguir a base do design;
- a composicao dos cards deve continuar homogênea;
- nomes finais devem seguir a nomenclatura aprovada do produto.

## 5. Painel de favoritos

O painel esquerdo inferior deve listar editais favoritos do usuario.

Campos minimos por linha:

- titulo;
- orgao;
- data;
- status ou prazo.

Interacao:

- clicar no item deve abrir o fluxo correspondente em Busca.

## 6. Painel de buscas recentes

O painel superior direito inferior deve listar as buscas recentes do usuario.

Campos minimos por linha:

- consulta;
- quantidade de resultados;
- quando ocorreu.

Interacao:

- clicar em uma linha deve reabrir a busca correspondente em Busca.

## 7. Painel de relatorios recentes

O painel inferior direito deve listar relatorios recentes em linguagem natural.

Campos minimos por linha:

- pergunta;
- quando ocorreu;
- quantidade de linhas.

Interacao:

- clicar em uma linha deve abrir o fluxo correspondente em Relatorios.

## Decomposicao recomendada na app real

Uma decomposicao recomendada para a implementacao real da tela e:

- `HomePage`
- `HomeHero`
- `HomeQuickSearch`
- `HomeSummaryPanel`
- `HomeModeCards`
- `HomeFavoritesPanel`
- `HomeRecentSearchesPanel`
- `HomeRecentReportsPanel`

Essa decomposicao pode variar, desde que a composicao final continue fiel ao design-base.

## Contrato de dados recomendado

Para evitar excesso de chamadas independentes, a melhor estrategia inicial para Inicio e um endpoint agregado.

Exemplo de contrato de tela:

```json
{
  "user": {
    "firstName": "Rodrigo"
  },
  "summary": {
    "pipelineValue": 86400000,
    "openRelevantBids": 214,
    "expiringThisWeek": 18,
    "trackedFavorites": 42
  },
  "quickSearchSuggestions": [
    "alimentacao hospitalar",
    "merenda escolar"
  ],
  "modeCards": [
    {
      "id": "busca",
      "title": "Busca semantica de editais"
    }
  ],
  "favorites": [],
  "recentSearches": [],
  "recentReports": []
}
```

Regra:

- a forma final do backend pode mudar;
- a tela deve receber um payload adaptado para manter sua composicao.

## Relacao com os mocks existentes

Hoje `mode_home.jsx` consome principalmente:

- `DATA.historico`
- `DATA.favoritos`
- `DATA.relatorios`

Na app real, isso deve ser substituido por dados de backend sem alterar a composicao da tela.

## Estados obrigatorios

## Loading

Deve existir loading sem quebrar a estrutura.

Esperado:

- hero visivel com placeholders discretos;
- cards de resumo em estado skeleton;
- listas inferiores com placeholders de linha.

## Vazio

Deve existir estado vazio para:

- nenhum favorito;
- nenhum historico;
- nenhum relatorio recente.

Regra:

- o vazio nao deve desmontar a grade da tela;
- deve manter a mesma linguagem visual do restante.

## Erro

Deve existir erro tratavel por painel, sem derrubar a pagina inteira.

Regra:

- se um painel falhar, os outros continuam renderizando;
- mensagens de erro devem usar o mesmo sistema visual da tela.

## Interacoes obrigatorias

1. submit da busca rapida leva para Busca com a query preenchida;
2. clique nas sugestoes leva para Busca com preset equivalente;
3. clique em card de modo leva ao modo correspondente;
4. clique em favorito leva ao fluxo correspondente em Busca;
5. clique em busca recente reabre a consulta em Busca;
6. clique em relatorio recente abre Relatorios com o contexto correspondente.

## O que nao faz parte desta primeira entrega

- analytics avancado de Inicio;
- configuracao profunda de widgets;
- personalizacao livre de layout;
- feed completo de atividade transversal;
- substituicao da linguagem visual da tela por dashboard genérico.

## Criterios de aceite

Uma primeira implementacao de Inicio so deve ser aceita quando:

1. a tela estiver dentro do shell real da aplicacao;
2. a composicao principal seguir `mode_home.jsx`;
3. os nomes de produto estiverem alinhados com a nomenclatura aprovada;
4. os dados reais substituirem os mocks sem redesenho;
5. loading, vazio e erro estiverem tratados;
6. os atalhos principais navegarem corretamente para Busca e Relatorios;
7. a tela passar pelos gates de revisao visual e definicao de pronto.

## Relacao com os documentos de processo

- `docs/CONVENCAO_ARQUITETURA_FRONTEND.md`
- `docs/CHECKLIST_IMPLEMENTACAO_FRONTEND.md`
- `docs/CRITERIOS_REVISAO_VISUAL.md`
- `docs/DEFINICAO_DE_PRONTO_POR_TELA.md`

## Regra final

Inicio deve ser a primeira prova concreta de que o time consegue transformar `design/` em UI real sem copiar literalmente o prototipo e sem redesenhar o produto.