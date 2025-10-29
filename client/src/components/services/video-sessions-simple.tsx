import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Video, VideoOff, Mic, MicOff, Users, Phone, RefreshCw, Wifi, WifiOff } from "lucide-react";
import ServiceNavigation from "@/components/ui/service-navigation";

interface VideoSessionsSimpleProps {
  user: { id: string; role: string; firstName?: string; lastName?: string; email?: string };
  onBackToDashboard?: () => void;
  sessionId?: string;
  isIntroductionCall?: boolean;
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
  clientName?: string;
  therapistName?: string;
}

export default function VideoSessionsService({
  user,
  onBackToDashboard,
  sessionId,
  isIntroductionCall,
}: VideoSessionsSimpleProps) {
  const [hasMediaAccess, setHasMediaAccess] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [currentSession, setCurrentSession] = useState<VideoSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string>("Not started");
  const [connectionStatus, setConnectionStatus] = useState<string>("Disconnected");
  const [hasRemoteStream, setHasRemoteStream] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);

  const { toast } = useToast();

  // Demo session data - SHARED session room where both client and therapist can connect
  const getDemoSession = (): VideoSession => {
    // Use a SHARED session ID so both client and therapist join the same room
    const baseSession = {
      id: "shared-demo-session", // Same session ID for both roles
      sessionType: "therapy" as const,
      scheduledAt: new Date().toISOString(),
      duration: 60,
      status: "scheduled" as const,
      clientId: "demo-client-1",
      therapistId: "demo-therapist-1",
    };

    if (user.role === "therapist") {
      return {
        ...baseSession,
        clientName: "Demo Client",
        therapistName: `${user.firstName} ${user.lastName}`.trim() || "Dr. Demo",
      };
    } else {
      return {
        ...baseSession,
        clientName: `${user.firstName} ${user.lastName}`.trim() || "Demo Client",
        therapistName: "Dr. Demo Therapist",
      };
    }
  };

  const demoSession = getDemoSession();

  // WebRTC configuration
  const rtcConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  // Initialize WebSocket connection
  const initializeWebSocket = useCallback(() => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Only initialize WebSocket when actively joining a session
    if (!hasMediaAccess) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/video-sessions`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnectionStatus("Connected");

        // Join the session using the correct message type
        const targetSessionId = isIntroductionCall && sessionId ? sessionId : demoSession.id;
        const joinMessage = {
          type: "join-session",
          sessionId: targetSessionId,
          userId: user.id,
          userRole: user.role,
          userName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.id,
        };
        ws.send(JSON.stringify(joinMessage));
      };

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case "session-joined":
            setConnectionStatus("Connected");
            break;

          case "participant-joined":
            if (message.participant.userId !== user.id) {
              // Set up the peer connection immediately
              initializePeerConnection();

              // Create offer if we're the therapist or if we're alphabetically first
              const shouldCreateOffer =
                user.role === "therapist" || user.id < message.participant.userId;

              if (shouldCreateOffer) {
                setTimeout(async () => {
                  await createOffer();
                }, 500);
              }
            }
            break;

          case "offer":
            if (message.userId !== user.id) {
              await handleOffer(message.offer);
            }
            break;

          case "answer":
            if (message.userId !== user.id) {
              await handleAnswer(message.answer);
            }
            break;

          case "ice-candidate":
            if (message.userId !== user.id) {
              await handleIceCandidate(message.candidate);
            }
            break;

          case "participant-left":
            if (message.userId !== user.id) {
              handleUserLeft();
            }
            break;

          case "session-ended":
            handleUserLeft();
            break;

          case "error":
            setConnectionStatus("Error");
            break;
        }
      };

      ws.onclose = () => {
        setConnectionStatus("Disconnected");
      };

      ws.onerror = () => {
        setConnectionStatus("Error");
      };

      websocketRef.current = ws;
    } catch {
      setConnectionStatus("Disconnected");
    }
  }, [user.id, user.role]);

  // Initialize peer connection
  const initializePeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const pc = new RTCPeerConnection(rtcConfiguration);

    pc.onicecandidate = (event) => {
      if (event.candidate && websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(
          JSON.stringify({
            type: "ice-candidate",
            sessionId: "shared-demo-session",
            candidate: event.candidate,
            userId: user.id,
          })
        );
      }
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      remoteStreamRef.current = remoteStream;
      setHasRemoteStream(true);

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    pc.onconnectionstatechange = () => {
      setConnectionStatus(pc.connectionState);
    };

    // Add local stream to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    peerConnectionRef.current = pc;
    return pc;
  }, [user.id]);

  // Create offer
  const createOffer = useCallback(async () => {
    if (!localStreamRef.current) {
      return;
    }

    const pc = initializePeerConnection();

    // Ensure local stream tracks are added before creating offer
    localStreamRef.current.getTracks().forEach((track) => {
      if (pc.getSenders().find((sender) => sender.track === track)) {
        return;
      }
      pc.addTrack(track, localStreamRef.current!);
    });

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(
          JSON.stringify({
            type: "offer",
            sessionId: demoSession.id,
            offer: offer,
            userId: user.id,
          })
        );
      }
    } catch (error) {
      console.error("❌ Error creating offer:", error);
    }
  }, [initializePeerConnection, user.id]);

  // Handle offer
  const handleOffer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      if (!localStreamRef.current) {
        return;
      }

      const pc = initializePeerConnection();

      // Ensure local stream tracks are added before handling offer
      localStreamRef.current.getTracks().forEach((track) => {
        if (pc.getSenders().find((sender) => sender.track === track)) {
          return;
        }
        pc.addTrack(track, localStreamRef.current!);
      });

      try {
        await pc.setRemoteDescription(offer);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          websocketRef.current.send(
            JSON.stringify({
              type: "answer",
              sessionId: demoSession.id,
              answer: answer,
              userId: user.id,
            })
          );
        }
      } catch (error) {
        console.error("❌ Error handling offer:", error);
      }
    },
    [initializePeerConnection, user.id]
  );

  // Handle answer
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    const pc = peerConnectionRef.current;
    if (pc) {
      try {
        await pc.setRemoteDescription(answer);
      } catch (error) {
        console.error("❌ Error handling answer:", error);
      }
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = peerConnectionRef.current;
    if (pc) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (error) {
        console.error("❌ Error adding ICE candidate:", error);
      }
    }
  }, []);

  // Handle user left
  const handleUserLeft = useCallback(() => {
    setHasRemoteStream(false);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    remoteStreamRef.current = null;
  }, []);

  // Apply stream to video element
  const applyStreamToVideo = useCallback((videoElement: HTMLVideoElement, stream: MediaStream) => {
    if (videoElement && stream) {
      videoElement.srcObject = stream;
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.muted = true;

      videoElement.onloadedmetadata = () => {
        setStreamStatus("Video stream active");
      };

      videoElement.play().catch((error) => {
        console.error("❌ Video play failed:", error);
      });
    }
  }, []);

  // Simple media access request
  const requestMediaAccess = useCallback(async () => {
    try {
      setIsConnecting(true);
      setStreamStatus("Requesting camera access...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });

      localStreamRef.current = stream;
      setHasMediaAccess(true);
      setStreamStatus("Camera access granted");

      // Apply stream to video element if it exists
      if (localVideoRef.current) {
        applyStreamToVideo(localVideoRef.current, stream);
      }

      // Add stream to peer connection if it exists
      if (peerConnectionRef.current) {
        stream.getTracks().forEach((track) => {
          peerConnectionRef.current!.addTrack(track, stream);
        });
      }

      toast({
        title: "Camera Access Granted",
        description: "Your camera is now active",
      });
    } catch (error) {
      console.error("❌ Camera access failed:", error);
      setStreamStatus("Camera access denied");
      toast({
        title: "Camera Access Denied",
        description: "Please grant camera permission to use video sessions",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  }, [toast, applyStreamToVideo]);

  // Join demo session
  const joinDemoSession = useCallback(async () => {
    if (!hasMediaAccess) {
      await requestMediaAccess();
    }

    // Initialize WebSocket connection
    initializeWebSocket();

    setCurrentSession(demoSession);
    setStreamStatus("In session");

    toast({
      title: "Session Joined",
      description: "You've joined the demo video session",
    });
  }, [hasMediaAccess, requestMediaAccess, toast, initializeWebSocket]);

  // End session
  const endSession = useCallback(() => {
    // Close WebSocket connection
    if (websocketRef.current) {
      websocketRef.current.send(
        JSON.stringify({
          type: "leave-session",
          sessionId: "shared-demo-session",
          userId: user.id,
        })
      );
      websocketRef.current.close();
      websocketRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Reset state
    setCurrentSession(null);
    setStreamStatus("Session ended");
    setConnectionStatus("Disconnected");
    setHasRemoteStream(false);

    // Clear remote video
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    toast({
      title: "Session Ended",
      description: "You've left the video session",
    });
  }, [toast, user.id]);

  // Force refresh video
  const refreshVideo = useCallback(() => {
    if (localStreamRef.current && localVideoRef.current) {
      applyStreamToVideo(localVideoRef.current, localStreamRef.current);
    }
  }, [applyStreamToVideo]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);

        toast({
          title: videoTrack.enabled ? "Video Enabled" : "Video Disabled",
          description: videoTrack.enabled ? "Your camera is now on" : "Your camera is now off",
        });
      }
    }
  }, [toast]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);

        toast({
          title: audioTrack.enabled ? "Audio Enabled" : "Audio Disabled",
          description: audioTrack.enabled
            ? "Your microphone is now on"
            : "Your microphone is now off",
        });
      }
    }
  }, [toast]);

  // Apply stream when video element reference changes
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      applyStreamToVideo(localVideoRef.current, localStreamRef.current);
    }
  }, [currentSession, applyStreamToVideo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <>
      {/* Navigation Bar */}
      {onBackToDashboard && (
        <ServiceNavigation
          serviceName="Video Sessions"
          onBackToDashboard={onBackToDashboard}
          user={{ ...user, email: user.email || "" }}
        />
      )}

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 mt-1">
              Demo session for {user.role === "therapist" ? "therapists" : "clients"} - join the
              shared demo room
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-600">
              {streamStatus}
            </Badge>
            <Badge
              variant="outline"
              className={`flex items-center gap-1 ${
                connectionStatus === "Connected" || connectionStatus === "connected"
                  ? "bg-green-50 text-green-600"
                  : connectionStatus === "Error"
                    ? "bg-red-50 text-red-600"
                    : "bg-gray-50 text-gray-600"
              }`}
            >
              {connectionStatus === "Connected" || connectionStatus === "connected" ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {connectionStatus}
            </Badge>
          </div>
        </div>

        {/* Camera Access Section */}
        {!hasMediaAccess && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Camera Access Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                To use video sessions, please grant camera and microphone access.
              </p>
              <Button onClick={requestMediaAccess} disabled={isConnecting} className="w-full">
                {isConnecting ? "Requesting Access..." : "Grant Camera Access"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Video Session Interface */}
        {hasMediaAccess && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                {currentSession ? "Video Session Active" : "Camera Ready"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!currentSession ? (
                <div className="space-y-4">
                  {/* Camera Preview */}
                  <div
                    className="relative bg-gray-900 rounded-lg overflow-hidden"
                    style={{ height: "300px" }}
                  >
                    <video
                      ref={localVideoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      playsInline
                      muted
                      style={{ backgroundColor: "black" }}
                    />
                    <div className="absolute top-4 left-4">
                      <Badge variant="secondary">Camera Preview</Badge>
                    </div>
                    <div className="absolute bottom-4 right-4">
                      <Button
                        onClick={refreshVideo}
                        size="sm"
                        variant="outline"
                        className="bg-hive-purple text-white border-hive-purple hover:bg-white hover:text-hive-purple"
                        title="Test your camera - Click to refresh if camera appears frozen"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Test Camera
                      </Button>
                    </div>
                  </div>

                  {/* Camera Testing Instructions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Video className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-800 mb-2">
                          Camera Testing Instructions
                        </h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• Check that your camera preview is showing clearly above</li>
                          <li>
                            • If the camera appears frozen or black, click the "Test Camera" button
                          </li>
                          <li>
                            • Make sure you have good lighting and your camera is positioned
                            properly
                          </li>
                          <li>
                            • Test your audio by speaking - you should see no echo in the preview
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Stream Status */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Status:</span>
                      <Badge variant={hasMediaAccess ? "default" : "secondary"}>
                        {hasMediaAccess ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Video:</span>
                      <span>{localStreamRef.current?.getVideoTracks().length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Audio:</span>
                      <span>{localStreamRef.current?.getAudioTracks().length || 0}</span>
                    </div>
                  </div>

                  {/* Join Session */}
                  <div className="text-center pt-4">
                    <div className="mb-3">
                      <Badge variant="outline" className="mb-2">
                        {user.role === "therapist"
                          ? "Therapist Video Session"
                          : "Client Video Session"}
                      </Badge>
                      <p className="text-sm text-gray-600">
                        {user.role === "therapist"
                          ? "Join as therapist to connect with your clients"
                          : "Join as client to connect with your therapist"}
                      </p>
                    </div>
                    <Button onClick={joinDemoSession} className="w-full">
                      Join {user.role === "therapist" ? "Therapist" : "Client"} Video Session
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {currentSession.clientName} & {currentSession.therapistName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Duration: {currentSession.duration} minutes
                      </p>
                    </div>
                    <Button onClick={endSession} variant="destructive" size="sm">
                      <Phone className="h-4 w-4 mr-2" />
                      End Session
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Remote Video */}
                    <div
                      className="relative bg-gray-900 rounded-lg overflow-hidden"
                      style={{ height: "300px" }}
                    >
                      <video
                        ref={remoteVideoRef}
                        className="w-full h-full object-cover"
                        autoPlay
                        playsInline
                        style={{ backgroundColor: "black" }}
                      />
                      <div className="absolute top-4 left-4">
                        <Badge variant="secondary">Remote Participant</Badge>
                      </div>
                      {!hasRemoteStream && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center text-white">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">
                              {connectionStatus === "Connected" || connectionStatus === "connected"
                                ? "Waiting for participant..."
                                : "Connecting..."}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Local Video */}
                    <div
                      className="relative bg-gray-900 rounded-lg overflow-hidden"
                      style={{ height: "300px" }}
                    >
                      <video
                        ref={localVideoRef}
                        className="w-full h-full object-cover"
                        autoPlay
                        playsInline
                        muted
                        style={{
                          backgroundColor: "black",
                          opacity: isVideoEnabled ? 1 : 0.3,
                        }}
                      />
                      {!isVideoEnabled && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center text-white">
                            <VideoOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Camera Off</p>
                          </div>
                        </div>
                      )}
                      <div className="absolute top-4 left-4">
                        <Badge variant="secondary">You</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Session Controls */}
                  <div className="flex justify-center space-x-4 pt-4">
                    <Button
                      onClick={toggleVideo}
                      variant={isVideoEnabled ? "default" : "secondary"}
                      size="sm"
                      title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
                    >
                      {isVideoEnabled ? (
                        <Video className="h-4 w-4" />
                      ) : (
                        <VideoOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      onClick={toggleAudio}
                      variant={isAudioEnabled ? "default" : "secondary"}
                      size="sm"
                      title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
                    >
                      {isAudioEnabled ? (
                        <Mic className="h-4 w-4" />
                      ) : (
                        <MicOff className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
