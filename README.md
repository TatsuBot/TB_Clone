# Game

TypeScript monorepo for the combat-first build plan. Phases 0-2 plus flat damage, a basic enemy
turn and waves (the plan's "first week" target) are implemented and tested.

A full set of **meta-game UI interfaces** (title, hub, map, stage select, pre-battle, tavern,
party, character detail, shop, options) is also present as navigable mock screens.

```
packages/core   pure battle core: no DOM, no rendering, no input. Fully unit-tested.
apps/web        presentation + input + UI shell
  src/ui/       screen router, status bar, bottom nav, all meta screens
docs/           core-rules.md is the rules spec.
```

## Commands

```bash
npm install
npm run dev        # play in the browser (Vite) — starts on the title screen
npm test           # core unit tests + stage validation + random-bot soak
npm run typecheck
npm run build      # static build in apps/web/dist
```

## How to try the UI

1. `npm install && npm run dev`
2. Title → Start → Home hub
3. Use the bottom tabs or hub tiles to reach Map, Tavern, Party, Options
4. Map → pick a chapter → pick a stage → Confirm Party → Start Battle
5. In battle, use **Leave** to return to the map

Screens are interfaces only — recruitment, job unlocks, currency, and real progression are not wired yet.

## Architecture notes

- **The board is the single source of truth.** Units have no position field; `Board` derives
  positions from its occupancy grid.
- **Drags work on a clone** (`DragSession`) and only replace the real board on `Battle.commitDrag`,
  so the UI can show live displacement without touching battle state.
- **Presentation never decides outcomes.** `Battle` returns `TurnReport`s; the renderer plays them back.
- **Tests use ASCII boards** (`parseBoard` / `renderBoard`): `.` empty, `#` wall, `1-9` allies,
  `a-z` enemies, `A-Z` multi-cell bosses.
- **Stages are data** (`StageData`, see `apps/web/src/stage1.ts`) and are validated on load.

## Not built yet (next up per the plan)

- Parse the `Monster` entries in `apps/web/public/wikiCharData.txt` into
  `packages/core/src/data/enemies.ts`, keeping enemy records separate from recruitable adventurers.
- Build a skill reference table listing each skill, its mechanics, and whether it has been verified
  working in the game.
- Restrict Tavern pacts to adventurers marked as verified.
- Add a Tavern page that lists the units currently available from each pact.
- On a new game, grant one starter from Bahl or Grace, one from Amisandra, Amimari, or Amina,
  then give the player four Pact of Truth rolls with no duplicate adventurers.

roster data (Phase 5), meta layer (Phase 6), and the Capacitor / Tauri wrappers. A `packages/meta`
and `apps/mobile` / `apps/desktop` can slot into the existing workspaces.

Placeholder unit names are neutral labels. Keep original characters, art and story out of
this repo until you've created your own.
