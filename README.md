# Agentic Notes

An AI-powered, agentic note-taking application with knowledge graph visualization, Telegram bot integration, link summarization, and support for local and cloud AI models.

---

## Features

| Feature | Details |
|---|---|
| **Note Editor** | Markdown with live Edit / Preview / Split modes, auto-tagging, AI summary |
| **Dashboard** | Category tiles, pinned notes, recent links, stats |
| **AI Chat** | Ask questions over all your notes; context-aware answers |
| **Link → Note** | Paste a URL → scrapes, summarizes, and tags it automatically |
| **Knowledge Graph** | Neo4j graph of entities (concepts, people, orgs) extracted from notes; click any node for a context panel |
| **Telegram Bot** | `/note`, `/search`, `/ask`, `/recent` commands from any device |
| **Obsidian Export** | Every note saved as `notes/<slug>.md` with YAML frontmatter |
| **Flexible Layout** | Sidebar · Top Nav · Compact · Focus — switchable live |
| **AI Providers** | Ollama (local) · Claude (Anthropic) · Gemini (Google) — switchable in Settings |

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Python | 3.11+ | [python.org](https://www.python.org) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Docker | any | [docker.com](https://www.docker.com) (for Neo4j) |
| Ollama | latest | [ollama.com](https://ollama.com) (for local AI) |

---

## Quick Start

### 1 — Clone and enter the project

```bash
git clone <repo-url> agentic_notes
cd agentic_notes
```

### 2 — Start Neo4j (knowledge graph)

```bash
docker compose up -d
```

Neo4j browser available at **http://localhost:7474**  
Default credentials: `neo4j` / `password123`

> Neo4j is optional. The app runs without it; graph features are gracefully disabled.

### 3 — Start the backend

```bash
cd backend
cp .env.example .env        # copy config (edit to add API keys)
bash ./start.sh             # creates venv, installs deps, starts on :8000
```

`start.sh` does the following automatically:
- Creates a Python virtual environment in `backend/.venv`
- Installs all dependencies from `requirements.txt`
- Starts FastAPI with `uvicorn --reload` on port **8000**

### 4 — Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev                 # starts Next.js on :3000
```

Open **http://localhost:3000** in your browser.

---

## AI Provider Setup

The AI provider is configured in **Settings → AI Provider** inside the app, or via `backend/.env` before starting.

### Option A — Ollama (local, fully private)

```bash
# Install Ollama from https://ollama.com, then pull a model:
ollama pull llama3.2        # fast, ~2 GB
# or
ollama pull llama3.1        # larger, better quality

ollama serve                # starts on localhost:11434
```

In Settings, set **Provider = Ollama**, URL = `http://localhost:11434`, then click the **↻** button to pick the model from the list.

### Option B — Claude (Anthropic)

1. Get an API key at [console.anthropic.com](https://console.anthropic.com)
2. In Settings → AI Provider → select **Claude**
3. Paste your key — recommended model: `claude-sonnet-4-6`

Or set in `.env` before starting:
```env
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
```

### Option C — Gemini (Google)

1. Get an API key at [aistudio.google.com](https://aistudio.google.com)
2. In Settings → AI Provider → select **Gemini**
3. Paste your key — recommended model: `gemini-1.5-flash`

Or set in `.env`:
```env
AI_PROVIDER=gemini
GOOGLE_API_KEY=AIza...
```

---

## Telegram Bot Setup

1. Open Telegram and message **@BotFather**
2. Send `/newbot` and follow the prompts — copy the token
3. In the app: **Settings → Telegram Bot** → paste the token → **Save Settings**
4. Restart the backend: `Ctrl+C` in the backend terminal, then `bash ./start.sh` again

**Available commands:**

| Command | What it does |
|---|---|
| `/start` | Show help |
| `/note <text>` | Create a quick note |
| `/search <query>` | Full-text search your notes |
| `/ask <question>` | Ask AI a question about your notes |
| `/recent` | Show the 5 most recent notes |

---

## Knowledge Graph Setup

### Connect Neo4j

1. Run `docker compose up -d` (if not already running)
2. In the app: **Settings → Neo4j Knowledge Graph**
   - URI: `bolt://localhost:7687`
   - User: `neo4j`
   - Password: `password123`
3. Click **Test** — you should see a green "Connected" message
4. Click **Save Settings**

### Populate the graph

Go to the **Knowledge Graph** page and click **Rebuild Graph**. This re-processes all existing notes through AI entity extraction and populates Neo4j.

New notes are added to the graph automatically in the background after creation.

### Using the graph

- **Click any node** → side panel slides in showing which notes reference that entity, with summaries and source links
- **Shared nodes** — concepts/people that appear in multiple notes are a single node, connecting those notes visually
- **Purple edges** = `RELATED_TO` (notes sharing 2+ concepts are automatically linked)
- Use **Rebuild Graph** after changing AI providers to get cleaner entity extraction

---

## Environment Variables

All variables live in `backend/.env`. The app reads them at startup and they can also be updated live via **Settings** in the UI.

```env
# ── App ────────────────────────────────────────────
APP_NAME="Agentic Notes"
DEBUG=false
NOTES_DIR=../notes          # where .md files are saved (relative to backend/)
CORS_ORIGINS=http://localhost:3000

# ── Neo4j ──────────────────────────────────────────
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123

# ── AI Provider ────────────────────────────────────
AI_PROVIDER=ollama          # ollama | claude | gemini
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

ANTHROPIC_API_KEY=          # required if AI_PROVIDER=claude
CLAUDE_MODEL=claude-sonnet-4-6

GOOGLE_API_KEY=             # required if AI_PROVIDER=gemini
GEMINI_MODEL=gemini-1.5-flash

# ── Telegram ───────────────────────────────────────
TELEGRAM_BOT_TOKEN=         # from @BotFather; leave empty to disable
```

---

## Project Structure

```
agentic_notes/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── core/
│   │   │   ├── config.py        # Pydantic settings
│   │   │   ├── database.py      # Async SQLite (SQLModel)
│   │   │   └── neo4j_client.py  # Neo4j driver with auto-reconnect
│   │   ├── models/              # SQLModel tables: Note, Category, Link, AppSettings
│   │   ├── api/                 # Route modules (notes, links, graph, chat, settings)
│   │   └── services/
│   │       ├── ai_service.py    # Unified Ollama/Claude/Gemini client
│   │       ├── link_service.py  # URL scraping + AI enrichment
│   │       ├── graph_service.py # Neo4j CRUD + entity normalization
│   │       ├── telegram_service.py
│   │       └── markdown_service.py
│   ├── start.sh                 # One-command startup script
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/
│       ├── app/                 # Next.js App Router pages
│       ├── components/
│       │   ├── layout/          # AppShell, Sidebar, TopNav, LayoutSwitcher
│       │   ├── notes/           # NoteCard, NoteEditor (edit/preview/split)
│       │   ├── graph/           # KnowledgeGraph with click-to-context panel
│       │   └── chat/            # ChatInterface
│       ├── lib/
│       │   ├── api.ts           # Typed API client
│       │   ├── store.ts         # Zustand (layout mode, theme, chat history)
│       │   └── utils.ts
│       └── types/               # Shared TypeScript types
├── notes/                       # Markdown files (Obsidian-compatible)
├── docker-compose.yml           # Neo4j 5 on 7474 / 7687
└── README.md
```

---

## API Reference

Base URL: `http://localhost:8000/api`

| Method | Path | Description |
|---|---|---|
| `GET` | `/notes` | List notes (supports `?search=`, `?category_id=`, `?tag=`, `?pinned=`) |
| `POST` | `/notes` | Create note |
| `PATCH` | `/notes/{id}` | Update note |
| `DELETE` | `/notes/{id}` | Delete note |
| `POST` | `/notes/{id}/enrich` | Re-run AI enrichment (summary + tags) |
| `GET` | `/categories` | List categories |
| `POST` | `/categories` | Create category |
| `GET` | `/links` | List saved links |
| `POST` | `/links` | Add URL (scraping runs in background) |
| `POST` | `/links/{id}/reprocess` | Re-scrape a link |
| `GET` | `/graph` | Full graph data (nodes + edges) |
| `GET` | `/graph/status` | Neo4j connection status + node/edge counts |
| `GET` | `/graph/node-context` | Context panel data for a clicked node |
| `POST` | `/graph/rebuild` | Re-process all notes into Neo4j |
| `POST` | `/chat/ask` | Quick question over all notes |
| `POST` | `/chat` | Multi-turn chat |
| `GET` | `/settings` | Read current settings |
| `PATCH` | `/settings` | Update settings (live, no restart needed) |
| `POST` | `/settings/neo4j/test` | Test Neo4j connection |
| `GET` | `/settings/ollama/models` | List available Ollama models |
| `GET` | `/health` | Health check |

Interactive API docs: **http://localhost:8000/docs**

---

## Obsidian Integration

All notes are saved as Markdown files in the `notes/` directory at the project root.

Each file has YAML frontmatter compatible with Obsidian:

```markdown
---
title: My Note
date: 2026-07-01T10:30:00
tags: [ai, productivity, tools]
category: Research
source: https://example.com
---

# My Note

Note content here...
```

To open in Obsidian: **Open Vault** → select the `notes/` folder.

---

## Troubleshooting

**Backend won't start — `lxml` build error**
```bash
# Use the built-in parser (already fixed in requirements.txt — make sure lxml is absent)
grep lxml backend/requirements.txt   # should return nothing
```

**Ollama 404 on chat endpoint**
```bash
ollama list                # check what models are installed
ollama pull llama3.2       # pull a model if empty
```
The app auto-selects the first available model if the configured one isn't found.

**Neo4j connection refused**
```bash
docker compose ps          # check if neo4j container is running
docker compose up -d       # start it if not
```
Then go to Settings → Neo4j → click **Test** to verify.

**Graph is empty after rebuild**
- Ensure an AI provider is working (test it via the Chat page — ask a question)
- Check backend logs for enrichment errors
- Graph rebuild runs in the background; wait ~30 seconds then refresh

**API returns 404 on all routes**
- FastAPI is configured with `redirect_slashes=False`; the Next.js proxy strips trailing slashes before forwarding — this is expected behaviour and already handled

**CORS errors in browser console**
- Ensure `CORS_ORIGINS=http://localhost:3000` is in `backend/.env`
- Restart the backend after editing `.env`
