import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  Plus,
  Edit,
  Save,
  RefreshCw,
  User as UserIcon,
  Settings,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface DayAvailability {
  day: string;
  dayNumber: number; // 0=Sunday, 1=Monday, etc.
  isAvailable: boolean;
  timeSlots: TimeSlot[];
}

interface TherapistAvailabilityData {
  therapistId: string;
  therapistName: string;
  email: string;
  weeklySchedule: DayAvailability[];
  timeZone: string;
  isActive: boolean;
  totalWeeklyHours: number;
  lastUpdated?: string;
  accountStatus?: string;
  isPendingAccount?: boolean;
  sessionsPerWeek?: string | null;
}

interface AdminTherapistAvailabilityProps {
  user: User;
}

const DAYS_OF_WEEK = [
  { name: "Sunday", number: 0 },
  { name: "Monday", number: 1 },
  { name: "Tuesday", number: 2 },
  { name: "Wednesday", number: 3 },
  { name: "Thursday", number: 4 },
  { name: "Friday", number: 5 },
  { name: "Saturday", number: 6 },
];

const COMMON_TIME_SLOTS = [
  { start: "09:00", end: "10:00" },
  { start: "10:00", end: "11:00" },
  { start: "11:00", end: "12:00" },
  { start: "12:00", end: "13:00" },
  { start: "13:00", end: "14:00" },
  { start: "14:00", end: "15:00" },
  { start: "15:00", end: "16:00" },
  { start: "16:00", end: "17:00" },
  { start: "17:00", end: "18:00" },
  { start: "18:00", end: "19:00" },
  { start: "19:00", end: "20:00" },
];

