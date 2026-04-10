import { describe, expect, it } from "vitest";

import {
  canEditInterventionByRole,
  findDetailArtifactReport,
  getInterventionBackState,
  isInterventionClosed,
  mapDetailArtifactAttachments,
  mapDetailArtifactPhotos,
} from "./intervention-detail.utils";

describe("intervention-detail.utils", () => {
  it("maps back navigation state from the originating view", () => {
    expect(getInterventionBackState("calendar")).toEqual({
      path: "/interventions",
      state: { viewMode: "calendar" },
    });
    expect(getInterventionBackState("all")).toEqual({
      path: "/interventions",
      state: { viewMode: "all" },
    });
    expect(getInterventionBackState()).toEqual({ path: "/interventions" });
  });

  it("allows admin edits always and technician edits only on open interventions", () => {
    expect(canEditInterventionByRole("admin", "terminee")).toBe(true);
    expect(canEditInterventionByRole("technicien", "planifiee")).toBe(true);
    expect(canEditInterventionByRole("technicien", "annulee")).toBe(false);
    expect(isInterventionClosed("terminee")).toBe(true);
    expect(isInterventionClosed("en_cours")).toBe(false);
  });

  it("splits intervention artifacts into photos, attachments, and report", () => {
    const artifacts = [
      {
        type: "photo_avant",
        filename: "before.jpg",
        url: "/uploads/before.jpg",
        createdAt: "2025-01-02T03:04:05.000Z",
      },
      {
        type: "photo_apres",
        filename: "after.jpg",
        url: "/uploads/after.jpg",
        createdAt: "2025-01-02T04:05:06.000Z",
      },
      {
        type: "signature_client",
        filename: "signature.png",
        url: "/uploads/signature.png",
        createdAt: "2025-01-02T05:06:07.000Z",
      },
      {
        type: "rapport_pdf",
        filename: "Rapport_123.pdf",
        url: "/uploads/report.pdf",
        createdAt: "2025-01-02T06:07:08.000Z",
      },
    ];

    expect(mapDetailArtifactPhotos(artifacts)).toEqual([
      {
        id: "before.jpg",
        dataUrl: "/uploads/before.jpg",
        type: "before",
        timestamp: new Date("2025-01-02T03:04:05.000Z"),
        caption: "before.jpg",
      },
      {
        id: "after.jpg",
        dataUrl: "/uploads/after.jpg",
        type: "after",
        timestamp: new Date("2025-01-02T04:05:06.000Z"),
        caption: "after.jpg",
      },
    ]);

    expect(mapDetailArtifactAttachments(artifacts)).toEqual([
      {
        name: "signature.png",
        url: "/uploads/signature.png",
        type: "signature_client",
      },
    ]);

    expect(findDetailArtifactReport(artifacts)).toEqual(artifacts[3]);
  });

  it("finds generated report PDFs by filename even when type differs", () => {
    const generatedReport = {
      type: "attachment",
      filename: "Bon-Intervention-456.pdf",
      url: "/uploads/generated-report.pdf",
      createdAt: "2025-01-02T06:07:08.000Z",
    };

    expect(findDetailArtifactReport([generatedReport])).toEqual(generatedReport);
  });
});
