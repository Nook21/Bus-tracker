const User = require('../models/User');
const Driver = require('../models/Driver');
const Company = require('../models/Company');
const generateToken = require('../utils/generateToken');
const generateSixDigitCode = require('../utils/generateCode');
const { sendPasswordResetCode } = require('../services/emailService');

const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_VERIFY_ATTEMPTS = 5;

// ─── LOGIN ─────────────────────────────────────────────────────────────────
/**
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact support.',
      });
    }

    // Company and driver accounts must be email-verified before login
    if ((user.role === 'company' || user.role === 'driver') && !user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in.',
        requiresVerification: true,
        email: user.email,
      });
    }

    let profile = null;
    if (user.role === 'company') {
      profile = await Company.findOne({ userRef: user._id });
      if (profile && !profile.isApproved) {
        return res.status(403).json({ success: false, message: 'Your company account is pending approval.' });
      }
    } else if (user.role === 'driver') {
      profile = await Driver.findOne({ userRef: user._id }).populate('company', 'companyName');
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET ME ────────────────────────────────────────────────────────────────
/**
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    let profile = null;
    if (user.role === 'company') {
      profile = await Company.findOne({ userRef: user._id });
    } else if (user.role === 'driver') {
      profile = await Driver.findOne({ userRef: user._id }).populate('company', 'companyName');
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── VERIFY COMPANY EMAIL ──────────────────────────────────────────────────
/**
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email and code are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+verificationCode +verificationCodeExpires +verificationAttempts');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified.' });
    }

    // Rate limit: max 5 attempts
    if (user.verificationAttempts >= MAX_VERIFY_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Please request a new verification code.',
      });
    }

    // Check expiry
    if (!user.verificationCode || !user.verificationCodeExpires) {
      return res.status(400).json({ success: false, message: 'No verification code found. Please request a new one.' });
    }

    if (new Date() > user.verificationCodeExpires) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new one.',
        expired: true,
      });
    }

    // Check code
    if (user.verificationCode !== code.trim()) {
      user.verificationAttempts += 1;
      await user.save({ validateBeforeSave: false });
      const remaining = MAX_VERIFY_ATTEMPTS - user.verificationAttempts;
      return res.status(400).json({
        success: false,
        message: `Incorrect code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'No attempts remaining. Request a new code.'}`,
      });
    }

    // Success — mark verified
    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    user.verificationAttempts = 0;
    await user.save({ validateBeforeSave: false });

    // Mark the role-specific profile as verified too
    if (user.role === 'company') {
      await Company.findOneAndUpdate({ userRef: user._id }, { isVerified: true });
    }

    const token = generateToken(user._id);

    // Build profile based on role
    let profile = null;
    if (user.role === 'company') {
      profile = await Company.findOne({ userRef: user._id });
    } else if (user.role === 'driver') {
      profile = await Driver.findOne({ userRef: user._id }).populate('company', 'companyName');
    }

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: true,
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── RESEND VERIFICATION CODE ──────────────────────────────────────────────
/**
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
const resendVerificationCode = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+verificationCode +verificationCodeExpires');

    if (!user) {
      // Don't reveal if email exists
      return res.status(200).json({ success: true, message: 'If this email exists, a new code has been sent.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'This email is already verified.' });
    }

    const code = generateSixDigitCode();
    user.verificationCode = code;
    user.verificationCodeExpires = new Date(Date.now() + CODE_EXPIRY_MS);
    user.verificationAttempts = 0;
    await user.save({ validateBeforeSave: false });

    const { sendCompanyVerificationCode } = require('../services/emailService');
    const company = await Company.findOne({ userRef: user._id });

    sendCompanyVerificationCode({
      companyName: company?.companyName || user.name,
      companyEmail: user.email,
      code,
    }).catch((err) => console.error('Resend verification email failed:', err.message));

    res.status(200).json({ success: true, message: 'A new verification code has been sent to your email.' });
  } catch (error) {
    next(error);
  }
};

// ─── FORGOT PASSWORD ───────────────────────────────────────────────────────
/**
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+resetPasswordCode +resetPasswordExpires');

    // Always return success to prevent email enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If this email is registered, a reset code has been sent.',
      });
    }

    const code = generateSixDigitCode();
    user.resetPasswordCode = code;
    user.resetPasswordExpires = new Date(Date.now() + CODE_EXPIRY_MS);
    user.resetPasswordAttempts = 0;
    await user.save({ validateBeforeSave: false });

    sendPasswordResetCode({
      name: user.name,
      email: user.email,
      code,
      role: user.role,
    }).catch((err) => console.error('Reset email failed:', err.message));

    res.status(200).json({
      success: true,
      message: 'If this email is registered, a reset code has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── VERIFY RESET CODE ─────────────────────────────────────────────────────
/**
 * @route   POST /api/auth/verify-reset-code
 * @access  Public
 */
const verifyResetCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email and code are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+resetPasswordCode +resetPasswordExpires +resetPasswordAttempts');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    if (user.resetPasswordAttempts >= MAX_VERIFY_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Please request a new reset code.',
      });
    }

    if (!user.resetPasswordCode || !user.resetPasswordExpires) {
      return res.status(400).json({ success: false, message: 'No reset code found. Please request a new one.' });
    }

    if (new Date() > user.resetPasswordExpires) {
      return res.status(400).json({
        success: false,
        message: 'Reset code has expired. Please request a new one.',
        expired: true,
      });
    }

    if (user.resetPasswordCode !== code.trim()) {
      user.resetPasswordAttempts += 1;
      await user.save({ validateBeforeSave: false });
      const remaining = MAX_VERIFY_ATTEMPTS - user.resetPasswordAttempts;
      return res.status(400).json({
        success: false,
        message: `Incorrect code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'No attempts remaining.'}`,
      });
    }

    // Code is valid — return a short-lived reset token (we reuse the code as proof)
    res.status(200).json({
      success: true,
      message: 'Code verified. You may now reset your password.',
      resetToken: code, // client sends this back with new password
    });
  } catch (error) {
    next(error);
  }
};

// ─── RESET PASSWORD ────────────────────────────────────────────────────────
/**
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { email, code, newPassword, confirmPassword } = req.body;

    if (!email || !code || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    // Strong password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^])[A-Za-z\d@$!%*?&#^]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+resetPasswordCode +resetPasswordExpires +password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    if (!user.resetPasswordCode || user.resetPasswordCode !== code.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset code.' });
    }

    if (new Date() > user.resetPasswordExpires) {
      return res.status(400).json({ success: false, message: 'Reset code has expired. Please request a new one.' });
    }

    // Update password — pre('save') hook will hash it
    user.password = newPassword;
    user.resetPasswordCode = null;
    user.resetPasswordExpires = null;
    user.resetPasswordAttempts = 0;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe,
  verifyEmail,
  resendVerificationCode,
  forgotPassword,
  verifyResetCode,
  resetPassword,
};
