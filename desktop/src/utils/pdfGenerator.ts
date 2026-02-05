import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Intervention {
    numero?: number;
    titre: string;
    description?: string;
    datePlanifiee: string;
    dateRealisee?: string;
    statut: string;
    notes?: string;
    client: {
        nom: string;
        contact: string;
        telephone: string;
        adresse?: string;
    };
    technicien?: {
        nom: string;
        username: string;
    };
    equipements?: any[];
}

export const generateInterventionPDF = (intervention: Intervention) => {
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = 20;

    // === EN-TÊTE ===
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    const numeroFormatted = intervention.numero ? `#${String(intervention.numero).padStart(5, '0')}` : '#-----';
    doc.text(`Rapport d'Intervention ${numeroFormatted}`, margin, yPosition);

    yPosition += 10;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text(intervention.titre, margin, yPosition);

    // Statut
    yPosition += 10;
    doc.setFontSize(10);
    const statusText = `Statut: ${getStatusLabel(intervention.statut)}`;
    doc.text(statusText, margin, yPosition);

    yPosition += 15;

    // === INFORMATIONS GÉNÉRALES ===
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Informations Générales', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Détails
    const infos = [
        ['Client:', intervention.client.nom],
        ['Contact:', `${intervention.client.contact} - ${intervention.client.telephone}`],
        ['Adresse:', intervention.client.adresse || 'Non renseignée'],
        ['Technicien:', intervention.technicien ? `${intervention.technicien.nom} (@${intervention.technicien.username})` : 'Non assigné'],
        ['Date planifiée:', new Date(intervention.datePlanifiee).toLocaleString('fr-FR')],
    ];

    if (intervention.dateRealisee) {
        infos.push(['Date réalisée:', new Date(intervention.dateRealisee).toLocaleString('fr-FR')]);
    }

    infos.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, margin, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(value, margin + 35, yPosition);
        yPosition += 6;
    });

    yPosition += 10;

    // === DESCRIPTION ===
    if (intervention.description) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Description', margin, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const descriptionLines = doc.splitTextToSize(intervention.description, pageWidth - 2 * margin);
        descriptionLines.forEach((line: string) => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }
            doc.text(line, margin, yPosition);
            yPosition += 5;
        });

        yPosition += 10;
    }

    // === COMMENTAIRES / NOTES ===
    if (intervention.notes) {
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Commentaires / Notes Techniques', margin, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const notesLines = doc.splitTextToSize(intervention.notes, pageWidth - 2 * margin);
        notesLines.forEach((line: string) => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }
            doc.text(line, margin, yPosition);
            yPosition += 5;
        });

        yPosition += 10;
    }

    // === ÉQUIPEMENTS (si présents) ===
    if (intervention.equipements && intervention.equipements.length > 0) {
        if (yPosition > 200) {
            doc.addPage();
            yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Équipements Utilisés', margin, yPosition);
        yPosition += 8;

        // Tableau des équipements
        const equipementsData = intervention.equipements.map((eq: any) => [
            eq.stock?.nomMateriel || 'N/A',
            eq.action || 'N/A',
            eq.quantite || '1',
            eq.notes || '-',
        ]);

        autoTable(doc, {
            startY: yPosition,
            head: [['Matériel', 'Action', 'Quantité', 'Notes']],
            body: equipementsData,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235], textColor: 255 },
            styles: { fontSize: 9 },
        });
    }

    // === SIGNATURES ===
    if (yPosition > 230) {
        doc.addPage();
        yPosition = 20;
    }
    yPosition += 10;

    // Technician Signature
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Signature Technicien', margin, yPosition);

    // Box for technician
    doc.setDrawColor(0);
    doc.rect(margin, yPosition + 5, 80, 25);

    const techSig = (intervention as any).signatureTechnicien;
    if (techSig) {
        try {
            const sigData = techSig.startsWith("data:image")
                ? techSig
                : `data:image/png;base64,${techSig}`;
            doc.addImage(sigData, "PNG", margin + 2, yPosition + 7, 76, 21);
        } catch (e) {
            console.warn("Could not add tech signature to PDF", e);
        }
    }

    // Client Signature
    doc.text('Signature Client', pageWidth / 2 + 10, yPosition);

    // Box for client
    doc.rect(pageWidth / 2 + 10, yPosition + 5, 80, 25);

    const clientSig = (intervention as any).signature || (intervention as any).signatureClient;
    if (clientSig) {
        try {
            const sigData = clientSig.startsWith("data:image")
                ? clientSig
                : `data:image/png;base64,${clientSig}`;
            doc.addImage(sigData, "PNG", pageWidth / 2 + 12, yPosition + 7, 76, 21);
        } catch (e) {
            console.warn("Could not add client signature to PDF", e);
        }
    }

    yPosition += 35;

    // === PIED DE PAGE ===
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(
            `Généré le ${new Date().toLocaleString('fr-FR')} - Page ${i} sur ${totalPages}`,
            margin,
            doc.internal.pageSize.getHeight() - 10
        );
    }

    // === TÉLÉCHARGEMENT ===
    const filename = intervention.numero
        ? `Intervention-${String(intervention.numero).padStart(5, '0')}.pdf`
        : `Intervention-${intervention.titre.substring(0, 20)}.pdf`;

    doc.save(filename);
};

// Helper pour formater le statut
function getStatusLabel(statut: string): string {
    const labels: { [key: string]: string } = {
        planifiee: 'Planifiée',
        en_cours: 'En cours',
        terminee: 'Terminée',
        annulee: 'Annulée',
    };
    return labels[statut] || statut;
}
