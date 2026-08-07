-- Migration 014: Adicionar colunas faltantes em bible_books e bible_versions
ALTER TABLE bible_books ADD COLUMN testament INTEGER;
ALTER TABLE bible_books ADD COLUMN keywords TEXT;
ALTER TABLE bible_books ADD COLUMN color TEXT;

ALTER TABLE bible_versions ADD COLUMN abbreviation TEXT;
