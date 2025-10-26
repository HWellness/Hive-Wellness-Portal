import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertTriangle,
  Settings,
  User as UserIcon,
  Save,
  RefreshCw
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@shared/schema';

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface DayAvailability {
  day: string;
  isAvailable: boolean;
  timeSlots: TimeSlot[];
}

interface TherapistAvailability {
  id?: string;
  therapistId: string;
  weeklySchedule: DayAvailability[];
  timeZone: string;
  bufferTime: number; // minutes between sessions
  maxDailyClients: number;
  isActive: boolean;
  lastUpdated?: string;
}

interface TherapistAvailabilityEnhancedProps {
  user: User;
}

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
  'Friday', 'Saturday', 'Sunday'
];

const COMMON_TIME_SLOTS = [
  { start: '09:00', end: '10:00' },
  { start: '10:00', end: '11:00' },
  { start: '11:00', end: '12:00' },
  { start: '13:00', end: '14:00' },
  { start: '14:00', end: '15:00' },
  { start: '15:00', end: '16:00' },
  { start: '16:00', end: '17:00' },
  { start: '17:00', end: '18:00' },
  { start: '18:00', end: '19:00' },
  { start: '19:00', end: '20:00' }
];

export default function TherapistAvailabilityEnhanced({ user }: TherapistAvailabilityEnhancedProps) {
  const [availability, setAvailability] = useState<TherapistAvailability>({
    therapistId: user.id,
    weeklySchedule: DAYS_OF_WEEK.map(day => ({
      day,
      isAvailable: false,
      timeSlots: []
    })),
    timeZone: 'Europe/London',
    bufferTime: 10,
    maxDailyClients: 8,
    isActive: true
  });

  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load existing availability
  const { data: existingAvailability, isLoading } = useQuery<TherapistAvailability>({
    queryKey: ['/api/therapist-availability', user.id],
    enabled: !!user.id
  });

  // Update availability mutation
  const updateAvailabilityMutation = useMutation({
    mutationFn: (data: TherapistAvailability) => 
      apiRequest('POST', '/api/therapist-availability', data),
    onSuccess: () => {
      toast({
        title: "✅ Availability Saved Successfully",
        description: `Updated schedule with ${getActiveDaysCount()} active days and ${getTotalWeeklyHours()} weekly hours.`,
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/therapist-availability'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update availability schedule.",
        variant: "destructive"
      });
    }
  });

  // Load existing data
  useEffect(() => {
    if (existingAvailability) {
      setAvailability(existingAvailability);
    }
  }, [existingAvailability]);

  const generateTimeSlotId = () => `slot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const toggleDayAvailability = (dayIndex: number) => {
    const updatedSchedule = [...availability.weeklySchedule];
    updatedSchedule[dayIndex].isAvailable = !updatedSchedule[dayIndex].isAvailable;
    
    // Clear time slots if day becomes unavailable
    if (!updatedSchedule[dayIndex].isAvailable) {
      updatedSchedule[dayIndex].timeSlots = [];
    }

    setAvailability({
      ...availability,
      weeklySchedule: updatedSchedule
    });
    setHasChanges(true);
  };

  const addTimeSlot = (dayIndex: number) => {
    const updatedSchedule = [...availability.weeklySchedule];
    const newSlot: TimeSlot = {
      id: generateTimeSlotId(),
      startTime: '09:00',
      endTime: '10:00',
      isActive: true
    };
    
    updatedSchedule[dayIndex].timeSlots.push(newSlot);
    
    setAvailability({
      ...availability,
      weeklySchedule: updatedSchedule
    });
    setHasChanges(true);
  };

  const removeTimeSlot = (dayIndex: number, slotId: string) => {
    const updatedSchedule = [...availability.weeklySchedule];
    updatedSchedule[dayIndex].timeSlots = updatedSchedule[dayIndex].timeSlots.filter(
      slot => slot.id !== slotId
    );
    
    // Automatically turn off day availability if no time slots remain
    if (updatedSchedule[dayIndex].timeSlots.length === 0) {
      updatedSchedule[dayIndex].isAvailable = false;
    }
    
    setAvailability({
      ...availability,
      weeklySchedule: updatedSchedule
    });
    setHasChanges(true);
  };

  const updateTimeSlot = (dayIndex: number, slotId: string, field: keyof TimeSlot, value: string | boolean) => {
    const updatedSchedule = [...availability.weeklySchedule];
    const slotIndex = updatedSchedule[dayIndex].timeSlots.findIndex(slot => slot.id === slotId);
    
    if (slotIndex !== -1) {
      updatedSchedule[dayIndex].timeSlots[slotIndex] = {
        ...updatedSchedule[dayIndex].timeSlots[slotIndex],
        [field]: value
      };
      
      setAvailability({
        ...availability,
        weeklySchedule: updatedSchedule
      });
      setHasChanges(true);
    }
  };

  const addCommonTimeSlots = (dayIndex: number) => {
    const updatedSchedule = [...availability.weeklySchedule];
    const newSlots = COMMON_TIME_SLOTS.map(slot => ({
      id: generateTimeSlotId(),
      startTime: slot.start,
      endTime: slot.end,
      isActive: true
    }));
    
    updatedSchedule[dayIndex].timeSlots = [...updatedSchedule[dayIndex].timeSlots, ...newSlots];
    
    setAvailability({
      ...availability,
      weeklySchedule: updatedSchedule
    });
    setHasChanges(true);
  };

  const validateAvailability = () => {
    // Filter days that are both available AND have time slots
    const activeDaysWithSlots = availability.weeklySchedule.filter(day => 
      day.isAvailable && day.timeSlots.length > 0
    );
    
    // Allow saving even with zero available days (therapist might want to temporarily disable all availability)
    if (activeDaysWithSlots.length === 0) {
      // Optional warning but allow save
      if (availability.weeklySchedule.some(day => day.isAvailable)) {
        toast({
          title: "Notice",
          description: "You have days marked as available but no time slots defined. Those days will be disabled.",
          variant: "default",
        });
      }
      return true; // Allow save
    }

    // Check for overlapping time slots only for active days with slots
    for (const day of activeDaysWithSlots) {
      const sortedSlots = [...day.timeSlots].sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 0; i < sortedSlots.length - 1; i++) {
        if (sortedSlots[i].endTime > sortedSlots[i + 1].startTime) {
          toast({
            title: "Validation Error",
            description: `Overlapping time slots detected on ${day.day}`,
            variant: "destructive",
          });
          return false;
        }
      }
    }

    return true;
  };

  const handleSaveAvailability = () => {
    if (!validateAvailability()) {
      return;
    }
    updateAvailabilityMutation.mutate(availability);
  };

  const getTotalWeeklyHours = () => {
    return availability.weeklySchedule.reduce((total, day) => {
      if (!day.isAvailable) return total;
      
      return total + day.timeSlots.reduce((dayTotal, slot) => {
        if (!slot.isActive) return dayTotal;
        
        const start = new Date(`2000-01-01T${slot.startTime}:00`);
        const end = new Date(`2000-01-01T${slot.endTime}:00`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        
        return dayTotal + hours;
      }, 0);
    }, 0);
  };

  const getActiveDaysCount = () => {
    return availability.weeklySchedule.filter(day => day.isAvailable && day.timeSlots.length > 0).length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading availability...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Availability Management</h1>
          <p className="text-gray-600">Set your weekly availability schedule for client sessions</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {hasChanges && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
          
          <Button 
            onClick={handleSaveAvailability}
            disabled={updateAvailabilityMutation.isPending || !hasChanges}
            className="bg-hive-purple hover:bg-hive-purple/90"
          >
            {updateAvailabilityMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-hive-purple" />
              <div>
                <p className="text-sm font-medium text-gray-600">Weekly Hours</p>
                <p className="text-2xl font-bold text-gray-900">{getTotalWeeklyHours()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-hive-purple" />
              <div>
                <p className="text-sm font-medium text-gray-600">Active Days</p>
                <p className="text-2xl font-bold text-gray-900">{getActiveDaysCount()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserIcon className="w-5 h-5 text-hive-purple" />
              <div>
                <p className="text-sm font-medium text-gray-600">Max Daily Clients</p>
                <p className="text-2xl font-bold text-gray-900">{availability.maxDailyClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-hive-purple" />
            <span>Schedule Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="buffer-time">Buffer Time (minutes)</Label>
              <Input
                id="buffer-time"
                type="number"
                value={availability.bufferTime}
                onChange={(e) => {
                  setAvailability({
                    ...availability,
                    bufferTime: parseInt(e.target.value) || 0
                  });
                  setHasChanges(true);
                }}
                min="0"
                max="30"
              />
              <p className="text-xs text-gray-500 mt-1">Time between sessions</p>
            </div>
            
            <div>
              <Label htmlFor="max-clients">Max Daily Clients</Label>
              <Input
                id="max-clients"
                type="number"
                value={availability.maxDailyClients}
                onChange={(e) => {
                  setAvailability({
                    ...availability,
                    maxDailyClients: parseInt(e.target.value) || 1
                  });
                  setHasChanges(true);
                }}
                min="1"
                max="20"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum clients per day</p>
            </div>
            
            <div>
              <Label htmlFor="timezone">Time Zone</Label>
              <select
                id="timezone"
                value={availability.timeZone}
                onChange={(e) => {
                  setAvailability({
                    ...availability,
                    timeZone: e.target.value
                  });
                  setHasChanges(true);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-hive-purple"
              >
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="Europe/Dublin">Dublin (GMT/IST)</option>
                <option value="Europe/Paris">Paris (CET/CEST)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Schedule */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Weekly Schedule</h2>
        
        {DAYS_OF_WEEK.map((day, dayIndex) => {
          const dayData = availability.weeklySchedule[dayIndex];
          
          return (
            <Card key={day}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={dayData.isAvailable}
                      onCheckedChange={() => toggleDayAvailability(dayIndex)}
                    />
                    <CardTitle className="text-lg">{day}</CardTitle>
                    {dayData.isAvailable && dayData.timeSlots.length > 0 && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {dayData.timeSlots.filter(slot => slot.isActive).length} slots
                      </Badge>
                    )}
                  </div>
                  
                  {dayData.isAvailable && (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addTimeSlot(dayIndex)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Slot
                      </Button>
                      
                      {dayData.timeSlots.length === 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addCommonTimeSlots(dayIndex)}
                          className="text-hive-purple border-hive-purple hover:bg-hive-purple hover:text-white"
                        >
                          <Clock className="w-4 h-4 mr-1" />
                          Quick Setup
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              
              {dayData.isAvailable && (
                <CardContent>
                  {dayData.timeSlots.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No time slots configured for {day}</p>
                      <p className="text-sm">Add time slots to accept bookings on this day</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dayData.timeSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`p-4 border rounded-lg ${
                            slot.isActive 
                              ? 'border-green-200 bg-green-50' 
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Switch
                              checked={slot.isActive}
                              onCheckedChange={(checked) => 
                                updateTimeSlot(dayIndex, slot.id, 'isActive', checked)
                              }
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeTimeSlot(dayIndex, slot.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Start</Label>
                              <Input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => 
                                  updateTimeSlot(dayIndex, slot.id, 'startTime', e.target.value)
                                }
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">End</Label>
                              <Input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => 
                                  updateTimeSlot(dayIndex, slot.id, 'endTime', e.target.value)
                                }
                                className="text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {hasChanges && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            You have unsaved changes to your availability schedule. Click "Save Changes" to update your schedule.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}