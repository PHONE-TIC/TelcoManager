import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTechnicienTest() {
    try {
        // Vérifier si l'utilisateur existe déjà
        const existing = await prisma.technicien.findUnique({
            where: { username: 'technicien_test' }
        });

        if (existing) {
            console.log('❌ L\'utilisateur technicien_test existe déjà');
            console.log('Pour le recréer, supprimez-le d\'abord de la base de données');
            return;
        }

        // Hash du mot de passe
        const passwordHash = await bcrypt.hash('test123', 10);

        // Créer le technicien
        const technicien = await prisma.technicien.create({
            data: {
                nom: 'Technicien TEST',
                username: 'technicien_test',
                passwordHash: passwordHash,
                role: 'technicien',
                active: true
            }
        });

        console.log('✅ Technicien de test créé avec succès !');
        console.log('');
        console.log('📋 Informations de connexion :');
        console.log('   Username: technicien_test');
        console.log('   Password: test123');
        console.log('   Nom:      Technicien TEST');
        console.log('   Rôle:     technicien');
        console.log('');
        console.log('🔗 URL webapp: http://localhost:3003');

    } catch (error) {
        console.error('❌ Erreur lors de la création du technicien:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createTechnicienTest();
