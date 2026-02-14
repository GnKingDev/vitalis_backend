# Enregistrement des Résultats de Laboratoire

## Vue d'ensemble

Ce document explique comment les résultats de laboratoire sont enregistrés dans le système VITALIS. Le processus suit un workflow en plusieurs étapes : création, validation, et envoi au médecin.

## Workflow des Résultats

### 1. Création de la Demande de Laboratoire
- Le médecin crée une demande de laboratoire pour un patient
- La demande est créée avec le statut `pending`
- Un paiement `pending` est automatiquement créé et lié à la demande

### 2. Paiement de la Demande
- La réception enregistre le paiement de la demande
- Le statut du paiement passe de `pending` à `paid`
- La demande peut maintenant être assignée à un technicien de laboratoire

### 3. Assignation à un Technicien
- La réception assigne la demande à un technicien de laboratoire (utilisateur avec le rôle `lab`)
- La demande est maintenant prête à être traitée

### 4. Enregistrement des Résultats
- Le technicien assigné enregistre les résultats des examens
- Les résultats sont sauvegardés avec le statut `draft` (brouillon)
- Le technicien peut modifier les résultats tant qu'ils sont en statut `draft`

### 5. Validation des Résultats
- Un technicien (peut être différent de celui qui a créé) valide les résultats
- Le statut passe de `draft` à `validated`
- Les résultats validés ne peuvent plus être modifiés

### 6. Envoi au Médecin
- Les résultats validés sont envoyés au médecin
- Le statut passe de `validated` à `sent`
- La demande de laboratoire passe au statut `sent_to_doctor`
- Le médecin peut maintenant consulter les résultats

## Routes API

### POST `/api/v1/lab/results`
**Description**: Créer ou mettre à jour un résultat de laboratoire

**Permissions**: 
- Technicien de laboratoire assigné à la demande
- Administrateur

**Headers**: 
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body**:
```json
{
  "labRequestId": "uuid (required)",
  "results": {
    "sections": [
      {
        "title": "Hématologie",
        "items": [
          {
            "name": "Hémoglobine",
            "value": "14.5",
            "unit": "g/dL",
            "reference": "12.0-16.0",
            "status": "normal"
          },
          {
            "name": "Hématocrite",
            "value": "42.3",
            "unit": "%",
            "reference": "36-46",
            "status": "normal"
          }
        ]
      },
      {
        "title": "Biochimie",
        "items": [
          {
            "name": "Glycémie",
            "value": "95",
            "unit": "mg/dL",
            "reference": "70-100",
            "status": "normal"
          }
        ]
      }
    ]
  },
  "technicianNotes": "Notes du technicien (optionnel)"
}
```

**Validations**:
1. `labRequestId` et `results` sont requis
2. La demande de laboratoire doit exister
3. La demande doit avoir un `paymentId`
4. Le paiement associé doit exister
5. Le statut du paiement doit être `paid`
6. L'utilisateur doit être le technicien assigné à la demande OU être administrateur

