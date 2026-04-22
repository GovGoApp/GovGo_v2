from __future__ import annotations

import json
import re
import sys
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any

from flask import Flask, Response, abort, render_template_string, request


PROJECT_ROOT = Path(__file__).resolve().parents[3]
HOMOLOGATION_ROOT = PROJECT_ROOT / "homologation" / "documents"
FIXTURES_PATH = HOMOLOGATION_ROOT / "fixtures" / "document_cases.json"
RUNS_DIR = HOMOLOGATION_ROOT / "tests" / "runs"
ACTIVE_DOCUMENTS_ROOT = HOMOLOGATION_ROOT / "v1_copy" / "core"
UPLOADS_DIR = HOMOLOGATION_ROOT / "artifacts" / "uploads"
MAX_RECENT_RUNS = 8
UPLOAD_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,.tsv,.json,.xml,.html,.zip,.rar,.7z,.tar,.gz,.gzip,.bz2"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from homologation.documents.core.adapter import DocumentsAdapter
from homologation.documents.core.contracts import DocumentRequest
from homologation.browser_design import get_browser_design_css


APP = Flask(__name__)


def _build_adapter() -> DocumentsAdapter:
  return DocumentsAdapter()


ACTION_INFO = {
  "healthcheck": {
    "step": "Base",
    "category": "Infraestrutura",
    "title": "Healthcheck do laboratório",
    "action_title": "Healthcheck",
    "description": "Confirma se o módulo local está disponível para uso.",
    "validates": [],
    "expected": "Status ok do ambiente atual.",
    "button_label": "Rodar healthcheck",
    "tone": "tone-health",
    "trigger_source": "Teste manual",
  },
  "list_documents": {
    "step": "PNCP",
    "category": "Lista de arquivos",
    "title": "Arquivos encontrados no PNCP",
    "action_title": "Listagem PNCP",
    "description": "Lista os documentos publicados para um processo informado.",
    "validates": [],
    "expected": "Retornar a relação de documentos do processo.",
    "button_label": "Buscar arquivos",
    "tone": "tone-list",
    "trigger_source": "PNCP",
  },
  "process_url": {
    "step": "Arquivo",
    "category": "Link ou caminho",
    "title": "Documento processado",
    "action_title": "Processar link",
    "description": "Processa um documento vindo de URL, file:// ou caminho local.",
    "validates": [],
    "expected": "Extrair texto e montar resumo quando houver conteúdo.",
    "button_label": "Processar link",
    "tone": "tone-process",
    "trigger_source": "Link ou caminho",
  },
  "process_upload": {
    "step": "Upload",
    "category": "Arquivos locais",
    "title": "Arquivos processados",
    "action_title": "Processar arquivos",
    "description": "Processa um arquivo, vários arquivos ou um pacote enviado pelo navegador.",
    "validates": [],
    "expected": "Extrair texto e montar resumo quando houver conteúdo.",
    "button_label": "Processar arquivos",
    "tone": "tone-process",
    "trigger_source": "Arquivo local",
  },
  "process_pncp_document": {
    "step": "PNCP",
    "category": "Documento selecionado",
    "title": "Documento do PNCP processado",
    "action_title": "Abrir arquivo do PNCP",
    "description": "Processa um documento escolhido da lista publicada no PNCP.",
    "validates": [],
    "expected": "Extrair texto e montar resumo quando houver conteúdo.",
    "button_label": "Abrir este arquivo",
    "tone": "tone-list",
    "trigger_source": "Documento escolhido do PNCP",
  },
}

