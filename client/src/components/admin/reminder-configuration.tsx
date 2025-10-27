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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Mail, Edit, Settings, Bell, MessageSquare, Trash2 } from "lucide-react";

interface ReminderConfiguration {
  id: string;
  reminderType: "email" | "sms";
  eventType: "session_reminder" | "follow_up" | "appointment_confirmation";
  isEnabled: boolean;
  timeBefore: number;
  subject?: string;
  recipientPhone?: string;
  message: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ReminderConfigurationFormData {
  reminderType: "email" | "sms";
  eventType: "session_reminder" | "follow_up" | "appointment_confirmation";
  timeBefore: number;
  subject?: string;
  recipientPhone?: string;
  message: string;
  isEnabled: boolean;
}

const defaultFormData: ReminderConfigurationFormData = {
  reminderType: "email",
  eventType: "session_reminder",
  timeBefore: 1440, // 24 hours
  subject: "",
  recipientPhone: "",
  message: "",
  isEnabled: true,
};

export default function ReminderConfiguration() {
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
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
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
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
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
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedConfig) {
      updateMutation.mutate({ id: selectedConfig.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (config: ReminderConfiguration) => {
    setSelectedConfig(config);
    setFormData({
      reminderType: config.reminderType,
      eventType: config.eventType,
      timeBefore: config.timeBefore,
      subject: config.subject || "",
      recipientPhone: config.recipientPhone || "",
      message: config.message,
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
    if (minutes >= 1440) {
      const days = Math.floor(minutes / 1440);
      return `${days} day${days > 1 ? "s" : ""} before`;
    } else if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours > 1 ? "s" : ""} before`;
    } else {
      return `${minutes} minute${minutes > 1 ? "s" : ""} before`;
    }
  };

  const ConfigurationForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="reminderType">Reminder Type</Label>
          <Select
            value={formData.reminderType}
            onValueChange={(value: "email" | "sms") =>
              setFormData((prev) => ({ ...prev, reminderType: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select reminder type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="eventType">Event Type</Label>
          <Select
            value={formData.eventType}
            onValueChange={(value: "session_reminder" | "follow_up" | "appointment_confirmation") =>
              setFormData((prev) => ({ ...prev, eventType: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select event type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="session_reminder">Session Reminder</SelectItem>
              <SelectItem value="follow_up">Follow-up</SelectItem>
              <SelectItem value="appointment_confirmation">Appointment Confirmation</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="timeBefore">Time Before Event (minutes)</Label>
        <Select
          value={formData.timeBefore.toString()}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, timeBefore: parseInt(value) }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select timing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="60">1 hour before</SelectItem>
            <SelectItem value="120">2 hours before</SelectItem>
            <SelectItem value="360">6 hours before</SelectItem>
            <SelectItem value="1440">24 hours before</SelectItem>
            <SelectItem value="2880">48 hours before</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.reminderType === "email" && (
        <div>
          <Label htmlFor="subject">Email Subject</Label>
          <Input
            id="subject"
            value={formData.subject}
            onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
            placeholder="Enter email subject"
          />
        </div>
      )}

      {formData.reminderType === "sms" && (
        <div>
          <Label htmlFor="recipientPhone">Recipient Phone Number</Label>
          <Input
            id="recipientPhone"
            value={formData.recipientPhone}
            onChange={(e) => setFormData((prev) => ({ ...prev, recipientPhone: e.target.value }))}
            placeholder="Enter phone number or use {client_phone} or {therapist_phone}"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Use variables: {"{client_phone}"}, {"{therapist_phone}"}
          </p>
        </div>
      )}

      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
          placeholder="Enter reminder message"
          rows={4}
          required
        />
        <p className="text-sm text-muted-foreground mt-1">
          Use variables: {"{client_name}"}, {"{therapist_name}"}, {"{session_date}"},{" "}
          {"{session_time}"}
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="enabled"
          checked={formData.isEnabled}
          onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isEnabled: checked }))}
        />
        <Label htmlFor="enabled">Enable this reminder</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedConfig(null);
            setFormData(defaultFormData);
          }}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {selectedConfig ? "Update" : "Create"} Configuration
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reminder Configuration</h2>
          <p className="text-muted-foreground">
            Configure automated SMS and email reminders sent via SendGrid
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Reminder
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Reminder Configuration</DialogTitle>
            </DialogHeader>
            <ConfigurationForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Configurations</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {configurations.filter((c) => c.isEnabled).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {configurations.length} total configurations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reminders</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReminders}</div>
            <p className="text-xs text-muted-foreground">Queued for sending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SendGrid Integration</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-muted-foreground">Email & SMS ready</p>
          </CardContent>
        </Card>
      </div>

      {/* Configurations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reminder Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading configurations...</div>
          ) : configurations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reminder configurations found. Create your first configuration to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {configurations.map((config) => (
                <div
                  key={config.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {config.reminderType === "email" ? (
                        <Mail className="h-5 w-5 text-blue-500" />
                      ) : (
                        <MessageSquare className="h-5 w-5 text-green-500" />
                      )}
                      <Badge variant={config.isEnabled ? "default" : "secondary"}>
                        {config.isEnabled ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-semibold">{getEventTypeLabel(config.eventType)}</h3>
                      <p className="text-sm text-muted-foreground">
                        {config.reminderType.toUpperCase()} •{" "}
                        {getTimeBeforeLabel(config.timeBefore)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(config)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(config.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Reminder Configuration</DialogTitle>
          </DialogHeader>
          <ConfigurationForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}
