import {
  Component, DestroyRef, ElementRef, afterRenderEffect, computed, inject, input, signal, untracked, viewChild,
} from '@angular/core';
import { I18n, NumPipe, TPipe } from '../../i18n/i18n';
import { Building, GameDataService, GameIndex, Tech, TechTree } from '../../data/game-data';
import { ItemsComponent } from '../../shared/items';

interface Lane { tree: TechTree; row: number; cells: { tier: number; techs: Tech[] }[]; }
interface Link { from: string; to: string; d: string; color: string; }

@Component({
  selector: 'sf-technologies',
  imports: [TPipe, NumPipe, ItemsComponent],
  templateUrl: './technologies.html',
  styleUrl: './technologies.css',
})
export class TechnologiesPage {
  protected readonly i18n = inject(I18n);
  protected readonly index = inject(GameDataService).index;
  private readonly mural = viewChild<ElementRef<HTMLElement>>('mural');
  /** Paramètre d'URL ?tech=<id> : technologie à ouvrir à l'arrivée. */
  readonly tech = input<string>();

  protected readonly hiddenTrees = signal<ReadonlySet<string>>(new Set());
  protected readonly query = signal('');
  protected readonly selected = signal<string | null>(null);
  protected readonly hovered = signal<string | null>(null);
  protected readonly links = signal<Link[]>([]);
  protected readonly size = signal({ w: 0, h: 0 });

  /** Ordre vertical dans chaque case : barycentre des prérequis (moins de croisements). */
  private readonly order = computed(() => {
    const idx = this.index();
    const order: Record<string, number> = {};
    const cells: Record<string, Tech[]> = {};
    if (!idx) return { order, cells };
    for (let k = 0; k < idx.tiers; k++) {
      idx.data.trees.forEach((tree, li) => {
        const list = idx.data.techs.filter(t => idx.tier[t.id] === k && t.tree === tree.id);
        const key = (t: Tech) => t.prerequisites.length ? t.prerequisites.reduce((s, p) => s + order[p], 0) / t.prerequisites.length : 0;
        list.sort((a, b) => key(a) - key(b) || a.name.localeCompare(b.name, 'fr'));
        list.forEach((t, i) => (order[t.id] = li * 100 + i));
        cells[tree.id + ':' + k] = list;
      });
    }
    return { order, cells };
  });

  protected readonly lanes = computed<Lane[]>(() => {
    const idx = this.index();
    if (!idx) return [];
    const hidden = this.hiddenTrees();
    const { cells } = this.order();
    return idx.data.trees
      .filter(t => !hidden.has(t.id))
      .map((tree, i) => ({
        tree, row: i + 2,
        cells: Array.from({ length: idx.tiers }, (_, k) => ({ tier: k, techs: cells[tree.id + ':' + k] ?? [] })),
      }));
  });

  protected readonly tiers = computed(() => Array.from({ length: this.index()?.tiers ?? 0 }, (_, k) => k));

  /** Technologies dont le nom, le coût ou ce qu'elles débloquent correspond à la recherche. */
  protected readonly matches = computed<Set<string> | null>(() => {
    const idx = this.index();
    const q = normalize(this.query().trim());
    if (!idx || q.length < 2) return null;
    const hit = (s: string | undefined) => !!s && normalize(s).includes(q);
    const set = new Set<string>();
    for (const t of idx.data.techs) {
      if (this.hiddenTrees().has(t.tree)) continue;
      if (hit(t.name) || hit(t.description)
        || Object.keys(t.cost).some(i => hit(idx.itemName(i)))
        || t.buildings.some(b => hit(idx.buildingById[b]?.name))
        || t.recipes.some(r => hit(idx.recipeById[r]?.name))
        || t.ships.some(s => hit(idx.shipById[s]?.name))
        || t.upgrades.some(u => hit(idx.data.upgrades[u]?.name))) set.add(t.id);
    }
    return set;
  });

  /** Lignée affichée : survol en priorité, sinon sélection. */
  protected readonly lit = computed<Set<string> | null>(() => {
    const idx = this.index();
    const id = this.hovered() ?? this.selected();
    return idx && id ? idx.lineage(id) : null;
  });

  protected readonly detail = computed(() => {
    const idx = this.index();
    const id = this.selected();
    return idx && id ? idx.techById[id] : null;
  });

