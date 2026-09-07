import { z } from "zod";

export const sectionTypes = [
  "expertise",
  "skills",
  "experience",
  "education",
  "certificates",
  "campaigns",
  "websites",
  "instagram",
  "clients",
  "articles",
  "testimonials",
  "contact",
  "custom",
] as const;
export type SectionType = (typeof sectionTypes)[number];
const text = z.string().max(100000);
const short = z.string().max(1000);
const identifier = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
const metric = z.object({
  label: short,
  value: short,
  unit: short.default(""),
});
export const itemSchema = z.object({
  id: identifier,
  title: short.default(""),
  subtitle: short.default(""),
  description: text.default(""),
  body: text.default(""),
  image: short.default(""),
  imageAlt: short.default(""),
  url: short.default(""),
  buttonLabel: short.default(""),
  icon: short.default("sparkles"),
  status: z.enum(["published", "draft"]).default("published"),
  featured: z.boolean().default(false),
  company: short.default(""),
  location: short.default(""),
  startDate: short.default(""),
  endDate: short.default(""),
  current: z.boolean().default(false),
  issuer: short.default(""),
  issueDate: short.default(""),
  credentialId: short.default(""),
  platform: short.default(""),
  period: short.default(""),
  role: short.default(""),
  category: short.default(""),
  slug: z.string().max(100).default(""),
  date: short.default(""),
  updatedDate: short.default(""),
  seoTitle: short.default(""),
  seoDescription: z.string().max(1000).default(""),
  canonicalUrl: short.default(""),
  socialImage: short.default(""),
  indexable: z.boolean().default(true),
  previewMode: z.enum(["image", "embed"]).default("image"),
  metrics: z.array(metric).max(12).default([]),
});
export const sectionSchema = z.object({
  id: identifier,
  type: z.enum(sectionTypes),
  title: short,
  eyebrow: short.default(""),
  description: text.default(""),
  visible: z.boolean().default(true),
  showInNav: z.boolean().default(false),
  navLabel: short.default(""),
  layout: z.enum(["grid", "list", "split"]).default("grid"),
  items: z.array(itemSchema).max(300).default([]),
});
const actionSchema = z.object({
  label: short,
  destination: short,
  visible: z.boolean().default(true),
  newTab: z.boolean().default(false),
});
export const siteSchema = z.object({
  schemaVersion: z.literal(1),
  profile: z.object({
    name: z.string().min(1).max(120),
    surname: short,
    role: short,
    introduction: text,
    location: short,
    image: short,
    imageAlt: short,
    imagePosition: z.string().max(40).default("50% 40%"),
    cv: short,
    visible: z.boolean(),
    eyebrow: short,
    highlights: z.array(z.object({ label: short, icon: short })).max(12),
    primaryAction: actionSchema,
    secondaryAction: actionSchema,
  }),
  branding: z.object({
    title: short,
    displayName: short,
    favicon: short,
    description: text,
    socialImage: short,
    footerText: short,
    labels: z.record(z.string().max(100)),
  }),
  contact: z.object({
    floating: z.boolean(),
    footerLinks: z.boolean(),
    links: z
      .array(
        z.object({
          id: identifier,
          kind: z.enum([
            "phone",
            "whatsapp",
            "email",
            "linkedin",
            "github",
            "custom",
          ]),
          label: short,
          value: short,
          visible: z.boolean(),
          newTab: z.boolean(),
          icon: short.default("link"),
        }),
      )
      .max(15),
  }),
  appearance: z.object({
    background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    actionColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    motion: z.boolean(),
    respectReducedMotion: z.boolean(),
    intensity: z.enum(["low", "medium"]),
  }),
  seo: z.object({
    siteUrl: short,
    titleTemplate: short,
    ga4Id: short,
    googleVerification: short,
    indexable: z.boolean(),
    language: short,
  }),
  sections: z.array(sectionSchema).max(60),
  media: z
    .array(
      z.object({
        id: identifier,
        name: short,
        path: short,
        type: short,
        size: z.number().nonnegative(),
        alt: short.default(""),
      }),
    )
    .max(1000),
});
export type ContentItem = z.infer<typeof itemSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type SiteDocument = z.infer<typeof siteSchema>;
export type Media = SiteDocument["media"][number];
export type ProjectConfig = {
  owner: string;
  repository: string;
  branch: string;
  basePath: string;
  siteUrl: string;
};
export type DraftEnvelope = {
  schemaVersion: 1;
  basePublishedSha: string;
  savedAt: string;
  document: SiteDocument;
  deletions: string[];
};
export type StagedUpload = { path: string; base64: string; size: number };
export const sectionNames: Record<SectionType, string> = {
  expertise: "Expertise",
  skills: "Skills & AI",
  experience: "Work experience",
  education: "Education",
  certificates: "Certificates",
  campaigns: "Campaign results",
  websites: "Websites & apps",
  instagram: "Instagram pages",
  clients: "Client logos",
  articles: "Articles",
  testimonials: "Testimonials",
  contact: "Contact",
  custom: "Custom content",
};

export function newId(prefix = "item") {
  return `${prefix}-${crypto.randomUUID().slice(0, 12)}`;
}
export function newItem(): ContentItem {
  return itemSchema.parse({ id: newId() });
}
export function newSection(type: SectionType): Section {
  return sectionSchema.parse({
    id: newId(type),
    type,
    title: sectionNames[type],
    navLabel: sectionNames[type],
  });
}
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
export function publicDocument(document: SiteDocument): SiteDocument {
  const site = clone(document);
  site.media = [];
  site.sections = site.sections
    .filter((s) => s.visible)
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => i.status === "published"),
    }));
  return site;
}
export function allArticles(site: SiteDocument) {
  return site.sections
    .filter((s) => s.visible && s.type === "articles")
    .flatMap((s) => s.items.filter((i) => i.status === "published"));
}
export function visibleSections(site: SiteDocument) {
  return site.sections.filter(
    (s) =>
      s.visible &&
      (s.type === "contact" ||
        s.items.some((i) => i.status === "published") ||
        (s.type === "custom" && s.description.trim())),
  );
}
export function referencedMedia(site: SiteDocument, path: string): boolean {
  const { media: _media, ...content } = site;
  return JSON.stringify(content).includes(path);
}
