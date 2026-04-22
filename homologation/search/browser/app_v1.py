from __future__ import annotations

import json
import os
import re
import sys
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
from threading import Lock, Thread
from typing import Any
from wsgiref.simple_server import make_server

from flask import Flask, Response, abort, render_template_string, request


PROJECT_ROOT = Path(__file__).resolve().parents[3]
HOMOLOGATION_ROOT = PROJECT_ROOT / "homologation" / "search"
TESTS_ROOT = HOMOLOGATION_ROOT / "tests"
TEST_RUNS_DIR = TESTS_ROOT / "runs"
DEFAULT_LIMIT = 10
DEFAULT_COLUMN_COUNT = 1
DEFAULT_TOP_CATEGORIES = 10
MAX_COLUMNS = 4
V1_LOGO_URL = "https://hemztmtbejcbhgfmsvfq.supabase.co/storage/v1/object/public/govgo/LOGO/LOGO_TEXTO_GOvGO_TRIM_v3.png"
ENSEMBLE_SOFT_PALETTE = [
  {"name": "azul-nevoa", "bg": "#EEF4FF", "accent": "#BFD5FF"},
  {"name": "aqua-nevoa", "bg": "#EAF7FF", "accent": "#B8E3F4"},
  {"name": "menta-nevoa", "bg": "#EFF8F1", "accent": "#C6E5CF"},
  {"name": "cha-suave", "bg": "#F4F8EA", "accent": "#D8E5B5"},
  {"name": "areia-suave", "bg": "#FFF6E8", "accent": "#F2D8A7"},
  {"name": "pessego-suave", "bg": "#FFF0E8", "accent": "#F3C6B3"},
  {"name": "rosa-nevoa", "bg": "#FFF1F3", "accent": "#F0C6D2"},
  {"name": "lilas-nevoa", "bg": "#F5F1FF", "accent": "#D8C9F2"},
]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from homologation.browser_design import get_browser_design_css
from homologation.search.core.adapter import SearchAdapter
from homologation.search.core.contracts import SearchRequest


APP = Flask(__name__)
RELEVANCE_FILTER_LOCK = Lock()
SEARCH_WARMUP_LOCK = Lock()
SEARCH_WARMUP_DONE = False

SEARCH_TYPES = {
    1: {"name": "Semantica", "request_type": "semantic"},
    2: {"name": "Palavras-chave", "request_type": "keyword"},
    3: {"name": "Hibrida", "request_type": "hybrid"},
}

SEARCH_APPROACHES = {
    1: {"name": "Direta"},
    2: {"name": "Correspondencia de Categoria"},
    3: {"name": "Filtro de Categoria"},
}

RELEVANCE_LEVELS = {
    1: {"name": "Sem filtro"},
    2: {"name": "Flexivel"},
    3: {"name": "Restritivo"},
}

TOP_CATEGORIES_OPTIONS = [5, 10, 15, 20, 30, 50]

DEFAULT_COLUMN_CONFIGS = [
  {"search_type": 2, "approach": 1, "relevance": 1, "top_categories_count": 10},
  {"search_type": 1, "approach": 1, "relevance": 1, "top_categories_count": 10},
  {"search_type": 3, "approach": 1, "relevance": 1, "top_categories_count": 10},
  {"search_type": 1, "approach": 2, "relevance": 2, "top_categories_count": 10},
]


