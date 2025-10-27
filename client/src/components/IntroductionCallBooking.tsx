import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, User, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BookingFormData {
  therapistEnquiryId: string;
  therapistEmail: string;
  therapistName: string;
  preferredDate: string;
  preferredTime: string;
  timezone: string;
  notes: string;
}

interface IntroductionCallBookingProps {
  enquiryId: string;
  therapistEmail: string;
  therapistName: string;
  onBookingComplete?: (callId: string) => void;
}

export default function IntroductionCallBooking({
  enquiryId,
  therapistEmail,
  therapistName,
  onBookingComplete,
}: IntroductionCallBookingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<BookingFormData>({
    therapistEnquiryId: enquiryId,
    therapistEmail,
    therapistName,
    preferredDate: "",
    preferredTime: "",
    timezone: "Europe/London",
    notes: "",
  });

  // Check if therapist already has calls booked
  const { data: existingCalls } = useQuery({
    queryKey: [`/api/introduction-calls/therapist/${therapistEmail}`],
  });

  const bookCallMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      const response = await apiRequest("POST", "/api/introduction-calls/book", data);
      return await response.json();
    },
    onSuccess: (responseData) => {
      toast({
        title: "Introduction Call Booked Successfully!",
        description: `Your call is scheduled for ${formData.preferredDate} at ${formData.preferredTime}. Check your email for meeting details.`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/introduction-calls"] });
      queryClient.invalidateQueries({
        queryKey: [`/api/introduction-calls/therapist/${therapistEmail}`],
      });

      if (onBookingComplete && responseData?.callId) {
        onBookingComplete(responseData.callId);
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: error.message || "Failed to book introduction call. Please try again.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.preferredDate || !formData.preferredTime) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select both a date and time for your introduction call.",
      });
      return;
    }

    bookCallMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof BookingFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Generate time slots (9 AM to 8 PM, 30-minute intervals)
  const timeSlots = [
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

  // Get minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  // Get maximum date (4 weeks from now)
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 28);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-hive-purple rounded-full flex items-center justify-center">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-century text-hive-purple">
            Book Your Introduction Call
          </CardTitle>
          <CardDescription className="text-lg">
            Schedule a 15-minute introduction call with the Hive Wellness team
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Show existing calls if any */}
          {existingCalls && Array.isArray(existingCalls) && (existingCalls as any[]).length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Your Existing Calls</h3>
              {(existingCalls as any[]).map((call: any, index: number) => (
                <div key={call.id || index} className="text-sm text-blue-700">
                  {new Date(call.preferredDate).toLocaleDateString("en-GB")} at {call.preferredTime}{" "}
                  - {call.status}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Therapist Information */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-hive-purple flex items-center gap-2">
                <User className="w-5 h-5" />
                Therapist Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <div className="text-sm bg-white p-3 rounded border min-h-[40px] flex items-center">
                    {therapistName && therapistName !== "undefined undefined"
                      ? therapistName
                      : therapistEmail.split("@")[0]}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <div className="text-sm bg-white p-3 rounded border min-h-[40px] flex items-center">
                    {therapistEmail}
                  </div>
                </div>
              </div>
            </div>

            {/* Date and Time Selection */}
            <div className="space-y-4">
              <h3 className="font-semibold text-hive-purple flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Select Date & Time
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="preferredDate" className="text-sm font-medium">
                    Preferred Date
                  </Label>
                  <Input
                    id="preferredDate"
                    type="date"
                    min={minDate}
                    max={maxDateStr}
                    value={formData.preferredDate}
                    onChange={(e) => handleInputChange("preferredDate", e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="preferredTime" className="text-sm font-medium">
                    Preferred Time
                  </Label>
                  <Select
                    value={formData.preferredTime}
                    onValueChange={(value) => handleInputChange("preferredTime", value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="timezone" className="text-sm font-medium">
                  Time Zone
                </Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => handleInputChange("timezone", value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                    <SelectItem value="Europe/Dublin">Dublin (GMT/IST)</SelectItem>
                    <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Berlin">Berlin (CET/CEST)</SelectItem>
                    <SelectItem value="America/New_York">New York (EST/EDT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-sm font-medium flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Any specific topics you'd like to discuss or questions you have..."
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>

            {/* What to Expect */}
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="font-semibold text-hive-purple mb-2">
                What to Expect During Your Call
              </h3>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• Introduction to Hive Wellness platform and approach</li>
                <li>• Discussion about your therapy experience and specialisations</li>
                <li>• Overview of our onboarding process and requirements</li>
                <li>• Q&A session to address any questions you may have</li>
                <li>• Next steps in joining the Hive Wellness therapist network</li>
              </ul>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-hive-purple hover:bg-hive-purple/90 text-white font-semibold py-3"
              disabled={bookCallMutation.isPending}
            >
              {bookCallMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Booking Your Call...
                </div>
              ) : (
                "Book Introduction Call"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
