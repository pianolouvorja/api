#!/bin/bash
sed -i 's/param: z.object({/params: z.object({/' src/v1/musics/musics.routes.ts
sed -i 's/param: z.object({/params: z.object({/' src/v1/albums/albums.routes.ts
sed -i 's/param: z.object({/params: z.object({/' src/v1/categories/categories.routes.ts
sed -i 's/param: z.object({/params: z.object({/' src/v1/bible/bible.routes.ts
