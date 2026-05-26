import type { Photo } from "../types";

export interface Artifact {
  type: string;
  filename: string;
  url: string;
  createdAt: string;
}

export const TECHNICIAN_INTERVENTION_STEPS = [
  { id: "info", label: "Infos", icon: "document" },
  { id: "heures", label: "Heures", icon: "clock" },
  { id: "materiel", label: "Matériel", icon: "box" },
  { id: "rapport", label: "Rapport", icon: "reports" },
  { id: "sign-tech", label: "Tech", icon: "technician" },
  { id: "sign-client", label: "Client", icon: "user" },
] as const;

export function extractInterventionTime(isoStr?: string): string {
  if (!isoStr) return "";
  try {
    const date = new Date(isoStr);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function mapArtifactPhotos(artifacts: Artifact[]): Photo[] {
  return artifacts
    .filter((artifact) => artifact.type.startsWith("photo_"))
    .map((artifact) => {
      let photoType: "before" | "after" | "other" = "other";
      if (artifact.type === "photo_avant") photoType = "before";
      else if (artifact.type === "photo_apres") photoType = "after";

      return {
        id: artifact.filename,
        dataUrl: artifact.url,
        type: photoType,
        timestamp: new Date(artifact.createdAt),
        caption: artifact.filename,
      };
    });
}

export function mapArtifactAttachments(artifacts: Artifact[]) {
  return artifacts
    .filter(
      (artifact) =>
        !artifact.type.startsWith("photo_") && artifact.type !== "rapport_pdf"
    )
    .map((artifact) => ({
      name: artifact.filename,
      url: artifact.url,
      type: artifact.type,
    }));
}

export function findArtifactReport(artifacts: Artifact[]) {
  return artifacts.find(
    (artifact) =>
      artifact.type === "rapport_pdf" ||
      (artifact.filename &&
        (artifact.filename.startsWith("Rapport_") ||
          artifact.filename.startsWith("Bon-Intervention-")) &&
        artifact.filename.endsWith(".pdf"))
  );
}
