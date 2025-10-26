import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  MessageSquare, 
  Mail, 
  Send, 
  Users, 
  Filter,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Bell,
  Plus,
  Edit,
  Settings
} from "lucide-react";
import type { User } from "@shared/schema";

interface CommunicationsAndRemindersProps {
  user: User;
}

interface CommunicationMessage {
  id: string;
  type: 'email' | 'sms' | 'whatsapp' | 'in-app' | 'notification';
  from: string;
  to: string[];
  subject: string;
  content: string;
  status: 'draft' | 'sent' | 'delivered' | 'failed';
  priority: 'high' | 'normal' | 'low';
  sentAt?: string;
  readAt?: string;
  threadId?: string;
  attachments?: string[];
  tags: string[];
  createdAt: string;
}

interface CommunicationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'whatsapp' | 'notification';
  subject: string;
  content: string;
  variables: string[];
  category: string;
  isActive: boolean;
  usageCount: number;
  lastUsed?: string;
}

interface ReminderConfiguration {
  id: string;
  reminderType: 'email' | 'sms';
  eventType: 'session_reminder' | 'follow_up' | 'appointment_confirmation';
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
  reminderType: 'email' | 'sms';
  eventType: 'session_reminder' | 'follow_up' | 'appointment_confirmation';
  timeBefore: number;
  subject?: string;
  recipientPhone?: string;
  message: string;
  isEnabled: boolean;
}

const defaultReminderFormData: ReminderConfigurationFormData = {
  reminderType: 'email',
  eventType: 'session_reminder',
  timeBefore: 1440,
  subject: '',
  recipientPhone: '',
  message: '',
  isEnabled: true
};

