import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const interventionId = req.params.id;
    // Use /app/uploads if it exists (Docker), otherwise fallback to cwd/uploads
    let rootDir = process.cwd();
    if (fs.existsSync("/app/uploads")) {
      rootDir = "/app";
    }

    const uploadPath = path.join(
      rootDir,
      "uploads",
      "interventions",
      interventionId
    );

    console.log(`[Multer] Uploading to: ${uploadPath}`);

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      try {
        fs.mkdirSync(uploadPath, { recursive: true });
      } catch (err) {
        console.error(`[Multer] Error creating directory ${uploadPath}:`, err);
        return cb(err as Error, "");
      }
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Keep original name but prepend timestamp to avoid collisions
    // Clean filename to remove special chars
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${Date.now()}-${cleanName}`);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept images and PDFs
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    console.warn(`[Multer] Rejected file type: ${file.mimetype}`);
    cb(
      new Error(
        "Format de fichier non supporté. Seuls les images et PDF sont acceptés."
      )
    );
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit to be safe
    files: 20, // Max 20 files
  },
});
