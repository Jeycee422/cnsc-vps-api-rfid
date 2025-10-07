const express = require('express');
const VehiclePassApplication = require('../models/VehiclePassApplication');
const firebaseLogger = require('../services/firebaseLogger');

const router = express.Router();

// Helper function to log to Firebase
async function logToFirebase(scanData) {
  try {
    await firebaseLogger.logRFIDScan(scanData);
  } catch (error) {
    console.error('❌ Failed to log to Firebase:', error.message);
    // Don't throw error - we don't want Firebase failures to break RFID scanning
  }
}

// Helper function to get essential vehicle details
function getEssentialVehicleDetails(application) {
  if (!application || !application.vehicleInfo) return null;
  
  return {
    plateNumber: application.vehicleInfo.plateNumber,
    vehicleType: application.vehicleInfo.type,
    driverName: application.vehicleInfo.driverName
  };
}

// Helper function to get RFID validity info
function getRFIDValidity(application) {
  if (!application || !application.rfidInfo) return null;
  
  const rfidInfo = { 
    isActive: application.rfidInfo.isActive,
    validUntil: application.rfidInfo.validUntil,
    assignedAt: application.rfidInfo.assignedAt
  };
  
  // Convert Date objects to ISO strings for Firebase compatibility
  if (rfidInfo.validUntil instanceof Date) {
    rfidInfo.validUntil = rfidInfo.validUntil.toISOString();
  }
  if (rfidInfo.assignedAt instanceof Date) {
    rfidInfo.assignedAt = rfidInfo.assignedAt.toISOString();
  }
  
  return rfidInfo;
}

// @route   GET /api/rfid/scanId?tagId=E280...
// @desc    Validate an RFID tag by tagId; log the attempt to Firebase only; respond with status only
// @access  Public (scanner)
router.get('/scanId', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { tagId } = req.query;

    if (!tagId) {
      // Log to Firebase
      await logToFirebase({
        tagId: 'UNKNOWN',
        scanResult: 'denied',
        scanMessage: 'Tag ID missing in query',
        scanType: 'validation',
        scanTimestamp: new Date(),
        responseTime: Date.now() - startTime,
        systemStatus: 'online',
        errorCode: 'TAG_REQUIRED'
      });
      
      return res.sendStatus(400);
    }

    // Lookup application by tag
    const application = await VehiclePassApplication.findOne({ 'rfidInfo.tagId': tagId });

    let statusCode = 200;
    let scanResult = 'success';
    let scanMessage = 'Access granted';
    let errorCode = undefined;
    let vehicleDetails = null;
    let rfidValidity = null;

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
      vehicleDetails = getEssentialVehicleDetails(application);
      rfidValidity = getRFIDValidity(application);
    } else if (application.status !== 'completed') {
      statusCode = 409;
      scanResult = 'denied';
      scanMessage = 'Application not completed';
      errorCode = 'APPLICATION_NOT_COMPLETED';
      vehicleDetails = getEssentialVehicleDetails(application);
      rfidValidity = getRFIDValidity(application);
    } else if (application.rfidInfo.validUntil && new Date() > new Date(application.rfidInfo.validUntil)) {
      statusCode = 410;
      scanResult = 'denied';
      scanMessage = 'RFID tag expired';
      errorCode = 'TAG_EXPIRED';
      vehicleDetails = getEssentialVehicleDetails(application);
      rfidValidity = getRFIDValidity(application);
    } else {
      // Valid scan - get essential details
      vehicleDetails = getEssentialVehicleDetails(application);
      rfidValidity = getRFIDValidity(application);
    }

    // Prepare minimal scan data for Firebase
    const scanData = {
      tagId,
      vehicle: vehicleDetails,
      rfidValidity: rfidValidity,
      applicationId: application ? application._id.toString() : null,
      scanResult,
      scanMessage,
      scanType: 'validation',
      scanTimestamp: new Date(),
      responseTime: Date.now() - startTime,
      systemStatus: 'online',
      errorCode
    };

    // Save to Firebase only (no MongoDB logging)
    await logToFirebase(scanData);

    console.log(`🔍 RFID Scan: ${tagId} - ${scanResult.toUpperCase()} - ${statusCode}`);
    
    return res.sendStatus(statusCode);
  } catch (error) {
    console.error('❌ GET /api/rfid/scanId error:', error.message);
    
    // Log error to Firebase
    await logToFirebase({
      tagId: req.query.tagId || 'UNKNOWN',
      scanResult: 'error',
      scanMessage: 'System error occurred',
      scanType: 'validation',
      scanTimestamp: new Date(),
      responseTime: Date.now() - startTime,
      systemStatus: 'offline',
      errorCode: 'SYSTEM_ERROR',
      errorMessage: error.message
    });
    
    return res.sendStatus(500);
  }
});

module.exports = router;