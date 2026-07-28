import { describe, it, expect } from 'vitest';
import {
    canEditInterventionByRole,
    isInterventionClosed,
    mapDetailArtifactPhotos,
    mapDetailArtifactAttachments,
    findDetailArtifactReport,
    getInterventionBackState,
    type Artifact,
} from './intervention-detail.utils';

function buildArtifact(overrides: Partial<Artifact> = {}): Artifact {
    return {
        type: 'photo_avant',
        filename: 'photo_avant_1.jpg',
        url: '/uploads/interventions/int-1/photo_avant_1.jpg',
        createdAt: '2026-07-28T09:00:00.000Z',
        ...overrides,
    };
}

describe('Utilitaires de fiche intervention', () => {
    describe('canEditInterventionByRole', () => {
        it('autorise admin et gestionnaire quel que soit le statut', () => {
            expect(canEditInterventionByRole('admin', 'terminee')).toBe(true);
            expect(canEditInterventionByRole('gestionnaire', 'annulee')).toBe(true);
        });

        it('autorise le technicien sur une intervention planifiée ou en cours', () => {
            expect(canEditInterventionByRole('technicien', 'planifiee')).toBe(true);
            expect(canEditInterventionByRole('technicien', 'en_cours')).toBe(true);
        });

        it('interdit au technicien de modifier une intervention clôturée', () => {
            expect(canEditInterventionByRole('technicien', 'terminee')).toBe(false);
            expect(canEditInterventionByRole('technicien', 'annulee')).toBe(false);
        });

        it('refuse par défaut un rôle absent ou inconnu', () => {
            expect(canEditInterventionByRole(undefined, 'planifiee')).toBe(false);
            expect(canEditInterventionByRole('invite', 'planifiee')).toBe(false);
        });
    });

    describe('isInterventionClosed', () => {
        it('considère terminee et annulee comme clôturées', () => {
            expect(isInterventionClosed('terminee')).toBe(true);
            expect(isInterventionClosed('annulee')).toBe(true);
        });

        it('considère planifiee et en_cours comme ouvertes', () => {
            expect(isInterventionClosed('planifiee')).toBe(false);
            expect(isInterventionClosed('en_cours')).toBe(false);
        });
    });

    describe('mapDetailArtifactPhotos', () => {
        it('ne retient que les artefacts photo et traduit leur type', () => {
            const photos = mapDetailArtifactPhotos([
                buildArtifact({ type: 'photo_avant' }),
                buildArtifact({ type: 'photo_apres' }),
                buildArtifact({ type: 'photo_autre' }),
                buildArtifact({ type: 'rapport_pdf', filename: 'Rapport_RDV001.pdf' }),
            ]);

            expect(photos).toHaveLength(3);
            expect(photos.map((photo) => photo.type)).toEqual(['before', 'after', 'other']);
        });

        it('convertit la date de création en objet Date', () => {
            const [photo] = mapDetailArtifactPhotos([buildArtifact()]);
            expect(photo.timestamp).toBeInstanceOf(Date);
            expect(photo.timestamp.toISOString()).toBe('2026-07-28T09:00:00.000Z');
        });

        it('renvoie une liste vide sans artefact photo', () => {
            expect(mapDetailArtifactPhotos([buildArtifact({ type: 'rapport_pdf' })])).toEqual([]);
        });
    });

    describe('mapDetailArtifactAttachments', () => {
        it('exclut les photos et le rapport PDF', () => {
            const attachments = mapDetailArtifactAttachments([
                buildArtifact({ type: 'photo_avant' }),
                buildArtifact({ type: 'rapport_pdf', filename: 'Rapport_RDV001.pdf' }),
                buildArtifact({ type: 'piece_jointe', filename: 'devis.pdf' }),
            ]);

            expect(attachments).toHaveLength(1);
            expect(attachments[0].name).toBe('devis.pdf');
        });
    });

    describe('findDetailArtifactReport', () => {
        it('identifie le rapport par son type', () => {
            const report = findDetailArtifactReport([
                buildArtifact({ type: 'photo_avant' }),
                buildArtifact({ type: 'rapport_pdf', filename: 'peu-importe.pdf' }),
            ]);
            expect(report?.type).toBe('rapport_pdf');
        });

        it('identifie le rapport par convention de nommage quand le type est générique', () => {
            const report = findDetailArtifactReport([
                buildArtifact({ type: 'autre', filename: 'Rapport_RDV2026001.pdf' }),
            ]);
            expect(report?.filename).toBe('Rapport_RDV2026001.pdf');
        });

        it('reconnaît également les bons d\'intervention', () => {
            const report = findDetailArtifactReport([
                buildArtifact({ type: 'autre', filename: 'Bon-Intervention-001.pdf' }),
            ]);
            expect(report).toBeDefined();
        });

        it('ignore un fichier au nom évocateur mais sans extension PDF', () => {
            const report = findDetailArtifactReport([
                buildArtifact({ type: 'autre', filename: 'Rapport_RDV2026001.docx' }),
            ]);
            expect(report).toBeUndefined();
        });

        it('renvoie undefined quand aucun rapport n\'est présent', () => {
            expect(findDetailArtifactReport([buildArtifact()])).toBeUndefined();
        });
    });

    describe('getInterventionBackState', () => {
        it('restitue la vue calendrier d\'origine', () => {
            expect(getInterventionBackState('calendar')).toEqual({
                path: '/interventions',
                state: { viewMode: 'calendar' },
            });
        });

        it('restitue la vue complète d\'origine', () => {
            expect(getInterventionBackState('all')).toEqual({
                path: '/interventions',
                state: { viewMode: 'all' },
            });
        });

        it('retombe sur la liste sans état quand l\'origine est inconnue', () => {
            expect(getInterventionBackState()).toEqual({ path: '/interventions' });
        });
    });
});
