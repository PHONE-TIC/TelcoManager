import type { AppIconName } from "../components/AppIcon";
import type { Stock, StockMovement } from "../types";
import { getStockLocation } from "./stock.utils";

type MovementType = StockMovement["type"] | "creation" | string;

export function getMovementMeta(type: MovementType): {
  iconName: AppIconName;
  color: string;
  label: string;
} {
  switch (type) {
    case "creation":
      return { iconName: "plus", color: "#10b981", label: "Création" };
    case "entree":
      return { iconName: "box", color: "#3b82f6", label: "Entrée" };
    case "sortie":
      return { iconName: "return", color: "#f59e0b", label: "Sortie" };
    case "transfert":
      return { iconName: "vehicle", color: "#8b5cf6", label: "Transfert" };
    case "ajustement":
      return { iconName: "edit", color: "#6b7280", label: "Ajustement" };
    case "hs":
      return { iconName: "warning", color: "#ef4444", label: "Mise HS" };
    default:
      return { iconName: "document", color: "#6b7280", label: type };
  }
}

export function getStockStatusBadgeConfig(statut: Stock["statut"]) {
  switch (statut) {
    case "courant":
      return {
        label: "En stock",
        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        boxShadow: "0 2px 8px rgba(16, 185, 129, 0.35)",
      };
    case "retour_fournisseur":
      return {
        label: "Retour Frn",
        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        boxShadow: "0 2px 8px rgba(245, 158, 11, 0.35)",
      };
    default:
      return {
        label: "Hors Service",
        background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
        boxShadow: "0 2px 8px rgba(239, 68, 68, 0.35)",
      };
  }
}

export function getStockQuantityBadgeConfig(quantity: number) {
  if (quantity <= 0) {
    return {
      icon: "●",
      background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      boxShadow: "0 2px 8px rgba(239, 68, 68, 0.35)",
    };
  }

  if (quantity <= 2) {
    return {
      icon: "●",
      background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      boxShadow: "0 2px 8px rgba(245, 158, 11, 0.35)",
    };
  }

  return {
    icon: "●",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.35)",
  };
}

export const resolveStockDetailLocation = getStockLocation;
