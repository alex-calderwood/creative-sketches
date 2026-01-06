
# The Writer's Project Editors

# Dev

    node server.js

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
- The synonyms router (`./words/synonyms`) is also mounted at `/editors/api`

