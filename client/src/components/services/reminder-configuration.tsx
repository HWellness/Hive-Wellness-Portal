import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Mail, Edit, Settings, Clock, MessageSquare, Bell } from "lucide-react";
import type { User } from "@shared/schema";

interface ReminderConfigurationProps {
  user: User;
}

interface ReminderConfiguration {
  id: string;
  reminderType: "email" | "sms";
  eventType: "session_reminder" | "follow_up" | "appointment_confirmation";
  isEnabled: boolean;
  timeBefore: number;
  subject?: string;
  message: string;
  phoneNumber?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ReminderConfigurationFormData {
  reminderType: "email" | "sms";
  eventType: "session_reminder" | "follow_up" | "appointment_confirmation";
  timeBefore: number;
  subject?: string;
  message: string;
  phoneNumber?: string;
  isEnabled: boolean;
}

const defaultFormData: ReminderConfigurationFormData = {
  reminderType: "email",
  eventType: "session_reminder",
  timeBefore: 1440, // 24 hours
  subject: "",
  message: "",
  phoneNumber: "",
  isEnabled: true,
};

export default function ReminderConfiguration({ user }: ReminderConfigurationProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ReminderConfiguration | null>(null);
  const [formData, setFormData] = useState<ReminderConfigurationFormData>(defaultFormData);
  const [pendingReminders, setPendingReminders] = useState<number>(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch reminder configurations
  const { data: configurations = [], isLoading } = useQuery<ReminderConfiguration[]>({
    queryKey: ["/api/admin/reminder-configurations"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch pending reminders count
  const { data: reminderQueue = [] } = useQuery({
    queryKey: ["/api/admin/reminder-queue"],
    refetchInterval: 30000,
  });

  useEffect(() => {
    setPendingReminders(reminderQueue.length || 0);
  }, [reminderQueue]);

  // Create reminder configuration
  const createMutation = useMutation({
    mutationFn: async (data: ReminderConfigurationFormData) => {
      return await apiRequest("POST", "/api/admin/reminder-configurations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reminder-configurations"] });
      setIsCreateDialogOpen(false);
      setFormData(defaultFormData);
      toast({
        title: "Success",
        description: "Reminder configuration created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create reminder configuration",
        variant: "destructive",
      });
    },
  });

  // Update reminder configuration
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ReminderConfigurationFormData>;
    }) => {
      return await apiRequest("PUT", `/api/admin/reminder-configurations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reminder-configurations"] });
      setIsEditDialogOpen(false);
      setSelectedConfig(null);
      setFormData(defaultFormData);
      toast({
        title: "Success",
        description: "Reminder configuration updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update reminder configuration",
        variant: "destructive",
      });
    },
  });

  // Delete reminder configuration
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/reminder-configurations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reminder-configurations"] });
      toast({
        title: "Success",
        description: "Reminder configuration deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete reminder configuration",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (selectedConfig) {
      updateMutation.mutate({ id: selectedConfig.id, data: formData });
    }
  };

  const handleEdit = (config: ReminderConfiguration) => {
    setSelectedConfig(config);
    setFormData({
      reminderType: config.reminderType,
      eventType: config.eventType,
      timeBefore: config.timeBefore,
      subject: config.subject || "",
      message: config.message,
      phoneNumber: config.phoneNumber || "",
      isEnabled: config.isEnabled,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this reminder configuration?")) {
      deleteMutation.mutate(id);
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case "session_reminder":
        return "Session Reminder";
      case "follow_up":
        return "Follow-up";
      case "appointment_confirmation":
        return "Appointment Confirmation";
      default:
        return eventType;
    }
  };

  const getTimeBeforeLabel = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hours`;
    return `${Math.floor(minutes / 1440)} days`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-hive-purple rounded-full mx-auto mb-4"></div>
          <div className="text-hive-purple font-century text-lg font-bold">
            Loading Reminder Configurations
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-hive-black">Reminder Configuration</h1>
          <p className="text-gray-600 mt-1">Manage automated reminder settings and notifications</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-hive-purple hover:bg-hive-purple/90 text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Reminder
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Reminder Configuration</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Reminder Type</Label>
                  <Select
                    value={formData.reminderType}
                    onValueChange={(value: "email" | "sms") => {
                      setFormData((prev) => ({ ...prev, reminderType: value }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Event Type</Label>
                  <Select
                    value={formData.eventType}
                    onValueChange={(
                      value: "session_reminder" | "follow_up" | "appointment_confirmation"
                    ) => setFormData((prev) => ({ ...prev, eventType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="session_reminder">Session Reminder</SelectItem>
                      <SelectItem value="follow_up">Follow-up</SelectItem>
                      <SelectItem value="appointment_confirmation">
                        Appointment Confirmation
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Time Before Event (minutes)</Label>
                <Input
                  type="number"
                  value={formData.timeBefore}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, timeBefore: parseInt(e.target.value) || 0 }))
                  }
                  placeholder="1440"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {getTimeBeforeLabel(formData.timeBefore)} before the event
                </p>
              </div>

              {formData.reminderType === "email" && (
                <div>
                  <Label>Email Subject</Label>
                  <Input
                    value={formData.subject || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                    placeholder="Your therapy session reminder"
                  />
                </div>
              )}

              {formData.reminderType === "sms" && (
                <div>
                  <Label>Mobile Phone Number</Label>
                  <Input
                    type="tel"
                    value={formData.phoneNumber || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))
                    }
                    placeholder="+44 7700 900000"
                    data-testid="input-phone-number"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Include country code (e.g., +44 for UK)
                  </p>
                </div>
              )}

              <div>
                <Label>Message</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="Hi {{client_name}}, this is a reminder about your upcoming therapy session..."
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use variables: client_name, therapist_name, session_date, session_time
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isEnabled}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isEnabled: checked }))
                  }
                />
                <Label>Enable this reminder</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="bg-hive-purple hover:bg-hive-purple/90 text-white"
                >
                  {createMutation.isPending ? "Creating..." : "Create Reminder"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Reminders</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {configurations.filter((c) => c.isEnabled).length}
            </div>
            <p className="text-xs text-muted-foreground">Currently enabled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Configurations</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{configurations.length}</div>
            <p className="text-xs text-muted-foreground">All reminder types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Queue</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReminders}</div>
            <p className="text-xs text-muted-foreground">Awaiting delivery</p>
          </CardContent>
        </Card>
      </div>

      {/* Configurations List */}
      <Card>
        <CardHeader>
          <CardTitle>Reminder Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {configurations.map((config) => (
              <div key={config.id} className="flex items-center justify-between p-4 border rounded">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {config.reminderType === "email" ? (
                      <Mail className="h-4 w-4 text-blue-600" />
                    ) : (
                      <MessageSquare className="h-4 w-4 text-green-600" />
                    )}
                    <Badge variant={config.isEnabled ? "default" : "secondary"}>
                      {config.reminderType.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-medium">{getEventTypeLabel(config.eventType)}</h3>
                    <p className="text-sm text-gray-600">
                      {getTimeBeforeLabel(config.timeBefore)} before event
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={config.isEnabled ? "default" : "secondary"}>
                    {config.isEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(config)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(config.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}

            {configurations.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No reminder configurations found.</p>
                <p className="text-sm">Create your first reminder to get started.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Reminder Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Reminder Type</Label>
                <Select
                  value={formData.reminderType}
                  onValueChange={(value: "email" | "sms") =>
                    setFormData((prev) => ({ ...prev, reminderType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Event Type</Label>
                <Select
                  value={formData.eventType}
                  onValueChange={(
                    value: "session_reminder" | "follow_up" | "appointment_confirmation"
                  ) => setFormData((prev) => ({ ...prev, eventType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="session_reminder">Session Reminder</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                    <SelectItem value="appointment_confirmation">
                      Appointment Confirmation
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Time Before Event (minutes)</Label>
              <Input
                type="number"
                value={formData.timeBefore}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, timeBefore: parseInt(e.target.value) || 0 }))
                }
                placeholder="1440"
              />
              <p className="text-xs text-gray-500 mt-1">
                {getTimeBeforeLabel(formData.timeBefore)} before the event
              </p>
            </div>

            {formData.reminderType === "email" && (
              <div>
                <Label>Email Subject</Label>
                <Input
                  value={formData.subject || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="Your therapy session reminder"
                />
              </div>
            )}

            {formData.reminderType === "sms" && (
              <div>
                <Label>Mobile Phone Number</Label>
                <Input
                  type="tel"
                  value={formData.phoneNumber || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))
                  }
                  placeholder="+44 7700 900000"
                  data-testid="input-phone-number"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include country code (e.g., +44 for UK)
                </p>
              </div>
            )}

            <div>
              <Label>Message</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                placeholder="Hi {{client_name}}, this is a reminder about your upcoming therapy session..."
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use variables: client_name, therapist_name, session_date, session_time
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isEnabled}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isEnabled: checked }))
                }
              />
              <Label>Enable this reminder</Label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
                className="bg-hive-purple hover:bg-hive-purple/90 text-white"
              >
                {updateMutation.isPending ? "Updating..." : "Update Reminder"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
