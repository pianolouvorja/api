import { describe, expect, it, vi } from "vitest";
import {
  _resetThrottleForTest,
  fetchUpstream,
} from "../../src/lib/upstream.js";

describe("upstream throttle — intervalo minimo entre chamadas (linha 27)", () => {
  it("segunda chamada aguarda MIN_INTERVAL_MS quando ocorre antes do intervalo", async () => {
    _resetThrottleForTest();
    const ok = new Response("ok", { status: 200 });
    const fetchMock = vi.fn().mockResolvedValue(ok);
    vi.stubGlobal("fetch", fetchMock);

    const t0 = Date.now();
    await fetchUpstream("https://upstream.test/a");
    await fetchUpstream("https://upstream.test/b");
    const elapsed = Date.now() - t0;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    // MIN_INTERVAL_MS = 800ms: a segunda chamada precisa ter esperado o throttle
    expect(elapsed).toBeGreaterThanOrEqual(780);
    vi.unstubAllGlobals();
  });
});
