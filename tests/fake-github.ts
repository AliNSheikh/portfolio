import { createHash } from "node:crypto";
import { encodeText } from "../src/github";
import type { SiteDocument } from "../src/model";
type Tree = Record<string, string>;
export class FakeGitHub {
  blobs = new Map<string, string>();
  trees = new Map<string, Tree>();
  commits = new Map<
    string,
    { sha: string; tree: { sha: string }; parents: string[] }
  >();
  head = "";
  calls: {
    path: string;
    method: string;
    body: any;
    headers: Record<string, string>;
  }[] = [];
  canPush = true;
  rejectPatch = false;
  onCommit: (() => void) | null = null;
  largeContent = false;
  hash(value: string) {
    return createHash("sha1").update(value).digest("hex");
  }
  blob(content: string) {
    const sha = this.hash(content);
    this.blobs.set(sha, content);
    return sha;
  }
  tree(value: Tree) {
    const sha = this.hash(JSON.stringify(value));
    this.trees.set(sha, { ...value });
    return sha;
  }
  commit(tree: string, parents: string[] = []) {
    const sha = this.hash(tree + parents.join(",") + this.commits.size);
    this.commits.set(sha, { sha, tree: { sha: tree }, parents });
    return sha;
  }
  constructor(site: SiteDocument) {
    const tree: Tree = {
      "content/site.json": this.blob(JSON.stringify(site)),
      "README.md": this.blob("Keep unrelated files"),
    };
    for (const media of site.media)
      tree["public/" + media.path] = this.blob("asset:" + media.path);
    this.head = this.commit(this.tree(tree));
  }
  files() {
    return { ...this.trees.get(this.commits.get(this.head)!.tree.sha)! };
  }
  text(path: string) {
    const sha = this.files()[path];
    return sha ? this.blobs.get(sha) : undefined;
  }
  advance(path = "README.md", value = "Concurrent edit") {
    const files = this.files();
    files[path] = this.blob(value);
    this.head = this.commit(this.tree(files), [this.head]);
  }
  response(value: unknown, status = 200) {
    return new Response(JSON.stringify(value), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
  fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input)),
      method = init?.method || "GET",
      path = url.pathname.replace("/repos/AliNSheikh/portfolio", ""),
      body = init?.body ? JSON.parse(String(init.body)) : undefined;
    this.calls.push({
      path,
      method,
      body,
      headers: init?.headers as Record<string, string>,
    });
    if (url.hostname !== "api.github.com")
      throw new Error("Unexpected external host");
    if (path === "/user") return this.response({ login: "AliNSheikh" });
    if (path === "")
      return this.response({
        permissions: { push: this.canPush },
        private: false,
        default_branch: "main",
      });
    if (path === "/git/ref/heads/main")
      return this.response({ object: { sha: this.head } });
    if (path.startsWith("/contents/")) {
      const commit = this.commits.get(url.searchParams.get("ref") || this.head),
        tree = commit && this.trees.get(commit.tree.sha),
        sha = tree?.[path.slice(10)];
      if (!sha) return this.response({ message: "Not Found" }, 404);
      return this.response({
        sha,
        encoding: this.largeContent ? "none" : "base64",
        content: this.largeContent ? "" : encodeText(this.blobs.get(sha)!),
      });
    }
    if (method === "GET" && path.startsWith("/git/commits/"))
      return this.response(this.commits.get(path.slice(13)));
    if (method === "GET" && path.startsWith("/git/trees/"))
      return this.response({
        truncated: false,
        tree: Object.entries(this.trees.get(path.slice(11)) || {}).map(
          ([path, sha]) => ({ path, sha, type: "blob" }),
        ),
      });
    if (method === "GET" && path.startsWith("/git/blobs/")) {
      const sha = path.slice(11);
      return this.response({
        sha,
        encoding: "base64",
        content: encodeText(this.blobs.get(sha)!),
      });
    }
    if (method === "POST" && path === "/git/blobs") {
      const content =
        body.encoding === "base64"
          ? Buffer.from(body.content, "base64").toString("utf8")
          : body.content;
      return this.response({ sha: this.blob(content) }, 201);
    }
    if (method === "POST" && path === "/git/trees") {
      const tree = { ...this.trees.get(body.base_tree) };
      for (const entry of body.tree) {
        if (entry.sha === null) delete tree[entry.path];
        else tree[entry.path] = entry.sha;
      }
      return this.response({ sha: this.tree(tree) }, 201);
    }
    if (method === "POST" && path === "/git/commits") {
      const sha = this.commit(body.tree, body.parents);
      this.onCommit?.();
      return this.response({ sha }, 201);
    }
    if (method === "PATCH" && path === "/git/refs/heads/main") {
      if (
        this.rejectPatch ||
        !this.commits.get(body.sha)?.parents.includes(this.head) ||
        body.force !== false
      )
        return this.response({ message: "Not fast forward" }, 422);
      this.head = body.sha;
      return this.response({ object: { sha: this.head } });
    }
    throw new Error("Unhandled GitHub request: " + method + " " + path);
  }) as typeof fetch;
}
