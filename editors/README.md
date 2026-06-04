
# The Writer's Project Editors

# Dev

## Running the servers

Start the Node.js server (port 3008):

    npm run server

Start the Python synonyms-online server (port 3019):

    npm run synonyms-online

Start the local synonyms-cache API (port 3020):

    npm run synonyms-cache

Start both servers at once:

    npm run servers

## Synonyms CLI

Query both synonym servers from the command line:

    npm run get-synonyms

This will prompt you for a word and optional part of speech, then query both synonyms-wordnet (Node.js) and synonyms-online (Python) servers and display the results.

## Python setup

First time setup - install Python dependencies:

    pip install -r words/requirements.txt

# Production

## Deploying synonym_cache.db

`text/synonym_cache.db` is gitignored and must be copied to the server manually before building, placed at:

    creative-sketches/text/synonym_cache.db

## Build

docker build -t editors .

## Run

docker run -d --name editors-container -p 3008:3008 --restart unless-stopped editors

- 3008 (first number) = The port on your host machine (your computer)
- 3008 (second number) = The port inside the Docker container


# URL base path

The public site lives under a single base path — currently **`/writers-project/`**.

- To rename it, change `CANONICAL_BASE` in [`config/paths.js`](config/paths.js) (and add a matching custom location in the nginx proxy). That's the only code change.
- Old prefixes in `LEGACY_BASES` (e.g. `/editors`) **301-redirect** to the current base, so old links keep working.
- Internally the code + assets are written against the stable `/editors` prefix. The server rewrites it to the public base when serving HTML, plus injects `window.BASE_PATH` and an import map so JS and module imports resolve. So you never hardcode the public name anywhere but `config/paths.js`.

# Notes on server.js

The server automatically finds all project folders inside `./editors/` and serves each one under the base path (e.g. `/writers-project/<folder-name>/`). It reads `about.json` from each project to get metadata like the display name.

## Project name replacement with $PROJECT_NAME

You can put `$PROJECT_NAME` anywhere in an editor's `index.html` (e.g. in the `<title>` or a subtitle span). The server will replace it with the project's name from `about.json` when serving the page.

## API endpoints

- `GET /editors/api/sentences` — returns the sentences list from `editors/larder/sentences.json`
- `POST /editors/api/new-sentence` — adds a sentence to that list
- `GET /editors/api/synonyms-wordnet/synonyms?word=<word>&pos=<noun|verb|adjective|adverb>` — WordNet synonyms via Node.js (port 3008)
- `GET /editors/api/synonyms-online/synonyms?word=<word>` — Live wordhoard lookup via Python (proxied to port 3019)
- `GET /editors/api/synonyms-cache/synonyms?word=<word>` — SQLite synonym cache (proxied to port 3020)

