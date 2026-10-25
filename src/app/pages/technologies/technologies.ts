import { Component, ElementRef, afterRenderEffect, computed, inject, input, signal, untracked, viewChild } from '@angular/core';
import { I18n, NumPipe, TPipe } from '../../i18n/i18n';
import { Building, GameDataService, GameIndex, TechTier, TechTree } from '../../data/game-data';
import { ItemsComponent } from '../../shared/items';

// Même mise en page que l'écran des technologies du jeu (ui/tech/tech_tier_graph.gd) :
// une colonne par palier, une ligne par branche ; un palier est découpé en
// sous-colonnes, une technologie se plaçant une sous-colonne à droite de ses
// prérequis du même palier. Mêmes dimensions qu'en jeu (pixels).
const LANE_WIDTH = 150;
const SUBCOLUMN_WIDTH = 216;
const HEADER_HEIGHT = 84;
const NODE_W = 160;
const NODE_H = 58;
const NODE_GAP = 16;
const CELL_PADDING = 10;
/** Place du coude vertical d'un lien, en part de l'espace entre deux cases (depuis la case d'arrivée). */
const LINK_BEND_RATIO = 0.3;
/** Lien vers un prérequis de la même sous-colonne : crochet à gauche des cases. */
const SAME_COLUMN_BEND = 12;
/** Déplacement de la souris (pixels), bouton enfoncé, au-delà duquel le clic devient un glisser. */
const DRAG_THRESHOLD = 6;

