import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar as CalendarIcon, Video, Clock, User, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { format, addDays } from "date-fns";

interface Therapist {
  id: string;
  name: string;
  email: string;
  specialties: string[];
  availableHours: { start: number; end: number };
  timezone: string;
}

interface BookingFormData {
  therapistId: string;
  clientName: string;
  clientEmail: string;
  sessionDate: Date | null;
  sessionTime: string;
  duration: number;
  sessionType: string;
  notes?: string;
}

export function VideoSessionBooking() {
  const [formData, setFormData] = useState<BookingFormData>({
    therapistId: "",
    clientName: "",
    clientEmail: "",
    sessionDate: null,
    sessionTime: "",
    duration: 50,
    sessionType: "individual",
    notes: "",
  });

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  const { toast } = useToast();

  // Fetch therapists
  const { data: therapists, isLoading: loadingTherapists } = useQuery({
    queryKey: ["/api/therapists/available"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/therapists/available");
      return response.json();
    },
  });

  // Generate time slots when date/therapist changes
  useEffect(() => {
    if (formData.sessionDate && formData.therapistId) {
      generateAvailableSlots();
    }
  }, [formData.sessionDate, formData.therapistId]);

  const generateAvailableSlots = async () => {
    if (!formData.sessionDate || !formData.therapistId) return;

    try {
      const response = await apiRequest("POST", "/api/booking/available-slots", {
        therapistId: formData.therapistId,
        date: formData.sessionDate.toISOString(),
        duration: formData.duration,
      });

      const slots = await response.json();
      setAvailableSlots(slots);
    } catch (error) {
      console.error("Error fetching available slots:", error);
      setAvailableSlots([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.therapistId ||
      !formData.sessionDate ||
      !formData.sessionTime ||
      !formData.clientName ||
      !formData.clientEmail
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsBooking(true);

    try {
      // Create the booking with Google Calendar integration
      const response = await apiRequest("POST", "/api/booking/create-video-session", {
        therapistId: formData.therapistId,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        sessionDate: formData.sessionDate.toISOString(),
        sessionTime: formData.sessionTime,
        duration: formData.duration,
        sessionType: formData.sessionType,
        notes: formData.notes || "",
      });

      if (response.ok) {
        const booking = await response.json();

        toast({
          title: "Session Booked Successfully!",
          description: `Google Calendar event created with Meet link. Confirmation sent to ${formData.clientEmail}`,
        });

        // Show booking details
        showBookingConfirmation(booking);

        // Reset form
        setFormData({
          therapistId: "",
          clientName: "",
          clientEmail: "",
          sessionDate: null,
          sessionTime: "",
          duration: 50,
          sessionType: "individual",
          notes: "",
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to create booking");
      }
    } catch (error: any) {
      console.error("Booking error:", error);
      toast({
        title: "Booking Failed",
        description: error.message || "Unable to create session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
    }
  };

  const showBookingConfirmation = (booking: any) => {
    // Create a detailed confirmation dialog or redirect
    const confirmationMessage = `
Session Details:
• Date: ${format(new Date(booking.sessionDate), "PPP")}
• Time: ${booking.sessionTime}
• Duration: ${booking.duration} minutes
• Google Meet Link: ${booking.meetingUrl}
• Calendar Event: Created
• Email Confirmation: Sent
    `;

    toast({
      title: "Booking Confirmation",
      description: confirmationMessage,
      duration: 10000,
    });
  };

  const selectedTherapist = therapists?.find((t: Therapist) => t.id === formData.therapistId);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-purple-600" />
            Book Video Session
          </CardTitle>
          <CardDescription>
            Schedule a video therapy session with automatic Google Calendar and Meet integration
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, clientName: e.target.value }))}
                  placeholder="Enter client name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="clientEmail">Client Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, clientEmail: e.target.value }))
                  }
                  placeholder="client@example.com"
                  required
                />
              </div>
            </div>

            {/* Therapist Selection */}
            <div>
              <Label htmlFor="therapist">Select Therapist</Label>
              <Select
                value={formData.therapistId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, therapistId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a therapist" />
                </SelectTrigger>
                <SelectContent>
                  {loadingTherapists ? (
                    <SelectItem value="loading" disabled>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading therapists...
                    </SelectItem>
                  ) : (
                    therapists?.map((therapist: Therapist) => (
                      <SelectItem key={therapist.id} value={therapist.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {therapist.name}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {selectedTherapist && (
                <div className="mt-2 p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm font-medium">{selectedTherapist.name}</p>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {selectedTherapist.email}
                  </p>
                  <div className="flex gap-1 mt-1">
                    {selectedTherapist.specialties.map((specialty: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Session Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select
                  value={formData.duration.toString()}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, duration: parseInt(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50 minutes (Standard Session)</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sessionType">Session Type</Label>
                <Select
                  value={formData.sessionType}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, sessionType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual Session</SelectItem>
                    <SelectItem value="couples">Couples Therapy</SelectItem>
                    <SelectItem value="family">Family Therapy</SelectItem>
                    <SelectItem value="consultation">Initial Consultation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Selection */}
            <div>
              <Label>Session Date</Label>
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.sessionDate ? format(formData.sessionDate, "PPP") : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.sessionDate || undefined}
                    onSelect={(date) => {
                      setFormData((prev) => ({ ...prev, sessionDate: date || null }));
                      setShowCalendar(false);
                    }}
                    disabled={(date) => date < new Date() || date > addDays(new Date(), 90)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Selection */}
            {formData.sessionDate && formData.therapistId && (
              <div>
                <Label htmlFor="sessionTime">Available Times</Label>
                <Select
                  value={formData.sessionTime}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, sessionTime: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSlots.length > 0 ? (
                      availableSlots.map((slot, index) => (
                        <SelectItem key={index} value={slot}>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {slot}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-slots" disabled>
                        No available slots for this date
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Any specific requirements or notes..."
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={
                isBooking || !formData.therapistId || !formData.sessionDate || !formData.sessionTime
              }
            >
              {isBooking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Session...
                </>
              ) : (
                <>
                  <Video className="mr-2 h-4 w-4" />
                  Book Video Session
                </>
              )}
            </Button>
          </form>

          {isBooking && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-medium">Creating your session...</span>
              </div>
              <ul className="mt-2 text-sm text-blue-600 space-y-1">
                <li>• Creating Google Calendar event</li>
                <li>• Generating Google Meet link</li>
                <li>• Sending email confirmations</li>
                <li>• Setting up session details</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default VideoSessionBooking;
