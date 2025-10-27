import { useState, useEffect, FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, X, Save, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";

interface TimeSlot {
  id: string;
  start: string; // HH:MM format
  end: string; // HH:MM format
  available: boolean;
}

interface DayAvailability {
  dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
  dayName: string;
  enabled: boolean;
  timeSlots: TimeSlot[];
}

interface WeeklySchedule {
  id?: string;
  therapistId: string;
  schedule: DayAvailability[];
  effectiveFrom: string;
  notes?: string;
}

const DAYS_OF_WEEK = [
  { value: 1, name: "Monday", short: "Mon" },
  { value: 2, name: "Tuesday", short: "Tue" },
  { value: 3, name: "Wednesday", short: "Wed" },
  { value: 4, name: "Thursday", short: "Thu" },
  { value: 5, name: "Friday", short: "Fri" },
  { value: 6, name: "Saturday", short: "Sat" },
  { value: 0, name: "Sunday", short: "Sun" },
];

const DEFAULT_TIME_SLOTS = [
  { start: "09:00", end: "10:00" },
  { start: "10:00", end: "11:00" },
  { start: "11:00", end: "12:00" },
  { start: "13:00", end: "14:00" },
  { start: "14:00", end: "15:00" },
  { start: "15:00", end: "16:00" },
  { start: "16:00", end: "17:00" },
  { start: "17:00", end: "18:00" },
];

interface EnhancedAvailabilityManagerProps {
  therapistId: string;
  onAvailabilityChange?: (schedule: WeeklySchedule) => void;
}

export function EnhancedAvailabilityManager({
  therapistId,
  onAvailabilityChange,
}: EnhancedAvailabilityManagerProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<WeeklySchedule | null>(null);

  // Fetch current availability
  const { data: availabilityData, isLoading } = useQuery({
    queryKey: ["/api/therapist/availability", therapistId],
    queryFn: async () => {
      const response = await fetch(`/api/therapist/availability/${therapistId}`);
      if (response.status === 404) {
        return null; // No existing schedule
      }
      if (!response.ok) throw new Error("Failed to fetch availability");
      return response.json();
    },
  });

  // Save availability mutation
  const saveAvailabilityMutation = useMutation({
    mutationFn: async (schedule: WeeklySchedule) => {
      const response = await apiRequest("POST", "/api/therapist/availability", schedule);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/availability"] });
      toast({
        title: "Availability Updated",
        description: "Your weekly schedule has been saved successfully.",
      });
      setIsEditing(false);
      onAvailabilityChange?.(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize default schedule
  useEffect(() => {
    if (availabilityData) {
      setCurrentSchedule(availabilityData);
    } else if (!isLoading) {
      // Create default schedule if none exists
      const defaultSchedule: WeeklySchedule = {
        therapistId,
        effectiveFrom: new Date().toISOString().split("T")[0],
        schedule: DAYS_OF_WEEK.map((day) => ({
          dayOfWeek: day.value,
          dayName: day.name,
          enabled: day.value >= 1 && day.value <= 5, // Mon-Fri enabled by default
          timeSlots: DEFAULT_TIME_SLOTS.map((slot, index) => ({
            id: `${day.value}-${index}`,
            start: slot.start,
            end: slot.end,
            available: true,
          })),
        })),
      };
      setCurrentSchedule(defaultSchedule);
    }
  }, [availabilityData, isLoading, therapistId]);

  const toggleDayEnabled = (dayOfWeek: number) => {
    if (!currentSchedule) return;

    setCurrentSchedule({
      ...currentSchedule,
      schedule: currentSchedule.schedule.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, enabled: !day.enabled } : day
      ),
    });
  };

  const toggleTimeSlot = (dayOfWeek: number, slotId: string) => {
    if (!currentSchedule) return;

    setCurrentSchedule({
      ...currentSchedule,
      schedule: currentSchedule.schedule.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              timeSlots: day.timeSlots.map((slot) =>
                slot.id === slotId ? { ...slot, available: !slot.available } : slot
              ),
            }
          : day
      ),
    });
  };

  const addCustomTimeSlot = (dayOfWeek: number, start: string, end: string) => {
    if (!currentSchedule) return;

    const newSlot: TimeSlot = {
      id: `${dayOfWeek}-custom-${Date.now()}`,
      start,
      end,
      available: true,
    };

    setCurrentSchedule({
      ...currentSchedule,
      schedule: currentSchedule.schedule.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              timeSlots: [...day.timeSlots, newSlot].sort((a, b) => a.start.localeCompare(b.start)),
            }
          : day
      ),
    });
  };

  const removeTimeSlot = (dayOfWeek: number, slotId: string) => {
    if (!currentSchedule) return;

    setCurrentSchedule({
      ...currentSchedule,
      schedule: currentSchedule.schedule.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              timeSlots: day.timeSlots.filter((slot) => slot.id !== slotId),
            }
          : day
      ),
    });
  };

  const handleSave = () => {
    if (!currentSchedule) return;
    saveAvailabilityMutation.mutate(currentSchedule);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-purple-600 mr-2" />
            <span>Loading availability...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentSchedule) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Schedule Set</h3>
            <p className="text-gray-500 mb-4">
              Set up your weekly availability to start accepting bookings.
            </p>
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Schedule
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Weekly Availability</h2>
          <p className="text-gray-600">
            Manage your weekly schedule and availability for client bookings.
          </p>
        </div>
        <div className="flex space-x-2">
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              <Clock className="h-4 w-4 mr-2" />
              Edit Schedule
            </Button>
          ) : (
            <>
              <Button onClick={() => setIsEditing(false)} variant="outline">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveAvailabilityMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {saveAvailabilityMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {currentSchedule.schedule.map((day) => (
          <Card
            key={day.dayOfWeek}
            className={`${day.enabled ? "ring-2 ring-purple-100" : "opacity-60"}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {isEditing && (
                    <Checkbox
                      checked={day.enabled}
                      onCheckedChange={() => toggleDayEnabled(day.dayOfWeek)}
                    />
                  )}
                  <CardTitle className="text-lg">{day.dayName}</CardTitle>
                  <Badge variant={day.enabled ? "default" : "secondary"}>
                    {day.enabled ? "Available" : "Unavailable"}
                  </Badge>
                </div>
                {isEditing && day.enabled && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Time
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Time Slot - {day.dayName}</DialogTitle>
                      </DialogHeader>
                      <CustomTimeSlotForm
                        onAdd={(start, end) => addCustomTimeSlot(day.dayOfWeek, start, end)}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>

            {day.enabled && (
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {day.timeSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`
                        relative p-3 rounded-lg border-2 transition-all
                        ${
                          slot.available
                            ? "border-green-200 bg-green-50 hover:bg-green-100"
                            : "border-gray-200 bg-gray-50"
                        }
                        ${isEditing ? "cursor-pointer" : ""}
                      `}
                      onClick={() => isEditing && toggleTimeSlot(day.dayOfWeek, slot.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">
                          {slot.start} - {slot.end}
                        </div>
                        {isEditing && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTimeSlot(day.dayOfWeek, slot.id);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div
                        className={`text-xs mt-1 ${slot.available ? "text-green-700" : "text-gray-500"}`}
                      >
                        {slot.available ? "Available" : "Blocked"}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// Custom time slot form component
function CustomTimeSlotForm({ onAdd }: { onAdd: (start: string, end: string) => void }) {
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (startTime >= endTime) {
      alert("End time must be after start time");
      return;
    }
    onAdd(startTime, endTime);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Start Time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">End Time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>
      </div>
      <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
        Add Time Slot
      </Button>
    </form>
  );
}
