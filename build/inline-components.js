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

const pages = fs.readdirSync(root).filter(f => f.endsWith('.html'));
let changed = 0, missing = [];

for (const f of pages) {
  const p = path.join(root, f);
  let html = fs.readFileSync(p, 'utf8');
  const before = html;

  html = html.replace(/<div id="site-nav"><\/div>/, NAV);
  html = html.replace(/<div id="site-footer"><\/div>/, FOOTER);

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
