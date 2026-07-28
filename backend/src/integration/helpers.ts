import bcrypt from "bcryptjs";
import request from "supertest";
import type { Express } from "express";
import { prisma } from "../db";

/**
 * Vide les tables métier entre deux cas de test, dans l'ordre imposé par les
 * clés étrangères. TRUNCATE ... CASCADE est plus rapide que des suppressions
 * successives et remet les séquences à zéro, ce qui rend les numéros
 * d'intervention générés prévisibles d'un test à l'autre.
 */
export async function resetDatabase() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "intervention_equipments",
      "client_equipments",
      "inventory_items",
      "inventory_sessions",
      "stock_movements",
      "technician_stocks",
      "push_subscriptions",
      "activity_logs",
      "notifications",
      "interventions",
      "stock",
      "clients",
      "techniciens"
    RESTART IDENTITY CASCADE
  `);
}

export async function createUser(options: {
  nom?: string;
  username: string;
  password: string;
  role: "admin" | "gestionnaire" | "technicien";
  active?: boolean;
}) {
  return prisma.technicien.create({
    data: {
      nom: options.nom ?? options.username,
      username: options.username,
      passwordHash: await bcrypt.hash(options.password, 10),
      role: options.role,
      active: options.active ?? true,
    },
  });
}

export async function login(app: Express, username: string, password: string) {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ username, password });

  return {
    status: response.status,
    token: response.body?.token as string | undefined,
    body: response.body,
  };
}

/** Crée un utilisateur puis renvoie directement son jeton de session. */
export async function createUserAndLogin(
  app: Express,
  options: Parameters<typeof createUser>[0]
) {
  const user = await createUser(options);
  const { token } = await login(app, options.username, options.password);
  return { user, token: token as string };
}

export async function createClient(overrides: Partial<{ nom: string }> = {}) {
  return prisma.client.create({
    data: {
      nom: overrides.nom ?? "Client de test",
      rue: "12 rue des Tests",
      codePostal: "76000",
      ville: "Rouen",
      contact: "Jean Test",
      telephone: "0600000000",
    },
  });
}

export async function createIntervention(options: {
  clientId: string;
  technicienId?: string | null;
  numero?: string;
  titre?: string;
  statut?: "planifiee" | "en_cours" | "terminee" | "annulee";
}) {
  return prisma.intervention.create({
    data: {
      numero: options.numero ?? `RDV-TEST-${Math.floor(Math.random() * 1e9)}`,
      clientId: options.clientId,
      technicienId: options.technicienId ?? null,
      titre: options.titre ?? "Intervention de test",
      datePlanifiee: new Date("2026-08-01T09:00:00.000Z"),
      statut: options.statut ?? "planifiee",
    },
  });
}
