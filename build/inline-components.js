#!/usr/bin/env node
/**
 * inline-components.js — bake the shared nav and footer into every HTML page.
 *
 * components.js stays the ONE place you edit the nav/footer. This script reads
 * NAV_HTML and FOOTER_HTML from it and replaces the <div id="site-nav"></div>
 * and <div id="site-footer"></div> placeholders in each *.html file with the
 * real markup, so the pages are complete without JavaScript (crawlers, link
 * checkers, reader modes, and anyone who fetches the raw HTML all see the
 * navigation, address and Impressum link).
 *
 * It runs automatically in the GitHub Action before the FTP upload, so the
 * source files in the repo keep their placeholders and local previews keep
 * working exactly as before (components.js still injects at runtime when the
 * placeholder is present, and does nothing when it is not).
 *
 * Usage:  node build/inline-components.js            # modifies *.html in place
 *         node build/inline-components.js --check    # exit 1 if any page still has a placeholder
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');

const src = fs.readFileSync(path.join(root, 'components.js'), 'utf8');
function extract(name) {
  const m = src.match(new RegExp('const ' + name + ' = `([\\s\\S]*?)`;'));
  if (!m) throw new Error(name + ' not found in components.js');
  return m[1].trim();
}
const NAV = extract('NAV_HTML');
const FOOTER = extract('FOOTER_HTML');
const NAV_DE = extract('NAV_HTML_DE');
const FOOTER_DE = extract('FOOTER_HTML_DE');
const LANG_MAP = new Function('return ' + (src.match(/const LANG_MAP = (\{[\s\S]*?\});/) || [, '{}'])[1])();

// English pages in the root, German pages in de/
const pages = fs.readdirSync(root).filter(f => f.endsWith('.html')).map(f => ({ file: f, rel: f, de: false }));
const deDir = path.join(root, 'de');
if (fs.existsSync(deDir)) fs.readdirSync(deDir).filter(f => f.endsWith('.html')).forEach(f => pages.push({ file: f, rel: 'de/' + f, de: true }));
let changed = 0, missing = [];

for (const pg of pages) {
  const f = pg.file;
  const p = path.join(root, pg.rel);
  let html = fs.readFileSync(p, 'utf8');
  const before = html;

  html = html.replace(/<div id="site-nav"><\/div>/, pg.de ? NAV_DE : NAV);
  html = html.replace(/<div id="site-footer"><\/div>/, pg.de ? FOOTER_DE : FOOTER);

  // Language switch → this page's counterpart (the runtime does the same).
  let target;
  if (pg.de) { target = '../index.html'; for (const en in LANG_MAP) if (LANG_MAP[en] === pg.rel) target = '../' + en; }
  else target = LANG_MAP[f] || 'de/index.html';
  html = html.replace(/(<a href=")[^"]*(" data-lang-switch)/g, '$1' + target + '$2');

  // Mark the current page's nav link as active (the runtime does the same).
  html = html.replace(/(<ul class="nav-links"[\s\S]*?<\/ul>)/, block =>
    block.replace(new RegExp('<a href="' + f.replace('.', '\\.') + '">'), '<a href="' + f + '" class="active" aria-current="page">')
  );

  if (check) {
    if (/id="site-(nav|footer)"/.test(html)) missing.push(f);
    continue;
  }
  if (html !== before) {
    fs.writeFileSync(p, html);
    changed++;
  }
}

if (check) {
  if (missing.length) { console.error('Placeholders still present in: ' + missing.join(', ')); process.exit(1); }
  console.log('OK — no placeholders left in ' + pages.length + ' pages');
} else {
  console.log('Inlined nav/footer into ' + changed + ' of ' + pages.length + ' pages');
}
