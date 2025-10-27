import React, { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Video, VideoOff, Mic, MicOff, Phone } from "lucide-react";

interface VideoSessionsProps {
  user: { id: string; role: string };
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

export default function VideoSessionsFixed({ user }: VideoSessionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Video session state
  const [currentSession, setCurrentSession] = useState<VideoSession | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "connecting" | "connected" | "disconnected"
  >("idle");
  const [participants, setParticipants] = useState(0);
  const [hasMediaAccess, setHasMediaAccess] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);

  // WebRTC and media refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // WebRTC Configuration
  const pcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  // Fetch video sessions
  const {
    data: sessions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [`/api/video-sessions/${user.id}`],
    enabled: !!user.id,
  });

  // Initialize media stream with camera-first approach
  const initializeMediaStream = useCallback(async () => {
    try {
      console.log("🎥 Requesting camera and audio access...");
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      };

      console.log("🎥 Requesting media with constraints:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      localStreamRef.current = stream;
      setHasMediaAccess(true);
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);

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
    } catch (error) {
      console.error("❌ Error accessing media devices:", error);
      setHasMediaAccess(false);
      toast({
        title: "Camera Access Required",
        description: "Please allow camera and microphone access to join the video session",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    console.log("🔗 Creating peer connection...");
    const pc = new RTCPeerConnection(pcConfig);

    // Add local stream to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
      console.log("📡 Added local stream to peer connection");
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log("📡 Received remote stream");
      remoteStreamRef.current = event.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setParticipants(2);
        console.log("✅ Remote video connected!");
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        console.log("🧊 Sending ICE candidate");
        wsRef.current.send(
          JSON.stringify({
            type: "ice-candidate",
            candidate: event.candidate,
            sessionId: currentSession?.id,
          })
        );
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [currentSession?.id]);

  // Create offer
  const createOffer = useCallback(async () => {
    if (!peerConnectionRef.current) {
      createPeerConnection();
    }

    try {
      const offer = await peerConnectionRef.current!.createOffer();
      await peerConnectionRef.current!.setLocalDescription(offer);

      console.log("📞 Sending offer");
      if (wsRef.current) {
        wsRef.current.send(
          JSON.stringify({
            type: "offer",
            offer: offer,
            sessionId: currentSession?.id,
          })
        );
      }
    } catch (error) {
      console.error("❌ Error creating offer:", error);
    }
  }, [createPeerConnection, currentSession?.id]);

  // Handle offer
  const handleOffer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      console.log("📞 Received offer");
      if (!peerConnectionRef.current) {
        createPeerConnection();
      }

      try {
        await peerConnectionRef.current!.setRemoteDescription(offer);
        const answer = await peerConnectionRef.current!.createAnswer();
        await peerConnectionRef.current!.setLocalDescription(answer);

        console.log("📞 Sending answer");
        if (wsRef.current) {
          wsRef.current.send(
            JSON.stringify({
              type: "answer",
              answer: answer,
              sessionId: currentSession?.id,
            })
          );
        }
      } catch (error) {
        console.error("❌ Error handling offer:", error);
      }
    },
    [createPeerConnection, currentSession?.id]
  );

  // Handle answer
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    console.log("📞 Received answer");
    try {
      await peerConnectionRef.current!.setRemoteDescription(answer);
    } catch (error) {
      console.error("❌ Error handling answer:", error);
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    console.log("🧊 Received ICE candidate");
    try {
      await peerConnectionRef.current!.addIceCandidate(candidate);
    } catch (error) {
      console.error("❌ Error adding ICE candidate:", error);
    }
  }, []);

  // Initialize WebSocket connection
  const initializeWebSocket = useCallback(() => {
    if (!currentSession) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/video-sessions`;

    console.log("🔌 Connecting to WebSocket:", wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("🔌 WebSocket connected");
      setConnectionStatus("connected");

      // Join the session room
      ws.send(
        JSON.stringify({
          type: "join-session",
          sessionId: currentSession.id,
          userId: user.id,
          userRole: user.role,
          userName: user.role === "therapist" ? "Dr. Sarah Chen" : "Emma Johnson",
        })
      );
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log("📨 WebSocket message received:", message.type);

      switch (message.type) {
        case "participant-joined":
          console.log("👥 Participant joined");
          setParticipants((prev) => prev + 1);
          // Start WebRTC when both participants are connected
          if (user.role === "client") {
            setTimeout(() => createOffer(), 1000);
          }
          break;
        case "participant-left":
          setParticipants((prev) => Math.max(0, prev - 1));
          break;
        case "offer":
          await handleOffer(message.offer);
          break;
        case "answer":
          await handleAnswer(message.answer);
          break;
        case "ice-candidate":
          await handleIceCandidate(message.candidate);
          break;
      }
    };

    ws.onclose = () => {
      console.log("🔌 WebSocket disconnected");
      setConnectionStatus("disconnected");
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      setConnectionStatus("disconnected");
    };
  }, [currentSession, user, createOffer, handleOffer, handleAnswer, handleIceCandidate]);

  // Join session
  const handleJoinSession = async (session: VideoSession) => {
    setConnectionStatus("connecting");
    setCurrentSession(session);

    // Initialize media and WebSocket
    await initializeMediaStream();
    setTimeout(() => initializeWebSocket(), 1000);

    toast({
      title: "Joined Session",
      description: `Connected to ${session.sessionType} session`,
    });
  };

  // Leave session
  const handleLeaveSession = useCallback(() => {
    console.log("🚪 Leaving session...");

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    setCurrentSession(null);
    setConnectionStatus("idle");
    setParticipants(0);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    setIsScreenSharing(false);
    setHasMediaAccess(false);

    toast({
      title: "Session Ended",
      description: "You've left the video session",
    });
  }, [toast]);

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

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Session timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (currentSession) {
      timer = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [currentSession]);

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

  // Render active session
  if (currentSession) {
    return (
      <div className="space-y-6">
        {/* Session Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Video Session</h1>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{connectionStatus}</span>
            </div>
          </div>
        </div>

        {/* Video Interface */}
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <div className="grid grid-cols-2 gap-4 p-4 min-h-[500px]">
            {/* Local Video */}
            <div className="relative bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {!hasMediaAccess && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center text-white">
                    <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Camera access required</p>
                    <Button
                      onClick={initializeMediaStream}
                      className="mt-2 bg-blue-600 hover:bg-blue-700"
                    >
                      Enable Camera
                    </Button>
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                {user.role === "therapist" ? "Dr. Sarah Chen" : "Emma Johnson"} (You)
              </div>
              <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                Live Session • {formatDuration(sessionDuration)} • {participants} participants
              </div>
            </div>

            {/* Remote Video */}
            <div className="relative bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {participants < 2 && (
                <div className="absolute inset-0 flex items-center justify-center bg-purple-900">
                  <div className="text-center text-white">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-lg font-medium">
                      {user.role === "therapist" ? "Emma Johnson" : "Dr. Sarah Chen"}
                    </p>
                    <p className="text-sm opacity-75">Waiting to join...</p>
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                {user.role === "therapist" ? "Emma Johnson" : "Dr. Sarah Chen"}
              </div>
            </div>
          </div>

          {/* Video Controls */}
          <div className="flex items-center justify-center space-x-4 p-4 bg-gray-800">
            <Button
              variant={isAudioEnabled ? "default" : "destructive"}
              size="sm"
              onClick={toggleAudio}
              className="rounded-full w-12 h-12"
            >
              {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>

            <Button
              variant={isVideoEnabled ? "default" : "destructive"}
              size="sm"
              onClick={toggleVideo}
              className="rounded-full w-12 h-12"
            >
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>

            <Button variant="outline" size="sm" className="rounded-full w-12 h-12">
              <Monitor className="h-5 w-5" />
            </Button>

            <Button variant="outline" size="sm" className="rounded-full w-12 h-12">
              <Users className="h-5 w-5" />
            </Button>

            <Button variant="outline" size="sm" className="rounded-full w-12 h-12">
              <MessageSquare className="h-5 w-5" />
            </Button>

            <Button variant="outline" size="sm" className="rounded-full w-12 h-12">
              <Settings className="h-5 w-5" />
            </Button>

            <Button
              variant="destructive"
              onClick={handleLeaveSession}
              className="rounded-full px-6"
            >
              <PhoneOff className="h-5 w-5 mr-2" />
              End Meeting
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render session list
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"></div>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: [`/api/video-sessions/${user.id}`] })
          }
          variant="outline"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6">
        {sessions.map((session: VideoSession) => (
          <Card key={session.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold">
                      {session.sessionType === "therapy" ? "Therapy Session" : "Consultation"}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        session.status === "scheduled"
                          ? "bg-blue-100 text-blue-800"
                          : session.status === "in-progress"
                            ? "bg-green-100 text-green-800"
                            : session.status === "completed"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-red-100 text-red-800"
                      }`}
                    >
                      {session.status}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{new Date(session.scheduledAt).toLocaleString("en-GB")}</span>
                    <span>{session.duration} minutes</span>
                    <span>
                      {user.role === "therapist"
                        ? `Client: ${session.clientId}`
                        : `Therapist: ${session.therapistId}`}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleJoinSession(session)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Join Session
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {sessions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No video sessions scheduled</p>
          </div>
        )}
      </div>
    </div>
  );
}
