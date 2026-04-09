import { prisma } from "../db";

type ClientWriteInput = {
  nom?: string;
  rue?: string;
  codePostal?: string;
  ville?: string;
  sousLieu?: string | null;
  contact?: string;
  telephone?: string;
  email?: string | null;
  notes?: string | null;
};

export async function createClientRecord(input: ClientWriteInput) {
  return prisma.client.create({
    data: {
      nom: input.nom ?? "",
      rue: input.rue ?? "",
      codePostal: input.codePostal ?? "",
      ville: input.ville ?? "",
      sousLieu: input.sousLieu,
      contact: input.contact ?? "",
      telephone: input.telephone ?? "",
      email: input.email,
      notes: input.notes,
    },
  });
}

export async function updateClientRecord(id: string, input: ClientWriteInput) {
  return prisma.client.update({
    where: { id },
    data: {
      ...(input.nom && { nom: input.nom }),
      ...(input.rue && { rue: input.rue }),
      ...(input.codePostal && { codePostal: input.codePostal }),
      ...(input.ville && { ville: input.ville }),
      ...(input.sousLieu !== undefined && { sousLieu: input.sousLieu }),
      ...(input.contact && { contact: input.contact }),
      ...(input.telephone && { telephone: input.telephone }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
}

export async function deleteClientRecord(id: string) {
  await prisma.client.delete({
    where: { id },
  });
}
