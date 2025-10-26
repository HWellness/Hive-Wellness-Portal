import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Plus, Trash2, Save, ExternalLink } from "lucide-react";

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface DayAvailability {
  dayOfWeek: number;
  dayName: string;
  isAvailable: boolean;
  timeSlots: TimeSlot[];
}

interface AvailabilityModalProps {
  userId: string;
  trigger: React.ReactNode;
}

export default function AvailabilityModal({ userId, trigger }: AvailabilityModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  // Initialize default availability structure
  useEffect(() => {
    const defaultAvailability: DayAvailability[] = [
      { dayOfWeek: 1, dayName: 'Monday', isAvailable: false, timeSlots: [] },
      { dayOfWeek: 2, dayName: 'Tuesday', isAvailable: false, timeSlots: [] },
      { dayOfWeek: 3, dayName: 'Wednesday', isAvailable: false, timeSlots: [] },
      { dayOfWeek: 4, dayName: 'Thursday', isAvailable: false, timeSlots: [] },
      { dayOfWeek: 5, dayName: 'Friday', isAvailable: false, timeSlots: [] },
      { dayOfWeek: 6, dayName: 'Saturday', isAvailable: false, timeSlots: [] },
      { dayOfWeek: 0, dayName: 'Sunday', isAvailable: false, timeSlots: [] }
    ];
    setAvailability(defaultAvailability);
  }, []);

  // Fetch existing availability
  const { data: existingAvailability, isLoading } = useQuery({
    queryKey: ['/api/therapist/availability', userId],
    enabled: isOpen,
    retry: false,
  });

  // Update availability when data is loaded
  useEffect(() => {
    if (existingAvailability && existingAvailability.length > 0) {
      const updatedAvailability = availability.map(day => {
        const existing = existingAvailability.find((a: any) => a.dayOfWeek === day.dayOfWeek);
        if (existing) {
          return {
            ...day,
            isAvailable: existing.isAvailable,
            timeSlots: existing.timeSlots || []
          };
        }
        return day;
      });
      setAvailability(updatedAvailability);
    }
  }, [existingAvailability]);

  // Save availability mutation
  const saveAvailabilityMutation = useMutation({
    mutationFn: async (availabilityData: DayAvailability[]) => {
      return await apiRequest('POST', '/api/therapist/availability', {
        userId,
        availability: availabilityData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/availability', userId] });
      toast({
        title: "Availability Updated",
        description: "Your availability has been saved successfully.",
      });
      setHasChanges(false);
    },
    onError: (error) => {
      toast({
        title: "Error Saving Availability",
        description: error.message || "Failed to save availability",
        variant: "destructive",
      });
    }
  });

  const toggleDayAvailability = (dayIndex: number) => {
    const updated = availability.map((day, index) => {
      if (index === dayIndex) {
        const newDay = { ...day, isAvailable: !day.isAvailable };
        if (!newDay.isAvailable) {
          newDay.timeSlots = []; // Clear time slots when day is disabled
        } else if (newDay.timeSlots.length === 0) {
          // Add default time slot when enabling a day
          newDay.timeSlots = [{
            id: `${Date.now()}`,
            startTime: '09:00',
            endTime: '17:00'
          }];
        }
        return newDay;
      }
      return day;
    });
    setAvailability(updated);
    setHasChanges(true);
  };

  const addTimeSlot = (dayIndex: number) => {
    const updated = availability.map((day, index) => {
      if (index === dayIndex) {
        const newTimeSlot: TimeSlot = {
          id: `${Date.now()}`,
          startTime: '09:00',
          endTime: '17:00'
        };
        return {
          ...day,
          timeSlots: [...day.timeSlots, newTimeSlot]
        };
      }
      return day;
    });
    setAvailability(updated);
    setHasChanges(true);
  };

  const removeTimeSlot = (dayIndex: number, slotId: string) => {
    const updated = availability.map((day, index) => {
      if (index === dayIndex) {
        return {
          ...day,
          timeSlots: day.timeSlots.filter(slot => slot.id !== slotId)
        };
      }
      return day;
    });
    setAvailability(updated);
    setHasChanges(true);
  };

  const updateTimeSlot = (dayIndex: number, slotId: string, field: 'startTime' | 'endTime', value: string) => {
    const updated = availability.map((day, index) => {
      if (index === dayIndex) {
        return {
          ...day,
          timeSlots: day.timeSlots.map(slot => 
            slot.id === slotId ? { ...slot, [field]: value } : slot
          )
        };
      }
      return day;
    });
    setAvailability(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    saveAvailabilityMutation.mutate(availability);
  };

  const getTotalHours = () => {
    let total = 0;
    availability.forEach(day => {
      if (day.isAvailable) {
        day.timeSlots.forEach(slot => {
          const start = new Date(`1970-01-01T${slot.startTime}:00`);
          const end = new Date(`1970-01-01T${slot.endTime}:00`);
          total += (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        });
      }
    });
    return total;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-hive-purple" />
            My Availability
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className="bg-hive-light-blue">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-hive-black">Weekly Availability</p>
                  <p className="text-2xl font-bold text-hive-purple">{getTotalHours()} hours</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {availability.filter(day => day.isAvailable).length} days active
                  </p>
                  <Badge variant="outline" className="mt-1">
                    <Clock className="w-3 h-3 mr-1" />
                    Recurring Weekly
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Google Calendar Integration Card */}
          <Card className="border-dashed border-2 border-gray-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-8 h-8 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-700">Google Calendar Sync</p>
                    <p className="text-sm text-gray-500">Automatically sync your availability with Google Calendar</p>
                  </div>
                </div>
                <Button variant="outline" disabled className="text-gray-500">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Day by Day Availability */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-hive-black">Weekly Schedule</h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hive-purple"></div>
              </div>
            ) : (
              availability.map((day, dayIndex) => (
                <Card key={day.dayOfWeek} className="bg-white">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Label className="text-base font-medium text-hive-black">
                          {day.dayName}
                        </Label>
                        <Badge variant={day.isAvailable ? "default" : "secondary"}>
                          {day.isAvailable ? "Available" : "Unavailable"}
                        </Badge>
                      </div>
                      <Switch
                        checked={day.isAvailable}
                        onCheckedChange={() => toggleDayAvailability(dayIndex)}
                      />
                    </div>
                  </CardHeader>
                  
                  {day.isAvailable && (
                    <CardContent>
                      <div className="space-y-3">
                        {day.timeSlots.map((slot) => (
                          <div key={slot.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => updateTimeSlot(dayIndex, slot.id, 'startTime', e.target.value)}
                                className="px-2 py-1 border rounded text-sm"
                              />
                              <span className="text-gray-500">to</span>
                              <input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => updateTimeSlot(dayIndex, slot.id, 'endTime', e.target.value)}
                                className="px-2 py-1 border rounded text-sm"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTimeSlot(dayIndex, slot.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addTimeSlot(dayIndex)}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Time Block
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saveAvailabilityMutation.isPending}
              className="bg-hive-purple hover:bg-hive-purple/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveAvailabilityMutation.isPending ? 'Saving...' : 'Save Availability'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}