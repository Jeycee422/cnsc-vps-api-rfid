const express = require('express');
const RFIDScan = require('../models/RFIDScan');
const VehiclePassApplication = require('../models/VehiclePassApplication');
const User = require('../models/User');

const router = express.Router();

// @route   GET /api/rfid/scanId?tagId=E280...
// @desc    Validate an RFID tag by tagId; log the attempt; respond with status only
// @access  Public (scanner)
router.get('/scanId', async (req, res) => {
  try {
    const { tagId } = req.query;

    if (!tagId) {
      return res.sendStatus(400);
    }

    const startTime = Date.now();
    const application = await VehiclePassApplication.findOne({ 'rfidInfo.tagId': tagId });

    let statusCode = 200;
    let scanResult = 'success';
    let scanMessage = 'Access granted';
    let errorCode = undefined;

    if (!application) {
      statusCode = 404;
      scanResult = 'denied';
      scanMessage = 'RFID tag not found';
      errorCode = 'TAG_NOT_FOUND';
    } else if (!application.rfidInfo || !application.rfidInfo.isActive) {
      statusCode = 423;
      scanResult = 'denied';
      scanMessage = 'RFID tag is not active';
      errorCode = 'TAG_INACTIVE';
    } else if (application.status !== 'completed') {
      statusCode = 409;
      scanResult = 'denied';
      scanMessage = 'Application not completed';
      errorCode = 'APPLICATION_NOT_COMPLETED';
    } else if (application.rfidInfo.validUntil && new Date() > new Date(application.rfidInfo.validUntil)) {
      statusCode = 410;
      scanResult = 'denied';
      scanMessage = 'RFID tag expired';
      errorCode = 'TAG_EXPIRED';
    }

    try {
      await new RFIDScan({
        tagId,
        user: application ? application.linkedUser : null,
        vehicle: application ? application._id : null,
        scanType: 'validation',
        direction: 'both',
        scanResult,
        scanMessage,
        scanTimestamp: new Date(),
        responseTime: Date.now() - startTime,
        systemStatus: 'online',
        errorCode,
      }).save();
    } catch (logErr) {
      // eslint-disable-next-line no-console
      console.error('RFIDScan log save error:', logErr);
    }

    return res.sendStatus(statusCode);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('GET /api/rfid/scanId error:', error);
    return res.sendStatus(500);
  }
});

module.exports = router;


