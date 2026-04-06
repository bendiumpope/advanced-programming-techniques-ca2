/** Seconds before we try to clear the clipboard (best-effort; many browsers block clearing). */
export const CLIPBOARD_CLEAR_AFTER_MS = 30_000;

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Copy text and schedule a best-effort clipboard clear. Browsers may ignore empty writes.
 */
export function copyWithAutoClear(text: string, timerKey: string): Promise<void> {
  const prev = timers.get(timerKey);
  if (prev) clearTimeout(prev);

  return navigator.clipboard.writeText(text).then(() => {
    const t = setTimeout(() => {
      timers.delete(timerKey);
      navigator.clipboard.writeText("").catch(() => {});
    }, CLIPBOARD_CLEAR_AFTER_MS);
    timers.set(timerKey, t);
  });
}
