import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Video,
  Clock,
  Calendar,
  User,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Users,
} from "lucide-react";
import ServiceNavigation from "@/components/ui/service-navigation";

interface VideoSession {
  id: string;
  sessionType: string;
  scheduledAt: string;
  endTime?: string;
  duration: number;
  status: string;
  meetingUrl: string;
  clientName: string;
  clientEmail?: string;
  therapistName?: string;
  joinInstructions?: string;
  clientId?: string;
  therapistId?: string;
  participants?: Array<{ id: string; name: string; role: string }>;
}

interface VideoSessionsProductionProps {
  user: { id: string; role: string; firstName?: string; lastName?: string; email: string };
  onBackToDashboard?: () => void;
  sessionId?: string;
}

// Helper to transform user for ServiceNavigation
const transformUserForNavigation = (user: VideoSessionsProductionProps["user"]) => ({
  id: user.id,
  name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User",
  email: user.email,
  role: user.role,
});

export default function VideoSessionsProduction({
  user,
  onBackToDashboard,
  sessionId,
}: VideoSessionsProductionProps) {
  const [filter, setFilter] = useState<"all" | "upcoming" | "today" | "past">("upcoming");
  const [joiningSessionId, setJoiningSessionId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's video sessions
  const {
    data: sessions = [],
    isLoading,
    error,
  } = useQuery<VideoSession[]>({
    queryKey: ["/api/video-sessions", user.id],
    queryFn: async () => {
      const response = await fetch(`/api/video-sessions/${user.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }
      return response.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // Join session mutation with payment bypass for confirmed sessions
  const joinSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      setJoiningSessionId(sessionId); // Prevent multiple clicks
      console.log(`🎯 ATTEMPTING TO JOIN CONFIRMED SESSION: ${sessionId}`);
      console.log(`📍 Making POST request to: /api/video-sessions/${sessionId}/join`);

      try {
        const response = await fetch(`/api/video-sessions/${sessionId}/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Bypass-Payment": "true", // Signal to bypass payment processing
          },
          credentials: "same-origin",
        });

        console.log(`📡 Response status: ${response.status}`);
        console.log(`📡 Response ok: ${response.ok}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.log(`❌ Response error: ${errorText}`);
          throw new Error(`Failed to join session: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log(`✅ Join session success:`, result);
        return result;
      } catch (error) {
        console.log(`💥 Fetch error:`, error);
        throw error;
      }
    },
    onSuccess: (data, sessionId) => {
      setJoiningSessionId(null); // Reset joining state
      console.log("🎉 CONFIRMED SESSION JOIN SUCCESS:", data);

      if (data.success && data.meetingUrl) {
        // Open meeting URL directly for confirmed sessions
        const meetWindow = window.open(
          data.meetingUrl,
          "_blank",
          "width=1200,height=800,scrollbars=yes,resizable=yes"
        );
        if (!meetWindow) {
          toast({
            title: "Pop-up blocked",
            description: "Please allow pop-ups and try again",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Joining confirmed session",
            description: "Your paid session is opening now",
            variant: "default",
          });
        }
      } else if (data.success && !data.meetingUrl) {
        toast({
          title: "Session confirmed",
          description: "Session is ready but meeting link is being generated",
          variant: "default",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/video-sessions", user.id] });
    },
    onError: (error: any) => {
      setJoiningSessionId(null); // Reset joining state on error
      toast({
        title: "Failed to join session",
        description: error.message || "Unable to join the video session. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper functions for session timing
  const getSessionStatus = (session: VideoSession) => {
    const now = new Date();
    const scheduledAt = new Date(session.scheduledAt);
    const endTime = session.endTime
      ? new Date(session.endTime)
      : new Date(scheduledAt.getTime() + session.duration * 60000);

    // CRITICAL FIX: If status is 'in_progress' in the database, respect it even if timing suggests otherwise
    if (session.status === "in_progress") return "in-progress";
    if (session.status === "cancelled") return "cancelled";
    if (session.status === "completed") return "completed";

    // Only use time-based logic if the database status doesn't explicitly set the state
    if (now > endTime) return "past";
    if (now >= scheduledAt && now <= endTime) return "in-progress";
    if (scheduledAt.getTime() - now.getTime() <= 15 * 60 * 1000) return "starting-soon";
    return "upcoming";
  };

  const formatSessionTime = (session: VideoSession) => {
    const scheduledAt = new Date(session.scheduledAt);
    return {
      date: scheduledAt.toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: scheduledAt.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }),
    };
  };

  const getCounterpartName = (session: VideoSession) => {
    if (user.role === "therapist") {
      return session.clientName || "Unknown Client";
    } else {
      return session.therapistName || "Unknown Therapist";
    }
  };

  // Filter sessions based on selected filter
  const filteredSessions = (sessions || []).filter((session: VideoSession) => {
    const status = getSessionStatus(session);
    const now = new Date();
    const scheduledAt = new Date(session.scheduledAt);

    // CRITICAL FIX: Exclude sessions without therapists for clients
    if (user.role === "client" && (!session.therapistName || session.therapistName.trim() === "")) {
      console.log(`Filtering out session ${session.id.slice(0, 8)} - no therapist assigned`);
      return false;
    }

    // CRITICAL FIX: Exclude cancelled sessions from upcoming/today filters
    if ((filter === "upcoming" || filter === "today") && status === "cancelled") {
      console.log(`Filtering out cancelled session ${session.id.slice(0, 8)}`);
      return false;
    }

    // DEBUG: Log filtering logic
    if (filter === "today") {
      console.log("DEBUG Today Filter:", {
        sessionId: session.id.slice(0, 8),
        scheduledAt: scheduledAt.toISOString(),
        scheduledAtDateString: scheduledAt.toDateString(),
        nowDateString: now.toDateString(),
        matches: scheduledAt.toDateString() === now.toDateString(),
        status,
        therapistName: session.therapistName,
      });
    }

    switch (filter) {
      case "today":
        return scheduledAt.toDateString() === now.toDateString();
      case "upcoming":
        return status === "upcoming" || status === "starting-soon" || status === "in-progress";
      case "past":
        return status === "past" || status === "completed";
      default:
        return true;
    }
  });

  // CRITICAL FIX: Sort sessions with confirmed therapists first, then by scheduled time
  const sortedSessions = filteredSessions.sort((a: VideoSession, b: VideoSession) => {
    // Prioritize sessions with assigned therapists
    const aHasTherapist = a.therapistName && a.therapistName.trim() !== "";
    const bHasTherapist = b.therapistName && b.therapistName.trim() !== "";

    if (aHasTherapist && !bHasTherapist) return -1;
    if (!aHasTherapist && bHasTherapist) return 1;

    // Then sort by status (confirmed > in_progress > others)
    const statusPriority = { confirmed: 1, "in-progress": 2, upcoming: 3 };
    const aPriority = statusPriority[a.status as keyof typeof statusPriority] || 999;
    const bPriority = statusPriority[b.status as keyof typeof statusPriority] || 999;

    if (aPriority !== bPriority) return aPriority - bPriority;

    // Finally sort by scheduled time (newest first for same status)
    return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
  });

  const renderStatusBadge = (session: VideoSession) => {
    const status = getSessionStatus(session);

    const statusConfig = {
      upcoming: { label: "Upcoming", variant: "default" as const, icon: Clock },
      "starting-soon": { label: "Starting Soon", variant: "default" as const, icon: AlertTriangle },
      "in-progress": { label: "In Progress", variant: "destructive" as const, icon: Play },
      past: { label: "Completed", variant: "secondary" as const, icon: CheckCircle },
      completed: { label: "Completed", variant: "secondary" as const, icon: CheckCircle },
      cancelled: { label: "Cancelled", variant: "outline" as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const renderJoinButton = (session: VideoSession) => {
    const status = getSessionStatus(session);

    if (status === "past" || status === "completed" || status === "cancelled") {
      return (
        <Button disabled variant="outline" size="sm">
          Session Ended
        </Button>
      );
    }

    const isJoining = joinSessionMutation.isPending || joiningSessionId === session.id;
    const buttonText =
      status === "in-progress"
        ? "Join Now"
        : status === "starting-soon"
          ? "Join Session"
          : "Join Session";

    const handleJoinClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isJoining) {
        joinSessionMutation.mutate(session.id);
      }
    };

    return (
      <Button
        onClick={handleJoinClick}
        disabled={isJoining}
        size="sm"
        className="bg-hive-purple hover:bg-hive-purple/90"
        data-testid={`button-join-session-${session.id}`}
      >
        <ExternalLink className="w-4 h-4 mr-2" />
        {isJoining ? "Joining..." : buttonText}
      </Button>
    );
  };

  const renderSessionCard = (session: VideoSession) => {
    const { date, time } = formatSessionTime(session);
    const counterpartName = getCounterpartName(session);

    return (
      <Card
        key={session.id}
        className="hover:shadow-md transition-shadow"
        data-testid={`card-session-${session.id}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Therapy Session
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <User className="w-4 h-4 text-gray-500" />
                <span
                  className="text-sm text-gray-600 dark:text-gray-400"
                  data-testid={`text-counterpart-${session.id}`}
                >
                  {user.role === "therapist" ? "Client" : "Therapist"}: {counterpartName}
                </span>
              </div>
            </div>
            {renderStatusBadge(session)}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div>
                <div className="text-sm font-medium" data-testid={`text-date-${session.id}`}>
                  {date}
                </div>
                <div
                  className="text-sm text-gray-600 dark:text-gray-400"
                  data-testid={`text-time-${session.id}`}
                >
                  {time}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <div>
                <div className="text-sm font-medium">Duration</div>
                <div
                  className="text-sm text-gray-600 dark:text-gray-400"
                  data-testid={`text-duration-${session.id}`}
                >
                  {session.duration} minutes
                </div>
              </div>
            </div>
          </div>

          {session.joinInstructions && (
            <Alert>
              <Video className="w-4 h-4" />
              <AlertDescription className="text-sm">{session.joinInstructions}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4" />
              <span>Session ID: {session.id.slice(0, 8)}...</span>
            </div>
            {renderJoinButton(session)}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ServiceNavigation
          serviceName="video-sessions"
          onBackToDashboard={onBackToDashboard || (() => {})}
          user={transformUserForNavigation(user)}
        />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-hive-purple rounded-full mx-auto mb-4"></div>
            <div className="text-hive-purple font-medium text-lg">Loading Video Sessions</div>
            <div className="text-gray-600 text-sm mt-2">Please wait...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <ServiceNavigation
          serviceName="video-sessions"
          onBackToDashboard={onBackToDashboard || (() => {})}
          user={transformUserForNavigation(user)}
        />
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Failed to load video sessions. Please refresh the page and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="video-sessions-production">
      <ServiceNavigation
        serviceName="video-sessions"
        onBackToDashboard={onBackToDashboard || (() => {})}
        user={transformUserForNavigation(user)}
      />

      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-gray-100">
            Your Video Sessions
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {user.role === "therapist"
              ? "Manage your client sessions and join video calls"
              : "View your therapy sessions and join video calls"}
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "upcoming", label: "Upcoming" },
            { key: "today", label: "Today" },
            { key: "past", label: "Past" },
            { key: "all", label: "All" },
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={filter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(key as any)}
              data-testid={`button-filter-${key}`}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Sessions list */}
      <div className="space-y-4">
        {sortedSessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No {filter !== "all" ? filter : ""} sessions found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                {filter === "upcoming"
                  ? "You don't have any upcoming video sessions scheduled."
                  : filter === "today"
                    ? "You don't have any video sessions scheduled for today."
                    : filter === "past"
                      ? "You don't have any past video sessions."
                      : "You don't have any video sessions scheduled."}
              </p>
            </CardContent>
          </Card>
        ) : (
          sortedSessions.map(renderSessionCard)
        )}
      </div>
    </div>
  );
}
