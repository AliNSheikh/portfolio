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
const run = promisify(execFile),
  root = fileURLToPath(new URL("../", import.meta.url));

test("a complete production build creates article HTML and excludes drafts; deletion removes stale pages", async () => {
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
      section = document.sections.find((s) => s.type === "articles")!;
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
        title: "DRAFT-LEAK-SENTINEL",
        slug: "draft-hidden",
        body: "DRAFT-BODY-SENTINEL",
        status: "draft",
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
    const home = await readFile(join(directory, "dist/index.html"), "utf8");
    assert.ok(!home.includes("<!--app-->"));
    assert.match(home, /href="\/portfolio\/articles\/build-verification\/"/);
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
    assert.match(
      await readFile(join(directory, "dist/sitemap.txt"), "utf8"),
      /build-verification/,
    );
    await access(join(directory, "dist/.nojekyll"));
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
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