HTML = """
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GovGo v2 :: Busca v1</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Sora:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    {{ design_css|safe }}
    .search-v1-browser {
      font-size: 80%;
    }
    .search-v1-browser .page-shell {
      padding: 8px;
    }
    .search-v1-browser .topbar {
      display: grid;
      gap: 4px;
      align-items: center;
      margin-bottom: 8px;
      padding: 8px 12px;
      border-radius: 16px;
    }
    .search-v1-browser .topbar-inline {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 10px;
      align-items: center;
      width: 100%;
      min-width: 0;
    }
    .search-v1-browser .title-cluster {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      white-space: nowrap;
    }
    .search-v1-browser .brand-logo {
      display: block;
      width: auto;
      height: 24px;
      max-width: 124px;
    }
    .search-v1-browser .eyebrow,
    .search-v1-browser .field-label,
    .search-v1-browser .table-mini th,
    .search-v1-browser .metric-pill-label {
      font-size: 8px;
    }
    .search-v1-browser .soft-chip,
    .search-v1-browser .slider-value {
      font-size: 8.8px;
    }
    .search-v1-browser .query-toolbar {
      display: grid;
      grid-template-columns: minmax(150px, 260px) minmax(64px, 82px) minmax(150px, 210px) auto minmax(220px, 360px) auto minmax(220px, 360px);
      gap: 8px;
      align-items: end;
      justify-content: end;
      min-width: 0;
    }
    .search-v1-browser .toolbar-field,
    .search-v1-browser .field {
      display: grid;
      gap: 3px;
      min-width: 0;
    }
    .search-v1-browser .control,
    .search-v1-browser .control-select,
    .search-v1-browser .control-textarea {
      width: 100%;
      min-width: 0;
      border-radius: 10px;
      padding: 5px 9px;
      border: 1px solid var(--hairline);
      background: var(--paper);
      color: var(--ink-1);
      line-height: 1.2;
    }
    .search-v1-browser .field-label--ghost {
      visibility: hidden;
      pointer-events: none;
      user-select: none;
    }
    .search-v1-browser .toolbar-action,
    .search-v1-browser .toolbar-status {
      display: grid;
      gap: 3px;
      min-width: 0;
      align-self: end;
    }
    .search-v1-browser .control:focus,
    .search-v1-browser .control-select:focus,
    .search-v1-browser .control-textarea:focus {
      outline: none;
      border-color: var(--orange);
      box-shadow: var(--ring-focus);
    }
    .search-v1-browser .button,
    .search-v1-browser .button-ghost,
    .search-v1-browser .button-soft {
      min-height: 31px;
      padding: 0 10px;
      border-radius: 10px;
      border: 1px solid transparent;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-weight: 700;
    }
    .search-v1-browser .button {
      background: var(--orange);
      color: white;
    }
    .search-v1-browser .button:hover {
      background: var(--orange-600);
    }
    .search-v1-browser .slider-shell {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 6px;
      align-items: center;
    }
    .search-v1-browser input[type="range"] {
      width: 100%;
      accent-color: var(--orange);
      margin: 0;
    }
    .search-v1-browser .slider-value {
      min-width: 24px;
      min-height: 24px;
      padding: 2px 6px;
      border-radius: 999px;
      border: 1px solid var(--blue-200);
      background: var(--blue-50);
      color: var(--deep-blue);
      text-align: center;
      font-weight: 700;
    }
    .search-v1-browser .toolbar-submit {
      min-width: 0;
    }
    .search-v1-browser .saved-link {
      display: block;
      padding: 10px 12px;
      border-radius: 14px;
      border: 1px solid var(--blue-200);
      background: var(--blue-50);
      color: var(--deep-blue);
    }
    .search-v1-browser .saved-link strong {
      display: block;
      margin-bottom: 4px;
      font-family: var(--font-display);
      font-size: 18px;
    }
    .search-v1-browser .saved-link span {
      overflow-wrap: anywhere;
    }
    .search-v1-browser .saved-link--inline {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      margin: 0;
      min-height: 31px;
      padding: 0 10px;
      border-radius: 10px;
      font-size: 9.2px;
      line-height: 1.15;
      white-space: nowrap;
    }
    .search-v1-browser .saved-link-label {
      font-weight: 700;
      white-space: nowrap;
    }
    .search-v1-browser .saved-link-path {
      display: none;
    }
    .search-v1-browser .saved-run-picker {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 6px;
      align-items: end;
      min-width: 0;
    }
    .search-v1-browser .saved-run-picker .toolbar-field {
      gap: 2px;
    }
    .search-v1-browser .saved-run-picker .control-select {
      min-width: 0;
    }
    .search-v1-browser .toolbar-saved-link {
      min-width: 0;
      max-width: 100%;
    }
    .search-v1-browser .stage-stack {
      display: grid;
      gap: 8px;
    }
    .search-v1-browser .grid-band {
      overflow-x: visible;
      padding-bottom: 2px;
      min-width: 0;
    }
    .search-v1-browser .filter-grid,
    .search-v1-browser .results-grid {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(var(--band-columns), minmax(0, 1fr));
      min-width: 0;
      align-items: start;
    }
    .search-v1-browser .column-card {
      border: 1px solid var(--hairline);
      border-radius: 14px;
      background: color-mix(in srgb, var(--paper) 94%, transparent);
      box-shadow: var(--shadow-sm);
      padding: 6px 7px;
      min-width: 0;
    }
    .search-v1-browser .column-card.is-hidden {
      display: none;
    }
    .search-v1-browser .filter-card {
      display: grid;
      gap: 4px;
    }
    .search-v1-browser .column-head {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      align-items: flex-start;
      margin-bottom: 0;
    }
    .search-v1-browser .column-head--bare {
      margin-bottom: 0;
    }
    .search-v1-browser .column-head h2 {
      margin: 0;
      font-size: 12.2px;
      line-height: 1.15;
    }
    .search-v1-browser .column-head p,
    .search-v1-browser .column-note,
    .search-v1-browser .empty-copy,
    .search-v1-browser .meta-copy,
    .search-v1-browser .results-empty {
      margin: 0;
      color: var(--ink-2);
      font-size: 9.2px;
      line-height: 1.25;
    }
    .search-v1-browser .result-card {
      display: grid;
      gap: 4px;
      min-height: 0;
    }
    .search-v1-browser .metric-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .search-v1-browser .metric-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border: 1px solid var(--hairline-soft);
      border-radius: 999px;
      background: var(--rail);
      padding: 3px 7px;
      min-width: 0;
    }
    .search-v1-browser .metric-pill-label {
      display: inline-flex;
      color: var(--ink-3);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 700;
      white-space: nowrap;
    }
    .search-v1-browser .metric-pill strong {
      display: inline-flex;
      font-family: var(--font-display);
      font-size: 11.5px;
      line-height: 1;
    }
    .search-v1-browser .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--hairline-soft);
      border-radius: 10px;
      background: var(--rail);
    }
    .search-v1-browser .table-mini {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .search-v1-browser .table-mini th,
    .search-v1-browser .table-mini td {
      padding: 4px 5px;
      text-align: left;
      border-bottom: 1px solid var(--hairline-soft);
      vertical-align: top;
      font-size: 8.8px;
      line-height: 1.2;
    }
    .search-v1-browser .table-mini th {
      color: var(--ink-3);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 700;
    }
    .search-v1-browser .table-mini tr:last-child td {
      border-bottom: none;
    }
    .search-v1-browser .result-row {
      background: var(--ensemble-bg, transparent);
    }
    .search-v1-browser .result-row td {
      background: transparent;
    }
    .search-v1-browser .result-row td:first-child {
      box-shadow: inset 2px 0 0 var(--ensemble-accent, transparent);
    }
    .search-v1-browser .col-rank {
      width: 24px;
    }
    .search-v1-browser .col-sim {
      width: 52px;
    }
    .search-v1-browser .col-local {
      width: 70px;
    }
    .search-v1-browser .mono {
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
    }
    .search-v1-browser .rank-cell {
      white-space: nowrap;
    }
    .search-v1-browser .rank-value {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .search-v1-browser .rank-dot {
      width: 6px;
      height: 6px;
      border-radius: 999px;
      flex: 0 0 auto;
      background: var(--ensemble-accent, transparent);
    }
    .search-v1-browser .object-cell {
      overflow: hidden;
    }
    .search-v1-browser .object-text {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.2;
      font-weight: 500;
    }
    .search-v1-browser .local-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .search-v1-browser .results-empty,
    .search-v1-browser .empty-copy {
      padding: 8px 9px;
      border: 1px dashed var(--hairline);
      border-radius: 10px;
      background: color-mix(in srgb, var(--paper) 94%, transparent);
    }
    .search-v1-browser .error-box {
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid color-mix(in srgb, var(--risk) 18%, white);
      background: var(--risk-50);
      color: var(--risk);
      font-size: 10px;
      font-weight: 600;
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
    @media (max-width: 900px) {
      .search-v1-browser .topbar-inline {
        grid-template-columns: 1fr;
      }
      .search-v1-browser .saved-run-picker {
        grid-template-columns: 1fr auto;
      }
      .search-v1-browser .query-toolbar {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        justify-content: stretch;
      }
    }
    @media (max-width: 640px) {
      .search-v1-browser .page-shell {
        padding: 8px;
      }
      .search-v1-browser .topbar {
        padding: 12px;
      }
      .search-v1-browser .title-cluster {
        white-space: normal;
      }
      .search-v1-browser .brand-logo {
        height: 24px;
      }
      .search-v1-browser .saved-run-picker {
        grid-template-columns: 1fr;
      }
      .search-v1-browser .query-toolbar {
        grid-template-columns: 1fr;
      }
      .search-v1-browser .grid-band {
        overflow-x: auto;
      }
    }
  </style>
</head>
<body class="search-v1-browser">
  <div class="page-shell">
    <form method="post" data-busy-label="Buscando colunas...">
      <header class="topbar">
        <div class="topbar-inline">
          <div class="title-cluster">
            <img class="brand-logo" src="{{ v1_logo_url }}" alt="GovGo">
          </div>

          <div class="query-toolbar">
            <label class="toolbar-field">
              <span class="field-label">Busca</span>
              <input class="control" id="query" name="query" value="{{ form.query }}" placeholder="Ex.: alimentacao hospitalar" autocomplete="off">
            </label>
            <label class="toolbar-field">
              <span class="field-label"># Resultados</span>
              <input class="control" id="limit" name="limit" type="number" min="1" max="100" value="{{ form.limit }}">
            </label>
            <label class="toolbar-field">
              <span class="field-label">Colunas</span>
              <div class="slider-shell">
                <input id="column_count" name="column_count" type="range" min="1" max="4" step="1" value="{{ form.column_count }}" data-column-slider>
                <span class="slider-value" data-column-count-label>{{ form.column_count }}</span>
              </div>
            </label>
            <div class="toolbar-action">
              <span class="field-label field-label--ghost">Acao</span>
              <button type="submit" class="button toolbar-submit" name="action" value="search">Buscar</button>
            </div>
            <div class="saved-run-picker">
              <label class="toolbar-field">
                <span class="field-label">JSON salvo</span>
                <select class="control-select" name="saved_run_file">
                  <option value="">Selecione um JSON salvo</option>
                  {% for option in saved_run_options %}
                  <option value="{{ option.file_name }}" {% if option.file_name == selected_saved_run_file %}selected{% endif %}>{{ option.option_label }}</option>
                  {% endfor %}
                </select>
              </label>
              <div class="toolbar-action">
                <span class="field-label field-label--ghost">Acao</span>
                <button type="submit" class="button-soft toolbar-submit" name="action" value="load_json" {% if not saved_run_options %}disabled{% endif %}>Carregar JSON</button>
              </div>
            </div>
            {% if saved_run %}
            <div class="toolbar-status">
              <span class="field-label field-label--ghost">Status</span>
              <a class="saved-link saved-link--inline toolbar-saved-link" href="/runs/{{ saved_run.file_name }}" target="_blank" rel="noreferrer" title="{{ saved_run.relative_path }}">
                <span class="saved-link-label">Resultado salvo</span>
                <span class="saved-link-path">{{ saved_run.relative_path }}</span>
              </a>
            </div>
            {% endif %}
          </div>
        </div>
        {% if load_error %}
        <div class="error-box">{{ load_error }}</div>
        {% endif %}
      </header>

      <div class="stage-stack">
        <div class="grid-band">
          <section class="filter-grid" data-column-band style="--band-columns: {{ form.column_count }};">
            {% for view in column_views %}
            <article class="column-card filter-card {% if not view.active %}is-hidden{% endif %}" data-column-index="{{ view.index }}">
              <div class="column-head">
                <div class="eyebrow">Busca {{ view.index }}</div>
              </div>

              <label class="field">
                <span class="field-label">Tipo</span>
                <select class="control-select" name="column_{{ view.index }}_search_type">
                  {% for option in search_type_options %}
                  <option value="{{ option.value }}" {% if option.value == view.config.search_type %}selected{% endif %}>{{ option.label }}</option>
                  {% endfor %}
                </select>
              </label>

              <label class="field">
                <span class="field-label">Abordagem</span>
                <select class="control-select" name="column_{{ view.index }}_approach">
                  {% for option in approach_options %}
                  <option value="{{ option.value }}" {% if option.value == view.config.approach %}selected{% endif %}>{{ option.label }}</option>
                  {% endfor %}
                </select>
              </label>

              <label class="field">
                <span class="field-label">Relevancia</span>
                <select class="control-select" name="column_{{ view.index }}_relevance">
                  {% for option in relevance_options %}
                  <option value="{{ option.value }}" {% if option.value == view.config.relevance %}selected{% endif %}>{{ option.label }}</option>
                  {% endfor %}
                </select>
              </label>

              <label class="field">
                <span class="field-label">Top categorias</span>
                <select class="control-select" name="column_{{ view.index }}_top_categories_count">
                  {% for option in top_category_options %}
                  <option value="{{ option }}" {% if option == view.config.top_categories_count %}selected{% endif %}>{{ option }}</option>
                  {% endfor %}
                </select>
              </label>
            </article>
            {% endfor %}
          </section>
        </div>

        <div class="grid-band">
          <section class="results-grid" data-column-band style="--band-columns: {{ form.column_count }};">
            {% for view in column_views %}
            <article class="column-card result-card {% if not view.active %}is-hidden{% endif %}" data-column-index="{{ view.index }}">
              <div class="column-head column-head--bare">
                <div class="eyebrow">Resultado {{ view.index }}</div>
              </div>

              {% if view.result %}
                {% if view.result.error %}
                <div class="error-box">{{ view.result.error }}</div>
                {% else %}
                <div class="metric-pills">
                  <div class="metric-pill">
                    <span class="metric-pill-label">Tempo</span>
                    <strong class="mono">{{ view.result.elapsed_ms }} ms</strong>
                  </div>
                  <div class="metric-pill">
                    <span class="metric-pill-label">Relevancia!</span>
                    <strong class="mono">{{ '%.2f'|format(view.result.confidence) }}</strong>
                  </div>
                  <div class="metric-pill">
                    <span class="metric-pill-label">Itens</span>
                    <strong class="mono">{{ view.result.result_count }}</strong>
                  </div>
                </div>
                <div class="meta-copy">Filtro {{ view.result.relevance_label }}</div>

                {% if view.result.results %}
                <div class="table-wrap">
                  <table class="table-mini">
                    <thead>
                      <tr>
                        <th class="col-rank">Pos</th>
                        <th class="col-sim">Ader.</th>
                        <th>Objeto</th>
                        <th class="col-local">Local</th>
                      </tr>
                    </thead>
                    <tbody>
                      {% for item in view.result.results %}
                      <tr class="result-row" {% if item.ensemble and item.ensemble.highlighted %}style="--ensemble-bg: {{ item.ensemble.bg_color }}; --ensemble-accent: {{ item.ensemble.accent_color }};" title="{{ item.ensemble.tooltip }}"{% endif %}>
                        <td class="mono rank-cell"><span class="rank-value">{% if item.ensemble and item.ensemble.highlighted %}<span class="rank-dot" aria-hidden="true"></span>{% endif %}{{ item.rank }}</span></td>
                        <td class="mono">{{ '%.4f'|format(item.similarity) }}</td>
                        <td class="object-cell"><div class="object-text">{{ item.title or '-' }}</div></td>
                        <td><div class="local-text">{{ item.municipality or '-' }}{% if item.uf %}/{{ item.uf }}{% endif %}</div></td>
                      </tr>
                      {% endfor %}
                    </tbody>
                  </table>
                </div>
                {% else %}
                <div class="results-empty">Nenhum resultado retornado nesta coluna.</div>
                {% endif %}
                {% endif %}
              {% else %}
              <div class="empty-copy">Configure esta coluna e clique Buscar.</div>
              {% endif %}
            </article>
            {% endfor %}
          </section>
        </div>
      </div>
    </form>
  </div>

  <div id="busy-overlay" class="busy-overlay" aria-hidden="true">
    <div class="busy-card">
      <div class="busy-spinner" aria-hidden="true"></div>
      <div class="busy-text">
        <strong id="busy-title">Buscando...</strong>
        <span>Aguarde o resultado de cada coluna aparecer abaixo.</span>
      </div>
      <div class="busy-bar" aria-hidden="true"></div>
    </div>
  </div>

  <script>
    (() => {
      const overlay = document.getElementById('busy-overlay');
      const title = document.getElementById('busy-title');
      const form = document.querySelector('form[data-busy-label]');
      const slider = document.querySelector('[data-column-slider]');
      const countLabel = document.querySelector('[data-column-count-label]');
      const cards = Array.from(document.querySelectorAll('[data-column-index]'));
      const bands = Array.from(document.querySelectorAll('[data-column-band]'));

      const syncColumns = () => {
        if (!slider) {
          return;
        }
        const count = Number(slider.value || 1);
        if (countLabel) {
          countLabel.textContent = String(count);
        }
        bands.forEach((band) => band.style.setProperty('--band-columns', String(count)));
        cards.forEach((card) => {
          const index = Number(card.getAttribute('data-column-index') || '0');
          const hidden = index > count;
          card.classList.toggle('is-hidden', hidden);
          card.setAttribute('aria-hidden', hidden ? 'true' : 'false');
        });
      };

      if (slider) {
        slider.addEventListener('input', syncColumns);
        syncColumns();
      }

      if (form && overlay && title) {
        let isSubmitting = false;
        form.addEventListener('submit', () => {
          if (isSubmitting) {
            return;
          }
          isSubmitting = true;
          title.textContent = form.getAttribute('data-busy-label') || 'Buscando...';
          overlay.classList.add('is-visible');
          overlay.setAttribute('aria-hidden', 'false');
        });
      }
    })();
  </script>
</body>
</html>
"""


