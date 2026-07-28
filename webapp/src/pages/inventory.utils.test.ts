import { describe, it, expect } from 'vitest';
import { getInventoryDiscrepancies, getFilteredInventoryItems } from './inventory.utils';
import type { InventoryItem, InventorySession } from './inventory.types';

function buildItem(
    id: string,
    expectedQuantity: number,
    countedQuantity: number | null
): InventoryItem {
    return {
        id,
        stockId: `stock-${id}`,
        expectedQuantity,
        countedQuantity,
        stock: {
            nomMateriel: `Materiel ${id}`,
            reference: `REF-${id}`,
        },
    };
}

// conforme : compté et conforme au théorique
const conforme = buildItem('1', 5, 5);
// manquant : compté en dessous du théorique
const manquant = buildItem('2', 5, 3);
// excedent : compté au dessus du théorique
const excedent = buildItem('3', 5, 8);
// nonCompte : pas encore pointé
const nonCompte = buildItem('4', 5, null);
// zeroCompte : compté à zéro, ce qui reste un écart et non une absence de comptage
const zeroCompte = buildItem('5', 5, 0);

const session: InventorySession = {
    id: 'session-1',
    date: '2026-07-28T09:00:00.000Z',
    status: 'draft',
    items: [conforme, manquant, excedent, nonCompte, zeroCompte],
};

describe('Utilitaires d\'inventaire', () => {
    describe('getInventoryDiscrepancies', () => {
        it('retient les écarts en moins comme en plus', () => {
            const discrepancies = getInventoryDiscrepancies([conforme, manquant, excedent]);
            expect(discrepancies.map((item) => item.id)).toEqual(['2', '3']);
        });

        it('exclut les articles non encore comptés', () => {
            // Un article non pointé n'est pas un écart : l'inventaire est en cours.
            expect(getInventoryDiscrepancies([nonCompte])).toEqual([]);
        });

        it('traite un comptage à zéro comme un écart et non comme un non-comptage', () => {
            expect(getInventoryDiscrepancies([zeroCompte])).toHaveLength(1);
        });

        it('renvoie une liste vide pour un inventaire entièrement conforme', () => {
            expect(getInventoryDiscrepancies([conforme])).toEqual([]);
        });
    });

    describe('getFilteredInventoryItems', () => {
        it('renvoie tous les articles pour le filtre par défaut', () => {
            expect(getFilteredInventoryItems(session, 'all')).toHaveLength(5);
        });

        it('isole les articles restant à compter', () => {
            const items = getFilteredInventoryItems(session, 'uncounted');
            expect(items.map((item) => item.id)).toEqual(['4']);
        });

        it('isole les écarts', () => {
            const items = getFilteredInventoryItems(session, 'discrepancy');
            expect(items.map((item) => item.id)).toEqual(['2', '3', '5']);
        });

        it('isole les articles conformes', () => {
            const items = getFilteredInventoryItems(session, 'ok');
            expect(items.map((item) => item.id)).toEqual(['1']);
        });

        it('répartit chaque article dans exactement une catégorie', () => {
            const uncounted = getFilteredInventoryItems(session, 'uncounted').length;
            const discrepancy = getFilteredInventoryItems(session, 'discrepancy').length;
            const ok = getFilteredInventoryItems(session, 'ok').length;
            expect(uncounted + discrepancy + ok).toBe(session.items.length);
        });
    });
});
