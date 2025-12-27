# StackScribe

A cross-platform desktop app for keeping structured notes, technical run-books and code snippets.  
Built with **Tauri 2** (Rust) on the backend and **React + TypeScript** on the frontend, StackScribe is lightweight (<10 MB install size) yet fully native.

---

## Domain model

```
Archive  →  Tome  →  Entry (.md)
```

* **Archive** – top-level collection (e.g. "Kubernetes", "Data Science").  
  Persisted as a folder under `archives/<archive_name>/` with an `archive.json` metadata file.
* **Tome** – subsections inside an archive. Each tome is its own folder inside `…/tomes/`.
* **Entry** – individual Markdown files located in `…/entries/` inside a tome.

All data lives **outside** the code tree in `Grimoire-ts/archives/`, so creating or editing content will not trigger hot-reloads of the Rust backend during development.

---

## Tech stack

| Layer       | Technology                              |
|-------------|-----------------------------------------|
| Frontend    | React 18 + TypeScript, Vite, Radix UI   |
| Markdown    | `react-markdown` + `remark-gfm`          |
| Backend     | Rust 2021, Tauri 2, `tauri-plugin-opener` |
| Icons       | `@radix-ui/react-icons`                 |
| State       | Simple in-memory structs shared via Tauri commands |

The codebase deliberately avoids an embedded database; files on disk are the source of truth, keeping the project dependency-free and easy to inspect or back-up.

---

## Repository layout

```
├─ src/                      # React frontend (Vite project)
│  ├─ components/            # UI components (organized by feature)
│  │  ├─ ai/                 # AI-related components (suggestions, service manager)
│  │  ├─ archive/            # Archive selection and creation
│  │  ├─ dialogs/            # Modal dialogs (preferences, prompts)
│  │  ├─ editor/             # Markdown editor and slash commands
│  │  ├─ layout/             # App layout (header, tabs, menu)
│  │  ├─ sidebar/            # Navigation tree (archives, tomes, entries)
│  │  └─ ui/                 # Reusable UI primitives
│  ├─ hooks/                 # Custom React hooks
│  ├─ lib/                   # Database and sync utilities
│  ├─ services/              # External service integrations
│  ├─ stores/                # Data store operations
│  ├─ styles/                # CSS stylesheets
│  ├─ themes/                # Editor and preview themes
│  ├─ types/                 # TypeScript type definitions
│  └─ utils/                 # Utility functions
├─ src-tauri/                # Rust source and Tauri configuration
│  └─ src/                   # Rust commands, models and plugin setup
├─ stackscribe-ai-service/   # Python AI service (FastAPI)
└─ archives/                 # (Created at runtime) User data – NOT committed
```

---

## Getting started

### Prerequisites

* **Rust** (stable) with `cargo`  
  `rustup default stable`
* **Node.js** ≥ 18
* **Tauri CLI**  
  `cargo install tauri-cli`

### Development

```bash
# install JS dependencies
npm install

# launch Vite + Tauri in dev-mode (hot reload)
npm run tauri dev
```

### Production build

```bash
npm run tauri build   # creates platform-specific installers
```

---

## Roadmap / ideas

- Frontend search across entries
- Drag-and-drop re-ordering of tomes / entries
- Optional Git integration for versioning archives
- Export / import archives as zip bundles

Contributions and feature requests are welcome—feel free to open an issue or PR!
