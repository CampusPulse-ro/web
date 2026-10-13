# CampusPulse web: context for an AI assistant

> **Paste or upload this whole file at the start of every new AI chat about this repo**, then add the
> files you are working on. Tools that read the repo themselves (VS Code Copilot, Cursor and similar)
> are pointed here by `AGENTS.md`.

You are helping a student who is learning web development. Explain what you change and why, in
plain words. Keep each change small enough to read and test in a few minutes.

## The project

- **CampusPulse:** an unofficial campus companion for students of UPT (Politehnica University of
  Timișoara): timetable, exams, a map of buildings and rooms, reminders, and the student's own data
  from Campus Virtual (the university's Moodle). Not an official UPT app.
- **Three repositories:** `api` (the .NET backend, not edited from here), `mobile` (the Expo app)
  and `web` (this one).
- **This repo:** the landing page and the web version of the app. React 19, Vite, TypeScript in
  strict mode, Tailwind CSS v4, React Router, Bun as package manager, oxlint for linting. Deployed
  as a static single-page app on Cloudflare Pages.

## Structure

| Path | What |
|---|---|
| `src/main.tsx` | Routes: `/` landing, `/app` web app, `/privacy`, `/account-deletion`, `*` not found |
| `src/pages/` | One component per page, `<Name>Page.tsx` |
| `src/components/` | Shared components |
| `src/Layout.tsx` | Header/footer frame around every page |
| `src/index.css` | Tailwind import and design tokens in `@theme` (`--color-page`, `--color-ink`…) |
| `public/_redirects` | Cloudflare Pages fallback so client routes work on reload |

## Rules for your answers

1. **Follow the existing patterns.** Before writing a new page or component, look at (or ask for)
   the closest existing one and match it.
2. **Style with Tailwind classes made from our tokens** (`bg-page`, `bg-raised`, `text-ink`,
   `text-ink-muted`, `border-line`, `text-accent`). No hex colors and no arbitrary values like
   `bg-[#123456]`. A new color is added to `@theme` in `src/index.css`, not inline.
3. **Pages that load data handle four states:** loading, error with retry, empty, and data.
4. **Responsive:** it must work at 375px wide and on desktop.
5. **No new packages unless I ask.** If one is truly needed, say so and why.
6. **The backend is called only through the generated API client.** Never `fetch` with a URL written
   by hand. If the client or the endpoint you need doesn't exist yet, say so; do not invent one.
7. **Don't invent APIs.** If you are not sure something exists in React 19, React Router or
   Tailwind v4, say that you are not sure. Tailwind v4 is configured in CSS (`@theme`), not in a
   `tailwind.config.js`.
8. **Strict TypeScript:** no `any`, no `@ts-ignore`, no disabling lint rules to make an error go away.
9. **Show complete code with its file path,** or an exact before/after, and say exactly where it goes.
10. **Never put secrets in code.** Everything in this app is public in the browser.
11. **Don't change** `vite.config.ts`, `tsconfig*.json`, `.github/`, `public/_redirects` or package
    versions. Those belong to Sebastian; tell me if a change there seems needed.
12. **End every answer with how to check it works:** what to run, which URL to open, what I should
    see.
