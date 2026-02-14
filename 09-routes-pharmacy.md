# Routes - Pharmacie

## Base URL
`/api/v1/pharmacy`

## Vue d'ensemble

Les routes de pharmacie gèrent le stock de produits, les alertes, et les paiements de pharmacie.

## Routes Produits

### GET `/api/v1/pharmacy/products`
**Description**: Liste tous les produits de pharmacie

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `search` (string, optional) - Recherche par nom
- `category` (string, optional) - Filtrer par catégorie
- `lowStock` (boolean, optional) - Filtrer uniquement les produits en stock faible
- `outOfStock` (boolean, optional) - Filtrer uniquement les produits en rupture

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "name": "string",
        "category": "string",
        "price": 5000.00,
        "stock": 50,
        "minStock": 10,
        "unit": "string",
        "expiryDate": "date|null",
        "isActive": true,
        "status": "in_stock|low_stock|out_of_stock"
      }
    ],
    "pagination": {...}
  }
}
```

**Logique**:
- Calculer le statut du stock (in_stock, low_stock, out_of_stock)
- Appliquer les filtres de recherche et catégorie
- Filtrer par statut de stock si demandé
- Paginer les résultats

### GET `/api/v1/pharmacy/products/:id`
**Description**: Récupérer les détails d'un produit

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "category": "string",
    "price": 5000.00,
    "stock": 50,
    "minStock": 10,
    "unit": "string",
    "expiryDate": "date|null",
    "isActive": true,
    "status": "in_stock",
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

### POST `/api/v1/pharmacy/products`
**Description**: Créer un nouveau produit

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "name": "string (required)",
  "category": "string (required)",
  "price": "number (required, min: 0)",
  "stock": "integer (required, min: 0)",
  "minStock": "integer (required, min: 0)",
  "unit": "string (required)",
  "expiryDate": "date (optional, format: YYYY-MM-DD)"
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
    "stock": 50,
    "minStock": 10,
    "unit": "string",
    "createdAt": "date"
  }
}
```

**Logique**:
- Valider les données
- Créer le produit
- Retourner le produit créé

### PUT `/api/v1/pharmacy/products/:id`
**Description**: Modifier un produit

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "name": "string (optional)",
  "category": "string (optional)",
  "price": "number (optional)",
  "stock": "integer (optional)",
  "minStock": "integer (optional)",
  "unit": "string (optional)",
  "expiryDate": "date (optional)",
  "isActive": "boolean (optional)"
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

### DELETE `/api/v1/pharmacy/products/:id`
**Description**: Supprimer un produit (soft delete recommandé)

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "message": "Produit supprimé avec succès"
}
```

## Routes Alertes Stock

### GET `/api/v1/pharmacy/alerts`
**Description**: Liste toutes les alertes de stock

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `type` (string, optional) - 'all', 'out_of_stock', 'low_stock', 'expiring_soon'
- `search` (string, optional) - Recherche par nom de produit

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "uuid",
        "product": {
          "id": "uuid",
          "name": "string",
          "category": "string",
          "stock": 5,
          "minStock": 10,
          "unit": "string"
        },
        "type": "out_of_stock|low_stock|expiring_soon",
        "message": "string",
        "severity": "critical|warning|info"
      }
    ],
    "pagination": {...},
    "stats": {
      "total": 25,
      "outOfStock": 5,
      "lowStock": 15,
      "expiringSoon": 5
    }
  }
}
```

**Logique**:
- Identifier les produits avec :
  - Stock = 0 (out_of_stock)
  - Stock < minStock (low_stock)
  - ExpiryDate dans les 30 prochains jours (expiring_soon)
- Filtrer par type si fourni
- Calculer les statistiques
- Paginer les résultats

### GET `/api/v1/pharmacy/alerts/stats`
**Description**: Statistiques sur les alertes

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "total": 25,
    "outOfStock": 5,
    "lowStock": 15,
    "expiringSoon": 5
  }
}
```

## Routes Paiements Pharmacie

### GET `/api/v1/pharmacy/payments`
**Description**: Liste tous les paiements de pharmacie

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `date` (string, optional, format: YYYY-MM-DD)
- `status` (string, optional) - 'all', 'pending', 'paid', 'cancelled'
- `search` (string, optional) - Recherche par patient, ID Vitalis, N° paiement

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "uuid",
        "patient": {...} | null,
        "patientId": "uuid|null",
        "amount": 50000.00,
        "method": "cash|orange_money",
        "status": "paid",
        "type": "pharmacy",
        "reference": "string|null",
        "items": [
          {
            "id": "uuid",
            "product": {
              "id": "uuid",
              "name": "string",
              "category": "string"
            },
            "quantity": 2,
            "unitPrice": 5000.00,
            "totalPrice": 10000.00
          }
        ],
        "createdBy": {...},
        "createdAt": "date"
      }
    ],
    "pagination": {...}
  }
}
```

**Logique**:
- Filtrer uniquement les paiements de type 'pharmacy'
- Appliquer les filtres de date, statut, et recherche
- Inclure les items de paiement avec les détails des produits
- Paginer les résultats

### GET `/api/v1/pharmacy/payments/:id`
**Description**: Récupérer les détails d'un paiement

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patient": {...} | null,
    "amount": 50000.00,
    "method": "cash",
    "status": "paid",
    "type": "pharmacy",
    "items": [...],
    "createdBy": {...},
    "createdAt": "date"
  }
}
```

### POST `/api/v1/pharmacy/payments`
**Description**: Créer un nouveau paiement de pharmacie

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "patientId": "uuid (optional)",
  "items": [
    {
      "productId": "uuid (required)",
      "quantity": "integer (required, min: 1)"
    }
  ],
  "method": "cash|orange_money (required)",
  "reference": "string (optional, required if method is orange_money)"
}
```

**Réponse succès (201)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patientId": "uuid|null",
    "amount": 50000.00,
    "method": "cash",
    "status": "paid",
    "type": "pharmacy",
    "items": [...],
    "createdAt": "date"
  }
}
```

**Logique**:
- Valider que tous les produits existent
- Vérifier que les quantités sont disponibles en stock
- Calculer le montant total
- Créer le paiement avec le statut 'paid'
- Créer les items de paiement
- Mettre à jour les stocks des produits (déduire les quantités)
- Retourner le paiement créé

**Important**: La mise à jour du stock doit être transactionnelle pour éviter les problèmes de concurrence.

## Routes Statistiques Pharmacie

### GET `/api/v1/pharmacy/stats`
**Description**: Statistiques pour le tableau de bord pharmacie

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `date` (string, optional) - Date pour les statistiques du jour

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "totalProducts": 150,
    "totalStockValue": 5000000.00,
    "alerts": {
      "total": 25,
      "outOfStock": 5,
      "lowStock": 15,
      "expiringSoon": 5
    },
    "paymentsToday": {
      "count": 10,
      "amount": 500000.00
    },
    "topProducts": [
      {
        "product": {...},
        "quantitySold": 50
      }
    ]
  }
}
```
