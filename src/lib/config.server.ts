import process from "node:process";

// Server-only config. The .server.ts suffix prevents Vite from bundling
// this file into the client — values here never reach the browser.
//
// On Cloudflare Workers, env binds at REQUEST time. Module-scope reads
// (e.g. `const x = process.env.X`) resolve to undefined — always read
// process.env INSIDE a function or handler.
//
// When to use which env-access pattern:
//   - .server.ts module (this file): server-only helpers reused across
//     handlers. Wrap reads in a function so they run per-request.
//   - inline process.env inside a createServerFn handler: one-off reads
//     not reused elsewhere.
//   - import.meta.env.VITE_FOO: PUBLIC config readable from both client
//     and server (analytics IDs, public URLs). Define in .env with the
//     VITE_ prefix. Never put secrets here — they ship to the browser.

export function getServerConfig() {
  // Node local development does not automatically expose non-VITE .env values
  // through process.env. Load them only in the server runtime; they never ship
  // to the browser.
  const loadEnvFile = (process as typeof process & { loadEnvFile?: () => void }).loadEnvFile;
  if (loadEnvFile && !process.env.BREVO_API_KEY) loadEnvFile();
  return {
    nodeEnv: process.env.NODE_ENV,
    brevoApiKey: process.env.BREVO_API_KEY,
    brevoSenderEmail: process.env.BREVO_SENDER_EMAIL,
    brevoSenderName: process.env.BREVO_SENDER_NAME ?? "Beyond Medicine",
  };
}
