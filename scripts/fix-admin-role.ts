/**
 * Fix Admin Role Script - Step 29
 * 
 * Purpose: Remove work email from therapist role and restore admin login
 * 
 * Usage: npx tsx scripts/fix-admin-role.ts <email>
 * Example: npx tsx scripts/fix-admin-role.ts admin@hive-wellness.co.uk
 */

import { db } from '../server/db';
import { users, sessions } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

async function fixAdminRole(email: string) {
  console.log(`🔧 Starting role fix for: ${email}`);
  
  try {
    // 1. Find the user
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (user.length === 0) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }
    
    const currentUser = user[0];
    console.log(`✅ Found user: ${currentUser.email}`);
    console.log(`   Current role: ${currentUser.role}`);
    
    // 2. Force role to admin
    await db.update(users)
      .set({
        role: 'admin',
        updatedAt: new Date()
      })
      .where(eq(users.id, currentUser.id));
    
    console.log(`✅ Role updated to: admin`);
    
    // 3. Invalidate all sessions for this user (force re-login with new role)
    const deletedSessions = await db.delete(sessions)
      .where(sql`sess::jsonb @> ${JSON.stringify({ emailAuthUser: { id: currentUser.id } })}::jsonb`)
      .returning();
    
    console.log(`🔄 Invalidated ${deletedSessions.length} session(s) - user will need to log in again`);
    
    // 4. Clear any cached role claims (handled by session deletion)
    console.log(`🧹 Role claims cleared via session invalidation`);
    
    console.log(`\n✨ Success! ${email} is now admin.`);
    console.log(`   User must log out and log back in for changes to take effect.`);
    
  } catch (error) {
    console.error(`❌ Error fixing admin role:`, error);
    process.exit(1);
  }
}

// Get email from command line args
const email = process.argv[2];

if (!email) {
  console.error('❌ Usage: npx tsx scripts/fix-admin-role.ts <email>');
  process.exit(1);
}

// Run the fix
fixAdminRole(email).then(() => process.exit(0));
