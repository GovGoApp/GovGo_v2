from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any
###
try:
    from flask import Flask, Response, abort, render_template_string, request
except Exception as exc:  # pragma: no cover
    raise SystemExit(
        "Flask nao esta disponivel no ambiente atual. "
        "Instale as dependencias Python antes de rodar o browser tester."
    ) from exc


PROJECT_ROOT = Path(__file__).resolve().parents[3]
HOMOLOGATION_ROOT = PROJECT_ROOT / "homologation" / "documents"
FIXTURES_PATH = HOMOLOGATION_ROOT / "fixtures" / "document_cases.json"
RUNS_DIR = HOMOLOGATION_ROOT / "tests" / "runs"
ACTIVE_DOCUMENTS_ROOT = HOMOLOGATION_ROOT / "v1_copy" / "core"
UPLOADS_DIR = HOMOLOGATION_ROOT / "artifacts" / "uploads"
MAX_RECENT_RUNS = 8

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from homologation.documents.core.adapter import DocumentsAdapter
from homologation.documents.core.contracts import DocumentRequest


APP = Flask(__name__)


def _build_adapter() -> DocumentsAdapter:
  return DocumentsAdapter()


ACTION_INFO = {
    "healthcheck": {
        "step": "Teste 1",
        "category": "Infraestrutura",
        "title": "Healthcheck do laboratorio",
        "action_title": "Healthcheck",
        "description": "Confirma se o bootstrap local carrega o core de Documentos dentro do v2 e se a configuracao minima do laboratorio esta visivel.",
        "validates": [
            "import do core local em homologation/documents/v1_copy/core",
            "paths de artifacts locais para files, reports e temp",
            "visibilidade de OpenAI key e assistant de resumo",
        ],
        "expected": "Status ok com checklist do ambiente e caminhos ativos do laboratorio.",
        "button_label": "Rodar healthcheck",
        "tone": "tone-health",
        "trigger_source": "Teste manual",
    },
    "list_documents": {
        "step": "Teste 3",
        "category": "Consulta de arquivos",
        "title": "Listagem de documentos por PNCP",
        "action_title": "Listagem PNCP",
        "description": "Consulta os arquivos de um processo PNCP, valida a listagem normalizada e prepara a escolha de um documento real para o Teste 6.",
        "validates": [
            "funcao fetch_documentos no core legado copiado",
            "fallback para API PNCP quando o banco nao responde",
            "normalizacao de url, nome, tipo, origem e sequencial",
          "encaminhamento de um documento listado para o fluxo de processamento",
        ],
        "expected": "Tabela de documentos do PNCP, com pelo menos um item quando o processo possui arquivos publicados, e botoes para acionar o Teste 6 com um item escolhido.",
        "button_label": "Listar documentos deste PNCP",
        "tone": "tone-list",
        "trigger_source": "Teste manual",
    },
    "process_url": {
        "step": "Teste 4",
        "category": "Processamento manual",
        "title": "Processamento por URL ou caminho",
        "action_title": "Processar URL/caminho",
        "description": "Executa o fluxo oficial de Documentos com MarkItDown a partir de uma URL, de um file:// ou de um caminho local digitado manualmente.",
        "validates": [
          "download ou copia do documento a partir de URL, file:// ou caminho local existente",
            "roteamento do core legado no v2",
          "conversao obrigatoria com MarkItDown antes da geracao de resumo",
        ],
        "expected": "Resumo textual do documento gerado a partir do Markdown do MarkItDown, ou erro explicito se a conversao falhar.",
        "button_label": "Rodar este teste manual",
        "tone": "tone-process",
        "trigger_source": "Teste manual",
      },
      "process_upload": {
        "step": "Teste 5",
        "category": "Arquivo local real",
        "title": "Processamento de arquivo local real",
        "action_title": "Upload local",
        "description": "Recebe um arquivo real enviado pelo browser tester, grava uma copia local em artifacts/uploads e processa esse arquivo no mesmo pipeline MarkItDown-only.",
        "validates": [
          "upload do arquivo real pelo browser tester",
          "gravacao local temporaria do arquivo enviado",
          "encaminhamento do arquivo escolhido para o core de Documentos no v2",
        ],
        "expected": "Resumo textual do documento gerado a partir do Markdown do MarkItDown, ou erro explicito se a conversao falhar, agora a partir do arquivo local escolhido.",
        "button_label": "Rodar este teste com arquivo local",
        "tone": "tone-process",
        "trigger_source": "Arquivo local escolhido",
      },
      "process_pncp_document": {
        "step": "Teste 6",
        "category": "Documento real do PNCP",
        "title": "Processamento de documento escolhido do PNCP",
        "action_title": "Escolha do PNCP",
        "description": "Usa a listagem real de documentos do Teste 3 e deixa voce escolher um arquivo publicado no PNCP para processa-lo sem colar a URL manualmente.",
        "validates": [
          "reaproveitamento da listagem real do Teste 3",
          "escolha explicita de um documento publicado no PNCP",
          "envio do documento escolhido para o pipeline MarkItDown-only",
        ],
        "expected": "Resumo textual do documento gerado a partir do Markdown do MarkItDown, ou erro explicito se a conversao falhar, agora a partir do documento escolhido da listagem do PNCP.",
        "button_label": "Rodar Teste 6 com este documento",
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
  <title>GovGo v2 :: Laboratorio de Documentos</title>
  <style>
    :root {
      --bg: #eff3f6;
      --bg-strong: #dfe8ef;
      --ink: #142033;
      --muted: #5d6b80;
      --card: #ffffff;
      --panel: #f7fafc;
      --line: #d6dee7;
      --accent: #155eef;
      --accent-2: #157347;
      --accent-3: #cf5a2b;
      --ink-soft: #21314a;
      --ok-bg: #ebf8ef;
      --ok-ink: #13653f;
      --fail-bg: #fdeced;
      --fail-ink: #b42318;
      --tone-health: #eaf1ff;
      --tone-list: #eaf8ef;
      --tone-upload: #fff2ea;
      --tone-manual: #eef2f8;
      --shadow: 0 16px 32px rgba(16, 24, 40, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background:
        radial-gradient(circle at top right, rgba(21, 94, 239, 0.08), transparent 26%),
        radial-gradient(circle at top left, rgba(207, 90, 43, 0.08), transparent 24%),
        linear-gradient(180deg, #f8fafc 0%, var(--bg) 100%);
      color: var(--ink);
      font-family: Bahnschrift, "Segoe UI", sans-serif;
    }
    .page {
      width: min(1600px, 100%);
      margin: 0 auto;
      padding: 16px;
    }
    .topbar {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: end;
      padding: 18px 20px;
      background: rgba(255, 255, 255, 0.88);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(214, 222, 231, 0.9);
      border-radius: 18px;
      box-shadow: var(--shadow);
      margin-bottom: 16px;
    }
    .eyebrow {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }
    .topbar h1,
    .pane-head h2,
    .panel-title,
    .result-title,
    .test-title,
    .collapsible summary {
      margin: 0;
    }
    .topbar h1 {
      font-size: 34px;
      line-height: 1.02;
    }
    .result-pane h3 {
      margin: 0;
    }
    .topbar p {
      margin: 8px 0 0;
      color: var(--muted);
      max-width: 760px;
    }
    .top-meta {
      display: flex;
      flex-wrap: wrap;
      justify-content: end;
      gap: 8px;
      font-size: 13px;
      color: var(--muted);
    }
    .meta-chip,
    .status-pill,
    .tag,
    .chip,
    .pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 30px;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      border: 1px solid var(--line);
      background: #fff;
      color: var(--ink-soft);
    }
    .meta-chip {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .status-pill.ok {
      background: var(--ok-bg);
      border-color: rgba(19, 101, 63, 0.15);
      color: var(--ok-ink);
    }
    .status-pill.error {
      background: var(--fail-bg);
      border-color: rgba(180, 35, 24, 0.18);
      color: var(--fail-ink);
    }
    .workspace {
      display: grid;
      grid-template-columns: minmax(340px, 430px) minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }
    .sidebar,
    .result-pane {
      background: rgba(255, 255, 255, 0.84);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(214, 222, 231, 0.9);
      border-radius: 20px;
      box-shadow: var(--shadow);
    }
    .sidebar {
      position: sticky;
      top: 16px;
      display: grid;
      gap: 14px;
      padding: 18px;
    }
    .result-pane {
      display: grid;
      gap: 14px;
      padding: 20px;
      min-height: calc(100vh - 64px);
    }
    .pane-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: start;
    }
    .pane-head p {
      margin: 6px 0 0;
      color: var(--muted);
    }
    .panel-title,
    .result-title {
      font-size: 28px;
      line-height: 1.05;
    }
    .test-box,
    .result-block,
    .empty-state,
    .stat-box,
    .fixture-item,
    .run-item,
    .health-item,
    .path-item,
    .doc-row {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 16px;
    }
    .test-box {
      display: grid;
      gap: 12px;
      padding: 14px;
    }
    .test-box.tone-health {
      background: linear-gradient(180deg, var(--tone-health) 0%, #fff 100%);
    }
    .test-box.tone-list {
      background: linear-gradient(180deg, var(--tone-list) 0%, #fff 100%);
    }
    .test-box.tone-upload,
    .test-box.tone-process {
      background: linear-gradient(180deg, var(--tone-upload) 0%, #fff 100%);
    }
    .test-box.tone-fixture {
      background: linear-gradient(180deg, var(--tone-manual) 0%, #fff 100%);
    }
    .box-head,
    .fixture-head,
    .run-head,
    .block-head {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: start;
    }
    .test-title {
      font-size: 20px;
      line-height: 1.1;
    }
    .box-copy {
      display: grid;
      gap: 4px;
    }
    .muted,
    .small,
    .empty-state p,
    .placeholder {
      color: var(--muted);
    }
    .small {
      font-size: 12px;
    }
    .tag {
      background: #0f1728;
      border-color: transparent;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .stack,
    .doc-picker,
    .fixture-stack,
    .run-stack,
    .health-list,
    .path-list,
    .chip-row,
    .artifact-list,
    .meta-list,
    .check-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .chip-row {
      flex-wrap: wrap;
      flex-direction: row;
    }
    .doc-picker {
      max-height: 320px;
      overflow: auto;
      padding-right: 2px;
    }
    .doc-row {
      display: grid;
      gap: 10px;
      padding: 12px;
    }
    .doc-row strong {
      display: block;
      margin-bottom: 4px;
    }
    .doc-row a {
      color: var(--accent);
      text-decoration: none;
    }
    .inline-grid,
    .status-grid,
    .dual-grid {
      display: grid;
      gap: 12px;
    }
    .inline-grid {
      grid-template-columns: 1fr 1fr;
    }
    .status-grid,
    .dual-grid {
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
      color: var(--ink);
      background: rgba(255, 255, 255, 0.94);
    }
    textarea {
      min-height: 92px;
      resize: vertical;
    }
    .check {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--line);
      background: var(--panel);
      padding: 10px 12px;
      border-radius: 12px;
      font-size: 13px;
      width: fit-content;
    }
    .check input {
      width: auto;
      margin: 0;
    }
    button {
      border: none;
      border-radius: 12px;
      padding: 11px 14px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      color: #fff;
      background: linear-gradient(135deg, var(--accent) 0%, #11356b 100%);
    }
    button.secondary {
      background: linear-gradient(135deg, var(--accent-2) 0%, #115c39 100%);
    }
    button.accent-2 {
      background: linear-gradient(135deg, var(--accent-3) 0%, #9a3d19 100%);
    }
    button[disabled] {
      cursor: wait;
      opacity: 0.78;
    }
    .busy-overlay {
      position: fixed;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 20px;
      background: rgba(15, 23, 40, 0.34);
      backdrop-filter: blur(4px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 160ms ease;
      z-index: 999;
    }
    body.is-submitting .busy-overlay {
      opacity: 1;
      pointer-events: all;
    }
    .busy-card {
      width: min(420px, 100%);
      display: grid;
      gap: 14px;
      padding: 22px;
      border-radius: 20px;
      border: 1px solid rgba(214, 222, 231, 0.95);
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 18px 42px rgba(16, 24, 40, 0.16);
    }
    .busy-head {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .busy-spinner {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: 4px solid rgba(21, 94, 239, 0.16);
      border-top-color: var(--accent);
      animation: busy-spin 0.9s linear infinite;
      flex: none;
    }
    .busy-copy {
      display: grid;
      gap: 4px;
    }
    .busy-copy strong {
      font-size: 16px;
      line-height: 1.15;
    }
    .busy-copy span {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }
    .busy-bar {
      position: relative;
      height: 10px;
      overflow: hidden;
      border-radius: 999px;
      background: #d8e3f0;
    }
    .busy-bar::after {
      content: "";
      position: absolute;
      inset: 0 auto 0 -35%;
      width: 35%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--accent) 0%, var(--accent-3) 100%);
      animation: busy-slide 1.15s ease-in-out infinite;
    }
    @keyframes busy-spin {
      to {
        transform: rotate(360deg);
      }
    }
    @keyframes busy-slide {
      0% {
        left: -35%;
      }
      50% {
        left: 38%;
      }
      100% {
        left: 100%;
      }
    }
    .result-block,
    .empty-state {
      display: grid;
      gap: 12px;
      padding: 16px;
    }
    .empty-state {
      min-height: 320px;
      place-content: center;
      text-align: center;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, var(--panel) 100%);
    }
    .stat-box {
      padding: 14px;
      background: var(--panel);
    }
    .stat-box strong {
      display: block;
      font-size: 24px;
      margin-top: 6px;
    }
    .extract-view,
    .summary-view,
    .json-view {
      margin: 0;
      padding: 16px;
      border-radius: 14px;
      border: 1px solid var(--line);
      white-space: pre-wrap;
      word-break: break-word;
      overflow: auto;
    }
    .extract-view {
      background: #0f1728;
      color: #eef2ff;
      font-family: Consolas, "Courier New", monospace;
      font-size: 13px;
      line-height: 1.55;
      max-height: min(64vh, 920px);
    }
    .summary-view {
      background: var(--panel);
      color: var(--ink);
      font-size: 14px;
      line-height: 1.6;
      max-height: 320px;
    }
    .json-view {
      background: #111827;
      color: #e5eefc;
      font-family: Consolas, "Courier New", monospace;
      font-size: 12px;
      max-height: 420px;
    }
    .health-list,
    .path-list {
      display: grid;
      gap: 12px;
    }
    input[type="file"] {
      padding: 10px;
      background: var(--panel);
    }
    .health-item,
    .path-item,
    .fixture-item,
    .run-item {
      padding: 12px;
    }
    .health-item,
    .path-item {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: start;
    }
    .meta-list {
      margin: 0;
      display: grid;
      gap: 10px;
    }
    .meta-list div {
      border-top: 1px dashed var(--line);
      padding-top: 10px;
    }
    .meta-list div:first-child {
      border-top: none;
      padding-top: 0;
    }
    .meta-list dt {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 4px;
    }
    .meta-list dd {
      margin: 0;
      line-height: 1.45;
    }
    .mono {
      font-family: Consolas, "Courier New", monospace;
      font-size: 12px;
      word-break: break-word;
    }
    .collapsible {
      border: 1px solid var(--line);
      border-radius: 16px;
      background: var(--card);
      overflow: hidden;
    }
    .collapsible summary {
      cursor: pointer;
      padding: 14px;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--muted);
      list-style: none;
    }
    .collapsible summary::-webkit-details-marker {
      display: none;
    }
    .collapsible[open] summary {
      border-bottom: 1px solid var(--line);
    }
    .collapsible-body {
      padding: 14px;
      display: grid;
      gap: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      background: #fff;
      border-radius: 14px;
      overflow: hidden;
    }
    th,
    td {
      padding: 10px 8px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    th {
      font-size: 12px;
      text-transform: uppercase;
      color: var(--muted);
      letter-spacing: 0.04em;
      background: var(--panel);
    }
    tr:last-child td {
      border-bottom: none;
    }
    .table-action form {
      margin: 0;
    }
    .table-action button {
      padding: 8px 10px;
      font-size: 12px;
    }
    a {
      color: var(--accent);
      text-decoration: none;
    }
    .error-box {
      border: 1px solid #f4c5c7;
      border-radius: 14px;
      padding: 14px;
      background: var(--fail-bg);
      color: var(--fail-ink);
      font-size: 14px;
      line-height: 1.5;
    }
    .placeholder {
      border: 1px dashed var(--line);
      border-radius: 14px;
      padding: 16px;
      background: var(--panel);
    }
    @media (max-width: 1080px) {
      .workspace {
        grid-template-columns: 1fr;
      }
      .sidebar {
        position: static;
      }
      .result-pane {
        min-height: 0;
      }
    }
    @media (max-width: 720px) {
      .inline-grid {
        grid-template-columns: 1fr;
      }
      .topbar,
      .pane-head {
        flex-direction: column;
        align-items: start;
      }
      .page {
        padding: 10px;
      }
      .topbar,
      .sidebar,
      .result-pane {
        border-radius: 14px;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <section class="topbar">
      <div>
        <div class="eyebrow">GovGo v2</div>
        <h1>Laboratorio de Documentos</h1>
        <p>Area de teste na esquerda. Area de resultado na direita. O texto extraido aparece primeiro.</p>
      </div>
      <div class="top-meta">
        <span class="meta-chip">Core: {{ active_root }}</span>
        <span class="meta-chip">Fixtures: {{ fixtures_count }}</span>
        <span class="meta-chip">Runs: {{ recent_runs|length }}</span>
      </div>
    </section>

    <section class="workspace">
      <aside class="sidebar">
        <div class="pane-head">
          <div>
            <div class="eyebrow">Area de teste</div>
            <h2 class="panel-title">Escolha a fonte</h2>
            <p>Local, PNCP ou modo manual. Sem texto sobrando.</p>
          </div>
        </div>

        <article class="test-box {{ health_test.tone }}">
          <div class="box-head">
            <div class="box-copy">
              <span class="tag">{{ health_test.step }}</span>
              <h3 class="test-title">{{ health_test.title }}</h3>
            </div>
            <span class="pill">{{ health_test.category }}</span>
          </div>
          <div class="small">Verifica se o core local de Documentos sobe e se o ambiente esta visivel.</div>
          <form method="post" action="/healthcheck">
            <button type="submit">{{ health_test.button_label }}</button>
          </form>
        </article>

        <article class="test-box {{ upload_test.tone }}">
          <div class="box-head">
            <div class="box-copy">
              <span class="tag">{{ upload_test.step }}</span>
              <h3 class="test-title">Arquivo local</h3>
            </div>
            <span class="pill">{{ upload_test.category }}</span>
          </div>
          <div class="small">Escolha um arquivo real desta maquina e rode o pipeline oficial. Pode ser arquivo unico ou pacote compactado com varios itens.</div>
          <form method="post" action="/process-upload" class="stack" enctype="multipart/form-data">
            <div>
              <label for="local_file">Arquivo local</label>
              <input id="local_file" type="file" name="local_file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.xls,.csv,.tsv,.txt,.md,.markdown,.html,.htm,.xml,.json,.yaml,.yml,.rtf,.zip,.rar,.7z,.tar,.gz,.gzip,.bz2">
            </div>
            <div class="inline-grid">
              <div>
                <label for="upload_user_id">User ID</label>
                <input id="upload_user_id" name="user_id" value="{{ form_state.user_id }}" placeholder="opcional">
              </div>
              <div>
                <label for="upload_pncp_id">Numero Controle PNCP</label>
                <input id="upload_pncp_id" name="pncp_id" value="{{ form_state.process_pncp_id }}" placeholder="opcional">
              </div>
            </div>
            <div class="check-grid">
              <label class="check"><input type="checkbox" name="save_artifacts" {% if form_state.save_artifacts %}checked{% endif %}> Persistir artifacts</label>
            </div>
            <button type="submit" class="accent-2">{{ upload_test.button_label }}</button>
          </form>
        </article>

        <article class="test-box {{ list_test.tone }}">
          <div class="box-head">
            <div class="box-copy">
              <span class="tag">{{ list_test.step }}</span>
              <h3 class="test-title">Arquivos do PNCP</h3>
            </div>
            <span class="pill">{{ list_test.category }}</span>
          </div>
          <div class="small">Digite o numero controle PNCP para listar os arquivos publicados.</div>
          <form method="post" action="/list-documents" class="stack">
            <div>
              <label for="pncp_id">Numero Controle PNCP</label>
              <input id="pncp_id" name="pncp_id" value="{{ form_state.pncp_id }}" placeholder="05149117000155-1-000014/2026">
            </div>
            <button type="submit">{{ list_test.button_label }}</button>
          </form>
        </article>

        <article class="test-box {{ pncp_process_test.tone }}">
          <div class="box-head">
            <div class="box-copy">
              <span class="tag">{{ pncp_process_test.step }}</span>
              <h3 class="test-title">Processar arquivo do PNCP</h3>
            </div>
            <span class="pill">{{ pncp_process_test.category }}</span>
          </div>
          <div class="small">Use um arquivo real retornado pela ultima listagem do Teste 3.</div>
          {% if pncp_picker %}
            <div class="chip-row">
              <span class="chip">PNCP {{ pncp_picker.pncp_id }}</span>
              <span class="chip">{{ pncp_picker.timestamp }}</span>
            </div>
            <div class="doc-picker">
              {% for item in pncp_picker.documents %}
                <form class="doc-row" method="post" action="/process-pncp-document">
                  <div class="block-head">
                    <div>
                      <strong>{{ item.nome or 'Documento sem nome' }}</strong>
                      <div class="small">tipo={{ item.tipo or '-' }} | seq={{ item.sequencial or '-' }} | origem={{ item.origem or '-' }}</div>
                    </div>
                    <a href="{{ item.url }}" target="_blank" rel="noreferrer">abrir</a>
                  </div>
                  <input type="hidden" name="document_url" value="{{ item.url }}">
                  <input type="hidden" name="document_name" value="{{ item.nome }}">
                  <input type="hidden" name="pncp_id" value="{{ pncp_picker.pncp_id }}">
                  <button type="submit" class="secondary">{{ pncp_process_test.button_label }}</button>
                </form>
              {% endfor %}
            </div>
          {% else %}
            <div class="placeholder">Rode o Teste 3 para carregar aqui os arquivos do PNCP.</div>
          {% endif %}
        </article>

        <details class="collapsible">
          <summary>Modo manual por URL ou caminho</summary>
          <div class="collapsible-body">
            <form method="post" action="/process-url" class="stack">
              <div>
                <label for="document_url">URL ou caminho</label>
                <textarea id="document_url" name="document_url" placeholder="https://pncp.gov.br/... ou C:/caminho/documento.pdf">{{ form_state.document_url }}</textarea>
              </div>
              <div class="inline-grid">
                <div>
                  <label for="document_name">Nome do documento</label>
                  <input id="document_name" name="document_name" value="{{ form_state.document_name }}" placeholder="edital.pdf">
                </div>
                <div>
                  <label for="user_id">User ID</label>
                  <input id="user_id" name="user_id" value="{{ form_state.user_id }}" placeholder="opcional">
                </div>
              </div>
              <div>
                <label for="process_pncp_id">Numero Controle PNCP</label>
                <input id="process_pncp_id" name="pncp_id" value="{{ form_state.process_pncp_id }}" placeholder="opcional">
              </div>
              <div class="check-grid">
                <label class="check"><input type="checkbox" name="save_artifacts" {% if form_state.save_artifacts %}checked{% endif %}> Persistir artifacts</label>
              </div>
              <button type="submit" class="accent-2">{{ process_test.button_label }}</button>
            </form>
          </div>
        </details>

        <details class="collapsible">
          <summary>Fixtures prontas ({{ fixtures_count }})</summary>
          <div class="collapsible-body fixture-stack">
            {% for fixture in fixtures %}
              <div class="fixture-item">
                <div class="fixture-head">
                  <div>
                    <strong>{{ fixture.title }}</strong>
                    <div class="small">{{ fixture.target }}</div>
                  </div>
                  <span class="pill">{{ fixture.action_title }}</span>
                </div>
                <form method="post" action="/run-fixture">
                  <input type="hidden" name="fixture_name" value="{{ fixture.name }}">
                  <button type="submit">Executar</button>
                </form>
              </div>
            {% else %}
              <div class="placeholder">Nenhuma fixture cadastrada.</div>
            {% endfor %}
          </div>
        </details>

        <details class="collapsible">
          <summary>Historico recente ({{ recent_runs|length }})</summary>
          <div class="collapsible-body run-stack">
            {% for run in recent_runs %}
              <div class="run-item">
                <div class="run-head">
                  <div>
                    <strong>{{ run.display_title }}</strong>
                    <div class="small">{{ run.target }}</div>
                  </div>
                  <span class="status-pill {{ 'ok' if run.status == 'ok' else 'error' }}">{{ run.status }}</span>
                </div>
                <div class="small">{{ run.timestamp }} | {{ run.category }} | {{ run.elapsed_ms }} ms</div>
                <a href="/runs/{{ run.file_name }}" target="_blank" rel="noreferrer">Abrir JSON desta execucao</a>
              </div>
            {% else %}
              <div class="placeholder">Ainda nao ha execucoes salvas.</div>
            {% endfor %}
          </div>
        </details>
      </aside>

      <main class="result-pane">
        <div class="pane-head">
          <div>
            <div class="eyebrow">Area de resultado</div>
            <h2 class="result-title">{% if result %}{{ result.display_title }}{% else %}Nenhum teste executado{% endif %}</h2>
            <p>{% if result %}{{ result.target }}{% else %}Quando um teste rodar, o texto extraido aparece aqui primeiro.{% endif %}</p>
          </div>
          {% if result %}
            <span class="status-pill {{ 'ok' if result.status == 'ok' else 'error' }}">{{ result.status }}</span>
          {% endif %}
        </div>

        {% if result %}
          <div class="status-grid">
            <div class="stat-box">
              <label>Status</label>
              <strong>{{ result.status }}</strong>
            </div>
            <div class="stat-box">
              <label>Acao</label>
              <strong>{{ result.action }}</strong>
            </div>
            <div class="stat-box">
              <label>Tempo</label>
              <strong>{{ result.elapsed_ms }} ms</strong>
            </div>
            <div class="stat-box">
              <label>Run</label>
              <strong>{{ result.saved_run_name or '-' }}</strong>
            </div>
          </div>

          {% if result.request_rows %}
            <div class="chip-row">
              {% for row in result.request_rows %}
                <span class="chip">{{ row.label }}: {{ row.value }}</span>
              {% endfor %}
            </div>
          {% endif %}

          {% if result.error %}
            <div class="error-box">{{ result.error }}</div>
          {% endif %}

          {% if result.action == 'healthcheck' %}
            <section class="result-block">
              <div class="block-head">
                <h3>Checklist do ambiente</h3>
                <span class="pill">{{ result.category }}</span>
              </div>
              <div class="health-list">
                {% for row in result.health_rows %}
                  <div class="health-item">
                    <div>
                      <strong>{{ row.label }}</strong>
                      <div class="small">{{ row.detail }}</div>
                    </div>
                    <span class="status-pill {{ 'ok' if row.ok else 'error' }}">{{ row.value }}</span>
                  </div>
                {% endfor %}
              </div>
            </section>

            {% if result.path_rows %}
              <section class="result-block">
                <h3>Caminhos ativos</h3>
                <div class="path-list">
                  {% for row in result.path_rows %}
                    <div class="path-item">
                      <div>
                        <strong>{{ row.label }}</strong>
                        <div class="mono">{{ row.value }}</div>
                      </div>
                    </div>
                  {% endfor %}
                </div>
              </section>
            {% endif %}
          {% elif result.action == 'list_documents' %}
            <section class="result-block">
              <div class="block-head">
                <h3>Arquivos encontrados no PNCP</h3>
                <span class="pill">{{ result.result_count }} item(ns)</span>
              </div>
              {% if result.documents %}
                <table>
                  <thead>
                    <tr>
                      <th>Seq</th>
                      <th>Tipo</th>
                      <th>Nome</th>
                      <th>Origem</th>
                      <th>URL</th>
                      <th>Teste 6</th>
                    </tr>
                  </thead>
                  <tbody>
                    {% for item in result.documents %}
                      <tr>
                        <td>{{ item.sequencial or '-' }}</td>
                        <td>{{ item.tipo or '-' }}</td>
                        <td>{{ item.nome or '-' }}</td>
                        <td>{{ item.origem or '-' }}</td>
                        <td><a href="{{ item.url }}" target="_blank" rel="noreferrer">abrir</a></td>
                        <td class="table-action">
                          <form method="post" action="/process-pncp-document">
                            <input type="hidden" name="document_url" value="{{ item.url }}">
                            <input type="hidden" name="document_name" value="{{ item.nome }}">
                            <input type="hidden" name="pncp_id" value="{{ result.request.pncp_id }}">
                            <button type="submit" class="secondary">Rodar Teste 6 com este documento</button>
                          </form>
                        </td>
                      </tr>
                    {% endfor %}
                  </tbody>
                </table>
              {% else %}
                <div class="placeholder">Nenhum arquivo foi retornado para esse PNCP.</div>
              {% endif %}
            </section>
          {% else %}
            <section class="result-block">
              <div class="block-head">
                <h3>Texto extraido</h3>
                <span class="pill">{{ result.meta.conversion_engine or 'markitdown' }}</span>
              </div>
              {% if result.extracted_text %}
                <pre class="extract-view">{{ result.extracted_text }}</pre>
              {% else %}
                <div class="placeholder">Nenhum texto extraido foi retornado.</div>
              {% endif %}
            </section>

            <div class="dual-grid">
              <section class="result-block">
                <h3>Resumo do assistant</h3>
                {% if result.summary %}
                  <pre class="summary-view">{{ result.summary }}</pre>
                {% else %}
                  <div class="placeholder">Sem resumo retornado.</div>
                {% endif %}
              </section>

              <section class="result-block">
                <h3>Arquivos gerados</h3>
                <dl class="meta-list">
                  {% if result.meta.markdown_path %}
                    <div>
                      <dt>Markdown salvo</dt>
                      <dd class="mono">{{ result.meta.markdown_path }}</dd>
                    </div>
                  {% endif %}
                  {% if result.meta.summary_path %}
                    <div>
                      <dt>Resumo salvo</dt>
                      <dd class="mono">{{ result.meta.summary_path }}</dd>
                    </div>
                  {% endif %}
                  {% if not result.meta.markdown_path and not result.meta.summary_path %}
                    <div>
                      <dt>Artifacts</dt>
                      <dd>Nenhum caminho retornado.</dd>
                    </div>
                  {% endif %}
                </dl>
              </section>
            </div>
          {% endif %}

          <details class="collapsible">
            <summary>JSON bruto</summary>
            <div class="collapsible-body">
              <pre class="json-view">{{ result.pretty_json }}</pre>
            </div>
          </details>
        {% else %}
          <section class="empty-state">
            <div>
              <h3>Rode um teste na esquerda</h3>
              <p>Os testes de arquivo local e de arquivo do PNCP ficam fixos na area de teste. Quando o processamento terminar, o texto extraido aparece aqui.</p>
            </div>
          </section>
        {% endif %}
      </main>
    </section>
  </div>
  <div class="busy-overlay" aria-live="polite" aria-hidden="true">
    <div class="busy-card" role="status">
      <div class="busy-head">
        <div class="busy-spinner" aria-hidden="true"></div>
        <div class="busy-copy">
          <strong data-busy-title>Executando teste...</strong>
          <span data-busy-detail>Aguarde. O laboratorio esta processando o documento e montando a resposta.</span>
        </div>
      </div>
      <div class="busy-bar" aria-hidden="true"></div>
    </div>
  </div>
  <script>
    (() => {
      const overlay = document.querySelector('.busy-overlay');
      const title = document.querySelector('[data-busy-title]');
      const detail = document.querySelector('[data-busy-detail]');
      const forms = Array.from(document.querySelectorAll('form[method="post"]'));
      if (!overlay || !title || !detail || !forms.length) {
        return;
      }

      let isSubmitting = false;

      const activateBusyState = (form) => {
        const button = form.querySelector('button[type="submit"]');
        const label = (button && button.textContent ? button.textContent : '').trim() || 'Executando teste';
        const action = form.getAttribute('action') || '';
        title.textContent = label + '...';
        detail.textContent = action === '/list-documents'
          ? 'Consultando o PNCP e preparando a lista de arquivos publicados.'
          : 'Aguarde. O laboratorio esta processando o documento e montando a resposta.';
        document.body.classList.add('is-submitting');
        document.body.setAttribute('aria-busy', 'true');
        overlay.setAttribute('aria-hidden', 'false');
        forms.forEach((currentForm) => {
          currentForm.setAttribute('aria-busy', 'true');
          const submit = currentForm.querySelector('button[type="submit"]');
          if (submit) {
            submit.disabled = true;
          }
        });
      };

      forms.forEach((form) => {
        form.addEventListener('submit', (event) => {
          if (isSubmitting) {
            event.preventDefault();
            return;
          }
          isSubmitting = true;
          activateBusyState(form);
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
  if action == "process_url" and source_kind == "upload-local":
    return "process_upload"
  if action == "process_url" and source_kind == "pncp-selected":
    return "process_pncp_document"
  return action


def _source_kind_label(source_kind: str) -> str:
  normalized = str(source_kind or "").strip().lower()
  mapping = {
    "upload-local": "Arquivo local enviado no browser",
    "pncp-selected": "Documento escolhido da lista do PNCP",
  }
  return mapping.get(normalized, "")


def _save_browser_upload(uploaded_file: Any) -> tuple[str | None, str | None, str | None]:
  original_name = Path(str(getattr(uploaded_file, "filename", "") or "")).name.strip()
  if not original_name:
    return None, None, "Selecione um arquivo local para testar."

  extension = Path(original_name).suffix.lower()
  safe_stem = _slugify(Path(original_name).stem).replace("-", "_") or "arquivo"
  saved_name = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{safe_stem}{extension}"
  saved_path = UPLOADS_DIR / saved_name
  UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
  try:
    uploaded_file.save(saved_path)
  except Exception as exc:
    return None, None, f"Falha ao salvar o arquivo local enviado: {exc}"
  return str(saved_path), original_name, None


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
  uploaded_file = request.files.get("local_file")
  pncp_id = (request.form.get("pncp_id") or "").strip()
  user_id = (request.form.get("user_id") or "").strip()
  save_artifacts = request.form.get("save_artifacts") == "on"
  form_state = {
    "user_id": user_id,
    "process_pncp_id": pncp_id,
    "save_artifacts": save_artifacts,
  }

  saved_path, original_name, error = _save_browser_upload(uploaded_file)
  if error:
    return _render_input_error(
      "process-upload-manual",
      {
        "action": "process_url",
        "pncp_id": pncp_id,
        "user_id": user_id,
        "save_artifacts": save_artifacts,
        "browser_action": "process_upload",
        "source_kind": "upload-local",
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
      "source_kind": "upload-local",
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