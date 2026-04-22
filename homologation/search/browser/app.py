from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from flask import Flask, Response, abort, render_template_string, request


PROJECT_ROOT = Path(__file__).resolve().parents[3]
HOMOLOGATION_ROOT = PROJECT_ROOT / "homologation" / "search"
FIXTURES_PATH = HOMOLOGATION_ROOT / "fixtures" / "search_cases.json"
TESTS_ROOT = HOMOLOGATION_ROOT / "tests"
TEST_MODELS_PATH = TESTS_ROOT / "models" / "search_models.json"
TEST_RUNS_DIR = TESTS_ROOT / "runs"
ACTIVE_SEARCH_ROOT = HOMOLOGATION_ROOT / "v1_copy" / "gvg_browser"
DEFAULT_SELECTED_MODELS = ["semantic_fast", "keyword_fast", "hybrid_fusion", "correspondence_semantic"]
VISIBLE_STRATEGY_IDS = ["semantic_fast", "keyword_fast", "hybrid_fusion", "correspondence_semantic"]
SEARCH_TYPES = ["semantic", "keyword", "hybrid", "correspondence", "category_filtered"]
CATEGORY_BASES = ["semantic", "keyword", "hybrid"]
MAX_RECENT_RUNS = 8

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from homologation.browser_design import get_browser_design_css
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
  <title>GovGo v2 :: Busca</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Sora:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    {{ design_css|safe }}
    .search-browser {
      font-size: 80%;
    }
    .search-browser .page-shell {
      padding: 10px;
    }
    .search-browser .topbar {
      margin-bottom: 10px;
      padding: 14px 18px;
      border-radius: 18px;
    }
    .search-browser .workspace-grid {
      gap: 10px;
    }
    .search-browser .sidebar-panel,
    .search-browser .result-panel {
      padding: 10px;
    }
    .search-browser .panel,
    .search-browser .panel-block,
    .search-browser .saved-link,
    .search-browser .result-card,
    .search-browser .stat-box,
    .search-browser .run-row,
    .search-browser .results-scroll {
      border-radius: 14px;
    }
    .search-browser .panel-block,
    .search-browser .saved-link,
    .search-browser .result-card,
    .search-browser .stat-box,
    .search-browser .run-row {
      padding: 10px;
    }
    .search-browser .sidebar-panel {
      gap: 10px;
    }
    .search-browser .result-panel {
      min-height: 0;
    }
    .search-browser .empty-state {
      min-height: 260px;
      padding: 16px;
      border-radius: 16px;
    }
    .search-browser .eyebrow {
      font-size: 8.8px;
      margin-bottom: 4px;
    }
    .search-browser .page-title {
      font-size: clamp(24px, 2.4vw, 33.6px);
    }
    .search-browser .page-lede {
      font-size: 12px;
      margin-top: 6px;
      line-height: 1.45;
    }
    .search-browser .tag,
    .search-browser .soft-chip,
    .search-browser .status-pill {
      font-size: 9.6px;
    }
    .search-browser .field-label,
    .search-browser .stat-box .stat-label,
    .search-browser .results-table th {
      font-size: 8.8px;
    }
    .search-browser .section-headline {
      margin-bottom: 8px;
      gap: 8px;
    }
    .search-browser .section-headline h2,
    .search-browser .result-header h2,
    .search-browser .result-card h3,
    .search-browser .empty-state h2 {
      font-size: 15px;
      line-height: 1.15;
    }
    .search-browser .section-headline p,
    .search-browser .muted-copy,
    .search-browser .result-card p,
    .search-browser .small-note,
    .search-browser .empty-state p {
      font-size: 10.4px;
      line-height: 1.45;
    }
    .search-browser .field-stack,
    .search-browser .checkbox-grid,
    .search-browser .result-grid,
    .search-browser .stat-grid,
    .search-browser .link-row,
    .search-browser .run-list,
    .search-browser .action-row,
    .search-browser .result-header,
    .search-browser .collapsible-body {
      gap: 8px;
    }
    .search-browser .field {
      gap: 5px;
    }
    .search-browser .control,
    .search-browser .control-select,
    .search-browser .control-textarea {
      border-radius: 12px;
      padding: 9px 10px;
    }
    .search-browser .button,
    .search-browser .button-ghost,
    .search-browser .button-soft {
      min-height: 36px;
      padding: 0 12px;
      border-radius: 12px;
    }
    .search-browser .saved-link {
      padding: 10px 12px;
    }
    .search-browser .saved-link strong,
    .search-browser .stat-box strong {
      font-size: 19.2px;
    }
    .search-browser .checkbox-card {
      gap: 8px;
      padding: 10px;
      border-radius: 14px;
    }
    .search-browser .checkbox-card-top strong {
      font-size: 13px;
    }
    .search-browser .helper-line {
      margin-top: 6px;
      font-size: 10px;
    }
    .result-header {
      display: grid;
      gap: 14px;
      margin-bottom: 14px;
    }
    .saved-link {
      padding: 12px 14px;
      border-radius: 16px;
      border: 1px solid var(--blue-200);
      background: var(--blue-50);
      color: var(--deep-blue);
    }
    .saved-link strong {
      display: block;
      margin-bottom: 4px;
      font-family: var(--font-display);
    }
    .result-card .error-box {
      margin-top: 8px;
      padding: 10px;
      border-radius: 12px;
      background: var(--risk-50);
      border: 1px solid color-mix(in srgb, var(--risk) 18%, white);
      color: var(--risk);
      font-size: 10.4px;
      font-weight: 600;
    }
    .result-card .small-note {
      margin-top: 6px;
      color: var(--ink-3);
      font-size: 10.4px;
      line-height: 1.5;
    }
    .result-card .small-note strong {
      color: var(--ink-2);
    }
    .results-scroll {
      overflow-x: auto;
      margin-top: 8px;
      border: 1px solid var(--hairline-soft);
      border-radius: 16px;
      background: var(--rail);
    }
    .results-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 640px;
    }
    .results-table th,
    .results-table td {
      padding: 8px 10px;
      text-align: left;
      border-bottom: 1px solid var(--hairline-soft);
      vertical-align: top;
      font-size: 10.4px;
    }
    .results-table th {
      color: var(--ink-3);
      font-size: 8.8px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .sidebar-collapsible {
      overflow: hidden;
    }
    .section-headline--toggle {
      align-items: center;
    }
    .section-headline--toggle > div {
      min-width: 0;
    }
    .collapse-toggle {
      flex: none;
      width: 26px;
      height: 26px;
      min-height: 26px;
      padding: 0;
      border: 1px solid var(--hairline);
      border-radius: 999px;
      background: var(--paper);
      color: var(--deep-blue);
      font: inherit;
      font-size: 12px;
      font-weight: 800;
      line-height: 1;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .collapse-toggle:hover {
      background: var(--blue-50);
      border-color: var(--blue-200);
    }
    .collapse-toggle .toggle-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transform: translateY(-1px);
    }
    .collapsible-body {
      display: grid;
      min-width: 0;
    }
    .sidebar-collapsible.is-collapsed .collapsible-body {
      display: none;
    }
    .busy-overlay {
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(20, 32, 51, 0.38);
      backdrop-filter: blur(4px);
      z-index: 999;
      padding: 18px;
    }
    .busy-overlay.is-visible {
      display: flex;
    }
    .busy-card {
      width: min(360px, 100%);
      padding: 16px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(214, 222, 231, 0.9);
      box-shadow: 0 20px 40px rgba(16, 24, 40, 0.18);
      display: grid;
      gap: 10px;
      text-align: center;
    }
    .busy-spinner {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: 4px solid rgba(255, 87, 34, 0.14);
      border-top-color: var(--orange);
      margin: 0 auto;
      animation: spin 1s linear infinite;
    }
    .busy-bar {
      height: 6px;
      border-radius: 999px;
      background: #e8eef8;
      overflow: hidden;
    }
    .busy-bar::after {
      content: "";
      display: block;
      height: 100%;
      width: 36%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--orange) 0%, #ff936a 100%);
      animation: busy-slide 1.2s ease-in-out infinite;
    }
    .busy-text {
      display: grid;
      gap: 4px;
    }
    .busy-text strong {
      font-size: 17.6px;
    }
    .busy-text span {
      color: var(--ink-2);
      font-size: 11.2px;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes busy-slide {
      0% { transform: translateX(-120%); }
      50% { transform: translateX(110%); }
      100% { transform: translateX(260%); }
    }
  </style>
</head>
<body class="search-browser">
  <div class="page-shell">
    <header class="topbar">
      <div>
        <div class="eyebrow">GovGo v2 · Homologação</div>
        <h1 class="page-title">Busca</h1>
        <p class="page-lede">Digite a consulta e compare até quatro leituras da mesma busca.</p>
      </div>
      <div class="top-tags">
        <span class="tag tag--accent">Busca real</span>
        <span class="tag tag--blue">Quatro leituras</span>
        <span class="tag">GovGo v2</span>
      </div>
    </header>

    <div class="workspace-grid">
      <aside class="panel sidebar-panel">
        <form method="post" class="field-stack" data-busy-label="Buscando oportunidades...">
          <input type="hidden" name="action" value="compare">
          <section class="panel-block panel-block--tinted sidebar-collapsible" data-collapsible>
            <div class="section-headline section-headline--toggle">
              <div>
                <h2>Nova busca</h2>
                <p>Digite a consulta e monte esta rodada.</p>
              </div>
              <button type="button" class="collapse-toggle" data-collapse-toggle aria-expanded="true" aria-label="Recolher Nova busca" title="Recolher Nova busca"><span class="toggle-icon" aria-hidden="true">▴</span></button>
            </div>
            <div class="collapsible-body">
              <div class="field-stack">
                <label class="field">
                  <span class="field-label">Consulta</span>
                  <input class="control" id="query" name="query" value="{{ form.query }}" placeholder="Ex.: alimentação hospitalar" autocomplete="off">
                </label>
                <div class="field-grid">
                  <label class="field">
                    <span class="field-label">Resultados</span>
                    <input class="control" id="limit" name="limit" type="number" min="1" max="20" value="{{ form.limit }}">
                  </label>
                  <label class="field">
                    <span class="field-label">Rótulo</span>
                    <input class="control" id="test_label" name="test_label" value="{{ form.test_label }}" placeholder="Nome curto desta rodada">
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section class="panel-block sidebar-collapsible" data-collapsible>
            <div class="section-headline section-headline--toggle">
              <div>
                <h2>Filtros</h2>
                <p>Escolha até quatro leituras para a mesma busca.</p>
              </div>
              <button type="button" class="collapse-toggle" data-collapse-toggle aria-expanded="true" aria-label="Recolher Filtros" title="Recolher Filtros"><span class="toggle-icon" aria-hidden="true">▴</span></button>
            </div>
            <div class="collapsible-body">
              <div class="checkbox-grid">
                {% for model in strategy_cards %}
                <label class="checkbox-card {% if model.id in form.selected_model_ids %}is-selected{% endif %}">
                  <input type="checkbox" name="model_ids" value="{{ model.id }}" {% if model.id in form.selected_model_ids %}checked{% endif %}>
                  <span>
                    <span class="checkbox-card-top">
                      <strong>{{ model.short_label }}</strong>
                    </span>
                    <p class="muted-copy">{{ model.description }}</p>
                    <div class="helper-line">{{ model.summary_line }}</div>
                  </span>
                </label>
                {% endfor %}
              </div>
            </div>
          </section>

          <div class="action-row">
            <button type="submit" class="button">Buscar</button>
          </div>
        </form>

        <section class="panel-block sidebar-collapsible" data-collapsible>
          <div class="section-headline section-headline--toggle">
            <div>
              <h2>Recentes</h2>
              <p>Últimos resultados salvos.</p>
            </div>
            <button type="button" class="collapse-toggle" data-collapse-toggle aria-expanded="true" aria-label="Recolher Recentes" title="Recolher Recentes"><span class="toggle-icon" aria-hidden="true">▴</span></button>
          </div>
          <div class="collapsible-body">
            <div class="run-list">
              {% if recent_runs %}
                {% for item in recent_runs %}
                <div class="run-row">
                  <strong>{{ item.label }}</strong>
                  <div class="muted-copy">{{ item.query or 'Busca salva' }}</div>
                  <div class="link-row">
                    <span class="soft-chip mono">{{ item.saved_at or '-' }}</span>
                    <a href="/runs/{{ item.file_name }}" target="_blank" rel="noreferrer">Abrir resultado</a>
                  </div>
                </div>
                {% endfor %}
              {% else %}
                <div class="muted-copy">Nenhuma execução salva ainda.</div>
              {% endif %}
            </div>
          </div>
        </section>
      </aside>

      <main class="panel result-panel">
        {% if compare_summary %}
        <div class="result-header">
          <div class="section-headline">
            <div>
              <h2>Resultado da rodada</h2>
              <p>A mesma consulta foi executada nas leituras escolhidas. Compare velocidade, volume e aderência.</p>
            </div>
            {% if saved_run %}
            <a class="saved-link" href="/runs/{{ saved_run.file_name }}" target="_blank" rel="noreferrer">
              <strong>Resultado salvo</strong>
              <span>{{ saved_run.relative_path }}</span>
            </a>
            {% endif %}
          </div>
          <div class="stat-grid">
            <div class="stat-box"><span class="stat-label">Consulta</span><strong>{{ compare_summary.query }}</strong></div>
            <div class="stat-box"><span class="stat-label">Leituras</span><strong>{{ compare_summary.total_models }}</strong></div>
            <div class="stat-box"><span class="stat-label">Mais rápida</span><strong class="mono">{{ compare_summary.fastest_ms }} ms</strong></div>
            <div class="stat-box"><span class="stat-label">Mais lenta</span><strong class="mono">{{ compare_summary.slowest_ms }} ms</strong></div>
          </div>
        </div>

        <div class="result-grid">
          {% for item in compare_results %}
          <article class="result-card">
            <div class="result-card-head">
              <div>
                <h3>{{ item.model.short_label or item.model.label }}</h3>
                <p>{{ item.model.description }}</p>
              </div>
              <span class="soft-chip">{{ item.model.mode_label or item.model.id }}</span>
            </div>

            <div class="stat-grid">
              <div class="stat-box"><span class="stat-label">Tempo</span><strong class="mono">{{ item.response.elapsed_ms }} ms</strong></div>
              <div class="stat-box"><span class="stat-label">Resultados</span><strong class="mono">{{ item.response.result_count }}</strong></div>
              <div class="stat-box"><span class="stat-label">Confiança</span><strong class="mono">{{ '%.2f'|format(item.response.confidence) }}</strong></div>
            </div>

            {% if item.response.preprocessing %}
            <div class="small-note"><strong>Termos usados:</strong> {{ item.response.preprocessing.search_terms or '-' }}</div>
            {% endif %}

            {% if item.response.meta.top_categories_preview %}
            <div class="small-note"><strong>Categorias em destaque:</strong>
              {% for top in item.response.meta.top_categories_preview %}
                {% if not loop.first %} · {% endif %}{{ top.codigo }}
              {% endfor %}
            </div>
            {% endif %}

            {% if item.response.error %}
            <div class="error-box">{{ item.response.error }}</div>
            {% endif %}

            {% if item.response.results %}
            <div class="results-scroll">
              <table class="results-table">
                <thead>
                  <tr>
                    <th>Posição</th>
                    <th>Aderência</th>
                    <th>Objeto</th>
                    <th>Órgão</th>
                    <th>Local</th>
                  </tr>
                </thead>
                <tbody>
                  {% for result in item.response.results %}
                  <tr>
                    <td class="mono">{{ result.rank }}</td>
                    <td class="mono">{{ '%.4f'|format(result.similarity) }}</td>
                    <td>
                      <strong>{{ result.title or '-' }}</strong>
                      <div class="helper-line mono">{{ result.item_id or '-' }}</div>
                    </td>
                    <td>{{ result.organization or '-' }}</td>
                    <td>{{ result.municipality or '-' }}{% if result.uf %}/{{ result.uf }}{% endif %}</td>
                  </tr>
                  {% endfor %}
                </tbody>
              </table>
            </div>
            {% else %}
            <div class="small-note">Nenhum resultado retornado nesta leitura.</div>
            {% endif %}
          </article>
          {% endfor %}
        </div>
        {% else %}
        <div class="empty-state">
          <div>
            <h2>Digite e escolha as leituras</h2>
            <p>Esta página foi refeita para seguir o visual do design. Você só precisa digitar a consulta, marcar até quatro filtros de busca e rodar.</p>
          </div>
        </div>
        {% endif %}
      </main>
    </div>
  </div>
  <div id="busy-overlay" class="busy-overlay" aria-hidden="true">
    <div class="busy-card">
      <div class="busy-spinner" aria-hidden="true"></div>
      <div class="busy-text">
        <strong id="busy-title">Buscando...</strong>
        <span id="busy-copy">Aguarde o resultado aparecer na área da direita.</span>
      </div>
      <div class="busy-bar" aria-hidden="true"></div>
    </div>
  </div>
  <script>
    (() => {
      const overlay = document.getElementById('busy-overlay');
      const title = document.getElementById('busy-title');
      const forms = Array.from(document.querySelectorAll('form[data-busy-label]'));
      const toggles = Array.from(document.querySelectorAll('[data-collapse-toggle]'));

      const activateBusyState = (form) => {
        const label = form.getAttribute('data-busy-label') || 'Processando...';
        title.textContent = label;
        overlay.classList.add('is-visible');
        overlay.setAttribute('aria-hidden', 'false');
      };

      forms.forEach((form) => {
        let isSubmitting = false;
        form.addEventListener('submit', () => {
          if (isSubmitting) {
            return;
          }
          isSubmitting = true;
          activateBusyState(form);
        });
      });

      toggles.forEach((toggle) => {
        toggle.addEventListener('click', () => {
          const section = toggle.closest('[data-collapsible]');
          if (!section) {
            return;
          }
          const icon = toggle.querySelector('.toggle-icon');
          const titleRoot = section.querySelector('.section-headline h2');
          const sectionTitle = titleRoot ? titleRoot.textContent.trim() : 'seção';
          const isCollapsed = section.classList.toggle('is-collapsed');
          toggle.setAttribute('aria-expanded', String(!isCollapsed));
          toggle.setAttribute('aria-label', (isCollapsed ? 'Expandir ' : 'Recolher ') + sectionTitle);
          toggle.setAttribute('title', (isCollapsed ? 'Expandir ' : 'Recolher ') + sectionTitle);
          if (icon) {
            icon.textContent = isCollapsed ? '▾' : '▴';
          }
        });
      });
    })();
  </script>
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


def visible_strategy_cards(test_models: list[dict[str, Any]]) -> list[dict[str, Any]]:
  indexed = model_index(test_models)
  short_labels = {
    "semantic_fast": "Semântica",
    "keyword_fast": "Palavras-chave",
    "hybrid_fusion": "Híbrida",
    "correspondence_semantic": "Correspondência",
  }
  mode_labels = {
    "semantic": "Sentido",
    "keyword": "Termos",
    "hybrid": "Mista",
    "correspondence": "Categoria",
  }
  cards: list[dict[str, Any]] = []
  for model_id in VISIBLE_STRATEGY_IDS:
    model = indexed.get(model_id)
    if model is None:
      continue
    request_cfg = dict(model.get("request") or {})
    search_type = str(request_cfg.get("search_type") or "semantic")
    cards.append(
      {
        **model,
        "short_label": short_labels.get(model_id, str(model.get("label") or model_id)),
        "mode_label": mode_labels.get(search_type, search_type.title()),
        "summary_line": (
          "Base "
          + str(request_cfg.get("category_search_base") or search_type)
          + " · limite padrão "
          + str(request_cfg.get("limit") or 5)
        ),
      }
    )
  return cards



def slugify(value: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9]+", "-", (value or "").strip().lower()).strip("-")
    return text or "teste"



def default_form_state() -> dict[str, Any]:
    return {
        "query": "alimentacao hospitalar",
        "limit": 5,
      "test_label": "busca alimentacao hospitalar",
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
  display_by_id = {str(model.get("id")): model for model in visible_strategy_cards(test_models)}
  compare_results = []
  elapsed_values = []
  for model_id in form["selected_model_ids"]:
    model = models_by_id.get(model_id)
    if model is None:
      continue
    response = ADAPTER.run(build_request_from_model(model, form["query"], form["limit"])).to_dict()
    compare_results.append({"model": display_by_id.get(model_id, model), "response": response})
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
      design_css=get_browser_design_css(),
        fixture_cases=fixture_cases,
        test_models=test_models,
      strategy_cards=visible_strategy_cards(test_models),
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
