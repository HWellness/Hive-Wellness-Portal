import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { MessageSquare, Phone, Settings, Send, Users, Clock, Check, X, Smartphone, Mail, Bot, AlertCircle } from 'lucide-react';

interface MessagingServiceProps {
  user: any;
}

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

interface NotificationLog {
  id: string;
  userId: string;
  channel: 'email' | 'sms' | 'whatsapp';
  type: string;
  recipient: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: string;
  deliveredAt?: string;
  failureReason?: string;
}

export default function MessagingService({ user }: MessagingServiceProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [messageForm, setMessageForm] = useState({
    recipient: '',
    channel: 'email' as 'email' | 'sms' | 'whatsapp',
    subject: '',
    message: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent'
  });
  const [bulkMessageForm, setBulkMessageForm] = useState({
    userIds: [] as string[],
    channel: 'email' as 'email' | 'sms' | 'whatsapp',
    subject: '',
    message: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent'
  });
  const [testMessageForm, setTestMessageForm] = useState({
    channel: 'email' as 'email' | 'sms' | 'whatsapp',
    recipient: user?.email || ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Access control
  const canSendMessages = user?.role === 'admin' || user?.role === 'therapist';
  const isAdmin = user?.role === 'admin';

  // Fetch communication preferences
  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['/api/messaging/preferences'],
    enabled: !!user,
  });

  // Fetch notification logs (admin only)
  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['/api/messaging/logs'],
    enabled: isAdmin,
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: Partial<CommunicationPreferences>) => {
      return await apiRequest('PUT', '/api/messaging/preferences', newPreferences);
    },
    onSuccess: () => {
      toast({
        title: "Preferences Updated",
        description: "Your communication preferences have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/preferences'] });
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
      return await apiRequest('POST', '/api/messaging/send', messageData);
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
      setMessageForm({
        recipient: '',
        channel: 'email',
        subject: '',
        message: '',
        priority: 'normal'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/logs'] });
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
      return await apiRequest('POST', '/api/messaging/send-bulk', messageData);
    },
    onSuccess: () => {
      toast({
        title: "Bulk Messages Sent",
        description: "Your bulk messages have been sent successfully.",
      });
      setBulkMessageForm({
        userIds: [],
        channel: 'email',
        subject: '',
        message: '',
        priority: 'normal'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/logs'] });
    },
    onError: () => {
      toast({
        title: "Bulk Send Failed",
        description: "Failed to send bulk messages. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Test message mutation
  const testMessageMutation = useMutation({
    mutationFn: async (testData: any) => {
      return await apiRequest('POST', '/api/messaging/test', testData);
    },
    onSuccess: () => {
      toast({
        title: "Test Message Sent",
        description: "Test message has been sent successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Test Failed",
        description: "Failed to send test message. Please check your credentials.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!messageForm.recipient || !messageForm.message) {
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
      subject: messageForm.subject,
      customMessage: messageForm.message,
      priority: messageForm.priority,
      recipient: messageForm.recipient
    });
  };

  const handleSendBulkMessage = () => {
    if (bulkMessageForm.userIds.length === 0 || !bulkMessageForm.message) {
      toast({
        title: "Missing Information",
        description: "Please select recipients and enter a message.",
        variant: "destructive",
      });
      return;
    }

    sendBulkMessageMutation.mutate({
      userIds: bulkMessageForm.userIds,
      channel: bulkMessageForm.channel,
      subject: bulkMessageForm.subject,
      customMessage: bulkMessageForm.message,
      priority: bulkMessageForm.priority
    });
  };

  const handleTestMessage = () => {
    testMessageMutation.mutate({
      channel: testMessageForm.channel,
      recipient: testMessageForm.recipient
    });
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4" />;
      case 'sms':
        return <Smartphone className="w-4 h-4" />;
      case 'email':
        return <Mail className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
                Messaging & Communications
              </CardTitle>
              <p className="text-body text-hive-black/70">
                Comprehensive messaging system with SMS, WhatsApp, and email support
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Status Banner */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <div>
              <p className="font-medium text-orange-800">
                SMS & WhatsApp Setup Required
              </p>
              <p className="text-sm text-orange-600">
                To enable SMS and WhatsApp messaging, please configure your Twilio credentials. 
                Email messaging is fully operational.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="send">Send</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Send</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hive-card-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Mail className="w-5 h-5 mr-2 text-green-600" />
                  Email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Provider</span>
                    <span className="text-sm text-gray-600">SendGrid</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Messages Today</span>
                    <span className="text-sm font-semibold">12</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hive-card-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Smartphone className="w-5 h-5 mr-2 text-orange-600" />
                  SMS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <Badge className="bg-orange-100 text-orange-800">Setup Required</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Provider</span>
                    <span className="text-sm text-gray-600">Twilio</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Messages Today</span>
                    <span className="text-sm font-semibold">0</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hive-card-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-green-600" />
                  WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <Badge className="bg-orange-100 text-orange-800">Setup Required</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Provider</span>
                    <span className="text-sm text-gray-600">Twilio</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Messages Today</span>
                    <span className="text-sm font-semibold">0</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Test Messaging */}
          <Card className="hive-card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="w-5 h-5 mr-2" />
                Test Messaging System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="testChannel">Test Channel</Label>
                  <Select value={testMessageForm.channel} onValueChange={(value: any) => setTestMessageForm({ ...testMessageForm, channel: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email (Active)</SelectItem>
                      <SelectItem value="sms">SMS (Setup Required)</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp (Setup Required)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="testRecipient">Test Recipient</Label>
                  <Input
                    id="testRecipient"
                    placeholder="Email or phone number"
                    value={testMessageForm.recipient}
                    onChange={(e) => setTestMessageForm({ ...testMessageForm, recipient: e.target.value })}
                  />
                </div>
              </div>
              <Button 
                onClick={handleTestMessage}
                disabled={testMessageMutation.isPending}
                className="bg-hive-purple hover:bg-hive-purple/90"
              >
                {testMessageMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4 mr-2" />
                    Send Test Message
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Send Message Tab */}
        <TabsContent value="send" className="space-y-6">
          {!canSendMessages ? (
            <Card className="hive-card-shadow">
              <CardContent className="p-8 text-center">
                <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
                <p className="text-gray-600">
                  Messaging functionality is available to therapists and administrators only.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="hive-card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Send className="w-5 h-5 mr-2" />
                  Send Individual Message
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Example Templates for Therapists */}
                {user?.role === 'therapist' && (
                  <div className="p-4 bg-hive-light-blue/30 rounded-lg border border-hive-purple/20">
                    <h4 className="font-semibold text-hive-purple mb-3 flex items-center">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Example Message Templates
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="p-3 bg-white rounded border border-gray-200">
                        <p className="font-medium text-gray-700 mb-1">Appointment Reminder:</p>
                        <p className="text-gray-600 italic">"Hi [Client Name], this is a friendly reminder about your therapy session tomorrow at [Time]. Looking forward to seeing you. If you need to reschedule, please let me know. Best regards, [Your Name]"</p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2 text-hive-purple hover:text-hive-purple hover:bg-hive-purple/10"
                          onClick={() => setMessageForm({ 
                            ...messageForm, 
                            message: "Hi [Client Name], this is a friendly reminder about your therapy session tomorrow at [Time]. Looking forward to seeing you. If you need to reschedule, please let me know. Best regards, [Your Name]" 
                          })}
                        >
                          Use This Template
                        </Button>
                      </div>
                      <div className="p-3 bg-white rounded border border-gray-200">
                        <p className="font-medium text-gray-700 mb-1">Check-in Message:</p>
                        <p className="text-gray-600 italic">"Hi [Client Name], I hope you're doing well. I wanted to check in and see how you've been feeling since our last session. Please feel free to reach out if you'd like to discuss anything. Take care, [Your Name]"</p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2 text-hive-purple hover:text-hive-purple hover:bg-hive-purple/10"
                          onClick={() => setMessageForm({ 
                            ...messageForm, 
                            message: "Hi [Client Name], I hope you're doing well. I wanted to check in and see how you've been feeling since our last session. Please feel free to reach out if you'd like to discuss anything. Take care, [Your Name]" 
                          })}
                        >
                          Use This Template
                        </Button>
                      </div>
                      <div className="p-3 bg-white rounded border border-gray-200">
                        <p className="font-medium text-gray-700 mb-1">Session Follow-up:</p>
                        <p className="text-gray-600 italic">"Hi [Client Name], thank you for today's session. I wanted to follow up on the techniques we discussed. Remember to practice [specific technique] and note how it goes. See you at our next session. Warm regards, [Your Name]"</p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2 text-hive-purple hover:text-hive-purple hover:bg-hive-purple/10"
                          onClick={() => setMessageForm({ 
                            ...messageForm, 
                            message: "Hi [Client Name], thank you for today's session. I wanted to follow up on the techniques we discussed. Remember to practice [specific technique] and note how it goes. See you at our next session. Warm regards, [Your Name]" 
                          })}
                        >
                          Use This Template
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      💡 Tip: Click "Use This Template" to copy the message, then personalise it for your client.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="recipient">Recipient</Label>
                    <Input
                      id="recipient"
                      placeholder="Email or phone number"
                      value={messageForm.recipient}
                      onChange={(e) => setMessageForm({ ...messageForm, recipient: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="channel">Channel</Label>
                    <Select value={messageForm.channel} onValueChange={(value: any) => setMessageForm({ ...messageForm, channel: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {messageForm.channel === 'email' && (
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Message subject"
                      value={messageForm.subject}
                      onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Enter your message here..."
                    value={messageForm.message}
                    onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={messageForm.priority} onValueChange={(value: any) => setMessageForm({ ...messageForm, priority: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
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
          )}
        </TabsContent>

        {/* Bulk Send Tab */}
        <TabsContent value="bulk" className="space-y-6">
          {!isAdmin ? (
            <Card className="hive-card-shadow">
              <CardContent className="p-8 text-center">
                <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Admin Access Required</h3>
                <p className="text-gray-600">
                  Bulk messaging functionality is available to administrators only.
                </p>
              </CardContent>
            </Card>
          ) : (
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
                  <Select value={bulkMessageForm.channel} onValueChange={(value: any) => setBulkMessageForm({ ...bulkMessageForm, channel: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {bulkMessageForm.channel === 'email' && (
                  <div>
                    <Label htmlFor="bulkSubject">Subject</Label>
                    <Input
                      id="bulkSubject"
                      placeholder="Message subject"
                      value={bulkMessageForm.subject}
                      onChange={(e) => setBulkMessageForm({ ...bulkMessageForm, subject: e.target.value })}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="bulkMessage">Message</Label>
                  <Textarea
                    id="bulkMessage"
                    placeholder="Enter your message here..."
                    value={bulkMessageForm.message}
                    onChange={(e) => setBulkMessageForm({ ...bulkMessageForm, message: e.target.value })}
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="bulkRecipients">Recipients</Label>
                  <Input
                    id="bulkRecipients"
                    placeholder="Enter user IDs separated by commas"
                    value={bulkMessageForm.userIds.join(', ')}
                    onChange={(e) => setBulkMessageForm({ 
                      ...bulkMessageForm, 
                      userIds: e.target.value.split(',').map(id => id.trim()).filter(id => id) 
                    })}
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
          )}
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card className="hive-card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Communication Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {preferencesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Clock className="w-6 h-6 animate-spin" />
                </div>
              ) : preferences ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="font-medium">Email Notifications</Label>
                      <p className="text-sm text-gray-600">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={preferences.emailEnabled}
                      onCheckedChange={(checked) => 
                        updatePreferencesMutation.mutate({ emailEnabled: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="font-medium">SMS Notifications</Label>
                      <p className="text-sm text-gray-600">Receive notifications via SMS</p>
                    </div>
                    <Switch
                      checked={preferences.smsEnabled}
                      onCheckedChange={(checked) => 
                        updatePreferencesMutation.mutate({ smsEnabled: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="font-medium">WhatsApp Notifications</Label>
                      <p className="text-sm text-gray-600">Receive notifications via WhatsApp</p>
                    </div>
                    <Switch
                      checked={preferences.whatsappEnabled}
                      onCheckedChange={(checked) => 
                        updatePreferencesMutation.mutate({ whatsappEnabled: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="font-medium">Appointment Reminders</Label>
                      <p className="text-sm text-gray-600">Receive appointment reminders</p>
                    </div>
                    <Switch
                      checked={preferences.appointmentReminders}
                      onCheckedChange={(checked) => 
                        updatePreferencesMutation.mutate({ appointmentReminders: checked })
                      }
                    />
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No preferences available. Please log in to view preferences.
                </p>
              )}
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
              {!isAdmin ? (
                <div className="text-center py-8">
                  <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Admin Access Required</h3>
                  <p className="text-gray-600">
                    Message logs are available to administrators only.
                  </p>
                </div>
              ) : logsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Clock className="w-6 h-6 animate-spin" />
                </div>
              ) : logs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No message logs available yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {logs.map((log: NotificationLog) => (
                    <div key={log.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getChannelIcon(log.channel)}
                          <Badge variant="outline">{log.channel}</Badge>
                          <span className="text-sm text-gray-600">{log.recipient}</span>
                        </div>
                        <Badge className={getStatusColor(log.status)}>
                          {log.status === 'delivered' && <Check className="w-3 h-3 mr-1" />}
                          {log.status === 'failed' && <X className="w-3 h-3 mr-1" />}
                          {log.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{log.message}</p>
                      <div className="text-xs text-gray-500">
                        {log.sentAt && `Sent: ${new Date(log.sentAt).toLocaleString()}`}
                        {log.deliveredAt && ` | Delivered: ${new Date(log.deliveredAt).toLocaleString()}`}
                        {log.failureReason && ` | Error: ${log.failureReason}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}