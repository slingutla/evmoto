import test from "node:test";
import assert from "node:assert/strict";

import assistantHandler from "../api/assistant.js";
import recommendHandler from "../api/recommend.js";
import signupHandler from "../api/signup.js";

function createRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    }
  };
}

test("recommend returns 405 for non-POST requests", async () => {
  const req = { method: "GET" };
  const res = createRes();
  await recommendHandler(req, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.payload.message, "Method not allowed");
});

test("recommend returns 400 for invalid budget", async () => {
  const req = {
    method: "POST",
    body: { category: "headphones", budget: "abc", preference: "travel" }
  };
  const res = createRes();
  await recommendHandler(req, res);
  assert.equal(res.statusCode, 400);
});

test("recommend returns recommendation for valid input", async () => {
  const req = {
    method: "POST",
    body: { category: "headphones", budget: 300, preference: "noise canceling" }
  };
  const res = createRes();
  await recommendHandler(req, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.payload.recommendation, /QuietWave Pro/);
});

test("assistant returns 405 for non-POST requests", async () => {
  const req = { method: "GET" };
  const res = createRes();
  await assistantHandler(req, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.payload.message, "Method not allowed");
});

test("assistant returns 400 for empty messages", async () => {
  const req = { method: "POST", body: { message: "   " } };
  const res = createRes();
  await assistantHandler(req, res);
  assert.equal(res.statusCode, 400);
});

test("assistant returns answer from OpenAI response", async () => {
  const oldKey = process.env.OPENAI_API_KEY;
  const oldFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ output_text: "A compact EV fits this commute well." })
  });

  try {
    const req = { method: "POST", body: { message: "Which EV should I buy?" } };
    const res = createRes();
    await assistantHandler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.answer, "A compact EV fits this commute well.");
  } finally {
    if (oldKey) {
      process.env.OPENAI_API_KEY = oldKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
    globalThis.fetch = oldFetch;
  }
});

test("assistant returns answer from output content", async () => {
  const oldKey = process.env.OPENAI_API_KEY;
  const oldFetch = globalThis.fetch;
  let requestBody;
  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        output: [
          {
            type: "message",
            content: [
              { type: "output_text", text: "A compact EV fits this commute well." }
            ]
          }
        ]
      })
    };
  };

  try {
    const req = {
      method: "POST",
      body: { topic: "Motorcycles", message: "Which bike should I buy?" }
    };
    const res = createRes();
    await assistantHandler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.answer, "A compact EV fits this commute well.");
    assert.match(requestBody.instructions, /motorcycles/i);
    assert.match(requestBody.instructions, /rider experience/i);
  } finally {
    if (oldKey) {
      process.env.OPENAI_API_KEY = oldKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
    globalThis.fetch = oldFetch;
  }
});

test("signup returns 400 for invalid email", async () => {
  const req = { method: "POST", body: { email: "not-an-email" } };
  const res = createRes();
  await signupHandler(req, res);
  assert.equal(res.statusCode, 400);
});

test("signup returns success message without Supabase env vars", async () => {
  const oldUrl = process.env.SUPABASE_URL;
  const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  const req = { method: "POST", body: { email: "valid@example.com" } };
  const res = createRes();
  await signupHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.match(res.payload.message, /Signup received/);

  if (oldUrl) process.env.SUPABASE_URL = oldUrl;
  if (oldKey) process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey;
});
