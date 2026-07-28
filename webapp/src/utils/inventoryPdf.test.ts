import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateInventoryPDF } from './inventoryPdf';

// Test de fumée de la génération PDF d'inventaire. Il ne vérifie pas le rendu
// visuel, mais garantit que la chaîne jsPDF + autoTable reste fonctionnelle —
// notamment après une montée de version majeure de jspdf.
//
// L'implémentation réelle de jsPDF est conservée : seule la sauvegarde finale
// est neutralisée, car hors navigateur elle écrirait le PDF sur le disque.
// `save` étant définie sur l'instance et non sur le prototype, elle ne peut pas
// être interceptée par un simple spy — d'où la sous-classe ci-dessous.
const saveSpy = vi.fn();

vi.mock('jspdf', async (importOriginal) => {
    const actual = await importOriginal<typeof import('jspdf')>();
    const RealJsPDF = actual.default;

    class TestJsPDF extends RealJsPDF {
        constructor(...args: ConstructorParameters<typeof RealJsPDF>) {
            super(...args);
            this.save = saveSpy as unknown as typeof this.save;
        }
    }

    return { ...actual, default: TestJsPDF, jsPDF: TestJsPDF };
});

describe('generateInventoryPDF', () => {
    beforeEach(() => {
        saveSpy.mockClear();
    });

    const session = {
        id: 'session-1',
        date: '2026-07-28T09:00:00.000Z',
        status: 'completed',
        notes: 'Inventaire trimestriel',
        items: [
            {
                stock: { nomMateriel: 'Routeur', reference: 'RT-01', codeBarre: '123456789' },
                expectedQuantity: 5,
                countedQuantity: 5,
            },
            {
                stock: { nomMateriel: 'Switch', reference: 'SW-01' },
                expectedQuantity: 3,
                countedQuantity: 1,
                notes: 'Deux unités introuvables',
            },
        ],
    };

    it('génère un PDF sans lever d\'erreur', () => {
        expect(() => generateInventoryPDF(session)).not.toThrow();
        expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('nomme le fichier d\'après la date de la session', () => {
        generateInventoryPDF(session);
        expect(saveSpy).toHaveBeenCalledWith('Inventaire_2026-07-28.pdf');
    });

    it('accepte un inventaire sans aucun article', () => {
        expect(() =>
            generateInventoryPDF({ date: '2026-07-28T09:00:00.000Z', items: [] })
        ).not.toThrow();
    });

    it('accepte des articles non encore comptés', () => {
        expect(() =>
            generateInventoryPDF({
                date: '2026-07-28T09:00:00.000Z',
                items: [
                    {
                        stock: { nomMateriel: 'Routeur', reference: 'RT-01' },
                        expectedQuantity: 5,
                        countedQuantity: null,
                    },
                ],
            })
        ).not.toThrow();
    });

    it('accepte un article dépourvu de données de stock', () => {
        expect(() =>
            generateInventoryPDF({
                date: '2026-07-28T09:00:00.000Z',
                items: [{ expectedQuantity: 1, countedQuantity: 1 }],
            })
        ).not.toThrow();
    });

    it('reste fonctionnel quand la génération de code-barres échoue', () => {
        // Sans canvas dans jsdom, JsBarcode échoue : le PDF doit tout de même
        // être produit, sans code-barres.
        expect(() => generateInventoryPDF(session)).not.toThrow();
    });
});
