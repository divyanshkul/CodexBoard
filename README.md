# CodexBoard

CodexBoard is a local board-style workflow app with:

- a React + Vite frontend in [frontend](./frontend)
- a FastAPI backend in [backend](./backend)

## Standard Local Setup

### 1. Frontend

```bash
cd frontend
npm install
```

### 2. Backend

Always use the backend virtual environment.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## Run The App

Start the backend first:

```bash
cd backend
source .venv/bin/activate
python -m uvicorn main:app --reload --port 8000
```

In a second terminal, start the frontend:

```bash
cd frontend
npm run dev
```

Then open:

- frontend: `http://localhost:5173`
- backend API: `http://localhost:8000`

## Why The Backend Matters

The frontend calls `/api/tickets` and connects to `/ws`. During development, Vite proxies those requests to the backend on port `8000`.

If the backend is not running:

- Vite will log proxy `ECONNREFUSED` errors
- the frontend will fall back to mock tickets
- the UI still renders, but it is not connected to the real API

## Verification

Frontend:

```bash
cd frontend
npm test
npm run build
```

Backend:

```bash
cd backend
source .venv/bin/activate
pytest
```

## Project Rule

Python libraries for this repo should be installed in `backend/.venv`, not globally.
