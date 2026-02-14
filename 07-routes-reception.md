# Routes - Accueil / Réception

## Base URL
`/api/v1/reception`

## Vue d'ensemble

Les routes de réception gèrent l'enregistrement des patients, les paiements, et l'assignation des médecins. Accessibles aux rôles `reception` et `admin`.

## Routes Patients

### GET `/api/v1/reception/patients`
**Description**: Liste des patients avec filtres (date, recherche)

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `date` (string, optional, format: YYYY-MM-DD) - Filtrer par date d'enregistrement
- `search` (string, optional) - Recherche par nom, vitalisId, ou téléphone

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
        "phone": "string",
        "email": "string|null",
        "age": 40,
        "gender": "M|F",
        "bed": {
          "id": "uuid",
          "number": "101",
          "type": "classic|vip"
        } | null,
        "payment": {
          "id": "uuid",
          "amount": 15000.00,
          "status": "paid|pending",
          "method": "cash|orange_money"
        } | null,
        "assignment": {
          "id": "uuid",
          "doctor": {...},
          "status": "assigned|in_consultation|completed"
        } | null,
        "createdAt": "date"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 100,
      "itemsPerPage": 10
    },
    "stats": {
      "total": 100,
      "withPayment": 85,
      "assigned": 70
    }
  }
}
```

**Logique**:
- Appliquer les filtres de date et recherche
- Inclure les informations de paiement, lit, et assignation
- Calculer les statistiques
- Paginer les résultats

### GET `/api/v1/reception/patients/export`
**Description**: Exporter la liste des patients en Excel (admin uniquement)

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `date` (string, optional)
- `search` (string, optional)

**Réponse (200)**:
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Fichier Excel en téléchargement

**Logique**:
- Récupérer tous les patients selon les filtres
- Générer un fichier Excel avec les colonnes :
  - ID Vitalis
  - Nom complet
  - Date de naissance
  - Âge
  - Sexe
  - Téléphone
  - Email
  - Adresse
  - Lit (si occupé)
  - Date d'enregistrement
- Retourner le fichier

### GET `/api/v1/reception/patients/:id`
**Description**: Récupérer les détails d'un patient (sans résultats médicaux)

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
    "bed": {...} | null,
    "payment": {...} | null,
    "assignment": {...} | null,
    "createdAt": "date"
  }
}
```

**Note**: Les résultats de laboratoire et d'imagerie ne sont pas inclus pour le rôle réception.

## Routes Enregistrement Patient

### POST `/api/v1/reception/patients/register`
**Description**: Enregistrer un nouveau patient avec paiement et optionnellement assignation

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
  "emergencyContact": "string (optional)",
  "payment": {
    "method": "cash|orange_money (required)",
    "amount": "number (required)",
    "reference": "string (optional, required if method is orange_money)"
  },
  "bedId": "uuid (optional)",
  "assignDoctor": "boolean (optional, default: false)",
  "doctorId": "uuid (optional, required if assignDoctor is true)"
}
```

**Réponse succès (201)**:
```json
{
  "success": true,
  "data": {
    "patient": {
      "id": "uuid",
      "vitalisId": "VTL-2026-00001",
      "firstName": "string",
      "lastName": "string",
      "createdAt": "date"
    },
    "payment": {
      "id": "uuid",
      "amount": 15000.00,
      "status": "paid",
      "type": "consultation"
    },
    "bed": {
      "id": "uuid",
      "number": "101",
      "isOccupied": true
    } | null,
    "assignment": {
      "id": "uuid",
      "doctorId": "uuid",
      "status": "assigned"
    } | null
  }
}
```

**Logique**:
1. Valider les données du patient
2. Générer le `vitalisId` automatiquement
3. Créer le patient
4. Créer le paiement avec le statut 'paid'
5. Si `bedId` fourni :
   - Vérifier que le lit est disponible
   - Marquer le lit comme occupé
   - Lier le lit au patient
6. Si `assignDoctor` est true :
   - Vérifier que le médecin existe
   - Créer l'assignation
   - Créer le dossier de consultation
7. Retourner toutes les données créées

### POST `/api/v1/reception/patients/:id/payment`
**Description**: Enregistrer un paiement pour un patient existant

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "method": "cash|orange_money (required)",
  "amount": "number (required)",
  "type": "consultation|lab|imaging|pharmacy (required)",
  "reference": "string (optional, required if method is orange_money)",
  "relatedId": "uuid (optional)" - ID de la ressource liée (lab_request, etc.)
}
```

