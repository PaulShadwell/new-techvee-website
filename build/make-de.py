#!/usr/bin/env python3
"""Assemble a German page under de/ from an English page's <head> (CSS, fonts, schema) and a
hand-written German <body>.  Usage:
  python3 build/make-de.py <en-source.html> <de-target e.g. de/index.html> <body.html> <meta.json>
meta.json: title, description, og_title, crumb (unused), schema_description (optional)
Icon placeholders ICON_NAME in the body are replaced by inline SVGs."""
import sys, re, json, html

en_src, de_target, body_file, meta_file = sys.argv[1:5]
meta = json.load(open(meta_file, encoding='utf-8'))
en = open(en_src, encoding='utf-8').read()
body = open(body_file, encoding='utf-8').read()

ICONS = {
 'LOCK':      '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
 'GRID':      '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 'BOT':       '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M9 4h6"/><circle cx="9" cy="14" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="1.2" fill="currentColor" stroke="none"/>',
 'CARD':      '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/>',
 'ZAP':       '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
 'USERS':     '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18.5 13.5a6.5 6.5 0 0 1 3 6.5"/>',
 'CLIPBOARD': '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 11h6M9 15h6"/>',
 'REFRESH':   '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/>',
 'SHIELD':    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
 'BULB':      '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M8.5 15a6 6 0 1 1 7 0c-.8.6-1.5 1.4-1.5 2.5v.5h-4v-.5c0-1.1-.7-1.9-1.5-2.5z"/>',
 'LANDMARK':  '<path d="M3 22h18"/><path d="M5 18h14"/><path d="M6 18v-7M10 18v-7M14 18v-7M18 18v-7"/><path d="M3 11l9-6 9 6z"/>',
 'PIN':       '<path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
 'CLOUD':     '<path d="M7 18a4 4 0 0 1-.6-7.95A6 6 0 0 1 18 9a4.5 4.5 0 0 1 0 9z"/>',
 'SCROLL':    '<path d="M6 3h11a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6"/><path d="M6 3a3 3 0 0 0-3 3v1h6V6a3 3 0 0 0-3-3z"/><path d="M6 21a3 3 0 0 1-3-3v-1h12v1a3 3 0 0 1-3 3"/><path d="M11 9h5M11 13h5"/>',
 'BUILDING':  '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/><path d="M10 21v-3h4v3"/>',
 'GLOBE':     '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
 'MAIL':      '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
 'CLOCK':     '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 'CHAT':      '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
 'SEARCH':    '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
 'MONITOR':   '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
 'DRIVE':     '<rect x="3" y="12" width="18" height="8" rx="2"/><path d="M5 12l2.5-7h9L19 12"/><path d="M7 16h.01M11 16h2"/>',
 'FILE':      '<path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/><path d="M9 13h6M9 17h6"/>',
 'SWISS':     '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 7.5v9M7.5 12h9"/>',
}
def svg(name):
    return ('<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" '
            'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + '</svg>')
body = re.sub(r'ICON_([A-Z]+)', lambda m: svg(m.group(1)), body)
# HERO_SVG → the English page's decorative hero illustration, unchanged
m = re.search(r'<div class="hero-graphic">\s*(<svg.*?</svg>)', en, re.S)
if m: body = body.replace('HERO_SVG', m.group(1))

head = en[:en.index('<body>')]
en_file = en_src.split('/')[-1]
de_file = de_target.split('/')[-1]
en_url = 'https://techvee.ch/' + ('' if en_file == 'index.html' else en_file)
de_url = 'https://techvee.ch/de/' + ('' if de_file == 'index.html' else de_file)

head = head.replace('<html lang="en">', '<html lang="de-CH">')
head = re.sub(r'<meta name="description" content="[^"]*">', lambda m: '<meta name="description" content="%s">' % html.escape(meta['description'], quote=True), head)
head = re.sub(r'<link rel="canonical" href="[^"]*">',
              lambda m: '<link rel="canonical" href="%s">\n<link rel="alternate" hreflang="de-CH" href="%s">\n<link rel="alternate" hreflang="en" href="%s">\n<link rel="alternate" hreflang="x-default" href="%s">' % (de_url, de_url, en_url, en_url), head)
head = head.replace('<meta property="og:locale" content="en_GB">', '<meta property="og:locale" content="de_CH">\n<meta property="og:locale:alternate" content="en_GB">')
head = re.sub(r'(<meta property="og:title" content=")[^"]*(")', lambda m: m.group(1) + html.escape(meta['og_title'], quote=True) + m.group(2), head)
head = re.sub(r'(<meta property="og:description" content=")[^"]*(")', lambda m: m.group(1) + html.escape(meta['description'], quote=True) + m.group(2), head)
head = re.sub(r'(<meta property="og:url" content=")[^"]*(")', lambda m: m.group(1) + de_url + m.group(2), head)
head = re.sub(r'(<meta name="twitter:title" content=")[^"]*(")', lambda m: m.group(1) + html.escape(meta['og_title'], quote=True) + m.group(2), head)
head = re.sub(r'(<meta name="twitter:description" content=")[^"]*(")', lambda m: m.group(1) + html.escape(meta['description'], quote=True) + m.group(2), head)
head = re.sub(r'<title>.*?</title>', lambda m: '<title>%s</title>' % meta['title'], head, flags=re.S)
# asset paths
head = head.replace('href="favicon.svg"', 'href="../favicon.svg"').replace('href="style.css"', 'href="../style.css"')
# schema: German description + language + url
if 'schema_description' in meta:
    head = re.sub(r'"description": "[^"]*"', lambda m: '"description": ' + json.dumps(meta['schema_description'], ensure_ascii=False), head, count=1)
head = head.replace('"url": "https://techvee.ch/",', '"url": "https://techvee.ch/de/",', 1)
head = head.replace('"inLanguage": "en-GB"', '"inLanguage": "de-CH"')
head = re.sub(r'"mainEntityOfPage": "[^"]*"', '"mainEntityOfPage": "%s"' % de_url, head)
# any remaining EN page links inside the head JSON-LD that point at pages that exist in DE
head = head.replace('https://techvee.ch/techvee-about.html', 'https://techvee.ch/de/#paul')

out = head + body
import os
os.makedirs(os.path.dirname(de_target), exist_ok=True)
open(de_target, 'w', encoding='utf-8').write(out)
print('wrote', de_target, len(out), 'bytes')