export default function CommunicationsAndReminders({ user }: CommunicationsAndRemindersProps) {
  const [activeTab, setActiveTab] = useState("messages");
  const [selectedMessage, setSelectedMessage] = useState<CommunicationMessage | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState({
    type: 'email' as 'email' | 'sms' | 'whatsapp' | 'in-app',
    to: '',
    subject: '',
    content: '',
    priority: 'normal' as 'high' | 'normal' | 'low'
  });

  // Reminder configuration state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ReminderConfiguration | null>(null);
  const [reminderFormData, setReminderFormData] = useState<ReminderConfigurationFormData>(defaultReminderFormData);
  const [pendingReminders, setPendingReminders] = useState<number>(0);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Admin-only access control
  const isAdmin = user?.role === 'admin';
  
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Communications management and messaging automation are restricted to admin users only.
            </p>
            <p className="text-sm text-gray-500">
              Therapist accounts cannot access messaging automation controls for security and compliance reasons.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/communications/messages', filterStatus, filterType],
  });

  // Fetch templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/communications/templates'],
  });

  // Fetch reminder configurations
  const { data: configurations = [], isLoading: configurationsLoading } = useQuery<ReminderConfiguration[]>({
    queryKey: ['/api/admin/reminder-configurations'],
    refetchInterval: 30000
  });

  // Fetch pending reminders count
  const { data: reminderQueue = [] } = useQuery({
    queryKey: ['/api/admin/reminder-queue'],
    refetchInterval: 30000
  });

  useEffect(() => {
    setPendingReminders((reminderQueue as any[]).length || 0);
  }, [reminderQueue]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      return await apiRequest('POST', '/api/communications/send', messageData);
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
      setNewMessage({ type: 'email', to: '', subject: '', content: '', priority: 'normal' });
      queryClient.invalidateQueries({ queryKey: ['/api/communications/messages'] });
    },
    onError: () => {
      toast({
        title: "Failed to Send Message",
        description: "There was an error sending your message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create reminder configuration
  const createReminderMutation = useMutation({
    mutationFn: async (data: ReminderConfigurationFormData) => {
      return await apiRequest('POST', '/api/admin/reminder-configurations', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reminder-configurations'] });
      setIsCreateDialogOpen(false);
      setReminderFormData(defaultReminderFormData);
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
  const updateReminderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ReminderConfigurationFormData> }) => {
      return await apiRequest('PUT', `/api/admin/reminder-configurations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reminder-configurations'] });
      setIsEditDialogOpen(false);
      setSelectedConfig(null);
      setReminderFormData(defaultReminderFormData);
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
  const deleteReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/reminder-configurations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reminder-configurations'] });
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

  const handleCreateReminder = () => {
    createReminderMutation.mutate(reminderFormData);
  };

  const handleUpdateReminder = () => {
    if (selectedConfig) {
      updateReminderMutation.mutate({ id: selectedConfig.id, data: reminderFormData });
    }
  };

  const handleEditReminder = (config: ReminderConfiguration) => {
    setSelectedConfig(config);
    setReminderFormData({
      reminderType: config.reminderType,
      eventType: config.eventType,
      timeBefore: config.timeBefore,
      subject: config.subject || '',
      recipientPhone: config.recipientPhone || '',
      message: config.message,
      isEnabled: config.isEnabled,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteReminder = (id: string) => {
    if (confirm('Are you sure you want to delete this reminder configuration?')) {
      deleteReminderMutation.mutate(id);
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case 'session_reminder': return 'Session Reminder';
      case 'follow_up': return 'Follow-up';
      case 'appointment_confirmation': return 'Appointment Confirmation';
      default: return eventType;
    }
  };

  const getTimeBeforeLabel = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutes`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hours`;
    return `${Math.floor(minutes / 1440)} days`;
  };

  // Demo data for messages
  const demoMessages: CommunicationMessage[] = [
    {
      id: '1',
      type: 'email',
      from: 'admin@hivewellness.com',
      to: ['client1@example.com'],
      subject: 'Welcome to Hive Wellness',
      content: 'Thank you for joining our therapy platform...',
      status: 'delivered',
      priority: 'normal',
      sentAt: '2025-01-06T10:30:00Z',
      readAt: '2025-01-06T11:15:00Z',
      tags: ['welcome', 'onboarding'],
      createdAt: '2025-01-06T10:30:00Z'
    },
    {
      id: '2',
      type: 'sms',
      from: 'Hive Wellness',
      to: ['+44123456789'],
      subject: '',
      content: 'Reminder: Your therapy session is scheduled for tomorrow at 2:00 PM.',
      status: 'delivered',
      priority: 'normal',
      sentAt: '2025-01-06T16:00:00Z',
      tags: ['reminder', 'appointment'],
      createdAt: '2025-01-06T16:00:00Z'
    },
    {
      id: '3',
      type: 'whatsapp',
      from: 'Hive Wellness',
      to: ['+44123456789'],
      subject: '',
      content: 'Hi! Your therapy session with Dr. Emma is confirmed for tomorrow at 2:00 PM.',
      status: 'delivered',
      priority: 'normal',
      sentAt: '2025-01-06T18:00:00Z',
      tags: ['appointment', 'whatsapp'],
      createdAt: '2025-01-06T18:00:00Z'
    }
  ];

  const displayMessages = (messages as CommunicationMessage[]).length > 0 ? (messages as CommunicationMessage[]) : demoMessages;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-hive-black">Communications & Reminders</h1>
        <p className="text-gray-600 mt-1">Manage SMS, WhatsApp messages and automated reminders</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="messages" data-testid="tab-messages">
            <MessageSquare className="h-4 w-4 mr-2" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">
            <Mail className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="reminders" data-testid="tab-reminders">
            <Bell className="h-4 w-4 mr-2" />
            Automated Reminders
          </TabsTrigger>
        </TabsList>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Messages</span>
                <div className="flex gap-2">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {displayMessages.map((message) => (
                  <div key={message.id} className="flex items-center justify-between p-4 border rounded hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      {message.type === 'email' && <Mail className="h-5 w-5 text-blue-600" />}
                      {message.type === 'sms' && <MessageSquare className="h-5 w-5 text-green-600" />}
                      {message.type === 'whatsapp' && <MessageSquare className="h-5 w-5 text-green-500" />}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{message.subject || message.content.substring(0, 50)}</span>
                          <Badge variant="outline">{message.type}</Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          To: {message.to.join(', ')} • {new Date(message.sentAt || message.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant={message.status === 'delivered' ? 'default' : 'secondary'}>
                      {message.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Template management coming soon</p>
                <p className="text-sm">Create reusable templates for common messages</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reminders Tab */}
        <TabsContent value="reminders" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-hive-black">Automated Reminders</h2>
              <p className="text-gray-600 mt-1">Configure SMS and email reminder settings</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-hive-purple hover:bg-hive-purple/90 text-white" data-testid="button-create-reminder">
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
                        value={reminderFormData.reminderType}
                        onValueChange={(value: 'email' | 'sms') => 
                          setReminderFormData(prev => ({ ...prev, reminderType: value }))
                        }
                      >
                        <SelectTrigger data-testid="select-reminder-type">
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
                        value={reminderFormData.eventType}
                        onValueChange={(value: 'session_reminder' | 'follow_up' | 'appointment_confirmation') => 
                          setReminderFormData(prev => ({ ...prev, eventType: value }))
                        }
                      >
                        <SelectTrigger data-testid="select-event-type">
                          <SelectValue />
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
                    <Label>Time Before Event (minutes)</Label>
                    <Input
                      type="number"
                      value={reminderFormData.timeBefore}
                      onChange={(e) => setReminderFormData(prev => ({ ...prev, timeBefore: parseInt(e.target.value) || 0 }))}
                      placeholder="1440"
                      data-testid="input-time-before"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {getTimeBeforeLabel(reminderFormData.timeBefore)} before the event
                    </p>
                  </div>

                  {reminderFormData.reminderType === 'email' && (
                    <div>
                      <Label>Email Subject</Label>
                      <Input
                        value={reminderFormData.subject || ''}
                        onChange={(e) => setReminderFormData(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Your therapy session reminder"
                        data-testid="input-subject"
                      />
                    </div>
                  )}

                  {reminderFormData.reminderType === 'sms' && (
                    <div>
                      <Label>Recipient Phone Number</Label>
                      <Input
                        value={reminderFormData.recipientPhone || ''}
                        onChange={(e) => setReminderFormData(prev => ({ ...prev, recipientPhone: e.target.value }))}
                        placeholder="Enter phone number or use {{client_phone}} or {{therapist_phone}}"
                        data-testid="input-recipient-phone"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Use variables: {'{client_phone}'}, {'{therapist_phone}'}
                      </p>
                    </div>
                  )}

                  <div>
                    <Label>Message</Label>
                    <Textarea
                      value={reminderFormData.message}
                      onChange={(e) => setReminderFormData(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Hi {{client_name}}, this is a reminder about your upcoming therapy session..."
                      rows={4}
                      data-testid="textarea-message"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use variables: client_name, therapist_name, session_date, session_time
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={reminderFormData.isEnabled}
                      onCheckedChange={(checked) => setReminderFormData(prev => ({ ...prev, isEnabled: checked }))}
                      data-testid="switch-enabled"
                    />
                    <Label>Enable this reminder</Label>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="button-cancel">
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateReminder} 
                      disabled={createReminderMutation.isPending}
                      className="bg-hive-purple hover:bg-hive-purple/90 text-white"
                      data-testid="button-submit-reminder"
                    >
                      {createReminderMutation.isPending ? 'Creating...' : 'Create Reminder'}
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
                <div className="text-2xl font-bold" data-testid="stat-active-reminders">
                  {configurations.filter(c => c.isEnabled).length}
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
                <div className="text-2xl font-bold" data-testid="stat-total-configs">
                  {configurations.length}
                </div>
                <p className="text-xs text-muted-foreground">All reminder types</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Queue</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-pending-queue">
                  {pendingReminders}
                </div>
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
                  <div key={config.id} className="flex items-center justify-between p-4 border rounded" data-testid={`reminder-config-${config.id}`}>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {config.reminderType === 'email' ? (
                          <Mail className="h-4 w-4 text-blue-600" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-green-600" />
                        )}
                        <Badge variant={config.isEnabled ? 'default' : 'secondary'}>
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
                      <Badge variant={config.isEnabled ? 'default' : 'secondary'}>
                        {config.isEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditReminder(config)}
                        data-testid={`button-edit-${config.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteReminder(config.id)}
                        className="text-red-600 hover:text-red-700"
                        data-testid={`button-delete-${config.id}`}
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
                      value={reminderFormData.reminderType}
                      onValueChange={(value: 'email' | 'sms') => 
                        setReminderFormData(prev => ({ ...prev, reminderType: value }))
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
                      value={reminderFormData.eventType}
                      onValueChange={(value: 'session_reminder' | 'follow_up' | 'appointment_confirmation') => 
                        setReminderFormData(prev => ({ ...prev, eventType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                  <Label>Time Before Event (minutes)</Label>
                  <Input
                    type="number"
                    value={reminderFormData.timeBefore}
                    onChange={(e) => setReminderFormData(prev => ({ ...prev, timeBefore: parseInt(e.target.value) || 0 }))}
                    placeholder="1440"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {getTimeBeforeLabel(reminderFormData.timeBefore)} before the event
                  </p>
                </div>

                {reminderFormData.reminderType === 'email' && (
                  <div>
                    <Label>Email Subject</Label>
                    <Input
                      value={reminderFormData.subject || ''}
                      onChange={(e) => setReminderFormData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Your therapy session reminder"
                    />
                  </div>
                )}

                {reminderFormData.reminderType === 'sms' && (
                  <div>
                    <Label>Recipient Phone Number</Label>
                    <Input
                      value={reminderFormData.recipientPhone || ''}
                      onChange={(e) => setReminderFormData(prev => ({ ...prev, recipientPhone: e.target.value }))}
                      placeholder="Enter phone number or use {{client_phone}} or {{therapist_phone}}"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use variables: {'{client_phone}'}, {'{therapist_phone}'}
                    </p>
                  </div>
                )}

                <div>
                  <Label>Message</Label>
                  <Textarea
                    value={reminderFormData.message}
                    onChange={(e) => setReminderFormData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Hi {{client_name}}, this is a reminder about your upcoming therapy session..."
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use variables: client_name, therapist_name, session_date, session_time
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={reminderFormData.isEnabled}
                    onCheckedChange={(checked) => setReminderFormData(prev => ({ ...prev, isEnabled: checked }))}
                  />
                  <Label>Enable this reminder</Label>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpdateReminder} 
                    disabled={updateReminderMutation.isPending}
                    className="bg-hive-purple hover:bg-hive-purple/90 text-white"
                  >
                    {updateReminderMutation.isPending ? 'Updating...' : 'Update Reminder'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
