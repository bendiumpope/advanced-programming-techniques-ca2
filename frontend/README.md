Frontend (frontend/)
Vite + React + TypeScript, frontend/vite.config.ts proxies /api → Flask.
Auth: frontend/src/context/AuthContext.tsx — JWT in localStorage, master password in sessionStorage for the tab session (so refresh still decrypts until the tab closes).
Crypto: frontend/src/lib/crypto.ts — PBKDF2 (120k iter) + AES-GCM; only ciphertext + IV go to the server.
Pages: Login, Register, dashboard with sidebar — Secure passwords 1, Password generator 2, Profile 3.
API client: frontend/src/api.ts.


How to run locally
Frontend (from frontend/): npm install, then npm run dev (opens Vite on port 5173; API calls use the /api proxy to 5001).
Production build was verified with npm run build. All related todos are completed.