import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Check,
  Download,
  ExternalLink,
  Eye,
  LoaderCircle,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import config from "../../project.config.json";
import { GitHubCMS, type Snapshot } from "../github";
import {
  clone,
  newSection,
  referencedMedia,
  sectionNames,
  siteSchema,
  type SectionType,
  type SiteDocument,
  type StagedUpload,
} from "../model";
import { assetUrl, validateDocument } from "../safe";
import { Icon } from "../icons";
import { Card, TextField } from "./fields";
import { SectionEditor, SectionList, type ChangeSite } from "./Sections";
import {
  AppearanceSettings,
  BrandingSettings,
  ContactSettings,
  ProfileSettings,
  SEOSettings,
} from "./Settings";
import { fileSize, stageFile, uploadAccept } from "./media";
import type { MediaTools } from "./MediaField";
import { Preview } from "./Preview";

type Page =
  | "overview"
  | "profile"
  | "sections"
  | "contact"
  | "branding"
  | "appearance"
  | "seo"
  | "media"
  | "publishing"
  | `section:${string}`;
type Session = { client: GitHubCMS; login: string; isPublic: boolean };
const repoUrl = `https://github.com/${config.owner}/${config.repository}`;
const navigation = [
  { id: "overview", label: "Overview", icon: "dashboard" },
  { id: "profile", label: "Profile & introduction", icon: "users" },
  { id: "sections", label: "Sections & content", icon: "file" },
  { id: "media", label: "Media library", icon: "image" },
  { id: "contact", label: "Contact & links", icon: "phone" },
  { id: "branding", label: "Branding & buttons", icon: "palette" },
  { id: "appearance", label: "Appearance", icon: "sparkles" },
  { id: "seo", label: "SEO & Google", icon: "search" },
  { id: "publishing", label: "Publishing & backups", icon: "shield" },
] as const;
function message(error: unknown) {
  if (error instanceof Error) {
    if (error.name === "ZodError")
      return "Some fields have an invalid format or are too long. Check your recent changes.";
    return error.message;
  }
  return "Something went wrong. Your local changes have been kept.";
}
function exportJson(site: SiteDocument) {
  const link = document.createElement("a"),
    url = URL.createObjectURL(
      new Blob([JSON.stringify(site, null, 2) + "\n"], {
        type: "application/json",
      }),
    );
  link.href = url;
  link.download =
    "portfolio-content-" + new Date().toISOString().slice(0, 10) + ".json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function Login({
  onConnect,
}: {
  onConnect: (session: Session, snapshot: Snapshot) => void;
}) {
  const [token, setToken] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token.trim() || busy) return;
    setBusy(true);
    setError("");
    const client = new GitHubCMS(config, token.trim());
    setToken("");
    try {
      const identity = await client.connect();
      const snapshot = await client.load();
      onConnect({ client, ...identity }, snapshot);
    } catch (e) {
      client.dispose();
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-app login-page">
      <div className="login-brand">
        <span className="admin-monogram">
          AS<span>•</span>
        </span>
        <a href={config.basePath}>
          Visit portfolio <ExternalLink size={14} />
        </a>
      </div>
      <div className="login-layout">
        <div className="login-intro">
          <p className="admin-eyebrow">Portfolio studio</p>
          <h1>
            Your story.
            <br />
            <em>Your control.</em>
          </h1>
          <p>
            Manage your work, words, and everything that makes your portfolio
            yours.
          </p>
          <div className="login-features">
            <span>
              <Icon name="file" />
              Every section, one editor
            </span>
            <span>
              <Icon name="image" />
              Your photos and media
            </span>
            <span>
              <Icon name="shield" />
              Publish through GitHub
            </span>
          </div>
        </div>
        <div className="login-card">
          <span className="login-icon">
            <Icon name="github" size={28} />
          </span>
          <h2>Connect to your portfolio</h2>
          <p>
            Use a fine-grained GitHub token for{" "}
            <strong>
              {config.owner}/{config.repository}
            </strong>
            .
          </p>
          <form onSubmit={submit}>
            <label htmlFor="github-token">GitHub access token</label>
            <input
              id="github-token"
              type="password"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your fine-grained token"
              required
              disabled={busy}
            />
            <p className="field-hint">
              The token is held only in this session’s memory. It is never
              stored in the website, browser storage, or repository.
            </p>
            {error && (
              <div role="alert" className="notice error">
                {error}
              </div>
            )}
            <button
              className="admin-button primary login-submit"
              disabled={busy || !token.trim()}
            >
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <Icon name="github" size={18} />
              )}{" "}
              {busy ? "Connecting…" : "Open control panel"}
            </button>
          </form>
          <details className="login-help">
            <summary>First time? Set up your token</summary>
            <ol>
              <li>
                Upload the complete source package to the repository root.
              </li>
              <li>
                Set GitHub Pages to <strong>GitHub Actions</strong> and wait for
                deployment.
              </li>
              <li>
                Open GitHub Settings → Developer settings → Personal access
                tokens → Fine-grained tokens.
              </li>
              <li>
                Select only <strong>portfolio</strong>. Under Repository
                permissions, give <strong>Contents: Read and write</strong>.
              </li>
              <li>
                Generate the token, copy it once, and paste it here. Use an
                expiration date you can renew.
              </li>
            </ol>
            <a
              href="https://github.com/settings/personal-access-tokens/new"
              target="_blank"
              rel="noopener noreferrer"
            >
              Create a fine-grained token ↗
            </a>
            <p>
              Repository rules requiring pull requests can prevent direct
              publishing. See SETUP.md in the download for troubleshooting.
            </p>
          </details>
        </div>
      </div>
      <p className="login-footer">
        Connected editing for your GitHub Pages portfolio.
      </p>
    </div>
  );
}

