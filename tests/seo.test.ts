import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { clone, newItem, siteSchema } from "../src/model";
import { pageHead, validateProductionUrls } from "../scripts/seo";
import { parseSitemap } from "../scripts/verify-seo";

const project = JSON.parse(await readFile(new URL("./fixtures/project.json", import.meta.url), "utf8"));
const seed = siteSchema.parse(JSON.parse(await readFile(new URL("./fixtures/site.json", import.meta.url), "utf8")));

test("deployment URL validation catches domain drift, insecure roots, and a missing project base", () => {
  validateProductionUrls(project, seed);
  for (const url of ["https://example.com/portfolio/", "http://alinsheikh.github.io/portfolio/", "https://alinsheikh.github.io/", "https://localhost/portfolio/"]) {
    const site = clone(seed);
    site.seo.siteUrl = url;
    assert.throws(() => validateProductionUrls(project, site));
  }
  const rootSite = clone(seed);
  rootSite.seo.siteUrl = "https://alinsheikh.github.io/";
  assert.throws(() => validateProductionUrls({ ...project, siteUrl: rootSite.seo.siteUrl, basePath: "/" }, rootSite));
});

test("an image-only campaign has nonempty description and Open Graph metadata without changing content", () => {
  const item = { ...newItem(), title: "Campaign results ", image: "uploads/campaign.png" };
  const head = pageHead(seed, { route: "/campaign-results/", campaign: item });
  assert.match(head, /name="description" content="Campaign results\. /);
  assert.match(head, /property="og:description" content="Campaign results\. /);
  assert.match(head, /<title>Campaign results \| Ali Sheikh<\/title>/);
  assert.equal(item.description, "");
  assert.equal(item.title, "Campaign results ");
});

test("sitemap parsing is strict XML with the standard namespace and one loc per entry", () => {
  const xml = (entry: string) => `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entry}</urlset>`;
  assert.deepEqual(parseSitemap(xml(`<url><loc>${project.siteUrl}</loc></url>`)), [project.siteUrl]);
  for (const entry of [
    "<url><loc>unterminated</url>",
    "<url><loc>https://example.com/?a=1&b=2</loc></url>",
    "<url><loc>https://example.com/&unknown;</loc></url>",
    "<url><loc></loc></url>",
    "<url><lastmod>2026-10-03</lastmod></url>",
    `<url><loc>${project.siteUrl}</loc><loc>${project.siteUrl}</loc></url>`,
  ]) assert.throws(() => parseSitemap(xml(entry)));
  assert.throws(() => parseSitemap("<urlset><url><loc>https://example.com/</loc></url></urlset>"));
  assert.throws(() => parseSitemap('<!DOCTYPE urlset SYSTEM "https://example.com/schema.dtd">' + xml("")));
});
