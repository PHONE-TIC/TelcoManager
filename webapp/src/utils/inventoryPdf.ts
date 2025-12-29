import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JsBarcode from "jsbarcode";
import moment from "moment";

interface InventoryItemPDF {
  stock?: {
    nomMateriel: string;
    reference: string;
    codeBarre?: string;
  };
  expectedQuantity: number;
  countedQuantity: number | null;
  notes?: string;
}

interface InventorySessionPDF {
  id?: string;
  date: string;
  status?: string;
  notes?: string;
  items: InventoryItemPDF[];
}

export const generateInventoryPDF = (session: InventorySessionPDF) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // --- Header ---
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text("Rapport d'Inventaire", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.text(`Réf: ${session.id}`, 14, 30);
  doc.text(`Date: ${moment(session.date).format("DD/MM/YYYY HH:mm")}`, 14, 35);
  doc.text(
    `Statut: ${session.status === "completed" ? "Finalisé" : "Brouillon"}`,
    14,
    40
  );

  if (session.notes) {
    doc.text(`Notes: ${session.notes}`, 14, 45);
  }

  // --- Barcode Helper ---
  // Create an off-screen canvas to generate barcode images
  const generateBarcodeDataUrl = (code: string) => {
    if (!code) return null;
    const canvas = document.createElement("canvas");
    try {
      JsBarcode(canvas, code, {
        format: "CODE128",
        width: 2,
        height: 40,
        displayValue: false,
        margin: 0,
      });
      return canvas.toDataURL("image/jpeg");
    } catch (e) {
      console.error("Barcode generation error", e);
      return null;
    }
  };

  // --- Table Data ---
  const tableBody = session.items.map((item) => {
    const barcodeData = item.stock?.codeBarre
      ? generateBarcodeDataUrl(item.stock.codeBarre)
      : null;

    return [
      item.stock?.nomMateriel || "Inconnu",
      item.stock?.reference || "-",
      // We'll define a custom drawCell for the barcode column later, but we pass data here just in case
      barcodeData || "-",
      item.expectedQuantity,
      item.countedQuantity !== null ? item.countedQuantity : "",
      item.notes || "",
    ];
  });

  // --- Table Generation ---
  autoTable(doc, {
    startY: 55,
    head: [
      [
        "Matériel",
        "Référence",
        "Code-barres",
        "Qte Théorique",
        "Qte Comptée",
        "Notes",
      ],
    ],
    body: tableBody,
    theme: "grid",
    styles: { fontSize: 8, valign: "middle" },
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 30 },
      2: { cellWidth: 40, minCellHeight: 15 }, // Barcode column
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 20, halign: "center", fontStyle: "bold" },
      5: { cellWidth: "auto" },
    },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 2) {
        const barcodeUrl = tableBody[data.row.index][2]; // Get pre-generated URL
        if (
          barcodeUrl &&
          typeof barcodeUrl === "string" &&
          barcodeUrl.startsWith("data:image")
        ) {
          // Calculate image dimensions to fit cell
          const imgWidth = 35;
          const imgHeight = 10;
          const x = data.cell.x + 2;
          const y = data.cell.y + 2;
          doc.addImage(barcodeUrl, "JPEG", x, y, imgWidth, imgHeight);
        }
      }
    },
  });

  // --- Footer ---
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Page ${i} / ${totalPages} - Généré le ${moment().format(
        "DD/MM/YYYY HH:mm"
      )}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
  }

  doc.save(`Inventaire_${moment(session.date).format("YYYY-MM-DD")}.pdf`);
};
