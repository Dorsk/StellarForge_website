import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { I18n, isLang } from './i18n/i18n';

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
      { path: '', loadComponent: () => import('./pages/home/home').then(m => m.HomePage) },
      { path: 'game', loadComponent: () => import('./pages/game/game').then(m => m.GamePage) },
      { path: 'atlas', loadComponent: () => import('./pages/atlas/atlas').then(m => m.AtlasPage) },
      { path: 'technologies', loadComponent: () => import('./pages/technologies/technologies').then(m => m.TechnologiesPage) },
      { path: 'codex', loadComponent: () => import('./pages/codex/codex').then(m => m.CodexPage) },
      { path: 'journal', loadComponent: () => import('./pages/journal/journal').then(m => m.JournalPage) },
      { path: 'roadmap', loadComponent: () => import('./pages/roadmap/roadmap').then(m => m.RoadmapPage) },
      { path: 'media', loadComponent: () => import('./pages/media/media').then(m => m.MediaPage) },
      { path: 'credits', loadComponent: () => import('./pages/credits/credits').then(m => m.CreditsPage) },
      { path: '**', loadComponent: () => import('./pages/not-found/not-found').then(m => m.NotFoundPage) },
    ],
  },
];
