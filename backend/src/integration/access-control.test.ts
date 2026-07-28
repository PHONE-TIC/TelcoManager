import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../app";
import { prisma } from "../db";
import {
  resetDatabase,
  createUserAndLogin,
  createClient,
  createIntervention,
} from "./helpers";

let app: Express;

// Jetons et identifiants rafraîchis avant chaque test (la base est vidée).
let adminToken: string;
let gestionnaireToken: string;
let technicienToken: string;
let autreTechnicienToken: string;
let technicienId: string;
let clientId: string;
let interventionAssignee: string;
let interventionAutrui: string;

beforeAll(() => {
  app = createApp();
});

beforeEach(async () => {
  await resetDatabase();

  const admin = await createUserAndLogin(app, {
    username: "admin",
    password: "MotDePasse1!",
    role: "admin",
  });
  const gestionnaire = await createUserAndLogin(app, {
    username: "gestionnaire",
    password: "MotDePasse1!",
    role: "gestionnaire",
  });
  const technicien = await createUserAndLogin(app, {
    username: "technicien",
    password: "MotDePasse1!",
    role: "technicien",
  });
  const autre = await createUserAndLogin(app, {
    username: "autre-technicien",
    password: "MotDePasse1!",
    role: "technicien",
  });

  adminToken = admin.token;
  gestionnaireToken = gestionnaire.token;
  technicienToken = technicien.token;
  autreTechnicienToken = autre.token;
  technicienId = technicien.user.id;

  const client = await createClient();
  clientId = client.id;

  interventionAssignee = (
    await createIntervention({ clientId, technicienId })
  ).id;
  interventionAutrui = (
    await createIntervention({ clientId, technicienId: autre.user.id })
  ).id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("Contrôle d'accès (intégration)", () => {
  describe("Cloisonnement des interventions", () => {
    it("permet au technicien d'ouvrir l'intervention qui lui est assignée", async () => {
      const response = await request(app)
        .get(`/api/interventions/${interventionAssignee}`)
        .set(auth(technicienToken));

      expect(response.status).toBe(200);
    });

    it("interdit au technicien d'ouvrir l'intervention d'un collègue", async () => {
      const response = await request(app)
        .get(`/api/interventions/${interventionAutrui}`)
        .set(auth(technicienToken));

      expect(response.status).toBe(403);
    });

    it("interdit au technicien de modifier l'intervention d'un collègue", async () => {
      const response = await request(app)
        .put(`/api/interventions/${interventionAutrui}`)
        .set(auth(technicienToken))
        .send({ titre: "Titre détourné" });

      expect(response.status).toBe(403);

      const inchangee = await prisma.intervention.findUnique({
        where: { id: interventionAutrui },
      });
      expect(inchangee?.titre).not.toBe("Titre détourné");
    });

    it("interdit au technicien d'ajouter du matériel sur l'intervention d'un collègue", async () => {
      const response = await request(app)
        .post(`/api/interventions/${interventionAutrui}/equipements`)
        .set(auth(technicienToken))
        .send({ action: "retrait", nom: "Matériel", marque: "Test" });

      expect(response.status).toBe(403);
    });

    it("laisse l'administrateur accéder à toutes les interventions", async () => {
      await request(app)
        .get(`/api/interventions/${interventionAssignee}`)
        .set(auth(adminToken))
        .expect(200);
      await request(app)
        .get(`/api/interventions/${interventionAutrui}`)
        .set(auth(adminToken))
        .expect(200);
    });

    it("laisse le gestionnaire accéder à toutes les interventions", async () => {
      await request(app)
        .get(`/api/interventions/${interventionAutrui}`)
        .set(auth(gestionnaireToken))
        .expect(200);
    });

    it("renvoie 404 pour une intervention inexistante", async () => {
      const response = await request(app)
        .get("/api/interventions/6b7f1d94-0000-4000-8000-000000000000")
        .set(auth(adminToken));

      expect(response.status).toBe(404);
    });

    it("rejette un identifiant d'intervention mal formé", async () => {
      const response = await request(app)
        .get("/api/interventions/pas-un-uuid")
        .set(auth(adminToken));

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe("Gestion des comptes utilisateurs", () => {
    it("interdit à un technicien de créer un compte", async () => {
      const response = await request(app)
        .post("/api/techniciens")
        .set(auth(technicienToken))
        .send({
          nom: "Escalade",
          username: "escalade",
          password: "MotDePasse1!",
          role: "admin",
        });

      expect(response.status).toBe(403);
      expect(await prisma.technicien.findUnique({ where: { username: "escalade" } })).toBeNull();
    });

    it("interdit à un gestionnaire de créer un compte administrateur", async () => {
      const response = await request(app)
        .post("/api/techniciens")
        .set(auth(gestionnaireToken))
        .send({
          nom: "Escalade",
          username: "escalade-gest",
          password: "MotDePasse1!",
          role: "admin",
        });

      expect(response.status).toBe(403);
    });

    it("interdit à un technicien de se promouvoir administrateur", async () => {
      const response = await request(app)
        .put(`/api/techniciens/${technicienId}`)
        .set(auth(technicienToken))
        .send({ role: "admin" });

      expect(response.status).toBe(403);

      const inchange = await prisma.technicien.findUnique({ where: { id: technicienId } });
      expect(inchange?.role).toBe("technicien");
    });

    it("autorise l'administrateur à créer un compte", async () => {
      const response = await request(app)
        .post("/api/techniciens")
        .set(auth(adminToken))
        .send({
          nom: "Nouveau",
          username: "nouveau",
          password: "MotDePasse1!",
          role: "technicien",
        });

      expect(response.status).toBe(201);
    });

    it("refuse un nom d'utilisateur déjà pris", async () => {
      const response = await request(app)
        .post("/api/techniciens")
        .set(auth(adminToken))
        .send({
          nom: "Doublon",
          username: "technicien",
          password: "MotDePasse1!",
          role: "technicien",
        });

      expect(response.status).toBe(409);
    });
  });

  describe("Périmètre des données clients", () => {
    it("interdit au technicien de lister les clients", async () => {
      const response = await request(app).get("/api/clients").set(auth(technicienToken));

      expect(response.status).toBe(403);
    });

    it("autorise gestionnaire et administrateur à lister les clients", async () => {
      await request(app).get("/api/clients").set(auth(adminToken)).expect(200);
      await request(app).get("/api/clients").set(auth(gestionnaireToken)).expect(200);
    });

    it("interdit au technicien de supprimer un client", async () => {
      const response = await request(app)
        .delete(`/api/clients/${clientId}`)
        .set(auth(technicienToken));

      expect(response.status).toBe(403);
      expect(await prisma.client.findUnique({ where: { id: clientId } })).not.toBeNull();
    });
  });

  describe("Validation des entrées", () => {
    it("rejette la création d'un client sans les champs obligatoires", async () => {
      const response = await request(app)
        .post("/api/clients")
        .set(auth(adminToken))
        .send({ nom: "Incomplet" });

      expect(response.status).toBe(400);
      expect(response.body.errors ?? response.body.error).toBeTruthy();
    });

    it("rejette une intervention rattachée à un client inexistant", async () => {
      const response = await request(app)
        .post("/api/interventions")
        .set(auth(adminToken))
        .send({
          clientId: "6b7f1d94-0000-4000-8000-000000000000",
          titre: "Orpheline",
          datePlanifiee: "2026-08-01T09:00:00.000Z",
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });

    it("rejette une quantité de stock négative", async () => {
      const response = await request(app)
        .post("/api/stock")
        .set(auth(adminToken))
        .send({
          nomMateriel: "Article invalide",
          reference: "REF-NEG",
          categorie: "Reseau",
          marque: "Test",
          modele: "T1",
          quantite: -5,
        });

      expect(response.status).toBe(400);
    });
  });
});
