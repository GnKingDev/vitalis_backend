const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email invalide',
    'any.required': 'L\'email est requis'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Le mot de passe est requis'
  })
});

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Le nom doit contenir au moins 2 caractères',
    'string.max': 'Le nom ne peut pas dépasser 100 caractères',
    'any.required': 'Le nom est requis'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email invalide',
    'any.required': 'L\'email est requis'
  }),
  password: Joi.string().min(8).optional().allow(null, '').messages({
    'string.min': 'Le mot de passe doit contenir au moins 8 caractères'
  }),
  role: Joi.string().valid('admin', 'reception', 'doctor', 'lab', 'pharmacy').required().messages({
    'any.only': 'Le rôle doit être l\'un des suivants: admin, reception, doctor, lab, pharmacy',
    'any.required': 'Le rôle est requis'
  }),
  department: Joi.string().max(100).allow(null, '').optional()
});

module.exports = {
  loginSchema,
  registerSchema
};
