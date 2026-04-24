from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from src.backend.search.api.document_cache_store import (
    build_document_artifact_key,
    load_document_artifact,
    load_document_artifact_status_map,
    load_edital_documents_summary,
    save_document_artifact,
    save_edital_documents_summary,
)
from src.backend.search.api.documents_homologation_runtime import (
    build_documents_bundle,
    cleanup_bundle_path,
    run_documents_action,
)
from src.backend.search.api.config_store import load_search_config, save_search_config
from src.backend.search.api.filter_store import load_search_filters, save_search_filters
from src.backend.search.core.adapter import SearchAdapter
from src.backend.search.core.contracts import SearchRequest
from src.backend.search.core.ui_filters import has_any_ui_filter


ADAPTER = SearchAdapter()


def _as_bool(value: Any, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "on", "sim"}


def _document_user_id(payload: dict[str, Any]) -> str:
    return str(payload.get("user_id") or os.getenv("PASS_USER_UID") or "").strip()


def _normalize_document_result(payload: dict[str, Any], pncp: str, document_url: str, document_name: str) -> dict[str, Any]:
    meta = payload.get("meta") if isinstance(payload.get("meta"), dict) else {}
    return {
        "pncp_id": pncp,
        "document_url": document_url,
        "document_name": document_name,
        "summary": str(payload.get("summary") or ""),
        "markdown": str(payload.get("extracted_text") or ""),
        "markdown_path": str(meta.get("markdown_path") or ""),
        "summary_path": str(meta.get("summary_path") or ""),
        "conversion_engine": str(meta.get("conversion_engine") or "markitdown"),
        "pipeline_mode": str(meta.get("pipeline_mode") or "markitdown_only"),
        "elapsed_ms": int(payload.get("elapsed_ms") or 0),
        "error": str(payload.get("error") or ""),
    }


def _load_or_generate_document_artifact(
    pncp: str,
    document_url: str,
    document_name: str,
    *,
    force: bool = False,
    user_id: str = "",
) -> tuple[dict[str, Any], bool]:
    cached = None if force else load_document_artifact(pncp, document_url, document_name)
    if cached and (cached.get("summary") or cached.get("markdown")):
        return cached, True

    response = run_documents_action(
        action="process_url",
        document_url=document_url,
        document_name=document_name,
        pncp_id=pncp,
        user_id=user_id,
        max_tokens=500,
        save_artifacts=False,
        timeout_seconds=900,
    )
    artifact = _normalize_document_result(response, pncp, document_url, document_name)
    if artifact["error"]:
        return artifact, False
    saved = save_document_artifact(pncp, document_url, document_name, artifact)
    return saved, False


def _error_response(request: SearchRequest, message: str) -> dict[str, Any]:
    return {
        "request": request.to_dict(),
        "source": "v2.search_api",
        "elapsed_ms": 0,
        "confidence": 0.0,
        "result_count": 0,
        "preprocessing": {},
        "meta": {},
        "results": [],
        "error": message,
    }


def run_search(payload: dict[str, Any] | None) -> dict[str, Any]:
    request = SearchRequest.from_mapping(payload or {})
    if not request.query and not (request.where_sql or has_any_ui_filter(request.ui_filters)):
        return _error_response(request, "Informe uma consulta para buscar.")
    return ADAPTER.run(request).to_dict()


def get_search_config() -> dict[str, Any]:
    return load_search_config()


def update_search_config(payload: dict[str, Any] | None) -> dict[str, Any]:
    return save_search_config(payload or {})


def get_search_filters() -> dict[str, Any]:
    return load_search_filters()


def update_search_filters(payload: dict[str, Any] | None) -> dict[str, Any]:
    return save_search_filters(payload or {})


def get_edital_items(payload: dict[str, Any] | None) -> dict[str, Any]:
    source = payload or {}
    pncp = str(
        source.get("pncp_id")
        or source.get("numero_controle_pncp")
        or source.get("pncp")
        or ""
    ).strip()

    try:
        limit = int(source.get("limit") or 500)
    except (TypeError, ValueError):
        limit = 500

    items, error = ADAPTER.fetch_edital_items(pncp, limit=limit)
    return {
        "pncp_id": pncp,
        "limit": limit,
        "count": len(items),
        "items": items,
        "error": error,
    }


def get_edital_documents(payload: dict[str, Any] | None) -> dict[str, Any]:
    source = payload or {}
    pncp = str(
        source.get("pncp_id")
        or source.get("numero_controle_pncp")
        or source.get("pncp")
        or ""
    ).strip()

    try:
        limit = int(source.get("limit") or 200)
    except (TypeError, ValueError):
        limit = 200

    documents, error = ADAPTER.fetch_edital_documents(pncp, limit=limit)
    status_map = load_document_artifact_status_map(pncp) if pncp else {}
    for document in documents:
        artifact_key = build_document_artifact_key(
            pncp,
            str(document.get("url") or ""),
            str(document.get("nome") or ""),
        )
        status = status_map.get(artifact_key, {})
        document["cache_key"] = artifact_key
        document["has_summary"] = bool(status.get("has_summary"))
        document["has_markdown"] = bool(status.get("has_markdown"))
        document["cached_at"] = str(status.get("updated_at") or "")
    return {
        "pncp_id": pncp,
        "limit": limit,
        "count": len(documents),
        "documents": documents,
        "error": error,
    }


