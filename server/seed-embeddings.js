#!/usr/bin/env node

/**
 * Seed Embeddings Script
 *
 * Generates and stores sample embeddings for testing semantic search
 *
 * Usage: node seed-embeddings.js
 */

const mlClient = require("./mlClient");
const { vectorIndex } = require("./db");

// Sample job descriptions for testing
const sampleJobs = [
  {
    entityType: "job",
    entityId: "job_001",
    text: "Injection moulding operator with 2+ years experience in plastic manufacturing",
  },
  {
    entityType: "job",
    entityId: "job_002",
    text: "CNC lathe operator for precision machining of metal components",
  },
  {
    entityType: "job",
    entityId: "job_003",
    text: "Welding technician specializing in TIG and MIG welding techniques",
  },
  {
    entityType: "job",
    entityId: "job_004",
    text: "Quality control inspector for automotive parts manufacturing",
  },
  {
    entityType: "job",
    entityId: "job_005",
    text: "Machine maintenance technician with electrical and mechanical skills",
  },
  {
    entityType: "job",
    entityId: "job_006",
    text: "Assembly line worker for electronic device manufacturing",
  },
  {
    entityType: "job",
    entityId: "job_007",
    text: "Forklift operator with warehouse and logistics experience",
  },
  {
    entityType: "job",
    entityId: "job_008",
    text: "Tool and die maker for precision metal fabrication",
  },
  {
    entityType: "job",
    entityId: "job_009",
    text: "Packaging operator for food and beverage industry",
  },
  {
    entityType: "job",
    entityId: "job_010",
    text: "Production supervisor for manufacturing operations",
  },
];

// Sample professional profiles
const sampleProfiles = [
  {
    entityType: "profile",
    entityId: "profile_001",
    text: "Experienced injection moulding operator with 5 years in plastic manufacturing",
  },
  {
    entityType: "profile",
    entityId: "profile_002",
    text: "CNC machinist specializing in lathe operations and precision work",
  },
  {
    entityType: "profile",
    entityId: "profile_003",
    text: "Welder with TIG, MIG, and arc welding certifications",
  },
  {
    entityType: "profile",
    entityId: "profile_004",
    text: "Quality inspector with experience in automotive and aerospace",
  },
  {
    entityType: "profile",
    entityId: "profile_005",
    text: "Maintenance technician with electrical and mechanical expertise",
  },
];

async function seedEmbeddings() {
  console.log("🌱 Seeding embeddings...");

  try {
    // Generate embeddings for jobs
    console.log("Generating job embeddings...");
    await batchGenerateEmbeddings(sampleJobs);

    // Generate embeddings for profiles
    console.log("Generating profile embeddings...");
    await batchGenerateEmbeddings(sampleProfiles);

    console.log("✅ Embeddings seeded successfully!");

    // Test search functionality
    console.log("\n🔍 Testing semantic search...");

    const testQueries = [
      { query: "injection moulding", type: "job" },
      { query: "CNC lathe operator", type: "job" },
      { query: "welding technician", type: "profile" },
      { query: "quality control", type: "job" },
    ];

    for (const test of testQueries) {
      console.log(`\nQuery: "${test.query}" (${test.type})`);
      const results = await testSearch(test.type, test.query, 3);

      results.forEach((result, index) => {
        console.log(
          `  ${index + 1}. ${result.id} (score: ${result.score.toFixed(3)})`,
        );
      });
    }
  } catch (error) {
    console.error("❌ Failed to seed embeddings:", error.message);
    process.exit(1);
  }
}

/**
 * Generate and store embeddings for a batch of items
 * @param {Array<{entityType: string, entityId: string, text: string}>} items - Items to embed
 */
async function batchGenerateEmbeddings(items) {
  try {
    const texts = items.map((item) => item.text);
    const embedResult = await mlClient.embed(texts, true);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const vector = embedResult.vectors[i];

      vectorIndex.upsertVector(item.entityType, item.entityId, vector);
    }

    console.log(`Generated ${items.length} embeddings`);
  } catch (error) {
    console.error("Failed to generate batch embeddings:", error);
    throw error;
  }
}

/**
 * Test search functionality
 * @param {string} type - Entity type
 * @param {string} query - Search query
 * @param {number} topK - Number of results
 */
async function testSearch(type, query, topK) {
  try {
    const embedResult = await mlClient.embed([query], true);
    const queryVector = embedResult.vectors[0];

    const candidates = vectorIndex.annSearch(type, queryVector, topK);

    return candidates.map((candidate) => ({
      id: candidate.id,
      score: 1 - candidate.distance, // Convert distance to similarity
    }));
  } catch (error) {
    console.error("Search test failed:", error);
    return [];
  }
}

// Run if called directly
if (require.main === module) {
  seedEmbeddings();
}

module.exports = { seedEmbeddings };
