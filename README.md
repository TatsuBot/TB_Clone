# Game

TypeScript monorepo for the combat-first build plan. Phases 0-2 plus flat damage, a basic enemy
turn and waves (the plan's "first week" target) are implemented and tested.

```
packages/core   pure battle core: no DOM, no rendering, no input. Fully unit-tested.
apps/web        presentation + input: canvas renderer, pointer drag, timer bar. Thin shell.
docs/           core-rules.md is the rules spec.
```

## Commands

```bash
npm install
npm run dev        # play in the browser (Vite)
npm test           # core unit tests + stage validation + random-bot soak
npm run typecheck
npm run build      # static build in apps/web/dist
```

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

Phase 3 skills / weapon triangle / elements, per-unit weapon and element fields, jobs and
roster data (Phase 5), meta layer (Phase 6), and the Capacitor / Tauri wrappers. A `packages/meta`
and `apps/mobile` / `apps/desktop` can slot into the existing workspaces.

Placeholder unit names are neutral labels. Keep original characters, art and story out of
this repo until you've created your own.
