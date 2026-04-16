CodexBoard frontend is a React + Vite application that talks to the FastAPI backend through the dev proxy.

## Getting Started

First, install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) with your browser to see the result.

The frontend proxies `/api`, `/ws`, and `/outputs` to the backend on `http://localhost:8000`.

If you need UI-only development with the old in-browser mocks, start Vite with `VITE_USE_MOCKS=true npm run dev`.
