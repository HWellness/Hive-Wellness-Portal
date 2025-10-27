import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Video,
  Calendar,
  Clock,
  User,
  PhoneOff,
  Mic,
  MicOff,
  VideoIcon,
  VideoOff,
  Settings,
} from "lucide-react";
import type { User as UserType } from "@shared/schema";

interface VideoSessionsProps {
  user: UserType;
}

interface VideoSession {
  id: string;
  therapistId: string;
  therapistName: string;
  scheduledAt: string;
  duration: number;
  status: "scheduled" | "active" | "completed" | "cancelled";
  sessionType: "therapy" | "consultation" | "check-in";
  roomId?: string;
}

export default function VideoSessions({ user }: VideoSessionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSession, setActiveSession] = useState<VideoSession | null>(null);
  const [isInSession, setIsInSession] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);

  // Fetch upcoming and recent sessions
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["/api/video-sessions", user.id],
    enabled: !!user.id,
  });

  // Join session mutation
  const joinSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest("POST", `/api/video-sessions/${sessionId}/join`);
    },
    onSuccess: (data: any) => {
      setActiveSession(data?.session || null);
      setIsInSession(true);
      toast({
        title: "Joined Session",
        description: "Successfully connected to your therapy session.",
      });
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: "Unable to join the session. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Leave session mutation
  const leaveSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest("POST", `/api/video-sessions/${sessionId}/leave`);
    },
    onSuccess: () => {
      setActiveSession(null);
      setIsInSession(false);
      toast({
        title: "Session Ended",
        description: "You have left the session.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/video-sessions"] });
    },
  });

  // Schedule new session mutation
  const scheduleSessionMutation = useMutation({
    mutationFn: async (sessionData: {
      therapistId: string;
      scheduledAt: string;
      sessionType: string;
    }) => {
      return await apiRequest("POST", "/api/video-sessions/schedule", sessionData);
    },
    onSuccess: () => {
      toast({
        title: "Session Scheduled",
        description: "Your therapy session has been scheduled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/video-sessions"] });
    },
  });

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Moved to SessionCard component

  const upcomingSessions = ((sessions as VideoSession[]) || []).filter(
    (s: VideoSession) => s.status === "scheduled" && new Date(s.scheduledAt) > new Date()
  );

  const recentSessions = ((sessions as VideoSession[]) || [])
    .filter(
      (s: VideoSession) =>
        s.status === "completed" ||
        (s.status === "scheduled" && new Date(s.scheduledAt) <= new Date())
    )
    .slice(0, 5);

  if (isInSession && activeSession) {
    return (
      <div className="h-screen bg-gray-900 flex flex-col">
        {/* Video Call Interface */}
        <div className="flex-1 relative bg-black rounded-lg overflow-hidden">
          {/* Main video area */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-16 h-16 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold">{activeSession.therapistName}</h3>
              <p className="text-gray-400">Therapy Session</p>
            </div>
          </div>

          {/* Self video (picture-in-picture) */}
          <div className="absolute top-4 right-4 w-48 h-32 bg-gray-800 rounded-lg border border-gray-600 overflow-hidden">
            <div className="w-full h-full flex items-center justify-center">
              {isVideoOn ? (
                <div className="text-white text-center">
                  <User className="w-8 h-8 mx-auto mb-1" />
                  <p className="text-xs">You</p>
                </div>
              ) : (
                <div className="text-gray-400 text-center">
                  <VideoOff className="w-8 h-8 mx-auto mb-1" />
                  <p className="text-xs">Video Off</p>
                </div>
              )}
            </div>
          </div>

          {/* Session info overlay */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Live Session</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-6">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsMuted(!isMuted)}
              className={`w-14 h-14 rounded-full ${isMuted ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"} border-0`}
            >
              {isMuted ? (
                <MicOff className="w-6 h-6 text-white" />
              ) : (
                <Mic className="w-6 h-6 text-white" />
              )}
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsVideoOn(!isVideoOn)}
              className={`w-14 h-14 rounded-full ${!isVideoOn ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"} border-0`}
            >
              {isVideoOn ? (
                <VideoIcon className="w-6 h-6 text-white" />
              ) : (
                <VideoOff className="w-6 h-6 text-white" />
              )}
            </Button>

            <Button
              variant="destructive"
              size="lg"
              onClick={() => leaveSessionMutation.mutate(activeSession.id)}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700"
            >
              <PhoneOff className="w-6 h-6" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-14 h-14 rounded-full bg-gray-700 hover:bg-gray-600 border-0"
            >
              <Settings className="w-6 h-6 text-white" />
            </Button>
          </div>

          {/* Session timer and info */}
          <div className="text-center mt-4 text-white">
            <p className="text-sm text-gray-400">Session with {activeSession.therapistName}</p>
            <p className="text-lg font-semibold">{activeSession.duration} minutes remaining</p>
          </div>
        </div>
      </div>
    );
  }

  const nextSession = upcomingSessions[0];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Page Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h1 text-foreground">Your Video Sessions</h1>
            <p className="text-body-lg text-muted-foreground mt-2">
              View your therapy sessions and join video calls
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" size="lg">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Session
          </Button>
        </div>

        {/* Next Session Highlight */}
        {nextSession && (
          <div className="bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
              <span className="text-caption font-medium text-primary">Next Session</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-h4 text-foreground">{nextSession.therapistName}</h3>
                <p className="text-body text-muted-foreground">
                  {formatDateTime(nextSession.scheduledAt)}
                </p>
                <p className="text-caption">{nextSession.duration} minutes</p>
              </div>
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                <Video className="w-4 h-4 mr-2" />
                Join Now
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border border-border hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
          <CardContent className="p-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Video className="w-6 h-6 text-green-600" />
              </div>
              <Badge className="bg-green-500/10 text-green-700 border-green-500/20">
                Available
              </Badge>
            </div>
            <h3 className="text-h4 text-foreground mb-2">Instant Session</h3>
            <p className="text-caption mb-4">
              Start an immediate session if your therapist is available
            </p>
            <Button variant="outline" className="w-full">
              Check Availability
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
          <CardContent className="p-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-accent-foreground" />
              </div>
              <Badge className="bg-accent/10 text-accent-foreground border-accent/20">
                {upcomingSessions.length}
              </Badge>
            </div>
            <h3 className="text-h4 text-foreground mb-2">Upcoming</h3>
            <p className="text-caption mb-4">
              You have {upcomingSessions.length} upcoming sessions
            </p>
            <Button variant="outline" className="w-full">
              View Schedule
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
          <CardContent className="p-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <Badge className="bg-primary/10 text-primary border-primary/20">History</Badge>
            </div>
            <h3 className="text-h4 text-foreground mb-2">Past Sessions</h3>
            <p className="text-caption mb-4">Review your previous therapy sessions</p>
            <Button variant="outline" className="w-full">
              View History
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <Card className="bg-card border border-border">
          <CardHeader className="p-card-lg border-b border-border">
            <CardTitle className="text-h3 text-foreground">Upcoming Sessions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0">
              {upcomingSessions.map((session: VideoSession, index: number) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isNext={index === 0}
                  onJoin={(sessionId) => joinSessionMutation.mutate(sessionId)}
                  isJoining={joinSessionMutation.isPending}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <Card className="bg-card border border-border">
          <CardHeader className="p-card-lg border-b border-border">
            <CardTitle className="text-h3 text-foreground">Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0">
              {recentSessions.map((session: VideoSession) => (
                <SessionCard key={session.id} session={session} isNext={false} isPast={true} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {upcomingSessions.length === 0 && recentSessions.length === 0 && !isLoading && (
        <Card className="bg-card border border-border">
          <CardContent className="text-center py-12 p-card-lg">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Video className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-h3 text-foreground mb-2">No sessions yet</h3>
            <p className="text-body text-muted-foreground mb-6 max-w-md mx-auto">
              Schedule your first therapy session to get started with video consultations.
            </p>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Your First Session
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Reusable SessionCard Component
interface SessionCardProps {
  session: VideoSession;
  isNext?: boolean;
  isPast?: boolean;
  onJoin?: (sessionId: string) => void;
  isJoining?: boolean;
}

function SessionCard({ session, isNext, isPast, onJoin, isJoining }: SessionCardProps) {
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      case "scheduled":
        return "bg-primary/10 text-primary border-primary/20";
      case "completed":
        return "bg-muted text-muted-foreground border-muted";
      case "cancelled":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border-muted";
    }
  };

  return (
    <div
      className={`
      flex items-center justify-between p-card border-b border-border last:border-b-0
      hover:bg-muted/30 transition-colors
      ${isNext ? "bg-primary/5 border-l-4 border-l-primary" : ""}
    `}
    >
      <div className="flex items-center gap-4">
        <div
          className={`
          w-12 h-12 rounded-xl flex items-center justify-center
          ${isPast ? "bg-muted" : "bg-accent/10"}
        `}
        >
          <User
            className={`w-6 h-6 ${isPast ? "text-muted-foreground" : "text-accent-foreground"}`}
          />
        </div>
        <div className="space-y-1">
          <h4 className="text-h4 text-foreground">{session.therapistName}</h4>
          <p className="text-body text-muted-foreground">{formatDateTime(session.scheduledAt)}</p>
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(session.status)}>
              {session.status === "scheduled" ? "Upcoming" : session.status}
            </Badge>
            <span className="text-caption">{session.duration} min</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        {!isPast && onJoin && (
          <Button
            size="sm"
            onClick={() => onJoin(session.id)}
            disabled={isJoining}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Video className="w-4 h-4 mr-2" />
            {isNext ? "Join Now" : "Join"}
          </Button>
        )}
        {!isPast && (
          <Button variant="outline" size="sm">
            Reschedule
          </Button>
        )}
        {isPast && (
          <Button variant="outline" size="sm">
            View Notes
          </Button>
        )}
      </div>
    </div>
  );
}