**Réponse succès (200 ou 201)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "labRequestId": "uuid",
    "status": "draft",
    "results": {
      "sections": [...]
    },
    "technicianNotes": "string|null",
    "completedAt": "2026-02-14T10:30:00.000Z",
    "createdAt": "2026-02-14T10:30:00.000Z",
    "updatedAt": "2026-02-14T10:30:00.000Z"
  }
}
```

**Réponse erreur (400)**:
```json
{
  "success": false,
  "error": "Cette demande n'est pas encore payée. Elle ne peut pas être traitée pour le moment. Statut du paiement: pending"
}
```

**Réponse erreur (403)**:
```json
{
  "success": false,
  "error": "Vous n'êtes pas autorisé à modifier ce résultat"
}
```

## Structure des Résultats

### Format JSON des Résultats

Les résultats sont stockés dans un champ JSON avec la structure suivante :

```json
{
  "sections": [
    {
      "title": "Nom de la section (ex: Hématologie, Biochimie)",
      "items": [
        {
          "name": "Nom de l'examen (ex: Hémoglobine)",
          "value": "Valeur numérique ou textuelle",
          "unit": "Unité de mesure (ex: g/dL, mg/dL)",
          "reference": "Valeurs de référence (ex: 12.0-16.0)",
          "status": "normal|high|low|null"
        }
      ]
    }
  ]
}
```

### Champs des Items

- **name** (required): Nom de l'examen
- **value** (required): Valeur du résultat (peut être numérique ou textuelle)
- **unit** (optional): Unité de mesure
- **reference** (optional): Valeurs de référence normales
- **status** (optional): Statut du résultat (`normal`, `high`, `low`, ou `null`)

## Statuts des Résultats

### `draft` (Brouillon)
- Résultat créé mais pas encore validé
- Peut être modifié par le technicien assigné
- Statut initial lors de la création

### `validated` (Validé)
- Résultat vérifié et validé par un technicien
- Ne peut plus être modifié
- Prêt à être envoyé au médecin

### `sent` (Envoyé)
- Résultat envoyé au médecin
- La demande de laboratoire passe au statut `sent_to_doctor`
- Le médecin peut consulter les résultats

## Modèle de Données

### Table `lab_results`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Identifiant unique |
| `labRequestId` | UUID | Référence à la demande de laboratoire |
| `status` | ENUM | `draft`, `validated`, `sent` |
| `results` | JSON | Résultats structurés des examens |
| `technicianNotes` | TEXT | Notes du technicien (optionnel) |
| `validatedBy` | UUID | ID du technicien qui a validé (optionnel) |
| `validatedAt` | DATE | Date de validation (optionnel) |
| `sentAt` | DATE | Date d'envoi au médecin (optionnel) |
| `completedAt` | DATE | Date de complétion |
| `createdAt` | DATE | Date de création |
| `updatedAt` | DATE | Date de mise à jour |

## Exemple Complet

### 1. Création d'un résultat

**Requête**:
```http
POST /api/v1/lab/results
Authorization: Bearer <token>
Content-Type: application/json

{
  "labRequestId": "10b20562-def1-440f-b2e2-a194e2ba726f",
  "results": {
    "sections": [
      {
        "title": "Numération Formule Sanguine (NFS)",
        "items": [
          {
            "name": "Globules blancs (GB)",
            "value": "6500",
            "unit": "/mm³",
            "reference": "4000-10000",
            "status": "normal"
          },
          {
            "name": "Globules rouges (GR)",
            "value": "4.5",
            "unit": "millions/mm³",
            "reference": "4.0-5.5",
            "status": "normal"
          },
          {
            "name": "Hémoglobine (Hb)",
            "value": "14.2",
            "unit": "g/dL",
            "reference": "12.0-16.0",
            "status": "normal"
          },
          {
            "name": "Hématocrite (Ht)",
            "value": "42.5",
            "unit": "%",
            "reference": "36-46",
            "status": "normal"
          },
          {
            "name": "Plaquettes",
            "value": "250000",
            "unit": "/mm³",
            "reference": "150000-400000",
            "status": "normal"
          }
        ]
      }
    ]
  },
  "technicianNotes": "Résultats normaux, aucun commentaire particulier"
}
```

**Réponse**:
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "labRequestId": "10b20562-def1-440f-b2e2-a194e2ba726f",
    "status": "draft",
    "results": {
      "sections": [
        {
          "title": "Numération Formule Sanguine (NFS)",
          "items": [
            {
              "name": "Globules blancs (GB)",
              "value": "6500",
              "unit": "/mm³",
              "reference": "4000-10000",
              "status": "normal"
            },
            ...
          ]
        }
      ]
    },
    "technicianNotes": "Résultats normaux, aucun commentaire particulier",
    "completedAt": "2026-02-14T10:30:00.000Z",
    "createdAt": "2026-02-14T10:30:00.000Z",
    "updatedAt": "2026-02-14T10:30:00.000Z"
  }
}
```

