# Estudo da Plataforma de Usuario: v1 -> v2

## Objetivo

Este documento consolida o estudo da camada de usuario do GovGo v1 e define como trazer a mesma cobertura funcional para o GovGo v2, sem inventar produto novo.

A regra aqui e simples:

- nao portar a UI Dash do v1;
- nao cortar funcionalidade util;
- nao inventar comportamento novo por ora;
- trazer as mesmas capacidades para a nova UI do v2.

Em outras palavras: o que muda e a interface e a arquitetura de execucao. O dominio de usuario do v1 continua sendo a referencia funcional.

---

## Escopo: o que "usuario" significa no GovGo

No GovGo, "user" nao significa apenas login.

No v1, a plataforma de usuario inclui pelo menos nove blocos:

1. autenticacao e sessao;
2. usuario atual e identidade basica;
3. historico de buscas, prompts e resultados;
4. favoritos e bookmarks;
5. boletins agendados e seus runs;
6. envio de email ligado a boletins, favoritos e historico;
7. artefatos por usuario (Markdown, resumos e documentos);
8. billing, limites e medicao de uso;
9. mensagens do usuario e notificacoes de UI.

Se o v2 quiser "ter user", ele precisa cobrir esse conjunto inteiro, mesmo que a ordem de entrega seja gradual.

---

## Fontes lidas para este estudo

### V1

- `C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/gvg_auth.py`
- `C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/gvg_user.py`
- `C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/gvg_boletim.py`
- `C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/gvg_billing.py`
- `C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/gvg_limits.py`
- `C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/gvg_usage.py`
- `C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/gvg_notifications.py`
- `C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/gvg_email.py`
- `C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/gvg_database.py`
- `C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/GvG_Search_Browser.py`
- `C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/docs/geral/README_boletins.md`
- `C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/db/migrations/2025-09-11_user_schedule_and_user_boletim.sql`
- `C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/db/BDS1_v7.txt`

### V2

- `src/backend/search/v1_copy/gvg_browser/*` como copia local do dominio legado
- `src/backend/search/api/service.py`
- `src/features/busca/BuscaWorkspace.jsx`
- `design/govgo/shell.jsx`
- `design/GovGo Login.html` como prototipo visual IA de login/cadastro
- `docs/ESTRATEGIA_V1_NO_V2.md`
- `docs/MATRIZ_V1_V2.md`
- `docs/ESTRUTURA_FRONTEND_V2.md`
- `README.md`

---

## Resumo executivo

### O que o v1 ja tem pronto

O v1 ja possui uma plataforma de usuario funcional e relativamente completa:

- auth via Supabase;
- signup, confirmacao, login, logout, forgot password e reset por link;
- historico de consultas salvo em banco;
- replay de historico e replay de boletins;
- favoritos persistidos em banco;
- boletins agendados persistidos em banco e executados por job;
- envio de email para boletins, favoritos e historico;
- artefatos por usuario para documentos e resumos;
- billing, planos, limites e contadores de uso;
- mensagens de usuario para suporte;
- notificacoes toast de feedback.

### O que o v2 tem hoje

O v2 ainda nao tem uma plataforma de usuario real.

Hoje ele tem:

- shell visual com placeholders de `Favoritos`, `Historico`, `Alertas` e `Boletins`;
- badge de plano na topbar;
- workspace de busca com persistencia local da sessao de busca;
- detalhe de edital com artefatos documentais reais, mas ainda sem autenticacao real de usuario.

Hoje ele ainda nao tem:

- login/signin funcionais;
- provider de auth;
- API de auth;
- API de favoritos;
- API de historico;
- API de boletins;
- API de billing;
- integracao de mensagens do usuario;
- hidracao real da rail de atividade por dados do banco.

### Conclusao central

Para "fazer funcionar o user" no v2, nao precisamos inventar produto novo.

Precisamos:

1. expor os servicos do v1 como APIs reais dentro de `src/backend`;
2. criar uma camada transversal de usuario no `src/`;
3. ligar a nova UI do v2 a essa camada;
4. respeitar os mesmos fluxos do v1.

---

## Referencia visual nova: `design/GovGo Login.html`

O arquivo `design/GovGo Login.html` entra no plano como referencia visual da primeira entrega de Auth do v2.

