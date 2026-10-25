import { AfterViewInit, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

/** Vidéo muette en boucle : chargée à l'approche de l'écran, en pause hors écran ;
 *  si le visiteur réduit les animations, seule l'affiche est montrée. */
@Directive({ selector: 'video[sfLazyVideo]' })
export class LazyVideo implements AfterViewInit {
  readonly sfLazyVideo = input.required<string>();
  readonly poster = input.required<string>();
  private readonly el = inject<ElementRef<HTMLVideoElement>>(ElementRef).nativeElement;
  private readonly destroy = inject(DestroyRef);

  ngAfterViewInit(): void {
    const v = this.el;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.poster = this.poster();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!v.src) v.src = this.sfLazyVideo();
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    }, { rootMargin: '300px 0px' });
    io.observe(v);
    this.destroy.onDestroy(() => io.disconnect());
  }
}
