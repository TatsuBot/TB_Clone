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
import { downloadSave, promptLoadSave, loadFromLocalStorage, saveToLocalStorage } from './save';
import { isCleared, progress } from './progress';
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

    document.getElementById('btn-results-continue')?.addEventListener('click', () => this.show('map'));

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
      const result = await promptLoadSave();
      if (result.ok) {
        this.setSaveStatus('Loaded save file.');
        // refresh any open views that depend on inventory
        if (this.current === 'party' || this.current === 'character-detail' || this.current === 'pre-battle') {
          this.renderScreen(this.current);
        }
      } else {
        this.setSaveStatus(result.error);
      }
    });

    document.getElementById('btn-continue')?.addEventListener('click', () => {
      this.show('hub');
    });
  }

  private tryLoadAutosave(): void {
    const result = loadFromLocalStorage();
    const cont = document.getElementById('btn-continue');
    if (result.ok && cont) {
      cont.style.display = 'block';
    }
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

    // Show first 6 owned characters as the squad
    slots.innerHTML = ownedCharacters.slice(0, 6)
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
