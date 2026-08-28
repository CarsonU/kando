# Kando

A clean, local-only kanban board. Columns and cards, drag-and-drop, and everything
saved in your browser — no server, no account, no database.

Built with **Vite + React + TypeScript**, styled with plain CSS (light/dark themes),
and packaged to build and run entirely in **Docker**.

## Features

- **Columns** — add, rename (click the title), delete, and **reorder by dragging the grip handle** (⠿).
  Seeded with To Do / In Progress / Done on first run.
- **Cards** — add via the composer at the bottom of a column, double-click to edit, delete on hover.
- **Drag & drop** — reorder cards within a column and move them between columns, with a live drop indicator.
- **Due dates** — hover a card and click the calendar button to set a due date. The pill colors itself:
  red when overdue, accent when due today, muted when upcoming.
- **Tags** — a shared, reusable label palette. Hover a card, click the tag button, and assign one or more
  colored tags (or create a new one from a preset palette). Deleting a tag removes it from every card.
- **Persistence** — every change is auto-saved to `localStorage`; reload and it's still there. Boards saved
  before tags/due dates were added keep working (fields are backfilled on load).
- **Themes** — follows your OS light/dark preference.

## Run it with Docker

Requires only Docker (Desktop or Engine) with Compose v2.

**Development** — hot-reloading dev server:

```bash
docker compose up dev
```

Then open http://localhost:5173. Source is bind-mounted, so edits reload instantly.

**Production** — optimized build served by nginx:

```bash
docker compose up --build web
```

Then open http://localhost:8080.

Stop everything with:

```bash
docker compose down
```

## Run it without Docker

If you have Node 22+:

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## Project layout

```
src/
  main.tsx            React entry
  App.tsx             Layout + header
  useBoard.ts         All board state + actions, auto-persisted to localStorage
  storage.ts          localStorage load/save + default seed + migration
  types.ts            Card / Column / Tag / BoardState (normalized)
  palette.ts          Preset tag colors
  components/
    Board.tsx         Columns row + card & column drag contexts + add-column
    Column.tsx        Header (grip handle), card list, drop logic, card composer
    Card.tsx          Draggable card: inline edit, tag pills, due-date pill
    TagPicker.tsx     Portaled popover to assign/create/delete tags
  styles.css          Design tokens + all styles (light/dark)
Dockerfile            Multi-stage prod build -> nginx
Dockerfile.dev        Dev server image
docker-compose.yml    dev + web services
nginx.conf            SPA fallback for the nginx runtime
```

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

Stored under the `localStorage` key `kanban-board-v1`.
