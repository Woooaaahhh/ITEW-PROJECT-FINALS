# SPMS — Getting Started

Commands your partner needs to run to get the **Student Profiling Management System** working locally.

## Prerequisites

- **Node.js** (v18 or newer recommended)
- **npm** (comes with Node)

The backend is a **Node.js** API with **SQLite** (`api/`). No PHP is required.

## 1. Install dependencies

From the project root:

```bash
npm install
```

## 2. Environment (optional)

Copy `.env.example` to `.env` if you want to override defaults:

- `API_PORT` — API server port (default `3001`)
- `JWT_SECRET` — secret for signing login tokens (change in production)

## 3. Run the app (two terminals)

Both commands must run from the **project root**.

**Terminal 1 — API (SQLite + Express)**

```bash
npm run dev:api
```

You should see: `SPMS API running on http://localhost:3001`

**Terminal 2 — Frontend (Vite + React)**

```bash
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). The dev server proxies `/api` to the API on port 3001.

### One command (optional)

To start API and frontend together:

```bash
npm run dev:all
```

## 4. Demo logins

After the API has run once, SQLite is seeded with demo users:

| Role     | Email                 | Password   |
|----------|-----------------------|------------|
| Registrar | `registrar@spms.edu` | `reg123`   |
| Faculty  | `faculty@spms.edu`   | `faculty123` |
| Student  | `student@spms.edu`   | `student123` |

## Build for production

```bash
npm run build
npm run preview
```

For production, run the API separately (`node api/index.js` or your process manager) and serve the `dist/` folder with a static host or reverse proxy; configure `JWT_SECRET` and CORS as needed.
