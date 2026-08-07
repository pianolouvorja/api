import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { initDb } from "./db/connection.js";

const app = createApp();
const port = Number(process.env.PORT ?? 3100);

initDb();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`piano-api rodando na porta ${info.port}`);
});
