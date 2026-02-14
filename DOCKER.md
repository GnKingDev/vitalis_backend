# Configuration Docker pour VITALIS Backend

## 🐳 Utilisation de MySQL avec Docker

Cette configuration permet de lancer MySQL facilement avec Docker Compose.

## 📋 Prérequis

- Docker installé
- Docker Compose installé

## 🚀 Démarrage rapide

### 1. Démarrer MySQL

```bash
cd backend
docker-compose up -d
```

Cette commande va :
- Télécharger l'image MySQL 8.0 (si nécessaire)
- Créer le conteneur `vitalis_mysql`
- Créer la base de données `vitalis_clinic`
- Exposer MySQL sur le port 3306

### 2. Vérifier que MySQL est démarré

```bash
docker-compose ps
```

Vous devriez voir le conteneur `vitalis_mysql` avec le statut "Up".

### 3. Configurer votre fichier `.env`

Mettez à jour votre fichier `.env` avec les identifiants Docker :

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=vitalis_clinic
DB_USER=root
DB_PASSWORD=rootpassword
DB_DIALECT=mysql
```

**OU** si vous préférez utiliser l'utilisateur créé :

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=vitalis_clinic
DB_USER=vitalis_user
DB_PASSWORD=vitalis_password
DB_DIALECT=mysql
```

### 4. Tester la connexion

```bash
# Se connecter à MySQL depuis le conteneur
docker exec -it vitalis_mysql mysql -u root -prootpassword

# Ou depuis votre machine (si mysql-client est installé)
mysql -h 127.0.0.1 -P 3306 -u root -prootpassword
```

## 📝 Commandes utiles

### Arrêter MySQL

```bash
docker-compose stop
```

### Redémarrer MySQL

```bash
docker-compose restart
```

### Arrêter et supprimer le conteneur (⚠️ garde les données)

```bash
docker-compose down
```

### Arrêter et supprimer le conteneur ET les données (⚠️ supprime tout)

```bash
docker-compose down -v
```

### Voir les logs

```bash
docker-compose logs -f mysql
```

### Accéder au shell MySQL

```bash
docker exec -it vitalis_mysql mysql -u root -prootpassword vitalis_clinic
```

## 🔧 Configuration

### Modifier les identifiants

Éditez le fichier `docker-compose.yml` pour changer :
- `MYSQL_ROOT_PASSWORD` : Mot de passe root
- `MYSQL_DATABASE` : Nom de la base de données
- `MYSQL_USER` : Nom d'utilisateur
- `MYSQL_PASSWORD` : Mot de passe utilisateur

### Modifier le port

Si le port 3306 est déjà utilisé, changez dans `docker-compose.yml` :

```yaml
ports:
  - "3307:3306"  # Port externe:Port interne
```

Puis mettez à jour `.env` :
```env
DB_PORT=3307
```

### Persistance des données

Les données sont stockées dans un volume Docker nommé `mysql_data`. Elles persistent même si vous supprimez le conteneur (sauf si vous utilisez `docker-compose down -v`).

## 🗄️ Gestion de la base de données

### Créer les tables avec Sequelize

Une fois MySQL démarré :

```bash
# En développement (synchronisation automatique)
npm run dev

# Ou avec les migrations
npm run migrate
```

### Sauvegarder la base de données

```bash
docker exec vitalis_mysql mysqldump -u root -prootpassword vitalis_clinic > backup.sql
```

### Restaurer la base de données

```bash
docker exec -i vitalis_mysql mysql -u root -prootpassword vitalis_clinic < backup.sql
```

## 🔍 Dépannage

### Le conteneur ne démarre pas

```bash
# Voir les logs
docker-compose logs mysql

# Vérifier les ports utilisés
lsof -i :3306
```

### Réinitialiser complètement

```bash
# Arrêter et supprimer tout
docker-compose down -v

# Redémarrer
docker-compose up -d
```

### Problème de connexion

Vérifiez que :
1. Le conteneur est bien démarré : `docker-compose ps`
2. Le port 3306 n'est pas utilisé par un autre MySQL
3. Les identifiants dans `.env` correspondent à ceux dans `docker-compose.yml`

## 📚 Ressources

- [Documentation MySQL Docker](https://hub.docker.com/_/mysql)
- [Documentation Docker Compose](https://docs.docker.com/compose/)
