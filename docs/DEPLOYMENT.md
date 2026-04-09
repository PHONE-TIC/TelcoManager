# Guide de Déploiement

Ce guide explique comment déployer TelcoManager en production dans sa version web.

## Déploiement avec Docker

### Prérequis

- serveur Ubuntu/Debian avec Docker et Docker Compose installés
- au moins 2 Go de RAM
- environ 10 Go d’espace disque
- ports nécessaires disponibles selon votre configuration

### Installation Docker

Si Docker n’est pas déjà installé :

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

sudo apt-get update
sudo apt-get install docker-compose-plugin

sudo usermod -aG docker $USER
```

Reconnectez-vous ensuite pour appliquer le groupe Docker.

## Étapes de déploiement

### 1. Préparer le serveur

```bash
ssh user@your-server.com

mkdir -p /opt/telcomanager
cd /opt/telcomanager

git clone https://github.com/PHONE-TIC/TelcoManager.git .
```

### 2. Configurer l’environnement

```bash
cp .env.example .env
nano .env
```

Variables à adapter en priorité :

```env
POSTGRES_PASSWORD=your_secure_password_here
JWT_SECRET=your_very_long_secure_random_string_here
DEFAULT_ADMIN_PASSWORD=your_admin_password
```

### 3. Premier démarrage

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f
```

### 4. Vérification

L’application est servie sur le port configuré par le compose local, par défaut :

- webapp + API : `http://localhost:8081`
- PostgreSQL : `localhost:5435`

## Reverse proxy recommandé

### Nginx

```bash
sudo apt-get install nginx
sudo nano /etc/nginx/sites-available/telcomanager
```

Exemple minimal :

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Puis :

```bash
sudo ln -s /etc/nginx/sites-available/telcomanager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Maintenance

### Mise à jour

```bash
cd /opt/telcomanager
git pull
docker compose up -d --build
```

### Logs

```bash
docker compose logs -f
docker compose logs -f app
docker compose logs -f db
```

### Sauvegarde PostgreSQL

Exemple de backup :

```bash
docker compose exec -T db pg_dump -U "$DB_USER" "$DB_NAME" > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Redémarrage

```bash
docker compose restart
```

## Sécurité minimale recommandée

- changer les secrets par défaut
- activer HTTPS
- limiter l’accès SSH
- configurer un pare-feu
- mettre en place des sauvegardes régulières
- surveiller les logs et l’espace disque

## Dépannage

### Backend / app ne démarre pas

```bash
docker compose logs
```

### Problème base de données

```bash
docker compose ps
docker compose logs db
```

### Réinitialisation complète

⚠️ supprime les données locales :

```bash
docker compose down -v
docker compose up -d --build
```

## Notes

- Le projet est désormais centré sur la webapp.
- Il n’y a plus de déploiement desktop ou mobile à maintenir.
