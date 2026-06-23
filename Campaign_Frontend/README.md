# SIR Monitoring Dashboard

Role-based, mobile-responsive frontend for SIR (Special Intensive Revision) field monitoring.
Built with Vite + React. Two roles: **Super Admin** (1 login) and **AC Level** (175 logins, one per constituency).

This was scaffolded from a hand-drawn wireframe — see the role/page mapping below.

## Quick start

```bash
npm install
cp .env.example .env   # then edit if your FastAPI backend runs somewhere other than localhost:8000
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

## Demo login (no backend needed yet)

The app ships with **mock data turned on by default** (`VITE_USE_MOCKS` is `true` unless you explicitly set it
to `false`), so you can click through the entire UI before FastAPI is wired up.

| Role | Username | Password |
|---|---|---|
| Super Admin | `superadmin` | `admin123` |
| AC Level | `ac001` (or any `ac001`–`ac175`) | `ac123` |

Once your FastAPI backend is ready, set `VITE_USE_MOCKS=false` in `.env` and point `VITE_API_BASE_URL` at it —
no component code needs to change, since every page reads data through the `src/api/*.js` modules / `useSirData`
hooks rather than calling mocks directly.

## Project structure

```
src/
  api/            -- one file per backend resource. Each file's top comment is the exact
                     FastAPI contract (request/response shape) this frontend expects.
                     client.js     axios instance + JWT interceptor + 401 handling
                     auth.js       login / profile / logout
                     sir.js        SIR dashboard summary, AC/booth breakdown, trend
                     materials.js  upload, list, stats, download, click-tracking
                     acs.js        directory of all 175 ACs (for the targeting picker)
                     mockData.js   demo data + demo login, gated by VITE_USE_MOCKS

  context/
    AuthContext.jsx -- holds the logged-in user, role, JWT; exposes login()/logout()

  routes/
    ProtectedRoute.jsx -- route guard; redirects unauthenticated users to /login,
                          and redirects wrong-role users to their own home

  components/
    layout/AppShell.jsx -- sidebar (desktop) / bottom tab bar (mobile) + topbar shell
    common/   -- Card, StatTile, Badge, TallyStrip (progress), AcPicker (multi-select)
    charts/   -- TrendChart (recharts area chart)

  pages/
    auth/Login.jsx
    superadmin/
      SuperAdminDashboard.jsx   -- aggregated SIR stats, AC-wise progress
      MaterialUploads.jsx       -- upload form + history (this AC / few ACs / all 175)
      MaterialUploadForm.jsx
      MaterialDownloadStats.jsx -- click/download analytics across materials
    ac/
      AcDashboard.jsx   -- this AC's SIR stats, booth-agent-wise progress
      AcMaterials.jsx   -- read-only list: Name / Date / Clicks / Download
    Profile.jsx         -- shared by both roles

  hooks/useSirData.js  -- data-fetching hooks; transparently swap mock <-> real API
  utils/format.js      -- number/date/file-size formatting
  utils/navConfig.js   -- per-role sidebar/nav items
```

## Role -> page map (from the wireframe)

**Super Admin**
- Profile
- SIR Dashboard — aggregated stats pulled from the backend/field-data DB, same data everyone eventually rolls up from
- Material → Uploads — push a file to one AC, a handful of ACs, or all 175 at once
- Material → Downloads — see who clicked / downloaded each file you sent

**AC Level** (175 separate logins)
- Profile
- SIR Dashboard — same shape of stats, scoped to just their own constituency, broken down by booth agent
- Material — single list view (Name, Date, Clicks, Download) of everything Super Admin has sent them

## Auth

JWT-based. `AuthContext` stores the access token + a cached user object in `localStorage`, attaches
`Authorization: Bearer <token>` to every API call via an axios interceptor, and force-logs-out on any `401`.
Swap in a refresh-token flow in `AuthContext.jsx` once your FastAPI backend issues one.

## Wiring up FastAPI

Every function in `src/api/*.js` has the expected request/response shape documented directly above it in a
comment. Implement those routes on the FastAPI side (or tell me your actual route names/shapes and I'll match
the frontend to them exactly), set `VITE_USE_MOCKS=false`, and the UI will start working against live data with
no further frontend changes.

## Responsiveness

Single breakpoint at `860px` (see `AppShell.css`): above it you get a fixed sidebar; below it the sidebar becomes
a slide-in drawer (hamburger menu) and a bottom tab bar takes over primary navigation, similar to a mobile app.
All tables scroll horizontally on narrow screens rather than breaking layout.
# Campaign_Monitoring

end