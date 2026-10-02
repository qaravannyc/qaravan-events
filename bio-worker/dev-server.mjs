// Local try-out of the link-in-bio page together with its Worker, no Cloudflare account needed:
//   EDIT_PASSWORD=anything-8-or-more node bio-worker/dev-server.mjs      then open http://localhost:8787/bio/
// Serves this repository as static files and runs worker.mjs on /links, /login, /password, /history, /status, /setup with
// an in-memory KV (everything resets when you stop it). Also used by worker.test.mjs.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import worker from "./worker.mjs";

export function fakeKV() {
  const m = new Map();
  return {
    async get(k, type) { const e = m.get(k); if (!e || (e.exp && e.exp < Date.now())) return null; return type === "json" ? JSON.parse(e.v) : e.v; },
    async put(k, v, o = {}) { m.set(k, { v: String(v), meta: o.metadata, exp: o.expirationTtl ? Date.now() + o.expirationTtl * 1000 : 0 }); },
    async delete(k) { m.delete(k); },
    async list({ prefix = "" } = {}) {
      return { keys: [...m.entries()].filter(([k, e]) => k.startsWith(prefix) && !(e.exp && e.exp < Date.now())).map(([name, e]) => ({ name, metadata: e.meta })).sort((a, b) => a.name.localeCompare(b.name)) };
    }
  };
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png", ".js": "text/javascript", ".css": "text/css" };

export async function start(port = 8787, env = {}) {
  const { EDIT_PASSWORD = process.env.EDIT_PASSWORD || "", ...rest } = env;
  const e = { BIO: fakeKV(), ALLOWED_ORIGINS: `http://localhost:${port},http://127.0.0.1:${port}`, ...rest };
  // The real Worker gets its first password once through POST /setup; do the same here.
  if (EDIT_PASSWORD) await worker.fetch(new Request(`http://localhost:${port}/setup`, { method: "POST", body: JSON.stringify({ password: EDIT_PASSWORD }) }), e);
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, `http://localhost:${port}`);
    if (/^\/(links|login|history|status|setup|password)(\/|$)/.test(u.pathname)) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const r = await worker.fetch(new Request(u, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body }), e);
      res.writeHead(r.status, Object.fromEntries(r.headers));
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    let f = path.join(ROOT, decodeURIComponent(u.pathname));
    if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(resolve => server.listen(port, () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.env.EDIT_PASSWORD) { console.error("Set EDIT_PASSWORD first, e.g. EDIT_PASSWORD=test-password node bio-worker/dev-server.mjs"); process.exit(1); }
  const port = Number(process.env.PORT) || 8787;
  await start(port);
  console.log(`http://localhost:${port}/bio/   (sign in with your EDIT_PASSWORD; data lives in memory)`);
}
