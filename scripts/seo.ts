import {
  allArticles,
  allCampaigns,
  type ContentItem,
  type ProjectConfig,
  type SiteDocument,
} from "../src/model";
import { absoluteUrl, campaignSlug, escapeHtml, excerpt } from "../src/safe";
export type Page = {
  route: string;
  article?: ContentItem;
  campaign?: ContentItem;
  missing?: boolean;
};

/** project.config.json owns the deployment URL; the CMS copy must agree. */
export function validateProductionUrls(project: ProjectConfig, site: SiteDocument) {
  const root = new URL(project.siteUrl);
  if (
    root.protocol !== "https:" || root.username || root.password || root.port ||
    root.search || root.hash || root.pathname !== project.basePath ||
    !root.pathname.endsWith("/") || root.href !== project.siteUrl ||
    /^(?:localhost|127\.|0\.|\[::1\])/.test(root.hostname) ||
    root.hostname.endsWith(".localhost") ||
    site.seo.siteUrl !== project.siteUrl
  )
    throw new Error("The HTTPS siteUrl in content/site.json must match project.config.json exactly, including its basePath and trailing slash.");
  if (root.hostname.endsWith(".github.io") && (
    root.hostname !== `${project.owner.toLowerCase()}.github.io` ||
    project.basePath !== `/${project.repository}/`
  ))
    throw new Error("A GitHub Pages project site must use its owner's github.io host and /repository/ basePath.");
}

export function generatedPages(site: SiteDocument): Page[] {
  return [
    { route: "/" },
    { route: "/articles/" },
    ...allArticles(site).map((article) => ({
      route: "/articles/" + encodeURIComponent(article.slug) + "/", article,
    })),
    ...allCampaigns(site).map((campaign) => ({
      route: "/" + encodeURIComponent(campaignSlug(campaign)) + "/", campaign,
    })),
    { route: "/404/", missing: true },
  ];
}

export function pageIsIndexable(site: SiteDocument, page: Page) {
  return site.seo.indexable && !page.missing &&
    (page.article?.indexable ?? true) && (page.campaign?.indexable ?? true);
}

