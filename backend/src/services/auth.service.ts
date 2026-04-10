import * as bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { prisma } from "../db";

const getJwtSecret = () => process.env.JWT_SECRET || "your-secret-key";
const getJwtExpiresIn = (): SignOptions["expiresIn"] =>
  (process.env.JWT_EXPIRES_IN || "24h") as SignOptions["expiresIn"];

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

export function refreshJwtToken(token: string) {
  const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;

  return jwt.sign(
    {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
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
