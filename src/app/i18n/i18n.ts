import { Injectable, Pipe, PipeTransform, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FR, TKey } from './fr';
import { EN } from './en';

export type Lang = 'fr' | 'en';
export const LANGS: readonly Lang[] = ['fr', 'en'];
const STORAGE_KEY = 'sf-lang';

export function isLang(value: unknown): value is Lang {
  return value === 'fr' || value === 'en';
}

/** Langue courante (portée par le préfixe d'URL /fr ou /en) et textes de l'interface. */
@Injectable({ providedIn: 'root' })
export class I18n {
  private readonly document = inject(DOCUMENT);
  readonly lang = signal<Lang>('fr');
  private readonly dict = computed<Record<TKey, string>>(() => (this.lang() === 'en' ? EN : FR));
  readonly locale = computed(() => (this.lang() === 'en' ? 'en-GB' : 'fr-FR'));

  set(lang: Lang): void {
    this.lang.set(lang);
    this.document.documentElement.lang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* stockage indisponible */ }
  }

  /** Langue enregistrée, sinon celle du navigateur (français par défaut). */
  preferred(): Lang {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isLang(saved)) return saved;
    } catch { /* stockage indisponible */ }
    const nav = this.document.defaultView?.navigator.language ?? 'fr';
    return nav.toLowerCase().startsWith('fr') ? 'fr' : 'en';
  }

  t(key: TKey, params?: Record<string, string | number>): string {
    let text = this.dict()[key] ?? key;
    if (params) for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, String(v));
    return text;
  }

  num(value: number, digits = 2): string {
    return value.toLocaleString(this.locale(), { maximumFractionDigits: digits });
  }
}

@Pipe({ name: 't', pure: false })
export class TPipe implements PipeTransform {
  private readonly i18n = inject(I18n);
  transform(key: TKey, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}

@Pipe({ name: 'num', pure: false })
export class NumPipe implements PipeTransform {
  private readonly i18n = inject(I18n);
  transform(value: number, digits = 2): string {
    return this.i18n.num(value, digits);
  }
}
