const User = require('../models/User');
const Company = require('../models/Company');
const Driver = require('../models/Driver');
const ActiveTrip = require('../models/ActiveTrip');
const generateSixDigitCode = require('../utils/generateCode');
const { sendCompanyVerificationCode } = require('../services/emailService');

const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// ─── CREATE COMPANY ────────────────────────────────────────────────────────
/**
 * @route   POST /api/admin/companies
 * @access  Admin
 */
const createCompany = async (req, res, next) => {
  try {
    const { companyName, companyPhone, companyEmail, password, confirmPassword } = req.body;

    // Password match check
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    // Strong password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^])[A-Za-z\d@$!%*?&#^]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character (@$!%*?&#^).',
      });
    }

    // Duplicate email check
    const existingEmail = await User.findOne({ email: companyEmail.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'A company with this email already exists.' });
    }

    // Duplicate phone check
    const existingPhone = await Company.findOne({ companyPhone });
    if (existingPhone) {
      return res.status(409).json({ success: false, message: 'A company with this phone number already exists.' });
    }

    // Generate verification code
    const verificationCode = generateSixDigitCode();
    const verificationCodeExpires = new Date(Date.now() + CODE_EXPIRY_MS);

    // Create user — password hashed by pre('save') hook
    const user = await User.create({
      name: companyName,
      email: companyEmail.toLowerCase(),
      password,
      role: 'company',
      isActive: true,
      isVerified: false,
      verificationCode,
      verificationCodeExpires,
    });

    // Create company profile (not verified yet)
    const company = await Company.create({
      companyName,
      companyPhone,
      companyEmail: companyEmail.toLowerCase(),
      userRef: user._id,
      isApproved: true,
      isVerified: false,
    });

    // Link company ref back to user
    user.companyRef = company._id;
    await user.save({ validateBeforeSave: false });

    // Send verification email (non-blocking)
    sendCompanyVerificationCode({
      companyName,
      companyEmail: companyEmail.toLowerCase(),
      code: verificationCode,
    }).catch((err) => console.error('Verification email failed:', err.message));

    res.status(201).json({
      success: true,
      message: `Company registered. A 6-digit verification code has been sent to ${companyEmail}.`,
      requiresVerification: true,
      email: companyEmail.toLowerCase(),
      company: {
        id: company._id,
        companyName: company.companyName,
        companyEmail: company.companyEmail,
        companyPhone: company.companyPhone,
        isVerified: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET ALL COMPANIES ─────────────────────────────────────────────────────
/**
 * @route   GET /api/admin/companies
 * @access  Admin
 */
const getAllCompanies = async (req, res, next) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });

    const enriched = await Promise.all(
      companies.map(async (c) => {
        const driverCount = await Driver.countDocuments({ company: c._id });
        const activeTrips = await ActiveTrip.countDocuments({ company: c._id, status: 'active' });
        return {
          id: c._id,
          companyName: c.companyName,
          companyEmail: c.companyEmail,
          companyPhone: c.companyPhone,
          isApproved: c.isApproved,
          isActive: c.isActive,
          isVerified: c.isVerified,
          totalDrivers: driverCount,
          activeTrips,
          createdAt: c.createdAt,
        };
      })
    );

    res.status(200).json({ success: true, count: enriched.length, companies: enriched });
  } catch (error) {
    next(error);
  }
};

// ─── APPROVE COMPANY ───────────────────────────────────────────────────────
const approveCompany = async (req, res, next) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );
    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });
    await User.findByIdAndUpdate(company.userRef, { isActive: true });
    res.status(200).json({ success: true, message: 'Company approved.', company });
  } catch (error) {
    next(error);
  }
};

// ─── TOGGLE COMPANY STATUS ─────────────────────────────────────────────────
const toggleCompanyStatus = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });

    company.isActive = !company.isActive;
    await company.save();
    await User.findByIdAndUpdate(company.userRef, { isActive: company.isActive });

    res.status(200).json({
      success: true,
      message: `Company ${company.isActive ? 'activated' : 'deactivated'}.`,
      isActive: company.isActive,
    });
  } catch (error) {
    next(error);
  }
};

// ─── PLATFORM STATS ────────────────────────────────────────────────────────
const getPlatformStats = async (req, res, next) => {
  try {
    const [totalCompanies, activeCompanies, totalDrivers, activeTrips] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ isActive: true, isApproved: true }),
      Driver.countDocuments(),
      ActiveTrip.countDocuments({ status: 'active' }),
    ]);

    res.status(200).json({
      success: true,
      stats: { totalCompanies, activeCompanies, totalDrivers, activeTrips },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCompany,
  getAllCompanies,
  approveCompany,
  toggleCompanyStatus,
  getPlatformStats,
};
