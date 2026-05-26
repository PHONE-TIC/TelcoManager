const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Démarrage du seed (JS - Admin Only)...');

    const forceReset = process.env.SEED_ON_START === 'true';
    if (forceReset) {
        console.log('⚠️  Mode RESET activé : Réinitialisation forcée du mot de passe admin.');
    } else {
        console.log('ℹ️  Mode STANDARD : Création de l\'admin si inexistant (mot de passe préservé).');
    }

    console.log('👨‍🔧 Vérification/Création de l\'administrateur...');

    const rawPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    const adminPassword = await bcrypt.hash(rawPassword, 10);

    const admin = await prisma.technicien.upsert({
        where: { username: 'admin' },
        update: forceReset ? {
            passwordHash: adminPassword,
            role: 'admin',
            active: true
        } : {},
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
