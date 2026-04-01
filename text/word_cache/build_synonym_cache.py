#!/usr/bin/env python3
"""
Build synonym cache database from wordlist.
This script downloads synonyms for all words in the scowl wordlist and stores them in a SQLite database.

Usage:
    python build_word_cache.py [--include-cloudflare] [--verbose]
    
Options:
    --include-cloudflare    Include Cloudflare-protected sources (slower, more synonyms)
    --verbose               Enable verbose logging from wordhoard

The script can be stopped (Ctrl+C) and restarted - it will resume from where it left off.
"""

import sqlite3
import sys
import time
import subprocess
import logging
import argparse
from pathlib import Path
from wordhoard import Synonyms

from lookup import DEFAULT_DB_PATH as DB_PATH, TEXT_DIR

# Paths
WORDLIST_DIR = TEXT_DIR / "wordlist"
SCOWL_SCRIPT = WORDLIST_DIR / "scowl"
SCOWL_DB = WORDLIST_DIR / "scowl.db"

# Settings
DELAY_BETWEEN_REQUESTS = 1.0  # seconds to avoid overwhelming the API
PROGRESS_UPDATE_INTERVAL = 10  # show progress every N words


def init_database():
    """Initialize the SQLite database with schema."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Main synonyms table with wordhoard-specific columns
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS synonyms (
            word TEXT PRIMARY KEY,
            wordhoard_synonyms TEXT,
            wordhoard_status TEXT DEFAULT 'pending',
            wordhoard_last_updated TIMESTAMP,
            wordhoard_error_message TEXT,
            wordnet_synset_ids TEXT,
            babelnet_synset_ids TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_wordhoard_status ON synonyms(wordhoard_status)
    ''')
    
    conn.commit()
    return conn


def load_wordlist():
    """Load wordlist using the scowl script."""
    print(f"Extracting wordlist using scowl script...")
    
    if not SCOWL_SCRIPT.exists():
        print(f"Error: scowl script not found at {SCOWL_SCRIPT}")
        sys.exit(1)
    
    if not SCOWL_DB.exists():
        print(f"Error: scowl.db not found at {SCOWL_DB}")
        print("Please run 'make' in the wordlist directory first.")
        sys.exit(1)
    
    # Run the scowl script to extract a word list
    # Use default settings which gives us a good general wordlist
    try:
        result = subprocess.run(
            [str(SCOWL_SCRIPT), 'word-list', str(SCOWL_DB)],
            cwd=str(WORDLIST_DIR),
            capture_output=True,
            text=True,
            check=True
        )
        
        # Parse the output - one word per line
        words = set()
        for line in result.stdout.splitlines():
            word = line.strip().lower()
            if word and word.isalpha():  # Only keep alphabetic words
                words.add(word)
        
        words = sorted(words)
        print(f"Loaded {len(words)} unique words from scowl")
        return words
        
    except subprocess.CalledProcessError as e:
        print(f"Error running scowl script: {e}")
        print(f"stderr: {e.stderr}")
        sys.exit(1)


def populate_word_list(conn, words):
    """Add all words to the database with 'pending' status if not already present."""
    cursor = conn.cursor()
    
    print("Populating database with words...")
    cursor.executemany(
        'INSERT OR IGNORE INTO synonyms (word, wordhoard_status) VALUES (?, ?)',
        [(word, 'pending') for word in words]
    )
    conn.commit()
    
    # Get statistics
    cursor.execute('SELECT COUNT(*) FROM synonyms WHERE wordhoard_status = "pending"')
    pending = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(*) FROM synonyms WHERE wordhoard_status = "completed"')
    completed = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(*) FROM synonyms WHERE wordhoard_status = "error"')
    errors = cursor.fetchone()[0]
    
    print(f"\nDatabase status:")
    print(f"  Pending:   {pending}")
    print(f"  Completed: {completed}")
    print(f"  Errors:    {errors}")
    print(f"  Total:     {pending + completed + errors}")
    
    return pending, completed, errors


def fetch_synonyms(word, include_cloudflare=False):
    """Fetch synonyms for a word using wordhoard.
    
    Returns a list of synonyms.
    """
    try:
        fetch_start = time.time()
        
        # Configure sources based on cloudflare flag
        if include_cloudflare:
            sources = ['collins', 'merriam-webster', 'synonym.com', 'thesaurus.com', 'wordnet']
        else:
            sources = ['merriam-webster', 'wordnet']
        
        synonym_obj = Synonyms(
            search_string=word,
            sources=sources,
            output_format='list',
            max_number_of_requests=100,
            rate_limit_timeout_period=60
        )
        results = synonym_obj.find_synonyms()
        fetch_time = time.time() - fetch_start
        
        print(f"    [API call took {fetch_time:.3f}s]")
        
        if results is None:
            return []
        
        return results
    except Exception as e:
        raise Exception(f"Lookup failed: {str(e)}")


def process_words(conn, include_cloudflare=False):
    """Process all pending words, fetching their synonyms."""
    cursor = conn.cursor()
    
    # Get pending words
    cursor.execute('SELECT word FROM synonyms WHERE wordhoard_status = "pending" ORDER BY word')
    pending_words = [row[0] for row in cursor.fetchall()]
    
    if not pending_words:
        print("\nNo pending words to process!")
        return
    
    total = len(pending_words)
    sources_used = "all sources (including Cloudflare)" if include_cloudflare else "merriam-webster, wordnet"
    print(f"\nProcessing {total} pending words using {sources_used}...")
    print("Press Ctrl+C to stop (progress will be saved)\n")
    
    start_time = time.time()
    processed = 0
    
    try:
        for i, word in enumerate(pending_words, 1):
            try:
                # Fetch synonyms
                synonyms = fetch_synonyms(word, include_cloudflare)
                
                # Store in database
                cursor.execute('''
                    UPDATE synonyms 
                    SET wordhoard_synonyms = ?, 
                        wordhoard_status = "completed",
                        wordhoard_last_updated = CURRENT_TIMESTAMP,
                        wordhoard_error_message = NULL
                    WHERE word = ?
                ''', (','.join(synonyms), word))
                
                conn.commit()
                processed += 1
                
                # Show word retrieval at every timestep with actual synonyms
                synonyms_str = ','.join(synonyms) if synonyms else '(no synonyms)'
                elapsed = time.time() - start_time
                avg_time_per_word = elapsed / i if i > 0 else 0
                remaining_words = total - i
                eta_seconds = remaining_words * avg_time_per_word
                eta_hours = eta_seconds / 3600
                
                print(f"[{i}/{total} {100*i/total:.2f}%] '{word}' → completed: {synonyms_str}")
                print(f"  ETA: {eta_hours:.2f}h ({avg_time_per_word:.3f}s/word)")
                
                # Show detailed progress periodically
                if i % PROGRESS_UPDATE_INTERVAL == 0 or i == total:
                    rate = i / elapsed if elapsed > 0 else 0
                    print(f"  Progress summary: {100*i/total:.1f}% | Rate: {rate:.2f} words/sec")
                
                # Rate limiting
                time.sleep(DELAY_BETWEEN_REQUESTS)
                
            except Exception as e:
                # Mark as error and continue
                cursor.execute('''
                    UPDATE synonyms 
                    SET wordhoard_status = "error",
                        wordhoard_last_updated = CURRENT_TIMESTAMP,
                        wordhoard_error_message = ?
                    WHERE word = ?
                ''', (str(e), word))
                conn.commit()
                
                # Show error at every timestep
                print(f"[{i}/{total} {100*i/total:.2f}%] '{word}' → error: {str(e)}")
    
    except KeyboardInterrupt:
        print(f"\n\nStopped by user. Progress saved.")
        print(f"Processed {processed} words in this session.")
        return
    
    print(f"\n✓ Completed! Processed {processed} words.")
    elapsed = time.time() - start_time
    print(f"Total time: {elapsed/60:.1f} minutes")


def show_stats(conn):
    """Display final statistics."""
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM synonyms WHERE wordhoard_status = "pending"')
    pending = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(*) FROM synonyms WHERE wordhoard_status = "completed"')
    completed = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(*) FROM synonyms WHERE wordhoard_status = "error"')
    errors = cursor.fetchone()[0]
    
    print("\n" + "="*50)
    print("Final Statistics:")
    print(f"  Completed: {completed}")
    print(f"  Pending:   {pending}")
    print(f"  Errors:    {errors}")
    print(f"  Total:     {completed + pending + errors}")
    print("="*50)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Build synonym cache from wordlist')
    parser.add_argument('--include-cloudflare', action='store_true',
                       help='Include Cloudflare-protected sources (slower, more synonyms)')
    parser.add_argument('--verbose', action='store_true',
                       help='Enable verbose logging from wordhoard')
    args = parser.parse_args()
    
    # Configure logging
    if args.verbose:
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    print("Synonym Cache Builder")
    print("=" * 50)
    if args.include_cloudflare:
        print("Mode: Including Cloudflare-protected sources")
        print("      (collins, merriam-webster, synonym.com, thesaurus.com, wordnet)")
    else:
        print("Mode: Cloudflare-protected sources excluded")
        print("      (merriam-webster, wordnet only)")
    print("=" * 50)
    
    # Initialize database
    conn = init_database()
    
    # Load wordlist
    words = load_wordlist()
    
    # Populate database with words
    populate_word_list(conn, words)
    
    # Process words
    process_words(conn, include_cloudflare=args.include_cloudflare)
    
    # Show final stats
    show_stats(conn)
    
    conn.close()
    print(f"\nDatabase saved to: {DB_PATH}")


if __name__ == '__main__':
    main()