Ele nao deve ser importado diretamente como runtime final. O arquivo e um HTML empacotado/gerado por IA, com React/Babel inline, assets e fontes embutidos. O caminho correto e traduzir a experiencia para componentes reais do v2, reaproveitando o design system e conectando aos fluxos do v1.

### O que reaproveitar

- tela dedicada de login/cadastro, fora do shell autenticado;
- fundo claro institucional com suporte a tema escuro;
- card central com marca GovGo em destaque;
- alternancia entre `Entrar` e `Criar sua conta`;
- campos arredondados, CTA primario laranja e acao secundaria outline;
- campos de cadastro ja alinhados ao v1: nome, sobrenome, telefone, email e senha;
- estados de lembrar credenciais, esqueci senha, sucesso e retorno para o app;
- espaco visual para login social, mantendo-o desligado ate existir regra real no backend.

### O que nao trazer literalmente

- o bundle autocontido do HTML;
- scripts de unpacking, React/Babel inline ou assets base64;
- valores mockados de email/senha;
- redirect literal para `GovGo v2.html`;
- regras novas de autenticacao que nao existam no v1.

### Consequencia no plano

A Fase A passa a comecar pela traducao desse prototipo em componentes `AuthPage/AuthCard`, antes de plugar favoritos, historico e boletins. A autenticacao visual fica nova, mas o comportamento deve continuar sendo o do v1.

---

## O que existe no v1: estudo funcional por bloco

## 1. Autenticacao e sessao

### Modulo principal

- `gvg_auth.py`

### O que ele faz

- cria cliente Supabase auth;
- `sign_in(email, password)`;
- `sign_up_with_metadata(email, password, full_name, phone)`;
- `verify_otp(email, token, type_='signup')`;
- `reset_password(email)`;
- `recover_session_from_code(code)`;
- `set_session(access_token, refresh_token=None)`;
- `update_user_password(new_password)`;
- `resend_otp(email, type_='signup')`;
- `sign_out(refresh_token)`;
- `get_user_from_token(access_token)`.

### Como isso aparece na UI do v1

Em `GvG_Search_Browser.py`, o v1 possui:

- overlay de auth;
- views de `login`, `signup`, `confirm` e `reset`;
- store local de auth;
- store local de credenciais lembradas;
- tratamento do link de recovery vindo da URL;
- callback de logout;
- reidratacao do usuario ao reabrir a app.

### Observacao importante

O v1 usa Supabase Auth de verdade, mas a sessao de UI e mantida por uma combinacao de:

- token em store do Dash;
- estado em memoria (`gvg_user`);
- callbacks de bootstrap.

No v2, a funcionalidade precisa ser a mesma. O transporte tecnico pode ser organizado melhor, mas o comportamento de produto precisa ser preservado.

---

## 2. Usuario atual e identidade basica

### Modulo principal

- `gvg_user.py`

### O que ele faz

- guarda o usuario atual em memoria;
- guarda access token em memoria;
- resolve usuario atual via `gvg_auth.get_user_from_token`;
- calcula iniciais para avatar;
- oferece helpers de leitura do usuario atual para toda a UI.

### Funcao no produto

Esse bloco alimenta:

- avatar / nome no shell;
- ownership de favoritos;
- ownership de historico;
- ownership de boletins;
- ownership de resumos/documentos;
- enforcement de limites.

---

## 3. Historico de buscas, prompts e resultados

### Modulo principal

- `gvg_user.py`

### Tabelas principais

- `public.user_prompts`
- `public.user_results`

### O que o v1 salva

Para cada busca relevante, o v1 salva:

- o texto da consulta;
- embedding da consulta, quando aplicavel;
- tipo de busca;
- abordagem;
- relevance level;
- sort mode;
- limit;
- top categories count;
- filtro de encerrados;
- filtros de UI em JSON;
- `preproc_output` em JSON;
- flag `active`.

Depois salva um snapshot dos resultados:

- `numero_controle_pncp`
- `rank`
- `similarity`
- `valor`
- `data_encerramento_proposta`

### Comportamentos observados

- dedupe por `(user_id, text)` no save de prompt;
- replay de historico a partir de `fetch_user_results_for_prompt_text`;
- exclusao logica por `active=false` quando a coluna existe;
- historico local de UI tambem e mantido, mas o last-known source of truth e o banco.

### Implicacao para o v2

O v2 precisa trazer:

- lista de historico na rail;
- replay do historico abrindo uma tab de resultado;
- exclusao de item do historico;
- persistencia do estado de busca ligado ao prompt salvo.

