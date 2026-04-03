import { useCallback, useMemo, useState } from "react";
import { generatePassword, type GeneratorOptions } from "../lib/passwordGenerator";

const defaultOpts: GeneratorOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
};

export function Generator() {
  const [opts, setOpts] = useState<GeneratorOptions>(defaultOpts);
  const [out, setOut] = useState(() => generatePassword(defaultOpts));
  const [copied, setCopied] = useState(false);

  const regenerate = useCallback(() => {
    setOut(generatePassword(opts));
    setCopied(false);
  }, [opts]);

  const strength = useMemo(() => passwordStrength(out), [out]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(out);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Password generator</h1>
        <p className="muted">Create strong random passwords locally in your browser.</p>
      </header>

      <section className="card gen-card">
        <div className="gen-output">
          <code className="gen-password mono" title={out}>
            {out}
          </code>
          <div className="gen-actions">
            <button type="button" className="btn btn-primary" onClick={regenerate}>
              Regenerate
            </button>
            <button type="button" className="btn btn-ghost" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <p className={`strength strength-${strength.label}`}>
          Strength: <strong>{strength.label}</strong> ({out.length} chars)
        </p>

        <label className="field">
          <span>Length: {opts.length}</span>
          <input
            type="range"
            min={8}
            max={64}
            value={opts.length}
            onChange={(e) =>
              setOpts((o) => ({ ...o, length: Number(e.target.value) }))
            }
          />
        </label>

        <div className="checkbox-grid">
          {(
            [
              ["uppercase", "A–Z"],
              ["lowercase", "a–z"],
              ["digits", "0–9"],
              ["symbols", "!@#…"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="check">
              <input
                type="checkbox"
                checked={opts[k]}
                onChange={(e) => setOpts((o) => ({ ...o, [k]: e.target.checked }))}
              />
              {label}
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}

function passwordStrength(pw: string): { label: "weak" | "fair" | "strong" } {
  let score = 0;
  if (pw.length >= 12) score += 1;
  if (pw.length >= 16) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  if (score <= 2) return { label: "weak" };
  if (score <= 4) return { label: "fair" };
  return { label: "strong" };
}
