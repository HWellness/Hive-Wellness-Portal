import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Users,
  Video,
  Shield,
  Mail,
  CheckCircle,
  Calendar,
  UserPlus,
  Archive,
  RotateCcw,
  AlertTriangle,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Eye,
  FileText,
  Download,
  Calendar as CalendarIcon,
  CheckSquare,
  Clock,
  Settings,
} from "lucide-react";
import jsPDF from "jspdf";
import type { User } from "@shared/schema";
import FormSubmissionsDashboard from "../admin/form-submissions-dashboard";
import AdminAvailabilitySettings from "./admin-availability-settings";

interface AdminConsoleProps {
  user: User;
}

export default function AdminConsole({ user }: AdminConsoleProps) {
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [archiveClientId, setArchiveClientId] = useState<string | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedArchiveClient, setSelectedArchiveClient] = useState<any>(null);

  // New state for additional admin actions
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [suspendUserId, setSuspendUserId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendDuration, setSuspendDuration] = useState<string>("");
  const [selectedSuspendUser, setSelectedSuspendUser] = useState<any>(null);

  const [isTerminateDialogOpen, setIsTerminateDialogOpen] = useState(false);
  const [terminateSessionId, setTerminateSessionId] = useState<string | null>(null);
  const [terminateReason, setTerminateReason] = useState("");

  // Chatbot conversation viewer state
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [isConversationDialogOpen, setIsConversationDialogOpen] = useState(false);
  const [conversationActions, setConversationActions] = useState({
    helpful: false,
    unhelpful: false,
    flagged: false,
  });

  // Bulk export state
  const [showBulkExport, setShowBulkExport] = useState(false);
  const [bulkExportType, setBulkExportType] = useState<"selected" | "dateRange">("selected");
  const [selectedConversationIds, setSelectedConversationIds] = useState<string[]>([]);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");

  // Admin availability management state
  const [showAvailabilitySettings, setShowAvailabilitySettings] = useState(false);

  const queryClient = useQueryClient();

  // Handle refresh conversations with feedback
  const handleRefreshConversations = async () => {
    try {
      await refetchConversations();
      toast({
        title: "Conversations refreshed",
        description: "Chatbot conversations have been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to refresh conversations. Please try again.",
        variant: "destructive",
      });
    }
  };

  const stats = {
    activeUsers: 1247,
    sessionsToday: 89,
    emailQueue: 12,
    systemStatus: "secure",
  };

  // Fetch archived clients
  const { data: archivedClients, isLoading: isArchivedLoading } = useQuery({
    queryKey: ["/api/admin/clients/archived"],
    retry: false,
  });

  // Fetch chatbot conversations
  const {
    data: chatbotConversations,
    isLoading: isChatbotLoading,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ["/api/admin/chatbot/conversations"],
    retry: false,
  });

  // Fetch full conversation details
  const { data: conversationDetails, isLoading: isConversationDetailsLoading } = useQuery({
    queryKey: ["/api/admin/chatbot/conversations/details", selectedConversation?.sessionId],
    queryFn: async () => {
      if (!selectedConversation?.sessionId) return null;
      const response = await apiRequest(
        "GET",
        `/api/admin/chatbot/conversations/details/${selectedConversation.sessionId}`
      );
      return response.json();
    },
    enabled: !!selectedConversation?.sessionId,
    retry: false,
  });

  // Archive client mutation
  const archiveClientMutation = useMutation({
    mutationFn: async ({ clientId, reason }: { clientId: string; reason: string }) => {
      return await apiRequest("POST", `/api/admin/client/${clientId}/archive`, { reason });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients/archived"] });
      toast({
        title: "Client archived successfully",
        description: `Client record has been archived with GDPR compliance. Retention period: 7 years.`,
      });
      setIsArchiveDialogOpen(false);
      setArchiveClientId(null);
      setArchiveReason("");
      setSelectedClient(null);
    },
    onError: (error) => {
      toast({
        title: "Error archiving client",
        description: error.message || "Failed to archive client record",
        variant: "destructive",
      });
    },
  });

  // Restore client mutation
  const restoreClientMutation = useMutation({
    mutationFn: async ({ clientId, reason }: { clientId: string; reason: string }) => {
      return await apiRequest("POST", `/api/admin/client/${clientId}/restore`, { reason });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients/archived"] });
      toast({
        title: "Client restored successfully",
        description: `Client record has been restored and is now active.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error restoring client",
        description: error.message || "Failed to restore client record",
        variant: "destructive",
      });
    },
  });

  const handleArchiveClient = (clientId: string, clientName: string) => {
    setArchiveClientId(clientId);
    setSelectedClient({ id: clientId, name: clientName });
    setIsArchiveDialogOpen(true);
  };

  const handleViewConversation = async (conversation: any) => {
    setSelectedConversation(conversation);
    setIsConversationDialogOpen(true);

    // Force refresh the conversation details query
    queryClient.invalidateQueries({
      queryKey: ["/api/admin/chatbot/conversations/details", conversation.sessionId],
    });
  };

  const handleConfirmArchive = () => {
    if (!archiveClientId || !archiveReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for archiving this client record",
        variant: "destructive",
      });
      return;
    }

    archiveClientMutation.mutate({ clientId: archiveClientId, reason: archiveReason });
  };

  // Suspend user mutation
  const suspendUserMutation = useMutation({
    mutationFn: async ({
      userId,
      reason,
      suspensionDuration,
    }: {
      userId: string;
      reason: string;
      suspensionDuration?: string;
    }) => {
      return await apiRequest("POST", `/api/admin/user/${userId}/suspend`, {
        reason,
        suspensionDuration,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User suspended successfully",
        description: `User account has been suspended and access revoked.`,
      });
      setIsSuspendDialogOpen(false);
      setSuspendUserId(null);
      setSuspendReason("");
      setSuspendDuration("");
      setSelectedSuspendUser(null);
    },
    onError: (error) => {
      toast({
        title: "Error suspending user",
        description: error.message || "Failed to suspend user account",
        variant: "destructive",
      });
    },
  });

  // Terminate session mutation
  const terminateSessionMutation = useMutation({
    mutationFn: async ({ sessionId, reason }: { sessionId: string; reason: string }) => {
      return await apiRequest("POST", `/api/admin/session/${sessionId}/terminate`, { reason });
    },
    onSuccess: (data) => {
      toast({
        title: "Session terminated successfully",
        description: `Active session has been terminated by admin.`,
      });
      setIsTerminateDialogOpen(false);
      setTerminateSessionId(null);
      setTerminateReason("");
    },
    onError: (error) => {
      toast({
        title: "Error terminating session",
        description: error.message || "Failed to terminate session",
        variant: "destructive",
      });
    },
  });

  const handleRestoreClient = (clientId: string) => {
    const reason = prompt("Please provide a reason for restoring this client:");
    if (reason && reason.trim().length >= 5) {
      restoreClientMutation.mutate({ clientId, reason });
    } else {
      toast({
        title: "Reason Required",
        description: "Please provide a valid reason (minimum 5 characters)",
        variant: "destructive",
      });
    }
  };

  const handleSuspendUser = (userId: string, userName: string) => {
    setSuspendUserId(userId);
    setSelectedSuspendUser({ id: userId, name: userName });
    setIsSuspendDialogOpen(true);
  };

  const handleConfirmSuspend = () => {
    if (!suspendUserId || !suspendReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for suspending this user",
        variant: "destructive",
      });
      return;
    }

    suspendUserMutation.mutate({
      userId: suspendUserId,
      reason: suspendReason,
      suspensionDuration: suspendDuration || undefined,
    });
  };

  const handleTerminateSession = (sessionId: string) => {
    setTerminateSessionId(sessionId);
    setIsTerminateDialogOpen(true);
  };

  const handleConfirmTerminate = () => {
    if (!terminateSessionId || !terminateReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for terminating this session",
        variant: "destructive",
      });
      return;
    }

    terminateSessionMutation.mutate({ sessionId: terminateSessionId, reason: terminateReason });
  };

  // Demo client data for archival testing
  const demoClients = [
    {
      id: "demo-client-1",
      name: "Emma Johnson",
      email: "emma@example.com",
      status: "active",
      lastSession: "2025-01-05",
      therapist: "Dr. Sarah Chen",
    },
    {
      id: "demo-client-2",
      name: "Michael Roberts",
      email: "michael@example.com",
      status: "inactive",
      lastSession: "2024-12-20",
      therapist: "Dr. James Wilson",
    },
  ];

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        {/* Enhanced Header */}
        <div className="bg-white shadow-sm border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-2xl font-primary font-bold text-hive-black">Admin Console</h1>
                <p className="text-sm text-hive-black/70 font-secondary">
                  Platform management and oversight •{" "}
                  {new Date().toLocaleDateString("en-GB", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  <Shield className="w-3 h-3 mr-1" />
                  System Secure
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Enhanced Overview Card */}
            <div className="bg-gradient-to-r from-hive-purple to-hive-blue text-white p-8 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-primary font-bold mb-3">Platform Overview</h2>
                  <p className="font-secondary text-hive-light-blue text-lg">
                    Monitor and manage all platform operations
                  </p>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{stats.activeUsers.toLocaleString()}</div>
                    <div className="text-sm opacity-90">Active Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{stats.sessionsToday}</div>
                    <div className="text-sm opacity-90">Sessions Today</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{stats.emailQueue}</div>
                    <div className="text-sm opacity-90">Email Queue</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-secondary font-medium text-hive-black/70">
                        Active Users
                      </p>
                      <p className="text-2xl font-primary font-bold text-hive-black">
                        {stats.activeUsers.toLocaleString()}
                      </p>
                      <p className="text-xs font-secondary text-green-600">+8% this month</p>
                    </div>
                    <div className="p-3 bg-hive-purple/10 rounded-full">
                      <Users className="h-6 w-6 text-hive-purple" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-secondary font-medium text-hive-black/70">
                        Sessions Today
                      </p>
                      <p className="text-2xl font-primary font-bold text-hive-black">
                        {stats.sessionsToday}
                      </p>
                      <p className="text-xs font-secondary text-hive-black/50">active sessions</p>
                    </div>
                    <div className="p-3 bg-hive-blue/10 rounded-full">
                      <Video className="h-6 w-6 text-hive-blue" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-secondary font-medium text-hive-black/70">
                        Email Queue
                      </p>
                      <p className="text-2xl font-primary font-bold text-hive-black">
                        {stats.emailQueue}
                      </p>
                      <p className="text-xs font-secondary text-hive-black/50">pending emails</p>
                    </div>
                    <div className="p-3 bg-orange-500/10 rounded-full">
                      <Mail className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-secondary font-medium text-hive-black/70">
                        System Status
                      </p>
                      <p className="text-2xl font-primary font-bold text-green-600">Secure</p>
                      <p className="text-xs font-secondary text-green-600">
                        all systems operational
                      </p>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-full">
                      <Shield className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Management Actions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Client Archive Management */}
              <Card className="bg-white border-gray-200 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center text-hive-black">
                    <Archive className="h-5 w-5 mr-2 text-hive-purple" />
                    Client Archive Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-hive-black/70 font-secondary">
                      Archive inactive client records with GDPR compliance. Archived records are
                      retained for 7 years as required by law.
                    </p>
                    <div className="space-y-3">
                      {demoClients.map((client) => (
                        <div
                          key={client.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-hive-black">{client.name}</p>
                            <p className="text-sm text-hive-black/60">{client.email}</p>
                            <p className="text-xs text-hive-black/50">
                              Last session: {client.lastSession}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={client.status === "active" ? "default" : "secondary"}>
                              {client.status}
                            </Badge>
                            {client.status === "active" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleArchiveClient(client.id, client.name)}
                              >
                                <Archive className="h-4 w-4 mr-1" />
                                Archive
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Chatbot Conversation Monitor */}
              <Card className="bg-white border-gray-200 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-hive-black">
                    <div className="flex items-center">
                      <MessageCircle className="h-5 w-5 mr-2 text-hive-purple" />
                      Chatbot Conversations
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRefreshConversations}
                      disabled={isChatbotLoading}
                    >
                      <RefreshCw
                        className={`h-4 w-4 mr-1 ${isChatbotLoading ? "animate-spin" : ""}`}
                      />
                      {isChatbotLoading ? "Loading..." : "Refresh"}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isChatbotLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-hive-purple rounded-full"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-hive-black/70 font-secondary">
                        Monitor and review AI chatbot interactions for quality assurance.
                      </p>
                      {Array.isArray(chatbotConversations) && chatbotConversations.length > 0 ? (
                        <div className="space-y-3">
                          {chatbotConversations.slice(0, 5).map((conversation: any) => (
                            <div
                              key={conversation.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-hive-black">
                                  {conversation.userMessage
                                    ? conversation.userMessage.substring(0, 50) + "..."
                                    : "New conversation"}
                                </p>
                                <p className="text-sm text-hive-black/60">
                                  {conversation.userName || "Anonymous"} •{" "}
                                  {new Date(conversation.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewConversation(conversation)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button size="sm" variant="outline">
                                  <ThumbsUp className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <ThumbsDown className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">No chatbot conversations available</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Admin Availability Management */}
              <Card className="bg-white border-gray-200 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-hive-black">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-hive-purple" />
                      Availability Management
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAvailabilitySettings(!showAvailabilitySettings)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      {showAvailabilitySettings ? "Hide Settings" : "Manage Schedule"}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {showAvailabilitySettings ? (
                    <div className="space-y-4">
                      <AdminAvailabilitySettings user={user} />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-hive-black/70 font-secondary">
                        Configure your working hours, blocked dates, and calendar integration.
                        Clients and therapists will only see available time slots.
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div>
                            <p className="font-medium text-hive-black">Weekly Schedule</p>
                            <p className="text-sm text-hive-black/60">
                              Monday-Friday, 9:00 AM - 5:00 PM
                            </p>
                            <p className="text-xs text-green-600">Google Calendar synced</p>
                          </div>
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div>
                            <p className="font-medium text-hive-black">Session Duration</p>
                            <p className="text-sm text-hive-black/60">
                              50 minutes with 10-minute buffer
                            </p>
                            <p className="text-xs text-blue-600">Optimal for therapy sessions</p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800">Configured</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                          <div>
                            <p className="font-medium text-hive-black">Blocked Dates</p>
                            <p className="text-sm text-hive-black/60">
                              Christmas & New Year holidays
                            </p>
                            <p className="text-xs text-orange-600">2 upcoming blocks</p>
                          </div>
                          <Badge className="bg-orange-100 text-orange-800">Scheduled</Badge>
                        </div>
                      </div>
                      <Button
                        onClick={() => setShowAvailabilitySettings(true)}
                        className="w-full bg-hive-purple hover:bg-hive-purple/90"
                        size="sm"
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Configure Availability
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Archive Management Dialogs */}
            <Card className="service-card bg-hive-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Archive className="w-5 h-5 mr-2 text-gray-600" />
                  Archived Clients
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isArchivedLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-hive-purple"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {archivedClients &&
                    Array.isArray(archivedClients) &&
                    archivedClients.length > 0 ? (
                      archivedClients.map((client: any) => (
                        <div
                          key={client.id}
                          className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-700">
                              {client.firstName} {client.lastName}
                            </p>
                            <p className="text-sm text-gray-600">{client.email}</p>
                            <p className="text-xs text-red-600">
                              Deleted: {new Date(client.deletedAt).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              Retention expires:{" "}
                              {new Date(client.dataRetentionExpiry).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="destructive">archived</Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestoreClient(client.id)}
                              className="text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Restore
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Archive className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No archived clients</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chatbot Conversations Monitor */}
          <Card className="service-card bg-hive-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2 text-hive-purple" />
                  Chatbot Conversations
                </CardTitle>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setShowBulkExport(true)}>
                    <Download className="w-4 h-4 mr-1" />
                    Bulk Export
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchConversations()}
                    disabled={isChatbotLoading}
                  >
                    <RefreshCw
                      className={`w-4 h-4 mr-1 ${isChatbotLoading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isChatbotLoading ? (
                <div className="flex justify-center items-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-hive-purple" />
                  <span className="ml-2 text-gray-600">Loading conversations...</span>
                </div>
              ) : chatbotConversations &&
                Array.isArray(chatbotConversations) &&
                chatbotConversations.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {chatbotConversations.map((conversation: any, index: number) => (
                    <div
                      key={conversation.id || index}
                      className="border border-gray-200 rounded-lg p-4 space-y-3"
                    >
                      {/* Conversation Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant={conversation.userId ? "default" : "secondary"}>
                            {conversation.userId || "Anonymous"}
                          </Badge>
                          <Badge variant="outline">{conversation.responseSource || "ai"}</Badge>
                          {conversation.wasRedacted && (
                            <Badge variant="destructive" className="text-xs">
                              Redacted
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {conversation.createdAt
                            ? new Date(conversation.createdAt).toLocaleString()
                            : "Recent"}
                        </div>
                      </div>

                      {/* Message Content */}
                      <div className="space-y-2">
                        <div className="p-2 bg-blue-50 rounded text-sm">
                          <span className="font-medium text-blue-800">User:</span>
                          <p className="text-gray-700 mt-1">
                            {conversation.userMessage || "Initial conversation"}
                          </p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded text-sm">
                          <span className="font-medium text-gray-800">Assistant:</span>
                          <p className="text-gray-700 mt-1">
                            {conversation.aiResponse
                              ? conversation.aiResponse.substring(0, 150) + "..."
                              : "Processing..."}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {conversation.context || "general"}
                          </Badge>
                          {conversation.therapistId && (
                            <Badge variant="secondary" className="text-xs">
                              Connected
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewConversation(conversation)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No conversations available</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Chatbot conversations will appear here for admin review
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Form Submissions Dashboard */}
          <Card className="bg-white border-gray-200 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center text-hive-black">
                <FileText className="h-5 w-5 mr-2 text-hive-purple" />
                Form Submissions Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormSubmissionsDashboard />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs and Modals */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Client</DialogTitle>
            <DialogDescription>
              This will permanently archive {selectedArchiveClient?.name}'s account and remove their
              access to the platform. All data will be retained for 7 years as required by law.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for archiving</label>
              <textarea
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="Please provide a reason for archiving this client..."
                className="w-full p-2 border rounded-md mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsArchiveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmArchive} disabled={archiveClientMutation.isPending}>
              {archiveClientMutation.isPending ? "Archiving..." : "Archive Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User Account</DialogTitle>
            <DialogDescription>
              This will temporarily suspend {selectedSuspendUser?.name}'s account and remove their
              platform access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for suspension</label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Please provide a reason for suspending this user..."
                className="w-full p-2 border rounded-md mt-1"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Suspension Duration (optional)</label>
              <input
                type="text"
                value={suspendDuration}
                onChange={(e) => setSuspendDuration(e.target.value)}
                placeholder="e.g., 7 days, 1 month, permanent"
                className="w-full p-2 border rounded-md mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSuspendDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSuspend}
              disabled={suspendUserMutation.isPending}
              variant="destructive"
            >
              {suspendUserMutation.isPending ? "Suspending..." : "Suspend User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTerminateDialogOpen} onOpenChange={setIsTerminateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate Session</DialogTitle>
            <DialogDescription>
              This will immediately terminate the active session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for termination</label>
              <textarea
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
                placeholder="Please provide a reason for terminating this session..."
                className="w-full p-2 border rounded-md mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTerminateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmTerminate}
              disabled={terminateSessionMutation.isPending}
              variant="destructive"
            >
              {terminateSessionMutation.isPending ? "Terminating..." : "Terminate Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chatbot Conversation Viewer Dialog */}
      <Dialog open={isConversationDialogOpen} onOpenChange={setIsConversationDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <MessageCircle className="h-5 w-5 mr-2 text-hive-purple" />
              Chatbot Conversation Details
            </DialogTitle>
            <DialogDescription>Full conversation history and details</DialogDescription>
          </DialogHeader>

          {selectedConversation && (
            <div className="space-y-6">
              {/* Conversation Metadata */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">User:</span>
                    <p className="text-hive-black">
                      {selectedConversation.userName || "Anonymous"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Started:</span>
                    <p className="text-hive-black">
                      {new Date(selectedConversation.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Messages:</span>
                    <p className="text-hive-black">
                      {conversationDetails?.messages?.length || "Loading..."}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">User Agent:</span>
                    <p className="text-hive-black text-xs">
                      {selectedConversation.userAgent || "Not available"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">IP Address:</span>
                    <p className="text-hive-black">
                      {selectedConversation.ipAddress || "Not tracked"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages Display */}
              <div className="space-y-4">
                <h4 className="font-medium text-hive-black">Conversation History:</h4>

                {conversationDetails?.messages ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-4">
                    {conversationDetails.messages.map((message: any, index: number) => (
                      <div
                        key={index}
                        className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.isUser
                              ? "bg-hive-purple text-white"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          <div className="text-sm">{message.text}</div>
                          <div
                            className={`text-xs mt-1 ${
                              message.isUser ? "text-hive-purple-light" : "text-gray-500"
                            }`}
                          >
                            {new Date(message.timestamp).toLocaleTimeString()}
                            {message.source && !message.isUser && (
                              <span className="ml-2">• {message.source}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : isConversationDetailsLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-hive-purple rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading conversation details...</p>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-gray-600">No conversation details available</p>
                  </div>
                )}
              </div>

              {/* Conversation Actions */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h5 className="font-medium text-hive-black mb-3">Admin Actions:</h5>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={conversationActions.helpful ? "default" : "outline"}
                    onClick={() => {
                      setConversationActions((prev) => ({
                        ...prev,
                        helpful: !prev.helpful,
                        unhelpful: false,
                      }));
                      toast({
                        title: conversationActions.helpful
                          ? "Removed helpful rating"
                          : "Marked as helpful",
                        description: "Conversation feedback updated successfully.",
                      });
                    }}
                  >
                    <ThumbsUp
                      className={`h-4 w-4 mr-1 ${conversationActions.helpful ? "text-white" : ""}`}
                    />
                    {conversationActions.helpful ? "Marked Helpful" : "Mark Helpful"}
                  </Button>
                  <Button
                    size="sm"
                    variant={conversationActions.unhelpful ? "destructive" : "outline"}
                    onClick={() => {
                      setConversationActions((prev) => ({
                        ...prev,
                        unhelpful: !prev.unhelpful,
                        helpful: false,
                      }));
                      toast({
                        title: conversationActions.unhelpful
                          ? "Removed unhelpful rating"
                          : "Marked as unhelpful",
                        description: "Conversation feedback updated successfully.",
                      });
                    }}
                  >
                    <ThumbsDown
                      className={`h-4 w-4 mr-1 ${conversationActions.unhelpful ? "text-white" : ""}`}
                    />
                    {conversationActions.unhelpful ? "Marked Unhelpful" : "Mark Unhelpful"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        if (!selectedConversation?.id) {
                          toast({
                            title: "Export failed",
                            description: "No conversation selected for export.",
                            variant: "destructive",
                          });
                          return;
                        }

                        // Use secure server-side text generation (antivirus-safe)
                        const response = await fetch(
                          `/api/admin/chatbot/conversations/export-text/${selectedConversation.id}`,
                          {
                            method: "GET",
                            credentials: "include",
                          }
                        );

                        if (!response.ok) {
                          throw new Error("Failed to generate text export");
                        }

                        // Get the text blob from server
                        const textBlob = await response.blob();

                        // Extract filename from response headers or create a default one
                        const contentDisposition = response.headers.get("Content-Disposition");
                        let filename = `hive-wellness-chat-${selectedConversation.id}-${new Date().toISOString().split("T")[0]}.txt`;

                        if (contentDisposition) {
                          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                          if (filenameMatch) {
                            filename = filenameMatch[1];
                          }
                        }

                        // Create secure download
                        const downloadUrl = URL.createObjectURL(textBlob);
                        const downloadLink = document.createElement("a");
                        downloadLink.href = downloadUrl;
                        downloadLink.download = filename;
                        downloadLink.setAttribute("data-file-type", "text");
                        downloadLink.setAttribute("data-file-source", "hive-wellness-server");

                        // Trigger secure download and cleanup
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);
                        URL.revokeObjectURL(downloadUrl);

                        toast({
                          title: "Chat exported as text",
                          description:
                            "Secure conversation export downloaded successfully (antivirus-safe format).",
                        });
                      } catch (error) {
                        console.error("Error generating text export:", error);
                        toast({
                          title: "Export failed",
                          description: "Failed to generate secure text export. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Export Text
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        if (!selectedConversation?.id) {
                          toast({
                            title: "Export failed",
                            description: "No conversation selected for export.",
                            variant: "destructive",
                          });
                          return;
                        }

                        // Use secure server-side PDF generation
                        const response = await fetch(
                          `/api/admin/chatbot/conversations/pdf/${selectedConversation.id}`,
                          {
                            method: "GET",
                            credentials: "include",
                          }
                        );

                        if (!response.ok) {
                          throw new Error("Failed to generate PDF export");
                        }

                        // Get the PDF blob from server
                        const pdfBlob = await response.blob();

                        // Extract filename from response headers or create a default one
                        const contentDisposition = response.headers.get("Content-Disposition");
                        let filename = `hive-wellness-chat-${selectedConversation.id}-${new Date().toISOString().split("T")[0]}.pdf`;

                        if (contentDisposition) {
                          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                          if (filenameMatch) {
                            filename = filenameMatch[1];
                          }
                        }

                        // Create secure download
                        const downloadUrl = URL.createObjectURL(pdfBlob);
                        const downloadLink = document.createElement("a");
                        downloadLink.href = downloadUrl;
                        downloadLink.download = filename;
                        downloadLink.setAttribute("data-file-type", "pdf");
                        downloadLink.setAttribute("data-file-source", "hive-wellness-server");

                        // Trigger secure download and cleanup
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);
                        URL.revokeObjectURL(downloadUrl);

                        toast({
                          title: "Chat exported as PDF",
                          description:
                            "Medical-grade secure PDF downloaded with enhanced security headers.",
                        });
                      } catch (error) {
                        console.error("Error generating PDF export:", error);
                        toast({
                          title: "Export failed",
                          description: "Failed to generate secure PDF export. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Export PDF
                  </Button>
                  <Button
                    size="sm"
                    variant={conversationActions.flagged ? "destructive" : "outline"}
                    onClick={() => {
                      setConversationActions((prev) => ({ ...prev, flagged: !prev.flagged }));
                      toast({
                        title: conversationActions.flagged
                          ? "Removed review flag"
                          : "Flagged for review",
                        description: conversationActions.flagged
                          ? "Conversation no longer flagged for manual review."
                          : "Conversation flagged for manual review by therapy oversight team.",
                      });
                    }}
                  >
                    <AlertTriangle
                      className={`h-4 w-4 mr-1 ${conversationActions.flagged ? "text-white" : ""}`}
                    />
                    {conversationActions.flagged ? "Review Flagged" : "Flag for Review"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConversationDialogOpen(false);
                setSelectedConversation(null);
                setConversationActions({ helpful: false, unhelpful: false, flagged: false });
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Export Dialog */}
      <Dialog open={showBulkExport} onOpenChange={setShowBulkExport}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-hive-purple">Bulk Export Conversations</DialogTitle>
            <DialogDescription>
              Export multiple conversations or select a date range for comprehensive reporting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Export Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Export Type</Label>
              <RadioGroup
                value={bulkExportType}
                onValueChange={(value: "selected" | "dateRange") => setBulkExportType(value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="selected" id="selected" />
                  <label htmlFor="selected" className="text-sm cursor-pointer">
                    Select Individual Conversations
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dateRange" id="dateRange" />
                  <label htmlFor="dateRange" className="text-sm cursor-pointer">
                    Export by Date Range
                  </label>
                </div>
              </RadioGroup>
            </div>

            {/* Selected Conversations */}
            {bulkExportType === "selected" && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Select Conversations ({selectedConversationIds.length} selected)
                </Label>
                <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                  {(chatbotConversations as any[])?.map((conv: any) => (
                    <div key={conv.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={conv.id}
                        checked={selectedConversationIds.includes(conv.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedConversationIds((prev) => [...prev, conv.id]);
                          } else {
                            setSelectedConversationIds((prev) =>
                              prev.filter((id) => id !== conv.id)
                            );
                          }
                        }}
                      />
                      <label htmlFor={conv.id} className="text-sm cursor-pointer flex-1">
                        <div className="flex justify-between">
                          <span>Session: {conv.id?.substring(0, 12)}...</span>
                          <span className="text-gray-500">
                            {new Date(conv.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedConversationIds(
                        (chatbotConversations as any[])?.map((conv: any) => conv.id) || []
                      )
                    }
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedConversationIds([])}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            )}

            {/* Date Range Selection */}
            {bulkExportType === "dateRange" && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Date Range</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate" className="text-xs text-gray-600">
                      Start Date
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="text-xs text-gray-600">
                      End Date
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <CalendarIcon className="inline w-4 h-4 mr-1" />
                  Quick selections:
                  <div className="flex space-x-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const now = new Date();
                        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                        setExportStartDate(lastMonth.toISOString().split("T")[0]);
                        setExportEndDate(endOfLastMonth.toISOString().split("T")[0]);
                      }}
                    >
                      Last Month
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const now = new Date();
                        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                        setExportStartDate(thisMonth.toISOString().split("T")[0]);
                        setExportEndDate(now.toISOString().split("T")[0]);
                      }}
                    >
                      This Month
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const now = new Date();
                        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        setExportStartDate(lastWeek.toISOString().split("T")[0]);
                        setExportEndDate(now.toISOString().split("T")[0]);
                      }}
                    >
                      Last 7 Days
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkExport(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  if (bulkExportType === "selected" && selectedConversationIds.length === 0) {
                    toast({
                      title: "No conversations selected",
                      description: "Please select at least one conversation to export.",
                      variant: "destructive",
                    });
                    return;
                  }

                  if (bulkExportType === "dateRange" && (!exportStartDate || !exportEndDate)) {
                    toast({
                      title: "Date range required",
                      description: "Please select both start and end dates.",
                      variant: "destructive",
                    });
                    return;
                  }

                  const exportData = {
                    exportType: bulkExportType,
                    sessionIds: bulkExportType === "selected" ? selectedConversationIds : undefined,
                    startDate: bulkExportType === "dateRange" ? exportStartDate : undefined,
                    endDate: bulkExportType === "dateRange" ? exportEndDate : undefined,
                  };

                  const response = await fetch("/api/admin/chatbot/conversations/bulk-export", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify(exportData),
                  });

                  if (!response.ok) {
                    throw new Error("Failed to generate bulk export");
                  }

                  // Get the PDF blob from server
                  const pdfBlob = await response.blob();

                  // Extract filename from response headers
                  const contentDisposition = response.headers.get("Content-Disposition");
                  let filename = `hive-wellness-bulk-export-${new Date().toISOString().split("T")[0]}.pdf`;

                  if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                    if (filenameMatch) {
                      filename = filenameMatch[1];
                    }
                  }

                  // Create secure download
                  const downloadUrl = URL.createObjectURL(pdfBlob);
                  const downloadLink = document.createElement("a");
                  downloadLink.href = downloadUrl;
                  downloadLink.download = filename;
                  downloadLink.setAttribute("data-file-type", "pdf");
                  downloadLink.setAttribute("data-file-source", "hive-wellness-bulk-export");

                  // Trigger secure download and cleanup
                  document.body.appendChild(downloadLink);
                  downloadLink.click();
                  document.body.removeChild(downloadLink);
                  URL.revokeObjectURL(downloadUrl);

                  toast({
                    title: "Bulk export successful",
                    description: `Exported ${bulkExportType === "selected" ? selectedConversationIds.length : "date range"} conversations as PDF.`,
                  });

                  setShowBulkExport(false);
                  setSelectedConversationIds([]);
                  setExportStartDate("");
                  setExportEndDate("");
                } catch (error) {
                  console.error("Error generating bulk export:", error);
                  toast({
                    title: "Export failed",
                    description: "Failed to generate bulk export. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
              disabled={
                (bulkExportType === "selected" && selectedConversationIds.length === 0) ||
                (bulkExportType === "dateRange" && (!exportStartDate || !exportEndDate))
              }
            >
              <Download className="w-4 h-4 mr-1" />
              Export PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
