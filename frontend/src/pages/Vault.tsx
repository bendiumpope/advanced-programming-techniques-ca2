import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  createEntry,
  deleteEntry,
  listEntries,
  updateEntry,
  type VaultEntryDto,
} from "../api";
import { useAuth } from "../context/AuthContext";
import {
  decryptSecretPayload,
  deriveVaultKey,
  encryptSecretPayload,
  type SecretPayload,
} from "../lib/crypto";

type DecryptedRow = VaultEntryDto & { secrets: SecretPayload };

export function Vault() {
  const { token, user, masterPassword } = useAuth();
  const [rows, setRows] = useState<DecryptedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
        try {
          const secrets = await decryptSecretPayload(key, e.encrypted_payload, e.iv);
          decrypted.push({ ...e, secrets });
        } catch {
          decrypted.push({
            ...e,
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

      {loading ? (
        <p className="muted">Loading vault…</p>
      ) : rows.length === 0 ? (
        <div className="card empty-state">
          <p>No saved passwords yet. Add your first entry.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>URL</th>
                <th>Password</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
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
                        title="Copy password"
                        onClick={() =>
                          navigator.clipboard.writeText(r.secrets.password).catch(() => {})
                        }
                      >
                        Copy
                      </button>
                    ) : null}
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
  const [title, setTitle] = useState(
    modal.mode === "edit" ? modal.entry.title : ""
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
      const { encrypted_payload, iv } = await encryptSecretPayload(key, {
        password,
        notes: notes.trim() || undefined,
      });
      if (modal.mode === "create") {
        await createEntry(token, {
          title: t,
          url: url.trim() || null,
          encrypted_payload,
          iv,
        });
      } else {
        await updateEntry(token, modal.entry.id, {
          title: t,
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
        className="modal"
        role="dialog"
        aria-labelledby="entry-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="entry-modal-title">{modal.mode === "create" ? "New entry" : "Edit entry"}</h2>
        <form onSubmit={onSubmit} className="auth-form">
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
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
