const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  login,
  getMe,
  verifyEmail,
  resendVerificationCode,
  forgotPassword,
  verifyResetCode,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

// Get current user
router.get('/me', protect, getMe);

// Email verification
router.post(
  '/verify-email',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('code').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits').isNumeric().withMessage('Code must be numeric'),
  ],
  validate,
  verifyEmail
);

// Resend verification code
router.post(
  '/resend-verification',
  [body('email').isEmail().withMessage('Valid email is required').normalizeEmail()],
  validate,
  resendVerificationCode
);

// Forgot password — send reset code
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email is required').normalizeEmail()],
  validate,
  forgotPassword
);

// Verify reset code
router.post(
  '/verify-reset-code',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('code').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits').isNumeric(),
  ],
  validate,
  verifyResetCode
);

// Reset password
router.post(
  '/reset-password',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('code').notEmpty().withMessage('Reset code is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('confirmPassword').notEmpty().withMessage('Confirm password is required'),
  ],
  validate,
  resetPassword
);

module.exports = router;
