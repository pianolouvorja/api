import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

describe("OpenAPI Docs", () => {
  const app = createApp();

  it("GET /openapi.json deve retornar spec valida", async () => {
    const res = await app.request("/openapi.json");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.openapi).toBe("3.0.0");
    expect(body.info.title).toBe("Piano Louvor JA API");
    expect(body.info.version).toBeDefined();
    // O endpoint /v1/health deve estar documentado
    expect(body.paths["/v1/health"]).toBeDefined();
    expect(body.paths["/v1/health"].get).toBeDefined();
  });

  it("GET /doc deve servir Swagger UI em HTML", async () => {
    const res = await app.request("/doc");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("GET /v1/health deve estar documentado com schema", async () => {
    const res = await app.request("/openapi.json");
    const body = await res.json();
    const healthPath = body.paths["/v1/health"].get;
    const responseSchema =
      healthPath.responses["200"].content["application/json"].schema;
    expect(responseSchema.properties.status).toBeDefined();
    expect(responseSchema.properties.version).toBeDefined();
    expect(responseSchema.properties.uptime).toBeDefined();
    expect(responseSchema.properties.db_size).toBeDefined();
    expect(responseSchema.properties.tables).toBeDefined();
  });
});
