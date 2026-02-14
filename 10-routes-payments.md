# Routes - Gestion des Paiements

## Base URL
`/api/v1/payments`

## Vue d'ensemble

Routes générales pour la gestion de tous les types de paiements dans le système.

## Routes principales

### GET `/api/v1/payments`
**Description**: Liste tous les paiements avec filtres avancés

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `date` (string, optional, format: YYYY-MM-DD)
- `type` (string, optional) - 'consultation', 'lab', 'imaging', 'pharmacy', 'all'
- `status` (string, optional) - 'pending', 'paid', 'cancelled', 'all'
- `method` (string, optional) - 'cash', 'orange_money', 'all'
- `search` (string, optional) - Recherche par patient, ID Vitalis, N° paiement
- `patientId` (uuid, optional)
- `createdBy` (uuid, optional)

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "uuid",
        "patient": {...},
        "amount": 15000.00,
        "method": "cash|orange_money",
        "status": "paid",
        "type": "consultation|lab|imaging|pharmacy",
        "reference": "string|null",
        "relatedResource": {
          "type": "consultation|lab_request|imaging_request|pharmacy_payment",
          "id": "uuid",
          "data": {...}
        } | null,
        "createdBy": {...},
        "createdAt": "date"
      }
    ],
    "pagination": {...},
    "stats": {
      "total": 1000,
      "totalAmount": 15000000.00,
      "today": {
        "count": 12,
        "amount": 180000.00
      },
      "byType": {
        "consultation": 500,
        "lab": 300,
        "imaging": 100,
        "pharmacy": 100
      },
      "byMethod": {
        "cash": 700,
        "orange_money": 300
      },
      "byStatus": {
        "paid": 950,
        "pending": 40,
        "cancelled": 10
      }
    }
  }
}
```

**Logique**:
- Appliquer tous les filtres
- Inclure les informations du patient
- Inclure la ressource liée si elle existe
- Calculer les statistiques complètes
- Paginer les résultats

### GET `/api/v1/payments/:id`
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
    "items": [...] | null, // Pour les paiements pharmacie
    "createdBy": {...},
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

### POST `/api/v1/payments`
**Description**: Créer un nouveau paiement

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "patientId": "uuid (required)",
  "amount": "number (required, min: 0)",
  "method": "cash|orange_money (required)",
  "type": "consultation|lab|imaging|pharmacy (required)",
  "reference": "string (optional, required if method is orange_money)",
  "relatedId": "uuid (optional)" - ID de la ressource liée
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
- Valider les données
- Vérifier que le patient existe
- Si `relatedId` fourni, vérifier que la ressource existe
- Créer le paiement avec le statut 'paid' par défaut
- Si `relatedId` fourni, lier le paiement à la ressource
- Retourner le paiement créé

### PATCH `/api/v1/payments/:id/status`
**Description**: Modifier le statut d'un paiement

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "status": "pending|paid|cancelled (required)"
}
```

**Réponse (200)**:
```json
{
  "success": true,
  "message": "Statut du paiement mis à jour",
  "data": {
    "id": "uuid",
    "status": "paid",
    "updatedAt": "date"
  }
}
```

**Logique**:
- Vérifier que le paiement existe
- Valider le nouveau statut
- Mettre à jour le statut
- Si annulation, gérer les conséquences (libérer les ressources liées si nécessaire)
- Retourner le paiement mis à jour

### DELETE `/api/v1/payments/:id`
**Description**: Annuler un paiement (soft delete recommandé)

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
  "message": "Paiement annulé avec succès"
}
```

**Logique**:
- Vérifier que le paiement existe
- Vérifier la confirmation
- Vérifier qu'il n'y a pas de ressources critiques liées
- Annuler le paiement (mettre le statut à 'cancelled')
- Gérer les conséquences (remboursement de stock si pharmacie, etc.)

## Routes Statistiques Paiements

### GET `/api/v1/payments/stats`
**Description**: Statistiques détaillées sur les paiements

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `date` (string, optional, format: YYYY-MM-DD)
- `startDate` (string, optional, format: YYYY-MM-DD)
- `endDate` (string, optional, format: YYYY-MM-DD)

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "total": {
      "count": 1000,
      "amount": 15000000.00
    },
    "today": {
      "count": 12,
      "amount": 180000.00
    },
    "thisMonth": {
      "count": 300,
      "amount": 4500000.00
    },
    "byType": {
      "consultation": {
        "count": 500,
        "amount": 7500000.00
      },
      "lab": {
        "count": 300,
        "amount": 4500000.00
      },
      "imaging": {
        "count": 100,
        "amount": 1500000.00
      },
      "pharmacy": {
        "count": 100,
        "amount": 1500000.00
      }
    },
    "byMethod": {
      "cash": {
        "count": 700,
        "amount": 10500000.00
      },
      "orange_money": {
        "count": 300,
        "amount": 4500000.00
      }
    },
    "byStatus": {
      "paid": {
        "count": 950,
        "amount": 14250000.00
      },
      "pending": {
        "count": 40,
        "amount": 600000.00
      },
      "cancelled": {
        "count": 10,
        "amount": 150000.00
      }
    },
    "trends": {
      "last7Days": [
        {
          "date": "2026-01-22",
          "count": 15,
          "amount": 225000.00
        }
      ]
    }
  }
}
```

**Logique**:
- Calculer les statistiques selon les paramètres de date
- Grouper par type, méthode, et statut
- Calculer les tendances sur les 7 derniers jours
- Retourner toutes les statistiques

### GET `/api/v1/payments/export`
**Description**: Exporter les paiements en Excel (admin uniquement)

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `date` (string, optional)
- `type` (string, optional)
- `status` (string, optional)
- `startDate` (string, optional)
- `endDate` (string, optional)

**Réponse (200)**:
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Fichier Excel en téléchargement

**Logique**:
- Récupérer tous les paiements selon les filtres
- Générer un fichier Excel avec les colonnes :
  - N° Paiement
  - Date
  - Patient (ID Vitalis, Nom)
  - Type
  - Montant
  - Méthode
  - Statut
  - Référence (si Orange Money)
  - Créé par
- Retourner le fichier
