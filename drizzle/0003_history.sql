ALTER TABLE orders ADD COLUMN customer_hash TEXT;
--> statement-breakpoint
CREATE INDEX orders_by_customer ON orders(customer_hash, created DESC, id DESC);
