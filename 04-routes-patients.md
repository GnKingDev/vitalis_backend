# Routes - Gestion des Patients

## Base URL
`/api/v1/patients`

## Routes principales

### GET `/api/v1/patients`
**Description**: Liste tous les patients avec pagination et filtres

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `search` (string, optional) - Recherche par nom, vitalisId, ou téléphone
- `date` (string, optional, format: YYYY-MM-DD) - Filtrer par date d'enregistrement

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "patients": [
      {
        "id": "uuid",
        "vitalisId": "VTL-2026-00001",
        "firstName": "string",
        "lastName": "string",
        "dateOfBirth": "date",
        "gender": "M|F",
        "phone": "string",
        "email": "string|null",
        "address": "string|null",
        "age": 40,
        "createdAt": "date"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 100,
      "itemsPerPage": 10
    }
  }
}
```

**Logique**:
- Appliquer les filtres de recherche
- Filtrer par date si fournie
- Paginer les résultats
- Calculer l'âge de chaque patient
- Retourner la liste paginée

### GET `/api/v1/patients/export`
**Description**: Exporter la liste des patients en Excel (admin uniquement)

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `search` (string, optional)
- `date` (string, optional)

**Réponse (200)**:
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Fichier Excel en téléchargement

**Logique**:
- Récupérer tous les patients (sans pagination) selon les filtres
- Générer un fichier Excel avec les colonnes :
  - ID Vitalis
  - Nom complet
  - Date de naissance
  - Âge
  - Sexe
  - Téléphone
  - Email
  - Adresse
  - Date d'enregistrement
- Retourner le fichier en téléchargement

### GET `/api/v1/patients/stats`
**Description**: Statistiques sur les patients

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `date` (string, optional) - Filtrer par date

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "total": 1000,
    "today": 12,
    "thisMonth": 150,
    "byGender": {
      "M": 520,
      "F": 480
    }
  }
}
```

### GET `/api/v1/patients/:id`
**Description**: Récupérer les détails d'un patient spécifique

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "vitalisId": "VTL-2026-00001",
    "firstName": "string",
    "lastName": "string",
    "dateOfBirth": "date",
    "gender": "M|F",
    "phone": "string",
    "email": "string|null",
    "address": "string|null",
    "emergencyContact": "string|null",
    "age": 40,
    "bed": {
      "id": "uuid",
      "number": "101",
      "type": "classic|vip"
    } | null,
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

**Logique**:
- Récupérer le patient avec ses relations (lit occupé)
- Calculer l'âge
- Retourner les informations complètes

### POST `/api/v1/patients`
**Description**: Créer un nouveau patient

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "dateOfBirth": "date (required, format: YYYY-MM-DD)",
  "gender": "M|F (required)",
  "phone": "string (required)",
  "email": "string (optional)",
  "address": "string (optional)",
  "emergencyContact": "string (optional)"
}
```

**Réponse succès (201)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "vitalisId": "VTL-2026-00001",
    "firstName": "string",
    "lastName": "string",
    "dateOfBirth": "date",
    "gender": "M|F",
    "phone": "string",
    "email": "string|null",
    "address": "string|null",
    "emergencyContact": "string|null",
    "createdAt": "date"
  }
}
```

**Logique**:
- Valider les données d'entrée
- Générer automatiquement le `vitalisId` (format: VTL-YYYY-XXXXX)
  - YYYY = année courante
  - XXXXX = numéro séquentiel (5 chiffres avec zéros à gauche)
- Créer le patient
- Retourner les informations créées

### PUT `/api/v1/patients/:id`
**Description**: Modifier un patient existant

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "dateOfBirth": "date (optional)",
  "gender": "M|F (optional)",
  "phone": "string (optional)",
  "email": "string (optional)",
  "address": "string (optional)",
  "emergencyContact": "string (optional)"
}
```

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "vitalisId": "VTL-2026-00001",
    "firstName": "string",
    "lastName": "string",
    "updatedAt": "date"
  }
}
```

**Logique**:
- Vérifier que le patient existe
- Valider les données
- Mettre à jour le patient
- Retourner les informations mises à jour

### GET `/api/v1/patients/:id/history`
**Description**: Récupérer l'historique complet d'un patient

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "patient": {...},
    "consultations": [...],
    "labRequests": [...],
    "imagingRequests": [...],
    "prescriptions": [...],
    "payments": [...],
    "dossiers": [...]
  }
}
```

**Logique**:
- Récupérer le patient
- Récupérer toutes les consultations
- Récupérer toutes les demandes de laboratoire
- Récupérer toutes les demandes d'imagerie
- Récupérer toutes les ordonnances
- Récupérer tous les paiements
- Récupérer tous les dossiers de consultation
- Retourner l'historique complet

### GET `/api/v1/patients/:id/timeline`
**Description**: Récupérer la timeline des événements d'un patient

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "registration|consultation|lab|imaging|prescription|payment",
      "title": "string",
      "description": "string",
      "date": "date",
      "createdBy": "string"
    }
  ]
}
```

**Logique**:
- Récupérer tous les événements liés au patient
- Trier par date (plus récent en premier)
- Formater les événements pour la timeline
- Retourner la liste chronologique
