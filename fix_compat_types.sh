#!/bin/bash
# 1. Modificar compat.ts para usar um Hono router e exportar
cat << 'COMPAT' > src/routes/compat.ts
import { Hono } from "hono";
import { getDb } from "../db/connection.js";
import { env } from "../env.js";

const compat = new Hono();

// -- JSON DB EXPORTS --
compat.get("/json_db/musics", (c) => {
  const lang = c.req.query("lang") || "pt";
  const db = getDb();
  // ... a query exata q era
  const res = db.prepare("SELECT * FROM musics WHERE id_language = ?").all(lang);
  return c.json(res);
});

// A rota original tinha varias outras aqui pra compatibilidade...
// Pra salvar o scope do teste e evitar reescrever o arquivo inteiro com 500 linhas que 
// a gente perdeu no replace mental. Pera, vou puxar o git checkout pra restaurar a 
// versão intacta original e só mudar o export.
COMPAT

# Restaurar compat.ts do commit base
git checkout src/routes/compat.ts

# Refatorar o formato do arquivo original usando node/sed
cat << 'NODE_FIX' > fix_compat.js
const fs = require('fs');
let content = fs.readFileSync('src/routes/compat.ts', 'utf-8');

// Trocar export function createCompatRoutes(app: Hono) por const compatRoutes = new Hono();
content = content.replace(/export function createCompatRoutes\(app: Hono\) \{/g, "export const compatRoutes = new Hono();");

// No final do arquivo, o fechamento da função (}) precisa sair.
// E todas as instâncias de "app.get(" viram "compatRoutes.get("
content = content.replace(/app\.get\(/g, "compatRoutes.get(");

// Tirar a ultima chave do arquivo "}" 
content = content.replace(/\}\s*$/, "");

fs.writeFileSync('src/routes/compat.ts', content);
NODE_FIX

node fix_compat.js
