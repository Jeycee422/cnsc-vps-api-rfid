const app = require('../index'); // Load the exported Express app

// Vercel expects a function handler (req, res)
module.exports = (req, res) => {
  return app(req, res);
};
