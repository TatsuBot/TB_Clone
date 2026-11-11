import {
  type ScreenId,
  SCREENS,
  CHAPTERS,
  stagesForChapter,
} from './screens';
import {
  statsAtLevel,
  frequencyAtLevel,
  charStatsAtLevel,
  characterXpToNextLevel,
  skillsUnlocked,
  cycleWeaponAdvantagePreset,
  getWeaponAdvantageMultiplier,
} from '@game/core';
import { stagesForChapter as coreStageRefs, getStageRef } from '@game/core';
import {
  ownedCompanions,
  ownedCharacters,
  equipCompanion,
  companionByUid,
  getCompanionDef,
  getCharacterDef,
  type CharacterInstance,
} from './inventory';
import { archiveAndStartNewGame, downloadSave, hasLocalSave, listArchivedSaves, loadArchivedSave, promptLoadSave, loadFromLocalStorage, saveToLocalStorage } from './save';
import { isCleared, progress } from './progress';
import type { GrantedItem } from '@game/core';
import { rollPact, addEnergy, type PactId } from './tavern';
import { reportFatal } from '../errors';

/** Simple screen router + UI shell for the meta-game interfaces. */
export class UI {
  private root: HTMLElement;
  private statusEl: HTMLElement;
  private navEl: HTMLElement;
  private screensEl: HTMLElement;
  private current: ScreenId = 'title';
  private selectedChapter = 1;
  private selectedStage = 1;
  private selectedCharUid: string | null = null;
  private pickingCompanion = false;
  private onEnterBattle: (() => void) | null = null;
  private resultsContinueTarget: ScreenId = 'map';
  private activePartyUids = ownedCharacters.slice(0, 6).map((c) => c.uid);
  private draftPartyUids: string[] = [];

  constructor() {
    this.root = document.getElementById('ui-root')!;
    this.statusEl = document.getElementById('ui-status')!;
    this.navEl = document.getElementById('ui-nav')!;
    this.screensEl = document.getElementById('ui-screens')!;
    this.bindNav();
    this.bindTavern();
    this.bindGlobal();
    // Show the title screen BEFORE anything that reads saved data, so a bad save can
    // never leave every screen hidden (the "black screen").
    this.show('title');
    try {
      this.tryLoadAutosave();
      this.refreshStatusBar();
    } catch (err) {
      reportFatal(err, 'startup');
    }
  }

  setBattleCallback(fn: () => void): void {
    this.onEnterBattle = fn;
  }

  getSelectedStage(): { chapter: number; stage: number } {
    return { chapter: this.selectedChapter, stage: this.selectedStage };
  }

  getActiveParty(): CharacterInstance[] {
    const selected = this.activePartyUids
      .map((uid) => ownedCharacters.find((c) => c.uid === uid))
      .filter((c): c is CharacterInstance => !!c);
    return selected.length ? selected : ownedCharacters.slice(0, 6);
  }

