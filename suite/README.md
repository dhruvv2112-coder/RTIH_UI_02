# RTIH · Godavari Pushkaralu 2027 — local suite

One small Node.js server runs all three apps on your laptop and links them live:

| URL | App | Repo |
|---|---|---|
| `http://localhost:8080/` | Home — QR codes for phones, live activity log, demo reset | — |
| `/command/` | **Pushkaralu Command** — surveillance dashboard | RTIH_UI_01 |
| `/staff/` | **Godavari Field** — staff & vendor app | RTIH_UI_02 |
| `/pilgrim/` | **Godavari Yatra** — pilgrim app | RTIH_UI_03 |

## Run it on Windows

1. Install **Node.js LTS** (18 or newer) from <https://nodejs.org/> — the normal Windows installer.
2. Unzip this folder anywhere (e.g. `Documents\rtih-godavari-suite`).
3. Double-click **`start-windows.bat`**. The home page opens in your browser.
4. When Windows Defender Firewall asks about Node.js, tick **Private networks** and click **Allow** — this lets phones on the same Wi-Fi open the apps. (No firewall prompt? Phones can still be blocked; allow `node.exe` in *Windows Security → Firewall → Allow an app*.)
5. Stop with **Ctrl+C** in the black window, or just close it.

No `npm install` is needed: the server has zero dependencies and the apps are pre-built. Port busy? Run `set PORT=8090` then `node server\server.mjs` from a Command Prompt in this folder.

macOS / Linux: `./start-mac.sh` (or `node server/server.mjs`).

## What is live-linked

| From | Action | Appears in |
|---|---|---|
| Pilgrim app | Hold **SOS** 1 s | Command: critical "Pilgrim SOS" alert + chime · Home log |
| Command | **Dispatch** an alert to *Ramesh K* (badge "Field app · online") | Field app: full-screen Incoming Dispatch · Pilgrim: "Help is on the way — Ramesh Kumar, 200 m, 3 min" |
| Command | Dispatch to anyone else | Simulated radio responder accepts after 6 s |
| Field app | Accept / Decline (reason) / Note / Escalate / Complete | Command alert progress, staff status, resolution · Pilgrim: accepted → "Help reached you" |
| Field app | **Field Report** submit, **Inspection** submit (Fail grade) | Command: new alert |
| Field app | Hold the **SOS** button on My Tasks 1.5 s | Command: "Staff SOS" alert |
| Command | **Emergency protocol** on/off | Field + Pilgrim: advisory banner/toast, notification |

Urgent Command dispatches pre-empt the field user's current task (it moves to *Up Next* and resumes after).
The Field app's offline mode still works: actions taken while "offline" are queued and sent to Command on reconnect.

Live state (SOS calls, dispatches, reports, log) is kept in `data/live-state.json`; **Reset live demo data** on the home page clears it. Each app also keeps its own demo data in the browser (use the app's own reset/restart control).

## 3D map

Command → **Map** tab → **3D**, and Field app → **Map** → **3D** open a MapLibre GL 3D view with real buildings (OpenFreeMap tiles, no API key) plus zones, radar-only areas, 3D crowd columns, alerts, staff and the task route. It needs internet; without it the apps say so and keep the 2D map. See `docs/MAP_COMPARISON.md` for the Google / Mapbox / Mappls / Ola / MapLibre comparison and recommendation. Georeferencing uses two approximate control points in `geo.js`.

## Updating the apps

The `apps/` folder is a copy of the three repos. With the repos cloned next to this folder:

```
RTIH_UI_01/  RTIH_UI_02/  RTIH_UI_03/  rtih-godavari-suite/
```

build the pilgrim app (`cd RTIH_UI_03 && npm install && npm run build`) and run `node scripts/assemble.mjs`.

## API (for integration)

`GET /api/health` · `GET /api/state` · `GET /api/events` (Server-Sent Events: `alert:new`, `alert:update`, `task:new`, `task:update`, `sos:update`, `report:new`, `broadcast`, `presence`, `reset`) · `POST /api/sos` · `POST /api/sos/:id/cancel` · `POST /api/dispatch` · `POST /api/recall/:alertId` · `POST /api/alerts/:id/state` · `POST /api/tasks/:id/(accept|decline|complete|note|escalate)` · `POST /api/reports` · `POST /api/inspections` · `POST /api/broadcast` · `POST /api/reset`.

This is a demo server for a trusted local network: no authentication, in-memory state. In production these map to the Command, Staff and Pilgrim API gateways in the briefs.

Each app still works on its own (e.g. on Vercel) — when `/api/health` isn't there it falls back to its built-in simulation.