Nao e uma feature secundaria. Isso ja e parte do fluxo central do v1.

---

## 4. Favoritos e bookmarks

### Modulo principal

- `gvg_user.py`

### Tabela principal

- `public.user_bookmarks`

### O que o v1 faz

- `fetch_bookmarks(limit=100)`;
- `add_bookmark(numero_controle_pncp, rotulo=None)`;
- `remove_bookmark(numero_controle_pncp)`.

### Detalhes importantes

- o v1 usa soft delete se houver coluna `active`;
- a leitura ja faz join com `public.contratacao` para devolver objeto pronto para UI;
- o add/remove grava eventos de uso;
- a insercao respeita limites do plano.

### Funcao no produto

Favoritos no v1 nao sao apenas um icone visual:

- sao persistidos em banco;
- podem ser reabertos;
- podem ser enviados por email;
- entram na experiencia do Inicio;
- entram na contabilidade de uso/capacidade.

### Implicacao para o v2

O v2 precisa trazer:

- icone de bookmark real na tabela e nas listas;
- trilha de favoritos na rail;
- abertura do edital a partir do favorito;
- exclusao/reativacao;
- eventual email do favorito, como existe no v1.

---

## 5. Boletins agendados

### Modulos principais

- `gvg_boletim.py`
- `scripts/00_pipeline_boletim.py`
- `scripts/01_run_scheduled_boletins.py`
- `scripts/02_send_boletins_email.py`

### Tabelas principais

- `public.user_schedule`
- `public.user_boletim`

### O que o v1 faz na UI

- criar boletim com:
  - query_text
  - schedule_type
  - schedule_detail
  - channels
  - config_snapshot
  - filters
- listar boletins ativos;
- desativar boletim;
- replay do ultimo run do boletim;
- envio por email ligado ao pipeline.

### O que o pipeline faz

1. le schedules ativos;
2. decide o que esta `due`;
3. reaproveita `preproc_output` salvo;
4. executa a busca no motor real;
5. grava resultados materializados em `user_boletim`;
6. atualiza `last_run_at`;
7. o job seguinte envia email e marca `last_sent_at`.

### Observacao importante

`next_run_at` existe no schema, mas nao governa o scheduler atual. O scheduler atual reavalia `schedule_type` e `schedule_detail`.

### Implicacao para o v2

No v2, `Boletins` precisa ser trazido como:

- tela/rail de configuracao e listagem;
- replay do ultimo run;
- integracao com o pipeline existente;
- sem reimaginar o produto.

Nao precisamos inventar um sistema novo de alertas. Precisamos plugar a mesma agenda do v1 na nova UI.

---

## 6. Emails ligados ao usuario

### Modulo principal

- `gvg_email.py`

### O que ele cobre

- envio SMTP de HTML;
- renderers de email para:
  - boletins;
  - favoritos;
  - historico;
- formata datas, dinheiro, itens, documentos e status.

### Implicacao para o v2

O v2 nao precisa reinventar essa camada no inicio.

Ele precisa:

- expor a mesma capacidade via API/servico;
- plugar o acionamento na nova UI quando as telas equivalentes forem trazidas.

---

## 7. Artefatos por usuario: documentos e resumos

### Modulos principais

- `gvg_database.py`
- `gvg_documents.py`

### Tabelas principais

- `public.user_documents`
- `public.user_resumos`

### O que o v1 faz

- persiste Markdown ou URL de storage de artefato documental;
- persiste resumo Markdown por usuario e PNCP;
- consulta status agregado de artefatos:
  - `has_summary`
  - `has_md`

### Funcao no produto

O detalhe do edital e a experiencia de documentos sao user-aware no v1:

- o resumo e do usuario;
- o artefato processado e do usuario;
- os status de disponibilidade dependem do usuario logado.

### Implicacao para o v2

O v2 ja integrou documentos e resumo real, mas ainda precisa ligar isso a um usuario autenticado de verdade:

- `user_id` consistente;
- leitura e persistencia autenticadas;
- historico de artefatos por usuario;
- eventual reaproveitamento de artefatos ja existentes no banco.

---

## 8. Billing, planos, limites e uso

### Modulos principais

- `gvg_billing.py`
- `gvg_limits.py`
- `gvg_usage.py`

### Tabelas principais

