import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  Loader2,
  User,
  Mail,
  Phone,
  MessageSquare,
} from "lucide-react";

interface BookingData {
  name: string;
  email: string;
  phone: string;
  message: string;
  preferredDate: Date | undefined;
  preferredTime: string;
}

interface AvailabilitySlot {
  time: string;
  isAvailable: boolean;
  conflictReason?: string;
}

interface AvailabilitySummary {
  availableSlots: number;
  bookedSlots: number;
  blockedSlots: number;
  totalSlots: number;
}

export function StreamlinedBookingWidget() {
  const { toast } = useToast();
  const [bookingData, setBookingData] = useState<BookingData>({
    name: "",
    email: "",
    phone: "",
    message: "",
    preferredDate: undefined,
    preferredTime: "",
  });

  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [availabilitySummary, setAvailabilitySummary] = useState<AvailabilitySummary | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (field: keyof BookingData, value: string | Date | undefined) => {
    setBookingData((prev) => ({ ...prev, [field]: value }));

    // Auto-load availability when date changes
    if (field === "preferredDate" && value instanceof Date) {
      loadAvailability(value);
    }
  };

  const loadAvailability = async (date: Date) => {
    setIsLoadingAvailability(true);
    try {
      const response = await fetch(
        `/api/admin/calendar/availability?date=${format(date, "yyyy-MM-dd")}`
      );
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.slots || []);
        setAvailabilitySummary(data.summary || null);
      } else {
        setAvailableSlots([]);
        setAvailabilitySummary(null);
        toast({
          variant: "destructive",
          title: "Calendar Error",
          description: "Unable to load availability for this date.",
        });
      }
    } catch (error) {
      setAvailableSlots([]);
      setAvailabilitySummary(null);
      console.error("Availability error:", error);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !bookingData.name ||
      !bookingData.email ||
      !bookingData.preferredDate ||
      !bookingData.preferredTime
    ) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please complete all required fields",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/introduction-calls/book-widget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: bookingData.name,
          email: bookingData.email,
          phone: bookingData.phone,
          message: bookingData.message,
          preferredDate: format(bookingData.preferredDate, "yyyy-MM-dd"),
          preferredTime: bookingData.preferredTime,
          userType: "client",
          source: "streamlined_booking_widget",
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        toast({
          title: "Booking Confirmed!",
          description: "Your consultation has been scheduled. Check your email for details.",
        });
      } else {
        const errorData = await response.json();
        toast({
          variant: "destructive",
          title: "Booking Failed",
          description: errorData.error || "Please try again or contact support",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Unable to process booking. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-8">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Booking Confirmed!</h3>
            <p className="text-gray-600 mb-4">
              Your consultation is scheduled for{" "}
              {bookingData.preferredDate && format(bookingData.preferredDate, "MMMM d, yyyy")} at{" "}
              {bookingData.preferredTime}.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                Confirmation emails sent to you and our team • Meeting link included
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Book Your Free Initial Consultation
        </CardTitle>
        <CardDescription className="text-purple-100">
          Direct integration with admin calendar • Real-time availability • No double bookings
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name *
              </Label>
              <Input
                id="name"
                value={bookingData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={bookingData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={bookingData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>
            <div>
              <Label htmlFor="message" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                How Can We Help?
              </Label>
              <Textarea
                id="message"
                value={bookingData.message}
                onChange={(e) => handleInputChange("message", e.target.value)}
                placeholder="Tell us briefly about your needs..."
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Date and Time Selection - Stacked Layout to Fix Overlapping */}
          <div className="space-y-8">
            {/* Calendar Section - Full Width */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Select Date *</Label>
              <div className="border rounded-lg p-4 bg-white max-w-fit mx-auto">
                <Calendar
                  mode="single"
                  selected={bookingData.preferredDate}
                  onSelect={(date) => handleInputChange("preferredDate", date)}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  className="w-full"
                />
              </div>
              {availabilitySummary && bookingData.preferredDate && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-center">
                  <div className="text-sm text-blue-800">
                    <strong>{availabilitySummary.availableSlots}</strong> available slots •
                    <span className="ml-1">{availabilitySummary.bookedSlots} booked • </span>
                    <span className="text-blue-600">
                      {format(bookingData.preferredDate, "EEEE, MMM d")}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Time Slots Section - Full Width */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                Available Time Slots *
                <Badge variant="outline" className="text-xs">
                  Live
                </Badge>
              </Label>

              {!bookingData.preferredDate ? (
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">Select a date to see available times</p>
                </div>
              ) : isLoadingAvailability ? (
                <div className="border rounded-lg p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-600" />
                  <p className="text-gray-600">Loading live availability...</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="border rounded-lg p-8 text-center">
                  <div className="text-yellow-600 mb-2">
                    <Clock className="h-8 w-8 mx-auto" />
                  </div>
                  <p className="text-yellow-800 font-medium">No availability</p>
                  <p className="text-yellow-600 text-sm">Please try another date</p>
                </div>
              ) : (
                <div className="border rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        type="button"
                        variant={bookingData.preferredTime === slot.time ? "default" : "outline"}
                        size="sm"
                        disabled={!slot.isAvailable}
                        onClick={() => handleInputChange("preferredTime", slot.time)}
                        className={`
                          ${!slot.isAvailable ? "opacity-40" : "hover:scale-105 transition-transform"}
                          ${bookingData.preferredTime === slot.time ? "bg-purple-600 text-white" : ""}
                          ${slot.isAvailable && bookingData.preferredTime !== slot.time ? "border-green-300" : ""}
                        `}
                      >
                        <div className="text-center">
                          <div className="font-medium">{slot.time}</div>
                          <div className="text-xs">
                            {!slot.isAvailable ? "Booked" : "Available"}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* What to Expect */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">What to Expect:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Free 20-minute initial consultation</li>
              <li>• Learn about our therapy services</li>
              <li>• Discuss your needs and goals</li>
              <li>• No obligation to continue</li>
            </ul>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              !bookingData.name ||
              !bookingData.email ||
              !bookingData.preferredDate ||
              !bookingData.preferredTime
            }
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Confirming Booking...
              </>
            ) : (
              <>
                <CalendarIcon className="h-4 w-4 mr-2" />
                Book Free Consultation
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
