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

type JsPdfWithAutoTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

type EquipmentRow = {
  text: string;
  quantity?: string;
  bold?: boolean;
  italic?: boolean;
};

const FOOTER_HEIGHT = 12;
const BOTTOM_RESERVED = 18;

function drawFooter(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  photos: Photo[]
) {
  const footerY = pageHeight - FOOTER_HEIGHT;

  if (photos.length > 0) {
    const photoSummary = [
      `${photos.filter((photo) => photo.type === "before").length} avant`,
      `${photos.filter((photo) => photo.type === "after").length} après`,
      `${photos.filter((photo) => photo.type === "other").length} autre`,
    ].join(" • ");
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text(`Photos jointes : ${photoSummary}`, margin, footerY - 3);
  }

  doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.rect(0, footerY, pageWidth, FOOTER_HEIGHT, "F");

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
}

function buildEquipmentRows(intervention: Intervention): EquipmentRow[] {
  const rows: EquipmentRow[] = [];

  if (!intervention.equipements || intervention.equipements.length === 0) {
    return rows;
  }

  const installed = intervention.equipements.filter(
    (eq) => eq.action === "install" || eq.action === "installe"
  );
  const retrieved = intervention.equipements.filter(
    (eq) => eq.action === "retrait" || eq.action === "retire"
  );

  const pushEquipment = (title: string, items: typeof intervention.equipements) => {
    if (!items.length) return;
    rows.push({ text: title, bold: true });
    items.forEach((eq) => {
      const name = eq.stock?.nomMateriel || eq.nom || "Matériel";
      const serialNumber = eq.stock?.numeroSerie || eq.serialNumber;
      const etat = eq.etat ? ` (${eq.etat.toUpperCase()})` : "";
      rows.push({
        text: `${name}${etat}`,
        quantity: String(eq.quantite || 1),
      });
      if (serialNumber) {
        rows.push({ text: `S/N: ${serialNumber}`, italic: true });
      }
      rows.push({ text: "" });
    });
  };

  pushEquipment("Installé :", installed);
  pushEquipment("Repris :", retrieved);

  while (rows.length > 0 && rows[rows.length - 1].text === "") {
    rows.pop();
  }

  return rows;
}

