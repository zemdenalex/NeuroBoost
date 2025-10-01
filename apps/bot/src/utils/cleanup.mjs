import { PrismaClient } from '@prisma/client';
import { SessionManager } from './session.mjs';
import { checkAPIHealth } from './api-client.mjs';

const prisma = new PrismaClient();
const sessions = new SessionManager(prisma);

// Cleanup function that runs periodically
export async function performCleanup() {
  console.log('[Cleanup] Starting periodic cleanup...');
  
  try {
    // 1. Clean up expired sessions
    const expiredCount = await sessions.cleanupExpiredSessions();
    console.log(`[Cleanup] Removed ${expiredCount} expired sessions`);
    
    // 2. Clean up old quick notes (keep last 1000)
    const oldNotesResult = await prisma.quickNote.deleteMany({
      where: {
        id: {
          notIn: (await prisma.quickNote.findMany({
            select: { id: true },
            orderBy: { createdAt: 'desc' },
            take: 1000
          })).map(note => note.id)
        }
      }
    });
    console.log(`[Cleanup] Removed ${oldNotesResult.count} old quick notes`);
    
    // 3. Clean up old export runs (keep last 50)
    const oldExportsResult = await prisma.exportRun.deleteMany({
      where: {
        id: {
          notIn: (await prisma.exportRun.findMany({
            select: { id: true },
            orderBy: { startedAt: 'desc' },
            take: 50
          })).map(run => run.id)
        }
      }
    });
    console.log(`[Cleanup] Removed ${oldExportsResult.count} old export runs`);
    
    // 4. Check API health
    const apiHealth = await checkAPIHealth();
    console.log(`[Cleanup] API Health: ${apiHealth.ok ? '✅ OK' : '❌ FAIL'}`);
    
    // 5. Get session stats
    const sessionStats = await sessions.getSessionStats();
    console.log(`[Cleanup] Active sessions: ${sessionStats.total}`, sessionStats.byState);
    
    console.log('[Cleanup] ✅ Cleanup completed');
    
    return {
      success: true,
      stats: {
        expiredSessions: expiredCount,
        oldNotes: oldNotesResult.count,
        oldExports: oldExportsResult.count,
        apiHealth: apiHealth.ok,
        activeSessions: sessionStats
      }
    };
  } catch (error) {
    console.error('[Cleanup] ❌ Cleanup failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Start periodic cleanup (every hour)
export function startPeriodicCleanup() {
  console.log('[Cleanup] Starting periodic cleanup scheduler...');
  
  // Run immediately
  performCleanup();
  
  // Then every hour
  setInterval(() => {
    performCleanup();
  }, 60 * 60 * 1000); // 1 hour
  
  console.log('[Cleanup] ✅ Periodic cleanup scheduler started');
}

// Force cleanup (for manual execution)
if (import.meta.url === `file://${process.argv[1]}`) {
  performCleanup()
    .then((result) => {
      console.log('Manual cleanup result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Manual cleanup failed:', error);
      process.exit(1);
    });
}