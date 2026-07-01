# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agentic Notes is an AI-powered note-taking app with a FastAPI backend and Next.js frontend. Key features:
- Note editor with live Markdown preview (edit / preview / split modes)
- 4 flexible UI layouts (sidebar, top-nav, compact, focus)
- AI chat over your notes (Ollama / Claude / Gemini, switchable at runtime)
- Link-to-note conversion with auto-tagging via AI
- Neo4j knowledge graph built automatically from note content
- Telegram bot for note creation and search
- Notes saved as Obsidian-compatible Markdown files in `notes/`

## Repository Structure

```
agentic_notes/
├── backend/              # FastAPI Python backend
│   ├── app/
│   │   ├── main.py       # FastAPI app + lifespan (DB init, seed, Telegram)
│   │   ├── core/         # config.py, database.py, neo4j_client.py
│   │   ├── models/       # SQLModel tables: Note, Category, Link, AppSettings
│   │   ├── api/          # Route modules: notes, categories, links, graph, chat, settings
│   │   └── services/     # ai_service, link_service, graph_service, telegram_service, markdown_service
│   ├── start.sh          # Creates venv, installs deps, runs uvicorn --reload
│   ├── requirements.txt
│   └── .env.example      # Copy to .env and fill in secrets
├── frontend/             # Next.js 14 (App Router) + TypeScript + Tailwind
│   └── src/
│       ├── app/          # Page routes: /, /notes, /notes/new, /notes/[id], /graph, /links, /chat, /settings
│       ├── components/
│       │   ├── layout/   # AppShell, Sidebar, TopNav, LayoutSwitcher
│       │   ├── notes/    # NoteCard, NoteEditor
│       │   ├── graph/    # KnowledgeGraph (react-force-graph-2d)
│       │   └── chat/     # ChatInterface
│       ├── lib/          # api.ts (typed API client), store.ts (zustand), utils.ts
│       └── types/        # Shared TypeScript types
├── notes/                # Markdown files with YAML frontmatter (Obsidian-compatible)
├── docker-compose.yml    # Neo4j 5 on ports 7474 / 7687
└── CLAUDE.md
```

## Running the App

### 1. Start Neo4j (optional — graph features degrade gracefully without it)
```bash
docker compose up -d
```

### 2. Backend
```bash
cd backend
cp .env.example .env   # add API keys as needed
./start.sh             # creates venv, installs, starts on :8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev            # starts on :3000
```
The frontend proxies `/api/*` to `http://localhost:8000/api/*` via `next.config.ts`.

## Development Commands

```bash
# Backend — run single test file
cd backend && source .venv/bin/activate
python -m pytest tests/test_notes.py -v

# Frontend lint
cd frontend && npm run lint

# Frontend build (type-check)
cd frontend && npm run build
```

## Key Architecture Notes

**AI provider switching** — `settings.AI_PROVIDER` in `app/core/config.py` is overridden at runtime by the Settings API (`/api/settings PATCH`). All AI calls route through `app/services/ai_service.py` which dispatches to Ollama / Anthropic / Google based on this value.

**Background enrichment** — After creating or updating a note, `BackgroundTasks` in `api/notes.py` calls `_enrich_and_save()` which: generates a summary, extracts tags, writes the `.md` file, and upserts the Neo4j graph. This is fire-and-forget; the API responds immediately.

**Neo4j optional** — `get_driver()` in `neo4j_client.py` catches connection failures and returns `None`. All graph service calls guard on `if not driver: return`. This lets the app run without Docker.

**Markdown storage** — Every note is written to `notes/<slug>.md` with YAML frontmatter (title, date, tags, category, source). These files are self-contained and importable by Obsidian.

**Layout modes** — Stored in Zustand (`useUIStore`, persisted to localStorage). `AppShell` reads the mode and renders: sidebar layout (default), top navigation bar, compact collapsed sidebar, or full-width focus mode.

**Tags** — Stored as a JSON string in the `Note.tags` column (SQLite doesn't have array types). `Note.get_tags()` / `set_tags()` handle serialization. The `NoteRead` response model exposes them as `List[str]`.

## Environment Variables (backend/.env)

| Variable | Default | Purpose |
|---|---|---|
| `AI_PROVIDER` | `ollama` | `ollama` / `claude` / `gemini` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Local Ollama server |
| `OLLAMA_MODEL` | `llama3.1` | Model name for Ollama |
| `ANTHROPIC_API_KEY` | — | For Claude provider |
| `GOOGLE_API_KEY` | — | For Gemini provider |
| `TELEGRAM_BOT_TOKEN` | — | From @BotFather; bot starts automatically if set |
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j Bolt URI |
| `NEO4J_PASSWORD` | `password123` | Matches docker-compose.yml |
| `NOTES_DIR` | `../notes` | Where `.md` files are saved |

## API Overview

All endpoints are prefixed with `/api`.

| Method | Path | Description |
|---|---|---|
| GET/POST | `/notes/` | List (with filters) / create |
| GET/PATCH/DELETE | `/notes/{id}` | Read / update / delete |
| POST | `/notes/{id}/enrich` | Re-run AI enrichment |
| GET/POST | `/categories/` | List / create |
| GET/POST | `/links/` | List / add URL |
| POST | `/links/{id}/reprocess` | Re-scrape and summarize |
| GET | `/graph/` | Full graph data for visualization |
| GET | `/graph/search?q=` | Search graph nodes |
| POST | `/chat/ask` | Quick question over all notes |
| POST | `/chat/` | Multi-turn chat with context |
| GET/PATCH | `/settings/` | Read / update runtime config |
| GET | `/settings/ollama/models` | List available Ollama models |
