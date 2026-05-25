const express = require('express');
const router = express.Router();
const { getProfile, startTrip, endTrip, getCurrentTrip } = require('../controllers/driverController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('driver'));

router.get('/profile', getProfile);
router.get('/trip/current', getCurrentTrip);
router.post('/trip/start', startTrip);
router.post('/trip/end', endTrip);

module.exports = router;
