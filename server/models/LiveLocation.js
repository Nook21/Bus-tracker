const mongoose = require('mongoose');

/**
 * LiveLocation stores ONLY the latest GPS position for each active trip.
 * We upsert (update or insert) on tripId — no infinite history.
 */
const liveLocationSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ActiveTrip',
      required: true,
      unique: true, // one document per trip
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
    },
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    busNumber: String,
    driverName: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    speed: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

liveLocationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('LiveLocation', liveLocationSchema);
