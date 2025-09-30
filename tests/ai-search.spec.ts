import { test, expect, request } from "@playwright/test";
import { readFileSync } from "fs";
import { spawn } from "child_process";

const PORT = process.env.PLAYWRIGHT_PORT || "3310";
const BASE_URL = `http://127.0.0.1:${PORT}`;

let serverProcess: ReturnType<typeof spawn> | null = null;

function ensureEnv() {
  if (process.env.OPENROUTER_API_KEY) return;
  try {
    const content = readFileSync(".env.local", "utf-8");
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.trim().startsWith("#")) continue;
      const [key, ...rest] = line.split("=");
      if (!key) continue;
      const value = rest.join("=");
      if (value && !process.env[key]) {
        process.env[key] = value.trim();
      }
    }
  } catch (error) {
    throw new Error(`Failed to load .env.local: ${(error as Error).message}`);
  }
}

async function waitForServerReady(url: string, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok || res.status === 400 || res.status === 404) {
        return;
      }
    } catch (error) {
      // keep retrying
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`Server not ready after ${timeoutMs}ms`);
}

async function startServer() {
  if (serverProcess) return;
  ensureEnv();
  serverProcess = spawn("pnpm", ["start"], {
    env: {
      ...process.env,
      PORT,
      NODE_ENV: "production"
    },
    stdio: "pipe"
  });

  serverProcess.stdout?.on("data", data => {
    process.stdout.write(`[next] ${data}`);
  });
  serverProcess.stderr?.on("data", data => {
    process.stderr.write(`[next:error] ${data}`);
  });

  await waitForServerReady(`${BASE_URL}/`);
}

async function stopServer() {
  if (!serverProcess) return;
  await new Promise(resolve => {
    serverProcess?.once("exit", () => resolve(null));
    serverProcess?.kill("SIGTERM");
    setTimeout(() => {
      if (!serverProcess?.killed) {
        serverProcess?.kill("SIGKILL");
      }
      resolve(null);
    }, 5000);
  });
  serverProcess = null;
}

test.beforeAll(async () => {
  // Ensure fresh build before starting server
  await startServer();
});

test.afterAll(async () => {
  await stopServer();
});

test.describe("AI search API (Playwright)", () => {
  test("returns items for tech category", async () => {
    const api = await request.newContext({ baseURL: BASE_URL });
    const response = await api.get("/api/ai-search", {
      params: {
        categoryId: "tech",
        categoryName: "Tech",
        prompt: "latest technology and software",
        limit: "5"
      }
    });

    expect(response.status()).toBe(200);
    const payload = await response.json();
    expect(payload.id).toBe("tech");
    expect(Array.isArray(payload.items)).toBe(true);
    expect(payload.items.length).toBeGreaterThan(0);
    for (const item of payload.items) {
      expect(typeof item.title).toBe("string");
      expect(item.title.length).toBeGreaterThan(0);
      expect(typeof item.summary).toBe("string");
      expect(typeof item.link).toBe("string");
    }
  });

  test("returns combined items for all categories", async () => {
    const api = await request.newContext({ baseURL: BASE_URL });
    const response = await api.get("/api/ai-search", {
      params: {
        categoryId: "all",
        prompt: "all",
        limit: "3",
        categories: JSON.stringify([
          { id: "tech", name: "Tech", prompt: "latest technology" },
          { id: "business", name: "Business", prompt: "startup funding and market trends" }
        ])
      }
    });

    expect(response.status()).toBe(200);
    const payload = await response.json();
    expect(payload.id).toBe("all");
    expect(Array.isArray(payload.items)).toBe(true);
    expect(payload.items.length).toBeGreaterThan(0);
    const seenCategories = new Set(payload.items.map((item: any) => item.categoryId));
    expect(seenCategories.size).toBeGreaterThan(0);
  });
});
