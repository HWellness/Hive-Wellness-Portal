import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Clock,
  Calendar,
  Settings,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Globe,
  Users,
  Coffee,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface AdminAvailabilitySettingsProps {
  user: User;
}

interface AdminAvailabilitySettings {
  id: string | null;
  adminId: string;
  timeZone: string;
  workingDays: string[];
  dailyStartTime: string;
  dailyEndTime: string;
  lunchBreakStart: string;
  lunchBreakEnd: string;
  includeLunchBreak: boolean;
  sessionDuration: number;
  bufferTimeBetweenSessions: number;
  maxSessionsPerDay: number;
  advanceBookingDays: number;
  isActive: boolean;
  autoBlockWeekends: boolean;
  customTimeSlots: any;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const DAYS_OF_WEEK = [
  { value: "0", label: "Sunday", short: "Sun" },
  { value: "1", label: "Monday", short: "Mon" },
  { value: "2", label: "Tuesday", short: "Tue" },
  { value: "3", label: "Wednesday", short: "Wed" },
  { value: "4", label: "Thursday", short: "Thu" },
  { value: "5", label: "Friday", short: "Fri" },
  { value: "6", label: "Saturday", short: "Sat" },
];

const TIME_ZONES = [
  { value: "Europe/London", label: "GMT (London)" },
  { value: "Europe/Paris", label: "CET (Paris)" },
  { value: "America/New_York", label: "EST (New York)" },
  { value: "America/Los_Angeles", label: "PST (Los Angeles)" },
  { value: "Australia/Sydney", label: "AEST (Sydney)" },
];

export default function AdminAvailabilitySettings({ user }: AdminAvailabilitySettingsProps) {
  const [settings, setSettings] = useState<AdminAvailabilitySettings | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current admin availability settings
  const {
    data: currentSettings,
    isLoading,
    refetch,
  } = useQuery<AdminAvailabilitySettings>({
    queryKey: ["/api/admin/availability-settings"],
    staleTime: 30000,
  });

  // Initialize settings when data loads
  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: (settingsData: Partial<AdminAvailabilitySettings>) =>
      apiRequest("POST", "/api/admin/availability-settings", settingsData),
    onSuccess: (response: any) => {
      toast({
        title: "✅ Availability Settings Saved",
        description:
          "Your working hours and availability preferences have been updated successfully.",
        className: "border-l-4 border-l-green-500 bg-green-50 text-green-800",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/availability-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/calendar/availability"] });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "❌ Failed to Save Settings",
        description:
          error.message || "Unable to save your availability settings. Please try again.",
        variant: "destructive",
        className: "border-l-4 border-l-red-500 bg-red-50 text-red-800",
      });
    },
  });

  const handleInputChange = (field: keyof AdminAvailabilitySettings, value: any) => {
    if (!settings) return;

    setSettings({
      ...settings,
      [field]: value,
    });
  };

  const handleWorkingDayToggle = (dayValue: string, isChecked: boolean) => {
    if (!settings) return;

    let newWorkingDays = [...settings.workingDays];
    if (isChecked) {
      if (!newWorkingDays.includes(dayValue)) {
        newWorkingDays.push(dayValue);
      }
    } else {
      newWorkingDays = newWorkingDays.filter((day) => day !== dayValue);
    }

    setSettings({
      ...settings,
      workingDays: newWorkingDays,
    });
  };

  const calculateWeeklyHours = () => {
    if (!settings) return 0;

    const startTime = new Date(`2024-01-01T${settings.dailyStartTime}:00`);
    const endTime = new Date(`2024-01-01T${settings.dailyEndTime}:00`);
    let dailyHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    // Subtract lunch break if included
    if (settings.includeLunchBreak && settings.lunchBreakStart && settings.lunchBreakEnd) {
      const lunchStart = new Date(`2024-01-01T${settings.lunchBreakStart}:00`);
      const lunchEnd = new Date(`2024-01-01T${settings.lunchBreakEnd}:00`);
      const lunchHours = (lunchEnd.getTime() - lunchStart.getTime()) / (1000 * 60 * 60);
      dailyHours -= lunchHours;
    }

    return dailyHours * settings.workingDays.length;
  };

  const handleSave = () => {
    if (!settings) return;

    // Validate settings
    if (settings.workingDays.length === 0) {
      toast({
        title: "❌ Validation Error",
        description: "Please select at least one working day.",
        variant: "destructive",
      });
      return;
    }

    if (settings.dailyStartTime >= settings.dailyEndTime) {
      toast({
        title: "❌ Validation Error",
        description: "End time must be after start time.",
        variant: "destructive",
      });
      return;
    }

    saveSettingsMutation.mutate(settings);
  };

  const handleResetToDefaults = () => {
    setSettings({
      id: null,
      adminId: user.id,
      timeZone: "Europe/London",
      workingDays: ["1", "2", "3", "4", "5"], // Monday through Friday - Expanded for practical booking
      dailyStartTime: "09:00",
      dailyEndTime: "17:00",
      lunchBreakStart: "12:00",
      lunchBreakEnd: "13:00",
      includeLunchBreak: true,
      sessionDuration: 30,
      bufferTimeBetweenSessions: 0,
      maxSessionsPerDay: 8,
      advanceBookingDays: 30,
      isActive: true,
      autoBlockWeekends: true,
      customTimeSlots: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setIsEditing(true);
  };

  if (isLoading) {
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
            <Settings className="h-6 w-6 text-purple-600" />
            Admin Availability Settings
          </CardTitle>
          <p className="text-sm text-gray-600">
            Configure your working hours, days off, and booking preferences for client appointments
          </p>
        </CardHeader>
      </Card>

      {settings && (
        <>
          {/* Current Settings Overview */}
          {!isEditing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Current Availability</span>
                  <div className="flex gap-2">
                    <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Settings
                    </Button>
                    <Button onClick={handleResetToDefaults} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset to Defaults
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Working Days</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {settings.workingDays.map((dayValue) => {
                        const day = DAYS_OF_WEEK.find((d) => d.value === dayValue);
                        return (
                          <Badge
                            key={dayValue}
                            variant="default"
                            className="bg-green-100 text-green-700"
                          >
                            {day?.short}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Daily Hours</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">
                        {settings.dailyStartTime} - {settings.dailyEndTime}
                      </span>
                    </div>
                    {settings.includeLunchBreak && (
                      <div className="flex items-center gap-2 mt-1">
                        <Coffee className="h-4 w-4 text-gray-500" />
                        <span className="text-xs text-gray-600">
                          Break: {settings.lunchBreakStart} - {settings.lunchBreakEnd}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Weekly Summary</Label>
                    <div className="mt-2 space-y-1">
                      <div className="text-sm">
                        {calculateWeeklyHours().toFixed(1)} hours per week
                      </div>
                      <div className="text-xs text-gray-600">
                        {settings.sessionDuration} min sessions • Max {settings.maxSessionsPerDay}
                        /day
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Booking Settings</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Advance booking</span>
                        <span className="text-sm font-medium">
                          {settings.advanceBookingDays} days
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Buffer between sessions</span>
                        <span className="text-sm font-medium">
                          {settings.bufferTimeBetweenSessions} min
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Auto-block weekends</span>
                        <Badge variant={settings.autoBlockWeekends ? "default" : "secondary"}>
                          {settings.autoBlockWeekends ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">System Status</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{settings.timeZone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {settings.isActive ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-700">Active for bookings</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm text-orange-700">Inactive</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {settings.notes && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Notes</Label>
                      <p className="text-sm text-gray-600 mt-1">{settings.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Edit Settings Form */}
          {isEditing && (
            <Card>
              <CardHeader>
                <CardTitle>Edit Availability Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Time Zone</Label>
                    <Select
                      value={settings.timeZone}
                      onValueChange={(value) => handleInputChange("timeZone", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_ZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.isActive}
                      onCheckedChange={(checked) => handleInputChange("isActive", checked)}
                    />
                    <Label>Active for bookings</Label>
                  </div>
                </div>

                {/* Working Days */}
                <div>
                  <Label className="text-base font-medium">Working Days</Label>
                  <div className="grid grid-cols-4 md:grid-cols-7 gap-2 mt-3">
                    {DAYS_OF_WEEK.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Switch
                          checked={settings.workingDays.includes(day.value)}
                          onCheckedChange={(checked) => handleWorkingDayToggle(day.value, checked)}
                        />
                        <Label className="text-sm">{day.short}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Daily Hours */}
                <div>
                  <Label className="text-base font-medium">Daily Working Hours</Label>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <Label className="text-sm">Start Time</Label>
                      <Input
                        type="time"
                        value={settings.dailyStartTime}
                        onChange={(e) => handleInputChange("dailyStartTime", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">End Time</Label>
                      <Input
                        type="time"
                        value={settings.dailyEndTime}
                        onChange={(e) => handleInputChange("dailyEndTime", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Lunch Break */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Switch
                      checked={settings.includeLunchBreak}
                      onCheckedChange={(checked) => handleInputChange("includeLunchBreak", checked)}
                    />
                    <Label className="text-base font-medium">Include Lunch Break</Label>
                  </div>

                  {settings.includeLunchBreak && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Lunch Start</Label>
                        <Input
                          type="time"
                          value={settings.lunchBreakStart}
                          onChange={(e) => handleInputChange("lunchBreakStart", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Lunch End</Label>
                        <Input
                          type="time"
                          value={settings.lunchBreakEnd}
                          onChange={(e) => handleInputChange("lunchBreakEnd", e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Session Settings */}
                <div>
                  <Label className="text-base font-medium">Session Configuration</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                    <div>
                      <Label className="text-sm">Session Duration (minutes)</Label>
                      <Select
                        value={settings.sessionDuration.toString()}
                        onValueChange={(value) =>
                          handleInputChange("sessionDuration", parseInt(value))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm">Buffer Between Sessions (minutes)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="60"
                        value={settings.bufferTimeBetweenSessions}
                        onChange={(e) =>
                          handleInputChange(
                            "bufferTimeBetweenSessions",
                            parseInt(e.target.value) || 0
                          )
                        }
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Max Sessions Per Day</Label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={settings.maxSessionsPerDay}
                        onChange={(e) =>
                          handleInputChange("maxSessionsPerDay", parseInt(e.target.value) || 1)
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Booking Settings */}
                <div>
                  <Label className="text-base font-medium">Booking Preferences</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <Label className="text-sm">Advance Booking Days</Label>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={settings.advanceBookingDays}
                        onChange={(e) =>
                          handleInputChange("advanceBookingDays", parseInt(e.target.value) || 1)
                        }
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.autoBlockWeekends}
                        onCheckedChange={(checked) =>
                          handleInputChange("autoBlockWeekends", checked)
                        }
                      />
                      <Label>Auto-block weekends</Label>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-base font-medium">Notes (Optional)</Label>
                  <Textarea
                    value={settings.notes || ""}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Add any additional notes about your availability..."
                    className="mt-2"
                  />
                </div>

                {/* Summary */}
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Summary:</strong> {calculateWeeklyHours().toFixed(1)} hours/week •
                    {settings.workingDays.length} working days •{settings.sessionDuration} min
                    sessions
                  </AlertDescription>
                </Alert>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saveSettingsMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
