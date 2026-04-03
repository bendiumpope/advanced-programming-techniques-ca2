import { useAuth } from "../context/AuthContext";

export function Profile() {
  const { user } = useAuth();

  return (
    <div className="page">
      <header className="page-header">
        <h1>Profile</h1>
        <p className="muted">Account details for your vault.</p>
      </header>
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
