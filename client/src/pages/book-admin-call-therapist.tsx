import { useState, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Clock, CheckCircle, UserCheck } from "lucide-react";
import { format } from "date-fns";

interface BookingFormData {
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

export default function BookAdminCallTherapist() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<BookingFormData>({
    name: "",
    email: "",
    phone: "",
    message: "",
    preferredDate: undefined,
    preferredTime: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // Pre-fill email if provided via URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const therapistEmail = urlParams.get("email");

    if (therapistEmail) {
      setFormData((prev) => ({
        ...prev,
        email: decodeURIComponent(therapistEmail),
      }));
    }
  }, []);

  // Remove loading screen after component mounts
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
        `/api/calendar/public-availability?date=${format(date, "dd-MM-yyyy")}`
      );
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.slots || []);

        // Enhanced toast notification with integration details
        const summary = data.summary || {};
        const availableCount = summary.availableSlots || 0;
        const totalSlots = summary.totalSlots || 0;

        if (availableCount > 0) {
          toast({
            title: "Live Calendar Loaded",
            description: `${availableCount} of ${totalSlots} time slots available on ${format(date, "MMM d")} • Direct admin integration`,
          });
        } else {
          toast({
            title: "No Availability",
            description: `All ${totalSlots} time slots are booked on ${format(date, "MMM d")} • Try another date`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Calendar Integration Error",
          description: "Unable to connect to admin calendar system. Please refresh and try again.",
        });
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error("Failed to load availability:", error);
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: "Calendar integration temporarily unavailable. Please check your connection.",
      });
      setAvailableSlots([]);
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
          userType: "therapist",
          source: "therapist_booking_widget",
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
          toast({
            title: "Time Slot Unavailable",
            description: errorData.conflictReason || "This time slot is no longer available",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Booking Failed",
            description: errorData.error || "Please try again",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Please check your connection and try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderBottomColor: "#9306B1" }}
        ></div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 mx-auto mb-6" style={{ color: "#9306B1" }} />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Call Booked Successfully!</h1>
          <p className="text-gray-600 mb-6">
            Thanks for booking your call! Further details will be emailed to you.
          </p>
          <div
            className="border rounded-lg p-4 mb-6"
            style={{ backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" }}
          >
            <h3 className="font-semibold mb-2" style={{ color: "#9306B1" }}>
              Next Steps:
            </h3>
            <ul className="text-sm text-gray-700 space-y-1 text-left">
              <li>• You'll receive a calendar invitation with call details</li>
              <li>• We'll contact you if any changes are needed</li>
              <li>• Please check your email for confirmation</li>
            </ul>
          </div>
          <p className="text-sm text-gray-500">
            Questions? Contact us at{" "}
            <span style={{ color: "#9306B1" }}>support@hive-wellness.co.uk</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="text-white p-6" style={{ background: "#9306B1" }}>
          <h1 className="text-2xl font-bold mb-2">Join Our Therapist Network</h1>
          <p className="opacity-90">
            Book a consultation to discuss your application and learn about our platform
          </p>
        </div>

        {/* Therapist Type Indicator */}
        <div className="p-6 bg-purple-50 border-b">
          <div className="flex items-center gap-2">
            <UserCheck className="w-6 h-6" style={{ color: "#9306B1" }} />
            <span className="font-medium" style={{ color: "#9306B1" }}>
              Therapist Application
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name and Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
                className="mt-1"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Calendar */}
          <div>
            <Label>Preferred Date *</Label>
            <div className="mt-1 border rounded-lg p-3">
              <Calendar
                mode="single"
                selected={formData.preferredDate}
                onSelect={(date) => handleInputChange("preferredDate", date)}
                disabled={(date) => date < new Date() || date.getDay() === 0 || date.getDay() === 6}
                className="rounded-md"
              />
            </div>
          </div>

          {/* Time Slots */}
          <div>
            <Label>Preferred Time *</Label>
            <div className="mt-1">
              {!formData.preferredDate ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>Please select a date first to view available time slots</p>
                </div>
              ) : isLoadingAvailability ? (
                <div className="text-center py-8">
                  <div
                    className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2"
                    style={{ borderBottomColor: "#9306B1" }}
                  ></div>
                  <p className="text-gray-500">Loading available times...</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot.time}
                      type="button"
                      variant={formData.preferredTime === slot.time ? "default" : "outline"}
                      size="sm"
                      disabled={!slot.isAvailable}
                      onClick={() => handleInputChange("preferredTime", slot.time)}
                      className={`
                        ${!slot.isAvailable ? "opacity-50 cursor-not-allowed" : ""}
                        ${formData.preferredTime === slot.time ? "text-white" : ""}
                      `}
                      style={
                        formData.preferredTime === slot.time ? { backgroundColor: "#9306B1" } : {}
                      }
                    >
                      {slot.time}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="message">Tell Us About Your Practice</Label>
            <Textarea
              id="message"
              placeholder="Briefly describe your qualifications, experience, and areas of speciality..."
              value={formData.message}
              onChange={(e) => handleInputChange("message", e.target.value)}
              className="mt-1 min-h-[100px]"
            />
          </div>

          {/* What to Expect */}
          <div
            className="border rounded-lg p-4"
            style={{ backgroundColor: "#F9F5FF", borderColor: "#E0E7FF" }}
          >
            <h3 className="font-semibold mb-2" style={{ color: "#9306B1" }}>
              What to Expect:
            </h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Discussion of your qualifications and experience</li>
              <li>• Overview of our platform and client matching process</li>
              <li>• Details about our 85% therapist payment structure</li>
              <li>• Next steps in the application process</li>
            </ul>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              !formData.name ||
              !formData.email ||
              !formData.preferredDate ||
              !formData.preferredTime
            }
            className="w-full text-white py-3"
            style={{ backgroundColor: "#9306B1" }}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Confirming Booking...
              </>
            ) : (
              <>
                <CalendarIcon className="h-4 w-4 mr-2" />
                Book Application Consultation
              </>
            )}
          </Button>

          <p className="text-center text-sm text-gray-500">
            Questions? Contact us at{" "}
            <span style={{ color: "#9306B1" }}>support@hive-wellness.co.uk</span>
          </p>
        </form>
      </div>
    </div>
  );
}
