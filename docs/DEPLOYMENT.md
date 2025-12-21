# Guide de Déploiement

Ce guide explique comment déployer le système de gestion de stock et d'interventions en production.

## 🐳 Déploiement avec Docker (Recommandé)

### Prérequis

- Serveur Ubuntu/Debian avec Docker et Docker Compose installés
- Au moins 2GB de RAM
- 10GB d'espace disque disponible
- Ports 3001 et 5432 disponibles (ou configurables)

### Installation de Docker

Si Docker n'est pas déjà installé :

```bash
# Installation Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installation Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Ajouter votre utilisateur au groupe docker
sudo usermod -aG docker $USER
# Se déconnecter et reconnecter pour appliquer les changements
```

### Étapes de Déploiement

#### 1. Préparation du serveur

```bash
# Se connecter au serveur
ssh user@your-server.com

# Créer le répertoire de l'application
mkdir -p /opt/stock-intervention
cd /opt/stock-intervention

# Transférer les fichiers du projet
# Option 1: Via Git
git clone https://your-repo-url.git .

# Option 2: Via SCP depuis votre machine locale
scp -r ./stock-intervention-system user@your-server:/opt/stock-intervention
```

#### 2. Configuration

```bash
# Créer le fichier .env
cp .env.example .env
nano .env
```

Modifiez les valeurs suivantes dans `.env` :

```env
# IMPORTANT: Changer ces valeurs en production !
POSTGRES_PASSWORD=your_secure_password_here
JWT_SECRET=your_very_long_secure_random_string_here

# Optionnel: Changer le mot de passe admin par défaut
DEFAULT_ADMIN_PASSWORD=your_admin_password

# Ajuster les ports si nécessaire
PORT=3001
```

#### 3. Premier Démarrage

```bash
# Construire et démarrer les services
docker-compose up -d

# Vérifier que les services sont en cours d'exécution
docker-compose ps

# Vérifier les logs
docker-compose logs -f
```

#### 4. Initialisation de la Base de Données

```bash
# Accéder au conteneur backend
docker-compose exec backend sh

# À l'intérieur du conteneur:
npx prisma migrate deploy
npm run seed

# Sortir du conteneur
exit
```

#### 5. Vérification

```bash
# Test de santé de l'API
curl http://localhost:3001/health

# Devrait retourner: {"status":"ok","timestamp":"..."}
```

### Configuration Réseau

#### Exposer l'API via Nginx (Recommandé)

```bash
# Installer Nginx
sudo apt-get install nginx

# Créer la configuration
sudo nano /etc/nginx/sites-available/stock-intervention
```

Contenu de la configuration :

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Activez la configuration :

```bash
sudo ln -s /etc/nginx/sites-available/stock-intervention /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### SSL avec Let's Encrypt (Recommandé)

```bash
# Installer Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtenir un certificat SSL
sudo certbot --nginx -d your-domain.com

# Le certificat sera automatiquement renouvelé
```

## 🔄 Maintenance

### Mise à Jour du Système

```bash
cd /opt/stock-intervention

# Arrêter les services
docker-compose down

# Backup de la base de données
docker-compose exec postgres pg_dump -U stock_user stock_intervention_db > backup_$(date +%Y%m%d).sql

# Mettre à jour le code
git pull  # ou transférer les nouveaux fichiers

# Reconstruire et redémarrer
docker-compose up -d --build

# Appliquer les migrations
docker-compose exec backend npx prisma migrate deploy
```

### Sauvegardes Automatiques

Créez un script de sauvegarde :

```bash
sudo nano /opt/stock-intervention/backup.sh
```

Contenu :

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/stock-intervention"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker-compose -f /opt/stock-intervention/docker-compose.yml exec -T postgres \
  pg_dump -U stock_user stock_intervention_db > "$BACKUP_DIR/db_$DATE.sql"

# Garder seulement les 30 derniers backups
find $BACKUP_DIR -name "db_*.sql" -mtime +30 -delete

echo "Backup completed: $DATE"
```

Rendre le script exécutable :

```bash
chmod +x /opt/stock-intervention/backup.sh
```

Ajouter au cron pour une exécution quotidienne :

