const API_BASE = "/api";

function authHeaders(token: string | null): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export type User = {
  id: number;
  email: string;
  vault_salt: string;
};

export async function registerRequest(
  email: string,
  password: string
): Promise<{ access_token: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: authHeaders(null),
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Registration failed");
  return data as { access_token: string; user: User };
}

export async function loginRequest(
  email: string,
  password: string
): Promise<{ access_token: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: authHeaders(null),
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Login failed");
  return data as { access_token: string; user: User };
}

export async function meRequest(token: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Session invalid");
  return data as User;
}

export type VaultEntryDto = {
  id: number;
  title: string;
  url: string | null;
  encrypted_payload: string;
  iv: string;
  created_at: string;
  updated_at: string;
};

export async function listEntries(token: string): Promise<VaultEntryDto[]> {
  const res = await fetch(`${API_BASE}/vault/entries`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Failed to load entries");
  return (data as { entries: VaultEntryDto[] }).entries;
}

export async function createEntry(
  token: string,
  body: {
    title: string;
    url?: string | null;
    encrypted_payload: string;
    iv: string;
  }
): Promise<VaultEntryDto> {
  const res = await fetch(`${API_BASE}/vault/entries`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Failed to create entry");
  return (data as { entry: VaultEntryDto }).entry;
}

export async function updateEntry(
  token: string,
  id: number,
  body: Partial<{
    title: string;
    url: string | null;
    encrypted_payload: string;
    iv: string;
  }>
): Promise<VaultEntryDto> {
  const res = await fetch(`${API_BASE}/vault/entries/${id}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Failed to update entry");
  return (data as { entry: VaultEntryDto }).entry;
}

export async function deleteEntry(token: string, id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/vault/entries/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "Failed to delete");
  }
}
