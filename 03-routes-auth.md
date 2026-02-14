# Routes - Authentification et Utilisateurs

## Base URL
`/api/v1/auth` et `/api/v1/users`

## Page de Login Frontend

### Design et Structure

La page de login (`/`) est une page split-screen avec :

**Section gauche (Desktop uniquement)** :
- Logo Vitalis centré
- Titre "VITALIS" et sous-titre "Centre Médical"
- Points clés avec icônes :
  - Gestion complète (Stethoscope)
  - Sécurisé (Lock)
- Pattern de grille en arrière-plan

**Section droite (Formulaire)** :
- Logo Vitalis (mobile) ou formulaire de connexion (desktop)
- Card avec formulaire de connexion
- Champs email et mot de passe avec icônes
- Bouton d'affichage/masquage du mot de passe
- Checkbox "Se souvenir de moi"
- Lien "Mot de passe oublié"
- Bouton de connexion avec état de chargement

### Fonctionnalités Frontend

1. **Validation côté client** :
   - Vérification que les champs sont remplis
   - Format email (validation basique)

2. **Gestion des états** :
   - État de chargement pendant la connexion
   - Affichage des erreurs dans une Alert
   - Messages toast pour les succès/erreurs

3. **Détection automatique du rôle (Mode démo)** :
   - Le rôle est détecté depuis l'email :
     - `admin` → rôle admin
     - `reception` ou `accueil` → rôle reception
     - `lab` ou `laboratoire` → rôle lab
     - `pharmacy` ou `pharmacie` → rôle pharmacy
     - Par défaut → rôle doctor

4. **Responsive** :
   - Mobile : formulaire centré avec logo en haut
   - Desktop : layout split-screen

### Intégration Backend

En production, le frontend enverra une requête POST à `/api/v1/auth/login` avec les identifiants et recevra le token JWT avec les informations de l'utilisateur (incluant le rôle).

## Routes d'Authentification

### POST `/api/v1/auth/login`
**Description**: Connexion d'un utilisateur au système

**Endpoint**: `POST /api/v1/auth/login`

**Body**:
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Exemple de requête**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "docteur@vitalis.com",
    "password": "motdepasse123"
  }'
```

**Réponse succès (200)**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "name": "Dr. Ibrahim Traoré",
      "email": "docteur@vitalis.com",
      "role": "doctor",
      "department": "Médecine générale",
      "avatar": "string|null"
    }
  }
}
```

**Réponse erreur (401)** - Identifiants incorrects:
```json
{
  "success": false,
  "error": "Email ou mot de passe incorrect"
}
```

**Réponse erreur (403)** - Utilisateur suspendu:
```json
{
  "success": false,
  "error": "Votre compte a été suspendu. Contactez l'administrateur."
}
```

**Réponse erreur (403)** - Utilisateur inactif:
```json
{
  "success": false,
  "error": "Votre compte est désactivé. Contactez l'administrateur."
}
```

**Logique**:
1. Valider les données d'entrée (email et password requis)
2. Rechercher l'utilisateur par email (case-insensitive)
3. Vérifier que l'utilisateur existe
4. Vérifier que le mot de passe est correct (comparaison avec bcrypt)
5. Vérifier que l'utilisateur n'est pas suspendu (`isSuspended = false`)
6. Vérifier que l'utilisateur est actif (`isActive = true`)
7. Générer un JWT token avec :
   - `userId`: ID de l'utilisateur
   - `email`: Email de l'utilisateur
   - `role`: Rôle de l'utilisateur
   - `expiresIn`: Durée de validité (24h par défaut)
8. Mettre à jour `lastLogin` avec la date/heure actuelle
9. Retourner le token et les informations de l'utilisateur (sans le mot de passe)

**Sécurité**:
- Ne jamais retourner le mot de passe dans la réponse
- Utiliser bcrypt pour comparer les mots de passe
- Limiter le nombre de tentatives de connexion (rate limiting recommandé)
- Logger les tentatives de connexion échouées pour la sécurité

