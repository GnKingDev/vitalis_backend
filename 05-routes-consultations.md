# Routes - Consultations Médicales

## Base URL
`/api/v1/consultations`

## Routes principales

### GET `/api/v1/consultations`
**Description**: Liste toutes les consultations avec filtres

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `patientId` (uuid, optional)
- `doctorId` (uuid, optional)
- `status` (string, optional) - 'waiting', 'in_progress', 'completed'
- `date` (string, optional, format: YYYY-MM-DD)

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "consultations": [
      {
        "id": "uuid",
        "patient": {
          "id": "uuid",
          "vitalisId": "string",
          "firstName": "string",
          "lastName": "string"
        },
        "doctor": {
          "id": "uuid",
          "name": "string"
        },
        "status": "string",
        "symptoms": "string|null",
        "diagnosis": "string|null",
        "createdAt": "date"
      }
    ],
    "pagination": {...}
  }
}
```

### GET `/api/v1/consultations/:id`
**Description**: Récupérer les détails d'une consultation

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patient": {...},
    "doctor": {...},
    "status": "string",
    "symptoms": "string|null",
    "vitals": {
      "temperature": 38.5,
      "bloodPressure": "130/85",
      "heartRate": 88,
      "weight": 72,
      "height": 175
    } | null,
    "diagnosis": "string|null",
    "notes": "string|null",
    "labRequests": [...],
    "imagingRequests": [...],
    "prescriptions": [...],
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

### POST `/api/v1/consultations`
**Description**: Créer une nouvelle consultation

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "patientId": "uuid (required)",
  "doctorId": "uuid (required)",
  "symptoms": "string (optional)",
  "vitals": {
    "temperature": "number (optional)",
    "bloodPressure": "string (optional)",
    "heartRate": "number (optional)",
    "weight": "number (optional)",
    "height": "number (optional)"
  },
  "diagnosis": "string (optional)",
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
    "status": "in_progress",
    "createdAt": "date"
  }
}
```

**Logique**:
- Vérifier que le patient existe
- Vérifier que le médecin existe et a le rôle 'doctor'
- Créer la consultation avec le statut 'in_progress'
- Mettre à jour le dossier de consultation si existant
- Retourner la consultation créée

### PUT `/api/v1/consultations/:id`
**Description**: Mettre à jour une consultation

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "symptoms": "string (optional)",
  "vitals": {...},
  "diagnosis": "string (optional)",
  "notes": "string (optional)",
  "status": "waiting|in_progress|completed (optional)"
}
```

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "updatedAt": "date"
  }
}
```

### PATCH `/api/v1/consultations/:id/complete`
**Description**: Marquer une consultation comme terminée

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "message": "Consultation terminée avec succès"
}
```

**Logique**:
- Vérifier que la consultation existe
- Vérifier que l'utilisateur est le médecin assigné ou admin
- Mettre le statut à 'completed'
- Mettre à jour le dossier de consultation

### POST `/api/v1/consultations/:id/custom-items`
**Description**: Ajouter un item personnalisé à une consultation (onglet "Autre")

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "name": "string (required)",
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
    "description": "string|null",
    "createdAt": "date"
  }
}
```

## Routes Dossiers de Consultation

### GET `/api/v1/dossiers`
**Description**: Liste tous les dossiers de consultation

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `patientId` (uuid, optional)
- `doctorId` (uuid, optional)
- `status` (string, optional) - 'active', 'completed', 'archived'

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "dossiers": [
      {
        "id": "uuid",
        "patient": {...},
        "doctor": {...},
        "status": "string",
        "consultation": {...} | null,
        "createdAt": "date"
      }
    ],
    "pagination": {...}
  }
}
```

### GET `/api/v1/dossiers/:id`
**Description**: Récupérer les détails d'un dossier

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patient": {...},
    "doctor": {...},
    "assignment": {...},
    "status": "string",
    "consultation": {...} | null,
    "labRequests": [...],
    "imagingRequests": [...],
    "prescriptions": [...],
    "createdAt": "date",
    "completedAt": "date|null",
    "archivedAt": "date|null"
  }
}
```

### PATCH `/api/v1/dossiers/:id/archive`
**Description**: Archiver un dossier (avec confirmation)

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "confirm": true
}
```

**Réponse (200)**:
```json
{
  "success": true,
  "message": "Dossier archivé avec succès"
}
```

**Logique**:
- Vérifier que le dossier existe
- Vérifier que le dossier est en statut 'completed'
- Vérifier la confirmation
- Mettre le statut à 'archived'
- Enregistrer `archivedAt` et `archivedBy`
- Retourner le succès

## Routes Assignations Médecin

### GET `/api/v1/assignments`
**Description**: Liste toutes les assignations

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `patientId` (uuid, optional)
- `doctorId` (uuid, optional)
- `status` (string, optional)

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "id": "uuid",
        "patient": {...},
        "doctor": {...},
        "status": "string",
        "createdAt": "date"
      }
    ],
    "pagination": {...}
  }
}
```

### POST `/api/v1/assignments`
**Description**: Créer une assignation médecin-patient

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "patientId": "uuid (required)",
  "doctorId": "uuid (required)",
  "paymentId": "uuid (required)"
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
    "paymentId": "uuid",
    "status": "assigned",
    "createdAt": "date"
  }
}
```

**Logique**:
- Vérifier que le patient existe
- Vérifier que le médecin existe et a le rôle 'doctor'
- Vérifier que le paiement existe et est payé
- Créer l'assignation avec le statut 'assigned'
- Créer automatiquement un dossier de consultation
- Retourner l'assignation créée
