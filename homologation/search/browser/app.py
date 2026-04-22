from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

try:
    from flask import Flask, Response, abort, render_template_string, request
except Exception as exc:  # pragma: no cover
    raise SystemExit(
        "Flask nao esta disponivel no ambiente atual. "
        "Instale as dependencias Python antes de rodar o browser tester."
    ) from exc


PROJECT_ROOT = Path(__file__).resolve().parents[3]
HOMOLOGATION_ROOT = PROJECT_ROOT / "homologation" / "search"
FIXTURES_PATH = HOMOLOGATION_ROOT / "fixtures" / "search_cases.json"
TESTS_ROOT = HOMOLOGATION_ROOT / "tests"
TEST_MODELS_PATH = TESTS_ROOT / "models" / "search_models.json"
TEST_RUNS_DIR = TESTS_ROOT / "runs"
ACTIVE_SEARCH_ROOT = HOMOLOGATION_ROOT / "v1_copy" / "gvg_browser"
DEFAULT_SELECTED_MODELS = ["semantic_fast", "hybrid_fusion", "keyword_fast"]
SEARCH_TYPES = ["semantic", "keyword", "hybrid", "correspondence", "category_filtered"]
CATEGORY_BASES = ["semantic", "keyword", "hybrid"]
MAX_RECENT_RUNS = 8

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from homologation.search.core.adapter import SearchAdapter
from homologation.search.core.contracts import SearchRequest


APP = Flask(__name__)
ADAPTER = SearchAdapter()

DEFAULT_MODEL_CATALOG = [
    {
        "id": "semantic_fast",
        "label": "Semantico rapido",
        "description": "Busca semantica padrao da homologacao.",
        "request": {
            "search_type": "semantic",
            "limit": 5,
            "preprocess": True,
            "prefer_preproc_v2": True,
            "filter_expired": True,
            "use_negation": True,
            "category_search_base": "semantic",
        },
    },
    {
        "id": "keyword_fast",
        "label": "Keyword rapido",
        "description": "Busca por palavras-chave para comparacao direta.",
        "request": {
            "search_type": "keyword",
            "limit": 5,
            "preprocess": True,
            "prefer_preproc_v2": True,
            "filter_expired": True,
            "use_negation": True,
            "category_search_base": "semantic",
        },
    },
    {
        "id": "hybrid_fusion",
        "label": "Hibrido fusao",
        "description": "Busca hibrida otimizada por fusao rapida.",
        "request": {
            "search_type": "hybrid",
            "limit": 5,
            "preprocess": True,
            "prefer_preproc_v2": True,
            "filter_expired": True,
            "use_negation": True,
            "category_search_base": "semantic",
        },
    },
    {
        "id": "correspondence_semantic",
        "label": "Correspondencia",
        "description": "Busca por correspondencia de categorias com base semantica.",
        "request": {
            "search_type": "correspondence",
            "limit": 5,
            "preprocess": True,
            "prefer_preproc_v2": True,
            "filter_expired": True,
            "use_negation": True,
            "category_search_base": "semantic",
        },
    },
    {
        "id": "category_filtered_hybrid",
        "label": "Categoria filtrada",
        "description": "Busca filtrada por categorias usando base hibrida.",
        "request": {
            "search_type": "category_filtered",
            "limit": 5,
            "preprocess": True,
            "prefer_preproc_v2": True,
            "filter_expired": True,
            "use_negation": True,
            "category_search_base": "hybrid",
        },
    },
]


