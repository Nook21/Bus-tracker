const LiveLocation = require('../models/LiveLocation');
const { haversineDistance } = require('../utils/distance');

/**
 * Normalize a LiveLocation document into a consistent shape
 * that always has flat { latitude, longitude } fields.
 */
const normalizeLocation = (loc) => {
  const coords = loc.location?.coordinates;
  // GeoJSON stores [longitude, latitude]
  const longitude = Array.isArray(coords) ? coords[0] : null;
  const latitude  = Array.isArray(coords) ? coords[1] : null;

  return {
    tripId:      loc.trip?.toString()    || loc._id?.toString(),
    busNumber:   loc.busNumber           || '',
    driverName:  loc.driver?.driverName  || loc.driverName || '',
    companyName: loc.company?.companyName || '',
    latitude,
    longitude,
    speed:       typeof loc.speed === 'number' ? loc.speed : 0,
    timestamp:   loc.timestamp || loc.updatedAt,
  };
};

/**
 * @desc    Get all active live bus locations (for passengers)
 * @route   GET /api/locations/live
 * @access  Public
 */
const getLiveBuses = async (req, res, next) => {
  try {
    const locations = await LiveLocation.find()
      .populate('driver', 'driverName')
      .populate('company', 'companyName')
      .lean();

    // Normalize and filter out any docs with missing coordinates
    const buses = locations
      .map(normalizeLocation)
      .filter((b) => b.latitude !== null && b.longitude !== null);

    res.status(200).json({ success: true, count: buses.length, buses });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get nearest buses to passenger location
 * @route   GET /api/locations/nearest?lat=&lng=&limit=
 * @access  Public
 */
const getNearestBuses = async (req, res, next) => {
  try {
    const { lat, lng, limit = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'lat and lng query params are required.' });
    }

    const passengerLat = parseFloat(lat);
    const passengerLng = parseFloat(lng);

    if (isNaN(passengerLat) || isNaN(passengerLng)) {
      return res.status(400).json({ success: false, message: 'lat and lng must be valid numbers.' });
    }

    const locations = await LiveLocation.find()
      .populate('driver', 'driverName')
      .populate('company', 'companyName')
      .lean();

    const buses = locations
      .map(normalizeLocation)
      .filter((b) => b.latitude !== null && b.longitude !== null)
      .map((b) => ({
        ...b,
        distance: parseFloat(
          haversineDistance(passengerLat, passengerLng, b.latitude, b.longitude).toFixed(2)
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, parseInt(limit, 10));

    res.status(200).json({ success: true, count: buses.length, buses });
  } catch (error) {
    next(error);
  }
};

module.exports = { getLiveBuses, getNearestBuses };
