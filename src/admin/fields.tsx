import { useId, useRef, type ReactNode } from "react";
import { Icon, iconChoices } from "../icons";
import { markdown } from "../safe";

type FieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
  wide?: boolean;
};
export function Field({ label, hint, children, wide = false }: FieldProps) {
  const id = useId();
  return (
    <div className={"editor-field " + (wide ? "field-wide" : "")}>
      <span className="field-label" id={id}>
        {label}
      </span>
      {children}
      {hint && <small className="field-hint">{hint}</small>}
    </div>
  );
}
export function TextField({
  label,
  value,
  onChange,
  hint,
  area = false,
  type = "text",
  placeholder = "",
  maxLength,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  area?: boolean;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className={"editor-field " + (area ? "field-wide" : "")}>
      <label htmlFor={id}>
        {label}
        {required && <span className="required-mark"> *</span>}
      </label>
      {area ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={placeholder}
          maxLength={maxLength}
          dir="auto"
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          dir={
            ["url", "email", "date", "month"].includes(type) ? "ltr" : "auto"
          }
        />
      )}{" "}
      {hint && <small className="field-hint">{hint}</small>}
    </div>
  );
}
export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="editor-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <small className="field-hint">{hint}</small>}
    </div>
  );
}
export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="toggle-field">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true" />
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}
export function IconField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="icon-picker">
      <SelectField
        label="Icon"
        value={value}
        onChange={onChange}
        options={iconChoices.map((i) => ({
          value: i,
          label: i.replaceAll("-", " "),
        }))}
      />
      <span className="icon-sample">
        <Icon name={value} size={27} />
      </span>
    </div>
  );
}
export function Card({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="editor-card">
      <div className="editor-card-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
export function MarkdownField({
  label,
  value,
  onChange,
  basePath,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  basePath: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null),
    id = useId();
  const insert = (before: string, after = "") => {
    const input = ref.current;
    if (!input) return;
    const start = input.selectionStart,
      end = input.selectionEnd,
      selected = value.slice(start, end);
    const next =
      value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    });
  };
  return (
    <div className="editor-field field-wide">
      <label htmlFor={id}>{label}</label>
      <div className="markdown-editor">
        <div
          className="markdown-toolbar"
          role="toolbar"
          aria-label="Markdown formatting"
        >
          <button
            type="button"
            onClick={() => insert("**", "**")}
            aria-label="Bold"
          >
            <b>B</b>
          </button>
          <button
            type="button"
            onClick={() => insert("*", "*")}
            aria-label="Italic"
          >
            <i>I</i>
          </button>
          <button
            type="button"
            onClick={() => insert("\n## ")}
            aria-label="Heading"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => insert("\n- ")}
            aria-label="List"
          >
            List
          </button>
          <button
            type="button"
            onClick={() => insert("[", "](https://example.com)")}
            aria-label="Insert link"
          >
            Link
          </button>
          <button
            type="button"
            onClick={() => insert("![Image description](", ")")}
            aria-label="Insert image"
          >
            Image
          </button>
          <button
            type="button"
            onClick={() => insert("\n> ")}
            aria-label="Quote"
          >
            Quote
          </button>
        </div>
        <textarea
          ref={ref}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={12}
          dir="auto"
        />
      </div>
      <small className="field-hint">
        Markdown supports headings, lists, links, and images. Upload images in
        Media and paste their file path. HTML is displayed as text.
      </small>
      <details className="markdown-preview">
        <summary>Preview formatted text</summary>
        <div
          dir="auto"
          className="editor-prose"
          dangerouslySetInnerHTML={{ __html: markdown(value, basePath) }}
        />
      </details>
    </div>
  );
}
