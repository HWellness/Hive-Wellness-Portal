import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MessageSquare, Settings, Send, Users, Clock, Check, X } from "lucide-react";

interface CommunicationPreferences {
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  marketingEmailsEnabled: boolean;
  appointmentReminders: boolean;
  therapyUpdates: boolean;
  emergencyContactsOnly: boolean;
  preferredLanguage: string;
  timezone: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  type: "appointment_reminder" | "welcome" | "followup" | "custom";
  channel: "email" | "sms" | "whatsapp";
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
}

interface NotificationLog {
  id: string;
  userId: string;
  channel: "email" | "sms" | "whatsapp";
  type: string;
  recipient: string;
  message: string;
  status: "pending" | "sent" | "delivered" | "failed";
  sentAt?: string;
  deliveredAt?: string;
  failureReason?: string;
}

interface WhatsAppMessagingInterfaceProps {
  user: any;
}

export default function WhatsAppMessagingInterface({ user }: WhatsAppMessagingInterfaceProps) {
  const [activeTab, setActiveTab] = useState("send");
  const [messageForm, setMessageForm] = useState({
    recipient: "",
    channel: "whatsapp" as "email" | "sms" | "whatsapp",
    templateId: "",
    customMessage: "",
    variables: {} as Record<string, string>,
  });
  const [bulkMessageForm, setBulkMessageForm] = useState({
    userIds: [] as string[],
    channel: "whatsapp" as "email" | "sms" | "whatsapp",
    templateId: "",
    customMessage: "",
    variables: {} as Record<string, string>,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Admin-only access control
  const isAdmin = user?.role === "admin";
  const canSendMessages = isAdmin || user?.role === "therapist";

  // Fetch communication preferences
  const { data: preferences } = useQuery<CommunicationPreferences>({
    queryKey: ["/api/messaging/preferences"],
    enabled: !!user,
  });

  // Fetch templates
  const { data: templates = [] } = useQuery<MessageTemplate[]>({
    queryKey: ["/api/messaging/templates"],
    enabled: isAdmin,
  });

  // Fetch notification logs
  const { data: logs = [] } = useQuery<NotificationLog[]>({
    queryKey: ["/api/messaging/logs"],
    enabled: isAdmin,
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: Partial<CommunicationPreferences>) => {
      return await apiRequest("PUT", "/api/messaging/preferences", newPreferences);
    },
    onSuccess: () => {
      toast({
        title: "Preferences Updated",
        description: "Your communication preferences have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/messaging/preferences"] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      return await apiRequest("POST", "/api/messaging/send", messageData);
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
      setMessageForm({
        recipient: "",
        channel: "whatsapp",
        templateId: "",
        customMessage: "",
        variables: {},
      });
      queryClient.invalidateQueries({ queryKey: ["/api/messaging/logs"] });
    },
    onError: () => {
      toast({
        title: "Send Failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Send bulk message mutation
  const sendBulkMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      return await apiRequest("POST", "/api/messaging/send-bulk", messageData);
    },
    onSuccess: () => {
      toast({
        title: "Bulk Messages Sent",
        description: "Your bulk messages have been sent successfully.",
      });
      setBulkMessageForm({
        userIds: [],
        channel: "whatsapp",
        templateId: "",
        customMessage: "",
        variables: {},
      });
      queryClient.invalidateQueries({ queryKey: ["/api/messaging/logs"] });
    },
    onError: () => {
      toast({
        title: "Bulk Send Failed",
        description: "Failed to send bulk messages. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!messageForm.recipient || (!messageForm.templateId && !messageForm.customMessage)) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate({
      userId: user.id,
      channel: messageForm.channel,
      templateId: messageForm.templateId || undefined,
      customMessage: messageForm.customMessage || undefined,
      variables: messageForm.variables,
      recipient: messageForm.recipient,
    });
  };

  const handleSendBulkMessage = () => {
    if (
      bulkMessageForm.userIds.length === 0 ||
      (!bulkMessageForm.templateId && !bulkMessageForm.customMessage)
    ) {
      toast({
        title: "Missing Information",
        description: "Please select recipients and a message template or custom message.",
        variant: "destructive",
      });
      return;
    }

    sendBulkMessageMutation.mutate({
      userIds: bulkMessageForm.userIds,
      channel: bulkMessageForm.channel,
      templateId: bulkMessageForm.templateId || undefined,
      customMessage: bulkMessageForm.customMessage || undefined,
      variables: bulkMessageForm.variables,
    });
  };

  if (!canSendMessages) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Messaging functionality is available to therapists and administrators only.
            </p>
            <p className="text-sm text-gray-500">
              Client accounts can view and update their communication preferences only.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="hive-card-shadow hive-card-hover bg-white/80 backdrop-blur-sm border-0">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-hive-purple rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl heading-secondary hive-gradient-text">
                WhatsApp & SMS Messaging
              </CardTitle>
              <p className="text-body text-hive-black/70">
                Send messages, manage templates, and monitor communication
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="send">Send Message</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Send</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="logs">Message Logs</TabsTrigger>
        </TabsList>

        {/* Send Message Tab */}
        <TabsContent value="send" className="space-y-6">
          <Card className="hive-card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Send className="w-5 h-5 mr-2" />
                Send Individual Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recipient">Recipient</Label>
                  <Input
                    id="recipient"
                    placeholder="Phone number or email"
                    value={messageForm.recipient}
                    onChange={(e) => setMessageForm({ ...messageForm, recipient: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="channel">Channel</Label>
                  <Select
                    value={messageForm.channel}
                    onValueChange={(value: any) =>
                      setMessageForm({ ...messageForm, channel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="template">Message Template (Optional)</Label>
                <Select
                  value={messageForm.templateId}
                  onValueChange={(value) => setMessageForm({ ...messageForm, templateId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template or use custom message" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template: MessageTemplate) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="customMessage">Custom Message</Label>
                <Textarea
                  id="customMessage"
                  placeholder="Enter your custom message here..."
                  value={messageForm.customMessage}
                  onChange={(e) =>
                    setMessageForm({ ...messageForm, customMessage: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <Button
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending}
                className="w-full bg-hive-purple hover:bg-hive-purple/90"
              >
                {sendMessageMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Send Tab */}
        <TabsContent value="bulk" className="space-y-6">
          <Card className="hive-card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Send Bulk Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bulkChannel">Channel</Label>
                <Select
                  value={bulkMessageForm.channel}
                  onValueChange={(value: any) =>
                    setBulkMessageForm({ ...bulkMessageForm, channel: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bulkTemplate">Message Template (Optional)</Label>
                <Select
                  value={bulkMessageForm.templateId}
                  onValueChange={(value) =>
                    setBulkMessageForm({ ...bulkMessageForm, templateId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template or use custom message" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template: MessageTemplate) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bulkCustomMessage">Custom Message</Label>
                <Textarea
                  id="bulkCustomMessage"
                  placeholder="Enter your custom message here..."
                  value={bulkMessageForm.customMessage}
                  onChange={(e) =>
                    setBulkMessageForm({ ...bulkMessageForm, customMessage: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="bulkRecipients">Recipients</Label>
                <Input
                  id="bulkRecipients"
                  placeholder="Enter user IDs separated by commas"
                  value={bulkMessageForm.userIds.join(", ")}
                  onChange={(e) =>
                    setBulkMessageForm({
                      ...bulkMessageForm,
                      userIds: e.target.value
                        .split(",")
                        .map((id) => id.trim())
                        .filter((id) => id),
                    })
                  }
                />
                <p className="text-sm text-gray-500 mt-1">
                  For demo: use demo-client-1, demo-therapist-1, etc.
                </p>
              </div>

              <Button
                onClick={handleSendBulkMessage}
                disabled={sendBulkMessageMutation.isPending}
                className="w-full bg-hive-purple hover:bg-hive-purple/90"
              >
                {sendBulkMessageMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    Send Bulk Messages
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card className="hive-card-shadow">
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No templates available. Create templates through the admin interface.
                  </p>
                ) : (
                  templates.map((template: MessageTemplate) => (
                    <div key={template.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{template.name}</h3>
                        <div className="flex items-center space-x-2">
                          <Badge variant={template.isActive ? "default" : "secondary"}>
                            {template.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline">{template.channel}</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{template.content}</p>
                      {template.variables.length > 0 && (
                        <div className="text-xs text-gray-500">
                          Variables: {template.variables.join(", ")}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card className="hive-card-shadow">
            <CardHeader>
              <CardTitle>Message Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {logs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No message logs available yet.</p>
                ) : (
                  logs.map((log: NotificationLog) => (
                    <div key={log.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{log.channel}</Badge>
                          <span className="text-sm text-gray-600">{log.recipient}</span>
                        </div>
                        <Badge
                          variant={
                            log.status === "delivered"
                              ? "default"
                              : log.status === "sent"
                                ? "secondary"
                                : log.status === "failed"
                                  ? "destructive"
                                  : "outline"
                          }
                        >
                          {log.status === "delivered" && <Check className="w-3 h-3 mr-1" />}
                          {log.status === "failed" && <X className="w-3 h-3 mr-1" />}
                          {log.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{log.message}</p>
                      <div className="text-xs text-gray-500">
                        {log.sentAt && `Sent: ${new Date(log.sentAt).toLocaleString()}`}
                        {log.deliveredAt &&
                          ` | Delivered: ${new Date(log.deliveredAt).toLocaleString()}`}
                        {log.failureReason && ` | Error: ${log.failureReason}`}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Communication Preferences */}
      <Card className="hive-card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Communication Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {preferences && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="emailEnabled">Email Notifications</Label>
                <Switch
                  id="emailEnabled"
                  checked={preferences.emailEnabled}
                  onCheckedChange={(checked) =>
                    updatePreferencesMutation.mutate({ emailEnabled: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="smsEnabled">SMS Notifications</Label>
                <Switch
                  id="smsEnabled"
                  checked={preferences.smsEnabled}
                  onCheckedChange={(checked) =>
                    updatePreferencesMutation.mutate({ smsEnabled: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="whatsappEnabled">WhatsApp Notifications</Label>
                <Switch
                  id="whatsappEnabled"
                  checked={preferences.whatsappEnabled}
                  onCheckedChange={(checked) =>
                    updatePreferencesMutation.mutate({ whatsappEnabled: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="appointmentReminders">Appointment Reminders</Label>
                <Switch
                  id="appointmentReminders"
                  checked={preferences.appointmentReminders}
                  onCheckedChange={(checked) =>
                    updatePreferencesMutation.mutate({ appointmentReminders: checked })
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