export default function AdminTherapistAvailability({ user }: AdminTherapistAvailabilityProps) {
  const [selectedTherapist, setSelectedTherapist] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<TherapistAvailabilityData | null>(
    null
  );
  const [editingCapacityTherapistId, setEditingCapacityTherapistId] = useState<string | null>(null);
  const [selectedCapacity, setSelectedCapacity] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all therapists
  const { data: therapists = [], isLoading: therapistsLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/therapists"],
    select: (data: any) => data?.users?.filter((u: User) => u.role === "therapist") || [],
  });

  // Fetch therapist availability data
  const {
    data: availabilityData = [],
    isLoading: availabilityLoading,
    refetch,
  } = useQuery<TherapistAvailabilityData[]>({
    queryKey: ["/api/admin/therapist-availability-overview"],
    enabled: therapists.length > 0,
    staleTime: 30000, // Keep data fresh for 30 seconds
    refetchInterval: false, // Disable automatic polling
  });

  // Update therapist availability mutation
  const updateAvailabilityMutation = useMutation({
    mutationFn: (data: { therapistId: string; availability: any }) =>
      apiRequest(
        "POST",
        `/api/admin/therapist-availability/${data.therapistId}`,
        data.availability
      ),
    onSuccess: (_, variables) => {
      const therapist = therapists.find((t) => t.id === variables.therapistId);
      toast({
        title: "✅ Availability Updated",
        description: `Successfully updated availability for ${therapist?.firstName} ${therapist?.lastName}`,
      });
      setShowEditDialog(false);
      setEditingAvailability(null);

      // Force cache invalidation and refetch with longer timeout to ensure backend processing
      queryClient.invalidateQueries({ queryKey: ["/api/admin/therapist-availability-overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/therapist-availability"] });

      // Multiple refetch attempts to ensure data consistency
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/admin/therapist-availability-overview"] });
      }, 300);

      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/admin/therapist-availability-overview"] });
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update therapist availability.",
        variant: "destructive",
      });
    },
  });

  // Update therapist capacity mutation
  const updateCapacityMutation = useMutation({
    mutationFn: (data: { therapistId: string; sessionsPerWeek: string | null }) =>
      apiRequest("PATCH", `/api/admin/therapist/${data.therapistId}/capacity`, {
        sessionsPerWeek: data.sessionsPerWeek,
      }),
    onSuccess: (_, variables) => {
      const therapist = therapists.find((t) => t.id === variables.therapistId);
      toast({
        title: "✅ Capacity Updated",
        description: `Successfully updated capacity for ${therapist?.firstName} ${therapist?.lastName}`,
      });
      setEditingCapacityTherapistId(null);
      setSelectedCapacity("");

      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ["/api/admin/therapist-availability-overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/therapist-availability"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });

      // Refetch to ensure UI updates
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/admin/therapist-availability-overview"] });
        queryClient.refetchQueries({ queryKey: ["/api/admin/therapist-availability"] });
      }, 300);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update therapist capacity.",
        variant: "destructive",
      });
    },
  });

  const generateTimeSlotId = () => `slot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addTimeSlot = (dayIndex: number) => {
    if (!editingAvailability) return;

    const newSlot: TimeSlot = {
      id: generateTimeSlotId(),
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
    };

    const updatedSchedule = [...editingAvailability.weeklySchedule];
    updatedSchedule[dayIndex].timeSlots.push(newSlot);

    setEditingAvailability({
      ...editingAvailability,
      weeklySchedule: updatedSchedule,
    });
  };

  const removeTimeSlot = (dayIndex: number, slotId: string) => {
    if (!editingAvailability) return;

    const updatedSchedule = [...editingAvailability.weeklySchedule];
    updatedSchedule[dayIndex].timeSlots = updatedSchedule[dayIndex].timeSlots.filter(
      (slot) => slot.id !== slotId
    );

    setEditingAvailability({
      ...editingAvailability,
      weeklySchedule: updatedSchedule,
    });
  };

  const updateTimeSlot = (
    dayIndex: number,
    slotId: string,
    field: "startTime" | "endTime",
    value: string
  ) => {
    if (!editingAvailability) return;

    const updatedSchedule = [...editingAvailability.weeklySchedule];
    const slotIndex = updatedSchedule[dayIndex].timeSlots.findIndex((slot) => slot.id === slotId);

    if (slotIndex !== -1) {
      updatedSchedule[dayIndex].timeSlots[slotIndex][field] = value;
      setEditingAvailability({
        ...editingAvailability,
        weeklySchedule: updatedSchedule,
      });
    }
  };

  const toggleDayAvailability = (dayIndex: number, isAvailable: boolean) => {
    if (!editingAvailability) return;

    const updatedSchedule = [...editingAvailability.weeklySchedule];
    updatedSchedule[dayIndex].isAvailable = isAvailable;

    if (!isAvailable) {
      updatedSchedule[dayIndex].timeSlots = [];
    }

    setEditingAvailability({
      ...editingAvailability,
      weeklySchedule: updatedSchedule,
    });
  };

  const openEditDialog = (therapistId: string) => {
    const therapist = therapists.find((t) => t.id === therapistId);
    const existingAvailability = availabilityData.find((a) => a.therapistId === therapistId);

    if (!therapist) return;

    const defaultAvailability: TherapistAvailabilityData = {
      therapistId: therapist.id,
      therapistName: `${therapist.firstName || ""} ${therapist.lastName || ""}`.trim(),
      email: therapist.email,
      weeklySchedule: DAYS_OF_WEEK.map((day) => ({
        day: day.name,
        dayNumber: day.number,
        isAvailable: false,
        timeSlots: [],
      })),
      timeZone: "Europe/London",
      isActive: true,
      totalWeeklyHours: 0,
    };

    console.log("Opening edit dialog for therapist:", therapistId);
    console.log("Existing availability data:", existingAvailability);

    // Use existing availability if found, otherwise use defaults
    let availabilityToEdit;

    if (
      existingAvailability &&
      existingAvailability.weeklySchedule &&
      existingAvailability.weeklySchedule.length > 0
    ) {
      // Found existing data - ensure it has proper structure
      availabilityToEdit = {
        ...existingAvailability,
        therapistName:
          existingAvailability.therapistName ||
          `${therapist.firstName || ""} ${therapist.lastName || ""}`.trim(),
        email: existingAvailability.email || therapist.email,
        timeZone: existingAvailability.timeZone || "Europe/London",
        // Ensure all days are present and properly structured
        weeklySchedule: DAYS_OF_WEEK.map((dayDef) => {
          const existingDay = existingAvailability.weeklySchedule.find(
            (d) => d.dayNumber === dayDef.number
          );
          return {
            day: dayDef.name,
            dayNumber: dayDef.number,
            isAvailable: existingDay?.isAvailable || false,
            timeSlots:
              existingDay?.timeSlots?.map((slot) => ({
                id: slot.id || generateTimeSlotId(),
                startTime: slot.startTime || "09:00",
                endTime: slot.endTime || "17:00",
                isActive: slot.isActive !== false,
              })) || [],
          };
        }),
      };
    } else {
      // No existing data - use defaults
      availabilityToEdit = defaultAvailability;
    }

    console.log("Setting availability to edit:", availabilityToEdit);
    setEditingAvailability(availabilityToEdit);
    setShowEditDialog(true);
  };

  const calculateTotalHours = (schedule: DayAvailability[]) => {
    return schedule.reduce((total, day) => {
      if (!day.isAvailable) return total;
      return (
        total +
        day.timeSlots.reduce((dayTotal, slot) => {
          try {
            const [startHour, startMin] = slot.startTime.split(":").map(Number);
            const [endHour, endMin] = slot.endTime.split(":").map(Number);
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            const durationHours = (endMinutes - startMinutes) / 60;
            return dayTotal + durationHours;
          } catch (error) {
            console.error("Error calculating slot duration:", slot, error);
            return dayTotal;
          }
        }, 0)
      );
    }, 0);
  };

  const handleSave = () => {
    if (!editingAvailability) return;

    const totalHours = calculateTotalHours(editingAvailability.weeklySchedule);
    const availabilityToSave = {
      ...editingAvailability,
      totalWeeklyHours: totalHours,
    };

    updateAvailabilityMutation.mutate({
      therapistId: editingAvailability.therapistId,
      availability: availabilityToSave,
    });
  };

  if (therapistsLoading || availabilityLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-purple-600" />
            Therapist Availability Management
          </CardTitle>
          <p className="text-sm text-gray-600">
            Manage when therapists are available for client bookings across the platform
          </p>
        </CardHeader>
      </Card>

      {/* Therapist Availability Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Therapist Availability Overview</span>
            <Button
              onClick={() => {
                console.log("Refresh button clicked - invalidating caches");
                queryClient.invalidateQueries({
                  queryKey: ["/api/admin/therapist-availability-overview"],
                });
                queryClient.invalidateQueries({ queryKey: ["/api/admin/therapists"] });
                queryClient.invalidateQueries({ queryKey: ["/api/admin/therapist-enquiries"] });
                refetch();
              }}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {availabilityData.map((therapistData) => {
              const activeDays =
                therapistData.weeklySchedule?.filter((day) => day.isAvailable).length || 0;
              const totalHours = therapistData.totalWeeklyHours || 0;
              const isPendingAccount = therapistData.isPendingAccount;

              return (
                <div
                  key={therapistData.therapistId}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isPendingAccount ? "bg-orange-100" : "bg-purple-100"
                      }`}
                    >
                      <UserIcon
                        className={`h-5 w-5 ${
                          isPendingAccount ? "text-orange-600" : "text-purple-600"
                        }`}
                      />
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {therapistData.therapistName}
                        {therapistData.sessionsPerWeek && (
                          <span className="ml-2 text-sm font-normal text-purple-600">
                            ({therapistData.sessionsPerWeek} clients/week capacity)
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">{therapistData.email}</p>
                      {isPendingAccount && (
                        <p className="text-xs text-orange-600 mt-1">Account creation required</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {activeDays} active days • {totalHours.toFixed(1)}h/week
                      </div>
                      <div className="flex gap-1 mt-1">
                        {isPendingAccount ? (
                          <Badge
                            variant="outline"
                            className="bg-orange-50 text-orange-700 border-orange-200"
                          >
                            Approved - Pending Account
                          </Badge>
                        ) : therapistData.isActive ? (
                          <Badge variant="default" className="bg-green-100 text-green-700">
                            Available
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                            Unavailable
                          </Badge>
                        )}
                      </div>
                    </div>

                    {isPendingAccount ? (
                      <Button variant="outline" size="sm" disabled className="opacity-50">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Account Required
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingCapacityTherapistId(therapistData.therapistId)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Edit Capacity
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(therapistData.therapistId)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Schedule
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {therapists.length === 0 && (
            <div className="text-center py-8">
              <UserIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Therapists Found</h3>
              <p className="text-gray-500">
                There are no therapist accounts to manage availability for.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Availability Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Edit Availability - {editingAvailability?.therapistName}
            </DialogTitle>
          </DialogHeader>

          {editingAvailability && (
            <div className="space-y-6">
              {/* Global Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">General Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Time Zone</Label>
                      <Select
                        value={editingAvailability.timeZone}
                        onValueChange={(value) =>
                          setEditingAvailability({
                            ...editingAvailability,
                            timeZone: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Europe/London">GMT (London)</SelectItem>
                          <SelectItem value="Europe/Paris">CET (Paris)</SelectItem>
                          <SelectItem value="America/New_York">EST (New York)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editingAvailability.isActive}
                        onCheckedChange={(checked) =>
                          setEditingAvailability({
                            ...editingAvailability,
                            isActive: checked,
                          })
                        }
                      />
                      <Label>Active for Booking</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Schedule */}
              <div className="space-y-4">
                <h3 className="font-medium">Weekly Schedule</h3>
                {editingAvailability.weeklySchedule.map((day, dayIndex) => (
                  <Card key={`${day.day}-${dayIndex}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{day.day}</h4>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={day.isAvailable}
                            onCheckedChange={(checked) => toggleDayAvailability(dayIndex, checked)}
                          />
                          <Label>Available</Label>
                        </div>
                      </div>
                    </CardHeader>

                    {day.isAvailable && (
                      <CardContent className="space-y-3">
                        {day.timeSlots.map((slot, slotIndex) => (
                          <div key={`${slot.id}-${slotIndex}`} className="flex items-center gap-3">
                            <div className="grid grid-cols-2 gap-2 flex-1">
                              <div>
                                <Label className="text-xs">Start Time</Label>
                                <Input
                                  type="time"
                                  value={slot.startTime}
                                  onChange={(e) =>
                                    updateTimeSlot(dayIndex, slot.id, "startTime", e.target.value)
                                  }
                                />
                              </div>
                              <div>
                                <Label className="text-xs">End Time</Label>
                                <Input
                                  type="time"
                                  value={slot.endTime}
                                  onChange={(e) =>
                                    updateTimeSlot(dayIndex, slot.id, "endTime", e.target.value)
                                  }
                                />
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeTimeSlot(dayIndex, slot.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addTimeSlot(dayIndex)}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Time Slot
                        </Button>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              {/* Summary */}
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Total weekly availability:{" "}
                  {calculateTotalHours(editingAvailability.weeklySchedule).toFixed(1)} hours across{" "}
                  {editingAvailability.weeklySchedule.filter((day) => day.isAvailable).length} days
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateAvailabilityMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateAvailabilityMutation.isPending ? "Saving..." : "Save Availability"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Capacity Dialog */}
      <Dialog
        open={!!editingCapacityTherapistId}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCapacityTherapistId(null);
            setSelectedCapacity("");
          }
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onOpenAutoFocus={(e) => {
            // Initialize selected capacity when dialog opens
            if (editingCapacityTherapistId) {
              const therapistData = availabilityData.find(
                (t) => t.therapistId === editingCapacityTherapistId
              );
              setSelectedCapacity(therapistData?.sessionsPerWeek || "");
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Edit Therapist Capacity
            </DialogTitle>
          </DialogHeader>

          {editingCapacityTherapistId &&
            (() => {
              const therapistData = availabilityData.find(
                (t) => t.therapistId === editingCapacityTherapistId
              );
              // Use selectedCapacity if set, otherwise default to current value
              const currentCapacity =
                selectedCapacity !== "" ? selectedCapacity : therapistData?.sessionsPerWeek || "";
              const hasChanged =
                selectedCapacity !== "" && selectedCapacity !== therapistData?.sessionsPerWeek;

              return (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      Set how many clients per week <strong>{therapistData?.therapistName}</strong>{" "}
                      can accept.
                    </p>

                    {therapistData?.sessionsPerWeek && (
                      <p className="text-sm text-gray-500 mb-2">
                        Current capacity:{" "}
                        <strong>{therapistData.sessionsPerWeek} clients/week</strong>
                      </p>
                    )}

                    <Label htmlFor="capacity-select" className="text-sm font-medium">
                      Client Capacity (per week)
                    </Label>
                    <Select
                      value={currentCapacity}
                      onValueChange={(value) => setSelectedCapacity(value === "CLEAR" ? "" : value)}
                    >
                      <SelectTrigger id="capacity-select" className="w-full mt-2">
                        <SelectValue placeholder="Select capacity range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-5">1-5 clients/week</SelectItem>
                        <SelectItem value="6-10">6-10 clients/week</SelectItem>
                        <SelectItem value="10-20">10-20 clients/week</SelectItem>
                        <SelectItem value="20-30">20-30 clients/week</SelectItem>
                        <SelectItem value="30+">30+ clients/week</SelectItem>
                        <SelectItem value="CLEAR">Clear capacity (not set)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingCapacityTherapistId(null);
                        setSelectedCapacity("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        updateCapacityMutation.mutate({
                          therapistId: editingCapacityTherapistId,
                          sessionsPerWeek: currentCapacity === "" ? null : currentCapacity,
                        });
                      }}
                      disabled={updateCapacityMutation.isPending || !hasChanged}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateCapacityMutation.isPending ? "Saving..." : "Save Capacity"}
                    </Button>
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
