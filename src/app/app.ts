import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { I18n, TPipe } from './i18n/i18n';
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

  /** Même page dans l'autre langue. */
  protected readonly otherLangUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.swapLang(this.router.url)),
    ),
    { initialValue: '/en' },
  );

  constructor() {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.menuOpen.set(false));
  }

  private swapLang(url: string): string {
    const other = this.i18n.lang() === 'fr' ? 'en' : 'fr';
    return /^\/(fr|en)(?=[/?#]|$)/.test(url) ? url.replace(/^\/(fr|en)/, '/' + other) : '/' + other;
  }

  protected switchLang(event: Event): void {
    event.preventDefault();
    this.router.navigateByUrl(this.swapLang(this.router.url));
  }
}
