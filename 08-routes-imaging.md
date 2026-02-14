# Routes - Examens d'Imagerie

## Base URL
`/api/v1/imaging`

## Vue d'ensemble

Les routes d'imagerie gèrent les demandes d'examens d'imagerie. Similaires aux routes de laboratoire mais pour les examens d'imagerie.

## Routes Catalogue d'Examens

### GET `/api/v1/imaging/exams`
**Description**: Liste tous les examens d'imagerie disponibles

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `category` (string, optional) - Filtrer par catégorie
- `isActive` (boolean, optional, default: true)

**Réponse (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "category": "string",
      "price": 15000.00,
      "description": "string|null",
      "isActive": true
    }
  ]
}
```

### POST `/api/v1/imaging/exams`
**Description**: Créer un nouvel examen (admin uniquement)

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "name": "string (required)",
  "category": "string (required)",
  "price": "number (required, min: 0)",
  "description": "string (optional)"
}
```

### PUT `/api/v1/imaging/exams/:id`
**Description**: Modifier un examen (admin uniquement)

**Headers**: `Authorization: Bearer <token>`

## Routes Demandes d'Imagerie

### GET `/api/v1/imaging/requests`
**Description**: Liste toutes les demandes d'imagerie

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `patientId` (uuid, optional)
- `doctorId` (uuid, optional)
- `status` (string, optional) - 'pending', 'sent_to_doctor'
- `date` (string, optional, format: YYYY-MM-DD)
- `search` (string, optional) - Recherche par patient, ID Vitalis, médecin

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "uuid",
        "patient": {...},
        "doctor": {...},
        "status": "string",
        "totalAmount": 15000.00,
        "exams": [...],
        "paymentId": "uuid|null",
        "results": "string|null",
        "createdAt": "date"
      }
    ],
    "pagination": {...}
  }
}
```

**Logique selon le rôle**:
- **Lab**: Voir uniquement les demandes avec `paymentId` et statut 'pending'
- **Doctor**: Voir uniquement ses propres demandes avec statut 'sent_to_doctor'
- **Admin**: Voir toutes les demandes

### GET `/api/v1/imaging/requests/:id`
**Description**: Récupérer les détails d'une demande

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patient": {...},
    "doctor": {...},
    "consultation": {...} | null,
    "status": "string",
    "exams": [...],
    "totalAmount": 15000.00,
    "payment": {...} | null,
    "results": "string|null",
    "labTechnician": {...} | null,
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

### POST `/api/v1/imaging/requests`
**Description**: Créer une nouvelle demande d'imagerie

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "patientId": "uuid (required)",
  "doctorId": "uuid (required)",
  "consultationId": "uuid (optional)",
  "examIds": ["uuid", "uuid"] (required, min: 1),
  "notes": "string (optional)"
}
```

**Réponse succès (201)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patientId": "uuid",
    "doctorId": "uuid",
    "status": "pending",
    "totalAmount": 15000.00,
    "exams": [...],
    "createdAt": "date"
  }
}
```

**Logique**:
- Vérifier que le patient existe
- Vérifier que le médecin existe
- Vérifier que tous les examens existent et sont actifs
- Calculer le montant total
- Créer la demande avec le statut 'pending'
- Créer les enregistrements dans la table de liaison
- Retourner la demande créée

### PATCH `/api/v1/imaging/requests/:id/assign`
**Description**: Assigner une demande à un technicien de laboratoire

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "labTechnicianId": "uuid (required)"
}
```

**Réponse (200)**:
```json
{
  "success": true,
  "message": "Demande assignée avec succès"
}
```

### PATCH `/api/v1/imaging/requests/:id/complete`
**Description**: Marquer une demande comme terminée et envoyer au médecin

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "results": "string (required)" - URL ou description des résultats
}
```

**Réponse (200)**:
```json
{
  "success": true,
  "message": "Résultats envoyés au médecin",
  "data": {
    "id": "uuid",
    "status": "sent_to_doctor",
    "results": "string",
    "updatedAt": "date"
  }
}
```

**Logique**:
- Vérifier que la demande existe
- Vérifier que l'utilisateur est le technicien assigné ou admin
- Vérifier que la demande a un paiement
- Mettre le statut à 'sent_to_doctor'
- Enregistrer les résultats
- Mettre à jour `updatedAt`
- Retourner la demande mise à jour

### GET `/api/v1/imaging/requests/:id/pdf`
**Description**: Générer le PDF des résultats d'imagerie (utilise Puppeteer)

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
- Content-Type: `application/pdf`
- Fichier PDF en téléchargement ou affichage

**Logique**:
- Récupérer la demande complète avec les résultats
- Générer le HTML des résultats
- Utiliser Puppeteer pour convertir en PDF
- Retourner le PDF

## Routes Statistiques

### GET `/api/v1/imaging/stats`
**Description**: Statistiques sur les demandes d'imagerie

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `date` (string, optional) - Filtrer par date

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "total": 100,
    "pending": 15,
    "completed": 85,
    "today": {
      "total": 5,
      "pending": 2,
      "completed": 3
    }
  }
}
```