**Réponse succès (201)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patientId": "uuid",
    "amount": 15000.00,
    "method": "cash",
    "status": "paid",
    "type": "consultation",
    "createdAt": "date"
  }
}
```

**Logique**:
- Vérifier que le patient existe
- Valider les données de paiement
- Créer le paiement avec le statut 'paid'
- Si `relatedId` fourni, lier le paiement à la ressource
- Retourner le paiement créé

## Routes Paiements

### GET `/api/v1/reception/payments`
**Description**: Liste tous les paiements avec filtres

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `date` (string, optional, format: YYYY-MM-DD)
- `type` (string, optional) - 'consultation', 'lab', 'imaging', 'pharmacy', 'all'
- `status` (string, optional) - 'pending', 'paid', 'cancelled', 'all'
- `search` (string, optional) - Recherche par ID Vitalis, nom patient, ou numéro paiement

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "uuid",
        "patient": {
          "id": "uuid",
          "vitalisId": "VTL-2026-00001",
          "firstName": "string",
          "lastName": "string"
        },
        "amount": 15000.00,
        "method": "cash|orange_money",
        "status": "paid",
        "type": "consultation|lab|imaging|pharmacy",
        "reference": "string|null",
        "createdBy": {...},
        "createdAt": "date"
      }
    ],
    "pagination": {...},
    "stats": {
      "total": 1000,
      "totalAmount": 15000000.00,
      "today": 12,
      "todayAmount": 180000.00
    }
  }
}
```

**Logique**:
- Appliquer tous les filtres
- Inclure les informations du patient
- Calculer les statistiques
- Paginer les résultats

### GET `/api/v1/reception/payments/:id`
**Description**: Récupérer les détails d'un paiement

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patient": {...},
    "amount": 15000.00,
    "method": "cash",
    "status": "paid",
    "type": "consultation",
    "reference": "string|null",
    "relatedResource": {...} | null,
    "createdBy": {...},
    "createdAt": "date"
  }
}
```

## Routes Paiements Laboratoire et Imagerie

### GET `/api/v1/reception/lab-payments`
**Description**: Liste des demandes de laboratoire et imagerie pour paiement

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `date` (string, optional, format: YYYY-MM-DD)
- `status` (string, optional) - 'all', 'pending', 'paid'
- `search` (string, optional) - Recherche par nom patient, ID Vitalis, ou N° demande
- `type` (string, optional) - 'lab', 'imaging', 'all'

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "uuid",
        "type": "lab|imaging",
        "patient": {...},
        "doctor": {...},
        "status": "pending|sent_to_doctor",
        "totalAmount": 15000.00,
        "paymentId": "uuid|null",
        "exams": [...],
        "createdAt": "date"
      }
    ],
    "pagination": {...},
    "stats": {
      "total": 50,
      "pending": 10,
      "paid": 40,
      "totalAmount": 750000.00,
      "pendingAmount": 150000.00
    }
  }
}
```

**Logique**:
- Filtrer par type (lab ou imaging)
- Appliquer les filtres de date, statut, et recherche
- Pour le statut 'pending', retourner uniquement les demandes sans `paymentId`
- Pour le statut 'paid', retourner uniquement les demandes avec `paymentId`
- Calculer les statistiques
- Paginer les résultats

### GET `/api/v1/reception/lab-payments/export`
**Description**: Exporter les paiements labo/imagerie en Excel (admin uniquement)

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `date` (string, optional)
- `status` (string, optional)
- `search` (string, optional)

**Réponse (200)**:
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Fichier Excel en téléchargement

### POST `/api/v1/reception/lab-payments/:id/pay`
**Description**: Enregistrer le paiement d'une demande de laboratoire ou imagerie

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "method": "cash|orange_money (required)",
  "reference": "string (optional, required if method is orange_money)",
  "assignToLab": "boolean (optional, default: true)",
  "labTechnicianId": "uuid (optional, required if assignToLab is true)"
}
```

**Réponse succès (200)**:
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "uuid",
      "amount": 15000.00,
      "status": "paid",
      "type": "lab|imaging"
    },
    "request": {
      "id": "uuid",
      "paymentId": "uuid",
      "labTechnicianId": "uuid|null",
      "status": "pending"
    }
  }
}
```

