import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { I18n, Lang, TPipe } from './i18n/i18n';
import { TKey } from './i18n/fr';
import { GameDataService } from './data/game-data';

interface NavLink { path: string; key: TKey; }

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TPipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly i18n = inject(I18n);
  protected readonly data = inject(GameDataService);
  private readonly router = inject(Router);
  protected readonly menuOpen = signal(false);
  protected readonly year = new Date().getFullYear();

  protected readonly links: NavLink[] = [
    { path: 'game', key: 'nav.game' },
    { path: 'atlas', key: 'nav.atlas' },
    { path: 'technologies', key: 'nav.technologies' },
    { path: 'codex', key: 'nav.codex' },
    { path: 'journal', key: 'nav.journal' },
    { path: 'roadmap', key: 'nav.roadmap' },
    { path: 'media', key: 'nav.media' },
  ];

  private readonly url = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: '/' },
  );

  constructor() {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.menuOpen.set(false));
  }

  /** Même page dans la langue demandée. */
  protected langUrl(lang: Lang): string {
    const url = this.url();
    return /^\/(fr|en)(?=[/?#]|$)/.test(url) ? url.replace(/^\/(fr|en)/, '/' + lang) : '/' + lang;
  }

  protected switchLang(event: Event, lang: Lang): void {
    event.preventDefault();
    if (lang !== this.i18n.lang()) this.router.navigateByUrl(this.langUrl(lang));
  }
}
