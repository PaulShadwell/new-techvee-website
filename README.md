# Techvee GmbH — website

Static website for Techvee GmbH. Plain HTML/CSS/JS — no framework, one tiny build step.
Hosted on **Novatrend (Switzerland)**. Deploys automatically to Novatrend via GitHub Actions.

Canonical address: **https://techvee.ch** — `techvee.com`, `www.` and `http://` all 301-redirect there (see `.htaccess`).

## How publishing works

Push a change to the `main` branch → the GitHub Action in
`.github/workflows/deploy.yml` uploads the changed files to Novatrend over FTPS.
No more cPanel File Manager or manual FTP.

### One-time setup

1. **Create a private GitHub repo** and push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Techvee website"
   git branch -M main
   git remote add origin https://github.com/<your-username>/techvee-website.git
   git push -u origin main
   ```

2. **Add three repository secrets** in GitHub:
   Repo → **Settings → Secrets and variables → Actions → New repository secret**

   | Secret name    | Value                                                        |
   |----------------|--------------------------------------------------------------|
   | `FTP_SERVER`   | Your Novatrend FTP host (e.g. `ftp.techvee.com` or the server hostname from your Novatrend welcome email) |
   | `FTP_USERNAME` | Your FTP / cPanel username                                    |
   | `FTP_PASSWORD` | Your FTP / cPanel password                                    |

   Secrets are encrypted and never visible in the repo or logs.

3. **Check the remote folder.** The workflow uploads to `public_html/` by default.
   If `techvee.com` lives in a different directory (addon domain / subfolder),
   edit `server-dir:` in `.github/workflows/deploy.yml` to match.

4. **Push (or click "Run workflow")** and watch it under the repo's **Actions** tab.
   The first run uploads everything; after that, only changed files go up.

### Updating the blog (the easy bit)

- Ask Claude to generate a new post (e.g. `techvee-blog-<topic>.html`), or edit one yourself.
- Add a card linking to it on `techvee-blog.html`, and a `<url>` entry in `sitemap.xml`.
- Commit and push — or edit the file directly in GitHub's web editor and commit there.
- The Action publishes it within a minute. Done.

## Nav & footer — edit one file

The shared navigation and footer live in **`components.js`** (`NAV_HTML` / `FOOTER_HTML`).
Edit them there only. During deployment, `build/inline-components.js` bakes that markup
into every page so the uploaded HTML is complete without JavaScript (crawlers, link
checkers, reader mode and anyone fetching the raw page all see the nav, the address and
the Impressum link). The source files in the repo keep their `<div id="site-nav">` /
`<div id="site-footer">` placeholders, so local previews work exactly as before.

To preview the built output locally: `node build/inline-components.js` in a scratch copy.

## Domains (Novatrend / cPanel)

- `techvee.ch` is the primary domain of the cPanel account (document root `public_html`).
- `techvee.com` must be added in cPanel as an **Alias (parked) domain** of the same
  account, so it serves the same `public_html`. The `.htaccess` then redirects every
  request for `techvee.com`, `www.techvee.ch`, `www.techvee.com` or plain `http://`
  to `https://techvee.ch/…` with a 301.
- Check **AutoSSL** covers all four names (`techvee.ch`, `www.techvee.ch`,
  `techvee.com`, `www.techvee.com`) so the redirect itself is served over valid TLS.
- Email stays on `@techvee.com` — the redirect only affects the website.

## German pages (`de/`)

- German versions live in `de/`: `index.html`, `leistungen.html`, `kontakt.html`,
  `impressum.html`, `datenschutz.html`. The English↔German pairs are listed in
  `LANG_MAP` in `components.js`; the language switch in the nav and footer
  (`data-lang-switch`) points at the page's counterpart automatically (runtime and
  build step both read that map). Pages with no German twin switch to `de/index.html`.
- German nav/footer are `NAV_HTML_DE` / `FOOTER_HTML_DE` in `components.js`; asset
  paths inside `de/` use `../`.
- Each paired page carries `hreflang` links (en, de-CH, x-default) in both directions.
- The tools page and blog are English only for now; German pages link to them with
  an "EN" marker.
- `build/make-de.py` assembled the German pages from the English page's `<head>` plus
  a hand-written German body; it's a helper for adding more, not needed at deploy time.

## Booking system (Calendly → Microsoft Bookings)

The booking provider is a single setting at the top of `components.js`:

```js
const BOOKING = { provider: "calendly", url: "https://calendly.com/..." };
```

To move to Microsoft Bookings: create a Bookings calendar in Microsoft 365, publish
its booking page, copy the page URL, then set `provider: "bookings"` and paste the URL.
Every "Book a call" button then links to the contact pages, which embed the Bookings
page in an iframe (`#booking-embed`); the popup widget is Calendly-only. Also update the
third-party table in `privacy.html` and `de/datenschutz.html` (Calendly → Microsoft
Bookings, EU/Switzerland).

## Fonts & analytics

- Inter and Playfair Display are **self-hosted** in `fonts/` (variable fonts, OFL).
  No request goes to Google Fonts.
- Analytics is self-hosted **Umami** (cookieless, no personal data, honours Do-Not-Track),
  loaded from `components.js`. There is deliberately **no cookie banner**.

## Forms & the free-tools page

- **`api/send.php`** handles the contact form and the "email me my results" forms on
  `techvee-tools.html`. It runs on the Novatrend server and uses the server's own
  mail system, so no third-party form service (Formspree is gone). Config constants
  are at the top of the file. Sends **as `noreply@techvee.ch`** — never as
  `@techvee.com`, whose SPF is locked to Microsoft 365.
- **DNS, one-off:** add a TXT record on `techvee.ch`:
  `v=spf1 include:_spf.tophost.ch ~all` (the web server's IP is in that range).
  Optionally create the mailbox `noreply@techvee.ch` in cPanel so bounces have a home.
- **`tools.js`** holds the three tools. Microsoft CHF list prices live in the
  `PLANS` table with a `PRICE_DATE` string — update both when Microsoft changes
  prices (last checked October 2026). Retainer/ad-hoc rates are constants at the
  top of the calculator section and must match `techvee-services.html`.

## Notes

- **Security:** the workflow uses **FTPS** (FTP over TLS). If your Novatrend plan
  offers only plain FTP, you *can* change `protocol: ftps` to `ftp`, but FTPS is
  strongly preferred. If you'd rather use **SFTP (SSH)**, swap the deploy step for
  an SFTP action (e.g. `wlixcc/SFTP-Deploy-Action`) — ask Claude and it'll convert it.
- **The Action never deletes** remote files that aren't in the repo, so any old files
  already on the server stay until you remove them once manually.
- **`.htaccess`** is included and will be uploaded (domain redirects, 404 page, security headers, caching).

## Site structure

- `index.html` — homepage
- `techvee-*.html` — service, compliance, AI, hosting, about, blog, contact pages
- `privacy.html`, `impressum.html` — legal pages
- `404.html` — custom error page (wired via `.htaccess`)
- `style.css` — all styling (one file)
- `components.js` — nav, footer, mobile menu, scroll animations, cookie consent,
  Calendly popup, and Umami analytics loader
- `sitemap.xml`, `robots.txt`, `favicon.svg`, `og-image.png`, `og-*.png`
