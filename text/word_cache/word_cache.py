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
import sys
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

from lookup import DEFAULT_DB_PATH, synonyms_api_response

# phonetics lives in a sub-folder; make its lookup module importable.
sys.path.insert(0, str(Path(__file__).resolve().parent / "phonetics"))
from phonetic_lookup import (  # noqa: E402
    homophones,
    near_rhymes,
    phonetics_api_response,
    pronunciations,
    rhymes,
)


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
    @app.get("/word")
    def get_word():
        word = request.args.get("word")
        if not word:
            return jsonify({"error": "Missing word parameter"}), 400

        max_depth_str = request.args.get("max_depth")
        max_depth = int(max_depth_str) if max_depth_str is not None else None

        return jsonify(synonyms_api_response(
            word,
            db_path=resolved,
            wordhoard_only=_bool_param("wordhoard_only"),
            lemmatize=_bool_param("lemmatize"),
            inflect=_bool_param("inflect"),
            dict_only=_bool_param("dict_only"),
            misspellings=_bool_param("misspellings"),
            max_depth=max_depth,
        ))

    def _word_arg() -> str | None:
        return request.args.get("word")

    @app.get("/homophones")
    def get_homophones():
        word = _word_arg()
        if not word:
            return jsonify({"error": "Missing word parameter"}), 400
        return jsonify({"word": word, "homophones": homophones(word, db_path=resolved)})

    @app.get("/rhymes")
    def get_rhymes():
        word = _word_arg()
        if not word:
            return jsonify({"error": "Missing word parameter"}), 400
        return jsonify({"word": word, "rhymes": rhymes(word, db_path=resolved)})

    @app.get("/near-rhymes")
    @app.get("/near_rhymes")
    def get_near_rhymes():
        word = _word_arg()
        if not word:
            return jsonify({"error": "Missing word parameter"}), 400
        return jsonify({"word": word, "near_rhymes": near_rhymes(word, db_path=resolved)})

    @app.get("/pronounce")
    def get_pronounce():
        word = _word_arg()
        if not word:
            return jsonify({"error": "Missing word parameter"}), 400
        return jsonify({"word": word, "pronunciations": pronunciations(word, db_path=resolved)})

    @app.get("/phonetics")
    def get_phonetics():
        word = _word_arg()
        if not word:
            return jsonify({"error": "Missing word parameter"}), 400
        return jsonify(phonetics_api_response(word, db_path=resolved))

    return app


if __name__ == "__main__":
    import logging
    import flask.cli
    logging.getLogger("werkzeug").setLevel(logging.ERROR)  # hide request log + dev-server warning
    flask.cli.show_server_banner = lambda *a, **k: None     # hide "Serving Flask app" banner
    port = int(os.environ.get("WORD_CACHE_PORT", "3020"))
    print(f"synonyms-cache    http://127.0.0.1:{port}/synonyms", flush=True)
    create_app().run(host="127.0.0.1", port=port, debug=False)
