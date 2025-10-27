import { useState, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Elements, useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
// Performance optimisation: Import only the icons we actually use
import {
  Calendar as CalendarIcon,
  Clock,
  UserIcon,
  Plus,
  Video,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Users,
  Bell,
  History,
  Info,
} from "lucide-react";
import type { User as UserType } from "@shared/schema";
import { BulkBookingDialog } from "@/components/bulk-booking-dialog";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
// Use appropriate Stripe key based on environment
// TEMPORARY: Using test keys in production for testing webhook flow
const isProduction = import.meta.env.PROD;
const stripePublicKey =
  import.meta.env.VITE_STRIPE_TEST_PUBLIC_KEY || import.meta.env.VITE_STRIPE_PUBLIC_KEY;

console.log("Environment:", isProduction ? "production" : "development");
console.log("Using Stripe key type:", stripePublicKey?.startsWith("pk_live_") ? "live" : "test");
console.log("Stripe public key available:", !!stripePublicKey);

// Initialize Stripe promise
const stripePromise = stripePublicKey ? loadStripe(stripePublicKey) : Promise.resolve(null);

// Create a test mode flag for when Stripe fails to load with live keys
let stripeTestMode = false;

// Log the stripe promise resolution
stripePromise
  .then((stripe) => {
    console.log("Stripe promise resolved with:", !!stripe);
    if (!stripe) {
      console.error("Stripe instance is null - likely due to live key in development");
      stripeTestMode = true;
    }
  })
  .catch((error) => {
    console.error("Stripe promise rejected:", error);
    stripeTestMode = true;
  });

interface AppointmentBookingProps {
  user: UserType;
}

interface Appointment {
  id: string;
  clientId: string;
  therapistId: string;
  scheduledAt: string;
  duration: number;
  status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled";
  sessionType: "consultation" | "therapy" | "psychological" | "specialist";
  notes?: string;
  price?: string;
  paymentStatus: "pending" | "paid" | "refunded";
  videoRoomId?: string;
}

interface TherapistProfile {
  id: string;
  userId: string;
  specialisations: string[];
  experience: number;
  hourlyRate: string;
  availability: any;
  credentials: any;
  bio: string;
  isVerified: boolean;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function AppointmentBookingComplete({ user }: AppointmentBookingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isBulkBookingEnabled } = useFeatureFlags();

  // State management
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedTherapist, setSelectedTherapist] = useState<TherapistProfile | null>(
    user.id === "demo-client-1"
      ? {
          id: "therapist-1",
          userId: "demo-therapist-1",
          specialisations: ["Anxiety", "Depression", "CBT"],
          experience: 5,
          hourlyRate: "£80.00",
          availability: [],
          credentials: {},
          bio: "Experienced therapist specialising in anxiety and depression",
          isVerified: true,
          user: {
            firstName: "Dr. Sarah",
            lastName: "Wilson",
            email: "sarah@demo.hive",
          },
        }
      : null
  );
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showBulkBookingDialog, setShowBulkBookingDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [sessionType, setSessionType] = useState<
    "consultation" | "therapy" | "psychological" | "specialist"
  >("therapy");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [pendingAppointmentData, setPendingAppointmentData] = useState<any>(null);

  // Past-date booking state
  const [isPastBookingMode, setIsPastBookingMode] = useState(false);
  const [pastBookingReason, setPastBookingReason] = useState("");

  // Fetch system configuration for past booking feature
  const { data: config = { features: { allowPastBooking: false, pastBookingWindowDays: 14 } } } =
    useQuery({
      queryKey: ["/api/config"],
      retry: false,
    });

  // Helper function to check if past booking is allowed
  const isPastBookingAllowed = () => {
    return (config as any)?.features?.allowPastBooking === true;
  };

  // Helper function to get earliest allowed past date
  const getEarliestPastDate = () => {
    const windowDays = (config as any)?.features?.pastBookingWindowDays || 14;
    const earliestDate = new Date();
    earliestDate.setDate(earliestDate.getDate() - windowDays);
    return earliestDate;
  };

  // Helper function to validate if a date is within allowed past booking range
  const isDateAllowedForPastBooking = (date: Date) => {
    if (!isPastBookingMode || !isPastBookingAllowed()) return false;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selectedDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const earliestAllowed = getEarliestPastDate();

    return selectedDay < today && selectedDay >= earliestAllowed;
  };

  // Helper function to validate if a date is allowed for future booking
  const isDateAllowedForFutureBooking = (date: Date) => {
    if (isPastBookingMode) return false;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selectedDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    return selectedDay >= today;
  };

  // Function to calculate price based on session type (returns formatted string)
  const getSessionPrice = (
    sessionType: "consultation" | "therapy" | "psychological" | "specialist"
  ) => {
    switch (sessionType) {
      case "consultation":
        return "£65.00"; // Counselling Approaches price
      case "therapy":
        return "£80.00"; // CBT & Psychotherapy price
      case "psychological":
        return "£90.00"; // Psychological Therapies price
      case "specialist":
        return "£120.00"; // Specialist Therapies price
      default:
        return "£80.00";
    }
  };

  // Function to get numeric price (for database storage)
  const getNumericPrice = (
    sessionType: "consultation" | "therapy" | "psychological" | "specialist"
  ) => {
    switch (sessionType) {
      case "consultation":
        return 65.0;
      case "therapy":
        return 80.0;
      case "psychological":
        return 90.0;
      case "specialist":
        return 120.0;
      default:
        return 80.0;
    }
  };

  // Function to get session duration
  const getSessionDuration = (
    sessionType: "consultation" | "therapy" | "psychological" | "specialist"
  ) => {
    switch (sessionType) {
      case "consultation":
        return 50; // Standard session length
      case "therapy":
        return 50; // Standard session length
      case "psychological":
        return 50; // Standard session length
      case "specialist":
        return 50; // Standard session length
      default:
        return 50;
    }
  };

  // Create payment intent for bulk booking
  const createBulkPaymentMutation = useMutation({
    mutationFn: async (bulkData: any) => {
      const { numberOfSessions } = bulkData;
      const totalAmount = getNumericPrice(sessionType) * numberOfSessions;

      console.log("Creating bulk payment intent for:", bulkData);
      try {
        // Create payment intent for bulk booking
        const response = await apiRequest("POST", "/api/create-payment-intent", {
          sessionType: sessionType, // Let server calculate price securely
          currency: "gbp",
          therapistId: selectedTherapist?.userId || "demo-therapist-1",
          metadata: {
            bulkBooking: true,
            numberOfSessions: numberOfSessions,
            bulkBookingData: JSON.stringify(bulkData),
          },
        });

        const data = await response.json();
        console.log("Bulk payment intent data received:", data);

        if (!data || !data.clientSecret) {
          throw new Error("Invalid bulk payment response - no client secret received");
        }

        return data;
      } catch (error) {
        console.error("Bulk payment intent creation failed:", error);
        throw error;
      }
    },
    onSuccess: (data: any, bulkData: any) => {
      console.log("Bulk payment intent created successfully:", data);
      // Store bulk booking data for after payment
      setPendingAppointmentData(bulkData);
      setClientSecret(data.clientSecret);
      setShowBulkBookingDialog(false);
      setShowPaymentDialog(true);
    },
    onError: (error: any) => {
      toast({
        title: "Payment Setup Failed",
        description: error.message || "Failed to setup payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Bulk booking mutation that creates appointments after payment
  const createBulkAppointmentsMutation = useMutation({
    mutationFn: async (bulkData: any) => {
      const { bulkBookingType, numberOfSessions, recurringTime, startDate, selectedTherapist } =
        bulkData;

      if (!recurringTime || !startDate || !selectedTherapist) {
        throw new Error("Missing required information for bulk booking");
      }

      // Create multiple appointments based on pattern
      const appointments = [];
      let currentDate = new Date(startDate);

      for (let i = 0; i < numberOfSessions; i++) {
        // Calculate date for this session based on booking pattern
        let sessionDate = new Date(startDate);

        if (bulkBookingType === "weekly") {
          // Add weeks: startDate + (i * 7 days)
          sessionDate.setDate(startDate.getDate() + i * 7);
        } else if (bulkBookingType === "monthly") {
          // Add months: startDate + i months
          sessionDate.setMonth(startDate.getMonth() + i);
        } else if (bulkBookingType === "custom") {
          // For custom, we'll use weekly interval by default
          // This can be enhanced later with user-defined intervals
          sessionDate.setDate(startDate.getDate() + i * 7);
        }

        // Parse time and set it on the date
        let hours, minutes;
        if (recurringTime.includes(" ")) {
          // Format like "1:00 PM"
          const [time, period] = recurringTime.split(" ");
          [hours, minutes] = time.split(":").map(Number);
          if (period === "PM" && hours !== 12) {
            hours += 12;
          } else if (period === "AM" && hours === 12) {
            hours = 0;
          }
        } else {
          // Format like "13:00" (24-hour)
          [hours, minutes] = recurringTime.split(":").map(Number);
        }

        sessionDate.setHours(hours, minutes || 0, 0, 0);

        const appointmentData = {
          therapistId: selectedTherapist.userId || "demo-therapist-1",
          scheduledAt: sessionDate.toISOString(),
          duration: getSessionDuration(sessionType),
          sessionType: sessionType,
          notes: `Bulk booking session ${i + 1} of ${numberOfSessions} (${bulkBookingType})`,
          price: getNumericPrice(sessionType), // Use numeric price for database
          paymentStatus: "paid", // Mark as paid since payment was already processed
        };

        // Create each appointment individually
        const response = await apiRequest("POST", "/api/appointments", appointmentData);

        appointments.push(response);
      }

      return appointments;
    },
    onSuccess: (appointments: any[]) => {
      toast({
        title: "Bulk Booking Successful",
        description: `${appointments.length} therapy sessions have been created and saved to your calendar.`,
      });
      setShowBulkBookingDialog(false);
      refetchAppointments();

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["/api/video-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    },
    onError: (error: any) => {
      console.error("Bulk booking failed:", error);
      toast({
        title: "Bulk Booking Failed",
        description: error.message || "Failed to create bulk booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Bulk booking action handler
  const handleBulkBooking = (bulkData: any) => {
    // First create payment intent, then appointments after payment success
    createBulkPaymentMutation.mutate(bulkData);
  };

  // Handle successful payment completion
  const handlePaymentSuccess = async () => {
    if (pendingAppointmentData) {
      // CRITICAL FIX: Don't create bulk appointments here - webhook handles it
      console.log("Bulk payment successful! Webhook will create all appointments automatically.");

      setPendingAppointmentData(null);
      setClientSecret(null);
      setShowPaymentDialog(false);

      // Show success toast for bulk booking
      toast({
        title: "Bulk Payment Successful! 🎉",
        description: `Your ${pendingAppointmentData.numberOfSessions || "multiple"} appointments are being created. You'll receive confirmation shortly!`,
        duration: 5000,
      });

      // RELIABLE: Poll for new appointments instead of fixed delay
      const pollForBulkAppointments = async (maxAttempts = 15, initialInterval = 1000) => {
        let attempts = 0;
        let interval = initialInterval;
        const startTime = Date.now();
        const expectedCount = pendingAppointmentData?.numberOfSessions || 1;
        const initialAppointmentCount = Array.isArray(appointments) ? appointments.length : 0;

        const poll = async () => {
          attempts++;
          console.log(
            `🔄 Polling for ${expectedCount} bulk appointments (attempt ${attempts}/${maxAttempts})`
          );

          try {
            await refetchAppointments();

            // Get fresh appointment count using the correct query key
            const freshData = await queryClient.getQueryData(["/api/appointments"]);
            const currentCount = Array.isArray(freshData) ? freshData.length : 0;
            const newAppointments = currentCount - initialAppointmentCount;

            if (newAppointments >= expectedCount) {
              console.log(
                `✅ All ${expectedCount} bulk appointments created after ${Date.now() - startTime}ms`
              );
              await queryClient.invalidateQueries({ queryKey: ["/api/video-sessions"] });
              await queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
              await queryClient.invalidateQueries({ queryKey: ["/api/client/dashboard"] });

              toast({
                title: "Appointments Created! 🎉",
                description: `All ${expectedCount} therapy sessions are now in your calendar.`,
                duration: 4000,
              });
              return;
            }

            if (attempts < maxAttempts) {
              console.log(
                `⏳ Found ${newAppointments}/${expectedCount} appointments, continuing...`
              );
              interval = Math.min(interval * 1.2, 3000); // Exponential backoff, max 3s
              setTimeout(poll, interval);
            } else {
              console.error(
                `❌ Max polling attempts reached. Found ${newAppointments}/${expectedCount} appointments`
              );
              toast({
                title: "Please check your calendar",
                description: `Some appointments may have been created. Please refresh the page to see all appointments.`,
                variant: "destructive",
              });
            }
          } catch (error) {
            console.error("Bulk appointment polling error:", error);
            if (attempts < maxAttempts) {
              setTimeout(poll, interval);
            }
          }
        };

        // Start polling after short initial delay
        setTimeout(poll, 500);
      };

      pollForBulkAppointments();
    }
  };

  // Fetch user's appointments
  const {
    data: appointments = [],
    isLoading: appointmentsLoading,
    refetch: refetchAppointments,
  } = useQuery({
    queryKey: ["/api/appointments", user.id],
    enabled: !!user.id,
  });

  // Fetch assigned therapists (for clients) or assigned clients (for therapists)
  const { data: assignedConnections = [], isLoading: connectionsLoading } = useQuery({
    queryKey: [`/api/assigned-connections/${user.id}/${user.role}`],
    enabled: !!user.id,
  });

  // For backward compatibility, still fetch all therapists but filter by assigned ones
  const { data: allTherapists = [], isLoading: therapistsLoading } = useQuery({
    queryKey: ["/api/therapist-profiles"],
    enabled: user.role === "client",
  });

  // Filter therapists to only show assigned ones for clients
  const therapists =
    user.role === "client"
      ? Array.isArray(assignedConnections)
        ? assignedConnections.map((conn: any) => ({
            ...conn.therapistProfile,
            userId: conn.therapistId,
          }))
        : []
      : Array.isArray(assignedConnections)
        ? assignedConnections
        : []; // For therapists, show assigned clients

  // Auto-select therapist for users with single therapist assignment or fallback demo therapist
  useEffect(() => {
    // Only run when we have user role client, no selected therapist, and therapists data is loaded
    if (
      user.role === "client" &&
      !selectedTherapist &&
      Array.isArray(therapists) &&
      !connectionsLoading
    ) {
      // If user has assigned therapist(s), auto-select the first one
      if (therapists.length === 1) {
        const assignedTherapist = therapists[0];
        setSelectedTherapist(assignedTherapist);
        return; // Exit early to prevent fallback
      }
      // Fallback: auto-select demo therapist ONLY if no assigned therapists
      else if (therapists.length === 0) {
        const fallbackTherapist = {
          id: "therapist-1",
          userId: "demo-therapist-1",
          specialisations: ["Anxiety", "Depression", "CBT"],
          experience: 8,
          hourlyRate: "£80.00",
          availability: [],
          credentials: {},
          bio: "Experienced therapist specialising in anxiety and depression",
          isVerified: true,
          user: {
            firstName: "Dr. John",
            lastName: "Doe",
            email: "john@demo.hive",
          },
        };
        setSelectedTherapist(fallbackTherapist);
      }
    }
  }, [therapists, user.role, selectedTherapist, connectionsLoading, assignedConnections]);

  // Create payment intent mutation
  const createPaymentIntentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      console.log("Creating payment intent for:", appointmentData);
      try {
        const response = await apiRequest("POST", "/api/create-payment-intent", {
          sessionType: appointmentData.sessionType, // Let server calculate price securely
          currency: "gbp",
          metadata: {
            appointmentData: JSON.stringify(appointmentData),
            clientId: user.id,
            therapistId: appointmentData.therapistId,
          },
        });
        const data = await response.json();
        console.log("Payment intent data received:", data);

        if (!data || !data.clientSecret) {
          throw new Error("Invalid payment response - no client secret received");
        }

        return data;
      } catch (error) {
        console.error("Payment intent creation failed:", error);
        throw error;
      }
    },
    onSuccess: (data: any) => {
      console.log("Payment intent created successfully:", data);
      setClientSecret(data.clientSecret);
      setShowPaymentDialog(true);
      setShowBookingDialog(false); // Close booking dialog when payment opens
    },
    onError: (error: any) => {
      console.error("Payment intent mutation error:", error);
      toast({
        title: "Payment Setup Failed",
        description: error.message || "Failed to setup payment. Please try again.",
        variant: "destructive",
      });
      // Reset loading state
      setClientSecret("");
      setShowPaymentDialog(false);
    },
  });

  // Create appointment mutation (called after successful payment)
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      return await apiRequest("POST", "/api/appointments", {
        ...appointmentData,
        paymentStatus: "paid",
        price: getSessionPrice(appointmentData.sessionType), // Use correct price based on session type
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Appointment Booked & Paid",
        description: `Your ${sessionType} session has been scheduled and paid for successfully.`,
      });
      setShowBookingDialog(false);
      setShowPaymentDialog(false);
      setSelectedTime(null);
      setSelectedTherapist(null);
      setClientSecret(null);
      setPendingAppointmentData(null);
      refetchAppointments();

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["/api/video-sessions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to book appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Join video session mutation
  const joinVideoSessionMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      // Call the appointment join-video endpoint to get session details
      const response = await apiRequest("POST", `/api/appointments/${appointmentId}/join-video`);
      const data = await response.json();

      // If we get a sessionId, now call the video-sessions join endpoint
      if (data?.sessionId) {
        const joinResponse = await fetch(`/api/video-sessions/${data.sessionId}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!joinResponse.ok) {
          throw new Error("Failed to join session");
        }

        return await joinResponse.json();
      } else {
        throw new Error("No video session ID received");
      }
    },
    onSuccess: (data: any, appointmentId) => {
      if (data.success && data.meetingUrl) {
        // Open Google Meet in new window (same as video-sessions-production.tsx)
        const meetWindow = window.open(
          data.meetingUrl,
          "_blank",
          "width=1200,height=800,scrollbars=yes,resizable=yes"
        );
        if (!meetWindow) {
          toast({
            title: "Pop-up blocked",
            description: "Please allow pop-ups and try again",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Joining session",
            description: "Google Meet is opening in a new window",
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Session not ready",
          description: "Video session is being prepared. Please try again in a moment.",
          variant: "default",
        });
      }

      // Refresh appointments data
      refetchAppointments();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to join session",
        description: error.message || "Unable to join the video session. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch available time slots for selected date
  const {
    data: availableTimeSlotsResponse,
    isLoading: timeSlotsLoading,
    refetch: refetchTimeSlots,
  } = useQuery({
    queryKey: ["/api/available-time-slots", selectedDate.toISOString().split("T")[0]],
    queryFn: async () => {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const response = await fetch(`/api/available-time-slots?date=${dateStr}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch available time slots");
      }
      return response.json();
    },
    enabled: !!selectedDate,
    retry: false,
    staleTime: 60000, // Consider data fresh for 1 minute
  });

  // Extract time slots from API response
  const timeSlots = availableTimeSlotsResponse?.success
    ? availableTimeSlotsResponse.availableSlots.map((slot: any) => slot.display)
    : [];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Note: Time slot availability is now handled server-side with Google Calendar integration
  // Only available slots are returned from the API, so we don't need client-side validation

  const canJoinVideoSession = (appointment: Appointment) => {
    const now = new Date();
    const scheduledTime = new Date(appointment.scheduledAt);
    const timeDiff = scheduledTime.getTime() - now.getTime();

    // Can join 15 minutes before scheduled time
    return timeDiff <= 15 * 60 * 1000 && timeDiff >= -60 * 60 * 1000; // Until 1 hour after
  };

  const handleBookAppointment = () => {
    // Validation for both past and future bookings
    if (!selectedTime || !selectedTherapist) {
      toast({
        title: "Missing Information",
        description: "Please select a therapist and time slot.",
        variant: "destructive",
      });
      return;
    }

    // Additional validation for past booking mode
    if (isPastBookingMode) {
      if (!isDateAllowedForPastBooking(selectedDate)) {
        toast({
          title: "Invalid Date",
          description: `Please select a date within the last ${(config as any)?.features?.pastBookingWindowDays || 14} days.`,
          variant: "destructive",
        });
        return;
      }

      if (!isPastBookingAllowed()) {
        toast({
          title: "Feature Not Available",
          description: "Past-date booking is not currently enabled.",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Future booking validation
      if (!isDateAllowedForFutureBooking(selectedDate)) {
        toast({
          title: "Invalid Date",
          description: "Please select a future date for your appointment.",
          variant: "destructive",
        });
        return;
      }
    }

    // Check if client is trying to book with an assigned therapist only
    // Allow booking if user has no assigned therapists (use fallback demo therapist)
    if (user.role === "client" && Array.isArray(therapists) && therapists.length > 0) {
      const isAssignedTherapist = therapists.some(
        (t: any) => t.userId === selectedTherapist.userId
      );
      if (!isAssignedTherapist) {
        toast({
          title: "Booking Restricted",
          description:
            "You can only book sessions with your assigned therapist. Please contact support if you need assistance.",
          variant: "destructive",
        });
        return;
      }
    }

    const appointmentDateTime = new Date(selectedDate);
    const [time, period] = selectedTime.split(" ");
    const [hours, minutes] = time.split(":").map(Number);

    appointmentDateTime.setHours(
      period === "PM" && hours !== 12 ? hours + 12 : hours,
      minutes || 0,
      0,
      0
    );

    const appointmentData = {
      therapistId: selectedTherapist.userId,
      clientId: user.id,
      scheduledAt: appointmentDateTime.toISOString(),
      duration: getSessionDuration(sessionType),
      sessionType,
      price: getSessionPrice(sessionType),
      notes: isPastBookingMode
        ? `Past session recorded: ${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} session by ${user.firstName || "client"}${pastBookingReason ? ` - ${pastBookingReason}` : ""}`
        : `${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} session booked by ${user.firstName || "client"}`,
      // Add backdated parameters for past booking mode
      ...(isPastBookingMode && {
        backdated: true,
        backdatedReason: pastBookingReason || "Past session recording",
      }),
    };

    // Store appointment data for after payment
    setPendingAppointmentData(appointmentData);

    // Create payment intent first
    createPaymentIntentMutation.mutate(appointmentData);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + (direction === "next" ? 1 : -1));
    setCurrentMonth(newMonth);
    setSelectedDate(newMonth);
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  if (appointmentsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold font-primary text-hive-black">Appointment Booking</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Schedule and manage your therapy sessions with integrated video calling
        </p>
      </div>

      {/* How to Book Section */}
      <Card className="bg-gradient-to-r from-hive-purple/5 to-hive-blue/5 border-hive-purple/20">
        <CardHeader>
          <CardTitle className="font-primary text-hive-purple">How to Book a Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-hive-purple text-white rounded-full flex items-center justify-center font-bold text-sm">
                1
              </div>
              <p className="text-sm">Click "Book Appointment" to start the booking process</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-hive-purple text-white rounded-full flex items-center justify-center font-bold text-sm">
                2
              </div>
              <p className="text-sm">Select your preferred date from the calendar</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-hive-purple text-white rounded-full flex items-center justify-center font-bold text-sm">
                3
              </div>
              <p className="text-sm">Choose an available time slot</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-hive-purple text-white rounded-full flex items-center justify-center font-bold text-sm">
                4
              </div>
              <p className="text-sm">Select your preferred therapist</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-hive-purple text-white rounded-full flex items-center justify-center font-bold text-sm">
                5
              </div>
              <p className="text-sm">Complete payment to confirm your booking</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">
              ✅ Only available time slots are displayed - no more booking conflicts!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {(user.role === "client" || user.role === "therapist" || user.role === "institution") && (
        <div className="flex justify-center gap-4">
          <Button
            onClick={() => setShowBookingDialog(true)}
            className="bg-hive-purple hover:bg-hive-purple/90 px-8 py-3 text-lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            {user.role === "therapist"
              ? "Schedule Session"
              : user.role === "institution"
                ? "Book Video Session"
                : "Book Appointment"}
          </Button>
          {isBulkBookingEnabled && (
            <Button
              variant="outline"
              onClick={() => setShowBulkBookingDialog(true)}
              className="border-hive-purple text-hive-purple hover:bg-hive-purple hover:text-white px-8 py-3 text-lg"
              disabled={createBulkAppointmentsMutation.isPending}
            >
              {createBulkAppointmentsMutation.isPending ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mr-2" />
                  Creating Sessions...
                </>
              ) : (
                <>
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  Bulk Booking
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-primary text-hive-black">
            <CalendarIcon className="h-5 w-5 text-hive-purple" />
            Your Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!Array.isArray(appointments) || appointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No appointments scheduled</p>
              {(user.role === "client" ||
                user.role === "therapist" ||
                user.role === "institution") && (
                <Button className="mt-4" onClick={() => setShowBookingDialog(true)}>
                  {user.role === "therapist"
                    ? "Schedule First Session"
                    : user.role === "institution"
                      ? "Book First Video Session"
                      : "Book Your First Session"}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.isArray(appointments) &&
                appointments.map((appointment: Appointment) => (
                  <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {appointment.sessionType}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon className="h-4 w-4" />
                          {new Date(appointment.scheduledAt).toLocaleDateString("en-GB", {
                            dateStyle: "medium",
                          })}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4" />
                          {formatTime(appointment.scheduledAt)} ({appointment.duration} min)
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4" />
                          {user.role === "client" ? "Therapist" : "Client"} Session
                        </div>
                      </div>

                      {appointment.status === "confirmed" && canJoinVideoSession(appointment) && (
                        <Button
                          className="w-full"
                          onClick={() => joinVideoSessionMutation.mutate(appointment.id)}
                          disabled={joinVideoSessionMutation.isPending}
                        >
                          <Video className="mr-2 h-4 w-4" />
                          {joinVideoSessionMutation.isPending ? "Joining..." : "Join Video Session"}
                        </Button>
                      )}

                      {appointment.status === "confirmed" && !canJoinVideoSession(appointment) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Bell className="h-4 w-4" />
                          Session will be available 15 minutes before start time
                        </div>
                      )}

                      {appointment.paymentStatus === "pending" && (
                        <div className="flex items-center gap-2 text-sm text-orange-600">
                          <AlertCircle className="h-4 w-4" />
                          Payment required: £{appointment.price}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-primary text-hive-purple">
              Book New Appointment
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Calendar & Time Selection */}
            <div className="space-y-6">
              {/* Past Booking Toggle - Only show if feature is enabled */}
              {isPastBookingAllowed() && (
                <Card className="p-4 border-2 border-dashed border-amber-200 bg-amber-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <History className="h-5 w-5 text-amber-600" />
                      <Label htmlFor="past-booking-toggle" className="font-semibold text-amber-800">
                        Record a Past Session
                      </Label>
                    </div>
                    <Switch
                      id="past-booking-toggle"
                      checked={isPastBookingMode}
                      onCheckedChange={(checked) => {
                        setIsPastBookingMode(checked);
                        // Reset selected date and time when toggling modes
                        setSelectedDate(new Date());
                        setSelectedTime(null);
                        setPastBookingReason("");
                      }}
                    />
                  </div>

                  {isPastBookingMode && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 p-3 bg-amber-100/50 rounded-lg">
                        <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-amber-800">
                          <p className="font-medium mb-1">Recording a past therapy session:</p>
                          <ul className="text-xs space-y-1">
                            <li>
                              • You can record sessions up to{" "}
                              {(config as any)?.features?.pastBookingWindowDays || 14} days in the
                              past
                            </li>
                            <li>
                              • Payment is required immediately as this is for a completed session
                            </li>
                            <li>• No calendar invite or video room will be created</li>
                            <li>• This helps maintain accurate session records and billing</li>
                          </ul>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="past-booking-reason"
                          className="text-sm font-medium text-amber-800"
                        >
                          Reason for recording past session (optional)
                        </Label>
                        <Textarea
                          id="past-booking-reason"
                          value={pastBookingReason}
                          onChange={(e) => setPastBookingReason(e.target.value)}
                          placeholder="e.g., Session was conducted but not recorded in system, billing adjustment, etc."
                          className="text-sm resize-none"
                          rows={2}
                          maxLength={500}
                        />
                        <p className="text-xs text-amber-700">
                          {pastBookingReason.length}/500 characters
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold font-primary">
                    {isPastBookingMode ? "Select Past Date" : "Select Date"}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[140px] text-center">
                      {currentMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Card className="p-4">
                  <div className="grid grid-cols-7 gap-1 text-sm">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                      <div key={day} className="p-2 text-center font-medium text-muted-foreground">
                        {day}
                      </div>
                    ))}
                    {getDaysInMonth().map((day, index) => {
                      const isSelected = day && day.toDateString() === selectedDate.toDateString();
                      const isDateAllowed =
                        day &&
                        (isPastBookingMode
                          ? isDateAllowedForPastBooking(day)
                          : isDateAllowedForFutureBooking(day));

                      return (
                        <button
                          key={index}
                          className={`p-2 text-center rounded-md transition-colors ${
                            day
                              ? isSelected
                                ? "bg-hive-purple text-white"
                                : isDateAllowed
                                  ? "hover:bg-hive-purple/10"
                                  : "text-muted-foreground cursor-not-allowed"
                              : ""
                          }`}
                          onClick={() => day && isDateAllowed && setSelectedDate(day)}
                          disabled={!day || !isDateAllowed}
                        >
                          {day?.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </Card>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Session Type</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={sessionType === "consultation" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSessionType("consultation")}
                    data-testid="session-type-consultation"
                  >
                    Consultation
                  </Button>
                  <Button
                    variant={sessionType === "therapy" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSessionType("therapy")}
                    data-testid="session-type-therapy"
                  >
                    Therapy
                  </Button>
                  <Button
                    variant={sessionType === "psychological" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSessionType("psychological")}
                    data-testid="session-type-psychological"
                  >
                    Psychological
                  </Button>
                  <Button
                    variant={sessionType === "specialist" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSessionType("specialist")}
                    data-testid="session-type-specialist"
                  >
                    Specialist
                  </Button>
                </div>
              </div>
            </div>

            {/* Time Slots and Therapist Selection */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Select Time</h3>
                <p className="text-sm text-muted-foreground mb-4">{formatDate(selectedDate)}</p>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {isPastBookingMode ? (
                    // For past booking, show standard time slots since availability data may not exist
                    [
                      "9:00 AM",
                      "10:00 AM",
                      "11:00 AM",
                      "12:00 PM",
                      "1:00 PM",
                      "2:00 PM",
                      "3:00 PM",
                      "4:00 PM",
                    ].map((slot: string) => (
                      <Button
                        key={slot}
                        variant={selectedTime === slot ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTime(slot)}
                        className="text-sm"
                      >
                        {slot}
                      </Button>
                    ))
                  ) : timeSlotsLoading ? (
                    <div className="col-span-2 flex items-center justify-center p-4">
                      <div className="text-sm text-muted-foreground">
                        Loading available times...
                      </div>
                    </div>
                  ) : timeSlots.length === 0 ? (
                    <div className="col-span-2 flex items-center justify-center p-4">
                      <div className="text-sm text-muted-foreground">
                        No available slots for this date
                      </div>
                    </div>
                  ) : (
                    timeSlots.map((slot: string) => (
                      <Button
                        key={slot}
                        variant={selectedTime === slot ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTime(slot)}
                        className="text-sm"
                      >
                        {slot}
                      </Button>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {user.role === "client" ? "Your Assigned Therapist" : "Select Client"}
                </h3>
                {connectionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : therapists.length === 0 && selectedTherapist ? (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-primary">
                          {selectedTherapist.user?.firstName} {selectedTherapist.user?.lastName}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedTherapist.specialisations.join(" & ")} Specialist
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-lg font-semibold text-primary">
                            {getSessionPrice(sessionType)}
                          </span>
                          <span className="text-sm text-muted-foreground">per session</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-green-600 font-medium">✓ Available</div>
                        <div className="text-xs text-muted-foreground">Ready for booking</div>
                      </div>
                    </div>
                  </div>
                ) : therapists.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>
                      {user.role === "client"
                        ? "No therapist assigned yet. Please contact admin for assignment."
                        : "No clients assigned to you yet."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {Array.isArray(therapists) &&
                      therapists.map((therapist: any) => (
                        <Card
                          key={therapist.id}
                          className={`cursor-pointer transition-colors ${
                            selectedTherapist?.id === therapist.id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => setSelectedTherapist(therapist)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <UserIcon className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">
                                  Dr. {therapist.user?.firstName} {therapist.user?.lastName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {getSessionPrice(sessionType)}/session
                                </p>
                                {therapist.specialisations && (
                                  <p className="text-xs text-muted-foreground">
                                    {therapist.specialisations.slice(0, 2).join(", ")}
                                  </p>
                                )}
                              </div>
                              {therapist.isVerified && (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowBookingDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBookAppointment}
                  disabled={
                    !selectedTime || !selectedTherapist || createPaymentIntentMutation.isPending
                  }
                  className="flex-1"
                  data-testid="button-book-appointment"
                >
                  {createPaymentIntentMutation.isPending
                    ? "Setting up Payment..."
                    : isPastBookingMode
                      ? "Continue to Payment (Past Session)"
                      : "Continue to Payment"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Complete Payment
            </DialogTitle>
          </DialogHeader>

          {!clientSecret || createPaymentIntentMutation.isPending ? (
            <div className="p-8 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="animate-spin w-8 h-8 border-4 border-hive-purple border-t-transparent rounded-full" />
                <span className="ml-3 text-hive-purple font-medium">Setting up payment...</span>
              </div>

              {createPaymentIntentMutation.isError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm mb-3">
                    Payment setup failed. Please try again or contact support if the issue persists.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowPaymentDialog(false);
                        setClientSecret("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (pendingAppointmentData) {
                          createPaymentIntentMutation.mutate(pendingAppointmentData);
                        }
                      }}
                      disabled={createPaymentIntentMutation.isPending || !pendingAppointmentData}
                      className="bg-hive-purple hover:bg-hive-purple/90"
                    >
                      Retry Payment Setup
                    </Button>
                  </div>
                </div>
              )}

              {!createPaymentIntentMutation.isError && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-gray-600">Preparing secure payment form...</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowPaymentDialog(false);
                      setClientSecret("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          ) : !stripePromise ? (
            <div className="p-8 text-center">
              <p className="text-red-600 mb-4">Payment system unavailable</p>
              <p className="text-sm text-muted-foreground mb-4">
                Stripe configuration missing. Please contact support.
              </p>
              <Button onClick={() => setShowPaymentDialog(false)}>Close</Button>
            </div>
          ) : (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: {
                    colorPrimary: "#0570de",
                    colorBackground: "#ffffff",
                    colorText: "#30313d",
                    colorDanger: "#df1b41",
                    fontFamily: "Inter, system-ui, sans-serif",
                    spacingUnit: "4px",
                    borderRadius: "8px",
                  },
                },
              }}
            >
              <PaymentForm
                pendingAppointmentData={pendingAppointmentData}
                onSuccess={() => {
                  // CRITICAL FIX: Don't create appointments here - webhook handles it
                  console.log("Payment successful! Webhook will create appointment automatically.");

                  // Close payment dialog and show success message
                  setShowPaymentDialog(false);
                  setClientSecret(null);
                  setPendingAppointmentData(null);

                  // Show success toast
                  toast({
                    title: "Payment Successful! 🎉",
                    description:
                      "Your appointment is being created. You'll receive confirmation shortly!",
                    duration: 5000,
                  });

                  // RELIABLE: Poll for new appointment instead of fixed delay
                  const pollForNewAppointment = async (maxAttempts = 20, initialInterval = 800) => {
                    let attempts = 0;
                    let interval = initialInterval;
                    const startTime = Date.now();
                    const initialAppointmentCount = Array.isArray(appointments)
                      ? appointments.length
                      : 0;

                    const poll = async () => {
                      attempts++;
                      console.log(
                        `🔄 Polling for new appointment (attempt ${attempts}/${maxAttempts})`
                      );

                      try {
                        await refetchAppointments();

                        // Get fresh appointment data using the correct query key
                        const freshAppointments =
                          (await queryClient.getQueryData(["/api/appointments"])) || [];
                        const hasNewAppointment =
                          Array.isArray(freshAppointments) &&
                          freshAppointments.length > initialAppointmentCount;

                        if (hasNewAppointment) {
                          console.log(
                            `✅ New appointment created after ${Date.now() - startTime}ms`
                          );
                          await queryClient.invalidateQueries({
                            queryKey: ["/api/video-sessions"],
                          });
                          await queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
                          await queryClient.invalidateQueries({
                            queryKey: ["/api/client/dashboard"],
                          });

                          toast({
                            title: "Appointment Created! 🎉",
                            description:
                              "Your therapy session is now confirmed and in your calendar.",
                            duration: 4000,
                          });
                          return;
                        }

                        if (attempts < maxAttempts) {
                          console.log(`⏳ Waiting for appointment creation...`);
                          interval = Math.min(interval * 1.1, 2500); // Gradual backoff, max 2.5s
                          setTimeout(poll, interval);
                        } else {
                          console.error(`❌ Max polling attempts reached for single appointment`);
                          toast({
                            title: "Please refresh to see your appointment",
                            description:
                              "Your appointment may have been created. Please refresh the page.",
                            variant: "destructive",
                          });
                        }
                      } catch (error) {
                        console.error("Single appointment polling error:", error);
                        if (attempts < maxAttempts) {
                          setTimeout(poll, interval);
                        }
                      }
                    };

                    // Start polling after short initial delay
                    setTimeout(poll, 400);
                  };

                  pollForNewAppointment();
                }}
                onCancel={() => {
                  setShowPaymentDialog(false);
                  setClientSecret(null);
                  setPendingAppointmentData(null);
                }}
              />
            </Elements>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Booking Dialog - Only show if feature is enabled */}
      {isBulkBookingEnabled && (
        <BulkBookingDialog
          open={showBulkBookingDialog}
          onOpenChange={setShowBulkBookingDialog}
          selectedTherapist={selectedTherapist}
          onBulkBooking={handleBulkBooking}
          isLoading={createBulkAppointmentsMutation.isPending}
        />
      )}
    </div>
  );
}

// Payment Form Component
const PaymentForm = ({
  pendingAppointmentData,
  onSuccess,
  onCancel,
}: {
  pendingAppointmentData: any;
  onSuccess: () => void;
  onCancel: () => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDevMode, setShowDevMode] = useState(false);

  // Mutation for creating appointment directly after payment
  const createAppointmentFromPaymentMutation = useMutation({
    mutationFn: async ({
      paymentIntentId,
      appointmentData,
    }: {
      paymentIntentId: string;
      appointmentData: any;
    }) => {
      const response = await fetch("/api/create-appointment-from-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Include session cookies for authentication
        body: JSON.stringify({ paymentIntentId, appointmentData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create appointment");
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log("✅ Appointment created successfully:", data.appointment.id);
      toast({
        title: "Appointment Created! 🎉",
        description: "Your therapy session is now confirmed and in your calendar.",
        duration: 4000,
      });
      onSuccess();
    },
    onError: (error: any) => {
      console.error("❌ Failed to create appointment:", error);
      toast({
        title: "Appointment Creation Failed",
        description:
          error.message || "Could not create appointment after payment. Please contact support.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    console.log("PaymentForm mounted, stripe:", !!stripe, "elements:", !!elements);
    if (stripe && elements) {
      console.log("Both stripe and elements are ready");
    } else {
      console.log("Still waiting for stripe and elements to load...");
      if (!stripe) console.log("- Stripe not ready");
      if (!elements) console.log("- Elements not ready");

      // Only show dev mode if there's an actual error after reasonable time
      const timeout = setTimeout(() => {
        if (!stripe || !elements) {
          console.log("Stripe loading timeout - offering development mode");
          setShowDevMode(true);
        }
      }, 5000); // Increased timeout to 5 seconds

      return () => clearTimeout(timeout);
    }
  }, [stripe, elements]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
      redirect: "if_required",
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message || "Payment could not be processed.",
        variant: "destructive",
      });
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      console.log("Payment successful! Creating appointment directly.");

      // Create appointment immediately after successful payment
      createAppointmentFromPaymentMutation.mutate({
        paymentIntentId: paymentIntent.id,
        appointmentData: pendingAppointmentData,
      });

      setIsProcessing(false);
    }
  };

  // Calculate payment amount - either single appointment or bulk booking
  const calculatePaymentAmount = () => {
    if (pendingAppointmentData?.bulkBookingType && pendingAppointmentData?.numberOfSessions) {
      // Bulk booking - show total for all sessions
      const sessionPrice =
        pendingAppointmentData?.sessionType === "consultation" ||
        pendingAppointmentData?.sessionType === "introduction"
          ? 65.0
          : 80.0;
      const totalAmount = sessionPrice * pendingAppointmentData.numberOfSessions;
      return `£${totalAmount.toFixed(2)}`;
    } else {
      // Single appointment - consultation and introduction are £65, therapy is £80
      return pendingAppointmentData?.sessionType === "consultation" ||
        pendingAppointmentData?.sessionType === "introduction"
        ? "£65.00"
        : "£80.00";
    }
  };

  const appointmentPrice = calculatePaymentAmount();

  const handleDevModePayment = async () => {
    setIsProcessing(true);

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    toast({
      title: "Development Mode Payment",
      description: "Payment simulated successfully! (Live Stripe unavailable in development)",
    });

    onSuccess();
    setIsProcessing(false);
  };

  if (!stripe || !elements) {
    return (
      <div className="p-8">
        {showDevMode ? (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Development Mode</h4>
              <p className="text-sm text-yellow-700 mb-4">
                Stripe Elements couldn't load (likely due to live key restrictions in development).
                You can simulate the payment flow for testing.
              </p>
              <div className="space-y-2">
                <Button onClick={handleDevModePayment} disabled={isProcessing} className="w-full">
                  {isProcessing ? "Processing..." : "Simulate Payment (Dev Mode)"}
                </Button>
                <Button variant="outline" onClick={onCancel} className="w-full">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            <span className="ml-3">Setting up payment...</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-muted p-4 rounded-lg">
        <h4 className="font-medium mb-2">
          {pendingAppointmentData?.bulkBookingType ? "Bulk Booking Summary" : "Appointment Summary"}
        </h4>
        <div className="space-y-1 text-sm">
          {pendingAppointmentData?.bulkBookingType ? (
            <>
              <div className="flex justify-between">
                <span>Booking Type:</span>
                <span className="capitalize">
                  {pendingAppointmentData.numberOfSessions} sessions (
                  {pendingAppointmentData.bulkBookingType})
                </span>
              </div>
              <div className="flex justify-between">
                <span>Session Type:</span>
                <span className="capitalize">{pendingAppointmentData?.sessionType}</span>
              </div>
              <div className="flex justify-between">
                <span>Start Date:</span>
                <span>
                  {pendingAppointmentData?.startDate
                    ? new Date(pendingAppointmentData.startDate).toLocaleDateString("en-GB")
                    : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span>{pendingAppointmentData?.recurringTime}</span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t">
                <span>Total Cost:</span>
                <span>{appointmentPrice}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span>Session Type:</span>
                <span className="capitalize">{pendingAppointmentData?.sessionType}</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span>{pendingAppointmentData?.duration} minutes</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>
                  {pendingAppointmentData?.scheduledAt
                    ? new Date(pendingAppointmentData.scheduledAt).toLocaleDateString("en-GB")
                    : ""}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total:</span>
                <span>{appointmentPrice}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <PaymentElement
          options={{
            layout: "tabs",
            defaultValues: {
              billingDetails: {
                name: "",
                email: "",
              },
            },
          }}
          onReady={() => {
            console.log("PaymentElement ready");
          }}
          onLoadError={(error) => {
            console.error("PaymentElement load error:", error);
            // Don't immediately show dev mode on load error - give it time
            setTimeout(() => setShowDevMode(true), 3000);
          }}
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || !elements || isProcessing} className="flex-1">
          {isProcessing ? "Processing..." : `Pay ${appointmentPrice}`}
        </Button>
      </div>
    </form>
  );
};
