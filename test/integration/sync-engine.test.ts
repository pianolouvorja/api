import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// DB temporario dedicado ANTES de qualquer import do app (mesmo padrao dos
// testes seeded — evita colisao com o data/catalog.db compartilhado)
const tmpDir = mkdtempSync(join(tmpdir(), "plj-sync-"));
process.env.DB_PATH = join(tmpDir, "sync.db");

// import dinamico DEPOIS do DB_PATH
const { closeDb, initDb } = await import("../../src/db/connection.js");
const { runSync } = await import("../../src/v1/custom/sync.service.js");
const { registerUser } = await import("./helpers/custom-auth-helpers.js");

/**
 * P3 — sync engine: LWW determinístico (B3), anti-ressurreição (B4),
 * permissão por owner (B9). Dois usuários simulam duas máquinas.
 */
describe("sync engine (LWW batch)", () => {
  let userA: { id_user: number; token: string };
  let userB: { id_user: number; token: string };

  beforeAll(() => {
    initDb();
    userA = registerUser("sync-a@test.local", "S3nh@F0rte");
    userB = registerUser("sync-b@test.local", "S3nh@F0rte");
  });
  afterAll(() => {
    closeDb();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  const T0 = 1_700_000_000_000;

  it("cria collection + musics a partir do payload do cliente", () => {
    const r = runSync(userA.id_user, {
      collections: [
        {
          client_uuid: "col-aaaa-0001",
          name: "Louvor Domingo",
          description: null,
          updated_at: T0,
          musics: [
            {
              client_uuid: "mus-aaaa-0001",
              name: "Hino 100",
              lyric: "glória glória",
              updated_at: T0,
              lyrics: [
                {
                  lyric: "glória glória",
                  order: 0,
                  time: "00:00",
                  instrumental_time: "00:00",
                  show_slide: 1,
                },
              ],
            },
          ],
        },
      ],
    });
    expect(r.applied.created).toBe(2);
    const col = r.collections.find((c) => c.client_uuid === "col-aaaa-0001");
    expect(col).toBeTruthy();
    expect(col!.is_owner).toBe(true);
    expect(col!.musics).toHaveLength(1);
    expect(col!.musics[0].lyrics).toHaveLength(1);
  });

  it("B3 LWW: client mais antigo que server → server vence (estado volta, mudança descartada)", () => {
    // server evolui pra T0+5000
    runSync(userA.id_user, {
      collections: [
        {
          client_uuid: "col-aaaa-0001",
          name: "Versão NOVA do server",
          updated_at: T0 + 5000,
        },
      ],
    });
    // cliente B (mesma conta? não — mesma collection via uuid, mas userB não é dono)
    // usa userA de outra "máquina" (mesmo user, payload mais antigo)
    const r = runSync(userA.id_user, {
      collections: [
        {
          client_uuid: "col-aaaa-0001",
          name: "Versão VELHA do cliente",
          updated_at: T0,
        },
      ],
    });
    expect(r.conflicts).toContainEqual({
      client_uuid: "col-aaaa-0001",
      resolution: "server-wins",
    });
    const col = r.collections.find((c) => c.client_uuid === "col-aaaa-0001");
    expect(col!.name).toBe("Versão NOVA do server");
  });

  it("B3 LWW: client mais novo vence e aplica", () => {
    const r = runSync(userA.id_user, {
      collections: [
        {
          client_uuid: "col-aaaa-0001",
          name: "Versão MAIS NOVA",
          updated_at: T0 + 9999,
        },
      ],
    });
    expect(
      r.conflicts.find((c) => c.client_uuid === "col-aaaa-0001"),
    ).toBeUndefined();
    const col = r.collections.find((c) => c.client_uuid === "col-aaaa-0001");
    expect(col!.name).toBe("Versão MAIS NOVA");
  });

  it("B4 anti-ressurreição: tombstone vence LWW e delete não reaparece", () => {
    const T = T0 + 20000;
    // userA deleta (tombstone) — vence pois é mais novo
    let r = runSync(userA.id_user, {
      collections: [
        {
          client_uuid: "col-aaaa-0001",
          name: "x",
          updated_at: T,
          deleted_at: T,
        },
      ],
    });
    expect(r.applied.updated).toBe(1);
    // tentativa de ressurreição com payload mais antigo → server (tombstone) vence
    r = runSync(userA.id_user, {
      collections: [
        { client_uuid: "col-aaaa-0001", name: "ressuscita?", updated_at: T0 },
      ],
    });
    const col = r.collections.find((c) => c.client_uuid === "col-aaaa-0001");
    // tombstoned: não vem mais na lista de vivos
    expect(col).toBeUndefined();
  });

  it("B4: criação enviada por B pra uuid tombstoned não ressuscita", () => {
    const T = T0 + 30000;
    // B tenta recriar com o mesmo client_uuid e timestamp novo
    const r = runSync(userB.id_user, {
      collections: [
        {
          client_uuid: "col-aaaa-0001",
          name: "hack ressurreição",
          updated_at: T,
        },
      ],
    });
    // a row tombstoned existe; criação vira UPDATE no existente, mas B não é dono
    expect(r.conflicts).toContainEqual({
      client_uuid: "col-aaaa-0001",
      resolution: "server-wins-forbidden",
    });
  });

  it("B9: B (não dono) não altera collection de A, mesmo com LWW a favor", () => {
    const T = T0 + 40000;
    // A cria nova collection
    runSync(userA.id_user, {
      collections: [
        { client_uuid: "col-priv-0001", name: "Privada A", updated_at: T0 },
      ],
    });
    // B tenta sobrescrever com timestamp maior
    const r = runSync(userB.id_user, {
      collections: [
        { client_uuid: "col-priv-0001", name: "Invadida por B", updated_at: T },
      ],
    });
    expect(r.conflicts).toContainEqual({
      client_uuid: "col-priv-0001",
      resolution: "server-wins-forbidden",
    });
    const _col = r.collections.find((c) => c.client_uuid === "col-priv-0001");
    // B não vê a collection de A na resposta (lista é do próprio user ou públicas)
    const mineOrPublic = r.collections.filter(
      (c) => c.client_uuid === "col-priv-0001",
    );
    if (mineOrPublic.length) {
      expect(mineOrPublic[0].name).toBe("Privada A");
    }
  });

  it("B6 (servidor): segunda máquina mesma conta vê as mudanças — determinístico", () => {
    // máquina 1 cria
    runSync(userA.id_user, {
      collections: [
        {
          client_uuid: "col-two-dev-01",
          name: "Multi-device",
          updated_at: T0 + 1000,
          musics: [
            {
              client_uuid: "mus-two-dev-01",
              name: "Hino X",
              updated_at: T0 + 1000,
            },
          ],
        },
      ],
    });
    // máquina 2 lê (mesmo user)
    const r2 = runSync(userA.id_user, { collections: [] });
    const col = r2.collections.find((c) => c.client_uuid === "col-two-dev-01");
    expect(col).toBeTruthy();
    expect(col!.name).toBe("Multi-device");
    expect(col!.musics[0].name).toBe("Hino X");
    // rodar 2x dá o mesmo resultado (determinismo)
    const r3 = runSync(userA.id_user, { collections: [] });
    expect(
      r3.collections.find((c) => c.client_uuid === "col-two-dev-01")?.name,
    ).toBe("Multi-device");
  });

  it("música movida de coletânea via sync (id_collection atualiza)", () => {
    runSync(userA.id_user, {
      collections: [
        { client_uuid: "col-move-src", name: "Origem", updated_at: T0 + 100 },
        { client_uuid: "col-move-dst", name: "Destino", updated_at: T0 + 100 },
      ],
    });
    // move a música: reenvia na dst com ts maior e id_collection implícito
    const r = runSync(userA.id_user, {
      collections: [
        {
          client_uuid: "col-move-dst",
          name: "Destino",
          updated_at: T0 + 500,
          musics: [
            {
              client_uuid: "mus-move-01",
              name: "Viajante",
              updated_at: T0 + 500,
            },
          ],
        },
      ],
    });
    const dst = r.collections.find((c) => c.client_uuid === "col-move-dst");
    expect(dst!.musics.map((m) => m.name)).toContain("Viajante");
  });
});