HTML = """
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GovGo v2 :: Documentos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Sora:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    {{ design_css|safe }}
    .documents-browser {
      font-size: 80%;
    }
    .documents-browser .page-shell {
      padding: 10px;
    }
    .documents-browser .topbar {
      margin-bottom: 10px;
      padding: 14px 18px;
      border-radius: 18px;
    }
    .documents-browser .workspace-grid {
      gap: 10px;
    }
    .documents-browser .sidebar-panel,
    .documents-browser .result-panel {
      padding: 10px;
    }
    .documents-browser .panel,
    .documents-browser .panel-block,
    .documents-browser .doc-card,
    .documents-browser .text-block,
    .documents-browser .saved-link,
    .documents-browser .stat-box,
    .documents-browser .run-row {
      border-radius: 14px;
    }
    .documents-browser .panel-block,
    .documents-browser .doc-card,
    .documents-browser .text-block,
    .documents-browser .saved-link,
    .documents-browser .run-row,
    .documents-browser .stat-box {
      padding: 10px;
    }
    .documents-browser .sidebar-panel {
      gap: 10px;
    }
    .documents-browser .result-panel {
      min-height: 0;
    }
    .documents-browser .empty-state {
      min-height: 260px;
      padding: 16px;
      border-radius: 16px;
    }
    .documents-browser .eyebrow {
      font-size: 8.8px;
      margin-bottom: 4px;
    }
    .documents-browser .page-title {
      font-size: clamp(24px, 2.4vw, 33.6px);
    }
    .documents-browser .page-lede {
      font-size: 12px;
      margin-top: 6px;
      line-height: 1.45;
    }
    .documents-browser .tag,
    .documents-browser .soft-chip,
    .documents-browser .mini-tag,
    .documents-browser .status-pill {
      font-size: 9.6px;
    }
    .documents-browser .field-label,
    .documents-browser .stat-box .stat-label {
      font-size: 8.8px;
    }
    .documents-browser .section-headline p,
    .documents-browser .muted-copy,
    .documents-browser .result-header p,
    .documents-browser .doc-card p,
    .documents-browser .text-block p,
    .documents-browser .empty-state p,
    .documents-browser .upload-note,
    .documents-browser .recent-note,
    .documents-browser .text-content {
      font-size: 10.4px;
    }
    .documents-browser .error-box,
    .documents-browser .busy-text span {
      font-size: 11.2px;
    }
    .documents-browser .stat-box strong {
      font-size: 19.2px;
    }
    .documents-browser .saved-link strong,
    .documents-browser .busy-text strong {
      font-size: 17.6px;
    }
    .documents-browser .section-headline {
      margin-bottom: 8px;
      gap: 8px;
    }
    .documents-browser .section-headline h2,
    .documents-browser .text-block h3,
    .documents-browser .doc-card h3,
    .documents-browser .result-header h2,
    .documents-browser .empty-state h2 {
      font-size: 15px;
      line-height: 1.15;
    }
    .documents-browser .field-stack,
    .documents-browser .collapsible-body,
    .documents-browser .text-grid,
    .documents-browser .stat-grid,
    .documents-browser .doc-grid,
    .documents-browser .result-header,
    .documents-browser .run-list,
    .documents-browser .link-row,
    .documents-browser .action-row {
      gap: 8px;
    }
    .documents-browser .field {
      gap: 5px;
    }
    .documents-browser .control,
    .documents-browser .control-select,
    .documents-browser .control-textarea {
      border-radius: 12px;
      padding: 9px 10px;
    }
    .documents-browser .control-textarea {
      min-height: 82px;
    }
    .documents-browser .button,
    .documents-browser .button-ghost,
    .documents-browser .button-soft {
      min-height: 36px;
      padding: 0 12px;
      border-radius: 12px;
    }
    .documents-browser .text-content {
      margin-top: 8px;
      padding: 10px;
      max-height: 420px;
      border-radius: 12px;
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
      gap: 12px;
      min-width: 0;
    }
    .sidebar-collapsible.is-collapsed .collapsible-body {
      display: none;
    }
    .upload-note {
      color: var(--ink-2);
      font-size: 10.4px;
      line-height: 1.4;
    }
    .recent-note {
      margin-top: 2px;
      color: var(--ink-3);
      font-size: 10.4px;
    }
    .doc-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 10px;
    }
    .doc-card,
    .text-block,
    .saved-link {
      border: 1px solid var(--hairline-soft);
      border-radius: 14px;
      background: var(--paper);
      padding: 10px;
    }
    .doc-card h3,
    .text-block h3,
    .result-header h2,
    .empty-state h2 {
      margin: 0;
    }
    .doc-card p,
    .text-block p,
    .result-header p,
    .empty-state p {
      margin: 6px 0 0;
      color: var(--ink-2);
      font-size: 10.4px;
      line-height: 1.45;
    }
    .doc-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .result-header {
      display: grid;
      gap: 14px;
      margin-bottom: 14px;
    }
    .result-title-row {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: flex-start;
    }
    .result-title-row > div {
      min-width: 0;
    }
    .saved-link {
      background: var(--blue-50);
      border-color: var(--blue-200);
      color: var(--deep-blue);
      padding: 10px 12px;
      border-radius: 14px;
    }
    .saved-link strong {
      display: block;
      margin-bottom: 4px;
      font-family: var(--font-display);
    }
    .text-grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    }
    .text-content {
      margin-top: 8px;
      padding: 10px;
      border: 1px solid var(--hairline-soft);
      border-radius: 12px;
      background: var(--rail);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      max-height: 420px;
      overflow: auto;
      font-size: 10.4px;
      line-height: 1.45;
    }
    .error-box {
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, var(--risk) 18%, white);
      background: var(--risk-50);
      color: var(--risk);
      font-size: 11.2px;
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
  </style>
</head>
<body class="documents-browser">
  <div class="page-shell">
    <header class="topbar">
      <div>
        <div class="eyebrow">GovGo v2 · Homologação</div>
        <h1 class="page-title">Documentos</h1>
        <p class="page-lede">Teste um arquivo, um lote ou um documento publicado no PNCP com a mesma linguagem visual da Busca.</p>
      </div>
      <div class="top-tags">
        <span class="tag tag--accent">Documento real</span>
        <span class="tag tag--blue">Lote</span>
        <span class="tag">PNCP</span>
      </div>
    </header>

    <div class="workspace-grid">
      <aside class="panel sidebar-panel">
        <section class="panel-block panel-block--tinted sidebar-collapsible" data-collapsible>
          <div class="section-headline section-headline--toggle">
            <div>
              <h2>Arquivos locais</h2>
              <p>Um arquivo, vários ou um pacote.</p>
            </div>
            <button type="button" class="collapse-toggle" data-collapse-toggle aria-expanded="true" aria-label="Recolher Arquivos locais" title="Recolher Arquivos locais"><span class="toggle-icon" aria-hidden="true">▴</span></button>
          </div>
          <div class="collapsible-body">
            <form method="post" action="/process-upload" enctype="multipart/form-data" class="field-stack" data-busy-label="Processando arquivos enviados...">
              <label class="field">
                <span class="field-label">Arquivos</span>
                <input class="control" id="local_files" name="local_files" type="file" multiple accept="{{ upload_accept }}">
              </label>
              <div class="upload-note">Vários arquivos viram um lote `.zip` e seguem pelo mesmo fluxo.</div>
              <div class="action-row">
                <button type="submit" class="button">Processar arquivos</button>
              </div>
            </form>
          </div>
        </section>

        <section class="panel-block sidebar-collapsible" data-collapsible>
          <div class="section-headline section-headline--toggle">
            <div>
              <h2>Link / caminho</h2>
              <p>URL, `file://` ou caminho local.</p>
            </div>
            <button type="button" class="collapse-toggle" data-collapse-toggle aria-expanded="true" aria-label="Recolher Link / caminho" title="Recolher Link / caminho"><span class="toggle-icon" aria-hidden="true">▴</span></button>
          </div>
          <div class="collapsible-body">
            <form method="post" action="/process-url" class="field-stack" data-busy-label="Processando documento informado...">
              <label class="field">
                <span class="field-label">Nome</span>
                <input class="control" id="document_name" name="document_name" value="{{ form_state.document_name }}" placeholder="Ex.: edital.pdf">
              </label>
              <label class="field">
                <span class="field-label">Link ou caminho</span>
                <textarea class="control-textarea" id="document_url" name="document_url" placeholder="Cole a URL do arquivo ou um caminho local existente">{{ form_state.document_url }}</textarea>
              </label>
              <div class="action-row">
                <button type="submit" class="button-ghost">Processar link</button>
              </div>
            </form>
          </div>
        </section>

        <section class="panel-block sidebar-collapsible" data-collapsible>
          <div class="section-headline section-headline--toggle">
            <div>
              <h2>PNCP</h2>
              <p>Liste e escolha um documento.</p>
            </div>
            <button type="button" class="collapse-toggle" data-collapse-toggle aria-expanded="true" aria-label="Recolher PNCP" title="Recolher PNCP"><span class="toggle-icon" aria-hidden="true">▴</span></button>
          </div>
          <div class="collapsible-body">
            <form method="post" action="/list-documents" class="field-stack" data-busy-label="Buscando arquivos publicados no PNCP...">
              <label class="field">
                <span class="field-label">Controle PNCP</span>
                <input class="control" id="pncp_id" name="pncp_id" value="{{ form_state.pncp_id }}" placeholder="Ex.: 05149117000155-1-000014/2026">
              </label>
              <div class="action-row">
                <button type="submit" class="button-soft">Buscar arquivos</button>
              </div>
            </form>
            {% if pncp_picker %}
            <div class="recent-note">Última listagem: {{ pncp_picker.documents|length }} arquivo(s).</div>
            {% endif %}
          </div>
        </section>

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
                  <strong>{{ item.display_title }}</strong>
                  <div class="muted-copy">{{ item.target }}</div>
                  <div class="link-row">
                    <span class="soft-chip mono">{{ item.timestamp }}</span>
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
        {% if result %}
        <div class="result-header">
          <div class="result-title-row">
            <div>
              <div class="eyebrow">{{ result.category }}</div>
              <h2>{{ result.display_title }}</h2>
              <p>{{ result.target }}</p>
            </div>
            <span class="status-pill {{ 'ok' if result.status == 'ok' else 'error' if result.status == 'error' else '' }}">{{ result.status|upper }}</span>
          </div>
          <div class="stat-grid">
            <div class="stat-box"><span class="stat-label">Tempo</span><strong class="mono">{{ result.elapsed_ms }} ms</strong></div>
            <div class="stat-box"><span class="stat-label">Itens</span><strong class="mono">{{ result.result_count }}</strong></div>
            <div class="stat-box"><span class="stat-label">Origem</span><strong>{{ result.trigger_source }}</strong></div>
          </div>
          <a class="saved-link" href="/runs/{{ result.saved_run_name }}" target="_blank" rel="noreferrer">
            <strong>Resultado salvo</strong>
            <span>{{ result.saved_run_name }}</span>
          </a>
        </div>

        {% if result.error %}
        <div class="error-box">{{ result.error }}</div>
        {% endif %}

        {% if result.documents %}
        <section class="text-block">
          <h3>Arquivos encontrados</h3>
          <p>Escolha qualquer documento da lista para processar direto pelo fluxo de Documentos.</p>
          <div class="doc-grid" style="margin-top: 14px;">
            {% for item in result.documents %}
            <article class="doc-card">
              <h3>{{ item.nome or item.titulo or 'Documento sem nome' }}</h3>
              <p>{{ item.tipoDocumentoNome or item.tipoNome or item.tipo or 'Tipo não informado' }}</p>
              <div class="doc-meta">
                {% if item.sequencialDocumento %}<span class="mini-tag">Seq. {{ item.sequencialDocumento }}</span>{% endif %}
                {% if item.origem %}<span class="mini-tag">{{ item.origem }}</span>{% endif %}
              </div>
              <form method="post" action="/process-pncp-document" class="field-stack" data-busy-label="Processando arquivo escolhido no PNCP...">
                <input type="hidden" name="document_url" value="{{ item.url or '' }}">
                <input type="hidden" name="document_name" value="{{ item.nome or '' }}">
                <input type="hidden" name="pncp_id" value="{{ result.request.pncp_id or form_state.pncp_id }}">
                <div class="action-row">
                  <button type="submit" class="button-ghost">Abrir este arquivo</button>
                </div>
              </form>
            </article>
            {% endfor %}
          </div>
        </section>
        {% else %}
        <div class="text-grid">
          {% if result.extracted_text %}
          <section class="text-block">
            <h3>Texto extraído</h3>
            <p>Primeira camada do processamento do documento.</p>
            <div class="text-content">{{ result.extracted_text }}</div>
          </section>
          {% endif %}

          {% if result.summary %}
          <section class="text-block">
            <h3>Resumo</h3>
            <p>Leitura consolidada a partir do conteúdo processado.</p>
            <div class="text-content">{{ result.summary }}</div>
          </section>
          {% endif %}
        </div>

        {% if not result.extracted_text and not result.summary and not result.error %}
        <section class="text-block">
          <h3>Sem conteúdo para mostrar</h3>
          <p>O processamento terminou sem texto extraído visível nesta resposta.</p>
        </section>
        {% endif %}
        {% endif %}
        {% else %}
        <section class="empty-state">
          <div>
            <h2>Escolha como quer testar</h2>
            <p>Envie um arquivo, vários de uma vez, um pacote zip ou busque um documento real no PNCP. A tela foi simplificada para isso.</p>
          </div>
        </section>
        {% endif %}
      </main>
    </div>
  </div>

  <div id="busy-overlay" class="busy-overlay" aria-hidden="true">
    <div class="busy-card">
      <div class="busy-spinner" aria-hidden="true"></div>
      <div class="busy-text">
        <strong id="busy-title">Processando...</strong>
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


def _slugify(value: str) -> str:
  return re.sub(r"[^a-z0-9]+", "-", (value or "run").strip().lower()).strip("-") or "run"


def _display_action(payload: dict[str, Any], fallback: str = "healthcheck") -> str:
  action = str(payload.get("action") or fallback or "healthcheck").strip().lower()
  extra = payload.get("extra") or {}
  browser_action = str(extra.get("browser_action") or payload.get("browser_action") or "").strip().lower()
  source_kind = str(extra.get("source_kind") or payload.get("source_kind") or "").strip().lower()
  if browser_action:
    return browser_action
  if action == "process_url" and source_kind in {"upload-local", "upload-multi-local"}:
    return "process_upload"
  if action == "process_url" and source_kind == "pncp-selected":
    return "process_pncp_document"
  return action


def _source_kind_label(source_kind: str) -> str:
  normalized = str(source_kind or "").strip().lower()
  mapping = {
    "upload-local": "Arquivo local enviado no browser",
    "upload-multi-local": "Lote de arquivos enviado no browser",
    "pncp-selected": "Documento escolhido da lista do PNCP",
  }
  return mapping.get(normalized, "")


def _normalize_browser_file_name(raw_name: str, fallback_index: int) -> str:
  normalized = Path(str(raw_name or "")).name.strip()
  if normalized:
    return normalized
  return f"arquivo_{fallback_index}"


def _save_browser_uploads(uploaded_files: list[Any]) -> tuple[str | None, str | None, str | None, str]:
  valid_files = []
  for index, uploaded_file in enumerate(uploaded_files, start=1):
    original_name = _normalize_browser_file_name(getattr(uploaded_file, "filename", ""), index)
    if not original_name:
      continue
    valid_files.append((uploaded_file, original_name))

  if not valid_files:
    return None, None, "Selecione ao menos um arquivo para testar.", "upload-local"

  UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

  if len(valid_files) == 1:
    uploaded_file, original_name = valid_files[0]
    extension = Path(original_name).suffix.lower()
    safe_stem = _slugify(Path(original_name).stem).replace("-", "_") or "arquivo"
    saved_name = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{safe_stem}{extension}"
    saved_path = UPLOADS_DIR / saved_name
    try:
      uploaded_file.save(saved_path)
    except Exception as exc:
      return None, None, f"Falha ao salvar o arquivo local enviado: {exc}", "upload-local"
    return str(saved_path), original_name, None, "upload-local"

  bundle_name = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_lote_local.zip"
  bundle_path = UPLOADS_DIR / bundle_name
  seen_names: dict[str, int] = {}
  try:
    with zipfile.ZipFile(bundle_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
      for index, (uploaded_file, original_name) in enumerate(valid_files, start=1):
        stem = Path(original_name).stem or f"arquivo_{index}"
        suffix = Path(original_name).suffix
        seen_names[original_name] = seen_names.get(original_name, 0) + 1
        member_name = original_name
        if seen_names[original_name] > 1:
          member_name = f"{stem}_{seen_names[original_name]}{suffix}"
        uploaded_file.stream.seek(0)
        archive.writestr(member_name, uploaded_file.read())
    display_name = f"lote_{len(valid_files)}_arquivos.zip"
  except Exception as exc:
    return None, None, f"Falha ao preparar o lote de arquivos enviado: {exc}", "upload-multi-local"
  return str(bundle_path), display_name, None, "upload-multi-local"


def _action_info(action: str) -> dict[str, Any]:
  return ACTION_INFO.get(action, ACTION_INFO["healthcheck"])


def _normalize_text_list(value: Any) -> list[str]:
  if value is None:
    return []
  if isinstance(value, list):
    return [str(item).strip() for item in value if str(item).strip()]
  text = str(value).strip()
  return [text] if text else []


def _build_target_summary(payload: dict[str, Any]) -> str:
  action = _display_action(payload)
  if action == "healthcheck":
    return "Sem entrada manual"
  if action == "list_documents":
    pncp_id = str(payload.get("pncp_id") or "").strip()
    return f"PNCP {pncp_id}" if pncp_id else "PNCP nao informado"
  if action in {"process_url", "process_upload", "process_pncp_document"}:
    extra = payload.get("extra") or {}
    source_label = _source_kind_label(str(extra.get("source_kind") or ""))
    document_name = str(payload.get("document_name") or "").strip()
    document_url = str(payload.get("document_url") or "").strip()
    pncp_id = str(payload.get("pncp_id") or "").strip()
    if document_name:
      if source_label and pncp_id:
        return f"{source_label} :: PNCP {pncp_id} :: {document_name}"
      if source_label:
        return f"{source_label} :: {document_name}"
      return document_name
    if document_url:
      return document_url[:96]
    return "URL nao informada"
  return "Sem alvo definido"


def _build_expected_summary(payload: dict[str, Any]) -> str:
  action = _display_action(payload)
  info = _action_info(action)
  explicit = str(payload.get("expected") or "").strip()
  if explicit:
    return explicit
  if action == "list_documents":
    minimum = payload.get("expected_min_documents")
    if minimum is not None:
      return f"Retornar pelo menos {minimum} documento(s) normalizado(s) para o PNCP informado."
  if action in {"process_url", "process_upload", "process_pncp_document"}:
    flow = "MarkItDown + Assistant"
    contains = str(payload.get("expected_contains") or "").strip()
    if contains:
      return f"Baixar o arquivo e produzir um resumo pelo fluxo {flow}, contendo \"{contains}\"."
    return info["expected"] or f"Baixar o arquivo e produzir um resumo pelo fluxo {flow}."
  return info["expected"]


def _human_fixture_title(payload: dict[str, Any]) -> str:
  explicit = str(payload.get("title") or "").strip()
  if explicit:
    return explicit
  action = str(payload.get("action") or "healthcheck")
  if action == "healthcheck":
    return "Fixture pronta: healthcheck do core local"
  if action == "list_documents":
    pncp_id = str(payload.get("pncp_id") or "").strip()
    return f"Fixture pronta: listar documentos do PNCP {pncp_id}" if pncp_id else "Fixture pronta: listar documentos por PNCP"
  if action == "process_url":
    document_name = str(payload.get("document_name") or "").strip()
    return f"Fixture pronta: processar {document_name}" if document_name else "Fixture pronta: processar documento por URL"
  return str(payload.get("name") or "fixture")


def _human_fixture_description(payload: dict[str, Any]) -> str:
  explicit = str(payload.get("description") or "").strip()
  if explicit:
    return explicit
  action = str(payload.get("action") or "healthcheck")
  if action == "healthcheck":
    return "Roda o healthcheck completo do laboratorio sem precisar preencher parametros."
  if action == "list_documents":
    return "Consulta um PNCP especifico e verifica se o adapter devolve a lista de documentos publicada para aquele processo."
  if action == "process_url":
    return "Baixa um documento especifico e exercita o fluxo completo de resumo do modulo de Documentos."
  return _action_info(action)["description"]


def _format_fixture(payload: dict[str, Any]) -> dict[str, Any]:
  action = str(payload.get("action") or "healthcheck")
  info = _action_info(action)
  validates = _normalize_text_list(payload.get("validates")) or list(info["validates"])
  return {
    "name": str(payload.get("name") or "fixture"),
    "action": action,
    "action_title": info["action_title"],
    "enabled": bool(payload.get("enabled", True)),
    "title": _human_fixture_title(payload),
    "description": _human_fixture_description(payload),
    "validates": validates,
    "expected": _build_expected_summary(payload),
    "target": _build_target_summary(payload),
    "tone": info["tone"],
    "payload": payload,
  }


def _load_fixtures() -> list[dict[str, Any]]:
  if not FIXTURES_PATH.exists():
    return []
  with FIXTURES_PATH.open("r", encoding="utf-8") as handle:
    raw_fixtures = json.load(handle)
  return [_format_fixture(item) for item in raw_fixtures]


def _find_fixture(fixture_name: str) -> dict[str, Any] | None:
  for fixture in _load_fixtures():
    if fixture["name"] == fixture_name:
      return fixture
  return None


def _save_run(label: str, request_payload: dict[str, Any], response_payload: dict[str, Any]) -> str:
  RUNS_DIR.mkdir(parents=True, exist_ok=True)
  timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
  file_name = f"{timestamp}__{_slugify(label)}.json"
  run_path = RUNS_DIR / file_name
  run_path.write_text(
    json.dumps(
      {
        "label": label,
        "request": request_payload,
        "response": response_payload,
      },
      ensure_ascii=False,
      indent=2,
    ),
    encoding="utf-8",
  )
  return file_name


def _format_saved_timestamp(raw_value: str) -> str:
  try:
    return datetime.strptime(raw_value, "%Y%m%d_%H%M%S").strftime("%d/%m/%Y %H:%M:%S")
  except Exception:
    return raw_value


def _default_form_state() -> dict[str, Any]:
  return {
    "pncp_id": "05149117000155-1-000014/2026",
    "document_url": "https://pncp.gov.br/pncp-api/v1/orgaos/05149117000155/compras/2026/000014/arquivos/1",
    "document_name": "edital_alimentacao_hospitalar.pdf",
    "user_id": "",
    "process_pncp_id": "05149117000155-1-000014/2026",
    "save_artifacts": False,
  }


def _merge_form_state(overrides: dict[str, Any] | None = None) -> dict[str, Any]:
  state = _default_form_state()
  if overrides:
    state.update(overrides)
  return state


def _build_request_rows(request_payload: dict[str, Any]) -> list[dict[str, str]]:
  action = _display_action(request_payload)
  rows: list[dict[str, str]] = []
  if action == "list_documents":
    pncp_id = str(request_payload.get("pncp_id") or "").strip()
    if pncp_id:
      rows.append({"label": "Numero controle PNCP", "value": pncp_id})
  if action in {"process_url", "process_upload", "process_pncp_document"}:
    extra = request_payload.get("extra") or {}
    source_label = _source_kind_label(str(extra.get("source_kind") or ""))
    document_url = str(request_payload.get("document_url") or "").strip()
    document_name = str(request_payload.get("document_name") or "").strip()
    pncp_id = str(request_payload.get("pncp_id") or "").strip()
    user_id = str(request_payload.get("user_id") or "").strip()
    flow = "MarkItDown + Assistant"
    if source_label:
      rows.append({"label": "Origem escolhida", "value": source_label})
    rows.append({"label": "Fluxo usado", "value": flow})
    if document_name:
      rows.append({"label": "Nome do documento", "value": document_name})
    if pncp_id:
      rows.append({"label": "Numero controle PNCP", "value": pncp_id})
    if user_id:
      rows.append({"label": "User ID", "value": user_id})
    if document_url:
      url_label = "URL"
      if action == "process_upload":
        url_label = "Caminho salvo no laboratorio"
      elif action == "process_pncp_document":
        url_label = "URL do documento escolhido"
      rows.append({"label": url_label, "value": document_url})
    rows.append(
      {
        "label": "Persistencia em storage/BD",
        "value": "Sim" if bool(request_payload.get("save_artifacts", False)) else "Nao",
      }
    )
  return rows


def _build_health_rows(meta: dict[str, Any]) -> list[dict[str, Any]]:
  def _flag(label: str, ok: bool, detail: str) -> dict[str, Any]:
    return {
      "label": label,
      "ok": ok,
      "value": "OK" if ok else "FALHA",
      "detail": detail,
    }

  rows = []
  rows.append(
    _flag(
      "Core local carregado",
      bool(meta.get("module_file")),
      str(meta.get("module_file") or "Arquivo do core nao localizado."),
    )
  )
  rows.append(
    _flag(
      "Arquivo de banco carregado",
      bool(meta.get("database_file")),
      str(meta.get("database_file") or "Arquivo de banco nao localizado."),
    )
  )
  rows.append(
    _flag(
      "OpenAI key configurada",
      bool(meta.get("openai_key_configured")),
      "Necessaria para os fluxos com assistant.",
    )
  )
  rows.append(
    _flag(
      "Assistant configurado",
      bool(meta.get("assistant_configured")),
      "Necessario para resumo do documento.",
    )
  )
  rows.append(
    _flag(
      "Pipeline MarkItDown-only ativo",
      bool(meta.get("markdown_summary_enabled")),
      "No laboratorio v2 esse estado fica travado em ligado.",
    )
  )
  rows.append(
    _flag(
      "Persistencia em storage/BD ativa",
      bool(meta.get("save_documents_enabled")),
      "Mostra se o laboratorio esta configurado para gravar artefatos externos.",
    )
  )
  return rows


def _build_path_rows(meta: dict[str, Any]) -> list[dict[str, str]]:
  labels = {
    "documents_root": "Core local de Documentos",
    "BASE_PATH": "Base de artifacts",
    "FILES_PATH": "Arquivos gerados",
    "RESULTS_PATH": "Relatorios gerados",
    "TEMP_PATH": "Temporarios",
  }
  rows = []
  for key, label in labels.items():
    value = str(meta.get(key) or "").strip()
    if value:
      rows.append({"label": label, "value": value})
  return rows


def _describe_test(label: str, request_payload: dict[str, Any]) -> dict[str, Any]:
  action = _display_action(request_payload)
  fixture = _find_fixture(label) if label else None
  if fixture is not None:
    info = _action_info(fixture["action"])
    return {
      "step": info["step"],
      "category": info["category"],
      "display_title": fixture["title"],
      "description": fixture["description"],
      "validates": fixture["validates"],
      "expected": fixture["expected"],
      "target": fixture["target"],
      "tone": fixture["tone"],
      "trigger_source": "Fixture pronta",
    }

  info = _action_info(action)
  return {
    "step": info["step"],
    "category": info["category"],
    "display_title": info["title"],
    "description": info["description"],
    "validates": list(info["validates"]),
    "expected": info["expected"],
    "target": _build_target_summary(request_payload),
    "tone": info["tone"],
    "trigger_source": info.get("trigger_source", "Teste manual"),
  }


def _recent_runs() -> list[dict[str, Any]]:
  RUNS_DIR.mkdir(parents=True, exist_ok=True)
  items = []
  for path in sorted(RUNS_DIR.glob("*.json"), reverse=True)[:MAX_RECENT_RUNS]:
    try:
      data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
      continue
    request_payload = data.get("request") or {}
    response_payload = data.get("response") or {}
    context = _describe_test(str(data.get("label") or ""), request_payload)
    items.append(
      {
        "file_name": path.name,
        "label": data.get("label") or path.stem,
        "timestamp": _format_saved_timestamp(path.stem.split("__", 1)[0]),
        "display_title": context["display_title"],
        "target": context["target"],
        "category": context["category"],
        "status": response_payload.get("status") or "-",
        "elapsed_ms": response_payload.get("elapsed_ms") or 0,
        "tone": context["tone"],
      }
    )
  return items


def _latest_list_documents_run() -> dict[str, Any] | None:
  RUNS_DIR.mkdir(parents=True, exist_ok=True)
  for path in sorted(RUNS_DIR.glob("*.json"), reverse=True):
    try:
      data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
      continue
    request_payload = data.get("request") or {}
    response_payload = data.get("response") or {}
    action = _display_action(request_payload, str(response_payload.get("action") or "healthcheck"))
    documents = response_payload.get("documents") or []
    if action != "list_documents" or not documents:
      continue
    return {
      "pncp_id": str(request_payload.get("pncp_id") or "").strip(),
      "documents": documents,
      "file_name": path.name,
      "timestamp": _format_saved_timestamp(path.stem.split("__", 1)[0]),
    }
  return None


def _render_result(response_payload: dict[str, Any], saved_run_name: str, label: str) -> dict[str, Any]:
  request_payload = dict(response_payload.get("request") or {})
  context = _describe_test(label, request_payload)
  meta = dict(response_payload.get("meta") or {})
  display_action = _display_action(request_payload, str(response_payload.get("action") or "healthcheck"))
  return {
    **response_payload,
    **context,
    "action": display_action,
    "raw_action": str(response_payload.get("action") or ""),
    "saved_run_name": saved_run_name,
    "request_rows": _build_request_rows(request_payload),
    "health_rows": _build_health_rows(meta) if response_payload.get("action") == "healthcheck" else [],
    "path_rows": _build_path_rows(meta),
    "pretty_json": json.dumps(response_payload, ensure_ascii=False, indent=2),
  }


def _render_input_error(label: str, request_payload: dict[str, Any], error: str, form_state: dict[str, Any] | None = None) -> str:
  response_payload = {
    "request": request_payload,
    "source": "browser.app",
    "action": str(request_payload.get("action") or "healthcheck"),
    "status": "error",
    "elapsed_ms": 0,
    "result_count": 0,
    "extracted_text": "",
    "summary": "",
    "meta": {},
    "documents": [],
    "error": error,
  }
  return _render_page(_render_result(response_payload, "-", label), form_state=form_state)


def _render_page(result: dict[str, Any] | None = None, form_state: dict[str, Any] | None = None):
  fixtures = _load_fixtures()
  return render_template_string(
    HTML,
    design_css=get_browser_design_css(),
    upload_accept=UPLOAD_ACCEPT,
    active_root=str(ACTIVE_DOCUMENTS_ROOT),
    fixtures=fixtures,
    fixtures_count=len(fixtures),
    form_state=_merge_form_state(form_state),
    health_test=_action_info("healthcheck"),
    list_test=_action_info("list_documents"),
    process_test=_action_info("process_url"),
    upload_test=_action_info("process_upload"),
    pncp_process_test=_action_info("process_pncp_document"),
    pncp_picker=_latest_list_documents_run(),
    recent_runs=_recent_runs(),
    result=result,
  )


def _run_request(label: str, request_payload: dict[str, Any], form_state: dict[str, Any] | None = None):
  document_request = DocumentRequest.from_mapping(request_payload)
  response_payload = _build_adapter().run(document_request).to_dict()
  saved_run_name = _save_run(label, document_request.to_dict(), response_payload)
  return _render_page(_render_result(response_payload, saved_run_name, label), form_state=form_state)


@APP.get("/")
def index() -> str:
  return _render_page()


@APP.post("/healthcheck")
def run_healthcheck() -> str:
  return _run_request("healthcheck-documents-core", {"action": "healthcheck"})


@APP.post("/run-fixture")
def run_fixture() -> str:
  fixture_name = (request.form.get("fixture_name") or "").strip()
  fixture = _find_fixture(fixture_name)
  if fixture is None:
    abort(404, description="Fixture nao encontrada")
  fixture_payload = dict(fixture["payload"])
  form_state = {
    "pncp_id": fixture_payload.get("pncp_id", ""),
    "document_url": fixture_payload.get("document_url", ""),
    "document_name": fixture_payload.get("document_name", ""),
    "user_id": fixture_payload.get("user_id", ""),
    "process_pncp_id": fixture_payload.get("pncp_id", ""),
    "save_artifacts": bool(fixture_payload.get("save_artifacts", False)),
  }
  return _run_request(fixture_name, fixture_payload, form_state=form_state)


@APP.post("/list-documents")
def list_documents() -> str:
  pncp_id = (request.form.get("pncp_id") or "").strip()
  form_state = {
    "pncp_id": pncp_id,
    "process_pncp_id": pncp_id,
  }
  return _run_request(
    f"list-documents-{pncp_id or 'manual'}",
    {
      "action": "list_documents",
      "pncp_id": pncp_id,
    },
    form_state=form_state,
  )


@APP.post("/process-url")
def process_url() -> str:
  document_url = (request.form.get("document_url") or "").strip()
  document_name = (request.form.get("document_name") or "").strip()
  pncp_id = (request.form.get("pncp_id") or "").strip()
  user_id = (request.form.get("user_id") or "").strip()
  save_artifacts = request.form.get("save_artifacts") == "on"
  form_state = {
    "document_url": document_url,
    "document_name": document_name,
    "user_id": user_id,
    "process_pncp_id": pncp_id,
    "save_artifacts": save_artifacts,
  }
  return _run_request(
    f"process-url-{document_name or 'manual'}",
    {
      "action": "process_url",
      "document_url": document_url,
      "document_name": document_name,
      "pncp_id": pncp_id,
      "user_id": user_id,
      "save_artifacts": save_artifacts,
      "browser_action": "process_url",
    },
    form_state=form_state,
  )


@APP.post("/process-upload")
def process_upload() -> str:
  uploaded_files = [item for item in request.files.getlist("local_files") if Path(str(getattr(item, "filename", "") or "")).name.strip()]
  if not uploaded_files:
    single_file = request.files.get("local_file")
    if single_file is not None:
      uploaded_files = [single_file]
  pncp_id = (request.form.get("pncp_id") or "").strip()
  user_id = (request.form.get("user_id") or "").strip()
  save_artifacts = request.form.get("save_artifacts") == "on"
  form_state = {
    "user_id": user_id,
    "process_pncp_id": pncp_id,
    "save_artifacts": save_artifacts,
  }

  saved_path, original_name, error, source_kind = _save_browser_uploads(uploaded_files)
  if error:
    return _render_input_error(
      "process-upload-manual",
      {
        "action": "process_url",
        "pncp_id": pncp_id,
        "user_id": user_id,
        "save_artifacts": save_artifacts,
        "browser_action": "process_upload",
        "source_kind": source_kind,
      },
      error,
      form_state=form_state,
    )

  form_state.update({"document_url": saved_path, "document_name": original_name})
  return _run_request(
    f"process-upload-{original_name or 'manual'}",
    {
      "action": "process_url",
      "document_url": saved_path,
      "document_name": original_name,
      "pncp_id": pncp_id,
      "user_id": user_id,
      "save_artifacts": save_artifacts,
      "browser_action": "process_upload",
      "source_kind": source_kind,
    },
    form_state=form_state,
  )


@APP.post("/process-pncp-document")
def process_pncp_document() -> str:
  document_url = (request.form.get("document_url") or "").strip()
  document_name = (request.form.get("document_name") or "").strip()
  pncp_id = (request.form.get("pncp_id") or "").strip()
  user_id = (request.form.get("user_id") or "").strip()
  save_artifacts = request.form.get("save_artifacts") == "on"
  form_state = {
    "document_url": document_url,
    "document_name": document_name,
    "user_id": user_id,
    "process_pncp_id": pncp_id,
    "save_artifacts": save_artifacts,
  }

  if not document_url:
    return _render_input_error(
      "process-pncp-document-manual",
      {
        "action": "process_url",
        "pncp_id": pncp_id,
        "document_name": document_name,
        "browser_action": "process_pncp_document",
        "source_kind": "pncp-selected",
      },
      "Nenhum documento do PNCP foi informado para processamento.",
      form_state=form_state,
    )

  return _run_request(
    f"process-pncp-document-{document_name or 'manual'}",
    {
      "action": "process_url",
      "document_url": document_url,
      "document_name": document_name,
      "pncp_id": pncp_id,
      "user_id": user_id,
      "save_artifacts": save_artifacts,
      "browser_action": "process_pncp_document",
      "source_kind": "pncp-selected",
    },
    form_state=form_state,
  )


@APP.get("/runs/<file_name>")
def get_run(file_name: str) -> Response:
  if not re.fullmatch(r"[a-zA-Z0-9_.-]+", file_name):
    abort(404)
  run_path = RUNS_DIR / file_name
  if not run_path.exists():
    abort(404)
  return Response(run_path.read_text(encoding="utf-8"), mimetype="application/json; charset=utf-8")


def create_app() -> Flask:
  return APP


if __name__ == "__main__":
  APP.run(host="127.0.0.1", port=5062, debug=False)