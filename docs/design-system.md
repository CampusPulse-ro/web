# CampusPulse design system

How the web and mobile apps stay one product: where the design lives, where the tokens come from, and
what the shared components are called.

## Source of truth

| What                                    | Where                                                                                                                                                                | Who changes it                                              |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| The design: screens, components, tokens | Penpot: [CampusPulse Design System](https://design.penpot.app/#/workspace?team-id=cd444aaf-0d8c-801b-8008-cea5af48ec20&file-id=ce180602-f36b-8035-8008-cea5c29ed940) | anyone on the team                                          |
| The tokens in code                      | [`design/tokens.json`](../design/tokens.json) in this repo                                                                                                           | copied from Penpot's token set "CampusPulse" (see the flow) |
| Web code from the tokens                | `src/design/tokens.css` (Tailwind `@theme`)                                                                                                                          | `bun run design:tokens`, never by hand                      |
| Mobile code from the tokens             | mobile's `src/design/tokens.ts` (and its copy `src/design/tokens.json`)                                                                                              | `bun run design:tokens` in the mobile repo, never by hand   |
| Components                              | each app, per platform: React here, React Native in mobile                                                                                                           | the person building the screen, from the Penpot component   |

There is no shared component package: React and React Native can't share UI code. What the two apps
share is the **tokens** (generated from one file) and the **component names and variants** (the same
in Penpot, web and mobile).

### The Penpot file

Three pages:

- **Foundations:** the color tokens with names and hex values, a contrast table, the type scale,
  spacing and radius.
- **Components:** every component in the inventory below, as a Penpot component with its variants,
  drawn in the dark palette. Mobile sizes first (390 wide); web versions only where they really
  differ (NavBar, Footer, Page, Dialog).
- **Screens:** Today, Timetable and Profile on mobile and Today on web, built only from those
  components. They show how the parts fit, not finished screens.

The file's Tokens tab has two token sets: **CampusPulse** (exactly `design/tokens.json`) and
**Proposed** (tokens the design uses that aren't in code yet, see [Proposals](#proposals)). The
Assets tab has the same colors as library colors, the typography styles and the components. Inspect
mode shows the size, spacing and CSS of any layer.

### Getting access

1. Make a free account at [design.penpot.app](https://design.penpot.app) (Penpot is free and open
   source; email or a GitHub / Google sign-in).
2. Ask Sebastian to invite that email to the Penpot team **CampusPulse**.
3. Open the file from the team's dashboard, or with the link in the table above.

## The token flow

```
Penpot token set "CampusPulse" ──Tokens › Tools › Export──▶ design/tokens.json (web repo) ──bun run design:tokens──▶ src/design/tokens.css
                                                                    │
                                                                    └──(mobile: bun run design:tokens downloads it)──▶ src/design/tokens.ts
```

1. Change the token in Penpot: Tokens tab, set "CampusPulse". A token's name is its path in the
   JSON: `color.ink-soft`, `space.md`, `radius.pill`.
2. Put the same change in `design/tokens.json`. Penpot's export (Tokens › Tools › Export, single
   file) has the same names and values, but it nests them under the set name (`"CampusPulse": {…}`),
   lists them in its own order and uses Penpot's types (`spacing`, `borderRadius`) where
   `tokens.json` uses DTCG `dimension`. Until there is an import script, copy the changed token by
   hand. Never change `tokens.json` without changing Penpot, or the next copy undoes it.
3. Here: `bun run design:tokens`, then commit the JSON and the generated `tokens.css` in one PR. CI
   ("Design tokens match") regenerates and fails if they differ.
4. In mobile, after that PR is merged: `bun run design:tokens` downloads the JSON from this repo's
   `main` and regenerates. Open a PR there too. Mobile's CI checks its own copy, not this repo, so
   **a token change reaches mobile only when someone runs the script there**.

`tokens.json` is in the W3C Design Tokens (DTCG) format: groups with a `$type`, tokens with a `$value`
and optionally a `$description`. In Penpot, `color.*` are Color tokens, `space.*` Spacing tokens and
`radius.*` Border radius tokens, so they bind to fills, padding and gaps, and corners.

### What each app gets

- **Colors:** both apps. Web: `--color-<name>` in `@theme`, so Tailwind makes `bg-page`,
  `text-ink-muted`, `border-line`… Mobile: `color.<name>` in camelCase (`color.inkMuted`).
- **Spacing (`space`) and radius (`radius`):** mobile only for now (`space.md`, `radius.pill`). This app
  uses Tailwind's default scale (`px-3`, `rounded-md`); putting the mobile scale in `@theme` would
  change every page. The Penpot file uses mobile's radius scale everywhere: see the
  [radius proposal](#one-radius-scale).
- **Typography** isn't a token yet: both apps use the system font. The Penpot file has a type scale as
  typography styles: see the [type scale proposal](#type-scale).

## Naming rules

- **Tokens:** kebab-case in the JSON and CSS (`ink-soft`, `--color-ink-soft`), camelCase in TypeScript
  (`inkSoft`). The name says the role, never the color: `accent`, not `blue`.
- **Never a raw value in a component:** no `#4f8cff`, no `bg-[#123456]`. A new color is a new token in
  Penpot and `tokens.json` first.
- **Components:** the same PascalCase name in Penpot, web and mobile (`TimetableSlot`, not
  `ClassCard` on one side). Penpot variant properties = component props, with the same names and values
  (`variant="primary"`, `size="sm"`).
- One dark palette for now. A light theme would be a second token set with the same token names.

## States

Every interactive component draws its states the same way, so code can share them:

- **pressed** (hover on web): raised surfaces go `sunken`; unfilled buttons and segments get `raised`
  or `line`; accent and danger fills get a 20% `page` overlay.
- **focus:** a 2 px `accent` ring, 2 px outside the component (on web: a 2 px `outline` with a
  2 px `outline-offset`). Inputs instead turn their edge `accent` and 2 px wide.
- **disabled:** fill `line` (filled buttons) or edge `line`, text `ink-muted`.
- **selected:** a 12–16% `accent` tint (`bg-accent/15` on web), often with a check.
- **Tones** (Banner, Chip): a 12–16% tint of the tone color, its text in the tone color or `ink`.

## Proposals

What the Penpot file uses that the code doesn't have yet. Each is its own later PR (token first,
then both apps), once the team agrees. Nothing here is in `tokens.json` today.

### Type scale

Typography styles in Penpot; Inter is the design font there, because Penpot can't use the system
font. Code keeps the system UI font (web: `system-ui, -apple-system, 'Segoe UI', Roboto,
sans-serif`, as today; mobile: the platform font). Sizes in px on web and dp on mobile.

| Style        | Size / line height | Weight | Letter spacing | Used for                                   |
| ------------ | ------------------ | ------ | -------------- | ------------------------------------------ |
| `display`    | 34 / 40            | 700    | −0.5           | big numbers, the web landing page          |
| `title`      | 28 / 34            | 700    | −0.3           | screen titles (today's mobile `Title`)     |
| `heading`    | 20 / 28            | 600    | −0.1           | section headings, sheet and dialog titles  |
| `subtitle`   | 16 / 24            | 600    | 0              | card and timetable slot titles             |
| `body`       | 16 / 24            | 400    | 0              | paragraphs, list item titles               |
| `body-small` | 14 / 20            | 400    | 0              | secondary lines, metadata, banner messages |
| `label`      | 14 / 20            | 600    | 0              | buttons, filter chips, segments, nav links |
| `caption`    | 12 / 16            | 500    | 0              | hints, timestamps, tab labels, info chips  |

To adopt it: a `type` group in `tokens.json`, generated into Tailwind's `--text-<name>` (with its
`--line-height`) on web and a `type.<name>` style object on mobile. Mobile's `Muted` is 15 px today;
in the scale it is `body` in `ink-muted`.

### One radius scale

Mobile's scale, for both apps: `radius.sm` 8, `radius.md` 12, `radius.lg` 16, `radius.pill` 999.

| Token         | px  | Used for                                          |
| ------------- | --- | ------------------------------------------------- |
| `radius.sm`   | 8   | small buttons, segments inside a control          |
| `radius.md`   | 12  | buttons, inputs, banners, toasts, timetable slots |
| `radius.lg`   | 16  | cards, sheets (top corners), dialogs              |
| `radius.pill` | 999 | chips, badges, avatars, switches                  |

To adopt it on web: generate `--radius-sm`, `--radius-md`, `--radius-lg` and `--radius-pill` into
`@theme`. Tailwind v4 reads its `rounded-*` utilities from those names, so `rounded-md` then means
12 px, as `radius.md` does on mobile. That changes today's `rounded-md` (6 px) on the language
switch, the draft notice, the home page's button and the Retry button; check them in that PR.
Spacing needs no change: Tailwind's 4 px steps already include `space.*` (`1`, `2`, `3`, `4`, `6`,
`8` = 4, 8, 12, 16, 24, 32).

### New colors and contrast

The token set "Proposed" in Penpot:

| Token             | Value          | Why                                                                                   |
| ----------------- | -------------- | ------------------------------------------------------------------------------------- |
| `color.danger`    | `#f87171`      | errors (Banner, Toast, Input) and destructive actions (Delete account); 6.8:1 on page |
| `color.success`   | `#3ecf8e`      | success states (Banner, Toast, StatusLine "ok"); 9.5:1 on page                        |
| `color.on-accent` | `{color.page}` | text and icons on `accent` and `danger` fills: 5.9:1                                  |

Every text color passes WCAG AA (4.5:1) on `page`, `raised` and `sunken` (the table is on the
Foundations page). Two findings:

- **White on `accent` is 3.2:1 and fails AA.** The home page's call to action is `text-white` on
  `bg-accent` today; it should use `on-accent` (dark text), as the Penpot Button does.
- **`line-strong` against `page` is 1.8:1**, under WCAG's 3:1 for the edges of controls (inputs,
  outlined buttons). The inputs also have a label and a `sunken` fill; a later token change could
  lift `line-strong` to about `#5d6777` (3:1 on `raised`).

