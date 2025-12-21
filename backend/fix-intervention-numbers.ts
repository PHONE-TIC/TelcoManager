import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixInterventionNumbers() {
    console.log('🔧 Correction des numéros d\'interventions...\n');

    try {
        // Récupérer toutes les interventions triées par date de création
        const allInterventions = await prisma.intervention.findMany({
            orderBy: {
                createdAt: 'asc'
            }
        });

        if (allInterventions.length === 0) {
            console.log('⚠️  Aucune intervention trouvée.');
            return;
        }

        console.log(`📋 ${allInterventions.length} intervention(s) trouvée(s)\n`);

        let nextNumero = 1;
        let updated = 0;

        // Mettre à jour chaque intervention
        for (const intervention of allInterventions) {
            // Mettre à jour seulement si le numéro n'existe pas ou est à 0
            if (!intervention.numero || intervention.numero === 0) {
                await prisma.intervention.update({
                    where: { id: intervention.id },
                    data: { numero: nextNumero }
                });

                console.log(`✅ Intervention "${intervention.titre}" → N° ${String(nextNumero).padStart(5, '0')}`);
                updated++;
            } else {
                console.log(`ℹ️  Intervention "${intervention.titre}" → Déjà numérotée (N° ${String(intervention.numero).padStart(5, '0')})`);
                // Ajuster nextNumero si nécessaire
                if (intervention.numero >= nextNumero) {
                    nextNumero = intervention.numero;
                }
            }
            nextNumero++;
        }

        if (updated > 0) {
            console.log(`\n🎉 Mise à jour terminée ! ${updated} intervention(s) numérotée(s).`);
        } else {
            console.log(`\n✅ Toutes les interventions ont déjà des numéros !`);
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixInterventionNumbers();
