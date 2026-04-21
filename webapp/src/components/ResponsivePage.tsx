import { useState, type ReactNode } from "react";
import { useResponsive } from "../hooks/useResponsive";
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
  filters?: ReactNode;
  children: ReactNode;
}

export function ResponsivePage({
  title,
  subtitle,
  actions = [],
  headerStats,
  filters,
  children,
}: ResponsivePageProps) {
  const { isMobile } = useResponsive();
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="responsive-page">
      <section className="responsive-page__header">
        <div className="responsive-page__header-top">
          <div className="responsive-page__title-wrap">
            <h1 className="responsive-page__title">{title}</h1>
            {subtitle ? (
              <p className="responsive-page__subtitle">{subtitle}</p>
            ) : null}
          </div>
          {actions.length > 0 ? (
            <div className="responsive-page__actions">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={`responsive-page__${action.variant || "secondary"}`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {headerStats ? <div className="responsive-page__header-stats">{headerStats}</div> : null}
      </section>

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

      {children}
    </div>
  );
}

export function ResponsiveStats({ children }: { children: ReactNode }) {
  return <section className="responsive-page__stats">{children}</section>;
}

export function ResponsiveStat({
  value,
  label,
}: {
  value: ReactNode;
  label: string;
}) {
  return (
    <article className="responsive-stat">
      <div className="responsive-stat__value">{value}</div>
      <div className="responsive-stat__label">{label}</div>
    </article>
  );
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
