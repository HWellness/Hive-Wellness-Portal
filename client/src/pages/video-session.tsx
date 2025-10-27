import React from "react";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  Calendar,
  Clock,
  User,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface VideoSessionData {
  id: string;
  sessionType: string;
  scheduledAt: string;
  duration: number;
  status: string;
  meetingUrl: string;
  meetingId?: string;
  calendarEventId?: string;
  clientName: string;
  therapistName?: string;
  joinInstructions?: string;
}

function VideoSession() {
  const [match, params] = useRoute("/video-session/:sessionId");
  const sessionId = params?.sessionId || "";

  const {
    data: sessionData,
    isLoading,
    error,
    refetch,
  } = useQuery<VideoSessionData>({
    queryKey: ["/api/video-session", sessionId],
    enabled: !!sessionId,
    retry: 3,
    retryDelay: 1000,
  });

  const handleJoinMeeting = () => {
    if (sessionData?.meetingUrl) {
      // Open Google Meet in a new tab
      window.open(sessionData.meetingUrl, "_blank", "noopener,noreferrer");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/London",
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "default";
      case "in-progress":
        return "secondary";
      case "completed":
        return "outline";
      default:
        return "secondary";
    }
  };

  const isSessionAccessible = () => {
    if (!sessionData) return false;

    const now = new Date();
    const sessionTime = new Date(sessionData.scheduledAt);
    const timeDiff = sessionTime.getTime() - now.getTime();

    // Allow access 15 minutes before and up to 2 hours after
    return timeDiff <= 15 * 60 * 1000 && timeDiff >= -2 * 60 * 60 * 1000;
  };

  if (!match) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Invalid session URL</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading session details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Video Session Not Available</CardTitle>
            <CardDescription>Failed to load meeting details</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              The video session you're trying to access could not be found or may have expired.
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                Try Again
              </Button>
              <Button onClick={() => window.history.back()}>Return to Portal</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Your Video Session</CardTitle>
          <CardDescription>
            {sessionData.sessionType === "introduction-call"
              ? "Free Introduction Call"
              : "Therapy Session"}{" "}
            with Hive Wellness
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Session Status */}
          <div className="flex justify-center">
            <Badge variant={getStatusBadgeVariant(sessionData.status)}>
              {sessionData.status === "confirmed" ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Session Confirmed
                </>
              ) : (
                sessionData.status
              )}
            </Badge>
          </div>

          {/* Session Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{formatDate(sessionData.scheduledAt)}</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(sessionData.scheduledAt)} (UK Time)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">Duration: {sessionData.duration} minutes</p>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">With: {sessionData.therapistName || "Hive Wellness Team"}</p>
            </div>
          </div>

          {/* Meeting Access */}
          {sessionData.meetingUrl && (
            <div className="space-y-4">
              <div className="text-center">
                <Button
                  size="lg"
                  onClick={handleJoinMeeting}
                  disabled={!isSessionAccessible()}
                  className="w-full sm:w-auto"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Join Video Session
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </div>

              {!isSessionAccessible() && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Video sessions become available 15 minutes before your scheduled time.
                  </AlertDescription>
                </Alert>
              )}

              {/* Join Instructions */}
              {sessionData.joinInstructions && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">How to Join:</h4>
                  <div className="text-sm text-blue-800 whitespace-pre-line">
                    {sessionData.joinInstructions}
                  </div>
                </div>
              )}

              {/* Direct Link */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Direct meeting link:</p>
                <div className="bg-muted/50 rounded p-2 text-xs font-mono break-all">
                  {sessionData.meetingUrl}
                </div>
              </div>
            </div>
          )}

          {/* Support Information */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Need Help?</h4>
            <p className="text-sm text-muted-foreground">
              If you experience any technical difficulties, contact us at{" "}
              <a href="mailto:support@hive-wellness.co.uk" className="text-primary hover:underline">
                support@hive-wellness.co.uk
              </a>{" "}
              or call during business hours.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default VideoSession;
