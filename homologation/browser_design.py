from __future__ import annotations

from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DESIGN_CSS_DIR = PROJECT_ROOT / "design" / "css"
DESIGN_CSS_PATHS = (
  DESIGN_CSS_DIR / "tokens.css",
  DESIGN_CSS_DIR / "govgo.css",
)


_BASE_BROWSER_CSS = """
* { box-sizing: border-box; }
html, body { min-height: 100%; }
body {
  margin: 0;
  color: var(--ink-1);
  font-family: var(--font-body);
  background:
    radial-gradient(circle at top left, rgba(255, 87, 34, 0.10), transparent 24%),
    radial-gradient(circle at top right, rgba(11, 74, 138, 0.10), transparent 26%),
    linear-gradient(180deg, var(--workspace) 0%, color-mix(in srgb, var(--workspace) 88%, white) 100%);
}
a {
  color: var(--deep-blue);
  text-decoration: none;
}
a:hover { text-decoration: underline; }
button,
input,
select,
textarea {
  font: inherit;
}
.page-shell {
  width: min(1600px, 100%);
  margin: 0 auto;
  padding: 18px;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 18px;
  margin-bottom: 18px;
  padding: 20px 22px;
  border: 1px solid var(--hairline);
  border-radius: 20px;
  background: color-mix(in srgb, var(--paper) 88%, transparent);
  backdrop-filter: blur(14px);
  box-shadow: var(--shadow-md);
}
.eyebrow {
  margin-bottom: 8px;
  color: var(--ink-3);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.page-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(30px, 3vw, 42px);
  line-height: 1.02;
  letter-spacing: -0.03em;
}
.page-lede {
  margin: 10px 0 0;
  max-width: 760px;
  color: var(--ink-2);
  font-size: 15px;
  line-height: 1.55;
}
.top-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
.tag,
.soft-chip,
.mini-tag,
.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 30px;
  padding: 6px 10px;
  border-radius: var(--r-pill);
  border: 1px solid var(--hairline);
  background: var(--paper);
  color: var(--ink-2);
  font-size: 12px;
  font-weight: 700;
}
.tag--accent,
.status-pill.ok {
  background: var(--orange-50);
  border-color: var(--orange-100);
  color: var(--orange-700);
}
.tag--blue {
  background: var(--blue-50);
  border-color: var(--blue-200);
  color: var(--deep-blue);
}
.status-pill.error {
  background: var(--risk-50);
  border-color: color-mix(in srgb, var(--risk) 18%, white);
  color: var(--risk);
}
.workspace-grid {
  display: grid;
  grid-template-columns: minmax(320px, 380px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}
.workspace-grid > * {
  min-width: 0;
}
.panel {
  border: 1px solid var(--hairline);
  border-radius: 20px;
  background: color-mix(in srgb, var(--paper) 94%, transparent);
  box-shadow: var(--shadow-sm);
  min-width: 0;
}
.sidebar-panel {
  display: grid;
  gap: 14px;
  padding: 16px;
  min-width: 0;
}
.result-panel {
  min-height: 720px;
  padding: 16px;
  min-width: 0;
}
.panel-block {
  border: 1px solid var(--hairline-soft);
  border-radius: 16px;
  background: var(--paper);
  padding: 16px;
  min-width: 0;
}
.panel-block--tinted {
  background: linear-gradient(180deg, color-mix(in srgb, var(--orange-50) 62%, white) 0%, var(--paper) 100%);
}
.section-headline {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}
.section-headline h2,
.section-headline h3,
.empty-state h2,
.result-card h3,
.result-table-title {
  margin: 0;
}
.section-headline p,
.empty-state p,
.muted-copy,
.result-card p {
  margin: 6px 0 0;
  color: var(--ink-2);
  font-size: 13px;
  line-height: 1.5;
}
.field-stack {
  display: grid;
  gap: 12px;
  min-width: 0;
}
.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.field {
  display: grid;
  gap: 7px;
  min-width: 0;
}
.field-label {
  color: var(--ink-3);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.control,
.control-select,
.control-textarea {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  border: 1px solid var(--hairline);
  border-radius: 14px;
  background: var(--paper);
  padding: 12px 14px;
  color: var(--ink-1);
}
input[type="file"].control {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
input[type="file"].control::file-selector-button {
  margin-right: 12px;
  border: 1px solid var(--hairline);
  border-radius: 10px;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--paper) 92%, white);
  color: var(--ink-1);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.page-lede,
.section-headline > *,
.section-headline p,
.muted-copy,
.helper-line,
.run-row,
.result-card,
.result-panel,
.sidebar-panel {
  min-width: 0;
}
.section-headline p,
.muted-copy,
.helper-line,
.page-lede {
  overflow-wrap: anywhere;
}
.control:focus,
.control-select:focus,
.control-textarea:focus {
  outline: none;
  border-color: var(--orange);
  box-shadow: var(--ring-focus);
}
.control-textarea {
  min-height: 112px;
  resize: vertical;
}
.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.button,
.button-ghost,
.button-soft {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  font-weight: 700;
}
.button {
  background: var(--orange);
  color: white;
}
.button:hover { background: var(--orange-600); }
.button-ghost {
  border-color: var(--hairline);
  background: var(--paper);
  color: var(--deep-blue);
}
.button-ghost:hover {
  border-color: var(--blue-200);
  background: var(--blue-50);
}
.button-soft {
  background: var(--blue-50);
  color: var(--deep-blue);
}
.button-soft:hover { background: var(--blue-100); }
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
}
.stat-box {
  border: 1px solid var(--hairline-soft);
  border-radius: 14px;
  background: var(--rail);
  padding: 14px;
}
.stat-box .stat-label {
  display: block;
  color: var(--ink-3);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.stat-box strong {
  display: block;
  margin-top: 6px;
  font-family: var(--font-display);
  font-size: 24px;
  line-height: 1.05;
}
.empty-state {
  min-height: 620px;
  display: grid;
  place-items: center;
  text-align: center;
  border: 1px dashed var(--hairline);
  border-radius: 18px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--paper) 94%, transparent) 0%, color-mix(in srgb, var(--blue-50) 60%, white) 100%);
  padding: 28px;
}
.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 14px;
}
.result-card {
  border: 1px solid var(--hairline-soft);
  border-radius: 18px;
  background: var(--paper);
  padding: 16px;
}
.result-card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}
.run-list,
.run-row {
  display: grid;
  gap: 6px;
}
.run-row {
  border: 1px solid var(--hairline-soft);
  border-radius: 14px;
  background: var(--rail);
  padding: 12px;
}
.mono {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
.checkbox-grid {
  display: grid;
  gap: 10px;
}
.checkbox-card {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  border: 1px solid var(--hairline-soft);
  border-radius: 16px;
  background: var(--paper);
  padding: 14px;
}
.checkbox-card.is-selected {
  border-color: color-mix(in srgb, var(--orange) 36%, white);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--orange) 28%, transparent);
  background: linear-gradient(180deg, color-mix(in srgb, var(--orange-50) 52%, white) 0%, var(--paper) 100%);
}
.checkbox-card input {
  width: 18px;
  height: 18px;
  margin: 2px 0 0;
  accent-color: var(--orange);
}
.checkbox-card-top {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.checkbox-card-top strong {
  font-family: var(--font-display);
  font-size: 15px;
  line-height: 1.1;
}
.mini-tag {
  min-height: 24px;
  padding: 4px 8px;
  background: var(--blue-50);
  border-color: var(--blue-200);
  color: var(--deep-blue);
  font-size: 11px;
}
.helper-line {
  margin-top: 10px;
  color: var(--ink-3);
  font-size: 12px;
}
.link-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
@media (max-width: 1100px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }
  .result-panel {
    min-height: 0;
  }
}
@media (max-width: 720px) {
  .page-shell {
    padding: 10px;
  }
  .topbar {
    padding: 16px;
  }
  .field-grid {
    grid-template-columns: 1fr;
  }
}
"""


def _read_design_css() -> str:
  parts: list[str] = []
  for css_path in DESIGN_CSS_PATHS:
    try:
      parts.append(css_path.read_text(encoding="utf-8"))
    except FileNotFoundError:
      continue
  return "\n\n".join(part for part in parts if part)


def get_browser_design_css(extra_css: str = "") -> str:
  parts = [_read_design_css(), _BASE_BROWSER_CSS.strip()]
  if extra_css.strip():
    parts.append(extra_css.strip())
  return "\n\n".join(part for part in parts if part)