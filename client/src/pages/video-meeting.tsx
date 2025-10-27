import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Video,
  Clock,
  UserCheck,
  AlertCircle,
  PhoneOff,
  Mic,
  MicOff,
  VideoOff,
} from "lucide-react";
import hiveWellnessLogo from "@assets/Hive Logo_1752073128164.png";

// Simple video meeting page accessible from email links
export default function VideoMeetingPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [inVideoCall, setInVideoCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleJoinMeeting = async () => {
    if (!name.trim() || !email.trim()) {
      alert("Please enter your name and email to join the meeting");
      return;
    }

    setIsJoining(true);

    try {
      // Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      setInVideoCall(true);
      setIsJoining(false);
    } catch (error) {
      console.error("Error accessing media devices:", error);
      alert("Could not access camera/microphone. Please check permissions and try again.");
      setIsJoining(false);
    }
  };

  const handleEndCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setInVideoCall(false);
    setIsMuted(false);
    setIsVideoOff(false);
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Connect video stream to video element
  useEffect(() => {
    if (localStream && inVideoCall) {
      const videoElement = document.getElementById("localVideo") as HTMLVideoElement;
      if (videoElement) {
        videoElement.srcObject = localStream;
      }
    }
  }, [localStream, inVideoCall]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // If in video call, show video interface
  if (inVideoCall) {
    return (
      <div className="min-h-screen bg-black relative">
        {/* Video Stream */}
        <div className="absolute inset-0">
          <video
            id="localVideo"
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${isVideoOff ? "hidden" : ""}`}
          />
          {isVideoOff && (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <div className="text-center text-white">
                <VideoOff className="w-20 h-20 mx-auto mb-4" />
                <p className="text-xl">{name}</p>
                <p className="text-sm opacity-70">Video is off</p>
              </div>
            </div>
          )}
        </div>

        {/* Call Controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center gap-4 bg-black/50 rounded-full px-6 py-4">
            <Button
              onClick={toggleMute}
              variant={isMuted ? "destructive" : "secondary"}
              size="lg"
              className="rounded-full w-12 h-12 p-0"
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>

            <Button
              onClick={toggleVideo}
              variant={isVideoOff ? "destructive" : "secondary"}
              size="lg"
              className="rounded-full w-12 h-12 p-0"
            >
              {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </Button>

            <Button
              onClick={handleEndCall}
              variant="destructive"
              size="lg"
              className="rounded-full w-12 h-12 p-0"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Call Info */}
        <div className="absolute top-8 left-8">
          <div className="bg-black/50 rounded-lg px-4 py-2 text-white">
            <p className="font-medium">{name}</p>
            <p className="text-sm opacity-70">In consultation</p>
            <p className="text-xs opacity-50">{formatTime(currentTime)}</p>
          </div>
        </div>

        {/* Waiting message */}
        <div className="absolute top-8 right-8">
          <div className="bg-hive-purple/90 rounded-lg px-4 py-2 text-white">
            <p className="text-sm">Waiting for therapist to join...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-hive-light-blue to-hive-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-6">
              <img src={hiveWellnessLogo} alt="Hive Wellness" className="h-20 mx-auto mb-4" />
            </div>
            <h1 className="text-3xl font-bold text-hive-black font-century mb-2">
              Video Consultation
            </h1>
            <p className="text-hive-black/70">
              Join your scheduled consultation with the Hive Wellness team
            </p>
          </div>

          {/* Meeting Info Card */}
          <Card className="mb-6">
            <CardHeader className="text-center bg-gradient-to-r from-hive-purple to-hive-purple/80 text-white rounded-t-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Video className="w-6 h-6" />
                <CardTitle>Ready to Join</CardTitle>
              </div>
              <CardDescription className="text-white/80">
                Current time: {formatTime(currentTime)}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-4 mb-6">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <UserCheck className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-800">Meeting Available</div>
                    <div className="text-sm text-green-600">Your consultation link is active</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-hive-purple/10 rounded-lg">
                  <Clock className="w-5 h-5 text-hive-purple" />
                  <div>
                    <div className="font-medium text-hive-purple">Duration: 15-30 minutes</div>
                    <div className="text-sm text-hive-purple/70">Initial consultation call</div>
                  </div>
                </div>
              </div>

              {/* Entry Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={handleJoinMeeting}
                  disabled={isJoining || !name.trim() || !email.trim()}
                  className="w-full bg-hive-purple hover:bg-hive-purple/90 text-white font-medium py-3"
                  size="lg"
                >
                  {isJoining ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Joining Meeting...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Video className="w-5 h-5" />
                      Join Video Meeting
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Before You Join
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-hive-black/70">
                <li>• Ensure you have a stable internet connection</li>
                <li>• Test your camera and microphone</li>
                <li>• Find a quiet, private space for the call</li>
                <li>• Have any questions about therapy ready</li>
                <li>• The meeting will start when you click "Join Video Meeting"</li>
              </ul>
            </CardContent>
          </Card>

          {/* Support */}
          <div className="text-center mt-6 text-sm text-hive-black/60">
            <p>
              Having technical issues? Email us at{" "}
              <a
                href="mailto:support@hive-wellness.co.uk"
                className="text-hive-purple hover:underline"
              >
                support@hive-wellness.co.uk
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
