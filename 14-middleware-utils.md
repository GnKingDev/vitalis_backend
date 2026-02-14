# Middleware et Utilitaires

## Vue d'ensemble

Ce document décrit les middleware personnalisés et les fonctions utilitaires utilisés dans le backend.

## Middleware d'Authentification

### `authMiddleware.js`

**Description**: Vérifie la validité du token JWT et ajoute l'utilisateur à la requête.

**Utilisation**:
```javascript
const { authMiddleware } = require('./middleware/auth');
router.get('/protected-route', authMiddleware, controller.handler);
```

**Fonctionnement**:
1. Extraire le token du header `Authorization: Bearer <token>`
2. Vérifier la présence du token
3. Vérifier la validité du token (signature, expiration)
4. Récupérer l'utilisateur depuis la base de données
5. Vérifier que l'utilisateur est actif (`isActive = true`)
6. Vérifier que l'utilisateur n'est pas suspendu (`isSuspended = false`)
7. Ajouter l'utilisateur à `req.user`
8. Passer au middleware suivant

**Erreurs**:
- 401: Token manquant
- 401: Token invalide
- 401: Token expiré
- 401: Utilisateur suspendu ou inactif

**Exemple d'implémentation**:
```javascript
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token manquant'
      });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.userId);
    
    if (!user || !user.isActive || user.isSuspended) {
      return res.status(401).json({
        success: false,
        error: 'Utilisateur non autorisé'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token invalide'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expiré'
      });
    }
    next(error);
  }
};

module.exports = { authMiddleware };
```

## Middleware d'Autorisation

### `authorizeMiddleware.js`

**Description**: Vérifie que l'utilisateur a le rôle requis pour accéder à une route.

**Utilisation**:
```javascript
const { authorize } = require('./middleware/authorize');
router.get('/admin-only', authMiddleware, authorize(['admin']), controller.handler);
```

**Fonctionnement**:
1. Vérifier que `req.user` existe (doit être utilisé après `authMiddleware`)
2. Vérifier que le rôle de l'utilisateur est dans la liste des rôles autorisés
3. Passer au middleware suivant ou retourner 403

**Erreurs**:
- 403: Accès refusé (rôle insuffisant)

**Exemple d'implémentation**:
```javascript
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé'
      });
    }
    
    next();
  };
};

module.exports = { authorize };
```

## Middleware de Validation

### `validateMiddleware.js`

**Description**: Valide les données de la requête selon un schéma Joi.

**Utilisation**:
```javascript
const { validate } = require('./middleware/validate');
const schema = require('./schemas/patientSchema');

router.post('/patients', authMiddleware, validate(schema.create), controller.create);
```

**Fonctionnement**:
1. Valider les données selon le schéma fourni
2. Si valide, passer au middleware suivant
3. Si invalide, retourner les erreurs de validation

**Exemple d'implémentation**:
```javascript
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Erreurs de validation',
        errors
      });
    }
    
    req.body = value;
    next();
  };
};

module.exports = { validate };
```

## Middleware de Gestion d'Erreurs

### `errorHandler.js`

**Description**: Gère toutes les erreurs de manière centralisée.

**Utilisation**:
```javascript
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);
```

**Fonctionnement**:
1. Intercepter toutes les erreurs
2. Logger l'erreur
3. Retourner une réponse d'erreur appropriée selon le type d'erreur
4. En production, masquer les détails sensibles

**Exemple d'implémentation**:
```javascript
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Erreur de validation Sequelize
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Erreurs de validation',
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }
  
  // Erreur de contrainte unique
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      error: 'Cette ressource existe déjà'
    });
  }
  
  // Erreur 404
  if (err.status === 404) {
    return res.status(404).json({
      success: false,
      error: err.message || 'Ressource non trouvée'
    });
  }
  
  // Erreur par défaut
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Une erreur est survenue' 
      : err.message
  });
};

module.exports = { errorHandler };
```

## Middleware de Pagination

### `paginationMiddleware.js`

**Description**: Parse et valide les paramètres de pagination.

**Utilisation**:
```javascript
const { paginationMiddleware } = require('./middleware/pagination');
router.get('/items', paginationMiddleware, controller.list);
```

**Fonctionnement**:
1. Extraire `page` et `limit` des query parameters
2. Valider et normaliser les valeurs
3. Ajouter `offset` et `limit` à `req.pagination`
4. Passer au middleware suivant

**Exemple d'implémentation**:
```javascript
const paginationMiddleware = (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;
  
  req.pagination = {
    page,
    limit,
    offset
  };
  
  next();
};

module.exports = { paginationMiddleware };
```

## Utilitaires

### `vitalisIdGenerator.js`

**Description**: Génère un ID Vitalis unique au format VTL-YYYY-XXXXX.

**Utilisation**:
```javascript
const { generateVitalisId } = require('./utils/vitalisIdGenerator');
const vitalisId = await generateVitalisId();
```

