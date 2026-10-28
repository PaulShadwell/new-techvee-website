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

## Fonts & analytics

- Inter and Playfair Display are **self-hosted** in `fonts/` (variable fonts, OFL).
  No request goes to Google Fonts.
- Analytics is self-hosted **Umami** (cookieless, no personal data, honours Do-Not-Track),
  loaded from `components.js`. There is deliberately **no cookie banner**.

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
