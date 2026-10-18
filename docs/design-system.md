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
- **Screens:** screen drafts for the open issues, one board per flow (see [Screens](#screens)), built
  only from those components.

The file's Tokens tab has one token set, **CampusPulse**: the same names and values as
`design/tokens.json`. The Assets tab has the same colors as library colors, the type scale as
typography styles and the components. Inspect mode shows the size, spacing and CSS of any layer.

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
   JSON: `color.ink-soft`, `space.md`, `radius.pill`, `type.body-small`. A change to the type scale
   also goes into the matching typography style (Assets tab), which is what the components use.
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
and optionally a `$description`. A value can be an alias of another token: `color.on-accent` is
`{color.page}`, and every `type.*` takes its `fontFamily` from `{font.sans}`; the generators resolve
them. In `type.*`, `lineHeight` is a ratio of `fontSize` (DTCG), and each `$description` gives the
size and line height in px. In Penpot, `color.*` are Color tokens, `space.*` Spacing, `radius.*`
Border radius, `font.*` Font family and `type.*` Typography tokens.

### What each app gets

- **Colors:** both apps. Web: `--color-<name>` in `@theme`, so Tailwind makes `bg-page`,
  `text-ink-muted`, `border-line`, `text-on-accent`… Mobile: `color.<name>` in camelCase
  (`color.inkMuted`, `color.onAccent`).
- **Radius:** both apps, one scale. Web: `--radius-sm`, `--radius-md`, `--radius-lg` and, from
  `radius.pill`, `--radius-full`, so `rounded-md` is 12 px here as `radius.md` is on mobile. Mobile:
  `radius.md`, `radius.pill`.
- **Type scale:** both apps. Web: `--text-<name>` with its line height, weight and letter spacing,
  so one class sets the whole style (`text-heading`, `text-body-small`), and `--font-sans` (the
  system UI font) for the page. Mobile: `type.<name>` in camelCase, a React Native text style
  (`<Text style={[type.bodySmall, { color: color.inkMuted }]}>`), without a font family: mobile keeps
  the platform font. Penpot's typography styles draw the same scale in Inter, because Penpot can't
  use the system font.
- **Spacing (`space`):** mobile only (`space.md`). This app keeps Tailwind's spacing, whose 4 px steps
  already hold every `space.*` value (`1`, `2`, `3`, `4`, `6`, `8` = 4, 8, 12, 16, 24, 32).

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

## The scales

Adopted in #29 here and CampusPulse-ro/mobile#27. The Foundations page in Penpot shows them all.

### Type scale

| Style        | Size / line height | Weight | Letter spacing | Used for                                   |
| ------------ | ------------------ | ------ | -------------- | ------------------------------------------ |
| `display`    | 34 / 40            | 700    | −0.5           | big numbers, the web landing page          |
| `title`      | 28 / 34            | 700    | −0.3           | screen titles (mobile's `Title`)           |
| `heading`    | 20 / 28            | 600    | −0.1           | section headings, sheet and dialog titles  |
| `subtitle`   | 16 / 24            | 600    | 0              | card and timetable slot titles             |
| `body`       | 16 / 24            | 400    | 0              | paragraphs, list item titles               |
| `body-small` | 14 / 20            | 400    | 0              | secondary lines, metadata, banner messages |
| `label`      | 14 / 20            | 600    | 0              | buttons, filter chips, segments, nav links |
| `caption`    | 12 / 16            | 500    | 0              | hints, timestamps, tab labels, info chips  |

Sizes in px on web (generated as rem, so they follow the browser's font size) and dp on mobile.
Today's pages still use Tailwind sizes (`text-4xl`, `text-sm`) and mobile's `Title` and `Muted` their
own; new work uses the scale, and the old uses move over as those screens are rebuilt.

### Radius

| Token         | px  | Web            | Used for                                          |
| ------------- | --- | -------------- | ------------------------------------------------- |
| `radius.sm`   | 8   | `rounded-sm`   | small buttons, segments inside a control          |
| `radius.md`   | 12  | `rounded-md`   | buttons, inputs, banners, toasts, timetable slots |
| `radius.lg`   | 16  | `rounded-lg`   | cards, sheets (top corners), dialogs              |
| `radius.pill` | 999 | `rounded-full` | chips, badges, avatars, switches                  |

Tailwind's other radius names (`rounded-xl`, `rounded-2xl`, …) keep their defaults; use the four above.

### Colors and contrast

Every text color passes WCAG AA (4.5:1) on `page`, `raised` and `sunken`; the table is on the
Foundations page.

| Token               | Value          | Why                                                                                   |
| ------------------- | -------------- | ------------------------------------------------------------------------------------- |
| `color.danger`      | `#f87171`      | errors (Banner, Toast, Input) and destructive actions (Delete account); 6.8:1 on page |
| `color.success`     | `#3ecf8e`      | success states (Banner, Toast, StatusLine "ok"); 9.5:1 on page                        |
| `color.on-accent`   | `{color.page}` | text and icons on `accent` and `danger` fills: 5.9:1                                  |
| `color.line-strong` | `#5d6777`      | control edges (inputs, outlined buttons): 3.3:1 on page, 3.0:1 on raised, WCAG's 3:1  |

- **Never white on `accent`:** it is 3.2:1 and fails AA. Text on an accent or danger fill is
  `on-accent` (`text-on-accent`, `color.onAccent`), as the home page's button now is.
- `line-strong` was `#3a404a` (1.8:1 against `page`) before #29.

### Layout

The Penpot screens use a 16 px gutter on mobile (`space.lg`; today's `Placeholder` uses 24) and a
32 px gutter with content up to 960 px wide on web app pages.

## Screens

The Penpot file's **Screens** page has one board per flow: phone frames (390 × 844) first, then the web
pages (1280 wide). The links below open each board in Penpot's view mode; open the Screens page in the
workspace to edit. Each frame has a caption that says what state it shows. They are drafts to build from,
not specs: where a draft and its issue disagree, the issue wins, and the draft gets fixed.

| Flow                                                                                                                                                                                                                 | Drafted                                                                                                                                                   | Issues                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| [Sign-in](https://design.penpot.app/#/view?file-id=ce180602-f36b-8035-8008-cea5c29ed940&page-id=b2079ac6-6ac1-8059-8008-cea5db8730c6&section=interactions&frame-id=6376d8e0-f8c1-806c-8008-cf1c0eb8f406)             | welcome; signing in; sign-in didn't finish; account gone (GET /me 404). Web: sign in, account gone, on a PR preview                                       | mobile #7, web #6                       |
| [Timetable setup](https://design.penpot.app/#/view?file-id=ce180602-f36b-8035-8008-cea5c29ed940&page-id=b2079ac6-6ac1-8059-8008-cea5db8730c6&section=interactions&frame-id=6376d8e0-f8c1-806c-8008-cf1cf9cd0d66)     | programme → year → group; optional subjects; lab time (Sheet, Dialog); subject no longer offered; group from another semester. Web: one setup page        | mobile #30, web #32                     |
| [Today](https://design.penpot.app/#/view?file-id=ce180602-f36b-8035-8008-cea5c29ed940&page-id=b2079ac6-6ac1-8059-8008-cea5db8730c6&section=interactions&frame-id=6376d8e0-f8c1-806c-8008-cf21e43a7554)               | today with the class going on now; no group; no classes; public holiday; winter break; class detail; Today in Romanian. Web: today and the week; no group | mobile #31, web #33                     |
| [Timetable](https://design.penpot.app/#/view?file-id=ce180602-f36b-8035-8008-cea5c29ed940&page-id=b2079ac6-6ac1-8059-8008-cea5db8730c6&section=interactions&frame-id=6376d8e0-f8c1-806c-8008-cf23dfbe5dbd)           | Week; List; class detail (Sheet). Web: class detail (Dialog). Day is in Overview                                                                          | mobile #31, web #33                     |
| [Profile and account](https://design.penpot.app/#/view?file-id=ce180602-f36b-8035-8008-cea5c29ed940&page-id=b2079ac6-6ac1-8059-8008-cea5db8730c6&section=interactions&frame-id=6376d8e0-f8c1-806c-8008-cf285e0022eb) | Profile with Campus Virtual connected and not; delete account: confirm, deleting, deleted and signed out                                                  | mobile #10 (Campus Virtual: mobile #17) |
| [Push notifications](https://design.penpot.app/#/view?file-id=ce180602-f36b-8035-8008-cea5c29ed940&page-id=b2079ac6-6ac1-8059-8008-cea5db8730c6&section=interactions&frame-id=6376d8e0-f8c1-806c-8008-cf2910e8159f)  | the ask after setup; reminders on; blocked in Android settings                                                                                            | mobile #12                              |
| [Web pages](https://design.penpot.app/#/view?file-id=ce180602-f36b-8035-8008-cea5c29ed940&page-id=b2079ac6-6ac1-8059-8008-cea5db8730c6&section=interactions&frame-id=6376d8e0-f8c1-806c-8008-cf2988db9795)           | landing page (desktop and phone width); account deletion signed in, confirm, deleted, signed out                                                          | web #4, web #9                          |
| [Overview](https://design.penpot.app/#/view?file-id=ce180602-f36b-8035-8008-cea5c29ed940&page-id=b2079ac6-6ac1-8059-8008-cea5db8730c6&section=interactions&frame-id=6376d8e0-f8c1-806c-8008-cf1bc5087ea9)            | the first drafts: Today, Timetable (Day), Profile, Today on web                                                                                           | —                                       |

The content is real: the stage database's semester I 2026–27 data for CTI-EN year 4, group 1.1, week 4
(rooms, teachers, the offered lab times), and C-RO year 4 for the Romanian example. Teachers are missing on
labs because the API has none for picked lab times.

Decisions the drafts make that the issues leave open:

- **Sign-in:** signed out, mobile opens on a welcome screen without the tab bar.
- **Setup:** turning an optional subject on opens the lab-time sheet, and the row then shows the chosen
  time.
- **Account and holidays:** delete account confirms in a Sheet on mobile and in a Dialog on web. Holiday
  reasons are shown as the API sends them (Romanian, e.g. "Ziua Națională a României").
- **Week view:** a 08:00–20:00 grid of WeekSlots (36 px an hour on mobile, 40 on web); a one-hour class
  shows only its short name. The List view is an agenda from now on.
- **Push:** the permission is asked once, over the first Today that shows the student's classes after
  setup. Profile's Class reminders toggle is the switch afterwards; a block in Android's settings is
  explained, with a way to open them.
- **Web pages:** the landing page has a dashed "Google Play · coming soon" placeholder where the store badge
  goes. The account deletion page shows "‹contact email›" until an address is chosen.

## Component inventory

The components the main screens need, as they are on the Penpot Components page, and the names to use
in code. Property names and values are the props. Penpot draws the combinations that look different;
a missing combination looks like its nearest one (for example `badge="yes"` exists for the Today and
Timetable tabs). "Now" lists what already exists in code.

| Component                              | Variant properties (= props)                                                                                                                                                                                                         | Now                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **Icon**                               | `name`: today, timetable, map, profile, chevron-right / -left / -down, search, close, check, info, warn, error, success, bell, pin, clock, globe, retry, plus, book, logout, spinner, external, trash, flag, winter, bell-off, login | n/a (24 px, 2 px stroke, the Feather / Lucide style)                                                                |
| **Button**                             | `variant`: primary, secondary, ghost, danger; `size`: sm (32 high), md (44); `state`: default, pressed, focus, disabled, loading                                                                                                     | web: the home page's call to action (primary) and the API status "Retry" (secondary); mobile: the "Retry" pressable |
| **SegmentedControl**                   | `options`: 2, 3, 4; `selected`: 1, 2, 3 (which option is on); `state`: default, pressed, focus                                                                                                                                       | `LanguageSwitch` in both apps                                                                                       |
| **Text styles**                        | separate components: `Title`, `Heading`, `Body`, `Muted`, `Caption`                                                                                                                                                                  | mobile: `Title`, `Muted`; web: Tailwind classes per page                                                            |
| **Screen** (mobile) / **Page** (web)   | Screen: `variant`: with-tab-bar, with-header; `state`: default, loading. Page: `state`: default, loading                                                                                                                             | mobile: `Screen` (safe areas, page color); web: `Layout`                                                            |
| **Header** (app bar)                   | `variant`: title, actions, back                                                                                                                                                                                                      | web: the `Layout` header (name + language), which becomes the NavBar                                                |
| **TabBar** (mobile) / **NavBar** (web) | `active`: today, timetable, map, profile; `badge`: no, yes. NavBar also `account`: signed-in (links, avatar), signed-out (name, language, Sign in; `active` none)                                                                    | mobile: expo-router tabs                                                                                            |
| **Footer** (web)                       | none                                                                                                                                                                                                                                 | the `Layout` footer (notice + links)                                                                                |
| **Card**                               | `variant`: plain, interactive; `state`: default, pressed, focus                                                                                                                                                                      | n/a                                                                                                                 |
| **ListItem**                           | `lines`: 1, 2; `leading`: none, icon, avatar; `trailing`: none, chevron, value, switch (a Switch: set `checked` on it); `state`: default, pressed, disabled, selected. Rows grow when a long title wraps                             | n/a                                                                                                                 |
| **Switch**                             | `checked`: yes, no; `state`: default, disabled                                                                                                                                                                                       | n/a                                                                                                                 |
| **Chip**                               | `variant`: filter, info; `tone`: neutral, accent, warn; `state`: unselected, selected, disabled (filter), default (info)                                                                                                             | n/a                                                                                                                 |
| **TimetableSlot**                      | `kind`: course, lab, seminar, project; `state`: upcoming, now, past, cancelled; `optional`: no, yes. Room, teacher and weeks are layers an instance can hide                                                                         | n/a                                                                                                                 |
| **WeekSlot** (Week view)               | `state`: upcoming, now, past, cancelled; resized to its column and duration (short name, kind, room; a 1-hour class shows the name only)                                                                                             | n/a                                                                                                                 |
| **DayHeader** (timetable)              | `today`: no, yes                                                                                                                                                                                                                     | n/a                                                                                                                 |
| **EmptyState**                         | `action`: no, yes                                                                                                                                                                                                                    | mobile: `Placeholder` (title + one line)                                                                            |
| **StatusLine**                         | `status`: checking, ok, problem (with a ghost sm Retry)                                                                                                                                                                              | `ApiStatus` (mobile), `ApiStatusLine` (web)                                                                         |
| **Input** (text field)                 | `variant`: text, search; `state`: default, focus, filled, error, disabled                                                                                                                                                            | n/a                                                                                                                 |
| **Banner** / **Toast**                 | two components, each with `tone`: info, warn, error, success. Banner sits in the page; Toast floats and times out                                                                                                                    | web: `DraftNotice` (warn banner)                                                                                    |
| **Avatar**                             | `variant`: initials, image; `size`: sm (32), md (40), lg (64)                                                                                                                                                                        | n/a                                                                                                                 |
| **Sheet** (mobile) / **Dialog** (web)  | `variant`: confirm (e.g. "Delete account"), picker (e.g. choose a lab time). The class detail is the picker layout with icon rows (time, room, teacher, weeks) and "Open in Campus Virtual". Drawn open; closed is not rendered      | n/a                                                                                                                 |

When a screen needs something missing here, add a row (name, properties) and the component to the
Penpot file, then build it under that name.
