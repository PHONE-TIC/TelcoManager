import { useEffect, useRef, type ReactNode } from "react";
import "./splitview.css";

/**
 * Liste et détail côte à côte.
 *
 * Consulter une fiche n'oblige plus à quitter la liste : les filtres, le tri
 * et la position sont conservés. C'était le principal coût de la navigation
 * pleine page, où chaque consultation imposait un aller-retour complet.
 *
 * Sous une certaine largeur, la cohabitation n'a plus de sens : le détail
 * occupe alors tout l'écran et se comporte comme une page, avec un retour.
 */

interface SplitViewProps {
  list: ReactNode;
  detail?: ReactNode;
  /** Le détail n'est monté que lorsqu'une ligne est ouverte. */
  detailOpen: boolean;
  onCloseDetail: () => void;
  /** Titre annoncé aux lecteurs d'écran à l'ouverture du détail. */
  detailLabel?: string;
}

export function SplitView({
  list,
  detail,
  detailOpen,
  onCloseDetail,
  detailLabel = "Détail",
}: SplitViewProps) {
  const panneau = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!detailOpen) return;

    const auClavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseDetail();
    };
    document.addEventListener("keydown", auClavier);
    return () => document.removeEventListener("keydown", auClavier);
  }, [detailOpen, onCloseDetail]);

  return (
    <div className="ui-split" data-open={detailOpen ? "1" : "0"}>
      <div className="ui-split__liste">{list}</div>

      {detailOpen ? (
        <aside
          className="ui-split__detail"
          ref={panneau}
          aria-label={detailLabel}
          tabIndex={-1}
        >
          <button
            type="button"
            className="ui-split__retour"
            onClick={onCloseDetail}
          >
            <span aria-hidden="true">←</span> Retour à la liste
          </button>
          {detail}
        </aside>
      ) : null}
    </div>
  );
}
