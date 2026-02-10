#!/usr/bin/env python3
"""
Query synonyms from the cache database.
Can be used while the cache is being built.

Usage:
    python synonyms.py word
    python synonyms.py --stats
    python synonyms.py --random [count]
"""

import sqlite3
import sys
import random
from pathlib import Path

# Path to the database
SCRIPT_DIR = Path(__file__).parent.parent
DB_PATH = SCRIPT_DIR / "synonym_cache.db"


def get_synonyms(word):
    """Get synonyms for a word from the cache."""
    if not DB_PATH.exists():
        print(f"Error: Database not found at {DB_PATH}")
        print("Run build_synonym_cache.py first.")
        return None
    
    print(f"Database: {DB_PATH}")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    query = 'SELECT synonyms, status, error_message FROM words WHERE word = ?'
    params = (word.lower(),)
    print(f"Query: {query}")
    print(f"Params: {params}")
    
    cursor.execute(query, params)
    result = cursor.fetchone()
    conn.close()
    
    print(f"Raw result: {result}")
    
    if result is None:
        return None
    
    synonyms_str, status, error_message = result
    print(f"  synonyms column: {repr(synonyms_str)}")
    print(f"  status column: {repr(status)}")
    print(f"  error_message column: {repr(error_message)}")
    
    if status == 'completed':
        synonyms = synonyms_str.split(',') if synonyms_str else []
        return synonyms
    elif status == 'error':
        print(f"Error for '{word}': {error_message}")
        return []
    else:  # pending
        print(f"'{word}' is pending (not yet processed)")
        return []


def show_stats():
    """Show database statistics."""
    if not DB_PATH.exists():
        print(f"Error: Database not found at {DB_PATH}")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM words WHERE status = "pending"')
    pending = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(*) FROM words WHERE status = "completed"')
    completed = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(*) FROM words WHERE status = "error"')
    errors = cursor.fetchone()[0]
    
    total = pending + completed + errors
    
    print("Database Statistics:")
    print(f"  Total words:     {total}")
    print(f"  Completed:       {completed} ({100*completed/total:.1f}%)")
    print(f"  Pending:         {pending} ({100*pending/total:.1f}%)")
    print(f"  Errors:          {errors} ({100*errors/total:.1f}%)")
    
    # Show some examples
    cursor.execute('SELECT word, synonyms FROM words WHERE status = "completed" LIMIT 5')
    examples = cursor.fetchall()
    
    if examples:
        print("\nRecent examples:")
        for word, synonyms_str in examples:
            synonyms = synonyms_str.split(',') if synonyms_str else []
            print(f"  '{word}': {', '.join(synonyms[:5])}" + (" ..." if len(synonyms) > 5 else ""))
    
    conn.close()


def show_random(count=10):
    """Show random completed entries."""
    if not DB_PATH.exists():
        print(f"Error: Database not found at {DB_PATH}")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT word, synonyms FROM words WHERE status = "completed" ORDER BY RANDOM() LIMIT ?', (count,))
    results = cursor.fetchall()
    conn.close()
    
    if not results:
        print("No completed entries yet.")
        return
    
    print(f"Random {len(results)} completed entries:")
    for word, synonyms_str in results:
        synonyms = synonyms_str.split(',') if synonyms_str else []
        print(f"  '{word}': {', '.join(synonyms)}")


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python synonyms.py word          - Look up synonyms for a word")
        print("  python synonyms.py --stats       - Show database statistics")
        print("  python synonyms.py --random [N]  - Show N random entries (default 10)")
        sys.exit(1)
    
    arg = sys.argv[1]
    
    if arg == '--stats':
        show_stats()
    elif arg == '--random':
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        show_random(count)
    else:
        word = arg
        synonyms = get_synonyms(word)
        
        if synonyms is None:
            print(f"'{word}' not found in database")
        elif synonyms:
            print(f"Synonyms for '{word}':")
            print(f"  {', '.join(synonyms)}")
        else:
            print(f"No synonyms found for '{word}'")


if __name__ == '__main__':
    main()
