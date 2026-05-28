# Dussán Tennis Tracker 🎾

Cross-platform tennis tournament tracker for Santiago Dussán (Sub-18) and Nicole Dussán (Sub-12).

## Quick start

```bash
# 1. Install dependencies, init DB, and seed players
cd tennis-tracker
npm run setup

# 2. Run both server and client in development
# Terminal 1:
cd server && npm run dev        # API on http://localhost:3001

# Terminal 2:
cd client && npm run dev        # UI on http://localhost:5173
```

## Features

- **Dashboard** — player cards with live win rates, streak badges, last 8 matches
- **Player profile** — full stats, monthly win-rate chart, surface breakdown, head-to-head, filterable match history
- **Tournaments** — cards with win/loss bars, click to expand all matches, filter by country/player/surface/year
- **Match registration** — modal with autocomplete tournament search, score format validation
- **Reports** — export PDF (player summary + table) or Excel (all raw fields), filter before export
- **Settings** — edit player profiles, PIN lock toggle, JSON backup/restore

## Tech stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Recharts (Vite)
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite via Prisma ORM (local file `server/prisma/dev.db`)
- **Exports**: pdfkit (PDF), exceljs (Excel)
