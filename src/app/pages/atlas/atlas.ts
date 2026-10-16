import { Component, computed, inject } from '@angular/core';
import { I18n, NumPipe, TPipe } from '../../i18n/i18n';
import { GameDataService, Planet } from '../../data/game-data';

interface PlanetGroup { id: string; name: string; visual: string; planets: Planet[]; }

@Component({
  selector: 'sf-atlas',
  imports: [TPipe, NumPipe],
  templateUrl: './atlas.html',
  styleUrl: './atlas.css',
})
export class AtlasPage {
  protected readonly i18n = inject(I18n);
  protected readonly index = inject(GameDataService).index;

  protected readonly groups = computed<PlanetGroup[]>(() => {
    const idx = this.index();
    if (!idx) return [];
    const d = idx.data;
    const groups: PlanetGroup[] = [];
    const starting = d.planets.filter(p => p.starting);
    if (starting.length) groups.push({ id: 'start', name: this.i18n.t('atlas.starting'), visual: '', planets: starting });
    for (const t of d.planetTypes) {
      const planets = d.planets.filter(p => !p.starting && p.type === t.id);
      if (planets.length) groups.push({ id: t.id, name: t.name, visual: t.visual, planets });
    }
    return groups;
  });

  protected deposits(p: Planet) {
    const idx = this.index()!;
    const rank: Record<string, number> = { abundant: 0, low: 1, rare: 2 };
    return Object.entries(p.deposits)
      .sort((a, b) => (rank[a[1]] ?? 3) - (rank[b[1]] ?? 3))
      .map(([item, level]) => ({
        item, level,
        name: idx.itemName(item),
        color: idx.data.items[item]?.color ?? '#888',
        levelName: idx.data.abundance[level] ?? level,
      }));
  }
}
