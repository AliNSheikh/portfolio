import { Plus, Trash2 } from "lucide-react";
import { newId, type SiteDocument } from "../model";
import { Card, IconField, SelectField, TextField, Toggle } from "./fields";
import { MediaField, type MediaTools } from "./MediaField";
import type { ChangeSite } from "./Sections";

type Props = { site: SiteDocument; change: ChangeSite; tools: MediaTools };
export function ProfileSettings({ site, change, tools }: Props) {
  const p = site.profile;
  const set = (patch: Partial<SiteDocument["profile"]>) =>
    change((d) => {
      Object.assign(d.profile, patch);
    });
  const action = (key: "primaryAction" | "secondaryAction", title: string) => (
    <Card title={title}>
      <div className="form-grid">
        <TextField
          label="Button label"
          value={p[key].label}
          onChange={(v) => set({ [key]: { ...p[key], label: v } })}
        />
        <TextField
          label="Destination"
          value={p[key].destination}
          onChange={(v) => set({ [key]: { ...p[key], destination: v } })}
          hint="Use #section-id, @cv, @phone, @email, @whatsapp, or an HTTPS address."
        />
        <Toggle
          label="Show this button"
          checked={p[key].visible}
          onChange={(v) => set({ [key]: { ...p[key], visible: v } })}
        />
        <Toggle
          label="Open in a new tab"
          checked={p[key].newTab}
          onChange={(v) => set({ [key]: { ...p[key], newTab: v } })}
        />
      </div>
    </Card>
  );
  return (
    <>
      <Card
        title="Your introduction"
        description="Your name, photograph, and introduction appear at the top of the website."
      >
        <div className="form-grid">
          <TextField
            label="Full name"
            value={p.name}
            onChange={(v) => set({ name: v })}
            required
          />
          <TextField
            label="Surname to highlight"
            value={p.surname}
            onChange={(v) => set({ surname: v })}
            hint="The surname at the end of your full name appears in gold."
          />
          <TextField
            label="Professional title"
            value={p.role}
            onChange={(v) => set({ role: v })}
          />
          <TextField
            label="Small heading"
            value={p.eyebrow}
            onChange={(v) => set({ eyebrow: v })}
          />
          <TextField
            label="Location"
            value={p.location}
            onChange={(v) => set({ location: v })}
          />
          <Toggle
            label="Show introduction section"
            checked={p.visible}
            onChange={(v) => set({ visible: v })}
          />
          <TextField
            label="Introduction"
            value={p.introduction}
            onChange={(v) => set({ introduction: v })}
            area
          />
          <MediaField
            label="Profile photograph"
            value={p.image}
            onChange={(v) => set({ image: v })}
            tools={tools}
          />
          <TextField
            label="Photo description"
            value={p.imageAlt}
            onChange={(v) => set({ imageAlt: v })}
          />
          <TextField
            label="Photo crop position"
            value={p.imagePosition}
            onChange={(v) => set({ imagePosition: v })}
            hint="Horizontal and vertical position, for example 50% 40%. Check the mobile preview after changing it."
          />
          <MediaField
            label="CV / résumé"
            value={p.cv}
            onChange={(v) => set({ cv: v })}
            tools={tools}
            pdf
          />
        </div>
      </Card>
      <Card
        title="Technology & AI highlights"
        description="Small icons beneath your introduction show selected skills."
        actions={
          <button
            className="admin-button small"
            disabled={p.highlights.length >= 12}
            onClick={() =>
              set({
                highlights: [
                  ...p.highlights,
                  { label: "New skill", icon: "sparkles" },
                ],
              })
            }
          >
            <Plus size={16} />
            Add highlight
          </button>
        }
      >
        {p.highlights.map((h, index) => (
          <div className="highlight-editor" key={index}>
            <TextField
              label="Label"
              value={h.label}
              onChange={(v) =>
                set({
                  highlights: p.highlights.map((x, i) =>
                    i === index ? { ...x, label: v } : x,
                  ),
                })
              }
            />
            <IconField
              value={h.icon}
              onChange={(v) =>
                set({
                  highlights: p.highlights.map((x, i) =>
                    i === index ? { ...x, icon: v } : x,
                  ),
                })
              }
            />
            <button
              className="icon-button danger"
              aria-label="Remove highlight"
              onClick={() =>
                set({ highlights: p.highlights.filter((_, i) => i !== index) })
              }
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </Card>
      {action("primaryAction", "Primary introduction button")}
      {action("secondaryAction", "Secondary introduction button")}
    </>
  );
}
export function ContactSettings({ site, change }: Props) {
  const c = site.contact;
  return (
    <>
      <Card
        title="Contact & social links"
        description="These values power the contact section, floating buttons, and hero buttons linked with @ IDs."
        actions={
          <button
            className="admin-button small"
            disabled={c.links.length >= 15}
            onClick={() =>
              change((d) => {
                d.contact.links.push({
                  id: newId("link"),
                  kind: "custom",
                  label: "New link",
                  value: "",
                  visible: true,
                  newTab: true,
                  icon: "link",
                });
              })
            }
          >
            <Plus size={16} />
            Add link
          </button>
        }
      >
        <div className="form-grid">
          <Toggle
            label="Show floating contact buttons"
            checked={c.floating}
            onChange={(v) =>
              change((d) => {
                d.contact.floating = v;
              })
            }
          />
          <Toggle
            label="Show social links in the footer"
            checked={c.footerLinks}
            onChange={(v) =>
              change((d) => {
                d.contact.footerLinks = v;
              })
            }
          />
        </div>
      </Card>
      {c.links.map((link, index) => {
        const set = (patch: Partial<typeof link>) =>
          change((d) => {
            Object.assign(d.contact.links[index], patch);
          });
        return (
          <Card
            key={link.id}
            title={link.label || "New link"}
            description={"Hero button reference: @" + link.id}
            actions={
              <button
                className="icon-button danger"
                title="Remove contact link"
                onClick={() => {
                  if (
                    window.confirm(
                      `Remove “${link.label}”? Update any hero button using @${link.id} before publishing.`,
                    )
                  )
                    change((d) => {
                      d.contact.links = d.contact.links.filter(
                        (x) => x.id !== link.id,
                      );
                    });
                }}
              >
                <Trash2 size={18} />
              </button>
            }
          >
            <div className="form-grid">
              <SelectField
                label="Link type"
                value={link.kind}
                onChange={(v) => set({ kind: v as typeof link.kind })}
                options={[
                  "phone",
                  "whatsapp",
                  "email",
                  "linkedin",
                  "github",
                  "custom",
                ].map((v) => ({ value: v, label: v }))}
              />
              <TextField
                label="Button label"
                value={link.label}
                onChange={(v) => set({ label: v })}
              />
              <TextField
                label={
                  link.kind === "phone"
                    ? "Phone number"
                    : link.kind === "email"
                      ? "Email address"
                      : "Link / WhatsApp number"
                }
                value={link.value}
                onChange={(v) => set({ value: v })}
                hint={
                  link.kind === "phone"
                    ? "Include country code, e.g. +971501646033."
                    : undefined
                }
              />
              {link.kind === "custom" && (
                <IconField
                  value={link.icon}
                  onChange={(v) => set({ icon: v })}
                />
              )}
              <Toggle
                label="Show this contact"
                checked={link.visible}
                onChange={(v) => set({ visible: v })}
              />
              <Toggle
                label="Open in a new tab"
                checked={link.newTab}
                onChange={(v) => set({ newTab: v })}
              />
            </div>
          </Card>
        );
      })}
    </>
  );
}
const buttonLabels: Record<string, string> = {
  about: "About navigation label",
  explore: "Explore link",
  visitWebsite: "Visit website",
  visitInstagram: "Visit Instagram",
  viewCertificate: "View certificate",
  readArticle: "Read article",
  allArticles: "All articles",
  viewCode: "View code",
  viewResult: "View campaign result",
  backToArticles: "Back to articles",
  readMore: "Read more",
  viewDetails: "View details",
  showImage: "Show preview image",
  footerCv: "Footer CV button",
  articlesEyebrow: "Articles small heading",
  emptyArticles: "Empty articles message",
  present: "Current experience date label",
  credentialId: "Credential ID label",
  minuteRead: "Reading time suffix",
  notFoundTitle: "Missing page title",
  notFoundText: "Missing page message",
  returnHome: "Return home button",
};
export function BrandingSettings({ site, change, tools }: Props) {
  const b = site.branding,
    set = (patch: Partial<typeof b>) =>
      change((d) => {
        Object.assign(d.branding, patch);
      });
  return (
    <>
      <Card
        title="Website identity"
        description="Update your browser title, favicon, navigation name, and footer."
      >
        <div className="form-grid">
          <TextField
            label="Website title"
            value={b.title}
            onChange={(v) => set({ title: v })}
          />
          <TextField
            label="Navigation name / wordmark"
            value={b.displayName}
            onChange={(v) => set({ displayName: v })}
          />
          <TextField
            label="Website description"
            value={b.description}
            onChange={(v) => set({ description: v })}
            area
          />
          <MediaField
            label="Favicon"
            value={b.favicon}
            onChange={(v) => set({ favicon: v })}
            tools={tools}
          />
          <MediaField
            label="Default social sharing image"
            value={b.socialImage}
            onChange={(v) => set({ socialImage: v })}
            tools={tools}
          />
          <TextField
            label="Footer text"
            value={b.footerText}
            onChange={(v) => set({ footerText: v })}
            hint="Use {year} for the current year."
          />
        </div>
      </Card>
      <Card
        title="Public labels & buttons"
        description="Card buttons can override these labels in each item. Destinations are set in their corresponding content editor."
      >
        <div className="form-grid">
          {Object.entries(buttonLabels).map(([key, label]) => (
            <TextField
              key={key}
              label={label}
              value={b.labels[key] || ""}
              onChange={(v) =>
                change((d) => {
                  d.branding.labels[key] = v;
                })
              }
              hint="Leave empty to use the default wording."
            />
          ))}
        </div>
      </Card>
    </>
  );
}
export function AppearanceSettings({ site, change }: Props) {
  const a = site.appearance,
    set = (patch: Partial<typeof a>) =>
      change((d) => {
        Object.assign(d.appearance, patch);
      });
  return (
    <>
      <Card
        title="Colors"
        description="The starting design has a white background, gold details, and teal action buttons."
      >
        <div className="form-grid">
          <TextField
            type="color"
            label="Background"
            value={a.background}
            onChange={(v) => set({ background: v })}
          />
          <TextField
            type="color"
            label="Accent color"
            value={a.accent}
            onChange={(v) => set({ accent: v })}
          />
          <TextField
            type="color"
            label="Action button color"
            value={a.actionColor}
            onChange={(v) => set({ actionColor: v })}
          />
        </div>
      </Card>
      <Card
        title="Background animation"
        description="Soft orbital lines add movement around the introduction without distracting from your work."
      >
        <div className="form-grid">
          <Toggle
            label="Enable background animation"
            checked={a.motion}
            onChange={(v) => set({ motion: v })}
          />
          <Toggle
            label="Respect reduced-motion preference"
            checked={a.respectReducedMotion}
            onChange={(v) => set({ respectReducedMotion: v })}
            hint="Recommended for visitors who choose less motion on their device."
          />
          <SelectField
            label="Animation intensity"
            value={a.intensity}
            onChange={(v) => set({ intensity: v as typeof a.intensity })}
            options={[
              { value: "low", label: "Subtle" },
              { value: "medium", label: "More visible" },
            ]}
          />
        </div>
      </Card>
    </>
  );
}
export function SEOSettings({ site, change }: Props) {
  const s = site.seo,
    set = (patch: Partial<typeof s>) =>
      change((d) => {
        Object.assign(d.seo, patch);
      });
  const sitemap = s.siteUrl.replace(/\/?$/, "/") + "sitemap.xml";
  return (
    <>
      <Card
        title="Search settings"
        description="Publishing generates complete HTML pages with metadata, canonical URLs, structured data, and a sitemap."
      >
        <div className="form-grid">
          <TextField
            label="Public website URL"
            value={s.siteUrl}
            onChange={(v) => set({ siteUrl: v })}
            hint="Use the full HTTPS address ending with /. Keep /portfolio/ for this project. A path change also requires project.config.json."
          />
          <TextField
            label="Article title template"
            value={s.titleTemplate}
            onChange={(v) => set({ titleTemplate: v })}
            hint="Use {title}, for example {title} | Ali Sheikh."
          />
          <TextField
            label="Website language"
            value={s.language}
            onChange={(v) => set({ language: v })}
            hint="Use en for English or ar for Arabic. Arabic content supports right-to-left layout."
          />
          <Toggle
            label="Allow search engine indexing"
            checked={s.indexable}
            onChange={(v) => set({ indexable: v })}
            hint="Individual articles also have their own indexing setting."
          />
        </div>
      </Card>
      <Card
        title="Google Search Console"
        description="Connect the matching URL-prefix property using its HTML verification tag."
      >
        <TextField
          label="Google site verification value"
          value={s.googleVerification}
          onChange={(v) => set({ googleVerification: v })}
          hint="Paste only the content value from Google's google-site-verification meta tag, not the entire tag."
        />
        <div className="integration-info">
          <ol>
            <li>Add your website URL in Google Search Console.</li>
            <li>
              Choose HTML tag verification and paste the content value here.
            </li>
            <li>
              Publish, wait for GitHub Pages deployment, and select Verify in
              Google.
            </li>
            <li>Submit the sitemap below.</li>
          </ol>
          <code>{sitemap}</code>
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-button small"
          >
            Open Search Console ↗
          </a>
        </div>
        <p className="field-hint">
          Google decides when pages are indexed. Verification and sitemap
          submission do not guarantee inclusion or ranking. On a GitHub project
          site, this sitemap works at /portfolio/sitemap.xml; domain-root
          robots.txt is controlled by the account's root website.
        </p>
      </Card>
      <Card
        title="Google Analytics 4"
        description="The measurement ID loads Analytics on public pages after deployment. The editor and its previews are excluded."
      >
        <TextField
          label="GA4 measurement ID"
          value={s.ga4Id}
          onChange={(v) => set({ ga4Id: v.trim().toUpperCase() })}
          placeholder="G-XXXXXXXXXX"
          hint="Leave blank to disable tracking."
        />
        <a
          href="https://analytics.google.com/"
          className="admin-button small"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Google Analytics ↗
        </a>
      </Card>
    </>
  );
}
