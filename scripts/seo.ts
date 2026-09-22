import {
  allArticles,
  allCampaigns,
  type ContentItem,
  type SiteDocument,
} from "../src/model";
import { absoluteUrl, campaignSlug, escapeHtml, excerpt } from "../src/safe";
export type Page = {
  route: string;
  article?: ContentItem;
  campaign?: ContentItem;
  missing?: boolean;
};
export function pageHead(site: SiteDocument, page: Page) {
  const a = page.article,
    c = page.campaign,
    home = page.route === "/",
    item = a || c,
    title = item
      ? item.seoTitle ||
        site.seo.titleTemplate.replaceAll("{title}", item.title)
      : home
        ? site.branding.title
        : site.seo.titleTemplate.replaceAll(
            "{title}",
            page.missing ? "Page not found" : "Articles",
          );
  const description = item
    ? item.seoDescription || item.description || excerpt(item.body)
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
  const indexable =
    site.seo.indexable &&
    !page.missing &&
    (!a || a.indexable) &&
    (!c || c.indexable);
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
function xmlEscape(value: string) {
  return value.replace(/[&<>]/g, (character) => {
    if (character === "&") return "&amp;";
    if (character === "<") return "&lt;";
    return "&gt;";
  });
}

export function sitemapUrls(site: SiteDocument) {
  if (!site.seo.indexable) return [];

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
    site.seo.siteUrl,
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
      const lastmod = /^\d{4}-\d{2}-\d{2}$/.test(date)
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
