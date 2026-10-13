# web

Web app and landing page for **CampusPulse**, a UPT campus companion (timetable, exams, campus
map, reminders). A student project for the Mobile Systems and Applications course; it is not an
official UPT app. The mobile app lives in [`mobile`](https://github.com/CampusPulse-ro/mobile)
and the backend in [`api`](https://github.com/CampusPulse-ro/api).

- **Stack:** React 19 · Vite · TypeScript · Tailwind CSS v4 · React Router · i18next
- **Languages:** English (default) and Romanian; the switch is in the header and remembered on the device
- **Package manager:** Bun

## Prerequisites

- [Bun](https://bun.sh) (the package manager and script runner)
- Git, and a GitHub account with access to the `CampusPulse-ro` org
- VS Code (recommended): accept the suggested extensions, Prettier and EditorConfig
  (`.vscode/extensions.json`), so files are formatted on save the same way CI checks them.

**Cloned on Windows before line endings were fixed (repo hygiene, #5)?** Your files may have CRLF
endings on disk. Run `bun run format`, or delete the folder and clone again.

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
| `src/i18n/`       | every user-facing text: `en.json` and `ro.json` (same keys), language setup, dates |
| `public/`         | Served as is: favicon, `_redirects`                                                |

## Routes

| Path                | What                                                           |
| ------------------- | -------------------------------------------------------------- |
| `/`                 | landing page (placeholder)                                     |
| `/app`              | the web app (placeholder)                                      |
| `/privacy`          | privacy policy (draft; Google Play needs this URL)             |
| `/account-deletion` | how to delete your account (draft; Google Play needs this URL) |

## Deploying

Cloudflare Pages, project `campuspulse-web`, by direct upload from
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). It's a static SPA:
`public/_redirects` sends every path to `index.html`, so client-side routes work on reload.

| Trigger                             | Environment     | URL                                                           | API it talks to |
| ----------------------------------- | --------------- | ------------------------------------------------------------- | --------------- |
| a pull request                      | its own preview | `<branch>.campuspulse-web.pages.dev` (linked in a PR comment) | stage           |
| a merge to `main`                   | staging         | https://staging.campuspulse-web.pages.dev                     | stage           |
| a published GitHub Release `vX.Y.Z` | production      | https://campuspulse.thorsp.net                                | prod            |

The API's base URL comes from `VITE_API_BASE`, set by the deploy for each target
(`https://campuspulse-api-stage.thorsp.net` or `https://campuspulse-api.thorsp.net`).

- **Releasing:** publish a GitHub Release with a `vX.Y.Z` tag; the Deploy workflow builds that
  tag and deploys production. A manual run (Actions → Deploy → Run workflow) can also target
  staging or production.
- PRs from forks get no secrets, so they get no preview; the Deploy check isn't required for
  merging.

## Contributing

- [`CONTRIBUTING.md`](CONTRIBUTING.md): the branch → PR → squash-merge workflow and the code standards
- [`docs/ai-development.md`](docs/ai-development.md): how to work with AI tools on this repo
- [`docs/ai-context.md`](docs/ai-context.md): the project context to give an AI at the start of a chat
