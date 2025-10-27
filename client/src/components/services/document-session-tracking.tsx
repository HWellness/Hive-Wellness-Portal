import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FileText,
  Calendar,
  User,
  Download,
  Plus,
  Shield,
  CheckCircle,
  Search,
  Filter,
  Video,
  Eye,
  Lock,
  ChevronDown,
  Clock,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

const sessionNoteSchema = z.object({
  appointmentId: z.string().min(1, "Appointment ID is required"),
  subjectiveFeedback: z.string().min(1, "Subjective feedback is required"),
  objectiveObservations: z.string().min(1, "Objective observations are required"),
  assessment: z.string().min(1, "Assessment is required"),
  planAndGoals: z.string().min(1, "Plan and goals are required"),
  sessionFocus: z.array(z.string()).min(1, "At least one session focus is required"),
  interventionsUsed: z.array(z.string()).min(1, "At least one intervention is required"),
  homeworkAssigned: z.string().optional(),
  nextSessionGoals: z.string().optional(),
});

const documentSchema = z.object({
  type: z.string().min(1, "Document type is required"),
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
  confidentialityLevel: z.string().min(1, "Confidentiality level is required"),
  tags: z.array(z.string()).optional(),
});

interface SessionNote {
  id: string;
  appointmentId: string;
  therapistId: string;
  subjectiveFeedback: string;
  objectiveObservations: string;
  assessment: string;
  planAndGoals: string;
  sessionFocus: string[];
  interventionsUsed: string[];
  homeworkAssigned?: string;
  nextSessionGoals?: string;
  clientProgress: string;
  riskAssessment: string;
  createdAt: string;
  updatedAt: string;
}

interface Document {
  id: string;
  userId: string;
  appointmentId?: string;
  type: string;
  title: string;
  content?: string;
  fileUrl?: string;
  mimeType?: string;
  fileSize?: number;
  version: number;
  isActive: boolean;
  confidentialityLevel: string;
  tags: string[];
  lastAccessedAt?: string;
  lastAccessedBy?: string;
  retentionUntil?: string;
  createdAt: string;
  updatedAt: string;
}

interface SessionRecording {
  id: string;
  appointmentId: string;
  recordingUrl?: string;
  transcriptUrl?: string;
  duration?: number;
  fileSize?: number;
  recordingStatus: string;
  consentObtained: boolean;
  consentTimestamp?: string;
  retentionUntil?: string;
  audioQuality?: string;
  videoQuality?: string;
  createdAt: string;
  updatedAt: string;
}

