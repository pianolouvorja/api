// Testes de camadas de segurança (SPEC: security-hardening)
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { initDb } from "../../src/db/connection.js";

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  initDb();
  app = createApp();
});

describe("RF-01: secure headers", () => {
  it("retorna X-Content-Type-Options nosniff em todas as respostas", async () => {
    const res = await app.request("/v1/health");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("retorna Referrer-Policy", async () => {
    const res = await app.request("/v1/health");
    expect(res.headers.get("referrer-policy")).toBeTruthy();
  });
});

describe("RF-02: error handler global", () => {
  it("404 em rota inexistente com corpo JSON", async () => {
    const res = await app.request("/rota-que-nao-existe");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBeTruthy();
  });
});

describe("RF-03: CORS configurável", () => {
  it("CORS default permite qualquer origem (compat apps)", async () => {
    const res = await app.request("/v1/health", {
      headers: { Origin: "https://example.com" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBeTruthy();
  });
});

describe("RF-04: validação de env no boot", () => {
  it("env válida não lança", async () => {
    const { validateEnv } = await import("../../src/config/env.js");
    expect(() => validateEnv({ PORT: "3100", NODE_ENV: "test" })).not.toThrow();
  });

  it("PORT inválida falha fast", async () => {
    const { validateEnv } = await import("../../src/config/env.js");
    expect(() => validateEnv({ PORT: "abc" })).toThrow(/PORT/);
  });

  it("NODE_ENV inválido falha", async () => {
    const { validateEnv } = await import("../../src/config/env.js");
    expect(() => validateEnv({ NODE_ENV: "banana" })).toThrow(/NODE_ENV/);
  });
});

describe("RF-05: rate limit proxy-aware", () => {
  const ctx = (xff?: string) =>
    ({
      req: {
        header: (name: string) =>
          name === "x-forwarded-for" ? xff : undefined,
      },
    }) as never;

  it("X-Forwarded-For é IGNORADO sem TRUSTED_PROXY", async () => {
    const { getClientIpSafe } = await import(
      "../../src/middleware/rateLimit.js"
    );
    const ip = getClientIpSafe(ctx("1.2.3.4, 5.6.7.8"), {
      TRUSTED_PROXY: "false",
    });
    expect(ip).not.toBe("1.2.3.4");
  });

  it("X-Forwarded-For é usado com TRUSTED_PROXY=true", async () => {
    const { getClientIpSafe } = await import(
      "../../src/middleware/rateLimit.js"
    );
    const ip = getClientIpSafe(ctx("1.2.3.4, 5.6.7.8"), {
      TRUSTED_PROXY: "true",
    });
    expect(ip).toBe("1.2.3.4");
  });
});

describe("RF-06: path traversal no /file", () => {
  it("path com .. (encoded, sobrevive à normalização de URL) responde 400", async () => {
    const res = await app.request("/file/..%2fetc%2fpasswd");
    expect(res.status).toBe(400);
  });
});
