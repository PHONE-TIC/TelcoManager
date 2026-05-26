import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAdmin, requireInterventionAccess } from "./middleware/auth.middleware";
import { prisma } from "./db";
import type { Response, NextFunction } from "express";

// Mock the entire db module
vi.mock("./db", () => {
  return {
    prisma: {
      intervention: {
        findUnique: vi.fn(),
      },
    },
  };
});

describe("Auth Middleware", () => {
  let mockRequest: any;
  let mockResponse: any;
  let nextFunction: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      params: {},
      user: undefined,
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    nextFunction = vi.fn();
  });

  describe("requireAdmin", () => {
    it("should return 401 when user is not authenticated", () => {
      requireAdmin(mockRequest, mockResponse, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Non authentifié" });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it("should return 403 when user is not an admin", () => {
      mockRequest.user = { id: "tech-1", username: "john", role: "technicien" };
      requireAdmin(mockRequest, mockResponse, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Accès refusé - Administrateur requis" });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it("should call next() when user is an admin", () => {
      mockRequest.user = { id: "admin-1", username: "super", role: "admin" };
      requireAdmin(mockRequest, mockResponse, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe("requireInterventionAccess", () => {
    it("should return 400 when intervention ID is missing from parameters", async () => {
      await requireInterventionAccess(mockRequest, mockResponse, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "ID d'intervention manquant" });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it("should return 404 when intervention is not found in database", async () => {
      mockRequest.params.id = "int-123";
      vi.mocked(prisma.intervention.findUnique).mockResolvedValue(null);

      await requireInterventionAccess(mockRequest, mockResponse, nextFunction);
      expect(prisma.intervention.findUnique).toHaveBeenCalledWith({ where: { id: "int-123" } });
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Intervention non trouvée" });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it("should return 403 when user is a technician not assigned to the intervention", async () => {
      mockRequest.params.id = "int-123";
      mockRequest.user = { id: "tech-1", username: "jack", role: "technicien" };

      const mockIntervention = {
        id: "int-123",
        technicienId: "tech-2", // Assigned to a different technician
      };
      vi.mocked(prisma.intervention.findUnique).mockResolvedValue(mockIntervention as any);

      await requireInterventionAccess(mockRequest, mockResponse, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Accès refusé - Vous n'êtes pas assigné à cette intervention",
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it("should call next() when user is a technician assigned to the intervention", async () => {
      mockRequest.params.id = "int-123";
      mockRequest.user = { id: "tech-1", username: "jack", role: "technicien" };

      const mockIntervention = {
        id: "int-123",
        technicienId: "tech-1", // Assigned to the same technician
      };
      vi.mocked(prisma.intervention.findUnique).mockResolvedValue(mockIntervention as any);

      await requireInterventionAccess(mockRequest, mockResponse, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should call next() when user is an admin, regardless of intervention assignment", async () => {
      mockRequest.params.id = "int-123";
      mockRequest.user = { id: "admin-1", username: "super", role: "admin" };

      const mockIntervention = {
        id: "int-123",
        technicienId: "tech-2",
      };
      vi.mocked(prisma.intervention.findUnique).mockResolvedValue(mockIntervention as any);

      await requireInterventionAccess(mockRequest, mockResponse, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should call next() when user is a gestionnaire, regardless of intervention assignment", async () => {
      mockRequest.params.id = "int-123";
      mockRequest.user = { id: "manager-1", username: "guy", role: "gestionnaire" };

      const mockIntervention = {
        id: "int-123",
        technicienId: "tech-2",
      };
      vi.mocked(prisma.intervention.findUnique).mockResolvedValue(mockIntervention as any);

      await requireInterventionAccess(mockRequest, mockResponse, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it("should return 403 when user has an unrecognized role (default-deny)", async () => {
      mockRequest.params.id = "int-123";
      mockRequest.user = { id: "strange-1", username: "stranger", role: "unrecognized" };

      const mockIntervention = {
        id: "int-123",
        technicienId: "tech-2",
      };
      vi.mocked(prisma.intervention.findUnique).mockResolvedValue(mockIntervention as any);

      await requireInterventionAccess(mockRequest, mockResponse, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: "Accès refusé" });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
