const jwt = require('jsonwebtoken');
const User = require('../models/User');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  jwt.verify(token, process.env.JWT_SECRET || 'dev_secret', async (err, payload) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    try {
      const user = await User.findById(payload.id).select('_id role email firstName lastName');
      if (!user) return res.status(401).json({ error: 'User not found' });
      req.user = user;
      next();
    } catch (e) {
      return res.status(500).json({ error: 'Auth error' });
    }
  });
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role === 'admin' || req.user.role === 'super_admin') return next();
  return res.status(403).json({ error: 'Admin only' });
}

module.exports = { authenticateToken, requireAdmin };


