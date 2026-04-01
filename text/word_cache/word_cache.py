#!/usr/bin/env python3
"""
Local SQLite synonym cache — same JSON shape as synonyms_online (wordhoard).

Standalone:
    python word_cache.py
    # or: python -m flask --app word_cache:create_app run -p 3020

With editors: npm run synonyms-cache (proxied at /editors/api/synonyms-cache/synonyms)

Env:
    WORD_CACHE_DB  optional path to SQLite file (default: text/synonym_cache.db)

Example:
    curl http://127.0.0.1:3020/synonyms?word=happy
"""

import os
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

from lookup import DEFAULT_DB_PATH, synonyms_api_response


def _bool_param(name: str, default: bool = False) -> bool:
    val = request.args.get(name)
    if val is None:
        return default
    return val.lower() in ("1", "true", "yes", "y")


def create_app(db_path: str | Path | None = None) -> Flask:
    """Factory for tests and embedding."""
    app = Flask(__name__)
    CORS(app)

    resolved: Path | None
    if db_path is not None:
        resolved = Path(db_path)
    else:
        env = os.environ.get("WORD_CACHE_DB")
        resolved = Path(env) if env else None

    @app.get("/synonyms")
    def get_synonyms():
        word = request.args.get("word")
        if not word:
            return jsonify({"error": "Missing word parameter"}), 400

        max_depth_str = request.args.get("max_depth")
        max_depth = int(max_depth_str) if max_depth_str is not None else None

        return jsonify(synonyms_api_response(
            word,
            db_path=resolved,
            wordhoard_only=_bool_param("wordhoard_only"),
            include_lemmas=_bool_param("include_lemmas"),
            include_inflections=_bool_param("include_inflections"),
            max_depth=max_depth,
        ))

    return app


if __name__ == "__main__":
    port = int(os.environ.get("WORD_CACHE_PORT", "3020"))
    print(f"synonyms-cache API at http://127.0.0.1:{port}/synonyms")
    print(f"Database: {DEFAULT_DB_PATH}")
    create_app().run(host="127.0.0.1", port=port, debug=False)
