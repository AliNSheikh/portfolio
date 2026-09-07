# Upload and activate your portfolio

This package is ready for **https://github.com/AliNSheikh/portfolio**, which publishes **https://alinsheikh.github.io/portfolio/**.

The dashboard address will be **https://alinsheikh.github.io/portfolio/admin/** after deployment.

## 1. Upload the source to the repository

1. Download and extract the ZIP.
2. Back up your existing repository using GitHub → Code → Download ZIP, or keep a copy of your current checkout.
3. Open the extracted `ali-sheikh-portfolio` folder. Its contents include `package.json`, `content`, `src`, `public`, `admin`, `scripts`, `tests`, and `.github`.
4. Copy those **contents** to the root of your existing `portfolio` repository. Keep the folder structure. Do not put the project inside another `portfolio` subfolder, and do not upload the ZIP as a single file.
5. Include `.github/workflows/deploy.yml`, `.gitignore`, `.npmrc`, and `package-lock.json`. Hidden folders must be included. GitHub Desktop or Git can make this easier than the browser uploader.
6. Commit and push the source to the `main` branch.

Your old asset folders can remain while you migrate. The new portfolio uses files under `public/uploads/`. Retain any old file URLs you still share elsewhere.

## 2. Enable GitHub Pages

In the repository, open **Settings → Pages → Build and deployment → Source**, and select **GitHub Actions**. The project includes the workflow; do not replace it with a Jekyll template. Vite projects require this build step. [Official Vite deployment instructions](https://vite.dev/guide/static-deploy.html)

Open the repository’s **Actions** tab and choose **Deploy portfolio**. If it has not run yet, select **Run workflow**. Wait for all steps, including Deploy website, to finish successfully.

Then open the website and the `/admin/` address above. Your existing photo, CV, contact values, and work history are included. React, Node.js, AI highlights, and your Computer Science degree are also included. Fill the new collections with your actual work.

If Actions asks you to approve the `github-pages` environment, review the deployment in GitHub and approve it there.

## 3. Create the editor access token

The control panel uses your GitHub account’s repository permission. There is no separate default admin password.

1. Sign in to the GitHub account that owns or can write to `AliNSheikh/portfolio`.
2. Open **Settings → Developer settings → Personal access tokens → Fine-grained tokens**, then **Generate new token**. [Open token creation](https://github.com/settings/personal-access-tokens/new)
3. Name it `Portfolio editor` and choose an expiration date.
4. Select the correct resource owner, **AliNSheikh**.
5. Under **Repository access**, select **Only select repositories**, then select **portfolio**.
6. Under **Repository permissions**, set **Contents → Read and write**. Metadata read access is included automatically.
7. Generate the token and copy it. Keep it in your password manager if you want to reuse it until it expires.
8. Open your deployed `/portfolio/admin/` page, paste the token, and select **Open control panel**.

The token is sent only to `api.github.com` for authenticated requests. The editor keeps it in memory and clears it on disconnect. Refreshing the editor requires reconnecting. Never paste the token into `project.config.json`, an article, a source file, an issue, or a chat. GitHub explains fine-grained permissions and renewal in its [token documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).

An organization may require approval of a fine-grained token. Branch rules can also prevent direct content commits. The dashboard reports GitHub’s rejection; it does not bypass those controls.

## 4. Make and publish changes

1. Update **Profile & introduction**, **Contact & links**, and **Branding & buttons** as needed.
2. Open **Sections & content**. Add a section or open an existing one.
3. Add an item and fill its fields. New items start as **Draft**. Select **Published — show after Publish website** when the item is ready.
4. Select **Done editing**. This closes the item editor and retains your changes in the current session.
5. Use **Preview** to switch between desktop, tablet, and mobile widths. Select article pages from the preview menu after marking the article Published and giving it a slug.
6. Use **Save draft** to save without changing the public content, or **Publish website** to validate and publish the complete document.
7. Follow the **View deployment** link. The published site changes after the GitHub Actions deployment succeeds; it is not instantaneous.

The editor distinguishes unsaved changes, saved drafts, and publication. If you close a tab with unsaved changes, your browser is asked to warn you. Save a draft before leaving or switching devices.

A draft-only text save does not start the deployment workflow. A draft with newly uploaded files may start a build because uploads changed; the build still reads the previous `content/site.json`. The draft content remains off the website.

### Adding and organizing sections

Choose any built-in section type or Custom content. You can add multiple sections of the same type, duplicate a section, change its title and introductory text, reorder it using the arrow buttons, show or hide it, and change its navigation label. A duplicated section starts hidden so it will not appear accidentally.

The **Update anchor** control changes the section’s link ID and updates matching hero button and item link references. If you hide or delete the section used by a hero button, update that button’s destination before publishing.

An empty section stays hidden from visitors even when Show this section is enabled. Add a Published item to display it. Contact and Custom sections with introductory text can display without items.

### Certificates

Upload the certificate image and add its verification URL from the issuer. Both the image and its View certificate button open that URL. Published certificates require an image and an external verification link. The portfolio displays the issuer’s link; it does not independently certify the credential.

### Campaign results

Upload a result image or screenshot. Add the title, supporting text, company, platform, and period. Optional metrics each have a label, value, and unit. Enter only results you want to display publicly.

### Websites and Instagram

Website cards display a browser frame. The Visit Website button appears on hover or keyboard focus and remains visible on touch devices. You can choose a screenshot or a live iframe.

Some websites block iframe display using browser security headers. Keep a screenshot as a fallback; the destination button continues to work. Visitors can switch a configured website frame to the screenshot using Show preview image. [Browser frame restrictions](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options)

Instagram cards accept a public profile or post URL, screenshot, description, role, and period. The official embed option depends on Instagram and the account’s embedding settings. The screenshot option is reliable when embedding is unavailable. The editor’s Preview intentionally uses screenshots and disables external navigation and embeds.

### Articles and SEO

Write the body with the Markdown toolbar. Choose a unique slug such as `google-ads-campaign-optimization`. Arabic slugs are supported. For a published article, the build creates an actual HTML file at `/portfolio/articles/your-slug/index.html`.

Set a custom SEO title and meta description if desired. Otherwise the article title template and summary are used. The cover image is used for social sharing unless you select another sharing image. Leave Canonical URL empty for original articles. HTML entered into Markdown is displayed as text.

Keep a published slug stable to preserve bookmarks and search links. Changing a slug creates a new address and removes the old article page; automatic redirects are not included. Deleting or setting an article back to Draft removes it from the generated public pages on the next successful deployment.

### Phone, email, and all buttons

Edit the central values in Contact & links. A hero destination of `@phone`, `@email`, `@whatsapp`, or another link ID follows that contact value automatically. `@cv` follows the CV file. `#contact` targets the contact section. You can also use a complete HTTPS URL, `mailto:`, or `tel:` link.

Default card labels live in Branding & buttons. Each content item can override its own button label and destination. The favicon should be a square PNG or ICO; 64 × 64 or larger is suitable. The original favicon is included until you replace it.

### Media and backups

The media library accepts PNG, JPG, WebP, GIF, ICO, and PDF, up to 8 MB per file. Convert SVG logos to PNG first. Uploaded filenames are generated uniquely to avoid replacing an existing file. Uploads are staged until Save draft or Publish website.

Clear a file from every profile field, item, Markdown image, and branding field before deleting it. Files used by draft items are also protected. Existing media deletions take effect only on Publish website, keeping currently published content intact while you prepare a draft.

**Publishing & backups → Export content JSON** downloads your current document. It includes text and file references; it does not include image or PDF binaries. For a complete backup, download your GitHub repository ZIP. Importing content replaces the current editing document after you confirm, but does not change the live site until you publish.

To undo a publication, revert that content commit in GitHub. This triggers a new deployment. Reload the dashboard before editing again.

## 5. Connect Google services

### Search Console

1. Open [Google Search Console](https://search.google.com/search-console) and add the URL-prefix property `https://alinsheikh.github.io/portfolio/`.
2. Choose HTML tag verification.
3. Copy only the tag’s `content` value into **SEO & Google → Google site verification value**.
4. Publish and wait for deployment, then select Verify in Google.
5. Submit `https://alinsheikh.github.io/portfolio/sitemap.xml` in Search Console.

The verification tag is generated into public page HTML. The sitemap contains indexable pages and excludes hidden or draft articles. Google controls crawling, indexing, and rankings. [Google verification guidance](https://support.google.com/webmasters/answer/9008080?hl=en)

The build includes `robots.txt`. For a GitHub project website, crawlers look for it at the domain root, not `/portfolio/robots.txt`. Meta robots tags on every generated page control this portfolio’s indexing, and you can submit the project sitemap directly. If you control `alinsheikh.github.io`, you can also add the sitemap there. With a custom domain at `/`, the generated robots file is at the correct root location.

### Analytics

Create or open your GA4 property and web data stream. Paste its `G-...` measurement ID into **SEO & Google → GA4 measurement ID**, then publish. The public website loads Analytics after deployment. The dashboard and editor previews do not load it. Open GA4 Realtime to check your own visit; browser blockers can prevent collection. [Google Analytics setup](https://support.google.com/analytics/answer/9539598?hl=en)

The field connects your existing GA4 stream; it does not create a Google account or property. If your site needs a consent-management interface, add one before enabling tracking; this package does not include a consent platform.

## Local development

Use **Node.js 22.12.0 or newer**. Node.js **22.6.0 is too old** for this toolchain. The repository enforces the minimum version to avoid unclear startup errors. The deployment workflow uses Node.js 24.

From the extracted project root:

```bash
npm ci
npm run dev
```

Open the address printed by Vite and append `/portfolio/` for the website or `/portfolio/admin/` for the editor. The local editor also writes to the configured GitHub repository when you connect and publish; use Preview for visual review.

For a production build:

```bash
npm run check
npm test
npm run build
npm run preview
```

Do not open `index.html` directly by double-clicking it. The source needs Vite, and deployed assets use the `/portfolio/` path.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| `/admin/` is 404 | Use `/portfolio/admin/`; ensure the complete source and workflow were uploaded, Pages uses GitHub Actions, and deployment succeeded. |
| Admin page is blank | Check the Actions build, upload structure, and base path. Hard refresh after deployment. A restrictive browser extension can also block JavaScript. |
| GitHub rejects the token | Check expiration, resource owner, selected repository, and Contents: Read and write. Generate a new token if needed. |
| Token connects but cannot save | Account access and token permissions are separate. Also check branch protection, repository rules, organization approval, and rate limits. |
| Website still shows old content | Wait for the latest successful Actions deployment. Check for a failed build and try a hard refresh. Saving a draft alone does not publish text changes. |
| “Repository changed” | Export your current document, reload from GitHub, and reapply the needed changes. The editor prevents overwriting another editor’s changes. |
| A certificate will not publish | Add its title, image, and HTTPS verification link, then mark it Published. |
| An article will not publish | Add a title, body, and unique valid slug. Check other published articles for the same slug. |
| Section is not showing | Enable Show this section and ensure it contains a Published item. Navigation visibility is a separate control. |
| An iframe is blank | The destination may block embedding. Use a screenshot and the Visit Website button. |
| An upload is rejected | Check file type and the 8 MB limit. Convert SVG to PNG. Very large images are better compressed before uploading. |
| A media file cannot be deleted | It is still referenced, including in a draft, CV, favicon, social image, or Markdown body. Clear those references first. |
| Node reports an engine error | Upgrade from Node 22.6 to 22.12+ or use Node 24, open a new terminal, and run `npm ci` again. |

## Changing the domain, repository, or branch

Ordinary portfolio content is managed in the dashboard. Hosting identity is configured in `project.config.json` and the GitHub repository settings.

For a custom domain at its root, change `basePath` to `/` and `siteUrl` to the new HTTPS URL in `project.config.json`. Update `content/site.json` → `seo.siteUrl` to match, configure the custom domain and DNS in GitHub Pages, and rebuild. If you want GitHub to preserve a CNAME file in the artifact, add `public/CNAME` containing only your domain.

If changing repositories or branches, also update the token’s repository selection and `.github/workflows/deploy.yml` branch trigger. The editor itself cannot configure your GitHub account permissions or DNS.

## Validation included

Automated checks cover content validation, public HTML rendering, certificate verification links, safe Markdown and URLs, drafts, media deletion, atomic commits, conflict detection, token disposal, article SEO, Arabic article paths, and removal of stale article pages. GitHub publishing is tested with a simulated GitHub API; a live publish requires your repository token and deployment setup. No production repository was modified while creating this package.
