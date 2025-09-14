/**
 * Simple UEID backfill migration
 * Generates basic ecosystem_id for existing users
 */

const { db } = require('../db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Simple UEID generation (without full library)
function generateSimpleUEID(userId) {
  const input = `${uuidv4()}-${userId}`;
  const hash = crypto.createHash('sha256').update(input).digest();
  
  // Convert to base32-like string (simplified)
  const base32 = hash.toString('hex').toUpperCase().substring(0, 12);
  
  // Format as VS-XXXX-XXXX-XXXX
  return `VS-${base32.substring(0, 4)}-${base32.substring(4, 8)}-${base32.substring(8, 12)}`;
}

async function backfillUEID() {
  console.log('Starting simple UEID backfill migration...');
  
  try {
    // Get all users without ecosystem_id
    const users = db.prepare(`
      SELECT id, phone, createdAt
      FROM users 
      WHERE ecosystem_id IS NULL
    `).all();
    
    console.log(`Found ${users.length} users to backfill`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        // Generate simple UEID
        const ueid = generateSimpleUEID(user.id);
        
        // Update user with new ecosystem_id
        db.prepare(`
          UPDATE users 
          SET ecosystem_id = ?, can_receive_payments = 1
          WHERE id = ?
        `).run(ueid, user.id);
        
        console.log(`Generated UEID for user ${user.id}: ${ueid}`);
        successCount++;
        
      } catch (error) {
        console.error(`Failed to generate UEID for user ${user.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`UEID backfill completed: ${successCount} success, ${errorCount} errors`);
    
    // Verify all users now have ecosystem_id
    const usersWithoutUEID = db.prepare(`
      SELECT COUNT(*) as count
      FROM users 
      WHERE ecosystem_id IS NULL
    `).get();
    
    if (usersWithoutUEID.count > 0) {
      console.warn(`Warning: ${usersWithoutUEID.count} users still without ecosystem_id`);
    } else {
      console.log('All users now have ecosystem_id');
    }
    
  } catch (error) {
    console.error('UEID backfill migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  backfillUEID()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { backfillUEID };
