const User = require('../models/User');
const Company = require('../models/Company');
const Driver = require('../models/Driver');
const Bus = require('../models/Bus');
const ActiveTrip = require('../models/ActiveTrip');
const LiveLocation = require('../models/LiveLocation');
const generateSixDigitCode = require('../utils/generateCode');
const { sendDriverVerificationCode } = require('../services/emailService');

const CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

const getCompanyFromUser = async (userId) => Company.findOne({ userRef: userId });

// ─── DASHBOARD STATS ───────────────────────────────────────────────────────
const getDashboardStats = async (req, res, next) => {
  try {
    const company = await getCompanyFromUser(req.user._id);
    if (!company) return res.status(404).json({ success: false, message: 'Company profile not found.' });

    const [totalDrivers, activeBuses, activeTrips] = await Promise.all([
      Driver.countDocuments({ company: company._id }),
      Bus.countDocuments({ company: company._id, status: 'on_trip' }),
      ActiveTrip.countDocuments({ company: company._id, status: 'active' }),
    ]);

    res.status(200).json({
      success: true,
      stats: { totalDrivers, activeBuses, activeTrips, companyName: company.companyName },
    });
  } catch (error) {
    next(error);
  }
};

// ─── CREATE DRIVER ─────────────────────────────────────────────────────────
/**
 * @route   POST /api/company/drivers
 * @access  Company
 *
 * Same secure flow as company registration:
 * 1. Validate password strength
 * 2. Check duplicate email + phone
 * 3. Create user (unverified) + driver profile + bus
 * 4. Generate 6-digit code, store hashed expiry
 * 5. Send verification email
 * 6. Return requiresVerification flag so frontend opens verify modal
 */
const createDriver = async (req, res, next) => {
  try {
    const company = await getCompanyFromUser(req.user._id);
    if (!company) return res.status(404).json({ success: false, message: 'Company profile not found.' });

    const {
      driverName, driverPhone, driverEmail,
      driverLicense, assignedBusNumber, nationalId,
      password, confirmPassword,
    } = req.body;

    // Password match
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
    const existingEmail = await User.findOne({ email: driverEmail.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'A driver with this email already exists.' });
    }

    // Duplicate phone check within this company
    const existingPhone = await Driver.findOne({ driverPhone, company: company._id });
    if (existingPhone) {
      return res.status(409).json({ success: false, message: 'A driver with this phone number already exists in your company.' });
    }

    // Duplicate license check
    const existingLicense = await Driver.findOne({ driverLicense });
    if (existingLicense) {
      return res.status(409).json({ success: false, message: 'This driver license number is already registered.' });
    }

    // Duplicate national ID check
    const existingNationalId = await Driver.findOne({ nationalId });
    if (existingNationalId) {
      return res.status(409).json({ success: false, message: 'This national ID is already registered.' });
    }

    // Generate verification code
    const verificationCode = generateSixDigitCode();
    const verificationCodeExpires = new Date(Date.now() + CODE_EXPIRY_MS);

    // Create user account — password hashed by pre('save') hook
    const user = await User.create({
      name: driverName,
      email: driverEmail.toLowerCase(),
      password,
      role: 'driver',
      companyRef: company._id,
      isActive: true,
      isVerified: false,
      verificationCode,
      verificationCodeExpires,
    });

    // Create driver profile
    const driver = await Driver.create({
      driverName,
      driverPhone,
      driverEmail: driverEmail.toLowerCase(),
      driverLicense,
      assignedBusNumber,
      nationalId,
      company: company._id,
      userRef: user._id,
    });

    // Link driver ref back to user
    user.driverRef = driver._id;
    await user.save({ validateBeforeSave: false });

    // Create or assign bus
    let bus = await Bus.findOne({ busNumber: assignedBusNumber, company: company._id });
    if (!bus) {
      bus = await Bus.create({
        busNumber: assignedBusNumber,
        company: company._id,
        assignedDriver: driver._id,
      });
    } else {
      bus.assignedDriver = driver._id;
      await bus.save();
    }

    driver.busRef = bus._id;
    await driver.save();

    // Send verification email (non-blocking)
    sendDriverVerificationCode({
      driverName,
      driverEmail: driverEmail.toLowerCase(),
      companyName: company.companyName,
      code: verificationCode,
    }).catch((err) => console.error('Driver verification email failed:', err.message));

    res.status(201).json({
      success: true,
      message: `Driver registered. A 6-digit verification code has been sent to ${driverEmail}.`,
      requiresVerification: true,
      email: driverEmail.toLowerCase(),
      driver: {
        id: driver._id,
        driverName: driver.driverName,
        driverEmail: driver.driverEmail,
        driverPhone: driver.driverPhone,
        assignedBusNumber: driver.assignedBusNumber,
        isActive: driver.isActive,
        isVerified: false,
        createdAt: driver.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET DRIVERS ───────────────────────────────────────────────────────────
const getDrivers = async (req, res, next) => {
  try {
    const company = await getCompanyFromUser(req.user._id);
    if (!company) return res.status(404).json({ success: false, message: 'Company profile not found.' });

    const drivers = await Driver.find({ company: company._id }).sort({ createdAt: -1 });

    const enriched = await Promise.all(
      drivers.map(async (d) => {
        const activeTrip = await ActiveTrip.findOne({ driver: d._id, status: 'active' });
        // Get verification status from user
        const userDoc = await User.findById(d.userRef).select('isVerified');
        return {
          id: d._id,
          driverName: d.driverName,
          driverEmail: d.driverEmail,
          driverPhone: d.driverPhone,
          driverLicense: d.driverLicense,
          assignedBusNumber: d.assignedBusNumber,
          nationalId: d.nationalId,
          isActive: d.isActive,
          isVerified: userDoc?.isVerified ?? false,
          onTrip: !!activeTrip,
          tripId: activeTrip?._id || null,
          createdAt: d.createdAt,
        };
      })
    );

    res.status(200).json({ success: true, count: enriched.length, drivers: enriched });
  } catch (error) {
    next(error);
  }
};

// ─── TOGGLE DRIVER STATUS ──────────────────────────────────────────────────
const toggleDriverStatus = async (req, res, next) => {
  try {
    const company = await getCompanyFromUser(req.user._id);
    const driver = await Driver.findOne({ _id: req.params.id, company: company._id });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found.' });

    driver.isActive = !driver.isActive;
    await driver.save();
    await User.findByIdAndUpdate(driver.userRef, { isActive: driver.isActive });

    res.status(200).json({
      success: true,
      message: `Driver ${driver.isActive ? 'activated' : 'deactivated'}.`,
      isActive: driver.isActive,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET ACTIVE TRIPS ──────────────────────────────────────────────────────
const getActiveTrips = async (req, res, next) => {
  try {
    const company = await getCompanyFromUser(req.user._id);
    const trips = await ActiveTrip.find({ company: company._id, status: 'active' })
      .populate('driver', 'driverName driverPhone')
      .populate('bus', 'busNumber')
      .sort({ startTime: -1 });

    res.status(200).json({ success: true, count: trips.length, trips });
  } catch (error) {
    next(error);
  }
};

// ─── GET LIVE LOCATIONS ────────────────────────────────────────────────────
const getLiveLocations = async (req, res, next) => {
  try {
    const company = await getCompanyFromUser(req.user._id);
    const locations = await LiveLocation.find({ company: company._id })
      .populate('driver', 'driverName')
      .populate('bus', 'busNumber');

    res.status(200).json({ success: true, locations });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  createDriver,
  getDrivers,
  toggleDriverStatus,
  getActiveTrips,
  getLiveLocations,
};
