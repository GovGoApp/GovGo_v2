# Análise do Pipeline de Boletins (v1)

Data da análise: 2026-04-24

## 1. Contexto

Este documento descreve o pipeline de boletins agendados que hoje está configurado para execução periódica no ambiente da Render, no projeto v1.

Pasta-base do pipeline:

- `C:\Users\Haroldo Duraes\Desktop\Scripts\GovGo\v1\search\gvg_browser\scripts`

Comandos atualmente configurados no scheduler:

- Command:
  - `bash -lc "bash run_pipeline_boletim.sh"`
- Build Command:
  - `pip install -r requirements.txt`

Arquivos reais confirmados:

- [run_pipeline_boletim.sh](</C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/scripts/run_pipeline_boletim.sh>)
- [requirements.txt](</C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/scripts/requirements.txt>)
- [00_pipeline_boletim.py](</C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/scripts/00_pipeline_boletim.py>)
- [01_run_scheduled_boletins.py](</C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/scripts/01_run_scheduled_boletins.py>)
- [02_send_boletins_email.py](</C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/scripts/02_send_boletins_email.py>)
- [03_backfill_preproc_output.py](</C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/scripts/03_backfill_preproc_output.py>)
- [backfill_user_settings.py](</C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/scripts/backfill_user_settings.py>)
- módulo de persistência:
  - [gvg_boletim.py](</C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/gvg_boletim.py>)

## 2. Resumo executivo

O pipeline de boletins é um pipeline de produto, não de ingestão PNCP.

Ele faz duas coisas principais:

1. executa buscas salvas/agendadas de usuários em `user_schedule`;
2. envia por e-mail os resultados novos gravados em `user_boletim`.

Fluxo atual:

1. `run_pipeline_boletim.sh`
2. `00_pipeline_boletim.py`
3. `01_run_scheduled_boletins.py`
4. `02_send_boletins_email.py`

O script `03_backfill_preproc_output.py` existe, mas está vazio e hoje não participa do cron.

## 3. Orquestração real

### 3.1 Wrapper Shell

Arquivo:

- [run_pipeline_boletim.sh](</C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/scripts/run_pipeline_boletim.sh>)

Função:

- descobre o executável Python disponível;
- verifica dependências essenciais;
- roda `pip install -r requirements.txt` se necessário;
- define `PIPELINE_TIMESTAMP`;
- monta `PYTHONPATH` com a raiz do projeto;
- executa `00_pipeline_boletim.py`.

Dependências mínimas verificadas no shell:

- `requests`
- `psycopg2`
- `dotenv`
- `pandas`
- `numpy`
- `sqlalchemy`

Observação:

- o `Build Command` da Render já instala dependências;
- ainda assim, o shell faz bootstrap defensivo de novo se detectar falta de pacote.

### 3.2 Orquestrador Python

Arquivo:

- [00_pipeline_boletim.py](</C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/scripts/00_pipeline_boletim.py>)

Função:

- cria uma sessão única de pipeline;
- define um `PIPELINE_TIMESTAMP` único;
- compartilha um único arquivo de log em `logs/log_<timestamp>.log`;
- executa, em sequência:
  - `search.gvg_browser.scripts.01_run_scheduled_boletins`
  - `search.gvg_browser.scripts.02_send_boletins_email`

Regras de falha:

- se qualquer etapa retornar código não-zero, o pipeline inteiro falha.

## 4. Etapa 1: execução das buscas agendadas

Arquivo:

- [01_run_scheduled_boletins.py](</C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/scripts/01_run_scheduled_boletins.py>)

### 4.1 Objetivo

Executar boletins ativos agendados em `user_schedule` e gravar o resultado em `user_boletim`.

### 4.2 O que a etapa faz

1. lê os agendamentos ativos elegíveis para o momento atual;
2. decide se cada agendamento está “due” com base em:
   - `schedule_type`
   - `schedule_detail.days`
3. prepara a busca:
   - query textual
   - configuração
   - filtros
   - eventual `preproc_output`
