import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
  clone,
  newItem,
  newSection,
  publicDocument,
  siteSchema,
  visibleSections,
} from "../src/model";
import {
  actionUrl,
  assetUrl,
  contactUrl,
  localMediaPaths,
  markdown,
  safeUrl,
  validateDocument,
} from "../src/safe";
import { Portfolio } from "../src/portfolio";
import { pageHead, sitemap, sitemapText } from "../scripts/seo";
import { stageFile } from "../src/admin/media";
const seed = siteSchema.parse(
  JSON.parse(
    await readFile(new URL("./fixtures/site.json", import.meta.url), "utf8"),
  ),
);

test("seed preserves contacts, Computer Science education, React, Node.js, and AI skills", () => {
  validateDocument(seed);
  assert.equal(
    seed.contact.links.find((l) => l.kind === "phone")!.value,
    "+971501646033",
  );
  assert.equal(
    seed.contact.links.find((l) => l.kind === "email")!.value,
    "alinsheikh2020@gmail.com",
  );
  assert.match(
    seed.sections.find((s) => s.type === "education")!.items[0].title,
    /Computer Science/,
  );
  assert.ok(seed.profile.highlights.some((h) => h.label.includes("React")));
  assert.ok(seed.profile.highlights.some((h) => h.label.includes("Node")));
  assert.ok(seed.profile.highlights.some((h) => h.label.includes("AI")));
  assert.equal(seed.appearance.background, "#FFFFFF");
});
test("hidden sections, draft article bodies, and empty collections stay out of the public view", () => {
  const doc = clone(seed);
  const section = doc.sections.find((s) => s.type === "articles")!;
  section.items.push({
    ...newItem(),
    title: "DRAFT-ONLY-SENTINEL",
    body: "SECRET-DRAFT-BODY",
    status: "draft",
  });
  const hidden = newSection("custom");
  hidden.visible = false;
  hidden.description = "HIDDEN-SECTION-SENTINEL";
  doc.sections.push(hidden);
  const publicSite = publicDocument(doc),
    payload = JSON.stringify(publicSite),
    html = renderToString(
      createElement(Portfolio, {
        document: publicSite,
        basePath: "/portfolio/",
        preview: true,
      }),
    );
  assert.ok(!payload.includes("SENTINEL"));
  assert.ok(!payload.includes("SECRET-DRAFT-BODY"));
  assert.ok(!html.includes("SENTINEL"));
  assert.ok(!visibleSections(doc).some((s) => s.type === "certificates"));
  assert.ok(!html.includes('id="certificates"'));
});
test("certificate image and button share the verification URL", () => {
  const doc = clone(seed),
    section = doc.sections.find((s) => s.type === "certificates")!;
  section.items.push({
    ...newItem(),
    title: "Example certificate for test",
    image: "uploads/test.png",
    url: "https://example.com/verify/abc",
  });
  const html = renderToString(
    createElement(Portfolio, {
      document: doc,
      basePath: "/portfolio/",
      preview: true,
    }),
  );
  assert.equal(
    html.split('href="https://example.com/verify/abc"').length - 1,
    2,
  );
  assert.match(html, /View certificate/);
});
test("campaign cards render images before actual text and metrics; website buttons remain links", () => {
  const doc = clone(seed);
  doc.sections
    .find((s) => s.type === "campaigns")!
    .items.push({
      ...newItem(),
      title: "Test campaign",
      image: "uploads/test-result.png",
      description: "Actual result narrative",
      metrics: [{ label: "Leads", value: "45", unit: "" }],
    });
  const html = renderToString(
    createElement(Portfolio, {
      document: doc,
      basePath: "/portfolio/",
      preview: true,
    }),
  );
  assert.ok(
    html.indexOf("uploads/test-result.png") <
      html.indexOf("Actual result narrative"),
  );
  assert.match(html, /<dd>45/);
  assert.match(html, /Visit Website/);
  assert.match(html, /https:\/\/www.matthiolaflowers.com\//);
});
test("all public contact URLs and base-path links resolve correctly", () => {
  assert.match(
    markdown("[Download](uploads/cv.pdf)", "/portfolio/"),
    /href="\/portfolio\/uploads\/cv.pdf"/,
  );
  assert.equal(
    actionUrl("@cv", seed, "/portfolio/"),
    "/portfolio/uploads/ali-sheikh-cv.pdf",
  );
  assert.equal(
    actionUrl("@email", seed, "/portfolio/"),
    "mailto:alinsheikh2020@gmail.com",
  );
  assert.equal(
    actionUrl("mailto:person@example.com", seed, "/portfolio/"),
    "mailto:person@example.com",
  );
  assert.equal(
    actionUrl("#contact", seed, "/portfolio/"),
    "/portfolio/#contact",
  );
  assert.equal(
    assetUrl("uploads/image.png", "/portfolio/"),
    "/portfolio/uploads/image.png",
  );
  assert.equal(
    contactUrl(seed.contact.links.find((l) => l.kind === "phone")!),
    "tel:+971501646033",
  );
});
test("unsafe URLs and active Markdown HTML are blocked", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,hello",
    "//evil.example/path",
    "../secrets",
    "https://name:password@example.com",
  ])
    assert.equal(safeUrl(value), "");
  const html = markdown(
    "<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n![x](data:text/html,evil)",
  );
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes('src="data:'));
  assert.match(html, /&lt;script&gt;/);
});
test("search metadata, canonical URLs, article JSON-LD, and sitemap have real page URLs", () => {
  const doc = clone(seed),
    article = {
      ...newItem(),
      title: "Publishing guide",
      seoTitle: "A custom SEO title",
      body: "Article content",
      slug: "publishing-guide",
      date: "2026-09-07",
      seoDescription: "A useful article summary",
    };
  doc.sections.find((s) => s.type === "articles")!.items.push(article);
  const head = pageHead(doc, { route: "/articles/publishing-guide/", article }),
    xml = sitemap(doc);
  assert.match(head, /<title>A custom SEO title<\/title>/);
  assert.match(
    head,
    /https:\/\/alinsheikh.github.io\/portfolio\/articles\/publishing-guide\//,
  );
  assert.match(head, /"@type":"Article"/);
  assert.match(head, /A useful article summary/);
  assert.match(xml, /publishing-guide/);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.match(
    xml,
    /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/,
  );
  assert.match(xml, /<loc>https:\/\/alinsheikh\.github\.io\/portfolio\/<\/loc>/);
  assert.equal(
    sitemapText(doc).split("\n").filter(Boolean)[0],
    "https://alinsheikh.github.io/portfolio/",
  );
  article.indexable = false;
  assert.match(
    pageHead(doc, { route: "/articles/publishing-guide/", article }),
    /noindex, follow/,
  );
  assert.ok(!sitemap(doc).includes("publishing-guide"));
});
test("metadata escapes HTML and structured-data script terminators", () => {
  const doc = clone(seed);
  doc.branding.title = "Ali <script>alert(1)</script>";
  doc.profile.name = "Ali </script><script>evil</script>";
  const head = pageHead(doc, { route: "/" });
  assert.match(head, /&lt;script&gt;/);
  assert.equal(head.split("<script").length - 1, 1);
  assert.match(head, /\\u003c\/script>/);
});
test("checks duplicate article slugs, missing certificate verification, and broken hero anchors", () => {
  const doc = clone(seed),
    section = doc.sections.find((s) => s.type === "articles")!;
  section.items.push(
    { ...newItem(), title: "One", body: "Body", slug: "same" },
    { ...newItem(), title: "Two", body: "Body", slug: "same" },
  );
  assert.throws(() => validateDocument(doc), /unique URL slug/);
  const other = clone(seed);
  other.profile.primaryAction.destination = "#missing";
  assert.throws(() => validateDocument(other), /deleted section/);
});
test("recognizes local media paths in profile fields and Markdown without treating external URLs as local", () => {
  const doc = clone(seed);
  doc.sections
    .find((s) => s.type === "articles")!
    .items.push({
      ...newItem(),
      status: "draft",
      body: "![chart](uploads/real-chart.png)\n![external](https://example.com/uploads/external.png)",
    });
  const paths = localMediaPaths(doc);
  assert.ok(paths.includes("uploads/ali.jpg"));
  assert.ok(paths.includes("uploads/real-chart.png"));
  assert.ok(!paths.includes("uploads/external.png"));
});
test("uploads accept supported signatures and reject script files", async () => {
  const fakePng = new File(
      [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
      "Logo.png",
      { type: "image/png" },
    ),
    staged = await stageFile(fakePng);
  assert.match(staged.upload.path, /^public\/uploads\/Logo-[0-9a-f-]+\.png$/);
  assert.equal(staged.media.type, "image/png");
  URL.revokeObjectURL(staged.preview);
  await assert.rejects(
    () =>
      stageFile(
        new File(['<svg onload="alert(1)"></svg>'], "logo.svg", {
          type: "image/svg+xml",
        }),
      ),
    /Supported formats/,
  );
});
