import test from "node:test";
import assert from "node:assert/strict";
import articlesHandler from "../api/articles.js";
import { createViewsHandler } from "../api/views.js";

function response() {
  return {
    statusCode: 200, headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test("article feed filters unsafe links and returns dated headlines with hourly caching", async (t) => {
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    text: async () => `<rss version="2.0"><channel><title>News</title>
      <item><title>EV &amp; charging</title><link>https://example.com/ev</link><pubDate>Mon, 07 Sep 2026 12:00:00 GMT</pubDate></item>
      <item><title>Unsafe</title><link>javascript:alert(1)</link></item>
      </channel></rss>`
  }));
  const res = response();
  await articlesHandler({ method: "GET", query: { topic: "ev" } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.articles.length, 1);
  assert.equal(res.body.articles[0].title, "EV & charging");
  assert.equal(res.body.articles[0].publishedAt, "2026-09-07T12:00:00.000Z");
  assert.match(res.headers["Cache-Control"], /s-maxage=3600/);
});

test("feed errors are not cached and unsupported topics do not fetch", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  const invalid = response();
  await articlesHandler({ method: "GET", query: { topic: "constructor" } }, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.equal(fetchMock.mock.callCount(), 0);
  const failed = response();
  await articlesHandler({ method: "GET", query: { topic: "moto" } }, failed);
  assert.equal(failed.statusCode, 502);
  assert.equal(failed.headers["Cache-Control"], "no-store");
});

test("view POST increments once and subsequent GETs only read", async () => {
  const previous = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
  let count = 10;
  const handler = createViewsHandler(() => ({
    rpc: async (name) => {
      assert.equal(name, "increment_page_views");
      return { data: ++count };
    },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { views: count } }) }) }) })
  }));
  try {
    for (const method of ["POST", "GET", "GET"]) {
      const res = response();
      await handler({ method }, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.count, 11);
      assert.equal(res.headers["Cache-Control"], "no-store");
    }
    const failedHandler = createViewsHandler(() => ({ rpc: async () => ({ error: new Error("database down") }) }));
    const failed = response();
    await failedHandler({ method: "POST" }, failed);
    assert.equal(failed.statusCode, 503);
    assert.equal(failed.body.count, undefined);
    delete process.env.SUPABASE_URL;
    const missing = response();
    await handler({ method: "GET" }, missing);
    assert.equal(missing.statusCode, 503);
  } finally {
    for (const [name, value] of [["SUPABASE_URL", previous.url], ["SUPABASE_SERVICE_ROLE_KEY", previous.key]]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
