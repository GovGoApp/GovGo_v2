# Estrategia de Teste dos Modulos do v1 Antes da UI do v2

## Objetivo

Trazer modulos do v1 para o v2 sem depender da interface do v2 como primeiro lugar de validacao.

Como varios modulos do v1 estao lentos, desatualizados, instaveis ou parcialmente quebrados, a integracao correta nao deve ser feita direto na interface nova. Antes disso, cada modulo precisa passar por uma camada de homologacao tecnica.

Para a fila de triagem dos modulos problematicos, ver tambem `docs/TRIAGEM_MODULOS_LEGADOS.md`.

## Recomendacao Principal

A melhor forma de fazer isso e criar uma esteira de validacao entre o v1 e a UI da v2.

Essa esteira deve ter quatro camadas:

1. adapter do legado;
2. contrato de entrada e saida;
3. testes automatizados e benchmarks;
4. sandbox de execucao manual.

Em outras palavras: antes de um modulo tocar a UI da v2, ele precisa primeiro funcionar como servico testavel sem interface.

## O Modelo Recomendado

## 1. Adapter do legado

Cada modulo do v1 que for aproveitado deve ganhar um adapter proprio.

O adapter tem um papel simples:

- importar a logica legada;
- isolar dependencias estranhas do modulo antigo;
- normalizar entrada;
- normalizar saida;
- capturar erros e tempos de execucao;
- impedir que a UI conheca detalhes do legado.

Exemplos:

- `SearchAdapter` para o nucleo de busca;
- `CompanyAdapter` para analise de CNPJ e empresa;
- `ReportsAdapter` para NL -> SQL;
- `UserPlatformAdapter` para favoritos, historico, auth e boletins.

## 2. Contrato fixo de entrada e saida

Antes de testar o modulo, defina como ele deve se comportar.

Cada modulo deve ter:

- payload de entrada esperado;
- schema de resposta esperado;
- erros conhecidos e como sao retornados;
- dependencia de banco, OpenAI, arquivos ou APIs externas;
- tempo maximo aceitavel para resposta.

Isso evita o pior cenario de todos: integrar um modulo na UI e so entao descobrir que ele devolve formatos inconsistentes, campos faltando ou respostas lentas demais.

## 3. Testes automatizados antes da UI

Cada modulo precisa ser validado em tres eixos:

### Smoke test

Verifica se o modulo sobe e responde ao caso mais basico.

Exemplos:

- uma busca simples retorna itens;
- um CNPJ valido retorna perfil;
- uma pergunta simples em relatorios gera SQL;
- favoritos podem ser listados para um usuario.

### Regression test

Garante que os casos importantes continuam funcionando depois de ajustes.

Aqui vale montar uma base curta de casos reais do GovGo:

- consultas que sempre devem retornar resultados relevantes;
- CNPJs importantes que precisam abrir corretamente;
- relatorios que a equipe ja usa no v1;
- cenarios que ja quebraram antes.

### Performance test

Serve para medir se o modulo esta apto para entrar na UI.

Exemplos de gate:

- busca simples em ate X segundos;
- perfil de empresa em ate Y segundos;
- relatorio simples em ate Z segundos;
- erro externo precisa falhar rapido, sem travar o fluxo.

## 4. Sandbox de execucao manual

Mesmo com testes automatizados, voce precisa de uma forma humana de experimentar o modulo antes da UI.

A melhor forma e usar um sandbox backend local.

Esse sandbox pode ser:

- uma API local de homologacao;
- uma CLI de testes manuais;
- uma colecao de requests documentadas;
- uma pagina tecnica muito simples, separada da UI oficial.

Entre essas opcoes, a melhor e:

1. API local de homologacao;
2. CLI auxiliar para depuracao.

Motivo:

- a API ja prepara o modulo para a integracao real com a v2;
- a CLI ajuda a depurar rapidamente sem depender do frontend;
- os dois juntos aceleram validacao e isolam problemas.

## Melhor Forma Recomendada na Pratica

Para o GovGo, a melhor abordagem e esta:

1. criar um backend sandbox local;
2. plugar nele adapters dos modulos legados;
3. criar schemas de request e response;
4. escrever smoke tests, regression tests e benchmarks;
5. testar manualmente via endpoints locais;
6. integrar na UI do v2 apenas depois da aprovacao do modulo.

Em resumo:

- nao testar primeiro na UI;
- nao confiar apenas no comportamento do modulo antigo;
- nao misturar refactor, teste e integracao no mesmo passo.

## Estrutura Recomendada de Trabalho

Uma estrutura recomendada para essa fase seria algo como:

```text
v2/
  backend_sandbox/
    adapters/
      search_adapter.py
      company_adapter.py
      reports_adapter.py
      user_platform_adapter.py
    contracts/
      search_contract.py
      company_contract.py
      reports_contract.py
    runners/
      smoke_runner.py
      perf_runner.py
    tests/
      smoke/
      regression/
      performance/
    fixtures/
      search_cases.json
      company_cases.json
      report_cases.json
```

