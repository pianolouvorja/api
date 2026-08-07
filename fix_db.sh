#!/bin/bash
sed -i 's/FROM albums_categories/FROM categories_albums/' src/v1/categories/categories.routes.ts
