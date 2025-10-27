import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Video, Mail, Phone, User } from "lucide-react";

interface BookingManagementPanelProps {
  onBookingUpdate?: () => void;
}

export const BookingManagementPanel: React.FC<BookingManagementPanelProps> = ({
  onBookingUpdate,
}) => {
  const [isBooking, setIsBooking] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [availabilityResult, setAvailabilityResult] = useState<any>(null);

  const [bookingData, setBookingData] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    sessionDate: new Date().toISOString().split("T")[0],
    sessionTime: "10:00",
    duration: 60,
    sessionType: "Therapy Session",
    notes: "",
  });

  const bookSession = async () => {
    // Validate required fields
    if (!bookingData.clientName || !bookingData.clientEmail) {
      setBookingResult({
        success: false,
        error: "Validation error",
        message: "Client name and email are required",
      });
      return;
    }

    setIsBooking(true);
    setBookingResult(null);

    try {
      const response = await fetch("/api/sessions/book-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          therapistId: "therapist-001",
          clientId: `client-${Date.now()}`,
          clientName: bookingData.clientName,
          clientEmail: bookingData.clientEmail,
          clientPhone: bookingData.clientPhone || "",
          date: bookingData.sessionDate,
          time: bookingData.sessionTime,
          duration: bookingData.duration,
          sessionType: bookingData.sessionType,
          notes: bookingData.notes,
          bookedBy: "admin",
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      setBookingResult(result);

      if (result.success) {
        // Clear form on successful booking
        setBookingData({
          clientName: "",
          clientEmail: "",
          clientPhone: "",
          sessionDate: new Date().toISOString().split("T")[0],
          sessionTime: "10:00",
          duration: 60,
          sessionType: "Therapy Session",
          notes: "",
        });
        onBookingUpdate?.();
      }
    } catch (error) {
      console.error("Booking error:", error);
      setBookingResult({
        success: false,
        error: "Network error",
        message: error instanceof Error ? error.message : "Unknown error",
        details: `Please check network connectivity and try again. Error: ${error}`,
      });
    } finally {
      setIsBooking(false);
    }
  };

  const checkAvailability = async () => {
    setIsCheckingAvailability(true);
    setAvailabilityResult(null);

    try {
      const response = await fetch(
        `/api/therapists/therapist-001/availability?date=${bookingData.sessionDate}`
      );
      const result = await response.json();
      setAvailabilityResult({
        success: true,
        date: bookingData.sessionDate,
        availableSlots: result.slots || [],
      });
    } catch (error) {
      setAvailabilityResult({
        success: false,
        error: "Network error",
        availableSlots: [],
      });
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Google Calendar Booking Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Booking Section */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-lg">Book New Session</h3>
            <p className="text-sm text-muted-foreground">
              Create a new therapy session with Google Calendar integration and Gmail notifications.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  placeholder="Enter client name"
                  value={bookingData.clientName}
                  onChange={(e) =>
                    setBookingData((prev) => ({ ...prev, clientName: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="clientEmail">Client Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="client@example.com"
                  value={bookingData.clientEmail}
                  onChange={(e) =>
                    setBookingData((prev) => ({ ...prev, clientEmail: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="clientPhone">Client Phone (Optional)</Label>
                <Input
                  id="clientPhone"
                  type="tel"
                  placeholder="+44 7700 900123"
                  value={bookingData.clientPhone}
                  onChange={(e) =>
                    setBookingData((prev) => ({ ...prev, clientPhone: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="sessionDate">Session Date</Label>
                <Input
                  id="sessionDate"
                  type="date"
                  value={bookingData.sessionDate}
                  onChange={(e) =>
                    setBookingData((prev) => ({ ...prev, sessionDate: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="sessionTime">Session Time</Label>
                <Input
                  id="sessionTime"
                  type="time"
                  value={bookingData.sessionTime}
                  onChange={(e) =>
                    setBookingData((prev) => ({ ...prev, sessionTime: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes">Session Notes (Optional)</Label>
                <Input
                  id="notes"
                  placeholder="Any additional notes for the session"
                  value={bookingData.notes}
                  onChange={(e) => setBookingData((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={bookSession}
                disabled={isBooking || !bookingData.clientName || !bookingData.clientEmail}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
              >
                <Video className="w-4 h-4" />
                {isBooking ? "Creating Booking..." : "Book Session"}
              </Button>

              <Button
                variant="outline"
                onClick={checkAvailability}
                disabled={isCheckingAvailability}
                className="flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                {isCheckingAvailability ? "Checking..." : "Check Availability"}
              </Button>
            </div>
          </div>

          {/* Booking Results */}
          {bookingResult && (
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">Booking Result</h4>
              {bookingResult.success ? (
                <div className="space-y-2">
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    ✅ Success
                  </Badge>
                  <div className="bg-green-50 p-3 rounded text-sm">
                    <p>
                      <strong>Session ID:</strong> {bookingResult.sessionId}
                    </p>
                    <p>
                      <strong>Meeting URL:</strong>{" "}
                      <a
                        href={bookingResult.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {bookingResult.meetingUrl}
                      </a>
                    </p>
                    <p>
                      <strong>Scheduled Time:</strong>{" "}
                      {new Date(bookingResult.scheduledTime).toLocaleString()}
                    </p>
                    <p className="mt-2 text-green-700">{bookingResult.message}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Badge variant="destructive">❌ Failed</Badge>
                  <div className="bg-red-50 p-3 rounded text-sm text-red-700">
                    <p>
                      <strong>Error:</strong> {bookingResult.error}
                    </p>
                    <p>{bookingResult.message}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Availability Results */}
          {availabilityResult && (
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">Availability Check Result</h4>
              {availabilityResult.success ? (
                <div className="space-y-2">
                  <Badge variant="default" className="bg-blue-100 text-blue-800">
                    📅 Available Slots for {availabilityResult.date}
                  </Badge>
                  <div className="bg-blue-50 p-3 rounded text-sm">
                    {availabilityResult.availableSlots?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {availabilityResult.availableSlots.map((slot: string) => (
                          <Badge key={slot} variant="outline" className="bg-white">
                            {slot}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">No available slots found for this date.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-700">
                  <p>Failed to check availability. Using fallback slots.</p>
                </div>
              )}
            </div>
          )}

          {/* Integration Status */}
          <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50">
            <h4 className="font-medium mb-3 text-purple-800">
              Google Workspace Integration Features
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-600" />
                <span>Google Calendar Events</span>
              </div>
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-green-600" />
                <span>Google Meet Integration</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-green-600" />
                <span>Gmail Notifications</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-green-600" />
                <span>Multi-party Attendees</span>
              </div>
            </div>
          </div>

          {/* Calendar Integration */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <h4 className="font-medium mb-3">Dedicated Hive Wellness Calendar</h4>
            <div className="space-y-3 text-sm">
              <div>
                <strong>Calendar Name:</strong> Hive Wellness Bookings
              </div>
              <div>
                <strong>Time Zone:</strong> UK Time (GMT+01:00)
              </div>
              <div>
                <strong>Organisation:</strong> hive-wellness.co.uk
              </div>
              <div className="bg-white p-3 rounded border">
                <iframe
                  src="https://calendar.google.com/calendar/embed?src=c_f820a68bf1f0a2fa89dc296fe000e5051fb07dd52d02077c65a3539ae2b387d3%40group.calendar.google.com&ctz=Europe%2FLondon&mode=WEEK&showTitle=0&showNav=1&showPrint=0&showCalendars=0"
                  style={{ border: 0 }}
                  width="100%"
                  height="400"
                  frameBorder="0"
                  scrolling="no"
                  title="Hive Wellness Bookings Calendar"
                />
              </div>
              <div className="text-xs text-gray-600">
                All bookings are automatically added to this dedicated calendar for
                support@hive-wellness.co.uk
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
