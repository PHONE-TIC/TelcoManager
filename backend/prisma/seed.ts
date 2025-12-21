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

    // Créer les techniciens
    console.log('👨‍🔧 Création des techniciens...');

    const adminPassword = await bcrypt.hash('admin123', 10);
    const techPassword = await bcrypt.hash('tech123', 10);

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

    const tech1 = await prisma.technicien.upsert({
        where: { username: 'jdupont' },
        update: {},
        create: {
            nom: 'Jean Dupont',
            username: 'jdupont',
            passwordHash: techPassword,
            role: 'technicien',
            active: true
        }
    });

    const tech2 = await prisma.technicien.upsert({
        where: { username: 'mmartin' },
        update: {},
        create: {
            nom: 'Marie Martin',
            username: 'mmartin',
            passwordHash: techPassword,
            role: 'technicien',
            active: true
        }
    });

    const tech3 = await prisma.technicien.upsert({
        where: { username: 'pdurand' },
        update: {},
        create: {
            nom: 'Pierre Durand',
            username: 'pdurand',
            passwordHash: techPassword,
            role: 'technicien',
            active: true
        }
    });

    console.log(`   ✅ ${admin.nom}, ${tech1.nom}, ${tech2.nom}, ${tech3.nom}`);

    // Créer les clients
    console.log('👥 Création des clients...');

    const clients = await Promise.all([
        prisma.client.create({
            data: {
                nom: 'Boulangerie Le Pain Doré',
                sousLieu: 'Boutique principale',
                rue: '15 rue de la Paix',
                codePostal: '75001',
                ville: 'Paris',
                contact: 'Marie Dubois',
                telephone: '01 42 33 44 55',
                email: 'contact@paindore.fr',
                notes: 'Intervention préférentielle le matin avant 8h'
            }
        }),
        prisma.client.create({
            data: {
                nom: 'Restaurant Le Gourmet',
                rue: '28 avenue des Champs-Élysées',
                codePostal: '75008',
                ville: 'Paris',
                contact: 'Pierre Martin',
                telephone: '01 45 67 89 00',
                email: 'info@legourmet.fr',
                notes: 'Accès parking à l\'arrière'
            }
        }),
        prisma.client.create({
            data: {
                nom: 'Supermarché FreshMart',
                sousLieu: 'Rayon frais',
                rue: '45 boulevard Haussmann',
                codePostal: '75009',
                ville: 'Paris',
                contact: 'Sophie Leroy',
                telephone: '01 48 90 12 34',
                email: 'technique@freshmart.fr'
            }
        }),
        prisma.client.create({
            data: {
                nom: 'Hôtel Le Grand Luxe',
                sousLieu: 'Cuisine centrale',
                rue: '1 place Vendôme',
                codePostal: '75001',
                ville: 'Paris',
                contact: 'Jean-Claude Petit',
                telephone: '01 44 55 66 77',
                email: 'maintenance@grandluxe.fr',
                notes: 'Badge visiteur obligatoire à la réception'
            }
        }),
        prisma.client.create({
            data: {
                nom: 'Café de Flore',
                rue: '172 boulevard Saint-Germain',
                codePostal: '75006',
                ville: 'Paris',
                contact: 'Antoine Moreau',
                telephone: '01 45 48 55 26'
            }
        }),
        prisma.client.create({
            data: {
                nom: 'Traiteur Delices',
                rue: '8 rue du Commerce',
                codePostal: '69002',
                ville: 'Lyon',
                contact: 'Lucie Bernard',
                telephone: '04 72 33 44 55',
                email: 'contact@delices-lyon.fr'
            }
        }),
        prisma.client.create({
            data: {
                nom: 'Pâtisserie La Belle Époque',
                rue: '23 rue de la République',
                codePostal: '69001',
                ville: 'Lyon',
                contact: 'François Blanc',
                telephone: '04 78 12 34 56',
                notes: 'Chambre froide à vérifier régulièrement'
            }
        }),
        prisma.client.create({
            data: {
                nom: 'Bistrot du Port',
                rue: '15 quai du Port',
                codePostal: '13001',
                ville: 'Marseille',
                contact: 'Olivier Roux',
                telephone: '04 91 23 45 67',
                email: 'bistrotduport@gmail.com'
            }
        }),
        prisma.client.create({
            data: {
                nom: 'Poissonnerie Océan',
                sousLieu: 'Chambre froide',
                rue: '45 avenue du Prado',
                codePostal: '13008',
                ville: 'Marseille',
                contact: 'Mireille Castel',
                telephone: '04 91 78 90 12'
            }
        }),
        prisma.client.create({
            data: {
                nom: 'Boucherie Tradition',
                rue: '12 rue des Halles',
                codePostal: '31000',
                ville: 'Toulouse',
                contact: 'Marc Dupuy',
                telephone: '05 61 23 45 67',
                email: 'boucherie.tradition@orange.fr'
            }
        })
    ]);

    console.log(`   ✅ ${clients.length} clients créés`);

    // Créer les interventions
    console.log('📋 Création des interventions...');

    const today = new Date();

    const interventions = await Promise.all([
        prisma.intervention.create({
            data: {
                numero: 'RDV2025001',
                titre: 'Maintenance préventive chambre froide',
                description: 'Contrôle annuel et nettoyage des condenseurs',
                datePlanifiee: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
                statut: 'terminee',
                clientId: clients[0].id,
                technicienId: tech1.id
            }
        }),
        prisma.intervention.create({
            data: {
                numero: 'RDV2025002',
                titre: 'Réparation groupe froid',
                description: 'Remplacement du compresseur défaillant',
                datePlanifiee: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
                statut: 'terminee',
                clientId: clients[1].id,
                technicienId: tech2.id
            }
        }),
        prisma.intervention.create({
            data: {
                numero: 'RDV2025003',
                titre: 'Installation vitrine réfrigérée',
                description: 'Nouvelle vitrine pour pâtisseries',
                datePlanifiee: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
                statut: 'terminee',
                clientId: clients[4].id,
                technicienId: tech1.id
            }
        }),
        prisma.intervention.create({
            data: {
                numero: 'RDV2025004',
                titre: 'Dépannage urgent - température élevée',
                description: 'Chambre froide ne maintient pas la température',
                datePlanifiee: today,
                statut: 'en_cours',
                clientId: clients[2].id,
                technicienId: tech3.id
            }
        }),
        prisma.intervention.create({
            data: {
                numero: 'RDV2025005',
                titre: 'Contrôle périodique équipements',
                description: 'Vérification annuelle des installations frigorifiques',
                datePlanifiee: today,
                statut: 'en_cours',
                clientId: clients[3].id,
                technicienId: tech1.id
            }
        }),
        prisma.intervention.create({
            data: {
                numero: 'RDV2025006',
                titre: 'Maintenance préventive',
                description: 'Nettoyage et vérification du groupe froid',
                datePlanifiee: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000),
                statut: 'planifiee',
                clientId: clients[5].id,
                technicienId: tech2.id
            }
        }),
        prisma.intervention.create({
            data: {
                numero: 'RDV2025007',
                titre: 'Remplacement thermostat',
                description: 'Thermostat défectueux à remplacer',
                datePlanifiee: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
                statut: 'planifiee',
                clientId: clients[6].id,
                technicienId: tech3.id
            }
        }),
        prisma.intervention.create({
            data: {
                numero: 'RDV2025008',
                titre: 'Installation nouveau système',
                description: 'Mise en place d\'une nouvelle chambre froide',
                datePlanifiee: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
                statut: 'planifiee',
                clientId: clients[7].id,
                technicienId: tech1.id
            }
        }),
        prisma.intervention.create({
            data: {
                numero: 'RDV2025009',
                titre: 'Audit énergétique',
                description: 'Évaluation de la consommation des équipements',
                datePlanifiee: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000),
                statut: 'planifiee',
                clientId: clients[8].id,
                technicienId: tech2.id
            }
        }),
        prisma.intervention.create({
            data: {
                numero: 'RDV2025010',
                titre: 'Maintenance complète',
                description: 'Révision générale de tous les équipements',
                datePlanifiee: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
                statut: 'planifiee',
                clientId: clients[9].id,
                technicienId: tech3.id
            }
        })
    ]);

    console.log(`   ✅ ${interventions.length} interventions créées`);

    console.log('\n🎉 Seed terminé avec succès !');
    console.log('\n📌 Comptes de connexion :');
    console.log('   Admin: admin / admin123');
    console.log('   Technicien 1: jdupont / tech123');
    console.log('   Technicien 2: mmartin / tech123');
    console.log('   Technicien 3: pdurand / tech123');
}

main()
    .catch((e) => {
        console.error('❌ Erreur lors du seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