**Fonctionnement**:
1. Récupérer l'année courante
2. Trouver le dernier numéro séquentiel de l'année
3. Incrémenter le numéro
4. Formater avec des zéros à gauche (5 chiffres)
5. Retourner VTL-YYYY-XXXXX

**Exemple d'implémentation**:
```javascript
const { Patient } = require('../models');

async function generateVitalisId() {
  const year = new Date().getFullYear();
  const prefix = `VTL-${year}-`;
  
  // Trouver le dernier patient de l'année
  const lastPatient = await Patient.findOne({
    where: {
      vitalisId: {
        [Op.like]: `${prefix}%`
      }
    },
    order: [['vitalisId', 'DESC']]
  });
  
  let sequence = 1;
  if (lastPatient) {
    const lastSequence = parseInt(lastPatient.vitalisId.split('-')[2]);
    sequence = lastSequence + 1;
  }
  
  const sequenceStr = sequence.toString().padStart(5, '0');
  return `${prefix}${sequenceStr}`;
}

module.exports = { generateVitalisId };
```

### `ageCalculator.js`

**Description**: Calcule l'âge à partir d'une date de naissance.

**Utilisation**:
```javascript
const { calculateAge } = require('./utils/ageCalculator');
const age = calculateAge('1990-01-15');
```

**Exemple d'implémentation**:
```javascript
function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

module.exports = { calculateAge };
```

### `dateFormatter.js`

**Description**: Formate les dates selon différents formats.

**Utilisation**:
```javascript
const { formatDate, formatDateTime } = require('./utils/dateFormatter');
const dateStr = formatDate(new Date(), 'fr-FR');
```

**Exemple d'implémentation**:
```javascript
function formatDate(date, locale = 'fr-FR') {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatDateTime(date, locale = 'fr-FR') {
  return new Date(date).toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDateISO(date) {
  return new Date(date).toISOString().split('T')[0];
}

module.exports = { formatDate, formatDateTime, formatDateISO };
```

### `responseHelper.js`

**Description**: Aide à formater les réponses API de manière cohérente.

**Utilisation**:
```javascript
const { successResponse, errorResponse } = require('./utils/responseHelper');
return res.status(200).json(successResponse(data));
```

**Exemple d'implémentation**:
```javascript
function successResponse(data, message = null) {
  const response = {
    success: true,
    data
  };
  
  if (message) {
    response.message = message;
  }
  
  return response;
}

function errorResponse(error, statusCode = 400) {
  return {
    success: false,
    error: typeof error === 'string' ? error : error.message
  };
}

function paginatedResponse(data, pagination, totalItems) {
  return {
    success: true,
    data,
    pagination: {
      currentPage: pagination.page,
      totalPages: Math.ceil(totalItems / pagination.limit),
      totalItems,
      itemsPerPage: pagination.limit
    }
  };
}

module.exports = { successResponse, errorResponse, paginatedResponse };
```

### `stockCalculator.js`

**Description**: Calcule les statuts de stock pour les produits de pharmacie.

**Utilisation**:
```javascript
const { calculateStockStatus } = require('./utils/stockCalculator');
const status = calculateStockStatus(product.stock, product.minStock);
```

**Exemple d'implémentation**:
```javascript
function calculateStockStatus(stock, minStock) {
  if (stock === 0) {
    return 'out_of_stock';
  }
  if (stock < minStock) {
    return 'low_stock';
  }
  return 'in_stock';
}

function checkExpiringSoon(expiryDate, days = 30) {
  if (!expiryDate) return false;
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 && diffDays <= days;
}

module.exports = { calculateStockStatus, checkExpiringSoon };
```

## Schémas de Validation (Joi)

### Exemple de schéma pour Patient

```javascript
const Joi = require('joi');

const createPatientSchema = Joi.object({
  firstName: Joi.string().required().min(2).max(50),
  lastName: Joi.string().required().min(2).max(50),
  dateOfBirth: Joi.date().required().max('now'),
  gender: Joi.string().valid('M', 'F').required(),
  phone: Joi.string().required().pattern(/^[0-9+\-\s()]+$/),
  email: Joi.string().email().optional().allow(null, ''),
  address: Joi.string().optional().allow(null, ''),
  emergencyContact: Joi.string().optional().allow(null, '')
});

const updatePatientSchema = Joi.object({
  firstName: Joi.string().min(2).max(50),
  lastName: Joi.string().min(2).max(50),
  dateOfBirth: Joi.date().max('now'),
  gender: Joi.string().valid('M', 'F'),
  phone: Joi.string().pattern(/^[0-9+\-\s()]+$/),
  email: Joi.string().email().allow(null, ''),
  address: Joi.string().allow(null, ''),
  emergencyContact: Joi.string().allow(null, '')
});

module.exports = {
  create: createPatientSchema,
  update: updatePatientSchema
};
```

## Configuration de Base de Données

### `config/database.js`

**Description**: Configuration Sequelize pour la connexion à la base de données.

**Exemple**:
```javascript
require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: console.log
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};
```
