import { Response } from "express";
import { validationResult } from "express-validator";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth.middleware";
import { notifyNewIntervention } from "../services/push.service";

export const getAllInterventions = async (req: AuthRequest, res: Response) => {
  try {
    const {
      clientId,
      technicienId,
      statut,
      startDate,
      endDate,
      page = "1",
      limit = "20",
    } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};

    if (clientId) where.clientId = clientId;
    if (technicienId) where.technicienId = technicienId;
    if (statut) where.statut = statut;

    if (startDate && endDate) {
      where.datePlanifiee = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const [interventions, total] = await Promise.all([
      prisma.intervention.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        include: {
          client: {
            select: {
              id: true,
              nom: true,
              rue: true,
              codePostal: true,
              ville: true,
              telephone: true,
            },
          },
          technicien: {
            select: {
              id: true,
              nom: true,
              username: true,
            },
          },
          _count: {
            select: {
              equipements: true,
            },
          },
        },
        orderBy: { datePlanifiee: "desc" },
      }),
      prisma.intervention.count({ where }),
    ]);

    res.json({
      interventions,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des interventions:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des interventions" });
  }
};

export const getInterventionById = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    const intervention = await prisma.intervention.findUnique({
      where: { id },
      include: {
        client: true,
        technicien: {
          select: {
            id: true,
            nom: true,
            username: true,
          },
        },
        equipements: {
          include: {
            stock: {
              select: {
                nomMateriel: true,
                reference: true,
                categorie: true,
                numeroSerie: true,
              },
            },
          },
        },
      },
    });

    if (!intervention) {
      return res.status(404).json({ error: "Intervention non trouvée" });
    }

    res.json(intervention);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'intervention:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération de l'intervention" });
  }
};

