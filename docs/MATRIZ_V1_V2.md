# Matriz Funcional v1 -> v2

## Como ler esta matriz

- `Origem v1`: modulo ou ativo principal ja existente.
- `Destino v2`: modo ou camada da v2 que deve absorver a funcionalidade.
- `Acao`: reaproveitar, encapsular ou construir.
- `Prioridade`: ordem pratica para migracao.

Regra de uso:

- esta matriz representa a cobertura funcional alvo do v1 dentro do v2;
- se uma funcionalidade util do v1 nao estiver mapeada aqui, a matriz esta incompleta e precisa ser atualizada;
- mudar a implementacao e permitido, perder a funcao de negocio nao.

## Matriz

| Funcionalidade | Origem v1 | Destino v2 | Acao | Prioridade |
| --- | --- | --- | --- | --- |
| Busca semantica | `search/gvg_browser/gvg_search_core.py` | Busca | Reaproveitar via `SearchService` e API | Alta |
| Busca keyword | `search/gvg_browser/gvg_search_core.py` | Busca | Reaproveitar via API | Alta |
| Busca hibrida | `search/gvg_browser/gvg_search_core.py` | Busca | Reaproveitar via API | Alta |
| Pre-processamento de query | `search/gvg_browser/gvg_preprocessing.py` | Busca / Relatorios | Reaproveitar | Alta |
| Filtro de relevancia | `search/gvg_browser/gvg_search_core.py` | Busca | Reaproveitar | Alta |
| Expansao semantica / embeddings | `search/gvg_browser/gvg_ai_utils.py` | Busca / Relatorios | Reaproveitar com wrapper | Alta |
| Browser de busca Dash | `search/gvg_browser/GvG_Search_Browser.py` | Busca | Encapsular apenas regras e fluxos; nao migrar UI | Alta |
| Detalhe de edital | `GvG_Search_Browser.py` + `gvg_documents.py` | Busca | Encapsular e reprojetar no frontend v2 | Alta |
| Download e resumo de documentos | `search/gvg_browser/gvg_documents.py` | Busca / Empresas / Relatorios | Reaproveitar com `DocumentService` | Media |
| Exportar CSV/XLSX/PDF/HTML | `search/gvg_browser/gvg_exporters.py` | Busca / Relatorios / Empresas | Reaproveitar | Media |
| Perfil de empresa por CNPJ | `scripts/cnpj_search/cnpj_search_v1_3.py` | Empresas | Encapsular em `CompanyService` | Alta |
| Busca por nome de empresa | `cnpj_search_v1_3.py` + queries auxiliares | Empresas | Encapsular e melhorar desambiguacao | Alta |
| Historico de contratos por empresa | `cnpj_search_v1_3.py` + banco v1 | Empresas | Encapsular | Alta |
| Aderencia empresa -> oportunidade | `gvg_search_core.py` + logica do v1 | Empresas / Busca | Encapsular e consolidar | Alta |
| Historico de prompts e resultados | `search/gvg_browser/gvg_user.py` | Inicio / camada transversal | Reaproveitar | Alta |
| Bookmarks / favoritos | `search/gvg_browser/gvg_user.py` | Inicio / camada transversal | Reaproveitar | Alta |
| Usuario atual e sessao | `search/gvg_browser/gvg_user.py` | Camada transversal | Reaproveitar | Alta |
| Autenticacao Supabase | `search/gvg_browser/gvg_auth.py` | Camada transversal | Reaproveitar via API | Alta |
| Billing e planos | `search/gvg_browser/gvg_billing.py` | Camada transversal | Reaproveitar e expor via API | Media |
| Limites de uso | `search/gvg_browser/gvg_billing.py`, `gvg_limits.py`, `gvg_usage.py` | Camada transversal | Reaproveitar e consolidar | Media |
| Boletins agendados | `search/gvg_browser/gvg_boletim.py` | Inicio / camada transversal | Reaproveitar com worker | Media |
| Notificacoes | `search/gvg_browser/gvg_notifications.py` | Inicio / camada transversal | Reaproveitar modelo e integrar com backend | Media |
| Emails operacionais | `search/gvg_browser/gvg_email.py` | Camada transversal | Reaproveitar conforme necessidade | Baixa |
| Relatorios NL -> SQL | `db/reports/GvG_SU_Report_v3.py` | Relatorios | Encapsular e expor via API | Alta |
| Historico de SQL | `GvG_SU_Report_v3.py` | Relatorios | Encapsular e reprojetar no frontend | Media |
| Export de relatorios | `GvG_SU_Report_v3.py` + `gvg_exporters.py` | Relatorios | Reaproveitar | Media |
| Agregacoes de mercado | dados do v1 em `db/`, `scripts/`, `search/` | Radar | Construir `MarketService` novo sobre base existente | Alta |
| Top compradores | base PNCP do v1 | Radar | Construir | Alta |
| Top players / concorrentes | base PNCP do v1 | Radar | Construir | Alta |
| Series temporais e sazonalidade | base PNCP do v1 | Radar | Construir | Alta |
| Construcao do dashboard inicial | artefatos de usuario + resultados + boletins | Inicio | Construir composicao nova com servicos existentes | Media |
| Pipeline de ingestao PNCP | `scripts/`, `db/`, `doc/ARQUITETURA_V1.md` | Backend / operacao | Reaproveitar e estabilizar | Alta |
| Migracoes e schemas | `db/`, `scripts/`, `gvg_schema.py` | Backend / operacao | Reaproveitar e limpar legados | Media |

## Regras de migracao por tipo de ativo

### Reaproveitar

Use quando o ativo ja resolve bem o problema de dominio e so precisa mudar de ponto de entrada.

Exemplos:

- `gvg_search_core.py`
- `gvg_preprocessing.py`
- `gvg_documents.py`
- `gvg_exporters.py`
- `gvg_user.py`
- `gvg_auth.py`
- `gvg_billing.py`
- `gvg_boletim.py`

### Encapsular

Use quando o ativo e valido, mas hoje esta acoplado a uma interface, a um fluxo legado ou a um script.

Exemplos:

- `GvG_Search_Browser.py`
- `GvG_SU_Report_v3.py`
- `cnpj_search_v1_3.py`

### Construir

Use quando a necessidade da v2 nao existe pronta no v1, mas pode ser sustentada por seus dados e servicos.

Exemplos:

- `MarketService` para Radar
- dashboard do Inicio
- contratos de API frontend <-> backend
- camada de estado compartilhado da v2

## Regra de cobertura funcional

Esta matriz nao deve ser usada para justificar corte silencioso de capacidade util do v1.

Ela deve ser usada para garantir que:

1. toda funcionalidade util do v1 tenha destino no v2;
2. toda funcionalidade sem reaproveitamento direto tenha plano de equivalencia funcional;
3. qualquer exclusao seja intencional, explicitada e tecnicamente justificada.

## Ordem recomendada de execucao

1. Busca
2. Empresas
3. Camada transversal de usuario
4. Inicio
5. Relatorios
6. Radar
7. Operacao e producao

Essa ordem reduz risco porque entrega cedo o que o v1 ja tem mais maduro, e deixa para depois o que depende de agregacao nova ou inteligencia competitiva mais elaborada.