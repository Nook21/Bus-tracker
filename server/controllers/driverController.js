const Driver = require('../models/Driver');
const Bus = require('../models/Bus');
const ActiveTrip = require('../models/ActiveTrip');
const LiveLocation = require('../models/LiveLocation');

/**
 * @desc    Get driver profile and assigned bus
 * @route   GET /api/driver/profile
 * @access  Driver
 */
const getProfile = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userRef: req.user._id })
      .populate('company', 'companyName companyPhone')
      .populate('busRef');

    if (!driver) return res.status(404).json({ success: false, message: 'Driver profile not found.' });

    const activeTrip = await ActiveTrip.findOne({ driver: driver._id, status: 'active' });

    res.status(200).json({
      success: true,
      driver: {
        id: driver._id,
        driverName: driver.driverName,
        driverPhone: driver.driverPhone,
        driverEmail: driver.driverEmail,
        assignedBusNumber: driver.assignedBusNumber,
        driverLicense: driver.driverLicense,
        company: driver.company,
        isActive: driver.isActive,
        activeTrip: activeTrip || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Start a trip
 * @route   POST /api/driver/trip/start
 * @access  Driver
 */
const startTrip = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userRef: req.user._id });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver profile not found.' });

    // Check if already on a trip
    const existingTrip = await ActiveTrip.findOne({ driver: driver._id, status: 'active' });
    if (existingTrip) {
      return res.status(400).json({ success: false, message: 'You already have an active trip.', trip: existingTrip });
    }

    const bus = await Bus.findOne({ assignedDriver: driver._id });
    if (!bus) return res.status(404).json({ success: false, message: 'No bus assigned to you.' });

    // Create active trip
    const trip = await ActiveTrip.create({
      driver: driver._id,
      bus: bus._id,
      company: driver.company,
      busNumber: driver.assignedBusNumber,
      driverName: driver.driverName,
    });

    // Update bus status
    bus.status = 'on_trip';
    await bus.save();

    res.status(201).json({ success: true, message: 'Trip started.', trip });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    End a trip
 * @route   POST /api/driver/trip/end
 * @access  Driver
 */
const endTrip = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userRef: req.user._id });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver profile not found.' });

    const trip = await ActiveTrip.findOne({ driver: driver._id, status: 'active' });
    if (!trip) return res.status(404).json({ success: false, message: 'No active trip found.' });

    trip.status = 'ended';
    trip.endTime = new Date();
    await trip.save();

    // Remove live location
    await LiveLocation.deleteOne({ trip: trip._id });

    // Update bus status
    await Bus.findByIdAndUpdate(trip.bus, { status: 'idle' });

    res.status(200).json({ success: true, message: 'Trip ended successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current active trip
 * @route   GET /api/driver/trip/current
 * @access  Driver
 */
const getCurrentTrip = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userRef: req.user._id });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver profile not found.' });

    const trip = await ActiveTrip.findOne({ driver: driver._id, status: 'active' });

    res.status(200).json({ success: true, trip: trip || null });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, startTrip, endTrip, getCurrentTrip };
