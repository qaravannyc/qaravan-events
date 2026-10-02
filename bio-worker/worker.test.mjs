// node --test bio-worker/worker.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import worker, { validateItems, visibleNow } from "./worker.mjs";
import { fakeKV } from "./dev-server.mjs";

const PW = "test-password-123";
const env = () => ({ BIO: fakeKV(), EDIT_PASSWORD: PW, ALLOWED_ORIGINS: "https://events.qaravan.org" });
const call = (e, method, path, body, headers = {}) => worker.fetch(new Request("https://w.test" + path, {
  method, headers: { origin: "https://events.qaravan.org", "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined
}), e);
const login = async (e, password = PW) => call(e, "POST", "/login", { password }, { "cf-connecting-ip": "1.2.3.4" });
const link = (o = {}) => ({ id: "a1", type: "link", title: { en: "Donate", ru: "Поддержать" }, url: "https://givebutter.com/qaravan", tier: "feature", ...o });

test("login: right password gives a token, wrong one does not, 8 misses lock out", async () => {
  const e = env();
  assert.equal((await login(e, "nope")).status, 401);
  const ok = await login(e);
  assert.equal(ok.status, 200);
  assert.match((await ok.json()).token, /^\d+\.[0-9a-f]{64}$/);
  for (let i = 0; i < 8; i++) await login(e, "bad" + i);
  const locked = await login(e);
  assert.equal(locked.status, 429);
});

test("publish needs a token; tokens die with the password", async () => {
  const e = env();
  assert.equal((await call(e, "PUT", "/links", { items: [link()], version: 0 })).status, 401);
  const { token } = await (await login(e)).json();
  const auth = { authorization: "Bearer " + token };
  assert.equal((await call(e, "PUT", "/links", { items: [link()], version: 0 }, auth)).status, 200);
  assert.equal((await call({ ...e, EDIT_PASSWORD: "changed" }, "PUT", "/links", { items: [link()], version: 1 }, auth)).status, 401);
  const forged = { authorization: "Bearer " + (Date.now() + 1e7) + "." + "0".repeat(64) };
  assert.equal((await call(e, "PUT", "/links", { items: [link()], version: 1 }, forged)).status, 401);
});

test("versions: a stale save gets 409, force overrides, history keeps who and when", async () => {
  const e = env();
  const { token } = await (await login(e)).json();
  const auth = { authorization: "Bearer " + token };
  const one = await (await call(e, "PUT", "/links", { items: [link()], version: 0, editor: "Sasha" }, auth)).json();
  assert.equal(one.version, 1);
  const stale = await call(e, "PUT", "/links", { items: [link({ id: "b2" })], version: 0 }, auth);
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).current.version, 1);
  const forced = await (await call(e, "PUT", "/links", { items: [link({ id: "b2" })], version: 0, force: true }, auth)).json();
  assert.equal(forced.version, 2);
  const hist = await (await call(e, "GET", "/history", null, auth)).json();
  assert.deepEqual(hist.versions.map(v => v.version), [2, 1]);
  assert.equal(hist.versions[1].editor, "Sasha");
  const old = await (await call(e, "GET", "/history/1", null, auth)).json();
  assert.equal(old.items[0].id, "a1");
  assert.equal((await call(e, "GET", "/history", null)).status, 401);
});

test("public list hides hidden and out-of-schedule links; the editor sees all", async () => {
  const e = env();
  const { token } = await (await login(e)).json();
  const auth = { authorization: "Bearer " + token };
  const items = [link({ id: "live" }), link({ id: "off", hidden: true }), link({ id: "old", until: "2020-01-01" }), link({ id: "soon", from: "2099-01-01" })];
  await call(e, "PUT", "/links", { items, version: 0 }, auth);
  const pub = await call(e, "GET", "/links", null, { origin: "https://anywhere.example" });
  assert.deepEqual((await pub.json()).items.map(i => i.id), ["live"]);
  assert.equal(pub.headers.get("access-control-allow-origin"), "*");
  const all = await (await call(e, "GET", "/links", null, auth)).json();
  assert.equal(all.items.length, 4);
});

test("an empty server says so, so the page falls back to links.json", async () => {
  const data = await (await call(env(), "GET", "/links")).json();
  assert.equal(data.items, null);
  assert.equal(data.version, 0);
});

test("only our page may send edits from a browser", async () => {
  const pre = await worker.fetch(new Request("https://w.test/links", { method: "OPTIONS", headers: { origin: "https://evil.example" } }), env());
  assert.equal(pre.headers.get("access-control-allow-origin"), null);
  const mine = await worker.fetch(new Request("https://w.test/links", { method: "OPTIONS", headers: { origin: "https://events.qaravan.org" } }), env());
  assert.equal(mine.headers.get("access-control-allow-origin"), "https://events.qaravan.org");
});

test("validation: addresses, titles, dates, ids", () => {
  assert.ok(validateItems([link()]).items);
  for (const bad of [
    link({ url: "javascript:alert(1)" }), link({ url: "not a url" }), link({ url: "ftp://x.org/a" }),
    link({ title: { en: "", ru: "" } }), link({ from: "2026-13-40" }), link({ from: "2026-10-10", until: "2026-10-01" }), link({ id: "Bad Id!" }),
    { ...link(), type: "banner" }
  ]) assert.ok(validateItems([bad]).error, JSON.stringify(bad));
  assert.ok(validateItems([link(), link()]).error, "repeated id");
  assert.ok(validateItems(Array.from({ length: 81 }, (_, i) => link({ id: "x" + i }))).error, "too many");
  const v = validateItems([link({ title: { en: "  A \n\n B ", ru: "" }, note: { en: "x".repeat(500) }, tier: "huge", flag: "pink" })]).items[0];
  assert.equal(v.title.en, "A B");
  assert.equal(v.note.en.length, 160);
  assert.equal(v.tier, "standard");
  assert.equal(v.flag, "");
});

test("schedule: from and until are inclusive, in New York days", () => {
  const it = o => ({ hidden: false, from: "", until: "", ...o });
  assert.ok(visibleNow(it({ from: "2026-10-05", until: "2026-10-05" }), "2026-10-05"));
  assert.ok(!visibleNow(it({ from: "2026-10-06" }), "2026-10-05"));
  assert.ok(!visibleNow(it({ until: "2026-10-04" }), "2026-10-05"));
  assert.ok(!visibleNow(it({ hidden: true }), "2026-10-05"));
});
