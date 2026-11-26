-- Execute uma vez no schema usado pelo app (DB_NAME no arquivo .env).
-- O servidor cria as cotas do dia ao primeiro sorteio e as decrementa atomicamente.
CREATE TABLE IF NOT EXISTS prize_daily_stock (
  stock_date DATE NOT NULL,
  prize_key VARCHAR(40) NOT NULL,
  remaining SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (stock_date, prize_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
