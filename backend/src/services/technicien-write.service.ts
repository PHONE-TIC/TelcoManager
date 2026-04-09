import * as bcrypt from "bcryptjs";
import { prisma } from "../db";

type TechnicienWriteInput = {
  nom?: string;
  username?: string;
  password?: string;
  role?: string;
  active?: boolean;
};

export async function createTechnicienRecord(input: TechnicienWriteInput) {
  const existingTechnicien = await prisma.technicien.findUnique({
    where: { username: input.username },
  });

  if (existingTechnicien) {
    return {
      status: 409 as const,
      body: { error: "Nom d'utilisateur déjà utilisé" },
    };
  }

  const passwordHash = await bcrypt.hash(input.password || "", 10);
  const technicien = await prisma.technicien.create({
    data: {
      nom: input.nom ?? "",
      username: input.username ?? "",
      passwordHash,
      role: input.role || "technicien",
    },
    select: {
      id: true,
      nom: true,
      username: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  return {
    status: 201 as const,
    body: technicien,
  };
}

export async function updateTechnicienRecord(
  id: string,
  input: TechnicienWriteInput
) {
  const data: Record<string, unknown> = {
    ...(input.nom && { nom: input.nom }),
    ...(input.username && { username: input.username }),
    ...(input.role && { role: input.role }),
    ...(input.active !== undefined && { active: input.active }),
  };

  if (input.password) {
    data.passwordHash = await bcrypt.hash(input.password, 10);
  }

  const technicien = await prisma.technicien.update({
    where: { id },
    data,
    select: {
      id: true,
      nom: true,
      username: true,
      role: true,
      active: true,
      updatedAt: true,
    },
  });

  return technicien;
}

export async function deleteTechnicienRecord(id: string) {
  await prisma.technicien.delete({
    where: { id },
  });
}
