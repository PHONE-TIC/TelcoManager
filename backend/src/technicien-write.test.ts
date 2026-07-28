import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createTechnicienRecord,
  updateTechnicienRecord,
} from "./services/technicien-write.service";
import { prisma } from "./db";
import * as bcrypt from "bcryptjs";

vi.mock("./db", () => ({
  prisma: {
    technicien: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createTechnicienRecord", () => {
  it("refuse un nom d'utilisateur déjà pris", async () => {
    vi.mocked(prisma.technicien.findUnique).mockResolvedValue({
      id: "tech-existant",
    } as never);

    const result = await createTechnicienRecord({
      nom: "Jean",
      username: "jdupont",
      password: "MotDePasse1!",
    });

    expect(result.status).toBe(409);
    expect(prisma.technicien.create).not.toHaveBeenCalled();
  });

  it("ne stocke jamais le mot de passe en clair", async () => {
    vi.mocked(prisma.technicien.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.technicien.create).mockResolvedValue({ id: "tech-1" } as never);

    await createTechnicienRecord({
      nom: "Jean",
      username: "jdupont",
      password: "MotDePasse1!",
    });

    const call = vi.mocked(prisma.technicien.create).mock.calls[0][0];
    const data = call.data as { passwordHash: string };
    expect(data.passwordHash).not.toBe("MotDePasse1!");
    expect(await bcrypt.compare("MotDePasse1!", data.passwordHash)).toBe(true);
  });

  it("attribue le rôle technicien par défaut", async () => {
    vi.mocked(prisma.technicien.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.technicien.create).mockResolvedValue({ id: "tech-1" } as never);

    await createTechnicienRecord({ nom: "Jean", username: "jdupont", password: "x" });

    expect(prisma.technicien.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "technicien" }),
      })
    );
  });

  it("respecte un rôle explicitement demandé", async () => {
    vi.mocked(prisma.technicien.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.technicien.create).mockResolvedValue({ id: "tech-1" } as never);

    await createTechnicienRecord({
      nom: "Marie",
      username: "mgestion",
      password: "x",
      role: "gestionnaire" as never,
    });

    expect(prisma.technicien.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "gestionnaire" }),
      })
    );
  });

  it("n'expose jamais le hachage du mot de passe en réponse", async () => {
    vi.mocked(prisma.technicien.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.technicien.create).mockResolvedValue({ id: "tech-1" } as never);

    await createTechnicienRecord({ nom: "Jean", username: "jdupont", password: "x" });

    const call = vi.mocked(prisma.technicien.create).mock.calls[0][0];
    expect(call.select).not.toHaveProperty("passwordHash");
  });
});

describe("updateTechnicienRecord", () => {
  beforeEach(() => {
    vi.mocked(prisma.technicien.update).mockResolvedValue({ id: "tech-1" } as never);
  });

  it("ne touche pas au mot de passe si aucun n'est fourni", async () => {
    await updateTechnicienRecord("tech-1", { nom: "Jean-Pierre" });

    const call = vi.mocked(prisma.technicien.update).mock.calls[0][0];
    expect(call.data).not.toHaveProperty("passwordHash");
    expect(call.data).toHaveProperty("nom", "Jean-Pierre");
  });

  it("rehache le mot de passe lorsqu'il est modifié", async () => {
    await updateTechnicienRecord("tech-1", { password: "NouveauMdp1!" });

    const call = vi.mocked(prisma.technicien.update).mock.calls[0][0];
    const data = call.data as { passwordHash: string };
    expect(await bcrypt.compare("NouveauMdp1!", data.passwordHash)).toBe(true);
  });

  it("permet de désactiver un compte", async () => {
    // active: false est une valeur significative : elle ne doit pas être
    // écartée comme une valeur absente.
    await updateTechnicienRecord("tech-1", { active: false });

    const call = vi.mocked(prisma.technicien.update).mock.calls[0][0];
    expect(call.data).toHaveProperty("active", false);
  });

  it("ignore les champs non renseignés plutôt que de les écraser", async () => {
    await updateTechnicienRecord("tech-1", { role: "admin" as never });

    const call = vi.mocked(prisma.technicien.update).mock.calls[0][0];
    expect(call.data).toEqual({ role: "admin" });
  });

  it("ignore une chaîne de mot de passe vide", async () => {
    await updateTechnicienRecord("tech-1", { password: "" });

    const call = vi.mocked(prisma.technicien.update).mock.calls[0][0];
    expect(call.data).not.toHaveProperty("passwordHash");
  });
});
