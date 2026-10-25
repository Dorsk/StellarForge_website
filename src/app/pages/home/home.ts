import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n, TPipe } from '../../i18n/i18n';
import { TKey } from '../../i18n/fr';
import { GameDataService } from '../../data/game-data';
import { LazyVideo } from '../../shared/lazy-video';

@Component({
  selector: 'sf-home',
  imports: [RouterLink, TPipe, LazyVideo],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomePage {
  protected readonly i18n = inject(I18n);
  protected readonly data = inject(GameDataService);

  protected readonly stats = computed(() => {
    const d = this.data.index()?.data;
    if (!d) return [];
    const s: { n: number | string; key: TKey; symbol?: boolean }[] = [
      { n: d.techs.length, key: 'home.stat.techs' },
      { n: d.recipes.length, key: 'home.stat.recipes' },
      { n: d.buildings.length, key: 'home.stat.buildings' },
      // La galaxie est générée sans fin : pas de nombre de planètes.
      { n: '∞', key: 'home.stat.planets', symbol: true },
      { n: 50, key: 'home.stat.players' },
    ];
    return s;
  });

  protected readonly steps: { title: TKey; text: TKey }[] = [
    { title: 'home.step1.title', text: 'home.step1.text' },
    { title: 'home.step2.title', text: 'home.step2.text' },
    { title: 'home.step3.title', text: 'home.step3.text' },
    { title: 'home.step4.title', text: 'home.step4.text' },
  ];
  protected readonly calm: TKey[] = ['home.calm1', 'home.calm2', 'home.calm3', 'home.calm4'];
}
