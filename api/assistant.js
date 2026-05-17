import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1-mini";
const MAX_MESSAGE_LENGTH = 1200;
const MAX_OUTPUT_TOKENS = 1200;

function parseEnvValue(raw) {
  const value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function getOpenAIKey() {
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }

  const envPaths = [
    join(process.cwd(), ".env.local"),
    join(process.cwd(), ".env"),
    join(process.cwd(), ".venv/.env")
  ];
  for (const envPath of envPaths) {
    if (!existsSync(envPath) || !statSync(envPath).isFile()) {
      continue;
    }

    const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const match = trimmed.match(/^OPENAI_API_KEY\s*=\s*(.+)$/);
      if (match) {
        return parseEnvValue(match[1]);
      }
    }
  }

  return "";
}

function extractText(responseBody) {
  if (typeof responseBody.output_text === "string") {
    return responseBody.output_text.trim();
  }

  const chunks = [];

  function collectText(value) {
    if (!value) {
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        collectText(item);
      }
      return;
    }
    if (typeof value === "object") {
      if (
        (value.type === "output_text" || value.type === "text") &&
        typeof value.text === "string"
      ) {
        chunks.push(value.text);
        return;
      }
      if (typeof value.output_text === "string") {
        chunks.push(value.output_text);
      }
      if (Array.isArray(value.output)) {
        collectText(value.output);
      }
      if (Array.isArray(value.content)) {
        collectText(value.content);
      }
    }
  }

  collectText(responseBody.output);
  return chunks.join("\n").trim();
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    const message = String(req.body?.message || "").trim();
    if (!message) {
      return res.status(400).json({ message: "Please enter a message." });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ message: "Message is too long." });
    }

    const apiKey = getOpenAIKey();
    if (!apiKey) {
      return res.status(500).json({
        message: "OPENAI_API_KEY is missing. Add it to .env.local or your deployment environment."
      });
    }

    const openaiRes = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        instructions:
          "You are the EvMoto AI assistant. Help shoppers compare electric vehicles, motorcycles, budgets, range, charging, riding experience, comfort, and ownership tradeoffs. Keep answers concise, practical, and tailored to the user's stated needs.",
        input: message,
        text: { format: { type: "text" } },
        max_output_tokens: MAX_OUTPUT_TOKENS,
        store: false
      })
    });

    const data = await openaiRes.json().catch(() => ({}));
    if (!openaiRes.ok) {
      return res.status(openaiRes.status).json({
        message: data.error?.message || "OpenAI request failed."
      });
    }

    const answer = extractText(data);
    if (!answer && data.status === "incomplete") {
      const reason = data.incomplete_details?.reason || "unknown";
      return res.status(502).json({
        message: `OpenAI response was incomplete (${reason}). Please try a shorter question.`
      });
    }
    if (!answer && data.error?.message) {
      return res.status(502).json({ message: data.error.message });
    }

    return res.status(200).json({
      answer: answer || "I could not generate an answer. Please try again."
    });
  } catch {
    return res.status(500).json({ message: "Internal server error" });
  }
}