def ensure_test_storage() -> None:
    TEST_RUNS_DIR.mkdir(parents=True, exist_ok=True)


def slugify(value: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9]+", "-", (value or "").strip().lower()).strip("-")
    return text or "busca"


def save_test_run(label: str, payload: dict[str, Any]) -> dict[str, str]:
    ensure_test_storage()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_name = f"{timestamp}__{slugify(label)}.json"
    file_path = TEST_RUNS_DIR / file_name
    file_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return _saved_run_descriptor(file_path)


def _saved_run_descriptor(file_path: Path) -> dict[str, str]:
    return {
        "file_name": file_path.name,
        "absolute_path": str(file_path),
        "relative_path": str(file_path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
    }


def _resolve_saved_run_path(file_name: str) -> Path:
    ensure_test_storage()
    target = (TEST_RUNS_DIR / file_name).resolve()
    if target.parent != TEST_RUNS_DIR.resolve() or not target.exists():
        raise FileNotFoundError(file_name)
    return target


def _read_saved_run_payload(file_path: Path) -> dict[str, Any]:
    return json.loads(file_path.read_text(encoding="utf-8"))


def list_saved_run_options(max_items: int = 30) -> list[dict[str, str]]:
    ensure_test_storage()
    options: list[dict[str, str]] = []
    for file_path in sorted(TEST_RUNS_DIR.glob("*.json"), reverse=True):
        try:
            payload = _read_saved_run_payload(file_path)
        except (OSError, ValueError, json.JSONDecodeError):
            continue
        if payload.get("kind") != "parallel-grid-v1":
            continue
        options.append(
            {
                **_saved_run_descriptor(file_path),
                "option_label": file_path.name,
            }
        )
        if len(options) >= max_items:
            break
    return options


def load_saved_run(file_name: str) -> tuple[dict[str, Any], dict[str, str]]:
    file_path = _resolve_saved_run_path(file_name)
    payload = _read_saved_run_payload(file_path)
    if payload.get("kind") != "parallel-grid-v1":
        raise ValueError("JSON incompatível com a tela v1")
    return payload, _saved_run_descriptor(file_path)


def _clamp_int(raw_value: Any, default: int, minimum: int, maximum: int) -> int:
    try:
        value = int(raw_value)
    except (TypeError, ValueError):
        value = default
    return max(minimum, min(maximum, value))


def _coerce_choice(raw_value: Any, default: int, allowed: dict[int, Any]) -> int:
    value = _clamp_int(raw_value, default, min(allowed), max(allowed))
    return value if value in allowed else default


def _default_columns() -> list[dict[str, Any]]:
    return [
        {
            "search_type": config["search_type"],
            "approach": config["approach"],
            "relevance": config["relevance"],
            "top_categories_count": config["top_categories_count"],
        }
        for config in DEFAULT_COLUMN_CONFIGS
    ]


def default_form_state() -> dict[str, Any]:
    return {
    "query": "alimentação hospitalar",
        "limit": DEFAULT_LIMIT,
        "column_count": DEFAULT_COLUMN_COUNT,
        "columns": _default_columns(),
    }


def _prewarm_default_search() -> None:
  global SEARCH_WARMUP_DONE
  if SEARCH_WARMUP_DONE:
    return

  with SEARCH_WARMUP_LOCK:
    if SEARCH_WARMUP_DONE:
      return

    warm_form = default_form_state()
    warm_query = (os.environ.get("GOVGO_BROWSER_PREWARM_QUERY") or warm_form["query"]).strip() or warm_form["query"]
    _run_base_column(
      1,
      warm_query,
      min(int(warm_form["limit"]), 3),
      dict(warm_form["columns"][0]),
    )
    SEARCH_WARMUP_DONE = True


def _start_optional_prewarm() -> None:
  if not _env_flag("GOVGO_BROWSER_PREWARM", False):
    return

  Thread(target=_prewarm_default_search, name="govgo-search-prewarm", daemon=True).start()


def build_form_state_from_saved_payload(payload: dict[str, Any]) -> dict[str, Any]:
  form = default_form_state()
  form["query"] = str(payload.get("query") or form["query"]).strip()
  form["limit"] = _clamp_int(payload.get("limit"), DEFAULT_LIMIT, 1, 100)
  form["column_count"] = _clamp_int(payload.get("column_count"), DEFAULT_COLUMN_COUNT, 1, MAX_COLUMNS)

  payload_columns = list(payload.get("columns") or [])
  for index in range(MAX_COLUMNS):
    default_config = DEFAULT_COLUMN_CONFIGS[index]
    payload_config = dict((payload_columns[index].get("config") or {}) if index < len(payload_columns) else {})
    form["columns"][index] = {
      "search_type": _coerce_choice(payload_config.get("search_type"), default_config["search_type"], SEARCH_TYPES),
      "approach": _coerce_choice(payload_config.get("approach"), default_config["approach"], SEARCH_APPROACHES),
      "relevance": _coerce_choice(payload_config.get("relevance"), default_config["relevance"], RELEVANCE_LEVELS),
      "top_categories_count": _clamp_int(
        payload_config.get("top_categories_count"),
        default_config["top_categories_count"],
        1,
        100,
      ),
    }
  return form


def build_form_state() -> dict[str, Any]:
    form = default_form_state()
    if request.method != "POST":
        return form

    form["query"] = (request.form.get("query") or "").strip()
    form["limit"] = _clamp_int(request.form.get("limit"), DEFAULT_LIMIT, 1, 100)
    form["column_count"] = _clamp_int(request.form.get("column_count"), DEFAULT_COLUMN_COUNT, 1, MAX_COLUMNS)

    for index in range(MAX_COLUMNS):
        default_config = DEFAULT_COLUMN_CONFIGS[index]
        form["columns"][index] = {
            "search_type": _coerce_choice(
                request.form.get(f"column_{index + 1}_search_type"),
                default_config["search_type"],
                SEARCH_TYPES,
            ),
            "approach": _coerce_choice(
                request.form.get(f"column_{index + 1}_approach"),
                default_config["approach"],
                SEARCH_APPROACHES,
            ),
            "relevance": _coerce_choice(
                request.form.get(f"column_{index + 1}_relevance"),
                default_config["relevance"],
                RELEVANCE_LEVELS,
            ),
            "top_categories_count": _clamp_int(
                request.form.get(f"column_{index + 1}_top_categories_count"),
                default_config["top_categories_count"],
                1,
                100,
            ),
        }
    return form


def _search_type_name(code: int) -> str:
    return SEARCH_TYPES.get(code, SEARCH_TYPES[1])["name"]


def _approach_name(code: int) -> str:
    return SEARCH_APPROACHES.get(code, SEARCH_APPROACHES[1])["name"]


def _relevance_name(code: int) -> str:
    return RELEVANCE_LEVELS.get(code, RELEVANCE_LEVELS[1])["name"]


def _column_label(config: dict[str, Any]) -> str:
    return f"{_search_type_name(config['search_type'])} · {_approach_name(config['approach'])}"


def _normalize_identity_text(value: Any) -> str:
  normalized = unicodedata.normalize("NFKD", str(value or ""))
  ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
  return re.sub(r"[^a-z0-9]+", " ", ascii_text.lower()).strip()


def _result_identity_key(item: dict[str, Any]) -> str:
  item_id = str(item.get("item_id") or "").strip().lower()
  if item_id:
    return f"id:{item_id}"

  signature = "|".join(
    [
      _normalize_identity_text(item.get("title")),
      _normalize_identity_text(item.get("organization")),
      _normalize_identity_text(item.get("municipality")),
      _normalize_identity_text(item.get("uf")),
    ]
  )
  return f"sig:{signature}"


def _rank_quality(rank: Any, limit: int) -> float:
  max_rank = max(int(limit or 0), 1)
  safe_rank = max(1, min(int(rank or max_rank), max_rank))
  return (max_rank - safe_rank + 1) / max_rank


def _build_ensemble_palette(column_results: list[dict[str, Any]], limit: int, column_count: int) -> dict[str, dict[str, Any]]:
  aggregates: dict[str, dict[str, Any]] = {}

  for column in column_results:
    for item in column.get("results") or []:
      key = _result_identity_key(item)
      aggregate = aggregates.setdefault(
        key,
        {
          "key": key,
          "item_id": item.get("item_id"),
          "title": item.get("title") or "",
          "ranks": [],
        },
      )
      aggregate["ranks"].append(int(item.get("rank") or limit or 1))

  ranked_items: list[dict[str, Any]] = []
  for aggregate in aggregates.values():
    ranks = list(aggregate["ranks"])
    appearances = len(ranks)
    best_rank = min(ranks) if ranks else max(int(limit or 0), 1)
    average_rank = (sum(ranks) / appearances) if appearances else float(limit or 1)
    presence_ratio = appearances / max(int(column_count or 0), 1)
    best_quality = _rank_quality(best_rank, limit)
    average_quality = sum(_rank_quality(rank, limit) for rank in ranks) / max(appearances, 1)
    score = (presence_ratio * 0.55) + (best_quality * 0.30) + (average_quality * 0.15)
    ranked_items.append(
      {
        "key": aggregate["key"],
        "item_id": aggregate["item_id"],
        "title": aggregate["title"],
        "appearances": appearances,
        "best_rank": best_rank,
        "average_rank": average_rank,
        "score": score,
      }
    )

  ranked_items.sort(
    key=lambda item: (
      -float(item["score"]),
      -int(item["appearances"]),
      int(item["best_rank"]),
      str(item["title"]),
    )
  )

  highlighted_count = min(len(ranked_items), len(ENSEMBLE_SOFT_PALETTE))
  palette_map: dict[str, dict[str, Any]] = {}

  for position, aggregate in enumerate(ranked_items, start=1):
    tone = ENSEMBLE_SOFT_PALETTE[position - 1] if position <= highlighted_count else None
    palette_map[aggregate["key"]] = {
      "key": aggregate["key"],
      "ensemble_rank": position,
      "score": round(float(aggregate["score"]), 4),
      "appearances": int(aggregate["appearances"]),
      "best_rank": int(aggregate["best_rank"]),
      "average_rank": round(float(aggregate["average_rank"]), 2),
      "highlighted": tone is not None,
      "tone_name": tone["name"] if tone else "neutro",
      "bg_color": tone["bg"] if tone else "",
      "accent_color": tone["accent"] if tone else "",
      "tooltip": (
        f"Ensemble #{position} · aparece em {aggregate['appearances']} coluna(s) · "
        f"melhor posicao {aggregate['best_rank']} · media {round(float(aggregate['average_rank']), 2)}"
      ),
    }

  return palette_map


def _apply_ensemble_palette(column_results: list[dict[str, Any]], limit: int, column_count: int) -> None:
  palette_map = _build_ensemble_palette(column_results, limit, column_count)

  for column in column_results:
    for item in column.get("results") or []:
      item["ensemble"] = palette_map.get(
        _result_identity_key(item),
        {
          "highlighted": False,
          "bg_color": "",
          "accent_color": "",
          "tone_name": "neutro",
          "tooltip": "",
        },
      )


def _build_request(query: str, limit: int, config: dict[str, Any]) -> SearchRequest:
    base_type = SEARCH_TYPES[config["search_type"]]["request_type"]
    approach = int(config["approach"])
    if approach == 1:
        search_type = base_type
    elif approach == 2:
        search_type = "correspondence"
    else:
        search_type = "category_filtered"

    payload = {
        "query": query,
        "search_type": search_type,
        "limit": limit,
        "preprocess": True,
        "prefer_preproc_v2": True,
        "intelligent_mode": True,
        "filter_expired": True,
        "use_negation": True,
        "top_categories_limit": int(config["top_categories_count"]),
        "category_search_base": base_type,
    }
    return SearchRequest.from_mapping(payload)


def _reset_relevance_level() -> None:
    adapter = SearchAdapter()
    adapter._load_modules()
    try:
        adapter._core.set_relevance_filter_level(1)
    except Exception:
        pass


def _run_base_column(index: int, query: str, limit: int, config: dict[str, Any]) -> dict[str, Any]:
    request_obj = _build_request(query, limit, config)
    adapter = SearchAdapter()
    response = adapter.run(request_obj)
    raw_results = []
    if not response.error:
        raw_results = [item.raw for item in response.results]

    return {
        "index": index,
        "config": dict(config),
        "request": request_obj.to_dict(),
        "elapsed_ms": int(response.elapsed_ms or 0),
        "confidence": float(response.confidence or 0.0),
        "result_count": int(response.result_count or 0),
        "preprocessing": dict(response.preprocessing or {}),
        "meta": dict(response.meta or {}),
        "error": response.error,
        "raw_results": raw_results,
    }


def _apply_relevance(base_result: dict[str, Any], query: str, adapter: SearchAdapter) -> dict[str, Any]:
    config = dict(base_result["config"])
    raw_results = list(base_result.get("raw_results") or [])
    meta = dict(base_result.get("meta") or {})
    elapsed_ms = int(base_result.get("elapsed_ms", 0) or 0)
    relevance_meta = {"filter_applied": False, "level": int(config["relevance"])}

    if not base_result.get("error") and raw_results and int(config["relevance"]) > 1:
        started = time.perf_counter()
        with RELEVANCE_FILTER_LOCK:
            previous_level = 1
            try:
                previous_level = int(adapter._core.get_relevance_filter_status().get("level") or 1)
            except Exception:
                previous_level = 1
            try:
                adapter._core.set_relevance_filter_level(int(config["relevance"]))
                raw_results, relevance_meta = adapter._core.apply_relevance_filter(
                    raw_results,
                    query,
                    {
                        "search_type": _search_type_name(int(config["search_type"])),
                        "search_approach": _approach_name(int(config["approach"])),
                    },
                )
            except Exception as exc:
                relevance_meta = {
                    "filter_applied": False,
                    "level": int(config["relevance"]),
                    "reason": str(exc),
                }
            finally:
                try:
                    adapter._core.set_relevance_filter_level(previous_level)
                except Exception:
                    pass
        elapsed_ms += int((time.perf_counter() - started) * 1000)

    items = []
    if not base_result.get("error"):
        items = [adapter._normalize_result(item).to_dict() for item in raw_results]

    meta["relevance_filter"] = relevance_meta
    meta["column_config"] = {
        "type": _search_type_name(int(config["search_type"])),
        "approach": _approach_name(int(config["approach"])),
        "relevance": _relevance_name(int(config["relevance"])),
        "top_categories_count": int(config["top_categories_count"]),
    }

    return {
        "index": int(base_result["index"]),
        "config": config,
        "request": dict(base_result["request"]),
        "elapsed_ms": elapsed_ms,
        "confidence": float(base_result.get("confidence") or 0.0),
        "result_count": len(items),
        "preprocessing": dict(base_result.get("preprocessing") or {}),
        "meta": meta,
        "error": base_result.get("error"),
        "results": items,
        "relevance_label": _relevance_name(int(config["relevance"])),
    }


def run_parallel_columns(form: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any], dict[str, str]]:
  active_columns = [
    {"index": index + 1, "config": dict(form["columns"][index])}
    for index in range(int(form["column_count"]))
  ]
  uses_relevance_filter = any(int(column["config"].get("relevance") or 1) > 1 for column in active_columns)

  if uses_relevance_filter:
    _reset_relevance_level()

  if len(active_columns) <= 1:
    base_results = [
      _run_base_column(column["index"], form["query"], form["limit"], column["config"])
      for column in active_columns
    ]
  else:
    base_results = []
    with ThreadPoolExecutor(max_workers=len(active_columns)) as executor:
      futures = [
        executor.submit(_run_base_column, column["index"], form["query"], form["limit"], column["config"])
        for column in active_columns
      ]
      for future in futures:
        base_results.append(future.result())

  base_results.sort(key=lambda item: int(item["index"]))

  post_adapter = SearchAdapter()
  if uses_relevance_filter:
    post_adapter._load_modules()
  finalized_results = [_apply_relevance(item, form["query"], post_adapter) for item in base_results]
  _apply_ensemble_palette(finalized_results, int(form["limit"]), len(active_columns))

  elapsed_values = [int(item.get("elapsed_ms", 0) or 0) for item in finalized_results]
  summary = {
    "query": form["query"],
    "limit": int(form["limit"]),
    "column_count": len(finalized_results),
    "fastest_ms": min(elapsed_values) if elapsed_values else 0,
    "slowest_ms": max(elapsed_values) if elapsed_values else 0,
  }

  payload = {
    "saved_at": datetime.now().isoformat(timespec="seconds"),
    "kind": "parallel-grid-v1",
    "label": form["query"] or "busca-v1",
    "query": form["query"],
    "limit": int(form["limit"]),
    "column_count": len(finalized_results),
    "columns": finalized_results,
    "summary": summary,
  }
  saved_run = save_test_run(f"v1-{form['query'] or 'busca'}", payload)
  return finalized_results, summary, saved_run