- `public.system_plans`
- `public.user_settings`
- `public.user_payment`
- `public.user_usage_events`
- `public.user_usage_counters`

### O que o v1 faz

#### Billing

- le planos ativos;
- garante `user_settings` com plano FREE quando necessario;
- suporta upgrade mock e caminho Stripe;
- suporta agendar downgrade;
- suporta aplicar troca de plano;
- devolve snapshot de uso por plano.

#### Limits

- bloqueia por capacidade:
  - consultas
  - resumos
  - boletim_run
  - favoritos

#### Usage

- registra eventos de uso;
- agrega tokens, DB rows, bytes e tempo;
- incrementa contadores diarios;
- grava meta JSON por evento.

### Implicacao para o v2

O v2 nao pode tratar `PRO`, `uso`, `favoritos`, `boletins` e `resumos` como mera decoracao de UI.

Esses elementos ja tem base de dados, regras e medicao no v1. A nova UI precisa apenas representar essa camada de forma nova.

---

## 9. Mensagens do usuario e notificacoes

### Modulos principais

- `gvg_notifications.py`
- `gvg_database.py` (`insert_user_message`)
- `GvG_Search_Browser.py`

### Tabela principal de mensagem

- `public.user_message`

### O que existe de verdade no v1

Existem duas coisas diferentes:

#### A) Notificacao toast

`gvg_notifications.py` e apenas um helper de mensagens efemeras:

- success
- error
- warning
- info

Isso e feedback de UI, nao dominio persistido.

#### B) Mensagem do usuario

Na topbar do v1 existe um fluxo real de envio de mensagem:

- usuario autenticado escreve texto;
- callback chama `insert_user_message`;
- registro vai para `public.user_message`;
- status de resolucao e tratado por `resolved_status`.

### O que nao existe pronto

Nao apareceu no v1 um sistema persistido e rico de "alertas pessoais" no mesmo nivel de favoritos/historico/boletins.

O que existe sao:

- toasts de UI;
- cards visuais de alertas na shell;
- suporte message/support via `user_message`;
- e os boletins por email.

### Implicacao para o v2

Se o usuario pedir "avisos", a migracao fiel do v1 deve considerar:

1. boletins;
2. toasts de feedback;
3. mensagens do usuario;
4. e so depois, se necessario, uma camada nova de alertas persistidos.

Nao devemos fingir que o v1 ja tinha um modulo completo de alertas persistidos se ele nao tinha.

---

## Tabelas de banco ligadas ao dominio de usuario

| Tabela | Papel |
| --- | --- |
| `public.user_prompts` | configuracao e historico de buscas |
| `public.user_results` | snapshot de resultados por prompt |
| `public.user_bookmarks` | favoritos / bookmarks |
| `public.user_schedule` | agenda/configuracao dos boletins |
| `public.user_boletim` | resultados materializados dos runs de boletim |
| `public.user_documents` | artefatos documentais do usuario |
| `public.user_resumos` | resumo Markdown por usuario e PNCP |
| `public.user_settings` | plano atual, ciclo e ids de gateway |
| `public.user_payment` | eventos/pagamentos de billing |
| `public.user_usage_events` | trilha detalhada de uso |
| `public.user_usage_counters` | contadores agregados |
| `public.user_message` | mensagens do usuario para suporte |
| `auth.users` | identidade de auth do Supabase |
| `public.system_plans` | tabela mestra de planos |

### Divida estrutural importante

O schema atual mistura tipos de `user_id`:

- `uuid` em varias tabelas;
- `text` em `user_bookmarks`, `user_schedule` e `user_boletim`.

Isso precisa ser tratado como divida de migracao, nao como detalhe.

No v2, a camada de contrato precisa esconder essa inconsistencia desde o primeiro dia.

---

## Fluxos end-to-end mais importantes do v1

## 1. Login / signup / recovery

1. usuario abre overlay de auth;
2. faz login ou signup;
3. signup vai para confirmacao por OTP;
4. recovery pode chegar por hash ou `?code=...`;
5. sessao e estabelecida;
6. `store-auth` e atualizado;
7. usuario atual e reidratado;
8. historico e favoritos sao carregados.

## 2. Buscar e gravar historico

1. usuario executa busca;
2. motor de busca roda;
3. prompt/config/filtros/preproc_output sao salvos em `user_prompts`;
4. snapshot dos resultados vai para `user_results`;
5. estado visual de historico e atualizado;
6. usuario pode reabrir depois sem rerodar imediatamente.

