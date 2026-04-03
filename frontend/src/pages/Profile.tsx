import { type ChangeEvent, useState } from "react";
import { deleteAvatar, uploadAvatar } from "../api";
import { useAuth } from "../context/AuthContext";
import { useAvatarUrl } from "../hooks/useAvatarUrl";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export function Profile() {
  const { token, user, setUser } = useAuth();
  const [avatarRev, setAvatarRev] = useState(0);
  const avatarUrl = useAvatarUrl(token, user?.has_avatar, avatarRev);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !token) return;
    setError(null);
    setBusy(true);
    try {
      const u = await uploadAvatar(token, file);
      setUser(u);
      setAvatarRev((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    if (!token || !user?.has_avatar) return;
    if (!confirm("Remove your profile picture?")) return;
    setError(null);
    setBusy(true);
    try {
      const u = await deleteAvatar(token);
      setUser(u);
      setAvatarRev((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  const initial = (user?.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="page">
      <header className="page-header">
        <h1>Profile</h1>
        <p className="muted">Account details and profile picture.</p>
      </header>

      <section className="card profile-picture-card">
        <h2 className="card-title">Profile picture</h2>
        <div className="profile-picture-row">
          <div className="profile-avatar-wrap" aria-hidden>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile picture" className="profile-avatar-img" />
            ) : (
              <span className="profile-avatar-placeholder">{initial}</span>
            )}
          </div>
          <div className="profile-picture-actions">
            <label className="btn btn-primary file-upload-label">
              {busy ? "Working…" : "Upload photo"}
              <input
                type="file"
                accept={ACCEPT}
                className="visually-hidden"
                disabled={busy || !token}
                onChange={onPickFile}
              />
            </label>
            {user?.has_avatar ? (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={onRemove}
              >
                Remove
              </button>
            ) : null}
            <p className="muted small profile-picture-hint">
              PNG, JPEG, WebP, or GIF. Max 2&nbsp;MB.
            </p>
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
      </section>

      <section className="card">
        <h2 className="card-title">Account</h2>
        <dl className="dl-grid">
          <dt>Email</dt>
          <dd>{user?.email ?? "—"}</dd>
          <dt>User ID</dt>
          <dd>{user?.id ?? "—"}</dd>
        </dl>
        <p className="muted small notice">
          Vault entries are encrypted in your browser before they reach the server. Changing your
          account password would require re-encrypting all entries; that flow is not included in
          this MVP.
        </p>
      </section>
    </div>
  );
}
