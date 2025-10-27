import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Calendar as CalendarIcon,
  CheckCircle,
  Clock,
  MessageSquare,
  RefreshCw,
  Search,
  User,
  Users,
  Video,
  Plus,
  AlertTriangle,
} from "lucide-react";

interface SchedulingEnhancedProps {
  user: {
    id: string;
    role: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

interface Appointment {
  id: string;
  clientId: string;
  therapistId: string;
  scheduledAt: string;
  duration: number;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "rescheduled";
  sessionType: "consultation" | "therapy" | "follow_up" | "assessment";
  notes?: string;
  price: number;
  currency: string;
  paymentStatus: "pending" | "paid" | "refunded";
  videoRoomId?: string;
  therapistName?: string;
  clientName?: string;
  reminderSent?: boolean;
  cancellationReason?: string;
  isRecurring?: boolean;
  recurringPattern?: string;
}

interface TherapistAvailability {
  therapistId: string;
  therapistName: string;
  specialisations: string[];
  hourlyRate: number;
  rating: number;
  experience: number;
  profileImage?: string;
  availableSlots: {
    date: string;
    time: string;
    duration: number;
    isAvailable: boolean;
  }[];
  nextAvailable?: string;
}

interface TimeSlot {
  time: string;
  isAvailable: boolean;
  therapistId?: string;
  price?: number;
}

const SchedulingEnhanced = React.memo(function SchedulingEnhanced({
  user,
}: SchedulingEnhancedProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedTherapist, setSelectedTherapist] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<
    "consultation" | "therapy" | "follow_up" | "assessment"
  >("therapy");
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [bookingNotes, setBookingNotes] = useState("");
  const [currentView, setCurrentView] = useState<"calendar" | "list">("calendar");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch user appointments
  const {
    data: appointments = [],
    isLoading: appointmentsLoading,
    refetch: refetchAppointments,
  } = useQuery({
    queryKey: [`/api/appointments/${user.id}`],
    retry: false,
  });

  // Fetch therapist availability for selected date
  const { data: availability = [], isLoading: availabilityLoading } = useQuery({
    queryKey: [`/api/therapist-availability`, selectedDate.toISOString().split("T")[0]],
    retry: false,
    enabled: !!selectedDate,
  });

  // Fetch user's therapist preferences or assignments
  const { data: userPreferences } = useQuery({
    queryKey: [`/api/user-preferences/${user.id}`],
    retry: false,
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      return apiRequest("POST", "/api/appointments", appointmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/appointments/${user.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/therapist-availability`] });
      setShowBookingDialog(false);
      resetBookingForm();
      toast({
        title: "Appointment Booked",
        description: "Your appointment has been successfully scheduled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to book appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update appointment mutation (for rescheduling/cancelling)
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      return apiRequest("PATCH", `/api/appointments/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/appointments/${user.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/therapist-availability`] });
      setShowRescheduleDialog(false);
      setSelectedAppointment(null);
      toast({
        title: "Appointment Updated",
        description: "Your appointment has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate time slots for selected date
  const generateTimeSlots = useCallback((): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 9; // 9 AM
    const endHour = 20; // 8 PM (extended from 5 PM)
    const slotDuration = 60; // 60 minutes

    // Normalize selected date to local date string for consistent comparison
    const selectedDateLocal = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    );
    const selectedDateStr = selectedDateLocal.toDateString();

    // Get appointments for the selected date
    const bookedSlots = (appointments || []).filter((apt: Appointment) => {
      const aptDate = new Date(apt.scheduledAt);
      const aptDateLocal = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate());
      return aptDateLocal.toDateString() === selectedDateStr && apt.status !== "cancelled";
    });

    for (let hour = startHour; hour < endHour; hour++) {
      const time = `${hour.toString().padStart(2, "0")}:00`;

      // Find available therapists for this time slot
      const availableTherapists = availability.filter((therapist: TherapistAvailability) =>
        therapist.availableSlots.some((slot) => slot.time === time && slot.isAvailable)
      );

      if (availableTherapists.length === 0) {
        // No therapists available at this time
        slots.push({
          time,
          isAvailable: false,
          therapistId: undefined,
          price: undefined,
        });
        continue;
      }

      // Find a therapist who is NOT booked at this time
      const availableTherapist = availableTherapists.find((therapist: TherapistAvailability) => {
        const isTherapistBooked = bookedSlots.some((apt: Appointment) => {
          const aptTime = new Date(apt.scheduledAt);
          return apt.therapistId === therapist.therapistId && aptTime.getHours() === hour;
        });
        return !isTherapistBooked;
      });

      if (availableTherapist) {
        slots.push({
          time,
          isAvailable: true,
          therapistId: availableTherapist.therapistId,
          price: availableTherapist.hourlyRate,
        });
      } else {
        // All available therapists are booked at this time
        slots.push({
          time,
          isAvailable: false,
          therapistId: undefined,
          price: undefined,
        });
      }
    }

    return slots;
  }, [availability, appointments, selectedDate]);

  // Reset booking form
  const resetBookingForm = useCallback(() => {
    setSelectedTime(null);
    setSelectedTherapist(null);
    setBookingNotes("");
  }, []);

  // Handle appointment booking
  const handleBookAppointment = useCallback(async () => {
    if (!selectedDate || !selectedTime || !selectedTherapist) {
      toast({
        title: "Missing Information",
        description: "Please select a date, time, and therapist.",
        variant: "destructive",
      });
      return;
    }

    const appointmentDateTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(":").map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    const selectedTherapistData = availability.find(
      (t: TherapistAvailability) => t.therapistId === selectedTherapist
    );

    const appointmentData = {
      clientId: user.id,
      therapistId: selectedTherapist,
      scheduledAt: appointmentDateTime.toISOString(),
      duration: 50, // Standard 50-minute session
      sessionType,
      status: "pending",
      paymentStatus: "pending",
      price: selectedTherapistData?.hourlyRate || 85,
      currency: "GBP",
      notes: bookingNotes,
      clientName: `${user.firstName || "Client"} ${user.lastName || ""}`.trim(),
      therapistName: selectedTherapistData?.therapistName || "Therapist",
    };

    createAppointmentMutation.mutate(appointmentData);
  }, [
    selectedDate,
    selectedTime,
    selectedTherapist,
    sessionType,
    bookingNotes,
    user,
    availability,
    createAppointmentMutation,
  ]);

  // Handle appointment cancellation
  const handleCancelAppointment = useCallback(
    (appointment: Appointment) => {
      updateAppointmentMutation.mutate({
        id: appointment.id,
        updates: {
          status: "cancelled",
          cancellationReason: "Cancelled by client",
        },
      });
    },
    [updateAppointmentMutation]
  );

  // Handle appointment rescheduling
  const handleRescheduleAppointment = useCallback(() => {
    if (!selectedAppointment || !selectedDate || !selectedTime) return;

    const newDateTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(":").map(Number);
    newDateTime.setHours(hours, minutes, 0, 0);

    updateAppointmentMutation.mutate({
      id: selectedAppointment.id,
      updates: {
        scheduledAt: newDateTime.toISOString(),
        status: "rescheduled",
      },
    });
  }, [selectedAppointment, selectedDate, selectedTime, updateAppointmentMutation]);

  // Filter appointments based on status and search (memoized for performance)
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment: Appointment) => {
      const matchesStatus = filterStatus === "all" || appointment.status === filterStatus;
      const matchesSearch =
        !searchQuery ||
        appointment.therapistName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        appointment.sessionType.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [appointments, filterStatus, searchQuery]);

  // Get status color for badges
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "rescheduled":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get session type icon
  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case "consultation":
        return <User className="h-4 w-4" />;
      case "therapy":
        return <MessageSquare className="h-4 w-4" />;
      case "follow_up":
        return <RefreshCw className="h-4 w-4" />;
      case "assessment":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const timeSlots = generateTimeSlots();

  if (appointmentsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Appointment Scheduling</h2>
          <p className="text-muted-foreground">Book, manage, and track your therapy sessions</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={currentView === "calendar" ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentView("calendar")}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendar
            </Button>
            <Button
              variant={currentView === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentView("list")}
            >
              <Users className="h-4 w-4 mr-2" />
              List
            </Button>
          </div>
          <Button onClick={() => setShowBookingDialog(true)} className="bg-primary">
            <Plus className="h-4 w-4 mr-2" />
            Book Session
          </Button>
        </div>
      </div>

      {currentView === "calendar" ? (
        /* Calendar View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Available Time Slots */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Available Times
                <Badge variant="outline" className="ml-2">
                  {selectedDate.toLocaleDateString()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {availabilityLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="space-y-2">
                  {timeSlots.map((slot) => (
                    <Button
                      key={slot.time}
                      variant={selectedTime === slot.time ? "default" : "outline"}
                      disabled={!slot.isAvailable}
                      onClick={() => setSelectedTime(slot.time)}
                      className="w-full justify-between"
                    >
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        {slot.time}
                      </span>
                      {slot.isAvailable && slot.price && (
                        <span className="text-sm">£{slot.price}</span>
                      )}
                    </Button>
                  ))}
                  {timeSlots.every((slot) => !slot.isAvailable) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                      <p>No available slots for this date</p>
                      <p className="text-sm">Try selecting a different date</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Today's Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {appointments.filter((apt: Appointment) => {
                const aptDate = new Date(apt.scheduledAt).toDateString();
                const today = new Date().toDateString();
                return aptDate === today;
              }).length > 0 ? (
                <div className="space-y-3">
                  {appointments
                    .filter((apt: Appointment) => {
                      const aptDate = new Date(apt.scheduledAt).toDateString();
                      const today = new Date().toDateString();
                      return aptDate === today;
                    })
                    .map((appointment: Appointment) => (
                      <div key={appointment.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            {getSessionTypeIcon(appointment.sessionType)}
                            <span className="ml-2 font-medium">
                              {new Date(appointment.scheduledAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <Badge className={getStatusColor(appointment.status)}>
                            {appointment.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {appointment.therapistName} • {appointment.sessionType}
                        </p>
                        {appointment.status === "confirmed" && (
                          <Button size="sm" className="mt-2 w-full">
                            <Video className="h-4 w-4 mr-2" />
                            Join Session
                          </Button>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-8 w-8 mx-auto mb-2" />
                  <p>No sessions today</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* List View */
        <div className="space-y-6">
          {/* Filters and Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search appointments..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Appointments List */}
          <div className="space-y-4">
            {filteredAppointments.length > 0 ? (
              filteredAppointments.map((appointment: Appointment) => (
                <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {getSessionTypeIcon(appointment.sessionType)}
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {appointment.therapistName || "Therapist"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(appointment.scheduledAt).toLocaleDateString()} at{" "}
                            {new Date(appointment.scheduledAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {appointment.sessionType} • {appointment.duration} minutes
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                        <div className="flex space-x-2">
                          {appointment.status === "confirmed" && (
                            <Button size="sm">
                              <Video className="h-4 w-4 mr-2" />
                              Join
                            </Button>
                          )}
                          {(appointment.status === "pending" ||
                            appointment.status === "confirmed") && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAppointment(appointment);
                                  setShowRescheduleDialog(true);
                                }}
                              >
                                Reschedule
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelAppointment(appointment)}
                                disabled={updateAppointmentMutation.isPending}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {appointment.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm">{appointment.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No appointments found</h3>
                  <p className="text-muted-foreground mb-4">
                    {filterStatus !== "all" || searchQuery
                      ? "Try adjusting your filters or search terms"
                      : "You don't have any scheduled appointments"}
                  </p>
                  <Button onClick={() => setShowBookingDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Book Your First Session
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book New Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sessionType">Session Type</Label>
              <Select value={sessionType} onValueChange={(value: any) => setSessionType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select session type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Initial Consultation</SelectItem>
                  <SelectItem value="therapy">Therapy Session</SelectItem>
                  <SelectItem value="follow_up">Follow-up Session</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="therapist">Preferred Therapist</Label>
              <Select value={selectedTherapist || ""} onValueChange={setSelectedTherapist}>
                <SelectTrigger>
                  <SelectValue placeholder="Select therapist" />
                </SelectTrigger>
                <SelectContent>
                  {availability.map((therapist: TherapistAvailability) => (
                    <SelectItem key={therapist.therapistId} value={therapist.therapistId}>
                      {therapist.therapistName} - £{therapist.hourlyRate}/hr
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="Any specific topics or concerns you'd like to discuss..."
                className="h-20"
              />
            </div>

            <div className="flex space-x-2 pt-4">
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
                  createAppointmentMutation.isPending || !selectedTime || !selectedTherapist
                }
                className="flex-1"
              >
                {createAppointmentMutation.isPending ? "Booking..." : "Book Appointment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Appointment</Label>
              {selectedAppointment && (
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">{selectedAppointment.therapistName}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedAppointment.scheduledAt).toLocaleDateString()} at{" "}
                    {new Date(selectedAppointment.scheduledAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label>New Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>

            <div>
              <Label>New Time</Label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {timeSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    disabled={!slot.isAvailable}
                    onClick={() => setSelectedTime(slot.time)}
                    size="sm"
                  >
                    {slot.time}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowRescheduleDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRescheduleAppointment}
                disabled={updateAppointmentMutation.isPending || !selectedTime}
                className="flex-1"
              >
                {updateAppointmentMutation.isPending ? "Rescheduling..." : "Reschedule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default SchedulingEnhanced;
