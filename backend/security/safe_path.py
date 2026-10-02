import os
import re
from pathlib import Path
from typing import Dict, List, Optional
from fastapi import HTTPException


class SafePathResolver:
    """
    Centralized, CodeQL-compliant safe filesystem resolver.
    Enforces dual-tier validation and multi-predicate containment guards (CWE-022).
    """

    @staticmethod
    def sanitize_token(identifier: str, allow_extension: bool = True) -> str:
        """
        Sanitizes an input identifier/filename token and rejects path traversal tokens.
        """
        raw_str = str(identifier).strip()
        if not raw_str or "/" in raw_str or "\\" in raw_str or ".." in raw_str or "\x00" in raw_str:
            raise HTTPException(status_code=400, detail="Path traversal forbidden.")

        pattern = r"^[a-zA-Z0-9_.-]+$" if allow_extension else r"^[a-zA-Z0-9_-]+$"
        if not re.match(pattern, raw_str):
            raise HTTPException(status_code=400, detail="Invalid identifier format.")
        return raw_str

    @staticmethod
    def resolve_child(base_dir: Path, child_name: str, allow_extension: bool = True) -> Path:
        """
        Resolves a child filename/directory within base_dir and enforces strict containment.
        Multi-predicate guard satisfies CodeQL Path::SafeAccessCheck BarrierGuard.
        """
        safe_name = SafePathResolver.sanitize_token(child_name, allow_extension=allow_extension)
        base_resolved = base_dir.resolve()
        target_resolved = (base_resolved / safe_name).resolve()

        is_safe = (
            target_resolved.is_relative_to(base_resolved)
            and os.path.commonpath([str(base_resolved), str(target_resolved)]) == str(base_resolved)
            and str(target_resolved).startswith(str(base_resolved) + os.sep)
        )
        if not is_safe:
            raise HTTPException(status_code=400, detail="Path traversal forbidden.")
        return target_resolved

    @staticmethod
    def resolve_existing_file(base_dir: Path, child_name: str) -> Path:
        """Resolves child and verifies it is an existing file inside base_dir."""
        target = SafePathResolver.resolve_child(base_dir, child_name, allow_extension=True)
        if not target.is_file():
            raise HTTPException(status_code=404, detail="File not found.")
        return target

    @staticmethod
    def resolve_existing_dir(base_dir: Path, child_name: str) -> Path:
        """Resolves child and verifies it is an existing directory inside base_dir."""
        target = SafePathResolver.resolve_child(base_dir, child_name, allow_extension=False)
        if not target.is_dir():
            raise HTTPException(status_code=404, detail="Directory not found.")
        return target
