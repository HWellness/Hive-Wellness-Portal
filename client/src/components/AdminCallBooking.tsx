import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AdminCallBookingProps {
  therapistEmail: string;
}

export function AdminCallBooking({ therapistEmail }: AdminCallBookingProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [isBooked, setIsBooked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Available time slots (admin availability - 9 AM to 8 PM)
  const timeSlots = [
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
    "17:00",
    "17:30",
    "18:00",
    "18:30",
    "19:00",
    "19:30",
    "20:00",
  ];

  const handleBookCall = async () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Missing Information",
        description: "Please select both a date and time for your introduction call.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const bookingData = {
        therapistEmail,
        date: selectedDate.toISOString().split("T")[0],
        time: selectedTime,
        timezone: "Europe/London",
      };

      const response = await apiRequest("POST", "/api/admin-call-booking", bookingData);

      if (response.ok) {
        setIsBooked(true);
        toast({
          title: "Call Booked Successfully!",
          description: "You will receive a confirmation email with meeting details.",
        });
      } else {
        throw new Error("Booking failed");
      }
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: "There was an error booking your call. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isBooked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-hive-purple">
              Call Booked Successfully!
            </CardTitle>
            <CardDescription>
              Your introduction call has been scheduled with the Hive Wellness team.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-purple-50 p-4">
              <h3 className="font-semibold text-hive-purple mb-2">What's Next?</h3>
              <ul className="space-y-2 text-sm">
                <li>✅ You'll receive a confirmation email with meeting details</li>
                <li>✅ Our team member will also be notified</li>
                <li>✅ After the call, we'll send your complete onboarding information</li>
                <li>✅ Check your calendar for the meeting invitation</li>
              </ul>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Questions? Contact us at{" "}
                <a
                  href="mailto:support@hive-wellness.co.uk"
                  className="text-hive-purple hover:underline"
                >
                  support@hive-wellness.co.uk
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-hive-purple">
            Book Your Introduction Call
          </CardTitle>
          <CardDescription className="text-lg">
            Schedule a 30-minute call with the Hive Wellness team to discuss your application
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8 md:grid-cols-2">
          {/* Calendar Selection */}
          <div>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <CalendarDays className="h-5 w-5 text-hive-purple" />
              Select a Date
            </h3>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today || date.getDay() === 0 || date.getDay() === 6; // Disable weekends
              }}
              className="rounded-md border"
            />
          </div>

          {/* Time Selection */}
          <div>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Clock className="h-5 w-5 text-hive-purple" />
              Select a Time
            </h3>
            {selectedDate ? (
              <div className="grid grid-cols-2 gap-2">
                {timeSlots.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    className={`justify-center ${
                      selectedTime === time
                        ? "bg-hive-purple hover:bg-hive-purple/90"
                        : "hover:border-hive-purple hover:text-hive-purple"
                    }`}
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Please select a date first</p>
            )}
          </div>

          {/* Booking Summary */}
          {selectedDate && selectedTime && (
            <div className="md:col-span-2">
              <Card className="border-hive-purple/20 bg-purple-50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-hive-purple mb-2">Booking Summary</h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Date:</strong>{" "}
                      {selectedDate.toLocaleDateString("en-GB", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p>
                      <strong>Time:</strong> {selectedTime} (Europe/London)
                    </p>
                    <p>
                      <strong>Duration:</strong> 15 minutes
                    </p>
                    <p>
                      <strong>Meeting Type:</strong> Video call via Hive Wellness Portal
                    </p>
                  </div>

                  <Button
                    className="w-full mt-4 bg-hive-purple hover:bg-hive-purple/90"
                    onClick={handleBookCall}
                    disabled={isLoading}
                  >
                    {isLoading ? "Booking Call..." : "Confirm Booking"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
