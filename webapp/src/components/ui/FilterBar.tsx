import type { ReactNode } from "react";
import "./filterbar.css";

/**
 * Barre de filtres persistante.
 *
 * Les écrans proposaient jusqu'ici des vues figées et exclusives — « liste du
 * jour », « toutes » — qu'on ne pouvait pas combiner. Les filtres sont ici des
 * critères indépendants, et le compte de résultats est toujours affiché : sans
 * lui, une liste vide ne dit pas si le filtre est trop restrictif ou si les
 * données manquent.
 */

export interface FilterOption {
  value: string;
  label: ReactNode;
  /** Pastille de couleur, pour les filtres d'état. */
  tone?: "run" | "wait" | "done" | "off";
  count?: number;
}

interface FilterBarProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  /** Filtres additionnels indépendants du groupe principal. */
  toggles?: {
    key: string;
    label: ReactNode;
    active: boolean;
    onToggle: () => void;
  }[];
  /** Nombre d'éléments affichés / total, à droite de la barre. */
  resultCount?: { shown: number; total: number };
  children?: ReactNode;
}

export function FilterBar({
  options,
  value,
  onChange,
  toggles,
  resultCount,
  children,
}: FilterBarProps) {
  return (
    <div className="ui-filters" role="group" aria-label="Filtres">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="ui-chip"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.tone ? (
            <span className="ui-chip__pastille" data-tone={o.tone} aria-hidden="true" />
          ) : null}
          {o.label}
          {typeof o.count === "number" ? (
            <span className="ui-chip__compte">{o.count}</span>
          ) : null}
        </button>
      ))}

      {toggles && toggles.length > 0 ? (
        <>
          <span className="ui-filters__sep" aria-hidden="true" />
          {toggles.map((t) => (
            <button
              key={t.key}
              type="button"
              className="ui-chip"
              aria-pressed={t.active}
              onClick={t.onToggle}
            >
              {t.label}
            </button>
          ))}
        </>
      ) : null}

      {children}

      {resultCount ? (
        <span className="ui-filters__compte" aria-live="polite">
          {resultCount.shown === resultCount.total
            ? `${resultCount.total} ${resultCount.total > 1 ? "résultats" : "résultat"}`
            : `${resultCount.shown} sur ${resultCount.total}`}
        </span>
      ) : null}
    </div>
  );
}
