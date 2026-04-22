from __future__ import annotations

import os
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


def _ensure_documents_artifact_paths(v2_root: Path) -> dict[str, str]:
    artifacts_root = v2_root / "homologation" / "documents" / "artifacts"
    mapping = {
        "BASE_PATH": str(artifacts_root),
        "FILES_PATH": str(artifacts_root / "files"),
        "RESULTS_PATH": str(artifacts_root / "reports"),
        "TEMP_PATH": str(artifacts_root / "temp"),
    }
    for env_name, path_str in mapping.items():
        os.environ[env_name] = path_str
        Path(path_str).mkdir(parents=True, exist_ok=True)
    return mapping


@lru_cache(maxsize=1)
def resolve_v1_documents_root() -> Path:
    env_path = os.getenv("GVG_V1_DOCUMENTS_ROOT", "").strip()
    candidates = [
        get_v2_root() / "homologation" / "documents" / "v1_copy" / "core",
    ]
    if env_path:
        candidates.append(Path(env_path))

    for candidate in candidates:
        if (candidate / "gvg_documents.py").exists():
            return candidate

    raise FileNotFoundError(
        "Nao foi possivel localizar homologation/documents/v1_copy/core/gvg_documents.py."
    )


@lru_cache(maxsize=1)
def bootstrap_v1_documents_environment() -> dict[str, str]:
    v2_root = get_v2_root()
    documents_root = resolve_v1_documents_root()
    artifacts_info = _ensure_documents_artifact_paths(v2_root)

    documents_root_str = str(documents_root)
    if documents_root_str not in sys.path:
        sys.path.insert(0, documents_root_str)

    if load_dotenv is not None:
        for env_file in (
            v2_root / ".env",
            documents_root / ".env",
            documents_root / ".env.template",
        ):
            if env_file.exists():
                load_dotenv(env_file, override=False)

    return {
        "v2_root": str(v2_root),
        "documents_root": str(documents_root),
        **artifacts_info,
    }
