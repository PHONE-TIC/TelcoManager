import type { ReactNode } from "react";

export function getInterventionPriorityIndicator(
  datePlanifiee: string,
  statut: string
): ReactNode {
  if (statut === "terminee" || statut === "annulee") return null;

  const date = new Date(datePlanifiee);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  if (date < now) {
    return createIndicatorDot("En retard", "#ef4444");
  }

  if (date >= todayStart && date < tomorrowStart) {
    return createIndicatorDot("Aujourd'hui", "#f59e0b");
  }

  return createIndicatorDot("À venir", "#10b981");
}

function createIndicatorDot(title: string, backgroundColor: string): ReactNode {
  return (
    <span
      title={title}
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        backgroundColor,
        marginRight: 6,
      }}
    />
  );
}

export function getTechnicianAvatar(tech: { nom: string } | null | undefined): ReactNode {
  if (!tech) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: "50%",
          backgroundColor: "#e5e7eb",
          color: "#9ca3af",
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        ?
      </span>
    );
  }

  const initials = tech.nom
    .split(" ")
    .map((namePart) => namePart[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const colors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#f97316",
  ];
  const colorIndex = tech.nom.charCodeAt(0) % colors.length;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        borderRadius: "50%",
        backgroundColor: colors[colorIndex],
        color: "white",
        fontSize: 11,
        fontWeight: 600,
        marginRight: 6,
      }}
    >
      {initials}
    </span>
  );
}

export function getInterventionProgressLine(statut: string): ReactNode {
  const steps = [
    { key: "planifiee", color: "#3b82f6" },
    { key: "en_cours", color: "#f59e0b" },
    { key: "terminee", color: "#10b981" },
  ];
  const currentIndex =
    statut === "annulee" ? -1 : steps.findIndex((step) => step.key === statut);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {steps.map((step, index) => (
        <div key={step.key} style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: index <= currentIndex ? step.color : "#e5e7eb",
              transition: "background-color 0.2s",
            }}
          />
          {index < steps.length - 1 && (
            <div
              style={{
                width: 16,
                height: 2,
                backgroundColor:
                  index < currentIndex ? steps[index + 1].color : "#e5e7eb",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
