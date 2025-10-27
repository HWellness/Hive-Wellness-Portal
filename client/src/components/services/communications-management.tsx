import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Reply,
  Archive,
  Download,
} from "lucide-react";
import type { User } from "@shared/schema";

interface CommunicationsManagementProps {
  user: User;
}

interface CommunicationMessage {
  id: string;
  type: "email" | "sms" | "whatsapp" | "in-app" | "notification";
  from: string;
  to: string[];
  subject: string;
  content: string;
  status: "draft" | "sent" | "delivered" | "failed";
  priority: "high" | "normal" | "low";
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
  type: "email" | "sms" | "whatsapp" | "notification";
  subject: string;
  content: string;
  variables: string[];
  category: string;
  isActive: boolean;
  usageCount: number;
  lastUsed?: string;
}

export default function CommunicationsManagement({ user }: CommunicationsManagementProps) {
  const [activeTab, setActiveTab] = useState("messages");
  const [selectedMessage, setSelectedMessage] = useState<CommunicationMessage | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState({
    type: "email" as "email" | "sms" | "whatsapp" | "in-app",
    to: "",
    subject: "",
    content: "",
    priority: "normal" as "high" | "normal" | "low",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Admin-only access control
  const isAdmin = user?.role === "admin";

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
              Therapist accounts cannot access messaging automation controls for security and
              compliance reasons.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/communications/messages", filterStatus, filterType],
  });

  // Fetch templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/communications/templates"],
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      return await apiRequest("POST", "/api/communications/send", messageData);
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
      setNewMessage({ type: "email", to: "", subject: "", content: "", priority: "normal" });
      queryClient.invalidateQueries({ queryKey: ["/api/communications/messages"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Send Message",
        description: "There was an error sending your message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Demo data for development
  const demoMessages: CommunicationMessage[] = [
    {
      id: "1",
      type: "email",
      from: "admin@hivewellness.com",
      to: ["client1@example.com"],
      subject: "Welcome to Hive Wellness",
      content: "Thank you for joining our therapy platform...",
      status: "delivered",
      priority: "normal",
      sentAt: "2025-01-06T10:30:00Z",
      readAt: "2025-01-06T11:15:00Z",
      tags: ["welcome", "onboarding"],
      createdAt: "2025-01-06T10:30:00Z",
    },
    {
      id: "2",
      type: "email",
      from: "system@hivewellness.com",
      to: ["therapist1@example.com"],
      subject: "New Client Assignment",
      content: "You have been matched with a new client...",
      status: "sent",
      priority: "high",
      sentAt: "2025-01-06T14:20:00Z",
      tags: ["assignment", "matching"],
      createdAt: "2025-01-06T14:20:00Z",
    },
    {
      id: "3",
      type: "sms",
      from: "Hive Wellness",
      to: ["+44123456789"],
      subject: "",
      content: "Reminder: Your therapy session is scheduled for tomorrow at 2:00 PM.",
      status: "delivered",
      priority: "normal",
      sentAt: "2025-01-06T16:00:00Z",
      tags: ["reminder", "appointment"],
      createdAt: "2025-01-06T16:00:00Z",
    },
    {
      id: "4",
      type: "whatsapp",
      from: "Hive Wellness",
      to: ["+44123456789"],
      subject: "",
      content:
        "Hi! Your therapy session with Dr. Emma is confirmed for tomorrow at 2:00 PM. Please let us know if you need to reschedule.",
      status: "delivered",
      priority: "normal",
      sentAt: "2025-01-06T18:00:00Z",
      tags: ["appointment", "whatsapp"],
      createdAt: "2025-01-06T18:00:00Z",
    },
    {
      id: "5",
      type: "in-app",
      from: "System",
      to: ["client2@example.com"],
      subject: "Session Notes Available",
      content: "Your therapist has shared notes from your recent session.",
      status: "sent",
      priority: "low",
      sentAt: "2025-01-06T18:45:00Z",
      tags: ["notes", "session"],
      createdAt: "2025-01-06T18:45:00Z",
    },
  ];

  const demoTemplates: CommunicationTemplate[] = [
    {
      id: "1",
      name: "Welcome Email",
      type: "email",
      subject: "Welcome to {{platform_name}}",
      content: "Dear {{client_name}}, welcome to our therapy platform...",
      variables: ["platform_name", "client_name", "login_url"],
      category: "Onboarding",
      isActive: true,
      usageCount: 156,
      lastUsed: "2025-01-06T12:00:00Z",
    },
    {
      id: "2",
      name: "Appointment Reminder",
      type: "sms",
      subject: "",
      content:
        "Hi {{client_name}}, your therapy session with {{therapist_name}} is scheduled for {{appointment_time}}.",
      variables: ["client_name", "therapist_name", "appointment_time"],
      category: "Reminders",
      isActive: true,
      usageCount: 89,
      lastUsed: "2025-01-06T09:30:00Z",
    },
    {
      id: "3",
      name: "Session Complete",
      type: "email",
      subject: "Session Summary - {{date}}",
      content: "Your therapy session has been completed. Here's a summary...",
      variables: ["date", "session_duration", "next_session"],
      category: "Session Management",
      isActive: true,
      usageCount: 203,
      lastUsed: "2025-01-06T15:20:00Z",
    },
  ];

  const displayMessages: CommunicationMessage[] =
    (messages as CommunicationMessage[])?.length > 0
      ? (messages as CommunicationMessage[])
      : demoMessages;
  const displayTemplates: CommunicationTemplate[] =
    (templates as CommunicationTemplate[])?.length > 0
      ? (templates as CommunicationTemplate[])
      : demoTemplates;

  const filteredMessages = displayMessages.filter((message: CommunicationMessage) => {
    const matchesStatus = filterStatus === "all" || message.status === filterStatus;
    const matchesType = filterType === "all" || message.type === filterType;
    const matchesSearch =
      searchQuery === "" ||
      message.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.to.some((recipient: string) =>
        recipient.toLowerCase().includes(searchQuery.toLowerCase())
      );

    return matchesStatus && matchesType && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "normal":
        return "bg-blue-100 text-blue-800";
      case "low":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="w-4 h-4" />;
      case "sms":
        return <MessageSquare className="w-4 h-4" />;
      case "whatsapp":
        return <MessageSquare className="w-4 h-4 text-green-600" />;
      case "in-app":
        return <Users className="w-4 h-4" />;
      default:
        return <Mail className="w-4 h-4" />;
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.to || !newMessage.content) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate(newMessage);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            Communications Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage emails, SMS, and in-app communications across the platform
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Message Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search Messages</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search by recipient, subject, or content..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type-filter">Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="in-app">In-App</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Messages List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Messages ({filteredMessages.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messagesLoading ? (
                  <div className="text-center py-4">Loading messages...</div>
                ) : filteredMessages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No messages found matching your criteria.
                  </div>
                ) : (
                  filteredMessages.map((message: CommunicationMessage) => (
                    <div
                      key={message.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedMessage(message)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="flex-shrink-0 mt-1">{getTypeIcon(message.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {message.type === "sms" ? message.to[0] : message.subject}
                              </p>
                              <Badge className={getPriorityColor(message.priority)}>
                                {message.priority}
                              </Badge>
                              <Badge className={getStatusColor(message.status)}>
                                {message.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 truncate">
                              To: {message.to.join(", ")}
                            </p>
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                              {message.content}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                              <span className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {new Date(message.createdAt).toLocaleDateString()}
                              </span>
                              {message.readAt && (
                                <span className="flex items-center">
                                  <Eye className="w-3 h-3 mr-1" />
                                  Read
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <Button variant="ghost" size="sm">
                            <Reply className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Archive className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compose Tab */}
        <TabsContent value="compose" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compose New Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="message-type">Message Type</Label>
                  <Select
                    value={newMessage.type}
                    onValueChange={(value: "email" | "sms" | "whatsapp" | "in-app") =>
                      setNewMessage((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="in-app">In-App Notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={newMessage.priority}
                    onValueChange={(value: "high" | "normal" | "low") =>
                      setNewMessage((prev) => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="recipients">Recipients</Label>
                <Input
                  id="recipients"
                  placeholder="Enter email addresses or phone numbers, separated by commas"
                  value={newMessage.to}
                  onChange={(e) => setNewMessage((prev) => ({ ...prev, to: e.target.value }))}
                />
              </div>

              {newMessage.type !== "sms" && newMessage.type !== "whatsapp" && (
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Enter message subject"
                    value={newMessage.subject}
                    onChange={(e) =>
                      setNewMessage((prev) => ({ ...prev, subject: e.target.value }))
                    }
                  />
                </div>
              )}

              <div>
                <Label htmlFor="content">Message Content</Label>
                <Textarea
                  id="content"
                  placeholder="Enter your message content..."
                  rows={8}
                  value={newMessage.content}
                  onChange={(e) => setNewMessage((prev) => ({ ...prev, content: e.target.value }))}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setNewMessage({
                      type: "email",
                      to: "",
                      subject: "",
                      content: "",
                      priority: "normal",
                    })
                  }
                >
                  Clear
                </Button>
                <Button onClick={handleSendMessage} disabled={sendMessageMutation.isPending}>
                  <Send className="w-4 h-4 mr-2" />
                  {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayTemplates.map((template: CommunicationTemplate) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge variant={template.isActive ? "default" : "secondary"}>
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(template.type)}
                          <span className="text-sm text-gray-600 capitalize">{template.type}</span>
                        </div>
                        <p className="text-sm text-gray-500">{template.category}</p>
                        <p className="text-sm font-medium">{template.subject}</p>
                        <p className="text-xs text-gray-400 line-clamp-2">{template.content}</p>
                        <div className="flex justify-between items-center text-xs text-gray-400 pt-2 border-t">
                          <span>Used {template.usageCount} times</span>
                          {template.lastUsed && (
                            <span>Last: {new Date(template.lastUsed).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,247</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">98.2%</div>
                <p className="text-xs text-muted-foreground">+0.5% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">76.5%</div>
                <p className="text-xs text-muted-foreground">+3.2% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Messages</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">23</div>
                <p className="text-xs text-muted-foreground">-8 from last month</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
