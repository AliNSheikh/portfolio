import { createRoot, hydrateRoot } from "react-dom/client";
import { Portfolio } from "./portfolio";
import data from "./generated/public-data.json";
import project from "../project.config.json";
import { siteSchema } from "./model";
import "./site.css";
const site = siteSchema.parse(data);
const path = window.location.pathname;
const base = project.basePath;
const route = path.startsWith(base) ? "/" + path.slice(base.length) : "/404/";
const root = document.getElementById("root")!;
const app = (
  <Portfolio
    document={site}
    basePath={base}
    route={route === "//" ? "/" : route}
  />
);
if (root.querySelector(".portfolio")) hydrateRoot(root, app);
else createRoot(root).render(app);
