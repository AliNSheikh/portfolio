import MarkdownIt from "markdown-it";
import {
  allArticles,
  siteSchema,
  visibleSections,
  type SiteDocument,
  type ProjectConfig,
} from "./model";

export function safeUrl(value: string, allowContact = true): string {
  const input = (value || "").trim();
  if (input === "/") return input;
  if (!input || /[\u0000-\u001f\u007f]/.test(input)) return "";
  if (/^#[a-z0-9][a-z0-9-]*$/i.test(input)) return input;
  if (allowContact && /^mailto:[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i.test(input))
    return input;
  if (allowContact && /^tel:\+?[0-9 ()-]{5,30}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    )
      return url.href;
  } catch {
    /* relative paths below */
  }
  if (
    /^(?:\/?[a-zA-Z0-9_\-\.]+\/)*[a-zA-Z0-9_\-\.]+\/?$/.test(input) &&
    !input.startsWith("//") &&
    !input.split("/").some((p) => p === ".." || p === ".")
  )
    return input;
  return "";
}
export function assetUrl(path: string, basePath: string): string {
  const clean = safeUrl(path, false);
  if (!clean) return "";
  return /^https?:\/\//.test(clean) || clean.startsWith("/")
    ? clean
    : basePath + clean;
}
export function contactUrl(link: SiteDocument["contact"]["links"][number]) {
  if (link.kind === "phone")
    return safeUrl("tel:" + link.value.replace(/^tel:/, ""));
  if (link.kind === "email")
    return safeUrl("mailto:" + link.value.replace(/^mailto:/, ""));
  if (link.kind === "whatsapp" && /^\+?[\d ()-]+$/.test(link.value))
    return "https://wa.me/" + link.value.replace(/\D/g, "");
  return safeUrl(link.value);
}
export function actionUrl(
  destination: string,
  site: SiteDocument,
  basePath: string,
): string {
  if (destination === "@cv") return assetUrl(site.profile.cv, basePath);
  if (destination.startsWith("@")) {
    const link = site.contact.links.find((l) => l.id === destination.slice(1));
    return link ? contactUrl(link) : "";
  }
  const url = safeUrl(destination);
  return url.startsWith("#")
    ? basePath + url
    : /^(?:mailto|tel):/.test(url)
      ? url
      : assetUrl(url, basePath);
}
export function absoluteUrl(path: string, siteUrl: string): string {
  try {
    return new URL(path, siteUrl.endsWith("/") ? siteUrl : siteUrl + "/").href;
  } catch {
    return "";
  }
}
export function articlePath(slug: string, basePath: string) {
  return `${basePath}articles/${encodeURIComponent(slug)}/`;
}
export function slugify(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
}
export function plainText(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[#*_`~>\[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
export function excerpt(value: string, max = 170) {
  const s = plainText(value);
  return s.length > max ? s.slice(0, max - 1).trim() + "…" : s;
}
export function readingTime(value: string) {
  return Math.max(1, Math.ceil(plainText(value).split(/\s+/).length / 200));
}
export function dateLabel(value: string) {
  if (!value) return "";
  const d = new Date(value.length === 7 ? value + "-01" : value);
  return Number.isNaN(d.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(d);
}
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: true,
});
md.validateLink = (url: string) => !!safeUrl(url) || /^#[a-z0-9-]+$/i.test(url);
const oldLink = md.renderer.rules.link_open;
md.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index];
  token.attrSet("rel", "noopener noreferrer");
  const href = token.attrGet("href") || "";
  if (/^https?:/.test(href)) token.attrSet("target", "_blank");
  else if (href && !href.startsWith("#") && !/^(?:mailto|tel):/.test(href))
    token.attrSet("href", assetUrl(href, env?.basePath || "/"));
  return oldLink
    ? oldLink(tokens, index, options, env, self)
    : self.renderToken(tokens, index, options);
};
const oldImage = md.renderer.rules.image;
md.renderer.rules.image = (tokens, index, options, env, self) => {
  const token = tokens[index];
  const src = token.attrGet("src") || "";
  token.attrSet("src", assetUrl(src, env?.basePath || "/"));
  token.attrSet("loading", "lazy");
  return oldImage
    ? oldImage(tokens, index, options, env, self)
    : self.renderToken(tokens, index, options);
};
export function markdown(value: string, basePath = "/") {
  return md.render(value, { basePath });
}

