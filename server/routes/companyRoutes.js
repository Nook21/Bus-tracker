const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getDashboardStats,
  createDriver,
  getDrivers,
  toggleDriverStatus,
  getActiveTrips,
  getLiveLocations,
} = require('../controllers/companyController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect, authorize('company'));

router.get('/stats', getDashboardStats);
router.get('/drivers', getDrivers);
router.get('/trips', getActiveTrips);
router.get('/live-locations', getLiveLocations);

router.post(
  '/drivers',
  [
    body('driverName').trim().notEmpty().withMessage('Driver name is required'),
    body('driverPhone').trim().notEmpty().withMessage('Driver phone is required'),
    body('driverEmail').isEmail().withMessage('Valid driver email is required').normalizeEmail(),
    body('driverLicense').trim().notEmpty().withMessage('Driver license is required'),
    body('assignedBusNumber').trim().notEmpty().withMessage('Bus number is required'),
    body('nationalId').trim().notEmpty().withMessage('National ID is required'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^])/)
      .withMessage('Password must include uppercase, lowercase, number, and special character'),
    body('confirmPassword').notEmpty().withMessage('Confirm password is required'),
  ],
  validate,
  createDriver
);

router.patch('/drivers/:id/toggle', toggleDriverStatus);

module.exports = router;
