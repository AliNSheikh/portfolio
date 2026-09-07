import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { publicDocument, type ProjectConfig } from "../src/model";
import { validateDocument, validateProject } from "../src/safe";
export async function prepare() {
  const project = validateProject(
    JSON.parse(await readFile("project.config.json", "utf8")) as ProjectConfig,
  );
  const site = validateDocument(
    JSON.parse(await readFile("content/site.json", "utf8")),
  );
  const configured = new URL(project.siteUrl),
    canonical = new URL(site.seo.siteUrl);
  if (
    configured.pathname !== project.basePath ||
    canonical.pathname !== project.basePath
  )
    throw new Error(
      "project.config.json basePath and the website URL must have the same path. For this repository use /portfolio/.",
    );
  await mkdir("src/generated", { recursive: true });
  await writeFile(
    "src/generated/public-data.json",
    JSON.stringify(publicDocument(site)),
  );
  return { site: publicDocument(site), project };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await prepare();