export function validateDocument(input: unknown): SiteDocument {
  const site = siteSchema.parse(input);
  const ids = new Set<string>();
  for (const section of site.sections) {
    if (
      ids.has(section.id) ||
      ["home", "main", "top", "admin"].includes(section.id)
    )
      throw new Error(
        "Each section needs a unique ID; home, main, top and admin are reserved.",
      );
    ids.add(section.id);
    const itemIds = new Set<string>();
    for (const item of section.items) {
      if (itemIds.has(item.id))
        throw new Error("Item IDs must be unique within a section.");
      itemIds.add(item.id);
    }
  }
  const contactIds = new Set<string>();
  for (const link of site.contact.links) {
    if (contactIds.has(link.id)) throw new Error("Contact IDs must be unique.");
    contactIds.add(link.id);
    if (
      (link.value && !contactUrl(link)) ||
      (link.visible && (!link.label.trim() || !link.value.trim()))
    )
      throw new Error(
        `Check the label and destination for ${link.label || link.id}.`,
      );
  }
  if (
    !/^\d{1,3}% \d{1,3}%$/.test(site.profile.imagePosition) ||
    site.profile.imagePosition.split(" ").some((n) => parseInt(n) > 100)
  )
    throw new Error(
      "Photo crop position must contain two percentages from 0% to 100%, for example 50% 40%.",
    );
  if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(site.seo.language))
    throw new Error("Use a valid language code such as en or ar.");
  if (!site.seo.titleTemplate.includes("{title}"))
    throw new Error("The article title template must contain {title}.");
  if (/[<>"']/.test(site.seo.googleVerification))
    throw new Error(
      "Paste only the Google verification content value, not the complete HTML tag.",
    );
  for (const action of [
    site.profile.primaryAction,
    site.profile.secondaryAction,
  ]) {
    if (!site.profile.visible || !action.visible) continue;
    if (!action.label.trim() || !actionUrl(action.destination, site, "/"))
      throw new Error(
        "Visible introduction buttons need a label and valid destination.",
      );
    if (
      action.destination.startsWith("@") &&
      action.destination !== "@cv" &&
      !site.contact.links.some(
        (l) => l.id === action.destination.slice(1) && l.visible,
      )
    )
      throw new Error(
        "An introduction button points to a hidden or deleted contact link.",
      );
    if (
      action.destination.startsWith("#") &&
      action.destination !== "#home" &&
      !visibleSections(site).some((s) => "#" + s.id === action.destination)
    )
      throw new Error(
        "An introduction button points to a hidden, empty, or deleted section. Update its destination or hide the button.",
      );
  }
  const urls = [
    site.profile.image,
    site.profile.cv,
    site.branding.favicon,
    site.branding.socialImage,
  ];
  for (const section of site.sections)
    for (const item of section.items)
      urls.push(item.image, item.url, item.socialImage, item.canonicalUrl);
  if (urls.some((url) => url && !safeUrl(url)))
    throw new Error(
      "Use a valid https URL, a site anchor, or an uploaded file. Script and unsafe URLs are not allowed.",
    );
  try {
    const url = new URL(site.seo.siteUrl);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error();
  } catch {
    throw new Error(
      "Website URL must be an HTTPS address without a query or fragment.",
    );
  }
  if (site.seo.ga4Id && !/^G-[A-Z0-9]{4,20}$/.test(site.seo.ga4Id))
    throw new Error(
      "A GA4 measurement ID starts with G-, followed by letters and numbers.",
    );
  const slugs = new Set<string>();
  for (const article of allArticles(site)) {
    if (!article.title.trim() || !article.body.trim())
      throw new Error("Published articles need a title and article body.");
    if (!/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(article.slug))
      throw new Error(
        "Published articles need a URL slug made of words separated by hyphens.",
      );
    if (slugs.has(article.slug))
      throw new Error("Each published article needs its own unique URL slug.");
    slugs.add(article.slug);
  }
  for (const section of site.sections)
    for (const item of section.items) {
      if (item.status !== "published") continue;
      if (!item.title.trim() && section.type !== "testimonials")
        throw new Error(
          `Add a title to the published item in ${section.title}.`,
        );
      if (
        section.type === "certificates" &&
        (!item.image || !/^https?:\/\//.test(item.url))
      )
        throw new Error(
          "Published certificates need an image and an external verification URL.",
        );
      if (["websites", "instagram"].includes(section.type) && !item.url)
        throw new Error("Website and Instagram cards need a destination link.");
      if (section.type === "instagram" && !isInstagramUrl(item.url))
        throw new Error(
          "Instagram cards need a valid instagram.com profile or post URL.",
        );
    }
  return site;
}
export function localMediaPaths(site: SiteDocument): string[] {
  const { media: _media, ...content } = site;
  const paths = new Set<string>();
  const collect = (value: unknown) => {
    if (typeof value === "string") {
      if (/^uploads\/[a-zA-Z0-9._-]+$/.test(value)) paths.add(value);
      for (const match of value.matchAll(
        /!\[[^\]]*\]\((uploads\/[a-zA-Z0-9._-]+)(?:\s+"[^"]*")?\)/g,
      ))
        paths.add(match[1]);
    } else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object")
      Object.values(value).forEach(collect);
  };
  collect(content);
  return [...paths];
}
export function validateProject(project: ProjectConfig) {
  if (
    !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(project.owner) ||
    !/^[A-Za-z0-9_.-]{1,100}$/.test(project.repository)
  )
    throw new Error("Invalid GitHub repository configuration.");
  if (
    !/^[A-Za-z0-9][A-Za-z0-9_./-]*$/.test(project.branch) ||
    project.branch.includes("..") ||
    project.branch.endsWith("/")
  )
    throw new Error("Invalid branch configuration.");
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(project.basePath))
    throw new Error(
      "basePath must start and end with /, for example /portfolio/.",
    );
  return project;
}
export function isInstagramUrl(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      ["instagram.com", "www.instagram.com"].includes(u.hostname) &&
      /^\/(?:[A-Za-z0-9._-]+\/?|(?:p|reel|reels)\/[A-Za-z0-9_-]+\/?)$/.test(
        u.pathname,
      )
    );
  } catch {
    return false;
  }
}
export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
