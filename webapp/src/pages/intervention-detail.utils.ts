import type { Photo } from "../types";

interface Artifact {
  type: string;
  filename: string;
  url: string;
  createdAt: string;
}

export function getInterventionBackState(fromView?: string) {
  if (fromView === "calendar") {
    return { path: "/interventions", state: { viewMode: "calendar" } };
  }

  if (fromView === "all") {
    return { path: "/interventions", state: { viewMode: "all" } };
  }

  return { path: "/interventions" };
}

export function canEditInterventionByRole(
  role: string | undefined,
  statut: string
): boolean {
  if (role === "admin") return true;
  return statut === "planifiee" || statut === "en_cours";
}

export function isInterventionClosed(statut: string): boolean {
  return statut === "terminee" || statut === "annulee";
}

export function mapDetailArtifactPhotos(artifacts: Artifact[]): Photo[] {
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

export function mapDetailArtifactAttachments(artifacts: Artifact[]) {
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

export function findDetailArtifactReport(artifacts: Artifact[]) {
  return artifacts.find(
    (artifact) =>
      artifact.type === "rapport_pdf" ||
      (artifact.filename &&
        (artifact.filename.startsWith("Rapport_") ||
          artifact.filename.startsWith("Bon-Intervention-")) &&
        artifact.filename.endsWith(".pdf"))
  );
}
