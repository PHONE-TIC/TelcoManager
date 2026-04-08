export type FilterType = "all" | "uncounted" | "discrepancy" | "ok";

export interface InventoryItem {
  [key: string]: any;
  id: string;
  stockId: string;
  expectedQuantity: number;
  countedQuantity: number | null;
  notes?: string;
  stock: {
    nomMateriel: string;
    reference: string;
    numeroSerie?: string;
    codeBarre?: string;
  };
}

export interface InventorySession {
  id: string;
  date: string;
  status: string;
  items: InventoryItem[];
  notes?: string;
}
