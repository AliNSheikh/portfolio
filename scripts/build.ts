import { build } from "vite";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Portfolio } from "../src/portfolio";
import { allArticles, allCampaigns } from "../src/model";
import { escapeHtml, localMediaPaths } from "../src/safe";
import { prepare } from "./prepare";
import {
  pageHead,
  generatedPages,
  robots,
  sitemap,
  sitemapText,
  validateSitemapPages,
} from "./seo";
import { verifySeoArtifact } from "./verify-seo";

const { site, project } = await prepare();
for (const path of localMediaPaths(site)) {
  try {
    await access(join("public", path));
  } catch {
    throw new Error(`Missing uploaded file: public/${path}`);
  }
}
await build();
const shell = await readFile("dist/index.html", "utf8");
const pages = generatedPages(site);
validateSitemapPages(site, pages);
for (const page of pages) {
  const html = shell
    .replace(
      '<html lang="en">',
      `<html lang="${escapeHtml(site.seo.language || "en")}">`,
    )
    .replace("<!--site-head-->", () => pageHead(site, page))
    .replace("<!--app-->", () =>
      renderToString(
        createElement(Portfolio, {
          document: site,
          basePath: project.basePath,
          route: page.route,
          preview: false,
        }),
      ),
    );
  const output = page.missing
    ? "dist/404.html"
    : join("dist", decodeURIComponent(page.route), "index.html");
  await mkdir(join(output, ".."), { recursive: true });
  await writeFile(output, html);
}
await writeFile("dist/sitemap.xml", sitemap(site), "utf8");
await writeFile("dist/sitemap.txt", sitemapText(site), "utf8");
await writeFile("dist/robots.txt", robots(project), "utf8");
await writeFile("dist/.nojekyll", "", "utf8");
await verifySeoArtifact(site, project);
console.log(
  `Built portfolio, admin panel, ${allArticles(site).length} article pages, and ${allCampaigns(site).length} campaign pages. No drafts are copied into dist.`,
);
