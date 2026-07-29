import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, type Column } from "./DataTable";

interface Ligne {
  id: string;
  numero: string;
  titre: string;
  technicien: string | null;
  quantite: number;
}

const lignes: Ligne[] = [
  { id: "1", numero: "RDV003", titre: "Brouillon", technicien: "Bernard", quantite: 2 },
  { id: "2", numero: "RDV001", titre: "Aiguillage", technicien: null, quantite: 10 },
  { id: "3", numero: "RDV002", titre: "Câblage", technicien: "Alice", quantite: 1 },
];

const colonnes: Column<Ligne>[] = [
  {
    key: "numero",
    header: "Numéro",
    render: (r) => r.numero,
    sortValue: (r) => r.numero,
  },
  { key: "titre", header: "Intitulé", render: (r) => r.titre, sortValue: (r) => r.titre },
  {
    key: "technicien",
    header: "Technicien",
    render: (r) => r.technicien ?? "Non assigné",
    sortValue: (r) => r.technicien,
  },
  {
    key: "quantite",
    header: "Quantité",
    render: (r) => r.quantite,
    sortValue: (r) => r.quantite,
  },
  { key: "actions", header: "Actions", render: () => "…" },
];

function libellesColonne(index: number) {
  const rows = screen.getAllByRole("row").slice(1); // hors en-tête
  return rows.map((r) => within(r).getAllByRole("cell")[index].textContent);
}

describe("DataTable", () => {
  it("affiche toutes les lignes fournies", () => {
    render(<DataTable columns={colonnes} rows={lignes} rowKey={(r) => r.id} />);
    expect(screen.getAllByRole("row")).toHaveLength(lignes.length + 1);
  });

  it("affiche l'état vide plutôt qu'un tableau sans ligne", () => {
    render(
      <DataTable
        columns={colonnes}
        rows={[]}
        rowKey={(r) => r.id}
        emptyLabel="Aucune intervention"
      />
    );
    expect(screen.getByText("Aucune intervention")).toBeInTheDocument();
    expect(screen.queryByRole("row")).not.toBeInTheDocument();
  });

  it("trie une colonne au clic, puis inverse le sens au second clic", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={colonnes} rows={lignes} rowKey={(r) => r.id} />);

    await user.click(screen.getByRole("button", { name: /Numéro/ }));
    expect(libellesColonne(0)).toEqual(["RDV001", "RDV002", "RDV003"]);

    await user.click(screen.getByRole("button", { name: /Numéro/ }));
    expect(libellesColonne(0)).toEqual(["RDV003", "RDV002", "RDV001"]);
  });

  it("trie les nombres par valeur et non par ordre alphabétique", async () => {
    // Un tri textuel placerait 10 avant 2 : le défaut classique des tris
    // réimplémentés à la main.
    const user = userEvent.setup();
    render(<DataTable columns={colonnes} rows={lignes} rowKey={(r) => r.id} />);

    await user.click(screen.getByRole("button", { name: /Quantité/ }));
    expect(libellesColonne(3)).toEqual(["1", "2", "10"]);
  });

  it("relègue les valeurs absentes en fin de liste dans les deux sens", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={colonnes} rows={lignes} rowKey={(r) => r.id} />);

    await user.click(screen.getByRole("button", { name: /Technicien/ }));
    expect(libellesColonne(2)).toEqual(["Alice", "Bernard", "Non assigné"]);

    await user.click(screen.getByRole("button", { name: /Technicien/ }));
    expect(libellesColonne(2)[2]).toBe("Non assigné");
  });

  it("ne rend pas triable une colonne sans valeur de tri", () => {
    render(<DataTable columns={colonnes} rows={lignes} rowKey={(r) => r.id} />);
    expect(screen.queryByRole("button", { name: /Actions/ })).not.toBeInTheDocument();
  });

  it("annonce le sens du tri aux technologies d'assistance", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={colonnes} rows={lignes} rowKey={(r) => r.id} />);

    const entete = screen.getAllByRole("columnheader")[0];
    expect(entete).not.toHaveAttribute("aria-sort");

    await user.click(screen.getByRole("button", { name: /Numéro/ }));
    expect(entete).toHaveAttribute("aria-sort", "ascending");

    await user.click(screen.getByRole("button", { name: /Numéro/ }));
    expect(entete).toHaveAttribute("aria-sort", "descending");
  });

  it("applique le tri par défaut demandé", () => {
    render(
      <DataTable
        columns={colonnes}
        rows={lignes}
        rowKey={(r) => r.id}
        defaultSort={{ key: "titre" }}
      />
    );
    expect(libellesColonne(1)).toEqual(["Aiguillage", "Brouillon", "Câblage"]);
  });

  it("signale la ligne ouverte dans le détail", () => {
    render(
      <DataTable
        columns={colonnes}
        rows={lignes}
        rowKey={(r) => r.id}
        onRowClick={() => {}}
        selectedKey="2"
      />
    );
    const active = screen.getAllByRole("row").find((r) => r.getAttribute("aria-current") === "true");
    expect(active).toBeDefined();
    expect(within(active!).getByText("RDV001")).toBeInTheDocument();
  });

  it("transmet la ligne cliquée", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={colonnes}
        rows={lignes}
        rowKey={(r) => r.id}
        onRowClick={onRowClick}
      />
    );

    await user.click(screen.getByText("Câblage"));
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ numero: "RDV002" }));
  });

  it("n'est pas cliquable en l'absence de gestionnaire", () => {
    render(<DataTable columns={colonnes} rows={lignes} rowKey={(r) => r.id} />);
    const rows = screen.getAllByRole("row").slice(1);
    rows.forEach((r) => expect(r.tagName.toLowerCase()).not.toBe("button"));
  });
});
