# Kando

A clean kanban board. Columns and cards, drag-and-drop, colored tags, and due dates —
with the board stored on a small backend so it stays in sync across every device you
open it on. No account, no external services.

Built with **Vite + React + TypeScript** on the frontend and a tiny **dependency-free
Node** service for persistence, styled with plain CSS (light/dark themes), and packaged
to build and run entirely in **Docker**.

## Features

- **Columns** — add, rename (click the title), delete, and **reorder by dragging the grip handle** (⠿).
  Seeded with To Do / In Progress / Done on first run.
- **Cards** — add via the composer at the bottom of a column, double-click to edit, delete on hover.
- **Drag & drop** — reorder cards within a column and move them between columns, with a live drop indicator.
- **Due dates** — hover a card and click the calendar button to set a due date. The pill colors itself:
  red when overdue, accent when due today, muted when upcoming.
- **Tags** — a shared, reusable label palette. Hover a card, click the tag button, and assign one or more
  colored tags (or create a new one from a preset palette). Deleting a tag removes it from every card.
- **Cross-device sync** — the board lives on the backend, so it's the same on your laptop, phone, and tablet.
  Changes you make on one device show up on the others within a couple of seconds (the app polls for updates).
  `localStorage` is kept as an offline cache — if the server is briefly unreachable the board still works and
  re-syncs when it's back (the header shows `synced` / `saving…` / `offline`).
- **Themes** — follows your OS light/dark preference.

## Run it with Docker

Requires only Docker (Desktop or Engine) with Compose v2.

The `server` (persistence) service starts automatically as a dependency of both the
dev and web services, so you only need to name the frontend you want.

**Development** — hot-reloading dev server:

```bash
docker compose up dev
```

Then open http://localhost:5173. Source is bind-mounted, so edits reload instantly.
Vite proxies `/api` to the backend.

**Production** — optimized build served by nginx (this is the one to run on a shared
host so multiple devices share a board):

```bash
docker compose up --build web
```

Then open http://localhost:8080 from any device that can reach the host. nginx serves
the static app and proxies `/api` to the backend.

The board is persisted to a named Docker volume (`kando-data`), so it survives restarts.
Stop the containers (keeping your data) with:

```bash
docker compose down
```

To also wipe the stored board, add `-v`:

```bash
docker compose down -v
```

## Run it without Docker

If you have Node 22+, run the backend and the frontend in two terminals:

```bash
# terminal 1 — persistence API on :3001 (stores board.json in ./server/data)
cd server && DATA_DIR=./data npm start
```

```bash
# terminal 2 — frontend
npm install
npm run dev      # dev server at http://localhost:5173, proxies /api to :3001
npm run build    # production build into dist/
npm run preview  # preview the production build
```

The frontend expects the API at `/api`; in dev, Vite proxies it to `http://localhost:3001`
(override with the `API_PROXY_TARGET` env var).

## Project layout

```
src/
  main.tsx            React entry
  App.tsx             Layout + header (with sync-status indicator)
  useBoard.ts         Board state + actions; server sync (load/save/poll) + local cache
  api.ts              Fetch client for the /api persistence endpoints
  storage.ts          localStorage cache load/save + default seed + migration
  types.ts            Card / Column / Tag / BoardState (normalized)
  palette.ts          Preset tag colors
  components/
    Board.tsx         Columns row + card & column drag contexts + add-column
    Column.tsx        Header (grip handle), card list, drop logic, card composer
    Card.tsx          Draggable card: inline edit, tag pills, due-date pill
    TagPicker.tsx     Portaled popover to assign/create/delete tags
  styles.css          Design tokens + all styles (light/dark)
server/
  index.mjs           Dependency-free Node persistence API (GET/PUT board, version)
  package.json        Backend metadata (no dependencies)
  Dockerfile          Backend image
Dockerfile            Multi-stage frontend prod build -> nginx
Dockerfile.dev        Frontend dev server image
docker-compose.yml    server + dev + web services (+ kando-data volume)
nginx.conf            Static serving + /api proxy + SPA fallback
```

## How sync works

The backend keeps the board as a single JSON document plus a `version` counter that
bumps on every save. Each browser:

1. Paints instantly from its `localStorage` cache, then hydrates from `GET /api/board`
   (the server wins on load).
2. Pushes changes with `PUT /api/board` (debounced), and caches them locally too.
3. Polls `GET /api/version` every ~2s; when it changes, it pulls the new board and
   re-renders — that's what makes edits from other devices appear.

Saves use last-write-wins, which is the right trade-off for one person across their own
devices. If the server is unreachable, edits stay local and re-sync once it returns.

## Data model

State is normalized — columns hold an ordered list of card ids, and the cards live
in a lookup map — so moving and reordering is just splicing id arrays:

```ts
Tag        = { id, name, color }
Card       = { id, title, dueDate?, tagIds }
Column     = { id, title, cardIds }
BoardState = { columns: Column[], cards: Record<string, Card>, tags: Record<string, Tag> }
```

Tags live in a shared map and are referenced by cards via `tagIds`, so a tag's name/color
is defined once and reused everywhere.

The board is stored server-side (JSON on the `kando-data` volume) and mirrored into the
browser's `localStorage` (key `kanban-board-v1`) as an offline cache.