export const createIntervention = async (req: AuthRequest, res: Response) => {
  try {
    // Only admins can create interventions
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        error: "Seuls les administrateurs peuvent créer des interventions",
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      clientId,
      technicienId,
      titre,
      description,
      datePlanifiee,
      statut = "planifiee",
      type = "SAV",
    } = req.body;

    // Fetch client and technician names to save them for future reference
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { nom: true },
    });
    let technicienNom: string | null = null;
    if (technicienId) {
      const technicien = await prisma.technicien.findUnique({
        where: { id: technicienId },
        select: { nom: true },
      });
      technicienNom = technicien?.nom || null;
    }

    const tempNumero = `TEMP-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // 1. Create with temp number to get the auto-incremented counter
    const initialIntervention = await prisma.intervention.create({
      data: {
        clientId,
        clientNom: client?.nom || null,
        technicienId,
        technicienNom,
        titre,
        description,
        // Parse date as-is, JavaScript will handle timezone naturally
        datePlanifiee: new Date(datePlanifiee),
        statut,
        type,
        numero: tempNumero,
      },
    });

    // 2. Generate final number format: RDV + Year + Counter (padded)
    const year = new Date().getFullYear();
    const finalNumero = `RDV${year}${initialIntervention.compteur
      .toString()
      .padStart(3, "0")}`;

    // 3. Update with final number and return with relations
    const intervention = await prisma.intervention.update({
      where: { id: initialIntervention.id },
      data: { numero: finalNumero },
      include: {
        client: {
          select: {
            nom: true,
          },
        },
        technicien: {
          select: {
            nom: true,
          },
        },
      },
    });

    // Send push notification to assigned technician
    if (technicienId) {
      notifyNewIntervention(technicienId, {
        id: intervention.id,
        numero: intervention.numero,
        titre: intervention.titre,
        datePlanifiee: intervention.datePlanifiee,
        client: intervention.client,
      }).catch((err) => {
        console.error("Failed to send push notification:", err);
      });
    }

    res.status(201).json(intervention);
  } catch (error) {
    console.error("Erreur lors de la création de l'intervention:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la création de l'intervention" });
  }
};

export const updateIntervention = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    // Check if intervention exists and get current status
    const existingIntervention = await prisma.intervention.findUnique({
      where: { id },
    });

    if (!existingIntervention) {
      return res.status(404).json({ error: "Intervention non trouvée" });
    }

    // Technicians cannot modify closed interventions
    if (req.user?.role === "technicien") {
      if (
        existingIntervention.statut === "terminee" ||
        existingIntervention.statut === "annulee"
      ) {
        return res.status(403).json({
          error: "Les interventions clôturées ne peuvent pas être modifiées",
        });
      }
    }

    const {
      technicienId,
      titre,
      description,
      datePlanifiee,
      dateRealisee,
      statut,
      type,
      notes,
      signature,
    } = req.body;

    // If technician is being changed, fetch the new technician's name
    let technicienNom: string | null | undefined = undefined;
    if (
      technicienId !== undefined &&
      technicienId !== existingIntervention.technicienId
    ) {
      if (technicienId) {
        const technicien = await prisma.technicien.findUnique({
          where: { id: technicienId },
          select: { nom: true },
        });
        technicienNom = technicien?.nom || null;
      } else {
        technicienNom = null;
      }
    }

    const data: any = {
      ...(technicienId !== undefined && { technicienId }),
      ...(technicienNom !== undefined && { technicienNom }),
      ...(titre && { titre }),
      ...(description !== undefined && { description }),
      ...(datePlanifiee && { datePlanifiee: new Date(datePlanifiee) }),
      ...(dateRealisee && { dateRealisee: new Date(dateRealisee) }),
      ...(statut && { statut }),
      ...(type && { type }),
      ...(notes !== undefined && { notes }),
      ...(signature !== undefined && { signature }),
    };

    const intervention = await prisma.intervention.update({
      where: { id },
      data,
      include: {
        client: {
          select: {
            nom: true,
          },
        },
        technicien: {
          select: {
            nom: true,
          },
        },
      },
    });

    res.json(intervention);
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Intervention non trouvée" });
    }
    console.error("Erreur lors de la mise à jour de l'intervention:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la mise à jour de l'intervention" });
  }
};

export const deleteIntervention = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    await prisma.intervention.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Intervention non trouvée" });
    }
    console.error("Erreur lors de la suppression de l'intervention:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la suppression de l'intervention" });
  }
};

// Mettre à jour le statut de l'intervention (Workflow)
export const updateInterventionStatus = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { statut, datePriseEnCharge, commentaireTechnicien } = req.body;

    // Get the intervention to check its scheduled date
    const existingIntervention = await prisma.intervention.findUnique({
      where: { id },
    });

    if (!existingIntervention) {
      return res.status(404).json({ error: "Intervention non trouvée" });
    }

    // Validate that intervention is scheduled for today when starting (en_cours)
    if (statut === "en_cours" && existingIntervention.statut === "planifiee") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const scheduledDate = new Date(existingIntervention.datePlanifiee);

      if (scheduledDate < today || scheduledDate >= tomorrow) {
        return res.status(400).json({
          error:
            "Impossible de prendre en charge une intervention qui n'est pas prévue pour aujourd'hui",
        });
      }
    }

    const data: any = { statut };

    if (statut === "en_cours" && datePriseEnCharge) {
      data.datePriseEnCharge = new Date(datePriseEnCharge);
    }

    if (statut === "terminee") {
      // Validation finale (optionnelle, selon rigueur voulue)
      data.dateRealisee = new Date();
    }

    if (commentaireTechnicien) {
      data.commentaireTechnicien = commentaireTechnicien;
    }

    const intervention = await prisma.intervention.update({
      where: { id },
      data,
    });

    res.json(intervention);
  } catch (error) {
    console.error("Erreur updateInterventionStatus:", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour du statut" });
  }
};

// Valider les heures (Arrivée / Départ)
export const validateHours = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { heureArrivee, heureDepart } = req.body;

    if (!heureArrivee || !heureDepart) {
      return res
        .status(400)
        .json({ error: "Heures d'arrivée et de départ requises" });
    }

    const intervention = await prisma.intervention.update({
      where: { id },
      data: {
        heureArrivee: new Date(heureArrivee),
        heureDepart: new Date(heureDepart),
      },
    });

    res.json(intervention);
  } catch (error) {
    console.error("Erreur validateHours:", error);
    res.status(500).json({ error: "Erreur lors de la validation des heures" });
  }
};

// Signer l'intervention
export const signIntervention = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { type, signature } = req.body; // type: 'technicien' | 'client'

    const data: any = {};
    if (type === "technicien") {

      data.signatureTechnicien = signature;
    } else if (type === "client") {

      data.signature = signature;
    } else {
      return res.status(400).json({ error: "Type de signature invalide" });
    }

    const intervention = await prisma.intervention.update({
      where: { id },
      data,
    });

    res.json(intervention);
  } catch (error) {
    console.error("Erreur signIntervention:", error);
    res.status(500).json({ error: "Erreur lors de la signature" });
  }
};

// Gestion du matériel (Installation (depuis stock tech) / Retrait OK / Retrait HS)
export const manageEquipement = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      stockId,
      action,
      quantite = 1,
      notes,
      etat,
      nom,
      marque,
      modele,
      serialNumber,
    } = req.body;
    // action: 'install', 'retrait'
    // etat (si retrait): 'ok', 'hs'

    // Validation for stockId OR manual details
    if (!stockId && !nom) {
      return res
        .status(400)
        .json({ error: "stockId ou nom du matériel requis" });
    }

    const intervention = await prisma.intervention.findUnique({
      where: { id },
    });

    if (!intervention)
      return res.status(404).json({ error: "Intervention non trouvée" });

    if (action === "install") {
      if (!stockId)
        return res
          .status(400)
          .json({ error: "stockId requis pour installation" });

      const stock = await prisma.stock.findUnique({ where: { id: stockId } });
      if (!stock) return res.status(404).json({ error: "Article non trouvé" });

      // 1. Décrémenter stock véhicule technicien (OBLIGATOIRE)
      if (!intervention.technicienId) {
        return res.status(400).json({
          error:
            "Impossible d'installer : aucun technicien assigné à l'intervention.",
        });
      }

      try {
        const techStock = await prisma.technicianStock.findUnique({
          where: {
            technicienId_stockId: {
              technicienId: intervention.technicienId,
              stockId,
            },
          },
        });

        if (!techStock || techStock.quantite < quantite) {
          return res.status(400).json({
            error:
              "Stock insuffisant dans le véhicule du technicien. Veuillez effectuer un transfert depuis l'entrepôt.",
          });
        }

        // Decrementer et supprimer si 0
        if (techStock.quantite - quantite <= 0) {
          await prisma.technicianStock.delete({
            where: { id: techStock.id },
          });
        } else {
          await prisma.technicianStock.update({
            where: { id: techStock.id },
            data: { quantite: { decrement: quantite } },
          });
        }
      } catch (e) {
        console.warn("Tech stock update error:", e);
        return res.status(400).json({ error: "Erreur stock technicien" });
      }

      // 2. Créer équipement client
      await prisma.clientEquipment.create({
        data: {
          clientId: intervention.clientId,
          stockId,
          referenceMateriel: stock.reference,
          statut: "installe",
          notes: `Installé (Int #${intervention.numero})`,
        },
      });

      // Log
      await prisma.interventionEquipment.create({
        data: {
          interventionId: id,
          stockId,
          action,
          quantite,
          notes,
        },
      });
    } else if (action === "retrait") {
      // Retrait logic
      // Log the removal
      await prisma.interventionEquipment.create({
        data: {
          interventionId: id,
          stockId, // Can be null
          action: action + (etat ? `_${etat}` : ""),
          quantite,
          notes: notes || `Etat: ${etat || "Non spécifié"}`,
          nom,
          marque,
          modele,
          serialNumber,
        },
      });

      // If stockId Provided (known item), we update ClientEquipment status and RETURN TO TECH STOCK
      if (stockId) {
        const clientEq = await prisma.clientEquipment.findFirst({
          where: {
            clientId: intervention.clientId,
            stockId,
            statut: "installe",
          },
        });

        if (clientEq) {
          await prisma.clientEquipment.update({
            where: { id: clientEq.id },
            data: {
              statut: etat === "hs" ? "hs" : "retire",
              notes: `Retiré ${etat?.toUpperCase()} (Int #${intervention.numero
                })`,
            },
          });
        }

        // Retour dans le stock du technicien (Traçabilité)
        if (intervention.technicienId) {
          await prisma.technicianStock.upsert({
            where: {
              technicienId_stockId: {
                technicienId: intervention.technicienId,
                stockId,
              },
            },
            update: {
              quantite: { increment: quantite },
              etat: etat === "hs" ? "hs" : "ok", // Mise à jour de l'état si retourné
            },
            create: {
              technicienId: intervention.technicienId,
              stockId,
              quantite,
              etat: etat === "hs" ? "hs" : "ok",
            },
          });
        } else {
          // Fallback (ne devrait pas arriver si process respecté, mais au cas où admin retire)
          console.warn(
            "Retrait sans technicien : retour stock central (fallback)"
          );
          if (etat === "ok") {
            await prisma.stock.update({
              where: { id: stockId },
              data: { quantite: { increment: quantite } },
            });
          } else {
            // Handle HS return to central... complicated without existing HS item logic.
            // Leaving as gap or assuming OK reuse.
            // But prioritizing Tech flow as requested.
          }
        }
      }
    }

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Erreur manageEquipement:", error);
    res.status(500).json({ error: "Erreur lors de la gestion du matériel" });
  }
};

