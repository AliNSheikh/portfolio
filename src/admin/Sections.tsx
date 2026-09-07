import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from "lucide-react";
import {
  clone,
  newId,
  newItem,
  newSection,
  sectionNames,
  sectionTypes,
  type ContentItem,
  type Section,
  type SectionType,
  type SiteDocument,
} from "../model";
import { Card, SelectField, TextField, Toggle } from "./fields";
import { Icon } from "../icons";
import { ItemEditor } from "./ItemEditor";
import type { MediaTools } from "./MediaField";
export type ChangeSite = (fn: (draft: SiteDocument) => void) => void;
export function move<T>(items: T[], index: number, delta: number) {
  const next = [...items],
    target = index + delta;
  if (target < 0 || target >= items.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
export function SectionList({
  site,
  change,
  onOpen,
}: {
  site: SiteDocument;
  change: ChangeSite;
  onOpen: (id: string) => void;
}) {
  const [type, setType] = useState<SectionType>("custom");
  return (
    <>
      <Card
        title="Your website, section by section"
        description="Reorder, hide, duplicate, or remove sections. Empty sections stay off the public website."
      >
        <div className="section-list">
          {site.sections.map((s, index) => (
            <div className="section-manager-row" key={s.id}>
              <span className="row-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <button className="section-open" onClick={() => onOpen(s.id)}>
                <strong>{s.title}</strong>
                <span>
                  {sectionNames[s.type]} · {s.items.length} items ·{" "}
                  {s.visible ? "Visible" : "Hidden"}
                </span>
              </button>
              <div className="row-actions">
                <button
                  className="icon-button"
                  aria-label={s.visible ? "Hide " + s.title : "Show " + s.title}
                  onClick={() =>
                    change((d) => {
                      d.sections[index].visible = !s.visible;
                    })
                  }
                >
                  {s.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
                <button
                  className="icon-button"
                  disabled={index === 0}
                  aria-label={"Move " + s.title + " up"}
                  onClick={() =>
                    change((d) => {
                      d.sections = move(d.sections, index, -1);
                    })
                  }
                >
                  <ArrowUp size={17} />
                </button>
                <button
                  className="icon-button"
                  disabled={index === site.sections.length - 1}
                  aria-label={"Move " + s.title + " down"}
                  onClick={() =>
                    change((d) => {
                      d.sections = move(d.sections, index, 1);
                    })
                  }
                >
                  <ArrowDown size={17} />
                </button>
                <button
                  className="icon-button"
                  title="Duplicate section"
                  onClick={() =>
                    change((d) => {
                      const copy = clone(s);
                      copy.id = newId(s.type);
                      copy.title += " (copy)";
                      copy.showInNav = false;
                      copy.visible = false;
                      copy.items = copy.items.map((i) => ({
                        ...i,
                        id: newId(),
                        status:
                          i.status === "published" && s.type === "articles"
                            ? "draft"
                            : i.status,
                      }));
                      d.sections.splice(index + 1, 0, copy);
                    })
                  }
                >
                  <Copy size={17} />
                </button>
                <button
                  className="icon-button danger"
                  title="Delete section"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete “${s.title}” and all its items from this draft? The live site changes only when you publish.`,
                      )
                    )
                      change((d) => {
                        d.sections = d.sections.filter((x) => x.id !== s.id);
                      });
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card
        title="Add a section"
        description="Use a built-in section type or create custom content."
      >
        <div className="add-section-form">
          <SelectField
            label="Section type"
            value={type}
            onChange={(v) => setType(v as SectionType)}
            options={sectionTypes.map((t) => ({
              value: t,
              label: sectionNames[t],
            }))}
          />
          <button
            className="admin-button primary"
            disabled={site.sections.length >= 60}
            onClick={() => {
              const s = newSection(type);
              change((d) => {
                d.sections.push(s);
              });
              onOpen(s.id);
            }}
          >
            <Plus size={18} />
            Add section
          </button>
        </div>
      </Card>
    </>
  );
}
export function SectionEditor({
  section: s,
  change,
  tools,
  basePath,
  siteUrl,
  onBack,
  onRename,
}: {
  section: Section;
  change: ChangeSite;
  tools: MediaTools;
  basePath: string;
  siteUrl: string;
  onBack: () => void;
  onRename: (id: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null),
    [search, setSearch] = useState(""),
    [anchor, setAnchor] = useState(s.id);
  const update = (patch: Partial<Section>) =>
    change((d) => {
      const target = d.sections.find((x) => x.id === s.id);
      if (target) Object.assign(target, patch);
    });
  const item = s.items.find((i) => i.id === editing);
  const itemUpdate = (patch: Partial<ContentItem>) =>
    change((d) => {
      const target = d.sections
        .find((x) => x.id === s.id)
        ?.items.find((x) => x.id === editing);
      if (target) Object.assign(target, patch);
    });
  const add = () => {
    const i = newItem();
    i.status = "draft";
    if (s.type === "articles") i.date = new Date().toISOString().slice(0, 10);
    update({ items: [...s.items, i] });
    setEditing(i.id);
  };
  return (
    <>
      <button className="back-button" onClick={onBack}>
        ← All sections
      </button>
      <Card title="Section settings" description={sectionNames[s.type]}>
        <div className="form-grid">
          <TextField
            label="Section title"
            value={s.title}
            onChange={(v) => update({ title: v })}
          />
          <TextField
            label="Eyebrow / small heading"
            value={s.eyebrow}
            onChange={(v) => update({ eyebrow: v })}
          />
          <TextField
            label="Introduction"
            value={s.description}
            onChange={(v) => update({ description: v })}
            area
          />
          <Toggle
            label="Show this section"
            checked={s.visible}
            onChange={(v) => update({ visible: v })}
          />
          <Toggle
            label="Show in navigation"
            checked={s.showInNav}
            onChange={(v) => update({ showInNav: v })}
          />
          {s.showInNav && (
            <TextField
              label="Navigation label"
              value={s.navLabel}
              onChange={(v) => update({ navLabel: v })}
            />
          )}
          <TextField
            label="Section anchor ID"
            value={anchor}
            onChange={setAnchor}
            hint={
              "Link to this section with #" +
              s.id +
              ". Use lower-case letters, numbers, and hyphens."
            }
          />
          <div className="field-action">
            <button
              className="admin-button small"
              disabled={anchor === s.id}
              onClick={() => onRename(anchor)}
            >
              Update anchor
            </button>
          </div>
          {s.type === "custom" && (
            <SelectField
              label="Layout"
              value={s.layout}
              onChange={(v) => update({ layout: v as Section["layout"] })}
              options={[
                { value: "grid", label: "Card grid" },
                { value: "list", label: "Stacked list" },
                { value: "split", label: "Image and text rows" },
              ]}
            />
          )}
        </div>
      </Card>
      {s.type === "contact" ? (
        <Card title="Contact buttons">
          <p>
            The contact section uses the phone number, email, and links in{" "}
            <strong>Contact & links</strong>. Changes there also update the
            floating buttons and connected hero buttons.
          </p>
        </Card>
      ) : (
        <Card
          title={s.type === "articles" ? "Articles" : "Section content"}
          description="Drag-free ordering works on phones and keyboards using the arrow buttons."
          actions={
            <button
              className="admin-button primary small"
              disabled={s.items.length >= 300}
              onClick={add}
            >
              <Plus size={16} />
              Add {s.type === "articles" ? "article" : "item"}
            </button>
          }
        >
          {s.items.length > 5 && (
            <TextField
              label="Find content"
              value={search}
              onChange={setSearch}
              placeholder="Search titles…"
            />
          )}
          {!s.items.length ? (
            <div className="admin-empty">
              <Icon
                name={s.type === "certificates" ? "award" : "file"}
                size={34}
              />
              <h3>Ready for your first item</h3>
              <p>
                Add your own content. This section will appear after you publish
                an item.
              </p>
              <button className="admin-button" onClick={add}>
                <Plus size={17} />
                Add item
              </button>
            </div>
          ) : (
            <div className="content-list">
              {s.items
                .filter((i) =>
                  (i.title + " " + i.description)
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((i) => {
                  const index = s.items.findIndex((x) => x.id === i.id);
                  return (
                    <div className="content-row" key={i.id}>
                      {i.image ? (
                        <img src={tools.resolve(i.image)} alt="" />
                      ) : (
                        <span className="content-icon">
                          <Icon name={i.icon} />
                        </span>
                      )}
                      <button
                        className="section-open"
                        onClick={() => setEditing(i.id)}
                      >
                        <strong>{i.title || "Untitled item"}</strong>
                        <span>
                          <i className={"status-dot " + i.status} />
                          {i.status === "published"
                            ? "Ready to publish"
                            : "Draft"}
                          {i.company ? " · " + i.company : ""}
                        </span>
                      </button>
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          disabled={index === 0}
                          aria-label="Move item up"
                          onClick={() =>
                            update({ items: move(s.items, index, -1) })
                          }
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          className="icon-button"
                          disabled={index === s.items.length - 1}
                          aria-label="Move item down"
                          onClick={() =>
                            update({ items: move(s.items, index, 1) })
                          }
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button
                          className="icon-button"
                          title="Duplicate item"
                          onClick={() => {
                            const copy = {
                              ...clone(i),
                              id: newId(),
                              title: i.title + " (copy)",
                              status: "draft" as const,
                              slug: "",
                            };
                            update({ items: [...s.items, copy] });
                            setEditing(copy.id);
                          }}
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          className="icon-button danger"
                          title="Delete item"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete “${i.title || "Untitled item"}” from this draft?`,
                              )
                            )
                              update({
                                items: s.items.filter((x) => x.id !== i.id),
                              });
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      )}
      {item && (
        <ItemEditor
          key={item.id}
          item={item}
          type={s.type}
          tools={tools}
          basePath={basePath}
          siteUrl={siteUrl}
          onChange={itemUpdate}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
