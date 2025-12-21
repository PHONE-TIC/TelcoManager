-- Script d'initialisation de la base de données
-- Ce script est exécuté automatiquement lors de la première création du conteneur PostgreSQL

-- Créer l'utilisateur et la base de données (déjà fait par les variables d'environnement)
-- Mais on peut ajouter des configurations supplémentaires ici si besoin

-- Extension pour UUID (si nécessaire)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Créer des index supplémentaires après le déploiement Prisma (optionnel)
-- Ces index seront créés par Prisma, mais on peut en ajouter d'autres ici

\echo 'Base de données initialisée avec succès!'