export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null),
    [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [site, setSite] = useState<SiteDocument | null>(null),
    [page, setPage] = useState<Page>("overview"),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(0),
    [notice, setNotice] = useState<{
      kind: "success" | "error" | "info";
      text: string;
    } | null>(null),
    [uploads, setUploads] = useState<StagedUpload[]>([]),
    [deletions, setDeletions] = useState<string[]>([]),
    [objectUrls, setObjectUrls] = useState<Record<string, string>>({}),
    [preview, setPreview] = useState(false),
    [menu, setMenu] = useState(false),
    [publishReview, setPublishReview] = useState(false);
  const urlsRef = useRef(objectUrls),
    reviewDialog = useRef<HTMLDialogElement>(null);
  urlsRef.current = objectUrls;
  useEffect(
    () => () => {
      Object.values(urlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );
  useEffect(() => {
    const prevent = (e: BeforeUnloadEvent) => {
      if (dirty || busy || uploading > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty, busy, uploading]);
  useEffect(() => {
    if (publishReview) reviewDialog.current?.showModal();
  }, [publishReview]);
  const change: ChangeSite = useCallback((fn) => {
    setSite((current) => {
      if (!current) return current;
      const next = clone(current);
      fn(next);
      return next;
    });
    setDirty(true);
    setNotice(null);
  }, []);
  const clearStaging = () => {
    setUploads([]);
    Object.values(urlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    setObjectUrls({});
  };
  function applySnapshot(s: Snapshot) {
    setSnapshot(s);
    setSite(clone(s.draft && !s.draftStale ? s.draft.document : s.published));
    setDeletions(s.draft && !s.draftStale ? s.draft.deletions : []);
    setDirty(false);
    clearStaging();
  }
  async function reload() {
    if (!session || busy) return;
    if (
      dirty &&
      !window.confirm(
        "Reload from GitHub and discard unsaved changes? Export a backup first if you need to keep them.",
      )
    )
      return;
    setBusy(true);
    try {
      applySnapshot(await session.client.load());
      setNotice({
        kind: "success",
        text: "Loaded the latest content from GitHub.",
      });
    } catch (e) {
      setNotice({ kind: "error", text: message(e) });
    } finally {
      setBusy(false);
    }
  }
  const upload = useCallback(
    async (file: File) => {
      setUploading((n) => n + 1);
      try {
        const staged = await stageFile(file);
        setUploads((list) => [...list, staged.upload]);
        setObjectUrls((urls) => ({
          ...urls,
          [staged.media.path]: staged.preview,
        }));
        change((d) => {
          d.media.push(staged.media);
        });
        return staged.media.path;
      } finally {
        setUploading((n) => n - 1);
      }
    },
    [change],
  );
  const resolve = useCallback(
    (path: string) => {
      if (objectUrls[path]) return objectUrls[path];
      if (path.startsWith("uploads/"))
        return `https://raw.githubusercontent.com/${config.owner}/${config.repository}/${snapshot?.head || config.branch}/public/${path}`;
      return assetUrl(path, config.basePath);
    },
    [objectUrls, snapshot?.head],
  );
  const mediaOverrides = useMemo(
    () =>
      Object.fromEntries(
        (site?.media || []).map((m) => [m.path, resolve(m.path)]),
      ),
    [site?.media, resolve],
  );
  if (!session || !site || !snapshot)
    return (
      <Login
        onConnect={(s, loaded) => {
          setSession(s);
          applySnapshot(loaded);
        }}
      />
    );
  const tools: MediaTools = { media: site.media, resolve, upload };
  const props = { site, change, tools };
  const open = (id: Page) => {
    setPage(id);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  function renameSection(oldId: string, nextId: string) {
    if (
      !/^[a-z0-9][a-z0-9-]{0,79}$/.test(nextId) ||
      ["home", "main", "top", "admin"].includes(nextId) ||
      site!.sections.some((s) => s.id === nextId)
    ) {
      setNotice({
        kind: "error",
        text: "Choose an unused anchor ID with lower-case letters, numbers, and hyphens. The IDs home, main, top, and admin are reserved.",
      });
      return;
    }
    change((d) => {
      const section = d.sections.find((s) => s.id === oldId);
      if (section) section.id = nextId;
      for (const action of [d.profile.primaryAction, d.profile.secondaryAction])
        if (action.destination === "#" + oldId)
          action.destination = "#" + nextId;
      for (const s of d.sections)
        for (const i of s.items) {
          if (i.url === "#" + oldId) i.url = "#" + nextId;
          i.body = i.body.replaceAll("](#" + oldId + ")", "](#" + nextId + ")");
        }
    });
    open(`section:${nextId}`);
  }
  const activeSection = page.startsWith("section:")
    ? site.sections.find((s) => s.id === page.slice(8))
    : undefined;
  const title =
    activeSection?.title ||
    navigation.find((n) => n.id === page)?.label ||
    "Sections & content";
  async function save(mode: "draft" | "publish") {
    if (!session || !site || !snapshot || busy || uploading > 0) return;
    setBusy(true);
    setNotice(null);
    setPublishReview(false);
    try {
      const next = await session.client.save(
        mode,
        site,
        snapshot,
        uploads,
        deletions,
      );
      setSnapshot(next);
      setDirty(false);
      clearStaging();
      if (mode === "publish") setDeletions([]);
      setNotice({
        kind: "success",
        text:
          mode === "publish"
            ? "Published to GitHub. GitHub Pages is rebuilding the website; follow the deployment in GitHub Actions."
            : "Draft saved to GitHub. The public website content is unchanged.",
      });
    } catch (e) {
      setNotice({ kind: "error", text: message(e) });
    } finally {
      setBusy(false);
    }
  }
  function review() {
    try {
      validateDocument(site);
      if (new URL(site!.seo.siteUrl).pathname !== config.basePath)
        throw new Error(
          `The website URL must keep the ${config.basePath} path. Changing the project path requires project.config.json as described in SETUP.md.`,
        );
      setPublishReview(true);
    } catch (e) {
      setNotice({ kind: "error", text: message(e) });
    }
  }
  function logout() {
    if (
      dirty &&
      !window.confirm(
        "Disconnect and discard unsaved changes? Save a draft or export a backup first to keep them.",
      )
    )
      return;
    session!.client.dispose();
    clearStaging();
    setSession(null);
    setSnapshot(null);
    setSite(null);
    setNotice(null);
    setDeletions([]);
    setDirty(false);
    setPage("overview");
  }
  async function importBackup(file: File) {
    if (file.size > 4 * 1024 * 1024) {
      setNotice({
        kind: "error",
        text: "Choose a content JSON backup smaller than 4 MB.",
      });
      return;
    }
    try {
      const parsed = siteSchema.parse(JSON.parse(await file.text()));
      if (
        window.confirm(
          "Replace the current editing document with this backup? The website will change only after you publish. Uploaded media files must also exist in the repository.",
        )
      ) {
        setSite(parsed);
        setDirty(true);
        setDeletions([]);
        setNotice({
          kind: "info",
          text: "Backup loaded into the editor. Review the content and media before publishing.",
        });
      }
    } catch (e) {
      setNotice({
        kind: "error",
        text: "Could not import this backup. " + message(e),
      });
    }
  }
  function removeMedia(path: string) {
    if (referencedMedia(site!, path)) {
      setNotice({
        kind: "error",
        text: "This file is still in use. Clear it from profile, branding, content, and draft items before deleting it.",
      });
      return;
    }
    if (
      !window.confirm(
        "Remove this file from the media library? Existing repository files are deleted only when you publish.",
      )
    )
      return;
    change((d) => {
      d.media = d.media.filter((m) => m.path !== path);
    });
    const staged = uploads.some((u) => u.path === "public/" + path);
    if (staged) {
      setUploads((list) => list.filter((u) => u.path !== "public/" + path));
      if (objectUrls[path]) URL.revokeObjectURL(objectUrls[path]);
      setObjectUrls((urls) => {
        const next = { ...urls };
        delete next[path];
        return next;
      });
    } else setDeletions((list) => [...new Set([...list, "public/" + path])]);
  }
  const articleCount = site.sections
      .filter((s) => s.type === "articles")
      .reduce((n, s) => n + s.items.length, 0),
    visibleCount = site.sections.filter(
      (s) =>
        s.visible &&
        (s.type === "contact" ||
          s.items.some((i) => i.status === "published") ||
          (s.type === "custom" && s.description)),
    ).length;
  return (
    <div className="admin-app">
      <aside className={"admin-sidebar " + (menu ? "sidebar-open" : "")}>
        <div className="sidebar-brand">
          <span className="admin-monogram">
            {site.profile.name
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")}
            <span>•</span>
          </span>
          <div>
            <strong>Portfolio studio</strong>
            <small>{site.branding.displayName}</small>
          </div>
          <button
            className="icon-button sidebar-close"
            onClick={() => setMenu(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        <p className="sidebar-caption">MANAGE WEBSITE</p>
        <nav aria-label="Control panel navigation">
          {navigation.map((n) => (
            <button
              className={
                page === n.id ||
                (n.id === "sections" && page.startsWith("section:"))
                  ? "active"
                  : ""
              }
              key={n.id}
              onClick={() => open(n.id)}
            >
              <Icon name={n.icon} size={19} />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-sections">
          <p className="sidebar-caption">QUICK ACCESS</p>
          {site.sections
            .filter((s) =>
              [
                "articles",
                "campaigns",
                "certificates",
                "websites",
                "instagram",
                "clients",
                "experience",
                "testimonials",
                "education",
              ].includes(s.type),
            )
            .map((s) => (
              <button
                key={s.id}
                className={page === "section:" + s.id ? "active" : ""}
                onClick={() => open(`section:${s.id}`)}
              >
                <span>{s.title}</span>
                <small>{s.items.length}</small>
              </button>
            ))}
        </div>
        <div className="sidebar-account">
          <Icon name="github" size={21} />
          <div>
            <strong>{session.login}</strong>
            <small>
              {config.repository} · {config.branch}
            </small>
          </div>
          <button
            className="icon-button"
            disabled={busy || uploading > 0}
            onClick={logout}
            title="Disconnect"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      {menu && (
        <button
          className="sidebar-backdrop"
          onClick={() => setMenu(false)}
          aria-label="Close menu"
        />
      )}
      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="topbar-location">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMenu(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <span>Workspace</span>
            <b>/</b>
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <a
              className="admin-button small live-link"
              href={site.seo.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={15} />
              View website
            </a>
            <button
              className="admin-button small"
              onClick={() => setPreview(true)}
              disabled={busy || uploading > 0}
            >
              <Eye size={16} />
              Preview
            </button>
            <button
              className="admin-button small"
              onClick={() => void save("draft")}
              disabled={busy || uploading > 0}
            >
              <Save size={16} />
              <span>Save draft</span>
            </button>
            <button
              className="admin-button primary small"
              onClick={review}
              disabled={busy || uploading > 0}
            >
              <Send size={16} />
              <span>Publish website</span>
            </button>
          </div>
        </header>
        <div className="admin-content">
          <div className="page-heading">
            <div>
              <p className="admin-eyebrow">Your portfolio</p>
              <h1>{title}</h1>
            </div>
            <span className={"save-status " + (dirty ? "unsaved" : "")}>
              <i />
              {busy
                ? "Saving…"
                : dirty
                  ? "Unsaved changes"
                  : snapshot.draft
                    ? "Saved draft"
                    : "Up to date"}
            </span>
          </div>
          {busy && (
            <div className="notice info">
              <LoaderCircle size={18} className="spin" />
              Saving to GitHub. Keep this tab open until it finishes.
            </div>
          )}
          {notice && (
            <div
              className={"notice " + notice.kind}
              role={notice.kind === "error" ? "alert" : "status"}
            >
              <span>{notice.text}</span>
              {notice.kind === "success" &&
                notice.text.startsWith("Published") && (
                  <a
                    href={repoUrl + "/actions"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View deployment ↗
                  </a>
                )}
              <button
                className="icon-button"
                aria-label="Dismiss message"
                onClick={() => setNotice(null)}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {snapshot.draftStale && (
            <div className="notice info">
              <span>
                A saved draft is based on an older publication. The current
                published document is loaded. Export a backup before recovering
                the old draft.
              </span>
              <button
                className="admin-button small"
                disabled={busy || uploading > 0}
                onClick={() => {
                  if (
                    window.confirm(
                      "Recover the older draft into the editor? This replaces the current editing content. Review all changes before publishing.",
                    )
                  ) {
                    setSite(clone(snapshot.draft!.document));
                    setDeletions(snapshot.draft!.deletions);
                    setDirty(true);
                  }
                }}
              >
                Recover older draft
              </button>
            </div>
          )}
          <fieldset
            className="editor-workarea"
            disabled={busy || uploading > 0}
          >
            {page === "overview" && (
              <>
                <div className="overview-welcome">
                  <div>
                    <p className="admin-eyebrow">Make it yours</p>
                    <h2>Hello, {site.profile.name.split(" ")[0]}.</h2>
                    <p>
                      Share your latest work, update your story, and publish
                      when you’re ready.
                    </p>
                    <div className="welcome-actions">
                      <button
                        className="admin-button primary"
                        onClick={() => open("sections")}
                      >
                        <Plus size={17} />
                        Manage content
                      </button>
                      <button
                        className="admin-button"
                        onClick={() => setPreview(true)}
                      >
                        <Eye size={17} />
                        Preview website
                      </button>
                    </div>
                  </div>
                  <div className="welcome-art" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <Icon name="sparkles" size={40} />
                  </div>
                </div>
                <div className="overview-stats">
                  <div>
                    <Icon name="file" />
                    <strong>{site.sections.length}</strong>
                    <span>Total sections</span>
                  </div>
                  <div>
                    <Icon name="globe" />
                    <strong>{visibleCount}</strong>
                    <span>Visible with content</span>
                  </div>
                  <div>
                    <Icon name="book" />
                    <strong>{articleCount}</strong>
                    <span>Articles</span>
                  </div>
                  <div>
                    <Icon name="image" />
                    <strong>{site.media.length}</strong>
                    <span>Media files</span>
                  </div>
                </div>
                <Card
                  title="Create something new"
                  description="Choose a section to add your next update."
                >
                  <div className="quick-grid">
                    {(
                      [
                        "articles",
                        "campaigns",
                        "certificates",
                        "experience",
                        "websites",
                        "instagram",
                        "clients",
                        "testimonials",
                      ] as SectionType[]
                    ).map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          let section = site.sections.find(
                            (s) => s.type === type,
                          );
                          if (!section) {
                            section = newSection(type);
                            const fresh = section;
                            change((d) => {
                              d.sections.push(fresh);
                            });
                          }
                          open(`section:${section.id}`);
                        }}
                      >
                        <Icon
                          name={
                            type === "certificates"
                              ? "award"
                              : type === "articles"
                                ? "book"
                                : type === "campaigns"
                                  ? "chart"
                                  : type === "websites"
                                    ? "code"
                                    : type === "instagram"
                                      ? "instagram"
                                      : type === "experience"
                                        ? "briefcase"
                                        : "users"
                          }
                          size={23}
                        />
                        <span>{sectionNames[type]}</span>
                        <Plus size={16} />
                      </button>
                    ))}
                  </div>
                </Card>
                <Card title="Publishing status">
                  <dl className="status-details">
                    <div>
                      <dt>Repository</dt>
                      <dd>
                        <a
                          href={repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {config.owner}/{config.repository} ↗
                        </a>
                      </dd>
                    </div>
                    <div>
                      <dt>Last loaded commit</dt>
                      <dd>
                        <a
                          href={repoUrl + "/commit/" + snapshot.head}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {snapshot.head.slice(0, 7)}
                        </a>
                      </dd>
                    </div>
                    <div>
                      <dt>Saved draft</dt>
                      <dd>
                        {snapshot.draft
                          ? new Date(snapshot.draft.savedAt).toLocaleString()
                          : "No saved draft"}
                      </dd>
                    </div>
                  </dl>
                  <p className="field-hint">
                    Save draft stores your work in GitHub. Publish website
                    updates the public content and starts a GitHub Pages
                    deployment.
                  </p>
                </Card>
              </>
            )}
            {page === "profile" && <ProfileSettings {...props} />}{" "}
            {page === "sections" && (
              <SectionList
                site={site}
                change={change}
                onOpen={(id) => open(`section:${id}`)}
              />
            )}{" "}
            {page.startsWith("section:") &&
              (activeSection ? (
                <SectionEditor
                  key={activeSection.id}
                  section={activeSection}
                  change={change}
                  tools={tools}
                  basePath={config.basePath}
                  siteUrl={site.seo.siteUrl}
                  onBack={() => open("sections")}
                  onRename={(id) => renameSection(activeSection.id, id)}
                />
              ) : (
                <SectionList
                  site={site}
                  change={change}
                  onOpen={(id) => open(`section:${id}`)}
                />
              ))}{" "}
            {page === "contact" && <ContactSettings {...props} />}{" "}
            {page === "branding" && <BrandingSettings {...props} />}{" "}
            {page === "appearance" && <AppearanceSettings {...props} />}{" "}
            {page === "seo" && <SEOSettings {...props} />}
            {page === "media" && (
              <Card
                title="Your media library"
                description="Upload profile photos, project screenshots, certificates, logos, and your CV."
                actions={
                  <label className="admin-button primary small">
                    <Upload size={16} />
                    Upload files
                    <input
                      className="file-input"
                      type="file"
                      multiple
                      accept={uploadAccept}
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        e.target.value = "";
                        try {
                          for (const file of files) await upload(file);
                        } catch (error) {
                          setNotice({ kind: "error", text: message(error) });
                        }
                      }}
                    />
                  </label>
                }
              >
                <p className="field-hint">
                  PNG, JPG, WebP, GIF, ICO, PDF · 8 MB per file. A used file
                  cannot be deleted. Copy a file path to insert it into an
                  article.
                </p>
                {!site.media.length ? (
                  <div className="admin-empty">
                    <Icon name="image" size={32} />
                    <p>Upload your first file.</p>
                  </div>
                ) : (
                  <div className="media-grid">
                    {site.media.map((m) => (
                      <article className="media-library-card" key={m.id}>
                        <a
                          href={resolve(m.path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="media-library-image"
                        >
                          {m.type.startsWith("image/") ? (
                            <img
                              src={resolve(m.path)}
                              alt={m.alt || m.name}
                              loading="lazy"
                            />
                          ) : (
                            <Icon name="file" size={40} />
                          )}
                        </a>
                        <div>
                          <strong title={m.name}>{m.name}</strong>
                          <span>
                            {fileSize(m.size)}
                            {uploads.some((u) => u.path === "public/" + m.path)
                              ? " · New upload"
                              : ""}
                          </span>
                          <TextField
                            label="Library description"
                            value={m.alt}
                            onChange={(v) =>
                              change((d) => {
                                const target = d.media.find(
                                  (x) => x.id === m.id,
                                );
                                if (target) target.alt = v;
                              })
                            }
                          />
                          <label className="media-path-label">
                            File path
                            <input
                              readOnly
                              value={m.path}
                              onFocus={(e) => e.target.select()}
                            />
                          </label>
                          <div className="media-card-actions">
                            <small>
                              {referencedMedia(site, m.path)
                                ? "In use"
                                : "Unused"}
                            </small>
                            <button
                              className="icon-button danger"
                              aria-label={"Delete " + m.name}
                              onClick={() => removeMedia(m.path)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                {deletions.length > 0 && (
                  <p className="notice info">
                    {deletions.length} file(s) will be removed from the
                    repository when you publish.
                  </p>
                )}
              </Card>
            )}
            {page === "publishing" && (
              <>
                <Card
                  title="Connected publishing"
                  description="Content and media are committed directly to your GitHub repository."
                >
                  <dl className="status-details">
                    <div>
                      <dt>Repository</dt>
                      <dd>
                        {config.owner}/{config.repository}
                      </dd>
                    </div>
                    <div>
                      <dt>Branch</dt>
                      <dd>{config.branch}</dd>
                    </div>
                    <div>
                      <dt>Website</dt>
                      <dd>
                        <a
                          href={site.seo.siteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {site.seo.siteUrl}
                        </a>
                      </dd>
                    </div>
                  </dl>
                  <div className="button-row">
                    <button
                      className="admin-button"
                      onClick={() => void reload()}
                    >
                      <RefreshCw size={16} />
                      Reload from GitHub
                    </button>
                    <a
                      className="admin-button"
                      href={repoUrl + "/actions"}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Deployment history ↗
                    </a>
                  </div>
                  <p className="field-hint">
                    Each publish updates the content in one commit. Concurrent
                    edits are detected so another editor’s changes are not
                    silently overwritten. If direct writes are blocked by
                    repository rules, GitHub will reject the publish.
                  </p>
                  {session.isPublic && (
                    <p className="notice info">
                      This repository is public. Drafts and unpublished items
                      are excluded from the built website, but their source
                      files can still be read on GitHub.
                    </p>
                  )}
                </Card>
                <Card
                  title="Content backups"
                  description="Export the current editing document, including unsaved text changes. Media files remain in the repository and are not included in this JSON backup."
                >
                  <div className="button-row">
                    <button
                      className="admin-button"
                      onClick={() => exportJson(site)}
                    >
                      <Download size={17} />
                      Export content JSON
                    </button>
                    <label className="admin-button">
                      <Upload size={17} />
                      Import content JSON
                      <input
                        className="file-input"
                        type="file"
                        accept="application/json,.json"
                        onChange={(e) => {
                          if (e.target.files?.[0])
                            void importBackup(e.target.files[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <p className="field-hint">
                    For a complete backup including images, download the
                    repository ZIP from GitHub. To undo a publication, revert
                    its content commit in GitHub, then reload this editor.
                  </p>
                </Card>
                <Card title="Before your first publish">
                  <ol className="setup-list">
                    <li>
                      Upload the source package to the repository root,
                      including the .github folder.
                    </li>
                    <li>
                      In repository Settings → Pages, set Source to GitHub
                      Actions.
                    </li>
                    <li>
                      Wait for the Deploy portfolio workflow to finish
                      successfully.
                    </li>
                    <li>
                      Connect this editor with a token limited to this
                      repository and Contents: Read and write.
                    </li>
                    <li>
                      Make your changes, review Preview, and select Publish
                      website.
                    </li>
                  </ol>
                  <p className="field-hint">
                    The SETUP.md file included with this project explains custom
                    domains, SEO, token renewal, and troubleshooting.
                  </p>
                </Card>
              </>
            )}
          </fieldset>
          <footer className="admin-footer">
            <span>Portfolio studio · Your content, your repository</span>
            <a
              href={repoUrl + "/actions"}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Actions ↗
            </a>
          </footer>
        </div>
      </div>
      {preview && (
        <Preview
          site={site}
          basePath={config.basePath}
          mediaOverrides={mediaOverrides}
          onClose={() => setPreview(false)}
        />
      )}{" "}
      {publishReview && (
        <dialog
          ref={reviewDialog}
          className="publish-dialog"
          onCancel={() => setPublishReview(false)}
        >
          <div className="publish-icon">
            <Check size={27} />
          </div>
          <h2>Ready to publish?</h2>
          <p>
            Your content checks passed. This will update the public portfolio
            after GitHub Pages completes its deployment.
          </p>
          <ul>
            <li>{visibleCount} sections with visible content</li>
            <li>{uploads.length} new media files</li>
            <li>{deletions.length} media files to remove</li>
          </ul>
          <p className="field-hint">
            Review any article URL changes before publishing. Existing bookmarks
            need the same slug.
          </p>
          <div className="button-row">
            <button
              className="admin-button"
              onClick={() => setPublishReview(false)}
            >
              Keep editing
            </button>
            <button
              className="admin-button primary"
              onClick={() => void save("publish")}
            >
              <Send size={17} />
              Publish now
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
