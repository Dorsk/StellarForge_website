import { Component, inject, signal } from '@angular/core';
import { I18n, TPipe } from '../../i18n/i18n';
import { TKey } from '../../i18n/fr';
import { GameDataService } from '../../data/game-data';

@Component({
  selector: 'sf-media',
  imports: [TPipe],
  template: `
    <header class="wrap page-head">
      <p class="eyebrow">Press kit</p>
      <h1 class="page-title">{{ 'media.title' | t }}</h1>
      <p class="lede">{{ 'media.lede' | t }}</p>
    </header>

    <div class="wrap assets">
      <figure class="asset wide">
        <img src="images/screens/flotte.jpg" width="2560" height="1440" loading="lazy" [alt]="'media.shotFleet' | t" />
        <figcaption><span>{{ 'media.shots' | t }} · {{ 'media.shotFleet' | t }} · 2560 × 1440</span>
          <a class="btn btn-ghost small" href="images/screens/flotte.png" download="stellarforge-flotte.png">{{ 'common.download' | t }}</a></figcaption>
      </figure>
      <figure class="asset">
        <img src="images/panorama.png" width="1672" height="940" loading="lazy" alt="{{ 'media.keyart' | t }}" />
        <figcaption><span>{{ 'media.keyart' | t }} · 1672 × 940 · PNG</span>
          <a class="btn btn-ghost small" href="images/panorama.png" download="stellarforge-illustration.png">{{ 'common.download' | t }}</a></figcaption>
      </figure>
      <figure class="asset">
        <div class="logo-bg"><img src="images/logo.png" width="1671" height="941" loading="lazy" alt="{{ 'media.logo' | t }}" /></div>
        <figcaption><span>{{ 'media.logo' | t }} · 1671 × 941 · PNG</span>
          <a class="btn btn-ghost small" href="images/logo.png" download="stellarforge-logo.png">{{ 'common.download' | t }}</a></figcaption>
      </figure>
    </div>

    <section class="wrap gallery-section">
      <h2 class="section-title">{{ 'media.shots' | t }}</h2>
      <p class="section-lede">{{ 'media.shotsLede' | t }}</p>
      <div class="gallery">
        @for (shot of shots; track shot.file) {
          <figure class="shot" [class.wide-shot]="shot.wide">
            <a [href]="'images/screens/' + shot.file" target="_blank" rel="noopener">
              <img [src]="'images/screens/' + shot.file" [width]="shot.w" [height]="shot.h" loading="lazy" [alt]="shot.caption | t" />
            </a>
            <figcaption><span>{{ shot.caption | t }}</span>
              <a class="btn btn-ghost small" [href]="'images/screens/' + shot.file" [download]="'stellarforge-' + shot.file">{{ 'common.download' | t }}</a></figcaption>
          </figure>
        }
      </div>
    </section>

    <div class="wrap two">
      <section>
        <h2 class="section-title">{{ 'media.facts' | t }}</h2>
        <dl class="facts">
          <div><dt>{{ 'media.fact.title' | t }}</dt><dd>StellarForge</dd></div>
          <div><dt>{{ 'media.fact.genre' | t }}</dt><dd>{{ 'media.fact.genreValue' | t }}</dd></div>
          <div><dt>{{ 'media.fact.players' | t }}</dt><dd>{{ 'media.fact.playersValue' | t }}</dd></div>
          <div><dt>{{ 'media.fact.status' | t }}</dt><dd>{{ 'media.fact.statusValue' | t: { v: data.latest()?.version ?? '…' } }}</dd></div>
          <div><dt>{{ 'media.fact.engine' | t }}</dt><dd>Godot 4.7</dd></div>
          <div><dt>{{ 'media.fact.platforms' | t }}</dt><dd>Windows, Linux</dd></div>
          <div><dt>{{ 'media.fact.language' | t }}</dt><dd>{{ 'media.fact.languageValue' | t }}</dd></div>
        </dl>
      </section>
      <section class="texts">
        @for (d of descriptions; track d.title) {
          <div class="copy-block">
            <div class="copy-head"><h2 class="label">{{ d.title | t }}</h2>
              <button type="button" class="btn btn-ghost small" (click)="copy(d.text)">{{ (copied() === d.text ? 'media.copied' : 'media.copy') | t }}</button></div>
            <p>{{ d.text | t }}</p>
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    .assets { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
    .asset { margin: 0; background: var(--hull); border: 1px solid var(--rule); display: grid; grid-template-rows: 1fr auto; min-width: 0; }
    .asset.wide { grid-row: span 2; }
    .asset img { display: block; width: 100%; height: 100%; object-fit: cover; aspect-ratio: 16 / 9; }
    .logo-bg { background: radial-gradient(circle at 50% 50%, #12305a, var(--void) 70%); display: grid; place-items: center; padding: 10px; }
    .logo-bg img { object-fit: contain; aspect-ratio: 1671 / 600; }
    figcaption { display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between; align-items: center; padding: 10px 14px; font: 400 12.5px var(--f-mono); color: var(--ink-dim); border-top: 1px solid var(--rule); }
    .small { padding: 5px 12px; font-size: 13px; }
    .gallery-section { padding-top: 48px; }
    .gallery { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    .wide-shot { grid-column: span 2; }
    .shot { margin: 0; background: var(--hull); border: 1px solid var(--rule); display: grid; grid-template-rows: auto 1fr; min-width: 0; }
    .shot img { display: block; width: 100%; height: clamp(180px, 19vw, 270px); object-fit: cover; }
    .shot figcaption { align-items: flex-start; font: 400 14px var(--f-body); color: var(--ink-dim); }
    .two { display: grid; grid-template-columns: 1fr 1.3fr; gap: 40px; padding-top: 48px; align-items: start; }
    .facts { margin: 12px 0 0; display: grid; border-top: 1px solid var(--rule); }
    .facts div { display: grid; grid-template-columns: 170px 1fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--rule); }
    .facts dt { color: var(--ink-faint); font: 600 11px/1.9 var(--f-mono); letter-spacing: .12em; text-transform: uppercase; }
    .facts dd { margin: 0; }
    .texts { display: grid; gap: 18px; }
    .copy-block { background: var(--hull); border: 1px solid var(--rule); padding: 14px 18px 18px; display: grid; gap: 10px; }
    .copy-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    .copy-block p { color: var(--ink-dim); }
    @media (max-width: 860px) {
      .assets, .two { grid-template-columns: 1fr; }
      .asset.wide { grid-row: auto; }
      .facts div { grid-template-columns: 1fr; gap: 0; }
      .gallery { grid-template-columns: 1fr; }
      .wide-shot { grid-column: auto; }
      .shot img { height: auto; aspect-ratio: 16 / 9; }
    }
  `,
})
export class MediaPage {
  protected readonly i18n = inject(I18n);
  protected readonly data = inject(GameDataService);
  protected readonly copied = signal<TKey | null>(null);
  protected readonly shots: { file: string; w: number; h: number; caption: TKey; wide?: boolean }[] = [
    { file: 'usine.jpg', w: 2560, h: 1440, caption: 'media.shot.factory', wide: true },
    { file: 'decollage.jpg', w: 2560, h: 1440, caption: 'media.shot.takeoff' },
    { file: 'sondes.jpg', w: 2560, h: 1440, caption: 'media.shot.probes' },
    { file: 'colonisation.jpg', w: 2560, h: 1440, caption: 'media.shot.colony' },
    { file: 'nuit.jpg', w: 2560, h: 1440, caption: 'media.shot.night' },
    { file: 'technologies.jpg', w: 1920, h: 1080, caption: 'media.shot.tech' },
    { file: 'carte-galaxie.jpg', w: 1920, h: 1080, caption: 'media.shot.map', wide: true },
  ];
  protected readonly descriptions: { title: TKey; text: TKey }[] = [
    { title: 'media.short', text: 'media.shortText' },
    { title: 'media.long', text: 'media.longText' },
  ];

  protected copy(key: TKey): void {
    navigator.clipboard?.writeText(this.i18n.t(key)).then(
      () => { this.copied.set(key); setTimeout(() => this.copied.set(null), 1800); },
      () => {},
    );
  }
}
