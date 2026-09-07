import { build } from "vite";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Portfolio } from "../src/portfolio";
import { allArticles } from "../src/model";
import { escapeHtml, localMediaPaths } from "../src/safe";
import { prepare } from "./prepare";
import { pageHead, sitemap, type Page } from "./seo";

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
const pages: Page[] = [
  { route: "/" },
  { route: "/articles/" },
  ...allArticles(site).map((article) => ({
    route: "/articles/" + encodeURIComponent(article.slug) + "/",
    article,
  })),
  { route: "/404/", missing: true },
];
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
await writeFile("dist/sitemap.xml", sitemap(site));
await writeFile(
  "dist/robots.txt",
  `User-agent: *\n${site.seo.indexable ? `Disallow: ${project.basePath}admin/` : "Disallow: /"}\nSitemap: ${new URL("sitemap.xml", site.seo.siteUrl).href}\n`,
);
await writeFile("dist/.nojekyll", "");
console.log(
  `Built portfolio, admin panel, and ${allArticles(site).length} published article pages. No drafts are copied into dist.`,
);
