#!/usr/bin/env python3
"""Generate a blog post page from the data-residency article as the layout template.
Usage: python3 build/make-post.py spec.json  (spec keys: slug, title, description, category,
date, readtime, crumb, summary, body_html, sidebar_title, sidebar_text, sidebar_link, sidebar_link_text,
cta_eyebrow, cta_title, cta_text, cta_secondary_href, cta_secondary_text)"""
import json, re, sys, html

spec = json.load(open(sys.argv[1], encoding='utf-8'))
t = open('techvee-blog-m365-data-residency.html', encoding='utf-8').read()

def attr(s): return html.escape(s, quote=True)

# head
t = t.replace('techvee-blog-m365-data-residency.html', spec['slug'])
t = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="%s">' % attr(spec['description']), t)
t = re.sub(r'(<meta property="og:title" content=")[^"]*(")', r'\g<1>%s — Techvee GmbH\g<2>' % attr(spec['title']), t)
t = re.sub(r'(<meta property="og:description" content=")[^"]*(")', r'\g<1>%s\g<2>' % attr(spec['description']), t)
t = re.sub(r'(<meta name="twitter:title" content=")[^"]*(")', r'\g<1>%s — Techvee GmbH\g<2>' % attr(spec['title']), t)
t = re.sub(r'(<meta name="twitter:description" content=")[^"]*(")', r'\g<1>%s\g<2>' % attr(spec['description']), t)
t = re.sub(r'<title>.*?</title>', '<title>%s &mdash; Techvee GmbH</title>' % html.escape(spec['title']), t, flags=re.S)
t = re.sub(r'"headline": "[^"]*"', '"headline": %s' % json.dumps(spec['title'], ensure_ascii=False).replace('\\','\\\\'), t)
t = re.sub(r'"description": "[^"]*"', '"description": %s' % json.dumps(spec['description'], ensure_ascii=False).replace('\\','\\\\'), t)
t = t.replace('"inLanguage": "en-GB"', '"datePublished": "%s",\n  "inLanguage": "en-GB"' % spec['iso_date'])

# hero
t = re.sub(r'<span>/</span>M365 Data Residency</div>', '<span>/</span>%s</div>' % html.escape(spec['crumb']), t)
t = re.sub(r'<span class="art-cat">[^<]*</span><span class="art-date">[^<]*</span><span class="art-time">[^<]*</span>',
           '<span class="art-cat">%s</span><span class="art-date">%s</span><span class="art-time">%s</span>' % (html.escape(spec['category']), spec['date'], spec['readtime']), t)
t = re.sub(r'<h1>.*?</h1>\n<p class="summary">.*?</p>', '<h1>%s</h1>\n<p class="summary">%s</p>' % (html.escape(spec['title']), spec['summary']), t, count=1, flags=re.S)

# body
t = re.sub(r'<article class="art-body">.*?</article>', lambda m: '<article class="art-body">\n%s\n</article>' % spec['body_html'], t, flags=re.S)

# sidebar card
t = re.sub(r'<div class="s-card">.*?</div>\n<div class="s-about">',
           '<div class="s-card">\n<h3>%s</h3>\n<p>%s</p>\n<a href="techvee-contact.html">Book a free first call</a>\n<a href="%s" class="ol">%s &rarr;</a>\n</div>\n<div class="s-about">'
           % (html.escape(spec['sidebar_title']), spec['sidebar_text'], spec['sidebar_link'], spec['sidebar_link_text']), t, flags=re.S)

# bottom CTA
t = re.sub(r'<section class="cta-section"><div class="container">.*?</section>',
           '<section class="cta-section"><div class="container">\n<div class="eyebrow">%s</div>\n<h2>%s</h2>\n<p>%s</p>\n<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">\n<a href="techvee-contact.html" class="btn-primary">Book a free call</a>\n<a href="%s" class="btn-outline">%s</a>\n</div></div></section>'
           % (html.escape(spec['cta_eyebrow']), html.escape(spec['cta_title']), spec['cta_text'], spec['cta_secondary_href'], html.escape(spec['cta_secondary_text'])), t, flags=re.S)

open(spec['slug'], 'w', encoding='utf-8').write(t)
print('wrote', spec['slug'])
