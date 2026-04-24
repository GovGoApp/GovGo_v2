from __future__ import annotations

import importlib
import os
import time
from datetime import datetime
from threading import Lock
from typing import Any, Dict, List, Tuple

from .bootstrap import bootstrap_v1_search_environment
from .contracts import SearchRequest, SearchResponse, SearchResultItem
from .ui_filters import build_sql_conditions_from_ui_filters, has_any_ui_filter


BASE_SEARCH_TYPE_CODES = {
    "semantic": 1,
    "keyword": 2,
    "hybrid": 3,
}

BASE_SEARCH_TYPE_NAMES = {
    "semantic": "Semantica",
    "keyword": "Palavras-chave",
    "hybrid": "Hibrida",
}

APPROACH_NAMES = {
    "direct": "Direta",
    "correspondence": "Correspondencia de Categoria",
    "category_filtered": "Filtro de Categoria",
}

RELEVANCE_NAMES = {
    1: "Sem filtro",
    2: "Flexivel",
    3: "Restritivo",
}

SORT_NAMES = {
    1: "Similaridade",
    2: "Data (Encerramento)",
    3: "Valor (Estimado)",
}

APPROACH_CODES = {
    "direct": 1,
    "correspondence": 2,
    "category_filtered": 3,
}


class SearchAdapter:
    def __init__(self) -> None:
        self._env_info: Dict[str, str] | None = None
        self._core: Any = None
        self._processor_cls: Any = None
        self._run_lock = Lock()
        self._db_health_checked_at = 0.0
        self._db_health_error: str | None = None

    def _load_modules(self) -> None:
        if self._core is not None and self._processor_cls is not None:
            return

        self._env_info = bootstrap_v1_search_environment()
        preproc = importlib.import_module("gvg_preprocessing")
        self._core = importlib.import_module("gvg_search_core")
        self._processor_cls = getattr(preproc, "SearchQueryProcessor")

    def _search_type_code(self, search_type: str) -> int:
        return BASE_SEARCH_TYPE_CODES[search_type]

    def _extract_search_text(self, value: Any) -> str:
        if isinstance(value, dict):
            return (
                value.get("search_terms")
                or value.get("original_query")
                or value.get("query")
                or ""
            )
        return str(value or "")

    def _resolve_where_sql(self, request: SearchRequest) -> List[str]:
        combined: List[str] = []
        seen: set[str] = set()
        groups = (
            build_sql_conditions_from_ui_filters(request.ui_filters),
            request.where_sql,
        )
        for group in groups:
            for condition in group or []:
                text = str(condition or "").strip()
                if not text or text in seen:
                    continue
                seen.add(text)
                combined.append(text)
        return combined

    def _preprocessing_filters(self, request: SearchRequest) -> List[str]:
        combined: List[str] = []
        seen: set[str] = set()
        groups = (request.filters, request.where_sql)
        for group in groups:
            for item in group or []:
                text = str(item or "").strip()
                if not text or text in seen:
                    continue
                seen.add(text)
                combined.append(text)
        return combined

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
        effective_filters = self._preprocessing_filters(request)
        if not request.preprocess:
            return request.query, {
                "enabled": False,
                "search_terms": request.query,
                "sql_conditions": list(request.where_sql),
                "filters": effective_filters,
            }

        if self._should_bypass_preprocessing(request):
            return request.query, {
                "enabled": False,
                "skipped": True,
                "skip_reason": "simple_query_bypass",
                "search_terms": request.query,
                "negative_terms": "",
                "sql_conditions": list(request.where_sql),
                "filters": effective_filters,
                "preprocessing_version": "bypass",
            }

        processor = self._processor_cls()
        if request.prefer_preproc_v2:
            processed = processor.process_query_v2(request.query, effective_filters)
            processed["preprocessing_version"] = "v2"
        else:
            processed = processor.process_query(request.query)
            processed["preprocessing_version"] = "v1"
            if effective_filters:
                processed["filters"] = effective_filters
        processed_sql = [str(item).strip() for item in list(processed.get("sql_conditions") or []) if str(item).strip()]
        for condition in request.where_sql:
            if condition not in processed_sql:
                processed_sql.append(condition)
        processed["sql_conditions"] = processed_sql
        processed["enabled"] = True
        return processed, processed

    def _coerce_relevance_level(self, request: SearchRequest) -> int:
        value = int(request.relevance_level or 1)
        return value if value in (1, 2, 3) else 1

    def _coerce_sort_mode(self, request: SearchRequest) -> int:
        value = int(request.sort_mode or 1)
        return value if value in (1, 2, 3) else 1

    def _coerce_min_similarity(self, request: SearchRequest) -> float:
        value = float(request.min_similarity or 0.0)
        return min(1.0, max(0.0, value))

    def _search_approach_key(self, request: SearchRequest) -> str:
        search_type = request.normalized_search_type()
        if search_type == "correspondence":
            return "correspondence"
        if search_type == "category_filtered":
            return "category_filtered"
        return "direct"

    def _base_search_type(self, request: SearchRequest) -> str:
        search_type = request.normalized_search_type()
        if search_type in BASE_SEARCH_TYPE_CODES:
            return search_type
        return request.normalized_category_base()

    def _search_meta_labels(self, request: SearchRequest) -> Dict[str, str]:
        base_type = self._base_search_type(request)
        approach_key = self._search_approach_key(request)
        return {
            "type_name": BASE_SEARCH_TYPE_NAMES.get(base_type, "Semantica"),
            "approach_name": APPROACH_NAMES.get(approach_key, "Direta"),
        }

    def _get_relevance_level(self) -> int:
        if self._core is None or not hasattr(self._core, "get_relevance_filter_status"):
            return 1
        try:
            status = self._core.get_relevance_filter_status() or {}
            return int(status.get("level") or 1)
        except Exception:
            return 1

    def _set_relevance_level(self, level: int) -> None:
        if self._core is None or not hasattr(self._core, "set_relevance_filter_level"):
            return
        try:
            self._core.set_relevance_filter_level(level)
        except Exception:
            pass

    def _missing_database_config(self) -> List[str]:
        required = {
            "SUPABASE_USER": os.getenv("SUPABASE_USER"),
            "SUPABASE_PASSWORD": os.getenv("SUPABASE_PASSWORD"),
        }
        return [key for key, value in required.items() if not str(value or "").strip()]

    def _database_configuration_error(self) -> str | None:
        missing = self._missing_database_config()
        if not missing:
            return self._database_connection_error()
        return (
            "Banco de busca indisponivel neste ambiente. "
            "Configure as variaveis " + ", ".join(missing) + "."
        )

    def _database_connection_error(self) -> str | None:
        # Evita abrir uma nova conexao a cada busca quando o ambiente esta claramente offline.
        now = time.perf_counter()
        if now - self._db_health_checked_at < 15:
            return self._db_health_error

        self._db_health_checked_at = now
        self._db_health_error = None

        try:
            database = importlib.import_module("gvg_database")
        except Exception:
            self._db_health_error = (
                "Banco de busca indisponivel neste ambiente. "
                "Nao foi possivel carregar o modulo de conexao."
            )
            return self._db_health_error

        create_connection = getattr(database, "create_connection", None)
        if not callable(create_connection):
            self._db_health_error = (
                "Banco de busca indisponivel neste ambiente. "
                "O modulo de conexao nao expoe create_connection()."
            )
            return self._db_health_error

        conn = None
        try:
            conn = create_connection()
            if conn is None:
                self._db_health_error = (
                    "Banco de busca indisponivel no momento. "
                    "A conexao com a base de busca nao foi estabelecida."
                )
                return self._db_health_error

            cur = conn.cursor()
            try:
                cur.execute("SELECT 1")
                cur.fetchone()
            finally:
                cur.close()
            return None
        except Exception as exc:
            self._db_health_error = (
                "Banco de busca indisponivel no momento. "
                f"Falha ao validar a conexao: {exc}"
            )
            return self._db_health_error
        finally:
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass

    def _sql_only_search(self, sql_conditions: List[str], limit: int, filter_expired: bool) -> List[Dict[str, Any]]:
        try:
            database = importlib.import_module("gvg_database")
            schema = importlib.import_module("gvg_schema")
        except Exception:
            return []

        db_fetch_all = getattr(database, "db_fetch_all", None)
        get_contratacao_core_columns = getattr(schema, "get_contratacao_core_columns", None)
        normalize_contratacao_row = getattr(schema, "normalize_contratacao_row", None)
        project_result_for_output = getattr(schema, "project_result_for_output", None)
        if not all((db_fetch_all, get_contratacao_core_columns, normalize_contratacao_row, project_result_for_output)):
            return []

        sanitize_sql_conditions = getattr(self._core, "_sanitize_sql_conditions", None) if self._core is not None else None
        if callable(sanitize_sql_conditions):
            sanitized_conditions = sanitize_sql_conditions(sql_conditions or [], context="generic")
        else:
            sanitized_conditions = [str(condition).strip() for condition in sql_conditions if str(condition).strip()]

        where_parts = [f"( {str(condition).strip()} )" for condition in sanitized_conditions if str(condition).strip()]
        if filter_expired:
            where_parts.append(
                "(to_date(NULLIF(c.data_encerramento_proposta,''),'YYYY-MM-DD') >= current_date "
                "OR c.data_encerramento_proposta IS NULL OR c.data_encerramento_proposta='')"
            )
        where_sql = ("\nWHERE " + "\n  AND ".join(where_parts)) if where_parts else ""
        sql = (
            "SELECT\n  "
            + ",\n  ".join(get_contratacao_core_columns("c"))
            + "\nFROM contratacao c"
            + where_sql
            + "\nLIMIT %s"
        )

        try:
            rows = db_fetch_all(sql, (int(limit or 30),), as_dict=True, ctx="v2.search.sql_only")
        except Exception:
            return []

        results: List[Dict[str, Any]] = []
        for record in rows or []:
            try:
                details = project_result_for_output(normalize_contratacao_row(record))
                pncp = details.get("numero_controle_pncp")
                results.append({
                    "id": pncp,
                    "numero_controle": pncp,
                    "similarity": 0.0,
                    "rank": 0,
                    "details": details,
                })
            except Exception:
                continue
        return results

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

        if not top_categories and request.where_sql:
            sql_only_results = self._sql_only_search(request.where_sql, request.limit, request.filter_expired)
            meta["filter_route"] = "sql-only"
            return sql_only_results, 1.0 if sql_only_results else 0.0, meta

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

    def _apply_relevance_if_needed(
        self,
        request: SearchRequest,
        prepared_query: Any,
        raw_results: List[Dict[str, Any]],
        meta: Dict[str, Any],
    ) -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
        relevance_level = self._coerce_relevance_level(request)
        if relevance_level <= 1:
            return raw_results, {"filter_applied": False, "level": relevance_level}

        if request.normalized_search_type() != "correspondence":
            return raw_results, {"filter_applied": True, "level": relevance_level}

        if not raw_results or self._core is None or not hasattr(self._core, "apply_relevance_filter"):
            return raw_results, {"filter_applied": False, "level": relevance_level}

        labels = self._search_meta_labels(request)
        try:
            filtered, relevance_meta = self._core.apply_relevance_filter(
                raw_results,
                self._extract_search_text(prepared_query),
                {
                    "search_type": labels["type_name"],
                    "search_approach": labels["approach_name"],
                },
            )
            return filtered or raw_results, relevance_meta or {"filter_applied": False, "level": relevance_level}
        except Exception as exc:
            return raw_results, {
                "filter_applied": False,
                "level": relevance_level,
                "reason": str(exc),
            }

    def _apply_min_similarity(self, raw_results: List[Dict[str, Any]], threshold: float) -> List[Dict[str, Any]]:
        if threshold <= 0:
            return list(raw_results)

        filtered = [
            item for item in list(raw_results)
            if float(item.get("similarity") or 0.0) >= threshold
        ]
        for index, item in enumerate(filtered, start=1):
            item["rank"] = index
        return filtered

    def _parse_date_value(self, value: Any) -> Any:
        if not value:
            return None
        text = str(value).strip()
        if not text:
            return None
        for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%d/%m/%Y"):
            try:
                return datetime.strptime(text[:10], fmt).date()
            except Exception:
                continue
        return None

    def _to_float(self, value: Any) -> float | None:
        if value in (None, ""):
            return None
        try:
            return float(value)
        except Exception:
            return None

    def _sort_results(self, raw_results: List[Dict[str, Any]], sort_mode: int) -> List[Dict[str, Any]]:
        results = list(raw_results)
        if sort_mode == 1:
            ordered = sorted(results, key=lambda item: float(item.get("similarity") or 0.0), reverse=True)
        elif sort_mode == 2:
            def date_key(item: Dict[str, Any]) -> tuple[int, Any]:
                details = dict(item.get("details") or {})
                value = (
                    details.get("data_encerramento_proposta")
                    or details.get("dataencerramentoproposta")
                    or details.get("dataEncerramentoProposta")
                    or details.get("dataEncerramento")
                )
                parsed = self._parse_date_value(value)
                return (0, parsed) if parsed is not None else (1, datetime.max.date())

            ordered = sorted(results, key=date_key)
        elif sort_mode == 3:
            def value_key(item: Dict[str, Any]) -> float:
                details = dict(item.get("details") or {})
                value = self._to_float(
                    details.get("valor_total_estimado")
                    or details.get("valortotalestimado")
                    or details.get("valorTotalEstimado")
                    or details.get("valor_total_homologado")
                    or details.get("valortotalhomologado")
                    or details.get("valorTotalHomologado")
                    or details.get("valorfinal")
                    or details.get("valorFinal")
                )
                return value if value is not None else 0.0

            ordered = sorted(results, key=value_key, reverse=True)
        else:
            ordered = results

        for index, item in enumerate(ordered, start=1):
            item["rank"] = index
        return ordered

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

    def fetch_edital_items(self, numero_controle_pncp: str, limit: int = 500) -> tuple[List[Dict[str, Any]], str | None]:
        self._load_modules()

        pncp = str(numero_controle_pncp or "").strip()
        if not pncp:
            return [], "Informe o numero_controle_pncp do edital."

        database_error = self._database_configuration_error()
        if database_error:
            return [], database_error

        fetch_items = getattr(self._core, "fetch_itens_contratacao", None)
        if not callable(fetch_items):
            return [], "O modulo de busca nao expoe fetch_itens_contratacao()."

        try:
            raw_items = fetch_items(pncp, limit=int(limit or 500)) or []
        except Exception as exc:
            return [], str(exc)

        items: List[Dict[str, Any]] = []
        for index, raw_item in enumerate(raw_items, start=1):
            if not isinstance(raw_item, dict):
                continue

            quantidade = self._to_float(raw_item.get("quantidade_item"))
            valor_unitario = self._to_float(raw_item.get("valor_unitario_estimado"))
            valor_total = self._to_float(raw_item.get("valor_total_estimado"))
            if valor_total is None and quantidade is not None and valor_unitario is not None:
                valor_total = quantidade * valor_unitario

            items.append({
                "row_number": index,
                "numero_controle_pncp": str(raw_item.get("numero_controle_pncp") or pncp),
                "numero_item": str(raw_item.get("numero_item") or ""),
                "descricao_item": str(raw_item.get("descricao_item") or ""),
                "material_ou_servico": str(raw_item.get("material_ou_servico") or ""),
                "quantidade_item": quantidade,
                "unidade_medida": str(raw_item.get("unidade_medida") or ""),
                "valor_unitario_estimado": valor_unitario,
                "valor_total_estimado": valor_total,
            })

        return items, None

    def fetch_edital_documents(self, numero_controle_pncp: str, limit: int = 200) -> tuple[List[Dict[str, Any]], str | None]:
        self._load_modules()

        pncp = str(numero_controle_pncp or "").strip()
        if not pncp:
            return [], "Informe o numero_controle_pncp do edital."

        try:
            database = importlib.import_module("gvg_database")
        except Exception as exc:
            return [], f"Nao foi possivel carregar o modulo de documentos: {exc}"

        fetch_documents = getattr(database, "fetch_documentos", None)
        if not callable(fetch_documents):
            return [], "O modulo de busca nao expoe fetch_documentos()."

        try:
            raw_documents = fetch_documents(pncp) or []
        except Exception as exc:
            return [], str(exc)

        documents: List[Dict[str, Any]] = []
        for index, raw_document in enumerate(raw_documents[: max(1, int(limit or 200))], start=1):
            if not isinstance(raw_document, dict):
                continue

            documents.append({
                "row_number": index,
                "numero_controle_pncp": pncp,
                "nome": str(raw_document.get("nome") or raw_document.get("titulo") or "Documento"),
                "url": str(raw_document.get("url") or raw_document.get("uri") or ""),
                "tipo": str(raw_document.get("tipo") or raw_document.get("tipoDocumentoNome") or "N/I"),
                "tamanho": raw_document.get("tamanho"),
                "modificacao": str(raw_document.get("modificacao") or raw_document.get("dataPublicacaoPncp") or ""),
                "sequencial": raw_document.get("sequencial"),
                "origem": str(raw_document.get("origem") or "api"),
            })

        return documents, None

    def run(self, request: SearchRequest) -> SearchResponse:
        started_at = time.perf_counter()
        self._load_modules()
        request.where_sql = self._resolve_where_sql(request)

        try:
            database_error = self._database_configuration_error()
            if database_error:
                meta = dict(self._env_info or {})
                meta["db_config_missing"] = self._missing_database_config()
                meta["sql_filter_count"] = len(request.where_sql)
                meta["ui_filters_active"] = has_any_ui_filter(request.ui_filters)
                return SearchResponse(
                    request=request.to_dict(),
                    source="v1.gvg_search_core",
                    elapsed_ms=int((time.perf_counter() - started_at) * 1000),
                    confidence=0.0,
                    result_count=0,
                    preprocessing={},
                    meta=meta,
                    results=[],
                    error=database_error,
                )

            if request.sql_debug:
                self._core.set_sql_debug(True)
            relevance_level = self._coerce_relevance_level(request)
            sort_mode = self._coerce_sort_mode(request)
            min_similarity = self._coerce_min_similarity(request)
            labels = self._search_meta_labels(request)
            approach_key = self._search_approach_key(request)
            preprocessing: Dict[str, Any]
            if not request.query and request.where_sql:
                prepared_query = request.query
                preprocessing = {
                    "enabled": False,
                    "skipped": True,
                    "skip_reason": "filter_only_sql",
                    "search_terms": "",
                    "negative_terms": "",
                    "sql_conditions": list(request.where_sql),
                    "filters": self._preprocessing_filters(request),
                    "preprocessing_version": "sql-only",
                }
                raw_results = self._sql_only_search(request.where_sql, request.limit, request.filter_expired)
                confidence = 1.0 if raw_results else 0.0
                meta = {
                    "filter_route": "sql-only",
                    "sql_filter_count": len(request.where_sql),
                    "ui_filters_active": has_any_ui_filter(request.ui_filters),
                }
                relevance_meta = {"filter_applied": False, "level": relevance_level, "reason": "filter_only_sql"}
                min_similarity = 0.0
            else:
                prepared_query, preprocessing = self._preprocess(request)
                with self._run_lock:
                    previous_relevance = self._get_relevance_level()
                    self._set_relevance_level(relevance_level)
                    try:
                        raw_results, confidence, meta = self._dispatch_search(request, prepared_query)
                        raw_results, relevance_meta = self._apply_relevance_if_needed(
                            request,
                            prepared_query,
                            raw_results,
                            meta,
                        )
                    finally:
                        self._set_relevance_level(previous_relevance)

            raw_results = self._apply_min_similarity(raw_results, min_similarity)
            raw_results = self._sort_results(raw_results, sort_mode)
            items = [self._normalize_result(item) for item in raw_results]

            meta = dict(meta or {})
            meta.update({
                "search": self._search_type_code(self._base_search_type(request)),
                "approach": APPROACH_CODES.get(approach_key, 1),
                "relevance": relevance_level,
                "order": sort_mode,
                "sort_mode": sort_mode,
                "sort_label": SORT_NAMES.get(sort_mode, SORT_NAMES[1]),
                "max_results": int(request.limit or 0),
                "top_categories": int(request.top_categories_limit or 0),
                "top_categories_limit": int(request.top_categories_limit or 0),
                "filter_expired": bool(request.filter_expired),
                "min_similarity": min_similarity,
                "sql_filter_count": len(request.where_sql),
                "ui_filters_active": has_any_ui_filter(request.ui_filters),
                "relevance_filter": relevance_meta,
                "column_config": {
                    "type": labels["type_name"],
                    "approach": labels["approach_name"],
                    "relevance": RELEVANCE_NAMES.get(relevance_level, RELEVANCE_NAMES[1]),
                    "sort": SORT_NAMES.get(sort_mode, SORT_NAMES[1]),
                    "top_categories_count": int(request.top_categories_limit or 0),
                    "max_results": int(request.limit or 0),
                    "min_similarity": min_similarity,
                },
            })

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
