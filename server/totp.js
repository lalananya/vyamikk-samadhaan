const { authenticator } = require("otplib");

// Configure TOTP
authenticator.options = {
  window: 1, // Allow 1 time step before and after current time
  step: 30, // 30 second time step
  digits: 6, // 6 digit codes
};

/**
 * Generate a new TOTP secret
 * @returns {string} - Base32 encoded secret
 */
function generateSecret() {
  return authenticator.generateSecret();
}

/**
 * Verify TOTP code against secret
 * @param {string} code - TOTP code to verify
 * @param {string} secret - Base32 encoded secret
 * @returns {boolean} - True if code is valid
 */
function verify(code, secret) {
  try {
    return authenticator.verify({ token: code, secret: secret });
  } catch (error) {
    console.error("TOTP verification error:", error);
    return false;
  }
}

/**
 * Generate TOTP code for testing (development only)
 * @param {string} secret - Base32 encoded secret
 * @returns {string} - Current TOTP code
 */
function generateCode(secret) {
  try {
    return authenticator.generate(secret);
  } catch (error) {
    console.error("TOTP generation error:", error);
    return null;
  }
}

/**
 * Get time remaining for current TOTP window
 * @returns {number} - Seconds remaining
 */
function getTimeRemaining() {
  const epoch = Math.round(new Date().getTime() / 1000.0);
  const timeStep = 30;
  return timeStep - (epoch % timeStep);
}

/**
 * Generate TOTP URI for QR code
 * @param {string} accountName - Account name (usually phone)
 * @param {string} secret - Base32 encoded secret
 * @returns {string} - TOTP URI
 */
function generateURI(accountName, secret) {
  return authenticator.keyuri(accountName, "Vyaamik Samadhaan", secret);
}

module.exports = {
  generateSecret,
  verify,
  generateCode,
  getTimeRemaining,
  generateURI,
};
