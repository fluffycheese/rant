# Contributing to RANT

Thanks for taking the time to contribute. This doc covers reporting issues and submitting pull requests.

If you're an AI agent contributing to this repo, see AGENTS.md first, the guidelines below apply to you too. For UI/UX conventions, see the UI/UX Design Guide.

## Contributor License Agreement (CLA)

Before a pull request can be merged, you'll need to sign our CLA. This is handled automatically, a bot will comment on your first PR with a link to sign electronically. It only needs to happen once per GitHub account.

## Contribution guidelines

A few things we try to stick to across the codebase:

- Match the style of the surrounding code rather than introducing a new pattern
- Use the naming conventions already in use in the file you're editing (check CONTEXT.md for more information on terminology etc)
- Comment non-trivial logic, not the obvious stuff
- Keep an eye on performance, especially anything touching the rack elevation rendering
- Don't make breaking changes to existing API routes without discussing it in an issue first

## How to contribute

1. Check it's wanted first. For anything beyond a small fix, open an issue before writing code, this avoids someone spending time on a PR that gets rejected because the approach doesn't fit
2. Fork the repo and branch off staging
3. Make your change and commit it. In the commit message, explain what problem it fixes or what it adds, and briefly why you made the technical choices you did, this helps whoever reviews it
4. If it closes an issue, add Fixes #123 to the commit message (no colon after "Fixes", GitHub won't auto-link it otherwise)
5. Open a pull request and sign the CLA when the bot prompts you
6. Wait for review. We're a small team, so this might take a few days, you may be asked to make changes before it's merged

## Local setup

You'll need Node.js v20+, npm, and Python 3/make/g++ (required to compile better-sqlite3).

```bash
npm install
cd client && npm install
cd ..
```

Run the backend and frontend in separate terminals:

```bash
npm run dev:server   # Hono API on port 3001
npm run dev:client   # Vite dev server on port 5173
```

The SQLite database is created automatically at ./data/rant.db on first run.

## Reporting issues

Use the issue templates when opening a new issue, they'll show up automatically when you click New issue.

- Bug report - something isn't working as expected
- Feature request - you want to propose new functionality

Before opening one, check that:

- It's a real, current issue on the latest version
- It hasn't already been reported, search existing issues first
- It's reproducible (for bugs) or clearly scoped (for features)
- You've used the right template and filled in every section

Fill in every section of the template you pick. Issues with a clear, factual description get looked at faster than vague ones.

## Pull request guidelines

- Branch off staging, not main
- Keep PRs focused on one change, don't bundle unrelated fixes
- Write a short PR description: what changed and why
- Reference the issue number if the PR closes one (e.g. Closes #12)
- Make sure the app still runs before opening the PR

## Questions

If anything here is unclear, open an issue or ask in the repo discussions rather than guessing.
