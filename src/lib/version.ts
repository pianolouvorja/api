import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** Versão SemVer do pacote (package.json) — única fonte de verdade. */
export const APP_VERSION = (
  require("../../package.json") as { version: string }
).version;
