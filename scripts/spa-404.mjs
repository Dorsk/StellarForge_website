// GitHub Pages ne connaît pas les routes Angular : 404.html = index.html,
// pour que /fr/codex ou /en/atlas ouverts directement chargent quand même le site.
import fs from 'node:fs';

const dir = 'dist/stellarforge-website/browser';
fs.copyFileSync(`${dir}/index.html`, `${dir}/404.html`);
fs.writeFileSync(`${dir}/.nojekyll`, '');
console.log('404.html et .nojekyll ajoutés');
