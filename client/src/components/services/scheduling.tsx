import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, Clock, Edit, CreditCard } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import type { User } from "@shared/schema";

// Initialize Stripe
// TEMPORARY: Using test keys in production for testing webhook flow
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_TEST_PUBLIC_KEY || import.meta.env.VITE_STRIPE_PUBLIC_KEY || ""
);

interface SchedulingProps {
  user: User;
}

// Payment Form Component
function PaymentForm({ sessionData, onSuccess, onCancel }: any) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsProcessing(true);

    try {
      // For demo purposes, simulate payment success after 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Create appointment after simulated payment success
      const appointmentResponse = await apiRequest("POST", "/api/appointments", {
        ...sessionData,
        paymentIntentId: `demo_payment_${Date.now()}`,
        status: "confirmed",
      });

      onSuccess(appointmentResponse);
      toast({
        title: "Payment Successful!",
        description: "Your therapy session has been booked and confirmed.",
      });
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border border-gray-200 rounded-lg p-4">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#424770",
                "::placeholder": {
                  color: "#aab7c4",
                },
              },
            },
          }}
        />
      </div>

      <div className="bg-hive-light-blue p-4 rounded-lg">
        <h4 className="font-semibold text-hive-black mb-2">Session Details</h4>
        <p className="text-sm text-gray-600">
          <strong>Date:</strong> {sessionData.date}
          <br />
          <strong>Time:</strong> {sessionData.time}
          <br />
          <strong>Duration:</strong> {sessionData.duration}
          <br />
          <strong>Amount:</strong> £{sessionData.price}
        </p>
      </div>

      <div className="flex space-x-3">
        <Button type="submit" disabled={!stripe || isProcessing} className="btn-primary flex-1">
          {isProcessing ? "Processing..." : `Pay £${sessionData.price}`}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function Scheduling({ user }: SchedulingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["/api/appointments"],
    retry: false,
  });

  const availableSlots = [
    {
      id: 1,
      date: "Tomorrow",
      time: "2:00 PM",
      duration: "50 minutes",
      price: 120,
      sessionType: "therapy",
      therapist: "Dr. Sarah Johnson",
    },
    {
      id: 2,
      date: "Friday",
      time: "10:00 AM",
      duration: "50 minutes",
      price: 120,
      sessionType: "therapy",
      therapist: "Dr. Sarah Johnson",
    },
    {
      id: 3,
      date: "Monday",
      time: "3:00 PM",
      duration: "50 minutes",
      price: 120,
      sessionType: "therapy",
      therapist: "Dr. Sarah Johnson",
    },
  ];

  const handleBookSlot = async (slot: any) => {
    const sessionData = {
      ...slot,
      clientId: user.id,
      clientName: `${user.firstName || "Demo"} ${user.lastName || "Client"}`,
      therapistId: "demo-therapist-1",
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      duration: 50,
    };

    // All sessions require payment
    setSelectedSlot(sessionData);
    setShowPaymentDialog(true);
  };

  const handlePaymentSuccess = (appointmentResponse: any) => {
    queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user-payment-history"] });
    setShowPaymentDialog(false);
    setSelectedSlot(null);
  };

  if (isLoading) {
    return (
      <Card className="bg-hive-white">
        <CardContent className="p-8 text-center">
          <div className="text-hive-black">Loading appointments...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-hive-white">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-hive-black flex items-center justify-between">
            Session Scheduling
            <Badge className="bg-hive-purple text-white">Therapy Sessions</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Available Slots */}
            <div>
              <h4 className="font-semibold text-hive-black mb-4">Available Slots</h4>
              <div className="space-y-3">
                {availableSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-hive-light-blue transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-hive-black mb-1">
                          {slot.date}, {slot.time}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center mb-2">
                          <Clock className="w-3 h-3 mr-1" />
                          {slot.duration} • {slot.therapist}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-100 text-blue-800">Therapy Session</Badge>
                          <Badge className="bg-hive-purple text-white">Requires Payment</Badge>
                        </div>
                      </div>

                      <div className="text-right ml-4">
                        <div className="font-bold text-hive-black text-lg mb-2">£{slot.price}</div>
                        <Button
                          size="sm"
                          onClick={() => handleBookSlot(slot)}
                          className="bg-hive-purple hover:bg-hive-blue text-white"
                        >
                          <CreditCard className="w-4 h-4 mr-1" />
                          Book & Pay
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Sessions */}
            <div>
              <h4 className="font-semibold text-hive-black mb-4">Upcoming Sessions</h4>
              <div className="space-y-3">
                {Array.isArray(appointments) && appointments.length > 0 ? (
                  appointments.map((appointment: any) => (
                    <div key={appointment.id} className="p-4 bg-hive-light-blue rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-hive-black">
                            {new Date(appointment.scheduledAt).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-600">
                            with {appointment.therapistName || "Dr. Sarah Johnson"}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Therapy Session</div>
                        </div>
                        <div className="text-right">
                          <Badge
                            className={`text-xs mb-1 ${
                              appointment.status === "confirmed"
                                ? "bg-green-100 text-green-800"
                                : appointment.status === "scheduled"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {appointment.status.toUpperCase()}
                          </Badge>
                          <div>
                            <Button size="sm" variant="outline" className="text-xs">
                              <Edit className="w-3 h-3 mr-1" />
                              Reschedule
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <div className="text-gray-600 text-sm">No upcoming sessions scheduled</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-hive-black">Complete Payment</DialogTitle>
          </DialogHeader>

          <Elements stripe={stripePromise}>
            <PaymentForm
              sessionData={selectedSlot}
              onSuccess={handlePaymentSuccess}
              onCancel={() => setShowPaymentDialog(false)}
            />
          </Elements>
        </DialogContent>
      </Dialog>
    </div>
  );
}
