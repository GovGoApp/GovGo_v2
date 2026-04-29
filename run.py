from __future__ import annotations

import contextlib
import datetime as _dt
import json
import os
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from decimal import Decimal
from functools import partial
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit


HOST = "127.0.0.1"
PORT = 8765
ROUTE = "/src/app/boot/index.html#/inicio"
PROJECT_ROOT = Path(__file__).resolve().parent
ENTRY_FILE = PROJECT_ROOT / "src" / "app" / "boot" / "index.html"
URL = f"http://{HOST}:{PORT}{ROUTE}"

AUTH_GET_ROUTES = {"/api/auth/me"}
AUTH_POST_ROUTES = {
    "/api/auth/login",
    "/api/auth/signup",
    "/api/auth/confirm",
    "/api/auth/forgot",
    "/api/auth/reset",
    "/api/auth/logout",
}
USER_GET_ROUTES = {"/api/user/favorites", "/api/user/favorite-detail"}
USER_POST_ROUTES = {"/api/user/favorites"}
USER_DELETE_PREFIXES = ("/api/user/favorites/",)


def _json_default(value):
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    if isinstance(value, (_dt.datetime, _dt.date)):
        return value.isoformat()
    return str(value)


class QuietStaticHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, format: str, *args) -> None:
        return

    def _write_json(self, status_code: int, payload: dict, headers: list[tuple[str, str]] | None = None) -> None:
        body = json.dumps(payload, ensure_ascii=False, default=_json_default).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        for name, value in headers or []:
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body)

    def _read_cookies(self) -> dict[str, str]:
        raw_cookie = self.headers.get("Cookie", "")
        if not raw_cookie:
            return {}
        cookie = SimpleCookie()
        try:
            cookie.load(raw_cookie)
        except Exception:
            return {}
        return {name: morsel.value for name, morsel in cookie.items()}

    def _read_json(self) -> dict:
        content_length = self.headers.get("Content-Length", "0")
        try:
            size = max(0, int(content_length))
        except ValueError as exc:
            raise ValueError("Cabecalho Content-Length invalido.") from exc

        raw_body = self.rfile.read(size) if size else b"{}"
        if not raw_body.strip():
            return {}

        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except Exception as exc:
            raise ValueError("Corpo JSON invalido.") from exc

        if not isinstance(payload, dict):
            raise ValueError("O corpo JSON deve ser um objeto.")
        return payload

    def _read_query_params(self) -> dict:
        parsed = urlsplit(self.path)
        params = parse_qs(parsed.query or "", keep_blank_values=True)
        return {key: values[-1] if values else "" for key, values in params.items()}

    def do_OPTIONS(self) -> None:
        route = urlsplit(self.path).path
        if route not in (AUTH_GET_ROUTES | AUTH_POST_ROUTES | USER_GET_ROUTES | USER_POST_ROUTES | {
            "/api/search",
            "/api/search-config",
            "/api/search-filters",
            "/api/edital-detail",
            "/api/edital-items",
            "/api/edital-documentos",
            "/api/edital-document-view",
            "/api/edital-documents-summary",
        }) and not any(route.startswith(prefix) for prefix in USER_DELETE_PREFIXES):
            self.send_error(404, "Endpoint nao encontrado.")
            return

        self.send_response(204)
        self.send_header("Allow", "OPTIONS, GET, POST, DELETE")
        self.end_headers()

    def do_GET(self) -> None:
        route = urlsplit(self.path).path
        if route in AUTH_GET_ROUTES:
            try:
                from src.backend.user.api.service import AuthApiError, handle_auth_route

                status_code, response, headers = handle_auth_route(
                    route,
                    "GET",
                    cookies=self._read_cookies(),
                )
            except AuthApiError as exc:
                self._write_json(exc.status_code, {"ok": False, "error": exc.message})
                return
            except Exception as exc:
                self._write_json(500, {"ok": False, "error": str(exc)})
                return

            self._write_json(status_code, response, headers)
            return

        if route in USER_GET_ROUTES:
            try:
                from src.backend.user.api.service import AuthApiError, handle_user_route

                status_code, response, headers = handle_user_route(
                    route,
                    "GET",
                    payload=self._read_query_params(),
                    cookies=self._read_cookies(),
                )
            except AuthApiError as exc:
                self._write_json(exc.status_code, {"ok": False, "error": exc.message})
                return
            except Exception as exc:
                self._write_json(500, {"ok": False, "error": str(exc)})
                return

            self._write_json(status_code, response, headers)
            return

        if route not in {"/api/search-config", "/api/search-filters"}:
            super().do_GET()
            return

        try:
            from src.backend.search.api.service import get_search_config, get_search_filters

            if route == "/api/search-filters":
                response = {"filters": get_search_filters()}
            else:
                response = {"config": get_search_config()}
        except Exception as exc:
            self._write_json(500, {"error": str(exc)})
            return

        self._write_json(200, response)

    def do_POST(self) -> None:
        route = urlsplit(self.path).path
        if route not in (AUTH_POST_ROUTES | USER_POST_ROUTES | {
            "/api/search",
            "/api/search-config",
            "/api/search-filters",
            "/api/edital-detail",
            "/api/edital-items",
            "/api/edital-documentos",
            "/api/edital-document-view",
            "/api/edital-documents-summary",
        }):
            self.send_error(404, "Endpoint nao encontrado.")
            return

        try:
            payload = self._read_json()
        except ValueError as exc:
            self._write_json(400, {"error": str(exc)})
            return

        if route in AUTH_POST_ROUTES:
            try:
                from src.backend.user.api.service import AuthApiError, handle_auth_route

                status_code, response, headers = handle_auth_route(
                    route,
                    "POST",
                    payload=payload,
                    cookies=self._read_cookies(),
                )
            except AuthApiError as exc:
                self._write_json(exc.status_code, {"ok": False, "error": exc.message})
                return
            except Exception as exc:
                self._write_json(500, {"ok": False, "error": str(exc)})
                return

            self._write_json(status_code, response, headers)
            return

        if route in USER_POST_ROUTES:
            try:
                from src.backend.user.api.service import AuthApiError, handle_user_route

                status_code, response, headers = handle_user_route(
                    route,
                    "POST",
                    payload=payload,
                    cookies=self._read_cookies(),
                )
            except AuthApiError as exc:
                self._write_json(exc.status_code, {"ok": False, "error": exc.message})
                return
            except Exception as exc:
                self._write_json(500, {"ok": False, "error": str(exc)})
                return

            self._write_json(status_code, response, headers)
            return

        try:
            from src.backend.search.api.service import (
                get_edital_documents,
                get_edital_document_view,
                get_edital_documents_summary,
                get_edital_detail,
                get_edital_items,
                run_search,
                update_search_config,
                update_search_filters,
            )

            if route == "/api/search-config":
                response = {"config": update_search_config(payload)}
            elif route == "/api/search-filters":
                response = {"filters": update_search_filters(payload)}
            elif route == "/api/edital-detail":
                response = get_edital_detail(payload)
            elif route == "/api/edital-items":
                response = get_edital_items(payload)
            elif route == "/api/edital-documentos":
                response = get_edital_documents(payload)
            elif route == "/api/edital-document-view":
                response = get_edital_document_view(payload)
            elif route == "/api/edital-documents-summary":
                response = get_edital_documents_summary(payload)
            else:
                response = run_search(payload)
        except Exception as exc:
            self._write_json(500, {"error": str(exc)})
            return

        status_code = 200
        if route == "/api/search" and response.get("error") == "Informe uma consulta para buscar.":
            status_code = 400
        elif route in {
            "/api/edital-items",
            "/api/edital-detail",
            "/api/edital-documentos",
            "/api/edital-document-view",
            "/api/edital-documents-summary",
        } and response.get("error"):
            status_code = 400
        self._write_json(status_code, response)

    def do_DELETE(self) -> None:
        route = urlsplit(self.path).path
        if not any(route.startswith(prefix) for prefix in USER_DELETE_PREFIXES):
            self.send_error(404, "Endpoint nao encontrado.")
            return

        try:
            from src.backend.user.api.service import AuthApiError, handle_user_route

            path_value = ""
            for prefix in USER_DELETE_PREFIXES:
                if route.startswith(prefix):
                    path_value = unquote(route[len(prefix):])
                    break
            status_code, response, headers = handle_user_route(
                route,
                "DELETE",
                cookies=self._read_cookies(),
                path_value=path_value,
            )
        except AuthApiError as exc:
            self._write_json(exc.status_code, {"ok": False, "error": exc.message})
            return
        except Exception as exc:
            self._write_json(500, {"ok": False, "error": str(exc)})
            return

        self._write_json(status_code, response, headers)


