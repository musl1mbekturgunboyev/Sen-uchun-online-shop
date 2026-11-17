CREATE TABLE orders (id TEXT PRIMARY KEY, created INTEGER NOT NULL, product TEXT NOT NULL, qty INTEGER NOT NULL, note TEXT NOT NULL, contact TEXT NOT NULL, filename TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE order_files (order_id TEXT NOT NULL REFERENCES orders(id), part INTEGER NOT NULL, bytes BLOB NOT NULL, PRIMARY KEY(order_id, part));
