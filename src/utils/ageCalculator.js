/**
 * Retourne la catégorie d'âge à partir d'un âge (entier)
 * @param {number} age - Âge en années
 * @returns {string} Catégorie d'âge
 */
function getAgeGroup(age) {
  if (age <= 18) return '0-18';
  if (age <= 35) return '19-35';
  if (age <= 50) return '36-50';
  if (age <= 65) return '51-65';
  return '65+';
}

module.exports = { getAgeGroup };
