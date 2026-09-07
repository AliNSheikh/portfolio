import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import config from "./fixtures/project.json";
import { ConflictError, GitHubCMS } from "../src/github";
import { clone, newItem, siteSchema } from "../src/model";
import { FakeGitHub } from "./fake-github";
const seed = siteSchema.parse(
  JSON.parse(
    await readFile(new URL("./fixtures/site.json", import.meta.url), "utf8"),
  ),
);
function setup() {
  const api = new FakeGitHub(seed);
  return {
    api,
    client: new GitHubCMS(config, "test-token-never-real", api.fetch),
  };
}

test("connects with repository write access and ends an in-memory editing session", async () => {
  const { api, client } = setup();
  assert.deepEqual(await client.connect(), {
    login: "AliNSheikh",
    isPublic: true,
  });
  const snapshot = await client.load();
  assert.equal(snapshot.published.profile.name, "Ali Sheikh");
  const calls = api.calls.length;
  client.dispose();
  await assert.rejects(() => client.load(), /session has ended/);
  assert.equal(api.calls.length, calls);
  for (const c of api.calls) {
    assert.equal(c.headers.Authorization, "Bearer test-token-never-real");
    assert.ok(!JSON.stringify(c.body || "").includes("test-token-never-real"));
    assert.ok(!c.path.includes("test-token-never-real"));
  }
});
test("refuses an account without repository write access", async () => {
  const { api, client } = setup();
  api.canPush = false;
  await assert.rejects(() => client.connect(), /cannot edit/);
  assert.ok(api.calls.every((c) => c.method === "GET"));
});
test("saves an incomplete shared draft without changing published content", async () => {
  const { api, client } = setup();
  const snapshot = await client.load(),
    document = clone(snapshot.published),
    publishedBefore = api.text("content/site.json");
  document.profile.name = "Edited name";
  const item = newItem();
  item.status = "draft";
  document.sections.find((s) => s.type === "articles")!.items.push(item);
  const saved = await client.save("draft", document, snapshot);
  assert.equal(api.text("content/site.json"), publishedBefore);
  const draft = JSON.parse(api.text("content/draft.json")!);
  assert.equal(draft.document.profile.name, "Edited name");
  assert.equal(draft.basePublishedSha, snapshot.publishedSha);
  assert.equal(saved.draftSha, api.files()["content/draft.json"]);
  const next = await client.load();
  assert.equal(next.draft!.document.profile.name, "Edited name");
  assert.equal(next.draftStale, false);
});
test("publishes content and media atomically, removes the draft, and preserves unrelated files", async () => {
  const { api, client } = setup();
  let snapshot = await client.load();
  const document = clone(snapshot.published);
  document.profile.name = "Ali Sheikh";
  const article = {
    ...newItem(),
    title: "A real article",
    body: "## A useful result\n\nArticle body.",
    slug: "a-real-article",
    date: "2026-09-07",
  };
  document.sections.find((s) => s.type === "articles")!.items.push(article);
  snapshot = await client.save("draft", document, snapshot);
  const path = "uploads/certificate-123.png",
    upload = {
      path: "public/" + path,
      size: 4,
      base64: Buffer.from("image").toString("base64"),
    };
  document.sections
    .find((s) => s.type === "certificates")!
    .items.push({
      ...newItem(),
      title: "Verified certificate",
      image: path,
      url: "https://example.com/verify/123",
    });
  document.media.push({
    id: "certificate-123",
    name: "certificate.png",
    path,
    type: "image/png",
    size: 4,
    alt: "Certificate",
  });
  const before = api.head,
    saved = await client.save("publish", document, snapshot, [upload]);
  assert.equal(api.text("content/draft.json"), undefined);
  assert.ok(api.text("public/" + path));
  assert.equal(api.text("README.md"), "Keep unrelated files");
  assert.equal(
    JSON.parse(api.text("content/site.json")!).sections.find(
      (s: any) => s.type === "articles",
    ).items[0].slug,
    "a-real-article",
  );
  assert.deepEqual(api.commits.get(api.head)!.parents, [before]);
  assert.equal(saved.draft, null);
  const treeCall = api.calls
    .filter((c) => c.method === "POST" && c.path === "/git/trees")
    .at(-1)!;
  assert.ok(treeCall.body.base_tree);
  assert.ok(
    treeCall.body.tree.some(
      (x: any) => x.path === "content/draft.json" && x.sha === null,
    ),
  );
  assert.deepEqual(api.calls.at(-1)!.body, { sha: api.head, force: false });
});
test("defers an unused media deletion until publishing", async () => {
  const { api, client } = setup();
  api.advance("public/uploads/unused.png", "unused image");
  const snapshot = await client.load(),
    document = clone(snapshot.published);
  const draft = await client.save(
    "draft",
    document,
    snapshot,
    [],
    ["public/uploads/unused.png"],
  );
  assert.equal(api.text("public/uploads/unused.png"), "unused image");
  await client.save(
    "publish",
    document,
    draft,
    [],
    ["public/uploads/unused.png"],
  );
  assert.equal(api.text("public/uploads/unused.png"), undefined);
});
test("blocks deleting a file used by the profile or Markdown content", async () => {
  const { api, client } = setup();
  const snapshot = await client.load();
  await assert.rejects(
    () =>
      client.save(
        "publish",
        snapshot.published,
        snapshot,
        [],
        ["public/uploads/ali.jpg"],
      ),
    /still used/,
  );
  assert.ok(api.calls.every((c) => c.method === "GET"));
});
test("rejects a missing media reference before making a content commit", async () => {
  const { api, client } = setup();
  const snapshot = await client.load(),
    document = clone(snapshot.published);
  document.profile.image = "uploads/not-uploaded.png";
  await assert.rejects(
    () => client.save("publish", document, snapshot),
    /Missing media/,
  );
  assert.ok(api.calls.every((c) => c.method === "GET"));
});
test("a second editor cannot overwrite another saved draft", async () => {
  const { api, client } = setup();
  const other = new GitHubCMS(config, "second-test-token", api.fetch);
  const first = await client.load(),
    second = await other.load(),
    changed = clone(first.published);
  changed.profile.role = "Updated role";
  await client.save("draft", changed, first);
  const head = api.head;
  await assert.rejects(
    () => other.save("publish", second.published, second),
    ConflictError,
  );
  assert.equal(api.head, head);
});
test("preserves unrelated commits made after the editing session opened", async () => {
  const { api, client } = setup();
  const snapshot = await client.load();
  api.advance("README.md", "New source documentation");
  await client.save("publish", snapshot.published, snapshot);
  assert.equal(api.text("README.md"), "New source documentation");
});
test("detects a branch race before changing the live ref", async () => {
  const { api, client } = setup();
  const snapshot = await client.load();
  api.onCommit = () => api.advance("README.md", "Concurrent branch update");
  await assert.rejects(
    () => client.save("publish", snapshot.published, snapshot),
    ConflictError,
  );
  assert.equal(api.text("README.md"), "Concurrent branch update");
  assert.ok(!api.calls.some((c) => c.method === "PATCH"));
});
test("refuses a non-fast-forward ref update without force pushing", async () => {
  const { api, client } = setup();
  const snapshot = await client.load(),
    before = api.head;
  api.rejectPatch = true;
  await assert.rejects(
    () => client.save("publish", snapshot.published, snapshot),
    ConflictError,
  );
  assert.equal(api.head, before);
  assert.equal(api.calls.at(-1)!.body.force, false);
});
test("rejects uploads or deletions outside the designated media folder", async () => {
  const { api, client } = setup();
  const snapshot = await client.load();
  await assert.rejects(
    () =>
      client.save("draft", snapshot.published, snapshot, [
        { path: ".github/workflows/malicious.yml", base64: "YWJj", size: 3 },
      ]),
    /upload is invalid/,
  );
  await assert.rejects(
    () => client.save("draft", snapshot.published, snapshot, [], ["README.md"]),
    /uploads folder/,
  );
  assert.ok(api.calls.every((c) => c.method === "GET"));
});
test("detects a stale draft and reads content files above GitHub’s inline size limit", async () => {
  const { api, client } = setup();
  const snapshot = await client.load();
  await client.save("draft", snapshot.published, snapshot);
  const changed = clone(snapshot.published);
  changed.profile.role = "External publication";
  api.advance("content/site.json", JSON.stringify(changed));
  api.largeContent = true;
  const loaded = await client.load();
  assert.equal(loaded.draftStale, true);
  assert.equal(loaded.published.profile.role, "External publication");
  assert.ok(
    api.calls.some(
      (c) => c.path.startsWith("/git/blobs/") && c.method === "GET",
    ),
  );
});
test("never writes invalid published certificates or articles", async () => {
  const { api, client } = setup();
  const snapshot = await client.load(),
    document = clone(snapshot.published);
  document.sections
    .find((s) => s.type === "certificates")!
    .items.push({ ...newItem(), title: "Incomplete certificate" });
  await assert.rejects(
    () => client.save("publish", document, snapshot),
    /verification URL/,
  );
  assert.ok(api.calls.every((c) => c.method === "GET"));
});
