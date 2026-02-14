# VITALIS Backend API

Backend API professionnel pour le système de gestion de clinique VITALIS.

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Technologies](#technologies)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Structure du projet](#structure-du-projet)
- [Démarrage](#démarrage)
- [API Documentation](#api-documentation)
- [Base de données](#base-de-données)
- [Sécurité](#sécurité)
- [Tests](#tests)
- [Déploiement](#déploiement)

## 🎯 Vue d'ensemble

Le backend VITALIS est une API RESTful construite avec Node.js et Express.js. Il gère toutes les opérations du système de gestion de clinique, incluant :

- Authentification et autorisation des utilisateurs
- Gestion des patients
- Consultations médicales
- Examens de laboratoire et d'imagerie
- Gestion de la pharmacie
- Paiements
- Statistiques et rapports

## 🛠 Technologies

- **Runtime**: Node.js (>=18.0.0)
- **Framework**: Express.js
- **ORM**: Sequelize
- **Base de données**: MySQL >= 8.0
- **Authentification**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Génération PDF**: Puppeteer
- **Sécurité**: Helmet, CORS, Rate Limiting

## 📦 Prérequis

- Node.js >= 18.0.0
- npm >= 9.0.0
- MySQL >= 8.0
- Git

## 🚀 Installation

### 1. Cloner le repository

```bash
git clone <repository-url>
cd vitalis_backend/backend
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Éditer le fichier `.env` et configurer les variables nécessaires.

### 4. Créer la base de données

**Option A : Avec Docker (Recommandé)**

```bash
# Démarrer MySQL avec Docker
docker-compose up -d

# Les identifiants par défaut sont dans docker-compose.yml
# Root password: rootpassword
# Database: vitalis_clinic
```

Voir [DOCKER.md](./DOCKER.md) pour plus de détails.

**Option B : MySQL local**

```bash
# MySQL
mysql -u root -p
CREATE DATABASE vitalis_clinic CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Exécuter les migrations

```bash
npm run migrate
```

### 6. (Optionnel) Exécuter les seeders

```bash
npm run seed
```

## ⚙️ Configuration

### Variables d'environnement

Créer un fichier `.env` à la racine du projet avec les variables suivantes :

```env
# Server
PORT=3000
NODE_ENV=development

# Database (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=vitalis_clinic
DB_USER=root
DB_PASSWORD=your_password
DB_DIALECT=mysql

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=http://localhost:3001

# Puppeteer
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

## 📁 Structure du projet

```
backend/
├── src/
│   ├── config/          # Configuration (database, app config)
│   ├── models/          # Modèles Sequelize
│   ├── migrations/      # Migrations de base de données
│   ├── seeders/         # Seeders pour données initiales
│   ├── routes/          # Routes API
│   ├── controllers/     # Contrôleurs
│   ├── middleware/      # Middleware personnalisés
│   ├── services/        # Services (PDF, email, etc.)
│   ├── utils/           # Fonctions utilitaires
│   ├── validations/     # Schémas de validation Joi
│   ├── templates/       # Templates (PDF, etc.)
│   └── server.js        # Point d'entrée de l'application
├── .env.example         # Exemple de fichier d'environnement
├── .gitignore
├── .sequelizerc         # Configuration Sequelize CLI
├── package.json
└── README.md
```

## 🏃 Démarrage

### Mode développement

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:3000`

### Mode production

```bash
npm start
```

### Health Check

```bash
curl http://localhost:3000/health
```

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api/v1
```

### Authentification

Toutes les routes protégées nécessitent un token JWT dans le header :

```
Authorization: Bearer <token>
```

### Endpoints principaux

#### Authentification

- `POST /api/v1/auth/login` - Connexion
- `POST /api/v1/auth/logout` - Déconnexion
- `GET /api/v1/auth/me` - Informations utilisateur connecté

#### Utilisateurs (Admin uniquement)

- `GET /api/v1/auth/users` - Liste des utilisateurs
- `POST /api/v1/auth/users` - Créer un utilisateur
- `GET /api/v1/auth/users/:id` - Détails d'un utilisateur
- `PUT /api/v1/auth/users/:id` - Modifier un utilisateur
- `DELETE /api/v1/auth/users/:id` - Supprimer un utilisateur

Pour la documentation complète de l'API, consultez les fichiers dans le dossier `backend/` :
- `03-routes-auth.md` - Routes d'authentification
- `04-routes-patients.md` - Routes patients
- `05-routes-consultations.md` - Routes consultations
- Etc.

## 🗄 Base de données

### Migrations

Créer une nouvelle migration :

```bash
npx sequelize-cli migration:generate --name migration-name
```

Exécuter les migrations :

```bash
npm run migrate
```

Annuler la dernière migration :

```bash
npm run migrate:undo
```

### Modèles

Les modèles Sequelize sont définis dans `src/models/`. Chaque modèle correspond à une table dans la base de données.

## 🔒 Sécurité

- **JWT** : Authentification par tokens
- **Helmet** : Protection des headers HTTP
- **CORS** : Configuration des origines autorisées
- **Rate Limiting** : Limitation du nombre de requêtes
- **Validation** : Validation stricte des entrées avec Joi
- **Hashing** : Mots de passe hashés avec bcrypt

## 🧪 Tests

```bash
# Exécuter tous les tests
npm test

# Mode watch
npm run test:watch
```

## 📦 Déploiement

### Préparation

1. Configurer les variables d'environnement de production
2. S'assurer que la base de données est accessible
3. Exécuter les migrations : `npm run migrate`

### Docker (optionnel)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Variables d'environnement de production

- `NODE_ENV=production`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET` (doit être fort et unique)
- `CORS_ORIGIN` (URL du frontend)

## 📝 Scripts disponibles

- `npm start` - Démarrer le serveur en production
- `npm run dev` - Démarrer en mode développement avec nodemon
- `npm run migrate` - Exécuter les migrations
- `npm run migrate:undo` - Annuler la dernière migration
- `npm run seed` - Exécuter les seeders
- `npm test` - Exécuter les tests
- `npm run lint` - Vérifier le code avec ESLint

## 🤝 Contribution

1. Créer une branche pour votre fonctionnalité
2. Commiter vos changements
3. Pousser vers la branche
4. Ouvrir une Pull Request

## 📄 Licence

ISC

## 👥 Auteurs

VITALIS Team

## 🆘 Support

Pour toute question ou problème, ouvrir une issue sur le repository.
