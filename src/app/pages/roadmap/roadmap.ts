import { Component } from '@angular/core';
import { TPipe } from '../../i18n/i18n';
import { TKey } from '../../i18n/fr';

interface Column { id: string; title: TKey; items: { title: TKey; text: TKey }[]; }

// Contenu choisi à la main dans docs/Todo-list.md du jeu : à mettre à jour avec les versions.
const COLUMNS: Column[] = [
  {
    id: 'done', title: 'roadmap.done', items: [
      { title: 'roadmap.done1.title', text: 'roadmap.done1.text' },
      { title: 'roadmap.done2.title', text: 'roadmap.done2.text' },
      { title: 'roadmap.done3.title', text: 'roadmap.done3.text' },
    ],
  },
  {
    id: 'next', title: 'roadmap.next', items: [
      { title: 'roadmap.next1.title', text: 'roadmap.next1.text' },
      { title: 'roadmap.next2.title', text: 'roadmap.next2.text' },
    ],
  },
  {
    id: 'later', title: 'roadmap.later', items: [
      { title: 'roadmap.later1.title', text: 'roadmap.later1.text' },
      { title: 'roadmap.later2.title', text: 'roadmap.later2.text' },
      { title: 'roadmap.later3.title', text: 'roadmap.later3.text' },
      { title: 'roadmap.later4.title', text: 'roadmap.later4.text' },
      { title: 'roadmap.later5.title', text: 'roadmap.later5.text' },
      { title: 'roadmap.later6.title', text: 'roadmap.later6.text' },
      { title: 'roadmap.later7.title', text: 'roadmap.later7.text' },
    ],
  },
];

@Component({
  selector: 'sf-roadmap',
  imports: [TPipe],
  template: `
    <header class="wrap page-head">
      <p class="eyebrow">StellarForge</p>
      <h1 class="page-title">{{ 'roadmap.title' | t }}</h1>
      <p class="lede">{{ 'roadmap.lede' | t }}</p>
    </header>
    <div class="wrap columns">
      @for (col of columns; track col.id) {
        <section class="col" [attr.data-state]="col.id">
          <h2><span class="mark" aria-hidden="true"></span>{{ col.title | t }} <span class="n">{{ col.items.length }}</span></h2>
          <ul>
            @for (it of col.items; track it.title) {
              <li><h3>{{ it.title | t }}</h3><p>{{ it.text | t }}</p></li>
            }
          </ul>
        </section>
      }
    </div>
  `,
  styles: `
    .columns { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; align-items: start; }
    .col { --s: var(--ink-faint); border-top: 3px solid var(--s); background: var(--deep); padding: 16px 16px 18px; }
    .col[data-state='done'] { --s: var(--ok); }
    .col[data-state='next'] { --s: var(--cyan); }
    .col[data-state='later'] { --s: #9a86ff; }
    h2 { display: flex; align-items: center; gap: 10px; font: 600 15px var(--f-body); margin-bottom: 14px; }
    .mark { width: 9px; height: 9px; background: var(--s); transform: rotate(45deg); box-shadow: 0 0 8px var(--s); }
    .n { font: 400 12px var(--f-mono); color: var(--ink-faint); }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    li { background: var(--hull); border: 1px solid var(--rule); padding: 12px 14px; display: grid; gap: 4px; }
    h3 { font: 600 16px var(--f-body); }
    li p { color: var(--ink-dim); font-size: 14.5px; }
    [data-state='done'] li h3::before { content: '✓ '; color: var(--ok); }
    @media (max-width: 900px) { .columns { grid-template-columns: 1fr; } }
  `,
})
export class RoadmapPage {
  protected readonly columns = COLUMNS;
}
