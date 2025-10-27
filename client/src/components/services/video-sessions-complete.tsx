import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import hiveWellnessLogo from "@assets/Hive Logo_1752073128164.png";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Monitor,
  MonitorOff,
  Users,
  Clock,
  Calendar,
  User,
  RefreshCw,
} from "lucide-react";
import type { User as UserType } from "@shared/schema";

interface VideoSessionsProps {
  user: UserType;
}

interface VideoSession {
  id: string;
  sessionType: "therapy" | "consultation";
  clientId: string;
  therapistId: string;
  scheduledAt: string;
  duration: number;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  meetingLink?: string;
  notes?: string;
}

interface SessionParticipant {
  id: string;
  userId: string;
  role: "client" | "therapist";
  name: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

export default function VideoSessionsComplete({ user }: VideoSessionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Video session state
  const [isInSession, setIsInSession] = useState(false);
  const [currentSession, setCurrentSession] = useState<VideoSession | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenShareStreamRef = useRef<MediaStream | null>(null);

  // Fetch video sessions
  const {
    data: sessions,
    isLoading,
    error,
  } = useQuery({
    queryKey: [`/api/video-sessions/${user.id}`],
    enabled: !!user.id,
  });

  // Session timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isInSession && currentSession) {
      interval = setInterval(() => {
        setSessionTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isInSession, currentSession]);

  // Initialize media devices with camera-first approach
  const initializeMedia = useCallback(async () => {
    try {
      console.log("🎥 Requesting camera and audio access...");
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      console.log("🎥 Requesting media with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;

        try {
          await localVideoRef.current.play();
          console.log("✅ Local video stream started successfully");
        } catch (playError) {
          console.log("⚠️ Video autoplay blocked, user interaction required");
        }
      }

      console.log("✅ Camera and audio access granted successfully");
      toast({
        title: "Camera Access Granted",
        description: "Video and audio are ready for your session.",
      });
    } catch (error) {
      console.error("❌ Error accessing media devices:", error);
      toast({
        title: "Media Access Required",
        description: "Please allow camera and microphone access to use video sessions.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      console.log("🖥️ Starting screen share...");

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      });

      screenShareStreamRef.current = screenStream;

      if (screenShareRef.current) {
        console.log("🎥 Setting screen share video element");
        screenShareRef.current.srcObject = screenStream;

        screenShareRef.current.onloadedmetadata = () => {
          console.log("📺 Screen share video metadata loaded");
          if (screenShareRef.current) {
            screenShareRef.current
              .play()
              .catch((e) => console.log("Screen share auto-play prevented:", e));
          }
        };
      }

      // Ensure camera stream stays active in PiP during screen sharing
      if (localVideoRef.current && localStreamRef.current) {
        console.log("📺 Maintaining camera stream during screen share");
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current
          .play()
          .catch((e) => console.log("Camera PiP auto-play prevented:", e));
      }

      setIsScreenSharing(true);

      // Handle screen share end - multiple detection methods
      const screenTrack = screenStream.getVideoTracks()[0];

      // Method 1: Track ended event
      screenTrack.onended = () => {
        console.log("📺 Screen share ended by user (track ended)");
        stopScreenShare();
      };

      // Method 2: Monitor screen track state
      const checkScreenShareActive = () => {
        if (screenShareStreamRef.current && screenTrack.readyState === "ended") {
          console.log("📺 Screen share ended by user (track state check)");
          stopScreenShare();
        } else if (isScreenSharing) {
          setTimeout(checkScreenShareActive, 1000); // Check every second
        }
      };

      // Start monitoring
      setTimeout(checkScreenShareActive, 1000);

      // Force refresh camera stream to ensure it's visible in PiP
      setTimeout(() => {
        if (localVideoRef.current && localStreamRef.current) {
          console.log("🔄 Refreshing camera stream for PiP display");
          localVideoRef.current.srcObject = null;
          setTimeout(() => {
            if (localVideoRef.current && localStreamRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
              localVideoRef.current
                .play()
                .catch((e) => console.log("Camera refresh auto-play prevented:", e));
            }
          }, 100);
        }
      }, 500);

      console.log("✅ Screen sharing started successfully");
    } catch (error) {
      console.error("❌ Error starting screen share:", error);

      let errorMessage = "Could not start screen sharing";
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          errorMessage =
            "Screen sharing permission denied. Please allow screen sharing in your browser settings.";
        } else if (error.name === "NotSupportedError") {
          errorMessage = "Screen sharing is not supported in this browser.";
        } else if (error.name === "AbortError") {
          errorMessage = "Screen sharing was cancelled.";
        }
      }

      toast({
        title: "Screen Share Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Manual camera refresh function
  const refreshCamera = useCallback(() => {
    console.log("🔄 Manual camera refresh triggered");

    if (localVideoRef.current && localStreamRef.current) {
      // Clear and reset the video element
      localVideoRef.current.srcObject = null;

      setTimeout(() => {
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
          localVideoRef.current.load();
          localVideoRef.current
            .play()
            .catch((e) => console.log("Manual camera refresh auto-play prevented:", e));

          toast({
            title: "Camera Refreshed",
            description: "Camera feed has been restored",
          });

          console.log("✅ Manual camera refresh completed");
        }
      }, 100);
    } else {
      toast({
        title: "Camera Refresh Failed",
        description: "No camera stream available to refresh",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    console.log("🖥️ Stopping screen share...");

    if (screenShareStreamRef.current) {
      screenShareStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      screenShareStreamRef.current = null;
    }

    if (screenShareRef.current) {
      screenShareRef.current.srcObject = null;
    }

    setIsScreenSharing(false);

    // Restore camera to main video area when screen sharing stops
    console.log("📹 Attempting to restore camera to main video area...");
    console.log("localVideoRef.current:", !!localVideoRef.current);
    console.log("localStreamRef.current:", !!localStreamRef.current);

    // Use the refreshCamera function for automatic restoration
    setTimeout(() => {
      console.log("📹 Triggering automatic camera refresh after screen share ends");
      refreshCamera();
    }, 300);

    console.log("✅ Screen sharing stopped and camera restored");
  }, [refreshCamera]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  // Join session mutation
  const joinSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest("POST", `/api/video-sessions/${sessionId}/join`);
      return response.json();
    },
    onSuccess: async (data) => {
      console.log("=== JOIN SESSION SUCCESS ===");
      console.log("Response data:", data);

      setIsInSession(true);
      setCurrentSession(data.session || { id: data.sessionId });
      setConnectionStatus("connected");

      // Initialize media after successful join
      await initializeMedia();

      toast({
        title: "Session Joined",
        description: "You've successfully joined the video session",
      });
    },
    onError: (error) => {
      console.error("❌ Failed to join session:", error);
      toast({
        title: "Failed to Join Session",
        description: "Could not join the video session",
        variant: "destructive",
      });
    },
  });

  // Leave session
  const leaveSession = useCallback(() => {
    console.log("🚪 Leaving session...");

    // Stop all media streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }

    if (screenShareStreamRef.current) {
      screenShareStreamRef.current.getTracks().forEach((track) => track.stop());
      screenShareStreamRef.current = null;
    }

    // Reset video elements
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (screenShareRef.current) screenShareRef.current.srcObject = null;

    // Reset state
    setIsInSession(false);
    setCurrentSession(null);
    setIsScreenSharing(false);
    setSessionTimer(0);
    setParticipants([]);
    setConnectionStatus("disconnected");

    toast({
      title: "Session Ended",
      description: "You've left the video session",
    });
  }, [toast]);

  // Format session time
  const formatSessionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get session status color
  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in-progress":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format session time display
  const formatSessionTimeDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-hive-purple rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Error loading video sessions</p>
        <Button
          variant="outline"
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: [`/api/video-sessions/${user.id}`] })
          }
          className="mt-4"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  // If in session, show video interface
  if (isInSession && currentSession) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Live Session</span>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              {connectionStatus}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">{formatSessionTime(sessionTimer)}</div>
        </div>

        <Card className="bg-black border-gray-800">
          <CardContent className="p-0">
            <div
              className="relative bg-gray-900 rounded-lg overflow-hidden"
              style={{ aspectRatio: "16/9", minHeight: "400px" }}
            >
              {isScreenSharing ? (
                /* Screen Sharing Layout */
                <div className="relative w-full h-full">
                  <video
                    ref={screenShareRef}
                    autoPlay
                    playsInline
                    muted={false}
                    className="w-full h-full object-contain bg-gray-900"
                    style={{
                      backgroundColor: "#1f2937",
                      minHeight: "400px",
                      display: "block",
                    }}
                  />

                  {/* Picture-in-Picture for local camera */}
                  <div className="absolute bottom-4 right-4 w-56 h-40 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-lg">
                    <div className="absolute bottom-2 left-2 z-10">
                      <span className="text-white text-sm font-medium bg-black bg-opacity-75 px-2 py-1 rounded">
                        You
                      </span>
                    </div>
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{
                        display: "block",
                        minHeight: "160px",
                      }}
                      onLoadedMetadata={() => {
                        console.log("📺 PiP camera metadata loaded during screen share");
                      }}
                    />
                  </div>
                </div>
              ) : (
                /* Normal Video Layout */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 h-full">
                  <div className="relative bg-gray-800 rounded-lg overflow-hidden">
                    <div className="absolute bottom-4 left-4 z-10">
                      <span className="text-white text-sm font-medium bg-black bg-opacity-50 px-2 py-1 rounded">
                        You
                      </span>
                    </div>
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{
                        minHeight: "300px",
                        display: "block",
                      }}
                    />
                  </div>

                  <div className="relative bg-gray-800 rounded-lg overflow-hidden">
                    <div className="absolute bottom-4 left-4 z-10">
                      <span className="text-white text-sm font-medium bg-black bg-opacity-50 px-2 py-1 rounded">
                        Other Participant
                      </span>
                    </div>
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <div className="text-center">
                        <User className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p>Waiting for other participant...</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Video Controls */}
            <div className="flex items-center justify-center gap-4 p-6 bg-gray-900">
              <Button
                variant={isAudioEnabled ? "default" : "destructive"}
                size="lg"
                onClick={toggleAudio}
                className="rounded-full w-12 h-12"
              >
                {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>

              <Button
                variant={isVideoEnabled ? "default" : "destructive"}
                size="lg"
                onClick={toggleVideo}
                className="rounded-full w-12 h-12"
              >
                {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>

              <Button
                variant={isScreenSharing ? "secondary" : "outline"}
                size="lg"
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                className="rounded-full w-12 h-12"
              >
                {isScreenSharing ? (
                  <MonitorOff className="h-5 w-5" />
                ) : (
                  <Monitor className="h-5 w-5" />
                )}
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={refreshCamera}
                className="rounded-full w-12 h-12 bg-hive-purple text-white border-hive-purple hover:bg-white hover:text-hive-purple"
                title="Test Camera - Click if camera appears frozen or has issues"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

              <Button
                variant="destructive"
                size="lg"
                onClick={leaveSession}
                className="rounded-full w-12 h-12"
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>

            {/* Camera Testing Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <div className="flex items-start space-x-3">
                <Video className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Video Session Help</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>
                      • If your camera feed appears frozen or black, click the refresh button (🔄)
                      in the controls
                    </li>
                    <li>
                      • Use the camera/microphone buttons to test your video and audio before the
                      session
                    </li>
                    <li>
                      • For screen sharing, click the monitor button and select your screen or
                      application
                    </li>
                    <li>• All participants can see your camera status and connection quality</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show available sessions
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={hiveWellnessLogo} alt="Hive Wellness" className="h-8 w-auto" />
        </div>
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          <span className="text-sm text-muted-foreground">Secure video therapy sessions</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Available Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!sessions || (sessions as VideoSession[]).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No video sessions available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(sessions as VideoSession[]).map((session: VideoSession) => (
                <Card key={session.id} className="border-l-4 border-l-hive-purple">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getSessionStatusColor(session.status)}>
                            {session.status}
                          </Badge>
                          <span className="text-sm font-medium capitalize">
                            {session.sessionType.replace("-", " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatSessionTimeDisplay(session.scheduledAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {session.duration} minutes
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {session.status === "scheduled" && (
                          <Button
                            onClick={() => joinSessionMutation.mutate(session.id)}
                            disabled={joinSessionMutation.isPending}
                            className="flex items-center gap-2"
                          >
                            <Video className="h-4 w-4" />
                            {joinSessionMutation.isPending ? "Joining..." : "Join Session"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
