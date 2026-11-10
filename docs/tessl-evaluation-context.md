# Tessl evaluation context

A short map of how the carnival actually works, for agents fixing bugs or adding
games in this fork. The rules themselves live elsewhere, so read those too:

- [`AGENTS.md`](../AGENTS.md): the stack, commands and house rules.
- [`skills/add-carnival-game/SKILL.md`](../skills/add-carnival-game/SKILL.md):
  how to add a game.
- [`skills/verify-carnival-change/SKILL.md`](../skills/verify-carnival-change/SKILL.md):
  how to check a change before handing it off.

## Entry points

| File                      | What it does                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `index.html`              | The only page. Loads `src/main.ts` into `#app`.                                                            |
| `src/main.ts`             | Calls `applyTheme()`, routes on the hash and renders the midway or a game.                                 |
| `src/games/index.ts`      | Builds `registry` from every `src/games/*/game.ts` default export.                                         |
| `src/carnival/index.ts`   | The shared base games import: registry, scores, prizes and theme.                                          |
| `src/midway/midway.ts`    | `startMidway(canvas, { games, onPlay, onReach })`: input, camera and the loop. Returns `{ walkTo, stop }`. |
| `src/midway/world.ts`     | `layoutMidway(gameIds)`, movement and pathfinding, as plain functions.                                     |
| `src/midway/render.ts`    | Draws scenery, booths and people on the 2D canvas.                                                         |
| `src/share.ts`            | `carnivalLink` and `shareLinks` for the midway's credit line.                                              |
| `src/games/water-cannon/` | The one finished game, and the pattern to copy.                                                            |

## Routing

`route()` in `src/main.ts` runs on load and on every `hashchange`. It first
calls the current `stop` function, then:

- `#/play/<id>` with a registered id: `renderGame(game)` sets up a header and a
  canvas and calls `game.start(canvas)`, keeping the returned function as `stop`.
- Anything else, including an unknown id: `renderMidway()`, which starts the
  map with `startMidway` and keeps its `stop`.

## Game lifecycle

1. **Discovery.** `src/games/index.ts` uses Vite's `import.meta.glob('./*/game.ts', { eager: true, import: 'default' })`.
   It throws if a `game.ts` has no default export, or if the game's `id` is not
   its folder name. `createRegistry` in `src/carnival/registry.ts` throws on a
   non-kebab-case id or a duplicate id.
2. **Booth.** `layoutMidway` gives each registered game a booth, two per row,
   and fills the rest with "coming soon" booths. Walking up to a booth calls
   `onReach`, which fills the booth card in `src/main.ts` with the game's name,
   description and best score.
3. **Start.** `start(canvas)` sizes the canvas, adds listeners and starts a
   `requestAnimationFrame` loop. The water cannon keeps a `scoreRecorded` flag
   so it calls `recordScore` once when `state.phase` becomes `'over'`.
4. **Stop.** Leaving the game changes the hash, so `route()` calls the function
   `start` returned. It must cancel the frame and remove every listener.

`src/games/index.test.ts` checks that every folder under `src/games/` is
registered and that every game has a name and a description.

## Scores

`src/carnival/scores.ts` keeps every game's scores under one local storage
key, `tessl-carnival:scores`, as a JSON array of `{ gameId, score, at }`.

- `recordScore(gameId, score)` throws on a negative or non-finite score, rounds
  the score, and keeps at most 50 entries per game.
- `bestScore(gameId)` and `topScores(gameId, count)` sort highest first, and
  earliest first on a tie.
- **Fallbacks.** If `window.localStorage` throws when read, scores live in
  memory for this page load. If a write throws, for example when storage is
  full, the board switches to memory and keeps the scores from that write.
- **Malformed storage.** Text that isn't JSON, or JSON that isn't an array,
  loads as no scores. The entries inside an array are not checked.
- `createScoreBoard(storage, now)` takes any `getItem`/`setItem` object, so tests
  pass an in-memory one. See `src/carnival/scores.test.ts`.

The midway reads `bestScore` only while rendering, so a new best shows the next
time the midway renders, after the player goes back from the game.

## Theme

`src/carnival/theme.ts` exports `theme` (colours, the font family and sizes,
`radius`, and the 800×500 `canvas` size), `canvasFont(size, weight)` for
canvas font strings, and `applyTheme()`, which `src/main.ts` calls to expose the
colours to CSS as `--color-*` custom properties. The midway map's own scenery
colours live in `src/midway/palette.ts`, built on the theme. Games use `theme`
and `canvasFont` only.

## Setup and checks

- `.tessl/cloud-launch-setup.sh` runs from the clone root on the Tessl cloud
  machine before each agent run. It runs `npm ci` and nothing else.
- `.devcontainer/devcontainer.json` runs `npm ci` and installs the Tessl CLI
  for Codespaces.
- CI (`.github/workflows/ci.yml`) runs `npm ci`, `npm run check` and
  `npm run build` on every pull request and every push to `main`.
- There are no browser tests. That is the repository's test and dependency
  policy, not a proven limit of the cloud platform: game logic is tested with
  Vitest, no browser-test dependencies are added, and `npm ci` stays the whole
  setup. The setup hook only runs `npm ci`, so it says nothing about whether
  the platform could install browser tooling. Browser flows are checked by hand
  and reported as Passed, Failed or Unverified.
