import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n, TPipe } from '../../i18n/i18n';

@Component({
  selector: 'sf-not-found',
  imports: [RouterLink, TPipe],
  template: `
    <section class="wrap page-head lost">
      <p class="eyebrow">404</p>
      <h1 class="page-title">{{ 'notFound.title' | t }}</h1>
      <p class="lede">{{ 'notFound.text' | t }}</p>
      <a class="btn btn-primary" [routerLink]="['/', i18n.lang()]">{{ 'notFound.back' | t }}</a>
    </section>
  `,
  styles: `.lost { min-height: 50vh; align-content: center; justify-items: start; }`,
})
export class NotFoundPage {
  protected readonly i18n = inject(I18n);
}