### POST `/api/v1/auth/logout`
**Description**: Déconnexion (optionnel, car JWT est stateless)

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "message": "Déconnexion réussie"
}
```

**Logique**:
- Si utilisation de tokens blacklistés, ajouter le token à la blacklist
- Sinon, simplement confirmer la déconnexion

### GET `/api/v1/auth/me`
**Description**: Récupérer les informations de l'utilisateur connecté

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "role": "string",
    "department": "string|null",
    "avatar": "string|null",
    "lastLogin": "date|null"
  }
}
```

**Logique**:
- Extraire l'ID utilisateur du token JWT
- Récupérer les informations de l'utilisateur depuis la base de données
- Retourner les informations (sans le mot de passe)

### POST `/api/v1/auth/refresh`
**Description**: Rafraîchir le token JWT (optionnel)

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token"
  }
}
```

## Routes Utilisateurs

### GET `/api/v1/users`
**Description**: Liste tous les utilisateurs (admin uniquement)

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `search` (string, optional) - Recherche par nom ou email
- `role` (string, optional) - Filtrer par rôle

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10
    }
  }
}
```

**Logique**:
- Vérifier que l'utilisateur est admin
- Appliquer les filtres de recherche et rôle
- Paginer les résultats
- Retourner la liste des utilisateurs (sans mots de passe)

### GET `/api/v1/users/stats`
**Description**: Statistiques sur les utilisateurs (admin uniquement)

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "total": 50,
    "byRole": {
      "admin": 2,
      "reception": 5,
      "doctor": 15,
      "lab": 8,
      "pharmacy": 10
    },
    "active": 48,
    "suspended": 2
  }
}
```

### GET `/api/v1/users/:id`
**Description**: Récupérer un utilisateur spécifique (admin uniquement)

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "role": "string",
    "department": "string|null",
    "avatar": "string|null",
    "isActive": true,
    "isSuspended": false,
    "lastLogin": "date|null",
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

**Réponse erreur (404)**:
```json
{
  "success": false,
  "error": "Utilisateur non trouvé"
}
```

### POST `/api/v1/users`
**Description**: Créer un nouvel utilisateur (admin uniquement)

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "name": "string (required)",
  "email": "string (required, unique)",
  "password": "string (required, min 8 chars)",
  "role": "admin|reception|doctor|lab|pharmacy (required)",
  "department": "string (optional)"
}
```

**Réponse succès (201)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "role": "string",
    "department": "string|null",
    "createdAt": "date"
  }
}
```

**Réponse erreur (400)**:
```json
{
  "success": false,
  "error": "Email déjà utilisé"
}
```

**Logique**:
- Valider les données d'entrée
- Vérifier l'unicité de l'email
- Hasher le mot de passe avec bcrypt
- Créer l'utilisateur
- Retourner les informations (sans mot de passe)

### PUT `/api/v1/users/:id`
**Description**: Modifier un utilisateur (admin uniquement)

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "name": "string (optional)",
  "email": "string (optional)",
  "role": "string (optional)",
  "department": "string (optional)"
}
```

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "role": "string",
    "department": "string|null",
    "updatedAt": "date"
  }
}
```

**Logique**:
- Vérifier que l'utilisateur existe
- Valider les données
- Vérifier l'unicité de l'email (si modifié)
- Mettre à jour l'utilisateur
- Retourner les informations mises à jour

### PATCH `/api/v1/users/:id/suspend`
**Description**: Suspendre un utilisateur (admin uniquement)

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "message": "Utilisateur suspendu avec succès"
}
```

**Logique**:
- Vérifier que l'utilisateur existe
- Empêcher la suspension de son propre compte
- Mettre `isSuspended` à `true`
- Optionnellement, invalider tous les tokens JWT de l'utilisateur

