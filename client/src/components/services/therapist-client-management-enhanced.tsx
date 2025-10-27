import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Search,
  Plus,
  Edit,
  Filter,
  ChevronRight,
  User,
  MessageCircle,
  Video,
  Target,
  CheckCircle,
  Activity,
  FileText,
  Brain,
  Award,
  Star,
  Mail,
  Phone,
} from "lucide-react";
import { User as UserType } from "@shared/schema";

interface EnhancedClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  age: number;
  assignedDate: string;
  sessionCount: number;
  lastSession?: string;
  nextSession?: string;
  status: "active" | "pending" | "paused" | "completed";
  hasPaymentMethod: boolean;
  totalSessions: number;
  completedSessions: number;
  currentGoals: string[];
  lastNotes?: string;
  riskLevel: "low" | "medium" | "high";
  progressStatus: "excellent" | "good" | "fair" | "needs_attention";
  progressMetrics: {
    anxietyLevel: number;
    depressionLevel: number;
    overallWellbeing: number;
    goalCompletion: number;
  };
  recentActivities: Array<{
    id: string;
    type: "session" | "note" | "homework" | "assessment";
    description: string;
    date: string;
  }>;
  treatmentHistory: Array<{
    id: string;
    sessionNumber: number;
    date: string;
    type: string;
    notes: string;
    progressRating: number;
  }>;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  medicalHistory: string[];
  currentMedications: string[];
  therapeuticApproach: string;
}

interface DetailedClientNote {
  id: string;
  clientId: string;
  date: string;
  sessionType: "individual" | "consultation";
  duration?: number;
  content: string;
  mood: number; // 1-10 scale
  goals: string[];
  homework?: string;
  nextSteps?: string;
  tags: string[];
  confidential: boolean;
  progressRating: number;
  interventionsUsed: string[];
}

interface TherapistClientManagementProps {
  user: UserType;
  onNavigateToService?: (serviceId: string) => void;
}

