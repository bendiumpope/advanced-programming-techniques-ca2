import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  createEntry,
  deleteEntry,
  listEntries,
  updateEntry,
  type VaultEntryDto,
} from "../api";
import { useAuth } from "../context/AuthContext";
import { copyWithAutoClear, CLIPBOARD_CLEAR_AFTER_MS } from "../lib/clipboard";
import {
  decryptSecretPayload,
  deriveVaultKey,
  encryptSecretPayload,
  type SecretPayload,
} from "../lib/crypto";
import { computePasswordHealth, type HealthFlag } from "../lib/passwordHealth";

type DecryptedRow = VaultEntryDto & { secrets: SecretPayload };

function normalizeEntryDto(e: VaultEntryDto): VaultEntryDto {
  return { ...e, folder: e.folder ?? "" };
}

export function Vault() {
  const { token, user, masterPassword } = useAuth();
  const [rows, setRows] = useState<DecryptedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState("");
  const [modal, setModal] = useState<
    | { mode: "create" }
    | { mode: "edit"; entry: VaultEntryDto; secrets: SecretPayload }
    | null
  >(null);

  const load = useCallback(async () => {
    if (!token || !user || !masterPassword) return;
    setLoading(true);
    setError(null);
    try {
      const key = await deriveVaultKey(masterPassword, user.vault_salt);
      const list = await listEntries(token);
      const decrypted: DecryptedRow[] = [];
      for (const e of list) {
        const dto = normalizeEntryDto(e);
        try {
          const secrets = await decryptSecretPayload(key, dto.encrypted_payload, dto.iv);
          decrypted.push({ ...dto, secrets });
        } catch {
          decrypted.push({
            ...dto,
            secrets: { password: "", notes: "(decryption failed)" },
          });
        }
      }
      setRows(decrypted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vault");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, user, masterPassword]);

  useEffect(() => {
    load();
  }, [load]);

  const uniqueFolders = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      const f = (r.folder || "").trim();
      if (f) s.add(f);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (folderFilter && (r.folder || "").trim() !== folderFilter) return false;
      if (!q) return true;
      const userN = (r.secrets.username || "").toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        (r.url || "").toLowerCase().includes(q) ||
        (r.folder || "").toLowerCase().includes(q) ||
        userN.includes(q)
      );
    });
  }, [rows, searchQuery, folderFilter]);

  const healthById = useMemo(
    () =>
      computePasswordHealth(
        rows.map((r) => ({ id: r.id, password: r.secrets.password || "" }))
      ),
    [rows]
  );

  async function handleDelete(id: number) {
    if (!token || !confirm("Delete this entry?")) return;
    try {
      await deleteEntry(token, id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (!masterPassword || !user) {
    return (
      <div className="page">
        <p className="muted">Unlock your vault by signing in again.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header row">
        <div>
          <h1>Secure passwords</h1>
          <p className="muted">Entries are encrypted in your browser before storage.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModal({ mode: "create" })}>
          Add entry
        </button>
      </header>

      {error && <p className="form-error banner">{error}</p>}

      {!loading && rows.length > 0 ? (
        <div className="vault-toolbar card">
          <label className="field vault-search">
            <span className="muted small">Search</span>
            <input
              type="search"
              placeholder="Title, URL, folder, username…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search vault"
            />
          </label>
          <label className="field vault-folder-filter">
            <span className="muted small">Folder</span>
            <select
              value={folderFilter}
              onChange={(e) => setFolderFilter(e.target.value)}
              aria-label="Filter by folder"
            >
              <option value="">All folders</option>
              {uniqueFolders.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <p className="muted small vault-clipboard-hint">
        Copy password schedules a clipboard clear in {CLIPBOARD_CLEAR_AFTER_MS / 1000}s (browsers may
        block clearing; paste soon after copying).
      </p>

      {loading ? (
        <p className="muted">Loading vault…</p>
      ) : rows.length === 0 ? (
        <div className="card empty-state">
          <p>No saved passwords yet. Add your first entry.</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="card empty-state">
          <p>No entries match your search or folder filter.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Folder</th>
                <th>Title</th>
                <th>Username</th>
                <th>URL</th>
                <th>Password</th>
                <th>Health</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.id}>
                  <td>{r.folder?.trim() ? r.folder : "—"}</td>
                  <td>{r.title}</td>
                  <td className="mono">{r.secrets.username?.trim() ? r.secrets.username : "—"}</td>
                  <td>
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noreferrer">
                        {r.url}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <code className="mono">{mask(r.secrets.password)}</code>{" "}
                    {r.secrets.password ? (
                      <button
                        type="button"
                        className="btn btn-tiny btn-ghost"
                        title="Copy password (auto-clear attempted)"
                        onClick={() =>
                          copyWithAutoClear(r.secrets.password, `entry-${r.id}`).catch(() => {})
                        }
                      >
                        Copy
                      </button>
                    ) : null}
                  </td>
                  <td>
                    <HealthBadges flags={healthById.get(r.id)} />
                  </td>
                  <td className="actions">
                    <button
                      type="button"
                      className="btn btn-small btn-ghost"
                      onClick={() => setModal({ mode: "edit", entry: r, secrets: r.secrets })}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-small btn-danger-ghost"
                      onClick={() => handleDelete(r.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <EntryModal
          modal={modal}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function HealthBadges({ flags }: { flags?: Set<HealthFlag> }) {
  if (!flags || flags.size === 0) return <span className="muted">—</span>;
  return (
    <span className="health-badges">
      {flags.has("weak") ? (
        <span className="health-pill health-pill-weak" title="Short or missing mixed case / digits">
          Weak
        </span>
      ) : null}
      {flags.has("reused") ? (
        <span className="health-pill health-pill-reused" title="Same password as another entry">
          Reused
        </span>
      ) : null}
    </span>
  );
}

function mask(p: string): string {
  if (!p) return "—";
  if (p.length <= 4) return "••••";
  return `${p.slice(0, 2)}${"•".repeat(Math.min(p.length - 4, 12))}${p.slice(-2)}`;
}

function EntryModal({
  modal,
  onClose,
  onSaved,
}: {
  modal: { mode: "create" } | { mode: "edit"; entry: VaultEntryDto; secrets: SecretPayload };
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { token, user, masterPassword } = useAuth();
  const [folder, setFolder] = useState(
    modal.mode === "edit" ? modal.entry.folder ?? "" : ""
  );
  const [title, setTitle] = useState(
    modal.mode === "edit" ? modal.entry.title : ""
  );
  const [username, setUsername] = useState(
    modal.mode === "edit" ? modal.secrets.username ?? "" : ""
  );
  const [url, setUrl] = useState(modal.mode === "edit" ? modal.entry.url ?? "" : "");
  const [password, setPassword] = useState(
    modal.mode === "edit" ? modal.secrets.password : ""
  );
  const [notes, setNotes] = useState(
    modal.mode === "edit" ? modal.secrets.notes ?? "" : ""
  );
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !user || !masterPassword) return;
    const t = title.trim();
    if (!t) {
      setErr("Title is required");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const key = await deriveVaultKey(masterPassword, user.vault_salt);
      const payload: SecretPayload = {
        password,
        username: username.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      const { encrypted_payload, iv } = await encryptSecretPayload(key, payload);
      const folderNorm = folder.trim();
      if (modal.mode === "create") {
        await createEntry(token, {
          title: t,
          folder: folderNorm,
          url: url.trim() || null,
          encrypted_payload,
          iv,
        });
      } else {
        await updateEntry(token, modal.entry.id, {
          title: t,
          folder: folderNorm,
          url: url.trim() || null,
          encrypted_payload,
          iv,
        });
      }
      await onSaved();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal modal-wide"
        role="dialog"
        aria-labelledby="entry-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="entry-modal-title">{modal.mode === "create" ? "New entry" : "Edit entry"}</h2>
        <form onSubmit={onSubmit} className="auth-form">
          <label className="field">
            <span>Folder</span>
            <input
              placeholder="e.g. Work, Personal"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              maxLength={128}
            />
          </label>
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label className="field">
            <span>Username</span>
            <input
              autoComplete="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="field">
            <span>URL</span>
            <input
              type="url"
              placeholder="https://"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              className="mono"
              type="text"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Notes</span>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          {err && <p className="form-error">{err}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
