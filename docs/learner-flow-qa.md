# Learner flow QA: Case Breaker MVP writing case

Maps the ClickUp "MVP learner-flow verification" checklist to automated checks (`npm test`) or manual QA.

| # | Checklist item | Covered by |
|---|---|---|
| 1 | Vite entry resolves `index.html` → `app/main.jsx`, stylesheet loads | `npm run build` + manual `npm run dev` |
| 2 | Case reading → writing → self-review → completion | `CaseBreaker.test.jsx` › runs case reading → … → completion |
| 3 | Live word count; completion requires 30–50 words | `CaseBreaker.test.jsx` › live word count, boundary table (29/30/50/51); `flow.test.js` |
| 4 | Completion requires all four self-check items | `CaseBreaker.test.jsx` › requires every one of the four self-check items; `flow.test.js` |
| 5 | Returning to the draft preserves text and answers | `CaseBreaker.test.jsx` › preserves typed text and self-check answers |
| 6 | "Noch einmal üben" resets draft, checks, progress | `CaseBreaker.test.jsx` › "Noch einmal üben" resets … |
| 7 | Keyboard focus, labeled textarea/checkboxes, status messages | `CaseBreaker.test.jsx` › accessibility (jsdom); **manual**: visible focus ring in a real browser |
| 8 | Layout at a narrow mobile viewport | **Manual**: DevTools 360×740, check no horizontal scroll, buttons tappable |
| 9 | No login, persistence, backend, payment, or AI grading claimed | `CaseBreaker.test.jsx` › regression guard on scope claims |

## Run locally

```bash
npm install
npm run build
npm test
npm run dev   # then do manual items 1, 7, 8
```

## CI workflow (add manually)

The automation token can't write workflow files, so add this as `.github/workflows/ci.yml` from GitHub's web editor or a local push:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [master, 'feature/**']

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: false
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      # Switch to `npm ci` once package-lock.json is regenerated.
      - name: Install
        run: npm install --no-audit --no-fund
      - name: Build
        run: npm run build
      - name: Test
        run: npm test
```

## Known gaps

- `package-lock.json` was not regenerated (no npm in the authoring environment). Run `npm install` locally and commit the updated lockfile, then switch CI to `npm ci`.
- `node_modules/` and `dist/` are committed to the repo; remove them from version control in a separate cleanup PR.
- The unused `src` gitlink is tracked in issue #1.
- Tests have not been executed yet; first real run is on the reviewer's machine or CI.
