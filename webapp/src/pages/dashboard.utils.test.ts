import { describe, expect, it } from "vitest";

import {
  buildInterventionStats,
  getDashboardStatCards,
  getInterventionStatusBadge,
  getLowStockStyles,
  getRecentInterventionTitle,
} from "./dashboard.utils";

describe("dashboard.utils", () => {
  it("builds grouped intervention stats with a fallback label for missing statuses", () => {
    expect(
      buildInterventionStats([
        { statut: "planifiee" },
        { statut: "planifiee" },
        { statut: "terminee" },
        { statut: undefined as never },
      ])
    ).toEqual([
      { name: "Planifiee", value: 2 },
      { name: "Terminee", value: 1 },
      { name: "Inconnu", value: 1 },
    ]);
  });

  it("builds dashboard stat cards with zero fallbacks when stats are missing", () => {
    expect(getDashboardStatCards(null)).toEqual([
      { value: 0, label: "Clients", color: "#3b82f6" },
      { value: 0, label: "Interventions", color: "#10b981" },
      { value: 0, label: "Pièces Stock", color: "#f97316" },
      { value: 0, label: "Pièces HS", color: "#ef4444" },
    ]);
  });

  it("returns the expected badge metadata for known and unknown statuses", () => {
    expect(getInterventionStatusBadge("en_cours")).toEqual({
      backgroundColor: "#f59e0b",
      label: "⏳ En cours",
    });
    expect(getInterventionStatusBadge("bloquee")).toEqual({
      backgroundColor: "#6b7280",
      label: "bloquee",
    });
  });

  it("truncates long recent intervention titles and styles low stock states", () => {
    expect(getRecentInterventionTitle("A".repeat(31))).toBe(`${"A".repeat(30)}...`);
    expect(getRecentInterventionTitle()).toBe("Sans titre");

    expect(getLowStockStyles(0)).toEqual({
      containerColor: "rgba(239, 68, 68, 0.1)",
      badgeColor: "#ef4444",
    });
    expect(getLowStockStyles(2)).toEqual({
      containerColor: "rgba(249, 115, 22, 0.1)",
      badgeColor: "#f97316",
    });
  });
});