  show(id: ScreenId): void {
    this.current = id;
    document.body.classList.add('ui-ready'); // hides the static "Loading…" fallback
    const meta = SCREENS[id];
    this.pickingCompanion = false;

    this.statusEl.style.display = meta.showStatusBar ? 'flex' : 'none';
    this.navEl.style.display = meta.showBottomNav ? 'flex' : 'none';

    this.navEl.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.screen === id || this.navMatch(id, btn.dataset.screen));
    });

    this.screensEl.querySelectorAll('.ui-screen').forEach((el) => {
      el.classList.toggle('active', el.id === `screen-${id}`);
    });

    this.renderScreen(id);
    document.body.classList.toggle('battle-active', id === 'battle');
  }

  private navMatch(current: ScreenId, tab?: string): boolean {
    if (!tab) return false;
    if (tab === 'map' && (current === 'stage-select' || current === 'pre-battle')) return true;
    if (tab === 'tavern' && (current === 'recruit' || current === 'shop')) return true;
    if (tab === 'party' && current === 'character-detail') return true;
    return false;
  }

  private bindNav(): void {
    this.navEl.querySelectorAll('button[data-screen]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = (btn as HTMLElement).dataset.screen as ScreenId;
        if (target) this.show(target);
      });
    });
  }

  private bindGlobal(): void {
    document.getElementById('btn-start')?.addEventListener('click', () => this.show('hub'));

    document.querySelectorAll('[data-goto]').forEach((el) => {
      el.addEventListener('click', () => {
        const target = (el as HTMLElement).dataset.goto as ScreenId;
        if (target) this.show(target);
      });
    });

    document.querySelectorAll('[data-back]').forEach((el) => {
      el.addEventListener('click', () => {
        const target = (el as HTMLElement).dataset.back as ScreenId;
        if (target) this.show(target);
      });
    });

    document.querySelectorAll('.tavern-tabs button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = (btn as HTMLElement).dataset.tavern as string;
        document.querySelectorAll('.tavern-tabs button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tavern-pane').forEach((p) => {
          (p as HTMLElement).style.display = (p as HTMLElement).dataset.pane === target ? 'block' : 'none';
        });
      });
    });

    document.getElementById('btn-start-battle')?.addEventListener('click', () => {
      this.show('battle');
      try {
        this.onEnterBattle?.();
      } catch (err) {
        // Don't strand the player on an empty battle canvas.
        this.show('pre-battle');
        reportFatal(err, 'start-battle');
      }
    });

    document.getElementById('btn-select-party')?.addEventListener('click', () => {
      this.draftPartyUids = this.getActiveParty().map((c) => c.uid);
      this.show('party-select');
    });
    document.getElementById('btn-party-select-cancel')?.addEventListener('click', () => this.show('pre-battle'));
    document.getElementById('btn-party-select-confirm')?.addEventListener('click', () => {
      const message = document.getElementById('party-select-message');
      if (this.draftPartyUids.length < 2) {
        if (message) message.textContent = 'Select at least two adventurers to form a battle party.';
        return;
      }
      this.activePartyUids = [...this.draftPartyUids];
      saveToLocalStorage();
      this.show('pre-battle');
    });

    document.getElementById('btn-results-continue')?.addEventListener('click', () => this.show(this.resultsContinueTarget));

    document.querySelectorAll('.toggle').forEach((el) => {
      el.addEventListener('click', () => el.classList.toggle('on'));
    });

    const advRow = document.getElementById('row-weapon-advantage');
    const advVal = document.getElementById('val-weapon-advantage');
    if (advVal) {
      advVal.textContent = `×${getWeaponAdvantageMultiplier().toFixed(2).replace(/\.00$/, '')}`;
    }
    advRow?.addEventListener('click', () => {
      const mult = cycleWeaponAdvantagePreset();
      if (advVal) advVal.textContent = `×${mult.toFixed(2).replace(/\.00$/, '')}`;
    });

    document.getElementById('btn-save-game')?.addEventListener('click', () => {
      downloadSave();
      this.setSaveStatus('Saved — file downloaded and stored locally.');
    });

    document.getElementById('btn-load-game')?.addEventListener('click', async () => {
      const box = document.getElementById('archived-saves');
      if (box) {
        box.hidden = true;
        box.innerHTML = '';
      }
      const archived = await listArchivedSaves();
      if (archived.ok && archived.saves.length > 0 && box) {
        box.innerHTML = `<div class="archived-saves-title">Archived saves</div>${archived.saves.map((save) =>
          `<button class="archived-save-option" type="button" data-archive-file="${save.filename}">${new Date(save.modifiedAt).toLocaleString()}</button>`,
        ).join('')}`;
        box.hidden = false;
        box.querySelectorAll<HTMLButtonElement>('[data-archive-file]').forEach((button) => {
          button.addEventListener('click', async () => {
            const filename = button.dataset.archiveFile;
            if (!filename) return;
            const loaded = await loadArchivedSave(filename);
            if (loaded.ok) {
              box.hidden = true;
              this.setSaveStatus('Loaded archived save.');
              if (this.current === 'party' || this.current === 'character-detail' || this.current === 'pre-battle') this.renderScreen(this.current);
              this.refreshStatusBar();
            } else {
              this.setSaveStatus(loaded.error);
            }
          });
        });
        this.setSaveStatus('Choose an archived save to load.');
        return;
      }

      const result = await promptLoadSave();
      if (result.ok) {
        this.setSaveStatus('Loaded save file.');
        // refresh any open views that depend on inventory
        if (this.current === 'party' || this.current === 'character-detail' || this.current === 'pre-battle') {
          this.renderScreen(this.current);
        }
        this.refreshStatusBar();
      } else {
        this.setSaveStatus(result.error);
      }
    });

    document.getElementById('btn-continue')?.addEventListener('click', () => {
      this.show('hub');
    });
    document.getElementById('btn-restart-save')?.addEventListener('click', async () => {
      const result = await archiveAndStartNewGame();
      if (!result.ok) {
        const message = document.getElementById('title-save-message');
        if (message) message.textContent = result.error;
        return;
      }
      this.activePartyUids = ownedCharacters.slice(0, 6).map((c) => c.uid);
      this.draftPartyUids = [];
      this.configureTitleActions(false, false);
      this.show('hub');
    });
  }

  showLevelCompleted(levelNumber: string, onContinue: () => void): void {
    const overlay = document.getElementById('level-completed-overlay') as HTMLButtonElement | null;
    const number = document.getElementById('level-completed-number');
    if (!overlay || !number) return;
    number.textContent = levelNumber;
    overlay.onclick = () => {
      overlay.hidden = true;
      onContinue();
    };
    overlay.hidden = false;
  }

  hideLevelCompleted(): void {
    const overlay = document.getElementById('level-completed-overlay');
    if (overlay) overlay.hidden = true;
  }

  showClearResults(stageName: string, xp: { name: string; job: number; xp: number; level: number; levelsGained: number; totalXp: number; xpIntoLevel: number; xpToNextLevel: number }[], items: GrantedItem[], coins: number): void {
    this.resultsContinueTarget = 'map';
    const title = document.getElementById('results-stage-name');
    const xpList = document.getElementById('results-xp');
    const lootList = document.getElementById('results-loot');
    if (title) title.textContent = `${stageName} cleared`;
    if (xpList) xpList.innerHTML = xp.length ? xp.map((entry) => {
      const maxed = entry.xpToNextLevel === 0;
      const percent = maxed ? 100 : Math.min(100, Math.round((entry.xpIntoLevel / entry.xpToNextLevel) * 100));
      return `<div class="results-xp-entry">
        <div class="results-xp-heading"><strong>${entry.name}</strong><strong>+${entry.xp.toLocaleString()} XP</strong></div>
        <div class="results-xp-meta">Job ${entry.job} · Lv. ${entry.level}${entry.levelsGained ? ` · Level up +${entry.levelsGained}` : ''} · Total ${entry.totalXp.toLocaleString()} XP</div>
        <div class="results-xp-meta">${maxed ? 'Maximum level' : `${entry.xpIntoLevel.toLocaleString()} / ${entry.xpToNextLevel.toLocaleString()} XP to next level`}</div>
        <div class="xp-progress-track"><div class="xp-progress-fill ${maxed ? 'maxed' : ''}" style="width:${percent}%"></div></div>
      </div>`;
    }).join('') : '<div class="results-empty">No adventurers received experience.</div>';
    if (lootList) {
      const rows = [`<div class="reward-row"><span>Coins</span><strong>+${coins.toLocaleString()}</strong></div>`, ...items.map((item) => `<div class="reward-row"><span>${item.name}</span><strong>×${item.qty}</strong></div>`)];
      lootList.innerHTML = rows.join('');
    }
    this.show('results');
  }

  private tryLoadAutosave(): void {
    const result = loadFromLocalStorage();
    const exists = hasLocalSave();
    this.configureTitleActions(exists, result.ok);
  }

  private configureTitleActions(saveExists: boolean, canContinue: boolean): void {
    const start = document.getElementById('btn-start');
    const cont = document.getElementById('btn-continue');
    const restart = document.getElementById('btn-restart-save');
    if (start) start.style.display = canContinue ? 'none' : 'inline-flex';
    if (cont) cont.style.display = canContinue ? 'inline-flex' : 'none';
    if (restart) restart.style.display = saveExists ? 'inline-flex' : 'none';
  }

  private setSaveStatus(msg: string): void {
    const el = document.getElementById('save-status');
    if (el) el.textContent = msg;
  }


  private refreshStatusBar(): void {
    const e = document.getElementById('stat-energy-val');
    const c = document.getElementById('stat-coins-val');
    const s = document.getElementById('stat-stamina-val');
    if (e) e.textContent = String(progress.energy);
    if (c) c.textContent = progress.coins.toLocaleString();
    if (s) s.textContent = String(progress.stamina);
  }

  private bindTavern(): void {
    document.querySelectorAll('[data-pact]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pactId = (btn as HTMLElement).dataset.pact as PactId;
        const result = rollPact(pactId);
        const box = document.getElementById('pact-result');
        if (box) {
          box.style.display = 'block';
          if (!result.ok) {
            box.innerHTML = `<p style="color:#f87171">${result.error}</p>`;
          } else {
            box.innerHTML = `<p><strong>${result.message}</strong></p>
              <p class="meta">${result.rarity} · ${result.kind}${result.duplicate ? ' · duplicate' : ''}</p>`;
          }
        }
        this.refreshStatusBar();
      });
    });
    document.getElementById('btn-add-energy')?.addEventListener('click', () => {
      addEnergy(1);
      this.refreshStatusBar();
    });
    document.getElementById('btn-add-energy-10')?.addEventListener('click', () => {
      addEnergy(10);
      this.refreshStatusBar();
    });
  }

  private renderScreen(id: ScreenId): void {
    if (id === 'map') this.renderMap();
    if (id === 'stage-select') this.renderStageSelect();
    if (id === 'pre-battle') this.renderPreBattle();
    if (id === 'party-select') this.renderPartySelect();
    if (id === 'party') this.renderParty();
    if (id === 'character-detail') this.renderCharacterDetail();
  }

  private renderMap(): void {
    const list = document.getElementById('chapter-list');
    if (!list) return;
    list.innerHTML = CHAPTERS.map((ch) => {
      const status = !ch.unlocked
        ? '<span class="ui-badge locked">Locked</span>'
        : ch.cleared
          ? '<span class="ui-badge cleared">Cleared</span>'
          : '<span class="ui-badge new">New</span>';
      return `
        <div class="chapter-card ${ch.unlocked ? '' : 'locked'} ${ch.cleared ? 'cleared' : ''}"
             data-chapter="${ch.id}">
          <div class="chapter-num">${ch.id}</div>
          <div class="chapter-info">
            <div class="name">Chapter ${ch.id}: ${ch.title}</div>
            <div class="meta">${ch.stages} stages · ${status}</div>
          </div>
        </div>`;
    }).join('');

    list.querySelectorAll('.chapter-card:not(.locked)').forEach((card) => {
      card.addEventListener('click', () => {
        this.selectedChapter = Number((card as HTMLElement).dataset.chapter);
        this.show('stage-select');
      });
    });
  }

  private renderStageSelect(): void {
    const header = document.getElementById('stage-select-title');
    const list = document.getElementById('stage-list');
    if (!header || !list) return;
    const ch = CHAPTERS.find((c) => c.id === this.selectedChapter);
    header.textContent = ch ? `Chapter ${ch.id}: ${ch.title}` : 'Stages';

    const core = coreStageRefs(this.selectedChapter);
    const stages =
      core.length > 0
        ? core.map((s) => ({
            id: s.stage,
            name: s.name,
            stamina: s.stamina,
            difficulty: s.difficulty,
            waves: s.waves.length,
            cleared: isCleared(s.id),
          }))
        : stagesForChapter(this.selectedChapter);

    list.innerHTML = stages
      .map((s) => {
        const stars = '★'.repeat(s.difficulty) + '☆'.repeat(5 - s.difficulty);
        return `
        <div class="stage-row ${s.cleared ? 'cleared' : ''}" data-stage="${s.id}">
          <div class="stage-num">${s.id}</div>
          <div class="stage-info">
            <div class="name">${s.name}</div>
            <div class="meta">
              <span>⚡ ${s.stamina}</span>
              <span>${s.waves} waves</span>
              <span class="stage-stars">${stars}</span>
            </div>
          </div>
          ${s.cleared ? '<span class="ui-badge cleared">✓</span>' : ''}
        </div>`;
      })
      .join('');

    list.querySelectorAll('.stage-row').forEach((row) => {
      row.addEventListener('click', () => {
        this.selectedStage = Number((row as HTMLElement).dataset.stage);
        this.show('pre-battle');
      });
    });
  }

  private renderPreBattle(): void {
    const info = document.getElementById('prebattle-stage-info');
    const slots = document.getElementById('party-slots');
    if (!info || !slots) return;

    const ref = getStageRef(this.selectedChapter, this.selectedStage);
    const fallback = stagesForChapter(this.selectedChapter).find((s) => s.id === this.selectedStage);
    const name = ref?.name ?? fallback?.name ?? 'Stage';
    const stamina = ref?.stamina ?? fallback?.stamina ?? 5;
    const waves = ref?.waves.length ?? fallback?.waves ?? 3;
    const difficulty = ref?.difficulty ?? fallback?.difficulty ?? 1;
    info.innerHTML = `
      <h3>${name}</h3>
      <div class="cost">
        <span>⚡ Stamina ${stamina}</span>
        <span>${waves} waves</span>
        <span class="stage-stars">${'★'.repeat(difficulty)}</span>
      </div>`;

    slots.innerHTML = this.getActiveParty()
      .map((inst) => {
        const def = getCharacterDef(inst);
        if (!def) return '';
        const job = def.jobs[inst.activeJob - 1];
        const lv = inst.jobLevels[inst.activeJob - 1];
        return `
      <div class="party-slot filled">
        <div class="portrait">${weaponEmoji(job.weapon)}</div>
        <div>${def.name}</div>
        <div class="lvl">Lv.${lv}</div>
      </div>`;
      })
      .join('');
  }

  private renderPartySelect(): void {
    const roster = document.getElementById('party-select-roster');
    const count = document.getElementById('party-select-count');
    const message = document.getElementById('party-select-message');
    if (!roster || !count) return;
    if (message) message.textContent = '';
    count.textContent = `${this.draftPartyUids.length} / 6 selected`;
    roster.innerHTML = ownedCharacters.map((inst) => {
      const def = getCharacterDef(inst);
      if (!def) return '';
      const job = def.jobs[inst.activeJob - 1];
      const selected = this.draftPartyUids.includes(inst.uid);
      const level = inst.jobLevels[inst.activeJob - 1];
      return `<button class="party-select-card ${selected ? 'selected' : ''}" type="button" data-party-uid="${inst.uid}" aria-pressed="${selected}">
        <span class="portrait">${weaponEmoji(job.weapon)}</span>
        <span class="party-select-name">${def.name}</span>
        <span class="party-select-level">${def.rarity} · Lv.${level}</span>
        <span class="party-select-state">${selected ? 'In party' : 'Add to party'}</span>
      </button>`;
    }).join('');
    roster.querySelectorAll<HTMLButtonElement>('[data-party-uid]').forEach((button) => {
      button.addEventListener('click', () => {
        const uid = button.dataset.partyUid;
        if (!uid) return;
        const index = this.draftPartyUids.indexOf(uid);
        if (index >= 0) this.draftPartyUids.splice(index, 1);
        else if (this.draftPartyUids.length < 6) this.draftPartyUids.push(uid);
        else if (message) message.textContent = 'A party can have up to six adventurers.';
        this.renderPartySelect();
      });
    });
  }

  private renderParty(): void {
    const grid = document.getElementById('char-grid');
    if (!grid) return;
    grid.innerHTML = ownedCharacters
      .map((inst) => {
        const def = getCharacterDef(inst);
        if (!def) return '';
        const job = def.jobs[inst.activeJob - 1];
        const lv = inst.jobLevels[inst.activeJob - 1];
        return `
      <div class="char-card rarity-${def.rarity.toLowerCase()}" data-uid="${inst.uid}">
        <div class="portrait">${weaponEmoji(job.weapon)}</div>
        <div class="cname">${def.name}</div>
        <div class="cmeta">${def.rarity} · Lv.${lv}</div>
      </div>`;
      })
      .join('');

    grid.querySelectorAll('.char-card').forEach((card) => {
      card.addEventListener('click', () => {
        this.selectedCharUid = (card as HTMLElement).dataset.uid ?? null;
        this.show('character-detail');
      });
    });
  }

  private renderCharacterDetail(): void {
    const inst = this.selectedCharUid
      ? ownedCharacters.find((c) => c.uid === this.selectedCharUid)
      : ownedCharacters[0];
    if (!inst) return;
    const def = getCharacterDef(inst);
    if (!def) return;

    const job = def.jobs[inst.activeJob - 1];
    const lv = inst.jobLevels[inst.activeJob - 1];
    const jobXp = inst.jobXp[inst.activeJob - 1];
    const stats = charStatsAtLevel(job, lv);
    const unlocked = skillsUnlocked(job, lv);

    // Header / portrait / name
    const portrait = document.querySelector('#screen-character-detail .detail-portrait');
    if (portrait) portrait.textContent = weaponEmoji(job.weapon);

    const nameBlock = document.querySelector('#screen-character-detail .detail-portrait')?.nextElementSibling;
    if (nameBlock) {
      nameBlock.innerHTML = `
        <div style="font-size:20px;font-weight:700">${def.name}</div>
        <div style="font-size:13px;color:var(--ui-muted)">${def.rarity} · ${job.weapon} · ${job.element} · Lv.${lv} · Job ${inst.activeJob}</div>
        <div style="font-size:12px;color:var(--ui-muted);margin-top:4px">${lv >= 90 ? 'Max level' : `${jobXp.toLocaleString()} / ${characterXpToNextLevel(job, lv).toLocaleString()} XP to next level`}</div>
        <div style="font-size:12px;color:var(--ui-muted);margin-top:4px">${job.title}</div>`;
    }

    // Stats
    const statBoxes = document.querySelectorAll('#screen-character-detail .detail-stats .stat-box .value');
    if (statBoxes.length >= 4) {
      statBoxes[0].textContent = stats.hp.toLocaleString();
      statBoxes[1].textContent = String(stats.atk);
      statBoxes[2].textContent = String(stats.def);
      statBoxes[3].textContent = String(stats.matk);
    }

    // Job tabs
    const jobTabs = document.querySelector('#screen-character-detail .job-tabs');
    if (jobTabs) {
      jobTabs.innerHTML = def.jobs
        .map(
          (j) =>
            `<button type="button" class="${j.jobIndex === inst.activeJob ? 'active' : ''}" data-job="${j.jobIndex}" ${
              j.jobIndex > 1 && inst.jobLevels[j.jobIndex - 1] <= 1 && j.jobIndex !== inst.activeJob ? '' : ''
            }>Job ${j.jobIndex}</button>`
        )
        .join('');
      jobTabs.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
          const j = Number((btn as HTMLElement).dataset.job) as 1 | 2 | 3;
          if (def.jobs.some((x) => x.jobIndex === j)) {
            inst.activeJob = j;
            this.renderCharacterDetail();
          }
        });
      });
    }

    // Skills
    const skillList = document.querySelector('#screen-character-detail .skill-list');
    if (skillList) {
      const allSkills = job.skills;
      skillList.innerHTML = allSkills
        .map((s) => {
          const open = lv >= s.level;
          return `<div class="skill-row" style="${open ? '' : 'opacity:0.45'}">
            <div class="sk-name">${open ? s.name : '— locked —'}</div>
            <div class="sk-meta">${open ? `${s.trigger} · ${s.description}` : `Unlocks at Job Lv.${s.level}`}</div>
          </div>`;
        })
        .join('');
    }

    this.renderCompanionSlot(inst);
  }

  private renderCompanionSlot(inst: CharacterInstance): void {
    const el = document.getElementById('companion-slot-content');
    if (!el) return;

    if (this.pickingCompanion) {
      // Picker list
      const equippedUid = inst.companionUid;
      el.innerHTML = `
        <div style="font-size:13px;color:var(--ui-muted);margin-bottom:8px">Select a companion to equip</div>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:240px;overflow-y:auto">
          <button class="ui-btn ghost" data-equip="" type="button" style="justify-content:flex-start;padding:10px 12px;font-size:13px">
            — Unequip —
          </button>
          ${ownedCompanions
            .map((c) => {
              const cdef = getCompanionDef(c);
              if (!cdef || cdef.skill.id === 'none') return ''; // skip pure EXP fodder in equip list
              const stats = statsAtLevel(cdef, c.level);
              const freq = frequencyAtLevel(cdef, c.level);
              const bonus = [stats.atk && `ATK +${stats.atk}`, stats.def && `DEF +${stats.def}`, stats.matk && `MATK +${stats.matk}`, stats.mdef && `MDEF +${stats.mdef}`]
                .filter(Boolean)
                .join(' · ');
              const selected = c.uid === equippedUid;
              return `
              <button class="ui-btn ${selected ? '' : 'secondary'}" data-equip="${c.uid}" type="button"
                style="justify-content:flex-start;padding:10px 12px;font-size:13px;text-align:left">
                <span style="font-weight:600">${cdef.name}</span>
                <span style="color:var(--ui-muted);margin-left:6px">Lv.${c.level} · ${bonus || '—'} · ${freq.toFixed(0)}%</span>
              </button>`;
            })
            .join('')}
        </div>
        <button class="ui-btn secondary" id="btn-cancel-pick" type="button" style="margin-top:10px;width:100%;padding:8px;font-size:13px">Cancel</button>
      `;

      el.querySelectorAll('[data-equip]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const uid = (btn as HTMLElement).dataset.equip || undefined;
          equipCompanion(inst.uid, uid || undefined);
          this.pickingCompanion = false;
          this.renderCharacterDetail();
        });
      });
      document.getElementById('btn-cancel-pick')?.addEventListener('click', () => {
        this.pickingCompanion = false;
        this.renderCharacterDetail();
      });
      return;
    }

    // Equipped view
    const cInst = companionByUid(inst.companionUid);
    if (!cInst) {
      el.innerHTML = `
        <div style="color:var(--ui-muted);font-size:13px;margin-bottom:8px">No companion equipped</div>
        <button class="ui-btn secondary" id="btn-change-companion" type="button" style="width:100%;padding:8px;font-size:13px">Equip Companion</button>
      `;
    } else {
      const cdef = getCompanionDef(cInst)!;
      const stats = statsAtLevel(cdef, cInst.level);
      const freq = frequencyAtLevel(cdef, cInst.level);
      const bonus = [stats.atk && `ATK +${stats.atk}`, stats.def && `DEF +${stats.def}`, stats.matk && `MATK +${stats.matk}`, stats.mdef && `MDEF +${stats.mdef}`]
        .filter(Boolean)
        .join(' · ');
      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:48px;height:48px;border-radius:10px;background:var(--ui-panel-2);display:flex;align-items:center;justify-content:center;font-size:22px">${companionEmoji(cdef.id)}</div>
          <div style="flex:1">
            <div style="font-weight:600">${cdef.name} <span style="color:var(--ui-muted);font-weight:400">Lv.${cInst.level}/${cdef.maxLevel}</span></div>
            <div style="font-size:12px;color:var(--ui-muted);margin-top:2px">${cdef.rarity} · ${bonus || '—'} · Skill ${freq.toFixed(0)}%</div>
            <div style="font-size:12px;margin-top:4px">${cdef.skill.name}: ${cdef.skill.description}</div>
          </div>
        </div>
        <button class="ui-btn secondary" id="btn-change-companion" type="button" style="margin-top:10px;width:100%;padding:8px;font-size:13px">Change Companion</button>
      `;
    }

    document.getElementById('btn-change-companion')?.addEventListener('click', () => {
      this.pickingCompanion = true;
      this.renderCompanionSlot(inst);
    });
  }
}

function weaponEmoji(w: string): string {
  switch (w) {
    case 'Sword': return '⚔️';
    case 'Bow': return '🏹';
    case 'Spear': return '🔱';
    case 'Staff': return '🔮';
    default: return '👤';
  }
}

function companionEmoji(id: string): string {
  if (id.includes('fire')) return '🔥';
  if (id.includes('heal') || id.includes('white')) return '💚';
  if (id.includes('sword')) return '⚔️';
  if (id.includes('shield') || id.includes('combat')) return '🛡️';
  if (id.includes('punish') || id.includes('avenge')) return '⚡';
  return '📦';
}