// LOCK MTEHODS
export const lockIntervention = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: "Non authentifié" });

    const intervention = await prisma.intervention.findUnique({
      where: { id },
    });
    if (!intervention)
      return res.status(404).json({ error: "Intervention non trouvée" });

    // Check if locked by someone else and active (< 5 min)
    if (
      intervention.lockedBy &&
      intervention.lockedBy !== userId &&
      intervention.lockedAt
    ) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (intervention.lockedAt > fiveMinutesAgo) {
        // Get user name if possible
        const lockingUser = await prisma.technicien.findUnique({
          where: { id: intervention.lockedBy },
        });
        return res.status(409).json({
          error: "Intervention verrouillée",
          lockedBy: lockingUser?.nom || "Un autre utilisateur",
        });
      }
    }

    // Apply lock
    await prisma.intervention.update({
      where: { id },
      data: {
        lockedBy: userId,
        lockedAt: new Date(),
      },
    });

    res.json({ success: true, message: "Intervention verrouillée" });
  } catch (error) {
    console.error("Erreur lockIntervention:", error);
    res.status(500).json({ error: "Erreur lors du verrouillage" });
  }
};

export const unlockIntervention = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Optional: Only allow unlock if locked by self or admin?
    // For MVP, just unlock.

    await prisma.intervention.update({
      where: { id },
      data: {
        lockedBy: null,
        lockedAt: null,
      },
    });

    res.json({ success: true, message: "Intervention déverrouillée" });
  } catch (error) {
    console.error("Erreur unlockIntervention:", error);
    res.status(500).json({ error: "Erreur lors du déverrouillage" });
  }
};

