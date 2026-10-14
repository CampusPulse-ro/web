# CampusPulse design system

How the web and mobile apps stay one product: where the design lives, where the tokens come from, and
what the shared components are called.

## Source of truth

| What                                    | Where                                                                   | Who changes it                                                   |
| --------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| The design: screens, components, tokens | Figma, team _CampusPulse_ (being set up)                                | anyone on the team                                               |
| The tokens in code                      | [`design/tokens.json`](../design/tokens.json) in this repo              | generated from Figma; edited by hand until the Figma file exists |
| Web code from the tokens                | `src/design/tokens.css` (Tailwind `@theme`)                             | `bun run design:tokens`, never by hand                           |
| Mobile code from the tokens             | mobile's `src/design/tokens.ts` (and its copy `src/design/tokens.json`) | `bun run design:tokens` in the mobile repo, never by hand        |
| Components                              | each app, per platform: React here, React Native in mobile              | the person building the screen                                   |

There is no shared component package: React and React Native can't share UI code. What the two apps
share is the **tokens** (generated from one file) and the **component names and variants** (the same
in Figma, web and mobile).

## The token flow

```
Figma variables ──export──▶ design/tokens.json (web repo) ──bun run design:tokens──▶ src/design/tokens.css
                                     │
                                     └──(mobile: bun run design:tokens downloads it)──▶ src/design/tokens.ts
```

1. Change the token in Figma (later) or in `design/tokens.json` (now).
2. Here: `bun run design:tokens`, then commit the JSON and the generated `tokens.css` in one PR. CI
   ("Design tokens match") regenerates and fails if they differ.
3. In mobile, after that PR is merged: `bun run design:tokens` downloads the JSON from this repo's
   `main` and regenerates. Open a PR there too. Mobile's CI checks its own copy, not this repo, so
   **a token change reaches mobile only when someone runs the script there**.

`tokens.json` is in the W3C Design Tokens (DTCG) format: groups with a `$type`, tokens with a `$value`
and optionally a `$description`. Figma's variable export and most token tools read and write it.

### What each app gets

- **Colors:** both apps. Web: `--color-<name>` in `@theme`, so Tailwind makes `bg-page`,
  `text-ink-muted`, `border-line`… Mobile: `color.<name>` in camelCase (`color.inkMuted`).
- **Spacing (`space`) and radius (`radius`):** mobile only for now (`space.md`, `radius.pill`). This app
  uses Tailwind's default scale (`px-3`, `rounded-md`); putting the mobile scale in `@theme` would
  change every page. Aligning the two scales is a design decision for the Figma Foundations page.
- Typography isn't a token yet: both apps use the system font. It comes with the Figma Foundations.

## Naming rules

- **Tokens:** kebab-case in the JSON and CSS (`ink-soft`, `--color-ink-soft`), camelCase in TypeScript
  (`inkSoft`). The name says the role, never the color: `accent`, not `blue`.
- **Never a raw value in a component:** no `#4f8cff`, no `bg-[#123456]`. A new color is a new token in
  `tokens.json` first.
- **Components:** the same PascalCase name in Figma, web and mobile (`TimetableSlot`, not
  `ClassCard` on one side). Figma variant properties = component props, with the same names and values
  (`variant="primary"`, `size="sm"`).
- One dark palette for now. A light theme would be a second set of the same token names.

## Component inventory

The components the main screens need: the plan for Figma's Components page, and the names to use in
code. "Now" lists what already exists.

| Component                              | Variants                                                                                                   | States                                                          | Now                                                                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Button**                             | primary (accent), secondary (outlined), ghost (text only); sizes sm / md                                   | default, hover / pressed, focus, disabled, loading              | web: the home page's call to action (primary) and the API status "Retry" (secondary); mobile: the "Retry" pressable |
| **SegmentedControl**                   | 2–4 options                                                                                                | selected, unselected, hover / pressed, focus                    | `LanguageSwitch` in both apps                                                                                       |
| **Text styles**                        | Title, Heading, Body, Muted (secondary), Caption                                                           | n/a                                                             | mobile: `Title`, `Muted`; web: Tailwind classes per page                                                            |
| **Screen / Page**                      | with header, with tab bar (mobile)                                                                         | loading                                                         | mobile: `Screen` (safe areas, page color); web: `Layout`                                                            |
| **Header** (app bar)                   | title only; with actions; with back                                                                        | n/a                                                             | web: the `Layout` header (name + language)                                                                          |
| **TabBar** (mobile) / **NavBar** (web) | 4 tabs: Today, Timetable, Map, Profile                                                                     | active, inactive, badge                                         | mobile: expo-router tabs                                                                                            |
| **Footer** (web)                       | n/a                                                                                                        | n/a                                                             | the `Layout` footer (notice + links)                                                                                |
| **Card**                               | plain, interactive (pressable)                                                                             | default, pressed, focus                                         | n/a                                                                                                                 |
| **ListItem**                           | one line, two lines; with leading icon or avatar; with trailing chevron, value or switch                   | default, pressed, disabled, selected                            | n/a                                                                                                                 |
| **Chip**                               | filter (toggle), info (read-only); tones: neutral, accent, warn                                            | selected, unselected, disabled                                  | n/a                                                                                                                 |
| **TimetableSlot**                      | kind: course, lab, seminar, project; with or without room, teacher, weeks ("odd weeks"); optional (picked) | upcoming, now (highlighted), past (muted), cancelled / no class | n/a                                                                                                                 |
| **DayHeader** (timetable)              | weekday + date; "today"                                                                                    | n/a                                                             | n/a                                                                                                                 |
| **EmptyState**                         | icon + title + one line + optional action                                                                  | n/a                                                             | mobile: `Placeholder` (title + one line)                                                                            |
| **StatusLine**                         | checking, ok, problem + retry                                                                              | n/a                                                             | `ApiStatus` (mobile), `ApiStatusLine` (web)                                                                         |
| **Input** (text field)                 | text, search; with label, hint, error                                                                      | default, focus, filled, error, disabled                         | n/a                                                                                                                 |
| **Banner** / **Toast**                 | tones: info, warn, error, success; banner (in page) or toast (floating, timed)                             | n/a                                                             | web: `DraftNotice` (warn banner)                                                                                    |
| **Avatar**                             | initials, image; sizes sm / md / lg                                                                        | n/a                                                             | n/a                                                                                                                 |
| **Sheet** (mobile) / **Dialog** (web)  | confirm (e.g. "Delete account"), picker (e.g. choose a lab time)                                           | open, closed                                                    | n/a                                                                                                                 |

When a screen needs something missing here, add a row (name, variants, states) and the component to
Figma, then build it under that name.
