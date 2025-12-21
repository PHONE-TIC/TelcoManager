#!/bin/bash

# Script de démarrage rapide du système
# Ce script lance le backend ET l'application desktop

echo "🚀 Démarrage du Système de Gestion de Stock & Interventions"
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ] && [ ! -d "backend" ]; then
    echo "❌ Erreur : Exécutez ce script depuis le répertoire stock-intervention-system"
    exit 1
fi

# Vérifier que PostgreSQL fonctionne
echo "🔍 Vérification de PostgreSQL..."
if ! pg_isready -q; then
    echo "⚠️  PostgreSQL ne semble pas démarré"
    echo "   Démarrez-le avec : sudo systemctl start postgresql"
    exit 1
fi

echo "✅ PostgreSQL est actif"
echo ""

# Démarrer le backend
echo "🔧 Démarrage du backend API..."
cd backend

# Vérifier que les node_modules existent
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances backend..."
    npm install
fi

# Vérifier que Prisma est généré
if [ ! -d "node_modules/@prisma/client" ]; then
    echo "🔧 Génération du client Prisma..."
    npx prisma generate
fi

# Démarrer le backend en arrière-plan
echo "▶️  Lancement du serveur backend..."
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "   PID du backend : $BACKEND_PID"

# Attendre que le backend soit prêt
echo "⏳ Attente du démarrage du backend..."
sleep 5

# Vérifier que le backend répond
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend opérationnel sur http://localhost:3001"
else
    echo "❌ Le backend ne répond pas"
    echo "   Consultez les logs : tail -f logs/backend.log"
    kill $BACKEND_PID
    exit 1
fi

cd ..

# Démarrer le desktop
echo ""
echo "💻 Démarrage de l'application desktop..."
cd desktop

# Vérifier que les node_modules existent
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances desktop..."
    npm install
fi

echo "▶️  Lancement de l'application..."
npm run dev

# Quand l'utilisateur ferme l'app, arrêter le backend
echo ""
echo "🛑 Arrêt du backend..."
kill $BACKEND_PID

echo "✅ Système arrêté proprement"
