/**
 * Simple save / load for the meta-game preview.
 * - localStorage key for auto-persist across refreshes
 * - explicit download (Save) and file-picker upload (Load)
 */

import { CHARACTERS, COMPANIONS, type CharacterInstance, type CompanionInstance } from '@game/core';
import {
  ownedCharacters,
  ownedCompanions,
  resetInventory,
} from './inventory';
import { progress, progressSnapshot, applyProgressSnapshot, resetProgress } from './progress';

export const SAVE_VERSION = 1;
const STORAGE_KEY = 'pincer-save-v1';
const ARCHIVE_KEY = 'pincer-save-archive-v1';

export interface SaveGame {
  version: number;
  savedAt: string; // ISO
  characters: CharacterInstance[];
  companions: CompanionInstance[];
  /** Optional meta progress — expand later */
  meta?: {
    selectedChapter?: number;
    stamina?: number;
    staminaMax?: number;
    energy?: number;
    coins?: number;
    cleared?: Record<string, boolean>;
    bag?: Record<string, number>;
  };
}

export interface ArchivedSaveFile {
  filename: string;
  modifiedAt: string;
}

export async function listArchivedSaves(): Promise<{ ok: true; saves: ArchivedSaveFile[] } | { ok: false }> {
  try {
    const response = await fetch('/__save-archives');
    if (!response.ok) return { ok: false };
    const saves = await response.json() as ArchivedSaveFile[];
    return { ok: true, saves: Array.isArray(saves) ? saves : [] };
  } catch {
    return { ok: false };
  }
}

export async function loadArchivedSave(filename: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!/^save-\d+\.json$/.test(filename)) return { ok: false, error: 'Invalid archived save name' };
  try {
    const response = await fetch(`/__save-archives/${encodeURIComponent(filename)}`);
    if (!response.ok) return { ok: false, error: 'Could not read that archived save' };
    const payload = await response.json() as { save?: SaveGame };
    if (!payload.save) return { ok: false, error: 'Archived file has no save data' };
    const result = applySave(payload.save);
    if (!result.ok) return result;
    saveToLocalStorage(payload.save.meta);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not load archived save' };
  }
}

export function buildSave(meta?: SaveGame['meta']): SaveGame {
  const snap = progressSnapshot();
  return {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    characters: structuredClone(ownedCharacters),
    companions: structuredClone(ownedCompanions),
    meta: meta ?? {
      stamina: snap.stamina,
      staminaMax: snap.staminaMax,
      energy: snap.energy,
      coins: snap.coins,
      cleared: snap.cleared,
      bag: snap.bag,
    },
  };
}

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** A character the current game data can actually use. Unknown ids / broken shapes are dropped. */
export function isUsableCharacter(c: unknown): c is CharacterInstance {
  const x = c as Partial<CharacterInstance> | null;
  return (
    !!x &&
    typeof x.uid === 'string' &&
    typeof x.defId === 'string' &&
    x.defId in CHARACTERS &&
    (x.activeJob === 1 || x.activeJob === 2 || x.activeJob === 3) &&
    Array.isArray(x.jobLevels) &&
    x.jobLevels.length === 3 &&
    x.jobLevels.every(isNum) &&
    (x.jobXp === undefined || (Array.isArray(x.jobXp) && x.jobXp.length === 3 && x.jobXp.every(isNum)))
  );
}

export function isUsableCompanion(c: unknown): c is CompanionInstance {
  const x = c as Partial<CompanionInstance> | null;
  return !!x && typeof x.uid === 'string' && typeof x.defId === 'string' && x.defId in COMPANIONS && isNum(x.level);
}

/**
 * Replace in-memory inventory from a save payload.
 * A bad save is rejected WITHOUT touching the current roster, and broken individual entries are
 * dropped, so stale or corrupted data can never leave the game in an unusable state.
 */