4. executa a busca usando o motor do browser:
   - `semantic_search`
   - `keyword_search`
   - `hybrid_search`
   - `correspondence_search`
   - `category_filtered_search`
5. compacta o payload dos resultados;
6. grava as linhas em `public.user_boletim`;
7. atualiza `last_run_at` do agendamento;
8. salva `preproc_output` no próprio `user_schedule`, quando houver.

### 4.3 Tabelas tocadas

Leitura:

- `public.user_schedule`
- fallback legado: `public.user_boletins`
- `public.contratacao` e tabelas relacionadas, indiretamente via motor de busca

Escrita:

- `public.user_boletim`
- `public.user_schedule.last_run_at`
- `public.user_schedule.preproc_output`

### 4.4 Campos importantes

De `user_schedule`:

- `id`
- `user_id`
- `query_text`
- `schedule_type`
- `schedule_detail`
- `channels`
- `config_snapshot`
- `filters`
- `preproc_output`
- `last_run_at`

Gravados em `user_boletim`:

- `boletim_id`
- `user_id`
- `run_token`
- `run_at`
- `numero_controle_pncp`
- `similarity`
- `data_publicacao_pncp`
- `data_encerramento_proposta`
- `payload`

### 4.5 Regras de elegibilidade do agendamento

Implementadas em [gvg_boletim.py](</C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/gvg_boletim.py>):

- `DIARIO` / `MULTIDIARIO`
  - usa `schedule_detail.days`
  - se vazio, assume dias úteis: `seg` a `sex`
- `SEMANAL`
  - usa explicitamente os dias configurados

### 4.6 Observação importante

Essa etapa não envia e-mail.

Ela apenas:

- executa a busca;
- persiste o snapshot do run em `user_boletim`.

## 5. Etapa 2: envio dos boletins por e-mail

Arquivo:

- [02_send_boletins_email.py](</C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/scripts/02_send_boletins_email.py>)

### 5.1 Objetivo

Enviar por e-mail o último run relevante de cada boletim, quando houver execução nova ainda não marcada como enviada.

### 5.2 O que a etapa faz

1. busca boletins com:
   - `active = true`
   - `last_run_at IS NOT NULL`
   - `last_sent_at IS NULL OR last_sent_at < last_run_at`
2. para cada boletim, encontra o `MAX(run_at)` em `user_boletim`;
3. busca as linhas daquele último run;
4. busca o e-mail do usuário em `auth.users`;
5. renderiza HTML do boletim;
6. envia via SMTP;
7. atualiza `last_sent_at` em `user_schedule`.

### 5.3 Tabelas tocadas

Leitura:

- `public.user_schedule`
- fallback legado: `public.user_boletins`
- `public.user_boletim`
- `auth.users`

Escrita:

- `public.user_schedule.last_sent_at`

### 5.4 Observação importante

O script hoje trabalha com a ideia de “último run do boletim”.

Ele não reexecuta a busca; ele só envia o que a etapa 1 já gravou.

## 6. Módulo central de persistência

Arquivo:

- [gvg_boletim.py](</C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/gvg_boletim.py>)

Este é o módulo que concentra a lógica de leitura/escrita da base para boletins.

Funções centrais:

- `fetch_user_boletins()`
- `create_user_boletim(...)`
- `deactivate_user_boletim(...)`
- `list_active_schedules_all(...)`
- `record_boletim_results(...)`
- `fetch_unsent_results_for_boletim(...)`
- `mark_results_sent(...)`
- `touch_last_run(...)`
- `get_user_email(...)`
- `set_last_sent(...)`
- `update_schedule_preproc_output(...)`

### 6.1 Padrões importantes do módulo

1. mantém fallback para schema legado:
   - `user_schedule`
   - fallback `user_boletins`

2. tolera ausência de colunas novas:
   - `filters`
   - `preproc_output`
   - `last_sent_at`