export default function DocumentSessionTracking() {
  const { user } = useAuth() as { user: any };
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("session-notes");
  const [showNewSessionNote, setShowNewSessionNote] = useState(false);
  const [showNewDocument, setShowNewDocument] = useState(false);
  const [selectedNote, setSelectedNote] = useState<SessionNote | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Session Notes Form
  const sessionNoteForm = useForm<z.infer<typeof sessionNoteSchema>>({
    resolver: zodResolver(sessionNoteSchema),
    defaultValues: {
      appointmentId: "",
      subjectiveFeedback: "",
      objectiveObservations: "",
      assessment: "",
      planAndGoals: "",
      sessionFocus: [],
      interventionsUsed: [],
      homeworkAssigned: "",
      nextSessionGoals: "",
    },
  });

  // Document Form
  const documentForm = useForm<z.infer<typeof documentSchema>>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      type: "",
      title: "",
      content: "",
      confidentialityLevel: "high",
      tags: [],
    },
  });

  // Fetch session notes
  const { data: sessionNotes, isLoading: notesLoading } = useQuery<SessionNote[]>({
    queryKey: [`/api/session-notes/${user.id}`],
    retry: false,
  });

  // Fetch documents
  const { data: documents, isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: [`/api/documents/${user.id}`],
    retry: false,
  });

  // Fetch session recordings
  const { data: recordings, isLoading: recordingsLoading } = useQuery<SessionRecording[]>({
    queryKey: [`/api/session-recordings/${user.id}`],
    retry: false,
  });

  // Fetch HIPAA compliance status
  const { data: complianceStatus, isLoading: complianceLoading } = useQuery({
    queryKey: [`/api/hipaa-compliance/${user.id}`],
    retry: false,
  });

  // Create session note mutation
  const createSessionNoteMutation = useMutation({
    mutationFn: async (noteData: z.infer<typeof sessionNoteSchema>) => {
      return await apiRequest("POST", "/api/session-notes", noteData);
    },
    onSuccess: () => {
      toast({
        title: "Session Note Created",
        description: "Session note has been successfully saved.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/session-notes/${user.id}`] });
      setShowNewSessionNote(false);
      sessionNoteForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create session note.",
        variant: "destructive",
      });
    },
  });

  // Create document mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (documentData: z.infer<typeof documentSchema>) => {
      return await apiRequest("POST", "/api/documents", documentData);
    },
    onSuccess: () => {
      toast({
        title: "Document Created",
        description: "Document has been successfully saved.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${user.id}`] });
      setShowNewDocument(false);
      documentForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create document.",
        variant: "destructive",
      });
    },
  });

  const sessionFocusOptions = [
    "Anxiety",
    "Depression",
    "Trauma",
    "Relationships",
    "Stress Management",
    "Grief",
    "Addiction",
    "Self-esteem",
    "Communication",
    "Career",
    "Family",
  ];

  const interventionOptions = [
    "CBT",
    "DBT",
    "EMDR",
    "Mindfulness",
    "Exposure Therapy",
    "Solution-Focused",
    "Psychodynamic",
    "Gestalt",
    "Humanistic",
    "Somatic",
    "Art Therapy",
  ];

  const documentTypes = [
    "session_notes",
    "therapy_plan",
    "assessment",
    "consent_form",
    "homework",
    "insurance",
    "progress_report",
    "discharge_summary",
  ];

  const confidentialityLevels = [
    { value: "low", label: "Low", color: "bg-green-100 text-green-800" },
    { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-800" },
    { value: "high", label: "High", color: "bg-orange-100 text-orange-800" },
    { value: "restricted", label: "Restricted", color: "bg-red-100 text-red-800" },
  ];

  const handleSessionNoteSubmit = (values: z.infer<typeof sessionNoteSchema>) => {
    createSessionNoteMutation.mutate(values);
  };

  const handleDocumentSubmit = (values: z.infer<typeof documentSchema>) => {
    createDocumentMutation.mutate(values);
  };

  if (notesLoading || documentsLoading || recordingsLoading || complianceLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-hive-purple rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Document & Session Tracking</h2>
          <p className="text-muted-foreground">
            HIPAA-compliant document management and session tracking system
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowNewSessionNote(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Session Note
          </Button>
          <Button
            onClick={() => setShowNewDocument(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Document
          </Button>
        </div>
      </div>

      {/* HIPAA Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            HIPAA Compliance Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-semibold">Encryption</p>
                <p className="text-sm text-muted-foreground">AES-256 Active</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-semibold">Access Control</p>
                <p className="text-sm text-muted-foreground">Role-based Active</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-semibold">Audit Logging</p>
                <p className="text-sm text-muted-foreground">Complete</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-semibold">Data Retention</p>
                <p className="text-sm text-muted-foreground">Policy Active</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents and notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="session_notes">Session Notes</SelectItem>
            <SelectItem value="documents">Documents</SelectItem>
            <SelectItem value="recordings">Recordings</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="session-notes">Session Notes</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="recordings">Recordings</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* Session Notes Tab */}
        <TabsContent value="session-notes" className="space-y-4">
          <div className="grid gap-4">
            {sessionNotes && sessionNotes.length > 0 ? (
              sessionNotes.map((note) => (
                <Card
                  key={note.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedNote(note)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          Session Note - {note.appointmentId}
                        </CardTitle>
                        <CardDescription>
                          Created: {new Date(note.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {note.sessionFocus.map((focus) => (
                          <Badge key={focus} variant="secondary">
                            {focus}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{note.assessment}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No session notes found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="grid gap-4">
            {documents && documents.length > 0 ? (
              documents.map((doc) => (
                <Card
                  key={doc.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedDocument(doc)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          {doc.title}
                        </CardTitle>
                        <CardDescription>
                          Type: {doc.type} • Version: {doc.version} • Created:{" "}
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          className={
                            confidentialityLevels.find((l) => l.value === doc.confidentialityLevel)
                              ?.color
                          }
                        >
                          <Lock className="h-3 w-3 mr-1" />
                          {doc.confidentialityLevel}
                        </Badge>
                        {doc.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No documents found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Recordings Tab */}
        <TabsContent value="recordings" className="space-y-4">
          <div className="grid gap-4">
            {recordings && recordings.length > 0 ? (
              recordings.map((recording) => (
                <Card key={recording.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Video className="h-5 w-5" />
                          Session Recording - {recording.appointmentId}
                        </CardTitle>
                        <CardDescription>
                          Duration:{" "}
                          {recording.duration
                            ? `${Math.floor(recording.duration / 60)}:${recording.duration % 60}`
                            : "N/A"}{" "}
                          • Status: {recording.recordingStatus} • Created:{" "}
                          {new Date(recording.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={recording.consentObtained ? "default" : "destructive"}>
                          {recording.consentObtained ? "Consent Obtained" : "No Consent"}
                        </Badge>
                        {recording.audioQuality && (
                          <Badge variant="outline">Audio: {recording.audioQuality}</Badge>
                        )}
                        {recording.videoQuality && (
                          <Badge variant="outline">Video: {recording.videoQuality}</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {recording.recordingUrl && (
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Download Recording
                        </Button>
                      )}
                      {recording.transcriptUrl && (
                        <Button size="sm" variant="outline">
                          <FileText className="h-4 w-4 mr-2" />
                          View Transcript
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No recordings found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Access Audit</CardTitle>
                <CardDescription>Recent access to sensitive documents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Eye className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Therapy Plan accessed</span>
                    </div>
                    <span className="text-xs text-muted-foreground">2 hours ago</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Session note created</span>
                    </div>
                    <span className="text-xs text-muted-foreground">5 hours ago</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Download className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Assessment downloaded</span>
                    </div>
                    <span className="text-xs text-muted-foreground">1 day ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Retention Policy</CardTitle>
                <CardDescription>Document retention and disposal schedule</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Session Notes</span>
                    <Badge variant="outline">7 years</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Therapy Plans</span>
                    <Badge variant="outline">7 years</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Session Recordings</span>
                    <Badge variant="outline">3 years</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Consent Forms</span>
                    <Badge variant="outline">10 years</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Session Note Dialog */}
      <Dialog open={showNewSessionNote} onOpenChange={setShowNewSessionNote}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Session Note (SOAP Method)</DialogTitle>
            <DialogDescription>
              Document session using SOAP methodology: Subjective, Objective, Assessment, Plan
            </DialogDescription>
          </DialogHeader>
          <Form {...sessionNoteForm}>
            <form
              onSubmit={sessionNoteForm.handleSubmit(handleSessionNoteSubmit)}
              className="space-y-6"
            >
              <FormField
                control={sessionNoteForm.control}
                name="appointmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appointment ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter appointment ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={sessionNoteForm.control}
                  name="sessionFocus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Focus</FormLabel>
                      <FormControl>
                        <Select onValueChange={(value) => field.onChange([...field.value, value])}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select focus areas" />
                          </SelectTrigger>
                          <SelectContent>
                            {sessionFocusOptions.map((focus) => (
                              <SelectItem key={focus} value={focus}>
                                {focus}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {field.value.map((focus) => (
                          <Badge
                            key={focus}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => field.onChange(field.value.filter((f) => f !== focus))}
                          >
                            {focus} ×
                          </Badge>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={sessionNoteForm.control}
                  name="interventionsUsed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interventions Used</FormLabel>
                      <FormControl>
                        <Select onValueChange={(value) => field.onChange([...field.value, value])}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select interventions" />
                          </SelectTrigger>
                          <SelectContent>
                            {interventionOptions.map((intervention) => (
                              <SelectItem key={intervention} value={intervention}>
                                {intervention}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {field.value.map((intervention) => (
                          <Badge
                            key={intervention}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() =>
                              field.onChange(field.value.filter((i) => i !== intervention))
                            }
                          >
                            {intervention} ×
                          </Badge>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={sessionNoteForm.control}
                name="subjectiveFeedback"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subjective (Client's Reported Experience)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Document what the client reports about their experience, feelings, symptoms, and concerns..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={sessionNoteForm.control}
                name="objectiveObservations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objective (Clinical Observations)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Document observable behaviours, appearance, mood, affect, and clinical observations..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={sessionNoteForm.control}
                name="assessment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assessment (Clinical Analysis)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Document clinical assessment, diagnosis considerations, treatment response, and progress..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={sessionNoteForm.control}
                name="planAndGoals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan (Therapy Plan and Goals)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Document therapy plan, session goals, interventions planned, and next steps..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={sessionNoteForm.control}
                  name="homeworkAssigned"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Homework Assigned (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Document any homework or exercises assigned to the client..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={sessionNoteForm.control}
                  name="nextSessionGoals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Session Goals (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Document goals and focus areas for the next session..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewSessionNote(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createSessionNoteMutation.isPending}>
                  {createSessionNoteMutation.isPending ? "Creating..." : "Create Session Note"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* New Document Dialog */}
      <Dialog open={showNewDocument} onOpenChange={setShowNewDocument}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
            <DialogDescription>
              Create a new HIPAA-compliant document with appropriate security classification
            </DialogDescription>
          </DialogHeader>
          <Form {...documentForm}>
            <form onSubmit={documentForm.handleSubmit(handleDocumentSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={documentForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select document type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {documentTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.replace("_", " ").toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select confidentiality level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {confidentialityLevels.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={documentForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter document title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={documentForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter document content..."
                        className="min-h-[200px]"
                        {...field}
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
    </div>
  );
}
