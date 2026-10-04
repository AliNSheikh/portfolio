import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cp,
  mkdtemp,
  readFile,
  writeFile,
  readdir,
  symlink,
  rm,
  access,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { newItem, newSection, siteSchema } from "../src/model";
import { verifySeoArtifact } from "../scripts/verify-seo";
const run = promisify(execFile),
  root = fileURLToPath(new URL("../", import.meta.url));

test("a complete production build creates crawlable HTML, rejects broken SEO artifacts, and removes stale pages", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "portfolio-build-check-"));
  try {
    for (const name of [
      "src",
      "content",
      "public",
      "scripts",
      "admin",
      "index.html",
      "vite.config.ts",
      "project.config.json",
      "package.json",
      "tsconfig.json",
    ])
      await cp(join(root, name), join(directory, name), { recursive: true });
    await cp(join(root, "tests/fixtures/project.json"), join(directory, "project.config.json"));
    await symlink(
      join(root, "node_modules"),
      join(directory, "node_modules"),
      "junction",
    );
    const document = siteSchema.parse(
        JSON.parse(
          await readFile(join(root, "tests/fixtures/site.json"), "utf8"),
        ),
      ),
      section = document.sections.find((s) => s.type === "articles")!,
      campaigns = document.sections.find((s) => s.type === "campaigns")!;
    document.profile.image = "";
    document.profile.cv = "";
    document.profile.secondaryAction.visible = false;
    document.branding.favicon = "";
    document.branding.socialImage = "";
    document.media = [];
    for (const s of document.sections)
      for (const i of s.items) {
        i.image = "";
        i.socialImage = "";
      }
    section.items = [
      {
        ...newItem(),
        title: "Build verification article",
        slug: "build-verification",
        body: "## Real article heading\n\nFull article content for crawlers.",
        seoTitle: "Article SEO title",
        seoDescription: "An article metadata verification.",
        date: "2026-09-07",
      },
      {
        ...newItem(),
        title: "دليل التسويق",
        slug: "دليل-التسويق",
        body: "محتوى المقال للتحقق من دعم اللغة العربية.",
      },
      {
        ...newItem(),
        title: "Unlisted article",
        slug: "unlisted",
        body: "Published but intentionally excluded from search.",
        indexable: false,
      },
      {
        ...newItem(),
        title: "DRAFT-LEAK-SENTINEL",
        slug: "draft-hidden",
        body: "DRAFT-BODY-SENTINEL",
        status: "draft",
      },
    ];
    campaigns.items = [
      {
        ...newItem(),
        title: "Build verification campaign",
        slug: "build-campaign",
        description: "Campaign metadata verification.",
        body: "Full campaign content for crawlers.",
        seoTitle: "Campaign SEO title",
        seoDescription: "A campaign metadata verification.",
        metrics: [{ label: "Leads", value: "64", unit: "" }],
        date: "2026-09-08",
      },
    ];
    const hidden = newSection("custom");
    hidden.visible = false;
    hidden.description = "HIDDEN-LEAK-SENTINEL";
    document.sections.push(hidden);
    await writeFile(
      join(directory, "content/site.json"),
      JSON.stringify(document),
    );
    await writeFile(
      join(directory, "content/draft.json"),
      JSON.stringify({ document: { secret: "SAVED-DRAFT-SENTINEL" } }),
    );
    const build = () =>
      run(
        process.execPath,
        ["--import", "tsx", join(directory, "scripts/build.ts")],
        { cwd: directory, maxBuffer: 2 * 1024 * 1024, timeout: 60000 },
      );
    await build();
    const article = await readFile(
      join(directory, "dist/articles/build-verification/index.html"),
      "utf8",
    );
    assert.match(article, /<title>Article SEO title<\/title>/);
    assert.match(article, /<h2>Real article heading<\/h2>/);
    assert.match(article, /Full article content for crawlers/);
    assert.match(
      article,
      /https:\/\/alinsheikh.github.io\/portfolio\/articles\/build-verification\//,
    );
    await access(join(directory, "dist/articles/دليل-التسويق/index.html"));
    const campaign = await readFile(
      join(directory, "dist/build-campaign/index.html"),
      "utf8",
    );
    assert.match(campaign, /<title>Campaign SEO title<\/title>/);
    assert.match(campaign, /Campaign metadata verification/);
    assert.match(campaign, /Full campaign content for crawlers/);
    assert.match(
      campaign,
      /https:\/\/alinsheikh.github.io\/portfolio\/build-campaign\//,
    );
    const home = await readFile(join(directory, "dist/index.html"), "utf8");
    assert.ok(!home.includes("<!--app-->"));
    assert.match(home, /href="\/portfolio\/articles\/build-verification\/"/);
    assert.match(home, /href="\/portfolio\/build-campaign\/"/);
    const admin = await readFile(
      join(directory, "dist/admin/index.html"),
      "utf8",
    );
    assert.match(admin, /noindex,nofollow/);
    assert.match(admin, /Content-Security-Policy/);
    const walk = async (path: string): Promise<string[]> => {
      const entries = await readdir(path, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const full = join(path, entry.name);
        if (entry.isDirectory()) files.push(...(await walk(full)));
        else files.push(full);
      }
      return files;
    };
    for (const path of await walk(join(directory, "dist")))
      if (/\.(html|js|json|xml)$/.test(path))
        assert.ok(
          !(await readFile(path, "utf8")).includes("SENTINEL"),
          "Draft leaked into " + path,
        );
    const builtSitemap = await readFile(
      join(directory, "dist/sitemap.xml"),
      "utf8",
    );
    assert.ok(
      builtSitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'),
    );
    assert.match(builtSitemap, /build-verification/);
    assert.match(builtSitemap, /build-campaign/);
    assert.match(
      await readFile(join(directory, "dist/sitemap.txt"), "utf8"),
      /build-campaign/,
    );
    await access(join(directory, "dist/.nojekyll"));
    assert.doesNotMatch(builtSitemap, /unlisted/);
    const project = JSON.parse(await readFile(join(directory, "project.config.json"), "utf8"));
    const dist = join(directory, "dist");
    const verify = () => verifySeoArtifact(document, project, dist);
    const broken = async (name: string, file: string, change: (value: string) => string | null) => {
      await t.test(name, async () => {
        const path = join(dist, file), original = await readFile(path, "utf8");
        try {
          const replacement = change(original);
          if (replacement === null) await rm(path);
          else await writeFile(path, replacement);
          await assert.rejects(verify);
        } finally {
          await writeFile(path, original);
        }
      });
    };
    const inject = (url: string) => (xml: string) => xml.replace("</urlset>", `<url><loc>${url}</loc></url></urlset>`);
    await broken("missing sitemap fails", "sitemap.xml", () => null);
    await broken("empty sitemap fails", "sitemap.xml", () => "");
    await broken("malformed XML fails", "sitemap.xml", (xml) => xml.replace("</loc>", "</broken>"));
    await broken("HTML fallback in place of XML fails", "sitemap.xml", () => home);
    await broken("localhost URL fails", "sitemap.xml", inject("http://localhost:5173/portfolio/"));
    await broken("external domain fails", "sitemap.xml", inject("https://example.com/portfolio/"));
    await broken("missing project base path fails", "sitemap.xml", inject("https://alinsheikh.github.io/"));
    await broken("admin URL fails", "sitemap.xml", inject(project.siteUrl + "admin/"));
    await broken("noindex URL fails", "sitemap.xml", inject(project.siteUrl + "articles/unlisted/"));
    await broken("duplicate URL fails", "sitemap.xml", inject(project.siteUrl));
    await broken("missing canonical homepage fails", "sitemap.xml", (xml) => xml.replace(/<url>\s*<loc>[^<]+<\/loc>\s*<\/url>/, ""));
    await broken("missing static article fails", "articles/build-verification/index.html", () => null);
    await broken("unexpected noindex fails", "index.html", (html) => html.replace('content="index, follow"', 'content="noindex, follow"'));
    await broken("incorrect canonical fails", "index.html", (html) => html.replace(`rel="canonical" href="${project.siteUrl}"`, 'rel="canonical" href="https://alinsheikh.github.io/"'));
    await broken("duplicate canonical fails", "index.html", (html) => html.replace("</head>", `<link rel="canonical" href="${project.siteUrl}"></head>`));
    await broken("empty campaign description fails", "build-campaign/index.html", (html) => html.replace(/name="description" content="[^"]*"/, 'name="description" content=""'));
    await broken("incorrect asset base path fails", "index.html", (html) => html.replaceAll("/portfolio/assets/", "/assets/"));
    await broken("robots blocking public pages fails", "robots.txt", (text) => text.replace("Disallow: /portfolio/admin/", "Disallow: /"));
    await broken("wrong sitemap discovery URL fails", "robots.txt", (text) => text.replace("/portfolio/sitemap.xml", "/sitemap.xml"));
    await verify();
    // The standalone CI command must check the existing artifact without rebuilding it.
    await run(process.execPath, ["--import", "tsx", "scripts/verify-seo.ts"], { cwd: directory });
    document.profile.image = "";
    document.profile.cv = "";
    document.profile.secondaryAction.visible = false;
    document.branding.favicon = "";
    document.branding.socialImage = "";
    document.media = [];
    for (const s of document.sections)
      for (const i of s.items) {
        i.image = "";
        i.socialImage = "";
      }
    section.items = [];
    campaigns.items = [];
    await writeFile(
      join(directory, "content/site.json"),
      JSON.stringify(document),
    );
    await build();
    await assert.rejects(() =>
      access(join(directory, "dist/articles/build-verification/index.html")),
    );
    assert.ok(
      !(await readFile(join(directory, "dist/sitemap.xml"), "utf8")).includes(
        "build-verification",
      ),
    );
    await assert.rejects(() =>
      access(join(directory, "dist/build-campaign/index.html")),
    );
    assert.ok(
      !(await readFile(join(directory, "dist/sitemap.xml"), "utf8")).includes(
        "build-campaign",
      ),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
