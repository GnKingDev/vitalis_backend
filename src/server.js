const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
// const rateLimit = require('express-rate-limit'); // Désactivé
const config = require('./config');
const { sequelize } = require('./models');
const { errorHandler } = require('./middleware/errorHandler');

// Importer les routes
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const consultationRoutes = require('./routes/consultations');
const dashboardRoutes = require('./routes/dashboard');
const labRoutes = require('./routes/lab');
const receptionRoutes = require('./routes/reception');
const imagingRoutes = require('./routes/imaging');
const pharmacyRoutes = require('./routes/pharmacy');
const paymentRoutes = require('./routes/payments');
const doctorRoutes = require('./routes/doctor');
const userRoutes = require('./routes/users');
const statsRoutes = require('./routes/stats');
const bedRoutes = require('./routes/beds');
const consultationPriceRoutes = require('./routes/consultationPrice');
const insuranceEstablishmentRoutes = require('./routes/insuranceEstablishments');
const labNumberRoutes = require('./routes/labNumbers');

const app = express();

// Middleware de sécurité
app.use(helmet());
app.use(compression());

// CORS
app.use(cors(config.cors));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('tiny'));

// Rate limiting - DÉSACTIVÉ
// const limiter = rateLimit({
//   windowMs: config.rateLimit.windowMs,
//   max: config.rateLimit.max,
//   message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
// });
// app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes API
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/consultations', consultationRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/lab', labRoutes);
app.use('/api/v1/reception', receptionRoutes);
app.use('/api/v1/imaging', imagingRoutes);
app.use('/api/v1/pharmacy', pharmacyRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/doctor', doctorRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/beds', bedRoutes);
app.use('/api/v1/consultation/price', consultationPriceRoutes);
app.use('/api/v1/insurance-establishments', insuranceEstablishmentRoutes);
app.use('/api/v1/lab-numbers', labNumberRoutes);

// Route 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée'
  });
});

// Middleware de gestion d'erreurs (doit être le dernier)
app.use(errorHandler);

// Démarrer le serveur
const PORT = config.port;

async function startServer() {
  try {
    // Tester la connexion à la base de données
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie avec succès.');
    
    // Synchroniser les modèles (en développement uniquement)
    if (config.nodeEnv === 'development') {
      // await sequelize.sync({ alter: true });
      console.log('⚠️  Mode développement: synchronisation des modèles désactivée (utilisez les migrations)');
    }
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📝 Environnement: ${config.nodeEnv}`);
      console.log(`🌐 API disponible sur: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

// Gestion de l'arrêt propre
process.on('SIGTERM', async () => {
  console.log('SIGTERM reçu, fermeture du serveur...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT reçu, fermeture du serveur...');
  await sequelize.close();
  process.exit(0);
});

startServer();

module.exports = app; 
