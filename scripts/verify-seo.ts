import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SaxesParser } from "saxes";
import { publicDocument, type ProjectConfig, type SiteDocument } from "../src/model";
import { validateDocument, validateProject } from "../src/safe";
import { generatedPages, pageIsIndexable, robots, validateProductionUrls } from "./seo";

const namespace = "http://www.sitemaps.org/schemas/sitemap/0.9";

/** Parse the finished XML, not a regex or the generator's in-memory URL list. */
export function parseSitemap(xml: string): string[] {
  assert(xml.trim(), "sitemap.xml is empty");
  assert(Buffer.byteLength(xml) <= 50 * 1024 * 1024, "Sitemap exceeds 50 MB");
  const parser = new SaxesParser({ xmlns: true });
  const stack: string[] = [], urls: string[] = [];
  let fields = new Map<string, string>();
  parser.on("doctype", () => { throw new Error("Sitemaps must not contain a DOCTYPE"); });
  parser.on("xmldecl", (declaration) => {
    assert(!declaration.encoding || /^utf-8$/i.test(declaration.encoding), "Sitemap must use UTF-8");
  });
  parser.on("opentag", (tag) => {
    assert.equal(tag.uri, namespace, "Incorrect sitemap XML namespace");
    if (!stack.length) assert.equal(tag.local, "urlset", "Sitemap root must be urlset");
    else if (stack.length === 1) {
      assert.equal(tag.local, "url", "urlset must contain url elements");
      fields = new Map();
    } else {
      assert(stack.length === 2 && ["loc", "lastmod", "changefreq", "priority"].includes(tag.local), "Invalid sitemap element");
      assert(!fields.has(tag.local), `Repeated sitemap field: ${tag.local}`);
      fields.set(tag.local, "");
    }
    stack.push(tag.local);
  });
  const text = (value: string) => {
    if (stack.length === 3) {
      const key = stack[2];
      fields.set(key, fields.get(key)! + value);
    } else assert(!value.trim(), "Unexpected text outside a sitemap field");
  };
  parser.on("text", text);
  parser.on("cdata", text);
  parser.on("closetag", (tag) => {
    if (tag.local === "url") {
      const loc = fields.get("loc");
      assert(loc && loc === loc.trim() && loc.length < 2048, "Each sitemap URL requires a nonempty, absolute loc under 2048 characters");
      urls.push(loc);
    }
    stack.pop();
  });
  // Saxes throws on malformed XML, undeclared entities, and mismatched tags.
  parser.write(xml).close();
  assert(urls.length <= 50000, "Sitemap exceeds 50,000 URLs");
  assert.equal(new Set(urls).size, urls.length, "Sitemap contains duplicate URLs");
  return urls;
}

function decode(value: string) {
  const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'" };
  return value.replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, entity: string) => entities[entity]);
}

// The build owns these quoted HTML tags. This only reads head metadata;
// it is not an HTML/XML validity parser or a replacement for the XML parser.
function tags(html: string, name: string) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map(([tag]) =>
    Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)]
      .map(([, key, , value]) => [key.toLowerCase(), decode(value)])),
  );
}

async function nonemptyFile(path: string) {
  const value = await readFile(path, "utf8");
  assert(value.trim(), `${path} is empty`);
  return value;
}