### Layout

The Penpot screens use a 16 px gutter on mobile (`space.lg`; today's `Placeholder` uses 24) and a
32 px gutter with content up to 960 px wide on web app pages.

## Component inventory

The components the main screens need, as they are on the Penpot Components page, and the names to use
in code. Property names and values are the props. Penpot draws the combinations that look different;
a missing combination looks like its nearest one (for example `badge="yes"` exists for the Today and
Timetable tabs). "Now" lists what already exists in code.

| Component                              | Variant properties (= props)                                                                                                                                                         | Now                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **Icon**                               | `name`: today, timetable, map, profile, chevron-right / -left / -down, search, close, check, info, warn, error, success, bell, pin, clock, globe, retry, plus, book, logout, spinner | n/a (24 px, 2 px stroke, the Feather / Lucide style)                                                                |
| **Button**                             | `variant`: primary, secondary, ghost, danger; `size`: sm (32 high), md (44); `state`: default, pressed, focus, disabled, loading                                                     | web: the home page's call to action (primary) and the API status "Retry" (secondary); mobile: the "Retry" pressable |
| **SegmentedControl**                   | `options`: 2, 3, 4; `state`: default, pressed, focus (the first option is the selected one)                                                                                          | `LanguageSwitch` in both apps                                                                                       |
| **Text styles**                        | separate components: `Title`, `Heading`, `Body`, `Muted`, `Caption`                                                                                                                  | mobile: `Title`, `Muted`; web: Tailwind classes per page                                                            |
| **Screen** (mobile) / **Page** (web)   | Screen: `variant`: with-tab-bar, with-header; `state`: default, loading. Page: `state`: default, loading                                                                             | mobile: `Screen` (safe areas, page color); web: `Layout`                                                            |
| **Header** (app bar)                   | `variant`: title, actions, back                                                                                                                                                      | web: the `Layout` header (name + language), which becomes the NavBar                                                |
| **TabBar** (mobile) / **NavBar** (web) | `active`: today, timetable, map, profile; `badge`: no, yes                                                                                                                           | mobile: expo-router tabs                                                                                            |
| **Footer** (web)                       | none                                                                                                                                                                                 | the `Layout` footer (notice + links)                                                                                |
| **Card**                               | `variant`: plain, interactive; `state`: default, pressed, focus                                                                                                                      | n/a                                                                                                                 |
| **ListItem**                           | `lines`: 1, 2; `leading`: none, icon, avatar; `trailing`: none, chevron, value, switch; `state`: default, pressed, disabled, selected                                                | n/a                                                                                                                 |
| **Chip**                               | `variant`: filter, info; `tone`: neutral, accent, warn; `state`: unselected, selected, disabled (filter), default (info)                                                             | n/a                                                                                                                 |
| **TimetableSlot**                      | `kind`: course, lab, seminar, project; `state`: upcoming, now, past, cancelled; `optional`: no, yes. Room, teacher and weeks are layers an instance can hide                         | n/a                                                                                                                 |
| **DayHeader** (timetable)              | `today`: no, yes                                                                                                                                                                     | n/a                                                                                                                 |
| **EmptyState**                         | `action`: no, yes                                                                                                                                                                    | mobile: `Placeholder` (title + one line)                                                                            |
| **StatusLine**                         | `status`: checking, ok, problem (with a ghost sm Retry)                                                                                                                              | `ApiStatus` (mobile), `ApiStatusLine` (web)                                                                         |
| **Input** (text field)                 | `variant`: text, search; `state`: default, focus, filled, error, disabled                                                                                                            | n/a                                                                                                                 |
| **Banner** / **Toast**                 | two components, each with `tone`: info, warn, error, success. Banner sits in the page; Toast floats and times out                                                                    | web: `DraftNotice` (warn banner)                                                                                    |
| **Avatar**                             | `variant`: initials, image; `size`: sm (32), md (40), lg (64)                                                                                                                        | n/a                                                                                                                 |
| **Sheet** (mobile) / **Dialog** (web)  | `variant`: confirm (e.g. "Delete account"), picker (e.g. choose a lab time). Drawn open; closed is not rendered                                                                      | n/a                                                                                                                 |

When a screen needs something missing here, add a row (name, properties) and the component to the
Penpot file, then build it under that name.
