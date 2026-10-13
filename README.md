# web

Web app and landing page for **CampusPulse**, a UPT campus companion (timetable, exams, campus
map, reminders). A student project for the Mobile Systems and Applications course; it is not an
official UPT app. The mobile app lives in [`mobile`](https://github.com/CampusPulse-ro/mobile)
and the backend in [`api`](https://github.com/CampusPulse-ro/api).

- **Stack:** React 19 · Vite · TypeScript · Tailwind CSS v4 · React Router
- **Package manager:** Bun
- **Theme:** dark only

## Running it

```bash
bun install
bun dev            # http://localhost:5173
```

```bash
bun run build      # tsc -b && vite build  -> dist/
bun run preview    # serve the production build locally
bun run lint       # oxlint
```

CI (`.github/workflows/ci.yml`) runs lint and build on every PR and on pushes to `main`.

## Routes

| Path | What |
|---|---|
| `/` | landing page (placeholder) |
| `/app` | the web app (placeholder) |
| `/privacy` | privacy policy (draft; Google Play needs this URL) |
| `/account-deletion` | how to delete your account (draft; Google Play needs this URL) |

## Deploying

It will be deployed to Cloudflare Pages as a static SPA: `public/_redirects` sends every path
to `index.html` so client-side routes work on reload. No deploy workflow yet.
