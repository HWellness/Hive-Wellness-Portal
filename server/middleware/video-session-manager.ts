import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { nanoid } from "nanoid";

export interface VideoSessionParticipant {
  id: string;
  userId: string;
  role: "client" | "therapist";
  name: string;
  ws: WebSocket;
  isConnected: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  joinedAt: number;
}

export interface VideoSessionRoom {
  id: string;
  sessionId: string;
  participants: Map<string, VideoSessionParticipant>;
  status: "waiting" | "active" | "ended";
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  metadata: {
    therapistId: string;
    clientId: string;
    scheduledDuration: number;
    sessionType: "therapy" | "consultation" | "check-in";
  };
}

export class VideoSessionManager {
  private static instance: VideoSessionManager;
  private wss: WebSocketServer | null = null;
  private rooms = new Map<string, VideoSessionRoom>();
  private userConnections = new Map<string, WebSocket>();

  static getInstance(): VideoSessionManager {
    if (!VideoSessionManager.instance) {
      VideoSessionManager.instance = new VideoSessionManager();
    }
    return VideoSessionManager.instance;
  }

  initialize(server: Server) {
    this.wss = new WebSocketServer({
      server,
      path: "/ws/video-sessions",
    });

    this.wss.on("connection", (ws, req) => {
      console.log("Video session WebSocket connection established");

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error("Invalid WebSocket message:", error);
          ws.send(
            JSON.stringify({
              type: "error",
              error: "Invalid message format",
            })
          );
        }
      });

      ws.on("close", () => {
        this.handleDisconnection(ws);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    });

