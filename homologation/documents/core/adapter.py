from __future__ import annotations

import importlib
import os
import time
from typing import Any, Dict, List

from .bootstrap import bootstrap_v1_documents_environment
from .contracts import DocumentListItem, DocumentRequest, DocumentResponse


class DocumentsAdapter:
    def __init__(self) -> None:
        self._env_info: Dict[str, str] | None = None
        self._documents_module: Any = None
        self._database_module: Any = None

    def _load_modules(self) -> None:
        self._env_info = bootstrap_v1_documents_environment()
        importlib.invalidate_caches()

        if self._database_module is None:
            self._database_module = importlib.import_module("gvg_database")
        else:
            self._database_module = importlib.reload(self._database_module)

        if self._documents_module is None:
            self._documents_module = importlib.import_module("gvg_documents")
        else:
            self._documents_module = importlib.reload(self._documents_module)

    def _apply_runtime_flags(self, request: DocumentRequest) -> None:
        self._documents_module.set_markdown_enabled(True)
        self._documents_module.GVG_SAVE_DOCUMENTS = bool(request.save_artifacts)

    def _normalize_document(self, raw_item: Dict[str, Any]) -> DocumentListItem:
        return DocumentListItem(
            url=str(raw_item.get("url") or ""),
            nome=str(raw_item.get("nome") or ""),
            tipo=str(raw_item.get("tipo") or ""),
            tamanho=raw_item.get("tamanho"),
            modificacao=str(raw_item.get("modificacao") or ""),
            sequencial=raw_item.get("sequencial"),
            origem=str(raw_item.get("origem") or ""),
            raw=dict(raw_item or {}),
        )

    def _build_pncp_payload(self, request: DocumentRequest) -> Dict[str, Any] | None:
        payload: Dict[str, Any] = {}
        if request.pncp_id:
            payload["id"] = request.pncp_id
            payload["numero_controle_pncp"] = request.pncp_id
        if request.user_id:
            payload["uid"] = request.user_id
            payload["user_id"] = request.user_id
        return payload or None

    def _healthcheck_meta(self) -> Dict[str, Any]:
        return {
            "module_file": getattr(self._documents_module, "__file__", ""),
            "database_file": getattr(self._database_module, "__file__", ""),
            "markdown_summary_enabled": bool(getattr(self._documents_module, "GVG_USE_MARKDOWN_SUMMARY", False)),
            "conversion_engine": "markitdown",
            "pipeline_mode": "markitdown_only",
            "supported_extensions": list(getattr(self._documents_module, "MARKITDOWN_SUPPORTED_EXTENSIONS", ())),
            "save_documents_enabled": bool(getattr(self._documents_module, "GVG_SAVE_DOCUMENTS", False)),
            "assistant_configured": bool(os.getenv("GVG_SUMMARY_DOCUMENT_v1", "").strip()),
            "openai_key_configured": bool(os.getenv("OPENAI_API_KEY", "").strip()),
        }

    def run(self, request: DocumentRequest) -> DocumentResponse:
        started_at = time.perf_counter()
        action = request.normalized_action()

        try:
            self._load_modules()
            self._apply_runtime_flags(request)

            meta: Dict[str, Any] = dict(self._env_info or {})

            if action == "healthcheck":
                meta.update(self._healthcheck_meta())
                return DocumentResponse(
                    request=request.to_dict(),
                    source="v1.gvg_documents",
                    action=action,
                    status="ok",
                    elapsed_ms=int((time.perf_counter() - started_at) * 1000),
                    result_count=0,
                    summary="Core de Documentos carregado localmente no v2.",
                    meta=meta,
                    documents=[],
                    error=None,
                )

            if action == "list_documents":
                if not request.pncp_id:
                    raise ValueError("pncp_id e obrigatorio para action=list_documents")

                raw_documents = self._database_module.fetch_documentos(request.pncp_id)
                items = [self._normalize_document(item) for item in raw_documents]
                meta.update(
                    {
                        "pncp_id": request.pncp_id,
                        "documents_found": len(items),
                    }
                )
                return DocumentResponse(
                    request=request.to_dict(),
                    source="v1.gvg_documents",
                    action=action,
                    status="ok",
                    elapsed_ms=int((time.perf_counter() - started_at) * 1000),
                    result_count=len(items),
                    summary="",
                    meta=meta,
                    documents=items,
                    error=None,
                )

            if not request.document_url:
                raise ValueError("document_url e obrigatoria para action=process_url")

            processing_output = self._documents_module.summarize_document(
                request.document_url,
                max_tokens=request.max_tokens,
                document_name=request.document_name or None,
                pncp_data=self._build_pncp_payload(request),
                return_details=True,
            )

            extracted_text = ""
            summary_text = ""
            error = None

            if isinstance(processing_output, dict):
                extracted_text = str(processing_output.get("extracted_text") or "")
                summary_text = str(processing_output.get("summary") or "")
                details_error = str(processing_output.get("error") or "")
                if details_error and not extracted_text.strip():
                    error = details_error
                elif summary_text.lower().startswith("erro") and not extracted_text.strip():
                    error = summary_text

                meta.update(
                    {
                        "markdown_path": processing_output.get("markdown_path") or "",
                        "summary_path": processing_output.get("summary_path") or "",
                        "conversion_engine": processing_output.get("conversion_engine") or "markitdown",
                        "pipeline_mode": processing_output.get("pipeline_mode") or "markitdown_only",
                    }
                )
            else:
                summary_text = str(processing_output or "")
                error = summary_text if summary_text.lower().startswith("erro") else None

            status = "error" if error else "ok"
            meta.update(
                {
                    "document_name": request.document_name,
                    "pncp_id": request.pncp_id,
                    "user_id": request.user_id,
                    "save_artifacts": request.save_artifacts,
                    "conversion_engine": meta.get("conversion_engine") or "markitdown",
                    "pipeline_mode": meta.get("pipeline_mode") or "markitdown_only",
                }
            )
            return DocumentResponse(
                request=request.to_dict(),
                source="v1.gvg_documents",
                action=action,
                status=status,
                elapsed_ms=int((time.perf_counter() - started_at) * 1000),
                result_count=1 if (summary_text or extracted_text) else 0,
                extracted_text=extracted_text,
                summary=summary_text,
                meta=meta,
                documents=[],
                error=error,
            )
        except Exception as exc:
            return DocumentResponse(
                request=request.to_dict(),
                source="v1.gvg_documents",
                action=action,
                status="error",
                elapsed_ms=int((time.perf_counter() - started_at) * 1000),
                result_count=0,
                summary="",
                meta=self._env_info or {},
                documents=[],
                error=str(exc),
            )
