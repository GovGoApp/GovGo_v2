from __future__ import annotations

import importlib
import time
from typing import Any, Dict, List, Tuple

from .bootstrap import bootstrap_v1_search_environment
from .contracts import SearchRequest, SearchResponse, SearchResultItem


class SearchAdapter:
    def __init__(self) -> None:
        self._env_info: Dict[str, str] | None = None
        self._core: Any = None
        self._processor_cls: Any = None

    def _load_modules(self) -> None:
        if self._core is not None and self._processor_cls is not None:
            return

        self._env_info = bootstrap_v1_search_environment()
        preproc = importlib.import_module("gvg_preprocessing")
        self._core = importlib.import_module("gvg_search_core")
        self._processor_cls = getattr(preproc, "SearchQueryProcessor")

    def _search_type_code(self, search_type: str) -> int:
        mapping = {
            "semantic": 1,
            "keyword": 2,
            "hybrid": 3,
        }
        return mapping[search_type]

    def _extract_search_text(self, value: Any) -> str:
        if isinstance(value, dict):
            return (
                value.get("search_terms")
                or value.get("original_query")
                or value.get("query")
                or ""
            )
        return str(value or "")

    def _should_bypass_preprocessing(self, request: SearchRequest) -> bool:
        if request.filters or request.where_sql:
            return False

        text = " ".join((request.query or "").strip().lower().split())
        if not text:
            return True

        if any(char.isdigit() for char in text):
            return False

        tokens = set(text.replace(",", " ").replace(";", " ").split())
        filter_terms = {
            "municipio",
            "cidade",
            "estado",
            "uf",
            "orgao",
            "modalidade",
            "poder",
            "esfera",
            "encerramento",
            "abertura",
            "valor",
            "estimado",
            "homologado",
            "entre",
            "ate",
            "acima",
            "abaixo",
            "maior",
            "menor",
            "antes",
            "depois",
        }
        if tokens & filter_terms:
            return False

        return len(tokens) <= 5

    def _preprocess(self, request: SearchRequest) -> Tuple[Any, Dict[str, Any]]:
        if not request.preprocess:
            return request.query, {
                "enabled": False,
                "search_terms": request.query,
                "sql_conditions": [],
                "filters": request.filters,
            }

        if self._should_bypass_preprocessing(request):
            return request.query, {
                "enabled": False,
                "skipped": True,
                "skip_reason": "simple_query_bypass",
                "search_terms": request.query,
                "negative_terms": "",
                "sql_conditions": [],
                "filters": request.filters,
                "preprocessing_version": "bypass",
            }

        processor = self._processor_cls()
        if request.prefer_preproc_v2:
            processed = processor.process_query_v2(request.query, request.filters)
            processed["preprocessing_version"] = "v2"
        else:
            processed = processor.process_query(request.query)
            processed["preprocessing_version"] = "v1"
            if request.filters:
                processed["filters"] = request.filters
        processed["enabled"] = True
        return processed, processed

    def _dispatch_search(self, request: SearchRequest, prepared_query: Any) -> Tuple[List[Dict[str, Any]], float, Dict[str, Any]]:
        search_type = request.normalized_search_type()

        if search_type == "semantic":
            results, confidence = self._core.semantic_search(
                prepared_query,
                limit=request.limit,
                filter_expired=request.filter_expired,
                use_negation=request.use_negation,
                intelligent_mode=request.intelligent_mode,
                where_sql=request.where_sql,
            )
            return results, confidence, {}

        if search_type == "keyword":
            results, confidence = self._core.keyword_search(
                prepared_query,
                limit=request.limit,
                filter_expired=request.filter_expired,
                intelligent_mode=request.intelligent_mode,
                where_sql=request.where_sql,
            )
            return results, confidence, {}

        if search_type == "hybrid":
            results, confidence = self._core.hybrid_search(
                prepared_query,
                limit=request.limit,
                filter_expired=request.filter_expired,
                use_negation=request.use_negation,
                intelligent_mode=request.intelligent_mode,
                where_sql=request.where_sql,
            )
            return results, confidence, {}

        base_type = request.normalized_category_base()
        top_categories = self._core.get_top_categories_for_query(
            self._extract_search_text(prepared_query),
            top_n=request.top_categories_limit,
            use_negation=request.use_negation,
            search_type=self._search_type_code(base_type),
        )

        meta: Dict[str, Any] = {
            "top_categories_count": len(top_categories),
            "top_categories_preview": top_categories[:5],
            "category_search_base": base_type,
        }

        if search_type == "correspondence":
            results, confidence, search_meta = self._core.correspondence_search(
                self._extract_search_text(prepared_query),
                top_categories,
                limit=request.limit,
                filter_expired=request.filter_expired,
                where_sql=request.where_sql,
            )
            meta.update(search_meta)
            return results, confidence, meta

        results, confidence, search_meta = self._core.category_filtered_search(
            prepared_query,
            self._search_type_code(base_type),
            top_categories,
            limit=request.limit,
            filter_expired=request.filter_expired,
            use_negation=request.use_negation,
            where_sql=request.where_sql,
        )
        meta.update(search_meta)
        return results, confidence, meta

    def _normalize_result(self, raw_item: Dict[str, Any]) -> SearchResultItem:
        details = dict(raw_item.get("details") or {})
        title = details.get("objeto_compra") or raw_item.get("title") or ""
        organization = details.get("orgao_entidade_razao_social") or details.get("orgao") or ""
        municipality = details.get("unidade_orgao_municipio_nome") or details.get("municipio") or ""
        uf = details.get("unidade_orgao_uf_sigla") or details.get("uf") or ""
        modality = details.get("modalidade_nome") or ""
        closing_date = details.get("data_encerramento_proposta") or ""
        estimated_value = details.get("valor_total_estimado")
        if estimated_value in (None, ""):
            estimated_value = details.get("valor_total_homologado")

        return SearchResultItem(
            item_id=str(raw_item.get("id") or raw_item.get("numero_controle") or "") or None,
            rank=int(raw_item.get("rank") or 0),
            similarity=float(raw_item.get("similarity") or 0.0),
            title=str(title or ""),
            organization=str(organization or ""),
            municipality=str(municipality or ""),
            uf=str(uf or ""),
            modality=str(modality or ""),
            closing_date=str(closing_date or ""),
            estimated_value=estimated_value,
            raw=raw_item,
        )

    def run(self, request: SearchRequest) -> SearchResponse:
        started_at = time.perf_counter()
        self._load_modules()

        try:
            if request.sql_debug:
                self._core.set_sql_debug(True)

            prepared_query, preprocessing = self._preprocess(request)
            raw_results, confidence, meta = self._dispatch_search(request, prepared_query)
            items = [self._normalize_result(item) for item in raw_results]

            if self._env_info:
                meta = {**meta, **self._env_info}

            return SearchResponse(
                request=request.to_dict(),
                source="v1.gvg_search_core",
                elapsed_ms=int((time.perf_counter() - started_at) * 1000),
                confidence=float(confidence or 0.0),
                result_count=len(items),
                preprocessing=preprocessing,
                meta=meta,
                results=items,
                error=None,
            )
        except Exception as exc:
            meta = self._env_info or {}
            return SearchResponse(
                request=request.to_dict(),
                source="v1.gvg_search_core",
                elapsed_ms=int((time.perf_counter() - started_at) * 1000),
                confidence=0.0,
                result_count=0,
                preprocessing={},
                meta=meta,
                results=[],
                error=str(exc),
            )
        finally:
            if request.sql_debug and self._core is not None:
                try:
                    self._core.set_sql_debug(False)
                except Exception:
                    pass