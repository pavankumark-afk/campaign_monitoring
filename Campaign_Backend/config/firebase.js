const { initializeApp, getApps } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const { cert } = require('firebase-admin/app'); // Explicitly import cert independently
const serviceAccount = require('../serviceAccountKey.json'); 

// Check if the application has already been initialized to prevent Nodemon crashes
if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount), // Use the directly imported function
    storageBucket: 'campaign-monitor-app.firebasestorage.app'
  });
}

// Fetch and export the default bucket instance cleanly
const bucket = getStorage().bucket();

module.exports = bucket;