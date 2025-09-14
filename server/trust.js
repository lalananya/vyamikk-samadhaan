const { v4: uuidv4 } = require("uuid");
const { db } = require("./db");

/**
 * Add a trust event for a VPI
 * @param {string} vpiId - VPI ID
 * @param {string} kind - Event kind
 * @param {number} weight - Trust weight (positive or negative)
 */
function addEvent(vpiId, kind, weight) {
  const id = uuidv4();
  const ts = Date.now();

  db.run(
    "INSERT INTO trust_events (id, vpiId, kind, weight, ts) VALUES (?, ?, ?, ?, ?)",
    [id, vpiId, kind, weight, ts],
  );

  // Update VPI trust score
  updateTrustScore(vpiId);
}

/**
 * Calculate trust score for a VPI
 * @param {string} vpiId - VPI ID
 * @returns {number} - Current trust score
 */
function calcTrustScore(vpiId) {
  const events = db.all(
    "SELECT weight, ts FROM trust_events WHERE vpiId = ? ORDER BY ts DESC",
    [vpiId],
  );

  // Simple calculation: sum of weights with time decay
  let score = 0;
  const now = Date.now();
  const decayFactor = 0.95; // 5% decay per day

  for (const event of events) {
    const daysOld = (now - event.ts) / (1000 * 60 * 60 * 24);
    const decayedWeight = event.weight * Math.pow(decayFactor, daysOld);
    score += decayedWeight;
  }

  return Math.round(score);
}

/**
 * Update trust score for a VPI
 * @param {string} vpiId - VPI ID
 */
function updateTrustScore(vpiId) {
  const score = calcTrustScore(vpiId);

  db.run("UPDATE vpi SET trustScore = ? WHERE vpiId = ?", [score, vpiId]);
}

/**
 * Bump trust score on specific events
 * @param {string} event - Event type
 * @param {Object} data - Event data
 */
function bumpScoreOn(event, data) {
  switch (event) {
    case "ledger_acknowledged":
      // Both parties get +5 for acknowledging ledger entries
      addEvent(data.from_vpi, "ledger_acknowledged", 5);
      addEvent(data.to_vpi, "ledger_acknowledged", 5);
      break;

    case "loi_signed":
      // Both parties get +20 for signing LOI
      addEvent(data.partyA_vpi, "loi_signed", 20);
      addEvent(data.partyB_vpi, "loi_signed", 20);
      break;

    case "attendance_on_time":
      // Worker gets +1 for on-time attendance
      addEvent(data.worker_vpi, "attendance_on_time", 1);
      break;

    case "attendance_approved":
      // Worker gets +2 for approved attendance
      addEvent(data.worker_vpi, "attendance_approved", 2);
      break;

    case "job_completed":
      // Worker gets +10 for completed job
      addEvent(data.worker_vpi, "job_completed", 10);
      break;

    case "payment_made":
      // Employer gets +3 for making payments
      addEvent(data.employer_vpi, "payment_made", 3);
      break;

    default:
      console.log(`Unknown trust event: ${event}`);
  }
}

/**
 * Get trust events for a VPI
 * @param {string} vpiId - VPI ID
 * @param {number} limit - Number of events to return
 * @returns {Array} - Trust events
 */
function getEvents(vpiId, limit = 50) {
  return db.all(
    "SELECT * FROM trust_events WHERE vpiId = ? ORDER BY ts DESC LIMIT ?",
    [vpiId, limit],
  );
}

/**
 * Get trust score for a VPI
 * @param {string} vpiId - VPI ID
 * @returns {number} - Trust score
 */
function getTrustScore(vpiId) {
  const result = db.get("SELECT trustScore FROM vpi WHERE vpiId = ?", [vpiId]);
  return result ? result.trustScore : 0;
}

module.exports = {
  addEvent,
  calcTrustScore,
  updateTrustScore,
  bumpScoreOn,
  getEvents,
  getTrustScore,
};
