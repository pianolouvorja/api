/**
 * Quota de mídia custom por usuário (gauntlet P4 — B7, B12) e purge de
 * tombstones >30 dias (B5).
 *
 * Quota: soma de files.size dos arquivos vivos referenciados por
 * custom_musics do owner (áudio, instrumental, imagem). 100 MB default,
 * configurável via CUSTOM_QUOTA_MB.
 *
 * Importante (B12): tombstones NÃO somam — custom_musics com deleted_at
 * setado ficam fora da conta.
 */
import { getDb } from "../../db/connection.js";

export const QUOTA_BYTES_DEFAULT = 100 * 1024 * 1024; // 100 MB

export function getQuotaBytes(): number {
  const mb = Number(process.env.CUSTOM_QUOTA_MB);
  return Number.isFinite(mb) && mb > 0 ? mb * 1024 * 1024 : QUOTA_BYTES_DEFAULT;
}

/** Bytes usados pelo owner: arquivos vivos de músicas vivas dele. */
export function usedBytes(userId: number): number {
  const db = getDb();
  const r = db
    .prepare(
      `SELECT COALESCE(SUM(f.size), 0) AS total
       FROM custom_musics cm
       JOIN files f ON f.id_file IN (cm.id_file_audio, cm.id_file_instrumental, cm.id_file_image)
       WHERE cm.owner_id = ? AND cm.deleted_at IS NULL`,
    )
    .get(userId) as { total: number };
  return r.total ?? 0;
}

export function quotaCheck(
  userId: number,
  incomingBytes: number,
): {
  ok: boolean;
  used: number;
  quota: number;
  message?: string;
} {
  const used = usedBytes(userId);
  const quota = getQuotaBytes();
  if (used + incomingBytes > quota) {
    const mbUsed = (used / 1024 / 1024).toFixed(1);
    const mbQuota = (quota / 1024 / 1024).toFixed(0);
    return {
      ok: false,
      used,
      quota,
      message: `Cota de mídia excedida (${mbUsed} MB de ${mbQuota} MB usados). Remova músicas antigas ou arquivos não usados.`,
    };
  }
  return { ok: true, used, quota };
}

/**
 * Purge de tombstones: remove definitivamente coletâneas/músicas deletadas
 * há mais de `days` dias. Retorna contagens. Chamado no boot do servidor.
 */
export function purgeTombstones(days = 30): {
  collections: number;
  musics: number;
} {
  const db = getDb();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  // músicas tombstoned antigas: cascade cuida de custom_lyrics (FK ON DELETE CASCADE)
  const m = db
    .prepare(
      `DELETE FROM custom_musics WHERE deleted_at IS NOT NULL AND deleted_at < ?`,
    )
    .run(cutoff);
  const c = db
    .prepare(
      `DELETE FROM custom_collections WHERE deleted_at IS NOT NULL AND deleted_at < ?`,
    )
    .run(cutoff);

  return { collections: c.changes, musics: m.changes };
}
