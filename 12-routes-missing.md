# Routes Manquantes et Compléments

## Routes à Ajouter

Après analyse du frontend, voici les routes supplémentaires nécessaires qui n'ont pas été documentées dans les fichiers précédents :

## Routes Dossiers de Consultation (Médecin)

### GET `/api/v1/doctor/dossiers`
**Description**: Liste des dossiers actifs pour un médecin

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `status` (string, optional) - 'active', 'completed', 'archived', 'all'
- `search` (string, optional) - Recherche par patient

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "dossiers": [
      {
        "id": "uuid",
        "patient": {...},
        "assignment": {...},
        "consultation": {...} | null,
        "status": "active|completed|archived",
        "createdAt": "date"
      }
    ],
    "pagination": {...}
  }
}
```

### GET `/api/v1/doctor/dossiers/:id`
**Description**: Récupérer un dossier complet avec toutes les données

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "patient": {...},
    "assignment": {...},
    "consultation": {...} | null,
    "labRequests": [...],
    "imagingRequests": [...],
    "prescriptions": [...],
    "customItems": [...],
    "status": "string",
    "createdAt": "date"
  }
}
```

### POST `/api/v1/doctor/consultations`
**Description**: Créer ou mettre à jour une consultation depuis le dossier

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "dossierId": "uuid (required)",
  "symptoms": "string (optional)",
  "vitals": {...},
  "diagnosis": "string (optional)",
  "notes": "string (optional)"
}
```

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "dossierId": "uuid",
    "consultationId": "uuid",
    "updatedAt": "date"
  }
}
```

### POST `/api/v1/doctor/consultations/:id/complete`
**Description**: Terminer une consultation (marque le dossier comme completed)

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "message": "Consultation terminée"
}
```

## Routes Ordonnances (Prescriptions)

### GET `/api/v1/doctor/prescriptions`
**Description**: Liste des ordonnances créées par un médecin

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `patientId` (uuid, optional)
- `status` (string, optional) - 'draft', 'sent_to_pharmacy', 'completed'

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "prescriptions": [
      {
        "id": "uuid",
        "patient": {...},
        "status": "string",
        "items": [...],
        "createdAt": "date"
      }
    ],
    "pagination": {...}
  }
}
```

### POST `/api/v1/doctor/prescriptions`
**Description**: Créer une ordonnance depuis la consultation

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "consultationId": "uuid (required)",
  "patientId": "uuid (required)",
  "items": [
    {
      "medication": "string (required)",
      "dosage": "string (required)",
      "frequency": "string (required)",
      "duration": "string (required)",
      "quantity": "string (required)",
      "instructions": "string (optional)"
    }
  ],
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
    "consultationId": "uuid",
    "status": "draft",
    "items": [...],
    "createdAt": "date"
  }
}
```

### PATCH `/api/v1/doctor/prescriptions/:id/send`
**Description**: Envoyer une ordonnance à la pharmacie (changer le statut)

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "message": "Ordonnance envoyée à la pharmacie"
}
```

**Note**: Cette route n'est peut-être plus nécessaire si on a supprimé le bouton "Envoyer à la pharmacie" du frontend.

## Routes Items Personnalisés (Autre)

### POST `/api/v1/doctor/custom-items`
**Description**: Créer un item personnalisé dans l'onglet "Autre"

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "consultationId": "uuid (optional)",
  "patientId": "uuid (required)",
  "doctorId": "uuid (required)",
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

### GET `/api/v1/doctor/custom-items`
**Description**: Liste des items personnalisés pour un patient ou consultation

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `patientId` (uuid, optional)
- `consultationId` (uuid, optional)
- `doctorId` (uuid, optional)

**Réponse (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string|null",
      "patient": {...},
      "consultation": {...} | null,
      "createdAt": "date"
    }
  ]
}
```

## Routes Résultats Combinés (Labo et Imagerie)

### GET `/api/v1/doctor/results`
**Description**: Liste combinée des résultats de laboratoire et d'imagerie pour un médecin

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `type` (string, optional) - 'lab', 'imaging', 'all'
- `patientId` (uuid, optional)
- `search` (string, optional)

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "uuid",
        "type": "lab|imaging",
        "patient": {...},
        "request": {...},
        "status": "string",
        "completedAt": "date"
      }
    ],
    "pagination": {...}
  }
}
```

**Logique**:
- Combiner les résultats de laboratoire et d'imagerie
- Filtrer uniquement ceux envoyés au médecin (status = 'sent_to_doctor' pour les demandes)
- Trier par date (plus récent en premier)
- Paginer les résultats

### GET `/api/v1/doctor/results/:id`
**Description**: Récupérer les détails d'un résultat (lab ou imaging)

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "type": "lab|imaging",
    "patient": {...},
    "doctor": {...},
    "request": {...},
    "results": {...}, // Structure différente selon le type
    "notes": "string|null",
    "completedAt": "date"
  }
}
```

## Routes Laboratoire - Détails et Traitement

### GET `/api/v1/lab/requests/:id/detail`
**Description**: Récupérer les détails complets d'une demande (pour la page de traitement)

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
    "payment": {...},
    "result": {...} | null,
    "notes": "string|null",
    "createdAt": "date"
  }
}
```

