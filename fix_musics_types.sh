#!/bin/bash
sed -i 's/200:/500: { description: "Erro interno" }, 200:/' src/v1/musics/musics.routes.ts
sed -i '/404: {/i \    500: { description: "Erro interno" },' src/v1/musics/musics.routes.ts