Essa estrutura nao e a aplicacao final. Ela e a bancada de homologacao.

## Como Testar Cada Area do GovGo

## Busca

Testar:

- consulta simples;
- consulta com negacao;
- busca semantica;
- busca hibrida;
- filtros estruturados;
- relevancia do top 10;
- tempo de resposta.

O que aprova o modulo:

- schema consistente;
- campos principais sempre presentes;
- resposta previsivel;
- tempo dentro do limite definido.

## Empresas

Testar:

- CNPJ valido;
- CNPJ invalido;
- nome ambiguo com desambiguacao;
- empresa sem contratos;
- empresa com historico denso;
- tempo de perfil e de historico.

O que aprova o modulo:

- resposta consolidada por empresa;
- identificacao correta;
- contratos e metadados coerentes;
- erro tratavel quando faltam dados.

## Relatorios

Testar:

- pergunta simples;
- pergunta ambigua;
- SQL gerado;
- validacao de seguranca;
- execucao com poucos resultados;
- execucao com muitos resultados;
- tempo total e comportamento em falha.

O que aprova o modulo:

- SQL valido e seguro;
- resultado reproduzivel;
- historico armazenavel;
- falhas bem explicadas.

## Plataforma de usuario

Testar:

- login;
- sessao;
- favoritos;
- historico;
- boletins;
- limites e billing;
- preferencias.

O que aprova o modulo:

- escopo por usuario funcionando;
- persistencia confiavel;
- sem mistura entre usuarios;
- erros claros de autenticacao e permissao.

## Radar

Radar merece um tratamento especial.

Como ele nao existe pronto no v1, o teste aqui nao e de migracao direta. E de construcao de servico novo sobre dados existentes.

A recomendacao e validar Radar em duas etapas:

1. primeiro validar queries agregadas e consistencia dos numeros;
2. depois validar a narrativa e visualizacao no frontend.

Ou seja: antes de existir tela de Radar com dados reais, deve existir um conjunto de endpoints ou scripts que respondam corretamente perguntas como:

- quem sao os maiores players;
- quais sao os maiores compradores;
- como varia o volume por periodo;
- qual o share por fornecedor;
- quais mercados ou categorias fazem sentido para um fornecedor.

## O que nao fazer

### Nao testar via UI primeiro

Se voce testar primeiro pela UI, voce mistura tres problemas ao mesmo tempo:

- problema de backend;
- problema de contrato de dados;
- problema de interface.

Isso dificulta muito o diagnostico.

### Nao refatorar e integrar ao mesmo tempo

Cada modulo antigo deve passar por esta ordem:

1. estabilizar comportamento;
2. medir;
3. encapsular;
4. integrar.

Se refatorar e integrar no mesmo passo, voce perde a capacidade de saber se o modulo piorou ou melhorou.

### Nao usar apenas dados totalmente vivos e instaveis

Voce precisa de dois tipos de teste:

- casos fixos de regressao;
- casos reais do ambiente atual.

So testar com dado vivo e ruim, porque a base muda e voce nao sabe se a falha veio do codigo ou do dado.

## Gate de Pronto para Integracao com a UI

Um modulo so deve seguir para a UI da v2 quando passar por este gate:

1. smoke test verde;
2. casos de regressao verde;
3. schema de resposta congelado;
4. benchmark dentro do limite aceitavel;
5. log e erro observaveis;
6. teste manual aprovado no sandbox.

Se um modulo nao passa por isso, ele ainda nao esta pronto para entrar na interface.

## Ordem Recomendada de Validacao

Se o objetivo e trazer o v1 para o v2 com menor risco, a ordem de homologacao recomendada e:

1. Busca
2. Empresas
3. Plataforma de usuario
4. Relatorios
5. Radar

Essa ordem funciona porque:

- Busca e o modulo mais central e mais maduro;
- Empresas reutiliza bastante coisa real do v1;
- Plataforma de usuario viabiliza Inicio e artefatos;
- Relatorios tem alto valor, mas depende de contrato e seguranca;
- Radar depende mais de modelagem nova e agregacoes.

## Recomendacao Final

A melhor forma de testar os modulos do v1 antes de encaixa-los na UI do v2 e criar uma bancada de homologacao backend-first.

Essa bancada deve ter:

- adapters do legado;
- contratos claros;
- testes automatizados;
- benchmarks;
- sandbox manual.

So depois disso cada modulo entra na interface.

Essa abordagem te da tres vantagens:

1. voce descobre o que realmente presta no legado;
2. voce mede o que esta lento antes de contaminar a UX da v2;
3. voce integra o v1 no v2 de forma controlada, com menos retrabalho.