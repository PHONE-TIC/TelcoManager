import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Démarrage du seed (JS - Admin Only)...');

    console.log('🧹 Nettoyage des données existantes...');
    try {
        await prisma.intervention.deleteMany({});
        await prisma.client.deleteMany({});
        console.log('   ✅ Tables nettoyées');
    } catch (e) {
        console.log('   ℹ️  Tables déjà vides ou erreur mineure de nettoyage');
    }

    // Créer uniquement l'admin
    console.log('👨‍🔧 Création de l\'administrateur...');

    const adminPassword = await bcrypt.hash('admin123', 10);

    const admin = await prisma.technicien.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            nom: 'Administrateur',
            username: 'admin',
            passwordHash: adminPassword,
            role: 'admin',
            active: true
        }
    });

    console.log(`   ✅ Admin créé : ${admin.nom}`);

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
