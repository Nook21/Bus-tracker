const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    driverName: {
      type: String,
      required: [true, 'Driver name is required'],
      trim: true,
    },
    driverPhone: {
      type: String,
      required: [true, 'Driver phone is required'],
      trim: true,
    },
    driverEmail: {
      type: String,
      required: [true, 'Driver email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    driverLicense: {
      type: String,
      required: [true, 'Driver license is required'],
      trim: true,
    },
    nationalId: {
      type: String,
      required: [true, 'National ID is required'],
      trim: true,
    },
    assignedBusNumber: {
      type: String,
      required: [true, 'Bus number is required'],
      trim: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    // The user account linked to this driver
    userRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    busRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Driver', driverSchema);