    console.log("Video Session WebSocket server initialized on /ws/video-sessions");
  }

  private handleMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case "join-session":
        this.handleJoinSession(ws, message);
        break;
      case "leave-session":
        this.handleLeaveSession(ws, message);
        break;
      case "toggle-audio":
        this.handleToggleAudio(ws, message);
        break;
      case "toggle-video":
        this.handleToggleVideo(ws, message);
        break;
      case "send-offer":
      case "send-answer":
      case "send-ice-candidate":
      case "offer":
      case "answer":
      case "ice-candidate":
        this.handleWebRTCSignaling(ws, message);
        break;
      case "session-notification":
        this.handleSessionNotification(ws, message);
        break;
      default:
        console.log("Unknown message type:", message.type);
    }
  }

  private handleJoinSession(ws: WebSocket, message: any) {
    const { sessionId, userId, userRole, userName } = message;

    if (!sessionId || !userId || !userRole || !userName) {
      ws.send(
        JSON.stringify({
          type: "error",
          error: "Missing required fields",
        })
      );
      return;
    }

    let room = this.rooms.get(sessionId);
    if (!room) {
      // Create new room for the session
      room = {
        id: nanoid(),
        sessionId,
        participants: new Map(),
        status: "waiting",
        createdAt: Date.now(),
        metadata: {
          therapistId: userRole === "therapist" ? userId : "",
          clientId: userRole === "client" ? userId : "",
          scheduledDuration: 50, // default 50 minutes
          sessionType: "therapy",
        },
      };
      this.rooms.set(sessionId, room);
    }

    // Update metadata if this is the first participant of each role
    if (userRole === "therapist" && !room.metadata.therapistId) {
      room.metadata.therapistId = userId;
    } else if (userRole === "client" && !room.metadata.clientId) {
      room.metadata.clientId = userId;
    }

    // Add participant to room
    const participant: VideoSessionParticipant = {
      id: nanoid(),
      userId,
      role: userRole,
      name: userName,
      ws,
      isConnected: true,
      audioEnabled: true,
      videoEnabled: true,
      joinedAt: Date.now(),
    };

    room.participants.set(participant.id, participant);
    this.userConnections.set(userId, ws);

    console.log(`🎯 Participant ${userName} (${userRole}) joined session ${sessionId}`);
    console.log(`👥 Room now has ${room.participants.size} participants`);

    // Log all participants in the room
    console.log("📋 Current participants in room:");
    room.participants.forEach((p, id) => {
      console.log(`  - ${p.name} (${p.role}) - ID: ${p.userId}`);
    });

    // If both participants are present, start the session
    if (room.participants.size === 2 && room.status === "waiting") {
      room.status = "active";
      room.startedAt = Date.now();
      console.log(`Session ${sessionId} is now active with 2 participants`);
    }

    // Notify all participants about the new participant
    console.log(`📢 Broadcasting participant-joined to ${room.participants.size} participants`);
    this.broadcastToRoom(sessionId, {
      type: "participant-joined",
      participant: {
        id: participant.id,
        userId: participant.userId,
        role: participant.role,
        name: participant.name,
        audioEnabled: participant.audioEnabled,
        videoEnabled: participant.videoEnabled,
      },
      roomStatus: room.status,
      participantCount: room.participants.size,
    });

    // Send current room state to the new participant
    ws.send(
      JSON.stringify({
        type: "session-joined",
        roomId: room.id,
        sessionId,
        status: room.status,
        participants: Array.from(room.participants.values()).map((p) => ({
          id: p.id,
          userId: p.userId,
          role: p.role,
          name: p.name,
          audioEnabled: p.audioEnabled,
          videoEnabled: p.videoEnabled,
        })),
      })
    );

    console.log(`User ${userName} (${userRole}) joined session ${sessionId}`);
  }

  private handleLeaveSession(ws: WebSocket, message: any) {
    const { sessionId, userId } = message;
    const room = this.rooms.get(sessionId);

    if (!room) return;

    // Find and remove participant
    let participantToRemove = null;
    for (const [id, participant] of Array.from(room.participants.entries())) {
      if (participant.userId === userId) {
        participantToRemove = { id, participant };
        break;
      }
    }

    if (participantToRemove) {
      room.participants.delete(participantToRemove.id);
      this.userConnections.delete(userId);

      // Notify remaining participants
      this.broadcastToRoom(sessionId, {
        type: "participant-left",
        participantId: participantToRemove.id,
        userId,
        participantCount: room.participants.size,
      });

      // If room is empty or only one person left, end the session
      if (room.participants.size === 0) {
        room.status = "ended";
        room.endedAt = Date.now();
        this.rooms.delete(sessionId);
      } else if (room.participants.size === 1 && room.status === "active") {
        // Notify the remaining participant that the other person left
        this.broadcastToRoom(sessionId, {
          type: "session-ended",
          reason: "participant-left",
        });
      }

      console.log(`User ${userId} left session ${sessionId}`);
    }
  }

  private handleToggleAudio(ws: WebSocket, message: any) {
    const { sessionId, userId, audioEnabled } = message;
    this.updateParticipantMedia(sessionId, userId, { audioEnabled });
  }

  private handleToggleVideo(ws: WebSocket, message: any) {
    const { sessionId, userId, videoEnabled } = message;
    this.updateParticipantMedia(sessionId, userId, { videoEnabled });
  }

  private updateParticipantMedia(
    sessionId: string,
    userId: string,
    updates: Partial<Pick<VideoSessionParticipant, "audioEnabled" | "videoEnabled">>
  ) {
    const room = this.rooms.get(sessionId);
    if (!room) return;

    for (const participant of Array.from(room.participants.values())) {
      if (participant.userId === userId) {
        Object.assign(participant, updates);

        // Broadcast media state change to other participants
        this.broadcastToRoom(
          sessionId,
          {
            type: "participant-media-changed",
            participantId: participant.id,
            userId,
            audioEnabled: participant.audioEnabled,
            videoEnabled: participant.videoEnabled,
          },
          participant.ws
        );
        break;
      }
    }
  }

  private handleWebRTCSignaling(ws: WebSocket, message: any) {
    const { sessionId, targetUserId, ...signalData } = message;
    console.log(`=== WEBRTC SIGNALING ===`);
    console.log(`Type: ${message.type}`);
    console.log(`Session: ${sessionId}`);

    const room = this.rooms.get(sessionId);

    if (!room) {
      console.log(`❌ No room found for session ${sessionId}`);
      return;
    }

    console.log(`Room has ${room.participants.size} participants`);

    // If no targetUserId is specified, broadcast to all other participants in the room
    if (!targetUserId) {
      console.log(`📢 Broadcasting ${message.type} to all other participants`);
      let broadcastCount = 0;
      for (const participant of Array.from(room.participants.values())) {
        if (participant.ws !== ws && participant.ws.readyState === WebSocket.OPEN) {
          participant.ws.send(JSON.stringify(message));
          console.log(`✅ Sent ${message.type} to ${participant.name} (${participant.userId})`);
          broadcastCount++;
        }
      }
      console.log(`📡 Broadcasted to ${broadcastCount} participants`);
      return;
    }

    // Forward WebRTC signaling to the target participant
    let targetFound = false;
    for (const participant of Array.from(room.participants.values())) {
      if (participant.userId === targetUserId && participant.ws !== ws) {
        console.log(`✅ Forwarding ${message.type} to ${participant.name} (${participant.userId})`);
        participant.ws.send(JSON.stringify(signalData));
        targetFound = true;
        break;
      }
    }

    if (!targetFound) {
      console.log(`❌ Target participant ${targetUserId} not found in session ${sessionId}`);
      console.log(
        `Available participants:`,
        Array.from(room.participants.values()).map((p) => p.userId)
      );
    }
  }

  private handleSessionNotification(ws: WebSocket, message: any) {
    const { type: notificationType, sessionId, targetUserId, ...notificationData } = message;

    // Handle different types of session notifications
    switch (notificationType) {
      case "session-invitation":
        this.sendSessionInvitation(sessionId, targetUserId, notificationData);
        break;
      case "session-reminder":
        this.sendSessionReminder(sessionId, targetUserId, notificationData);
        break;
      case "session-started":
        this.sendSessionStartedNotification(sessionId, targetUserId, notificationData);
        break;
    }
  }

  private handleDisconnection(ws: WebSocket) {
    // Find and remove the disconnected user from all rooms
    for (const [userId, connection] of Array.from(this.userConnections.entries())) {
      if (connection === ws) {
        this.userConnections.delete(userId);

        // Remove from all rooms
        for (const [sessionId, room] of Array.from(this.rooms.entries())) {
          for (const [participantId, participant] of Array.from(room.participants.entries())) {
            if (participant.userId === userId) {
              room.participants.delete(participantId);

              // Notify other participants
              this.broadcastToRoom(sessionId, {
                type: "participant-disconnected",
                participantId,
                userId,
              });
              break;
            }
          }
        }
        break;
      }
    }
  }

  private broadcastToRoom(sessionId: string, message: any, excludeWs?: WebSocket) {
    const room = this.rooms.get(sessionId);
    if (!room) return;

    for (const participant of Array.from(room.participants.values())) {
      if (participant.ws !== excludeWs && participant.ws.readyState === WebSocket.OPEN) {
        participant.ws.send(JSON.stringify(message));
      }
    }
  }

  // Notification methods
  sendSessionInvitation(sessionId: string, targetUserId: string, data: any) {
    const ws = this.userConnections.get(targetUserId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "session-invitation",
          sessionId,
          ...data,
        })
      );
    }
  }

  sendSessionReminder(sessionId: string, targetUserId: string, data: any) {
    const ws = this.userConnections.get(targetUserId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "session-reminder",
          sessionId,
          ...data,
        })
      );
    }
  }

  sendSessionStartedNotification(sessionId: string, targetUserId: string, data: any) {
    const ws = this.userConnections.get(targetUserId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "session-started",
          sessionId,
          ...data,
        })
      );
    }
  }

  // Public methods for external use
  createSession(sessionData: {
    therapistId: string;
    clientId: string;
    scheduledDuration: number;
    sessionType: "therapy" | "consultation" | "check-in";
  }) {
    const sessionId = nanoid();
    const room: VideoSessionRoom = {
      id: nanoid(),
      sessionId,
      participants: new Map(),
      status: "waiting",
      createdAt: Date.now(),
      metadata: sessionData,
    };

    this.rooms.set(sessionId, room);
    return sessionId;
  }

  getSessionStatus(sessionId: string) {
    const room = this.rooms.get(sessionId);
    if (!room) return null;

    return {
      id: room.id,
      sessionId: room.sessionId,
      status: room.status,
      participantCount: room.participants.size,
      participants: Array.from(room.participants.values()).map((p) => ({
        id: p.id,
        userId: p.userId,
        role: p.role,
        name: p.name,
        isConnected: p.isConnected,
        audioEnabled: p.audioEnabled,
        videoEnabled: p.videoEnabled,
      })),
      createdAt: room.createdAt,
      startedAt: room.startedAt,
      endedAt: room.endedAt,
      metadata: room.metadata,
    };
  }

  endSession(sessionId: string, reason?: string) {
    const room = this.rooms.get(sessionId);
    if (!room) return false;

    room.status = "ended";
    room.endedAt = Date.now();

    // Notify all participants
    this.broadcastToRoom(sessionId, {
      type: "session-ended",
      reason: reason || "session-completed",
    });

    // Clean up room
    this.rooms.delete(sessionId);
    return true;
  }

  getAllActiveSessions() {
    const activeSessions = [];
    for (const [sessionId, room] of Array.from(this.rooms.entries())) {
      if (room.status === "active" || room.status === "waiting") {
        activeSessions.push(this.getSessionStatus(sessionId));
      }
    }
    return activeSessions;
  }
}
