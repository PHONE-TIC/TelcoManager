import "./pagination.css";

/**
 * Pagination.
 *
 * Chaque écran réécrivait la sienne, avec ses propres couleurs d'état
 * désactivé et son propre libellé. La position dans l'ensemble est annoncée
 * en toutes lettres plutôt que par les seules flèches : « page 2 sur 7 »
 * renseigne davantage qu'un chevron grisé.
 */

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  /** Nombre total d'éléments, affiché à côté de la position. */
  totalItems?: number;
}

export function Pagination({ page, totalPages, onChange, totalItems }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="ui-pagination" aria-label="Pagination">
      <button
        type="button"
        className="ui-btn ui-btn--sm"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
      >
        <span aria-hidden="true">←</span> Précédent
      </button>

      <span className="ui-pagination__position" aria-live="polite">
        Page {page} sur {totalPages}
        {typeof totalItems === "number" ? (
          <span className="ui-pagination__total"> · {totalItems} éléments</span>
        ) : null}
      </span>

      <button
        type="button"
        className="ui-btn ui-btn--sm"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
      >
        Suivant <span aria-hidden="true">→</span>
      </button>
    </nav>
  );
}
