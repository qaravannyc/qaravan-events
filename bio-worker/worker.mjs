// Backend of the link-in-bio page (events.qaravan.org/bio/). A Cloudflare Worker with one
// KV namespace (binding BIO). The page itself is static and lives in this repo; this Worker
// only stores the list of links and checks the team password.
//
//   GET  /links         public list (hidden and out-of-schedule links removed);
//                       with a valid token: the full list with everything
//   POST /login         {password} -> {token, expires}; 8 wrong tries per 15 min per device
//   PUT  /links         {items, version, editor?, force?} (token) -> publishes a new version
//   GET  /history       (token) the last versions: who, when, how many links
//   GET  /history/<n>   (token) one earlier version, to restore it
//
// Secret: EDIT_PASSWORD (wrangler secret put EDIT_PASSWORD). It is never stored in the
// repo or in the page. A token is "<expiry>.<HMAC of the expiry, keyed by the password>",
// so changing the password signs everybody out.

const TOKEN_HOURS = 12;
const MAX_ITEMS = 80;
const HISTORY_KEEP = 40;
const TRIES = 8, TRIES_WINDOW = 15 * 60;
const TIERS = ["feature", "standard", "quiet"];
const FLAGS = ["", "red", "orange", "yellow", "green", "sky", "purple"];
const LIMITS = { title: 100, note: 160, badge: 24, url: 2000, editor: 40 };
const enc = new TextEncoder();

const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra }
});

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
async function hmac(key, msg) {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(msg)));
}
// Compare two strings without leaking where they differ: compare fixed-length digests.
async function same(a, b) {
  const [x, y] = await Promise.all([hmac("bio-compare", String(a)), hmac("bio-compare", String(b))]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return d === 0;
}

async function makeToken(env) {
  const exp = Date.now() + TOKEN_HOURS * 3600 * 1000;
  return { token: `${exp}.${await hmac(env.EDIT_PASSWORD, "bio:" + exp)}`, expires: exp };
}
async function authed(request, env) {
  if (!env.EDIT_PASSWORD) return false;
  const m = /^Bearer (\d+)\.([0-9a-f]{64})$/.exec(request.headers.get("authorization") || "");
  if (!m || Number(m[1]) < Date.now()) return false;
  return same(m[2], await hmac(env.EDIT_PASSWORD, "bio:" + m[1]));
}

function cors(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "https://events.qaravan.org").split(",").map(s => s.trim());
  const h = { "access-control-allow-methods": "GET, POST, PUT, OPTIONS", "access-control-allow-headers": "authorization, content-type", "access-control-max-age": "86400", vary: "origin" };
  // Anyone may read the public list; only our own pages may send the password or edits.
  if (request.method === "GET" && !request.headers.get("authorization")) h["access-control-allow-origin"] = "*";
  else if (allowed.includes(origin)) h["access-control-allow-origin"] = origin;
  return h;
}

