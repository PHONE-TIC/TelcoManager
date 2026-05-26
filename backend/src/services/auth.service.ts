import * as bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db";
import { getJwtSecret, getJwtExpiresIn } from "../config/jwt";

type JwtPayload = {
  id: string;
  username: string;
  role: string;
};

export async function authenticateUser(username: string, password: string) {
  const technicien = await prisma.technicien.findUnique({
    where: { username },
  });

  if (!technicien) {
    return { status: 401 as const, body: { error: "Identifiants invalides" } };
  }

  if (!technicien.active) {
    return { status: 401 as const, body: { error: "Compte désactivé" } };
  }

  const isPasswordValid = await bcrypt.compare(password, technicien.passwordHash);
  if (!isPasswordValid) {
    return { status: 401 as const, body: { error: "Identifiants invalides" } };
  }

  await prisma.$transaction([
    prisma.technicien.update({
      where: { id: technicien.id },
      data: { lastLogin: new Date() },
    }),
    prisma.activityLog.create({
      data: {
        technicienId: technicien.id,
        action: "LOGIN",
        details: "Connexion réussie",
      },
    }),
  ]);

  const token = jwt.sign(
    {
      id: technicien.id,
      username: technicien.username,
      role: technicien.role,
    },
    getJwtSecret(),
    { expiresIn: getJwtExpiresIn() }
  );

  return {
    status: 200 as const,
    body: {
      token,
      user: {
        id: technicien.id,
        nom: technicien.nom,
        username: technicien.username,
        role: technicien.role,
        lastLogin: new Date(),
      },
    },
  };
}

export async function refreshJwtToken(token: string): Promise<string> {
  const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;

  const dbUser = await prisma.technicien.findUnique({
    where: { id: decoded.id }
  });

  if (!dbUser) {
    throw new Error("Utilisateur introuvable");
  }

  if (!dbUser.active) {
    throw new Error("Compte désactivé");
  }

  return jwt.sign(
    {
      id: dbUser.id,
      username: dbUser.username,
      role: dbUser.role,
    },
    getJwtSecret(),
    { expiresIn: getJwtExpiresIn() }
  );
}

export async function getAuthenticatedUserFromToken(token: string) {
  const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;

  return prisma.technicien.findUnique({
    where: { id: decoded.id },
    select: {
      id: true,
      nom: true,
      username: true,
      role: true,
      active: true,
    },
  });
}
