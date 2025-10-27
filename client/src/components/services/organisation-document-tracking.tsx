import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FileText,
  Building,
  Shield,
  Settings,
  Plus,
  Download,
  Edit,
  Eye,
  Calendar,
  Star,
  Clock,
  TrendingUp,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const organizationDocumentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.string().min(1, "Document type is required"),
  description: z.string().optional(),
  departmentId: z.string().min(1, "Department is required"),
  confidentialityLevel: z.enum(["public", "internal", "confidential", "restricted"]),
  complianceCategory: z.enum(["hipaa", "gdpr", "ferpa", "general", "clinical"]),
  retentionPeriod: z.number().min(1, "Retention period must be at least 1 day"),
  tags: z.array(z.string()).optional(),
});

const sessionTrackingSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  organizationId: z.string().min(1, "Organisation ID is required"),
  departmentId: z.string().min(1, "Department is required"),
  sessionType: z.enum(["individual", "assessment", "consultation"]),
  duration: z.number().min(1, "Duration is required"),
  attendees: z.array(z.string()).min(1, "At least one attendee is required"),
  outcomes: z.string().min(1, "Session outcomes are required"),
  followUpRequired: z.boolean().default(false),
  nextSessionDate: z.string().optional(),
});

interface OrganizationDocument {
  id: string;
  organizationId: string;
  title: string;
  type: string;
  description?: string;
  departmentId: string;
  departmentName: string;
  confidentialityLevel: "public" | "internal" | "confidential" | "restricted";
  complianceCategory: "hipaa" | "gdpr" | "ferpa" | "general" | "clinical";
  fileUrl?: string;
  fileSize?: number;
  version: number;
  retentionPeriod: number;
  retentionUntil: string;
  tags: string[];
  isArchived: boolean;
  lastAccessedAt?: string;
  lastAccessedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface SessionTracking {
  id: string;
  sessionId: string;
  organizationId: string;
  departmentId: string;
  departmentName: string;
  sessionType: "individual" | "assessment" | "consultation";
  duration: number;
  attendees: string[];
  outcomes: string;
  followUpRequired: boolean;
  nextSessionDate?: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  sessionRating?: number;
  resources: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function OrganisationDocumentTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("documents");
  const [showNewDocument, setShowNewDocument] = useState(false);
  const [showNewSession, setShowNewSession] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<OrganisationDocument | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionTracking | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterCompliance, setFilterCompliance] = useState("all");

  // Admin/Institution access control
  const hasAccess = user?.role === "admin" || user?.role === "institution";

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-amber-600">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Organisation document tracking is available to administrators and institutional users
              only.
            </p>
            <p className="text-sm text-gray-500">
              This system provides comprehensive document management and session tracking for
              institutional compliance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Forms
  const documentForm = useForm<z.infer<typeof organizationDocumentSchema>>({
    resolver: zodResolver(organizationDocumentSchema),
    defaultValues: {
      title: "",
      type: "",
      description: "",
      departmentId: "",
      confidentialityLevel: "internal",
      complianceCategory: "general",
      retentionPeriod: 365,
      tags: [],
    },
  });

  const sessionForm = useForm<z.infer<typeof sessionTrackingSchema>>({
    resolver: zodResolver(sessionTrackingSchema),
    defaultValues: {
      sessionId: "",
      organizationId: user?.organization?.id || "",
      departmentId: "",
      sessionType: "individual",
      duration: 60,
      attendees: [],
      outcomes: "",
      followUpRequired: false,
      nextSessionDate: "",
    },
  });

