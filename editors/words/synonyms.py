#!/usr/bin/env python3
# Flask server for synonym lookup using wordhoard
# Usage: python words/synonyms-server.py
# Or: npm run synonyms-server

from flask import Flask, request, jsonify
from flask_cors import CORS
from wordhoard import Synonyms
import sys

app = Flask(__name__)
CORS(app)

@app.route('/synonyms', methods=['GET'])
def get_synonyms():
    word = request.args.get('word')
    if not word:
        return jsonify({'error': 'Missing word parameter'}), 400
    
    try:
        synonym = Synonyms(search_string=word)
        synonym_results = synonym.find_synonyms()
        
        # Return empty list if None
        if synonym_results is None:
            synonym_results = []
        
        return jsonify({
            'word': word,
            'pos': None,  # wordhoard doesn't separate by POS in basic usage
            'synonyms': synonym_results
        })
    except Exception as e:
        print(f"Error looking up synonyms for '{word}': {str(e)}", file=sys.stderr)
        return jsonify({'error': 'Lookup failed', 'message': str(e)}), 500

if __name__ == '__main__':
    port = 3019  # Different port from Node server
    print(f"Wordhoard synonyms server running at: http://localhost:{port}")
    app.run(port=port, debug=True)

