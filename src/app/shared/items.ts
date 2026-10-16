import { Component, computed, input, output } from '@angular/core';
import { GameIndex, Qty } from '../data/game-data';

/** Liste de matières (pastilles), avec quantités ou non ; cliquables si `clickable`. */
@Component({
  selector: 'sf-items',
  template: `
    <div class="chips">
      @for (e of entries(); track e.id) {
        @if (clickable()) {
          <button type="button" class="chip" [class.on]="e.id === active()" [style.--c]="e.color"
                  [attr.aria-pressed]="e.id === active()" (click)="pick.emit(e.id)">
            <i></i>{{ e.name }}@if (e.qty !== null) {<b>×{{ e.qty }}</b>}
          </button>
        } @else {
          <span class="chip" [style.--c]="e.color"><i></i>{{ e.name }}@if (e.qty !== null) {<b>×{{ e.qty }}</b>}</span>
        }
      }
    </div>
  `,
})
export class ItemsComponent {
  readonly index = input.required<GameIndex>();
  readonly qty = input<Qty | null>(null);
  readonly ids = input<string[] | null>(null);
  readonly clickable = input(false);
  readonly active = input<string | null>(null);
  readonly pick = output<string>();

  protected readonly entries = computed(() => {
    const items = this.index().data.items;
    const q = this.qty();
    const list: [string, number | null][] = q ? Object.entries(q) : (this.ids() ?? []).map(id => [id, null]);
    return list.map(([id, qty]) => ({ id, qty, name: items[id]?.name ?? id, color: items[id]?.color ?? '#888' }));
  });
}
