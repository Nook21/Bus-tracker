const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver');
const ActiveTrip = require('../models/ActiveTrip');
const LiveLocation = require('../models/LiveLocation');

/**
 * Authenticate socket connection via JWT token
 */
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      // Allow unauthenticated connections for passengers (read-only)
      socket.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      socket.user = null;
      return next();
    }

    socket.user = user;
    next();
  } catch (err) {
    socket.user = null;
    next(); // Allow connection even if token is invalid (passenger mode)
  }
};

const initSocket = (io) => {
  // Middleware for socket auth
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userId = socket.user?._id;
    const role = socket.user?.role;

    console.log(`🔌 Socket connected: ${socket.id} | Role: ${role || 'passenger'}`);

    // ─── DRIVER: Join their own room ───────────────────────────────────────
    if (role === 'driver') {
      socket.join(`driver:${userId}`);
    }

    // ─── COMPANY: Join company room ────────────────────────────────────────
    if (role === 'company') {
      const companyId = socket.user.companyRef;
      if (companyId) socket.join(`company:${companyId}`);
    }

    // ─── PASSENGER: Join public tracking room ─────────────────────────────
    socket.join('public:tracking');

    // ─── DRIVER: Send GPS location update ─────────────────────────────────
    socket.on('driver:location', async (data) => {
      try {
        if (!socket.user || socket.user.role !== 'driver') return;

        const { latitude, longitude, speed = 0, tripId } = data;

        if (!latitude || !longitude || !tripId) return;

        // Verify trip belongs to this driver
        const trip = await ActiveTrip.findOne({
          _id: tripId,
          driver: { $exists: true },
          status: 'active',
        }).populate('driver');

        if (!trip || trip.driver.userRef.toString() !== socket.user._id.toString()) return;

        // Upsert live location (update existing or create new)
        const locationDoc = await LiveLocation.findOneAndUpdate(
          { trip: tripId },
          {
            trip: tripId,
            driver: trip.driver._id,
            bus: trip.bus,
            company: trip.company,
            busNumber: trip.busNumber,
            driverName: trip.driverName,
            location: {
              type: 'Point',
              coordinates: [longitude, latitude], // GeoJSON: [lng, lat]
            },
            speed,
            timestamp: new Date(),
          },
          { upsert: true, new: true }
        );

        // Update trip's last location snapshot
        await ActiveTrip.findByIdAndUpdate(tripId, {
          lastLocation: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
        });

        // Broadcast to all passengers and company
        const payload = {
          tripId,
          busNumber: trip.busNumber,
          driverName: trip.driverName,
          latitude,
          longitude,
          speed,
          timestamp: new Date().toISOString(),
          locationId: locationDoc._id,
        };

        // Broadcast to public tracking room (passengers)
        io.to('public:tracking').emit('bus:location:update', payload);

        // Broadcast to company room
        io.to(`company:${trip.company}`).emit('bus:location:update', payload);

      } catch (err) {
        console.error('Socket location error:', err.message);
        socket.emit('error', { message: 'Failed to update location.' });
      }
    });

    // ─── DRIVER: Trip started notification ────────────────────────────────
    socket.on('driver:trip:started', async (data) => {
      try {
        if (!socket.user || socket.user.role !== 'driver') return;

        const { tripId } = data;
        const trip = await ActiveTrip.findById(tripId);
        if (!trip) return;

        io.to('public:tracking').emit('trip:started', {
          tripId,
          busNumber: trip.busNumber,
          driverName: trip.driverName,
          companyId: trip.company,
        });

        io.to(`company:${trip.company}`).emit('trip:started', {
          tripId,
          busNumber: trip.busNumber,
          driverName: trip.driverName,
        });
      } catch (err) {
        console.error('Trip start socket error:', err.message);
      }
    });

    // ─── DRIVER: Trip ended notification ──────────────────────────────────
    socket.on('driver:trip:ended', async (data) => {
      try {
        if (!socket.user || socket.user.role !== 'driver') return;

        const { tripId } = data;

        io.to('public:tracking').emit('trip:ended', { tripId });
        io.to(`company:${data.companyId}`).emit('trip:ended', { tripId });
      } catch (err) {
        console.error('Trip end socket error:', err.message);
      }
    });

    // ─── DISCONNECT ────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = initSocket;
