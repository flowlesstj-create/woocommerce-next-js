import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

interface ModelInfo {
  id: string;
  name: string;
}

// Filter to only useful text generation models
function filterModels(models: { id: string }[], provider: string): ModelInfo[] {
  const SKIP_PATTERNS = [
    /embed/i, /tts/i, /whisper/i, /dall-e/i, /moderation/i,
    /davinci/i, /babbage/i, /curie/i, /ada(?!-)/i, /search/i,
    /similarity/i, /edit/i, /insert/i, /audio/i, /realtime/i,
    /transcri/i, /vision/i, /-\d{4}$/,  // dated snapshots
  ];

  return models
    .filter((m) => !SKIP_PATTERNS.some((p) => p.test(m.id)))
    .map((m) => ({
      id: m.id,
      name: formatModelName(m.id, provider),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function formatModelName(id: string, provider: string): string {
  if (provider === "anthropic") {
    // claude-sonnet-4-20250514 -> Claude Sonnet 4
    return id
      .replace(/^claude-/, "Claude ")
      .replace(/-(\d+)-\d+$/, " $1")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return id;
}

async function fetchOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
    const data = await res.json();
    return filterModels(data.data || [], "openai");
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAnthropicModels(apiKey: string): Promise<ModelInfo[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
    const data = await res.json();
    return filterModels(data.data || [], "anthropic");
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchDeepSeekModels(apiKey: string): Promise<ModelInfo[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch("https://api.deepseek.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`DeepSeek API error: ${res.status}`);
    const data = await res.json();
    return filterModels(data.data || [], "deepseek");
  } finally {
    clearTimeout(timeout);
  }
}

function verifyAdminSession(): boolean {
  const secret = process.env.ADMIN_PASSWORD || "";
  const token = cookies().get("admin_session")?.value;
  if (!token) return false;
  const [nonce, sig] = token.split(".");
  if (!nonce || !sig) return false;
  const expected = require("crypto").createHmac("sha256", secret).update(nonce).digest("hex");
  return sig === expected;
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication via session cookie
    if (!verifyAdminSession()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider, apiKey } = await request.json();

    // Validate provider against allowed values
    const allowedProviders = ["openai", "anthropic", "deepseek"];
    if (!allowedProviders.includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: "API key required" }, { status: 400 });
    }
    let models: ModelInfo[];
    switch (provider) {
      case "openai":
        models = await fetchOpenAIModels(apiKey);
        break;
      case "anthropic":
        models = await fetchAnthropicModels(apiKey);
        break;
      case "deepseek":
        models = await fetchDeepSeekModels(apiKey);
        break;
      default:
        return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    return NextResponse.json({ models });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch models" },
      { status: 500 }
    );
  }
}
