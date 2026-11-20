CREATE TABLE quote_acceptances(order_id TEXT PRIMARY KEY REFERENCES orders(id), amount INTEGER NOT NULL, accepted_at INTEGER NOT NULL);
CREATE TRIGGER reset_quote_acceptance AFTER UPDATE OF agreed_total ON order_finance
WHEN OLD.agreed_total IS NOT NEW.agreed_total BEGIN DELETE FROM quote_acceptances WHERE order_id=NEW.order_id; END;