export async function verifySeoArtifact(site: SiteDocument, project: ProjectConfig, directory = "dist") {
  validateProductionUrls(project, site);
  const root = new URL(project.siteUrl);
  const pages = generatedPages(site);
  assert.equal(new Set(pages.map((page) => page.route)).size, pages.length, "Duplicate generated page routes");
  const expected = new Set(pages.filter((page) => pageIsIndexable(site, page))
    .map((page) => new URL(page.route.slice(1), root).href));
  const urls = parseSitemap(await nonemptyFile(join(directory, "sitemap.xml")));
  for (const entry of urls) {
    const url = new URL(entry);
    const relative = url.pathname.slice(root.pathname.length);
    assert(url.protocol === "https:" && url.origin === root.origin &&
      url.pathname.startsWith(root.pathname) && !url.username && !url.password &&
      !url.search && !url.hash && url.href === entry,
    `Sitemap URL is outside the production site: ${entry}`);
    assert(!/(?:^|\/)(?:admin|dashboard|login|api|404|assets|uploads|content)(?:\/|$)/i.test(relative) &&
      !/\.[a-z0-9]+\/?$/i.test(relative), `Sitemap contains a private or technical URL: ${entry}`);
    assert(expected.has(entry), `Sitemap URL is not an indexable generated page: ${entry}`);
  }
  assert.deepEqual(new Set(urls), expected, "Sitemap must contain every indexable generated page, including the homepage");
  assert.equal(await nonemptyFile(join(directory, "robots.txt")), robots(project),
    "robots.txt must allow public crawling, disallow only admin, and reference the production sitemap");

  const titles = new Set<string>();
  for (const page of pages) {
    const file = page.missing ? "404.html" : join(decodeURIComponent(page.route), "index.html");
    const html = await nonemptyFile(join(directory, file));
    assert(/^<!doctype html>/i.test(html.trim()) && /<\/html>\s*$/i.test(html), `${file}: incomplete HTML document`);
    assert(!html.includes("<!--site-head-->") && !html.includes("<!--app-->"), `${file}: unrendered HTML shell`);
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1].replace(/<!--[\s\S]*?-->/g, "");
    assert(head, `${file}: missing head`);
    assert(!/https?:\/\/(?:localhost|127\.[\d.]+|0\.0\.0\.0|\[::1\])(?=[:/"\s])/i.test(head), `${file}: development URL in SEO metadata`);
    const one = (values: string[], label: string) => {
      assert(values.length === 1 && values[0]?.trim(), `${file}: expected one nonempty ${label}`);
      return values[0];
    };
    const meta = tags(head, "meta");
    const value = (name: string) => one(meta.filter((tag) => tag.name === name || tag.property === name)
      .map((tag) => tag.content), name);
    const title = one([...head.matchAll(/<title>([\s\S]*?)<\/title>/gi)].map((match) => decode(match[1])), "title");
    const description = value("description");
    const indexable = pageIsIndexable(site, page);
    const directives = value("robots").toLowerCase().split(/[\s,]+/);
    assert(directives.includes(indexable ? "index" : "noindex") && directives.includes("follow") &&
      !directives.includes(indexable ? "noindex" : "index") && !directives.includes("nofollow"), `${file}: incorrect robots directive`);
    const canonical = one(tags(head, "link").filter((tag) => tag.rel === "canonical").map((tag) => tag.href), "canonical");
    const ownUrl = new URL(page.route.slice(1), root).href;
    if (indexable) {
      assert.equal(canonical, ownUrl, `${file}: indexable pages must use their own production canonical URL`);
      assert(!titles.has(title), `${file}: duplicate public page title`);
      titles.add(title);
    }
    assert.equal(value("og:url"), canonical, `${file}: Open Graph URL disagrees with canonical`);
    assert.equal(value("og:title"), title, `${file}: Open Graph title disagrees with title`);
    assert.equal(value("og:description"), description, `${file}: empty or inconsistent Open Graph description`);
    const schemas = [...head.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    assert(schemas.length, `${file}: missing JSON-LD`);
    const checkSchema = (node: unknown, key = "") => {
      if (typeof node === "string" && ["url", "mainEntityOfPage", "image"].includes(key)) {
        const url = new URL(node);
        assert(url.protocol === "https:" || url.protocol === "http:", `${file}: invalid JSON-LD URL`);
        if (url.origin === root.origin)
          assert(url.pathname.startsWith(root.pathname), `${file}: JSON-LD URL is missing the project base path`);
      } else if (Array.isArray(node)) node.forEach((item) => checkSchema(item, key));
      else if (node && typeof node === "object")
        Object.entries(node).forEach(([name, item]) => checkSchema(item, name));
    };
    schemas.forEach((match) => checkSchema(JSON.parse(match[1])));

    // Static JS/CSS references must resolve inside the deployed project.
    const assets = [
      ...tags(head, "script").filter((tag) => tag.type === "module").map((tag) => tag.src),
      ...tags(head, "link").filter((tag) => ["stylesheet", "modulepreload"].includes(tag.rel)).map((tag) => tag.href),
    ];
    assert(assets.length, `${file}: missing production assets`);
    for (const asset of assets) {
      assert(asset?.startsWith(project.basePath + "assets/") && !asset.includes("/src/"), `${file}: invalid production asset path: ${asset}`);
      assert((await stat(join(directory, asset.slice(project.basePath.length)))).isFile(), `${file}: missing asset ${asset}`);
    }
  }
  const admin = await nonemptyFile(join(directory, "admin/index.html"));
  assert(tags(admin, "meta").some((tag) => tag.name === "robots" && /\bnoindex\b/.test(tag.content)), "Admin must remain noindex");
  console.log(`SEO verified: ${urls.length} canonical sitemap URLs, static HTML, robots.txt, and project assets.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Read only: CI rechecks the artifact it will upload without regenerating it.
  const project = validateProject(JSON.parse(await readFile("project.config.json", "utf8")));
  const site = publicDocument(validateDocument(JSON.parse(await readFile("content/site.json", "utf8"))));
  await verifySeoArtifact(site, project);
}
