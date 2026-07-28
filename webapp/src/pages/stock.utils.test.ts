import { describe, it, expect } from 'vitest';
import { parseSerialNumbers } from './stock.utils';

describe('parseSerialNumbers (saisie de stock)', () => {
    it('découpe une saisie séparée par des virgules', () => {
        expect(parseSerialNumbers('SN1,SN2,SN3')).toEqual(['SN1', 'SN2', 'SN3']);
    });

    it('accepte les retours à la ligne comme séparateurs', () => {
        expect(parseSerialNumbers('SN1\nSN2')).toEqual(['SN1', 'SN2']);
    });

    it('applique la même normalisation que le backend', () => {
        // Le décompte affiché doit correspondre à ce qui sera réellement stocké.
        expect(parseSerialNumbers(' sn1 , sn2 ')).toEqual(['SN1', 'SN2']);
    });

    it('écarte les entrées vides issues de séparateurs consécutifs', () => {
        expect(parseSerialNumbers('SN1,,  ,\nSN2')).toEqual(['SN1', 'SN2']);
    });

    it('renvoie un tableau vide pour une saisie blanche', () => {
        expect(parseSerialNumbers('')).toEqual([]);
        expect(parseSerialNumbers('   ')).toEqual([]);
    });

    it('permet de détecter une saisie du même numéro sous deux formes', () => {
        const series = parseSerialNumbers('sn123, SN123');
        expect(new Set(series).size).toBe(1);
    });
});
