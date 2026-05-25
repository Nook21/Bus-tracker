require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const connectDB = require('./db');
const User = require('../models/User');

const seed = async () => {
  await connectDB();

  // Remove any existing admin so we start clean
  await User.deleteOne({ email: 'admin@bustracker.et' });

  // Pass plain password — the pre('save') hook in User model will hash it once
  await User.create({
    name: 'System Admin',
    email: 'admin@bustracker.et',
    password: 'Admin@1234',
    role: 'admin',
    isActive: true,
  });

  console.log('✅ Admin seeded: admin@bustracker.et / Admin@1234');
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
