/**
 * Simple save / load for the meta-game preview.
 * - localStorage key for auto-persist across refreshes
 * - explicit download (Save) and file-picker upload (Load)
 */

import type { CharacterInstance, CompanionInstance } from '@game/core';
import {
  ownedCharacters,
  ownedCompanions,
} from './inventory';

export const SAVE_VERSION = 1;
const STORAGE_KEY = 'pincer-save-v1';

export interface SaveGame {
  version: number;
  savedAt: string; // ISO
  characters: CharacterInstance[];
  companions: CompanionInstance[];
  /** Optional meta progress — expand later */
  meta?: {
    selectedChapter?: number;
    rank?: number;
    stamina?: number;
    energy?: number;
    coins?: number;
  };
}

export function buildSave(meta?: SaveGame['meta']): SaveGame {
  return {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    characters: structuredClone(ownedCharacters),
    companions: structuredClone(ownedCompanions),
    meta: meta ?? {
      rank: 12,
      stamina: 42,
      energy: 18,
      coins: 24500,
    },
  };
}

/** Replace in-memory inventory from a save payload. */
export function applySave(data: SaveGame): { ok: true } | { ok: false; error: string } {
  if (!data || typeof data !== 'object') return { ok: false, error: 'Invalid save file' };
  if (data.version !== SAVE_VERSION) {
    return { ok: false, error: `Unsupported save version ${data.version} (need ${SAVE_VERSION})` };
  }
  if (!Array.isArray(data.characters) || !Array.isArray(data.companions)) {
    return { ok: false, error: 'Save missing characters or companions' };
  }

  // Mutate arrays in place so existing references in UI keep working
  ownedCharacters.length = 0;
  ownedCharacters.push(...data.characters);

  ownedCompanions.length = 0;
  ownedCompanions.push(...data.companions);

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
