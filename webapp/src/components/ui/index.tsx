/**
 * Composants de base de l'interface.
 *
 * Ils n'acceptent volontairement pas de `style` : une exception d'apparence
 * doit passer par une variante déclarée ici, sinon les valeurs se remettent
 * à diverger écran par écran — ce qui avait produit un millier de styles
 * écrits directement dans les pages.
 */
import type { ReactNode, ButtonHTMLAttributes, CSSProperties } from "react";
import { labelForStatut, toneForStatut, type StateTone } from "./statut";
import "./ui.css";

/* ------------------------------------------------------------------ Bouton */

type ButtonVariant = "default" | "primary" | "quiet" | "danger";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: ButtonVariant;
  size?: "md" | "sm";
  block?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "default",
  size = "md",
  block = false,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    "ui-btn",
    variant !== "default" ? `ui-btn--${variant}` : "",
    size === "sm" ? "ui-btn--sm" : "",
    block ? "ui-btn--block" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------- État */

interface StatusProps {
  statut: string;
  /** Masque le libellé et ne conserve que le point, pour les vues très denses. */
  compact?: boolean;
}

export function Status({ statut, compact = false }: StatusProps) {
  const label = labelForStatut(statut);

  return (
    <span
      className={`ui-state${compact ? " ui-state--dot-only" : ""}`}
      data-tone={toneForStatut(statut)}
      title={compact ? label : undefined}
    >
      {compact ? <span className="sr-only">{label}</span> : label}
    </span>
  );
}

/* ------------------------------------------------------------ Empilement */

interface StackProps {
  children: ReactNode;
  /** `tight` pour un bloc compact, `loose` pour séparer deux ensembles. */
  spacing?: "tight" | "default" | "loose";
}

export function Stack({ children, spacing = "default" }: StackProps) {
  const suffix = spacing === "default" ? "" : ` ui-stack--${spacing}`;
  return <div className={`ui-stack${suffix}`}>{children}</div>;
}

/* --------------------------------------------------------- En-tête d'écran */

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="ui-page-header">
      <div className="ui-page-header__text">
        <h1 className="ui-page-header__title">{title}</h1>
        {subtitle ? <p className="ui-page-header__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="ui-page-header__actions">{actions}</div> : null}
    </header>
  );
}

/* ----------------------------------------------------------- Indicateurs */

interface FigureProps {
  value: ReactNode;
  label: ReactNode;
  tone?: "alert" | StateTone;
  /** Fourni lorsque l'indicateur filtre la liste : il devient alors un bouton. */
  onClick?: () => void;
  active?: boolean;
}

export function Figure({ value, label, tone, onClick, active }: FigureProps) {
  const content = (
    <>
      <span className="ui-figure__value">{value}</span>
      <span className="ui-figure__label">{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="ui-figure"
        data-tone={tone}
        onClick={onClick}
        aria-pressed={active ?? false}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="ui-figure" data-tone={tone}>
      {content}
    </div>
  );
}

export function Figures({ children }: { children: ReactNode }) {
  return <div className="ui-figures">{children}</div>;
}

/* --------------------------------------------------------------- Panneau */

export function Panel({ children }: { children: ReactNode }) {
  return <div className="ui-panel">{children}</div>;
}

export function PanelSection({ children }: { children: ReactNode }) {
  return <div className="ui-panel__section">{children}</div>;
}

/* ------------------------------------------------------------------ Liste */

interface RowProps {
  title: ReactNode;
  meta?: ReactNode;
  reference?: ReactNode;
  statut?: string;
  onClick?: () => void;
}

export function Row({ title, meta, reference, statut, onClick }: RowProps) {
  return (
    <button type="button" className="ui-row" onClick={onClick}>
      <span className="ui-row__main">
        <span className="ui-row__title">{title}</span>
        {meta ? <span className="ui-row__meta">{meta}</span> : null}
      </span>
      {reference ? <span className="ui-ref">{reference}</span> : null}
      {statut ? <Status statut={statut} /> : null}
    </button>
  );
}

interface RowsProps {
  children: ReactNode;
  /**
   * Padding horizontal du conteneur à neutraliser, pour que les lignes et
   * leurs séparateurs aillent d'un bord à l'autre. Utile tant que la liste
   * est posée dans un panneau hérité qui porte son propre padding.
   */
  bleed?: string;
}

export function Rows({ children, bleed }: RowsProps) {
  return (
    <div
      className={`ui-rows${bleed ? " ui-rows--bleed" : ""}`}
      style={bleed ? ({ "--rows-bleed": bleed } as CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="ui-empty">{children}</p>;
}
