import { useEffect, useRef } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { ContentItem, SectionType } from "../model";
import { slugify } from "../safe";
import {
  Card,
  IconField,
  MarkdownField,
  SelectField,
  TextField,
  Toggle,
} from "./fields";
import { MediaField, type MediaTools } from "./MediaField";

export function ItemEditor({
  item,
  type,
  tools,
  basePath,
  siteUrl,
  onChange,
  onClose,
}: {
  item: ContentItem;
  type: SectionType;
  tools: MediaTools;
  basePath: string;
  siteUrl: string;
  onChange: (patch: Partial<ContentItem>) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  const field = (
    key: keyof ContentItem,
    label: string,
    options: {
      area?: boolean;
      hint?: string;
      type?: string;
      required?: boolean;
    } = {},
  ) => (
    <TextField
      label={label}
      value={String(item[key])}
      onChange={(v) => onChange({ [key]: v })}
      {...options}
    />
  );
  const isTimeline = ["experience", "education"].includes(type),
    isArticle = type === "articles",
    hasImage = !["skills", "expertise"].includes(type);
  const titleLabel =
    type === "testimonials"
      ? "Person’s name"
      : type === "clients"
        ? "Client / company name"
        : type === "experience"
          ? "Job title"
          : type === "education"
            ? "Degree or qualification"
            : "Title";
  return (
    <dialog ref={dialog} className="item-dialog" onCancel={onClose}>
      <div className="item-dialog-heading">
        <div>
          <p className="admin-eyebrow">Content editor</p>
          <h2>{item.title || "New item"}</h2>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close item editor"
        >
          <X />
        </button>
      </div>
      <div className="item-dialog-body">
        <Card title="Content">
          <div className="form-grid">
            {field("title", titleLabel, { required: true })}
            <SelectField
              label="Publication status"
              value={item.status}
              onChange={(v) => onChange({ status: v as ContentItem["status"] })}
              options={[
                { value: "draft", label: "Draft — keep off the website" },
                {
                  value: "published",
                  label: "Published — show after Publish website",
                },
              ]}
            />
            {["websites", "campaigns"].includes(type) && (
              <Toggle
                label="Feature this item"
                checked={item.featured}
                onChange={(v) => onChange({ featured: v })}
              />
            )}{" "}
            {["skills", "expertise"].includes(type) && (
              <IconField
                value={item.icon}
                onChange={(v) => onChange({ icon: v })}
              />
            )}{" "}
            {["instagram", "custom"].includes(type) &&
              field("subtitle", "Subtitle / account handle")}
            {type !== "clients" &&
              field(
                "description",
                type === "testimonials"
                  ? "Testimonial quote"
                  : isArticle
                    ? "Article summary"
                    : "Description",
                { area: true },
              )}
            {hasImage && (
              <MediaField
                label={
                  type === "certificates"
                    ? "Certificate image"
                    : type === "clients"
                      ? "Company logo"
                      : type === "testimonials"
                        ? "Person’s photo"
                        : isTimeline
                          ? "Company / institution logo"
                          : "Cover / preview image"
                }
                value={item.image}
                onChange={(v) => onChange({ image: v })}
                tools={tools}
              />
            )}{" "}
            {hasImage &&
              field("imageAlt", "Image description (alt text)", {
                hint: "Describe the image for visitors using a screen reader.",
              })}
            {isTimeline && (
              <>
                {field(
                  "company",
                  type === "education" ? "Institution (optional)" : "Company",
                )}
                {field("location", "Location")}
                {field("startDate", "Start date", { type: "month" })}
                {!item.current &&
                  field("endDate", "End date", { type: "month" })}
                <Toggle
                  label={
                    type === "experience"
                      ? "I currently work here"
                      : "Currently studying"
                  }
                  checked={item.current}
                  onChange={(v) => onChange({ current: v })}
                />
              </>
            )}
            {type === "certificates" && (
              <>
                {field("issuer", "Issuing organization")}
                {field("issueDate", "Issue date", { type: "date" })}
                {field("credentialId", "Credential ID (optional)")}
                {field("url", "Verification URL", {
                  required: true,
                  hint: "The certificate image and View certificate button both open this link.",
                })}
              </>
            )}
            {type === "campaigns" && (
              <>
                {field("company", "Client / company")}
                {field("platform", "Advertising platform")}
                {field("period", "Campaign period")}
              </>
            )}
            {["websites", "instagram"].includes(type) && (
              <>
                {field(
                  "url",
                  type === "instagram"
                    ? "Instagram profile or public post URL"
                    : "Website / project URL",
                  { required: true },
                )}
                {type === "websites" &&
                  field("platform", "Technology / platform")}
                {field("role", "Your role")}
                {type === "instagram" && field("period", "Management period")}
                <SelectField
                  label="Frame preview"
                  value={item.previewMode}
                  onChange={(v) =>
                    onChange({ previewMode: v as ContentItem["previewMode"] })
                  }
                  options={[
                    { value: "image", label: "Screenshot inside a frame" },
                    {
                      value: "embed",
                      label:
                        type === "instagram"
                          ? "Official Instagram embed"
                          : "Live website iframe",
                    },
                  ]}
                  hint={
                    type === "instagram"
                      ? "Use a public Instagram URL with embedding enabled. A screenshot provides a reliable fallback."
                      : "Some sites block iframes. Upload a screenshot; visitors can always open the destination."
                  }
                />
              </>
            )}
            {type === "testimonials" && (
              <>
                {field("role", "Person’s role")}
                {field("company", "Company")}
              </>
            )}
            {isArticle && (
              <>
                {field("category", "Category")}
                {field("date", "Publication date", { type: "date" })}
                {field("updatedDate", "Last updated (optional)", {
                  type: "date",
                })}
              </>
            )}
            {![
              "certificates",
              "websites",
              "instagram",
              "articles",
              "skills",
              "testimonials",
            ].includes(type) && field("url", "Destination URL (optional)")}
            {!["skills", "testimonials", "clients"].includes(type) &&
              field("buttonLabel", "Button label (optional)", {
                hint: "Leave empty to use the default label in Branding & buttons.",
              })}
            {[
              "experience",
              "education",
              "expertise",
              "campaigns",
              "custom",
              "articles",
            ].includes(type) && (
              <MarkdownField
                label={isArticle ? "Article body" : "Details"}
                value={item.body}
                onChange={(v) => onChange({ body: v })}
                basePath={basePath}
              />
            )}
          </div>
        </Card>
        {type === "campaigns" && (
          <Card
            title="Campaign results"
            description="Add your actual results. Each metric appears beneath the campaign image and description."
            actions={
              <button
                className="admin-button small"
                disabled={item.metrics.length >= 12}
                onClick={() =>
                  onChange({
                    metrics: [
                      ...item.metrics,
                      { label: "", value: "", unit: "" },
                    ],
                  })
                }
              >
                <Plus size={15} />
                Add metric
              </button>
            }
          >
            {!item.metrics.length && (
              <p className="empty-inline">
                No metrics yet. You can also describe results in the text above.
              </p>
            )}
            {item.metrics.map((m, index) => (
              <div className="metric-editor" key={index}>
                <TextField
                  label="Metric"
                  value={m.label}
                  onChange={(v) =>
                    onChange({
                      metrics: item.metrics.map((x, i) =>
                        i === index ? { ...x, label: v } : x,
                      ),
                    })
                  }
                />
                <TextField
                  label="Value"
                  value={m.value}
                  onChange={(v) =>
                    onChange({
                      metrics: item.metrics.map((x, i) =>
                        i === index ? { ...x, value: v } : x,
                      ),
                    })
                  }
                />
                <TextField
                  label="Unit (optional)"
                  value={m.unit}
                  onChange={(v) =>
                    onChange({
                      metrics: item.metrics.map((x, i) =>
                        i === index ? { ...x, unit: v } : x,
                      ),
                    })
                  }
                />
                <button
                  className="icon-button danger"
                  aria-label="Remove metric"
                  onClick={() =>
                    onChange({
                      metrics: item.metrics.filter((_, i) => i !== index),
                    })
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </Card>
        )}
        {isArticle && (
          <Card
            title="Search engine optimization"
            description="These settings are included in the generated article HTML, sitemap, and social previews."
          >
            <div className="form-grid">
              {field("slug", "URL slug", {
                required: true,
                hint: "Use words separated by hyphens. Keep the same slug after publishing to preserve existing links.",
              })}
              <div className="field-action">
                <button
                  className="admin-button small"
                  onClick={() => onChange({ slug: slugify(item.title) })}
                >
                  Generate from title
                </button>
              </div>
              {field("seoTitle", "SEO title", {
                hint: `${item.seoTitle.length} characters. Leave empty to use your title template.`,
              })}
              {field("canonicalUrl", "Canonical URL (optional)", {
                hint: "Leave empty to use this article’s address. Use an external canonical only for republished content.",
              })}
              {field("seoDescription", "Meta description", {
                area: true,
                hint: `${item.seoDescription.length} characters. A clear summary around 150–160 characters is usually useful.`,
              })}
              <MediaField
                label="Social sharing image (optional)"
                value={item.socialImage}
                onChange={(v) => onChange({ socialImage: v })}
                tools={tools}
              />
              <Toggle
                label="Allow search engines to index this article"
                checked={item.indexable}
                onChange={(v) => onChange({ indexable: v })}
              />
            </div>
            <div className="search-preview">
              <span>
                {siteUrl}articles/
                {encodeURIComponent(item.slug || "article-slug")}/
              </span>
              <strong>{item.seoTitle || item.title || "Article title"}</strong>
              <p>
                {item.seoDescription ||
                  item.description ||
                  "Your article description will appear here."}
              </p>
            </div>
          </Card>
        )}
      </div>
      <div className="item-dialog-footer">
        <span>
          Changes are kept in this editing session. Use Save draft or Publish
          website to save them to GitHub.
        </span>
        <button className="admin-button primary" onClick={onClose}>
          Done editing
        </button>
      </div>
    </dialog>
  );
}
