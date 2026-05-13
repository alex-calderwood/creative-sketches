# UbuTok

A TikTok-style vertical feed of avant-garde media from [UbuWeb](https://ubuweb.com). Scroll through randomized film, audio, visual poetry, conceptual writing, and more.

## Running locally

**First time:**
```bash
cd ubutok
npm run install:all
```

**Start both servers:**
```bash
npm run dev
```

Open **http://localhost:5173/avantok**

| Command | Description |
|---|---|
| `npm run dev` | Start client + server |
| `npm run dev:debug` | Start with debug mode on (see below) |
| `npm run install:all` | Install dependencies for both client and server |

## Architecture

```
ubutok/
  client/     React + Vite frontend (port 5173)
  server/     Express scraper API (port 3001)
```

The client proxies `/api` requests to the server. In development, Vite handles this. In production, Express serves the built client at `/avantok` and handles all routes itself.

## How it works

There is no UbuWeb API. The server scrapes HTML pages on demand:

1. A random category is picked from the enabled list
2. The category index page is fetched and artist/work pages are extracted
3. Each page is tried for extractable media (video, audio, PDF, image, text)
4. The first successful result is returned to the client as JSON

Scraped HTML is cached in-memory for the lifetime of the server process to avoid redundant fetches.

## Content categories

| Key | Label | Type |
|---|---|---|
| `film` | Film & Video | video |
| `sound` | Sound | audio |
| `dance` | Dance | video |
| `contemp` | Contemporary | video |
| `vp` | Visual Poetry | pdf |
| `cc` | Conceptual Comics | pdf |
| `historical` | Historical | pdf / image |
| `concept` | Conceptual Writing | text |
| `papers` | Papers | text |

## Media types

- **Video** — plays inline via HLS.js (m3u8) or native mp4
- **Audio** — custom player with scrubber; picks a random track from the page
- **PDF** — rendered page-by-page with pdf.js, horizontally paginated; proxied through the server to avoid CORS
- **Image** — largest image on the page; supports galleries
- **Text** — horizontally paginated, ~700 chars per page

## Settings & history

Accessible via the ☰ icon. Category toggles and view history are stored in `localStorage` only — nothing is sent to the server.

## Debug mode

```bash
npm run dev:debug
```

With `DEBUG=true`, failed scrapes surface as visible "failed" cards in the feed instead of being silently retried. Each card shows the category, reason for failure, and the list of URLs that were tried.

A diagnostic page is available at **/avantok/debug** — pick a category, run a scrape, and inspect the step-by-step log.

## Production build

```bash
cd client && npm run build
cd ../server && NODE_ENV=production node src/index.js
```

The server will serve the built client at `/avantok`.
