const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createCompany,
  getAllCompanies,
  approveCompany,
  toggleCompanyStatus,
  getPlatformStats,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect, authorize('admin'));

router.get('/stats', getPlatformStats);
router.get('/companies', getAllCompanies);

router.post(
  '/companies',
  [
    body('companyName').trim().notEmpty().withMessage('Company name is required'),
    body('companyPhone').trim().notEmpty().withMessage('Company phone is required'),
    body('companyEmail').isEmail().withMessage('Valid company email is required').normalizeEmail(),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^])/)
      .withMessage('Password must include uppercase, lowercase, number, and special character'),
    body('confirmPassword').notEmpty().withMessage('Confirm password is required'),
  ],
  validate,
  createCompany
);

router.patch('/companies/:id/approve', approveCompany);
router.patch('/companies/:id/toggle', toggleCompanyStatus);

module.exports = router;
