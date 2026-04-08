import type { FilterType, InventoryItem, InventorySession } from "./inventory.types";

export function getInventoryDiscrepancies(items: InventoryItem[]): InventoryItem[] {
  return items.filter(
    (item) =>
      item.countedQuantity !== null && item.countedQuantity !== item.expectedQuantity
  );
}

export function getFilteredInventoryItems(
  session: InventorySession,
  filter: FilterType
): InventoryItem[] {
  const items = session.items;

  switch (filter) {
    case "uncounted":
      return items.filter((item) => item.countedQuantity === null);
    case "discrepancy":
      return getInventoryDiscrepancies(items);
    case "ok":
      return items.filter(
        (item) =>
          item.countedQuantity !== null && item.countedQuantity === item.expectedQuantity
      );
    default:
      return items;
  }
}
