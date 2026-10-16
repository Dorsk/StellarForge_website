import { Component } from '@angular/core';
import { TPipe } from '../../i18n/i18n';
import { TKey } from '../../i18n/fr';

interface Credit { what: TKey | string; author: string; source: string; url: string; license: string; }

// Repris de CREDITS.md du jeu.
const GROUPS: { title: TKey; items: Credit[] }[] = [
  {
    title: 'credits.engine', items: [
      { what: 'Godot Engine 4.7', author: 'Godot Engine contributors', source: 'godotengine.org', url: 'https://godotengine.org', license: 'MIT' },
    ],
  },
  {
    title: 'credits.models', items: [
      { what: 'credits.robot', author: 'Quaternius', source: 'Animated Robot Pack', url: 'https://quaternius.com', license: 'CC0 1.0' },
      { what: 'credits.nature', author: 'Quaternius', source: 'Ultimate Stylized Nature Pack', url: 'https://quaternius.com', license: 'CC0 1.0' },
      { what: 'credits.ships', author: 'Quaternius', source: 'Ultimate Spaceships Pack', url: 'https://quaternius.com', license: 'CC0 1.0' },
    ],
  },
  {
    title: 'credits.sky', items: [
      { what: 'credits.night', author: 'Poly Haven', source: 'Qwantani Night (Pure Sky)', url: 'https://polyhaven.com/a/qwantani_night_puresky', license: 'CC0 1.0' },
      { what: 'credits.stars', author: 'NASA/Goddard Space Flight Center Scientific Visualization Studio; Gaia DR2: ESA/Gaia/DPAC', source: 'Deep Star Maps 2020', url: 'https://svs.gsfc.nasa.gov/4851', license: 'NASA / ESA' },
    ],
  },
  {
    title: 'credits.fonts', items: [
      { what: 'Orbitron', author: 'Matt McInerney', source: 'Google Fonts', url: 'https://fonts.google.com/specimen/Orbitron', license: 'SIL OFL 1.1' },
      { what: 'Chakra Petch', author: 'Cadson Demak', source: 'Google Fonts', url: 'https://fonts.google.com/specimen/Chakra+Petch', license: 'SIL OFL 1.1' },
      { what: 'JetBrains Mono', author: 'JetBrains', source: 'Google Fonts', url: 'https://fonts.google.com/specimen/JetBrains+Mono', license: 'SIL OFL 1.1' },
    ],
  },
];

@Component({
  selector: 'sf-credits',
  imports: [TPipe],
  template: `
    <header class="wrap page-head">
      <p class="eyebrow">StellarForge</p>
      <h1 class="page-title">{{ 'credits.title' | t }}</h1>
      <p class="lede">{{ 'credits.lede' | t }}</p>
    </header>
    <div class="wrap groups">
      @for (g of groups; track g.title) {
        <section>
          <h2 class="section-title">{{ g.title | t }}</h2>
          <ul>
            @for (c of g.items; track c.source + c.what) {
              <li>
                <strong>{{ isKey(c.what) ? ($any(c.what) | t) : c.what }}</strong>
                <span class="by">{{ c.author }} · <a [href]="c.url" target="_blank" rel="noopener">{{ c.source }}</a></span>
                <span class="lic">{{ c.license }}</span>
              </li>
            }
          </ul>
        </section>
      }
      <section>
        <h2 class="section-title">{{ 'credits.site' | t }}</h2>
        <p class="site">{{ 'credits.siteText' | t }}</p>
      </section>
    </div>
  `,
  styles: `
    .groups { display: grid; gap: 36px; }
    ul { list-style: none; margin: 12px 0 0; padding: 0; border-top: 1px solid var(--rule); }
    li { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr) 120px; gap: 6px 20px; padding: 12px 0; border-bottom: 1px solid var(--rule); align-items: baseline; }
    .by { color: var(--ink-dim); }
    .lic { font: 400 12.5px var(--f-mono); color: var(--ok); text-align: right; }
    .site { color: var(--ink-dim); margin-top: 8px; }
    @media (max-width: 760px) {
      li { grid-template-columns: 1fr; }
      .lic { text-align: left; }
    }
  `,
})
export class CreditsPage {
  protected readonly groups = GROUPS;
  protected isKey(s: string): boolean {
    return s.startsWith('credits.');
  }
}
