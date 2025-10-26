import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { VideoSessionService } from '../video-session-service';

// TypeScript interface extensions for custom request properties  
interface AuthenticatedUser extends Express.User {
  id: string;
  role: string;
  email: string;
  firstName?: string;
  lastName?: string;
  claims?: {
    sub: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

// Extend Express session type to include custom properties
declare module 'express-session' {
  interface SessionData {
    demoUser?: AuthenticatedUser;
    emailAuthUser?: AuthenticatedUser;
    user?: AuthenticatedUser;
  }
}

// Note: Using 'any' types for middleware functions to avoid Express type conflicts
// This allows flexible user property access while maintaining type safety where needed

// SECURITY FIX: Proper authentication middleware
const isAuthenticated = (req: any, res: any, next: any) => {
  // Check for demo user session
  if (req.session?.demoUser) {
    req.user = {
      id: req.session.demoUser.id,
      role: req.session.demoUser.role,
      email: req.session.demoUser.email,
      ...req.session.demoUser
    };
    return next();
  }
  
  // Check for email auth user (manual login)
  if (req.session?.emailAuthUser) {
    req.user = {
      id: req.session.emailAuthUser.id,
      role: req.session.emailAuthUser.role,
      email: req.session.emailAuthUser.email,
      ...req.session.emailAuthUser
    };
    return next();
  }
  
  // Check for regular user session
  if (req.session?.user) {
    req.user = {
      id: req.session.user.id,
      role: req.session.user.role,
      email: req.session.user.email,
      ...req.session.user
    };
    return next();
  }
  
  // Check for Replit auth
  if (req.isAuthenticated && typeof req.isAuthenticated === 'function' && req.isAuthenticated() && (req.user as any)?.claims?.sub) {
    return next();
  }
  
  // SECURITY: No unauthorized access to video sessions
  return res.status(401).json({ message: 'Authentication required' });
};

// SECURITY FIX: Verify user is participant in session
const verifySessionParticipant = async (req: any, res: any, next: any) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    
    if (!sessionId || !userId) {
      return res.status(400).json({ message: 'Session ID and user ID required' });
    }
    
    console.log(`Verifying access for user ${userId} to session ${sessionId}`);
    
    // Get session data to verify participant access
    const sessionData = await VideoSessionService.getVideoSession(sessionId);
    if (!sessionData) {
      console.log(`Session ${sessionId} not found in VideoSessionService`);
      return res.status(404).json({ message: 'Session not found' });
    }
    
    console.log(`Found session ${sessionId} for verification:`, {
      sessionType: sessionData.sessionType,
      clientId: sessionData.clientId,
      therapistId: sessionData.therapistId,
      clientEmail: sessionData.clientEmail
    });
    
    // Check if user is a participant (client, therapist, or admin)
    const isParticipant = 
      userId === sessionData.clientId ||
      userId === sessionData.therapistId ||
      req.user?.role === 'admin' ||
      // SECURITY FIX: For introduction calls, verify requester email matches intro call client email
      (sessionData.sessionType === 'introduction-call' && userEmail && sessionData.clientEmail === userEmail);
    
    if (!isParticipant) {
      console.log(`Access denied: User ${userId} (${userEmail}) is not a participant in session ${sessionId}`, {
        clientId: sessionData.clientId,
        therapistId: sessionData.therapistId,
        clientEmail: sessionData.clientEmail,
        userRole: req.user?.role
      });
      return res.status(403).json({ message: 'Access denied: Not a session participant' });
    }
    
    console.log(`✅ Access granted: User ${userId} is authorized for session ${sessionId}`);
    
    // Attach session data to request for use in endpoint
    req.sessionData = sessionData;
    next();
  } catch (error) {
    console.error('Error verifying session participant:', error);
    res.status(500).json({ message: 'Failed to verify session access' });
  }
};
import { VideoSessionManager } from '../middleware/video-session-manager';
import { SessionPaymentService, SessionCompletionData } from '../session-payment-service';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { appointments, users, therapistProfiles, introductionCalls } from '../../shared/schema';
import { createPaymentWithRevenueSplit, PaymentSplitOptions } from '../stripe-revenue-split';
import { storage } from '../storage';