  constructor() {
    afterRenderEffect({
      read: () => {
        this.lanes();
        untracked(() => this.measure());
      },
    });
    const ro = new ResizeObserver(() => this.measure());
    afterRenderEffect(() => {
      const el = this.mural()?.nativeElement;
      if (el) { ro.disconnect(); ro.observe(el); }
    });
    inject(DestroyRef).onDestroy(() => ro.disconnect());
    afterRenderEffect(() => {
      const id = this.tech();
      if (id && this.index()?.techById[id]) untracked(() => this.goTo(id));
    });
    document.fonts?.ready.then(() => this.measure());
  }

  /** Recalcule les liaisons prérequis -> technologie à partir des positions réelles des cartes. */
  private measure(): void {
    const idx = this.index();
    const mural = this.mural()?.nativeElement;
    if (!idx || !mural) return;
    const m = mural.getBoundingClientRect();
    const rect = (id: string) => mural.querySelector<HTMLElement>('#t-' + id)?.getBoundingClientRect();
    const links: Link[] = [];
    for (const t of idx.data.techs) {
      const c = rect(t.id);
      if (!c) continue;
      for (const p of t.prerequisites) {
        const a = rect(p);
        if (!a) continue;
        const x1 = a.right - m.left, y1 = a.top + a.height / 2 - m.top;
        const x2 = c.left - m.left, y2 = c.top + c.height / 2 - m.top;
        const dx = Math.max(16, Math.min(90, (x2 - x1) / 2));
        links.push({
          from: p, to: t.id, color: idx.treeById[idx.techById[p].tree]?.color ?? '#888',
          d: `M${x1} ${y1} C${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
        });
      }
    }
    this.size.set({ w: mural.scrollWidth, h: mural.scrollHeight });
    this.links.set(links);
  }

  protected toggleTree(id: string): void {
    const next = new Set(this.hiddenTrees());
    if (next.has(id)) next.delete(id);
    else if (next.size < (this.index()?.data.trees.length ?? 0) - 1) next.add(id);
    this.hiddenTrees.set(next);
    const sel = this.selected();
    if (sel && next.has(this.index()!.techById[sel].tree)) this.selected.set(null);
  }

  protected select(id: string | null): void {
    this.selected.set(this.selected() === id ? null : id);
  }

  /** Sélectionne une technologie et l'amène à l'écran. */
  protected goTo(id: string): void {
    const idx = this.index();
    if (!idx) return;
    const tree = idx.techById[id].tree;
    if (this.hiddenTrees().has(tree)) {
      const next = new Set(this.hiddenTrees());
      next.delete(tree);
      this.hiddenTrees.set(next);
    }
    this.selected.set(id);
    requestAnimationFrame(() => {
      const el = this.mural()?.nativeElement.querySelector<HTMLElement>('#t-' + id);
      el?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
      el?.focus({ preventScroll: true });
    });
  }

  protected onSearchEnter(): void {
    const first = this.matches()?.values().next().value;
    if (first) this.goTo(first);
  }

  protected buildingInfo(b: Building | undefined): string {
    if (!b) return '';
    const idx = this.index()!;
    const n = (v: number) => this.i18n.num(v);
    const parts: string[] = [];
    if (b.extracts.length) parts.push(`${this.i18n.t('codex.extracts')} ${b.extracts.map(i => idx.itemName(i)).join(', ')} · ${n(b.speed)}${this.i18n.t('common.perMin')}`);
    if (b.powerOutput) parts.push(`${this.i18n.t('codex.stat.produces')} ${n(b.powerOutput)} kW`);
    if (b.powerUse) parts.push(`${this.i18n.t('codex.stat.uses')} ${n(b.powerUse)} kW`);
    if (b.fuels.length) parts.push(`${this.i18n.t('codex.burns')} ${b.fuels.map(i => idx.itemName(i)).join(', ')}`);
    if (b.oxygenRadius) parts.push(`${this.i18n.t('codex.stat.oxygen')} ${n(b.oxygenRadius)} m`);
    return parts.join(' · ');
  }

  protected hasKeys(o: object): boolean {
    return Object.keys(o).length > 0;
  }

  protected treeOf(idx: GameIndex, id: string): TechTree | undefined {
    return idx.treeById[idx.techById[id]?.tree];
  }
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