HTML = """
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GovGo v2 :: Laboratorio de Busca</title>
  <style>
    :root {
      --bg: #eef2f7;
      --card: #ffffff;
      --panel: #f9fbff;
      --line: #d7deeb;
      --text: #152033;
      --muted: #61708d;
      --accent: #0f6fff;
      --accent-2: #ff6b3d;
      --accent-3: #11356b;
      --ok-bg: #ebf8ef;
      --ok-text: #12653f;
      --fail-bg: #fdeaea;
      --fail-text: #b42318;
      --shadow: 0 12px 32px rgba(15, 26, 48, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: linear-gradient(180deg, #f6f8fc 0%, var(--bg) 100%);
      color: var(--text);
      font-family: Segoe UI, Tahoma, sans-serif;
    }
    .page {
      width: 100%;
      padding: 14px;
    }
    .hero {
      background: linear-gradient(135deg, #0f2340 0%, #1b4f9c 100%);
      color: #fff;
      border-radius: 18px;
      padding: 18px 22px;
      box-shadow: var(--shadow);
      margin-bottom: 16px;
    }
    .hero p {
      margin: 8px 0 0;
      color: rgba(255, 255, 255, 0.82);
    }
    .hero-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      margin-top: 12px;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.82);
    }
    .workspace {
      display: grid;
      grid-template-columns: minmax(360px, 430px) minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }
    .left-col,
    .right-col {
      display: grid;
      gap: 16px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 18px;
      box-shadow: var(--shadow);
    }
    .card h2,
    .card h3 {
      margin: 0;
    }
    .muted {
      color: var(--muted);
    }
    .small {
      font-size: 12px;
      color: var(--muted);
    }
    .section-head {
      display: grid;
      gap: 6px;
      margin-bottom: 14px;
    }
    label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 6px;
    }
    input,
    select,
    textarea {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 11px 12px;
      font-size: 14px;
      color: var(--text);
      background: #fff;
    }
    textarea {
      min-height: 90px;
      resize: vertical;
    }
    .stack {
      display: grid;
      gap: 12px;
    }
    .inline-grid {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 12px;
    }
    .model-grid,
    .fixture-grid,
    .result-grid,
    .summary-grid {
      display: grid;
      gap: 12px;
    }
    .model-grid,
    .fixture-grid {
      grid-template-columns: 1fr;
    }
    .result-grid {
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
    }
    .summary-grid {
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    }
    .select-card,
    .fixture-card,
    .summary-box,
    .result-card,
    .run-item {
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--panel);
    }
    .select-card,
    .fixture-card,
    .summary-box,
    .run-item {
      padding: 12px;
    }
    .model-toggle {
      display: grid;
      grid-template-columns: 24px minmax(0, 1fr);
      gap: 10px;
      align-items: start;
    }
    .model-toggle input {
      width: 18px;
      height: 18px;
      margin-top: 3px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 999px;
      background: #e7efff;
      color: #1e4ea3;
      font-size: 12px;
      font-weight: 700;
    }
    .pill.ok {
      background: var(--ok-bg);
      color: var(--ok-text);
    }
    .pill.fail {
      background: var(--fail-bg);
      color: var(--fail-text);
    }
    .action-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    button {
      border: 0;
      border-radius: 12px;
      padding: 11px 14px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      background: var(--accent);
      color: #fff;
    }
    button.secondary {
      background: var(--accent-2);
    }
    button.ghost {
      background: #eef3ff;
      color: #24448a;
    }
    .summary-box strong {
      display: block;
      margin-top: 6px;
      font-size: 23px;
      line-height: 1.1;
    }
    .result-card {
      padding: 14px;
      background: #fff;
    }
    .result-head {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 10px;
      margin-bottom: 12px;
    }
    .result-title {
      display: grid;
      gap: 4px;
    }
    .result-table-wrap {
      overflow-x: auto;
      margin-top: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th,
    td {
      padding: 9px 7px;
      border-bottom: 1px solid #ebeff6;
      text-align: left;
      vertical-align: top;
      font-size: 13px;
    }
    th {
      font-size: 12px;
      color: var(--muted);
      text-transform: uppercase;
    }
    .mono {
      font-family: Consolas, monospace;
    }
    .title {
      font-weight: 700;
    }
    .error {
      margin-top: 10px;
      padding: 11px 12px;
      border: 1px solid #f4c2c0;
      border-radius: 12px;
      background: var(--fail-bg);
      color: var(--fail-text);
    }
    .path-box {
      padding: 10px 12px;
      border-radius: 12px;
      background: #f2f6ff;
      border: 1px solid #d7e4ff;
      color: #24448a;
      font-size: 13px;
      overflow-wrap: anywhere;
    }
    .run-list {
      display: grid;
      gap: 10px;
    }
    .run-item a {
      color: #1c4b9c;
      text-decoration: none;
      font-weight: 700;
    }
    .empty {
      min-height: 280px;
      display: grid;
      place-items: center;
      text-align: center;
      color: var(--muted);
      border: 1px dashed var(--line);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.64);
      padding: 20px;
    }
    @media (max-width: 1080px) {
      .workspace {
        grid-template-columns: 1fr;
      }
      .result-grid {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 720px) {
      .inline-grid {
        grid-template-columns: 1fr;
      }
      .page {
        padding: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="hero">
      <h1>GovGo v2 :: Laboratorio de Busca</h1>
      <p>Bancada de homologacao para comparar o mesmo input entre modelos diferentes, rodar suites simples e salvar tudo dentro da homologacao.</p>
      <div class="hero-meta">
        <div><strong>Core ativo:</strong> {{ active_search_root }}</div>
        <div><strong>Diretorio de testes:</strong> {{ tests_root }}</div>
        <div><strong>Porta:</strong> 8011</div>
      </div>
    </div>

    <div class="workspace">
      <div class="left-col">
        <div class="card">
          <div class="section-head">
            <h2>Busca</h2>
            <div class="muted">Altere a consulta e rode o mesmo input em varios modelos ao mesmo tempo.</div>
          </div>
          <form method="post" class="stack">
            <input type="hidden" name="action" value="compare">
            <div>
              <label for="query">Consulta base</label>
              <input id="query" name="query" value="{{ form.query }}" placeholder="Ex.: alimentacao hospitalar">
            </div>
            <div class="inline-grid">
              <div>
                <label for="test_label">Nome do teste</label>
                <input id="test_label" name="test_label" value="{{ form.test_label }}" placeholder="Ex.: comparacao alimentacao hospitalar">
              </div>
              <div>
                <label for="limit">Limite</label>
                <input id="limit" name="limit" type="number" min="1" max="20" value="{{ form.limit }}">
              </div>
            </div>
            <div>
              <label>Modelos para comparar</label>
              <div class="model-grid">
                {% for model in test_models %}
                <div class="select-card">
                  <label class="model-toggle">
                    <input type="checkbox" name="model_ids" value="{{ model.id }}" {% if model.id in form.selected_model_ids %}checked{% endif %}>
                    <span>
                      <span class="title">{{ model.label }}</span>
                      <span class="small">{{ model.description }}</span>
                      <div class="small">tipo={{ model.request.search_type }} | base={{ model.request.category_search_base or '-' }} | preproc={{ 'on' if model.request.preprocess else 'off' }}</div>
                    </span>
                  </label>
                </div>
                {% endfor %}
              </div>
            </div>
            <div class="action-row">
              <button type="submit">Comparar modelos</button>
              <button type="submit" formaction="/" name="action" value="smoke" class="secondary">Rodar suite simples</button>
            </div>
          </form>
        </div>

        <div class="card">
          <div class="section-head">
            <h2>Casos base</h2>
            <div class="muted">Carregue um caso pronto e use como ponto de partida para varios testes do mesmo modelo.</div>
          </div>
          <div class="fixture-grid">
            {% for case in fixture_cases %}
            <div class="fixture-card">
              <div class="title">{{ case.name }}</div>
              <div style="margin-top: 6px; font-size: 18px; font-weight: 700;">{{ case.query }}</div>
              <div style="margin-top: 8px;" class="small">tipo={{ case.search_type }} | limite={{ case.limit }} | minimo esperado={{ case.expected_min_results }}</div>
              <form method="post" style="margin-top: 10px;">
                <input type="hidden" name="action" value="load_fixture">
                <input type="hidden" name="fixture_name" value="{{ case.name }}">
                <button type="submit" class="ghost">Carregar e comparar</button>
              </form>
            </div>
            {% endfor %}
          </div>
        </div>

        <div class="card">
          <div class="section-head">
            <h2>Ultimos testes salvos</h2>
            <div class="muted">Cada comparacao e cada suite salva um JSON automaticamente em homologation/search/tests/runs.</div>
          </div>
          <div class="run-list">
            {% if recent_runs %}
              {% for item in recent_runs %}
              <div class="run-item">
                <div class="title">{{ item.label }}</div>
                <div class="small">{{ item.kind }} | {{ item.saved_at or '-' }}</div>
                <div class="small">{{ item.query or item.file_name }}</div>
                <div style="margin-top: 6px;"><a href="/runs/{{ item.file_name }}" target="_blank">Abrir JSON salvo</a></div>
              </div>
              {% endfor %}
            {% else %}
              <div class="small">Nenhum teste salvo ainda.</div>
            {% endif %}
          </div>
        </div>
      </div>

      <div class="right-col">
        {% if saved_run %}
        <div class="card">
          <div class="section-head">
            <h2>Teste salvo</h2>
            <div class="muted">O resultado desta execucao foi guardado dentro da homologacao.</div>
          </div>
          <div class="path-box">{{ saved_run.absolute_path }}</div>
          <div style="margin-top: 10px;"><a href="/runs/{{ saved_run.file_name }}" target="_blank">Abrir JSON salvo</a></div>
        </div>
        {% endif %}

        {% if compare_summary %}
        <div class="card">
          <div class="section-head">
            <h2>Comparacao atual</h2>
            <div class="muted">Mesmo input executado em varios modelos. Compare tempo, confianca e resultado de cada abordagem.</div>
          </div>
          <div class="summary-grid">
            <div class="summary-box"><span class="small">Consulta</span><strong>{{ compare_summary.query }}</strong></div>
            <div class="summary-box"><span class="small">Modelos</span><strong>{{ compare_summary.total_models }}</strong></div>
            <div class="summary-box"><span class="small">Mais rapido</span><strong>{{ compare_summary.fastest_ms }} ms</strong></div>
            <div class="summary-box"><span class="small">Mais lento</span><strong>{{ compare_summary.slowest_ms }} ms</strong></div>
          </div>
        </div>

        <div class="result-grid">
          {% for item in compare_results %}
          <div class="result-card">
            <div class="result-head">
              <div class="result-title">
                <h3>{{ item.model.label }}</h3>
                <div class="small">{{ item.model.description }}</div>
                <div class="small">tipo={{ item.response.request.search_type }} | base={{ item.response.request.category_search_base }}</div>
              </div>
              <span class="pill">{{ item.model.id }}</span>
            </div>
            <div class="summary-grid">
              <div class="summary-box"><span class="small">Tempo</span><strong>{{ item.response.elapsed_ms }} ms</strong></div>
              <div class="summary-box"><span class="small">Resultados</span><strong>{{ item.response.result_count }}</strong></div>
              <div class="summary-box"><span class="small">Confianca</span><strong>{{ '%.2f'|format(item.response.confidence) }}</strong></div>
              <div class="summary-box"><span class="small">Preproc</span><strong>{{ 'on' if item.response.preprocessing.enabled else 'off' }}</strong></div>
            </div>

            {% if item.response.preprocessing %}
            <div style="margin-top: 10px;" class="small">
              <strong>Termos:</strong> {{ item.response.preprocessing.search_terms or '-' }}
              {% if item.response.preprocessing.skip_reason %}
               | <strong>bypass:</strong> {{ item.response.preprocessing.skip_reason }}
              {% endif %}
            </div>
            {% endif %}

            {% if item.response.error %}
            <div class="error">{{ item.response.error }}</div>
            {% endif %}

            {% if item.response.meta.top_categories_preview %}
            <div style="margin-top: 10px;" class="small">
              <strong>Top categorias:</strong>
              {% for top in item.response.meta.top_categories_preview %}
                {% if not loop.first %} | {% endif %}{{ top.codigo }}
              {% endfor %}
            </div>
            {% endif %}

            {% if item.response.results %}
            <div class="result-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Sim</th>
                    <th>Objeto</th>
                    <th>Orgao</th>
                    <th>Municipio/UF</th>
                  </tr>
                </thead>
                <tbody>
                  {% for result in item.response.results %}
                  <tr>
                    <td class="mono">{{ result.rank }}</td>
                    <td class="mono">{{ '%.4f'|format(result.similarity) }}</td>
                    <td>
                      <div class="title">{{ result.title or '-' }}</div>
                      <div class="small mono">{{ result.item_id or '-' }}</div>
                    </td>
                    <td>{{ result.organization or '-' }}</td>
                    <td>{{ result.municipality or '-' }}{% if result.uf %}/{{ result.uf }}{% endif %}</td>
                  </tr>
                  {% endfor %}
                </tbody>
              </table>
            </div>
            {% endif %}
          </div>
          {% endfor %}
        </div>
        {% elif smoke_summary %}
        <div class="card">
          <div class="section-head">
            <h2>Suite simples</h2>
            <div class="muted">Execucao dos casos base do laboratorio para checagem rapida de comportamento.</div>
          </div>
          <div class="summary-grid">
            <div class="summary-box"><span class="small">Casos</span><strong>{{ smoke_summary.total }}</strong></div>
            <div class="summary-box"><span class="small">Passaram</span><strong>{{ smoke_summary.passed }}</strong></div>
            <div class="summary-box"><span class="small">Falharam</span><strong>{{ smoke_summary.failed }}</strong></div>
            <div class="summary-box"><span class="small">Tempo total</span><strong>{{ smoke_summary.elapsed_ms }} ms</strong></div>
          </div>
          <div class="result-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Caso</th>
                  <th>Status</th>
                  <th>Tempo</th>
                  <th>Resultados</th>
                  <th>Primeiro resultado</th>
                </tr>
              </thead>
              <tbody>
                {% for item in smoke_report %}
                <tr>
                  <td>
                    <div class="title">{{ item.name }}</div>
                    <div class="small">{{ item.query }} | {{ item.search_type }}</div>
                  </td>
                  <td><span class="pill {% if item.passed %}ok{% else %}fail{% endif %}">{{ 'OK' if item.passed else 'FAIL' }}</span></td>
                  <td class="mono">{{ item.elapsed_ms }} ms</td>
                  <td class="mono">{{ item.result_count }}</td>
                  <td>{{ item.top_title or '-' }}</td>
                </tr>
                {% endfor %}
              </tbody>
            </table>
          </div>
        </div>
        {% else %}
        <div class="empty">
          <div>
            <h2>Nenhum resultado carregado</h2>
            <p>Escolha uma consulta, selecione modelos na coluna esquerda e execute a comparacao. Cada teste sera salvo automaticamente em homologation/search/tests/runs.</p>
          </div>
        </div>
        {% endif %}
      </div>
    </div>
  </div>
</body>
</html>
"""