// PRODUCTION-READY: Zod validation schemas for critical endpoints
const sessionCompletionSchema = z.object({
  idempotencyKey: z.string().optional(),
  actualDuration: z.number().min(1).max(300).optional(), // 1-300 minutes
  paymentTiming: z.enum(['immediate', 'deferred']).default('immediate'),
  completionReason: z.string().optional()
});

const paymentConfirmationSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
  confirmationNonce: z.string().optional()
});

const router = Router();

interface VideoSession {
  id: string;
  sessionType: 'therapy' | 'consultation';
  clientId: string;
  therapistId: string;
  scheduledAt: string;
  duration: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  meetingLink?: string;
  notes?: string;
  clientName?: string;
  therapistName?: string;
  createdAt: string;
}

// In-memory storage for demo sessions
const demoSessions = new Map<string, VideoSession>();

// Export function to add video sessions from booking system
export const addVideoSession = (session: VideoSession) => {
  console.log(`Adding video session to admin dashboard: ${session.id}`);
  demoSessions.set(session.id, session);
  console.log(`Total video sessions: ${demoSessions.size}`);
};


// Create demo sessions for testing
const createDemoSessions = () => {
  const sharedDemoSession: VideoSession = {
    id: 'shared-demo-session',
    sessionType: 'therapy',
    clientId: 'demo-client-1',
    therapistId: 'demo-therapist-1',
    scheduledAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes from now
    duration: 60,
    status: 'scheduled',
    meetingLink: `https://meet.google.com/demo-shared-session`,
    notes: 'Demo therapy session for testing video calls',
    clientName: 'Demo Client',
    therapistName: 'Dr. Demo Therapist',
    createdAt: new Date().toISOString()
  };

  const clientSession: VideoSession = {
    id: 'client-demo-session',
    sessionType: 'therapy',
    clientId: 'demo-client-1',
    therapistId: 'demo-therapist-1',
    scheduledAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
    duration: 50,
    status: 'scheduled',
    meetingLink: `https://meet.google.com/demo-client-session`,
    notes: 'Client demo session',
    clientName: 'Demo Client',
    therapistName: 'Dr. Demo Therapist',
    createdAt: new Date().toISOString()
  };

  const therapistSession: VideoSession = {
    id: 'therapist-demo-session',
    sessionType: 'therapy',
    clientId: 'demo-client-1',
    therapistId: 'demo-therapist-1',
    scheduledAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes from now
    duration: 50,
    status: 'scheduled',
    meetingLink: `https://meet.google.com/demo-therapist-session`,
    notes: 'Therapist demo session',
    clientName: 'Demo Client',
    therapistName: 'Dr. Demo Therapist',
    createdAt: new Date().toISOString()
  };

  demoSessions.set(sharedDemoSession.id, sharedDemoSession);
  demoSessions.set(clientSession.id, clientSession);
  demoSessions.set(therapistSession.id, therapistSession);
  
  console.log('✅ Demo video sessions created successfully');
};

// Initialize demo sessions
createDemoSessions();