## 3. Favoritar um edital

1. usuario clica no bookmark;
2. capacidade do plano e verificada;
3. favorito e inserido ou reativado;
4. evento de uso e gravado;
5. rail de favoritos e icone na tabela ficam em sincronia.

## 4. Criar um boletim

1. usuario define query, frequencia, slots/dias, canais e config snapshot;
2. schedule vai para `user_schedule`;
3. pipeline diario encontra o schedule ativo;
4. executa a busca;
5. grava linhas em `user_boletim`;
6. email sender coleta o ultimo run e envia.

## 5. Abrir detalhe e gerar artefatos

1. usuario abre um edital;
2. documentos sao baixados/processados;
3. Markdown e resumo podem ser persistidos em `user_documents` e `user_resumos`;
4. a UI do v1 consulta o status desses artefatos por usuario.

---

## O que existe hoje no v2

## 1. O que esta real

### Busca e detalhe

O v2 ja tem:

- busca real;
- filtros reais;
- tabs de resultado;
- mapa;
- detalhe de edital real;
- itens reais;
- documentos reais;
- Markdown real;
- resumo consolidado real.

### Persistencia local de busca

O v2 ja tem:

- persistencia local do workspace de busca;
- tabs de busca e detalhe;
- configs e filtros locais.

Mas isso ainda nao e "historico do usuario" no sentido do v1. E apenas estado de sessao local do browser.

---

## 2. O que existe so como UI placeholder

Em `design/govgo/shell.jsx`, a rail e a topbar ja mostram:

- `Favoritos`
- `Historico`
- `Alertas`
- `Boletins`
- badge de plano/uso

Mas hoje isso e mock visual.

Nao existe ligacao real com:

- `user_bookmarks`
- `user_prompts`
- `user_schedule`
- `user_boletim`
- `user_settings`
- `user_message`

---

## 3. O que esta previsto em estrutura, mas ainda vazio

A arvore do v2 ja preve:

- `src/features/auth/`
- `src/features/favoritos/`
- `src/features/historico/`
- `src/features/usuario/`

Mas, hoje, esses diretorios estao vazios.

Da mesma forma:

- nao ha providers reais em `src/app/providers/`;
- nao ha services de auth/user/favorites/boletins em `src/services/`;
- o backend real exposto em `src/backend/search/api/service.py` cobre busca e documentos, nao plataforma de usuario.

---

## O que precisa ser trazido ao v2, sem inventar produto

## 1. Superficies de UI do v2 que devem absorver o user do v1

### Auth entry

Deve nascer a partir de `design/GovGo Login.html`, traduzido para componentes reais do v2.

Deve absorver:

- login/signin;
- cadastro/signup;
- confirmacao de cadastro;
- esqueci senha;
- reset por link;
- lembrar credenciais, se mantivermos a mesma regra local do v1;
- estados de carregamento, erro e sucesso;
- entrada anonima vs redirecionamento para shell autenticado.

Recomendacao de UI:

- rota/tela dedicada para auth inicial;
- modal apenas para sessao expirada ou acao protegida dentro do app;
- nada de importar o HTML gerado diretamente.

### TopBar

Deve absorver:

- login/logout;
- estado autenticado vs anonimo;
- avatar / iniciais;
- plano atual;
- percentuais de uso;
- entrada de mensagens/avisos, se mantivermos o fluxo de `user_message`.

### Activity rail

Deve absorver:

- favoritos;
- historico;
- boletins;
- alertas/mensagens no nivel que o v1 realmente possui.

### Busca

Deve absorver:

- bookmark real na tabela;
- replay do historico;
- replay do boletim;
- save search ligado a `user_prompts`, nao apenas a estado local.

### Detalhe do edital

Deve absorver:

- artefatos documentais por usuario;
- reuso de Markdown/resumo ja existentes;
- eventuais acoes de favorito e share/email.

### Inicio

Deve absorver:

- composicao de:
  - favoritos;
  - historico;
  - boletins;
  - snapshot de uso/plano.

### Billing / usuario

Deve absorver:

- plano atual;
- uso de consultas, resumos, boletins e favoritos;
- upgrade/downgrade;
- configuracoes do usuario.

---

## Proposta tecnica de migracao para o v2

## Regra central

