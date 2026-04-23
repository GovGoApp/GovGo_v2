from __future__ import annotations

import contextlib
import json
import os
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


HOST = "127.0.0.1"
PORT = 8765
ROUTE = "/src/app/boot/index.html#/inicio"
PROJECT_ROOT = Path(__file__).resolve().parent
ENTRY_FILE = PROJECT_ROOT / "src" / "app" / "boot" / "index.html"
URL = f"http://{HOST}:{PORT}{ROUTE}"


class QuietStaticHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:
        return

    def _write_json(self, status_code: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

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

    def do_OPTIONS(self) -> None:
        if self.path.split("?", 1)[0] != "/api/search":
            self.send_error(404, "Endpoint nao encontrado.")
            return

        self.send_response(204)
        self.send_header("Allow", "OPTIONS, POST")
        self.end_headers()

    def do_POST(self) -> None:
        if self.path.split("?", 1)[0] != "/api/search":
            self.send_error(404, "Endpoint nao encontrado.")
            return

        try:
            payload = self._read_json()
        except ValueError as exc:
            self._write_json(400, {"error": str(exc)})
            return

        try:
            from src.backend.search.api.service import run_search

            response = run_search(payload)
        except Exception as exc:
            self._write_json(500, {"error": str(exc)})
            return

        status_code = 200
        if response.get("error") == "Informe uma consulta para buscar.":
            status_code = 400
        self._write_json(status_code, response)


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


def _serve_forever() -> int:
    handler = partial(QuietStaticHandler, directory=str(PROJECT_ROOT))
    try:
        httpd = ThreadingHTTPServer((HOST, PORT), handler)
    except OSError as error:
        if error.errno == 10048 and _existing_server_works(URL):
            print(f"GovGo v2 ja esta servido em: {URL}")
            _open_browser(URL)
            return 0
        raise

    print(f"GovGo v2 servido em: {URL}")

    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()

    if not _wait_until_reachable(URL):
        print("Falha ao disponibilizar a pagina inicial.", file=sys.stderr)
        httpd.shutdown()
        httpd.server_close()
        return 1

    _open_browser(URL)

    try:
        server_thread.join()
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