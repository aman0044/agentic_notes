#!/bin/bash
set -e
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — edit it to add API keys"
fi

if [ ! -d .venv ]; then
  echo "Creating virtualenv..."
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r requirements.txt

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