// ── Validation: the list is the contract with the page, so clean it here, not only there ──
const clean = (s, max) => (typeof s === "string" ? s : "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const pair = (o, max) => ({ en: clean(o && o.en, max), ru: clean(o && o.ru, max) });
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z")) && new Date(s + "T00:00:00Z").toISOString().startsWith(s);

export function validateItems(items) {
  if (!Array.isArray(items)) return { error: "items must be a list" };
  if (items.length > MAX_ITEMS) return { error: `at most ${MAX_ITEMS} items` };
  const seen = new Set(), out = [];
  for (const [i, raw] of items.entries()) {
    const at = `item ${i + 1}`;
    if (!raw || typeof raw !== "object") return { error: `${at}: not an object` };
    const type = raw.type === "heading" ? "heading" : raw.type === "link" ? "link" : null;
    if (!type) return { error: `${at}: type must be link or heading` };
    const id = String(raw.id || "");
    if (!/^[a-z0-9_-]{1,32}$/.test(id) || seen.has(id)) return { error: `${at}: bad or repeated id` };
    seen.add(id);
    const it = { id, type, title: pair(raw.title, LIMITS.title), hidden: raw.hidden === true, from: "", until: "" };
    if (!it.title.en && !it.title.ru) return { error: `${at}: a title is required` };
    for (const k of ["from", "until"]) {
      const v = clean(raw[k], 10);
      if (v && !isDate(v)) return { error: `${at}: ${k} must be YYYY-MM-DD` };
      it[k] = v;
    }
    if (it.from && it.until && it.from > it.until) return { error: `${at}: "from" is after "until"` };
    if (type === "link") {
      let u;
      try { u = new URL(clean(raw.url, LIMITS.url)); } catch (_) { return { error: `${at}: the link address is not valid` }; }
      if (u.protocol !== "https:" && u.protocol !== "http:") return { error: `${at}: the address must start with https://` };
      it.url = u.href;
      it.note = pair(raw.note, LIMITS.note);
      it.badge = pair(raw.badge, LIMITS.badge);
      it.tier = TIERS.includes(raw.tier) ? raw.tier : "standard";
      it.flag = FLAGS.includes(raw.flag) ? raw.flag : "";
    }
    out.push(it);
  }
  return { items: out };
}

// "Today" in New York, the way the events page counts days
const nyToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
export const visibleNow = (it, today = nyToday()) =>
  !it.hidden && (!it.from || it.from <= today) && (!it.until || it.until >= today);

const pad = n => String(n).padStart(8, "0");
const readLinks = async env => (await env.BIO.get("links", "json")) || { version: 0, updated: null, editor: "", items: null };

async function ipKey(request) {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  return "rl:" + (await hmac("bio-ip", ip)).slice(0, 24);   // a hash, never the address itself
}

export default {
  async fetch(request, env) {
    const c = cors(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: c });
    const reply = (data, status, extra) => { const r = json(data, status, extra); for (const [k, v] of Object.entries(c)) r.headers.set(k, v); return r; };
    try {
      const url = new URL(request.url), path = url.pathname.replace(/\/+$/, "") || "/";

      if (path === "/links" && request.method === "GET") {
        const data = await readLinks(env);
        if (await authed(request, env)) return reply(data);
        if (data.items) data.items = data.items.filter(it => visibleNow(it));
        return reply(data);
      }

      if (path === "/login" && request.method === "POST") {
        if (!env.EDIT_PASSWORD) return reply({ error: "not-configured" }, 503);
        const key = await ipKey(request);
        const tries = Number(await env.BIO.get(key)) || 0;
        if (tries >= TRIES) return reply({ error: "too-many-tries" }, 429, { "retry-after": String(TRIES_WINDOW) });
        let body = {};
        try { body = await request.json(); } catch (_) {}
        if (!(await same(body.password || "", env.EDIT_PASSWORD))) {
          await env.BIO.put(key, String(tries + 1), { expirationTtl: TRIES_WINDOW });
          return reply({ error: "wrong-password" }, 401);
        }
        await env.BIO.delete(key);
        return reply(await makeToken(env));
      }

      if (path === "/links" && request.method === "PUT") {
        if (!(await authed(request, env))) return reply({ error: "unauthorized" }, 401);
        let body;
        try { body = await request.json(); } catch (_) { return reply({ error: "bad-json" }, 400); }
        const v = validateItems(body.items);
        if (v.error) return reply({ error: "invalid", message: v.error }, 400);
        const cur = await readLinks(env);
        if (!body.force && Number(body.version) !== cur.version) return reply({ error: "conflict", current: cur }, 409);
        const next = { version: cur.version + 1, updated: new Date().toISOString(), editor: clean(body.editor, LIMITS.editor), items: v.items };
        await env.BIO.put("links", JSON.stringify(next));
        await env.BIO.put("h:" + pad(next.version), JSON.stringify(next), { metadata: { updated: next.updated, editor: next.editor, count: next.items.length } });
        if (next.version > HISTORY_KEEP) await env.BIO.delete("h:" + pad(next.version - HISTORY_KEEP));
        return reply(next);
      }

      if (path === "/history" && request.method === "GET") {
        if (!(await authed(request, env))) return reply({ error: "unauthorized" }, 401);
        const list = await env.BIO.list({ prefix: "h:" });
        const versions = list.keys.map(k => ({ version: Number(k.name.slice(2)), ...(k.metadata || {}) })).sort((a, b) => b.version - a.version).slice(0, HISTORY_KEEP);
        return reply({ versions });
      }

      const h = /^\/history\/(\d+)$/.exec(path);
      if (h && request.method === "GET") {
        if (!(await authed(request, env))) return reply({ error: "unauthorized" }, 401);
        const snap = await env.BIO.get("h:" + pad(Number(h[1])), "json");
        return snap ? reply(snap) : reply({ error: "not-found" }, 404);
      }

      return reply({ error: "not-found" }, 404);
    } catch (err) {
      return reply({ error: "server-error" }, 500);
    }
  }
};
