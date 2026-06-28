# Techvee GmbH — website

Static website for Techvee GmbH. Plain HTML/CSS/JS — no build step, no framework.
Hosted on **Novatrend (Switzerland)**. Deploys automatically to Novatrend via GitHub Actions.

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

## Notes

- **Security:** the workflow uses **FTPS** (FTP over TLS). If your Novatrend plan
  offers only plain FTP, you *can* change `protocol: ftps` to `ftp`, but FTPS is
  strongly preferred. If you'd rather use **SFTP (SSH)**, swap the deploy step for
  an SFTP action (e.g. `wlixcc/SFTP-Deploy-Action`) — ask Claude and it'll convert it.
- **The Action never deletes** remote files that aren't in the repo, so any old files
  already on the server stay until you remove them once manually.
- **`.htaccess`** is included and will be uploaded (it powers the custom 404 page).

## Site structure

- `index.html` — homepage
- `techvee-*.html` — service, compliance, AI, hosting, about, blog, contact pages
- `privacy.html`, `impressum.html` — legal pages
- `404.html` — custom error page (wired via `.htaccess`)
- `style.css` — all styling (one file)
- `components.js` — nav, footer, mobile menu, scroll animations, cookie consent,
  Calendly popup, and Umami analytics loader
- `sitemap.xml`, `robots.txt`, `favicon.svg`, `og-image.png`, `og-*.png`
