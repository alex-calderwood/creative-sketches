
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

## Build

docker build -t editors .

## Run

docker run -d --name editors-container -p 3000:3000 --restart unless-stopped editors

- 3001 (first number) = The port on your host machine (your computer)
- 3001 (second number) = The port inside the Docker container


# Notes on server.js

The server automatically finds all project folders inside `./editors/` and serves each one at `/editors/<folder-name>/`. It reads `about.json` from each project to get metadata like the display name.

## Project name replacement with $PROJECT_NAME

You can put `$PROJECT_NAME` anywhere in an editor's `index.html` (e.g. in the `<title>` or a subtitle span). The server will replace it with the project's name from `about.json` when serving the page.

## API endpoints

- `GET /editors/api/sentences` — returns the sentences list from `editors/larder/sentences.json`
- `POST /editors/api/new-sentence` — adds a sentence to that list
- `GET /editors/api/synonyms-wordnet/synonyms?word=<word>&pos=<noun|verb|adjective|adverb>` — WordNet synonyms via Node.js (port 3008)
- `GET /editors/api/synonyms-online/synonyms?word=<word>` — Live wordhoard lookup via Python (proxied to port 3019)
- `GET /editors/api/synonyms-cache/synonyms?word=<word>` — SQLite synonym cache (proxied to port 3020)

