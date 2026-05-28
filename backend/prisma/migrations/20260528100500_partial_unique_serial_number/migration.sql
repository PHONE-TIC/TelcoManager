-- Preflight check for duplicate serial numbers
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "stock"
    WHERE "numero_serie" <> ''
    GROUP BY lower("numero_serie")
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'DB_PREFLIGHT_FAIL: Duplicate serial numbers detected in table "stock". Please resolve duplicates manually before running migrations.';
  END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "stock_numero_serie_unique_not_empty" ON "stock"(lower("numero_serie")) WHERE "numero_serie" <> '';
