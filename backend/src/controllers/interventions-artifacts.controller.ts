import { Response } from "express";
import { validationResult } from "express-validator";
import fs from "fs";
import path from "path";
import { AuthRequest } from "../middleware/auth.middleware";
import { respondValidationError } from "./controller.utils";

/**
 * Pièces jointes d'une intervention : photos, documents et rapport PDF.
 * L'accès en lecture est cloisonné par le point d'entrée /uploads (voir app.ts).
 */
export const uploadArtifacts = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return respondValidationError(res, errors.array());
    }

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
export const getArtifacts = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return respondValidationError(res, errors.array());
    }

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