def get_edital_document_view(payload: dict[str, Any] | None) -> dict[str, Any]:
    source = payload or {}
    pncp = str(
        source.get("pncp_id")
        or source.get("numero_controle_pncp")
        or source.get("pncp")
        or ""
    ).strip()
    document_url = str(source.get("document_url") or source.get("url") or "").strip()
    document_name = str(source.get("document_name") or source.get("nome") or "Documento").strip()
    force = _as_bool(source.get("force"), False)

    if not pncp:
        return {
            "pncp_id": pncp,
            "document_url": document_url,
            "document_name": document_name,
            "summary": "",
            "markdown": "",
            "error": "Informe o numero_controle_pncp do edital.",
            "cached": False,
        }

    if not document_url:
        return {
            "pncp_id": pncp,
            "document_url": document_url,
            "document_name": document_name,
            "summary": "",
            "markdown": "",
            "error": "Informe a URL do documento selecionado.",
            "cached": False,
        }

    artifact, cached = _load_or_generate_document_artifact(
        pncp,
        document_url,
        document_name,
        force=force,
        user_id=_document_user_id(source),
    )
    return {
        **artifact,
        "cached": cached,
        "exists": bool(artifact.get("summary") or artifact.get("markdown")),
    }


def get_edital_documents_summary(payload: dict[str, Any] | None) -> dict[str, Any]:
    source = payload or {}
    pncp = str(
        source.get("pncp_id")
        or source.get("numero_controle_pncp")
        or source.get("pncp")
        or ""
    ).strip()
    force = _as_bool(source.get("force"), False)
    generate_if_missing = _as_bool(source.get("generate_if_missing"), True)

    if not pncp:
        return {
            "pncp_id": pncp,
            "summary": "",
            "exists": False,
            "cached": False,
            "documents_used": 0,
            "error": "Informe o numero_controle_pncp do edital.",
        }

    cached = None if force else load_edital_documents_summary(pncp)
    if cached and cached.get("summary"):
        return {
            **cached,
            "cached": True,
            "exists": True,
            "error": "",
        }

    if not generate_if_missing and not force:
        return {
            "pncp_id": pncp,
            "summary": "",
            "summary_markdown": "",
            "exists": False,
            "cached": False,
            "documents_used": 0,
            "error": "",
        }

    documents, documents_error = ADAPTER.fetch_edital_documents(pncp, limit=500)
    if documents_error:
        return {
            "pncp_id": pncp,
            "summary": "",
            "exists": False,
            "cached": False,
            "documents_used": 0,
            "error": documents_error,
        }

    usable_documents = [document for document in documents if str(document.get("url") or "").strip()]
    if not usable_documents:
        return {
            "pncp_id": pncp,
            "summary": "",
            "exists": False,
            "cached": False,
            "documents_used": 0,
            "error": "",
        }

    summary_text = ""
    summary_markdown = ""
    included_documents: list[dict[str, Any]] = []
    skipped_documents: list[dict[str, Any]] = []
    runner_meta: dict[str, Any] = {}
    generated_error = ""

    if len(usable_documents) == 1:
        artifact, _cached = _load_or_generate_document_artifact(
            pncp,
            str(usable_documents[0].get("url") or ""),
            str(usable_documents[0].get("nome") or "Documento"),
            force=force,
            user_id=_document_user_id(source),
        )
        generated_error = str(artifact.get("error") or "")
        if not generated_error:
            summary_text = str(artifact.get("summary") or "")
            summary_markdown = str(artifact.get("markdown") or "")
            included_documents = usable_documents[:1]
            runner_meta = {
                "mode": "single_document",
                "markdown_path": str(artifact.get("markdown_path") or ""),
                "summary_path": str(artifact.get("summary_path") or ""),
            }
    else:
        bundle_path, included_documents, skipped_documents, bundle_error = build_documents_bundle(pncp, usable_documents)
        if bundle_error:
            generated_error = bundle_error
        elif bundle_path:
            try:
                result = run_documents_action(
                    action="process_url",
                    document_url=str(Path(bundle_path)),
                    document_name=f"documentos_{pncp}.zip",
                    pncp_id=pncp,
                    user_id=_document_user_id(source),
                    max_tokens=700,
                    save_artifacts=False,
                    timeout_seconds=1200,
                )
                generated_error = str(result.get("error") or "")
                if not generated_error:
                    summary_text = str(result.get("summary") or "")
                    summary_markdown = str(result.get("extracted_text") or "")
                    meta = result.get("meta") if isinstance(result.get("meta"), dict) else {}
                    runner_meta = {
                        "mode": "bundle",
                        "markdown_path": str(meta.get("markdown_path") or ""),
                        "summary_path": str(meta.get("summary_path") or ""),
                    }
            finally:
                cleanup_bundle_path(bundle_path)

    if generated_error:
        return {
            "pncp_id": pncp,
            "summary": "",
            "summary_markdown": "",
            "exists": False,
            "cached": False,
            "documents_used": len(included_documents),
            "included_documents": included_documents,
            "skipped_documents": skipped_documents,
            "error": generated_error,
        }

    if not summary_text.strip():
        return {
            "pncp_id": pncp,
            "summary": "",
            "summary_markdown": "",
            "exists": False,
            "cached": False,
            "documents_used": len(included_documents),
            "included_documents": included_documents,
            "skipped_documents": skipped_documents,
            "error": "",
        }

    saved = save_edital_documents_summary(
        pncp,
        {
            "summary": summary_text,
            "summary_markdown": summary_markdown,
            "documents_used": len(included_documents),
            "included_documents": included_documents,
            "skipped_documents": skipped_documents,
            **runner_meta,
        },
    )
    return {
        **saved,
        "cached": False,
        "exists": True,
        "error": "",
    }
