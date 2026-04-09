import type { StockWithRelations } from "./stock.utils";

export type StockSortDirection = "asc" | "desc";

export type StockItemWithComputedQuantity = StockWithRelations & {
  _totalQuantityForReference: number;
};

export function getFilteredStockItems(
  stock: StockWithRelations[],
  categoryFilter: string,
  sortColumn: string,
  sortDirection: StockSortDirection
): StockItemWithComputedQuantity[] {
  const filtered = stock.filter((item) =>
    categoryFilter === "all" ? true : item.categorie === categoryFilter
  );

  const quantityByReference = new Map<string, number>();
  for (const item of filtered) {
    const current = quantityByReference.get(item.reference) || 0;
    quantityByReference.set(item.reference, current + item.quantite);
  }

  const result = filtered.map((item) => ({
    ...item,
    _totalQuantityForReference:
      quantityByReference.get(item.reference) || item.quantite,
  })) as StockItemWithComputedQuantity[];

  result.sort((a, b) => {
    const sortKey = sortColumn as keyof StockItemWithComputedQuantity;
    const valueA = a[sortKey];
    const valueB = b[sortKey];
    const normalizedA = typeof valueA === "string" ? valueA.toLowerCase() : valueA;
    const normalizedB = typeof valueB === "string" ? valueB.toLowerCase() : valueB;

    if (normalizedA === undefined || normalizedA === null) return 1;
    if (normalizedB === undefined || normalizedB === null) return -1;
    if (normalizedA < normalizedB) return sortDirection === "asc" ? -1 : 1;
    if (normalizedA > normalizedB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  return result;
}

export function buildStockCsvRows(
  filteredStock: StockWithRelations[],
  filter: string
): Array<Array<string | number>> {
  return filteredStock.map((item) => [
    item.nomMateriel,
    item.reference,
    item.numeroSerie || "",
    item.codeBarre || "",
    item.categorie,
    item.fournisseur || "",
    item.quantite,
    filter,
  ]);
}
