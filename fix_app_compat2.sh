#!/bin/bash
# Remove os sed que falharam
sed -i '/import { compatRoutes } from ".\/routes\/compat.js";/d' src/app.ts
sed -i '/app.route("\/", compatRoutes);/d' src/app.ts

# Insere a nova
sed -i '/import { categoriesRoutes }/a import { createCompatRoutes } from "./routes/compat.js";' src/app.ts
sed -i '/app.route("\/v1\/categories", categoriesRoutes);/a \  createCompatRoutes(app);' src/app.ts
