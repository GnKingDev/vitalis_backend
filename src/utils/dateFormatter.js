/**
 * Formate une date selon le format français
 * @param {Date|string} date - Date à formater
 * @param {string} locale - Locale (défaut: 'fr-FR')
 * @returns {string} Date formatée
 */
function formatDate(date, locale = 'fr-FR') {
  if (!date) return null;
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Formate une date avec l'heure
 * @param {Date|string} date - Date à formater
 * @param {string} locale - Locale (défaut: 'fr-FR')
 * @returns {string} Date et heure formatées
 */
function formatDateTime(date, locale = 'fr-FR') {
  if (!date) return null;
  return new Date(date).toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formate une date au format ISO (YYYY-MM-DD)
 * @param {Date|string} date - Date à formater
 * @returns {string} Date au format ISO
 */
function formatDateISO(date) {
  if (!date) return null;
  return new Date(date).toISOString().split('T')[0];
}

/**
 * Formate une date pour l'affichage court (DD/MM/YYYY)
 * @param {Date|string} date - Date à formater
 * @returns {string} Date formatée
 */
function formatDateShort(date) {
  if (!date) return null;
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Vérifie si une date est dans une plage donnée
 * @param {Date|string} date - Date à vérifier
 * @param {Date|string} startDate - Date de début
 * @param {Date|string} endDate - Date de fin
 * @returns {boolean} True si la date est dans la plage
 */
function isDateInRange(date, startDate, endDate) {
  const d = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  return d >= start && d <= end;
}

module.exports = {
  formatDate,
  formatDateTime,
  formatDateISO,
  formatDateShort,
  isDateInRange
};