Nao trazer a UI Dash.
Trazer o backend funcional do user do v1.
Trazer a UI de auth a partir do prototipo `design/GovGo Login.html`, refeito em componentes do v2.

## 1. Backend no v2

Criar uma camada transversal de usuario em `src/backend`, separada da busca.

Sugestao de organizacao:

```text
src/backend/user/
  api/
  core/
  auth/
  billing/
  boletim/
  favorites/
  history/
  documents/
  messages/
```

### Endpoints minimos

#### Auth

- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/confirm`
- `POST /api/auth/forgot`
- `POST /api/auth/reset`
- `POST /api/auth/logout`
- `GET /api/auth/me`

#### History

- `GET /api/user/history`
- `DELETE /api/user/history/:prompt_id`
- `GET /api/user/history/:prompt_id/results`

#### Favorites

- `GET /api/user/favorites`
- `POST /api/user/favorites`
- `DELETE /api/user/favorites/:pncp`

#### Boletins

- `GET /api/user/boletins`
- `POST /api/user/boletins`
- `DELETE /api/user/boletins/:id`
- `GET /api/user/boletins/:id/latest-run`

#### User artifacts

- `GET /api/user/artifacts/status`
- `GET /api/user/documents`
- `GET /api/user/resumos`

#### Billing / usage

- `GET /api/user/settings`
- `GET /api/user/usage`
- `GET /api/system/plans`
- `POST /api/billing/checkout`
- `POST /api/billing/mock-upgrade`

#### Messages

- `POST /api/user/messages`
- `GET /api/user/messages` apenas se houver necessidade de listar historico do proprio envio

## 2. Frontend no v2

Criar a camada de usuario ja prevista na estrutura:

```text
src/features/auth/
src/features/favoritos/
src/features/historico/
src/features/usuario/
src/features/boletins/   (novo, recomendado)
```

Para Auth, a primeira traducao visual deve ser:

```text
src/features/auth/AuthPage.jsx
src/features/auth/AuthCard.jsx
src/features/auth/AuthForm.jsx
src/features/auth/auth.css ou tokens no padrao ja usado pelo v2
```

Esses componentes devem reproduzir a experiencia do `design/GovGo Login.html`, mas usando services reais, providers reais e rotas internas do v2.

E tambem:

```text
src/services/api/userApi.jsx
src/services/adapters/userAdapter.jsx
src/services/contracts/userContracts.jsx
src/app/providers/AuthProvider.jsx
src/app/providers/UserProvider.jsx
```

## 3. Estrategia de implementacao

### Fase A - fundacao de auth e sessao

Trazer primeiro:

- traducao do `design/GovGo Login.html` para `AuthPage/AuthCard` reais;
- login;
- signup;
- confirmacao;
- forgot/reset;
- `GET /me`;
- provider de auth;
- guard/redirect de rota anonima vs autenticada;
- shell autenticado.

Sem isso, o resto fica com ownership indefinido.

Detalhe importante: a UI de Auth deve herdar a aparencia do prototipo IA, mas as regras de validacao, sessao, tokens, recover e logout devem vir do v1.

### Fase B - favoritos e historico

Trazer em seguida:

- favoritos reais;
- historico real;
- replay de historico;
- integracao visual da rail.

Esse e o bloco de maior valor percebido no shell atual.

### Fase C - boletins

Trazer:

- listagem;
- criacao;
- desativacao;
- replay;
- eventual CTA de email/status.

### Fase D - artefatos do usuario e detalhe do edital

Ligar:

- `user_documents`
- `user_resumos`
- status por usuario

ao detalhe do edital que ja existe.

### Fase E - billing, limites e uso

Trazer:

- plano atual;
- uso do dia;
- bloqueios de capacidade;
- CTA de upgrade.

### Fase F - mensagens e camada de avisos

Trazer:

- envio de mensagem do usuario;
- toasts padronizados;
- e decidir se a palavra "avisos" no v2 vai significar:
  - apenas feedback e mensagens;
  - ou tambem boletins/itens de atividade.

---

## O que nao devemos inventar agora

Para manter fidelidade ao pedido do projeto:

- nao inventar novo sistema de alertas persistidos se o v1 nao tem isso pronto;
- nao ativar login social/Google so porque o prototipo visual mostra esse botao;
- nao inventar nova regra de favoritamento;
- nao inventar novo tipo de boletim;
- nao trocar o significado de historico;
- nao trocar o significado de ownership dos artefatos;
- nao misturar "estado local do browser" com "historico do usuario" como se fossem a mesma coisa.

Se uma coisa no v1 era:

- prompt salvo,
- resultado salvo,
- boletim salvo,
- favorito salvo,

entao o v2 deve espelhar isso como persistencia real de usuario.

---

## Riscos e pontos de atencao

## 1. Tipos mistos de user_id

`uuid` vs `text` nas tabelas do dominio de usuario e um risco real.

No v2, a API deve normalizar isso e nao expor essa bagunca para a UI.

## 2. Legacy fallbacks

Boletins e alguns saves no v1 ainda tem fallback para estruturas antigas.

No v2, o alvo oficial deve ser:

- `user_schedule`
- `user_boletim`

e nao a tabela legada.

## 3. Sessao

O v1 mistura token, memoria e stores do Dash.

No v2, a implementacao pode ser organizada melhor, mas sem quebrar os fluxos reais de:

- login;
- confirmacao;
- forgot/reset;
- recovery por URL.

## 4. Limites

Favoritos, boletins, resumos e consultas ja tem enforcement de limite.

Ao ligar essas features no v2, esse comportamento nao pode sumir.

## 5. User platform nao e detalhe

Se fizermos apenas login e esquecermos o resto, teremos um v2 "autenticado" sem a plataforma de usuario de verdade.

Isso seria regressao funcional em relacao ao v1.

---

## Mapa de migracao v1 -> v2 por feature

| Feature do v1 | Modulo/tabela principal | Superficie alvo no v2 | Status atual v2 | Acao correta |
| --- | --- | --- | --- | --- |
| Login / signup / reset | `gvg_auth.py`, `auth.users` | `AuthPage/AuthCard` baseado em `design/GovGo Login.html` + provider global | prototipo visual em `/design`, sem integracao real | trazer agora |
| Usuario atual | `gvg_user.py` | topbar, avatar, shell | mock visual | trazer agora |
| Historico | `user_prompts`, `user_results` | rail + replay em tabs | mock visual + persistencia local apenas | trazer agora |
| Favoritos | `user_bookmarks` | rail + bookmark na tabela/detalhe | mock visual | trazer agora |
| Boletins | `user_schedule`, `user_boletim` | rail + configuracao + replay | mock visual | trazer em seguida |
| Emails do usuario | `gvg_email.py` | acoes auxiliares em rail/telas | inexistente | trazer junto com boletins/favoritos |
| Mensagem do usuario | `user_message` | topbar / suporte | inexistente | trazer depois de auth |
| Artefatos do usuario | `user_documents`, `user_resumos` | detalhe do edital | processamento real existe, ownership ainda nao | ligar ao auth |
| Billing / planos | `gvg_billing.py`, `user_settings`, `system_plans` | topbar, settings, CTA | badge mock na topbar | trazer depois do core de auth |
| Limites e uso | `gvg_limits.py`, `gvg_usage.py` | bloqueios e indicativos de uso | inexistente | trazer junto com billing |

---

## Recomendacao final de execucao

Se o objetivo e "fazer funcionar o user" sem inventar nada, a ordem mais segura e:

1. decompor `design/GovGo Login.html` em componentes reais de auth;
2. auth e sessao com backend v1;
3. shell autenticado, topbar e guard de rota;
4. favoritos;
5. historico;
6. boletins;
7. artefatos de documentos/resumos ligados ao usuario;
8. billing + limites + uso;
9. mensagem do usuario / avisos;
10. composicao do Inicio em cima desses mesmos blocos.

Essa ordem respeita:

- o que o v1 ja tem maduro;
- o shell que o v2 ja desenhou;
- e a regra de nao criar produto novo antes de trazer o antigo.

---

## Proximo passo recomendado

O proximo passo pratico, depois deste estudo, deve ser abrir a frente `Auth + sessao + usuario atual` no v2 com:

1. `AuthPage/AuthCard` reais a partir de `design/GovGo Login.html`;
2. API local de auth reaproveitando `gvg_auth.py`;
3. provider global de auth em `src/app/providers/`;
4. ligacao do formulario aos endpoints de login/signup/forgot/reset/me/logout;
5. shell autenticado;
6. integracao minima da topbar e da rail com usuario real;
7. so depois favoritos/historico.

Isso cria a base correta para todo o resto.
