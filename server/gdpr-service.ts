import { db } from './db';
import { 
  users, 
  appointments, 
  sessions as therapySessions,
  formSubmissions,
  messages,
  conversations,
  documents,
  dataRequests,
  notifications as userNotifications,
  therapistProfiles,
  userSubscriptions,
  bulkBookings,
  payments
} from '@shared/schema';
import { eq, and, or, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { logger } from './lib/logger';

export class GDPRService {
  private exportsDir = path.join(process.cwd(), 'user_exports');

  constructor() {
    this.ensureExportsDirectory();
  }

  private async ensureExportsDirectory() {
    if (!existsSync(this.exportsDir)) {
      await mkdir(this.exportsDir, { recursive: true });
      logger.info('Created user exports directory', { path: this.exportsDir });
    }
  }

  async exportUserData(userId: string): Promise<string> {
    logger.info('Starting data export for user', { userId });

    try {
      const userData = await this.gatherAllUserData(userId);
      
      const requestId = nanoid();
      const fileName = `user_${userId}_${Date.now()}.json`;
      const filePath = path.join(this.exportsDir, fileName);

      await writeFile(
        filePath, 
        JSON.stringify(userData, null, 2),
        'utf-8'
      );

      const fileSizeKB = Math.round((await import('fs')).statSync(filePath).size / 1024);

      logger.info('Data export file created', { 
        userId, 
        requestId, 
        filePath, 
        sizeKB: fileSizeKB 
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.insert(dataRequests).values({
        id: requestId,
        userId,
        requestType: 'export',
        status: 'completed',
        completedAt: new Date(),
        expiresAt,
        filePath: fileName,
        processedBy: 'system',
        metadata: {
          fileSize: fileSizeKB,
          recordCounts: this.getRecordCounts(userData),
          exportedAt: new Date().toISOString(),
        }
      });

      return requestId;
    } catch (error) {
      logger.error('Error exporting user data', { userId, error });
      throw error;
    }
  }

  private async gatherAllUserData(userId: string): Promise<any> {
    logger.info('Gathering all data for user', { userId });

    // First get all conversations where user is a participant
    const userConversations = await db
      .select()
      .from(conversations)
      .where(
        or(
          eq(conversations.participant1Id, userId),
          eq(conversations.participant2Id, userId)
        )
      );

    const conversationIds = userConversations.map(c => c.id);

    // Then get all messages from those conversations
    const allUserMessages = conversationIds.length > 0
      ? await db
          .select()
          .from(messages)
          .where(inArray(messages.conversationId, conversationIds))
      : [];

    const [
      user,
      userAppointments,
      userTherapySessions,
      userFormSubmissions,
      userDocuments,
      userNotifs,
      therapistProfile,
      subscriptions,
      userBulkBookings,
      userPayments
    ] = await Promise.all([
      db.select().from(users).where(eq(users.id, userId)).then(r => r[0]),
      db.select().from(appointments).where(eq(appointments.clientId, userId)),
      db.select().from(therapySessions).where(eq(therapySessions.userId, userId)),
      db.select().from(formSubmissions).where(eq(formSubmissions.userId, userId)),
      db.select().from(documents).where(eq(documents.userId, userId)),
      db.select().from(userNotifications).where(eq(userNotifications.userId, userId)),
      db.select().from(therapistProfiles).where(eq(therapistProfiles.therapistId, userId)).then(r => r[0] || null),
      db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId)),
      db.select().from(bulkBookings).where(eq(bulkBookings.clientId, userId)),
      db.select().from(payments).where(eq(payments.userId, userId))
    ]);

    const userChatMessages = allUserMessages;

    const sanitizedUser = this.sanitizeUser(user);

    return {
      exportedAt: new Date().toISOString(),
      userId,
      user: sanitizedUser,
      appointments: userAppointments,
      sessions: userTherapySessions,
      formSubmissions: userFormSubmissions,
      messages: userChatMessages,
      documents: userDocuments.map(doc => ({
        id: doc.id,
        fileName: doc.fileName,
        fileType: doc.fileType,
        uploadedAt: doc.uploadedAt,
        sessionId: doc.sessionId,
      })),
      notifications: userNotifs,
      therapistProfile,
      subscriptions,
      bulkBookings: userBulkBookings,
      payments: userPayments.map(p => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt,
        paymentMethod: p.paymentMethod
      }))
    };
  }

  private sanitizeUser(user: any): any {
    if (!user) return null;
    
    const { 
      password, 
      totpSecret, 
      backupCodes, 
      resetToken, 
      smsVerificationCode,
      emailVerificationCode,
      ...sanitized 
    } = user;
    
    return sanitized;
  }

  private getRecordCounts(userData: any): any {
    return {
      appointments: userData.appointments?.length || 0,
      sessions: userData.sessions?.length || 0,
      formSubmissions: userData.formSubmissions?.length || 0,
      messages: userData.chatMessages?.length || 0,
      documents: userData.documents?.length || 0,
      notifications: userData.notifications?.length || 0,
      subscriptions: userData.subscriptions?.length || 0,
      bulkBookings: userData.bulkBookings?.length || 0,
      invoices: userData.invoices?.length || 0,
      paymentIntents: userData.paymentIntents?.length || 0,
    };
  }

  async requestDeletion(userId: string): Promise<{ requestId: string, cancellationToken: string }> {
    logger.info('Processing deletion request for user', { userId });

    const requestId = nanoid();
    const cancellationToken = nanoid(32);
    
    const scheduledDeletionAt = new Date();
    scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + 30);

    await db.insert(dataRequests).values({
      id: requestId,
      userId,
      requestType: 'deletion',
      status: 'pending',
      scheduledDeletionAt,
      cancellationToken,
      processedBy: 'system',
      metadata: {
        gracePeriodDays: 30,
        requestedAt: new Date().toISOString(),
      }
    });

    logger.info('Deletion request created', { 
      userId, 
      requestId, 
      scheduledDeletionAt 
    });

    return { requestId, cancellationToken };
  }

  async cancelDeletion(requestId: string, cancellationToken: string): Promise<boolean> {
    logger.info('Processing deletion cancellation', { requestId });

    const request = await db
      .select()
      .from(dataRequests)
      .where(eq(dataRequests.id, requestId))
      .then(r => r[0]);

    if (!request) {
      logger.warn('Deletion request not found', { requestId });
      return false;
    }

    if (request.cancellationToken !== cancellationToken) {
      logger.warn('Invalid cancellation token', { requestId });
      return false;
    }

    if (request.requestType !== 'deletion') {
      logger.warn('Request is not a deletion request', { requestId, type: request.requestType });
      return false;
    }

    if (request.status !== 'pending') {
      logger.warn('Deletion request already processed', { requestId, status: request.status });
      return false;
    }

    await db
      .update(dataRequests)
      .set({ 
        status: 'cancelled',
        processedAt: new Date(),
        metadata: {
          ...request.metadata,
          cancelledAt: new Date().toISOString(),
        }
      })
      .where(eq(dataRequests.id, requestId));

    logger.info('Deletion request cancelled successfully', { requestId });
    return true;
  }

  async deleteExpiredExports(): Promise<number> {
    logger.info('Checking for expired export files');

    const expiredExports = await db
      .select()
      .from(dataRequests)
      .where(
        and(
          eq(dataRequests.requestType, 'export'),
          eq(dataRequests.status, 'completed')
        )
      );

    let deletedCount = 0;
    const now = new Date();

    for (const exportRequest of expiredExports) {
      if (exportRequest.expiresAt && exportRequest.expiresAt < now) {
        try {
          if (exportRequest.filePath) {
            const fullPath = path.join(this.exportsDir, exportRequest.filePath);
            await unlink(fullPath);
            logger.info('Deleted expired export file', { 
              requestId: exportRequest.id, 
              filePath: exportRequest.filePath 
            });
          }

          await db
            .delete(dataRequests)
            .where(eq(dataRequests.id, exportRequest.id));

          deletedCount++;
        } catch (error) {
          logger.error('Error deleting expired export', { 
            requestId: exportRequest.id, 
            error 
          });
        }
      }
    }

    logger.info('Expired exports cleanup completed', { deletedCount });
    return deletedCount;
  }

  async processScheduledDeletions(): Promise<number> {
    logger.info('Processing scheduled account deletions');

    const pendingDeletions = await db
      .select()
      .from(dataRequests)
      .where(
        and(
          eq(dataRequests.requestType, 'deletion'),
          eq(dataRequests.status, 'pending')
        )
      );

    let processedCount = 0;
    const now = new Date();

    for (const deletionRequest of pendingDeletions) {
      if (deletionRequest.scheduledDeletionAt && deletionRequest.scheduledDeletionAt <= now) {
        try {
          await this.performUserDeletion(deletionRequest.userId);
          
          await db
            .update(dataRequests)
            .set({ 
              status: 'completed',
              processedAt: new Date(),
              completedAt: new Date(),
              metadata: {
                ...deletionRequest.metadata,
                completedAt: new Date().toISOString(),
              }
            })
            .where(eq(dataRequests.id, deletionRequest.id));

          processedCount++;
          logger.info('User deletion completed', { 
            userId: deletionRequest.userId,
            requestId: deletionRequest.id 
          });
        } catch (error) {
          logger.error('Error processing user deletion', { 
            requestId: deletionRequest.id,
            userId: deletionRequest.userId,
            error 
          });

          await db
            .update(dataRequests)
            .set({ 
              status: 'failed',
              processedAt: new Date(),
              errorMessage: error instanceof Error ? error.message : String(error)
            })
            .where(eq(dataRequests.id, deletionRequest.id));
        }
      }
    }

    logger.info('Scheduled deletions processing completed', { processedCount });
    return processedCount;
  }

  private async performUserDeletion(userId: string): Promise<void> {
    logger.info('Performing hard delete for user', { userId });

    await db
      .update(users)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: 'gdpr_deletion_request',
        deletionReason: 'User requested GDPR data deletion',
        email: `deleted_${userId}@gdpr-deleted.local`,
        password: null,
        firstName: '[DELETED]',
        lastName: '[DELETED]',
        phoneNumber: null,
        profileImageUrl: null,
        totpSecret: null,
        backupCodes: null,
        resetToken: null,
        profileData: null,
      })
      .where(eq(users.id, userId));

    logger.info('User data anonymized successfully', { userId });
  }

  async getExportFilePath(requestId: string): Promise<string | null> {
    const request = await db
      .select()
      .from(dataRequests)
      .where(eq(dataRequests.id, requestId))
      .then(r => r[0]);

    if (!request || request.requestType !== 'export' || request.status !== 'completed') {
      return null;
    }

    if (!request.filePath) {
      return null;
    }

    const fullPath = path.join(this.exportsDir, request.filePath);
    return existsSync(fullPath) ? fullPath : null;
  }
}

export const gdprService = new GDPRService();
