import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Démarrage du seed (JS)...');

    const forceReset = process.env.SEED_ON_START === 'true';
    if (forceReset) {
        console.log('⚠️  Mode RESET activé : Réinitialisation forcée du mot de passe admin.');
        console.log('🧹 Nettoyage des données existantes...');
        try {
            await prisma.intervention.deleteMany({});
            await prisma.client.deleteMany({});
            console.log('   ✅ Tables nettoyées');
        } catch (e) {
            console.log('   ℹ️  Tables déjà vides ou erreur mineure de nettoyage');
        }
    } else {
        console.log('ℹ️  Mode STANDARD : Création de l\'admin si inexistant (mot de passe préservé).');
    }

    // Créer uniquement l'admin
    console.log('👨‍🔧 Vérification/Création de l\'administrateur...');

    const adminPassword = await bcrypt.hash('admin123', 10);

    const admin = await prisma.technicien.upsert({
        where: { username: 'admin' },
        update: forceReset ? {
            passwordHash: adminPassword,
            role: 'admin',
            active: true
        } : {}, // Ne rien mettre à jour si l'admin existe et qu'on n'est pas en mode reset
        create: {
            nom: 'Administrateur',
            username: 'admin',
            passwordHash: adminPassword,
            role: 'admin',
            active: true
        }
    });

    console.log(`   ✅ Admin prêt : ${admin.nom}`);

    console.log('\n🎉 Seed terminé avec succès !');
}

main()
    .catch((e) => {
        console.error('❌ Erreur lors du seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
