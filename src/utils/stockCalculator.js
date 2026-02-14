/**
 * Calcule le statut du stock d'un produit
 * @param {number} stock - Stock actuel
 * @param {number} minStock - Stock minimum
 * @returns {string} Statut du stock ('in_stock', 'low_stock', 'out_of_stock')
 */
function calculateStockStatus(stock, minStock) {
  if (stock === 0) {
    return 'out_of_stock';
  }
  if (stock < minStock) {
    return 'low_stock';
  }
  return 'in_stock';
}

/**
 * Vérifie si un produit expire bientôt
 * @param {Date|string|null} expiryDate - Date d'expiration
 * @param {number} days - Nombre de jours avant expiration (défaut: 30)
 * @returns {boolean} True si le produit expire bientôt
 */
function checkExpiringSoon(expiryDate, days = 30) {
  if (!expiryDate) return false;
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 && diffDays <= days;
}

/**
 * Génère une alerte de stock
 * @param {object} product - Produit
 * @returns {object|null} Alerte ou null
 */
function generateStockAlert(product) {
  const status = calculateStockStatus(product.stock, product.minStock);
  
  if (status === 'out_of_stock') {
    return {
      type: 'out_of_stock',
      message: `Le produit ${product.name} est en rupture de stock`,
      severity: 'critical'
    };
  }
  
  if (status === 'low_stock') {
    return {
      type: 'low_stock',
      message: `Le produit ${product.name} est en stock faible (${product.stock} ${product.unit})`,
      severity: 'warning'
    };
  }
  
  if (checkExpiringSoon(product.expiryDate)) {
    return {
      type: 'expiring_soon',
      message: `Le produit ${product.name} expire bientôt`,
      severity: 'info'
    };
  }
  
  return null;
}

module.exports = {
  calculateStockStatus,
  checkExpiringSoon,
  generateStockAlert
};
