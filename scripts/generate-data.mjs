// Régénère les données du site à partir du projet du jeu.
//
//   npm run data                         (jeu dans ../StellarForge)
//   npm run data -- C:/chemin/StellarForge
//
// Produit :
//   public/data/game-data.json   technologies, bâtiments, recettes, matières, vaisseaux, planètes
//   public/data/journal.json     notes de mise à jour (docs/patch-notes.md)
//   public/images/*.png          logo et panorama du menu
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gameRoot = path.resolve(process.argv[2] || process.env.STELLARFORGE_PATH || path.join(siteRoot, '..', 'StellarForge'));
const dataDir = path.join(gameRoot, 'data');
if (!fs.existsSync(path.join(gameRoot, 'project.godot'))) {
  console.error(`Projet du jeu introuvable : ${gameRoot}\nPassez son chemin en argument : npm run data -- <chemin>`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Lecture des .tres (section [resource] uniquement)

function parseValue(src, pos) {
  const ws = () => { while (pos.i < src.length && /\s/.test(src[pos.i])) pos.i++; };
  ws();
  const c = src[pos.i];
  if (c === '&' || c === '"') {
    if (c === '&') pos.i++;
    pos.i++;
    let s = '';
    while (pos.i < src.length && src[pos.i] !== '"') {
      if (src[pos.i] === '\\') {
        const n = src[pos.i + 1];
        s += n === 'n' ? '\n' : n === 't' ? '\t' : n;
        pos.i += 2;
      } else s += src[pos.i++];
    }
    pos.i++;
    return s;
  }
  if (c === '[') return parseList(src, pos, '[', ']');
  if (c === '{') {
    pos.i++;
    const obj = {};
    for (;;) {
      ws();
      if (src[pos.i] === '}') { pos.i++; return obj; }
      const key = parseValue(src, pos);
      ws();
      pos.i++; // ':'
      obj[key] = parseValue(src, pos);
      ws();
      if (src[pos.i] === ',') pos.i++;
    }
  }
  const num = /^-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/i.exec(src.slice(pos.i, pos.i + 40));
  if (num) { pos.i += num[0].length; return Number(num[0]); }
  const id = /^[A-Za-z_]\w*/.exec(src.slice(pos.i, pos.i + 60));
  if (!id) throw new Error(`Valeur illisible près de « ${src.slice(pos.i, pos.i + 30)} »`);
  pos.i += id[0].length;
  const name = id[0];
  if (name === 'true' || name === 'false') return name === 'true';
  if (name === 'null') return null;
  if (src[pos.i] === '[') skipBalanced(src, pos, '[', ']'); // paramètres de type : Array[StringName]
  if (src[pos.i] !== '(') return name;
  const args = parseList(src, pos, '(', ')');
  if (/^(Array|Dictionary|Packed\w+Array)$/.test(name)) return args.length === 1 ? args[0] : args;
  if (/^(ExtResource|SubResource)$/.test(name)) return { ref: args[0] };
  return args; // Color, Vector2, Vector3...
}
function parseList(src, pos, open, close) {
  pos.i++;
  const list = [];
  for (;;) {
    while (/\s/.test(src[pos.i])) pos.i++;
    if (src[pos.i] === close) { pos.i++; return list; }
    list.push(parseValue(src, pos));
    while (/\s/.test(src[pos.i])) pos.i++;
    if (src[pos.i] === ',') pos.i++;
  }
}
function skipBalanced(src, pos, open, close) {
  let depth = 0;
  do {
    if (src[pos.i] === open) depth++;
    else if (src[pos.i] === close) depth--;
    pos.i++;
  } while (depth > 0 && pos.i < src.length);
}
function readTres(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const cls = /script_class="(\w+)"/.exec(text)?.[1];
  const start = text.indexOf('\n[resource]');
  if (!cls || start < 0) return null;
  const body = text.slice(start + 11);
  const obj = { _class: cls };
  const re = /^(\w+) = /gm;
  const keys = [];
  let m;
  while ((m = re.exec(body))) keys.push({ key: m[1], at: m.index + m[0].length });
  for (let k = 0; k < keys.length; k++) {
    const pos = { i: keys[k].at };
    try { obj[keys[k].key] = parseValue(body, pos); }
    catch (e) { throw new Error(`${path.relative(gameRoot, file)} : ${keys[k].key} : ${e.message}`); }
  }
  return obj;
}
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : e.name.endsWith('.tres') ? [p] : [];
  });
}

