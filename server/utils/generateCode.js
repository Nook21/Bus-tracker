const crypto = require('crypto');

/**
 * Generate a cryptographically secure 6-digit numeric code
 */
const generateSixDigitCode = () => {
  // Use crypto for secure randomness
  const buffer = crypto.randomBytes(3);
  const num = buffer.readUIntBE(0, 3) % 1000000;
  return String(num).padStart(6, '0');
};

module.exports = generateSixDigitCode;
