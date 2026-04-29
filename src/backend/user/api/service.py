from __future__ import annotations

import os
import json
import datetime as _dt
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


def me(access_token: str = "") -> tuple[int, dict[str, Any], list[tuple[str, str]]]:
    if not access_token:
        raise AuthApiError("Sessao nao encontrada.", 401)
    user = _rest_get_user(access_token)
    if not user:
        raise AuthApiError("Sessao expirada.", 401)
    return 200, {"ok": True, "user": _public_user(user)}, []


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
        return me(access_token)
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

    if route == "/api/user/favorites" and method == "GET":
        limit_text = _text(payload, "limit")
        limit = int(limit_text) if limit_text.isdigit() else 200
        return list_favorites(access_token, limit=limit)
    if route == "/api/user/favorites" and method == "POST":
        return add_favorite(payload, access_token)
    if route == "/api/user/favorite-detail" and method == "GET":
        return get_favorite_detail(payload, access_token)
    if route.startswith("/api/user/favorites/") and method == "DELETE":
        return remove_favorite(path_value, access_token)

    raise AuthApiError("Endpoint de usuario nao encontrado.", 404)