  // Queries
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: [`/api/organization/${user?.organization?.id}/documents`],
    retry: false,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: [`/api/organization/${user?.organization?.id}/sessions`],
    retry: false,
  });

  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: [`/api/organization/${user?.organization?.id}/departments`],
    retry: false,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: [`/api/organization/${user?.organization?.id}/analytics`],
    retry: false,
  });

  // Mutations
  const createDocumentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof organizationDocumentSchema>) => {
      return apiRequest("POST", `/api/organization/${user?.organization?.id}/documents`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/organization/${user?.organization?.id}/documents`],
      });
      setShowNewDocument(false);
      documentForm.reset();
      toast({
        title: "Document Created",
        description: "Organisation document has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create document.",
        variant: "destructive",
      });
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof sessionTrackingSchema>) => {
      return apiRequest("POST", `/api/organization/${user?.organization?.id}/sessions`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/organization/${user?.organization?.id}/sessions`],
      });
      setShowNewSession(false);
      sessionForm.reset();
      toast({
        title: "Session Tracked",
        description: "Session has been tracked successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to track session.",
        variant: "destructive",
      });
    },
  });

  // Demo data for organizations
  const demoDocuments: OrganizationDocument[] = [
    {
      id: "1",
      organizationId: user?.organization?.id || "",
      title: "Mental Health Services Policy",
      type: "policy",
      description: "Comprehensive policy for mental health service delivery",
      departmentId: "dept-1",
      departmentName: "Mental Health",
      confidentialityLevel: "internal",
      complianceCategory: "hipaa",
      fileUrl: "/documents/policy-mental-health.pdf",
      fileSize: 2048576,
      version: 2,
      retentionPeriod: 2555,
      retentionUntil: "2032-07-01",
      tags: ["policy", "mental-health", "hipaa"],
      isArchived: false,
      lastAccessedAt: "2025-07-08T14:30:00Z",
      lastAccessedBy: "Dr. Sarah Johnson",
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2025-07-01T09:00:00Z",
    },
    {
      id: "2",
      organizationId: user?.organization?.id || "",
      title: "Student Support Framework",
      type: "framework",
      description: "Framework for supporting students with mental health challenges",
      departmentId: "dept-2",
      departmentName: "Student Services",
      confidentialityLevel: "confidential",
      complianceCategory: "ferpa",
      fileUrl: "/documents/student-support-framework.pdf",
      fileSize: 1536000,
      version: 1,
      retentionPeriod: 1825,
      retentionUntil: "2030-07-01",
      tags: ["framework", "student-support", "ferpa"],
      isArchived: false,
      lastAccessedAt: "2025-07-07T11:15:00Z",
      lastAccessedBy: "Prof. Michael Chen",
      createdAt: "2024-06-01T14:00:00Z",
      updatedAt: "2025-06-15T16:00:00Z",
    },
  ];

  const demoSessions: SessionTracking[] = [
    {
      id: "1",
      sessionId: "session-001",
      organizationId: user?.organization?.id || "",
      departmentId: "dept-1",
      departmentName: "Mental Health",
      sessionType: "individual",
      duration: 60,
      attendees: ["student-001", "therapist-001"],
      outcomes: "Positive progress in anxiety management techniques",
      followUpRequired: true,
      nextSessionDate: "2025-07-16T14:00:00Z",
      status: "completed",
      sessionRating: 8,
      resources: [
        { id: "1", name: "Anxiety Workbook", type: "pdf", url: "/resources/anxiety-workbook.pdf" },
        {
          id: "2",
          name: "Breathing Exercises",
          type: "video",
          url: "/resources/breathing-exercises.mp4",
        },
      ],
      createdAt: "2025-07-09T14:00:00Z",
      updatedAt: "2025-07-09T15:00:00Z",
    },
    {
      id: "2",
      sessionId: "session-002",
      organizationId: user?.organization?.id || "",
      departmentId: "dept-2",
      departmentName: "Student Services",
      sessionType: "consultation",
      duration: 60,
      attendees: ["student-002", "counselor-001"],
      outcomes: "Successful initial consultation for therapy assessment",
      followUpRequired: true,
      status: "completed",
      sessionRating: 8,
      resources: [
        {
          id: "3",
          name: "Assessment Guidelines",
          type: "pdf",
          url: "/resources/assessment-guidelines.pdf",
        },
      ],
      createdAt: "2025-07-08T10:00:00Z",
      updatedAt: "2025-07-08T11:30:00Z",
    },
  ];

  const displayDocuments = documents.length > 0 ? documents : demoDocuments;
  const displaySessions = sessions.length > 0 ? sessions : demoSessions;

  // Filter documents and sessions
  const filteredDocuments = displayDocuments.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDepartment = filterDepartment === "all" || doc.departmentId === filterDepartment;
    const matchesCompliance =
      filterCompliance === "all" || doc.complianceCategory === filterCompliance;
    return matchesSearch && matchesDepartment && matchesCompliance;
  });

  const filteredSessions = displaySessions.filter((session) => {
    const matchesSearch =
      session.sessionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.outcomes.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment =
      filterDepartment === "all" || session.departmentId === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Organisation Document & Session Tracking
          </h1>
          <p className="text-gray-600">
            Comprehensive document management and session tracking for institutional compliance
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowNewDocument(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Document
          </Button>
          <Button onClick={() => setShowNewSession(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Track Session
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search documents and sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  <SelectItem value="dept-1">Mental Health</SelectItem>
                  <SelectItem value="dept-2">Student Services</SelectItem>
                  <SelectItem value="dept-3">Counselling</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={filterCompliance} onValueChange={setFilterCompliance}>
                <SelectTrigger>
                  <SelectValue placeholder="All compliance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All compliance</SelectItem>
                  <SelectItem value="hipaa">HIPAA</SelectItem>
                  <SelectItem value="ferpa">FERPA</SelectItem>
                  <SelectItem value="gdpr">GDPR</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <div className="grid gap-4">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 text-purple-600" />
                        <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                        <Badge variant="outline">{doc.type}</Badge>
                        <Badge
                          variant={
                            doc.confidentialityLevel === "public"
                              ? "default"
                              : doc.confidentialityLevel === "internal"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {doc.confidentialityLevel}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Department: {doc.departmentName}</span>
                        <span>Version: {doc.version}</span>
                        <span>Compliance: {doc.complianceCategory.toUpperCase()}</span>
                        <span>Retention: {new Date(doc.retentionUntil).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {doc.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <div className="grid gap-4">
            {filteredSessions.map((session) => (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="w-5 h-5 text-purple-600" />
                        <h3 className="font-semibold text-gray-900">Session {session.sessionId}</h3>
                        <Badge variant="outline">{session.sessionType}</Badge>
                        <Badge
                          variant={
                            session.status === "completed"
                              ? "default"
                              : session.status === "in_progress"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {session.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{session.outcomes}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Department: {session.departmentName}</span>
                        <span>Duration: {session.duration} min</span>
                        <span>Attendees: {session.attendees.length}</span>
                        {session.sessionRating && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            {session.sessionRating}/10
                          </span>
                        )}
                      </div>
                      {session.followUpRequired && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-orange-600">
                            <Clock className="w-3 h-3 mr-1" />
                            Follow-up required
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{displayDocuments.length}</div>
                <p className="text-xs text-green-600 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  12% increase
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Active Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{displaySessions.length}</div>
                <p className="text-xs text-green-600 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  8% increase
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Compliance Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">98.5%</div>
                <p className="text-xs text-green-600 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  2% increase
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Average Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">8.5/10</div>
                <p className="text-xs text-green-600 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  0.3 increase
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Dashboard</CardTitle>
              <CardDescription>
                Monitor compliance across all organisational documents and sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">HIPAA Compliance</h4>
                      <Shield className="w-4 h-4 text-green-600" />
                    </div>
                    <Progress value={98} className="mb-2" />
                    <p className="text-sm text-gray-600">98% compliant</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">FERPA Compliance</h4>
                      <Shield className="w-4 h-4 text-green-600" />
                    </div>
                    <Progress value={95} className="mb-2" />
                    <p className="text-sm text-gray-600">95% compliant</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">GDPR Compliance</h4>
                      <Shield className="w-4 h-4 text-yellow-600" />
                    </div>
                    <Progress value={92} className="mb-2" />
                    <p className="text-sm text-gray-600">92% compliant</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Document Dialog */}
      <Dialog open={showNewDocument} onOpenChange={setShowNewDocument}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Document</DialogTitle>
            <DialogDescription>
              Add a new document to the organisational document management system.
            </DialogDescription>
          </DialogHeader>
          <Form {...documentForm}>
            <form
              onSubmit={documentForm.handleSubmit((data) => createDocumentMutation.mutate(data))}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={documentForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Document title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={documentForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select document type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="policy">Policy</SelectItem>
                            <SelectItem value="procedure">Procedure</SelectItem>
                            <SelectItem value="framework">Framework</SelectItem>
                            <SelectItem value="guideline">Guideline</SelectItem>
                            <SelectItem value="report">Report</SelectItem>
                            <SelectItem value="assessment">Assessment</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={documentForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Document description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={documentForm.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dept-1">Mental Health</SelectItem>
                            <SelectItem value="dept-2">Student Services</SelectItem>
                            <SelectItem value="dept-3">Counselling</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={documentForm.control}
                  name="confidentialityLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confidentiality Level</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="internal">Internal</SelectItem>
                            <SelectItem value="confidential">Confidential</SelectItem>
                            <SelectItem value="restricted">Restricted</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={documentForm.control}
                  name="complianceCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compliance Category</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select compliance" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hipaa">HIPAA</SelectItem>
                            <SelectItem value="ferpa">FERPA</SelectItem>
                            <SelectItem value="gdpr">GDPR</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="clinical">Clinical</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={documentForm.control}
                name="retentionPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Retention Period (days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="365"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowNewDocument(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createDocumentMutation.isPending}>
                  {createDocumentMutation.isPending ? "Creating..." : "Create Document"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* New Session Dialog */}
      <Dialog open={showNewSession} onOpenChange={setShowNewSession}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Track New Session</DialogTitle>
            <DialogDescription>
              Track a new therapy session for organisational reporting.
            </DialogDescription>
          </DialogHeader>
          <Form {...sessionForm}>
            <form
              onSubmit={sessionForm.handleSubmit((data) => createSessionMutation.mutate(data))}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={sessionForm.control}
                  name="sessionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session ID</FormLabel>
                      <FormControl>
                        <Input placeholder="session-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={sessionForm.control}
                  name="sessionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Type</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="individual">Individual</SelectItem>
                            <SelectItem value="assessment">Assessment</SelectItem>
                            <SelectItem value="consultation">Consultation</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={sessionForm.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dept-1">Mental Health</SelectItem>
                            <SelectItem value="dept-2">Student Services</SelectItem>
                            <SelectItem value="dept-3">Counselling</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={sessionForm.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="60"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={sessionForm.control}
                name="outcomes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Outcomes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe the session outcomes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowNewSession(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createSessionMutation.isPending}>
                  {createSessionMutation.isPending ? "Tracking..." : "Track Session"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
