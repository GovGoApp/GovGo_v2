from __future__ import annotations

import os
import json
import datetime as _dt
import re
from decimal import Decimal
from http.cookies import SimpleCookie
from pathlib import Path
from typing import Any
import urllib.error
import urllib.request

from src.backend.search.core.bootstrap import bootstrap_v1_search_environment

BOOTSTRAP_ENV = bootstrap_v1_search_environment()


def _looks_like_placeholder_value(value: str) -> bool:
    normalized = (value or "").strip().strip('"').strip("'").lower()
    return (
        not normalized
        or "sua_chave" in normalized
        or "your_supabase" in normalized
        or normalized.endswith("_aqui")
        or normalized == "placeholder"
    )


def _read_env_file_value(env_file: Path, key: str) -> str:
    if not env_file.exists():
        return ""
    try:
        lines = env_file.read_text(encoding="utf-8", errors="ignore").splitlines()
    except OSError:
        return ""
    prefix = f"{key}="
    for line in lines:
        clean = line.strip()
        if not clean or clean.startswith("#") or not clean.startswith(prefix):
            continue
        return clean.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def _fallback_supabase_value(key: str) -> str:
    search_root = Path(BOOTSTRAP_ENV.get("search_root", ""))
    candidates = (
        search_root / ".env",
        search_root / "supabase_v1.env",
        search_root / "supabase_v0.env",
    )
    for env_file in candidates:
        value = _read_env_file_value(env_file, key)
        if value and not _looks_like_placeholder_value(value):
            return value
    return ""


def _normalize_supabase_env() -> None:
    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    supabase_key = os.getenv("SUPABASE_ANON_KEY", "").strip() or os.getenv("SUPABASE_KEY", "").strip()

    if _looks_like_placeholder_value(supabase_url):
        fallback_url = _fallback_supabase_value("SUPABASE_URL")
        if fallback_url:
            os.environ["SUPABASE_URL"] = fallback_url

    if _looks_like_placeholder_value(supabase_key):
        fallback_key = _fallback_supabase_value("SUPABASE_ANON_KEY") or _fallback_supabase_value("SUPABASE_KEY")
        if fallback_key:
            os.environ["SUPABASE_ANON_KEY"] = fallback_key
            os.environ["SUPABASE_KEY"] = fallback_key
            return

    if not os.getenv("SUPABASE_ANON_KEY") and os.getenv("SUPABASE_KEY"):
        os.environ["SUPABASE_ANON_KEY"] = os.getenv("SUPABASE_KEY", "")
    if not os.getenv("SUPABASE_KEY") and os.getenv("SUPABASE_ANON_KEY"):
        os.environ["SUPABASE_KEY"] = os.getenv("SUPABASE_ANON_KEY", "")


_normalize_supabase_env()

import gvg_auth  # type: ignore  # noqa: E402
import gvg_database  # type: ignore  # noqa: E402
from gvg_ai_utils import generate_contratacao_label  # type: ignore  # noqa: E402
from gvg_search_core import _augment_aliases  # type: ignore  # noqa: E402
import gvg_user  # type: ignore  # noqa: E402


ACCESS_COOKIE = "govgo_access_token"
REFRESH_COOKIE = "govgo_refresh_token"
SESSION_MAX_AGE = 60 * 60 * 24 * 30


class AuthApiError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _looks_like_placeholder(value: str) -> bool:
    return _looks_like_placeholder_value(value)


def ensure_supabase_auth_config() -> None:
    _normalize_supabase_env()
    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    supabase_key = os.getenv("SUPABASE_ANON_KEY", "").strip() or os.getenv("SUPABASE_KEY", "").strip()

    if (
        hasattr(gvg_auth, "SUPABASE_URL")
        and (
            not getattr(gvg_auth, "SUPABASE_URL", None)
            or _looks_like_placeholder(str(getattr(gvg_auth, "SUPABASE_URL", "")))
        )
    ):
        gvg_auth.SUPABASE_URL = supabase_url
    if (
        hasattr(gvg_auth, "SUPABASE_ANON_KEY")
        and (
            not getattr(gvg_auth, "SUPABASE_ANON_KEY", None)
            or _looks_like_placeholder(str(getattr(gvg_auth, "SUPABASE_ANON_KEY", "")))
        )
    ):
        gvg_auth.SUPABASE_ANON_KEY = supabase_key

    if not supabase_url:
        raise AuthApiError("SUPABASE_URL nao esta configurada no v2/.env.", 500)
    if _looks_like_placeholder(supabase_key):
        raise AuthApiError(
            "SUPABASE_KEY/SUPABASE_ANON_KEY ainda nao contem a chave anon/public real do Supabase.",
            500,
        )


