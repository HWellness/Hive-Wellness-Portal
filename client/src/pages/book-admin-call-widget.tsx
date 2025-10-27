import { useState, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface BookingFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
  preferredDate: Date | undefined;
  preferredTime: string;
  userType: "client" | "therapist";
}

const timeSlots = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
];

interface AvailabilitySlot {
  time: string;
  isAvailable: boolean;
  conflictReason?: string;
}

export default function BookAdminCallWidget() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<BookingFormData>({
    name: "",
    email: "",
    phone: "",
    message: "",
    preferredDate: undefined,
    preferredTime: "",
    userType: "client", // Default to client
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // Detect user type from URL parameters and pre-fill email if provided
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get("type");
    const therapistEmail = urlParams.get("therapist");

    if (type === "therapist") {
      setFormData((prev) => ({
        ...prev,
        userType: "therapist",
        email: therapistEmail ? decodeURIComponent(therapistEmail) : "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, userType: "client" }));
    }
  }, []);

  // Remove loading screen after component mounts to prevent 404 flash
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (field: keyof BookingFormData, value: string | Date | undefined) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // When date changes, load availability for that date
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
      } else {
        setAvailableSlots([]);
        toast({
          variant: "destructive",
          title: "Calendar Error",
          description: "Unable to load availability for this date.",
        });
      }
    } catch (error) {
      setAvailableSlots([]);
      console.error("Availability error:", error);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.preferredDate || !formData.preferredTime) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/introduction-calls/book-widget", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          preferredDate: format(formData.preferredDate, "yyyy-MM-dd"),
          preferredTime: formData.preferredTime,
          userType: formData.userType,
          source: "wordpress_widget",
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        toast({
          title: "Booking Confirmed!",
          description: "Confirmation emails sent to you and our team",
        });
      } else {
        const errorData = await response.json();
        if (response.status === 409) {
          // Time slot conflict
          toast({
            title: "Time Slot Unavailable",
            description: `This time slot is already booked. Please select a different time.`,
            variant: "destructive",
          });
        } else if (response.status === 400) {
          // Validation error
          toast({
            title: "Missing Information",
            description: "Please fill in all required fields and try again.",
            variant: "destructive",
          });
        } else {
          // Generic error
          toast({
            title: "Booking Failed",
            description: errorData.error || "Please try again or contact us directly",
            variant: "destructive",
          });
        }
        return;
      }
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: "Please try again or contact us directly",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-purple-600 font-medium">Loading booking form...</p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Request Received</h2>
            <p className="text-gray-600 mb-6">
              Thank you for your interest in Hive Wellness. Our team will review your request and
              contact you within 24 hours to confirm your appointment.
            </p>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-700">
                <strong>Next Steps:</strong>
                <br />
                • We'll call or email you to confirm the appointment
                <br />
                • The initial consultation is completely free
                <br />• Duration: 15-30 minutes
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 text-white" style={{ background: "#9306B1" }}>
            <h1 className="text-2xl font-bold mb-2">Book Your Free Initial Chat</h1>
            <p className="opacity-90">
              Speak with our team about how Hive Wellness can support your mental health journey
            </p>
          </div>

          {/* User Type Indicator */}
          <div className="p-4 bg-purple-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    formData.userType === "therapist"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {formData.userType === "therapist"
                    ? "👩‍⚕️ Therapist Application"
                    : "👤 Client Enquiry"}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.userType === "client" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleInputChange("userType", "client")}
                >
                  I'm a Client
                </Button>
                <Button
                  type="button"
                  variant={formData.userType === "therapist" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleInputChange("userType", "therapist")}
                >
                  I'm a Therapist
                </Button>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6 text-gray-900">
            {/* Personal Information */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-900 font-medium">
                  Full Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-900 font-medium">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-900 font-medium">
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>

            {/* Date Selection - Fixed Layout */}
            <div className="space-y-3">
              <Label className="text-gray-900 font-medium">Preferred Date *</Label>
              <div className="border rounded-lg p-4 bg-white max-w-fit mx-auto">
                <Calendar
                  mode="single"
                  selected={formData.preferredDate}
                  onSelect={(date) => handleInputChange("preferredDate", date)}
                  disabled={(date) =>
                    date < new Date() || date.getDay() === 0 || date.getDay() === 6
                  }
                  className="rounded-md w-full"
                />
              </div>
            </div>

            {/* Time Selection - Fixed Layout */}
            <div className="space-y-3">
              <Label className="text-gray-900 font-medium">Preferred Time *</Label>
              {formData.preferredDate ? (
                <div className="space-y-2">
                  {isLoadingAvailability ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                      <span className="ml-2 text-sm text-gray-800 font-medium">
                        Loading availability...
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                      {timeSlots.map((time) => {
                        const slotInfo = availableSlots.find((slot) => slot.time === time);
                        const isAvailable = slotInfo?.isAvailable !== false;
                        const isSelected = formData.preferredTime === time;

                        return (
                          <Button
                            key={time}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            disabled={!isAvailable}
                            onClick={() => isAvailable && handleInputChange("preferredTime", time)}
                            className={`text-sm transition-all ${
                              !isAvailable
                                ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 hover:bg-gray-100 hover:text-gray-400"
                                : isSelected
                                  ? "bg-purple-600 hover:bg-purple-700"
                                  : "hover:bg-purple-50 hover:border-purple-300"
                            }`}
                            title={
                              !isAvailable
                                ? `Unavailable: ${slotInfo?.conflictReason || "Slot booked"}`
                                : `Available at ${time}`
                            }
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            {time}
                            {!isAvailable && <span className="ml-1 text-xs">✕</span>}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-gray-700 mt-2 font-medium">
                    Greyed-out times are unavailable. Select an available time slot.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-700 p-4 border border-dashed border-gray-300 rounded-lg text-center font-medium">
                  Please select a date first to view available time slots
                </p>
              )}
            </div>

            {/* Message - Fixed Spacing */}
            <div className="space-y-3">
              <Label htmlFor="message" className="text-gray-900 font-medium">
                How Can We Help?
              </Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => handleInputChange("message", e.target.value)}
                placeholder="Tell us briefly about what you're looking for or any questions you have..."
                rows={4}
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What to Expect:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Free 15-30 minute initial consultation</li>
                <li>• Learn about our therapy services and approach</li>
                <li>• Discuss your needs and goals</li>
                <li>• No obligation or pressure to continue</li>
              </ul>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Request Free Consultation
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 text-center">
            <p className="text-sm text-gray-600">
              Questions? Contact us at{" "}
              <a
                href="mailto:support@hive-wellness.co.uk"
                className="text-purple-600 hover:underline"
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
