import React, { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Video, VideoOff, Mic, MicOff, Users, Clock, Play, PhoneOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface VideoSession {
  id: string;
  sessionType: string;
  clientId: string;
  therapistId: string;
  scheduledAt: string;
  duration: number;
  status: string;
  clientName: string;
  therapistName: string;
}

export default function VideoSessionsSimpleFix() {
  const { user } = useAuth();
  const [hasMediaAccess, setHasMediaAccess] = useState(false);
  const [isRequestingMedia, setIsRequestingMedia] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");
  const [currentSession, setCurrentSession] = useState<VideoSession | null>(null);
  const [participants, setParticipants] = useState(1);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Format duration helper
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Request media access
  const requestMediaAccess = useCallback(async () => {
    if (hasMediaAccess) return;

    setIsRequestingMedia(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: { echoCancellation: true, noiseSuppression: true },
      });

      localStreamRef.current = stream;
      setHasMediaAccess(true);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        await localVideoRef.current.play();
      }

      toast({
        title: "Camera Access Granted",
        description: "Your camera and microphone are now active.",
      });
    } catch (error) {
      console.error("Media access error:", error);
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera and microphone access to use video sessions.",
        variant: "destructive",
      });
    } finally {
      setIsRequestingMedia(false);
    }
  }, [hasMediaAccess]);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    // Add local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current
          .play()
          .then(() => {
            setParticipants(2);
            toast({
              title: "Peer Connected",
              description: "You can now see each other's video feed!",
            });
          })
          .catch(console.error);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "ice-candidate",
            candidate: event.candidate,
            sessionId: currentSession?.id || "demo-session",
          })
        );
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setConnectionStatus("connected");
      }
    };

    return pc;
  }, [currentSession?.id]);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      if (currentSession) {
        wsRef.current?.send(
          JSON.stringify({
            type: "join-session",
            sessionId: currentSession.id,
            userId: user.id,
            userName: user.firstName || "User",
            role: user.role,
          })
        );
      }
    };

    wsRef.current.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case "participant-joined":
            setParticipants(message.participantCount || 2);

            // Start connection if we have 2 participants
            if (message.participantCount === 2 && hasMediaAccess) {
              // Only user with smaller ID creates offer
              if (user.id < (message.userId || "zzz")) {
                setTimeout(async () => {
                  peerConnectionRef.current = createPeerConnection();
                  const offer = await peerConnectionRef.current.createOffer();
                  await peerConnectionRef.current.setLocalDescription(offer);

                  wsRef.current?.send(
                    JSON.stringify({
                      type: "offer",
                      offer: offer,
                      sessionId: currentSession?.id || "demo-session",
                    })
                  );
                }, 1000);
              }
            }
            break;

          case "offer": {
            if (!peerConnectionRef.current) {
              peerConnectionRef.current = createPeerConnection();
            }

            await peerConnectionRef.current.setRemoteDescription(message.offer);
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);

            wsRef.current?.send(
              JSON.stringify({
                type: "answer",
                answer: answer,
                sessionId: currentSession?.id || "demo-session",
              })
            );
            break;
          }

          case "answer":
            await peerConnectionRef.current?.setRemoteDescription(message.answer);
            break;

          case "ice-candidate":
            await peerConnectionRef.current?.addIceCandidate(message.candidate);
            break;

          case "session-joined":
            setConnectionStatus("connected");
            break;
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    wsRef.current.onclose = () => {
      setConnectionStatus("disconnected");
    };
  }, [currentSession, user.id, hasMediaAccess, createPeerConnection]);

  // Start demo session
  const startDemoSession = useCallback(async () => {
    if (!hasMediaAccess) {
      toast({
        title: "Camera Required",
        description: "Please grant camera access first",
        variant: "destructive",
      });
      return;
    }

    const session: VideoSession = {
      id: "demo-session",
      sessionType: "demo",
      clientId: "demo-client",
      therapistId: "demo-therapist",
      scheduledAt: new Date().toISOString(),
      duration: 60,
      status: "active",
      clientName: "Demo Client",
      therapistName: "Demo Therapist",
    };

    setCurrentSession(session);
    setConnectionStatus("connecting");
    setSessionDuration(0);

    // Start session timer
    sessionTimerRef.current = setInterval(() => {
      setSessionDuration((prev) => prev + 1);
    }, 1000);

    connectWebSocket();

    toast({
      title: "Demo Session Started",
      description: "Connecting to peer...",
    });
  }, [hasMediaAccess, connectWebSocket]);

  // End session
  const endSession = useCallback(() => {
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setCurrentSession(null);
    setConnectionStatus("disconnected");
    setParticipants(1);
    setSessionDuration(0);

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    toast({
      title: "Session Ended",
      description: "Video session has been terminated",
    });
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"></div>
        <Badge variant={connectionStatus === "connected" ? "default" : "secondary"}>
          {connectionStatus}
        </Badge>
      </div>

      {!currentSession ? (
        <div className="space-y-4">
          {/* Camera Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Camera Test
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!hasMediaAccess && (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <VideoOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">Camera access required</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Button
                  onClick={requestMediaAccess}
                  disabled={isRequestingMedia || hasMediaAccess}
                  className="w-full"
                >
                  {isRequestingMedia
                    ? "Requesting..."
                    : hasMediaAccess
                      ? "Camera Active"
                      : "Grant Camera Access"}
                </Button>

                {hasMediaAccess && (
                  <Button onClick={startDemoSession} variant="outline" className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Start Demo Session
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Session Info */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Demo Video Session</CardTitle>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {participants} participant{participants !== 1 ? "s" : ""}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(sessionDuration)}
                    </div>
                  </div>
                </div>
                <Button onClick={endSession} variant="destructive" size="sm">
                  <PhoneOff className="h-4 w-4 mr-2" />
                  End Call
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Video Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Local Video */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">You</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Remote Video */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Remote Participant</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {participants < 2 && (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <div className="text-center">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">Waiting for participant...</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <Card>
            <CardContent className="py-4">
              <div className="flex justify-center gap-2">
                <Button
                  onClick={toggleMute}
                  variant={isMuted ? "destructive" : "outline"}
                  size="sm"
                >
                  {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={toggleVideo}
                  variant={isVideoOff ? "destructive" : "outline"}
                  size="sm"
                >
                  {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
