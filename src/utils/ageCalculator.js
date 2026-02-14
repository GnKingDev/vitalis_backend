/**
 * Calcule l'âge à partir d'une date de naissance
 * @param {string|Date} dateOfBirth - Date de naissance
 * @returns {number} L'âge en années
 */
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

/**
 * Calcule l'âge groupé par catégories
 * @param {string|Date} dateOfBirth - Date de naissance
 * @returns {string} Catégorie d'âge
 */
function getAgeGroup(dateOfBirth) {
  const age = calculateAge(dateOfBirth);
  
  if (age <= 18) return '0-18';
  if (age <= 35) return '19-35';
  if (age <= 50) return '36-50';
  if (age <= 65) return '51-65';
  return '65+';
}

module.exports = { calculateAge, getAgeGroup };
