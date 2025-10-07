const { db } = require('../config/firebase');

class FirebaseLogger {
  constructor() {
    this.rfidScansRef = db.ref('rfidScanLogs');
  }

  async logRFIDScan(scanData) {
    try {
      const timestamp = new Date().toISOString();
      
      const firebaseScanData = {
        // Basic scan info
        scanId: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tagId: scanData.tagId,
        
        // Essential vehicle information only
        vehicle: scanData.vehicle || null,
        
        // RFID validity information only
        rfidValidity: scanData.rfidValidity || null,
        
        // Application reference
        applicationId: scanData.applicationId,
        
        // Scan results
        scanResult: scanData.scanResult,
        scanMessage: scanData.scanMessage,
        scanType: scanData.scanType || 'validation',
        
        // System information
        responseTime: scanData.responseTime,
        errorCode: scanData.errorCode,
        
        // Timestamps
        scanTimestamp: scanData.scanTimestamp ? scanData.scanTimestamp.toISOString() : timestamp,
        loggedAt: timestamp
      };

      // Clean up data - remove null/undefined fields
      this.cleanData(firebaseScanData);

      // Save to Firebase
      const newScanRef = this.rfidScansRef.push();
      await newScanRef.set(firebaseScanData);

      console.log(`📝 RFID scan logged to Firebase with key: ${newScanRef.key}`);
      console.log(`   Tag: ${scanData.tagId}, Result: ${scanData.scanResult}, Plate: ${scanData.vehicle?.plateNumber || 'N/A'}`);
      
      return { firebaseKey: newScanRef.key, ...firebaseScanData };
    } catch (error) {
      console.error('❌ Error logging RFID scan to Firebase:', error.message);
      throw error;
    }
  }

  // In firebaseLogger.js - update the cleanData method
  cleanData(obj) {
    Object.keys(obj).forEach(key => {
      if (obj[key] === undefined || obj[key] === null) {
        delete obj[key];
      } else if (obj[key] instanceof Date) {
        // Convert Date objects to ISO strings
        obj[key] = obj[key].toISOString();
      } else if (typeof obj[key] === 'object' && !(obj[key] instanceof Date)) {
        this.cleanData(obj[key]);
        // Remove empty objects
        if (Object.keys(obj[key]).length === 0) {
          delete obj[key];
        }
      }
    });
  }
}

module.exports = new FirebaseLogger();