def _find_chrome() -> str | None:
    candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return candidate
    return None


def _open_browser(url: str) -> None:
    chrome = _find_chrome()
    if chrome:
        subprocess.Popen([chrome, url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return

    if os.name == "nt":
        os.startfile(url)  # type: ignore[attr-defined]
        return

    import webbrowser

    webbrowser.open(url)


def _wait_until_reachable(url: str, timeout_seconds: float = 5.0) -> bool:
    deadline = time.time() + timeout_seconds
    probe_url = url.split("#", 1)[0]
    while time.time() < deadline:
        try:
            with contextlib.closing(urllib.request.urlopen(probe_url, timeout=1.0)) as response:
                return 200 <= response.status < 400
        except (urllib.error.URLError, TimeoutError, OSError):
            time.sleep(0.1)
    return False


def _existing_server_works(url: str) -> bool:
    return _wait_until_reachable(url, timeout_seconds=1.0)


def _post_json_works(url: str, body: dict | None = None, timeout_seconds: float = 1.0) -> bool:
    request = urllib.request.Request(
        url,
        data=json.dumps(body or {}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with contextlib.closing(urllib.request.urlopen(request, timeout=timeout_seconds)) as response:
            return 200 <= response.status < 500
    except urllib.error.HTTPError as exc:
        return 200 <= exc.code < 500
    except (urllib.error.URLError, TimeoutError, OSError):
        return False


def _get_status(url: str, timeout_seconds: float = 1.0) -> int | None:
    try:
        with contextlib.closing(urllib.request.urlopen(url, timeout=timeout_seconds)) as response:
            return response.status
    except urllib.error.HTTPError as exc:
        return exc.code
    except (urllib.error.URLError, TimeoutError, OSError):
        return None


def _existing_server_matches_current_api() -> bool:
    required_get_urls = [
        f"http://{HOST}:{PORT}/api/search-config",
        f"http://{HOST}:{PORT}/api/search-filters",
    ]
    if not all(_wait_until_reachable(endpoint, timeout_seconds=1.0) for endpoint in required_get_urls):
        return False

    auth_status = _get_status(f"http://{HOST}:{PORT}/api/auth/me")
    if auth_status not in {200, 401}:
        return False
    favorites_status = _get_status(f"http://{HOST}:{PORT}/api/user/favorites")
    if favorites_status not in {200, 401}:
        return False
    favorite_detail_status = _get_status(f"http://{HOST}:{PORT}/api/user/favorite-detail?pncp_id=healthcheck")
    if favorite_detail_status not in {200, 401, 404}:
        return False

    required_post_urls = [
        f"http://{HOST}:{PORT}/api/edital-items",
        f"http://{HOST}:{PORT}/api/edital-documentos",
        f"http://{HOST}:{PORT}/api/edital-document-view",
        f"http://{HOST}:{PORT}/api/edital-documents-summary",
    ]
    return all(_post_json_works(endpoint) for endpoint in required_post_urls)


def _serve_forever() -> int:
    handler = partial(QuietStaticHandler, directory=str(PROJECT_ROOT))
    try:
        httpd = ThreadingHTTPServer((HOST, PORT), handler)
    except OSError as error:
        if error.errno == 10048:
            if _existing_server_works(URL) and _existing_server_matches_current_api():
                print(f"GovGo v2 ja esta servido em: {URL}")
                _open_browser(URL)
                return 0
            print(
                "A porta 8765 ja esta ocupada por um servidor incompatível com o GovGo v2 atual.\n"
                "Encerre a instancia antiga e rode novamente `python .\\run.py`.",
                file=sys.stderr,
            )
            return 1
        raise

    print(f"GovGo v2 servido em: {URL}")

    def open_browser_when_ready() -> None:
        if not _wait_until_reachable(URL):
            print("Falha ao disponibilizar a pagina inicial.", file=sys.stderr)
            return
        _open_browser(URL)

    threading.Thread(target=open_browser_when_ready, daemon=True).start()

    try:
        httpd.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        print("\nEncerrando servidor GovGo v2...")
    finally:
        httpd.shutdown()
        httpd.server_close()

    return 0


def main() -> int:
    if not ENTRY_FILE.exists():
        print(f"Pagina inicial nao encontrada: {ENTRY_FILE}", file=sys.stderr)
        return 1
    return _serve_forever()


if __name__ == "__main__":
    raise SystemExit(main())
