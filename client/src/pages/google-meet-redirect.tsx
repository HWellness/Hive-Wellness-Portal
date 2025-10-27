import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function GoogleMeetRedirect() {
  const [match, params] = useRoute("/video-session/:sessionId");
  const [meetingUrl, setMeetingUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const sessionId = params?.sessionId;
  const urlParams = new URLSearchParams(window.location.search);
  const role = urlParams.get("role");
  const type = urlParams.get("type");

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided");
      setLoading(false);
      return;
    }

    // Check if this is a Google Meet URL (already generated)
    if (sessionId.startsWith("https://meet.google.com/")) {
      setMeetingUrl(sessionId);
      setLoading(false);
      // Auto-redirect to Google Meet
      setTimeout(() => {
        window.open(sessionId, "_blank");
      }, 2000);
      return;
    }

    // Fetch the actual Google Meet URL for this session
    fetchMeetingDetails();
  }, [sessionId]);

  const fetchMeetingDetails = async () => {
    try {
      const response = await fetch(`/api/video-sessions/${sessionId}/google-meet`);
      if (!response.ok) {
        throw new Error("Session not found");
      }
      const data = await response.json();
      setMeetingUrl(data.googleMeetUrl || data.meetingLink);
      setLoading(false);

      // Auto-redirect after 3 seconds
      setTimeout(() => {
        if (data.googleMeetUrl || data.meetingLink) {
          window.open(data.googleMeetUrl || data.meetingLink, "_blank");
        }
      }, 3000);
    } catch (err) {
      setError("Failed to load meeting details");
      setLoading(false);
    }
  };

  const handleJoinMeeting = () => {
    if (meetingUrl) {
      window.open(meetingUrl, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-hive-light-blue to-hive-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-10 h-10 border-4 border-gray-300 border-t-hive-purple rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-century font-semibold text-hive-black mb-2">
              Preparing Your Video Call
            </h2>
            <p className="text-hive-black/70">Loading meeting details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !meetingUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-hive-light-blue to-hive-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">❌</span>
            </div>
            <h2 className="text-xl font-century font-semibold text-hive-black mb-2">
              Video Session Not Available
            </h2>
            <p className="text-hive-black/70 mb-4">{error || "Meeting link not found"}</p>
            <Button onClick={() => (window.location.href = "/portal")} variant="outline">
              Return to Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-hive-light-blue to-hive-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 text-2xl">📧</span>
          </div>

          <h2 className="text-xl font-century font-semibold text-hive-black mb-2">
            {type === "introduction-call"
              ? "Introduction Call Confirmed"
              : "Video Session Confirmed"}
          </h2>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-800 mb-3">Check Your Email</h3>
            <p className="text-green-700 text-sm mb-4">
              We've sent you a confirmation email with your meeting details and calendar invite. The
              email contains everything you need to join your session.
            </p>

            <div className="bg-white border border-green-300 rounded-lg p-3">
              <p className="text-green-800 text-sm font-medium mb-2">What's in your email:</p>
              <ul className="text-green-700 text-xs space-y-1 text-left">
                <li>• Calendar invite with meeting details</li>
                <li>• Step-by-step joining instructions</li>
                <li>• Meeting code for manual access</li>
                <li>• Contact information for support</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-700 text-sm">
              <strong>Recommended:</strong> Click "Add to Calendar" in your email, then join the
              meeting from your calendar at the scheduled time for the best experience.
            </p>
          </div>

          <Button
            onClick={() => (window.location.href = "/portal")}
            variant="outline"
            className="w-full"
          >
            Return to Portal
          </Button>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-hive-black/60">
              Need help? Contact{" "}
              <a href="mailto:support@hive-wellness.co.uk" className="text-hive-purple underline">
                support@hive-wellness.co.uk
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