### PATCH `/api/v1/users/:id/activate`
**Description**: Réactiver un utilisateur suspendu (admin uniquement)

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "message": "Utilisateur réactivé avec succès"
}
```

**Logique**:
- Vérifier que l'utilisateur existe
- Mettre `isSuspended` à `false`

### DELETE `/api/v1/users/:id`
**Description**: Supprimer un utilisateur (admin uniquement)

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "message": "Utilisateur supprimé avec succès"
}
```

**Logique**:
- Vérifier que l'utilisateur existe
- Empêcher la suppression de son propre compte
- Vérifier qu'il n'y a pas de données liées critiques
- Supprimer l'utilisateur (soft delete recommandé)

## Middleware d'authentification

### `authMiddleware.js`
**Description**: Vérifie la validité du token JWT

**Fonctionnement**:
1. Extraire le token du header `Authorization`
2. Vérifier la présence du token
3. Vérifier la validité du token (signature, expiration)
4. Récupérer l'utilisateur depuis la base de données
5. Vérifier que l'utilisateur est actif et non suspendu
6. Ajouter l'utilisateur à `req.user`
7. Passer au middleware suivant

**Erreurs possibles**:
- 401: Token manquant
- 401: Token invalide
- 401: Token expiré
- 401: Utilisateur suspendu ou inactif

## Middleware d'autorisation

### `authorizeMiddleware.js`
**Description**: Vérifie que l'utilisateur a le rôle requis

**Utilisation**:
```javascript
authorize(['admin', 'doctor'])
```

**Fonctionnement**:
1. Vérifier que `req.user` existe (après authMiddleware)
2. Vérifier que le rôle de l'utilisateur est dans la liste des rôles autorisés
3. Passer au middleware suivant ou retourner 403

**Erreurs possibles**:
- 403: Accès refusé (rôle insuffisant)

## Intégration Frontend-Backend

### Flux de Connexion

1. **Utilisateur saisit email et mot de passe** sur la page `/`
2. **Frontend valide** les champs (format email, champs non vides)
3. **Frontend envoie** `POST /api/v1/auth/login` avec les identifiants
4. **Backend valide** et authentifie l'utilisateur
5. **Backend retourne** le token JWT et les informations utilisateur
6. **Frontend stocke** le token (localStorage ou sessionStorage)
7. **Frontend redirige** vers `/dashboard`
8. **Frontend inclut** le token dans le header `Authorization: Bearer <token>` pour toutes les requêtes suivantes

### Stockage du Token

**Recommandation** :
- Utiliser `sessionStorage` pour une sécurité accrue (token supprimé à la fermeture du navigateur)
- Ou `localStorage` si vous voulez que l'utilisateur reste connecté entre les sessions
- Ne jamais stocker le token dans un cookie non sécurisé

### Gestion des Erreurs Frontend

Le frontend doit gérer les cas suivants :

1. **Erreur réseau** : Afficher un message "Erreur de connexion. Vérifiez votre connexion internet."
2. **401 - Identifiants incorrects** : Afficher "Email ou mot de passe incorrect"
3. **403 - Compte suspendu/inactif** : Afficher le message d'erreur du backend
4. **500 - Erreur serveur** : Afficher "Erreur serveur. Veuillez réessayer plus tard."

### Exemple d'Implémentation Frontend

```typescript
// services/authService.ts
const login = async (email: string, password: string) => {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Erreur de connexion');
  }

  // Stocker le token
  sessionStorage.setItem('token', data.data.token);
  sessionStorage.setItem('user', JSON.stringify(data.data.user));

  return data.data;
};
```

### Déconnexion

Lors de la déconnexion :
1. Supprimer le token du stockage
2. Supprimer les données utilisateur
3. Rediriger vers la page de login
4. Optionnel : Appeler `POST /api/v1/auth/logout` pour invalider le token côté serveur (si blacklist implémentée)
