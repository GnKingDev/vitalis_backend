/**
 * Formate une réponse de succès
 * @param {any} data - Données à retourner
 * @param {string|null} message - Message optionnel
 * @returns {object} Réponse formatée
 */
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

/**
 * Formate une réponse d'erreur
 * @param {string|Error} error - Erreur ou message d'erreur
 * @param {number} statusCode - Code de statut HTTP (défaut: 400)
 * @returns {object} Réponse d'erreur formatée
 */
function errorResponse(error, statusCode = 400) {
  return {
    success: false,
    error: typeof error === 'string' ? error : error.message
  };
}

/**
 * Formate une réponse paginée
 * @param {Array} data - Données à retourner
 * @param {object} pagination - Informations de pagination
 * @param {number} totalItems - Nombre total d'éléments
 * @returns {object} Réponse paginée formatée
 */
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

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse
};
