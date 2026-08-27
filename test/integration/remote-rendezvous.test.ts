import { createHash } from "node:crypto";
import { unlinkSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { closeDb, initDb } from "../../src/db/connection.js";

const TEST_DB = "./data/test-remote-rendezvous.db";
const KEY = "test-remote-session-key-32-bytes!";

function hash(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

describe("remote rendezvous", () => {
  beforeEach(() => {
    process.env.DB_PATH = TEST_DB;
    process.env.REMOTE_SESSION_KEY = KEY;
    initDb();
  });

  afterEach(() => {
    closeDb();
    delete process.env.REMOTE_SESSION_KEY;
    try {
      unlinkSync(TEST_DB);
    } catch {}
  });

  it("cria código e permite claim uma única vez", async () => {
    const app = createApp();
    const created = await app.request("/v1/remote/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        endpoint: "ws://192.168.1.5:45678",
        token: "ABCDEF12",
      }),
    });
    expect(created.status).toBe(201);
    const offer = await created.json();
    expect(offer.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(offer.expiresAt).toBeTypeOf("string");

    const claim = await app.request(`/v1/remote/sessions/${offer.code}/claim`, {
      method: "POST",
    });
    expect(claim.status).toBe(200);
    expect(await claim.json()).toMatchObject({
      endpoint: "ws://192.168.1.5:45678",
      token: "ABCDEF12",
    });

    const second = await app.request(
      `/v1/remote/sessions/${offer.code}/claim`,
      {
        method: "POST",
      },
    );
    expect(second.status).toBe(410);
  });

  it("rejeita endpoint não-LAN e código inexistente", async () => {
    const app = createApp();
    const invalid = await app.request("/v1/remote/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint: "ws://8.8.8.8:1234", token: "x" }),
    });
    expect(invalid.status).toBe(400);

    const missing = await app.request("/v1/remote/sessions/ABCD-1234/claim", {
      method: "POST",
    });
    expect(missing.status).toBe(404);
  });

  it("não persiste token em claro", async () => {
    const app = createApp();
    const res = await app.request("/v1/remote/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        endpoint: "ws://192.168.1.5:45678",
        token: "SECRET99",
      }),
    });
    const { code } = await res.json();
    const { getDb } = await import("../../src/db/connection.js");
    const row = getDb()
      .prepare(
        "SELECT code_hash, payload_ciphertext FROM remote_sessions WHERE code_hash = ?",
      )
      .get(hash(code.replace("-", ""))) as { payload_ciphertext: string };
    expect(row.payload_ciphertext).not.toContain("SECRET99");
  });
});
