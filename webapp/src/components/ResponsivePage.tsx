import { useState, type ReactNode } from "react";
import { useResponsive } from "../hooks/useResponsive";
import { Button, Figure, Figures, Workspace } from "./ui";
import "./ResponsivePage.css";

type Action = {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
};

interface ResponsivePageProps {
  title: string;
  subtitle?: string;
  actions?: Action[];
  headerStats?: ReactNode;
  headerAside?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
}

export function ResponsivePage({
  title,
  subtitle,
  actions = [],
  headerStats,
  headerAside,
  filters,
  children,
}: ResponsivePageProps) {
  const { isMobile } = useResponsive();
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="responsive-page">
      <Workspace
        title={title}
        meta={subtitle}
        actions={
          actions.length > 0
            ? actions.map((action) => (
                <Button
                  key={action.label}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  variant={action.variant === "primary" ? "primary" : "default"}
                >
                  {action.label}
                </Button>
              ))
            : null
        }
      >
        {headerAside || headerStats ? (
          <div className="responsive-page__resume">
            {headerAside}
            {headerStats}
          </div>
        ) : null}

        {filters ? (
          <section className="responsive-page__filters">
            {isMobile ? (
              <button
                type="button"
                className="responsive-page__filters-toggle"
                onClick={() => setFiltersOpen((prev) => !prev)}
              >
                {filtersOpen ? "Masquer les filtres" : "Afficher les filtres"}
              </button>
            ) : null}
            <div
              className={`responsive-page__filters-body ${
                !isMobile || filtersOpen ? "is-open" : ""
              }`}
            >
              {filters}
            </div>
          </section>
        ) : null}

        <div className="responsive-page__contenu">{children}</div>
      </Workspace>
    </div>
  );
}

/** Conservés comme adaptateurs : les écrans consommateurs gardent leur appel,
    le rendu passe par les indicateurs communs. */
export function ResponsiveStats({ children }: { children: ReactNode }) {
  return <Figures>{children}</Figures>;
}

export function ResponsiveStat({
  value,
  label,
}: {
  value: ReactNode;
  label: string;
}) {
  return <Figure value={value} label={label} />;
}

export function ResponsiveSection({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="responsive-page__section">
      {title ? <h2 className="responsive-page__section-title">{title}</h2> : null}
      {children}
    </section>
  );
}

export function ResponsiveMobileCards({ children }: { children: ReactNode }) {
  return <div className="responsive-mobile-cards">{children}</div>;
}

export function ResponsiveMobileCard({ children }: { children: ReactNode }) {
  return <article className="responsive-mobile-card">{children}</article>;
}
