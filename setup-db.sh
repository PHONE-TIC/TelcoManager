#!/bin/bash

# Script de configuration de la base de données PostgreSQL locale
# Ce script crée l'utilisateur et la base de données nécessaires

echo "🗄️  Configuration de PostgreSQL pour Stock & Interventions"
echo ""

# Créer l'utilisateur
echo "📝 Création de l'utilisateur stock_user..."
sudo -u postgres psql -c "CREATE USER stock_user WITH PASSWORD 'stock_password';" 2>/dev/null || echo "⚠️  L'utilisateur existe déjà"

# Créer la base de données
echo "📝 Création de la base de données stock_intervention_db..."
sudo -u postgres psql -c "CREATE DATABASE stock_intervention_db OWNER stock_user;" 2>/dev/null || echo "⚠️  La base de données existe déjà"

# Donner les privilèges
echo "📝 Attribution des privilèges..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE stock_intervention_db TO stock_user;"

echo ""
echo "✅ Configuration terminée !"
echo ""
echo "Prochaines étapes :"
echo "  1. cd backend"
echo "  2. npx prisma migrate dev --name init"
echo "  3. npm run seed"
echo "  4. npm run dev"