### POST `/api/v1/lab/requests/:id/start`
**Description**: Démarrer le traitement d'une demande (optionnel)

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "message": "Traitement démarré"
}
```

## Routes Pharmacie - Ordonnances

### GET `/api/v1/pharmacy/prescriptions`
**Description**: Liste des ordonnances reçues (si cette fonctionnalité est maintenue)

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `status` (string, optional) - 'sent_to_pharmacy', 'completed'

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    "prescriptions": [
      {
        "id": "uuid",
        "patient": {...},
        "doctor": {...},
        "status": "string",
        "items": [...],
        "createdAt": "date"
      }
    ],
    "pagination": {...}
  }
}
```

**Note**: Cette route peut ne pas être nécessaire si on a supprimé "Ordonnances à traiter" du frontend.

### GET `/api/v1/pharmacy/prescriptions/:id`
**Description**: Détails d'une ordonnance pour la pharmacie

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
    "items": [...],
    "notes": "string|null",
    "createdAt": "date"
  }
}
```

## Routes Patients - Recherche et Accès

### GET `/api/v1/patients/search`
**Description**: Recherche rapide de patients (pour autocomplete, etc.)

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `q` (string, required) - Terme de recherche
- `limit` (number, default: 10)

**Réponse (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "vitalisId": "VTL-2026-00001",
      "firstName": "string",
      "lastName": "string",
      "phone": "string"
    }
  ]
}
```

## Routes Dashboard par Rôle

### GET `/api/v1/dashboard/stats`
**Description**: Statistiques pour le tableau de bord selon le rôle

**Headers**: `Authorization: Bearer <token>`

**Réponse (200)**:
```json
{
  "success": true,
  "data": {
    // Les données varient selon le rôle de l'utilisateur
    "role": "admin|reception|doctor|lab|pharmacy",
    "stats": {...}
  }
}
```

**Logique**:
- Détecter le rôle de l'utilisateur depuis le token
- Retourner les statistiques appropriées pour ce rôle
- Utiliser les routes de stats existantes mais avec un endpoint unique

## Routes PDF - Génération

### POST `/api/v1/pdf/generate`
**Description**: Route générique pour générer des PDFs

**Headers**: `Authorization: Bearer <token>`

**Body**:
```json
{
  "type": "lab_result|imaging_result|prescription|custom_item",
  "dataId": "uuid (required)",
  "options": {
    "format": "A4",
    "orientation": "portrait|landscape"
  }
}
```

**Réponse (200)**:
- Content-Type: `application/pdf`
- Fichier PDF en téléchargement

**Note**: Voir le fichier `13-pdf-generation.md` pour les détails.

## Routes Manquantes Identifiées

### 1. Routes Dossiers de Consultation
- ✅ GET `/api/v1/doctor/dossiers` - Liste des dossiers
- ✅ GET `/api/v1/doctor/dossiers/:id` - Détails d'un dossier
- ✅ POST `/api/v1/doctor/consultations` - Créer/mettre à jour consultation
- ✅ POST `/api/v1/doctor/consultations/:id/complete` - Terminer consultation
- ✅ PATCH `/api/v1/dossiers/:id/archive` - Déjà documenté dans `05-routes-consultations.md`

### 2. Routes Ordonnances
- ✅ POST `/api/v1/doctor/prescriptions` - Créer ordonnance
- ✅ GET `/api/v1/doctor/prescriptions` - Liste ordonnances médecin
- ⚠️ PATCH `/api/v1/doctor/prescriptions/:id/send` - Peut-être supprimé du frontend

### 3. Routes Items Personnalisés
- ✅ POST `/api/v1/doctor/custom-items` - Créer item
- ✅ GET `/api/v1/doctor/custom-items` - Liste items

### 4. Routes Résultats Combinés
- ✅ GET `/api/v1/doctor/results` - Liste combinée lab/imagerie
- ✅ GET `/api/v1/doctor/results/:id` - Détails résultat

### 5. Routes Laboratoire Détails
- ✅ GET `/api/v1/lab/requests/:id/detail` - Détails complets

### 6. Routes Recherche
- ✅ GET `/api/v1/patients/search` - Recherche rapide

### 7. Routes Dashboard
- ✅ GET `/api/v1/dashboard/stats` - Stats par rôle

## Routes à Vérifier si Nécessaires

### Routes Pharmacie Ordonnances
- ⚠️ GET `/api/v1/pharmacy/prescriptions` - Peut-être supprimé
- ⚠️ GET `/api/v1/pharmacy/prescriptions/:id` - Peut-être supprimé

**Action**: Vérifier dans le frontend si ces routes sont encore utilisées.
