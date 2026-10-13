# web

Web app and landing page for **CampusPulse**, a UPT campus companion (timetable, exams, campus
map, reminders). A student project for the Mobile Systems and Applications course; it is not an
official UPT app. The mobile app lives in [`mobile`](https://github.com/CampusPulse-ro/mobile)
and the backend in [`api`](https://github.com/CampusPulse-ro/api).

- **Stack:** React 19 · Vite · TypeScript · Tailwind CSS v4 · React Router
- **Package manager:** Bun

## Prerequisites

- [Bun](https://bun.sh) (the package manager and script runner)
- Git, and a GitHub account with access to the `CampusPulse-ro` org

## Running it

```bash
bun install
bun dev              # http://localhost:5173
```

```bash
bun run build        # tsc -b && vite build  -> dist/
bun run preview      # serve the production build locally
bun run lint         # oxlint
bun run format       # prettier, rewrites files
bun run format:check # what CI runs
```

CI (`.github/workflows/ci.yml`) runs lint, the format check and build on every PR and on pushes to `main`.

## Layout

| Path              | What                                                                               |
| ----------------- | ---------------------------------------------------------------------------------- |
| `src/main.tsx`    | Routes (React Router)                                                              |
| `src/pages/`      | One component per page                                                             |
| `src/components/` | Shared components                                                                  |
| `src/Layout.tsx`  | Header and footer around every page                                                |
| `src/index.css`   | Tailwind and the design tokens (`@theme`), same names and values as the mobile app |
| `public/`         | Served as is: favicon, `_redirects`                                                |

## Routes

| Path                | What                                                           |
| ------------------- | -------------------------------------------------------------- |
| `/`                 | landing page (placeholder)                                     |
| `/app`              | the web app (placeholder)                                      |
| `/privacy`          | privacy policy (draft; Google Play needs this URL)             |
| `/account-deletion` | how to delete your account (draft; Google Play needs this URL) |

## Deploying

It will be deployed to Cloudflare Pages as a static SPA: `public/_redirects` sends every path
to `index.html` so client-side routes work on reload. No deploy workflow yet.

## Contributing

- [`CONTRIBUTING.md`](CONTRIBUTING.md): the branch → PR → squash-merge workflow and the code standards
- [`docs/ai-development.md`](docs/ai-development.md): how to work with AI tools on this repo
- [`docs/ai-context.md`](docs/ai-context.md): the project context to give an AI at the start of a chat