const all = {};
for (const file of walk(dataDir)) {
  const res = readTres(file);
  if (res) (all[res._class] ||= []).push(res);
}
const list = cls => all[cls] || [];
const bySort = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.id).localeCompare(String(b.id));
// Agrandissement des planètes des nouvelles parties (GameConfig.planet_size_scale).
const planetScale = list('GameConfig')[0]?.planet_size_scale || 1;
// Planète de départ des parties (GameConfig.starting_planet_id).
const startingPlanet = list('GameConfig')[0]?.starting_planet_id || '';
const hex = c => Array.isArray(c)
  ? '#' + c.slice(0, 3).map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('')
  : '#888888';

// ---------------------------------------------------------------------------
// game-data.json

const gameData = {
  items: Object.fromEntries(list('ItemData').sort(bySort).map(i => [i.id, {
    name: i.display_name, category: i.category ?? 2, color: hex(i.color), handHarvestable: !!i.hand_harvestable,
  }])),
  trees: list('TechTreeData').sort(bySort).map(t => ({ id: t.id, name: t.display_name, color: hex(t.color), milestone: t.milestone !== false })),
  // Paliers (colonnes de l'arbre, D-224) : cubes consommés par une unité de recherche.
  tiers: list('TechTierData').sort(bySort).map(t => ({
    id: t.id, name: t.display_name, shortName: t.short_name || '', biome: t.biome || '', color: hex(t.color),
    cubes: t.unit_cubes || {}, unitDuration: t.unit_duration || 0,
  })),
  bonuses: Object.fromEntries(list('TechBonusData').map(b => [b.id, b.display_name])),
  techs: list('TechNodeData').sort(bySort).map(t => ({
    id: t.id, name: t.display_name, description: t.description || '', tree: t.tree_id, tier: t.tier_id || '',
    prerequisites: t.prerequisites || [], cost: t.cost || {}, units: t.research_units || 0,
    repeatable: !!t.repeatable, unitsPerLevel: t.units_per_level || 0,
    buildings: t.unlock_buildings || [], recipes: t.unlock_recipes || [], ships: t.unlock_ships || [], upgrades: t.unlock_upgrades || [],
    bonuses: t.unlock_bonuses || [],
  })),
  buildCategories: list('BuildCategoryData').sort(bySort).map(c => ({ id: c.id, name: c.display_name })),
  buildings: list('BuildingData').sort(bySort).map(b => ({
    id: b.id, name: b.display_name, description: b.description || '', type: b.type ?? 2, category: b.category,
    cost: b.build_cost || {}, speed: b.speed || 0, powerUse: b.power_use || 0, powerOutput: b.power_output || 0,
    powerRadius: b.power_radius || 0, oxygenRadius: b.oxygen_radius || 0, slots: b.inventory_slots || 0,
    extracts: b.extractable_items || [], fuels: b.fuel_items || [], maxLength: b.max_length || 0,
    probeCapacity: b.probe_capacity || 0, color: hex(b.color),
  })),
  recipes: list('RecipeData').sort(bySort).map(r => ({
    id: r.id, name: r.display_name, building: r.building_id, inputs: r.inputs || {}, outputs: r.outputs || {}, duration: r.duration || 0,
  })),
  ships: list('ShipData').sort(bySort).map(s => ({
    id: s.id, name: s.display_name, description: s.description || '', shipyard: s.shipyard_id, cost: s.cost || {},
    buildTime: s.build_time || 0, cargoSlots: s.cargo_slots || 0, fuelPerTrip: s.fuel_per_trip || 0,
    reachable: (s.reachable_planets || []).filter(id => !String(id).endsWith('_v2')).length, color: hex(s.color),
  })),
  probes: list('ProbeData').sort(bySort).map(p => ({
    id: p.id, name: p.display_name, cargoSlots: p.cargo_slots || 0, stackLimit: p.cargo_stack_limit || 0,
    fuelPerTrip: p.fuel_per_trip || 0, reachable: (p.reachable_planets || []).filter(id => !String(id).endsWith('_v2')).length,
  })),
  upgrades: Object.fromEntries(list('PlayerUpgradeData').map(u => [u.id, { name: u.display_name, description: u.description || '' }])),
  planetTypes: list('PlanetTypeData').sort(bySort).map(t => ({ id: t.id, name: t.display_name, visual: t.visual || '' })),
  abundance: Object.fromEntries(list('AbundanceData').map(a => [a.id, a.display_name])),
  // Les copies _v2 sont des planètes de travail (D-204) : pas sur le site.
  // Sans gisements propres, une planète prend ceux de son type (comme DataRegistry dans le jeu).
  planets: list('PlanetData').filter(p => !String(p.id).endsWith('_v2')).sort(bySort).map(p => ({
    id: p.id, name: p.display_name, type: p.planet_type || '', radius: (p.radius || 0) * planetScale, gravity: p.gravity || 0,
    breathable: !!p.breathable, color: hex(p.surface_color),
    deposits: Object.keys(p.deposits || {}).length ? p.deposits : (list('PlanetTypeData').find(t => t.id === p.planet_type)?.deposits || {}),
    starting: p.id === startingPlanet,
  })),
};

