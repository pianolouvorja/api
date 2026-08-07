#!/bin/bash
# Inserir o import e o mount do compatRoutes no src/app.ts
sed -i '/import { categoriesRoutes } from "\.\/v1\/categories\/categories\.routes\.js";/a import { compatRoutes } from "./routes/compat.js";' src/app.ts
sed -i '/app.route("\/v1\/categories", categoriesRoutes);/a \  app.route("/", compatRoutes);' src/app.ts
