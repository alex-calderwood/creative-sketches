#!/usr/bin/env python3
"""
Local SQLite synonym cache — same JSON shape as synonyms_online (wordhoard).

Standalone:
    python synonyms_cache.py
    # or: python -m flask --app synonyms_cache:create_app run -p 3020

With editors: npm run synonyms-cache (proxied at /editors/api/synonyms-cache/synonyms)

Env:
    SYNONYM_CACHE_DB  optional path to SQLite file (default: text/synonym_cache.db)

Example:
    curl http://127.0.0.1:3020/synonyms?word=happy
"""

import os
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

from lookup import DEFAULT_DB_PATH, synonyms_api_response


def create_app(db_path: str | Path | None = None) -> Flask:
    """Factory for tests and embedding."""
    app = Flask(__name__)
    CORS(app)

    resolved: Path | None
    if db_path is not None:
        resolved = Path(db_path)
    else:
        env = os.environ.get("SYNONYM_CACHE_DB")
        resolved = Path(env) if env else None

    @app.get("/synonyms")
    def get_synonyms():
        word = request.args.get("word")
        if not word:
            return jsonify({"error": "Missing word parameter"}), 400
        return jsonify(synonyms_api_response(word, db_path=resolved))

    return app


if __name__ == "__main__":
    port = int(os.environ.get("SYNONYM_CACHE_PORT", "3020"))
    print(f"synonyms-cache API at http://127.0.0.1:{port}/synonyms")
    print(f"Database: {DEFAULT_DB_PATH}")
    create_app().run(host="127.0.0.1", port=port, debug=False)
