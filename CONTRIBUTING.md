# Contributing

How we work in this repo. Short on purpose: if something here is unclear, ask Sebastian.

## Workflow

Work is tracked in **issues**. Every PR starts from one: the issue says what to build and why, and
what "done" means (its acceptance criteria). If you want to do something that has no issue, open
one first (the **Task** or **Bug** template) or ask Sebastian to.

All issues of the three repos are on the [CampusPulse board](https://github.com/orgs/CampusPulse-ro/projects/1)
(columns Todo → In Progress → In Review → Done). New issues land there in Todo by themselves.

1. Pick or get assigned an issue. Read it fully; ask in the issue if anything is unclear. Move
   its card to **In Progress**.
2. Start from an up-to-date `main`:
   ```bash
   git switch main
   git pull
   ```
3. Make a branch for that issue: `git switch -c <type>/<issue-number>-<short-name>`.
   Types: `feat` (new thing), `fix` (bug), `docs`, `chore` (tooling, cleanup). Example for issue
   #12: `feat/12-landing-hero`.
4. Commit in small steps. Messages say what the commit does, in the imperative:
   "Add the landing hero", not "changes" or "fixed stuff".
5. Push and open a pull request (PR) into `main`. The template asks for:
   - `Closes #<issue>` on the first line, so merging closes the issue
   - **What** changed
   - **Why**
   - **How I tested it**: which browser, at which widths, and a screenshot for anything visible
6. The card moves to **In Review** by itself once the PR says `Closes #<n>`, and to **Done**
   when it's merged. CI has to be green (format check, lint and build), and a PR needs one approval:
   Sebastian reviews.
7. Merging is **squash only**: the whole PR becomes one commit on `main`, titled with the PR
   title. So write a good PR title; individual commit messages matter less.
8. After the merge, update `main` and delete your local branch (GitHub deletes the remote one).
   One command per line: Windows PowerShell 5.1 doesn't understand `&&`.
   ```bash
   git switch main
   git pull
   git branch -d <name>
   ```

One issue = one PR = one thing. If it grows past roughly 300 changed lines, split the issue.

## Where things go

| Path              | What goes there                                                                         |
| ----------------- | --------------------------------------------------------------------------------------- |
| `src/main.tsx`    | The routes (React Router). A new page is added here                                     |
| `src/pages/`      | One file per page, named `<Name>Page.tsx`                                               |
| `src/components/` | Pieces used by more than one page                                                       |
| `src/Layout.tsx`  | The frame around every page (header, footer)                                            |
| `src/index.css`   | Tailwind and the design tokens (`@theme`). The only place colors are defined            |
| `src/i18n/`       | `en.json` and `ro.json` (every user-facing text), language setup, date format           |
| `src/api/`        | The API client: `schema.d.ts` (generated, never edited), `client.ts`, one hook per call |
| `public/`         | Files served as they are (favicon, `_redirects`)                                        |

A new top-level folder (for example `src/api/` or `src/hooks/`): ask first, so the structure stays
the same for everyone.

## Code standards

- **Run `bun run format`, then `git add`.** Formatting after staging commits the unformatted
  version. Prettier formats everything the same way, so diffs show only real changes; CI fails on
  unformatted files.
- **TypeScript stays strict.** No `any`, no `@ts-ignore`, no turning off lint rules. If the types
  fight you, that's a question to ask, not a rule to switch off.
- **Styling uses Tailwind classes built from our tokens** (`bg-page`, `text-ink-muted`,
  `border-line`, `text-accent`…). No hex colors in components and no arbitrary values like
  `bg-[#123456]`. That keeps a later light theme (or any palette change) a one-file change.
- **No user-facing text written directly in components**, props included (`aria-label`, `alt`,
  `title`, `placeholder`). Add a key to both `src/i18n/en.json` and `src/i18n/ro.json` and show it
  with `t('key')` from `useTranslation()`; lint fails on text written straight into JSX
  (`react/jsx-no-literals`). A sentence with a link uses `<Trans t={t} …>` (see `NotFoundPage`):
  without `t={t}` it doesn't switch language. A missing or misspelled key, or a key in only one of the two
  files, fails `bun run build` and CI and is underlined in the editor, but the dev server just shows the English text or the raw
  key, so check the build. Romanian uses ș and ț with a comma below, never ş and ţ with a cedilla.
  English is the default. Dates and times go through `useDateTimeFormat()` from
  `src/i18n/format.ts`: they follow the chosen language and show in campus time (Europe/Bucharest).
- **Every page that loads data shows four states:** loading, error (with a way to retry), empty,
  and the data.
- **Responsive:** check every page at phone width (375px) and on a desktop width.
- **No new package without asking.**
- **The backend is reached only through the generated API client** (`src/api/`). Never a URL typed
  into a component, never a bare `fetch`. Each call gets a small hook with TanStack Query; the page
  shows its loading, error and data states. The example is `useApiStatus` and the status line on
  `/app`:

  ```ts
  // src/api/useApiStatus.ts
  export function useApiStatus() {
    return useQuery({
      queryKey: ['health', 'ready'],
      queryFn: async ({ signal }) => {
        const { data, response } = await api.GET('/health/ready', { signal })
        // data, error and the paths are all typed from the API's contract
        ...
      },
    })
  }
  ```

  When the API's contract changes (a new endpoint or field), run `bun run api:types` and commit the
  updated `src/api/schema.d.ts`. If the endpoint you need doesn't exist yet, ask Sebastian.

- **No secrets in the code or the repo:** no passwords, tokens or `.env` files. Everything in this
  app ends up public in the browser.
- **Accessible basics:** real `<button>`s and `<a>`s (not clickable `<div>`s), `alt` text on images,
  a label on every form field.

## Before you open a PR

```bash
bun run format:check
bun run lint
bun run build
```

…and you opened every page you touched in the browser, at phone and desktop width, and checked the
loading, error and empty states.

## Using AI

See [`docs/ai-development.md`](docs/ai-development.md).
