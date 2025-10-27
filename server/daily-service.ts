/**
 * Daily.co Video Service
 * Handles video room creation and management using Daily.co API
 */

interface DailyRoom {
  id: string;
  name: string;
  api_created: boolean;
  privacy: string;
  url: string;
  created_at: string;
  config: {
    nbf?: number;
    exp?: number;
    max_participants?: number;
    enable_chat?: boolean;
    enable_knocking?: boolean;
    enable_prejoin_ui?: boolean;
    enable_recording?: string;
    enable_screenshare?: boolean;
    start_video_off?: boolean;
    start_audio_off?: boolean;
    owner_only_broadcast?: boolean;
  };
}

interface DailyRoomRequest {
  name?: string;
  privacy?: "private" | "public";
  properties?: {
    nbf?: number;
    exp?: number;
    max_participants?: number;
    enable_chat?: boolean;
    enable_knocking?: boolean;
    enable_prejoin_ui?: boolean;
    enable_recording?: string;
    enable_screenshare?: boolean;
    start_video_off?: boolean;
    start_audio_off?: boolean;
    owner_only_broadcast?: boolean;
  };
}

export class DailyService {
  private apiKey: string;
  private baseUrl = "https://api.daily.co/v1";

  constructor() {
    this.apiKey = process.env.DAILY_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("DAILY_API_KEY environment variable is required");
    }
  }

  /**
   * Create a new Daily.co room for a therapy session
   */
  async createTherapyRoom(sessionData: {
    sessionId: string;
    clientName: string;
    therapistName: string;
    scheduledAt: Date;
    duration: number; // in minutes
  }): Promise<{ roomUrl: string; roomName: string }> {
    const roomName = `therapy-session-${sessionData.sessionId}`;

    // Calculate room expiry - session start + duration + 30 minutes buffer
    const sessionStart = Math.floor(sessionData.scheduledAt.getTime() / 1000);
    const sessionDuration = sessionData.duration * 60; // convert to seconds
    const bufferTime = 30 * 60; // 30 minutes buffer
    const roomExpiry = sessionStart + sessionDuration + bufferTime;

    const roomConfig: DailyRoomRequest = {
      name: roomName,
      privacy: "public",
      properties: {
        // Removed timing restrictions for testing - can be re-enabled later
        // nbf: sessionStart - 300, // Allow entry 5 minutes before session
        // exp: roomExpiry,
        max_participants: 2, // Client + Therapist only
        enable_chat: true,
        enable_knocking: false, // Direct entry for invited participants
        enable_prejoin_ui: true, // Allow camera/mic testing
        enable_recording: "local", // Allow local recording by participants
        enable_screenshare: false, // No screen sharing in therapy
        start_video_off: false, // Start with video on
        start_audio_off: false, // Start with audio on
        owner_only_broadcast: false, // Both can speak
      },
    };

    try {
      // First check if room already exists
      const existingRoom = await this.getRoomInfo(roomName);
      if (existingRoom) {
        // Check if existing room privacy matches what we want
        if (existingRoom.privacy === roomConfig.privacy) {
          console.log(`♻️ Using existing Daily.co room: ${existingRoom.url}`);
          return {
            roomUrl: existingRoom.url,
            roomName: existingRoom.name,
          };
        } else {
          // Delete existing room with wrong privacy setting
          console.log(
            `🗑️ Deleting existing room with wrong privacy (${existingRoom.privacy} vs ${roomConfig.privacy})`
          );
          await this.deleteRoom(roomName);
        }
      }

      console.log(`🎥 Creating Daily.co room for session ${sessionData.sessionId}`);

      const response = await fetch(`${this.baseUrl}/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(roomConfig),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Daily.co API error: ${response.status} ${errorText}`);
      }

      const room: DailyRoom = await response.json();

      console.log(`✅ Daily.co room created: ${room.url}`);

      return {
        roomUrl: room.url,
        roomName: room.name,
      };
    } catch (error) {
      console.error("❌ Failed to create Daily.co room:", error);
      throw new Error(
        `Failed to create video room: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get room information
   */
  async getRoomInfo(roomName: string): Promise<DailyRoom | null> {
    try {
      const response = await fetch(`${this.baseUrl}/rooms/${roomName}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Daily.co API error: ${response.status} ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Failed to get Daily.co room info for ${roomName}:`, error);
      return null;
    }
  }

  /**
   * Delete a room (cleanup after session ends)
   */
  async deleteRoom(roomName: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/rooms/${roomName}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (response.status === 404) {
        console.log(`🗑️ Daily.co room ${roomName} already deleted or doesn't exist`);
        return true;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Daily.co API error: ${response.status} ${errorText}`);
      }

      console.log(`🗑️ Daily.co room ${roomName} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete Daily.co room ${roomName}:`, error);
      return false;
    }
  }

  /**
   * Create a new Daily.co room for admin calls (introduction calls, consultations, etc.)
   */
  async createAdminCallRoom(callData: {
    callId: string;
    participantName: string;
    callType: "introduction" | "consultation" | "interview";
    scheduledAt: Date;
    duration: number; // in minutes
  }): Promise<{ roomUrl: string; roomName: string }> {
    const roomName = `admin-call-${callData.callType}-${callData.callId}`;

    // Calculate room expiry - call start + duration + 60 minutes buffer (longer for admin calls)
    const callStart = Math.floor(callData.scheduledAt.getTime() / 1000);
    const callDuration = callData.duration * 60; // convert to seconds
    const bufferTime = 60 * 60; // 60 minutes buffer for admin flexibility
    const roomExpiry = callStart + callDuration + bufferTime;

    const roomConfig: DailyRoomRequest = {
      name: roomName,
      privacy: "public",
      properties: {
        // Removed timing restrictions for testing - can be re-enabled later
        // nbf: callStart - 900, // Allow entry 15 minutes before call
        // exp: roomExpiry,
        max_participants: 5, // Admin + participant + potential observers
        enable_chat: true,
        enable_knocking: false, // Direct entry for invited participants
        enable_prejoin_ui: true, // Allow camera/mic testing
        enable_recording: "cloud", // Cloud recording for admin calls
        enable_screenshare: true, // Screen sharing for demos/presentations
        start_video_off: false, // Start with video on
        start_audio_off: false, // Start with audio on
        owner_only_broadcast: false, // Both can speak freely
      },
    };

    try {
      // First check if room already exists
      const existingRoom = await this.getRoomInfo(roomName);
      if (existingRoom) {
        // Check if existing room privacy matches what we want
        if (existingRoom.privacy === roomConfig.privacy) {
          console.log(`♻️ Using existing Daily.co admin call room: ${existingRoom.url}`);
          return {
            roomUrl: existingRoom.url,
            roomName: existingRoom.name,
          };
        } else {
          // Delete existing room with wrong privacy setting
          console.log(
            `🗑️ Deleting existing admin call room with wrong privacy (${existingRoom.privacy} vs ${roomConfig.privacy})`
          );
          await this.deleteRoom(roomName);
        }
      }

      console.log(`📞 Creating Daily.co room for ${callData.callType} call ${callData.callId}`);

      const response = await fetch(`${this.baseUrl}/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(roomConfig),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Daily.co API error: ${response.status} ${errorText}`);
      }

      const room: DailyRoom = await response.json();

      console.log(`✅ Daily.co admin call room created: ${room.url}`);

      return {
        roomUrl: room.url,
        roomName: room.name,
      };
    } catch (error) {
      console.error("❌ Failed to create Daily.co admin call room:", error);
      throw new Error(
        `Failed to create admin call room: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Create a meeting token for a specific participant (optional, for enhanced security)
   */
  async createMeetingToken(
    roomName: string,
    participantData: {
      userId: string;
      userName: string;
      isOwner?: boolean;
    }
  ): Promise<string | null> {
    try {
      const tokenPayload = {
        room_name: roomName,
        user_name: participantData.userName,
        user_id: participantData.userId,
        is_owner: participantData.isOwner || false,
        exp: Math.floor(Date.now() / 1000) + 4 * 60 * 60, // 4 hours expiry
      };

      const response = await fetch(`${this.baseUrl}/meeting-tokens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(tokenPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Daily.co API error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      return result.token;
    } catch (error) {
      console.error(`❌ Failed to create Daily.co meeting token:`, error);
      return null;
    }
  }
}

// Singleton instance
export const dailyService = new DailyService();
