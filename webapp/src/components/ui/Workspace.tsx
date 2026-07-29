import { useEffect, useRef, type ReactNode } from "react";
import "./workspace.css";

/**
 * Zone de travail d'un écran de gestion.
 *
 * Remplace l'empilement « panneau d'en-tête, puis panneau de contenu » par un
 * cadre unique : une barre de commandes, une barre de filtres, puis la surface
 * de travail qui occupe toute la hauteur restante. La liste n'est plus un bloc
 * qui pousse la page vers le bas — c'est elle qui défile, à l'intérieur du
 * cadre, comme dans un outil de gestion.
 */

interface WorkspaceProps {
  title: ReactNode;
  /** Compteur ou précision affichée à côté du titre. */
  meta?: ReactNode;
  /** Champ de recherche, placé au centre de la barre. */
  search?: ReactNode;
  /** Actions de la barre, l'action principale en dernier. */
  actions?: ReactNode;
  /** Barre de filtres, sous la barre de commandes. */
  filters?: ReactNode;
  /** Onglets de vue, à gauche des filtres. */
  views?: ReactNode;
  children: ReactNode;
}

export function Workspace({
  title,
  meta,
  search,
  actions,
  filters,
  views,
  children,
}: WorkspaceProps) {
  return (
    <section className="ui-workspace">
      <header className="ui-workspace__bar">
        <h1 className="ui-workspace__titre">
          {title}
          {meta ? <span className="ui-workspace__meta">{meta}</span> : null}
        </h1>
        {search ? <div className="ui-workspace__recherche">{search}</div> : null}
        {actions ? <div className="ui-workspace__actions">{actions}</div> : null}
      </header>

      {views || filters ? (
        <div className="ui-workspace__filtres">
          {views ? <div className="ui-workspace__vues">{views}</div> : null}
          {filters}
        </div>
      ) : null}

      <div className="ui-workspace__corps">{children}</div>
    </section>
  );
}

/** Onglet de vue (liste, calendrier…), à gauche de la barre de filtres. */
export function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="ui-viewtab"
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** Champ de recherche de la barre de commandes. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Rechercher…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const champ = useRef<HTMLInputElement>(null);

  // Ctrl+K place le curseur dans la recherche sans quitter le clavier, et
  // Échap la vide : deux gestes attendus dans un outil qu'on utilise à
  // longueur de journée.
  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        champ.current?.focus();
        champ.current?.select();
      }
    };
    document.addEventListener("keydown", auClavier);
    return () => document.removeEventListener("keydown", auClavier);
  }, []);

  return (
    <div className="ui-search">
      <svg
        className="ui-search__icone"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        aria-hidden="true"
      >
        <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        ref={champ}
        type="search"
        className="ui-search__champ"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.stopPropagation();
            onChange("");
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value ? (
        <button
          type="button"
          className="ui-search__vider"
          onClick={() => onChange("")}
          aria-label="Effacer la recherche"
        >
          ✕
        </button>
      ) : (
        <kbd className="ui-search__raccourci" aria-hidden="true">
          Ctrl K
        </kbd>
      )}
    </div>
  );
}
