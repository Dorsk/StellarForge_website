import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { CanActivateFn, Router, RouterStateSnapshot, Routes, TitleStrategy } from '@angular/router';
import { I18n, isLang } from './i18n/i18n';
import { TKey } from './i18n/fr';

/** Le premier segment d'URL fixe la langue ; une langue inconnue renvoie vers la langue préférée. */
const langGuard: CanActivateFn = route => {
  const i18n = inject(I18n);
  const lang = route.paramMap.get('lang');
  if (isLang(lang)) {
    i18n.set(lang);
    return true;
  }
  return inject(Router).createUrlTree(['/', i18n.preferred()]);
};

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: () => inject(I18n).preferred() },
  {
    path: ':lang',
    canActivate: [langGuard],
    children: [
      { path: '', title: 'title.home', loadComponent: () => import('./pages/home/home').then(m => m.HomePage) },
      { path: 'game', title: 'nav.game', loadComponent: () => import('./pages/game/game').then(m => m.GamePage) },
      { path: 'atlas', title: 'nav.atlas', loadComponent: () => import('./pages/atlas/atlas').then(m => m.AtlasPage) },
      { path: 'technologies', title: 'nav.technologies', loadComponent: () => import('./pages/technologies/technologies').then(m => m.TechnologiesPage) },
      { path: 'codex', title: 'nav.codex', loadComponent: () => import('./pages/codex/codex').then(m => m.CodexPage) },
      { path: 'journal', title: 'nav.journal', loadComponent: () => import('./pages/journal/journal').then(m => m.JournalPage) },
      { path: 'roadmap', title: 'nav.roadmap', loadComponent: () => import('./pages/roadmap/roadmap').then(m => m.RoadmapPage) },
      { path: 'media', title: 'nav.media', loadComponent: () => import('./pages/media/media').then(m => m.MediaPage) },
      { path: 'credits', title: 'nav.credits', loadComponent: () => import('./pages/credits/credits').then(m => m.CreditsPage) },
      { path: '**', title: 'title.notFound', loadComponent: () => import('./pages/not-found/not-found').then(m => m.NotFoundPage) },
    ],
  },
];

/** Le `title` des routes est une clé de traduction. */
@Injectable({ providedIn: 'root' })
export class I18nTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly i18n = inject(I18n);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const key = this.buildTitle(snapshot) as TKey | undefined;
    if (key === 'title.home') this.title.setTitle(this.i18n.t(key));
    else this.title.setTitle(key ? `${this.i18n.t(key)} · StellarForge` : 'StellarForge');
  }
}
