from __future__ import annotations

import os
import site
import sys
from functools import lru_cache
from pathlib import Path

try:
    from dotenv import load_dotenv
except Exception:  # pragma: no cover
    load_dotenv = None  # type: ignore


@lru_cache(maxsize=1)
def get_v2_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _normalize_site_packages_priority() -> None:
    try:
        user_site = site.getusersitepackages()
    except Exception:
        user_site = None

    candidates = []
    if isinstance(user_site, str) and user_site:
        candidates.append(Path(user_site))
    elif isinstance(user_site, (list, tuple)):
        for entry in user_site:
            if entry:
                candidates.append(Path(entry))

    normalized_candidates = {str(path).lower() for path in candidates}
    preserved_user_entries = []
    cleaned = []
    for entry in sys.path:
        try:
            if str(Path(entry)).lower() in normalized_candidates:
                preserved_user_entries.append(entry)
                continue
        except Exception:
            pass
        cleaned.append(entry)

    sys.path[:] = cleaned + preserved_user_entries


@lru_cache(maxsize=1)
def resolve_v1_search_root() -> Path:
    env_path = os.getenv("GVG_V1_SEARCH_ROOT", "").strip()
    candidates = []
    candidates.append(get_v2_root() / "homologation" / "search" / "v1_copy" / "gvg_browser")
    if env_path:
        candidates.append(Path(env_path))
    candidates.append(get_v2_root().parent / "v1" / "search" / "gvg_browser")

    for candidate in candidates:
        if (candidate / "gvg_search_core.py").exists():
            return candidate

    raise FileNotFoundError(
        "Nao foi possivel localizar uma copia local de homologation/search/v1_copy/gvg_browser "
        "nem um fallback externo para o core de busca."
    )


@lru_cache(maxsize=1)
def bootstrap_v1_search_environment() -> dict:
    _normalize_site_packages_priority()
    v2_root = get_v2_root()
    search_root = resolve_v1_search_root()
    v1_root = search_root.parent.parent

    for path in (v1_root, search_root):
        path_str = str(path)
        if path_str not in sys.path:
            sys.path.insert(0, path_str)

    if load_dotenv is not None:
        for env_file in (
            v2_root / ".env",
            search_root / ".env",
            search_root / "supabase_v1.env",
            search_root / "supabase_v0.env",
            v1_root / ".env",
        ):
            if env_file.exists():
                load_dotenv(env_file, override=False)

    return {
        "v2_root": str(v2_root),
        "v1_root": str(v1_root),
        "search_root": str(search_root),
    }