import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Video, VideoOff, Mic, MicOff, Phone, RefreshCw, Camera, Users, MonitorOff, Monitor, MessageCircle, Settings, Play, Calendar, Clock } from 'lucide-react';

interface VideoSessionsProps {
  user: { id: string; role: string; };
}

interface VideoSession {
  id: string;
  sessionType: 'therapy' | 'consultation';
  clientId: string;
  therapistId: string;
  scheduledAt: string;
  duration: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  meetingLink?: string;
  notes?: string;
}

export default function VideoSessionsWorking({ user }: VideoSessionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Video session state
  const [isInSession, setIsInSession] = useState(false);
  const [currentSession, setCurrentSession] = useState<VideoSession | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  // Media controls
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // Refs for video elements and streams
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenShareStreamRef = useRef<MediaStream | null>(null);
  
  // WebRTC and WebSocket refs
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [participants, setParticipants] = useState<number>(0);
  const [hasMediaAccess, setHasMediaAccess] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);

  // Utility function to format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize media stream with camera-first approach
  const initializeMediaStream = useCallback(async () => {
    try {
      console.log('🎥 Requesting camera and audio access...');
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      };

      console.log('🎥 Requesting media with constraints:', constraints);
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
          console.log('✅ Local video stream started successfully');
        } catch (playError) {
          console.log('⚠️ Video autoplay blocked, user interaction required');
        }
      }
      
      console.log('✅ Camera and audio access granted successfully');
    } catch (error) {
      console.error('❌ Error accessing media devices:', error);
      setHasMediaAccess(false);
      toast({
        title: "Camera Access Required",
        description: "Please allow camera and microphone access to join the video session",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Auto-initialize media stream on component mount for demo
  useEffect(() => {
    const autoStartDemo = async () => {
      try {
        await initializeMediaStream();
      } catch (error) {
        console.log('Auto media initialization failed, user will need to enable manually');
      }
    };
    autoStartDemo();
  }, [initializeMediaStream]);



  // WebRTC Configuration
  const pcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Initialize WebSocket connection
  const initializeWebSocket = useCallback(() => {
    if (!currentSession) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const hostname = window.location.hostname;
    const port = window.location.port || (protocol === "wss:" ? "443" : "80");
    const wsUrl = `${protocol}//${hostname}:${port}/ws/video-sessions`;
    
    console.log('🔌 Connecting to WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('🔌 WebSocket connected');
      // Join the room
      ws.send(JSON.stringify({
        type: 'join-room',
        roomId: currentSession.id,
        userId: user.id
      }));
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log('📨 WebSocket message:', message);

      switch (message.type) {
        case 'user-joined':
          setParticipants(message.participants);
          if (message.participants > 1 && !peerConnectionRef.current) {
            await initializePeerConnection(true);
          }
          break;
          
        case 'user-left':
          setParticipants(message.participants);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          break;

        case 'offer':
          await handleOffer(message.offer, message.senderId);
          break;

        case 'answer':
          await handleAnswer(message.answer);
          break;

        case 'ice-candidate':
          await handleIceCandidate(message.candidate);
          break;
      }
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('🔌 WebSocket error:', error);
    };
  }, [currentSession, user.id]);

  // Initialize peer connection
  const initializePeerConnection = useCallback(async (isInitiator: boolean) => {
    console.log('🤝 Initializing peer connection, isInitiator:', isInitiator);
    
    const pc = new RTCPeerConnection(pcConfig);
    peerConnectionRef.current = pc;

    // Add local stream to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming remote stream
    pc.ontrack = (event) => {
      console.log('📺 Received remote stream');
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteStreamRef.current = event.streams[0];
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
          roomId: currentSession?.id
        }));
      }
    };

    // Create offer if initiator
    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'offer',
            offer: offer,
            roomId: currentSession?.id
          }));
        }
      } catch (error) {
        console.error('❌ Error creating offer:', error);
      }
    }
  }, [currentSession]);

  // Handle incoming offer
  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, senderId: string) => {
    console.log('📨 Handling offer from:', senderId);
    
    if (!peerConnectionRef.current) {
      await initializePeerConnection(false);
    }

    try {
      await peerConnectionRef.current!.setRemoteDescription(offer);
      const answer = await peerConnectionRef.current!.createAnswer();
      await peerConnectionRef.current!.setLocalDescription(answer);

      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'answer',
          answer: answer,
          roomId: currentSession?.id
        }));
      }
    } catch (error) {
      console.error('❌ Error handling offer:', error);
    }
  }, [currentSession, initializePeerConnection]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    console.log('📨 Handling answer');
    
    try {
      await peerConnectionRef.current!.setRemoteDescription(answer);
    } catch (error) {
      console.error('❌ Error handling answer:', error);
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    console.log('📨 Handling ICE candidate');
    
    try {
      await peerConnectionRef.current!.addIceCandidate(candidate);
    } catch (error) {
      console.error('❌ Error handling ICE candidate:', error);
    }
  }, []);

  // Manual camera refresh function
  const refreshCamera = useCallback(() => {
    console.log('🔄 Manual camera refresh triggered');
    
    if (localVideoRef.current && localStreamRef.current) {
      // Clear and reset the video element
      localVideoRef.current.srcObject = null;
      
      setTimeout(() => {
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
          localVideoRef.current.load();
          localVideoRef.current.play().catch(e => 
            console.log('Manual camera refresh auto-play prevented:', e)
          );
          
          toast({
            title: "Camera Refreshed",
            description: "Camera feed has been restored",
          });
          
          console.log('✅ Manual camera refresh completed');
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

  // Initialize media (camera and microphone)
  const initializeMedia = useCallback(async () => {
    try {
      console.log('🎥 Requesting camera and microphone access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        console.log('📺 Setting local video stream');
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.onloadedmetadata = () => {
          console.log('📺 Local video metadata loaded');
        };
        await localVideoRef.current.play();
      }
      
      console.log('✅ Media access granted successfully');
      return stream;
    } catch (error) {
      console.error('❌ Error accessing media devices:', error);
      toast({
        title: "Camera Access Failed",
        description: "Could not access camera and microphone",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      console.log('🖥️ Starting screen share...');
      
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      screenShareStreamRef.current = screenStream;
      
      if (screenShareRef.current) {
        screenShareRef.current.srcObject = screenStream;
        await screenShareRef.current.play();
      }
      
      // Move camera to picture-in-picture during screen share
      if (localVideoRef.current && localStreamRef.current) {
        console.log('📺 Maintaining camera stream during screen share');
        // Keep camera running in PiP while screen sharing
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.onloadedmetadata = () => {
          console.log('📺 Local video metadata loaded');
          console.log('🔄 Refreshing camera stream for PiP display');
          if (localVideoRef.current) {
            localVideoRef.current.play().catch(e => 
              console.log('Camera PiP auto-play prevented:', e)
            );
            localVideoRef.current.onloadedmetadata = () => {
              console.log('📺 PiP camera metadata loaded during screen share');
            };
          }
        };
      }
      
      setIsScreenSharing(true);
      console.log('✅ Screen sharing started successfully');
      
      // Track when screen sharing ends
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('🖥️ Screen sharing ended by user or system');
        stopScreenShare();
      });
      
    } catch (error) {
      console.error('❌ Error starting screen share:', error);
      toast({
        title: "Screen Share Failed",
        description: error instanceof Error && error.message.includes('Permission denied') 
          ? "Screen sharing permission was denied" 
          : "Could not start screen sharing",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    console.log('🖥️ Stopping screen share...');
    
    if (screenShareStreamRef.current) {
      screenShareStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      screenShareStreamRef.current = null;
    }
    
    if (screenShareRef.current) {
      screenShareRef.current.srcObject = null;
    }
    
    setIsScreenSharing(false);
    
    // Restore camera to main video area when screen sharing stops
    console.log('📹 Attempting to restore camera to main video area...');
    console.log('localVideoRef.current:', !!localVideoRef.current);
    console.log('localStreamRef.current:', !!localStreamRef.current);
    
    // Use the refreshCamera function for automatic restoration
    setTimeout(() => {
      console.log('📹 Triggering automatic camera refresh after screen share ends');
      refreshCamera();
    }, 300);
    
    console.log('✅ Screen sharing stopped and camera restored');
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

  // Fetch user's video sessions
  const { data: sessions, isLoading, error } = useQuery({
    queryKey: [`/api/video-sessions/${user.id}`],
    retry: false,
  });

  // Join session mutation
  const joinSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest("POST", `/api/video-sessions/${sessionId}/join`);
      return response.json();
    },
    onSuccess: async (data) => {
      console.log('=== JOIN SESSION SUCCESS ===');
      console.log('Response data:', data);
      
      setIsInSession(true);
      setCurrentSession(data.session || { id: data.sessionId });
      setConnectionStatus('connected');
      
      // Initialize media after successful join
      await initializeMedia();
      
      // Initialize WebSocket connection for peer-to-peer
      setTimeout(() => {
        initializeWebSocket();
      }, 1000);
      
      toast({
        title: "Session Joined",
        description: "You've successfully joined the video session",
      });
    },
    onError: (error) => {
      console.error('❌ Failed to join session:', error);
      toast({
        title: "Failed to Join Session",
        description: "Could not join the video session",
        variant: "destructive",
      });
    },
  });

  // Leave session
  const leaveSession = useCallback(() => {
    console.log('🚪 Leaving session...');
    
    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Stop all media streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (screenShareStreamRef.current) {
      screenShareStreamRef.current.getTracks().forEach(track => track.stop());
      screenShareStreamRef.current = null;
    }
    
    if (remoteStreamRef.current) {
      remoteStreamRef.current = null;
    }
    
    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (screenShareRef.current) {
      screenShareRef.current.srcObject = null;
    }
    
    // Reset state
    setIsInSession(false);
    setCurrentSession(null);
    setConnectionStatus('disconnected');
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    setIsScreenSharing(false);
    setParticipants(0);
    
    toast({
      title: "Session Ended",
      description: "You've left the video session",
    });
  }, [toast]);

  // Join a session
  const handleJoinSession = async (session: VideoSession) => {
    setConnectionStatus('connecting');
    
    // Set current session and initialize WebSocket
    setCurrentSession(session);
    setParticipants(1);
    
    // Initialize WebSocket connection for peer-to-peer video
    setTimeout(() => {
      console.log('🎯 Starting WebSocket connection for video chat');
      initializeWebSocket();
    }, 1000);
    
    toast({
      title: "Joined Session",
      description: `Connected to ${session.sessionType} session`,
    });
  };

  // Start WebSocket connection when session becomes active
  useEffect(() => {
    if (currentSession && !wsRef.current) {
      console.log('🔌 Session active, initializing WebSocket...');
      initializeWebSocket();
    }
  }, [currentSession, initializeWebSocket]);

  // Format session time for display
  const formatSessionTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get session status color
  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
          onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/video-sessions/${user.id}`] })}
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
          <h2 className="text-2xl font-bold">Video Session</h2>
          <Badge variant="outline" className="bg-green-100 text-green-800">
            {connectionStatus}
          </Badge>
        </div>
        
        {/* Main Video Display - Zoom-style Layout */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              {isScreenSharing ? (
                /* Screen Share Mode */
                <div className="w-full h-full relative">
                  <video
                    ref={screenShareRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {/* Picture-in-Picture Camera during screen share */}
                  <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-lg">
                    <video
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      ref={(el) => {
                        if (el && localStreamRef.current) {
                          el.srcObject = localStreamRef.current;
                        }
                      }}
                    />
                    <div className="absolute bottom-1 left-1 bg-black bg-opacity-70 text-white px-1 py-0.5 rounded text-xs">
                      You
                    </div>
                  </div>
                </div>
              ) : (
                /* Participants Layout - Side by Side like Zoom */
                <div className="w-full h-full grid grid-cols-2 gap-1 p-1">
                  {/* Local User Video */}
                  <div className="relative bg-gray-800 rounded-lg overflow-hidden">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* User Label */}
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium">
                      {user.role === 'therapist' ? 'Dr. Sarah Chen' : 'Emma Johnson'} (You)
                    </div>
                    {!hasMediaAccess && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                        <div className="text-center text-white">
                          <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Camera access required</p>
                          <p className="text-xs opacity-75">Click allow to start video</p>
                          <button 
                            onClick={initializeMediaStream}
                            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Enable Camera
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Remote Participant Video */}
                  <div className="relative bg-gray-800 rounded-lg overflow-hidden">
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    {/* Placeholder when no remote video */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center text-white">
                      <div className="text-center">
                        <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Users className="w-10 h-10" />
                        </div>
                        <p className="text-sm font-medium">
                          {user.role === 'therapist' ? 'Emma Johnson' : 'Dr. Sarah Chen'}
                        </p>
                        <p className="text-xs opacity-75">
                          {participants > 1 ? 'Connecting video...' : 'Waiting to join...'}
                        </p>
                      </div>
                    </div>
                    {/* Remote User Label */}
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium">
                      {user.role === 'therapist' ? 'Emma Johnson' : 'Dr. Sarah Chen'}
                    </div>
                  </div>
                </div>
              )}

              {/* Session Info Overlay */}
              <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">
                    {connectionStatus === 'connecting' ? 'Connecting...' : 'Live Session'}
                  </span>
                </div>
                <div className="text-xs opacity-75">
                  {formatDuration(sessionDuration)} • {participants} participant{participants !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Connection Status */}
              {connectionStatus === 'connecting' && (
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
                  <div className="bg-yellow-500 bg-opacity-90 text-black px-4 py-2 rounded-lg text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-800 rounded-full animate-pulse"></div>
                      Establishing connection...
                    </div>
                  </div>
                </div>
              )}

              {participants <= 1 && connectionStatus !== 'connecting' && (
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
                  <div className="bg-blue-500 bg-opacity-90 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-200 rounded-full animate-pulse"></div>
                      Waiting for {user.role === 'therapist' ? 'client' : 'therapist'} to join...
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Video Controls - Zoom-style Bottom Bar */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-center space-x-6">
            {/* Audio Control */}
            <Button
              variant="ghost"
              size="lg"
              onClick={toggleAudio}
              className={`rounded-full w-12 h-12 text-white hover:bg-gray-700 ${
                !isAudioEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600'
              }`}
              title={isAudioEnabled ? 'Mute Audio' : 'Unmute Audio'}
            >
              {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            
            {/* Video Control */}
            <Button
              variant="ghost"
              size="lg"
              onClick={toggleVideo}
              className={`rounded-full w-12 h-12 text-white hover:bg-gray-700 ${
                !isVideoEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600'
              }`}
              title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
            >
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
            
            {/* Screen Share Control */}
            <Button
              variant="ghost"
              size="lg"
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              className={`rounded-full w-12 h-12 text-white hover:bg-gray-700 ${
                isScreenSharing ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600'
              }`}
              title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
            >
              {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
            </Button>
            
            {/* Participants */}
            <Button
              variant="ghost"
              size="lg"
              className="rounded-full w-12 h-12 text-white bg-gray-600 hover:bg-gray-700"
              title="Participants"
            >
              <Users className="h-5 w-5" />
            </Button>
            
            {/* Chat */}
            <Button
              variant="ghost"
              size="lg"
              className="rounded-full w-12 h-12 text-white bg-gray-600 hover:bg-gray-700"
              title="Chat"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
            
            {/* Settings */}
            <Button
              variant="ghost"
              size="lg"
              onClick={refreshCamera}
              className="rounded-full w-12 h-12 text-white bg-gray-600 hover:bg-gray-700"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
            
            {/* End Meeting */}
            <Button
              variant="ghost"
              size="lg"
              onClick={leaveSession}
              className="rounded-full w-14 h-12 text-white bg-red-600 hover:bg-red-700 font-medium px-4"
              title="End Meeting"
            >
              End Meeting
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Session list view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        </div>
        <Badge variant="outline">
          {sessions?.length || 0} session{sessions?.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Quick Join Demo Session */}
      <Card className="border-2 border-dashed border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Quick Demo Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Test the video calling system with a demo session
          </p>
          <Button 
            onClick={() => handleJoinSession({
              id: 'demo-session',
              sessionType: 'therapy',
              clientId: user.id,
              therapistId: 'demo-therapist',
              scheduledAt: new Date().toISOString(),
              duration: 60,
              status: 'scheduled'
            })}
            disabled={joinSessionMutation.isPending}
            className="w-full"
          >
            {joinSessionMutation.isPending ? 'Joining...' : 'Join Demo Session'}
          </Button>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <div className="grid gap-4">
        {sessions && sessions.length > 0 ? (
          (sessions as VideoSession[]).map((session: VideoSession) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {session.sessionType.charAt(0).toUpperCase() + session.sessionType.slice(1)} Session
                  </CardTitle>
                  <Badge className={getSessionStatusColor(session.status)}>
                    {session.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatSessionTime(session.scheduledAt)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {session.duration} minutes
                  </div>
                </div>
                
                {session.notes && (
                  <p className="text-sm text-muted-foreground">{session.notes}</p>
                )}
                
                <div className="flex justify-between items-center pt-2">
                  <div className="text-sm">
                    {user.role === 'client' ? 'Therapist' : 'Client'}: {
                      user.role === 'client' ? session.therapistId : session.clientId
                    }
                  </div>
                  
                  {session.status === 'scheduled' && (
                    <Button 
                      onClick={() => handleJoinSession(session)}
                      disabled={joinSessionMutation.isPending}
                      size="sm"
                    >
                      {joinSessionMutation.isPending ? 'Joining...' : 'Join Session'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No video sessions scheduled</h3>
              <p className="text-muted-foreground">
                Your upcoming video sessions will appear here
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}