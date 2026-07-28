import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import jwt from "jsonwebtoken";
import { createApp } from "../app";
import { prisma } from "../db";
import { resetDatabase, createUserAndLogin, createClient, createIntervention } from "./helpers";
import { getJwtSecret, STREAM_TICKET_TYPE } from "../config/jwt";

let app: Express;
let adminToken: string;
let adminId: string;

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
  adminToken = admin.token;
  adminId = admin.user.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("En-têtes de sécurité", () => {
  it("émet une politique de contenu restrictive", async () => {
    const response = await request(app).get("/health");
    const csp = response.headers["content-security-policy"];

    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it("n'autorise ni script inline ni eval", async () => {
    // Le build de production ne contient aucun script inline : conserver ces
    // permissions ouvrirait inutilement la porte au XSS.
    const csp = (await request(app).get("/health")).headers["content-security-policy"];

    const scriptSrc = csp.split(";").find((d: string) => d.trim().startsWith("script-src"));
    expect(scriptSrc).toBeTruthy();
    expect(scriptSrc).not.toContain("unsafe-inline");
    expect(scriptSrc).not.toContain("unsafe-eval");
  });

  it("autorise les images data: et blob: nécessaires aux codes-barres et signatures", async () => {
    const csp = (await request(app).get("/health")).headers["content-security-policy"];
    const imgSrc = csp.split(";").find((d: string) => d.trim().startsWith("img-src"));

    expect(imgSrc).toContain("data:");
    expect(imgSrc).toContain("blob:");
  });

  it("empêche le reniflage de type MIME et l'affichage en cadre", async () => {
    const response = await request(app).get("/health");

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBeTruthy();
  });

  it("ne divulgue pas la technologie du serveur", async () => {
    const response = await request(app).get("/health");

    expect(response.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("Authentification des flux SSE par ticket éphémère", () => {
  const streamUrl = "/api/interventions/locks/stream";

  it("délivre un ticket à un utilisateur authentifié", async () => {
    const response = await request(app)
      .post("/api/auth/stream-ticket")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.ticket).toBeTruthy();
    expect(response.body.expiresIn).toBeLessThanOrEqual(60);
  });

  it("refuse de délivrer un ticket sans authentification", async () => {
    const response = await request(app).post("/api/auth/stream-ticket");

    expect(response.status).toBe(401);
  });

  it("refuse le flux sans ticket", async () => {
    const response = await request(app).get(streamUrl);

    expect(response.status).toBe(401);
  });

  it("refuse un ticket falsifié", async () => {
    const response = await request(app).get(`${streamUrl}?ticket=nimporte.quoi.ici`);

    expect(response.status).toBe(401);
  });

  it("refuse le jeton de session présenté comme ticket de flux", async () => {
    // Sans cette distinction, le jeton de session pourrait continuer à
    // transiter par l'URL — précisément ce que ce mécanisme évite.
    const response = await request(app).get(`${streamUrl}?ticket=${adminToken}`);

    expect(response.status).toBe(401);
  });

  it("refuse un ticket de flux présenté comme jeton de session", async () => {
    const { body } = await request(app)
      .post("/api/auth/stream-ticket")
      .set("Authorization", `Bearer ${adminToken}`);

    const response = await request(app)
      .get("/api/clients")
      .set("Authorization", `Bearer ${body.ticket}`);

    expect(response.status).toBe(401);
  });

  it("refuse un ticket expiré", async () => {
    const expired = jwt.sign(
      { id: adminId, username: "admin", role: "admin", typ: STREAM_TICKET_TYPE },
      getJwtSecret(),
      { expiresIn: -10 }
    );

    const response = await request(app).get(`${streamUrl}?ticket=${expired}`);

    expect(response.status).toBe(401);
  });

  it("refuse le ticket d'un compte désactivé entre-temps", async () => {
    const { body } = await request(app)
      .post("/api/auth/stream-ticket")
      .set("Authorization", `Bearer ${adminToken}`);

    await prisma.technicien.update({
      where: { id: adminId },
      data: { active: false },
    });

    const response = await request(app).get(`${streamUrl}?ticket=${body.ticket}`);

    expect(response.status).toBe(403);
  });
});

describe("Le jeton de session ne circule plus en paramètre d'URL", () => {
  it("refuse un jeton valide passé en query sur une route protégée", async () => {
    const response = await request(app).get(`/api/clients?token=${adminToken}`);

    expect(response.status).toBe(401);
  });

  it("refuse un jeton valide passé en query sur l'accès aux pièces jointes", async () => {
    const client = await createClient();
    const intervention = await createIntervention({ clientId: client.id });

    const response = await request(app).get(
      `/uploads/interventions/${intervention.id}/photo.jpg?token=${adminToken}`
    );

    expect(response.status).toBe(401);
  });

  it("accepte toujours le jeton dans l'en-tête Authorization", async () => {
    const response = await request(app)
      .get("/api/clients")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
  });
});
