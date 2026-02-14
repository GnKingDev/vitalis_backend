# Architecture Générale du Backend

## Vue d'ensemble de l'architecture

Le backend suit une architecture MVC (Model-View-Controller) avec une séparation claire des responsabilités.

## Structure des couches

### 1. Couche de présentation (Routes)
- Définit les endpoints API
- Valide les requêtes entrantes
- Appelle les contrôleurs appropriés

### 2. Couche de logique métier (Controllers)
- Contient la logique métier
- Interagit avec les modèles
- Gère les réponses HTTP

### 3. Couche d'accès aux données (Models)
- Définit la structure des données avec Sequelize
- Gère les relations entre modèles
- Contient les validations au niveau base de données

### 4. Couche de services
- Services réutilisables (PDF, email, etc.)
- Logique métier complexe
- Intégrations externes

### 5. Middleware
- Authentification et autorisation
- Validation des données
- Gestion des erreurs
- Logging

## Flux de requête typique

```
Client Request
    ↓
Middleware (Auth, Validation)
    ↓
Route Handler
    ↓
Controller
    ↓
Service (si nécessaire)
    ↓
Model (Sequelize)
    ↓
Database
    ↓
Response au client
```

## Principes de conception

### 1. RESTful API
- Utilisation des verbes HTTP standards (GET, POST, PUT, DELETE, PATCH)
- URLs descriptives et hiérarchiques
- Codes de statut HTTP appropriés

### 2. Sécurité
- Authentification JWT pour toutes les routes protégées
- Validation stricte des entrées
- Protection contre les injections SQL (via Sequelize)
- Rate limiting pour prévenir les abus

### 3. Gestion des erreurs
- Erreurs structurées et cohérentes
- Messages d'erreur informatifs pour le développement
- Messages génériques pour la production
- Logging des erreurs pour le débogage

### 4. Performance
- Pagination pour les listes
- Indexation appropriée en base de données
- Mise en cache quand approprié
- Optimisation des requêtes Sequelize

## Organisation des routes

Les routes sont organisées par domaine fonctionnel :

- `/api/auth` - Authentification
- `/api/users` - Gestion des utilisateurs
- `/api/patients` - Gestion des patients
- `/api/consultations` - Consultations médicales
- `/api/lab` - Examens de laboratoire
- `/api/imaging` - Examens d'imagerie
- `/api/pharmacy` - Gestion de la pharmacie
- `/api/payments` - Gestion des paiements
- `/api/stats` - Statistiques
- `/api/beds` - Gestion des lits

## Conventions de nommage

### Routes
- Utiliser des noms au pluriel : `/api/patients`, `/api/users`
- Utiliser des IDs pour les ressources spécifiques : `/api/patients/:id`

### Controllers
- Nommer selon la ressource : `patientController.js`, `userController.js`
- Méthodes : `getAll`, `getById`, `create`, `update`, `delete`

### Models
- Nommer au singulier : `Patient`, `User`, `Consultation`
- Fichiers : `patient.js`, `user.js`, `consultation.js`

### Services
- Nommer avec le suffixe Service : `pdfService.js`, `emailService.js`

## Gestion des versions API

Pour faciliter les futures évolutions, prévoir un système de versioning :

- Version actuelle : `/api/v1/`
- Routes futures : `/api/v2/`

## Documentation API

Utiliser Swagger/OpenAPI pour documenter automatiquement l'API :

- Endpoints disponibles
- Paramètres requis
- Réponses possibles
- Exemples de requêtes/réponses
