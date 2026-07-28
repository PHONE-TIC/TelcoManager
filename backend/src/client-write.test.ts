import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createClientRecord,
  updateClientRecord,
} from "./services/client-write.service";
import { prisma } from "./db";

vi.mock("./db", () => ({
  prisma: {
    client: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.client.create).mockResolvedValue({ id: "client-1" } as never);
  vi.mocked(prisma.client.update).mockResolvedValue({ id: "client-1" } as never);
});

describe("createClientRecord", () => {
  it("enregistre les coordonnées fournies", async () => {
    await createClientRecord({
      nom: "PHONE&TIC",
      rue: "12 rue des Tests",
      codePostal: "76000",
      ville: "Rouen",
      contact: "Jean Test",
      telephone: "0600000000",
    });

    expect(prisma.client.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nom: "PHONE&TIC",
        ville: "Rouen",
        telephone: "0600000000",
      }),
    });
  });

  it("substitue une chaîne vide aux champs obligatoires absents", async () => {
    // Les colonnes correspondantes sont non nulles en base : un undefined
    // ferait échouer l'insertion.
    await createClientRecord({ nom: "Client minimal" });

    expect(prisma.client.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        rue: "",
        codePostal: "",
        ville: "",
        contact: "",
        telephone: "",
      }),
    });
  });
});

describe("updateClientRecord", () => {
  it("ne modifie que les champs renseignés", async () => {
    await updateClientRecord("client-1", { ville: "Le Havre" });

    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: "client-1" },
      data: { ville: "Le Havre" },
    });
  });

  it("permet d'effacer les champs facultatifs", async () => {
    // null est une valeur significative pour ces champs : il doit être
    // transmis, contrairement à un champ simplement omis.
    await updateClientRecord("client-1", {
      email: null,
      notes: null,
      sousLieu: null,
    });

    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: "client-1" },
      data: { email: null, notes: null, sousLieu: null },
    });
  });

  it("n'écrase pas les champs obligatoires avec une chaîne vide", async () => {
    await updateClientRecord("client-1", { nom: "", ville: "Rouen" });

    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: "client-1" },
      data: { ville: "Rouen" },
    });
  });

  it("n'envoie aucune modification pour une entrée vide", async () => {
    await updateClientRecord("client-1", {});

    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: "client-1" },
      data: {},
    });
  });
});
