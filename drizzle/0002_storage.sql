ALTER TABLE orders ADD COLUMN object_key TEXT;
--> statement-breakpoint
CREATE TABLE request_limits (key TEXT PRIMARY KEY, period INTEGER NOT NULL, hits INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX limits_expiry ON request_limits(period);
