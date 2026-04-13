# Frontend

Vite + React + TypeScript SPA for the password manager.

## Stack

| Piece | Details |
| --- | --- |
| **Build** | [Vite](https://vitejs.dev/) — dev server and bundling |
| **API proxy** | [`vite.config.ts`](vite.config.ts) proxies `/api` to the Flask backend (default port **5001**) |

## Key files

- **Auth** — [`src/context/AuthContext.tsx`](src/context/AuthContext.tsx): JWT in `localStorage`; master password only in memory — after refresh, use **Unlock vault** on the vault page (not stored in `sessionStorage`).
- **Crypto** — [`src/lib/crypto.ts`](src/lib/crypto.ts): PBKDF2 (120k iterations) + AES-GCM; only ciphertext + IV are sent to the server.
- **API client** — [`src/api.ts`](src/api.ts).
- **Pages** — Login, Register, dashboard with sidebar: **Secure passwords**, **Password generator**, **Profile**.

## Run locally

From this directory:

```bash
npm install
npm run dev
```

- Opens the Vite dev server on port **5173**.
- Browser calls use the `/api` proxy to Flask (match backend `PORT`, default **5001**).

Production build:

```bash
npm run build
```