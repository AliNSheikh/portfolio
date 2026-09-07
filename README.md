# Ali Sheikh — Portfolio & Control Panel

A responsive React portfolio with a white background, gold editorial typography, subtle background motion, and a connected GitHub content editor.

**Start with [SETUP.md](SETUP.md).** Arabic quick-start instructions are in [START_HERE_AR.md](START_HERE_AR.md).

The package is configured for:

| Destination | Address |
| --- | --- |
| Source repository | [AliNSheikh/portfolio](https://github.com/AliNSheikh/portfolio) |
| Public website after deployment | [Portfolio](https://alinsheikh.github.io/portfolio/) |
| Control panel after deployment | [Admin](https://alinsheikh.github.io/portfolio/admin/) |

The source must be uploaded to the **root of the repository**, and GitHub Pages must use **GitHub Actions**. The website is not deployed by downloading this package.

## What you can manage

| Area | Controls |
| --- | --- |
| Profile | Full name, highlighted surname, role, introduction, location, photo, crop position, CV, visibility, technology/AI highlights, hero buttons |
| Sections | Add, delete, duplicate, reorder, show/hide, navigation visibility, navigation labels, anchor IDs, titles, introductions |
| Work | Website frames and screenshots, destination buttons, technology, role, featured cards |
| Campaign results | Image above text, platform, client, dates/period, metrics, supporting text, result link |
| Instagram | Company/account name, screenshot or official embed, role, period, profile/post link |
| Certificates | Image, title, issuer, issue date, credential ID, verification URL shared by the image and button |
| Experience & education | Company/institution, role/degree, dates, current position, location, logo, description, details |
| Articles | Cover, summary, category, dates, Markdown body, URL slug, draft/published status, SEO title, description, canonical URL, social image, indexing setting |
| Clients & testimonials | Client logos and links; testimonial quote, name, role, company, photograph |
| Custom content | Cards, lists, image/text rows, optional images and destination buttons |
| Contact | Phone, WhatsApp, email, LinkedIn, GitHub, custom links, labels, visibility, new-tab behavior, floating buttons, footer links |
| Branding | Website title, navigation name, favicon, social image, description, footer, default button labels |
| Appearance | Background, gold accent, action color, animation, reduced-motion preference |
| SEO & Google | Site URL, title template, language/RTL, indexing, Search Console verification, GA4 measurement ID |
| Media & publishing | Uploads, media selection, safe deletion, shared drafts, previews, content import/export, atomic publishing, conflict detection |

## How it works

The public website is static and works on GitHub Pages. The control panel authenticates requests directly with GitHub using a fine-grained personal access token limited to this repository. GitHub enforces the account and repository permissions.

- The token is held in memory for the current editing session. Refreshing or disconnecting requires reconnecting. No token is written to browser storage or source files.
- **Save draft** commits `content/draft.json` and new uploads. It does not replace the published content document.
- **Publish website** commits `content/site.json`, uploads, and approved unused-file deletions together, removes the saved draft, and triggers GitHub Pages deployment.
- Concurrent content changes are detected. Unrelated source commits are preserved. The editor never force pushes.
- GitHub is the persistent content store. The editor does not rely on local browser data as its database.

This repository is public: drafts are excluded from the built website but remain visible in repository source. Use it for portfolio content you are comfortable storing publicly.

## Technology

React, TypeScript, Vite, Markdown-it, Zod, Lucide icons, GitHub REST APIs, and GitHub Actions. Node.js performs the build and generates complete article HTML; no Node server needs to run on GitHub Pages. [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

```bash
npm ci
npm run check
npm test
npm run build
```

Requires Node.js 22.12.0 or newer. The included GitHub Actions workflow uses Node.js 24.

## Project files

- `content/site.json`: complete editable source content.
- `content/draft.json`: created by Save draft; not included in the initial package.
- `public/uploads/`: original and uploaded media.
- `src/portfolio.tsx`, `src/site.css`: public components and design.
- `src/admin/`, `src/admin.css`: complete control panel.
- `src/github.ts`: authenticated persistence, atomic commits, conflict checks.
- `scripts/`: content validation, static article generation, SEO, sitemap, and robots output.
- `.github/workflows/deploy.yml`: automatic build and deployment.
- `project.config.json`: repository, branch, URL, and `/portfolio/` base path.
- `tests/`: publishing protocol, content security, rendering, and complete-build checks. Fixed test fixtures are separate from your editable content.

Empty collections do not appear on the public homepage until you publish an item. No campaign numbers, certificates, client logos, testimonials, universities, or graduation dates have been invented.
