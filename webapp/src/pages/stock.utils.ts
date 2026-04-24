import type { TechnicianStock, Stock as StockType } from "../types";

export type StockWithRelations = StockType & {
  originalStockId?: string;
  technicianStockId?: string;
};

export function parseSerialNumbers(input: string): string[] {
  return input
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function getStockLocation(
  item: StockWithRelations
): { label: string; color: string; bgColor: string } {
  if (item.statut === "retour_fournisseur") {
    return {
      label: "Retour Fournisseur",
      color: "#d97706",
      bgColor: "rgba(245, 158, 11, 0.15)",
    };
  }

  const techStocks = item.technicianStocks as TechnicianStock[] | undefined;
  if (techStocks && techStocks.length > 0) {
    const activeTechStock = techStocks.find((ts: TechnicianStock) => ts.quantite > 0);

    if (activeTechStock) {
      if (activeTechStock.client) {
        const clientName = activeTechStock.client.nom || "Client";
        return {
          label: `Client: ${clientName}`,
          color: "#0891b2",
          bgColor: "rgba(8, 145, 178, 0.15)",
        };
      }

      const techName = activeTechStock.technicien?.nom || "Technicien";
      return {
        label: `Tech: ${techName}`,
        color: "#7c3aed",
        bgColor: "rgba(124, 58, 237, 0.15)",
      };
    }
  }

  const clientEquips = item.clientEquipements as
    | { statut: string; client?: { nom: string } }[]
    | undefined;
  if (clientEquips && clientEquips.length > 0) {
    const installed = clientEquips.find((ce) => ce.statut === "installe");

    if (installed) {
      const clientName = installed.client?.nom || "Client";
      return {
        label: `Client: ${clientName}`,
        color: "#0891b2",
        bgColor: "rgba(8, 145, 178, 0.15)",
      };
    }
  }

  if (item.statut === "hs") {
    return {
      label: "HS",
      color: "#dc2626",
      bgColor: "rgba(220, 38, 38, 0.15)",
    };
  }

  return {
    label: "Stock courant",
    color: "#16a34a",
    bgColor: "rgba(22, 163, 74, 0.15)",
  };
}
