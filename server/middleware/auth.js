// Simple auth middleware
const requireAuth = (req, res, next) => {
  // For now, just pass through - you can implement proper auth later
  next();
};

const requireAdmin = (req, res, next) => {
  // For now, just pass through - you can implement proper admin auth later
  next();
};

module.exports = {
  requireAuth,
  requireAdmin
};
