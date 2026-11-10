---
name: verify-carnival-change
description: Check a finished Tessl Carnival change, a bug fix or a new game, before handing it off, and report each user flow as Passed, Failed or Unverified. Use before opening or updating a pull request, or when asked to verify, test or check a change.
---

# Verify a carnival change

Read [`docs/tessl-evaluation-context.md`](../../docs/tessl-evaluation-context.md)
for how the code works and [`AGENTS.md`](../../AGENTS.md) for the house rules.
This skill only adds how to check a change and how to report it.

Don't add browser-test dependencies, such as Playwright, Puppeteer or jsdom.
That is the repository's test and dependency policy: game logic is tested with
Vitest, and `npm ci` stays the whole setup. It is not a claim that the cloud
platform can't install browser tooling. Browser flows are checked by hand, as
in step 5.

## 1. Read the acceptance criteria

Read the issue's **Done when** and turn every item into a line of your report.
If the issue describes a bug, write down the steps that show it and what the
person expected to see instead.

## 2. Show the bug before the fix

For a bug, write a focused test that reproduces it, through the module's
exported functions, and run it on the code without your fix:
`npx vitest run <test file>`. It must fail for the reason the issue gives. If
you can't make it fail, say so: you haven't reproduced the bug yet.

Then apply the fix and run the same test again. It must pass. Keep the test as
the regression test.

## 3. Add focused regression tests

Test what the change does for a player, next to the code: `game.test.ts` for a
game, `src/carnival/*.test.ts` for the shared base. Cover the edge the issue is
about and its neighbours, not only the one input from the issue.

## 4. Run the full checks

Run `npm run format`, then `npm run check` (lint, formatting, type-check and
every test) and `npm run build`. Both must pass. Copy the summary lines, such
as the test count, into the report. If a failure isn't from your change, say
which test and why you think so.

## 5. Check the browser flows honestly

A green unit test does not prove what the browser does. For each flow the
issue touches, either:

- run `npm run dev`, open http://localhost:5173, do the steps and report what
  you saw: **Passed** or **Failed**, or
- when you can't open a browser, report the flow as **Unverified**, with the
  steps a person should take to check it.

Never mark a browser flow Passed because its unit tests passed.

## Example: malformed score storage

Say an issue reports that the midway breaks when the scores in local storage
are malformed, for example `tessl-carnival:scores` holds `[null]` or an entry
whose `score` isn't a number.

1. In `src/carnival/scores.test.ts`, write the malformed value into an
   in-memory storage, as the `survives corrupt storage` test does, build a
   board with `createScoreBoard(storage)` and call `best`, `top` and `record`.
   Run it before the fix and see it fail as the issue says.
2. Fix `src/carnival/scores.ts`, and run the test again to see it pass. Also
   check the cases that already worked still do: text that isn't JSON, JSON
   that isn't an array, and a write that throws.
3. Run `npm run check` and `npm run build`.
4. Browser flows, each Passed, Failed or Unverified:
   - In the browser console, run
     `localStorage.setItem('tessl-carnival:scores', '[null]')`, reload, and
     check the midway draws and the booth list shows "No scores yet".
   - Play a round of the water cannon, go back to the midway, and check the
     booth shows the new best.

## Example: a new game

Check the game against [`skills/add-carnival-game/SKILL.md`](../add-carnival-game/SKILL.md):

- **Registration:** the folder name and the `id` match, `game.ts` has a default
  export, and `src/games/index.test.ts` passes. `src/games/index.ts` is
  unchanged.
- **Scores:** `recordScore(game.id, score)` is called once when a round ends,
  and nothing in the folder touches `localStorage`. Search the folder for
  `localStorage` and `recordScore`.
- **Theme:** no hex colours or font strings in the folder. Search it for `#`
  colour values and `px` font strings; every colour is `theme.colors.*` and
  every font is `canvasFont(...)`.
- **Cleanup:** the function `start` returns cancels the animation frame and
  removes every listener `start` added. Pair each `addEventListener` with its
  `removeEventListener`.
- **README:** how to play, how scoring works and the files listed all match
  `game.ts`.
- **Browser flows:** the booth shows on the midway, `#/play/<game-id>` plays a
  round, the best score shows on the midway after it, and going back to the
  midway stops the game. Passed, Failed or Unverified, as in step 5.

## The report

End with a short report, in the pull request or the run output:

```md
## Verification

| Check                                 | Status     | Evidence                                     |
| ------------------------------------- | ---------- | -------------------------------------------- |
| Bug reproduced before the fix         | Passed     | `scores.test.ts` failed: TypeError on null   |
| Regression test after the fix         | Passed     | `npx vitest run src/carnival/scores.test.ts` |
| `npm run check`                       | Passed     | 42 tests passed                              |
| `npm run build`                       | Passed     | built into `dist/`                           |
| Midway loads with `[null]` in storage | Unverified | no browser here: steps above                 |
```

One row per acceptance criterion and per browser flow. Say what you did not
run and why.
