import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import "./drawer.css";

/**
 * Panneau latéral pour créer ou modifier sans quitter l'écran courant.
 *
 * Remplace les formulaires en page pleine, qui faisaient perdre filtres, tri et
 * position dans la liste, ainsi que les modales écrites une par une : le piège
 * de focus, la fermeture au clavier et le verrouillage du défilement sont
 * traités ici une bonne fois.
 */

/**
 * Un élément masqué ne doit pas capter le focus. On s'appuie sur les styles
 * calculés plutôt que sur la géométrie : celle-ci n'existe pas hors d'un vrai
 * moteur de rendu, ce qui neutralisait silencieusement le piège de focus.
 */
function estVisible(el: HTMLElement): boolean {
  if (el.hasAttribute("hidden")) return false;
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden";
}

const SELECTEURS_FOCUSABLES = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Texte secondaire sous le titre : contexte de l'enregistrement en cours. */
  subtitle?: ReactNode;
  children: ReactNode;
  /** Actions du pied de panneau, l'action de validation en dernier. */
  footer?: ReactNode;
  width?: "md" | "lg";
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "md",
}: DrawerProps) {
  const panneau = useRef<HTMLDivElement>(null);
  const declencheur = useRef<HTMLElement | null>(null);
  const titreId = useId();

  const auClavier = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key !== "Tab" || !panneau.current) return;

      // Maintenir le focus à l'intérieur : sans cela, la tabulation repart
      // dans la page masquée derrière, ce qui rend le panneau inutilisable
      // au clavier et déroutant pour un lecteur d'écran.
      const cibles = Array.from(
        panneau.current.querySelectorAll<HTMLElement>(SELECTEURS_FOCUSABLES)
      ).filter(estVisible);
      if (cibles.length === 0) return;

      const premier = cibles[0];
      const dernier = cibles[cibles.length - 1];

      if (e.shiftKey && document.activeElement === premier) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && document.activeElement === dernier) {
        e.preventDefault();
        premier.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;

    declencheur.current = document.activeElement as HTMLElement;
    const defilementInitial = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", auClavier, true);

    // Porter le focus sur la première saisie du corps, et non sur le premier
    // élément focusable du panneau — qui est le bouton de fermeture, placé
    // avant dans le DOM. La saisie commence ainsi sans manipulation.
    const corps = panneau.current?.querySelector(".ui-drawer__corps");
    const premiereSaisie =
      corps?.querySelector<HTMLElement>(SELECTEURS_FOCUSABLES) ??
      panneau.current?.querySelector<HTMLElement>(SELECTEURS_FOCUSABLES);
    premiereSaisie?.focus();

    return () => {
      document.removeEventListener("keydown", auClavier, true);
      document.body.style.overflow = defilementInitial;
      // Rendre le focus à l'élément qui a ouvert le panneau.
      declencheur.current?.focus?.();
    };
  }, [open, auClavier]);

  if (!open) return null;

  return (
    <div className="ui-drawer">
      <div
        className="ui-drawer__voile"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`ui-drawer__panneau ui-drawer__panneau--${width}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titreId}
        ref={panneau}
      >
        <header className="ui-drawer__entete">
          <div className="ui-drawer__titres">
            <h2 className="ui-drawer__titre" id={titreId}>
              {title}
            </h2>
            {subtitle ? (
              <p className="ui-drawer__sous-titre">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="ui-drawer__fermer"
            onClick={onClose}
            aria-label="Fermer"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
              <path
                d="M2 2l11 11M13 2L2 13"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="ui-drawer__corps">{children}</div>

        {footer ? <footer className="ui-drawer__pied">{footer}</footer> : null}
      </div>
    </div>
  );
}
