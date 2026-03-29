# SPMS — Student Profiling Management System

React + Vite frontend with a **Node.js** API and **SQLite** for users, auth, and sections. Some student data (profiles, skills) is stored in the browser (IndexedDB).

---

## Getting started

Commands your partner needs to run to get the system working.

### Prerequisites

- **Node.js** v18 or newer (LTS recommended)

### 1. Install dependencies

From the **project root**:

```bash
npm install
```

### 2. Run the app (two terminals)

**Terminal 1 — API** (must run from project root):

```bash
npm run dev:api
```

Starts the backend on **http://localhost:3001** (SQLite database at `api/data/spms.sqlite`).

**Terminal 2 — Frontend:**

```bash
npm run dev
```

Opens the app at **http://localhost:5173** (Vite proxies `/api` to the backend).

### Optional: one terminal

```bash
npm run dev:all
```

Runs the API and Vite together.

### Environment (optional)

Copy `.env.example` to `.env` if you want to override defaults:

- `API_PORT` — API port (default `3001`)
- `JWT_SECRET` — secret for signing login tokens (change in production)

---

## Demo accounts

| Role     | Email                 | Password   |
|----------|----------------------|------------|
| Registrar | `registrar@spms.edu` | `reg123`   |
| Faculty  | `faculty@spms.edu`   | `faculty123` |
| Student  | `student@spms.edu`   | `student123` |

---

## Build for production

```bash
npm run build
npm run preview
```

---

## Project layout (high level)

- `src/` — React app (pages, auth, components)
- `api/` — Express API (`index.js`, `db.js`, SQLite)
