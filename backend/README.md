# CodexBoard Backend

Always install Python dependencies into the local virtual environment at `backend/.venv`.

## First-Time Setup

From this folder:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If your shell is `fish`:

```bash
source .venv/bin/activate.fish
```

If your shell is `csh` or `tcsh`:

```bash
source .venv/bin/activate.csh
```

## Run The API

With the virtual environment activated:

```bash
python -m uvicorn main:app --reload --port 8000
```

The frontend Vite proxy expects this server on `http://localhost:8000`.

## Run Tests

With the virtual environment activated:

```bash
pytest
```

## Important Rule

Do not install backend dependencies globally. Use `backend/.venv` for:

- `pip install`
- `pytest`
- `uvicorn`
- any future backend scripts
