import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getOfflineQueue,
    queueOfflineClosure,
    removeOfflineClosure,
    dataUrlToBlob,
    syncOfflineClosures,
    type OfflineClosure,
} from './offlineSync';
import { apiService } from '../services/api.service';

vi.mock('../services/api.service', () => ({
    apiService: {
        validateInterventionHours: vi.fn(),
        signIntervention: vi.fn(),
        updateInterventionStatus: vi.fn(),
        uploadInterventionArtifacts: vi.fn(),
    },
}));

function buildClosure(overrides: Partial<OfflineClosure> = {}): OfflineClosure {
    return {
        interventionId: 'int-1',
        numero: 'RDV2026001',
        heureArrivee: '2026-07-28T09:00',
        heureDepart: '2026-07-28T10:30',
        commentaireTechnicien: 'Remplacement du switch',
        photos: [],
        attachedFiles: [],
        ...overrides,
    };
}

describe('File d\'attente hors-ligne', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    describe('getOfflineQueue', () => {
        it('renvoie une file vide quand rien n\'a été mis en attente', () => {
            expect(getOfflineQueue()).toEqual([]);
        });

        it('ne propage pas d\'erreur si le stockage local est corrompu', () => {
            // Un JSON illisible ne doit pas bloquer l'application au démarrage.
            localStorage.setItem('offline_closures_queue', '{ceci n\'est pas du json');
            expect(getOfflineQueue()).toEqual([]);
        });
    });

    describe('queueOfflineClosure', () => {
        it('met une clôture en attente', () => {
            queueOfflineClosure(buildClosure());
            expect(getOfflineQueue()).toHaveLength(1);
            expect(getOfflineQueue()[0].numero).toBe('RDV2026001');
        });

        it('remplace l\'entrée existante d\'une même intervention au lieu de l\'empiler', () => {
            queueOfflineClosure(buildClosure({ commentaireTechnicien: 'Première saisie' }));
            queueOfflineClosure(buildClosure({ commentaireTechnicien: 'Saisie corrigée' }));

            const queue = getOfflineQueue();
            expect(queue).toHaveLength(1);
            expect(queue[0].commentaireTechnicien).toBe('Saisie corrigée');
        });

        it('conserve les clôtures d\'interventions distinctes', () => {
            queueOfflineClosure(buildClosure({ interventionId: 'int-1' }));
            queueOfflineClosure(buildClosure({ interventionId: 'int-2' }));
            expect(getOfflineQueue()).toHaveLength(2);
        });
    });

    describe('removeOfflineClosure', () => {
        it('retire uniquement l\'intervention ciblée', () => {
            queueOfflineClosure(buildClosure({ interventionId: 'int-1' }));
            queueOfflineClosure(buildClosure({ interventionId: 'int-2' }));

            removeOfflineClosure('int-1');

            const queue = getOfflineQueue();
            expect(queue).toHaveLength(1);
            expect(queue[0].interventionId).toBe('int-2');
        });
    });

    describe('dataUrlToBlob', () => {
        it('restitue le type MIME et la taille du contenu décodé', () => {
            // jsdom n'implémente pas Blob.text(), on vérifie la taille décodée.
            const blob = dataUrlToBlob('data:text/plain;base64,SGVsbG8=');
            expect(blob.type).toBe('text/plain');
            expect(blob.size).toBe(5); // "Hello"
        });

        it('décode correctement une charge utile binaire', () => {
            const blob = dataUrlToBlob('data:image/jpeg;base64,/9j/4AAQSkZJRg==');
            expect(blob.type).toBe('image/jpeg');
            expect(blob.size).toBe(10);
        });

        it('retombe sur un type générique quand la data URL ne déclare pas de type MIME', () => {
            expect(dataUrlToBlob('data:base64,SGVsbG8=').type).toBe('application/octet-stream');
        });
    });

    describe('syncOfflineClosures', () => {
        it('ne fait aucun appel réseau quand la file est vide', async () => {
            const result = await syncOfflineClosures();

            expect(result).toEqual({ successCount: 0, errorCount: 0 });
            expect(apiService.validateInterventionHours).not.toHaveBeenCalled();
        });

        it('vide la file après une synchronisation réussie', async () => {
            queueOfflineClosure(buildClosure());

            const result = await syncOfflineClosures();

            expect(result.successCount).toBe(1);
            expect(result.errorCount).toBe(0);
            expect(getOfflineQueue()).toHaveLength(0);
        });

        it('conserve la clôture en attente lorsque la synchronisation échoue', async () => {
            // Garantie anti-perte de données : un échec réseau ne doit jamais
            // faire disparaître le travail saisi sur le terrain.
            queueOfflineClosure(buildClosure());
            vi.mocked(apiService.updateInterventionStatus).mockRejectedValueOnce(
                new Error('Network Error')
            );

            const result = await syncOfflineClosures();

            expect(result.successCount).toBe(0);
            expect(result.errorCount).toBe(1);
            expect(getOfflineQueue()).toHaveLength(1);
        });

        it('poursuit la synchronisation des autres interventions après un échec isolé', async () => {
            queueOfflineClosure(buildClosure({ interventionId: 'int-1', numero: 'RDV001' }));
            queueOfflineClosure(buildClosure({ interventionId: 'int-2', numero: 'RDV002' }));
            vi.mocked(apiService.updateInterventionStatus).mockRejectedValueOnce(
                new Error('Network Error')
            );

            const result = await syncOfflineClosures();

            expect(result.successCount).toBe(1);
            expect(result.errorCount).toBe(1);
            // Seule l'intervention en échec reste en attente.
            const queue = getOfflineQueue();
            expect(queue).toHaveLength(1);
            expect(queue[0].interventionId).toBe('int-1');
        });

        it('téléverse les artefacts lorsque la clôture en comporte', async () => {
            queueOfflineClosure(
                buildClosure({
                    photos: [{ dataUrl: 'data:image/jpeg;base64,SGVsbG8=', type: 'before' }],
                    pdfDataUrl: 'data:application/pdf;base64,SGVsbG8=',
                })
            );

            await syncOfflineClosures();

            expect(apiService.uploadInterventionArtifacts).toHaveBeenCalledTimes(1);
            const formData = vi.mocked(apiService.uploadInterventionArtifacts).mock
                .calls[0][1] as FormData;
            expect(formData.getAll('files')).toHaveLength(2);
        });

        it('n\'appelle pas le téléversement quand il n\'y a aucun artefact', async () => {
            queueOfflineClosure(buildClosure());

            await syncOfflineClosures();

            expect(apiService.uploadInterventionArtifacts).not.toHaveBeenCalled();
        });

        it('n\'envoie que les signatures réellement saisies', async () => {
            queueOfflineClosure(
                buildClosure({ signatureTechnicien: 'data:image/png;base64,SGVsbG8=' })
            );

            await syncOfflineClosures();

            expect(apiService.signIntervention).toHaveBeenCalledTimes(1);
            expect(apiService.signIntervention).toHaveBeenCalledWith(
                'int-1',
                expect.objectContaining({ type: 'technicien' })
            );
        });

        it('rend compte de la progression à l\'appelant', async () => {
            queueOfflineClosure(buildClosure());
            const onProgress = vi.fn();

            await syncOfflineClosures(onProgress);

            expect(onProgress).toHaveBeenCalled();
            const messages = onProgress.mock.calls.map((call) => call[0] as string).join(' ');
            expect(messages).toContain('RDV2026001');
        });
    });
});
