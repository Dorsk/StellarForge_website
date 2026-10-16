import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { I18n, NumPipe, TPipe } from '../../i18n/i18n';
import { TKey } from '../../i18n/fr';
import { Building, BuildingType, GameDataService, GameIndex, Recipe } from '../../data/game-data';
import { ItemsComponent } from '../../shared/items';

type Tab = 'buildings' | 'recipes' | 'ships' | 'items';
const TABS: { id: Tab; key: TKey }[] = [
  { id: 'buildings', key: 'codex.tab.buildings' },
  { id: 'recipes', key: 'codex.tab.recipes' },
  { id: 'ships', key: 'codex.tab.ships' },
  { id: 'items', key: 'codex.tab.items' },
];

@Component({
  selector: 'sf-codex',
  imports: [RouterLink, TPipe, NumPipe, ItemsComponent],
  templateUrl: './codex.html',
  styleUrl: './codex.css',
})
export class CodexPage {
  protected readonly i18n = inject(I18n);
  protected readonly index = inject(GameDataService).index;
  private readonly router = inject(Router);

  /** Paramètres d'URL : ?tab=recipes&item=steel */
  readonly tab = input<string>();
  readonly item = input<string>();

  protected readonly tabs = TABS;
  protected readonly query = signal('');
  protected readonly activeTab = computed<Tab>(() => (TABS.some(t => t.id === this.tab()) ? this.tab() as Tab : 'buildings'));
  protected readonly focus = computed(() => {
    const id = this.item();
    return id && this.index()?.data.items[id] ? id : null;
  });

  private readonly q = computed(() => normalize(this.query().trim()));
  private matchName(name: string): boolean {
    const q = this.q();
    return !q || normalize(name).includes(q);
  }

  protected readonly buildingGroups = computed(() => {
    const idx = this.index();
    if (!idx) return [];
    const f = this.focus();
    return idx.data.buildCategories
      .map(c => ({
        name: c.name,
        buildings: idx.data.buildings.filter(b => b.category === c.id && this.matchName(b.name)
          && (!f || b.cost[f] !== undefined || b.fuels.includes(f) || b.extracts.includes(f))),
      }))
      .filter(g => g.buildings.length);
  });

  protected readonly recipeGroups = computed(() => {
    const idx = this.index();
    if (!idx) return [];
    const f = this.focus();
    return idx.data.buildings
      .filter(b => idx.recipesByBuilding[b.id])
      .map(b => ({
        building: b,
        recipes: idx.recipesByBuilding[b.id].filter(r => this.matchName(r.name)
          && (!f || r.inputs[f] !== undefined || r.outputs[f] !== undefined)),
      }))
      .filter(g => g.recipes.length);
  });

  protected readonly ships = computed(() => {
    const idx = this.index();
    if (!idx) return [];
    const f = this.focus();
    return idx.data.ships.filter(s => this.matchName(s.name) && (!f || s.cost[f] !== undefined));
  });

  protected readonly probes = computed(() => {
    const idx = this.index();
    if (!idx) return [];
    const f = this.focus();
    return idx.data.probes
      .map(p => ({ probe: p, recipe: idx.data.recipes.find(r => r.outputs[p.id] !== undefined) }))
      .filter(({ probe, recipe }) => this.matchName(probe.name)
        && (!f || f === probe.id || (recipe && recipe.inputs[f] !== undefined)));
  });

  protected readonly itemGroups = computed(() => {
    const idx = this.index();
    if (!idx) return [];
    const groups: { cat: number; ids: string[] }[] = [];
    for (const [id, it] of Object.entries(idx.data.items)) {
      if (!this.matchName(it.name)) continue;
      let g = groups.find(x => x.cat === it.category);
      if (!g) groups.push((g = { cat: it.category, ids: [] }));
      g.ids.push(id);
    }
    for (const g of groups) g.ids.sort((a, b) => idx.itemName(a).localeCompare(idx.itemName(b), 'fr'));
    return groups.sort((a, b) => a.cat - b.cat);
  });

  protected readonly counts = computed<Record<Tab, number>>(() => ({
    buildings: this.buildingGroups().reduce((n, g) => n + g.buildings.length, 0),
    recipes: this.recipeGroups().reduce((n, g) => n + g.recipes.length, 0),
    ships: this.ships().length + this.probes().length,
    items: this.itemGroups().reduce((n, g) => n + g.ids.length, 0),
  }));

