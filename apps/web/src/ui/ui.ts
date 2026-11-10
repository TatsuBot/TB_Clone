/**
 * UI shell: navigation, tavern, party, pre-battle party select, companion equip.
 */
import { type ScreenId, SCREENS, CHAPTERS, stagesForChapter } from './screens';
import {
  charStatsAtLevel,
  CHARACTERS,
  stagesForChapter as coreStageRefs,
} from '@game/core';
import {
  ownedCompanions,
  ownedCharacters,
  equipCompanion,
  companionByUid,
  equippedBy,
  companionStock,
  getCompanionDef,
  getCharacterDef,
  characterIcon,
  companionIcon,
  battlePartyUids,
  setBattleParty,
  getBattleParty,
} from './inventory';
import { downloadSave, promptLoadSave, loadFromLocalStorage, saveToLocalStorage } from './save';
import { isCleared, progress } from './progress';
import { rollPact, addEnergy, type PactId } from './tavern';
import {
  unlockNextJob,
  setActiveJob,
  tryRecode,
  buyShopItem,
  seedJobMaterials,
  jobUnlockCost,
  type ShopItemId,
} from './tavernJobs';

const APP_VERSION = '1.2';

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
    this.bindShop();
    this.bindGlobal();
    this.tryLoadAutosave();
    this.refreshStatusBar();
    this.stampVersion();
    this.show('title');
  }

  setBattleCallback(fn: () => void): void {
    this.onEnterBattle = fn;
  }

  getSelectedStage(): { chapter: number; stage: number } {
    return { chapter: this.selectedChapter, stage: this.selectedStage };
  }

  show(id: ScreenId): void {
    this.current = id;
    const conf = SCREENS[id];
    this.statusEl.style.display = conf?.showStatusBar ? '' : 'none';
    this.navEl.style.display = conf?.showBottomNav ? '' : 'none';
    this.screensEl.querySelectorAll('.ui-screen').forEach((el) => {
      (el as HTMLElement).style.display = el.id === `screen-${id}` ? '' : 'none';
    });
    this.renderScreen(id);
    this.refreshStatusBar();
  }

  private stampVersion(): void {
    document.querySelectorAll('.version').forEach((el) => {
      el.textContent = `v${APP_VERSION}`;
    });
    let badge = document.getElementById('app-version-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'app-version-badge';
      badge.style.cssText =
        'position:fixed;bottom:4px;right:8px;font-size:11px;opacity:0.55;pointer-events:none;z-index:99';
      document.body.appendChild(badge);
    }
    badge.textContent = `v${APP_VERSION}`;
  }

  private refreshStatusBar(): void {
    const e = document.getElementById('stat-energy-val');
    const c = document.getElementById('stat-coins-val');
    const s = document.getElementById('stat-stamina-val');
    if (e) e.textContent = String(progress.energy);
    if (c) c.textContent = progress.coins.toLocaleString();
    if (s) s.textContent = String(progress.stamina);
  }

  private bindNav(): void {
    document.querySelectorAll('[data-screen]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.screen as ScreenId;
        if (id) this.show(id);
      });
    });
    document.querySelectorAll('[data-back]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.back as ScreenId;
        if (id) this.show(id);
      });
    });
    document.getElementById('btn-start')?.addEventListener('click', () => this.show('hub'));
    document.querySelectorAll('.tavern-tabs button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = (btn as HTMLElement).dataset.tavern as string;
        document.querySelectorAll('.tavern-tabs button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tavern-pane').forEach((p) => {
          const pane = p as HTMLElement;
          pane.style.display = pane.dataset.pane === target ? '' : 'none';
        });
        if (target === 'jobs') this.renderJobUnlockList();
        if (target === 'recode') this.renderRecodeList();
      });
    });
  }

  private bindGlobal(): void {
    document.getElementById('btn-enter-battle')?.addEventListener('click', () => {
      this.onEnterBattle?.();
      // Hide meta UI — battle canvas lives outside
      this.root.style.display = 'none';
    });
    document.getElementById('btn-save')?.addEventListener('click', () => {
      downloadSave();
      this.setSaveStatus('Save downloaded');
    });
    document.getElementById('btn-load')?.addEventListener('click', () => {
      promptLoadSave(() => {
        this.setSaveStatus('Save loaded');
        this.refreshStatusBar();
        this.show(this.current);
      });
    });
  }

  private setSaveStatus(msg: string): void {
    const el = document.getElementById('save-status');
    if (el) el.textContent = msg;
  }

  private tryLoadAutosave(): void {
    const r = loadFromLocalStorage();
    if (r.ok) {
      const cont = document.getElementById('btn-continue');
      if (cont) {
        cont.style.display = '';
        cont.onclick = () => this.show('hub');
      }
    }
  }

  private bindTavern(): void {
    document.querySelectorAll('[data-pact]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pactId = (btn as HTMLElement).dataset.pact as PactId;
        const result = rollPact(pactId);
        const box = document.getElementById('pact-result');
        if (box) {
          box.style.display = 'block';
          box.innerHTML = result.ok
            ? `<p><strong>${result.message}</strong></p>`
            : `<p style="color:#f87171">${result.error}</p>`;
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

  private bindShop(): void {
    document.querySelectorAll('.shop-buy').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.shop as ShopItemId;
        const r = buyShopItem(id);
        const box = document.getElementById('shop-status');
        if (box) {
          box.style.display = 'block';
          box.innerHTML = `<p style="color:${r.ok ? '#86efac' : '#f87171'}">${r.ok ? r.message : r.error}</p>`;
        }
        this.refreshStatusBar();
      });
    });
    document.getElementById('btn-seed-mats')?.addEventListener('click', () => {
      seedJobMaterials();
      const box = document.getElementById('job-unlock-status');
      if (box) {
        box.style.display = 'block';
        box.innerHTML = '<p style="color:#86efac">Granted job materials</p>';
      }
    });
  }

  private renderScreen(id: ScreenId): void {
    if (id === 'map') this.renderMap();
    if (id === 'stage-select') this.renderStageSelect();
    if (id === 'pre-battle') this.renderPreBattle();
    if (id === 'party') this.renderParty();
    if (id === 'character-detail') this.renderCharacterDetail();
    if (id === 'tavern') {
      this.renderJobUnlockList();
      this.renderRecodeList();
    }
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
        <div class="chapter-card ${ch.unlocked ? '' : 'locked'}" data-chapter="${ch.id}">
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
            cleared: isCleared(s.id),
          }))
        : stagesForChapter(this.selectedChapter);
    list.innerHTML = stages
      .map(
        (s) => `
      <div class="stage-row ${s.cleared ? 'cleared' : ''}" data-stage="${s.id}">
        <div class="stage-id">${this.selectedChapter}-${s.id}</div>
        <div class="stage-body">
          <div class="name">${s.name}</div>
          <div class="meta">⚡ ${s.stamina} · ${'★'.repeat(s.difficulty)}${s.cleared ? ' · Cleared' : ''}</div>
        </div>
      </div>`
      )
      .join('');
    list.querySelectorAll('.stage-row').forEach((row) => {
      row.addEventListener('click', () => {
        this.selectedStage = Number((row as HTMLElement).dataset.stage);
        this.show('pre-battle');
      });
    });
  }

  /** Pre-battle: pick up to 6 party members, then start. */
  private renderPreBattle(): void {
    const info = document.getElementById('prebattle-stage-info');
    const slots = document.getElementById('party-slots');
    if (!info || !slots) return;

    const core = coreStageRefs(this.selectedChapter);
    const stage =
      core.find((s) => s.stage === this.selectedStage) ??
      stagesForChapter(this.selectedChapter).find((s) => s.id === this.selectedStage);

    info.innerHTML = `
      <h3>${stage && 'name' in stage ? stage.name : 'Stage'}</h3>
      <div class="cost">
        <span>⚡ Stamina ${stage && 'stamina' in stage ? stage.stamina : 5}</span>
        <span class="stage-stars">${'★'.repeat(stage && 'difficulty' in stage ? stage.difficulty : 1)}</span>
      </div>
      <p style="font-size:12px;color:var(--ui-muted);margin-top:8px">Tap roster below to fill 6 slots. Tap a slot to remove.</p>`;

    const party = getBattleParty();
    const slotHtml = [0, 1, 2, 3, 4, 5]
      .map((i) => {
        const ch = party[i];
        if (!ch) {
          return `<div class="party-slot empty" data-slot="${i}"><div class="portrait">+</div><div>Empty</div></div>`;
        }
        const def = getCharacterDef(ch);
        return `<div class="party-slot filled" data-slot="${i}" data-uid="${ch.uid}">
          <div class="portrait">${characterIcon(ch.defId)}</div>
          <div>${def?.name ?? ch.defId}</div>
          <div class="lvl">J${ch.activeJob} Lv.${ch.jobLevels[ch.activeJob - 1]}</div>
        </div>`;
      })
      .join('');

    const rosterHtml = ownedCharacters
      .map((ch) => {
        const def = getCharacterDef(ch);
        const inParty = battlePartyUids.includes(ch.uid);
        return `<button type="button" class="roster-pick ${inParty ? 'in-party' : ''}" data-uid="${ch.uid}" ${
          inParty || battlePartyUids.length >= 6 ? (inParty ? '' : 'disabled') : ''
        }>
          <span class="portrait">${characterIcon(ch.defId)}</span>
          <span>${def?.name ?? ch.defId}</span>
        </button>`;
      })
      .join('');

    slots.innerHTML = `
      <div class="party-slots-row">${slotHtml}</div>
      <h4 style="margin:12px 0 6px;font-size:13px;color:var(--ui-muted)">Roster</h4>
      <div class="roster-picks">${rosterHtml}</div>`;

    slots.querySelectorAll('.party-slot.filled').forEach((el) => {
      el.addEventListener('click', () => {
        const uid = (el as HTMLElement).dataset.uid!;
        setBattleParty(battlePartyUids.filter((u) => u !== uid));
        this.renderPreBattle();
      });
    });
    slots.querySelectorAll('.roster-pick:not([disabled])').forEach((el) => {
      el.addEventListener('click', () => {
        const uid = (el as HTMLElement).dataset.uid!;
        if (battlePartyUids.includes(uid)) return;
        if (battlePartyUids.length >= 6) return;
        setBattleParty([...battlePartyUids, uid]);
        this.renderPreBattle();
      });
    });
  }

  private renderParty(): void {
    const grid = document.getElementById('char-grid');
    if (!grid) return;
    grid.innerHTML = ownedCharacters
      .map((ch) => {
        const def = getCharacterDef(ch);
        const r = def?.rarity ?? 'B';
        const job = def?.jobs.find((j) => j.jobIndex === ch.activeJob) ?? def?.jobs[0];
        const lv = ch.jobLevels[(ch.activeJob - 1) as 0 | 1 | 2];
        const comp = companionByUid(ch.companionUid);
        const compDef = comp ? getCompanionDef(comp) : null;
        return `
        <div class="char-card rarity-${r.toLowerCase()}" data-uid="${ch.uid}">
          <div class="portrait">${characterIcon(ch.defId)}</div>
          <div class="cname">${def?.name ?? ch.defId}</div>
          <div class="cmeta">${r} · J${ch.activeJob} Lv.${lv}</div>
          <div class="cmeta">${compDef ? companionIcon(comp.defId) + ' ' + compDef.name : 'No companion'}</div>
        </div>`;
      })
      .join('');
    grid.querySelectorAll('.char-card').forEach((card) => {
      card.addEventListener('click', () => {
        this.selectedCharUid = (card as HTMLElement).dataset.uid ?? null;
        this.pickingCompanion = false;
        this.show('character-detail');
      });
    });
  }

  private renderCharacterDetail(): void {
    const ch =
      ownedCharacters.find((c) => c.uid === this.selectedCharUid) ?? ownedCharacters[0];
    if (!ch) return;
    this.selectedCharUid = ch.uid;
    const def = getCharacterDef(ch);
    const job = def?.jobs.find((j) => j.jobIndex === ch.activeJob) ?? def?.jobs[0];
    const lv = ch.jobLevels[(ch.activeJob - 1) as 0 | 1 | 2];
    const stats = job ? charStatsAtLevel(job, lv) : null;

    const nameEl = document.querySelector('#screen-character-detail .detail-name');
    const rareEl = document.querySelector('#screen-character-detail .detail-rarity');
    const port = document.querySelector('#screen-character-detail .detail-portrait');
    if (nameEl) nameEl.textContent = def?.name ?? ch.defId;
    if (rareEl) rareEl.textContent = `${def?.rarity ?? '?'} · ${job?.title ?? ''} · Lv.${lv}`;
    if (port) port.textContent = characterIcon(ch.defId);

    const boxes = document.querySelectorAll('#screen-character-detail .stat-box .value');
    if (stats && boxes.length >= 4) {
      boxes[0].textContent = String(stats.hp);
      boxes[1].textContent = String(stats.atk);
      boxes[2].textContent = String(stats.def);
      boxes[3].textContent = String(stats.matk);
    }

    const eq = document.getElementById('equipped-companion');
    const comp = companionByUid(ch.companionUid);
    const compDef = comp ? getCompanionDef(comp) : null;
    if (eq) {
      eq.innerHTML = `
        <h3 style="margin:0 0 8px;font-size:14px;color:var(--ui-muted)">Equipped Companion</h3>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <div class="portrait" style="font-size:28px">${compDef ? companionIcon(comp!.defId) : '—'}</div>
          <div>
            <div><strong>${compDef?.name ?? 'None'}</strong></div>
            <div class="meta" style="font-size:12px;color:var(--ui-muted)">${
              comp ? `Lv.${comp.level} · ${compDef?.rarity}` : 'Empty slot'
            }</div>
          </div>
        </div>
        <button type="button" class="ui-btn secondary" id="btn-pick-companion">${
          this.pickingCompanion ? 'Close picker' : 'Equip companion'
        }</button>
        ${comp ? `<button type="button" class="ui-btn secondary" id="btn-unequip-companion" style="margin-left:8px">Unequip</button>` : ''}
        <div id="companion-picker" style="margin-top:12px;${this.pickingCompanion ? '' : 'display:none'}"></div>`;

      document.getElementById('btn-pick-companion')?.addEventListener('click', () => {
        this.pickingCompanion = !this.pickingCompanion;
        this.renderCharacterDetail();
      });
      document.getElementById('btn-unequip-companion')?.addEventListener('click', () => {
        equipCompanion(ch.uid, undefined);
        this.pickingCompanion = false;
        this.renderCharacterDetail();
      });

      if (this.pickingCompanion) {
        const picker = document.getElementById('companion-picker');
        if (picker) {
          const stock = companionStock();
          picker.innerHTML = stock
            .map((row) => {
              const freeInst = row.instances.find((i) => !equippedBy(i.uid));
              const disabled = !freeInst;
              const holder = row.instances
                .map((i) => {
                  const who = equippedBy(i.uid);
                  return who ? getCharacterDef(who)?.name ?? '?' : 'free';
                })
                .join(', ');
              return `<div class="ui-card" style="margin-bottom:8px;opacity:${disabled ? 0.5 : 1}">
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-size:22px">${companionIcon(row.defId)}</span>
                  <div style="flex:1">
                    <strong>${row.name}</strong> · ${row.rarity}
                    <div class="meta" style="font-size:11px;color:var(--ui-muted)">Owned ${row.total} · Free ${row.free} · ${holder}</div>
                  </div>
                  <button type="button" class="ui-btn secondary pick-comp" data-cuid="${freeInst?.uid ?? ''}" ${
                    disabled ? 'disabled' : ''
                  }>Equip</button>
                </div>
              </div>`;
            })
            .join('');
          picker.querySelectorAll('.pick-comp').forEach((btn) => {
            btn.addEventListener('click', () => {
              const cuid = (btn as HTMLElement).dataset.cuid;
              if (!cuid) return;
              const r = equipCompanion(ch.uid, cuid);
              if (!r.ok) alert(r.error);
              this.pickingCompanion = false;
              this.renderCharacterDetail();
            });
          });
        }
      }
    }
  }

  private showTavernStatus(id: string, msg: string, ok: boolean): void {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'block';
    el.innerHTML = `<p style="color:${ok ? '#86efac' : '#f87171'}">${msg}</p>`;
  }

  private renderJobUnlockList(): void {
    const list = document.getElementById('job-unlock-list');
    if (!list) return;
    list.innerHTML = ownedCharacters
      .map((ch) => {
        const def = CHARACTERS[ch.defId];
        if (!def) return '';
        const unlocked = ch.jobsUnlocked ?? 1;
        const next =
          unlocked < 3 && def.jobs.some((j) => j.jobIndex === unlocked + 1) ? unlocked + 1 : null;
        let costLine = next
          ? (() => {
              const c = jobUnlockCost(def.rarity, next as 2 | 3);
              return `Job ${next}: ${c.coins}¢ + ${c.items.map((i) => `${i.itemId}×${i.qty}`).join(', ')}`;
            })()
          : 'Max jobs unlocked / no further jobs in data';
        const jobBtns = def.jobs
          .map((j) => {
            const open = j.jobIndex <= unlocked;
            const active = ch.activeJob === j.jobIndex;
            return `<button type="button" class="ui-btn secondary job-set" data-uid="${ch.uid}" data-job="${j.jobIndex}" ${
              open ? '' : 'disabled'
            } style="${active ? 'outline:2px solid var(--ui-accent)' : ''}">${characterIcon(ch.defId)} J${j.jobIndex}</button>`;
          })
          .join(' ');
        return `<div class="ui-card" style="margin-bottom:10px">
          <div><span style="font-size:20px">${characterIcon(ch.defId)}</span> <strong>${def.name}</strong> · Job ${unlocked}</div>
          <div class="meta" style="font-size:12px;color:var(--ui-muted);margin:6px 0">${costLine}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">${jobBtns}</div>
          ${next ? `<button type="button" class="ui-btn job-unlock" data-uid="${ch.uid}">Unlock Job ${next}</button>` : ''}
        </div>`;
      })
      .join('');
    list.querySelectorAll('.job-unlock').forEach((btn) => {
      btn.addEventListener('click', () => {
        const r = unlockNextJob((btn as HTMLElement).dataset.uid!);
        this.showTavernStatus('job-unlock-status', r.ok ? r.message : r.error, r.ok);
        this.refreshStatusBar();
        this.renderJobUnlockList();
      });
    });
    list.querySelectorAll('.job-set').forEach((btn) => {
      btn.addEventListener('click', () => {
        const r = setActiveJob(
          (btn as HTMLElement).dataset.uid!,
          Number((btn as HTMLElement).dataset.job) as 1 | 2 | 3
        );
        this.showTavernStatus('job-unlock-status', r.ok ? r.message : r.error, r.ok);
        this.renderJobUnlockList();
      });
    });
  }

  private renderRecodeList(): void {
    const list = document.getElementById('recode-list');
    if (!list) return;
    list.innerHTML = ownedCharacters
      .map((ch) => {
        const def = CHARACTERS[ch.defId];
        if (!def) return '';
        const ready = (ch.jobsUnlocked ?? 1) >= 3 && ch.jobLevels.every((lv) => lv >= 50);
        return `<div class="ui-card" style="margin-bottom:10px">
          <div>${characterIcon(ch.defId)} <strong>${def.name}</strong> · ${ch.jobLevels.join('/')} · SB ${ch.skillBoost ?? 0}%</div>
          <button type="button" class="ui-btn recode-btn" data-uid="${ch.uid}" ${ready ? '' : 'disabled'}>Recode DNA</button>
        </div>`;
      })
      .join('');
    list.querySelectorAll('.recode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const r = tryRecode((btn as HTMLElement).dataset.uid!);
        this.showTavernStatus('recode-status', r.ok ? r.message : r.error, r.ok);
        this.refreshStatusBar();
        this.renderRecodeList();
      });
    });
  }
}
