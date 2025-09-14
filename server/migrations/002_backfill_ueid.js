/**
 * Migration: Backfill UEID for existing users
 * Generates ecosystem_id for all existing users
 */

const { db } = require('../db');
const { generateUEIDWithCollisionHandling } = require('../lib/ueid');

async function backfillUEID() {
  console.log('Starting UEID backfill migration...');
  
  try {
    // Get all users without ecosystem_id
    const users = db.prepare(`
      SELECT id, ecosystem_id_long, phone, created_at
      FROM users 
      WHERE ecosystem_id IS NULL
    `).all();
    
    console.log(`Found ${users.length} users to backfill`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        // Check for collision function
        const checkCollision = async (ueid) => {
          const existing = db.prepare('SELECT id FROM users WHERE ecosystem_id = ?').get(ueid);
          return !!existing;
        };
        
        // Generate UEID with collision handling
        const ueid = await generateUEIDWithCollisionHandling(user.id, checkCollision);
        
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
