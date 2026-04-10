import { describe, expect, it } from "vitest";

import {
  getFilteredInventoryItems,
  getInventoryDiscrepancies,
} from "./inventory.utils";

const session = {
  id: "session-1",
  date: "2025-01-01",
  status: "draft",
  items: [
    {
      id: "1",
      stockId: "stock-1",
      expectedQuantity: 5,
      countedQuantity: null,
      stock: { nomMateriel: "ONT", reference: "ONT001" },
    },
    {
      id: "2",
      stockId: "stock-2",
      expectedQuantity: 3,
      countedQuantity: 1,
      stock: { nomMateriel: "Routeur", reference: "RTR001" },
    },
    {
      id: "3",
      stockId: "stock-3",
      expectedQuantity: 2,
      countedQuantity: 2,
      stock: { nomMateriel: "Switch", reference: "SWT001" },
    },
  ],
};

describe("inventory.utils", () => {
  it("returns only discrepant items", () => {
    expect(getInventoryDiscrepancies(session.items)).toEqual([session.items[1]]);
  });

  it("filters inventory items by each supported view", () => {
    expect(getFilteredInventoryItems(session, "all")).toEqual(session.items);
    expect(getFilteredInventoryItems(session, "uncounted")).toEqual([session.items[0]]);
    expect(getFilteredInventoryItems(session, "discrepancy")).toEqual([session.items[1]]);
    expect(getFilteredInventoryItems(session, "ok")).toEqual([session.items[2]]);
  });
});
