import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
    getClosureDraftKey,
    saveClosureDraft,
    loadClosureDraft,
    clearClosureDraft,
    type ClosureDraft,
} from './technician-intervention-draft';

function buildDraft(overrides: Partial<ClosureDraft> = {}): ClosureDraft {
    return {
        step: 3,
        timeArrivee: '09:00',
        timeDepart: '10:30',
        commentaire: 'Remplacement du switch',
        billing: { maintenance: true, garantie: false, facturable: false },
        systemType: 'Téléphonie',
        clientRemarks: 'RAS',
        clientSigner: 'Jean Test',
        signatureTechnicien: 'data:image/png;base64,AAA',
        signatureClient: null,
        ...overrides,
    };
}

describe('Brouillon de clôture d\'intervention', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getClosureDraftKey', () => {
        it('isole les brouillons par intervention', () => {
            expect(getClosureDraftKey('int-1')).not.toBe(getClosureDraftKey('int-2'));
        });
    });

    describe('saveClosureDraft / loadClosureDraft', () => {
        it('restitue intégralement la saisie enregistrée', () => {
            const draft = buildDraft();
            saveClosureDraft('int-1', draft);

            expect(loadClosureDraft('int-1')).toEqual(draft);
        });

        it('conserve tous les champs du formulaire', () => {
            // Ce test est le garde-fou du refactoring : si un champ est ajouté
            // au brouillon sans être sérialisé, la saisie du technicien serait
            // silencieusement perdue.
            saveClosureDraft('int-1', buildDraft());
            const restored = loadClosureDraft('int-1');

            expect(Object.keys(restored ?? {}).sort()).toEqual(
                [
                    'billing',
                    'clientRemarks',
                    'clientSigner',
                    'commentaire',
                    'signatureClient',
                    'signatureTechnicien',
                    'step',
                    'systemType',
                    'timeArrivee',
                    'timeDepart',
                ].sort()
            );
        });

        it('conserve une étape à zéro et des champs vides', () => {
            // 0 et "" sont des valeurs significatives : elles ne doivent pas
            // être confondues avec une absence de donnée.
            const draft = buildDraft({ step: 0, commentaire: '', clientRemarks: '' });
            saveClosureDraft('int-1', draft);

            const restored = loadClosureDraft('int-1');
            expect(restored?.step).toBe(0);
            expect(restored?.commentaire).toBe('');
        });

        it('ne mélange pas les brouillons de deux interventions', () => {
            saveClosureDraft('int-1', buildDraft({ commentaire: 'Fiche 1' }));
            saveClosureDraft('int-2', buildDraft({ commentaire: 'Fiche 2' }));

            expect(loadClosureDraft('int-1')?.commentaire).toBe('Fiche 1');
            expect(loadClosureDraft('int-2')?.commentaire).toBe('Fiche 2');
        });

        it('écrase le brouillon précédent de la même intervention', () => {
            saveClosureDraft('int-1', buildDraft({ step: 1 }));
            saveClosureDraft('int-1', buildDraft({ step: 4 }));

            expect(loadClosureDraft('int-1')?.step).toBe(4);
        });

        it('n\'écrit rien sans identifiant d\'intervention', () => {
            saveClosureDraft(undefined, buildDraft());

            expect(localStorage.length).toBe(0);
        });

        it('renvoie null en l\'absence de brouillon', () => {
            expect(loadClosureDraft('int-inconnue')).toBeNull();
            expect(loadClosureDraft(undefined)).toBeNull();
        });

        it('ignore un brouillon illisible au lieu de bloquer la fiche', () => {
            localStorage.setItem(getClosureDraftKey('int-1'), '{ceci n\'est pas du json');

            expect(loadClosureDraft('int-1')).toBeNull();
        });

        it('ignore un contenu qui n\'est pas un objet', () => {
            localStorage.setItem(getClosureDraftKey('int-1'), 'null');

            expect(loadClosureDraft('int-1')).toBeNull();
        });

        it('n\'interrompt pas la saisie si le stockage est saturé', () => {
            // Une écriture impossible (quota atteint, navigation privée) ne doit
            // pas faire remonter d'exception dans le flux de saisie.
            vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new Error('QuotaExceededError');
            });

            expect(() => saveClosureDraft('int-1', buildDraft())).not.toThrow();
        });
    });

    describe('clearClosureDraft', () => {
        it('supprime le brouillon d\'une intervention clôturée', () => {
            saveClosureDraft('int-1', buildDraft());
            clearClosureDraft('int-1');

            expect(loadClosureDraft('int-1')).toBeNull();
        });

        it('ne touche pas aux brouillons des autres interventions', () => {
            saveClosureDraft('int-1', buildDraft());
            saveClosureDraft('int-2', buildDraft());

            clearClosureDraft('int-1');

            expect(loadClosureDraft('int-1')).toBeNull();
            expect(loadClosureDraft('int-2')).not.toBeNull();
        });

        it('reste sans effet sans identifiant', () => {
            saveClosureDraft('int-1', buildDraft());
            clearClosureDraft(undefined);

            expect(loadClosureDraft('int-1')).not.toBeNull();
        });
    });
});