function drawPairedContentPages(
  doc: jsPDF,
  options: {
    startY: number;
    pageWidth: number;
    pageHeight: number;
    margin: number;
    leftTitle: string;
    rightTitle: string;
    leftLines: string[];
    rightRows: EquipmentRow[];
    photos: Photo[];
  }
): number {
  const {
    startY,
    pageWidth,
    pageHeight,
    margin,
    leftTitle,
    rightTitle,
    leftLines,
    rightRows,
    photos,
  } = options;

  const leftWidth = 115;
  const rightWidth = pageWidth - margin * 2 - leftWidth - 2;
  const rightX = margin + leftWidth + 2;
  const lineHeight = 5;
  const innerTop = 5;
  const headerHeight = 6;
  const maxBottomY = pageHeight - FOOTER_HEIGHT - BOTTOM_RESERVED;

  let y = startY;
  let leftIndex = 0;
  let rightIndex = 0;
  let firstPage = true;

  while (firstPage || leftIndex < leftLines.length || rightIndex < rightRows.length) {
    firstPage = false;
    const availableHeight = maxBottomY - y - headerHeight;
    const rowsPerPage = Math.max(1, Math.floor((availableHeight - innerTop) / lineHeight));
    const boxHeight = innerTop + rowsPerPage * lineHeight;

    doc.setFillColor(LIGHT_ORANGE[0], LIGHT_ORANGE[1], LIGHT_ORANGE[2]);
    doc.setDrawColor(ORANGE[0], ORANGE[1], ORANGE[2]);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, leftWidth, headerHeight, "FD");
    doc.rect(rightX, y, rightWidth, headerHeight, "FD");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text(leftTitle, margin + 2, y + 4);
    doc.text(rightTitle, rightX + 2, y + 4);

    const contentY = y + headerHeight;
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, contentY, leftWidth, boxHeight, "D");
    doc.rect(rightX, contentY, rightWidth, boxHeight, "D");
    doc.setFontSize(7);
    doc.text("Quantité", rightX + rightWidth - 18, contentY + 4);
    doc.line(
      rightX + rightWidth - 22,
      contentY,
      rightX + rightWidth - 22,
      contentY + boxHeight
    );

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    for (let i = 0; i < rowsPerPage; i += 1) {
      const currentLineY = contentY + innerTop + i * lineHeight;
      if (leftIndex < leftLines.length) {
        doc.text(leftLines[leftIndex], margin + 2, currentLineY);
        leftIndex += 1;
      }
      doc.setLineDashPattern([0.5, 1], 0);
      doc.line(margin + 2, currentLineY + 1, margin + leftWidth - 6, currentLineY + 1);
      doc.setLineDashPattern([], 0);
    }

    let currentRightY = contentY + innerTop;
    const quantityX = rightX + rightWidth - 12;
    while (rightIndex < rightRows.length && currentRightY <= contentY + boxHeight - 1) {
      const row = rightRows[rightIndex];
      if (row.bold) {
        doc.setFont("helvetica", "bold");
      } else if (row.italic) {
        doc.setFont("helvetica", "italic");
      } else {
        doc.setFont("helvetica", "normal");
      }
      doc.text(row.text, rightX + 4, currentRightY);
      if (row.quantity) {
        doc.setFont("helvetica", "normal");
        doc.text(row.quantity, quantityX, currentRightY);
      }
      rightIndex += 1;
      currentRightY += lineHeight;
    }

    y = contentY + boxHeight + 5;
    if (leftIndex < leftLines.length || rightIndex < rightRows.length) {
      drawFooter(doc, pageWidth, pageHeight, margin, photos);
      doc.addPage();
      y = 10;
    }
  }

  return y;
}

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
  photos: Photo[] = [],
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
      ? `${intervention.client.rue}, ${intervention.client.codePostal || ""} ${intervention.client.ville || ""
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

    y = (doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? y;

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

    y = ((doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? y) + 5;

    // ==========================================
    // OBJET & MATERIEL (Side by side with pagination)
    // ==========================================
    const objetLines = doc.splitTextToSize(
      intervention.commentaireTechnicien || "",
      109
    );
    const equipmentRows = buildEquipmentRows(intervention);

    y = drawPairedContentPages(doc, {
      startY: y,
      pageWidth,
      pageHeight,
      margin,
      leftTitle: "Objet :",
      rightTitle: "Matériel et numéro de série",
      leftLines: objetLines,
      rightRows: equipmentRows,
      photos,
    });

    // ==========================================
    // REMARQUES & SIGNATURE (Side by side)
    // ==========================================
    const remarquesWidth = 115;
    const signatureWidth = pageWidth - margin * 2 - remarquesWidth - 2;
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
    const techSig = intervention.signatureTechnicien;
    if (techSig) {
      try {

        // Ensure proper data URI prefix
        const sigData = techSig.startsWith("data:image")
          ? techSig
          : `data:image/png;base64,${techSig}`;

        doc.addImage(
          sigData,
          "PNG",
          sigX + 3,
          y + 23,
          signatureWidth - 6,
          12
        );

      } catch (e) {
        console.warn("Could not add technician signature image:", e);
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
    const clientSig = intervention.signature;
    if (clientSig) {
      try {

        const sigData = clientSig.startsWith("data:image")
          ? clientSig
          : `data:image/png;base64,${clientSig}`;

        doc.addImage(sigData, "PNG", sigX + 3, y + 43, signatureWidth - 6, 12);

      } catch (e) {
        console.warn("Could not add client signature image:", e);
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
    // FOOTER
    // ==========================================
    drawFooter(doc, pageWidth, pageHeight, margin, photos);

    // ==========================================
    // SAVE
    // ==========================================
    const filename = intervention.numero
      ? `Bon-Intervention-${String(intervention.numero).padStart(5, "0")}.pdf`
      : `Bon-Intervention-${new Date().toISOString().slice(0, 10)}.pdf`;

    if (returnBlob) {
      return doc.output("blob");
    }

    doc.save(filename);

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