def hydrate_loaded_columns(payload: dict[str, Any], form: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    raw_columns = list(payload.get("columns") or [])
    hydrated_columns: list[dict[str, Any]] = []

    for index in range(int(form["column_count"])):
        config = dict(form["columns"][index])
        raw_column = dict(raw_columns[index] if index < len(raw_columns) else {})
        results = [dict(item) for item in (raw_column.get("results") or [])]
        hydrated_columns.append(
            {
                "index": index + 1,
                "config": config,
                "request": dict(raw_column.get("request") or {}),
                "elapsed_ms": int(raw_column.get("elapsed_ms") or 0),
                "confidence": float(raw_column.get("confidence") or 0.0),
                "result_count": int(raw_column.get("result_count") or len(results)),
                "preprocessing": dict(raw_column.get("preprocessing") or {}),
                "meta": dict(raw_column.get("meta") or {}),
                "error": raw_column.get("error"),
                "results": results,
                "relevance_label": raw_column.get("relevance_label") or _relevance_name(int(config["relevance"])),
            }
        )

    _apply_ensemble_palette(hydrated_columns, int(form["limit"]), int(form["column_count"]))

    summary_payload = dict(payload.get("summary") or {})
    summary = {
        "query": str(summary_payload.get("query") or form["query"]),
        "limit": int(summary_payload.get("limit") or form["limit"]),
        "column_count": int(summary_payload.get("column_count") or form["column_count"]),
        "fastest_ms": int(summary_payload.get("fastest_ms") or min((column["elapsed_ms"] for column in hydrated_columns), default=0)),
        "slowest_ms": int(summary_payload.get("slowest_ms") or max((column["elapsed_ms"] for column in hydrated_columns), default=0)),
    }
    return hydrated_columns, summary


def build_column_views(form: dict[str, Any], column_results: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    result_map = {int(item["index"]): item for item in (column_results or [])}
    views = []
    for index in range(MAX_COLUMNS):
        config = dict(form["columns"][index])
        views.append(
            {
                "index": index + 1,
                "active": (index + 1) <= int(form["column_count"]),
                "config": config,
                "config_label": _column_label(config),
                "result": result_map.get(index + 1),
            }
        )
    return views


def _select_options(mapping: dict[int, dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {"value": key, "label": f"{key} - {value['name']}"}
        for key, value in mapping.items()
    ]


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
    form = default_form_state()
    column_results = None
    summary = None
    saved_run = None
    load_error = None
    selected_saved_run_file = ""
    saved_run_options = list_saved_run_options()

    if request.method == "POST":
        action = (request.form.get("action") or "search").strip().lower()
        if action == "load_json":
            selected_saved_run_file = (request.form.get("saved_run_file") or "").strip()
            if selected_saved_run_file:
                try:
                    payload, saved_run = load_saved_run(selected_saved_run_file)
                    form = build_form_state_from_saved_payload(payload)
                    column_results, summary = hydrate_loaded_columns(payload, form)
                except (FileNotFoundError, ValueError, OSError, json.JSONDecodeError):
                    form = build_form_state()
                    load_error = "Nao foi possivel carregar este JSON salvo."
            else:
                form = build_form_state()
                load_error = "Selecione um JSON salvo para carregar."
        else:
            form = build_form_state()
            if form["query"]:
                column_results, summary, saved_run = run_parallel_columns(form)
                selected_saved_run_file = saved_run["file_name"]

    return render_template_string(
        HTML,
        design_css=get_browser_design_css(),
        v1_logo_url=V1_LOGO_URL,
        form=form,
        column_views=build_column_views(form, column_results),
        summary=summary,
        saved_run=saved_run,
        load_error=load_error,
        saved_run_options=saved_run_options,
        selected_saved_run_file=selected_saved_run_file,
        search_type_options=_select_options(SEARCH_TYPES),
        approach_options=_select_options(SEARCH_APPROACHES),
        relevance_options=_select_options(RELEVANCE_LEVELS),
        top_category_options=TOP_CATEGORIES_OPTIONS,
    )


def _env_flag(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() not in {"0", "false", "no", "off"}


def _run_options(port: int) -> dict[str, Any]:
  debug_enabled = _env_flag("GOVGO_BROWSER_DEBUG", True)
  reloader_default = os.name != "nt"
  reloader_enabled = debug_enabled and _env_flag("GOVGO_BROWSER_RELOAD", reloader_default)
  threaded_enabled = _env_flag("GOVGO_BROWSER_THREADED", False)
  options: dict[str, Any] = {
    "host": "127.0.0.1",
    "port": port,
    "debug": debug_enabled,
    "use_reloader": reloader_enabled,
    "threaded": threaded_enabled,
  }
  if reloader_enabled and os.name == "nt":
    options["reloader_type"] = "stat"
  return options


def _serve_browser(port: int) -> None:
  options = _run_options(port)
  if os.name != "nt":
    APP.run(**options)
    return

  host = str(options["host"])
  debug_enabled = bool(options["debug"])
  server = make_server(host, port, APP)

  print(" * Serving Flask app 'app_v1'")
  print(f" * Debug mode: {'on' if debug_enabled else 'off'}")
  print("WARNING: This is a local WSGI server for homologation on Windows.")
  print(f" * Running on http://{host}:{port}")
  print("Press CTRL+C to quit")

  try:
    server.serve_forever()
  except KeyboardInterrupt:
    print("\nEncerrando app_v1...")
  finally:
    server.server_close()


if __name__ == "__main__":
    _start_optional_prewarm()
    _serve_browser(8012)