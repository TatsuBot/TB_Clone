import { loadStage, type StageData } from '@game/core';

/** Default practice board = Chapter 1 Stage 1 from the stage table. */
export const stage1: StageData = loadStage(1, 1)!;

/** Lookup for battle entry from the map UI. */
export function stageFor(chapter: number, stage: number): StageData {
  return loadStage(chapter, stage) ?? stage1;
}
