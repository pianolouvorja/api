import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { validateEnv } from "./config/env.js";
import { initDb } from "./db/connection.js";
import { getPalcoWs } from "./v1/palco/palco.routes.js";

// RF-04: fail fast se env inválida
validateEnv(process.env as Record<string, string | undefined>);

const app = createApp();
const port = Number(process.env.PORT ?? 3100);

initDb();

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`piano-api rodando na porta ${info.port}`);
});

// WT-5a: injeta suporte a WebSocket no servidor HTTP (relay do Palco)
getPalcoWs().injectWebSocket(server);
