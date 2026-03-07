/**
 * Enrichit un objet patient pour l'affichage frontend : ajoute les champs plats
 * insuranceEstablishmentName, insuranceCoveragePercent, discountPercent
 * requis pour l'affichage assurance et remise partout où un patient est affiché.
 *
 * @param {object} patient - Instance Sequelize Patient (avec optionnellement insuranceEstablishment chargé) ou objet plain
 * @returns {object|null} Objet patient avec les 3 champs ajoutés, ou null si patient est null/undefined
 */
function enrichPatientForDisplay(patient) {
  if (patient == null) return null;
  const json = typeof patient.get === 'function' ? patient.toJSON() : { ...patient };
  const establishment = patient.insuranceEstablishment ?? json.insuranceEstablishment;
  return {
    ...json,
    insuranceEstablishmentName: establishment?.name ?? null,
    insuranceCoveragePercent: json.insuranceCoveragePercent != null ? Number(json.insuranceCoveragePercent) : 0,
    discountPercent: json.discountPercent != null ? Number(json.discountPercent) : 0
  };
}

module.exports = { enrichPatientForDisplay };
