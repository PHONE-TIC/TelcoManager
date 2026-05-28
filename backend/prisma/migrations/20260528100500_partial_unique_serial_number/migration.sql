-- CreateIndex
CREATE UNIQUE INDEX "stock_numero_serie_unique_not_empty" ON "stock"(lower("numero_serie")) WHERE "numero_serie" <> '';
