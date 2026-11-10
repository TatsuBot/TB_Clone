# Core rules specification

Single source of truth for the battle rules. Code lives in `packages/core`; changing a rule here
is a **design decision**, not a bug fix. Constants are in `packages/core/src/rules.ts`.

| Rule | Specification |
| --- | --- |
| Board | 8 rows x 6 columns, portrait. One unit per cell, except bosses which occupy a filled rectangle. Cells can also be walls or carry a reserved hazard tag. |
| Squad | Up to 6 allies, all 1x1. |
| Turn | The player drags exactly one ally. Enemies then take their turn. |
| Movement | The dragged unit follows the pointer one cell at a time; a pointer jump across several cells is decomposed into single steps, each fully resolved before the next. Steps may be orthogonal or **diagonal**. |
| Diagonal steps | Cutting a corner slides past the two squares being skirted without touching them. One blocked neighbour (enemy or wall) does **not** stop it, like sliding along a wall; it is refused only when **both** neighbours are enemies/walls (no gap to squeeze through). Allies never block and are not displaced. A diagonal target holding an ally displaces it into the vacated square, so two diagonal allies swap places. The target square itself must always be enterable. (`RULES.diagonalMoves`) |
| Move timer | 4 s, starting on the first *successful* step. Planning time is unlimited. Release or expiry ends the move wherever the unit is. |
| Displacement | Passing through an ally drops that ally into the cell the mover just vacated (opposite the direction of travel). Never forward. |
| Blocked steps | Enemies, walls and board edges reject the step; the board is unchanged and the drag stays alive, so a unit slides along an obstacle like a wall while the pointer keeps moving. |
| Pincer | Pattern *ally, one or more enemies in an unbroken line, ally*, scanned over every row and column of the whole board (not only around the moved unit). All enemies in the line are hit at full damage. |
| Corner | A corner enemy is pincered by allies on its two edge-adjacent cells. |
| Boss | Contact with any square counts; a boss is listed once per pincer. |
| Chain | Allies in the same row/column as a flanker with no enemy or wall between them join the attack. Empty cells do **not** break a chain (`RULES.chainThroughEmpty`). |
| Attack count | A unit attacks once per pincer it belongs to (as flanker or chain). |
| Resolution order | 1) finalise positions, 2) detect all pincers + chains and freeze each pincer's attacker roster, 3) put the pincers in order, 4) resolve them **one at a time**: apply that pincer's damage (flankers first, then chain nearest-first), then remove what it defeated before the next pincer starts. Detection never deals damage. |
| Pincer order | A pincer the **moving unit flanks resolves first**. The rest go in reading order of each pincer's anchor (the top-left-most cell among its flankers and targets): top row first, then leftmost. Exact ties: horizontal, vertical, corner, then flanker ids. The enemy turn has no mover, so it is reading order only. |
| Already defeated | A target killed by an earlier pincer is gone and is not hit by later ones; a pincer with no live targets left is skipped. Overkill inside a single pincer still lands. |
| Damage (current) | `max(1, atk - def)` per attack. Skills, weapon triangle and elements arrive in Phase 3. |
| Enemy turn | Each 1x1 enemy in turn may step into an adjacent empty cell (never displacing anyone), preferring cells that complete a pincer on an ally, otherwise closer to the nearest ally. Then the same pincer/chain resolution runs with sides swapped. Bosses hold position for now. |
| Waves | Clearing a wave spawns the next one and the player keeps the turn. Clearing the last wave is victory. A spawn cell occupied by an ally falls back to the nearest free cell. |
| Defeat | Fewer than 2 allies remain. |
| Determinism | A turn resolves from the board plus the mover's path only. All randomness goes through the seeded RNG (`createRng`). |

## Decisions the plan left open

- **Diagonals only fail when both skirted squares are blocked.** One enemy/wall beside the path is fine (confirmed by a reported board); the two-blocked case is my assumption, so test it against the original.
- **Empty cells don't break chains**, and **walls do**.
- **Pincers resolve one at a time** (mover's first, then top-left to bottom-right), with defeated units removed after each pincer. This deliberately departs from the plan's single removal pass at step 6, so any future on-death or counter effect fires between pincers.
- **Anchor = top-left-most cell of the pincer** (flankers and targets). "Top-left to bottom-right" is read as reading order, not diagonal order; say so if you meant diagonal.
- **A drag that never moved is not a turn.**
- **New wave = player keeps initiative** (skips the enemy turn).