def _text(payload: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = payload.get(key)
        if value is not None:
            return str(value).strip()
    return ""


def _friendly_auth_error(message: str) -> str:
    text = str(message or "").strip()
    lower = text.lower()
    if "invalid login credentials" in lower:
        return "E-mail ou senha invalidos."
    if "email not confirmed" in lower:
        return "Confirme seu email antes de entrar."
    if "user already registered" in lower or "already registered" in lower:
        return "Este email ja possui cadastro."
    if "signup disabled" in lower:
        return "Cadastro desabilitado no Supabase."
    return text or "Falha na autenticacao Supabase."


def _supabase_auth_url(path: str, query: str = "") -> str:
    base_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    return f"{base_url}/auth/v1{path}{query}"


def _supabase_key() -> str:
    return os.getenv("SUPABASE_ANON_KEY", "").strip() or os.getenv("SUPABASE_KEY", "").strip()


def _auth_headers(access_token: str = "") -> dict[str, str]:
    key = _supabase_key()
    bearer = access_token or key
    return {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "apikey": key,
        "Authorization": f"Bearer {bearer}",
    }


def _parse_auth_response(raw_body: bytes) -> dict[str, Any]:
    if not raw_body:
        return {}
    try:
        parsed = json.loads(raw_body.decode("utf-8"))
    except Exception:
        return {"message": raw_body.decode("utf-8", errors="ignore")}
    return parsed if isinstance(parsed, dict) else {"data": parsed}


def _supabase_auth_request(
    method: str,
    path: str,
    payload: dict[str, Any] | None = None,
    access_token: str = "",
    query: str = "",
) -> dict[str, Any]:
    ensure_supabase_auth_config()
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        _supabase_auth_url(path, query),
        data=data,
        headers=_auth_headers(access_token),
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return _parse_auth_response(response.read())
    except urllib.error.HTTPError as exc:
        body = _parse_auth_response(exc.read())
        message = (
            body.get("error_description")
            or body.get("msg")
            or body.get("message")
            or body.get("error")
            or str(exc)
        )
        raise AuthApiError(_friendly_auth_error(str(message)), exc.code) from exc
    except urllib.error.URLError as exc:
        raise AuthApiError(f"Nao foi possivel conectar ao Supabase Auth: {exc.reason}", 502) from exc


def _normalize_supabase_user(user: dict[str, Any] | None) -> dict[str, Any] | None:
    if not user:
        return None
    metadata = user.get("user_metadata") or user.get("raw_user_meta_data") or {}
    if not isinstance(metadata, dict):
        metadata = {}
    email = user.get("email")
    return {
        "uid": user.get("id") or user.get("uid"),
        "email": email,
        "name": metadata.get("full_name") or metadata.get("name") or email,
        "phone": metadata.get("phone"),
    }


def _rest_session_from_payload(payload: dict[str, Any]) -> dict[str, Any] | None:
    user = _normalize_supabase_user(payload.get("user"))
    access_token = payload.get("access_token")
    if not user or not access_token:
        return None
    return {
        "user": user,
        "access_token": access_token,
        "refresh_token": payload.get("refresh_token") or "",
    }


def _rest_sign_in(email: str, password: str) -> tuple[bool, dict[str, Any] | None, str]:
    try:
        payload = _supabase_auth_request(
            "POST",
            "/token",
            {"email": email, "password": password},
            query="?grant_type=password",
        )
        session = _rest_session_from_payload(payload)
        if not session:
            return False, None, "Credenciais invalidas ou email nao confirmado."
        return True, session, ""
    except AuthApiError as exc:
        return False, None, exc.message


def _rest_refresh_session(refresh_token: str) -> tuple[bool, dict[str, Any] | None, str]:
    token = str(refresh_token or "").strip()
    if not token:
        return False, None, "Sessao nao encontrada."
    try:
        payload = _supabase_auth_request(
            "POST",
            "/token",
            {"refresh_token": token},
            query="?grant_type=refresh_token",
        )
        session = _rest_session_from_payload(payload)
        if not session:
            return False, None, "Sessao expirada."
        if not session.get("refresh_token"):
            session["refresh_token"] = token
        return True, session, ""
    except AuthApiError as exc:
        return False, None, exc.message


def _rest_sign_up(email: str, password: str, full_name: str, phone: str | None) -> tuple[bool, str | None]:
    try:
        payload = _supabase_auth_request(
            "POST",
            "/signup",
            {
                "email": email,
                "password": password,
                "data": {"full_name": full_name, "phone": phone},
            },
        )
        if payload.get("id") or payload.get("user") or payload.get("email"):
            return True, None
        return False, "Falha ao cadastrar."
    except AuthApiError as exc:
        return False, exc.message


def _rest_verify_otp(email: str, token: str, otp_type: str) -> tuple[bool, dict[str, Any] | None, str]:
    try:
        payload = _supabase_auth_request(
            "POST",
            "/verify",
            {"email": email, "token": token, "type": otp_type},
        )
        session = _rest_session_from_payload(payload)
        if not session:
            return False, None, "Codigo invalido."
        return True, session, ""
    except AuthApiError as exc:
        return False, None, exc.message


def _rest_reset_password_email(email: str) -> tuple[bool, str | None]:
    try:
        _supabase_auth_request("POST", "/recover", {"email": email})
        return True, None
    except AuthApiError as exc:
        return False, exc.message


def _rest_get_user(access_token: str) -> dict[str, Any] | None:
    try:
        payload = _supabase_auth_request("GET", "/user", access_token=access_token)
        return _normalize_supabase_user(payload)
    except AuthApiError:
        return None


def _rest_update_password(new_password: str, access_token: str) -> tuple[bool, dict[str, Any] | None, str]:
    try:
        payload = _supabase_auth_request(
            "PUT",
            "/user",
            {"password": new_password},
            access_token=access_token,
        )
        user = _normalize_supabase_user(payload)
        if not user:
            return False, None, "Nao foi possivel atualizar a senha."
        return True, {"user": user, "access_token": access_token, "refresh_token": ""}, ""
    except AuthApiError as exc:
        return False, None, exc.message


def _rest_sign_out(access_token: str) -> None:
    if not access_token:
        return
    try:
        _supabase_auth_request("POST", "/logout", {}, access_token=access_token)
    except AuthApiError:
        pass


def _cookie_header(name: str, value: str, max_age: int) -> tuple[str, str]:
    cookie = SimpleCookie()
    cookie[name] = value
    cookie[name]["path"] = "/"
    cookie[name]["max-age"] = str(max_age)
    cookie[name]["httponly"] = True
    cookie[name]["samesite"] = "Lax"
    return ("Set-Cookie", cookie.output(header="").strip())


def session_cookie_headers(session: dict[str, Any] | None) -> list[tuple[str, str]]:
    if not session:
        return []

    headers: list[tuple[str, str]] = []
    access_token = str(session.get("access_token") or "").strip()
    refresh_token = str(session.get("refresh_token") or "").strip()
    if access_token:
        headers.append(_cookie_header(ACCESS_COOKIE, access_token, SESSION_MAX_AGE))
    if refresh_token:
        headers.append(_cookie_header(REFRESH_COOKIE, refresh_token, SESSION_MAX_AGE))
    return headers


def clear_session_cookie_headers() -> list[tuple[str, str]]:
    return [
        _cookie_header(ACCESS_COOKIE, "", 0),
        _cookie_header(REFRESH_COOKIE, "", 0),
    ]


def _merge_response_headers(
    headers: list[tuple[str, str]] | None,
    extra_headers: list[tuple[str, str]] | None,
) -> list[tuple[str, str]]:
    return [*(headers or []), *(extra_headers or [])]


def _public_user(user: dict[str, Any] | None) -> dict[str, Any] | None:
    if not user:
        return None
    uid = user.get("uid") or user.get("id")
    email = user.get("email")
    name = user.get("name") or user.get("full_name") or email
    phone = user.get("phone")
    return {
        "uid": uid,
        "email": email,
        "name": name,
        "phone": phone,
    }


def _session_payload(session: dict[str, Any] | None) -> dict[str, Any]:
    user = _public_user((session or {}).get("user"))
    if not user:
        raise AuthApiError("Sessao invalida.", 401)
    return {"ok": True, "user": user}


def login(payload: dict[str, Any]) -> tuple[int, dict[str, Any], list[tuple[str, str]]]:
    email = _text(payload, "email")
    password = _text(payload, "password")
    if not email or not password:
        raise AuthApiError("Informe email e senha.")

    ok, session, error = _rest_sign_in(email, password)
    if not ok:
        raise AuthApiError(error or "Nao foi possivel entrar.", 401)

    return 200, _session_payload(session), session_cookie_headers(session)


def signup(payload: dict[str, Any]) -> tuple[int, dict[str, Any], list[tuple[str, str]]]:
    email = _text(payload, "email")
    password = _text(payload, "password")
    first_name = _text(payload, "first_name", "firstName", "nome")
    last_name = _text(payload, "last_name", "lastName", "sobrenome")
    full_name = _text(payload, "full_name", "fullName", "name")
    phone = _text(payload, "phone", "telefone")

    if not full_name:
        full_name = " ".join(part for part in (first_name, last_name) if part).strip()
    if not email or not password or not full_name:
        raise AuthApiError("Informe nome, email e senha.")

    ok, error = _rest_sign_up(email, password, full_name, phone or None)
    if not ok:
        raise AuthApiError(error or "Nao foi possivel criar a conta.")

    return 200, {
        "ok": True,
        "message": "Cadastro iniciado. Confira o email informado para confirmar sua conta.",
        "email": email,
    }, []


def confirm(payload: dict[str, Any]) -> tuple[int, dict[str, Any], list[tuple[str, str]]]:
    email = _text(payload, "email")
    token = _text(payload, "token", "code")
    otp_type = _text(payload, "type") or "signup"
    if not email or not token:
        raise AuthApiError("Informe email e codigo de confirmacao.")

    ok, session, error = _rest_verify_otp(email, token, otp_type)
    if not ok:
        raise AuthApiError(error or "Codigo de confirmacao invalido.", 401)

    return 200, _session_payload(session), session_cookie_headers(session)


def forgot(payload: dict[str, Any]) -> tuple[int, dict[str, Any], list[tuple[str, str]]]:
    email = _text(payload, "email")
    if not email:
        raise AuthApiError("Informe o email cadastrado.")

    ok, error = _rest_reset_password_email(email)
    if not ok:
        raise AuthApiError(error or "Nao foi possivel enviar a recuperacao.")

    return 200, {
        "ok": True,
        "message": "Enviamos as instrucoes de recuperacao para o email informado.",
    }, []


def reset(
    payload: dict[str, Any],
    access_token: str = "",
    refresh_token: str = "",
) -> tuple[int, dict[str, Any], list[tuple[str, str]]]:
    new_password = _text(payload, "new_password", "newPassword", "password")
    code = _text(payload, "code")
    payload_access_token = _text(payload, "access_token", "accessToken")
    payload_refresh_token = _text(payload, "refresh_token", "refreshToken")
    access_token = payload_access_token or access_token
    refresh_token = payload_refresh_token or refresh_token

    if not new_password:
        raise AuthApiError("Informe a nova senha.")

    if code and not access_token:
        raise AuthApiError("Abra novamente o link de recuperacao completo enviado por email.", 401)
    if not access_token:
        raise AuthApiError("Abra o link de recuperacao enviado por email.", 401)

    ok, updated_session, error = _rest_update_password(new_password, access_token)
    if not ok:
        raise AuthApiError(error or "Nao foi possivel atualizar a senha.")

    return 200, _session_payload(updated_session), session_cookie_headers(updated_session)


def logout(access_token: str = "", refresh_token: str = "") -> tuple[int, dict[str, Any], list[tuple[str, str]]]:
    _rest_sign_out(access_token)
    return 200, {"ok": True}, clear_session_cookie_headers()


def _resolve_authenticated_session(
    access_token: str = "",
    refresh_token: str = "",
) -> tuple[str, dict[str, Any], list[tuple[str, str]]]:
    access_token = str(access_token or "").strip()
    refresh_token = str(refresh_token or "").strip()
    saw_session_cookie = bool(access_token or refresh_token)

    if access_token:
        user = _rest_get_user(access_token)
        public_user = _public_user(user)
        if public_user and public_user.get("uid"):
            gvg_user.set_current_user(public_user)
            return access_token, public_user, []

    if refresh_token:
        ok, session, _error = _rest_refresh_session(refresh_token)
        if ok and session:
            public_user = _public_user(session.get("user"))
            new_access_token = str(session.get("access_token") or "").strip()
            if public_user and public_user.get("uid") and new_access_token:
                gvg_user.set_current_user(public_user)
                return new_access_token, public_user, session_cookie_headers(session)
        if saw_session_cookie:
            raise AuthApiError("Sessao expirada.", 401)

    if access_token:
        raise AuthApiError("Sessao expirada.", 401)
    raise AuthApiError("Sessao nao encontrada.", 401)


def me(access_token: str = "", refresh_token: str = "") -> tuple[int, dict[str, Any], list[tuple[str, str]]]:
    _, public_user, headers = _resolve_authenticated_session(access_token, refresh_token)
    return 200, {"ok": True, "user": public_user}, headers


def _require_authenticated_user(access_token: str) -> dict[str, Any]:
    if not access_token:
        raise AuthApiError("Sessao nao encontrada.", 401)
    user = _rest_get_user(access_token)
    public_user = _public_user(user)
    if not public_user or not public_user.get("uid"):
        raise AuthApiError("Sessao expirada.", 401)
    gvg_user.set_current_user(public_user)
    return public_user


def _date_label(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (_dt.datetime, _dt.date)):
        return value.strftime("%d/%m/%Y")
    text = str(value).strip()
    if not text:
        return ""
    if "/" in text:
        return text
    iso = text[:10]
    try:
        parsed = _dt.date.fromisoformat(iso)
        return parsed.strftime("%d/%m/%Y")
    except Exception:
        return text


def _json_safe(value: Any) -> Any:
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    if isinstance(value, (_dt.datetime, _dt.date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    return value


def _generate_favorite_label(description: str) -> str:
    text = str(description or "").strip()
    if not text:
        return ""
    try:
        return str(generate_contratacao_label(text, feature="favorite_label") or "").strip()
    except Exception:
        words = [part for part in text.replace("\n", " ").split() if part]
        return " ".join(words[:4]).strip()


_SCHEMA_COLUMNS_CACHE: dict[str, set[str]] = {}


def _schema_columns(table: str) -> set[str]:
    table_name = str(table or "").strip()
    if not table_name:
        return set()
    cached = _SCHEMA_COLUMNS_CACHE.get(table_name)
    if cached is not None:
        return set(cached)
    rows = gvg_database.db_fetch_all(
        """
        SELECT column_name
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = %s
        """,
        (table_name,),
        as_dict=True,
        ctx=f"USER.schema:{table_name}",
    ) or []
    cols = {str(row.get("column_name") or "").strip() for row in rows if row}
    _SCHEMA_COLUMNS_CACHE[table_name] = cols
    return set(cols)


SEARCH_TYPE_TO_DB = {
    "semantic": 1,
    "keyword": 2,
    "hybrid": 3,
}
SEARCH_TYPE_FROM_DB = {value: key for key, value in SEARCH_TYPE_TO_DB.items()}
SEARCH_APPROACH_TO_DB = {
    "direct": 1,
    "correspondence": 2,
    "category_filtered": 3,
}
SEARCH_APPROACH_FROM_DB = {value: key for key, value in SEARCH_APPROACH_TO_DB.items()}


def _coerce_int(value: Any, fallback: int) -> int:
    try:
        if value is None or value == "":
            return fallback
        return int(value)
    except Exception:
        return fallback


def _coerce_bool(value: Any, fallback: bool = True) -> bool:
    if isinstance(value, bool):
        return value
    if value is None or value == "":
        return fallback
    text = str(value).strip().lower()
    if text in {"1", "true", "t", "sim", "yes", "y"}:
        return True
    if text in {"0", "false", "f", "nao", "não", "no", "n"}:
        return False
    return fallback


def _coerce_float_or_none(value: Any) -> float | None:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except Exception:
        return None


def _parse_jsonish(value: Any) -> Any:
    if value is None or value == "":
        return None
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return value
    return value


def _first_filled(*values: Any) -> Any:
    for value in values:
        if value is not None and value != "":
            return value
    return ""


def _pick_pncp_id(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (str, int)):
        return str(value).strip()
    if not isinstance(value, dict):
        return ""
    raw = value.get("raw") if isinstance(value.get("raw"), dict) else {}
    details = value.get("details") if isinstance(value.get("details"), dict) else {}
    raw_details = raw.get("details") if isinstance(raw.get("details"), dict) else {}
    candidates = [
        value.get("pncpId"),
        value.get("numero_controle_pncp"),
        value.get("numeroControlePncp"),
        value.get("item_id"),
        value.get("itemId"),
        value.get("id"),
        raw.get("numero_controle_pncp"),
        raw.get("numero_controle"),
        raw.get("id"),
        details.get("numero_controle_pncp"),
        details.get("numero_controle"),
        raw_details.get("numero_controle_pncp"),
        raw_details.get("numero_controle"),
    ]
    for candidate in candidates:
        text = str(candidate or "").strip()
        if text:
            return text
    return ""


def _looks_like_pncp_id(value: str) -> bool:
    return bool(re.match(r"^\d{14}-\d-\d{6}/\d{4}$", str(value or "").strip()))


def _history_filter_summary(filters: Any) -> str:
    if not isinstance(filters, dict):
        return ""
    parts: list[str] = []
    for key, label in (
        ("pncp", "PNCP"),
        ("orgao", "Orgao"),
        ("cnpj", "CNPJ"),
        ("uasg", "UASG"),
        ("municipio", "Municipio"),
    ):
        text = str(filters.get(key) or "").strip()
        if text:
            parts.append(f"{label}: {text}")
    uf = filters.get("uf")
    if isinstance(uf, list) and uf:
        parts.append(f"UF: {', '.join(str(item) for item in uf[:3])}")
    start = str(filters.get("date_start") or filters.get("startDate") or "").strip()
    end = str(filters.get("date_end") or filters.get("endDate") or "").strip()
    if start or end:
        parts.append(f"Periodo: {start or '...'} a {end or '...'}")
    return "; ".join(parts[:3])


def _history_title(text: str, filters: Any) -> str:
    clean = str(text or "").strip()
    if clean:
        return clean[:90]
    summary = _history_filter_summary(filters)
    return summary[:90] if summary else "Busca por filtros"


def _db_search_type(value: Any) -> int:
    text = str(value or "").strip()
    if text.isdigit():
        return _coerce_int(text, 1)
    return SEARCH_TYPE_TO_DB.get(text, 1)


def _db_search_approach(value: Any) -> int:
    text = str(value or "").strip()
    if text.isdigit():
        return _coerce_int(text, 1)
    return SEARCH_APPROACH_TO_DB.get(text, 1)


def _normalize_history_config(row: dict[str, Any]) -> dict[str, Any]:
    search_type = _coerce_int(row.get("search_type"), 1)
    search_approach = _coerce_int(row.get("search_approach"), 1)
    filters = _parse_jsonish(row.get("filters")) or {}
    if not isinstance(filters, dict):
        filters = {}
    return {
        "query": str(row.get("text") or ""),
        "searchType": SEARCH_TYPE_FROM_DB.get(search_type, "semantic"),
        "searchApproach": SEARCH_APPROACH_FROM_DB.get(search_approach, "direct"),
        "relevanceLevel": _coerce_int(row.get("relevance_level"), 1),
        "sortMode": _coerce_int(row.get("sort_mode"), 1),
        "limit": _coerce_int(row.get("max_results"), 30),
        "topCategoriesLimit": _coerce_int(row.get("top_categories_count"), 10),
        "filterExpired": _coerce_bool(row.get("filter_expired"), True),
        "uiFilters": filters,
    }


def _normalize_history_prompt(row: dict[str, Any]) -> dict[str, Any]:
    prompt_id = row.get("id")
    text = str(row.get("text") or "").strip()
    filters = _parse_jsonish(row.get("filters")) or {}
    title = str(row.get("title") or "").strip() or _history_title(text, filters)
    result_count = _coerce_int(row.get("result_count"), 0)
    return {
        "id": prompt_id,
        "promptId": prompt_id,
        "title": title,
        "text": text,
        "query": text,
        "createdAt": _json_safe(row.get("created_at")),
        "resultCount": result_count,
        "hits": result_count,
        "config": _normalize_history_config(row),
        "filters": filters if isinstance(filters, dict) else {},
        "raw": _json_safe(row),
    }


def _fetch_history_for_user(uid: str, limit: int = 50) -> list[dict[str, Any]]:
    prompt_cols = _schema_columns("user_prompts")
    has_active = "active" in prompt_cols
    has_filters = "filters" in prompt_cols
    has_preproc = "preproc_output" in prompt_cols
    select_cols = [
        "up.id",
        "up.created_at",
        "up.title",
        "up.text",
        "up.search_type",
        "up.search_approach",
        "up.relevance_level",
        "up.sort_mode",
        "up.max_results",
        "up.top_categories_count",
        "up.filter_expired",
    ]
    if has_filters:
        select_cols.append("up.filters")
    if has_preproc:
        select_cols.append("up.preproc_output")
    where = ["up.user_id = %s", "up.text IS NOT NULL"]
    if has_active:
        where.append("COALESCE(up.active, true) = true")
    rows = gvg_database.db_fetch_all(
        f"""
        SELECT {', '.join(select_cols)}, COALESCE(rc.result_count, 0) AS result_count
          FROM public.user_prompts up
          LEFT JOIN (
                SELECT user_id, prompt_id, COUNT(*) AS result_count
                  FROM public.user_results
                 WHERE user_id = %s
                 GROUP BY user_id, prompt_id
          ) rc
            ON rc.user_id = up.user_id
           AND rc.prompt_id = up.id
         WHERE {' AND '.join(where)}
         ORDER BY up.created_at DESC NULLS LAST, up.id DESC
         LIMIT %s
        """,
        (uid, uid, limit),
        as_dict=True,
        ctx="USER.history:list",
    ) or []
    return [dict(row) for row in rows if row]


def _delete_existing_history_prompt(uid: str, text: str) -> None:
    old_rows = gvg_database.db_fetch_all(
        "SELECT id FROM public.user_prompts WHERE user_id = %s AND text = %s",
        (uid, text),
        as_dict=True,
        ctx="USER.history:find_duplicates",
    ) or []
    old_ids = [row.get("id") for row in old_rows if row and row.get("id") is not None]
    if old_ids:
        placeholders = ",".join(["%s"] * len(old_ids))
        gvg_database.db_execute(
            f"DELETE FROM public.user_results WHERE user_id = %s AND prompt_id IN ({placeholders})",
            (uid, *old_ids),
            ctx="USER.history:delete_old_results",
        )
    gvg_database.db_execute(
        "DELETE FROM public.user_prompts WHERE user_id = %s AND text = %s",
        (uid, text),
        ctx="USER.history:delete_old_prompts",
    )


def _insert_history_prompt(uid: str, payload: dict[str, Any]) -> int | None:
    prompt_cols = _schema_columns("user_prompts")
    request = payload.get("request") if isinstance(payload.get("request"), dict) else {}
    config = payload.get("config") if isinstance(payload.get("config"), dict) else {}
    filters = (
        payload.get("filters")
        if isinstance(payload.get("filters"), dict)
        else config.get("uiFilters")
        if isinstance(config.get("uiFilters"), dict)
        else request.get("ui_filters")
        if isinstance(request.get("ui_filters"), dict)
        else {}
    )
    text = _text(payload, "text", "query") or str(request.get("query") or config.get("query") or "").strip()
    if not text:
        text = _history_title("", filters)
    title = _text(payload, "title") or _history_title(text, filters)
    search_type = _db_search_type(
        config.get("searchType")
        or request.get("search_type")
        or payload.get("search_type")
    )
    search_approach = _db_search_approach(
        config.get("searchApproach")
        or request.get("search_approach")
        or ("category_filtered" if request.get("search_type") == "category_filtered" else None)
        or ("correspondence" if request.get("search_type") == "correspondence" else None)
        or "direct"
    )
    relevance_level = _coerce_int(config.get("relevanceLevel") or request.get("relevance_level"), 1)
    sort_mode = _coerce_int(config.get("sortMode") or request.get("sort_mode"), 1)
    max_results = _coerce_int(config.get("limit") or request.get("limit"), 30)
    top_categories = _coerce_int(config.get("topCategoriesLimit") or request.get("top_categories_limit"), 10)
    filter_expired = _coerce_bool(config.get("filterExpired") if "filterExpired" in config else request.get("filter_expired"), True)
    preprocessing = payload.get("preprocessing") if isinstance(payload.get("preprocessing"), dict) else {}

    _delete_existing_history_prompt(uid, text)

    insert_cols = ["user_id", "title", "text"]
    placeholders = ["%s", "%s", "%s"]
    values: list[Any] = [uid, title, text]
    optional_values = {
        "active": True,
        "search_type": search_type,
        "search_approach": search_approach,
        "relevance_level": relevance_level,
        "sort_mode": sort_mode,
        "max_results": max_results,
        "top_categories_count": top_categories,
        "filter_expired": filter_expired,
    }
    for column, value in optional_values.items():
        if column in prompt_cols:
            insert_cols.append(column)
            placeholders.append("%s")
            values.append(value)
    if "filters" in prompt_cols:
        insert_cols.append("filters")
        placeholders.append("%s::jsonb")
        values.append(json.dumps(filters or {}, ensure_ascii=False))
    if "preproc_output" in prompt_cols:
        insert_cols.append("preproc_output")
        placeholders.append("%s::jsonb")
        values.append(json.dumps(preprocessing or {}, ensure_ascii=False))

    row = gvg_database.db_execute_returning_one(
        f"INSERT INTO public.user_prompts ({', '.join(insert_cols)}) VALUES ({', '.join(placeholders)}) RETURNING id",
        tuple(values),
        as_dict=True,
        ctx="USER.history:insert_prompt",
    )
    return int(row.get("id")) if row and row.get("id") is not None else None


def _history_result_tuple(uid: str, prompt_id: int, item: dict[str, Any], index: int) -> tuple[Any, ...] | None:
    pncp_id = _pick_pncp_id(item)
    if not pncp_id or not _looks_like_pncp_id(pncp_id):
        return None
    raw = item.get("raw") if isinstance(item.get("raw"), dict) else {}
    details = item.get("details") if isinstance(item.get("details"), dict) else {}
    raw_details = raw.get("details") if isinstance(raw.get("details"), dict) else {}
    rank = _coerce_int(item.get("rank") or raw.get("rank") or raw_details.get("rank"), index + 1)
    similarity = _coerce_float_or_none(
        _first_filled(item.get("similarity"), item.get("similarityRatio"), raw.get("similarity"), raw_details.get("similarity"))
    )
    valor = _coerce_float_or_none(
        _first_filled(
            item.get("estimated_value"),
            item.get("estimatedValue"),
            details.get("valor_total_estimado"),
            details.get("valor_total_homologado"),
            raw_details.get("valor_total_estimado"),
            raw_details.get("valor_total_homologado"),
        )
    )
    closing_date = _first_filled(
        item.get("closing_date"),
        item.get("closingDate"),
        details.get("data_encerramento_proposta"),
        raw_details.get("data_encerramento_proposta"),
    )
    return (uid, prompt_id, pncp_id, rank, similarity, valor, str(closing_date or ""))


def _insert_history_results(uid: str, prompt_id: int, results: list[Any]) -> int:
    rows: list[tuple[Any, ...]] = []
    for index, item in enumerate(results[:1000] if isinstance(results, list) else []):
        if not isinstance(item, dict):
            continue
        row = _history_result_tuple(uid, prompt_id, item, index)
        if row:
            rows.append(row)
    if not rows:
        return 0
    affected = gvg_database.db_execute_many(
        """
        INSERT INTO public.user_results
            (user_id, prompt_id, numero_controle_pncp, rank, similarity, valor, data_encerramento_proposta)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        rows,
        ctx="USER.history:insert_results",
    )
    return int(affected or 0)


def _fetch_history_prompt(uid: str, prompt_id: int) -> dict[str, Any] | None:
    prompt_cols = _schema_columns("user_prompts")
    has_active = "active" in prompt_cols
    has_filters = "filters" in prompt_cols
    has_preproc = "preproc_output" in prompt_cols
    select_cols = [
        "up.id",
        "up.created_at",
        "up.title",
        "up.text",
        "up.search_type",
        "up.search_approach",
        "up.relevance_level",
        "up.sort_mode",
        "up.max_results",
        "up.top_categories_count",
        "up.filter_expired",
    ]
    if has_filters:
        select_cols.append("up.filters")
    if has_preproc:
        select_cols.append("up.preproc_output")
    where = ["up.user_id = %s", "up.id = %s"]
    if has_active:
        where.append("COALESCE(up.active, true) = true")
    row = gvg_database.db_fetch_one(
        f"""
        SELECT {', '.join(select_cols)}, COUNT(ur.id) AS result_count
          FROM public.user_prompts up
          LEFT JOIN public.user_results ur
            ON ur.user_id = up.user_id
           AND ur.prompt_id = up.id
         WHERE {' AND '.join(where)}
         GROUP BY {', '.join(select_cols)}
         LIMIT 1
        """,
        (uid, prompt_id),
        as_dict=True,
        ctx="USER.history:prompt",
    )
    return dict(row) if row else None


def _normalize_history_result(row: dict[str, Any]) -> dict[str, Any]:
    details = {
        key: value
        for key, value in dict(row).items()
        if not str(key).startswith("history_")
    }
    try:
        _augment_aliases(details)
    except Exception:
        pass
    pncp_id = str(row.get("history_pncp") or details.get("numero_controle_pncp") or "").strip()
    rank = _coerce_int(row.get("history_rank"), 0)
    similarity = _coerce_float_or_none(row.get("history_similarity"))
    estimated_value = _first_filled(
        row.get("history_valor"),
        details.get("valor_total_estimado"),
        details.get("valor_total_homologado"),
    )
    closing_date = _first_filled(
        row.get("history_data_encerramento"),
        details.get("data_encerramento_proposta"),
    )
    latitude = _coerce_float_or_none(row.get("history_lat"))
    longitude = _coerce_float_or_none(row.get("history_lon"))
    municipality_code = str(
        row.get("history_municipality_code")
        or details.get("unidade_orgao_codigo_ibge")
        or ""
    ).strip()
    if latitude is not None:
        details["lat"] = latitude
        details["latitude"] = latitude
    if longitude is not None:
        details["lon"] = longitude
        details["longitude"] = longitude
    if municipality_code:
        details["ibge_municipio"] = municipality_code
    safe_details = _json_safe(details)
    return {
        "item_id": pncp_id,
        "rank": rank,
        "similarity": similarity if similarity is not None else 0,
        "title": str(details.get("objeto_compra") or pncp_id),
        "organization": str(details.get("orgao_entidade_razao_social") or ""),
        "municipality": str(details.get("unidade_orgao_municipio_nome") or ""),
        "uf": str(details.get("unidade_orgao_uf_sigla") or ""),
        "modality": str(details.get("modalidade_nome") or ""),
        "closing_date": _json_safe(closing_date),
        "estimated_value": _json_safe(estimated_value),
        "municipality_code": municipality_code,
        "latitude": latitude,
        "longitude": longitude,
        "raw": {
            "id": pncp_id,
            "numero_controle": pncp_id,
            "rank": rank,
            "similarity": similarity if similarity is not None else 0,
            "source": "history",
            "municipality_code": municipality_code,
            "latitude": latitude,
            "longitude": longitude,
            "details": safe_details,
        },
        "details": safe_details,
    }


def _fetch_history_results(uid: str, prompt_id: int, limit: int = 500) -> list[dict[str, Any]]:
    rows = gvg_database.db_fetch_all(
        """
        SELECT
            ur.numero_controle_pncp AS history_pncp,
            ur.rank AS history_rank,
            ur.similarity AS history_similarity,
            ur.valor AS history_valor,
            ur.data_encerramento_proposta AS history_data_encerramento,
            m.municipio::text AS history_municipality_code,
            m.lat AS history_lat,
            m.lon AS history_lon,
            c.*
          FROM public.user_results ur
          JOIN public.contratacao c
            ON c.numero_controle_pncp = ur.numero_controle_pncp
          LEFT JOIN public.municipios m
            ON m.municipio::text = c.unidade_orgao_codigo_ibge
         WHERE ur.user_id = %s
           AND ur.prompt_id = %s
         ORDER BY ur.rank ASC NULLS LAST, ur.id ASC
         LIMIT %s
        """,
        (uid, prompt_id, max(1, min(int(limit or 500), 1000))),
        as_dict=True,
        ctx="USER.history:results",
    ) or []
    return [_normalize_history_result(dict(row)) for row in rows if row]


def list_history(access_token: str = "", limit: int = 50) -> tuple[int, dict[str, Any], list[tuple[str, str]]]:
    public_user = _require_authenticated_user(access_token)
    uid = str(public_user.get("uid") or "").strip()
    safe_limit = max(1, min(int(limit or 50), 200))
    rows = _fetch_history_for_user(uid, safe_limit)
    history = [_normalize_history_prompt(row) for row in rows if isinstance(row, dict)]
    return 200, {"ok": True, "history": history, "count": len(history)}, []


def save_history(
    payload: dict[str, Any],
    access_token: str = "",
) -> tuple[int, dict[str, Any], list[tuple[str, str]]]:
    public_user = _require_authenticated_user(access_token)
    uid = str(public_user.get("uid") or "").strip()
    results = payload.get("results")
    if not isinstance(results, list):
        response = payload.get("response") if isinstance(payload.get("response"), dict) else {}
        results = response.get("results") if isinstance(response.get("results"), list) else []
    prompt_id = _insert_history_prompt(uid, payload)
    if not prompt_id:
        raise AuthApiError("Nao foi possivel salvar a busca no historico.", 400)
    inserted = _insert_history_results(uid, prompt_id, results)
    status, response, headers = list_history(access_token)
    response["saved"] = prompt_id
    response["resultCount"] = inserted
    return status, response, headers


def get_history_detail(
    payload: dict[str, Any],
    access_token: str = "",
) -> tuple[int, dict[str, Any], list[tuple[str, str]]]:
    public_user = _require_authenticated_user(access_token)
    uid = str(public_user.get("uid") or "").strip()
    prompt_id = _coerce_int(_text(payload, "prompt_id", "promptId", "id"), 0)
    if not prompt_id:
        raise AuthApiError("Informe o id do historico.")
    prompt_row = _fetch_history_prompt(uid, prompt_id)
    if not prompt_row:
        raise AuthApiError("Historico nao encontrado para este usuario.", 404)
    history = _normalize_history_prompt(prompt_row)
    limit = _coerce_int(_text(payload, "limit"), 500)
    results = _fetch_history_results(uid, prompt_id, limit=limit)
    response = {
        "request": {
            "query": history.get("query") or "",
            "history_id": prompt_id,
            "config": history.get("config") or {},
        },
        "source": "v2.user_history",
        "elapsed_ms": 0,
        "confidence": 0.0,
        "result_count": len(results),
        "preprocessing": _parse_jsonish(prompt_row.get("preproc_output")) or {},
        "meta": {"history_id": prompt_id},
        "results": results,
        "error": "",
    }
    return 200, {"ok": True, "history": history, "response": response, "results": results}, []


def remove_history(
    prompt_id: str,
    access_token: str = "",
) -> tuple[int, dict[str, Any], list[tuple[str, str]]]:
    public_user = _require_authenticated_user(access_token)
    uid = str(public_user.get("uid") or "").strip()
    safe_prompt_id = _coerce_int(prompt_id, 0)
    if not safe_prompt_id:
        raise AuthApiError("Informe o id do historico.")
    prompt_cols = _schema_columns("user_prompts")
    if "active" in prompt_cols:
        affected = gvg_database.db_execute(
            """
            UPDATE public.user_prompts
               SET active = false
             WHERE user_id = %s
               AND id = %s
               AND COALESCE(active, true) = true
            """,
            (uid, safe_prompt_id),
            ctx="USER.history:soft_delete",
        )
    else:
        gvg_database.db_execute(
            "DELETE FROM public.user_results WHERE user_id = %s AND prompt_id = %s",
            (uid, safe_prompt_id),
            ctx="USER.history:delete_results",
        )
        affected = gvg_database.db_execute(
            "DELETE FROM public.user_prompts WHERE user_id = %s AND id = %s",
            (uid, safe_prompt_id),
            ctx="USER.history:delete_prompt",
        )
    if not affected:
        raise AuthApiError("Historico nao encontrado para remover.", 404)
    status, response, headers = list_history(access_token)
    response["removed"] = safe_prompt_id
    return status, response, headers


def _favorite_label(item: dict[str, Any]) -> str:
    return (
        str(item.get("rotulo") or "").strip()
        or str(item.get("objeto_compra") or "").strip()
        or str(item.get("numero_controle_pncp") or "").strip()
    )


def _normalize_favorite(item: dict[str, Any]) -> dict[str, Any]:
    pncp_id = str(item.get("numero_controle_pncp") or "").strip()
    object_text = str(item.get("objeto_compra") or "").strip()
    summary = str(item.get("rotulo") or "").strip()
    if not summary:
        summary = _favorite_label(item)
    organization = str(item.get("orgao_entidade_razao_social") or "").strip()
    municipality = str(item.get("unidade_orgao_municipio_nome") or "").strip()
    uf = str(item.get("unidade_orgao_uf_sigla") or "").strip()
    closing_label = _date_label(item.get("data_encerramento_proposta"))
    return {
        "id": pncp_id,
        "pncpId": pncp_id,
        "numero_controle_pncp": pncp_id,
        "title": summary,
        "summary": summary,
        "objectSummary": summary,
        "objectFull": object_text,
        "objeto": object_text,
        "objeto_compra": object_text,
        "rotulo": item.get("rotulo") or "",
        "organization": organization,
        "org": organization,
        "municipality": municipality,
        "mun": municipality,
        "uf": uf,
        "closingDate": _json_safe(item.get("data_encerramento_proposta") or ""),
        "closingDateLabel": closing_label,
        "date": closing_label,
        "raw": _json_safe(item),
    }


def _fetch_bookmark_row(pncp_id: str, uid: str) -> dict[str, Any] | None:
    row = gvg_database.db_fetch_one(
        """
        SELECT id, numero_controle_pncp, rotulo, active
          FROM public.user_bookmarks
         WHERE user_id = %s
           AND numero_controle_pncp = %s
           AND COALESCE(active, true) = true
         LIMIT 1
        """,
        (uid, pncp_id),
        as_dict=True,
        ctx="USER.favorite_detail:bookmark",
    )
    return dict(row) if row else None


def _fetch_contratacao_details(pncp_id: str) -> dict[str, Any] | None:
    row = gvg_database.db_fetch_one(
        "SELECT * FROM public.contratacao WHERE numero_controle_pncp = %s LIMIT 1",
        (pncp_id,),
        as_dict=True,
        ctx="USER.favorite_detail:contratacao",
    )
    if not row:
        return None
    details = dict(row)
    try:
        _augment_aliases(details)
    except Exception:
        pass
    return details


def _fetch_favorites_for_user(uid: str, limit: int = 200) -> list[dict[str, Any]]:
    rows = gvg_database.db_fetch_all(
        """
        SELECT
            ub.id,
            ub.created_at,
            ub.numero_controle_pncp,
            ub.rotulo,
            ub.active,
            c.objeto_compra,
            c.orgao_entidade_razao_social,
            c.unidade_orgao_municipio_nome,
            c.unidade_orgao_uf_sigla,
            c.data_encerramento_proposta
          FROM public.user_bookmarks ub
          JOIN public.contratacao c
            ON c.numero_controle_pncp = ub.numero_controle_pncp
         WHERE ub.user_id = %s
           AND COALESCE(ub.active, true) = true
         ORDER BY ub.created_at DESC NULLS LAST, ub.id DESC
         LIMIT %s
        """,
        (uid, limit),
        as_dict=True,
        ctx="USER.favorites:list",
    ) or []
    return [dict(row) for row in rows if row]


def _upsert_favorite_bookmark(uid: str, pncp_id: str, rotulo: str = "") -> dict[str, Any] | None:
    row = gvg_database.db_execute_returning_one(
        """
        INSERT INTO public.user_bookmarks (user_id, numero_controle_pncp, rotulo, active)
        VALUES (%s, %s, NULLIF(%s, ''), true)
        ON CONFLICT (user_id, numero_controle_pncp)
        DO UPDATE SET
            active = true,
            created_at = now(),
            rotulo = COALESCE(NULLIF(EXCLUDED.rotulo, ''), public.user_bookmarks.rotulo)
        RETURNING id, created_at, user_id, numero_controle_pncp, rotulo, active
        """,
        (uid, pncp_id, rotulo or ""),
        as_dict=True,
        ctx="USER.favorites:upsert",
    )
    return dict(row) if row else None


def _soft_delete_favorite_bookmark(uid: str, pncp_id: str) -> bool:
    affected = gvg_database.db_execute(
        """
        UPDATE public.user_bookmarks
           SET active = false
         WHERE user_id = %s
           AND numero_controle_pncp = %s
           AND COALESCE(active, true) = true
        """,
        (uid, pncp_id),
        ctx="USER.favorites:soft_delete",
    )
    return affected > 0


def _maybe_update_missing_rotulo(uid: str, pncp_id: str, rotulo: str) -> None:
    label = str(rotulo or "").strip()
    if not label:
        return
    try:
        gvg_database.db_execute(
            """
            UPDATE public.user_bookmarks
               SET rotulo = %s
             WHERE user_id = %s
               AND numero_controle_pncp = %s
               AND COALESCE(active, true) = true
               AND (rotulo IS NULL OR btrim(rotulo) = '')
            """,
            (label, uid, pncp_id),
            ctx="USER.favorite_detail:update_rotulo",
        )
    except Exception:
        pass


def _favorite_rotulo_needs_generation(rotulo: str, description: str) -> bool:
    label = str(rotulo or "").strip()
    text = str(description or "").strip()
    if not label:
        return True
    if text and label.casefold() == text.casefold():
        return True
    return len(label) > 80


def _update_favorite_rotulo(uid: str, pncp_id: str, rotulo: str) -> None:
    label = str(rotulo or "").strip()
    if not label:
        return
    try:
        gvg_database.db_execute(
            """
            UPDATE public.user_bookmarks
               SET rotulo = %s
             WHERE user_id = %s
               AND numero_controle_pncp = %s
               AND COALESCE(active, true) = true
            """,
            (label, uid, pncp_id),
            ctx="USER.favorites:update_rotulo",
        )
    except Exception:
        pass


def _ensure_favorite_row_rotulo(uid: str, row: dict[str, Any]) -> dict[str, Any]:
    item = dict(row)
    pncp_id = str(item.get("numero_controle_pncp") or "").strip()
    description = str(item.get("objeto_compra") or "").strip()
    rotulo = str(item.get("rotulo") or "").strip()
    if not pncp_id or not description or not _favorite_rotulo_needs_generation(rotulo, description):
        return item
    label = _generate_favorite_label(description)
    if label:
        item["rotulo"] = label
        _update_favorite_rotulo(uid, pncp_id, label)
    return item


def _normalize_favorite_edital(details: dict[str, Any], rotulo: str = "") -> dict[str, Any]:
    pncp_id = str(details.get("numero_controle_pncp") or "").strip()
    title = str(details.get("objeto_compra") or rotulo or pncp_id).strip()
    organization = str(details.get("orgao_entidade_razao_social") or "").strip()
    municipality = str(details.get("unidade_orgao_municipio_nome") or "").strip()
    uf = str(details.get("unidade_orgao_uf_sigla") or "").strip()
    modality = str(details.get("modalidade_nome") or "").strip()
    closing_date = str(details.get("data_encerramento_proposta") or "").strip()
    estimated_value = details.get("valor_total_estimado")
    if estimated_value in (None, ""):
        estimated_value = details.get("valor_total_homologado")
    safe_details = _json_safe(details)
    return {
        "item_id": pncp_id,
        "rank": None,
        "similarity": 0,
        "title": title,
        "organization": organization,
        "municipality": municipality,
        "uf": uf,
        "modality": modality,
        "closing_date": closing_date,
        "estimated_value": _json_safe(estimated_value),
        "municipality_code": str(details.get("unidade_orgao_codigo_ibge") or ""),
        "raw": {
            "id": pncp_id,
            "numero_controle": pncp_id,
            "rank": None,
            "similarity": 0,
            "source": "favorite",
            "details": safe_details,
        },
        "details": safe_details,
        "favorite": True,
        "favoriteLabel": rotulo,
    }


def list_favorites(access_token: str = "", limit: int = 200) -> tuple[int, dict[str, Any], list[tuple[str, str]]]:
    public_user = _require_authenticated_user(access_token)
    uid = str(public_user.get("uid") or "").strip()
    safe_limit = max(1, min(int(limit or 200), 500))
    rows = _fetch_favorites_for_user(uid, limit=safe_limit)
    rows = [_ensure_favorite_row_rotulo(uid, row) for row in rows if isinstance(row, dict)]
    favorites = [_normalize_favorite(row) for row in rows if isinstance(row, dict)]
    return 200, {"ok": True, "favorites": favorites, "count": len(favorites)}, []


def add_favorite(
    payload: dict[str, Any],
    access_token: str = "",
) -> tuple[int, dict[str, Any], list[tuple[str, str]]]:
    public_user = _require_authenticated_user(access_token)
    uid = str(public_user.get("uid") or "").strip()
    pncp_id = _text(payload, "numero_controle_pncp", "pncp_id", "pncpId", "pncp")
    if not pncp_id:
        raise AuthApiError("Informe o PNCP do edital favorito.")
    rotulo = _text(payload, "rotulo", "label") or ""
    description = _text(payload, "objeto", "objeto_compra", "objectFull", "title")
    details = _fetch_contratacao_details(pncp_id)
    if not details:
        raise AuthApiError("Edital nao encontrado na base para salvar favorito.", 404)
    if not description:
        description = str(details.get("objeto_compra") or "")
    if not rotulo:
        rotulo = _generate_favorite_label(description)
    saved = _upsert_favorite_bookmark(uid, pncp_id, rotulo)
    if not saved:
        raise AuthApiError("Nao foi possivel salvar o favorito. Verifique limite ou PNCP.", 400)
    status, response, headers = list_favorites(access_token)
    response["saved"] = pncp_id
    return status, response, headers


def remove_favorite(
    pncp_id: str,
    access_token: str = "",
) -> tuple[int, dict[str, Any], list[tuple[str, str]]]:
    public_user = _require_authenticated_user(access_token)
    uid = str(public_user.get("uid") or "").strip()
    pncp_id = str(pncp_id or "").strip()
    if not pncp_id:
        raise AuthApiError("Informe o PNCP do favorito.")
    ok = _soft_delete_favorite_bookmark(uid, pncp_id)
    if not ok:
        raise AuthApiError("Nao foi possivel remover o favorito.", 400)
    status, response, headers = list_favorites(access_token)
    response["removed"] = pncp_id
    return status, response, headers


def get_favorite_detail(
    payload: dict[str, Any],
    access_token: str = "",
) -> tuple[int, dict[str, Any], list[tuple[str, str]]]:
    public_user = _require_authenticated_user(access_token)
    uid = str(public_user.get("uid") or "").strip()
    pncp_id = _text(payload, "numero_controle_pncp", "pncp_id", "pncpId", "pncp")
    if not pncp_id:
        raise AuthApiError("Informe o PNCP do favorito.")

    bookmark = _fetch_bookmark_row(pncp_id, uid)
    if not bookmark:
        raise AuthApiError("Favorito nao encontrado para este usuario.", 404)

    details = _fetch_contratacao_details(pncp_id)
    if not details:
        raise AuthApiError("Edital favorito nao encontrado na base.", 404)

    rotulo = str(bookmark.get("rotulo") or "").strip()
    if not rotulo:
        rotulo = _generate_favorite_label(str(details.get("objeto_compra") or ""))
        _maybe_update_missing_rotulo(uid, pncp_id, rotulo)
        bookmark["rotulo"] = rotulo

    favorite = _normalize_favorite({
        **details,
        "rotulo": rotulo,
        "numero_controle_pncp": pncp_id,
    })
    edital = _normalize_favorite_edital(details, rotulo=rotulo)
    return 200, {"ok": True, "favorite": favorite, "edital": edital}, []


def handle_auth_route(
    route: str,
    method: str,
    payload: dict[str, Any] | None = None,
    cookies: dict[str, str] | None = None,
) -> tuple[int, dict[str, Any], list[tuple[str, str]]]:
    payload = payload or {}
    cookies = cookies or {}
    access_token = cookies.get(ACCESS_COOKIE, "")
    refresh_token = cookies.get(REFRESH_COOKIE, "")

    if not (route == "/api/auth/logout" and method == "POST"):
        ensure_supabase_auth_config()

    if route == "/api/auth/me" and method == "GET":
        return me(access_token, refresh_token)
    if route == "/api/auth/login" and method == "POST":
        return login(payload)
    if route == "/api/auth/signup" and method == "POST":
        return signup(payload)
    if route == "/api/auth/confirm" and method == "POST":
        return confirm(payload)
    if route == "/api/auth/forgot" and method == "POST":
        return forgot(payload)
    if route == "/api/auth/reset" and method == "POST":
        return reset(payload, access_token, refresh_token)
    if route == "/api/auth/logout" and method == "POST":
        return logout(access_token, refresh_token)

    raise AuthApiError("Endpoint de auth nao encontrado.", 404)


def handle_user_route(
    route: str,
    method: str,
    payload: dict[str, Any] | None = None,
    cookies: dict[str, str] | None = None,
    path_value: str = "",
) -> tuple[int, dict[str, Any], list[tuple[str, str]]]:
    payload = payload or {}
    cookies = cookies or {}
    access_token = cookies.get(ACCESS_COOKIE, "")
    refresh_token = cookies.get(REFRESH_COOKIE, "")
    access_token, _, session_headers = _resolve_authenticated_session(access_token, refresh_token)

    if route == "/api/user/favorites" and method == "GET":
        limit_text = _text(payload, "limit")
        limit = int(limit_text) if limit_text.isdigit() else 200
        status, response, headers = list_favorites(access_token, limit=limit)
        return status, response, _merge_response_headers(headers, session_headers)
    if route == "/api/user/favorites" and method == "POST":
        status, response, headers = add_favorite(payload, access_token)
        return status, response, _merge_response_headers(headers, session_headers)
    if route == "/api/user/favorite-detail" and method == "GET":
        status, response, headers = get_favorite_detail(payload, access_token)
        return status, response, _merge_response_headers(headers, session_headers)
    if route.startswith("/api/user/favorites/") and method == "DELETE":
        status, response, headers = remove_favorite(path_value, access_token)
        return status, response, _merge_response_headers(headers, session_headers)
    if route == "/api/user/history" and method == "GET":
        limit_text = _text(payload, "limit")
        limit = int(limit_text) if limit_text.isdigit() else 50
        status, response, headers = list_history(access_token, limit=limit)
        return status, response, _merge_response_headers(headers, session_headers)
    if route == "/api/user/history" and method == "POST":
        status, response, headers = save_history(payload, access_token)
        return status, response, _merge_response_headers(headers, session_headers)
    if route == "/api/user/history-detail" and method == "GET":
        status, response, headers = get_history_detail(payload, access_token)
        return status, response, _merge_response_headers(headers, session_headers)
    if route.startswith("/api/user/history/") and method == "DELETE":
        status, response, headers = remove_history(path_value, access_token)
        return status, response, _merge_response_headers(headers, session_headers)

    raise AuthApiError("Endpoint de usuario nao encontrado.", 404)
