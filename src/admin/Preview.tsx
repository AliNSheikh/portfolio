import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Monitor, Smartphone, Tablet, X } from "lucide-react";
import { Portfolio } from "../portfolio";
import { allArticles, type SiteDocument } from "../model";
import stylesheet from "../site.css?url";

export function Preview({
  site,
  basePath,
  mediaOverrides,
  onClose,
}: {
  site: SiteDocument;
  basePath: string;
  mediaOverrides: Record<string, string>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    frame = useRef<HTMLIFrameElement>(null);
  const [width, setWidth] = useState("100%"),
    [target, setTarget] = useState<HTMLElement | null>(null),
    [route, setRoute] = useState("/");
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  const srcDoc =
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><link rel="stylesheet" href="' +
    stylesheet +
    '"></head><body><div id="preview-root"></div></body></html>';
  return (
    <dialog ref={dialog} className="preview-dialog" onCancel={onClose}>
      <div className="preview-toolbar">
        <div>
          <strong>Website preview</strong>
          <span>Unsaved changes included · draft items hidden</span>
        </div>
        <div className="preview-devices">
          <button
            className={"icon-button " + (width === "100%" ? "active" : "")}
            onClick={() => setWidth("100%")}
            aria-label="Desktop preview"
          >
            <Monitor size={20} />
          </button>
          <button
            className={"icon-button " + (width === "768px" ? "active" : "")}
            onClick={() => setWidth("768px")}
            aria-label="Tablet preview"
          >
            <Tablet size={20} />
          </button>
          <button
            className={"icon-button " + (width === "390px" ? "active" : "")}
            onClick={() => setWidth("390px")}
            aria-label="Mobile preview"
          >
            <Smartphone size={20} />
          </button>
        </div>
        <label className="sr-only" htmlFor="preview-page">
          Preview page
        </label>
        <select
          id="preview-page"
          value={route}
          onChange={(e) => setRoute(e.target.value)}
        >
          <option value="/">Home page</option>
          <option value="/articles/">All articles</option>
          {allArticles(site)
            .filter((a) => a.slug)
            .map((a) => (
              <option
                value={"/articles/" + encodeURIComponent(a.slug) + "/"}
                key={a.id}
              >
                {a.title}
              </option>
            ))}
        </select>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close preview"
        >
          <X />
        </button>
      </div>
      <div className="preview-stage">
        <iframe
          ref={frame}
          title="Portfolio preview"
          srcDoc={srcDoc}
          sandbox="allow-same-origin"
          style={{ width }}
          onLoad={() => {
            const d = frame.current?.contentDocument;
            if (!d) return;
            d.addEventListener("click", (event) => {
              const anchor = (event.target as Element).closest("a");
              if (!anchor) return;
              event.preventDefault();
              const href = anchor.getAttribute("href") || "";
              if (href.includes("#")) {
                setRoute("/");
                setTimeout(
                  () =>
                    d
                      .getElementById(href.split("#")[1])
                      ?.scrollIntoView({ behavior: "smooth" }),
                  60,
                );
                return;
              }
              if (href === basePath) setRoute("/");
              if (href.startsWith(basePath + "articles/")) {
                setRoute("/" + href.slice(basePath.length));
              }
            });
            setTarget(d.getElementById("preview-root"));
          }}
        />
        {target &&
          createPortal(
            <Portfolio
              document={site}
              basePath={basePath}
              route={route}
              preview
              mediaOverrides={mediaOverrides}
            />,
            target,
          )}
      </div>
      <p className="preview-note">
        External links and live embeds are disabled in this preview. Publish to
        view them on the website.
      </p>
    </dialog>
  );
}
