import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatDateTimeLocal, formatTimeLocal, isToday } from './dateUtils';

describe('Utilitaires de date', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    describe('formatDateTimeLocal', () => {
        it('produit le format attendu par un champ datetime-local', () => {
            const date = new Date(2026, 6, 28, 9, 5); // 28 juillet 2026, 09:05 local
            expect(formatDateTimeLocal(date)).toBe('2026-07-28T09:05');
        });

        it('complète mois, jour, heures et minutes sur deux chiffres', () => {
            const date = new Date(2026, 0, 3, 7, 4);
            expect(formatDateTimeLocal(date)).toBe('2026-01-03T07:04');
        });

        it('reste en heure locale et ne bascule pas en UTC', () => {
            // Le décalage UTC ferait apparaître une heure différente de celle saisie.
            const date = new Date(2026, 6, 28, 23, 30);
            expect(formatDateTimeLocal(date)).toBe('2026-07-28T23:30');
        });

        it('accepte une date fournie sous forme de chaîne', () => {
            expect(formatDateTimeLocal('2026-07-28T09:05:00')).toBe('2026-07-28T09:05');
        });
    });

    describe('formatTimeLocal', () => {
        it('extrait l\'heure au format HH:mm', () => {
            expect(formatTimeLocal(new Date(2026, 6, 28, 14, 7))).toBe('14:07');
        });

        it('représente minuit en 00:00', () => {
            expect(formatTimeLocal(new Date(2026, 6, 28, 0, 0))).toBe('00:00');
        });
    });

    describe('isToday', () => {
        it('reconnaît la date du jour', () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 6, 28, 12, 0));
            expect(isToday(new Date(2026, 6, 28, 8, 30))).toBe(true);
        });

        it('rejette la veille et le lendemain', () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 6, 28, 12, 0));
            expect(isToday(new Date(2026, 6, 27, 23, 59))).toBe(false);
            expect(isToday(new Date(2026, 6, 29, 0, 1))).toBe(false);
        });

        it('rejette le même jour et mois d\'une autre année', () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2026, 6, 28, 12, 0));
            expect(isToday(new Date(2025, 6, 28, 12, 0))).toBe(false);
        });
    });
});
