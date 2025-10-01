import { DateTime } from 'luxon';

export class SessionManager {
  constructor(prisma) {
    this.prisma = prisma;
    this.sessionTimeout = 30; // 30 minutes
  }

  // Get active session for chat
  async getSession(chatId) {
    try {
      const session = await this.prisma.telegramSession.findUnique({
        where: { chatId }
      });

      if (!session) return null;

      // Check if session expired
      if (new Date(session.expiresAt) < new Date()) {
        await this.clearSession(chatId);
        return null;
      }

      return {
        id: session.id,
        state: session.state,
        data: session.data || {},
        expiresAt: session.expiresAt
      };
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  // Create or update session
  async setSession(chatId, state, data = {}) {
    try {
      const expiresAt = DateTime.now().plus({ minutes: this.sessionTimeout }).toJSDate();
      
      const session = await this.prisma.telegramSession.upsert({
        where: { chatId },
        update: {
          state,
          data,
          expiresAt
        },
        create: {
          chatId,
          state,
          data,
          expiresAt
        }
      });

      return {
        id: session.id,
        state: session.state,
        data: session.data || {},
        expiresAt: session.expiresAt
      };
    } catch (error) {
      console.error('Failed to set session:', error);
      throw error;
    }
  }

  // Update existing session data
  async updateSession(chatId, newData) {
    try {
      const currentSession = await this.getSession(chatId);
      if (!currentSession) {
        throw new Error('No active session to update');
      }

      const mergedData = { ...currentSession.data, ...newData };
      const expiresAt = DateTime.now().plus({ minutes: this.sessionTimeout }).toJSDate();

      await this.prisma.telegramSession.update({
        where: { chatId },
        data: {
          data: mergedData,
          expiresAt
        }
      });

      return {
        ...currentSession,
        data: mergedData,
        expiresAt
      };
    } catch (error) {
      console.error('Failed to update session:', error);
      throw error;
    }
  }

  // Clear session
  async clearSession(chatId) {
    try {
      await this.prisma.telegramSession.delete({
        where: { chatId }
      }).catch(() => {
        // Ignore if session doesn't exist
      });
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  // Clean up expired sessions (should be called periodically)
  async cleanupExpiredSessions() {
    try {
      const result = await this.prisma.telegramSession.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      console.log(`Cleaned up ${result.count} expired sessions`);
      return result.count;
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
      return 0;
    }
  }

  // Get session stats
  async getSessionStats() {
    try {
      const total = await this.prisma.telegramSession.count();
      const byState = await this.prisma.telegramSession.groupBy({
        by: ['state'],
        _count: true
      });

      return {
        total,
        byState: byState.reduce((acc, item) => {
          acc[item.state] = item._count;
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Failed to get session stats:', error);
      return { total: 0, byState: {} };
    }
  }

  // Set session with automatic expiry extension
  async extendSession(chatId) {
    try {
      const session = await this.getSession(chatId);
      if (!session) return null;

      const expiresAt = DateTime.now().plus({ minutes: this.sessionTimeout }).toJSDate();
      
      await this.prisma.telegramSession.update({
        where: { chatId },
        data: { expiresAt }
      });

      return { ...session, expiresAt };
    } catch (error) {
      console.error('Failed to extend session:', error);
      return null;
    }
  }

  // Check if user has any active sessions (for preventing multiple flows)
  async hasActiveSession(chatId) {
    const session = await this.getSession(chatId);
    return !!session;
  }

  // Get all active sessions (for admin/monitoring)
  async getActiveSessions() {
    try {
      const sessions = await this.prisma.telegramSession.findMany({
        where: {
          expiresAt: {
            gt: new Date()
          }
        },
        select: {
          chatId: true,
          state: true,
          expiresAt: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return sessions;
    } catch (error) {
      console.error('Failed to get active sessions:', error);
      return [];
    }
  }

  // Session state helpers
  isCreatingTask(session) {
    return session?.state === 'new_task';
  }

  isCreatingEvent(session) {
    return session?.state === 'new_event';
  }

  isCapturingQuickNote(session) {
    return session?.state === 'quick_note';
  }

  isInReflectionMode(session) {
    return session?.state === 'reflection';
  }
}