  /** Résumé de la matière suivie : d'où elle vient, où elle sert. */
  protected readonly focusInfo = computed(() => {
    const idx = this.index();
    const f = this.focus();
    if (!idx || !f) return null;
    const it = idx.data.items[f];
    const sources = [
      ...idx.data.buildings.filter(b => b.extracts.includes(f)).map(b => b.name),
      ...idx.data.recipes.filter(r => r.outputs[f] !== undefined).map(r => idx.buildingById[r.building]?.name ?? r.building),
    ];
    if (it.handHarvestable) sources.push(this.i18n.t('codex.handHarvest'));
    const uses: string[] = [];
    const add = (n: number, key: TKey) => { if (n) uses.push(this.i18n.t(key, { n })); };
    add(idx.data.recipes.filter(r => r.inputs[f] !== undefined).length, 'codex.uses.recipes');
    add(idx.data.buildings.filter(b => b.cost[f] !== undefined || b.fuels.includes(f)).length, 'codex.uses.buildings');
    add(idx.data.techs.filter(t => t.cost[f] !== undefined).length, 'codex.uses.techs');
    add(idx.data.ships.filter(s => s.cost[f] !== undefined).length, 'codex.uses.ships');
    return {
      id: f, name: it.name, color: it.color, category: ('codex.cat.' + it.category) as TKey,
      sources: [...new Set(sources)].join(', '), uses: uses.join(', ') || this.i18n.t('codex.uses.none'),
    };
  });

  protected setTab(tab: Tab): void {
    this.router.navigate([], { queryParams: { tab }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected follow(id: string | null): void {
    const item = id && id !== this.focus() ? id : null;
    const tab = item && this.activeTab() === 'items' ? 'recipes' : this.activeTab();
    this.router.navigate([], { queryParams: { item, tab }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected catKey(category: number): TKey {
    return ('codex.cat.' + category) as TKey;
  }

  protected buildingStats(b: Building): { key: TKey; value: string; cls?: string }[] {
    const n = (v: number) => this.i18n.num(v);
    const perMin = this.i18n.t('common.perMin');
    const s: { key: TKey; value: string; cls?: string }[] = [];
    if (b.type === BuildingType.EXTRACTOR) s.push({ key: 'codex.stat.extract', value: n(b.speed) + perMin });
    if (b.type === BuildingType.CRAFTER || b.type === BuildingType.SHIPYARD) s.push({ key: 'codex.stat.speed', value: '×' + n(b.speed) });
    if ((b.type === BuildingType.CONVEYOR || b.type === BuildingType.PIPE) && b.speed) s.push({ key: 'codex.stat.flow', value: n(b.speed) + perMin });
    if (b.maxLength) s.push({ key: 'codex.stat.range', value: n(b.maxLength) + ' m' });
    if (b.powerUse) s.push({ key: 'codex.stat.uses', value: n(b.powerUse) + ' kW', cls: 'pw-in' });
    if (b.powerOutput) s.push({ key: 'codex.stat.produces', value: n(b.powerOutput) + ' kW', cls: 'pw-out' });
    if (b.powerRadius) s.push({ key: 'codex.stat.grid', value: n(b.powerRadius) + ' m' });
    if (b.oxygenRadius) s.push({ key: 'codex.stat.oxygen', value: n(b.oxygenRadius) + ' m' });
    if ((b.type === BuildingType.STORAGE || b.type === BuildingType.TANK) && b.slots) s.push({ key: 'codex.stat.slots', value: String(b.slots) });
    if (b.probeCapacity) s.push({ key: 'codex.stat.probes', value: String(b.probeCapacity) });
    return s;
  }

  protected isGenerator(b: Building): boolean {
    return b.type === BuildingType.GENERATOR;
  }

  protected shipsOf(idx: GameIndex, buildingId: string): string {
    return idx.data.ships.filter(s => s.shipyard === buildingId).map(s => s.name).join(', ');
  }

  protected rate(r: Recipe): string {
    return Object.values(r.outputs).map(q => this.i18n.num((q * 60) / (r.duration || 1), 1) + this.i18n.t('common.perMin')).join(' · ');
  }

  protected hasKeys(o: object): boolean {
    return Object.keys(o).length > 0;
  }
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
