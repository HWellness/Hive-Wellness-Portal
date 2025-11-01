import { useState, FormEvent } from "react";
import { fetchApi } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

interface FormData {
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

export default function BookAdminCallClientNew() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    message: "",
    preferredDate: undefined,
    preferredTime: "",
  });

  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof FormData, value: string | Date | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "preferredDate" && value instanceof Date) {
      loadAvailability(value);
    }
  };

  const loadAvailability = async (date: Date) => {
    setIsLoadingAvailability(true);
    try {
      const response = await fetchApi(
        `/api/available-time-slots?date=${format(date, "yyyy-MM-dd")}`
      );
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.availableSlots || []);

        // Enhanced toast notification with integration details
        const availableCount = (data.availableSlots || []).filter(
          (slot: AvailabilitySlot) => slot.isAvailable
        ).length;
        const totalSlots = (data.availableSlots || []).length;

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
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetchApi("/api/introduction-calls/book-widget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          preferredDate: format(formData.preferredDate, "yyyy-MM-dd"),
          preferredTime: formData.preferredTime,
          userType: "client",
          source: "client_booking_widget",
        }),
      });

      if (response.ok) {
        toast({
          title: "Booking Confirmed!",
          description: "We'll send you a confirmation email shortly.",
        });
        // Reset form
        setFormData({
          name: "",
          email: "",
          phone: "",
          message: "",
          preferredDate: undefined,
          preferredTime: "",
        });
        setAvailableSlots([]);
      } else {
        throw new Error("Booking failed");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: "Please try again or contact support.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header Section */}
          <div className="text-white px-8 py-12 text-center" style={{ background: "#9306B1" }}>
            <h1 className="text-3xl font-bold mb-4">Book Your Free Initial Chat</h1>
            <p className="text-lg opacity-90">
              Book a consultation to discuss your application and learn about our platform
            </p>
          </div>

          {/* Calendar Integration Indicator */}
          <div className="p-6 bg-green-50 border-b border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CalendarIcon className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <span className="text-green-800 font-medium block">
                    Direct Calendar Integration
                  </span>
                  <span className="text-green-600 text-xs">
                    Real-time availability • No double bookings
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-700 font-medium">LIVE</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Name and Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
              />
            </div>

            {/* Preferred Date */}
            <div className="space-y-2">
              <Label>Preferred Date *</Label>
              <div className="border rounded-lg p-4 bg-gray-50">
                <Calendar
                  mode="single"
                  selected={formData.preferredDate}
                  onSelect={(date) => handleInputChange("preferredDate", date)}
                  disabled={(date) =>
                    date < new Date() || date.getDay() === 0 || date.getDay() === 6
                  }
                  className="mx-auto"
                />
              </div>
            </div>

            {/* Preferred Time */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Preferred Time *
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  Live Calendar
                </span>
              </Label>
              <div className="border rounded-lg p-4 bg-gray-50">
                {!formData.preferredDate ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>Please select a date first to view available time slots</p>
                  </div>
                ) : isLoadingAvailability ? (
                  <div className="text-center py-8">
                    <div
                      className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2"
                      style={{ borderBottomColor: "#9306B1" }}
                    ></div>
                    <p className="text-gray-700">Checking availability...</p>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-700 font-medium">No availability on this date</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Please try selecting a different date
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-800 font-medium">
                          {availableSlots.filter((slot) => slot.isAvailable).length} available slots
                        </span>
                        <span className="text-green-600">
                          on {format(formData.preferredDate, "MMM d")} • 20-minute sessions
                        </span>
                      </div>
                    </div>
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
                            relative
                            ${!slot.isAvailable ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-400" : "hover:scale-105 transition-transform"}
                            ${formData.preferredTime === slot.time ? "text-white shadow-lg" : ""}
                            ${slot.isAvailable && formData.preferredTime !== slot.time ? "border-green-300 hover:border-green-400" : ""}
                          `}
                          style={
                            formData.preferredTime === slot.time
                              ? { backgroundColor: "#9306B1" }
                              : {}
                          }
                        >
                          <div className="flex flex-col items-center">
                            <span className="font-medium">{slot.time}</span>
                            {!slot.isAvailable ? (
                              <span className="text-xs text-red-500 mt-0.5">Booked</span>
                            ) : formData.preferredTime === slot.time ? (
                              <span className="text-xs opacity-90 mt-0.5">Selected</span>
                            ) : (
                              <span className="text-xs text-green-600 mt-0.5">Available</span>
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tell Us About Your Practice */}
            <div className="space-y-2">
              <Label htmlFor="message">Tell Us About Your Practice</Label>
              <Textarea
                id="message"
                placeholder="Briefly describe your qualifications, experience, and areas of speciality..."
                value={formData.message}
                onChange={(e) => handleInputChange("message", e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            {/* What to Expect */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">What to Expect:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Free 15-30 minute initial consultation</li>
                <li>• Learn about our therapy services and approach</li>
                <li>• Discuss your needs and goals</li>
                <li>• No obligation or pressure to continue</li>
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
                  Request Free Consultation
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
    </div>
  );
}
