# Routes - Statistiques et Rapports

## Base URL
`/api/v1/stats`

## Vue d'ensemble

Routes pour les statistiques et rapports globaux. Accessibles principalement aux administrateurs.

## Routes Statistiques Globales

### GET `/api/v1/stats/overview`
**Description**: Vue d'ensemble des statistiques générales

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `date` (string, optional, format: YYYY-MM-DD) - Date pour les statistiques du jour

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "patients": {
      "total": 1000,
      "today": 12,
      "thisMonth": 150
    },
    "consultations": {
      "total": 800,
      "today": 8,
      "completed": 750,
      "inProgress": 30
    },
    "payments": {
      "total": 1000,
      "today": 12,
      "revenue": {
        "total": 15000000.00,
        "today": 180000.00,
        "thisMonth": 2250000.00
      }
    },
    "lab": {
      "total": 500,
      "pending": 15,
      "completed": 485
    },
    "imaging": {
      "total": 200,
      "pending": 10,
      "completed": 190
    },
    "users": {
      "total": 50,
      "byRole": {
        "admin": 2,
        "reception": 5,
        "doctor": 15,
        "lab": 8,
        "pharmacy": 10
      }
    }
  }
}
```

**Logique**:
- Calculer toutes les statistiques selon la date fournie (ou aujourd'hui)
- Agréger les données de tous les modules
- Retourner les statistiques complètes

### GET `/api/v1/stats/patients`
**Description**: Statistiques détaillées sur les patients

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `date` (string, optional)
- `startDate` (string, optional)
- `endDate` (string, optional)

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "total": 1000,
    "today": 12,
    "thisMonth": 150,
    "thisYear": 1200,
    "byGender": {
      "M": 520,
      "F": 480
    },
    "byAgeGroup": {
      "0-18": 200,
      "19-35": 400,
      "36-50": 250,
      "51-65": 100,
      "65+": 50
    },
    "trends": {
      "last7Days": [...],
      "last30Days": [...]
    }
  }
}
```

### GET `/api/v1/stats/consultations`
**Description**: Statistiques sur les consultations

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `date` (string, optional)
- `doctorId` (uuid, optional)

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "total": 800,
    "today": 8,
    "byStatus": {
      "waiting": 10,
      "in_progress": 30,
      "completed": 760
    },
    "byDoctor": [
      {
        "doctor": {...},
        "count": 200,
        "completed": 190
      }
    ],
    "averageDuration": 45, // minutes
    "trends": {...}
  }
}
```

### GET `/api/v1/stats/revenue`
**Description**: Statistiques sur les revenus

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `date` (string, optional)
- `startDate` (string, optional)
- `endDate` (string, optional)

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "total": 15000000.00,
    "today": 180000.00,
    "thisMonth": 2250000.00,
    "thisYear": 18000000.00,
    "byType": {
      "consultation": 7500000.00,
      "lab": 4500000.00,
      "imaging": 1500000.00,
      "pharmacy": 1500000.00
    },
    "byMethod": {
      "cash": 10500000.00,
      "orange_money": 4500000.00
    },
    "trends": {
      "daily": [...],
      "monthly": [...]
    },
    "projections": {
      "thisMonth": 2500000.00,
      "thisYear": 20000000.00
    }
  }
}
```

### GET `/api/v1/stats/lab`
**Description**: Statistiques sur les examens de laboratoire

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `date` (string, optional)

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "total": 500,
    "pending": 15,
    "completed": 485,
    "today": {
      "total": 5,
      "pending": 2,
      "completed": 3
    },
    "byCategory": {
      "Hématologie": 200,
      "Biochimie": 150,
      "Microbiologie": 100,
      "Autres": 50
    },
    "averageProcessingTime": 120, // minutes
    "trends": {...}
  }
}
```

### GET `/api/v1/stats/imaging`
**Description**: Statistiques sur les examens d'imagerie

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `date` (string, optional)

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "total": 200,
    "pending": 10,
    "completed": 190,
    "today": {
      "total": 3,
      "pending": 1,
      "completed": 2
    },
    "byCategory": {
      "Radiographie": 100,
      "Échographie": 50,
      "Scanner": 30,
      "IRM": 20
    },
    "trends": {...}
  }
}
```

### GET `/api/v1/stats/pharmacy`
**Description**: Statistiques sur la pharmacie

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `date` (string, optional)

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "products": {
      "total": 150,
      "inStock": 125,
      "lowStock": 15,
      "outOfStock": 10
    },
    "stockValue": 5000000.00,
    "sales": {
      "today": {
        "count": 10,
        "amount": 500000.00
      },
      "thisMonth": {
        "count": 300,
        "amount": 15000000.00
      }
    },
    "topProducts": [...],
    "alerts": {
      "total": 25,
      "outOfStock": 5,
      "lowStock": 15,
      "expiringSoon": 5
    }
  }
}
```

### GET `/api/v1/stats/users`
**Description**: Statistiques sur les utilisateurs

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "total": 50,
    "active": 48,
    "suspended": 2,
    "byRole": {
      "admin": 2,
      "reception": 5,
      "doctor": 15,
      "lab": 8,
      "pharmacy": 10
    },
    "activity": {
      "lastLogin": {
        "today": 45,
        "last7Days": 48,
        "last30Days": 50
      }
    }
  }
}
```

### GET `/api/v1/stats/beds`
**Description**: Statistiques sur les lits

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "total": 15,
    "occupied": 8,
    "available": 7,
    "byType": {
      "classic": {
        "total": 10,
        "occupied": 5,
        "available": 5
      },
      "vip": {
        "total": 5,
        "occupied": 3,
        "available": 2
      }
    },
    "occupancyRate": 53.33,
    "revenue": {
      "today": 45000.00,
      "thisMonth": 675000.00
    }
  }
}
```

## Routes Rapports

### GET `/api/v1/stats/reports/daily`
**Description**: Rapport quotidien complet

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `date` (string, required, format: YYYY-MM-DD)

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "date": "2026-01-28",
    "summary": {
      "patients": 12,
      "consultations": 8,
      "payments": 12,
      "revenue": 180000.00
    },
    "details": {
      "patients": [...],
      "consultations": [...],
      "payments": [...],
      "labRequests": [...],
      "imagingRequests": [...]
    }
  }
}
```

### GET `/api/v1/stats/reports/monthly`
**Description**: Rapport mensuel

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `month` (number, optional, 1-12, default: mois actuel)
- `year` (number, optional, default: année actuelle)

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "month": 1,
    "year": 2026,
    "summary": {
      "patients": 150,
      "consultations": 120,
      "payments": 300,
      "revenue": 2250000.00
    },
    "dailyBreakdown": [...],
    "trends": {...}
  }
}
```
