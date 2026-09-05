import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  createRoom,
  getRoom,
  joinRoom,
  routeMessage,
  notifyPresence,
  resetRelay,
  type RelayClient,
} from "../../src/v1/palco/relay.js";

const KEY = "test-palco-relay-key-32-bytes!!";

/**
 * WT-6A: roteamento por destino. Receiver PWA declara ?slot=N e o operador
 * publica envelope com `to: "slot-N"` — só aquele receiver recebe.
 * Sem `to`, broadcast (retrocompatível com TVs webOS/Tizen antigas).
 */
function makeClient(
  role: RelayClient["role"],
  opts: { cid?: string; slot?: number } = {},
): RelayClient & { inbox: string[] } {
  const inbox: string[] = [];
  return {
    id: `${role}-${opts.cid ?? Math.random().toString(36).slice(2)}`,
    cid: opts.cid,
    slot: opts.slot,
    role,
    send: (data: string) => inbox.push(data),
    inbox,
  };
}

describe("relay — roteamento por slot (WT-6A)", () => {
  beforeEach(() => {
    process.env.PALCO_RELAY_KEY = KEY;
    resetRelay();
  });

  afterEach(() => {
    delete process.env.PALCO_RELAY_KEY;
  });

  it("receiver com slot recebe mensagem direcionada ao seu slot", () => {
    const created = createRoom()!;
    const room = getRoom(created.code, created.token)!;
    const op = makeClient("operator", { cid: "op-1" });
    const tv1 = makeClient("receiver", { cid: "tv-1", slot: 1 });
    const tv2 = makeClient("receiver", { cid: "tv-2", slot: 2 });
    joinRoom(room, op);
    joinRoom(room, tv1);
    joinRoom(room, tv2);

    const targets = routeMessage(
      room,
      op,
      JSON.stringify({ v: 2, to: "slot-2", type: "projection", text: "Hino" }),
    )!;
    for (const t of targets) t.send("x");

    expect(targets.map((t) => t.cid)).not.toContain("tv-1");
    expect(targets.map((t) => t.cid)).toContain("tv-2");
  });

  it("broadcast sem `to` chega em todos os receivers (retrocompatível)", () => {
    const created = createRoom()!;
    const room = getRoom(created.code, created.token)!;
    const op = makeClient("operator", { cid: "op-1" });
    const tv1 = makeClient("receiver", { cid: "tv-1", slot: 1 });
    const tv2 = makeClient("receiver", { cid: "tv-2", slot: 2 });
    joinRoom(room, op);
    joinRoom(room, tv1);
    joinRoom(room, tv2);

    const targets = routeMessage(
      room,
      op,
      JSON.stringify({ v: 2, type: "idle", msg: "" }),
    )!;
    expect(targets.filter((c) => c.role === "receiver")).toHaveLength(2);
  });

  it("slot inexistente não entrega a receivers de outro slot", () => {
    const created = createRoom()!;
    const room = getRoom(created.code, created.token)!;
    const op = makeClient("operator", { cid: "op-1" });
    const tv1 = makeClient("receiver", { cid: "tv-1", slot: 1 });
    joinRoom(room, op);
    joinRoom(room, tv1);

    const targets = routeMessage(
      room,
      op,
      JSON.stringify({ v: 2, to: "slot-9", type: "projection" }),
    )!;
    expect(targets.filter((c) => c.role === "receiver")).toHaveLength(0);
  });

  it("receiver sem slot declarado só recebe broadcast (comportamento legado)", () => {
    const created = createRoom()!;
    const room = getRoom(created.code, created.token)!;
    const op = makeClient("operator", { cid: "op-1" });
    const legado = makeClient("receiver", { cid: "tv-old" });
    joinRoom(room, op);
    joinRoom(room, legado);

    const directed = routeMessage(
      room,
      op,
      JSON.stringify({ v: 2, to: "slot-1", type: "projection" }),
    )!;
    expect(directed.filter((c) => c.role === "receiver")).toHaveLength(0);

    const broadcast = routeMessage(
      room,
      op,
      JSON.stringify({ v: 2, type: "idle" }),
    )!;
    expect(broadcast.filter((c) => c.role === "receiver")).toHaveLength(1);
  });

  it("notifyPresence expõe o slot declarado na receiverList", () => {
    const created = createRoom()!;
    const room = getRoom(created.code, created.token)!;
    const op = makeClient("operator", { cid: "op-1" });
    const tv2 = makeClient("receiver", { cid: "tv-2", slot: 2 });
    joinRoom(room, op);
    joinRoom(room, tv2);

    notifyPresence(room);
    const last = JSON.parse(op.inbox.at(-1)!) as {
      receiverList: Array<{ slot?: number; label: string }>;
    };
    expect(last.receiverList).toHaveLength(1);
    expect(last.receiverList[0]!.slot).toBe(2);
    expect(last.receiverList[0]!.label).toBe("Monitor 2");
  });
});