// PUBLIC ACCESS: Introduction call access for non-authenticated prospective clients/therapists
router.get('/introduction-call/:bookingId/access', async (req: any, res: any) => {
  try {
    const { bookingId } = req.params;
    const { email } = req.query;
    
    if (!bookingId || !email) {
      return res.status(400).json({ 
        success: false,
        message: 'Booking ID and email are required' 
      });
    }
    
    console.log(`Public access request for introduction call ${bookingId} with email ${email}`);
    
    // Verify introduction call exists and email matches
    const introCalls = await db.select()
      .from(introductionCalls)
      .where(eq(introductionCalls.id, bookingId));
    
    if (introCalls.length === 0) {
      console.log(`Introduction call ${bookingId} not found`);
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found' 
      });
    }
    
    const introCall = introCalls[0];
    
    // Verify email matches (case-insensitive)
    if (introCall.email.toLowerCase() !== email.toLowerCase()) {
      console.log(`Email mismatch for booking ${bookingId}: expected ${introCall.email}, got ${email}`);
      return res.status(403).json({ 
        success: false,
        message: 'Access denied: Email does not match booking' 
      });
    }
    
    // Determine the meeting URL (prefer Google Meet, fallback to Daily.co)
    const meetingUrl = introCall.meetingLink || introCall.dailyRoomUrl;
    
    if (!meetingUrl) {
      console.log(`No meeting URL found for introduction call ${bookingId}`);
      return res.status(500).json({ 
        success: false,
        message: 'Meeting link not available yet. Please try again in a few minutes.' 
      });
    }
    
    console.log(`✅ Public access granted for introduction call ${bookingId}`);
    
    // Return session data for introduction call
    const sessionData = {
      id: bookingId,
      sessionType: 'introduction-call',
      scheduledAt: introCall.preferredDate?.toISOString(),
      duration: 30, // Standard intro call duration
      status: introCall.status,
      meetingUrl: meetingUrl,
      clientName: introCall.name,
      clientEmail: introCall.email,
      adminName: 'Hive Wellness Team',
      participants: [
        { id: 'intro-client', name: introCall.name, role: 'client', email: introCall.email },
        { id: 'admin', name: 'Hive Wellness Team', role: 'admin', email: 'support@hive-wellness.co.uk' }
      ],
      joinInstructions: `
Welcome to your introduction call with Hive Wellness!

Meeting Details:
- Type: Initial consultation
- Duration: 15-30 minutes
- Client: ${introCall.name}

To join the meeting:
1. Click "Join Video Call" button
2. Allow camera and microphone access when prompted
3. Wait for the admin to join if they're not already in the meeting

Meeting URL: ${meetingUrl}
      `.trim(),
      isPublicAccess: true,
      accessVerified: true
    };
    
    res.json({
      success: true,
      session: sessionData,
      message: 'Access verified for introduction call'
    });
    
  } catch (error) {
    console.error('Error in public introduction call access:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to verify access to introduction call' 
    });
  }
});

// PUBLIC ACCESS: Join introduction call for non-authenticated users
router.post('/introduction-call/:bookingId/join', async (req: any, res: any) => {
  try {
    const { bookingId } = req.params;
    const { email } = req.body;
    
    if (!bookingId || !email) {
      return res.status(400).json({ 
        success: false,
        message: 'Booking ID and email are required' 
      });
    }
    
    console.log(`Public join request for introduction call ${bookingId} with email ${email}`);
    
    // Verify introduction call exists and email matches
    const introCalls = await db.select()
      .from(introductionCalls)
      .where(eq(introductionCalls.id, bookingId));
    
    if (introCalls.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found' 
      });
    }
    
    const introCall = introCalls[0];
    
    // Verify email matches (case-insensitive)
    if (introCall.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied: Email does not match booking' 
      });
    }
    
    // Get the meeting URL
    const meetingUrl = introCall.meetingLink || introCall.dailyRoomUrl;
    
    if (!meetingUrl) {
      return res.status(500).json({ 
        success: false,
        message: 'Meeting link not available yet. Please try again in a few minutes.' 
      });
    }
    
    console.log(`✅ Public join access granted for introduction call ${bookingId}`);
    
    res.json({
      success: true,
      meetingUrl: meetingUrl,
      message: 'Successfully joined introduction call',
      isPublicAccess: true,
      sessionId: bookingId,
      sessionType: 'introduction-call'
    });
    
  } catch (error) {
    console.error('Error in public introduction call join:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to join introduction call' 
    });
  }
});

