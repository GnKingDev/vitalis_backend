/**
 * Middleware de pagination
 * Parse et valide les paramètres de pagination depuis les query parameters
 */
const paginationMiddleware = (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;
  
  req.pagination = {
    page,
    limit,
    offset
  };
  
  next();
};

module.exports = { paginationMiddleware };
