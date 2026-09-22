import { useId, useState } from "react";
import { ImagePlus, Upload, X } from "lucide-react";
import type { Media } from "../model";
import { TextField } from "./fields";
import { documentAccept, imageAccept } from "./media";
export type MediaTools = {
  media: Media[];
  resolve: (path: string) => string;
  upload: (file: File) => Promise<string>;
};
export function MediaField({
  label,
  value,
  onChange,
  tools,
  pdf = false,
  accept,
  mediaFilter,
  placeholder = "uploads/photo.jpg or https://…",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  tools: MediaTools;
  pdf?: boolean;
  accept?: string;
  mediaFilter?: (media: Media) => boolean;
  placeholder?: string;
}) {
  const [select, setSelect] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    id = useId();
  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      onChange(await tools.upload(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload failed.");
    } finally {
      setBusy(false);
    }
  }
  const image = /\.(?:png|jpe?g|webp|gif|ico)(?:$|\?)/i.test(value),
    allowedExisting =
      mediaFilter ||
      ((m: Media) =>
        pdf ? m.type.startsWith("image/") || m.type === "application/pdf" : m.type.startsWith("image/"));
  return (
    <div className="media-field field-wide">
      <span className="field-label">{label}</span>
      <div className="media-control">
        {image ? (
          <img
            className="media-thumb"
            src={tools.resolve(value)}
            alt="Selected file"
          />
        ) : (
          <div className="media-thumb media-placeholder">
            <ImagePlus size={26} />
          </div>
        )}
        <div className="media-actions">
          <label
            className={"admin-button small " + (busy ? "disabled" : "")}
            htmlFor={id}
          >
            <Upload size={15} />
            {busy ? "Preparing…" : "Upload file"}
          </label>
          <input
            className="file-input"
            id={id}
            type="file"
            accept={accept || (pdf ? documentAccept : imageAccept)}
            disabled={busy}
            onChange={(e) => {
              if (e.target.files?.[0]) void upload(e.target.files[0]);
              e.target.value = "";
            }}
          />
          <button
            className="admin-button small"
            type="button"
            onClick={() => setSelect(!select)}
          >
            Choose existing
          </button>
          {value && (
            <button
              className="icon-button danger"
              type="button"
              title="Clear selected file"
              onClick={() => onChange("")}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      <TextField
        label="File path or image URL"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      {select && (
        <div className="media-selection">
          <label className="sr-only" htmlFor={id + "-select"}>
            Select uploaded file
          </label>
          <select
            id={id + "-select"}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setSelect(false);
            }}
          >
            <option value="">Choose a file…</option>
            {tools.media
              .filter(allowedExisting)
              .map((m) => (
                <option value={m.path} key={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </div>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <small className="field-hint">
        Up to 8 MB per file. Files upload when you save a draft or publish.
      </small>
    </div>
  );
}
