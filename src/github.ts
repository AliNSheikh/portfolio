import {
  clone,
  referencedMedia,
  siteSchema,
  type DraftEnvelope,
  type ProjectConfig,
  type SiteDocument,
  type StagedUpload,
} from "./model";
import { localMediaPaths, validateDocument, validateProject } from "./safe";

export class ConflictError extends Error {
  constructor(
    message = "The repository changed since you opened it. Reload the latest content before saving. Your local changes are still here.",
  ) {
    super(message);
    this.name = "ConflictError";
  }
}
export class GitHubError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}
export type Snapshot = {
  head: string;
  published: SiteDocument;
  publishedSha: string;
  draft: DraftEnvelope | null;
  draftSha: string | null;
  draftStale: boolean;
};
type GitFile = { sha: string; content: string; encoding: string };
type Commit = { sha: string; tree: { sha: string } };
const publishedPath = "content/site.json",
  draftPath = "content/draft.json";
export const uploadPath =
  /^public\/uploads\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,160}\.(?:png|jpe?g|webp|gif|ico|pdf)$/;
export function encodeText(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
export function decodeText(value: string) {
  return new TextDecoder().decode(
    Uint8Array.from(atob(value.replace(/\s/g, "")), (c) => c.charCodeAt(0)),
  );
}
function json(value: unknown) {
  return JSON.stringify(value, null, 2) + "\n";
}
function parseDraft(file: GitFile | null): DraftEnvelope | null {
  if (!file) return null;
  const data = JSON.parse(decodeText(file.content));
  if (
    data.schemaVersion !== 1 ||
    typeof data.basePublishedSha !== "string" ||
    typeof data.savedAt !== "string" ||
    !Array.isArray(data.deletions) ||
    !data.deletions.every(
      (p: unknown) => typeof p === "string" && uploadPath.test(p),
    )
  )
    throw new Error(
      "The saved draft has an unsupported format. Restore a valid draft in GitHub to continue.",
    );
  return { ...data, document: siteSchema.parse(data.document) };
}

/** The token stays in this in-memory object only. Authorization is enforced by GitHub. */
export class GitHubCMS {
  readonly config: ProjectConfig;
  private root: string;
  constructor(
    config: ProjectConfig,
    private token: string,
    private transport: typeof fetch = fetch,
  ) {
    this.config = validateProject(config);
    this.root = `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repository)}`;
  }
  dispose() {
    this.token = "";
  }
  private async request<T>(
    path: string,
    method = "GET",
    body?: unknown,
    accept = "application/vnd.github+json",
  ): Promise<T> {
    if (!this.token)
      throw new Error(
        "Your editing session has ended. Connect again to continue.",
      );
    let response: Response;
    try {
      response = await this.transport("https://api.github.com" + path, {
        method,
        cache: "no-store",
        referrerPolicy: "no-referrer",
        headers: {
          Accept: accept,
          Authorization: "Bearer " + this.token,
          "X-GitHub-Api-Version": "2026-03-10",
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new Error(
        "GitHub could not be reached. Check your connection and reload the repository before retrying a save. Your local edits have been kept.",
      );
    }
    if (!response.ok) {
      const messages: Record<number, string> = {
        401: "GitHub rejected the token. Check that it is valid and has not expired.",
        403: "GitHub denied this action. Give your fine-grained token Contents: Read and write access to this repository, and check repository rules or rate limits.",
        404: "GitHub could not find this file or repository. Check the repository, branch, and token access.",
        409: "GitHub could not update this branch. Reload the latest repository state.",
        422: "GitHub rejected the change. The branch may have moved or a repository rule may require a pull request.",
      };
      throw new GitHubError(
        messages[response.status] ||
          `GitHub returned error ${response.status}. Try again after checking the repository.`,
        response.status,
      );
    }
    return response.status === 204
      ? (undefined as T)
      : ((await response.json()) as T);
  }
  async connect() {
    const user = await this.request<{ login: string }>("/user");
    const repo = await this.request<{
      permissions?: { push?: boolean };
      private: boolean;
      default_branch: string;
    }>(this.root);
    if (!repo.permissions?.push)
      throw new Error(
        "This GitHub account cannot edit the selected repository. Sign in with an account that has write access.",
      );
    return { login: user.login, isPublic: !repo.private };
  }
  private async head() {
    return (
      await this.request<{ object: { sha: string } }>(
        `${this.root}/git/ref/heads/${this.config.branch.split("/").map(encodeURIComponent).join("/")}`,
      )
    ).object.sha;
  }
  private async file(
    path: string,
    ref: string,
    optional = false,
  ): Promise<GitFile | null> {
    try {
      return await this.request<GitFile>(
        `${this.root}/contents/${path}?ref=${encodeURIComponent(ref)}`,
        "GET",
        undefined,
        "application/vnd.github.object+json",
      );
    } catch (error) {
      if (optional && error instanceof GitHubError && error.status === 404)
        return null;
      throw error;
    }
  }
  private async readContent(file: GitFile): Promise<GitFile> {
    if (file.encoding === "base64") return file;
    return {
      ...file,
      ...(await this.request<GitFile>(`${this.root}/git/blobs/${file.sha}`)),
    };
  }
  async load(): Promise<Snapshot> {
    const head = await this.head();
    const [published, draft] = await Promise.all([
      this.file(publishedPath, head),
      this.file(draftPath, head, true),
    ]);
    if (!published)
      throw new Error(
        "Upload the source package, including content/site.json, to the repository root first.",
      );
    const document = siteSchema.parse(
        JSON.parse(decodeText((await this.readContent(published)).content)),
      ),
      envelope = parseDraft(draft ? await this.readContent(draft) : null);
    return {
      head,
      published: document,
      publishedSha: published.sha,
      draft: envelope,
      draftSha: draft?.sha || null,
      draftStale: !!envelope && envelope.basePublishedSha !== published.sha,
    };
  }
  async save(
    mode: "draft" | "publish",
    document: SiteDocument,
    snapshot: Snapshot,
    uploads: StagedUpload[] = [],
    deletions: string[] = [],
  ): Promise<Snapshot> {
    // A draft can be incomplete. A publication must pass every content and link check.
    const checked =
      mode === "publish"
        ? validateDocument(document)
        : siteSchema.parse(document);
    const uploadNames = new Set<string>();
    for (const upload of uploads) {
      if (
        !uploadPath.test(upload.path) ||
        uploadNames.has(upload.path) ||
        upload.size > 8 * 1024 * 1024 ||
        !upload.base64 ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(upload.base64)
      )
        throw new Error("An upload is invalid or exceeds the 8 MB file limit.");
      uploadNames.add(upload.path);
    }
    for (const path of deletions) {
      if (!uploadPath.test(path))
        throw new Error("Only files in the uploads folder can be removed.");
      if (referencedMedia(checked, path.replace(/^public\//, "")))
        throw new Error(
          "A file marked for deletion is still used by the website. Remove its references first.",
        );
    }
    const head = await this.head();
    const [published, draft, commit] = await Promise.all([
      this.file(publishedPath, head),
      this.file(draftPath, head, true),
      this.request<Commit>(`${this.root}/git/commits/${head}`),
    ]);
    if (
      published?.sha !== snapshot.publishedSha ||
      (draft?.sha || null) !== snapshot.draftSha
    )
      throw new ConflictError();
    if (mode === "publish") {
      const tree = await this.request<{
        tree: { path: string; type: string }[];
        truncated: boolean;
      }>(`${this.root}/git/trees/${commit.tree.sha}?recursive=1`);
      if (tree.truncated)
        throw new Error(
          "The repository file list is too large to verify safely. Archive unused repository files before publishing.",
        );
      const available = new Set(
        tree.tree
          .filter((entry) => entry.type === "blob")
          .map((entry) => entry.path),
      );
      for (const path of localMediaPaths(checked))
        if (
          !available.has("public/" + path) &&
          !uploadNames.has("public/" + path)
        )
          throw new Error(
            `Missing media: ${path}. Upload or select the file before publishing.`,
          );
    }
    for (const upload of uploads)
      if (await this.file(upload.path, head, true))
        throw new Error(
          "An upload filename already exists. Upload the file again to generate a new name.",
        );
    const envelope: DraftEnvelope = {
      schemaVersion: 1,
      basePublishedSha: snapshot.publishedSha,
      savedAt: new Date().toISOString(),
      document: clone(checked),
      deletions: [...new Set(deletions)],
    };
    const nextPath = mode === "publish" ? publishedPath : draftPath;
    const textContent = json(mode === "publish" ? checked : envelope);
    if (new TextEncoder().encode(textContent).length > 4 * 1024 * 1024)
      throw new Error(
        "Content exceeds 4 MB. Keep images as uploaded files and shorten or archive older text before saving.",
      );
    const contentBlob = await this.request<{ sha: string }>(
      `${this.root}/git/blobs`,
      "POST",
      { content: textContent, encoding: "utf-8" },
    );
    const entries: {
      path: string;
      mode: string;
      type: string;
      sha: string | null;
    }[] = [
      { path: nextPath, mode: "100644", type: "blob", sha: contentBlob.sha },
    ];
    // Sequential uploads avoid issuing a burst of GitHub writes from the browser.
    for (const upload of uploads) {
      const blob = await this.request<{ sha: string }>(
        `${this.root}/git/blobs`,
        "POST",
        { content: upload.base64, encoding: "base64" },
      );
      entries.push({
        path: upload.path,
        mode: "100644",
        type: "blob",
        sha: blob.sha,
      });
    }
    if (mode === "publish") {
      if (snapshot.draftSha)
        entries.push({
          path: draftPath,
          mode: "100644",
          type: "blob",
          sha: null,
        });
      for (const path of [...new Set(deletions)])
        if (!uploadNames.has(path) && (await this.file(path, head, true)))
          entries.push({ path, mode: "100644", type: "blob", sha: null });
    }
    const tree = await this.request<{ sha: string }>(
      `${this.root}/git/trees`,
      "POST",
      { base_tree: commit.tree.sha, tree: entries },
    );
    const created = await this.request<{ sha: string }>(
      `${this.root}/git/commits`,
      "POST",
      {
        message:
          mode === "publish"
            ? "Publish portfolio content"
            : "Save portfolio draft",
        tree: tree.sha,
        parents: [head],
      },
    );
    if ((await this.head()) !== head)
      throw new ConflictError(
        "The branch changed while saving. Nothing was published. Reload the latest content and try again.",
      );
    try {
      await this.request(
        `${this.root}/git/refs/heads/${this.config.branch.split("/").map(encodeURIComponent).join("/")}`,
        "PATCH",
        { sha: created.sha, force: false },
      );
    } catch (error) {
      if (error instanceof GitHubError && [409, 422].includes(error.status))
        throw new ConflictError(
          "The update was not applied. Another edit or branch rule prevented publishing. Your local changes have been kept.",
        );
      throw error;
    }
    return mode === "publish"
      ? {
          head: created.sha,
          published: clone(checked),
          publishedSha: contentBlob.sha,
          draft: null,
          draftSha: null,
          draftStale: false,
        }
      : {
          ...snapshot,
          head: created.sha,
          draft: envelope,
          draftSha: contentBlob.sha,
          draftStale: false,
        };
  }
}
