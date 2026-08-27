import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  _resetThrottleForTest,
  fetchUpstream,
  UpstreamError,
} from "../../src/lib/upstream.js";

// fetchUpstream: throttle global 0.8s + retry em 429/5xx com Retry-After
describe("fetchUpstream (rate limit + retry)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    _resetThrottleForTest();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("retorna a resposta quando upstream responde 200", async () => {
    const ok = new Response("{}", { status: 200 });
    const fetchMock = vi.fn(async () => ok);
    vi.stubGlobal("fetch", fetchMock);

    const p = fetchUpstream("https://upstream/json_db/config");
    await vi.advanceTimersByTimeAsync(1000);
    const res = await p;

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("tenta de novo em 429 respeitando Retry-After e então sucesso", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("rate limited", {
          status: 429,
          headers: { "retry-after": "1" },
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const p = fetchUpstream("https://upstream/json_db/x");
    await vi.advanceTimersByTimeAsync(5000);
    const res = await p;

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("lança UpstreamError após esgotar retries em 429", async () => {
    const fetchMock = vi.fn(async () => new Response("nope", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);

    const p = fetchUpstream("https://upstream/json_db/x");
    // consome todas as esperas (throttle + backoff 2/4/8s)
    const assertion = p.then(
      () => {
        throw new Error("deveria ter lançado");
      },
      (e: unknown) => {
        expect(e).toBeInstanceOf(UpstreamError);
        expect((e as UpstreamError).status).toBe(429);
      },
    );
    await vi.advanceTimersByTimeAsync(30000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(4); // 1 + 3 retries
  });

  it("lança UpstreamError imediatamente em 404 (não-retryable)", async () => {
    const fetchMock = vi.fn(async () => new Response("nf", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const p = fetchUpstream("https://upstream/json_db/x");
    const assertion = p.then(
      () => {
        throw new Error("deveria ter lançado");
      },
      (e: unknown) => {
        expect(e).toBeInstanceOf(UpstreamError);
        expect((e as UpstreamError).status).toBe(404);
      },
    );
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("limita a taxa: segunda chamada espera o intervalo mínimo", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const p1 = fetchUpstream("https://upstream/a");
    await vi.advanceTimersByTimeAsync(1000);
    await p1;

    const p2 = fetchUpstream("https://upstream/b");
    await vi.advanceTimersByTimeAsync(2000);
    await p2;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
