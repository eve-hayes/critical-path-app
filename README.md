# Critical Path · Achievement Awards Group

**Live Production App (Vercel):** https://critical-path-app.vercel.app/  
**Direct HTML Link:** https://critical-path-app.vercel.app/index.html

A branded project and program planner with tasks and multi-level indented subtasks, document attachments, milestones (`◆`), durations, start, finish and due dates, `% complete`, responsible people, predecessors, comments, critical path, native Excel (`.xlsx`) & PDF (`.pdf`) exports, and a live interactive Gantt chart.

## Brand Identity (`aagroup.co.za/brand`)

Styled according to the **Achievement Awards Group Brand Hub**:
- **Core Palette**: Core White (`#EFEFEF`), Secondary Blue (`#0A162E`), Primary Blue (`#21409A`), Black (`#181818`), and Grey (`#939598`).
- **Functional Accents**: Lime (`#ACD253`) for completion progress, Cyan (`#59B0C4`) for focus and interactive cues, Orange (`#FBAB18`) for the Today marker, and Magenta (`#BB1D5E`) / Pink (`#E8909A`) for critical path and overdue tasks.
- **Typography**: `Archivo` (`"Archivo", "Aptos", Arial, sans-serif`) for headings, data tables, and UI controls.
- **Approved Assets**: Supplied Achievement Awards Group logos and symbol (`assets/brand/`).

## Persistent Database Architecture

Projects are automatically persisted across three synchronized tiers:
1. **Server Database (`/api/projects` & `/api/projects/stream`)**: Backed by `data/projects.json` via `server.js` with real-time Server-Sent Events (SSE) synchronization across open browser tabs and clients.
2. **Browser IndexedDB (`CriticalPathDB`) & LocalStorage**: Every project change is mirrored in IndexedDB for instant offline durability and cross-tab sync via `BroadcastChannel`.
3. **Optional Cloud Database Endpoint**: Click the **Saved / Synced · DB** pill in the top header (or open **⋯ → Database & sync…**) to connect a Firebase Realtime Database URL or custom REST endpoint for external serverless deployments.

## Run Locally

```bash
npm run dev
# Opens http://localhost:3000 with full database persistence
```
