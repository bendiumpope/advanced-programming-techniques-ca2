import { useEffect, useState } from "react";

const API_BASE = "/api";

/**
 * Loads the profile image with Authorization (img src cannot send Bearer tokens).
 */
export function useAvatarUrl(
  token: string | null,
  hasAvatar: boolean | undefined,
  refreshKey = 0
): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !hasAvatar) {
      setUrl(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/profile/avatar`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        if (!cancelled) setUrl(null);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token, hasAvatar, refreshKey]);

  return url;
}
