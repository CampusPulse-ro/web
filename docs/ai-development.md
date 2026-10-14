# Working with AI on CampusPulse

The goal: let AI do the typing while you still understand everything you commit. If you can't
explain a line in your PR, it isn't ready yet.

## 1. Give the AI the context first

An AI only knows what it can see. How you show it the project depends on the tool:

- **A chat in the browser** (ChatGPT, Claude, Gemini…): at the start of **every new chat**, upload or
  paste [`ai-context.md`](ai-context.md), then the files you're working on. Without that it guesses
  at our structure and rules, and the guesses are often wrong.
- **An AI inside your editor that can open files itself** (VS Code with Copilot, Cursor…): most of
  them read `AGENTS.md` automatically. If yours doesn't, start with "Read `docs/ai-context.md` and
  `CONTRIBUTING.md` first."
- **Anything visual** (a screen, a component, a color): also give it [`design-system.md`](design-system.md),
  so it uses our tokens and component names instead of inventing new ones.

## 2. The loop for every change

1. **Start from the issue:** paste its text (goal, context, acceptance criteria) after
   ai-context.md; it's the clearest description of the task you have. Then say what you want
   in plain words, plus which screen or file: "On the landing page, add a section with three feature cards" beats
   "make the landing better".
2. **Ask for a plan before code:** "Before writing code, explain how you would do it and which
   files change." Fix the plan if it's wrong; that's much cheaper than fixing code.
3. **Ask for one small step** at a time.
4. **Read what it wrote.** Any line you don't understand: "Explain this line."
5. **Open it in the browser,** at phone width (375px, via the browser's dev tools) and desktop width.
   Check the loading, error and empty states too, not just the happy case.
6. **Commit, then the next step.** Small commits mean you can always go back.

## 3. Prompts that work

**A new page or section**

> I'm adding [what] to [page]. Here is the current file: [paste]. Follow the patterns of the
> existing pages in `src/pages/` and the rules in ai-context.md. Plan first, then code.

**A bug**

> I did [steps], expected [X], got [Y]. Exact error: [paste the whole message]. File: [paste].
> Explain the cause before you fix it.

**Understanding code**

> Explain what this file does, step by step, for a beginner: [paste].

**A review before your PR**

> Here is my change: [paste the diff]. Check it against the rules in ai-context.md. What is wrong,
> risky or unclear?

## 4. Signs the AI is wrong

- It imports a package that isn't in `package.json`, or a function you can't find anywhere.
- It writes hex colors, `bg-[#…]` values or URLs directly in a component.
- It "fixes" an error by deleting a check, adding `any` or `@ts-ignore`, or turning off a lint rule.
- It rewrites files you didn't ask about.
- It says "this should work" without telling you how to check it.

When that happens, say what's wrong and ask again. Don't paste its code in and hope.

## 5. Never paste into an AI

- Passwords, tokens, API keys or `.env` files.
- **Campus Virtual tokens** above all: one gives full access to that student's university account.
- Other students' data (names, grades, timetables from real accounts).

## 6. Ask Sebastian when

- you need something from the backend (a new field, a new endpoint);
- you think a new package is needed;
- it touches login, tokens, the Vite/TypeScript config, the build or CI;
- you've been stuck for more than about 30 minutes. That's normal, not a failure.

## 7. Before you open the PR

- [ ] `bun run lint` and `bun run build` pass
- [ ] you opened every page you touched, at phone and desktop width
- [ ] loading, error and empty states checked
- [ ] you can explain every line of the diff
- [ ] the PR description says what, why and how you tested it, with a screenshot

Workflow and code standards: [`CONTRIBUTING.md`](../CONTRIBUTING.md).
