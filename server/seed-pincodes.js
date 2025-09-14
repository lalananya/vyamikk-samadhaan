#!/usr/bin/env node

/**
 * PIN Code Data Importer
 *
 * Expected CSV columns:
 * - pincode: 6-digit PIN code (e.g., "560001")
 * - office_name: Post office name (e.g., "Bangalore GPO")
 * - district: District name (e.g., "Bangalore")
 * - state: State name (e.g., "Karnataka")
 * - circle: Postal circle (e.g., "Karnataka")
 * - lat: Latitude (optional, can be empty)
 * - lng: Longitude (optional, can be empty)
 *
 * Usage: node seed-pincodes.js /path/to/pincodes.csv
 */

const fs = require("fs");
const path = require("path");
const { db } = require("./db");

const BATCH_SIZE = 1000;

function parseCSVLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parseCSV(content) {
  const lines = content.split("\n").filter((line) => line.trim());
  const headers = parseCSVLine(lines[0]);

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header.toLowerCase().replace(/\s+/g, "_")] = values[index];
      });
      data.push(row);
    }
  }

  return data;
}

function validateRow(row) {
  const required = ["pincode", "office_name", "district", "state", "circle"];

  for (const field of required) {
    if (!row[field] || row[field].trim() === "") {
      return false;
    }
  }

  // Validate PIN format
  if (!/^[1-9]\d{5}$/.test(row.pincode)) {
    return false;
  }

  return true;
}

function processBatch(batch) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO pin_codes 
    (pincode, office_name, district, state, circle, lat, lng)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const row of batch) {
    const lat =
      row.lat && !isNaN(parseFloat(row.lat)) ? parseFloat(row.lat) : null;
    const lng =
      row.lng && !isNaN(parseFloat(row.lng)) ? parseFloat(row.lng) : null;

    stmt.run(
      row.pincode,
      row.office_name,
      row.district,
      row.state,
      row.circle,
      lat,
      lng,
    );
  }
}

async function main() {
  const csvPath = process.argv[2];

  if (!csvPath) {
    console.error("Usage: node seed-pincodes.js /path/to/pincodes.csv");
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  console.log(`Reading PIN code data from: ${csvPath}`);

  try {
    const content = fs.readFileSync(csvPath, "utf8");
    const data = parseCSV(content);

    console.log(`Parsed ${data.length} rows`);

    // Filter valid rows
    const validData = data.filter(validateRow);
    console.log(`Valid rows: ${validData.length}`);

    if (validData.length === 0) {
      console.error("No valid data found");
      process.exit(1);
    }

    // Process in batches
    let processed = 0;
    for (let i = 0; i < validData.length; i += BATCH_SIZE) {
      const batch = validData.slice(i, i + BATCH_SIZE);
      processBatch(batch);
      processed += batch.length;
      console.log(`Processed ${processed}/${validData.length} rows`);
    }

    console.log("✅ PIN code data imported successfully");

    // Show some stats
    const totalOffices = db.get(
      "SELECT COUNT(*) as count FROM pin_codes",
    ).count;
    const uniquePins = db.get(
      "SELECT COUNT(DISTINCT pincode) as count FROM pin_codes",
    ).count;

    console.log(`Total offices: ${totalOffices}`);
    console.log(`Unique PIN codes: ${uniquePins}`);
  } catch (error) {
    console.error("Error importing data:", error.message);
    process.exit(1);
  }
}

main();
