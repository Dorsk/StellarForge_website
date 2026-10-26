import { Injectable, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, of, shareReplay, switchMap } from 'rxjs';
import { I18n, Lang } from '../i18n/i18n';

// Données générées par scripts/generate-data.mjs à partir des .tres du jeu.

export type Qty = Record<string, number>;

export interface Item { name: string; category: number; color: string; handHarvestable: boolean; }
export interface TechTree { id: string; name: string; color: string; milestone: boolean; }
/** Palier (colonne de l'arbre) : cubes d'une unité de recherche au labo (vide : payé depuis l'inventaire). */
export interface TechTier {
  id: string; name: string; shortName: string; biome: string; color: string; cubes: Qty; unitDuration: number;
}
export interface Tech {
  id: string; name: string; description: string; tree: string; tier: string; prerequisites: string[]; cost: Qty;
  /** Unités de recherche au labo (0 : payée avec `cost`). */
  units: number; repeatable: boolean; unitsPerLevel: number;
  buildings: string[]; recipes: string[]; ships: string[]; upgrades: string[]; bonuses: string[];
}
export interface BuildCategory { id: string; name: string; }
export interface Building {
  id: string; name: string; description: string; type: number; category: string; cost: Qty;
  speed: number; powerUse: number; powerOutput: number; powerRadius: number; oxygenRadius: number;
  slots: number; extracts: string[]; fuels: string[]; maxLength: number; probeCapacity: number; color: string;
}
export interface Recipe { id: string; name: string; building: string; inputs: Qty; outputs: Qty; duration: number; }
export interface Ship {
  id: string; name: string; description: string; shipyard: string; cost: Qty;
  buildTime: number; cargoSlots: number; fuelPerTrip: number; reachable: number; color: string;
}
export interface Probe { id: string; name: string; cargoSlots: number; stackLimit: number; fuelPerTrip: number; reachable: number; }
export interface Upgrade { name: string; description: string; }
export interface PlanetType { id: string; name: string; visual: string; }
export interface Planet {
  id: string; name: string; type: string; radius: number; gravity: number; breathable: boolean;
  color: string; deposits: Record<string, string>; starting: boolean;
}
export interface GameData {
  items: Record<string, Item>; trees: TechTree[]; tiers: TechTier[]; bonuses: Record<string, string>;
  techs: Tech[]; buildCategories: BuildCategory[];
  buildings: Building[]; recipes: Recipe[]; ships: Ship[]; probes: Probe[]; upgrades: Record<string, Upgrade>;
  planetTypes: PlanetType[]; abundance: Record<string, string>; planets: Planet[];
}
export interface JournalEntry { version: string; title: string; date: string; html: string; }

/** BuildingData.Type du jeu. */
export const BuildingType = {
  EXTRACTOR: 0, CRAFTER: 1, STORAGE: 2, TANK: 3, SHIPYARD: 4, CONVEYOR: 5, PIPE: 6,
  SPLITTER: 7, MERGER: 8, HABITAT: 9, GENERATOR: 10, POWER_POLE: 11, PROBE_PORT: 12, RESEARCH_LAB: 13,
} as const;

/** Index de recherche construits une fois les données chargées. */
export class GameIndex {
  readonly techById: Record<string, Tech>;
  readonly treeById: Record<string, TechTree>;
  readonly buildingById: Record<string, Building>;
  readonly recipeById: Record<string, Recipe>;
  readonly shipById: Record<string, Ship>;
  readonly unlockedBy: Record<string, Tech> = {};
  readonly children: Record<string, string[]> = {};
  readonly tier: Record<string, number> = {};
  readonly tiers: number;
  readonly recipesByBuilding: Record<string, Recipe[]> = {};

  constructor(readonly data: GameData) {
    const by = <T extends { id: string }>(list: T[]) => Object.fromEntries(list.map(x => [x.id, x]));
    this.techById = by(data.techs);
    this.treeById = by(data.trees);
    this.buildingById = by(data.buildings);
    this.recipeById = by(data.recipes);
    this.shipById = by(data.ships);
    for (const t of data.techs) {
      for (const id of t.buildings) this.unlockedBy['b:' + id] = t;
      for (const id of t.recipes) this.unlockedBy['r:' + id] = t;
      for (const id of t.ships) this.unlockedBy['s:' + id] = t;
      for (const id of t.upgrades) this.unlockedBy['u:' + id] = t;
      for (const p of t.prerequisites) (this.children[p] ||= []).push(t.id);
    }
    // Palier = colonne donnée par le jeu (TechTierData), dans l'ordre des paliers.
    const column = Object.fromEntries(data.tiers.map((t, i) => [t.id, i]));
    for (const t of data.techs) this.tier[t.id] = column[t.tier] ?? 0;
    this.tiers = data.tiers.length;
    for (const r of data.recipes) (this.recipesByBuilding[r.building] ||= []).push(r);
  }

  itemName(id: string): string {
    return this.data.items[id]?.name ?? id;
  }

  /** Prérequis et dépendants (récursivement) d'une technologie, elle comprise. */
  lineage(id: string): Set<string> {
    const set = new Set([id]);
    const up = (x: string) => this.techById[x].prerequisites.forEach(p => { if (!set.has(p)) { set.add(p); up(p); } });
    const down = (x: string) => (this.children[x] || []).forEach(c => { if (!set.has(c)) { set.add(c); down(c); } });
    up(id);
    down(id);
    return set;
  }
}

@Injectable({ providedIn: 'root' })
export class GameDataService {
  private readonly http = inject(HttpClient);
  private readonly files: Partial<Record<Lang, Observable<GameData | null>>> = {};
  /** Textes du jeu dans la langue du site (game-data.en.json : traduction de locale/en.po). */
  private readonly raw = toSignal(toObservable(inject(I18n).lang).pipe(switchMap(lang => this.files[lang] ??=
    this.http.get<GameData>(lang === 'en' ? 'data/game-data.en.json' : 'data/game-data.json')
      .pipe(catchError(() => of(null)), shareReplay(1)))));
  private readonly journalRaw = toSignal(
    this.http.get<{ versions: JournalEntry[] }>('data/journal.json').pipe(catchError(() => of({ versions: [] }))),
  );

  /** undefined : en chargement ; null : échec. */
  readonly index = computed(() => {
    const d = this.raw();
    return d ? new GameIndex(d) : d;
  });
  readonly journal = computed(() => this.journalRaw()?.versions);
  readonly latest = computed(() => this.journal()?.[0]);
}
