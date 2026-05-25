const express = require('express');
const router = express.Router();
const { getLiveBuses, getNearestBuses } = require('../controllers/locationController');

// Public routes - no auth required for passengers
router.get('/live', getLiveBuses);
router.get('/nearest', getNearestBuses);

module.exports = router;
