import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { siteSchema, clone, newItem } from "../src/model";
import { validateDocument, localMediaPaths } from "../src/safe";
import { Portfolio } from "../src/portfolio";
import { stageFile } from "../src/admin/media";
import { sitemap, sitemapUrls, validateSitemapPages } from "../scripts/seo";
import { GitHubCMS } from "../src/github";
import { FakeGitHub } from "./fake-github";

const raw = JSON.parse(
  await readFile(new URL("./fixtures/site.json", import.meta.url), "utf8"),
);
const seed = siteSchema.parse(raw);

test("old documents load unchanged, with optional branding and splash defaults", () => {
  assert.equal(seed.branding.headerLogo, "");
  assert.equal(seed.splash.enabled, false);
  assert.deepEqual(seed.profile, raw.profile);
  assert.deepEqual(seed.contact, raw.contact);
  assert.deepEqual(seed.media, raw.media);
});

test("header displays the selected logo while server HTML retains content and a closed intro", () => {
  const site = clone(seed);
  site.branding.headerLogo = "uploads/logo.png";
  site.branding.headerLogoAlt = "Ali brand";
  site.splash = { ...site.splash, enabled: true, video: "uploads/intro.mp4" };
  const html = renderToString(
    createElement(Portfolio, { document: site, basePath: "/portfolio/" }),
  );
  assert.match(
    html,
    /class="header-logo" src="\/portfolio\/uploads\/logo.png" alt="Ali brand"/,
  );
  assert.match(html, /<main id="main">/);
  assert.match(html, /<dialog[^>]*class="splash-screen"/);
  assert.doesNotMatch(html, /<dialog[^>]*\sopen(?:=|[ >])/);
  assert.match(
    html,
    /<video[^>]*src="\/portfolio\/uploads\/intro.mp4"[^>]*muted/,
  );
  const preview = renderToString(
    createElement(Portfolio, {
      document: site,
      basePath: "/portfolio/",
      preview: true,
    }),
  );
  assert.doesNotMatch(preview, /<dialog/);
  assert.ok(localMediaPaths(site).includes("uploads/intro.mp4"));
  assert.ok(localMediaPaths(site).includes("uploads/logo.png"));
  site.splash.video = "javascript:alert(1).mp4";
  assert.throws(() => validateDocument(site), /unsafe URLs/);
});

test("video uploads validate file signatures, limits, and atomic CMS publication", async () => {
  const bytes = new Uint8Array([
    0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50,
  ]);
  const staged = await stageFile(
    new File([bytes], "intro.mp4", { type: "video/mp4" }),
  );
  assert.equal(staged.media.type, "video/mp4");
  assert.match(staged.upload.path, /\.mp4$/);
  URL.revokeObjectURL(staged.preview);
  await assert.rejects(
    stageFile(
      new File(["<script>bad</script>"], "intro.mp4", { type: "video/mp4" }),
    ),
    /Supported formats/,
  );
  await assert.rejects(
    stageFile(new File([new Uint8Array(8 * 1024 * 1024 + 1)], "large.mp4")),
    /8 MB/,
  );

  const api = new FakeGitHub(seed);
  const config = JSON.parse(
    await readFile(new URL("./fixtures/project.json", import.meta.url), "utf8"),
  );
  const client = new GitHubCMS(config, "fake-test-token", api.fetch);
  const snapshot = await client.load();
  const site = clone(snapshot.published);
  site.branding.headerLogo = site.branding.favicon;
  site.splash = { ...site.splash, enabled: true, video: staged.media.path };
  site.media.push(staged.media);
  await client.save("publish", site, snapshot, [staged.upload]);
  const published = JSON.parse(api.text("content/site.json")!);
  assert.equal(published.splash.video, staged.media.path);
  assert.ok(api.text(staged.upload.path));
  assert.deepEqual(published.sections, seed.sections);
  assert.deepEqual(published.contact, seed.contact);
  assert.deepEqual(published.media.slice(0, -1), seed.media);
});

test("sitemap contains generated canonical public pages only, never itself or technical assets", () => {
  const site = clone(seed);
  const pages = [
    { route: "/" },
    { route: "/articles/" },
    { route: "/404/", missing: true },
  ];
  validateSitemapPages(site, pages);
  assert.ok(
    sitemapUrls(site).every(
      (url) => !/sitemap|robots|admin|uploads|404/.test(url),
    ),
  );
  site.seo.siteUrl += "sitemap.xml";
  assert.throws(() => sitemap(site), /website root/);
  site.seo.siteUrl = seed.seo.siteUrl;
  const item = {
    ...newItem(),
    title: "Test",
    body: "Content",
    slug: "test",
    date: "2026-02-31",
  };
  site.sections.find((s) => s.type === "articles")!.items.push(item);
  assert.throws(
    () => validateSitemapPages(site, pages),
    /generated public page/,
  );
  assert.doesNotMatch(sitemap(site), /2026-02-31/);
  item.indexable = false;
  assert.doesNotMatch(sitemap(site), /articles\/test/);
  validateSitemapPages(site, pages);
  site.seo.indexable = false;
  assert.deepEqual(sitemapUrls(site), []);
});