export function pageHead(site: SiteDocument, page: Page) {
  const a = page.article,
    c = page.campaign,
    home = page.route === "/",
    item = a || c,
    title = item
      ? item.seoTitle ||
        site.seo.titleTemplate.replaceAll("{title}", item.title.trim())
      : home
        ? site.branding.title
        : site.seo.titleTemplate.replaceAll(
            "{title}",
            page.missing ? "Page not found" : "Articles",
          );
  const description = item
    ? [item.seoDescription, item.description, excerpt(item.body),
        `${item.title.trim()}. ${site.branding.description}`]
        .find((value) => value.trim())!
    : site.branding.description;
  const canonical =
    a?.canonicalUrl ||
    c?.canonicalUrl ||
    absoluteUrl(page.route.replace(/^\//, ""), site.seo.siteUrl);
  const image =
    a?.socialImage ||
    a?.image ||
    c?.socialImage ||
    c?.image ||
    site.branding.socialImage ||
    site.profile.image;
  const indexable = pageIsIndexable(site, page);
  const tag = (name: string, value: string, property = false) =>
    `<meta ${property ? "property" : "name"}="${name}" content="${escapeHtml(value)}">`;
  const schema: Record<string, unknown> = a
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: a.title,
        description,
        mainEntityOfPage: canonical,
        author: {
          "@type": "Person",
          name: site.profile.name,
          url: site.seo.siteUrl,
        },
        ...(a.date ? { datePublished: a.date } : {}),
        ...(a.updatedDate || a.date
          ? { dateModified: a.updatedDate || a.date }
          : {}),
        ...(image ? { image: [absoluteUrl(image, site.seo.siteUrl)] } : {}),
      }
    : c
      ? {
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: c.title,
          description,
          url: canonical,
          creator: {
            "@type": "Person",
            name: site.profile.name,
            url: site.seo.siteUrl,
          },
          ...(c.platform ? { genre: c.platform } : {}),
          ...(image ? { image: absoluteUrl(image, site.seo.siteUrl) } : {}),
        }
      : {
          "@context": "https://schema.org",
          "@type": "Person",
          name: site.profile.name,
          url: site.seo.siteUrl,
          jobTitle: site.profile.role,
          description: site.profile.introduction,
          ...(site.profile.image
            ? { image: absoluteUrl(site.profile.image, site.seo.siteUrl) }
            : {}),
        };
  return [
    `<title>${escapeHtml(title)}</title>`,
    tag("description", description),
    tag("robots", indexable ? "index, follow" : "noindex, follow"),
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    site.branding.favicon
      ? `<link rel="icon" href="${escapeHtml(absoluteUrl(site.branding.favicon, site.seo.siteUrl))}">`
      : "",
    tag("theme-color", site.appearance.background),
    tag("og:type", a ? "article" : "website", true),
    tag("og:title", title, true),
    tag("og:description", description, true),
    tag("og:url", canonical, true),
    tag("og:site_name", site.branding.displayName, true),
    image ? tag("og:image", absoluteUrl(image, site.seo.siteUrl), true) : "",
    tag("twitter:card", image ? "summary_large_image" : "summary"),
    tag("twitter:title", title),
    tag("twitter:description", description),
    image ? tag("twitter:image", absoluteUrl(image, site.seo.siteUrl)) : "",
    site.seo.googleVerification
      ? tag("google-site-verification", site.seo.googleVerification)
      : "",
    `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function robots(project: ProjectConfig) {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    `Disallow: ${project.basePath}admin/`,
    "",
    `Sitemap: ${new URL("sitemap.xml", project.siteUrl).href}`,
    "",
  ].join("\n");
}
function xmlEscape(value: string) {
  return value.replace(/[&<>]/g, (character) => {
    if (character === "&") return "&amp;";
    if (character === "<") return "&lt;";
    return "&gt;";
  });
}

export function sitemapUrls(site: SiteDocument) {
  if (!site.seo.indexable) return [];
  const base = new URL(site.seo.siteUrl);
  if (
    base.protocol !== "https:" ||
    base.search ||
    base.hash ||
    !base.pathname.endsWith("/")
  )
    throw new Error(
      "The sitemap requires the HTTPS website root ending in /, not a file or sitemap URL.",
    );

  const campaignUrls = allCampaigns(site)
    .filter((campaign) => {
      if (!campaign.indexable) return false;
      const canonical = absoluteUrl(
        encodeURIComponent(campaignSlug(campaign)) + "/",
        site.seo.siteUrl,
      );
      return !campaign.canonicalUrl || campaign.canonicalUrl === canonical;
    })
    .map((campaign) =>
      absoluteUrl(
        encodeURIComponent(campaignSlug(campaign)) + "/",
        site.seo.siteUrl,
      ),
    );

  const candidates = [
    base.href,
    absoluteUrl("articles/", site.seo.siteUrl),
    ...campaignUrls,
    ...allArticles(site)
      .filter(
        (article) =>
          article.indexable &&
          (!article.canonicalUrl ||
            article.canonicalUrl ===
              absoluteUrl(
                "articles/" + encodeURIComponent(article.slug) + "/",
                site.seo.siteUrl,
              )),
      )
      .map((article) =>
        absoluteUrl(
          "articles/" + encodeURIComponent(article.slug) + "/",
          site.seo.siteUrl,
        ),
      ),
  ].filter(Boolean);

  return [...new Set(candidates)];
}

/** Fail the deployment rather than advertise missing pages or sitemap files. */
export function validateSitemapPages(site: SiteDocument, pages: Page[]) {
  const generated = new Set(
    pages
      .filter((page) => !page.missing)
      .map((page) =>
        absoluteUrl(page.route.replace(/^\//, ""), site.seo.siteUrl),
      ),
  );
  const base = new URL(site.seo.siteUrl);
  for (const entry of sitemapUrls(site)) {
    const url = new URL(entry);
    const relative = url.pathname.slice(base.pathname.length);
    if (
      url.origin !== base.origin ||
      !url.pathname.startsWith(base.pathname) ||
      url.search ||
      url.hash ||
      !generated.has(entry) ||
      /^(?:admin|404|sitemap(?:\.xml|\.txt)?|robots\.txt|assets|uploads)(?:\/|$)/i.test(
        relative,
      )
    )
      throw new Error(
        `Sitemap entry must be a generated public page: ${entry}`,
      );
  }
}

export function sitemap(site: SiteDocument) {
  const articleDates = new Map(
    allArticles(site)
      .filter((article) => article.indexable)
      .map((article) => [
        absoluteUrl(
          "articles/" + encodeURIComponent(article.slug) + "/",
          site.seo.siteUrl,
        ),
        article.updatedDate || article.date,
      ]),
  );
  const campaignDates = new Map(
    allCampaigns(site)
      .filter((campaign) => campaign.indexable)
      .map((campaign) => [
        absoluteUrl(
          encodeURIComponent(campaignSlug(campaign)) + "/",
          site.seo.siteUrl,
        ),
        campaign.updatedDate || campaign.date,
      ]),
  );

  const entries = sitemapUrls(site)
    .map((url) => {
      const date = articleDates.get(url) || campaignDates.get(url) || "";
      const parsed = new Date(date);
      const lastmod =
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        Number.isFinite(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === date
          ? `\n    <lastmod>${date}</lastmod>`
          : "";

      return `  <url>\n    <loc>${xmlEscape(url)}</loc>${lastmod}\n  </url>`;
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    "</urlset>",
    "",
  ].join("\n");
}

export function sitemapText(site: SiteDocument) {
  const urls = sitemapUrls(site);
  return urls.length ? urls.join("\n") + "\n" : "";
}
