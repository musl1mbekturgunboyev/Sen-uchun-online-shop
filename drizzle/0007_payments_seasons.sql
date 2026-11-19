ALTER TABLE products ADD COLUMN sale_price INTEGER;
CREATE TABLE storefront_settings(id INTEGER PRIMARY KEY CHECK(id=1), season TEXT NOT NULL DEFAULT 'auto', revision INTEGER NOT NULL DEFAULT 1);
CREATE TABLE payment_receipts(id TEXT PRIMARY KEY, order_id TEXT NOT NULL, object_key TEXT NOT NULL, mime TEXT NOT NULL, amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', note TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL, decision TEXT);
CREATE UNIQUE INDEX payment_one_pending ON payment_receipts(order_id) WHERE status='pending';
CREATE INDEX payment_order ON payment_receipts(order_id,created);
CREATE TABLE recovery_codes(token_hash TEXT PRIMARY KEY, chat_id TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE recovered_access(customer_hash TEXT NOT NULL, chat_id TEXT NOT NULL, expires INTEGER NOT NULL, PRIMARY KEY(customer_hash,chat_id));
CREATE INDEX orders_telegram ON orders(telegram_chat);
