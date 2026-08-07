CREATE TABLE IF NOT EXISTS bible_versions (
  id_version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  language TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bible_books (
  id_book INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation TEXT,
  chapters INTEGER DEFAULT 0,
  book_number INTEGER DEFAULT 0,
  id_language TEXT,
  FOREIGN KEY (id_language) REFERENCES languages(id_language)
);

CREATE TABLE IF NOT EXISTS bible_verses (
  id_verse INTEGER PRIMARY KEY AUTOINCREMENT,
  id_version TEXT NOT NULL,
  id_book INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text TEXT NOT NULL,
  FOREIGN KEY (id_version) REFERENCES bible_versions(id_version),
  FOREIGN KEY (id_book) REFERENCES bible_books(id_book),
  UNIQUE(id_version, id_book, chapter, verse)
);