def ensure_test_storage() -> None:
    TEST_MODELS_PATH.parent.mkdir(parents=True, exist_ok=True)
    TEST_RUNS_DIR.mkdir(parents=True, exist_ok=True)
    if not TEST_MODELS_PATH.exists():
        TEST_MODELS_PATH.write_text(
            json.dumps(DEFAULT_MODEL_CATALOG, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )



def load_fixture_cases() -> list[dict[str, Any]]:
    if not FIXTURES_PATH.exists():
        return []
    return json.loads(FIXTURES_PATH.read_text(encoding="utf-8"))



def load_test_models() -> list[dict[str, Any]]:
    ensure_test_storage()
    return json.loads(TEST_MODELS_PATH.read_text(encoding="utf-8"))



def model_index(test_models: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {str(model.get("id")): model for model in test_models}



def slugify(value: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9]+", "-", (value or "").strip().lower()).strip("-")
    return text or "teste"



def default_form_state() -> dict[str, Any]:
    return {
        "query": "alimentacao hospitalar",
        "limit": 5,
        "test_label": "comparacao alimentacao hospitalar",
        "selected_model_ids": list(DEFAULT_SELECTED_MODELS),
    }



def normalize_model_selection(selected_ids: list[str], test_models: list[dict[str, Any]]) -> list[str]:
    allowed = {str(model.get("id")) for model in test_models}
    normalized = [model_id for model_id in selected_ids if model_id in allowed]
    return normalized or list(DEFAULT_SELECTED_MODELS)



def build_form_state(test_models: list[dict[str, Any]]) -> dict[str, Any]:
    if request.method != "POST":
        return default_form_state()
    return {
        "query": request.form.get("query", "").strip(),
        "limit": int(request.form.get("limit", "5") or 5),
        "test_label": request.form.get("test_label", "").strip() or request.form.get("query", "").strip(),
        "selected_model_ids": normalize_model_selection(request.form.getlist("model_ids"), test_models),
    }



def suggest_models_for_case(case: dict[str, Any], test_models: list[dict[str, Any]]) -> list[str]:
    target_type = str(case.get("search_type", "semantic"))
    target_base = str(case.get("category_search_base", "semantic"))
    selected = []
    for model in test_models:
        req = model.get("request", {})
        if req.get("search_type") == target_type:
            if target_type in {"correspondence", "category_filtered"}:
                if req.get("category_search_base", "semantic") != target_base:
                    continue
            selected.append(str(model.get("id")))
    for fallback in DEFAULT_SELECTED_MODELS:
        if fallback not in selected:
            selected.append(fallback)
    return selected[:4]



def form_from_case(case: dict[str, Any], test_models: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "query": str(case.get("query", "")).strip(),
        "limit": int(case.get("limit", 5) or 5),
        "test_label": str(case.get("name", case.get("query", "teste"))),
        "selected_model_ids": suggest_models_for_case(case, test_models),
    }



def build_request_from_model(model: dict[str, Any], query: str, limit: int) -> SearchRequest:
    payload = dict(model.get("request", {}))
    payload["query"] = query
    payload["limit"] = limit
    return SearchRequest.from_mapping(payload)



def top_title_from_response(response: dict[str, Any]) -> str:
    results = response.get("results") or []
    if not results:
        return ""
    return str(results[0].get("title") or "")



def save_test_run(kind: str, label: str, payload: dict[str, Any]) -> dict[str, str]:
    ensure_test_storage()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_name = f"{timestamp}__{slugify(label)}.json"
    file_path = TEST_RUNS_DIR / file_name
    file_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return {
        "file_name": file_name,
        "absolute_path": str(file_path),
        "relative_path": str(file_path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
    }



def load_recent_runs(limit: int = MAX_RECENT_RUNS) -> list[dict[str, Any]]:
    ensure_test_storage()
    files = sorted(TEST_RUNS_DIR.glob("*.json"), key=lambda item: item.stat().st_mtime, reverse=True)
    recent = []
    for file_path in files[:limit]:
        try:
            data = json.loads(file_path.read_text(encoding="utf-8"))
        except Exception:
            data = {}
        recent.append(
            {
                "file_name": file_path.name,
                "label": data.get("label") or file_path.stem,
                "kind": data.get("kind") or "run",
                "saved_at": data.get("saved_at") or datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(timespec="seconds"),
                "query": data.get("query") or data.get("suite_name") or "",
            }
        )
    return recent



def run_compare(form: dict[str, Any], test_models: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, Any], dict[str, str]]:
    models_by_id = model_index(test_models)
    compare_results = []
    elapsed_values = []
    for model_id in form["selected_model_ids"]:
        model = models_by_id.get(model_id)
        if model is None:
            continue
        response = ADAPTER.run(build_request_from_model(model, form["query"], form["limit"])).to_dict()
        compare_results.append({"model": model, "response": response})
        elapsed_values.append(int(response.get("elapsed_ms", 0) or 0))

    compare_summary = {
        "query": form["query"],
        "total_models": len(compare_results),
        "fastest_ms": min(elapsed_values) if elapsed_values else 0,
        "slowest_ms": max(elapsed_values) if elapsed_values else 0,
    }
    run_payload = {
        "saved_at": datetime.now().isoformat(timespec="seconds"),
        "kind": "compare",
        "label": form["test_label"] or form["query"],
        "query": form["query"],
        "limit": form["limit"],
        "selected_model_ids": form["selected_model_ids"],
        "results": compare_results,
        "summary": compare_summary,
    }
    saved_run = save_test_run("compare", form["test_label"] or form["query"], run_payload)
    return compare_results, compare_summary, saved_run



def run_fixture_batch(fixture_cases: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, Any], dict[str, str]]:
    report = []
    total_elapsed = 0
    passed = 0
    for case in fixture_cases:
        response = ADAPTER.run(SearchRequest.from_mapping(case)).to_dict()
        expected_min = int(case.get("expected_min_results", 0) or 0)
        result_count = int(response.get("result_count", 0) or 0)
        case_passed = (not response.get("error")) and result_count >= expected_min
        if case_passed:
            passed += 1
        elapsed_ms = int(response.get("elapsed_ms", 0) or 0)
        total_elapsed += elapsed_ms
        report.append(
            {
                "name": case.get("name") or case.get("query") or "caso",
                "query": case.get("query") or "",
                "search_type": case.get("search_type") or "semantic",
                "elapsed_ms": elapsed_ms,
                "result_count": result_count,
                "passed": case_passed,
                "top_title": top_title_from_response(response),
                "error": response.get("error"),
                "response": response,
            }
        )
    summary = {
        "total": len(report),
        "passed": passed,
        "failed": len(report) - passed,
        "elapsed_ms": total_elapsed,
    }
    run_payload = {
        "saved_at": datetime.now().isoformat(timespec="seconds"),
        "kind": "suite",
        "label": "suite simples da busca",
        "suite_name": "search_cases",
        "results": report,
        "summary": summary,
    }
    saved_run = save_test_run("suite", "suite-simples-da-busca", run_payload)
    return report, summary, saved_run


@APP.route("/runs/<path:file_name>", methods=["GET"])
def open_saved_run(file_name: str) -> Response:
    ensure_test_storage()
    target = (TEST_RUNS_DIR / file_name).resolve()
    if target.parent != TEST_RUNS_DIR.resolve() or not target.exists():
        abort(404)
    return Response(target.read_text(encoding="utf-8"), mimetype="application/json; charset=utf-8")


@APP.route("/", methods=["GET", "POST"])
def index() -> str:
    ensure_test_storage()
    fixture_cases = load_fixture_cases()
    test_models = load_test_models()
    form = default_form_state()
    compare_results = None
    compare_summary = None
    smoke_report = None
    smoke_summary = None
    saved_run = None

    if request.method == "POST":
        action = request.form.get("action", "compare").strip().lower()
        if action == "smoke":
            smoke_report, smoke_summary, saved_run = run_fixture_batch(fixture_cases)
        elif action == "load_fixture":
            case_name = request.form.get("fixture_name", "")
            case = next((item for item in fixture_cases if item.get("name") == case_name), None)
            if case is not None:
                form = form_from_case(case, test_models)
                compare_results, compare_summary, saved_run = run_compare(form, test_models)
        else:
            form = build_form_state(test_models)
            if form["query"]:
                compare_results, compare_summary, saved_run = run_compare(form, test_models)

    return render_template_string(
        HTML,
        active_search_root=str(ACTIVE_SEARCH_ROOT),
        tests_root=str(TESTS_ROOT),
        fixture_cases=fixture_cases,
        test_models=test_models,
        form=form,
        compare_results=compare_results,
        compare_summary=compare_summary,
        smoke_report=smoke_report,
        smoke_summary=smoke_summary,
        saved_run=saved_run,
        recent_runs=load_recent_runs(),
        search_types=SEARCH_TYPES,
        category_bases=CATEGORY_BASES,
    )


if __name__ == "__main__":
    APP.run(host="127.0.0.1", port=8011, debug=True)
