import type { ReactNode } from "react";
import "./detailpane.css";

/**
 * Contenu du panneau de détail, à droite de la liste.
 *
 * Il donne l'essentiel sans quitter la liste : ce qu'on venait vérifier tient
 * ici, et l'ouverture de la fiche complète reste un geste délibéré.
 */

interface DetailPaneProps {
  title: ReactNode;
  reference?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Actions du pied, l'action principale en dernier. */
  actions?: ReactNode;
}

export function DetailPane({
  title,
  reference,
  onClose,
  children,
  actions,
}: DetailPaneProps) {
  return (
    <div className="ui-detail">
      <header className="ui-detail__entete">
        <div className="ui-detail__titres">
          <h2 className="ui-detail__titre">{title}</h2>
          {reference ? <span className="ui-ref">{reference}</span> : null}
        </div>
        <button
          type="button"
          className="ui-detail__fermer"
          onClick={onClose}
          aria-label="Fermer le détail"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
            <path
              d="M2 2l9 9M11 2l-9 9"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      <div className="ui-detail__corps">{children}</div>

      {actions ? <footer className="ui-detail__pied">{actions}</footer> : null}
    </div>
  );
}

/** Groupe d'informations en deux colonnes. */
export function DetailFacts({ children }: { children: ReactNode }) {
  return <dl className="ui-detail__faits">{children}</dl>;
}

export function DetailFact({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="ui-detail__fait">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="ui-detail__section">
      <h3 className="ui-detail__section-titre">{title}</h3>
      {children}
    </section>
  );
}

export interface TimelineStep {
  label: string;
  hint?: ReactNode;
  done?: boolean;
  current?: boolean;
}

/** Déroulé d'un enregistrement : ce qui est fait, où il en est. */
export function DetailTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="ui-timeline">
      {steps.map((s) => (
        <li
          key={s.label}
          className="ui-timeline__etape"
          data-done={s.done ? "1" : undefined}
          data-current={s.current ? "1" : undefined}
        >
          <span className="ui-timeline__puce" aria-hidden="true" />
          <span className="ui-timeline__texte">
            <b>{s.label}</b>
            {s.hint ? <span>{s.hint}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
