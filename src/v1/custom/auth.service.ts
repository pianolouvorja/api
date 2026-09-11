/**
 * Auth mínimo de coletâneas custom: PBKDF2 (node:crypto, zero deps) +
 * token de sessão opaco. O banco guarda só o sha256 do token — o token
 * puro vive apenas na resposta do login/register e no localStorage do app.
 */
import {
  createHash,
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const PBKDF2_ITERATIONS = 210_000;
const KEY_LEN = 32;
const DIGEST = "sha256";

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(
    plain,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LEN,
    DIGEST,
  ).toString("hex");
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [scheme, iterRaw, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterRaw || !salt || !hash) return false;
  const iterations = Number(iterRaw);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  const candidate = pbkdf2Sync(plain, salt, iterations, KEY_LEN, DIGEST);
  const expected = Buffer.from(hash, "hex");
  // timingSafeEqual exige buffers de mesmo length
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}

/** Token opaco que o cliente guarda; o banco persiste apenas hashToken(token). */
export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
