import { useMemo, useState, type ReactNode } from "react";
import "./datatable.css";

/**
 * Tableau de données réutilisable.
 *
 * Le tableau partagé précédent n'offrait ni tri ni filtre : chaque écran
 * réimplémentait le sien, d'où huit colonnes sur un écran, quatre sur un autre
 * et aucun tri sur un troisième. Tri, sélection de ligne, état vide et repli
 * en cartes sur petit écran sont désormais traités ici.
 */

export interface Column<T> {
  /** Identifiant stable, sert de clé de tri. */
  key: string;
  header: ReactNode;
  /** Rendu de la cellule. */
  render: (row: T) => ReactNode;
  /** Valeur servant au tri ; son absence rend la colonne non triable. */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Largeur CSS de la colonne, sinon elle se répartit. */
  width?: string;
  align?: "start" | "end";
  /** Colonne masquée sur écran étroit, où la place manque. */
  hideOnNarrow?: boolean;
}

type SortDirection = "asc" | "desc";

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Ligne mise en évidence, typiquement celle ouverte dans le détail. */
  selectedKey?: string | null;
  emptyLabel?: ReactNode;
  /** Colonne triée par défaut. */
  defaultSort?: { key: string; direction?: SortDirection };
  /** `compact` resserre les lignes pour afficher davantage de données. */
  density?: "comfortable" | "compact";
  caption?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  selectedKey,
  emptyLabel = "Aucun élément à afficher.",
  defaultSort,
  density = "comfortable",
  caption,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSort?.key ?? null);
  const [direction, setDirection] = useState<SortDirection>(
    defaultSort?.direction ?? "asc"
  );

  const triees = useMemo(() => {
    const colonne = columns.find((c) => c.key === sortKey);
    if (!colonne?.sortValue) return rows;

    const facteur = direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = colonne.sortValue!(a);
      const vb = colonne.sortValue!(b);

      // Les valeurs absentes sont reléguées en fin de liste quel que soit le
      // sens du tri : une intervention sans technicien ne doit pas occuper la
      // première place au seul motif qu'elle est vide.
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;

      if (typeof va === "number" && typeof vb === "number") {
        return (va - vb) * facteur;
      }
      return String(va).localeCompare(String(vb), "fr", { numeric: true }) * facteur;
    });
  }, [rows, columns, sortKey, direction]);

  const trierPar = (key: string) => {
    if (sortKey === key) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection("asc");
    }
  };

  const gabarit = columns
    .map((c) => c.width ?? "minmax(0, 1fr)")
    .join(" ");

  if (rows.length === 0) {
    return <p className="ui-table__vide">{emptyLabel}</p>;
  }

  return (
    <div className={`ui-table ui-table--${density}`} role="table" aria-label={caption}>
      <div
        className="ui-table__entete"
        role="row"
        style={{ gridTemplateColumns: gabarit }}
      >
        {columns.map((c) => {
          const triable = Boolean(c.sortValue);
          const actif = sortKey === c.key;
          return (
            <div
              key={c.key}
              role="columnheader"
              aria-sort={actif ? (direction === "asc" ? "ascending" : "descending") : undefined}
              className={[
                "ui-table__th",
                c.align === "end" ? "ui-table__cell--end" : "",
                c.hideOnNarrow ? "ui-table__cell--large" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {triable ? (
                <button
                  type="button"
                  className="ui-table__tri"
                  onClick={() => trierPar(c.key)}
                >
                  {c.header}
                  <span className="ui-table__fleche" aria-hidden="true">
                    {actif ? (direction === "asc" ? "▲" : "▼") : ""}
                  </span>
                </button>
              ) : (
                c.header
              )}
            </div>
          );
        })}
      </div>

      <div className="ui-table__corps" role="rowgroup">
        {triees.map((row) => {
          const cle = rowKey(row);
          const selectionnee = selectedKey === cle;
          const Balise = onRowClick ? "button" : "div";

          return (
            <Balise
              key={cle}
              role="row"
              type={onRowClick ? "button" : undefined}
              className={`ui-table__tr${selectionnee ? " ui-table__tr--active" : ""}${
                onRowClick ? " ui-table__tr--cliquable" : ""
              }`}
              style={{ gridTemplateColumns: gabarit }}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              aria-current={selectionnee ? "true" : undefined}
            >
              {columns.map((c) => (
                <span
                  key={c.key}
                  role="cell"
                  className={[
                    "ui-table__td",
                    c.align === "end" ? "ui-table__cell--end" : "",
                    c.hideOnNarrow ? "ui-table__cell--large" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  data-label={typeof c.header === "string" ? c.header : undefined}
                >
                  {c.render(row)}
                </span>
              ))}
            </Balise>
          );
        })}
      </div>
    </div>
  );
}
