import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  Quote,
  X,
} from "lucide-react";
import { Icon } from "./icons";
import {
  allArticles,
  publicDocument,
  visibleSections,
  type ContentItem,
  type Section,
  type SiteDocument,
} from "./model";
import {
  actionUrl,
  articlePath,
  assetUrl,
  contactUrl,
  dateLabel,
  isInstagramUrl,
  markdown,
  readingTime,
  safeUrl,
} from "./safe";

type Context = {
  site: SiteDocument;
  basePath: string;
  preview: boolean;
  image: (path: string) => string;
};
const SiteContext = createContext<Context>(null!);
const useSite = () => useContext(SiteContext);
const label = (site: SiteDocument, key: string, fallback: string) =>
  site.branding.labels[key] || fallback;
function RichText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const { basePath } = useSite();
  return text ? (
    <div
      dir="auto"
      className={"prose " + className}
      dangerouslySetInnerHTML={{ __html: markdown(text, basePath) }}
    />
  ) : null;
}
function OutLink({
  href,
  children,
  className = "",
  newTab = true,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  newTab?: boolean;
}) {
  const { site, basePath } = useSite();
  const safe = actionUrl(href, site, basePath);
  return safe ? (
    <a
      className={className}
      href={safe}
      target={newTab && !href.startsWith("#") ? "_blank" : undefined}
      rel={newTab ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ) : null;
}

function Header() {
  const { site, basePath } = useSite();
  const [open, setOpen] = useState(false);
  const sections = visibleSections(site).filter((s) => s.showInNav);
  return (
    <header className="site-header">
      <div className="site-width header-inner">
        <a
          className="wordmark"
          href={basePath}
          aria-label={`${site.profile.name} home`}
        >
          {site.branding.displayName || site.profile.name}
        </a>
        <button
          className="menu-toggle"
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Icon name="menu" />}
        </button>
        <nav
          className={"site-nav " + (open ? "is-open" : "")}
          aria-label="Main navigation"
        >
          {site.profile.visible && (
            <a href={basePath + "#home"} onClick={() => setOpen(false)}>
              {label(site, "about", "About")}
            </a>
          )}
          {sections.map((s) => (
            <a
              key={s.id}
              href={basePath + "#" + s.id}
              onClick={() => setOpen(false)}
            >
              {s.navLabel || s.title}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
function Hero() {
  const { site, basePath, image } = useSite();
  const p = site.profile;
  const first =
    p.surname && p.name.endsWith(p.surname)
      ? p.name.slice(0, -p.surname.length).trim()
      : p.name;
  return (
    <section className="hero site-width" id="home" aria-label="Introduction">
      {site.appearance.motion && (
        <div className="hero-orbits" aria-hidden="true">
          <span />
          <span />
          <span />
          <i />
          <i />
          <i />
          <i />
        </div>
      )}
      <div className="hero-copy">
        {p.location && (
          <p className="location">
            <MapPin size={16} />
            {p.location}
          </p>
        )}
        <p className="hero-eyebrow">{p.eyebrow}</p>
        <h1 dir="auto">
          {first}
          {p.surname && p.name.endsWith(p.surname) && <em>{p.surname}</em>}
        </h1>
        <p className="hero-role" dir="auto">
          {p.role}
        </p>
        <p className="hero-intro" dir="auto">
          {p.introduction}
        </p>
        <div className="hero-actions">
          {p.primaryAction.visible && (
            <a
              className="site-button primary"
              href={actionUrl(p.primaryAction.destination, site, basePath)}
              target={p.primaryAction.newTab ? "_blank" : undefined}
              rel="noopener noreferrer"
            >
              <Icon name="megaphone" size={17} />
              {p.primaryAction.label}
            </a>
          )}
          {p.secondaryAction.visible && (
            <a
              className="site-button secondary"
              href={actionUrl(p.secondaryAction.destination, site, basePath)}
              target={p.secondaryAction.newTab ? "_blank" : undefined}
              rel="noopener noreferrer"
              download={p.secondaryAction.destination === "@cv" || undefined}
            >
              <Icon name="download" size={18} />
              {p.secondaryAction.label}
            </a>
          )}
        </div>
        {p.highlights.length > 0 && (
          <div className="hero-highlights">
            {p.highlights.map((h, i) => (
              <span key={i} className={"highlight-" + h.icon}>
                <Icon name={h.icon} size={24} />
                {h.label}
              </span>
            ))}
          </div>
        )}
      </div>
      {p.image && (
        <div className="hero-portrait">
          <img
            src={image(p.image)}
            alt={p.imageAlt || p.name}
            style={{ objectPosition: p.imagePosition }}
            fetchPriority="high"
            width={740}
            height={820}
          />
          <div className="portrait-rule" />
        </div>
      )}
      <a
        className="scroll-cue"
        href={basePath + "#" + (visibleSections(site)[0]?.id || "home")}
        aria-label="Explore the portfolio"
      >
        <ArrowDown size={16} />
        <span>{label(site, "explore", "Explore")}</span>
      </a>
    </section>
  );
}

function SectionHeading({
  section,
  index,
}: {
  section: Section;
  index?: number;
}) {
  return (
    <div className="section-heading">
      <p className="eyebrow">
        {index !== undefined && (
          <span>{String(index + 1).padStart(2, "0")} — </span>
        )}
        {section.eyebrow || section.type}
      </p>
      <h2 dir="auto">{section.title}</h2>
      {section.description && (
        <RichText text={section.description} className="section-description" />
      )}
    </div>
  );
}
function Expertise({ items }: { items: ContentItem[] }) {
  const { site } = useSite();
  return (
    <div className="expertise-grid">
      {items.map((i) => (
        <article className="expertise-card" key={i.id}>
          <Icon name={i.icon || "sparkles"} size={30} />
          <h3 dir="auto">{i.title}</h3>
          <p dir="auto">{i.description}</p>
          <RichText text={i.body} />
          {i.url && (
            <OutLink href={i.url} className="text-link">
              {i.buttonLabel || label(site, "readMore", "Read more")}
              <ArrowUpRight size={16} />
            </OutLink>
          )}
        </article>
      ))}
    </div>
  );
}
function Skills({ items }: { items: ContentItem[] }) {
  return (
    <div className="skills-grid">
      {items.map((i) => (
        <article className="skill-item" key={i.id}>
          <div className={"skill-icon icon-" + i.icon}>
            <Icon name={i.icon} size={28} />
          </div>
          <div>
            <h3 dir="auto">{i.title}</h3>
            {i.description && <p dir="auto">{i.description}</p>}
          </div>
        </article>
      ))}
    </div>
  );
}
function Timeline({
  items,
  education = false,
}: {
  items: ContentItem[];
  education?: boolean;
}) {
  const { image, site } = useSite();
  return (
    <div className={education ? "education-list" : "timeline"}>
      {items.map((i) => (
        <article className="timeline-row" key={i.id}>
          <div className="timeline-date">
            {education ? (
              <Icon name="graduation-cap" size={28} />
            ) : (
              <span className="timeline-dot" />
            )}
            {(i.startDate || i.endDate) && (
              <span>
                {dateLabel(i.startDate)}
                {(i.current || i.endDate) && " — "}
                {i.current
                  ? label(site, "present", "Present")
                  : dateLabel(i.endDate)}
              </span>
            )}
          </div>
          <div className="timeline-content">
            <div className="timeline-title">
              <h3 dir="auto">{i.title}</h3>
              {i.image && (
                <img
                  src={image(i.image)}
                  alt={i.imageAlt || i.company}
                  loading="lazy"
                />
              )}
            </div>
            {(i.company || i.location) && (
              <p className="company" dir="auto">
                {[i.company, i.location].filter(Boolean).join(" · ")}
              </p>
            )}
            {i.description && <p dir="auto">{i.description}</p>}
            <RichText text={i.body} />
            {i.url && (
              <OutLink href={i.url} className="text-link">
                {i.buttonLabel || label(site, "viewDetails", "View details")}
                <ArrowUpRight size={16} />
              </OutLink>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
function Certificates({ items }: { items: ContentItem[] }) {
  const { site, image } = useSite();
  return (
    <div className="certificate-grid">
      {items.map((i) => (
        <article className="certificate-card" key={i.id}>
          <OutLink href={i.url} className="certificate-image">
            {i.image && (
              <img
                src={image(i.image)}
                alt={i.imageAlt || i.title}
                loading="lazy"
              />
            )}
            <span className="image-link-hint">
              <ArrowUpRight size={23} />
            </span>
          </OutLink>
          <div className="card-body">
            <h3 dir="auto">{i.title}</h3>
            <p className="card-meta">
              {[i.issuer, dateLabel(i.issueDate)].filter(Boolean).join(" · ")}
            </p>
            {i.credentialId && (
              <p className="credential-id">
                {label(site, "credentialId", "Credential ID")}: {i.credentialId}
              </p>
            )}
            {i.description && <p dir="auto">{i.description}</p>}
            <OutLink href={i.url} className="site-button certificate-button">
              {i.buttonLabel ||
                label(site, "viewCertificate", "View certificate")}
              <ArrowUpRight size={16} />
            </OutLink>
          </div>
        </article>
      ))}
    </div>
  );
}
function Campaigns({ items }: { items: ContentItem[] }) {
  const { site, image } = useSite();
  return (
    <div className="campaign-grid">
      {items.map((i) => (
        <article
          className={"campaign-card " + (i.featured ? "featured" : "")}
          key={i.id}
        >
          {i.image && (
            <a
              href={image(i.image)}
              target="_blank"
              rel="noopener noreferrer"
              className="campaign-image"
              aria-label={`Open result image for ${i.title}`}
            >
              <img
                src={image(i.image)}
                alt={i.imageAlt || i.title}
                loading="lazy"
              />
            </a>
          )}
          <div className="card-body">
            <p className="card-meta">
              {[i.platform, i.company, i.period].filter(Boolean).join(" · ")}
            </p>
            <h3 dir="auto">{i.title}</h3>
            <p dir="auto">{i.description}</p>
            <RichText text={i.body} />
            {i.metrics.length > 0 && (
              <dl className="metrics">
                {i.metrics.map((m, j) => (
                  <div key={j}>
                    <dd>
                      {m.value}
                      <span>{m.unit}</span>
                    </dd>
                    <dt>{m.label}</dt>
                  </div>
                ))}
              </dl>
            )}
            {i.url && (
              <OutLink href={i.url} className="text-link">
                {i.buttonLabel || label(site, "viewResult", "View result")}
                <ArrowUpRight size={16} />
              </OutLink>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
function WebsiteCard({ item: i }: { item: ContentItem }) {
  const { site, image, preview } = useSite();
  const [fallback, setFallback] = useState(false);
  const canEmbed =
    i.previewMode === "embed" &&
    /^https:\/\//.test(safeUrl(i.url)) &&
    !preview &&
    !fallback;
  return (
    <article className={"website-card " + (i.featured ? "featured" : "")}>
      <div className="browser-frame">
        <div className="browser-bar" aria-hidden="true">
          <span />
          <span />
          <span />
          <small>{i.title}</small>
        </div>
        <div className="website-preview">
          {i.image && (
            <img
              src={image(i.image)}
              alt={i.imageAlt || i.title}
              loading="lazy"
            />
          )}
          {!i.image && !canEmbed && (
            <div className="project-icon">
              <Icon name="globe" size={45} />
            </div>
          )}
          {canEmbed && (
            <iframe
              title={`${i.title} website preview`}
              src={safeUrl(i.url)}
              loading="lazy"
              tabIndex={-1}
              sandbox="allow-scripts allow-same-origin"
              referrerPolicy="no-referrer"
              onError={() => setFallback(true)}
            />
          )}
          <OutLink href={i.url} className="website-hover">
            <span>
              {i.buttonLabel || label(site, "visitWebsite", "Visit Website")}
              <ArrowUpRight size={17} />
            </span>
          </OutLink>
        </div>
      </div>
      <div className="website-caption">
        <h3 dir="auto">{i.title}</h3>
        <p className="card-meta">
          {[i.platform, i.role].filter(Boolean).join(" · ")}
        </p>
        {i.description && <p dir="auto">{i.description}</p>}
        {canEmbed && i.image && (
          <button className="plain-link" onClick={() => setFallback(true)}>
            {label(site, "showImage", "Show preview image")}
          </button>
        )}
      </div>
    </article>
  );
}
function InstagramCard({ item: i }: { item: ContentItem }) {
  const { site, image, preview } = useSite();
  const [fallback, setFallback] = useState(false);
  const embed =
    i.previewMode === "embed" && isInstagramUrl(i.url) && !preview && !fallback;
  useEffect(() => {
    if (!embed) return;
    const win = window as Window & {
      instgrm?: { Embeds: { process: () => void } };
    };
    let script = document.getElementById(
      "instagram-embed-script",
    ) as HTMLScriptElement | null;
    const process = () => win.instgrm?.Embeds.process();
    if (!script) {
      script = document.createElement("script");
      script.id = "instagram-embed-script";
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      document.body.appendChild(script);
    }
    script.addEventListener("load", process);
    process();
    return () => script?.removeEventListener("load", process);
  }, [embed, i.url]);
  return (
    <article className="instagram-card">
      <div className="instagram-frame">
        <div className="instagram-top">
          <Icon name="instagram" size={22} />
          <div>
            <h3 dir="auto">{i.title}</h3>
            {i.subtitle && <p>{i.subtitle}</p>}
          </div>
        </div>
        {embed && (
          <blockquote
            className="instagram-media"
            data-instgrm-permalink={i.url}
            data-instgrm-version="14"
          >
            <OutLink href={i.url}>View Instagram profile</OutLink>
          </blockquote>
        )}
        <div className="instagram-fallback">
          {i.image ? (
            <OutLink href={i.url}>
              <img
                src={image(i.image)}
                alt={i.imageAlt || i.title}
                loading="lazy"
              />
            </OutLink>
          ) : (
            <div className="project-icon">
              <Icon name="instagram" size={42} />
            </div>
          )}
        </div>
      </div>
      <div className="instagram-caption">
        <p className="card-meta">
          {[i.role, i.period].filter(Boolean).join(" · ")}
        </p>
        {i.description && <p dir="auto">{i.description}</p>}
        <OutLink href={i.url} className="text-link">
          {i.buttonLabel || label(site, "visitInstagram", "Visit Instagram")}
          <ArrowUpRight size={16} />
        </OutLink>
        {embed && i.image && (
          <button className="plain-link" onClick={() => setFallback(true)}>
            {label(site, "showImage", "Show preview image")}
          </button>
        )}
      </div>
    </article>
  );
}
function Clients({ items }: { items: ContentItem[] }) {
  const { image } = useSite();
  return (
    <div className="client-grid">
      {items.map((i) => (
        <div className="client-cell" key={i.id}>
          {i.url ? (
            <OutLink href={i.url}>
              {i.image ? (
                <img
                  src={image(i.image)}
                  alt={i.imageAlt || i.title}
                  loading="lazy"
                />
              ) : (
                <span>{i.title}</span>
              )}
            </OutLink>
          ) : i.image ? (
            <img
              src={image(i.image)}
              alt={i.imageAlt || i.title}
              loading="lazy"
            />
          ) : (
            <span>{i.title}</span>
          )}
        </div>
      ))}
    </div>
  );
}
export function ArticleCards({ items }: { items: ContentItem[] }) {
  const { site, image, basePath } = useSite();
  return (
    <div className="article-grid">
      {items.map((i) => (
        <article className="article-card" key={i.id}>
          {i.image && (
            <a href={articlePath(i.slug, basePath)} className="article-cover">
              <img
                src={image(i.image)}
                alt={i.imageAlt || i.title}
                loading="lazy"
              />
            </a>
          )}
          <div className="card-body">
            <p className="card-meta">
              {[i.category, dateLabel(i.date)].filter(Boolean).join(" · ")}
            </p>
            <h3 dir="auto">
              <a href={articlePath(i.slug, basePath)}>{i.title}</a>
            </h3>
            <p dir="auto">{i.description}</p>
            <div className="article-bottom">
              <a className="text-link" href={articlePath(i.slug, basePath)}>
                {i.buttonLabel || label(site, "readArticle", "Read article")}
                <ArrowUpRight size={16} />
              </a>
              <span>
                {readingTime(i.body)} {label(site, "minuteRead", "min read")}
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
function Testimonials({ items }: { items: ContentItem[] }) {
  const { image } = useSite();
  return (
    <div className="testimonial-grid">
      {items.map((i) => (
        <figure className="testimonial-card" key={i.id}>
          <Quote size={25} aria-hidden="true" />
          <blockquote dir="auto">{i.description || i.body}</blockquote>
          <figcaption>
            {i.image && (
              <img
                src={image(i.image)}
                alt={i.imageAlt || i.title}
                loading="lazy"
              />
            )}
            <div>
              <strong>{i.title}</strong>
              <span>{[i.role, i.company].filter(Boolean).join(" · ")}</span>
            </div>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
function ContactSection({ section }: { section: Section }) {
  const { site } = useSite();
  const links = site.contact.links.filter((l) => l.visible);
  return (
    <div className="contact-layout">
      <div>
        <p className="eyebrow">{section.eyebrow}</p>
        <h2 dir="auto">{section.title}</h2>
        <RichText text={section.description} />
      </div>
      <div className="contact-details">
        {site.profile.location && (
          <p>
            <MapPin size={18} />
            {site.profile.location}
          </p>
        )}
        {links.map((l) => (
          <a
            href={contactUrl(l)}
            key={l.id}
            target={l.newTab ? "_blank" : undefined}
            rel="noopener noreferrer"
          >
            <Icon
              name={
                l.kind === "custom"
                  ? l.icon
                  : l.kind === "email"
                    ? "mail"
                    : l.kind
              }
              size={18}
            />
            <span>
              {l.kind === "email" || l.kind === "phone" ? l.value : l.label}
            </span>
            <ArrowUpRight size={15} />
          </a>
        ))}
      </div>
    </div>
  );
}
function SectionContent({ section: s }: { section: Section }) {
  const { site, basePath } = useSite();
  const items = s.items.filter((i) => i.status === "published");
  switch (s.type) {
    case "expertise":
      return <Expertise items={items} />;
    case "skills":
      return <Skills items={items} />;
    case "experience":
      return <Timeline items={items} />;
    case "education":
      return <Timeline items={items} education />;
    case "certificates":
      return <Certificates items={items} />;
    case "campaigns":
      return <Campaigns items={items} />;
    case "websites":
      return (
        <div className="website-grid">
          {items.map((i) => (
            <WebsiteCard item={i} key={i.id} />
          ))}
        </div>
      );
    case "instagram":
      return (
        <div className="instagram-grid">
          {items.map((i) => (
            <InstagramCard item={i} key={i.id} />
          ))}
        </div>
      );
    case "clients":
      return <Clients items={items} />;
    case "articles":
      return (
        <>
          <ArticleCards items={items.slice(0, 6)} />
          <a className="all-articles text-link" href={basePath + "articles/"}>
            {label(site, "allArticles", "All articles")}
            <ArrowUpRight size={16} />
          </a>
        </>
      );
    case "testimonials":
      return <Testimonials items={items} />;
    case "contact":
      return <ContactSection section={s} />;
    default:
      return (
        <div className={"custom-grid custom-" + s.layout}>
          {items.map((i) => (
            <CustomCard item={i} key={i.id} />
          ))}
        </div>
      );
  }
}
function CustomCard({ item: i }: { item: ContentItem }) {
  const { image, site } = useSite();
  return (
    <article className="custom-card">
      {i.image && (
        <img src={image(i.image)} alt={i.imageAlt || i.title} loading="lazy" />
      )}
      <div>
        <h3 dir="auto">{i.title}</h3>
        {i.subtitle && <p className="card-meta">{i.subtitle}</p>}
        <p dir="auto">{i.description}</p>
        <RichText text={i.body} />
        {i.url && (
          <OutLink href={i.url} className="text-link">
            {i.buttonLabel || label(site, "readMore", "Read more")}
            <ArrowUpRight size={16} />
          </OutLink>
        )}
      </div>
    </article>
  );
}
function Footer() {
  const { site, basePath } = useSite();
  return (
    <>
      <footer className="site-footer site-width">
        <p>
          {site.branding.footerText.replaceAll(
            "{year}",
            String(new Date().getFullYear()),
          )}
        </p>
        <div>
          {site.profile.cv && (
            <a href={assetUrl(site.profile.cv, basePath)} download>
              {label(site, "footerCv", "CV")}
            </a>
          )}
          {site.contact.footerLinks &&
            site.contact.links
              .filter((l) => l.visible)
              .map((l) => (
                <a
                  key={l.id}
                  href={contactUrl(l)}
                  target={l.newTab ? "_blank" : undefined}
                  rel="noopener noreferrer"
                >
                  {l.label}
                </a>
              ))}
        </div>
      </footer>
      {site.contact.floating && (
        <aside className="floating-contact" aria-label="Direct contact links">
          {site.contact.links
            .filter((l) => l.visible)
            .map((l) => (
              <a
                key={l.id}
                className={"floating-button contact-" + l.kind}
                href={contactUrl(l)}
                aria-label={l.label + " " + site.profile.name}
                title={l.label}
                target={l.newTab ? "_blank" : undefined}
                rel="noopener noreferrer"
              >
                <Icon
                  name={
                    l.kind === "custom"
                      ? l.icon
                      : l.kind === "email"
                        ? "mail"
                        : l.kind
                  }
                  size={21}
                />
              </a>
            ))}
        </aside>
      )}
    </>
  );
}
function ArticlePage({ article }: { article: ContentItem }) {
  const { site, basePath, image } = useSite();
  return (
    <main id="main" className="article-page site-width">
      <a className="text-link" href={basePath + "articles/"}>
        <ArrowLeft size={16} />
        {label(site, "backToArticles", "Back to articles")}
      </a>
      <header className="article-header">
        <p className="eyebrow">{article.category || "Article"}</p>
        <h1 dir="auto">{article.title}</h1>
        {article.description && (
          <p className="article-deck" dir="auto">
            {article.description}
          </p>
        )}
        <div className="byline">
          {site.profile.name}
          <span>·</span>
          {dateLabel(article.date)}
          <span>·</span>
          {readingTime(article.body)} {label(site, "minuteRead", "min read")}
        </div>
      </header>
      {article.image && (
        <img
          className="article-hero-image"
          src={image(article.image)}
          alt={article.imageAlt || article.title}
        />
      )}
      <RichText text={article.body} className="article-prose" />
      <div className="article-end">
        <a className="text-link" href={basePath + "articles/"}>
          {label(site, "allArticles", "All articles")}
          <ArrowUpRight size={17} />
        </a>
      </div>
    </main>
  );
}
function ArticlesPage() {
  const { site } = useSite();
  const section = site.sections.find((s) => s.type === "articles" && s.visible);
  const items = allArticles(site);
  return (
    <main id="main" className="articles-page site-width">
      <p className="eyebrow">{label(site, "articlesEyebrow", "Articles")}</p>
      <h1 dir="auto">{section?.title || "Articles"}</h1>
      {section?.description && <RichText text={section.description} />}
      <ArticleCards items={items} />
      {!items.length && (
        <p>
          {label(
            site,
            "emptyArticles",
            "New articles will appear here when published.",
          )}
        </p>
      )}
    </main>
  );
}
function MissingPage() {
  const { basePath, site } = useSite();
  return (
    <main id="main" className="missing-page site-width">
      <p className="eyebrow">404</p>
      <h1>{label(site, "notFoundTitle", "Page not found.")}</h1>
      <p>
        {label(
          site,
          "notFoundText",
          "This page may have moved or is no longer published.",
        )}
      </p>
      <a className="site-button primary" href={basePath}>
        {label(site, "returnHome", "Return to portfolio")}
        <ArrowUpRight size={17} />
      </a>
    </main>
  );
}
function Analytics({ id, preview }: { id: string; preview: boolean }) {
  useEffect(() => {
    if (
      preview ||
      !/^G-[A-Z0-9]{4,20}$/.test(id) ||
      document.getElementById("ga4-script")
    )
      return;
    const win = window as Window & {
      dataLayer?: unknown[];
      gtag?: (...args: unknown[]) => void;
    };
    win.dataLayer = win.dataLayer || [];
    win.gtag = function () {
      win.dataLayer!.push(arguments);
    };
    win.gtag("js", new Date());
    win.gtag("config", id);
    const script = document.createElement("script");
    script.id = "ga4-script";
    script.src =
      "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    script.async = true;
    document.head.appendChild(script);
  }, [id, preview]);
  return null;
}
export function Portfolio({
  document,
  basePath,
  route = "/",
  preview = false,
  mediaOverrides = {},
}: {
  document: SiteDocument;
  basePath: string;
  route?: string;
  preview?: boolean;
  mediaOverrides?: Record<string, string>;
}) {
  const site = publicDocument(document);
  const sections = visibleSections(site);
  let article: ContentItem | undefined;
  let routeSlug = "";
  try {
    routeSlug = decodeURIComponent(
      route.replace(/^\/articles\//, "").replace(/\/$/, ""),
    );
  } catch {
    /* 404 */
  }
  if (route.startsWith("/articles/") && route !== "/articles/")
    article = allArticles(site).find((i) => i.slug === routeSlug);
  const style = {
    "--site-bg": site.appearance.background,
    "--site-accent": site.appearance.accent,
    "--site-action": site.appearance.actionColor,
  } as CSSProperties;
  return (
    <SiteContext.Provider
      value={{
        site,
        basePath,
        preview,
        image: (path) => mediaOverrides[path] || assetUrl(path, basePath),
      }}
    >
      <div
        className={
          "portfolio " +
          (site.appearance.motion ? "motion-on" : "motion-off") +
          " motion-" +
          site.appearance.intensity +
          (site.appearance.respectReducedMotion ? " reduced-motion-aware" : "")
        }
        style={style}
        dir={/^(ar|fa|he|ur)(-|$)/.test(site.seo.language) ? "rtl" : "ltr"}
      >
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        {route === "/" ? (
          <main id="main">
            {site.profile.visible && <Hero />}
            {sections.map((s, index) => (
              <section
                key={s.id}
                id={s.id}
                className={
                  "public-section site-width section-" +
                  s.type +
                  " layout-" +
                  s.layout
                }
              >
                {s.type !== "contact" && (
                  <SectionHeading section={s} index={index} />
                )}
                <SectionContent section={s} />
              </section>
            ))}
          </main>
        ) : route === "/articles/" ? (
          <ArticlesPage />
        ) : article ? (
          <ArticlePage article={article} />
        ) : (
          <MissingPage />
        )}
        <Footer />
        <Analytics id={site.seo.ga4Id} preview={preview} />
      </div>
    </SiteContext.Provider>
  );
}
