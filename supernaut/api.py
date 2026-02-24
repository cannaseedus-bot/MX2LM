"""Optional FastAPI surface for Supernaut.

This module avoids importing FastAPI at import-time unless explicitly used.
"""

from __future__ import annotations

from .system import Supernaut


def build_app():
    try:
        from fastapi import FastAPI
        from pydantic import BaseModel
    except Exception as exc:  # dependency may be absent in minimal environments
        raise RuntimeError("FastAPI dependencies are not installed") from exc

    app = FastAPI(title="Supernaut API")
    supernaut = Supernaut()
    supernaut.awaken()

    class Query(BaseModel):
        prompt: str

    @app.post("/query")
    async def query_supernaut(query: Query):
        return supernaut.query(query.prompt)

    return app
