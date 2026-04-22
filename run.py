from __future__ import annotations

import contextlib
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