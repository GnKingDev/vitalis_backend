/**
 * Calcule le montant à payer après déduction assurance puis remise.
 * Ordre : 1) Montant de base  2) Déduction assurance  3) Déduction remise  → Montant final
 *
 * @param {number} baseAmount - Montant de base (ex: prix consultation)
 * @param {object} options - { insurancePercent (0-100), discountPercent (0-100) }
 * @returns {{ finalAmount: number, amountBase: number, insuranceDeduction: number, discountDeduction: number }}
 */
function computePaymentAmount(baseAmount, options = {}) {
  const base = Number(baseAmount) || 0;
  const insurancePercent = Math.min(100, Math.max(0, Number(options.insurancePercent) || 0));
  const discountPercent = Math.min(100, Math.max(0, Number(options.discountPercent) || 0));

  const insuranceDeduction = base * (insurancePercent / 100);
  const amountAfterInsurance = base - insuranceDeduction;
  const discountDeduction = amountAfterInsurance * (discountPercent / 100);
  const finalAmount = Math.round((amountAfterInsurance - discountDeduction) * 100) / 100;

  return {
    amountBase: base,
    insuranceDeduction: Math.round(insuranceDeduction * 100) / 100,
    discountDeduction: Math.round(discountDeduction * 100) / 100,
    finalAmount: finalAmount < 0 ? 0 : finalAmount
  };
}

/**
 * À partir d'un patient (ou d'un objet { isInsured, insuranceCoveragePercent, hasDiscount, discountPercent }),
 * retourne les pourcentages à appliquer pour ce paiement.
 * Pour la pharmacie, l'assurance peut être exclue (appliquer seulement la remise).
 *
 * @param {object} patient - Patient ou { isInsured, insuranceCoveragePercent, hasDiscount, discountPercent }
 * @param {object} overrides - Surcharges optionnelles { insurancePercent, discountPercent }
 * @param {boolean} applyInsurance - Si false (ex: pharmacie), assurance non appliquée
 */
function getPercentagesFromPatient(patient, overrides = {}, applyInsurance = true) {
  let insurancePercent = 0;
  let discountPercent = 0;

  if (patient) {
    if (applyInsurance && patient.isInsured && patient.insuranceCoveragePercent != null) {
      insurancePercent = Number(patient.insuranceCoveragePercent) || 0;
    }
    if (patient.hasDiscount && patient.discountPercent != null) {
      discountPercent = Number(patient.discountPercent) || 0;
    }
  }

  if (overrides.insurancePercent != null) insurancePercent = Number(overrides.insurancePercent) || 0;
  if (overrides.discountPercent != null) discountPercent = Number(overrides.discountPercent) || 0;

  return { insurancePercent, discountPercent };
}

module.exports = {
  computePaymentAmount,
  getPercentagesFromPatient
};