```bash
crontab -e

# Ajouter cette ligne (backup tous les jours à 2h du matin)
0 2 * * * /opt/stock-intervention/backup.sh >> /var/log/stock-backup.log 2>&1
```

### Surveillance des Services

```bash
# Voir les logs en temps réel
docker-compose logs -f

# Voir les logs d'un service spécifique
docker-compose logs -f backend
docker-compose logs -f postgres

# Vérifier l'utilisation des ressources
docker stats
```

### Redémarrage des Services

```bash
# Redémarrer tous les services
docker-compose restart

# Redémarrer un service spécifique
docker-compose restart backend
docker-compose restart postgres
```

## 🔐 Sécurité en Production

### Checklist de Sécurité

- [ ] Changer le mot de passe PostgreSQL par défaut
- [ ] Changer la clé JWT_SECRET
- [ ] Changer le mot de passe admin par défaut après la première connexion
- [ ] Activer HTTPS (SSL/TLS)
- [ ] Configurer le pare-feu (ufw)
- [ ] Limiter l'accès SSH
- [ ] Mettre à jour régulièrement le système
- [ ] Configurer des backups automatiques

### Configuration du Pare-feu

```bash
# Installer ufw si nécessaire
sudo apt-get install ufw

# Configurer les règles
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# Activer le pare-feu
sudo ufw enable

# Vérifier le statut
sudo ufw status
```

## 📊 Monitoring

### Logs d'Application

```bash
# Logs backend
docker-compose logs --tail=100 -f backend

# Logs base de données
docker-compose logs --tail=100 -f postgres
```

### Métriques Système

```bash
# Utilisation disque
df -h

# Utilisation mémoire
free -h

# Processus Docker
docker ps -a

# Utilisation des ressources par conteneur
docker stats
```

## 🚨 Dépannage

### Le backend ne démarre pas

```bash
# Vérifier les logs
docker-compose logs backend

# Vérifier que PostgreSQL est accessible
docker-compose exec backend ping postgres

# Reconstruire les images
docker-compose build --no-cache
docker-compose up -d
```

### Erreur de connexion à la base de données

```bash
# Vérifier que PostgreSQL est en cours d'exécution
docker-compose ps postgres

# Vérifier les logs PostgreSQL
docker-compose logs postgres

# Se connecter manuellement à PostgreSQL
docker-compose exec postgres psql -U stock_user -d stock_intervention_db
```

### Réinitialisation Complète

⚠️ **ATTENTION** : Ceci supprimera toutes les données !

```bash
# Arrêter et supprimer tout
docker-compose down -v

# Supprimer les volumes
docker volume prune

# Redémarrer
docker-compose up -d

# Réinitialiser la base de données
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npm run seed
```

## 📱 Déploiement de l'Application Desktop

### Construction des Packages

Sur une machine de développement :

```bash
cd desktop

# Build Linux (.deb)
npm run build:linux

# Build Windows (.exe) - nécessite Wine sur Linux ou Windows
npm run build:win
```

Les packages seront dans `desktop/dist/`

### Distribution

1. **Pour Linux** : Distribuez le fichier `.deb`
   ```bash
   # Installation
   sudo dpkg -i stock-intervention_1.0.0_amd64.deb
   
   # Lancement
   stock-intervention
   ```

2. **Pour Windows** : Distribuez le fichier `.exe`
   - Double-cliquer sur l'installateur
   - Suivre l'assistant d'installation

### Configuration Client

Les utilisateurs devront configurer l'URL de l'API dans l'application. Modifiez `desktop/src/services/api.service.ts` avant le build :

```typescript
const API_URL = 'https://your-domain.com/api';  // URL de production
```

## 🔄 Mise à l'Échelle

### Augmenter les Ressources PostgreSQL

Modifier `docker-compose.yml` :

```yaml
postgres:
  # ...
  command: postgres -c max_connections=200 -c shared_buffers=256MB
```

### Plusieurs Instances Backend (Load Balancing)

Utiliser Docker Swarm ou Kubernetes pour déployer plusieurs instances du backend derrière un load balancer.

## 📞 Support et Maintenance

- Vérifier régulièrement les logs pour détecter les erreurs
- Tester les backups régulièrement
- Maintenir le système à jour
- Surveiller l'espace disque et la mémoire
