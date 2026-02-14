# Routes - Examens de Laboratoire

## Base URL
`/api/v1/lab`

## Routes Catalogue d'Examens

### GET `/api/v1/lab/exams`
**Description**: Liste tous les examens de laboratoire disponibles

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
      "price": 5000.00,
      "description": "string|null",
      "isActive": true
    }
  ]
}
```

### POST `/api/v1/lab/exams`
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

**Réponse succès (201)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "category": "string",
    "price": 5000.00,
    "createdAt": "date"
  }
}
```

### PUT `/api/v1/lab/exams/:id`
**Description**: Modifier un examen (admin uniquement)

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "name": "string (optional)",
  "category": "string (optional)",
  "price": "number (optional)",
  "description": "string (optional)",
  "isActive": "boolean (optional)"
}
```

## Routes Demandes de Laboratoire

### GET `/api/v1/lab/requests`
**Description**: Liste toutes les demandes de laboratoire

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
        "exams": [
          {
            "id": "uuid",
            "name": "string",
            "category": "string",
            "price": 5000.00
          }
        ],
        "paymentId": "uuid|null",
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

### GET `/api/v1/lab/requests/:id`
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
    "results": {...} | null,
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

### POST `/api/v1/lab/requests`
**Description**: Créer une nouvelle demande de laboratoire

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

### PATCH `/api/v1/lab/requests/:id/assign`
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

**Logique**:
- Vérifier que la demande existe
- Vérifier que le technicien existe et a le rôle 'lab'
- Vérifier que la demande a un paiement (paymentId)
- Assigner le technicien
- Retourner le succès

## Routes Résultats de Laboratoire

### GET `/api/v1/lab/results`
**Description**: Liste tous les résultats de laboratoire

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `patientId` (uuid, optional)
- `doctorId` (uuid, optional)
- `status` (string, optional) - 'draft', 'validated', 'sent'
- `search` (string, optional)

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "uuid",
        "labRequest": {
          "id": "uuid",
          "patient": {...},
          "doctor": {...}
        },
        "status": "string",
        "completedAt": "date"
      }
    ],
    "pagination": {...}
  }
}
```

### GET `/api/v1/lab/results/:id`
**Description**: Récupérer les détails d'un résultat

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "labRequest": {
      "id": "uuid",
      "patient": {...},
      "doctor": {...},
      "exams": [...],
      "notes": "string|null"
    },
    "status": "string",
    "results": {
      "sections": [
        {
          "title": "string",
          "items": [
            {
              "name": "string",
              "value": "string",
              "unit": "string|null",
              "reference": "string|null",
              "status": "normal|high|low|null"
            }
          ]
        }
      ]
    },
    "technicianNotes": "string|null",
    "validatedBy": {...} | null,
    "validatedAt": "date|null",
    "sentAt": "date|null",
    "completedAt": "date"
  }
}
```

### POST `/api/v1/lab/results`
**Description**: Créer ou mettre à jour un résultat de laboratoire

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "labRequestId": "uuid (required)",
  "results": {
    "sections": [
      {
        "title": "string (required)",
        "items": [
          {
            "name": "string (required)",
            "value": "string (required)",
            "unit": "string (optional)",
            "reference": "string (optional)",
            "status": "normal|high|low (optional)"
          }
        ]
      }
    ]
  },
  "technicianNotes": "string (optional)"
}
```

**Réponse succès (201)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "labRequestId": "uuid",
    "status": "draft",
    "completedAt": "date"
  }
}
```

**Logique**:
- Vérifier que la demande existe
- Vérifier que l'utilisateur est le technicien assigné ou admin
- Créer ou mettre à jour le résultat
- Mettre le statut à 'draft'
- Retourner le résultat

### PATCH `/api/v1/lab/results/:id/validate`
**Description**: Valider un résultat (lab uniquement)

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "message": "Résultat validé avec succès"
}
```

**Logique**:
- Vérifier que le résultat existe
- Vérifier que l'utilisateur a le rôle 'lab'
- Mettre le statut à 'validated'
- Enregistrer `validatedBy` et `validatedAt`

### PATCH `/api/v1/lab/results/:id/send`
**Description**: Envoyer un résultat au médecin

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "message": "Résultat envoyé au médecin"
}
```

**Logique**:
- Vérifier que le résultat existe et est validé
- Mettre le statut à 'sent'
- Mettre à jour la demande avec le statut 'sent_to_doctor'
- Enregistrer `sentAt`
- Retourner le succès

### GET `/api/v1/lab/results/:id/pdf`
**Description**: Générer le PDF d'un résultat (utilise Puppeteer)

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
- Content-Type: `application/pdf`
- Fichier PDF en téléchargement ou affichage

**Logique**:
- Récupérer le résultat complet
- Générer le HTML du résultat
- Utiliser Puppeteer pour convertir en PDF
- Retourner le PDF

**Note**: Voir le fichier `11-pdf-generation.md` pour les détails de la génération PDF.