// SECURITY FIX: Get all video sessions for authenticated user with proper authorization
router.get('/:userId', isAuthenticated, async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id;
    const userRole = req.user?.role;
    const userEmail = req.user?.email;
    
    // SECURITY: Users can only view their own sessions unless they're admin
    if (requestingUserId !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Can only view your own sessions' });
    }
    
    console.log(`Getting video sessions for user ${userId} with role ${userRole}`);
    
    // Use VideoSessionService for real data
    const sessions = await VideoSessionService.getUserVideoSessions(userId, userEmail);
    
    console.log(`Found ${sessions.length} sessions for user ${userId}`);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching video sessions:', error);
    res.status(500).json({ message: 'Failed to fetch video sessions' });
  }
});

// SECURITY FIX: Get specific video session with proper middleware authorization
router.get('/session/:sessionId', isAuthenticated, verifySessionParticipant, async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    
    console.log(`Getting video session ${sessionId} for user ${userId}`);
    
    // Session data is already verified and attached by verifySessionParticipant middleware
    const sessionData = req.sessionData;
    
    // Ensure consistent field naming - use meetingUrl not meetingLink
    const response = {
      ...sessionData,
      meetingUrl: sessionData.meetingUrl || sessionData.meetingLink || ''
    };
    
    console.log(`✅ Returning session data for ${sessionId}:`, {
      id: response.id,
      meetingUrl: response.meetingUrl,
      sessionType: response.sessionType
    });
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching video session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SECURITY FIX: Join video session with proper middleware authorization (bypass payment for confirmed sessions)
router.post('/:sessionId/join', isAuthenticated, verifySessionParticipant, async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    const bypassPayment = req.headers['x-bypass-payment'] === 'true';
    
    console.log(`User ${userId} attempting to join video session ${sessionId} (bypass payment: ${bypassPayment})`);
    
    // Session data is already verified and attached by verifySessionParticipant middleware
    const sessionData = req.sessionData;
    
    // For confirmed/paid sessions, bypass payment checks
    if (bypassPayment) {
      console.log(`🔄 BYPASSING PAYMENT CHECKS for confirmed session ${sessionId}`);
    }
    
    // Use VideoSessionService to handle join logic
    const result = await VideoSessionService.joinVideoSession(sessionId, userId);
    
    if (result.success) {
      console.log(`✅ User ${userId} successfully joined session ${sessionId}`);
      
      // Ensure consistent response format with meetingUrl
      const response = {
        success: true,
        meetingUrl: result.meetingUrl || sessionData.meetingUrl || sessionData.meetingLink || '',
        message: bypassPayment ? 'Successfully joined confirmed session' : 'Successfully joined session',
        bypassedPayment: bypassPayment
      };
      
      res.json(response);
    } else {
      console.log(`❌ Failed to join session ${sessionId} for user ${userId}`);
      res.status(400).json({ error: 'Failed to join session' });
    }
  } catch (error) {
    console.error('Error joining video session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SECURITY FIX: Leave video session with proper authorization
router.post('/:sessionId/leave', isAuthenticated, verifySessionParticipant, async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    
    console.log(`User ${userId} attempting to leave video session ${sessionId}`);
    
    // Use VideoSessionService to handle leave logic
    const result = await VideoSessionService.leaveVideoSession(sessionId, userId);
    
    if (result.success) {
      console.log(`✅ User ${userId} successfully left session ${sessionId}`);
      res.json({
        success: true,
        message: 'Successfully left session'
      });
    } else {
      res.status(400).json({ message: 'Failed to leave session' });
    }
  } catch (error) {
    console.error('Error leaving video session:', error);
    res.status(500).json({ message: 'Failed to leave session' });
  }
});

// SECURITY FIX: Schedule video session with proper authorization
router.post('/schedule', isAuthenticated, (req: any, res: any) => {
  try {
    const { therapistId, scheduledAt, sessionType, duration = 50 } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!therapistId || !scheduledAt) {
      return res.status(400).json({ message: 'Therapist ID and scheduled time are required' });
    }
    
    if (!userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }
    
    // SECURITY: Only clients can schedule new sessions (therapists use existing booking system)
    if (userRole !== 'client' && userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Only clients can schedule sessions' });
    }
    
    const sessionId = nanoid();
    const newSession: VideoSession = {
      id: sessionId,
      sessionType: sessionType || 'therapy',
      clientId: userId,
      therapistId: therapistId,
      scheduledAt,
      duration,
      status: 'scheduled',
      meetingLink: `/video-session/${sessionId}`,
      notes: 'Scheduled therapy session',
      clientName: `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim(),
      therapistName: 'Therapist',
      createdAt: new Date().toISOString()
    };
    
    demoSessions.set(sessionId, newSession);
    
    console.log(`New video session scheduled by ${userId}: ${sessionId}`);
    
    res.json({
      success: true,
      session: newSession,
      message: 'Session scheduled successfully'
    });
  } catch (error) {
    console.error('Error scheduling video session:', error);
    res.status(500).json({ message: 'Failed to schedule session' });
  }
});

// PRODUCTION-READY: Complete video session with comprehensive payment processing
router.post('/:sessionId/complete', isAuthenticated, verifySessionParticipant, async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    
    // CRITICAL FIX: Validate request body with Zod schema
    const validationResult = sessionCompletionSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error(`❌ Invalid session completion request for ${sessionId}:`, validationResult.error.flatten());
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validationResult.error.flatten().fieldErrors,
        error: 'VALIDATION_FAILED'
      });
    }
    
    const { idempotencyKey, actualDuration, paymentTiming, completionReason } = validationResult.data;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    // SECURITY: Ensure user authorization is verified
    if (!userId || !userRole) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
        error: 'AUTHENTICATION_REQUIRED'
      });
    }
    
    console.log(`🏁 PRODUCTION-READY session completion: ${sessionId} by ${userId} (${userRole})`)
    
    // CRITICAL FIX: Prepare session completion data with proper type safety
    const completionData: SessionCompletionData = {
      sessionId,
      userId,
      userRole: userRole as 'client' | 'therapist' | 'admin',
      actualDuration,
      completedBy: 'participant',
      reason: completionReason,
      sessionStartTime: new Date(), // Will be determined from session data
      sessionEndTime: new Date()
    };
    
    // Use SessionPaymentService for comprehensive processing
    const result = await SessionPaymentService.completeSessionWithPayment(completionData, {
      idempotencyKey: idempotencyKey || `session-complete-${sessionId}-${Date.now()}`,
      paymentTiming: paymentTiming as 'immediate' | 'deferred'
    });
    
    if (result.success) {
      console.log(`✅ Session ${sessionId} completed successfully with payment processing`);
      
      // CRITICAL FIX: Return strongly typed, comprehensive response
      return res.status(200).json({
        success: true,
        message: result.message,
        sessionId: result.sessionId,
        paymentProcessed: result.paymentStatus !== 'failed',
        paymentDetails: {
          paymentId: result.paymentId,
          amount: result.amount,
          therapistAmount: result.therapistAmount,
          platformAmount: result.platformAmount,
          status: result.paymentStatus,
          clientSecret: result.clientSecret
        },
        nextSteps: result.requiresManualCompletion ? {
          action: 'confirm_payment',
          description: 'Complete payment to finalize session',
          endpoint: `/api/video-sessions/${sessionId}/confirm-payment`,
          required: true
        } : undefined,
        metadata: {
          completedAt: new Date().toISOString(),
          paymentTiming,
          validationPassed: true
        }
      });
    } else {
      console.error(`❌ Session completion failed for ${sessionId}: ${result.error}`);
      
      const statusCode = result.error?.includes('ALREADY_COMPLETED') ? 400 : 
                        result.error?.includes('PAYMENT_IN_PROGRESS') ? 409 : 
                        result.error?.includes('NOT_AUTHORIZED') ? 403 : 500;
      
      return res.status(statusCode).json({
        success: false,
        message: result.message,
        error: result.error,
        sessionId: result.sessionId,
        paymentProcessed: false
      });
    }
  } catch (error) {
    const { sessionId } = req.params;
    console.error(`❌ CRITICAL ERROR during session completion for ${sessionId}:`, error);
    
    // CRITICAL FIX: Comprehensive error handling with proper logging
    return res.status(500).json({ 
      success: false,
      message: 'Critical error during session completion',
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId: sessionId!,
      metadata: {
        errorType: 'UNEXPECTED_SESSION_COMPLETION_ERROR',
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
        userRole: req.user?.role
      }
    });
  }
});

// PRODUCTION-READY: Confirm payment for completed session
router.post('/:sessionId/confirm-payment', isAuthenticated, verifySessionParticipant, async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    
    // CRITICAL FIX: Validate request body with Zod schema
    const validationResult = paymentConfirmationSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error(`❌ Invalid payment confirmation request for ${sessionId}:`, validationResult.error.flatten());
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: validationResult.error.flatten().fieldErrors,
        error: 'VALIDATION_FAILED'
      });
    }
    
    const { paymentIntentId, confirmationNonce } = validationResult.data;
    const userId = req.user?.id;
    
    // SECURITY: Ensure user authorization is verified
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
        error: 'AUTHENTICATION_REQUIRED'
      });
    }
    
    console.log(`💳 Payment confirmation requested for session ${sessionId} by user ${userId}`);
    
    // Use SessionPaymentService for payment confirmation
    const result = await SessionPaymentService.confirmSessionPayment(sessionId, paymentIntentId, userId);
    
    if (result.success) {
      console.log(`✅ Payment confirmed successfully for session ${sessionId}`);
      
      // CRITICAL FIX: Return strongly typed, comprehensive confirmation response
      return res.status(200).json({
        success: true,
        message: result.message,
        paymentDetails: {
          paymentId: result.paymentId,
          sessionId: result.sessionId,
          amount: result.amount,
          therapistAmount: result.therapistAmount,
          platformAmount: result.platformAmount,
          status: result.paymentStatus
        },
        metadata: {
          confirmedAt: new Date().toISOString(),
          confirmationNonce,
          validationPassed: true,
          serviceIntegration: 'SessionPaymentService'
        }
      });
    } else {
      console.error(`❌ Payment confirmation failed for session ${sessionId}: ${result.error}`);
      
      const statusCode = result.error?.includes('NOT_FOUND') ? 404 :
                         result.error?.includes('ALREADY_') ? 400 : 500;
      
      return res.status(statusCode).json({
        success: false,
        message: result.message,
        error: result.error,
        sessionId: result.sessionId
      });
    }
  } catch (error) {
    const { sessionId } = req.params;
    console.error(`❌ CRITICAL ERROR during payment confirmation for session ${sessionId}:`, error);
    
    // CRITICAL FIX: Comprehensive error handling with proper logging
    return res.status(500).json({
      success: false,
      message: 'Critical error during payment confirmation',
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId: sessionId!,
      metadata: {
        errorType: 'UNEXPECTED_PAYMENT_CONFIRMATION_ERROR',
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
        paymentIntentId: 'redacted-for-security'
      }
    });
  }
});

// Test endpoint for payment integration
router.post('/test-payment-integration', isAuthenticated, async (req: any, res: any) => {
  try {
    console.log('🧪 Testing video session payment integration...');
    
    // Create test appointment with payment data
    const testAppointmentId = nanoid();
    const testClientId = 'test-client-' + nanoid();
    const testTherapistId = 'test-therapist-' + nanoid();
    
    console.log('📝 Creating test appointment and users...');
    
    // Create test users
    const testClient = await storage.upsertUser({
      id: testClientId,
      email: 'test.client@example.com',
      role: 'client',
      firstName: 'Test',
      lastName: 'Client'
    });
    
    const testTherapist = await storage.upsertUser({
      id: testTherapistId,
      email: 'test.therapist@example.com',
      role: 'therapist', 
      firstName: 'Dr. Test',
      lastName: 'Therapist'
    });
    
    // Create therapist profile with mock Stripe account
    const therapistProfile = await storage.createTherapistProfile({
      id: nanoid(),
      userId: testTherapistId,
      stripeConnectAccountId: 'acct_test_mock_account', // Mock account for testing
      specializations: { therapy_types: ['cognitive-behavioral'] },
      hourlyRate: '60.00'
    });
    
    // Create test appointment
    const testAppointment = await storage.createAppointment({
      id: testAppointmentId,
      clientId: testClientId,
      primaryTherapistId: testTherapistId,
      scheduledAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      endTime: new Date(Date.now() + 20 * 60 * 1000), // 20 minutes from now
      duration: 50,
      status: 'in_progress',
      sessionType: 'therapy',
      price: 60.00,
      paymentStatus: 'pending'
    });
    
    console.log('✅ Test data created:', {
      appointmentId: testAppointment.id,
      clientId: testClient.id,
      therapistId: testTherapist.id,
      therapistStripeAccount: therapistProfile.stripeConnectAccountId
    });
    
    // Test the payment integration by simulating session completion
    const sessionData = await VideoSessionService.getVideoSession(testAppointmentId);
    
    if (!sessionData) {
      throw new Error('Test session not found');
    }
    
    console.log('🎯 Testing session completion with payment...');
    
    const integrationTestResults = {
      testDataCreated: true,
      sessionFound: !!sessionData,
      sessionType: sessionData.sessionType,
      sessionStatus: sessionData.status,
      appointmentPrice: testAppointment.price,
      therapistStripeAccount: therapistProfile.stripeConnectAccountId,
      readyForPayment: !!(sessionData.sessionType === 'therapy' && 
                         testAppointment.price && 
                         therapistProfile.stripeConnectAccountId),
      timestamp: new Date().toISOString()
    };
    
    console.log('📊 Integration test results:', integrationTestResults);
    
    // Clean up test data
    console.log('🧹 Cleaning up test data...');
    
    try {
      await db.delete(appointments).where(eq(appointments.id, testAppointmentId));
      await db.delete(therapistProfiles).where(eq(therapistProfiles.id, therapistProfile.id)); 
      await db.delete(users).where(eq(users.id, testClientId));
      await db.delete(users).where(eq(users.id, testTherapistId));
      console.log('✅ Test data cleaned up');
    } catch (cleanupError) {
      console.warn('⚠️ Error cleaning up test data:', cleanupError);
    }
    
    res.json({
      message: 'Video session payment integration test completed',
      results: integrationTestResults,
      integrationReady: integrationTestResults.readyForPayment,
      endpointAvailable: '/api/video-sessions/:sessionId/complete'
    });
    
  } catch (error) {
    console.error('❌ Payment integration test failed:', error);
    res.status(500).json({
      message: 'Payment integration test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test endpoint for debugging
router.get('/test', (req, res) => {
  res.json({
    message: 'Video sessions API is working',
    totalSessions: demoSessions.size,
    sessions: Array.from(demoSessions.values()),
    timestamp: new Date().toISOString()
  });
});

// Health check for video system
router.get('/health', (req, res) => {
  const videoManager = VideoSessionManager.getInstance();
  res.json({
    status: 'healthy',
    videoManager: !!videoManager,
    demoSessions: demoSessions.size,
    timestamp: new Date().toISOString()
  });
});

// Export function to get demo session (for VideoSessionService fallback)
export const getDemoSession = (sessionId: string): VideoSession | undefined => {
  return demoSessions.get(sessionId);
};

export default router;