const { Op } = require('sequelize');
const { Patient } = require('../models');

/**
 * Génère un ID Vitalis unique au format VTL-YYYY-XXXXX
 * @returns {Promise<string>} L'ID Vitalis généré
 */
async function generateVitalisId() {
  const year = new Date().getFullYear();
  const prefix = `VTL-${year}-`;
  
  try {
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
  } catch (error) {
    throw new Error(`Erreur lors de la génération de l'ID Vitalis: ${error.message}`);
  }
}

module.exports = { generateVitalisId };
