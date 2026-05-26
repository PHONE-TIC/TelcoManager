import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

const storage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const interventionId = req.params.id;
    if (!interventionId) {
      return cb(new Error("Intervention ID is required"), "");
    }

    const uploadPath = path.join(
      process.cwd(),
      "uploads",
      "interventions",
      interventionId
    );

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Sanitize filename to prevent Directory Traversal and character conflicts
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext);
    // Retain only safe alphanumeric characters, dashes, and underscores
    const sanitizedBase = baseName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${Date.now()}_${sanitizedBase}${ext}`);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];
  
  const allowedExts = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".pdf"
  ];

  const ext = path.extname(file.originalname).toLowerCase();

  // Validate BOTH the mimetype and the actual file extension for defense-in-depth
  if (allowedMimeTypes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPEG, PNG, WEBP and PDF are allowed.")
    );
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
});