// ---------------------------------------------------------------------------
// journal.json : une entrée par « ## Version x.y.z — Titre »

const notes = fs.readFileSync(path.join(gameRoot, 'docs', 'patch-notes.md'), 'utf8').replace(/\r\n/g, '\n');
const versions = [];
for (const chunk of notes.split(/\n(?=## )/)) {
  const head = /^## Version\s+(\S+)\s+[—-]\s+(.+)$/m.exec(chunk);
  if (!head) continue;
  let body = chunk.slice(chunk.indexOf('\n', head.index) + 1);
  const date = /^\s*\*([^*\n]+)\*\s*$/m.exec(body);
  if (date && body.slice(0, date.index).trim() === '') body = body.slice(date.index + date[0].length);
  // Les notes n'ont pas de HTML : « <pseudo> » est du texte, pas une balise.
  body = body.replace(/\n-{3,}\s*$/, '').trim().replace(/</g, '&lt;');
  versions.push({ version: head[1], title: head[2].trim(), date: date ? date[1].trim() : '', html: marked.parse(body) });
}

// ---------------------------------------------------------------------------
// Écriture

const out = path.join(siteRoot, 'public', 'data');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'game-data.json'), JSON.stringify(gameData));
fs.writeFileSync(path.join(out, 'journal.json'), JSON.stringify({ versions }));

const img = path.join(siteRoot, 'public', 'images');
fs.mkdirSync(img, { recursive: true });
fs.copyFileSync(path.join(gameRoot, 'assets', 'ui', 'logo_stellarforge.png'), path.join(img, 'logo.png'));
fs.copyFileSync(path.join(gameRoot, 'assets', 'ui', 'panorama_accueil.png'), path.join(img, 'panorama.png'));

console.log(`Jeu : ${gameRoot}`);
console.log(`  ${gameData.techs.length} technologies, ${gameData.buildings.length} bâtiments, ${gameData.recipes.length} recettes,`
  + ` ${Object.keys(gameData.items).length} matières, ${gameData.planets.length} planètes`);
console.log(`  ${versions.length} versions dans le journal (dernière : ${versions[0]?.version ?? '-'})`);
