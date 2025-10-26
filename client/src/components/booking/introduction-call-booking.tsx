import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, Clock, ChevronLeft, ChevronRight, Video, Loader2, RefreshCw, AlertTriangle } from "lucide-react";

interface IntroductionCallBookingProps {
  onBookingComplete?: (videoLink: string) => void;
}

export default function IntroductionCallBooking({ onBookingComplete }: IntroductionCallBookingProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form data - persist across dialog opens/closes
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    userType: 'client',
    therapistId: 'admin' // NEW: Default to admin for general introduction calls
  });
  
  // Debug logging to track state issues
  useEffect(() => {
    console.log('📝 IntroductionCallBooking: Form data state:', formData);
    console.log('📍 IntroductionCallBooking: Current step:', step);
  }, [formData, step]);

  // Removed therapist selection - introduction calls are always with admin
  
  // Calendar state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Array<{
    time: string;
    available: boolean;
    reason?: string;
    datetime: string | null;
  }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [refreshingAvailability, setRefreshingAvailability] = useState(false);

  // Introduction calls are always with admin - no therapist fetching needed

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric', 
      month: 'long',
      day: 'numeric'
    });
  };

  const generateCalendarDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 41);
    
    for (let current = new Date(startDate); current <= endDate; current.setDate(current.getDate() + 1)) {
      days.push(new Date(current));
    }
    
    return days;
  };

  // Fetch available time slots for selected date
  const fetchAvailableSlots = async (date: Date, isRefresh = false) => {
    if (isRefresh) {
      setRefreshingAvailability(true);
    } else {
      setLoadingSlots(true);
      setSelectedTime(null); // Clear selected time when date changes
    }
    
    try {
      // CRITICAL FIX: Use UK-local date string instead of UTC to avoid ±1 day shifts
      const dateString = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Europe/London', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).format(date);
      
      // Introduction calls always use admin calendar
      const response = await apiRequest('GET', `/api/introduction-calls/available-slots/${dateString}`);
      const data = await response.json();
      
      console.log(`🔍 Checking admin calendar availability for ${dateString}`);
      console.log(`📅 API response for ${dateString}:`, data);
      
      if (data.slots) {
        setAvailableSlots(data.slots);
        console.log(`📅 Loaded ${data.availableCount}/${data.totalSlots} available slots for ${dateString}`);
        
        if (isRefresh) {
          toast({
            title: "Availability Updated",
            description: `Found ${data.availableCount} available time slots`,
          });
        }
      } else {
        setAvailableSlots([]);
        toast({
          title: "No availability data",
          description: "Unable to load time slot availability. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setAvailableSlots([]);
      toast({
        title: "Error loading availability",
        description: "Unable to check time slot availability. Please refresh and try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingSlots(false);
      setRefreshingAvailability(false);
    }
  };

  // Manual refresh function for real-time updates
  const handleRefreshAvailability = () => {
    if (selectedDate) {
      fetchAvailableSlots(selectedDate, true);
    }
  };

  // Load available slots when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate]); // Only refresh when date changes - therapist is always admin

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNextStep = () => {
    if (step === 1) {
      // Validate form data
      if (!formData.name || !formData.email || !formData.message) {
        toast({
          title: "Required Information Missing",
          description: "Please fill in all required fields before continuing.",
          variant: "destructive",
        });
        return;
      }
      setStep(2);
    }
  };

  const handleBooking = async () => {
    if (!selectedTime || !selectedDate) {
      toast({
        title: "Select Date and Time",
        description: "Please select both a date and time for your introduction call.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Send structured timezone data instead of fake UTC strings
      const [time, period] = selectedTime.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      
      // Convert to 24-hour format
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) {
        hour24 = hours + 12;
      } else if (period === 'AM' && hours === 12) {
        hour24 = 0;
      }
      
      // Format date as YYYY-MM-DD (avoid timezone issues)
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      // Format time as HH:mm
      const hourStr = String(hour24).padStart(2, '0');
      const minuteStr = String(minutes || 0).padStart(2, '0');
      const timeString = `${hourStr}:${minuteStr}`;

      // Use new format with explicit separate date/time/timezone fields
      // This ensures proper timezone handling on the backend
      const bookingData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
        userType: formData.userType,
        date: dateString, // YYYY-MM-DD format
        time: timeString, // HH:mm format (24-hour)
        timeZone: 'Europe/London', // Explicit timezone
        source: 'portal_widget',
        therapistId: formData.therapistId
      };

      console.log('Submitting introduction call booking:', bookingData);
      
      const response = await apiRequest('POST', '/api/introduction-calls/book-widget', bookingData);
      
      // Handle different response types
      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.details || errorResult.error || `Server error: ${response.status}`);
      }
      
      const result = await response.json();

      if (result.success) {
        const videoLink = result.videoLink || `/video-session/${result.videoSessionId}?type=introduction-call&role=client`;
        
        toast({
          title: "Introduction Call Booked Successfully! 🎉",
          description: `Your call is scheduled for ${formatDate(selectedDate)} at ${selectedTime}. Check your email for details.`,
        });

        // Call the completion callback with video link
        if (onBookingComplete) {
          onBookingComplete(videoLink);
        }
      } else {
        throw new Error(result.message || 'Booking failed');
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      
      // Handle specific error types with clearer, more helpful messages
      let errorTitle = "Booking Failed";
      let errorMessage = "Failed to book your introduction call. Please try again.";
      
      if (error.message) {
        if (error.message.includes('already booked') || error.message.includes('Time slot')) {
          errorTitle = "⏰ Time Slot No Longer Available";
          errorMessage = "This time slot was just booked by another client. Please select a different time - we've refreshed the available slots for you.";
          setTimeout(() => fetchAvailableSlots(selectedDate, true), 500);
        } else if (error.message.includes('Calendar conflict')) {
          errorTitle = "📅 Calendar Conflict";
          errorMessage = "This time conflicts with another appointment. Please choose a different available time slot.";
          setTimeout(() => fetchAvailableSlots(selectedDate, true), 500);
        } else if (error.message.includes('Date is required')) {
          errorTitle = "📅 Please Select a Date";
          errorMessage = "A date is required for your introduction call. Please select an available date from the calendar.";
        } else if (error.message.includes('Time is required')) {
          errorTitle = "⏰ Please Select a Time";
          errorMessage = "A time slot is required for your introduction call. Please select an available time.";
        } else if (error.message.includes('Selected time is invalid')) {
          errorTitle = "⚠️ Invalid Time Selected";
          errorMessage = error.message; // Use the specific time error from backend
          setTimeout(() => fetchAvailableSlots(selectedDate, true), 500);
        } else if (error.message.includes('Selected date is invalid')) {
          errorTitle = "⚠️ Invalid Date Selected";
          errorMessage = error.message; // Use the specific date error from backend
        } else if (error.message.includes('validation') || error.message.includes('Invalid')) {
          errorTitle = "📝 Please Check Your Information";
          errorMessage = error.message.includes('Please') ? error.message : "Please check your booking information and try again.";
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          errorTitle = "🌐 Connection Issue";
          errorMessage = "Unable to process your booking due to a connection issue. Please check your internet and try again.";
        } else if (error.message.includes('server') || error.message.includes('500')) {
          errorTitle = "🔧 Temporary System Issue";
          errorMessage = "Our booking system is experiencing a temporary issue. Please try again in a few moments.";
        } else {
          errorTitle = "⚠️ Booking Issue";
          errorMessage = error.message || "An unexpected error occurred. Please try again or contact us at support@hive-wellness.co.uk";
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 1) {
    return (
      <Card className="w-full max-w-3xl mx-auto shadow-lg border-0">
        <CardHeader className="text-center space-y-2 pb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-hive-purple/10 rounded-full mb-4">
            <Calendar className="w-8 h-8 text-hive-purple" />
          </div>
          <CardTitle className="text-3xl font-primary text-hive-purple">
            Book Your Free Introduction Call
          </CardTitle>
          <p className="text-gray-600 text-lg max-w-md mx-auto">
            Tell us about yourself and what you're looking for in therapy
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-4">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-hive-purple rounded-full mr-2"></div>
              Step 1 of 2
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 px-8 pb-8">
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter your full name"
              data-testid="input-name"
            />
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter your email address"
              data-testid="input-email"
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Enter your phone number"
            />
          </div>

          <div>
            <Label htmlFor="userType">I am a... *</Label>
            <Select value={formData.userType} onValueChange={(value) => handleInputChange('userType', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Prospective Client</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Enhanced admin call explanation with better visual design */}
          <div className="bg-gradient-to-r from-hive-purple/10 to-purple-50 border border-hive-purple/20 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-hive-purple/5 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative">
              <div className="flex items-center mb-3">
                <div className="bg-hive-purple text-white p-2 rounded-lg mr-3">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-hive-purple text-lg">Free Introduction Call</h3>
                  <p className="text-sm text-hive-purple/80">15-minute consultation with our admin team</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                During this call, we'll discuss your needs, answer questions, and help match you with the perfect therapist for your journey.
              </p>
              <div className="flex items-center mt-3 text-xs text-hive-purple/70">
                <Clock className="h-4 w-4 mr-1" />
                <span>Free • 15 minutes • Google Meet</span>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="message">What brings you here today? *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              placeholder="Tell us about your interest in our services or what you hope to achieve..."
              rows={4}
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleNextStep} 
              className="bg-hive-purple hover:bg-hive-purple/90"
              data-testid="button-next-step"
            >
              Continue to Date Selection
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-5xl mx-auto shadow-lg border-0">
      <CardHeader className="text-center space-y-3 pb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-hive-purple/10 rounded-full mb-2">
          <Clock className="w-8 h-8 text-hive-purple" />
        </div>
        <CardTitle className="text-3xl font-primary text-hive-purple">
          Select Your Preferred Date & Time
        </CardTitle>
        <p className="text-gray-600 text-lg">
          Choose when you'd like to have your free 15-minute introduction call
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-4">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-hive-purple rounded-full mr-2"></div>
            Step 2 of 2
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calendar */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Select Date</h4>
            <p className="text-sm text-gray-600 mb-4">Available Monday - Friday</p>
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
              <h3 className="font-semibold text-lg">
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
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
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
                        ? 'bg-hive-purple text-white' 
                        : isToday && !isDisabled
                          ? 'bg-hive-purple/20 text-hive-purple font-semibold'
                          : isDisabled
                            ? 'text-gray-300 cursor-not-allowed' 
                            : isCurrentMonth 
                              ? 'hover:bg-hive-purple/10 text-gray-900 cursor-pointer' 
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
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">Available Times</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshAvailability}
                disabled={loadingSlots || refreshingAvailability}
                className="flex items-center gap-2"
                data-testid="button-refresh-availability"
              >
                <RefreshCw className={`w-4 h-4 ${refreshingAvailability ? 'animate-spin' : ''}`} />
                {refreshingAvailability ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {loadingSlots ? "Checking availability..." : refreshingAvailability ? "Updating availability..." : "Select your preferred time slot"}
            </p>
            
            {loadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-hive-purple" />
                <span className="ml-2 text-gray-600">Loading available times...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    size="lg"
                    onClick={() => slot.available && setSelectedTime(slot.time)}
                    disabled={!slot.available}
                    className={`relative py-3 px-4 text-base font-medium transition-all duration-200 ${
                      selectedTime === slot.time 
                        ? "bg-hive-purple hover:bg-hive-purple/90 shadow-md transform scale-105" 
                        : slot.available
                          ? "hover:bg-hive-purple/5 hover:border-hive-purple/30 hover:scale-102"
                          : "opacity-40 cursor-not-allowed bg-gray-50 text-gray-400 hover:scale-100"
                    }`}
                    title={!slot.available ? slot.reason || "Time unavailable" : "Select this time"}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4" />
                      {slot.time}
                      {selectedTime === slot.time && (
                        <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Selected</span>
                      )}
                      {!slot.available && (
                        <span className="text-xs opacity-70">(Booked)</span>
                      )}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Summary and Booking Section */}
        {selectedTime && (
          <div className="mt-10 p-8 bg-gradient-to-r from-hive-purple/5 to-purple-50/30 rounded-2xl border border-hive-purple/10 shadow-inner">
            <h4 className="font-semibold text-hive-purple mb-3 flex items-center gap-2">
              <Video className="w-5 h-5" />
              Your Introduction Call Details
            </h4>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-hive-purple" />
                <span>{formatDate(selectedDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-hive-purple" />
                <span>{selectedTime}</span>
              </div>
              <div className="text-gray-600">
                <strong>Name:</strong> {formData.name}
              </div>
              <div className="text-gray-600">
                <strong>Email:</strong> {formData.email}
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Back to Details
              </Button>
              <Button 
                onClick={handleBooking}
                disabled={isSubmitting}
                className="bg-hive-purple hover:bg-hive-purple/90 flex-1"
                data-testid="button-confirm-booking"
              >
                {isSubmitting ? "Booking..." : "Confirm Introduction Call"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}