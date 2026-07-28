import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../app";
import { prisma } from "../db";
import { resetDatabase, createUser, login } from "./helpers";

let app: Express;

beforeAll(() => {
  app = createApp();
});

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Authentification (intégration)", () => {
  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await createUser({
        nom: "Administrateur",
        username: "admin",
        password: "MotDePasse1!",
        role: "admin",
      });
    });

    it("délivre un jeton pour des identifiants valides", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ username: "admin", password: "MotDePasse1!" });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeTruthy();
      expect(response.body.user).toMatchObject({ username: "admin", role: "admin" });
    });

    it("ne renvoie jamais le hachage du mot de passe", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ username: "admin", password: "MotDePasse1!" });

      expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    });

    it("rejette un mot de passe incorrect", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ username: "admin", password: "mauvais" });

      expect(response.status).toBe(401);
      expect(response.body.token).toBeUndefined();
    });

    it("rejette un utilisateur inconnu sans distinguer le motif", async () => {
      // Le message doit rester identique à celui d'un mot de passe erroné,
      // pour ne pas révéler quels comptes existent.
      const inconnu = await request(app)
        .post("/api/auth/login")
        .send({ username: "fantome", password: "MotDePasse1!" });
      const mauvaisMdp = await request(app)
        .post("/api/auth/login")
        .send({ username: "admin", password: "mauvais" });

      expect(inconnu.status).toBe(401);
      expect(inconnu.body.error).toBe(mauvaisMdp.body.error);
    });

    it("refuse la connexion d'un compte désactivé", async () => {
      await createUser({
        username: "inactif",
        password: "MotDePasse1!",
        role: "technicien",
        active: false,
      });

      const response = await request(app)
        .post("/api/auth/login")
        .send({ username: "inactif", password: "MotDePasse1!" });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.token).toBeUndefined();
    });

    it("rejette une requête sans identifiants", async () => {
      const response = await request(app).post("/api/auth/login").send({});

      expect(response.status).toBe(400);
    });
  });

  describe("Jeton et session", () => {
    it("refuse l'accès sans jeton", async () => {
      const response = await request(app).get("/api/clients");

      expect(response.status).toBe(401);
    });

    it("refuse un jeton falsifié", async () => {
      const response = await request(app)
        .get("/api/clients")
        .set("Authorization", "Bearer jeton.completement.invalide");

      expect(response.status).toBe(401);
    });

    it("refuse un en-tête Authorization mal formé", async () => {
      await createUser({ username: "admin", password: "MotDePasse1!", role: "admin" });
      const { token } = await login(app, "admin", "MotDePasse1!");

      const response = await request(app)
        .get("/api/clients")
        .set("Authorization", token as string); // sans le préfixe « Bearer »

      expect(response.status).toBe(401);
    });

    it("révoque immédiatement la session d'un compte désactivé après émission du jeton", async () => {
      // Garantie essentielle : la désactivation d'un compte doit prendre effet
      // sans attendre l'expiration du jeton déjà distribué.
      const user = await createUser({
        username: "technicien",
        password: "MotDePasse1!",
        role: "technicien",
      });
      const { token } = await login(app, "technicien", "MotDePasse1!");
      expect(token).toBeTruthy();

      await prisma.technicien.update({
        where: { id: user.id },
        data: { active: false },
      });

      const response = await request(app)
        .get("/api/interventions")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });

    it("révoque la session d'un utilisateur supprimé", async () => {
      const user = await createUser({
        username: "temporaire",
        password: "MotDePasse1!",
        role: "admin",
      });
      const { token } = await login(app, "temporaire", "MotDePasse1!");

      await prisma.technicien.delete({ where: { id: user.id } });

      const response = await request(app)
        .get("/api/clients")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(401);
    });

    it("prend en compte un changement de rôle sans réémission du jeton", async () => {
      // Le rôle est relu en base à chaque requête : une rétrogradation est
      // appliquée immédiatement, même si le jeton porte encore l'ancien rôle.
      const user = await createUser({
        username: "promu",
        password: "MotDePasse1!",
        role: "admin",
      });
      const { token } = await login(app, "promu", "MotDePasse1!");

      await request(app)
        .get("/api/clients")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      await prisma.technicien.update({
        where: { id: user.id },
        data: { role: "technicien" },
      });

      const response = await request(app)
        .get("/api/clients")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });

  describe("Routes inexistantes", () => {
    it("renvoie un 404 JSON pour une route API inconnue", async () => {
      const response = await request(app).get("/api/route-qui-nexiste-pas");

      expect(response.status).toBe(404);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe("GET /health", () => {
    it("répond sans authentification", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
    });
  });
});
