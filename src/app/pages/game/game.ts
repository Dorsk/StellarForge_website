import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n, NumPipe, TPipe } from '../../i18n/i18n';
import { TKey } from '../../i18n/fr';
import { BuildingType, GameDataService } from '../../data/game-data';
import { ItemsComponent } from '../../shared/items';

interface ChainStep { building: string; color: string; output: string; rate: number; }

@Component({
  selector: 'sf-game',
  imports: [RouterLink, TPipe, NumPipe, ItemsComponent],
  templateUrl: './game.html',
  styleUrl: './game.css',
})
export class GamePage {
  protected readonly i18n = inject(I18n);
  protected readonly data = inject(GameDataService);
  protected readonly index = this.data.index;

  protected readonly families = computed(() => {
    const idx = this.index();
    if (!idx) return [];
    return idx.data.buildCategories.map(c => ({
      name: c.name,
      buildings: idx.data.buildings.filter(b => b.category === c.id).map(b => b.name),
    }));
  });

  /** Foreuse -> fonderie -> assembleur : débits réels (objets par minute, vitesse ×1). */
  protected readonly chain = computed<ChainStep[]>(() => {
    const idx = this.index();
    if (!idx) return [];
    const drill = idx.data.buildings.find(b => b.type === BuildingType.EXTRACTOR && b.extracts.includes('iron_ore'));
    const steps: ChainStep[] = [];
    if (drill) steps.push({ building: drill.name, color: drill.color, output: 'iron_ore', rate: drill.speed });
    for (const id of ['iron_ingot', 'iron_plate']) {
      const r = idx.recipeById[id];
      const b = r && idx.buildingById[r.building];
      if (!r || !b || !r.duration) continue;
      const [out, qty] = Object.entries(r.outputs)[0];
      steps.push({ building: b.name, color: b.color, output: out, rate: (qty * 60) / (r.duration / (b.speed || 1)) });
    }
    return steps;
  });

  protected readonly generators = computed(() => {
    const idx = this.index();
    if (!idx) return [];
    return idx.data.buildings.filter(b => b.type === BuildingType.GENERATOR).sort((a, b) => a.powerOutput - b.powerOutput);
  });

  protected readonly trees = computed(() => {
    const idx = this.index();
    if (!idx) return [];
    return idx.data.trees.map(t => ({ ...t, count: idx.data.techs.filter(x => x.tree === t.id).length }));
  });

  protected readonly controls: { keys: string[]; action: TKey }[] = [
    { keys: ['Z', 'Q', 'S', 'D'], action: 'game.key.move' },
    { keys: ['Espace', 'Maj'], action: 'game.key.jump' },
    { keys: ['Souris', 'Molette'], action: 'game.key.camera' },
    { keys: ['E'], action: 'game.key.use' },
    { keys: ['Tab'], action: 'game.key.inventory' },
    { keys: ['B'], action: 'game.key.build' },
    { keys: ['X'], action: 'game.key.demolish' },
    { keys: ['T'], action: 'game.key.tech' },
    { keys: ['C'], action: 'game.key.map' },
    { keys: ['G'], action: 'game.key.boots' },
    { keys: ['F5', 'F9'], action: 'game.key.save' },
  ];
  private readonly keyNames: Record<string, [string, string]> = {
    Espace: ['Espace', 'Space'], Maj: ['Maj', 'Shift'], Souris: ['Souris', 'Mouse'], Molette: ['Molette', 'Wheel'],
    Z: ['Z', 'W'], Q: ['Q', 'A'],
  };
  protected keyName(k: string): string {
    const names = this.keyNames[k];
    return names ? names[this.i18n.lang() === 'en' ? 1 : 0] : k;
  }
}