export function applySave(data: SaveGame): { ok: true } | { ok: false; error: string } {
  if (!data || typeof data !== 'object') return { ok: false, error: 'Invalid save file' };
  if (data.version !== SAVE_VERSION) {
    return { ok: false, error: `Unsupported save version ${data.version} (need ${SAVE_VERSION})` };
  }
  if (!Array.isArray(data.characters) || !Array.isArray(data.companions)) {
    return { ok: false, error: 'Save missing characters or companions' };
  }

  const characters: CharacterInstance[] = data.characters.filter(isUsableCharacter).map((c) => ({
    ...c,
    // Existing saves predate per-job XP; initialize their progress at the current levels.
    jobXp: c.jobXp ?? [0, 0, 0] as [number, number, number],
  }));
  const companions = data.companions.filter(isUsableCompanion);
  if (characters.length === 0) return { ok: false, error: 'Save has no usable characters' };

  // An equipped companion that no longer exists is simply unequipped.
  const companionUids = new Set(companions.map((c) => c.uid));
  for (const c of characters) {
    if (c.companionUid && !companionUids.has(c.companionUid)) c.companionUid = undefined;
  }

  // Mutate arrays in place so existing references in UI keep working
  ownedCharacters.length = 0;
  ownedCharacters.push(...characters);

  ownedCompanions.length = 0;
  ownedCompanions.push(...companions);

  applyProgressSnapshot(data.meta);

  return { ok: true };
}

export function saveToLocalStorage(meta?: SaveGame['meta']): void {
  const save = buildSave(meta);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // quota / private mode — ignore
  }
}

export function loadFromLocalStorage(): { ok: true; save: SaveGame } | { ok: false } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ok: false };
    const data = JSON.parse(raw) as SaveGame;
    const result = applySave(data);
    if (!result.ok) return { ok: false };
    return { ok: true, save: data };
  } catch {
    return { ok: false };
  }
}

export function hasLocalSave(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) !== null; }
  catch { return false; }
}

/** Archive the existing browser save, then clear it and restore the starter game state. */
export async function archiveAndStartNewGame(): Promise<{ ok: true; archiveLocation?: 'saves' | 'download' } | { ok: false; error: string }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let archiveLocation: 'saves' | 'download' = 'saves';
    if (raw !== null) {
      const previous: Array<{ archivedAt: string; save: string }> = JSON.parse(localStorage.getItem(ARCHIVE_KEY) ?? '[]');
      const record = { archivedAt: new Date().toISOString(), save: raw };
      previous.push(record);
      const retained = previous.slice(-20);
      try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(retained)); } catch { /* The file archive below remains the primary copy. */ }

      let allStored = true;
      for (const archived of retained) allStored = (await storeArchiveFile(archived)) && allStored;
      if (allStored) {
        localStorage.removeItem(ARCHIVE_KEY);
      } else {
        archiveLocation = 'download';
        for (const archived of retained) downloadArchive(archived);
      }
      localStorage.removeItem(STORAGE_KEY);
    }
    resetInventory();
    resetProgress();
    return { ok: true, archiveLocation };
  } catch {
    return { ok: false, error: 'Could not archive the existing save. It was left untouched.' };
  }
}

async function storeArchiveFile(record: { archivedAt: string; save: string }): Promise<boolean> {
  try {
    const response = await fetch('/__save-archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function downloadArchive(record: { archivedAt: string; save: string }): void {
  const stamp = record.archivedAt.replace(/[^0-9]/g, '').slice(0, 17);
  const blob = new Blob([JSON.stringify({ archivedAt: record.archivedAt, save: JSON.parse(record.save) }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `save-${stamp || Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Trigger a browser download of the current save as JSON. */
export function downloadSave(meta?: SaveGame['meta']): void {
  const save = buildSave(meta);
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pincer-save-${dateStamp()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  // also mirror to localStorage
  saveToLocalStorage(meta);
}

/** Open a file picker and load the chosen JSON save. */
export function promptLoadSave(): Promise<{ ok: true } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        resolve({ ok: false, error: 'No file selected' });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result)) as SaveGame;
          const result = applySave(data);
          if (result.ok) {
            saveToLocalStorage(data.meta);
            resolve({ ok: true });
          } else {
            resolve(result);
          }
        } catch {
          resolve({ ok: false, error: 'Could not parse save file' });
        }
      };
      reader.onerror = () => resolve({ ok: false, error: 'Failed to read file' });
      reader.readAsText(file);
    });
    input.click();
  });
}

function dateStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}
