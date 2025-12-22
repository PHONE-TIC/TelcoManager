import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Démarrage du seed...');

    console.log('🧹 Nettoyage des données existantes...');
    try {
        await prisma.intervention.deleteMany({});
        await prisma.client.deleteMany({});
        console.log('   ✅ Tables nettoyées');
    } catch (e) {
        console.log('   ℹ️  Tables déjà vides ou erreur mineure de nettoyage');
    }

    // Créer les techniciens (Admin seulement)
    console.log('👨‍🔧 Création des techniciens...');

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
    console.log('\n📌 Compte de connexion :');
    console.log('   Admin: admin / admin123');
}

main()
    .catch((e) => {
        console.error('❌ Erreur lors du seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
