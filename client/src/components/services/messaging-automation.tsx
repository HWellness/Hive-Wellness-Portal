import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Phone,
  Send,
  Calendar,
  CheckCircle,
  AlertTriangle,
  MessageCircle,
  UserPlus,
  Settings,
  Clock,
  Smartphone,
  TestTube,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ServiceNavigation from "@/components/ui/service-navigation";
import type { User } from "@shared/schema";

interface MessagingStatus {
  twilio: {
    connected: boolean;
    accountSid?: string;
    phoneNumber?: string;
  };
  hubspot: {
    connected: boolean;
    portalId?: string;
  };
}

interface ContactData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  lifecycleStage?: string;
}

interface MessagingAutomationProps {
  onBackToDashboard?: () => void;
  user?: User;
}

export default function MessagingAutomation({ onBackToDashboard, user }: MessagingAutomationProps) {
  const [activeTab, setActiveTab] = useState("sms");
  const [smsForm, setSmsForm] = useState({ to: "", body: "" });
  const [smsRecipientType, setSmsRecipientType] = useState<"client" | "therapist" | "">("");
  const [selectedSmsUser, setSelectedSmsUser] = useState("");
  const [whatsappForm, setWhatsappForm] = useState({ to: "", body: "", mediaUrl: "" });
  const [whatsappRecipientType, setWhatsappRecipientType] = useState<"client" | "therapist" | "">(
    ""
  );
  const [selectedWhatsappUser, setSelectedWhatsappUser] = useState("");
  const [reminderForm, setReminderForm] = useState({
    clientPhone: "",
    therapistName: "",
    date: "",
    time: "",
    type: "therapy",
  });
  const [contactForm, setContactForm] = useState<ContactData>({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    company: "",
    lifecycleStage: "subscriber",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get messaging system status
  const { data: messagingStatus, isLoading: statusLoading } = useQuery<MessagingStatus>({
    queryKey: ["/api/messaging/status"],
    refetchInterval: 180000, // Refresh every 3 minutes
    staleTime: 120000, // Keep data fresh for 2 minutes
  });

  // Fetch users based on recipient type for SMS
  const { data: smsUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users", smsRecipientType],
    enabled: !!smsRecipientType,
  });

  // Fetch users based on recipient type for WhatsApp
  const { data: whatsappUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users", whatsappRecipientType],
    enabled: !!whatsappRecipientType,
  });

  // SMS sending mutation
  const sendSMSMutation = useMutation({
    mutationFn: (data: { to: string; body: string }) =>
      apiRequest("/api/messaging/sms", "POST", data),
    onSuccess: () => {
      toast({
        title: "SMS Sent Successfully",
        description: "Your SMS message has been delivered.",
      });
      setSmsForm({ to: "", body: "" });
    },
    onError: (error: any) => {
      toast({
        title: "SMS Failed",
        description: error.message || "Failed to send SMS message.",
        variant: "destructive",
      });
    },
  });

  // WhatsApp sending mutation
  const sendWhatsAppMutation = useMutation({
    mutationFn: (data: { to: string; body: string; mediaUrl?: string }) =>
      apiRequest("/api/messaging/whatsapp", "POST", data),
    onSuccess: () => {
      toast({
        title: "WhatsApp Message Sent",
        description: "Your WhatsApp message has been delivered.",
      });
      setWhatsappForm({ to: "", body: "", mediaUrl: "" });
    },
    onError: (error: any) => {
      toast({
        title: "WhatsApp Failed",
        description: error.message || "Failed to send WhatsApp message.",
        variant: "destructive",
      });
    },
  });

  // Appointment reminder mutation
  const sendReminderMutation = useMutation({
    mutationFn: (data: typeof reminderForm) =>
      apiRequest("/api/messaging/appointment-reminder", "POST", data),
    onSuccess: () => {
      toast({
        title: "Reminder Sent",
        description: "Appointment reminder has been sent to client.",
      });
      setReminderForm({
        clientPhone: "",
        therapistName: "",
        date: "",
        time: "",
        type: "therapy",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reminder Failed",
        description: error.message || "Failed to send appointment reminder.",
        variant: "destructive",
      });
    },
  });

  // HubSpot contact creation mutation
  const createContactMutation = useMutation({
    mutationFn: (data: ContactData) => apiRequest("/api/hubspot/contact", "POST", data),
    onSuccess: () => {
      toast({
        title: "Contact Created",
        description: "Contact has been added to HubSpot CRM.",
      });
      setContactForm({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        company: "",
        lifecycleStage: "subscriber",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Contact Creation Failed",
        description: error.message || "Failed to create HubSpot contact.",
        variant: "destructive",
      });
    },
  });

  // Handle SMS user selection
  const handleSmsUserSelect = (userId: string) => {
    setSelectedSmsUser(userId);
    const selectedUser = smsUsers.find((u) => u.id === userId);
    if (selectedUser?.phoneNumber) {
      setSmsForm({ ...smsForm, to: selectedUser.phoneNumber });
    }
  };

  // Handle WhatsApp user selection
  const handleWhatsappUserSelect = (userId: string) => {
    setSelectedWhatsappUser(userId);
    const selectedUser = whatsappUsers.find((u) => u.id === userId);
    if (selectedUser?.phoneNumber) {
      setWhatsappForm({ ...whatsappForm, to: `whatsapp:${selectedUser.phoneNumber}` });
    }
  };

  const handleSendSMS = () => {
    if (!smsForm.to || !smsForm.body) {
      toast({
        title: "Missing Information",
        description: "Please provide phone number and message.",
        variant: "destructive",
      });
      return;
    }
    sendSMSMutation.mutate(smsForm);
  };

  const handleSendWhatsApp = () => {
    if (!whatsappForm.to || !whatsappForm.body) {
      toast({
        title: "Missing Information",
        description: "Please provide phone number and message.",
        variant: "destructive",
      });
      return;
    }
    sendWhatsAppMutation.mutate(whatsappForm);
  };

  const handleSendReminder = () => {
    if (
      !reminderForm.clientPhone ||
      !reminderForm.therapistName ||
      !reminderForm.date ||
      !reminderForm.time
    ) {
      toast({
        title: "Missing Information",
        description: "Please provide all appointment details.",
        variant: "destructive",
      });
      return;
    }
    sendReminderMutation.mutate(reminderForm);
  };

  const handleCreateContact = () => {
    if (!contactForm.email || !contactForm.firstName || !contactForm.lastName) {
      toast({
        title: "Missing Information",
        description: "Please provide email, first name, and last name.",
        variant: "destructive",
      });
      return;
    }
    createContactMutation.mutate(contactForm);
  };

  return (
    <>
      {/* Navigation Bar */}
      {onBackToDashboard && user && (
        <ServiceNavigation
          serviceName="Messaging & Automation"
          onBackToDashboard={onBackToDashboard}
          user={user}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messaging & Automation</h1>
            <p className="text-gray-600">Send SMS, WhatsApp messages, and manage CRM integration</p>
          </div>

          {/* Service Status */}
          <div className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  messagingStatus?.twilio?.connected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm font-medium">Twilio</span>
            </div>
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  messagingStatus?.hubspot?.connected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm font-medium">HubSpot</span>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="sms" className="flex items-center space-x-2">
              <Phone className="w-4 h-4" />
              <span>SMS</span>
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Reminders</span>
            </TabsTrigger>
            <TabsTrigger value="crm" className="flex items-center space-x-2">
              <UserPlus className="w-4 h-4" />
              <span>CRM</span>
            </TabsTrigger>
          </TabsList>

          {/* SMS Tab */}
          <TabsContent value="sms">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Phone className="w-5 h-5 text-hive-purple" />
                  <span>Send SMS Message</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="sms-recipient-type">Recipient Type</Label>
                  <Select
                    value={smsRecipientType}
                    onValueChange={(value: "client" | "therapist" | "") => {
                      setSmsRecipientType(value);
                      setSelectedSmsUser("");
                      setSmsForm({ ...smsForm, to: "" });
                    }}
                  >
                    <SelectTrigger id="sms-recipient-type" data-testid="select-sms-recipient-type">
                      <SelectValue placeholder="Select client or therapist" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="therapist">Therapist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {smsRecipientType && (
                  <div>
                    <Label htmlFor="sms-user-select">
                      Select {smsRecipientType === "client" ? "Client" : "Therapist"}
                    </Label>
                    <Select value={selectedSmsUser} onValueChange={handleSmsUserSelect}>
                      <SelectTrigger id="sms-user-select" data-testid="select-sms-user">
                        <SelectValue placeholder={`Select a ${smsRecipientType}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {smsUsers
                          .filter((u) => u.role === smsRecipientType)
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.fullName || user.email}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="sms-to">Phone Number</Label>
                  <Input
                    id="sms-to"
                    data-testid="input-sms-phone"
                    value={smsForm.to}
                    onChange={(e) => setSmsForm({ ...smsForm, to: e.target.value })}
                    placeholder="+44 7700 900123"
                  />
                </div>
                <div>
                  <Label htmlFor="sms-body">Message</Label>
                  <Textarea
                    id="sms-body"
                    data-testid="textarea-sms-message"
                    value={smsForm.body}
                    onChange={(e) => setSmsForm({ ...smsForm, body: e.target.value })}
                    placeholder="Your SMS message..."
                    rows={4}
                  />
                </div>
                <Button
                  onClick={handleSendSMS}
                  disabled={sendSMSMutation.isPending}
                  className="w-full"
                  data-testid="button-send-sms"
                >
                  {sendSMSMutation.isPending ? (
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send SMS
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WhatsApp Tab */}
          <TabsContent value="whatsapp">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="w-5 h-5 text-hive-purple" />
                  <span>Send WhatsApp Message</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="wa-recipient-type">Recipient Type</Label>
                  <Select
                    value={whatsappRecipientType}
                    onValueChange={(value: "client" | "therapist" | "") => {
                      setWhatsappRecipientType(value);
                      setSelectedWhatsappUser("");
                      setWhatsappForm({ ...whatsappForm, to: "" });
                    }}
                  >
                    <SelectTrigger
                      id="wa-recipient-type"
                      data-testid="select-whatsapp-recipient-type"
                    >
                      <SelectValue placeholder="Select client or therapist" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="therapist">Therapist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {whatsappRecipientType && (
                  <div>
                    <Label htmlFor="wa-user-select">
                      Select {whatsappRecipientType === "client" ? "Client" : "Therapist"}
                    </Label>
                    <Select value={selectedWhatsappUser} onValueChange={handleWhatsappUserSelect}>
                      <SelectTrigger id="wa-user-select" data-testid="select-whatsapp-user">
                        <SelectValue placeholder={`Select a ${whatsappRecipientType}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {whatsappUsers
                          .filter((u) => u.role === whatsappRecipientType)
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.fullName || user.email}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="wa-to">Phone Number</Label>
                  <Input
                    id="wa-to"
                    data-testid="input-whatsapp-phone"
                    value={whatsappForm.to}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, to: e.target.value })}
                    placeholder="whatsapp:+44 7700 900123"
                  />
                </div>
                <div>
                  <Label htmlFor="wa-body">Message</Label>
                  <Textarea
                    id="wa-body"
                    data-testid="textarea-whatsapp-message"
                    value={whatsappForm.body}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, body: e.target.value })}
                    placeholder="Your WhatsApp message..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="wa-media">Media URL (optional)</Label>
                  <Input
                    id="wa-media"
                    data-testid="input-whatsapp-media"
                    value={whatsappForm.mediaUrl}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, mediaUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <Button
                  onClick={handleSendWhatsApp}
                  disabled={sendWhatsAppMutation.isPending}
                  className="w-full"
                  data-testid="button-send-whatsapp"
                >
                  {sendWhatsAppMutation.isPending ? (
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send WhatsApp
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointment Reminders Tab */}
          <TabsContent value="reminders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-hive-purple" />
                  <span>Send Appointment Reminder</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client-phone">Client Phone</Label>
                    <Input
                      id="client-phone"
                      value={reminderForm.clientPhone}
                      onChange={(e) =>
                        setReminderForm({ ...reminderForm, clientPhone: e.target.value })
                      }
                      placeholder="+44 7700 900123"
                    />
                  </div>
                  <div>
                    <Label htmlFor="therapist-name">Therapist Name</Label>
                    <Input
                      id="therapist-name"
                      value={reminderForm.therapistName}
                      onChange={(e) =>
                        setReminderForm({ ...reminderForm, therapistName: e.target.value })
                      }
                      placeholder="Dr. Sarah Chen"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="appointment-date">Date</Label>
                    <Input
                      id="appointment-date"
                      type="date"
                      value={reminderForm.date}
                      onChange={(e) => setReminderForm({ ...reminderForm, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="appointment-time">Time</Label>
                    <Input
                      id="appointment-time"
                      type="time"
                      value={reminderForm.time}
                      onChange={(e) => setReminderForm({ ...reminderForm, time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="session-type">Session Type</Label>
                    <select
                      id="session-type"
                      value={reminderForm.type}
                      onChange={(e) => setReminderForm({ ...reminderForm, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-hive-purple"
                    >
                      <option value="therapy">Therapy Session</option>
                      <option value="consultation">Consultation</option>
                      <option value="assessment">Assessment</option>
                    </select>
                  </div>
                </div>
                <Button
                  onClick={handleSendReminder}
                  disabled={sendReminderMutation.isPending}
                  className="w-full"
                >
                  {sendReminderMutation.isPending ? (
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Calendar className="w-4 h-4 mr-2" />
                  )}
                  Send Reminder
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CRM Integration Tab */}
          <TabsContent value="crm">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserPlus className="w-5 h-5 text-hive-purple" />
                  <span>Create HubSpot Contact</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first-name">First Name *</Label>
                    <Input
                      id="first-name"
                      value={contactForm.firstName}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, firstName: e.target.value })
                      }
                      placeholder="Emma"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last-name">Last Name *</Label>
                    <Input
                      id="last-name"
                      value={contactForm.lastName}
                      onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                      placeholder="Johnson"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="emma.johnson@example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      placeholder="+44 7700 900123"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={contactForm.company}
                      onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                      placeholder="Company Name"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="lifecycle">Lifecycle Stage</Label>
                  <select
                    id="lifecycle"
                    value={contactForm.lifecycleStage}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, lifecycleStage: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-hive-purple"
                  >
                    <option value="subscriber">Subscriber</option>
                    <option value="lead">Lead</option>
                    <option value="marketingqualifiedlead">Marketing Qualified Lead</option>
                    <option value="salesqualifiedlead">Sales Qualified Lead</option>
                    <option value="opportunity">Opportunity</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
                <Button
                  onClick={handleCreateContact}
                  disabled={createContactMutation.isPending}
                  className="w-full"
                >
                  {createContactMutation.isPending ? (
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  Create Contact
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* System Status Alert */}
        {messagingStatus &&
          (!messagingStatus.twilio?.connected || !messagingStatus.hubspot?.connected) && (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Some messaging services are not connected. Please check your Twilio and HubSpot
                configuration.
              </AlertDescription>
            </Alert>
          )}
      </div>
    </>
  );
}
