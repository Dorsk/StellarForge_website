import { Component, ViewEncapsulation, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n, TPipe } from '../../i18n/i18n';
import { GameDataService } from '../../data/game-data';

@Component({
  selector: 'sf-journal',
  imports: [RouterLink, TPipe],
  // Le contenu vient du Markdown du jeu : ses styles ne peuvent pas être encapsulés.
  encapsulation: ViewEncapsulation.None,
  template: `
    <header class="wrap page-head">
      <p class="eyebrow">StellarForge</p>
      <h1 class="page-title">{{ 'journal.title' | t }}</h1>
      <p class="lede">{{ 'journal.lede' | t }}</p>
      @if (i18n.lang() === 'en') { <p class="note">{{ 'common.frenchOnly' | t }}</p> }
    </header>

    @if (data.journal(); as versions) {
      <div class="wrap journal">
        <nav class="journal-index" [attr.aria-label]="'journal.versions' | t">
          <p class="label">{{ 'journal.versions' | t }}</p>
          @for (v of versions; track v.version) {
            <a [routerLink]="[]" [fragment]="'v' + v.version"><span class="v">{{ v.version }}</span>{{ v.title }}</a>
          }
        </nav>
        <div class="journal-entries">
          @for (v of versions; track v.version; let first = $first) {
            <article class="journal-entry" [id]="'v' + v.version">
              <header>
                <p class="v">{{ 'common.version' | t: { v: v.version } }}@if (first) {<span class="latest">{{ 'home.latestTitle' | t }}</span>}</p>
                <h2>{{ v.title }}</h2>
                <p class="date">{{ v.date }}</p>
              </header>
              <div class="journal-body" [innerHTML]="v.html"></div>
            </article>
          }
        </div>
      </div>
    } @else {
      <p class="wrap state">{{ 'common.loading' | t }}</p>
    }
  `,
  styles: `
    .journal { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 40px; align-items: start; }
    .journal-index { position: sticky; top: 90px; display: grid; gap: 2px; max-height: calc(100vh - 110px); overflow-y: auto; }
    .journal-index .label { margin-bottom: 8px; }
    .journal-index a { display: grid; gap: 1px; padding: 8px 10px; color: var(--ink-dim); text-decoration: none; border-left: 2px solid var(--rule); font-size: 14px; }
    .journal-index a:hover { color: var(--ink); border-left-color: var(--cyan); }
    .journal-index .v { font: 600 12px var(--f-mono); color: var(--cyan); }
    .journal-entries { display: grid; gap: 28px; min-width: 0; }
    .journal-entry { background: var(--hull); border: 1px solid var(--rule); padding: 26px 30px 30px; }
    .journal-entry > header { display: grid; gap: 4px; padding-bottom: 16px; margin-bottom: 8px; border-bottom: 1px solid var(--rule); }
    .journal-entry .v { font: 600 13px var(--f-mono); color: var(--cyan); display: flex; gap: 10px; align-items: center; }
    .journal-entry .latest { font: 600 10px var(--f-mono); letter-spacing: .12em; text-transform: uppercase; color: var(--void); background: var(--cyan); padding: 2px 6px; }
    .journal-entry h2 { font: 600 clamp(22px, 2.8vw, 28px)/1.2 var(--f-display); letter-spacing: .03em; }
    .journal-entry .date { color: var(--ink-faint); font-size: 14px; }
    .journal-body { color: var(--ink-dim); max-width: 78ch; }
    .journal-body h3 { color: var(--ink); font: 600 13px var(--f-mono); letter-spacing: .14em; text-transform: uppercase; margin: 26px 0 10px; }
    .journal-body p { margin: 10px 0; }
    .journal-body ul { padding-left: 20px; margin: 8px 0; display: grid; gap: 8px; }
    .journal-body li::marker { color: var(--cyan); }
    .journal-body li ul { margin-top: 6px; gap: 4px; }
    .journal-body strong { color: var(--ink); font-weight: 600; }
    .journal-body code { font: 13px var(--f-mono); background: var(--hull-2); padding: 1px 5px; }
    .journal-body table { border-collapse: collapse; margin: 12px 0; display: block; overflow-x: auto; max-width: 100%; }
    .journal-body th, .journal-body td { border-bottom: 1px solid var(--rule); padding: 6px 14px 6px 0; text-align: left; }
    .journal-body th { font: 600 11px var(--f-mono); letter-spacing: .12em; text-transform: uppercase; color: var(--ink-faint); }
    @media (max-width: 860px) {
      .journal { grid-template-columns: 1fr; }
      .journal-index { position: static; max-height: none; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
      .journal-index .label { grid-column: 1 / -1; }
      .journal-entry { padding: 20px 18px 22px; }
    }
  `,
})
export class JournalPage {
  protected readonly i18n = inject(I18n);
  protected readonly data = inject(GameDataService);
}
