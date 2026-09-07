import { newId, type Media, type StagedUpload } from "../model";
export const uploadAccept =
  "image/png,image/jpeg,image/webp,image/gif,image/x-icon,image/vnd.microsoft.icon,application/pdf";
export async function stageFile(
  file: File,
): Promise<{ media: Media; upload: StagedUpload; preview: string }> {
  if (file.size === 0 || file.size > 8 * 1024 * 1024)
    throw new Error("Choose a nonempty image or PDF smaller than 8 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer()),
    text = new TextDecoder("ascii").decode(bytes.slice(0, 12));
  const ext =
    bytes[0] === 137 && text.slice(1, 4) === "PNG"
      ? "png"
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        ? "jpg"
        : text.startsWith("RIFF") && text.slice(8, 12) === "WEBP"
          ? "webp"
          : text.startsWith("GIF87a") || text.startsWith("GIF89a")
            ? "gif"
            : bytes[0] === 0 &&
                bytes[1] === 0 &&
                bytes[2] === 1 &&
                bytes[3] === 0
              ? "ico"
              : text.startsWith("%PDF-")
                ? "pdf"
                : "";
  if (!ext)
    throw new Error(
      "Supported formats are PNG, JPG, WebP, GIF, ICO, and PDF. Convert SVG logos to PNG before uploading.",
    );
  const safeName =
    file.name
      .replace(/\.[^.]+$/, "")
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9-]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "file";
  const id = newId("media"),
    path = `uploads/${safeName}-${crypto.randomUUID()}.${ext}`;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const type =
    ext === "pdf"
      ? "application/pdf"
      : ext === "jpg"
        ? "image/jpeg"
        : ext === "ico"
          ? "image/x-icon"
          : "image/" + ext;
  return {
    media: { id, name: file.name, path, type, size: file.size, alt: "" },
    upload: { path: "public/" + path, base64: btoa(binary), size: file.size },
    preview: URL.createObjectURL(new Blob([bytes], { type })),
  };
}
export function fileSize(bytes: number) {
  return bytes < 1024
    ? bytes + " B"
    : bytes < 1024 * 1024
      ? Math.ceil(bytes / 1024) + " KB"
      : (bytes / 1024 / 1024).toFixed(1) + " MB";
}
