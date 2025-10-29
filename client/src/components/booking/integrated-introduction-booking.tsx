import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Calendar as CalendarIcon, Clock, User, Mail, CheckCircle } from "lucide-react";
import { format, addDays, isWeekend, isBefore, startOfDay } from "date-fns";

interface AdminAvailability {
  date: string;
  timeSlots: string[];
  blockedSlots: string[];
}

interface BookingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
  concerns: string;
  therapyType: string;
  urgency: string;
}

export default function IntegratedIntroductionBooking() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("");
  const [formData, setFormData] = useState<BookingFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    preferredDate: "",
    preferredTime: "",
    concerns: "",
    therapyType: "",
    urgency: "medium",
  });
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();

  // Get admin availability for the next 30 days
  const { data: availability = [], isLoading: loadingAvailability } = useQuery({
    queryKey: ["/api/admin/calendar/availability"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/calendar/availability");
      return response.json();
    },
  });

  // Book introduction call mutation
  const bookingMutation = useMutation({
    mutationFn: async (bookingData: BookingFormData) => {
      const response = await apiRequest("POST", "/api/book-introduction-call", bookingData);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: `Server error: ${response.status}` }));
        throw new Error(
          errorData.error || errorData.message || `Failed to book: ${response.status}`
        );
      }

      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Booking Confirmed",
        description:
          "Your free introduction call has been scheduled. You'll receive a confirmation email shortly.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/calendar/availability"] });
      setCurrentStep(4); // Success step
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "There was a problem scheduling your call. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate available time slots for selected date
  const getAvailableTimeSlots = (date: Date) => {
    if (!availability.length) return [];

    const dateStr = format(date, "yyyy-MM-dd");
    const dayAvailability = availability.find((day: AdminAvailability) => day.date === dateStr);

    if (!dayAvailability) {
      // Default business hours if no specific availability set
      return [
        "09:00",
        "09:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
        "14:00",
        "14:30",
        "15:00",
        "15:30",
        "16:00",
        "16:30",
      ];
    }

    return dayAvailability.timeSlots.filter((slot) => !dayAvailability.blockedSlots.includes(slot));
  };

  // Check if date is available for booking
  const isDateAvailable = (date: Date) => {
    if (isWeekend(date) || isBefore(date, startOfDay(new Date()))) return false;
    const availableSlots = getAvailableTimeSlots(date);
    return availableSlots.length > 0;
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime("");
    if (date) {
      setFormData((prev) => ({
        ...prev,
        preferredDate: format(date, "yyyy-MM-dd"),
      }));
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setFormData((prev) => ({
      ...prev,
      preferredTime: time,
    }));
  };

  const handleInputChange = (field: keyof BookingFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return formData.firstName && formData.lastName && formData.email && formData.phone;
      case 2:
        return formData.concerns && formData.therapyType;
      case 3:
        return selectedDate && selectedTime;
      default:
        return false;
    }
  };

  const handleSubmit = () => {
    if (!canProceedToNextStep() && currentStep < 4) return;

    if (currentStep === 3) {
      bookingMutation.mutate(formData);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  if (currentStep === 4) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-600 mb-4">
            Your free 15-minute introduction call has been scheduled for{" "}
            <strong>
              {format(selectedDate!, "EEEE, MMMM do")} at {selectedTime}
            </strong>
          </p>
          <div className="bg-purple-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-purple-900 mb-2">What Happens Next?</h3>
            <div className="text-sm text-purple-800 space-y-2 text-left">
              <p>Use the information above to join the Video call for the time you booked.</p>
              <p>
                A member of our team will join you on the call to get to know you and to get a
                better understanding of how we may best support you.
              </p>
              <p>We'll match you with the perfect therapist for your needs.</p>
              <p>
                Once you are matched with a Therapist, you will be able to book sessions with them.
                Your Therapist may also choose to message you to help further.
              </p>
            </div>
          </div>
          <Button
            onClick={() => (window.location.href = "/")}
            className="bg-hive-purple hover:bg-hive-purple/90"
          >
            Return to Homepage
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Your Free Introduction Call</h1>
        <p className="text-gray-600">
          Schedule a 30-minute consultation with our team to discuss how we can support your
          wellness journey.
        </p>

        {/* Progress indicator */}
        <div className="flex items-center justify-center mt-6 space-x-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep ? "bg-hive-purple text-white" : "bg-gray-200 text-gray-600"
                }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div
                  className={`w-16 h-1 mx-2 ${
                    step < currentStep ? "bg-hive-purple" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-2 text-sm text-gray-600">
          {currentStep === 1 && "Personal Information"}
          {currentStep === 2 && "Tell Us About Your Needs"}
          {currentStep === 3 && "Choose Your Appointment Time"}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-hive-purple" />
                <h2 className="text-xl font-semibold">Personal Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="mt-1"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="mt-1"
                  placeholder="+44 7XXX XXXXXX"
                />
              </div>
            </div>
          )}

          {/* Step 2: Therapy Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-5 h-5 text-hive-purple" />
                <h2 className="text-xl font-semibold">Tell Us About Your Needs</h2>
              </div>

              <div>
                <Label htmlFor="concerns">What brings you to therapy? *</Label>
                <Textarea
                  id="concerns"
                  value={formData.concerns}
                  onChange={(e) => handleInputChange("concerns", e.target.value)}
                  className="mt-1"
                  rows={4}
                  placeholder="Briefly describe what you'd like support with..."
                />
              </div>

              <div>
                <Label htmlFor="therapyType">Preferred Therapy Type *</Label>
                <Select
                  value={formData.therapyType}
                  onValueChange={(value) => handleInputChange("therapyType", value)}
                >
                  <SelectTrigger className="mt-1" data-testid="select-therapy-type">
                    <SelectValue placeholder="Select therapy type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual Therapy</SelectItem>
                    <SelectItem value="couples">Couples Therapy</SelectItem>
                    <SelectItem value="family">Family Therapy</SelectItem>
                    <SelectItem value="group">Group Therapy</SelectItem>
                    <SelectItem value="not-sure">Not Sure / Need Guidance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="urgency">How urgently do you need support?</Label>
                <Select
                  value={formData.urgency}
                  onValueChange={(value) => handleInputChange("urgency", value)}
                >
                  <SelectTrigger className="mt-1" data-testid="select-urgency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Within the next month</SelectItem>
                    <SelectItem value="medium">Within the next week</SelectItem>
                    <SelectItem value="high">Within the next few days</SelectItem>
                    <SelectItem value="urgent">I need immediate support</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Date and Time Selection */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="w-5 h-5 text-hive-purple" />
                <h2 className="text-xl font-semibold">Choose Your Appointment Time</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Calendar */}
                <div>
                  <Label className="text-sm font-medium">Select Date</Label>
                  <div className="mt-2">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      disabled={(date) => !isDateAvailable(date)}
                      fromDate={new Date()}
                      toDate={addDays(new Date(), 30)}
                      className="rounded-md border"
                    />
                  </div>
                  {loadingAvailability && (
                    <p className="text-sm text-gray-500 mt-2">Loading availability...</p>
                  )}
                </div>

                {/* Time Slots */}
                <div>
                  <Label className="text-sm font-medium">Available Times</Label>
                  {selectedDate ? (
                    <div className="mt-2 grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                      {getAvailableTimeSlots(selectedDate).map((time) => (
                        <Button
                          key={time}
                          variant={selectedTime === time ? "default" : "outline"}
                          className={`text-sm ${
                            selectedTime === time
                              ? "bg-hive-purple hover:bg-hive-purple/90"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => handleTimeSelect(time)}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {time}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 p-4 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                      Please select a date to see available times
                    </div>
                  )}

                  {selectedDate && selectedTime && (
                    <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-800">
                        <strong>Selected:</strong> {format(selectedDate, "EEEE, MMMM do")} at{" "}
                        {selectedTime}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              data-testid="button-previous"
            >
              Previous
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={!canProceedToNextStep() || bookingMutation.isPending}
              className="bg-hive-purple hover:bg-hive-purple/90"
              data-testid="button-next"
            >
              {bookingMutation.isPending
                ? "Booking..."
                : currentStep === 3
                  ? "Confirm Booking"
                  : "Next"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
