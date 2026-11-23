# UI prototypes (throwaway)

Design explorations to compare UI/UX directions, served at `/prototype` on each prototype PR's preview
(`https://pr-<n>.campuspulse-web.pages.dev/prototype`). They need no sign-in and no API: the data is a real
snapshot in `public/prototype-data/` (see `data.ts`), and time comes from the demo clock (`clock.ts`).

- **Phone width (≤ 640 px) shows the mobile app's design; wider shows the web app's.** Open it on a phone, or
  narrow the browser.
- **Demo time:** every prototype has the same scenarios (before class, in class, break, done for the day, a day
  off, the weekend). Pick one in the prototype's demo control, or open `/prototype?scenario=in-class`, or
  `/prototype?at=2026-11-24T14:41`. The clock runs on from there in real time.
- Text is English only and skips i18n (the `jsx-no-literals` rule is off in this folder). The prototype that's
  picked gets rebuilt properly, with i18n, tokens and tests, under its own issues; nothing here is merged.
