import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

describe("GET /v1/health", () => {
  const app = createApp();

  it("deve retornar status ok", async () => {
    const res = await app.request("/v1/health");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.version).toBeDefined();
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });

  it("deve incluir info do banco", async () => {
    const res = await app.request("/v1/health");
    const body = await res.json();
    expect(body.db_size).toBeGreaterThanOrEqual(0);
    expect(body.tables).toBeGreaterThanOrEqual(0);
  });
});
