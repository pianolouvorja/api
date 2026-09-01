import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  relayStats,
  resetRelay,
  routeMessage,
  signRoom,
  type RelayClient,
} from "../../src/v1/palco/relay.js";

const KEY = "test-palco-relay-key-32-bytes!!";

function fakeClient(
  id: string,
  role: RelayClient["role"],
  log: string[] = [],
): RelayClient {
  return { id, role, send: (data) => log.push(`${id}:${data}`) };
}

describe("palco relay (unit)", () => {
  beforeEach(() => {
    process.env.PALCO_RELAY_KEY = KEY;
    resetRelay();
  });

  afterEach(() => {
    delete process.env.PALCO_RELAY_KEY;
  });

  it("cria room com código e token HMAC consistentes", () => {
    const room = createRoom();
    expect(room).not.toBeNull();
    expect(room!.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(room!.token).toBe(signRoom(room!.code));
  });

  it("getRoom rejeita token inválido (handshake sem HMAC)", () => {
    const { code } = createRoom()!;
    expect(getRoom(code, "token-falso")).toBeNull();
  });

  it("normaliza código case-insensitive", () => {
    const { code, token } = createRoom()!;
    expect(getRoom(code.toLowerCase(), token)).not.toBeNull();
  });

  it("só um operator por room", () => {
    const { code, token } = createRoom()!;
    const room = getRoom(code, token)!;
    const a = fakeClient("op1", "operator");
    const b = fakeClient("op2", "operator");
    expect(joinRoom(room, a).ok).toBe(true);
    expect(joinRoom(room, b).ok).toBe(false);
  });

  it("operator publica para todos os outros papéis", () => {
    const { code, token } = createRoom()!;
    const room = getRoom(code, token)!;
    const op = fakeClient("op", "operator");
    const sender = fakeClient("s1", "sender");
    const receiver = fakeClient("r1", "receiver");
    joinRoom(room, op);
    joinRoom(room, sender);
    joinRoom(room, receiver);

    const targets = routeMessage(room, op, '{"module":"bible"}');
    expect(targets).not.toBeNull();
    expect(targets!.map((t) => t.id)).toEqual(["s1", "r1"]);
  });

  it("sender publica para operator+receiver, não para outros senders", () => {
    const { code, token } = createRoom()!;
    const room = getRoom(code, token)!;
    const op = fakeClient("op", "operator");
    const s1 = fakeClient("s1", "sender");
    const s2 = fakeClient("s2", "sender");
    const r1 = fakeClient("r1", "receiver");
    joinRoom(room, op);
    joinRoom(room, s1);
    joinRoom(room, s2);
    joinRoom(room, r1);

    const targets = routeMessage(room, s1, '{"slot":0,"status":"on"}');
    expect(targets!.map((t) => t.id).sort()).toEqual(["op", "r1"]);
  });

  it("receiver não publica (read-only)", () => {
    const { code, token } = createRoom()!;
    const room = getRoom(code, token)!;
    const r1 = fakeClient("r1", "receiver");
    joinRoom(room, r1);
    expect(routeMessage(room, r1, '{"x":1}')).toBeNull();
  });

  it("late-join: receiver recebe último estado do sender ao entrar", () => {
    const { code, token } = createRoom()!;
    const room = getRoom(code, token)!;
    const opLog: string[] = [];
    const s1 = fakeClient("s1", "sender");
    const r1 = fakeClient("r1", "receiver", opLog);
    joinRoom(room, s1);
    routeMessage(room, s1, '{"slot":0,"status":"on"}');

    joinRoom(room, r1);
    expect(opLog).toEqual(['r1:{"slot":0,"status":"on"}']);
  });

  it("leaveRoom limpa estado do client", () => {
    const { code, token } = createRoom()!;
    const room = getRoom(code, token)!;
    const s1 = fakeClient("s1", "sender");
    joinRoom(room, s1);
    routeMessage(room, s1, '{"x":1}');
    leaveRoom(room, s1);
    expect(room.lastStateBySender.has("s1")).toBe(false);
    expect(room.clients.size).toBe(0);
  });

  it("sem PALCO_RELAY_KEY nem REMOTE_SESSION_KEY: getRoom falha seguro", () => {
    delete process.env.PALCO_RELAY_KEY;
    delete process.env.REMOTE_SESSION_KEY;
    const { code, token } = createRoom()!;
    expect(getRoom(code, token)).toBeNull();
  });

  it("stats reflete rooms e clients", () => {
    const a = createRoom()!;
    const b = createRoom()!;
    const ra = getRoom(a.code, a.token)!;
    const rb = getRoom(b.code, b.token)!;
    joinRoom(ra, fakeClient("x", "receiver"));
    joinRoom(rb, fakeClient("y", "receiver"));
    expect(relayStats()).toEqual({ rooms: 2, clients: 2 });
  });
});
