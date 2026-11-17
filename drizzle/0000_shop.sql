CREATE TABLE products(id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, price INTEGER, image TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, visible INTEGER NOT NULL DEFAULT 1);
--> statement-breakpoint
CREATE TABLE events(day TEXT NOT NULL, kind TEXT NOT NULL, product INTEGER NOT NULL, hits INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day, kind, product));