3. usa cache leve em memória só para leitura de boletins na UI:
   - `_BOLETIM_CACHE`

## 7. Tabelas do pipeline

### 7.1 `public.user_schedule`

Papel:

- agenda/configuração do boletim

Campos relevantes no pipeline:

- `id`
- `user_id`
- `query_text`
- `schedule_type`
- `schedule_detail`
- `channels`
- `config_snapshot`
- `filters`
- `preproc_output`
- `active`
- `last_run_at`
- `last_sent_at`
- `created_at`
- `updated_at`

### 7.2 `public.user_boletim`

Papel:

- snapshot de resultados de cada execução do boletim

Campos relevantes:

- `id`
- `boletim_id`
- `user_id`
- `run_token`
- `run_at`
- `numero_controle_pncp`
- `similarity`
- `data_publicacao_pncp`
- `data_encerramento_proposta`
- `payload`
- `sent`
- `sent_at`

### 7.3 `auth.users`

Papel:

- fonte do e-mail de destino do usuário

Campo usado:

- `email`

## 8. Contrato operacional do pipeline

O pipeline pressupõe:

1. que a base de busca já esteja funcional;
2. que existam boletins ativos em `user_schedule`;
3. que `auth.users.email` esteja populado;
4. que o SMTP esteja configurado;
5. que o pacote Python consiga importar `search.gvg_browser.*`.

## 9. O que o cron atual de fato cobre

O cron mostrado na Render cobre apenas o pipeline de boletins.

Ele não faz:

- ingestão PNCP
- embeddings PNCP
- categorização PNCP
- backfill de PCA/ATA

Ele depende desses dados já existirem, porque a etapa 1 usa o motor de busca operacional do produto.

## 10. Gaps e riscos atuais

### 10.1 Script vazio

Arquivo:

- [03_backfill_preproc_output.py](</C:/Users/Haroldo Duraes/Desktop/Scripts/GovGo/v1/search/gvg_browser/scripts/03_backfill_preproc_output.py>)

Status:

- arquivo com tamanho zero
- não participa do cron
- indica trilha planejada, mas não implementada

### 10.2 Duplicidade de bootstrap

Hoje há bootstrap em dois lugares:

- Render Build Command
- `run_pipeline_boletim.sh`

Funciona, mas é redundante.

### 10.3 Compatibilidade legada no código

O pipeline mantém muitos fallbacks:

- `user_schedule` vs `user_boletins`
- presença/ausência de `filters`
- presença/ausência de `preproc_output`
- presença/ausência de `last_sent_at`

Isso ajuda a sobreviver a schemas mistos, mas aumenta complexidade.

### 10.4 Acoplamento ao motor de busca

A etapa 1 depende diretamente de:

- pré-processamento
- regras de relevância
- buscas semântica/keyword/híbrida

Ou seja: uma mudança no motor de busca pode alterar o comportamento do boletim sem mudar o pipeline em si.

## 11. Fluxo end-to-end

```text
Render Cron
  -> bash run_pipeline_boletim.sh
    -> 00_pipeline_boletim.py
      -> 01_run_scheduled_boletins.py
        -> lê user_schedule
        -> executa busca
        -> grava user_boletim
        -> atualiza last_run_at / preproc_output
      -> 02_send_boletins_email.py
        -> lê user_schedule com run pendente
        -> lê último run em user_boletim
        -> busca email em auth.users
        -> envia email
        -> atualiza last_sent_at
```

## 12. Conclusão

O pipeline de boletins do v1 está bem separado do pipeline PNCP de ingestão.

Ele é, na prática:

- um pipeline de execução de busca agendada
- seguido por um pipeline de entrega por e-mail

Sua base operacional é:

- `user_schedule` como agenda/configuração
- `user_boletim` como trilha materializada de resultados
- `auth.users` como resolução de destinatário

O principal débito técnico aqui não é ausência de fluxo; é o excesso de compatibilidade legada e a existência de scripts auxiliares ainda incompletos, como `03_backfill_preproc_output.py`.