### 2. Mise à jour d'un résultat (statut draft)

**Requête**:
```http
POST /api/v1/lab/results
Authorization: Bearer <token>
Content-Type: application/json

{
  "labRequestId": "10b20562-def1-440f-b2e2-a194e2ba726f",
  "results": {
    "sections": [
      {
        "title": "Numération Formule Sanguine (NFS)",
        "items": [
          {
            "name": "Globules blancs (GB)",
            "value": "6800",
            "unit": "/mm³",
            "reference": "4000-10000",
            "status": "normal"
          },
          ...
        ]
      }
    ]
  },
  "technicianNotes": "Correction de la valeur des GB"
}
```

**Réponse**: Même format que la création, mais avec `updatedAt` mis à jour.

### 3. Validation d'un résultat

**Requête**:
```http
PATCH /api/v1/lab/results/:id/validate
Authorization: Bearer <token>
```

**Réponse**:
```json
{
  "success": true,
  "message": "Résultat validé avec succès",
  "data": {
    "id": "uuid",
    "status": "validated",
    "validatedBy": {
      "id": "uuid",
      "name": "Nom du validateur",
      "email": "email@example.com"
    },
    "validatedAt": "2026-02-14T11:00:00.000Z"
  }
}
```

### 4. Envoi au médecin

**Requête**:
```http
PATCH /api/v1/lab/results/:id/send
Authorization: Bearer <token>
```

**Réponse**:
```json
{
  "success": true,
  "message": "Résultat envoyé au médecin avec succès",
  "data": {
    "id": "uuid",
    "status": "sent",
    "sentAt": "2026-02-14T11:15:00.000Z"
  }
}
```

## Règles de Validation

### Avant l'enregistrement
1. ✅ La demande de laboratoire doit exister
2. ✅ La demande doit avoir un `paymentId`
3. ✅ Le paiement associé doit exister dans la base de données
4. ✅ Le statut du paiement doit être `paid`
5. ✅ L'utilisateur doit être le technicien assigné (`labRequest.labTechnicianId === user.id`) OU être administrateur

### Pendant l'enregistrement
1. ✅ Si un résultat existe déjà pour cette demande, il est mis à jour (seulement si statut `draft`)
2. ✅ Si aucun résultat n'existe, un nouveau est créé
3. ✅ Le statut est toujours défini à `draft` lors de la création/mise à jour
4. ✅ Le champ `completedAt` est automatiquement défini à la date actuelle

### Après validation
- ❌ Les résultats avec le statut `validated` ou `sent` ne peuvent plus être modifiés
- ✅ Seuls les résultats en statut `draft` peuvent être modifiés

## Consultation des Résultats

### Par le Technicien
- **GET `/api/v1/lab/results`**: Liste tous les résultats (avec pagination)
- **GET `/api/v1/lab/results/:id`**: Détails d'un résultat spécifique

### Par le Médecin
- **GET `/api/v1/doctor/results`**: Liste les résultats envoyés (statut `sent`)
- **GET `/api/v1/doctor/results/:id`**: Détails d'un résultat pour consultation

## Notes Importantes

1. **Un seul résultat par demande**: Une demande de laboratoire ne peut avoir qu'un seul résultat. Si un résultat existe déjà, il est mis à jour au lieu d'être créé.

2. **Modification uniquement en draft**: Les résultats ne peuvent être modifiés que s'ils sont en statut `draft`. Une fois validés ou envoyés, ils sont en lecture seule.

3. **Paiement obligatoire**: Une demande doit être payée avant que les résultats puissent être enregistrés.

4. **Assignation requise**: Seul le technicien assigné à la demande peut enregistrer les résultats (sauf administrateur).

5. **Format JSON flexible**: Le champ `results` accepte n'importe quelle structure JSON, permettant une grande flexibilité dans l'organisation des résultats selon le type d'examen.