export default function TherapistClientManagement({
  user,
  onNavigateToService,
}: TherapistClientManagementProps) {
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<EnhancedClient | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<"individual" | "consultation">("individual");
  const [showAddNote, setShowAddNote] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestDetails, setRequestDetails] = useState({
    specialization: "",
    specialization_other: "",
    urgency: "normal",
    notes: "",
  });

  // Demo data for enhanced client management
  const demoClients: EnhancedClient[] = [
    {
      id: "client-001",
      name: "Emma Johnson",
      email: "emma.johnson@email.com",
      phone: "+44 7123 456789",
      age: 28,
      assignedDate: "2024-11-15",
      sessionCount: 8,
      lastSession: "2024-12-20",
      nextSession: "2024-12-27",
      status: "active",
      hasPaymentMethod: true,
      totalSessions: 12,
      completedSessions: 8,
      currentGoals: [
        "Reduce anxiety in social situations",
        "Improve sleep quality",
        "Develop coping strategies",
      ],
      lastNotes: "Good progress with CBT techniques. Homework completed successfully.",
      riskLevel: "low",
      progressStatus: "good",
      progressMetrics: {
        anxietyLevel: 4, // 1-10 scale (lower is better)
        depressionLevel: 3,
        overallWellbeing: 7,
        goalCompletion: 65,
      },
      recentActivities: [
        {
          id: "act-1",
          type: "session",
          description: "Individual therapy session - CBT for anxiety",
          date: "2024-12-20",
        },
        {
          id: "act-2",
          type: "homework",
          description: "Completed mindfulness exercise log",
          date: "2024-12-18",
        },
        {
          id: "act-3",
          type: "assessment",
          description: "GAD-7 assessment completed",
          date: "2024-12-15",
        },
      ],
      treatmentHistory: [
        {
          id: "hist-1",
          sessionNumber: 8,
          date: "2024-12-20",
          type: "Individual Therapy",
          notes:
            "Excellent progress with anxiety management. Client reported 70% reduction in panic attacks.",
          progressRating: 8,
        },
        {
          id: "hist-2",
          sessionNumber: 7,
          date: "2024-12-13",
          type: "Individual Therapy",
          notes: "Continued work on cognitive restructuring. Client showing good insight.",
          progressRating: 7,
        },
      ],
      emergencyContact: {
        name: "David Johnson",
        relationship: "Spouse",
        phone: "+44 7987 654321",
      },
      medicalHistory: ["Generalized Anxiety Disorder", "Mild Depression"],
      currentMedications: ["Sertraline 50mg"],
      therapeuticApproach: "Cognitive Behavioural Therapy (CBT)",
    },
    {
      id: "client-002",
      name: "Michael Roberts",
      email: "michael.roberts@email.com",
      phone: "+44 7234 567890",
      age: 34,
      assignedDate: "2024-10-08",
      sessionCount: 12,
      lastSession: "2024-12-18",
      nextSession: "2024-12-25",
      status: "active",
      hasPaymentMethod: true,
      totalSessions: 16,
      completedSessions: 12,
      currentGoals: [
        "Improve relationship communication",
        "Manage work stress",
        "Build emotional regulation skills",
      ],
      lastNotes:
        "Significant improvement in communication with partner. Ready for couples sessions.",
      riskLevel: "medium",
      progressStatus: "excellent",
      progressMetrics: {
        anxietyLevel: 3,
        depressionLevel: 2,
        overallWellbeing: 8,
        goalCompletion: 85,
      },
      recentActivities: [
        {
          id: "act-4",
          type: "session",
          description: "Couples therapy session with partner",
          date: "2024-12-18",
        },
        {
          id: "act-5",
          type: "note",
          description: "Progress review and goal adjustment",
          date: "2024-12-16",
        },
      ],
      treatmentHistory: [
        {
          id: "hist-3",
          sessionNumber: 12,
          date: "2024-12-18",
          type: "Couples Therapy",
          notes: "Breakthrough session. Both partners demonstrated new communication skills.",
          progressRating: 9,
        },
      ],
      emergencyContact: {
        name: "Sarah Roberts",
        relationship: "Spouse",
        phone: "+44 7876 543210",
      },
      medicalHistory: ["Work-related stress", "Relationship difficulties"],
      currentMedications: [],
      therapeuticApproach: "Emotionally Focused Therapy (EFT)",
    },
    {
      id: "client-003",
      name: "Sarah Martinez",
      email: "sarah.martinez@email.com",
      phone: "+44 7345 678901",
      age: 22,
      assignedDate: "2024-12-01",
      sessionCount: 3,
      lastSession: "2024-12-19",
      nextSession: "2024-12-26",
      status: "active",
      hasPaymentMethod: true,
      totalSessions: 8,
      completedSessions: 3,
      currentGoals: ["Overcome depression", "Establish daily routine", "Improve self-esteem"],
      lastNotes: "Initial assessment completed. Mild to moderate depression identified.",
      riskLevel: "medium",
      progressStatus: "fair",
      progressMetrics: {
        anxietyLevel: 6,
        depressionLevel: 7,
        overallWellbeing: 4,
        goalCompletion: 25,
      },
      recentActivities: [
        {
          id: "act-6",
          type: "assessment",
          description: "Initial depression screening (PHQ-9)",
          date: "2024-12-19",
        },
        {
          id: "act-7",
          type: "session",
          description: "First therapy session - rapport building",
          date: "2024-12-05",
        },
      ],
      treatmentHistory: [
        {
          id: "hist-4",
          sessionNumber: 3,
          date: "2024-12-19",
          type: "Individual Therapy",
          notes: "Building therapeutic rapport. Client is motivated to change.",
          progressRating: 6,
        },
      ],
      emergencyContact: {
        name: "Maria Martinez",
        relationship: "Mother",
        phone: "+44 7765 432109",
      },
      medicalHistory: ["Major Depressive Disorder", "Low self-esteem"],
      currentMedications: ["Fluoxetine 20mg"],
      therapeuticApproach: "Cognitive Behavioural Therapy (CBT) + Mindfulness",
    },
  ];

  // Fetch assigned clients with demo data fallback
  const { data: assignedClients = demoClients, isLoading } = useQuery<EnhancedClient[]>({
    queryKey: ["/api/therapist/assigned-clients", user.id],
    retry: false,
  });

  // Fetch client notes when a client is selected
  const { data: clientNotes = [] } = useQuery<DetailedClientNote[]>({
    queryKey: ["/api/therapist/client-notes", selectedClient?.id],
    enabled: !!selectedClient,
    retry: false,
  });

  // Add client note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (noteData: { clientId: string; content: string; sessionType: string }) => {
      const response = await apiRequest("POST", "/api/therapist/client-notes", noteData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Note Added",
        description: "Client note has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/client-notes"] });
      setNewNote("");
      setShowAddNote(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save client note.",
        variant: "destructive",
      });
    },
  });

  // Filter clients based on search and status
  const filteredClients = assignedClients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || client.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleAddNote = () => {
    if (!selectedClient || !newNote.trim()) return;

    addNoteMutation.mutate({
      clientId: selectedClient.id,
      content: newNote,
      sessionType: noteType,
    });
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "bg-green-100 text-green-800";
      case "good":
        return "bg-blue-100 text-blue-800";
      case "fair":
        return "bg-yellow-100 text-yellow-800";
      case "needs_attention":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-hive-purple rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Client Management</h1>
          <p className="text-gray-600 mt-1">
            Manage your assigned clients and track their progress
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowRequestDialog(true)}
          className="bg-hive-purple hover:bg-hive-purple/90 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Request New Client
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Assigned Clients ({filteredClients.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedClient?.id === client.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{client.name}</h4>
                        <p className="text-sm text-gray-600">{client.email}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline" className={getRiskLevelColor(client.riskLevel)}>
                            {client.riskLevel} risk
                          </Badge>
                          <Badge
                            variant="outline"
                            className={getProgressColor(client.progressStatus)}
                          >
                            {client.progressStatus}
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      <p>
                        Sessions: {client.completedSessions}/{client.totalSessions}
                      </p>
                      <p>
                        Last:{" "}
                        {client.lastSession
                          ? new Date(client.lastSession).toLocaleDateString("en-GB")
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Details */}
        <div className="lg:col-span-2">
          {selectedClient ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      {selectedClient.name}
                    </CardTitle>
                    <p className="text-gray-600 mt-1">
                      Age {selectedClient.age} • Active since{" "}
                      {new Date(selectedClient.assignedDate).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log(
                          "Enhanced CM: Message button clicked - onNavigateToService:",
                          !!onNavigateToService
                        );
                        if (onNavigateToService) {
                          console.log("Enhanced CM: Calling onNavigateToService with messaging");
                          onNavigateToService("messaging");
                        } else {
                          console.log("Enhanced CM: No onNavigateToService prop available");
                        }
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log(
                          "Enhanced CM: Start Session button clicked - onNavigateToService:",
                          !!onNavigateToService
                        );
                        if (onNavigateToService) {
                          console.log(
                            "Enhanced CM: Calling onNavigateToService with video-sessions"
                          );
                          onNavigateToService("video-sessions");
                        } else {
                          console.log("Enhanced CM: No onNavigateToService prop available");
                        }
                      }}
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Start Session
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="progress">Progress</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">
                          {selectedClient.completedSessions}
                        </p>
                        <p className="text-sm text-gray-600">Sessions Completed</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          {selectedClient.progressMetrics.goalCompletion}%
                        </p>
                        <p className="text-sm text-gray-600">Goal Progress</p>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-600">
                          {selectedClient.progressMetrics.overallWellbeing}/10
                        </p>
                        <p className="text-sm text-gray-600">Wellbeing Score</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">
                          {selectedClient.recentActivities.length}
                        </p>
                        <p className="text-sm text-gray-600">Recent Activities</p>
                      </div>
                    </div>

                    {/* Current Goals */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <Target className="h-5 w-5 mr-2" />
                        Current Goals
                      </h3>
                      <div className="space-y-2">
                        {selectedClient.currentGoals.map((goal, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                          >
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span>{goal}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <Activity className="h-5 w-5 mr-2" />
                        Recent Activity
                      </h3>
                      <div className="space-y-3">
                        {selectedClient.recentActivities.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-center space-x-3 p-3 border rounded-lg"
                          >
                            <div
                              className={`p-2 rounded-full ${
                                activity.type === "session"
                                  ? "bg-blue-100"
                                  : activity.type === "homework"
                                    ? "bg-green-100"
                                    : activity.type === "assessment"
                                      ? "bg-purple-100"
                                      : "bg-gray-100"
                              }`}
                            >
                              {activity.type === "session" && (
                                <Video className="h-4 w-4 text-blue-600" />
                              )}
                              {activity.type === "homework" && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                              {activity.type === "assessment" && (
                                <FileText className="h-4 w-4 text-purple-600" />
                              )}
                              {activity.type === "note" && (
                                <Edit className="h-4 w-4 text-gray-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{activity.description}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(activity.date).toLocaleDateString("en-GB")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="progress" className="space-y-6">
                    {/* Progress Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                          <Brain className="h-5 w-5 mr-2" />
                          Mental Health Metrics
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium">Anxiety Level</span>
                              <span className="text-sm text-gray-600">
                                {selectedClient.progressMetrics.anxietyLevel}/10
                              </span>
                            </div>
                            <Progress
                              value={(10 - selectedClient.progressMetrics.anxietyLevel) * 10}
                              className="h-2"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium">Depression Level</span>
                              <span className="text-sm text-gray-600">
                                {selectedClient.progressMetrics.depressionLevel}/10
                              </span>
                            </div>
                            <Progress
                              value={(10 - selectedClient.progressMetrics.depressionLevel) * 10}
                              className="h-2"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium">Overall Wellbeing</span>
                              <span className="text-sm text-gray-600">
                                {selectedClient.progressMetrics.overallWellbeing}/10
                              </span>
                            </div>
                            <Progress
                              value={selectedClient.progressMetrics.overallWellbeing * 10}
                              className="h-2"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center">
                          <Award className="h-5 w-5 mr-2" />
                          Therapy Progress
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium">Goal Completion</span>
                              <span className="text-sm text-gray-600">
                                {selectedClient.progressMetrics.goalCompletion}%
                              </span>
                            </div>
                            <Progress
                              value={selectedClient.progressMetrics.goalCompletion}
                              className="h-2"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium">Session Completion</span>
                              <span className="text-sm text-gray-600">
                                {selectedClient.completedSessions}/{selectedClient.totalSessions}
                              </span>
                            </div>
                            <Progress
                              value={
                                (selectedClient.completedSessions / selectedClient.totalSessions) *
                                100
                              }
                              className="h-2"
                            />
                          </div>
                          <div className="p-4 bg-blue-50 rounded-lg">
                            <p className="font-medium text-blue-900">Therapeutic Approach</p>
                            <p className="text-blue-700">{selectedClient.therapeuticApproach}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Session Notes</h3>
                      <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Note
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Session Note</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="noteType">Session Type</Label>
                              <Select
                                value={noteType}
                                onValueChange={(value: any) => setNoteType(value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="individual">Individual Therapy</SelectItem>
                                  <SelectItem value="consultation">Consultation</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="noteContent">Note Content</Label>
                              <Textarea
                                id="noteContent"
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Enter session notes..."
                                rows={6}
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" onClick={() => setShowAddNote(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleAddNote} disabled={addNoteMutation.isPending}>
                                {addNoteMutation.isPending ? "Saving..." : "Save Note"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="space-y-3">
                      {clientNotes.length > 0 ? (
                        clientNotes.map((note) => (
                          <div key={note.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline">{note.sessionType}</Badge>
                              <span className="text-sm text-gray-600">
                                {new Date(note.date).toLocaleDateString("en-GB")}
                              </span>
                            </div>
                            <p className="text-gray-800">{note.content}</p>
                            {note.mood && (
                              <div className="mt-2">
                                <span className="text-sm text-gray-600">Mood: {note.mood}/10</span>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No session notes yet</p>
                          <p className="text-sm">Add your first note to start tracking progress</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-4">
                    <h3 className="text-lg font-semibold">Therapy History</h3>
                    <div className="space-y-3">
                      {selectedClient.treatmentHistory.map((session) => (
                        <div key={session.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-medium">Session #{session.sessionNumber}</h4>
                              <p className="text-sm text-gray-600">{session.type}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {new Date(session.date).toLocaleDateString("en-GB")}
                              </p>
                              <div className="flex items-center">
                                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                                <span className="text-sm">{session.progressRating}/10</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-gray-800">{session.notes}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="profile" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <Mail className="h-5 w-5 text-gray-400" />
                            <span>{selectedClient.email}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Phone className="h-5 w-5 text-gray-400" />
                            <span>{selectedClient.phone || "Not provided"}</span>
                          </div>
                        </div>

                        {selectedClient.emergencyContact && (
                          <div className="mt-6">
                            <h4 className="font-medium mb-2">Emergency Contact</h4>
                            <div className="space-y-2 text-sm">
                              <p>
                                <strong>Name:</strong> {selectedClient.emergencyContact.name}
                              </p>
                              <p>
                                <strong>Relationship:</strong>{" "}
                                {selectedClient.emergencyContact.relationship}
                              </p>
                              <p>
                                <strong>Phone:</strong> {selectedClient.emergencyContact.phone}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-4">Medical Information</h3>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">Medical History</h4>
                            <div className="space-y-1">
                              {selectedClient.medicalHistory.map((condition, index) => (
                                <Badge key={index} variant="outline" className="mr-1 mb-1">
                                  {condition}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Current Medications</h4>
                            <div className="space-y-1">
                              {selectedClient.currentMedications.length > 0 ? (
                                selectedClient.currentMedications.map((medication, index) => (
                                  <Badge key={index} variant="outline" className="mr-1 mb-1">
                                    {medication}
                                  </Badge>
                                ))
                              ) : (
                                <p className="text-sm text-gray-600">No current medications</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Client</h3>
                  <p className="text-gray-600">
                    Choose a client from the list to view their details and progress
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Request New Client Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Request New Client
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="specialization">Specialisation Preference</Label>
              <Select
                value={requestDetails.specialization}
                onValueChange={(value) =>
                  setRequestDetails((prev) => ({
                    ...prev,
                    specialization: value,
                    // Clear the other field when a different option is selected
                    specialization_other: value !== "other" ? "" : prev.specialization_other,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select specialisation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anxiety">Anxiety Disorders</SelectItem>
                  <SelectItem value="depression">Depression</SelectItem>
                  <SelectItem value="trauma">Trauma & PTSD</SelectItem>
                  <SelectItem value="relationships">Relationship Issues</SelectItem>
                  <SelectItem value="stress">Stress Management</SelectItem>
                  <SelectItem value="general">General Therapy</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional field for "Other" specialisation */}
            {requestDetails.specialization === "other" && (
              <div>
                <Label htmlFor="specialization_other">Please specify your specialisation</Label>
                <Input
                  id="specialization_other"
                  placeholder="e.g., Eating Disorders, Addiction, etc."
                  value={requestDetails.specialization_other}
                  onChange={(e) =>
                    setRequestDetails((prev) => ({ ...prev, specialization_other: e.target.value }))
                  }
                />
              </div>
            )}

            <div>
              <Label htmlFor="urgency">Urgency Level</Label>
              <Select
                value={requestDetails.urgency}
                onValueChange={(value) =>
                  setRequestDetails((prev) => ({ ...prev, urgency: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent (within 24 hours)</SelectItem>
                  <SelectItem value="high">High (within 1 week)</SelectItem>
                  <SelectItem value="normal">Normal (within 2 weeks)</SelectItem>
                  <SelectItem value="low">Low (flexible timing)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any specific requirements or notes for client matching..."
                value={requestDetails.notes}
                onChange={(e) => setRequestDetails((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowRequestDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const response = await apiRequest(
                      "POST",
                      "/api/therapist/request-client",
                      requestDetails
                    );
                    const result = await response.json();

                    if (result.success) {
                      toast({
                        title: "Request Submitted",
                        description: `Your client request has been sent to the admin team. Emails sent to ${result.emailsSent} recipients.`,
                      });
                    } else {
                      toast({
                        title: "Request Failed",
                        description:
                          result.message || "Failed to submit request. Please try again.",
                        variant: "destructive",
                      });
                    }
                  } catch (error) {
                    console.error("Error submitting request:", error);
                    toast({
                      title: "Request Failed",
                      description: "Failed to submit request. Please try again.",
                      variant: "destructive",
                    });
                  }
                  setShowRequestDialog(false);
                  setRequestDetails({
                    specialization: "",
                    urgency: "normal",
                    notes: "",
                    specialization_other: "",
                  });
                }}
                className="flex-1 bg-hive-purple hover:bg-hive-purple/90"
              >
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