**Logique**:
- Vérifier que la demande existe
- Vérifier que la demande n'a pas déjà de paiement
- Créer le paiement avec le statut 'paid'
- Lier le paiement à la demande
- Si `assignToLab` est true :
  - Vérifier que le technicien existe et a le rôle 'lab'
  - Assigner le technicien à la demande
- Retourner le paiement et la demande mise à jour

## Routes Assignation Médecin

### GET `/api/v1/reception/assignments`
**Description**: Liste des patients avec paiement pour assignation

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `search` (string, optional) - Recherche par nom ou ID Vitalis
- `status` (string, optional) - 'all', 'assigned', 'unassigned'

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
        "payment": {
          "id": "uuid",
          "amount": 15000.00,
          "status": "paid",
          "type": "consultation"
        },
        "assignment": {
          "id": "uuid",
          "doctor": {...},
          "status": "assigned|in_consultation|completed"
        } | null
      }
    ],
    "pagination": {...}
  }
}
```

**Logique**:
- Filtrer uniquement les patients avec un paiement de consultation payé
- Inclure l'assignation actuelle si elle existe
- Appliquer les filtres de recherche et statut
- Paginer les résultats

### POST `/api/v1/reception/assignments`
**Description**: Assigner un médecin à un patient

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
    "dossier": {
      "id": "uuid",
      "status": "active"
    },
    "createdAt": "date"
  }
}
```

**Logique**:
- Vérifier que le patient existe
- Vérifier que le médecin existe et a le rôle 'doctor'
- Vérifier que le paiement existe, est payé, et de type 'consultation'
- Vérifier qu'il n'y a pas déjà une assignation active pour ce patient
- Créer l'assignation avec le statut 'assigned'
- Créer automatiquement un dossier de consultation avec le statut 'active'
- Retourner l'assignation et le dossier créés

### GET `/api/v1/reception/doctors`
**Description**: Liste tous les médecins disponibles

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "department": "string|null",
      "activeAssignments": 5
    }
  ]
}
```

## Routes Lits

### GET `/api/v1/reception/beds`
**Description**: Liste tous les lits disponibles

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `type` (string, optional) - 'all', 'classic', 'vip'
- `available` (boolean, optional) - Filtrer uniquement les lits disponibles

**Réponse (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "number": "101",
      "type": "classic|vip",
      "additionalFee": 0.00,
      "isOccupied": false,
      "patient": {...} | null
    }
  ]
}
```

**Logique**:
- Si `available` est true, retourner uniquement les lits avec `isOccupied = false`
- Filtrer par type si fourni
- Inclure les informations du patient si le lit est occupé

### GET `/api/v1/reception/beds/available`
**Description**: Liste uniquement les lits disponibles

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `type` (string, optional) - 'all', 'classic', 'vip'

**Réponse (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "number": "101",
      "type": "classic",
      "additionalFee": 0.00
    }
  ]
}
```

### PATCH `/api/v1/reception/beds/:id/occupy`
**Description**: Marquer un lit comme occupé

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "patientId": "uuid (required)"
}
```

**Réponse (200)**:
```json
{
  "success": true,
  "message": "Lit occupé avec succès",
  "data": {
    "id": "uuid",
    "number": "101",
    "isOccupied": true,
    "patientId": "uuid"
  }
}
```

**Logique**:
- Vérifier que le lit existe
- Vérifier que le lit n'est pas déjà occupé
- Vérifier que le patient existe
- Marquer le lit comme occupé
- Lier le patient au lit
- Retourner le lit mis à jour

### PATCH `/api/v1/reception/beds/:id/free`
**Description**: Libérer un lit

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "message": "Lit libéré avec succès"
}
```

**Logique**:
- Vérifier que le lit existe
- Vérifier que le lit est occupé
- Marquer le lit comme disponible
- Retirer le lien avec le patient
- Retourner le succès

## Routes Statistiques Réception

### GET `/api/v1/reception/stats`
**Description**: Statistiques pour le tableau de bord réception

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `date` (string, optional, format: YYYY-MM-DD) - Date pour les statistiques du jour

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "patientsToday": 12,
    "paymentsToday": 10,
    "pendingAssignments": 3,
    "revenueToday": 150000.00,
    "bedsOccupied": 8,
    "bedsAvailable": 7
  }
}
```

**Logique**:
- Calculer les statistiques pour la date fournie (ou aujourd'hui)
- Retourner les statistiques agrégées
