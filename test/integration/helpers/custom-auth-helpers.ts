import { getDb } from "../../../src/db/connection.js";
import {
  generateSessionToken,
  hashPassword,
  hashToken,
} from "../../../src/v1/custom/auth.service.js";

/** Cria um custom_user + sessão direto no DB (helper de teste de sync). */
export function registerUser(
  email: string,
  password: string,
): {
  id_user: number;
  token: string;
} {
  const db = getDb();
  const r = db
    .prepare(
      "INSERT INTO custom_users (email, password_hash, display_name) VALUES (?, ?, ?)",
    )
    .run(email, hashPassword(password), email.split("@")[0]);
  const id = Number(r.lastInsertRowid);
  const token = generateSessionToken();
  db.prepare(
    "INSERT INTO custom_sessions (token_hash, id_user) VALUES (?, ?)",
  ).run(hashToken(token), id);
  return { id_user: id, token };
}
