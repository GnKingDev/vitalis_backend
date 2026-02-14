# Documentation API - VITALIS Backend

## Base URL

```
http://localhost:3000/api/v1
```

## Authentification

Toutes les routes protégées nécessitent un token JWT dans le header `Authorization` :

```
Authorization: Bearer <token>
```

## Format des réponses

### Succès

```json
{
  "success": true,
  "data": { ... }
}
```

### Erreur

```json
{
  "success": false,
  "error": "Message d'erreur"
}
```

### Pagination

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 100,
    "itemsPerPage": 10
  }
}
```

## Codes de statut HTTP

- `200` - Succès
- `201` - Créé avec succès
- `400` - Requête invalide
- `401` - Non authentifié
- `403` - Accès refusé
- `404` - Ressource non trouvée
- `409` - Conflit (ressource existe déjà)
- `500` - Erreur serveur

## Endpoints

### Authentification

#### POST `/api/v1/auth/login`

Connexion d'un utilisateur.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Réponse (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "name": "Dr. John Doe",
      "email": "user@example.com",
      "role": "doctor",
      "department": "Médecine générale",
      "avatar": null
    }
  }
}
```

#### GET `/api/v1/auth/me`

Récupérer les informations de l'utilisateur connecté.

**Headers:** `Authorization: Bearer <token>`

**Réponse (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Dr. John Doe",
    "email": "user@example.com",
    "role": "doctor",
    "department": "Médecine générale",
    "avatar": null,
    "lastLogin": "2026-01-28T10:00:00.000Z"
  }
}
```

#### POST `/api/v1/auth/logout`

Déconnexion (optionnel avec JWT stateless).

**Headers:** `Authorization: Bearer <token>`

**Réponse (200):**
```json
{
  "success": true,
  "message": "Déconnexion réussie"
}
```

### Utilisateurs (Admin uniquement)

#### GET `/api/v1/auth/users`

Liste tous les utilisateurs avec pagination.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `search` (string, optional) - Recherche par nom ou email
- `role` (string, optional) - Filtrer par rôle

**Réponse (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "name": "Dr. John Doe",
        "email": "user@example.com",
        "role": "doctor",
        "department": "Médecine générale",
        "isActive": true,
        "isSuspended": false,
        "lastLogin": "2026-01-28T10:00:00.000Z",
        "createdAt": "2026-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10
    }
  }
}
```

#### POST `/api/v1/auth/users`

Créer un nouvel utilisateur.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "name": "Dr. Jane Doe",
  "email": "jane@example.com",
  "password": "password123",
  "role": "doctor",
  "department": "Cardiologie"
}
```

**Réponse (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Dr. Jane Doe",
    "email": "jane@example.com",
    "role": "doctor",
    "department": "Cardiologie",
    "createdAt": "2026-01-28T10:00:00.000Z"
  }
}
```

#### GET `/api/v1/auth/users/:id`

Récupérer un utilisateur spécifique.

**Headers:** `Authorization: Bearer <token>`

**Réponse (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Dr. John Doe",
    "email": "user@example.com",
    "role": "doctor",
    "department": "Médecine générale",
    "isActive": true,
    "isSuspended": false,
    "lastLogin": "2026-01-28T10:00:00.000Z",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-28T10:00:00.000Z"
  }
}
```

#### PUT `/api/v1/auth/users/:id`

Modifier un utilisateur.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "name": "Dr. John Updated",
  "email": "updated@example.com",
  "role": "doctor",
  "department": "Neurologie"
}
```

**Réponse (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Dr. John Updated",
    "email": "updated@example.com",
    "role": "doctor",
    "department": "Neurologie",
    "updatedAt": "2026-01-28T10:00:00.000Z"
  }
}
```

#### PATCH `/api/v1/auth/users/:id/suspend`

Suspendre un utilisateur.

**Headers:** `Authorization: Bearer <token>`

**Réponse (200):**
```json
{
  "success": true,
  "message": "Utilisateur suspendu avec succès"
}
```

#### PATCH `/api/v1/auth/users/:id/activate`

Réactiver un utilisateur suspendu.

**Headers:** `Authorization: Bearer <token>`

**Réponse (200):**
```json
{
  "success": true,
  "message": "Utilisateur réactivé avec succès"
}
```

#### DELETE `/api/v1/auth/users/:id`

Supprimer un utilisateur.

**Headers:** `Authorization: Bearer <token>`

**Réponse (200):**
```json
{
  "success": true,
  "message": "Utilisateur supprimé avec succès"
}
```

## Documentation complète

Pour la documentation complète de toutes les routes, consultez les fichiers dans le dossier `backend/` :

- `03-routes-auth.md` - Authentification et utilisateurs
- `04-routes-patients.md` - Gestion des patients
- `05-routes-consultations.md` - Consultations médicales
- `06-routes-lab.md` - Examens de laboratoire
- `07-routes-reception.md` - Accueil/Réception
- `08-routes-imaging.md` - Examens d'imagerie
- `09-routes-pharmacy.md` - Gestion de la pharmacie
- `10-routes-payments.md` - Gestion des paiements
- `11-routes-stats.md` - Statistiques et rapports
- `12-routes-missing.md` - Routes supplémentaires

## Exemples d'utilisation

### Connexion avec cURL

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vitalis.com",
    "password": "password123"
  }'
```

### Requête authentifiée

```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Créer un utilisateur (admin)

```bash
curl -X POST http://localhost:3000/api/v1/auth/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Jane Doe",
    "email": "jane@example.com",
    "password": "password123",
    "role": "doctor",
    "department": "Cardiologie"
  }'
```
