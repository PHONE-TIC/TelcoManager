import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Drawer } from "./Drawer";
import { TextField } from "./Field";

function Formulaire({ onClose = () => {}, open = true }) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Nouvelle intervention"
      subtitle="Client Test Review"
      footer={<button type="button">Créer</button>}
    >
      <TextField label="Intitulé" defaultValue="Raccordement" />
      <TextField label="Référence" defaultValue="RDV001" />
    </Drawer>
  );
}

afterEach(() => {
  document.body.style.overflow = "";
});

describe("Drawer", () => {
  it("ne rend rien tant qu'il est fermé", () => {
    render(<Formulaire open={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("s'annonce comme une boîte de dialogue nommée par son titre", () => {
    render(<Formulaire />);
    expect(screen.getByRole("dialog", { name: "Nouvelle intervention" })).toBeInTheDocument();
  });

  it("ferme à la touche Échap", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Formulaire onClose={onClose} />);

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ferme au clic sur le voile", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<Formulaire onClose={onClose} />);

    await user.click(container.querySelector(".ui-drawer__voile")!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ferme par le bouton dédié", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Formulaire onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("place le focus sur le premier champ à l'ouverture", () => {
    render(<Formulaire />);
    expect(document.activeElement).toBe(screen.getByLabelText("Intitulé"));
  });

  it("retient le focus à l'intérieur du panneau", async () => {
    // Sans ce maintien, la tabulation repart dans la page masquée derrière et
    // le panneau devient inutilisable au clavier.
    const user = userEvent.setup();
    render(<Formulaire />);

    const dernier = screen.getByRole("button", { name: "Créer" });
    dernier.focus();
    await user.tab();

    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("revient au premier élément après le dernier", async () => {
    // Le bouton de fermeture ouvre l'ordre de tabulation : il précède les
    // champs dans le DOM, comme le veut la convention pour un dialogue.
    const user = userEvent.setup();
    render(<Formulaire />);

    screen.getByRole("button", { name: "Créer" }).focus();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Fermer" }));
  });

  it("repart vers le dernier élément en tabulation arrière depuis le premier", async () => {
    const user = userEvent.setup();
    render(<Formulaire />);

    screen.getByRole("button", { name: "Fermer" }).focus();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Créer" }));
  });

  it("verrouille le défilement de la page pendant l'ouverture", () => {
    const { unmount } = render(<Formulaire />);
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("affiche le contexte de l'enregistrement et les actions du pied", () => {
    render(<Formulaire />);
    expect(screen.getByText("Client Test Review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Créer" })).toBeInTheDocument();
  });
});