// Upload artifacts (Photos + Report)
export const uploadArtifacts = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];


    if (files) {
      files.forEach((f) => {
        console.log(
          `[Upload] Saved file for intervention ${id}: ${f.filename} (${f.mimetype}) at ${f.path}`
        );
      });
    }

    if (!files || files.length === 0) {
      console.warn(`[Upload] No files received for ${id}`);
      return res.status(400).json({ error: "Aucun fichier fourni" });
    }

    console.log(
      `[Upload] ${files.length} fichiers sauvegardés pour l'intervention ${id}`
    );

    res.json({
      success: true,
      message: `${files.length} fichiers sauvegardés`,
      files: files.map((f) => ({
        filename: f.filename,
        path: f.path,
        mimetype: f.mimetype,
      })),
    });
  } catch (error) {
    console.error("Erreur uploadArtifacts:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la sauvegarde des fichiers" });
  }
};

// Get Artifacts (List files)
import fs from "fs";
import path from "path";

export const getArtifacts = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    // Use process.cwd() for consistent path resolution
    const uploadDir = path.join(process.cwd(), `uploads/interventions/${id}`);

    if (!fs.existsSync(uploadDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(uploadDir);
    const artifacts = files.map((file) => {
      // Construct full URL (assuming /uploads is served statically)
      // file format: timestamp_originalName
      // simple heuristic for type:
      let type = "autre";
      if (file.toLowerCase().endsWith(".pdf")) type = "rapport";
      else if (file.includes("avant")) type = "photo_avant";
      else if (file.includes("apres")) type = "photo_apres";
      else if (file.match(/\.(jpg|jpeg|png|gif)$/i)) type = "photo_autre";

      return {
        filename: file,
        url: `/uploads/interventions/${id}/${file}`,
        type,
        createdAt: fs.statSync(path.join(uploadDir, file)).birthtime,
      };
    });

    res.json(artifacts);
  } catch (error) {
    console.error("Erreur getArtifacts:", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des fichiers" });
  }
};
