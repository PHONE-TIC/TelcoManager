import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Logo base64 will be loaded dynamically
let logoBase64: string | null = null;

async function loadLogo(): Promise<string | null> {
  try {
    const response = await fetch("/logo-phonetic.png");
    const blob = await response.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Could not load logo:", error);
    return null;
  }
}

// Update Interface to include new fields
import type { Intervention, Photo } from "../types";

// Extra data passed from Workflow
interface ExtraData {
  billing?: {
    maintenance: boolean;
    garantie: boolean;
    facturable: boolean;
  };
  systemType?: string;
  clientRemarks?: string;
  clientSigner?: string;
}

// Company info
const COMPANY = {
  name: "SARL PHONE & TIC",
  capital: "au capital de 10 000 €",
  siret: "SIRET : 509638227 RCS LE HAVRE",
  tva: "TVA : FR14509638227",
  address: "14-16 rue des Caraques 76700 HARFLEUR",
  tel: "Tél : 02 32 92 12 92",
};

// Colors
const ORANGE: [number, number, number] = [237, 125, 49];
const LIGHT_ORANGE: [number, number, number] = [253, 234, 218];
const BLACK: [number, number, number] = [0, 0, 0];

// Photo interface imported from types

export const generateInterventionPDF = async (
  intervention: Intervention,
  returnBlob = false,
  _photos: Photo[] = [],
  extraData: ExtraData = {}
): Promise<Blob | void> => {
  try {
    if (!logoBase64) {
      logoBase64 = await loadLogo();
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    let y = 10;

    // ==========================================
    // HEADER SECTION
    // ==========================================

    // Left column: Logo
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", margin, y, 45, 18);
    }

    // Company info below logo (left side)
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    const companyY = y + 20;
    doc.text(`${COMPANY.name} ${COMPANY.capital}`, margin, companyY);
    doc.text(COMPANY.siret, margin, companyY + 3.5);
    doc.text(COMPANY.tva, margin, companyY + 7);
    doc.text(COMPANY.address, margin, companyY + 10.5);
    doc.text(COMPANY.tel, margin, companyY + 14);

    // Title "BON D'INTERVENTION" (right side)
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
    doc.text("BON D'INTERVENTION", pageWidth - margin, y + 10, {
      align: "right",
    });

    y += 40;

    // ==========================================
    // DOCUMENT TYPE CHECKBOXES (Replaced by Billing Options)
    // ==========================================
    doc.setFontSize(10);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

    const checkItems = [
      {
        label: "Contrat de maintenance",
        checked: extraData.billing?.maintenance || false,
      },
      { label: "Garantie", checked: extraData.billing?.garantie || false },
      { label: "Facturable", checked: extraData.billing?.facturable || false },
    ];

    let checkX = margin;
    checkItems.forEach((item) => {
      // Draw checkbox
      doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
      doc.rect(checkX, y - 4, 4, 4);
      if (item.checked) {
        doc.setFont("helvetica", "bold");
        doc.text("X", checkX + 1, y - 0.5);
      }
      doc.setFont("helvetica", "normal");
      doc.text(item.label, checkX + 6, y);
      checkX += 55;
    });

    y += 10;

    // Technician line & Type
    doc.setFont("helvetica", "bold");
    doc.text("Technicien : ", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(
      intervention.technicien?.nom?.toUpperCase() || "NON ASSIGNÉ",
      margin + 22,
      y
    );

    // Type on the right side of the same line
    doc.setFont("helvetica", "bold");
    doc.text("Type :", pageWidth / 2 + 20, y);
    doc.setFont("helvetica", "normal");
    doc.text((intervention.type || "SAV").toUpperCase(), pageWidth / 2 + 35, y);

    y += 5;

    // ==========================================
    // CLIENT INFO TABLE
    // ==========================================
    const clientAddress = intervention.client?.rue
      ? `${intervention.client.rue}, ${intervention.client.codePostal || ""} ${
          intervention.client.ville || ""
        }`
      : intervention.client?.adresse || "";

    // Construct contact info string
    const contactInfo = [
      intervention.client?.contact,
      intervention.client?.telephone,
      intervention.client?.email,
    ]
      .filter(Boolean)
      .join(" - ");

    autoTable(doc, {
      startY: y,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: ORANGE,
        lineWidth: 0.3,
      },
      headStyles: {
        fillColor: LIGHT_ORANGE,
        textColor: BLACK,
        fontStyle: "bold",
      },
      head: [["Nom du client", "Lieu d'intervention", "Type de système"]],
      body: [
        [
          intervention.client?.nom || "",
          clientAddress + (contactInfo ? "\n" + contactInfo : ""),
          extraData.systemType || "",
        ],
      ],
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 75 },
        2: { cellWidth: 47 },
      },
    });

    y = (doc as any).lastAutoTable.finalY;

    // Time Calculation
    let timeString = "";
    if (intervention.heureArrivee && intervention.heureDepart) {
      const start = new Date(intervention.heureArrivee);
      const end = new Date(intervention.heureDepart);
      const diffMs = end.getTime() - start.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      timeString = `${hours}h ${minutes}m`;
    }

    // Options row with checkboxes
    autoTable(doc, {
      startY: y,
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 3,
        lineColor: ORANGE,
        lineWidth: 0.3,
        fontStyle: "bold",
      },
      body: [[`Temps : ${timeString}`]],
      // Expand to full width
      columnStyles: {
        0: { cellWidth: "auto" }, // auto layout
      },
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    // ==========================================
    // OBJET & MATERIEL (Side by side)
    // ==========================================
    const objetWidth = 115;
    const fournituresWidth = pageWidth - margin * 2 - objetWidth - 2;
    const contentHeight = 100;

    // Draw both headers backgrounds first to avoid color state issues
    doc.setFillColor(LIGHT_ORANGE[0], LIGHT_ORANGE[1], LIGHT_ORANGE[2]);
    doc.setDrawColor(ORANGE[0], ORANGE[1], ORANGE[2]);
    doc.setLineWidth(0.3);

    // Objet Header Background
    doc.rect(margin, y, objetWidth, 6, "FD");

    // Matériel Header Background
    const fourX = margin + objetWidth + 2;
    doc.rect(fourX, y, fournituresWidth, 6, "FD");

    // Then add text
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);

    doc.text("Objet :", margin + 2, y + 4);
    doc.text("Matériel et numéro de série", fourX + 2, y + 4);

    y += 6;

    // Objet content box
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, objetWidth, contentHeight, "D");

    // Matériel content box with Quantité column
    doc.rect(fourX, y, fournituresWidth, contentHeight, "D");

    // Quantité sub-header
    doc.setFontSize(7);
    doc.text("Quantité", fourX + fournituresWidth - 18, y + 4);
    doc.line(
      fourX + fournituresWidth - 22,
      y,
      fourX + fournituresWidth - 22,
      y + contentHeight
    );

    // Fill Objet with dotted lines and text
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    // Content: ONLY Commentaire Technicien as requested
    const objetContent = intervention.commentaireTechnicien || "";

    const objetLines = doc.splitTextToSize(objetContent, objetWidth - 6);

    // Draw lines for structure - limit to 19 lines to stay within contentHeight
    for (let i = 0; i < 19; i++) {
      const currentLineY = y + 5 + i * 5;
      if (i < objetLines.length) {
        doc.text(objetLines[i], margin + 2, currentLineY);
      }
      // Dotted line - stop well before the right edge
      doc.setLineDashPattern([0.5, 1], 0);
      doc.line(
        margin + 2,
        currentLineY + 1,
        margin + objetWidth - 6,
        currentLineY + 1
      );
      doc.setLineDashPattern([], 0);
    }

    // Fill Matériel - Split into Installed and Retrieved sections
    if (intervention.equipements && intervention.equipements.length > 0) {
      const installed = intervention.equipements.filter(
        (eq) => eq.action === "install" || eq.action === "installe"
      );
      const retrieved = intervention.equipements.filter(
        (eq) => eq.action === "retrait" || eq.action === "retire"
      );

      let fourY = y + 5;
      const maxWidth = fournituresWidth - 26; // Leave space for quantity column

      // Installed equipment section
      if (installed.length > 0) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text("[+] Installé:", fourX + 2, fourY);
        fourY += 4;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);

        installed.forEach((eq) => {
          const name = eq.stock?.nomMateriel || eq.nom || "Matériel";
          const serialNumber = eq.stock?.numeroSerie || eq.serialNumber;

          // Split name if too long
          const nameLines = doc.splitTextToSize(name, maxWidth);
          nameLines.forEach((line: string) => {
            doc.text(line, fourX + 4, fourY);
            fourY += 3.5;
          });

          // Serial number on new line if exists
          if (serialNumber) {
            doc.setFont("helvetica", "italic");
            doc.text(`S/N: ${serialNumber}`, fourX + 4, fourY);
            doc.setFont("helvetica", "normal");
            fourY += 3.5;
          }

          // Quantity
          doc.text(
            String(eq.quantite || 1),
            fourX + fournituresWidth - 12,
            fourY - (serialNumber ? 3.5 : 0) - (nameLines.length - 1) * 3.5
          );

          fourY += 2; // Space between items
        });
      }

      // Retrieved equipment section
      if (retrieved.length > 0) {
        fourY += 2; // Extra space between sections
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text("[-] Repris:", fourX + 2, fourY);
        fourY += 4;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);

        retrieved.forEach((eq) => {
          const name = eq.stock?.nomMateriel || eq.nom || "Matériel";
          const serialNumber = eq.stock?.numeroSerie || eq.serialNumber;
          const etat = eq.etat ? ` (${eq.etat.toUpperCase()})` : "";

          // Split name if too long
          const nameLines = doc.splitTextToSize(name + etat, maxWidth);
          nameLines.forEach((line: string) => {
            doc.text(line, fourX + 4, fourY);
            fourY += 3.5;
          });

          // Serial number on new line if exists
          if (serialNumber) {
            doc.setFont("helvetica", "italic");
            doc.text(`S/N: ${serialNumber}`, fourX + 4, fourY);
            doc.setFont("helvetica", "normal");
            fourY += 3.5;
          }

          // Quantity
          doc.text(
            String(eq.quantite || 1),
            fourX + fournituresWidth - 12,
            fourY - (serialNumber ? 3.5 : 0) - (nameLines.length - 1) * 3.5
          );

          fourY += 2; // Space between items
        });
      }
    }

    y += contentHeight + 5;

    // ==========================================
    // REMARQUES & SIGNATURE (Side by side)
    // ==========================================
    const remarquesWidth = objetWidth;
    const signatureWidth = fournituresWidth;
    const bottomHeight = 40;

    // Remarques section
    doc.setFillColor(LIGHT_ORANGE[0], LIGHT_ORANGE[1], LIGHT_ORANGE[2]);
    doc.rect(margin, y, remarquesWidth, 6, "FD");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Remarques Client :", margin + 2, y + 4);
    doc.rect(margin, y + 6, remarquesWidth, bottomHeight, "D");

    // Notes content (CLIENT REMARKS)
    if (extraData.clientRemarks) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const notesLines = doc.splitTextToSize(
        extraData.clientRemarks,
        remarquesWidth - 4
      );
      notesLines.slice(0, 10).forEach((line: string, i: number) => {
        doc.text(line, margin + 2, y + 11 + i * 4);
      });
    }

    // Signature section (right side)
    const sigX = margin + remarquesWidth + 2;

    // Date line
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setDrawColor(ORANGE[0], ORANGE[1], ORANGE[2]);
    doc.rect(sigX, y, signatureWidth, 8, "D");
    doc.text("Date :", sigX + 2, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(
      formatDate(intervention.dateRealisee || intervention.datePlanifiee),
      sigX + 15,
      y + 5
    );

    // Nom de signature line
    doc.rect(sigX, y + 8, signatureWidth, 8, "D");
    doc.setFont("helvetica", "bold");
    doc.text("Nom de signature :", sigX + 2, y + 13);
    doc.setFont("helvetica", "normal");
    // Use the explicit clientSigner name provided in closure
    doc.text(
      extraData.clientSigner || intervention.client?.contact || "",
      sigX + 35,
      y + 13
    );

    // Signature header - Technician
    doc.setFillColor(LIGHT_ORANGE[0], LIGHT_ORANGE[1], LIGHT_ORANGE[2]);
    doc.rect(sigX, y + 16, signatureWidth, 6, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("Signature Technicien", sigX + 2, y + 20);

    // Technician Signature box
    doc.setFillColor(255, 255, 255);
    doc.rect(sigX, y + 22, signatureWidth, 14, "D");

    // Add technician signature image if available
    if (intervention.signatureTechnicien) {
      try {
        doc.addImage(
          intervention.signatureTechnicien,
          "PNG",
          sigX + 3,
          y + 23,
          signatureWidth - 6,
          12
        );
      } catch (e) {
        console.warn("Could not add technician signature image");
      }
    }

    // Signature header - Client
    doc.setFillColor(LIGHT_ORANGE[0], LIGHT_ORANGE[1], LIGHT_ORANGE[2]);
    doc.rect(sigX, y + 36, signatureWidth, 6, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("Signature Client", sigX + 2, y + 40);

    // Client Signature box
    doc.setFillColor(255, 255, 255);
    doc.rect(sigX, y + 42, signatureWidth, 14, "D");

    // Add client signature image if available
    if (intervention.signatureClient || intervention.signature) {
      try {
        const sigData = intervention.signatureClient || intervention.signature;
        doc.addImage(sigData!, "PNG", sigX + 3, y + 43, signatureWidth - 6, 12);
      } catch (e) {
        console.warn("Could not add client signature image");
      }
    }

    // Legal text
    doc.setFontSize(6);
    doc.setFont("helvetica", "italic");
    doc.text(
      "Reconnais avoir pris connaissance et accepter les conditions",
      sigX + 2,
      y + 60
    );
    doc.text("générales de vente figurant au verso.", sigX + 2, y + 63);

    // ==========================================
    // NO PHOTOS generated
    // ==========================================
    console.log("Photos page skipped as requested.");

    // ==========================================
    // FOOTER
    // ==========================================
    const footerY = pageHeight - 12;
    doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
    doc.rect(0, footerY, pageWidth, 12, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("14 - 16 rue des Caraques 76700 Harfleur", margin, footerY + 4);
    doc.text("SIRET : 88225893200012", margin, footerY + 8);
    doc.text("TVA : FR82862250932", margin + 40, footerY + 8);

    doc.text(
      "SARL PHONE & TIC au capital de 10 000 €",
      pageWidth / 2 + 10,
      footerY + 4
    );
    doc.text(
      "02 32 92 12 92 - contact@phone-tic.fr",
      pageWidth / 2 + 10,
      footerY + 8
    );
    doc.text("www.phone-tic.fr", pageWidth - margin, footerY + 6, {
      align: "right",
    });

    // ==========================================
    // SAVE
    // ==========================================
    const filename = intervention.numero
      ? `Bon-Intervention-${String(intervention.numero).padStart(5, "0")}.pdf`
      : `Bon-Intervention-${new Date().toISOString().slice(0, 10)}.pdf`;

    if (returnBlob) {
      console.log("Returning PDF as Blob");
      return doc.output("blob");
    }

    console.log("Generating professional PDF:", filename);
    doc.save(filename);
    console.log("PDF saved successfully");
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Erreur lors de la génération du PDF: " + (error as Error).message);
  }
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR");
  } catch {
    return dateStr;
  }
}