interface Box { id: string; x: number; y: number; color: string; }
interface Lane { tree: TechTree; top: number; height: number; }
interface TierColumn { tier: TechTier; left: number; width: number; cube: string; }
interface Link { from: string; to: string; d: string; endX: number; endY: number; }
interface Layout { width: number; height: number; tiers: TierColumn[]; lanes: Lane[]; boxes: Box[]; links: Link[]; }

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
  protected readonly laneWidth = LANE_WIDTH;
  protected readonly headerHeight = HEADER_HEIGHT;
  /** Clic gauche maintenu dans la fresque : point de départ, défilement de départ, et s'il est devenu un glisser. */
  private press: { x: number; y: number; left: number; top: number } | null = null;
  protected readonly dragging = signal(false);
  /** Le relâchement qui termine un glisser ne sélectionne rien. */
  private dragEnded = false;

  /** Sous-colonne de chaque technologie dans son palier (0 : aucun prérequis du palier). */
  private readonly subcolumns = computed(() => {
    const idx = this.index();
    const sub: Record<string, number> = {};
    if (!idx) return sub;
    const of = (id: string): number => {
      if (sub[id] !== undefined) return sub[id];
      let result = 0;
      for (const p of idx.techById[id].prerequisites) {
        if (idx.tier[p] === idx.tier[id]) result = Math.max(result, of(p) + 1);
      }
      return (sub[id] = result);
    };
    idx.data.techs.forEach(t => of(t.id));
    return sub;
  });

  protected readonly layout = computed<Layout | null>(() => {
    const idx = this.index();
    if (!idx) return null;
    const sub = this.subcolumns();
    const hidden = this.hiddenTrees();
    // Largeur des paliers : leur nombre de sous-colonnes.
    const counts = idx.data.tiers.map(() => 1);
    for (const t of idx.data.techs) counts[idx.tier[t.id]] = Math.max(counts[idx.tier[t.id]], sub[t.id] + 1);
    const tiers: TierColumn[] = [];
    let left = LANE_WIDTH;
    idx.data.tiers.forEach((tier, k) => {
      tiers.push({ tier, left, width: counts[k] * SUBCOLUMN_WIDTH, cube: this.cubeName(idx, k) });
      left += counts[k] * SUBCOLUMN_WIDTH;
    });
    // Chaque case (palier, branche, sous-colonne) empile ses technologies, dans l'ordre des id comme en jeu.
    const boxes: Box[] = [];
    const lanes: Lane[] = [];
    const at: Record<string, Box> = {};
    let top = HEADER_HEIGHT;
    for (const tree of idx.data.trees) {
      if (hidden.has(tree.id)) continue;
      const stacks: Record<string, number> = {};
      let most = 1;
      const techs = idx.data.techs.filter(t => t.tree === tree.id).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      for (const t of techs) {
        const k = idx.tier[t.id];
        const cell = k + ':' + sub[t.id];
        const n = stacks[cell] ?? 0;
        stacks[cell] = n + 1;
        most = Math.max(most, n + 1);
        const box: Box = {
          id: t.id, color: tree.color,
          x: tiers[k].left + sub[t.id] * SUBCOLUMN_WIDTH + (SUBCOLUMN_WIDTH - NODE_W) / 2,
          y: top + CELL_PADDING + n * (NODE_H + NODE_GAP),
        };
        boxes.push(box);
        at[t.id] = box;
      }
      const height = most * NODE_H + (most - 1) * NODE_GAP + CELL_PADDING * 2;
      lanes.push({ tree, top, height });
      top += height;
    }
    // Liens à angles droits : horizontal, vertical juste avant la case d'arrivée, horizontal.
    const links: Link[] = [];
    for (const to of boxes) {
      for (const p of idx.techById[to.id].prerequisites) {
        const from = at[p];
        if (!from) continue;
        const endX = to.x;
        const endY = to.y + NODE_H / 2;
        let startX = from.x + NODE_W;
        const startY = from.y + NODE_H / 2;
        let bend = endX - (SUBCOLUMN_WIDTH - NODE_W) * LINK_BEND_RATIO;
        if (startX > endX) {
          startX = from.x;
          bend = from.x - SAME_COLUMN_BEND;
        }
        links.push({ from: p, to: to.id, endX, endY, d: `M${startX} ${startY}H${bend}V${endY}H${endX}` });
      }
    }
    return { width: left, height: top, tiers, lanes, boxes, links };
  });

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
        || t.upgrades.some(u => hit(idx.data.upgrades[u]?.name))
        || t.bonuses.some(b => hit(idx.data.bonuses[b]))) set.add(t.id);
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
    afterRenderEffect(() => {
      const id = this.tech();
      if (id && this.index()?.techById[id]) untracked(() => this.goTo(id));
    });
  }

  /** Nom du cube propre au palier (le premier absent du palier précédent), '' s'il se paie depuis l'inventaire. */
  private cubeName(idx: GameIndex, k: number): string {
    const cubes = Object.keys(idx.data.tiers[k].cubes);
    if (!cubes.length) return '';
    const previous = idx.data.tiers[k - 1]?.cubes ?? {};
    const own = cubes.find(c => previous[c] === undefined);
    return own ? idx.itemName(own) : this.i18n.t('tech.allCubes');
  }

  /** Ligne sous le nom d'une case, comme en jeu (sans la progression du joueur). */
  protected status(idx: GameIndex, id: string): string {
    const t = idx.techById[id];
    return t.units ? this.i18n.t('tech.units', { n: t.units }) : this.i18n.t('tech.paidFromInventory');
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
    if (this.dragEnded) return;
    this.selected.set(this.selected() === id ? null : id);
  }

  // Glisser à la souris, comme en jeu : clic gauche maintenu, la fresque suit le curseur.
  protected onPointerDown(e: PointerEvent, scroller: HTMLElement): void {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    this.press = { x: e.clientX, y: e.clientY, left: scroller.scrollLeft, top: scroller.scrollTop };
    this.dragEnded = false;
  }

  protected onPointerMove(e: PointerEvent, scroller: HTMLElement): void {
    if (!this.press) return;
    const dx = e.clientX - this.press.x;
    const dy = e.clientY - this.press.y;
    if (!this.dragging()) {
      if (Math.hypot(dx, dy) <= DRAG_THRESHOLD) return;
      this.dragging.set(true);
      this.hovered.set(null);
      // La fresque continue de suivre la souris même si elle en sort.
      scroller.setPointerCapture(e.pointerId);
    }
    scroller.scrollLeft = this.press.left - dx;
    scroller.scrollTop = this.press.top - dy;
    e.preventDefault();
  }

  protected endDrag(): void {
    if (this.dragging()) {
      this.dragEnded = true;
      // Le clic suit le relâchement dans la même tâche : il est ignoré, puis tout redevient normal.
      setTimeout(() => (this.dragEnded = false));
    }
    this.press = null;
    this.dragging.set(false);
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
      el?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center', inline: 'center' });
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
