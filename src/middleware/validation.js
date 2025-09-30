function validateRFIDScan(req, res, next) {
  // Allow either JSON body or raw text/plain containing tag
  if (typeof req.body === 'string') {
    return next();
  }

  if (req.is('application/json')) {
    return next();
  }

  return res.status(415).json({ error: 'Unsupported Media Type. Use application/json or text/plain' });
}

function validateRFIDAssignment(req, res, next) {
  const { applicationId, tagId } = req.body || {};
  if (!applicationId || !tagId) {
    return res.status(400).json({ error: 'applicationId and tagId are required' });
  }
  next();
}

module.exports = { validateRFIDScan, validateRFIDAssignment };


