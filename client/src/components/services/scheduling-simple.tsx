import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, UserIcon, Plus, ChevronLeft, ChevronRight } from "lucide-react";

interface SchedulingProps {
  user: any;
}

export default function SchedulingService({ user }: SchedulingProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const demoAppointments = [
    {
      id: "1",
      therapistName: "Dr. Sarah Johnson",
      date: "2025-07-07",
      time: "2:00 PM",
      duration: "50 minutes",
      type: "Therapy Session",
      status: "confirmed"
    },
    {
      id: "2", 
      therapistName: "Dr. Sarah Johnson",
      date: "2025-07-14",
      time: "2:00 PM", 
      duration: "50 minutes",
      type: "Therapy Session",
      status: "pending"
    }
  ];

  const availableSlots = [
    "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
    "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM"
  ];

  const scheduleAppointment = () => {
    if (!selectedTime) {
      toast({
        title: "Select Time",
        description: "Please select a time slot to schedule your appointment.",
        variant: "destructive",
      });
      return;
    }

    const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
    if (isWeekend) {
      toast({
        title: "Weekend Not Available",
        description: "Appointments are only available Monday to Friday. Please select a weekday.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Appointment Scheduled",
      description: `Your appointment has been scheduled for ${formatDateShort(selectedDate)} at ${selectedTime}.`,
    });
    setSelectedTime(null);
  };

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleAppointmentId, setRescheduleAppointmentId] = useState<string | null>(null);

  const rescheduleAppointment = (appointmentId: string) => {
    setRescheduleAppointmentId(appointmentId);
    setShowRescheduleModal(true);
  };

  const cancelAppointment = (appointmentId: string) => {
    toast({
      title: "Appointment Cancelled",
      description: "Your appointment has been cancelled successfully.",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric', 
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const generateCalendarDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    const endDate = new Date(lastDay);
    
    // Adjust start date to beginning of week (Sunday = 0)
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // Adjust end date to end of week
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    const days = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">Scheduling</h1>
          <p className="text-gray-600 font-body mt-2">Book and manage your therapy appointments</p>
        </div>
        <Button 
          className="button-primary"
          onClick={() => setSelectedTime("2:00 PM")}
        >
          <Plus className="w-4 h-4 mr-2" />
          Schedule Appointment
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Calendar and Booking */}
        <div className="space-y-6">
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="font-display">Select Date & Time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Selector */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Select Date</h4>
                <p className="text-sm text-gray-600 mb-4">Appointments available Monday - Friday only</p>
                <div className="flex items-center justify-between mb-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(newDate.getMonth() - 1);
                      setSelectedDate(newDate);
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h3 className="font-display font-semibold text-lg">
                    {formatDate(selectedDate)}
                  </h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setSelectedDate(newDate);
                    }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-2 text-center text-sm">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="font-medium text-gray-500 py-2">{day}</div>
                  ))}
                  {generateCalendarDays(selectedDate).map((day, i) => {
                    const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                    const isSelected = day.getDate() === selectedDate.getDate() && 
                                     day.getMonth() === selectedDate.getMonth() && 
                                     day.getFullYear() === selectedDate.getFullYear();
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6; // Sunday = 0, Saturday = 6
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isPast = day.getTime() < today.getTime();
                    const isDisabled = isWeekend || isPast || !isCurrentMonth;
                    
                    return (
                      <button
                        key={i}
                        onClick={() => !isDisabled && setSelectedDate(day)}
                        disabled={isDisabled}
                        className={`py-2 px-1 rounded-lg text-sm transition-colors ${
                          isSelected && !isDisabled
                            ? 'bg-blue-600 text-white' 
                            : isToday && !isDisabled
                              ? 'bg-blue-100 text-blue-600 font-semibold'
                              : isDisabled
                                ? 'text-gray-300 cursor-not-allowed' 
                                : isCurrentMonth 
                                  ? 'hover:bg-blue-50 text-gray-900 cursor-pointer' 
                                  : 'text-gray-300'
                        }`}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Available Times</h4>
                <div className="grid grid-cols-2 gap-2">
                  {availableSlots.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTime(time)}
                      className={selectedTime === time ? "button-primary" : ""}
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </div>

              {selectedTime && (
                <div className="p-4 bg-blue-50 rounded-xl">
                  <h4 className="font-semibold text-blue-900 mb-2">Selected Appointment</h4>
                  <p className="text-blue-800 text-sm mb-3">
                    {formatDate(selectedDate)} at {selectedTime}
                  </p>
                  <Button 
                    className="button-primary w-full"
                    onClick={scheduleAppointment}
                  >
                    Confirm Appointment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Appointments */}
        <div className="space-y-6">
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="font-display">Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {demoAppointments.map((appointment) => (
                <div key={appointment.id} className="p-4 border border-gray-100 rounded-xl">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{appointment.therapistName}</h4>
                        <p className="text-sm text-gray-600">{appointment.type}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDateShort(new Date(appointment.date))}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {appointment.time}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge 
                        className={
                          appointment.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {appointment.status}
                      </Badge>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => rescheduleAppointment(appointment.id)}
                        >
                          Reschedule
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => cancelAppointment(appointment.id)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="card-modern hover:shadow-lg transition-all duration-200 cursor-pointer group">
              <CardContent 
                className="p-6 text-center"
                onClick={() => {
                  toast({
                    title: "Next Session Details",
                    description: "July 7, 2:00 PM - Dr. Sarah Johnson. Click 'View Session Details' to manage.",
                  });
                  // In a real app, this would navigate to session details
                }}
              >
                <div className="w-12 h-12 bg-blue-100 group-hover:bg-blue-200 rounded-xl flex items-center justify-center mx-auto mb-3 transition-colors">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Next Session</h3>
                <p className="text-sm text-gray-600">July 7, 2:00 PM</p>
                <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-blue-600 font-medium">Click to view details</p>
                </div>
              </CardContent>
            </Card>

            <Card className="card-modern hover:shadow-lg transition-all duration-200 cursor-pointer group">
              <CardContent 
                className="p-6 text-center"
                onClick={() => {
                  toast({
                    title: "Session History",
                    description: "12 sessions completed. View your therapy progress and session notes.",
                  });
                  // In a real app, this would navigate to session history page
                }}
              >
                <div className="w-12 h-12 bg-green-100 group-hover:bg-green-200 rounded-xl flex items-center justify-center mx-auto mb-3 transition-colors">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Total Sessions</h3>
                <p className="text-sm text-gray-600">12 completed</p>
                <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-green-600 font-medium">Click to view history</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="font-display font-semibold text-lg mb-4">Reschedule Appointment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select New Date
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select New Time
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Choose a time</option>
                  <option value="9:00 AM">9:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="2:00 PM">2:00 PM</option>
                  <option value="3:00 PM">3:00 PM</option>
                  <option value="4:00 PM">4:00 PM</option>
                </select>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600">
                  Note: Appointments can only be rescheduled to weekdays (Monday-Friday)
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRescheduleModal(false);
                  setRescheduleAppointmentId(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowRescheduleModal(false);
                  setRescheduleAppointmentId(null);
                  toast({
                    title: "Appointment Rescheduled",
                    description: "Your appointment has been successfully rescheduled.",
                  });
                }}
                className="flex-1"
              >
                Reschedule
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}