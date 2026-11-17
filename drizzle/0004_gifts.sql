CREATE TABLE gift_settings (id INTEGER PRIMARY KEY CHECK(id=1), settings TEXT NOT NULL);
--> statement-breakpoint
ALTER TABLE orders ADD COLUMN stage TEXT;
--> statement-breakpoint
ALTER TABLE orders ADD COLUMN gift TEXT;
--> statement-breakpoint
ALTER TABLE orders ADD COLUMN tracking TEXT;
--> statement-breakpoint
CREATE UNIQUE INDEX orders_tracking ON orders(tracking);
