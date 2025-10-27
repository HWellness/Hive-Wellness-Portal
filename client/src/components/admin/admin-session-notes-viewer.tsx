import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Search,
  Calendar,
  User,
  Mail,
  AlertCircle,
  CheckCircle,
  Clock,
  Brain,
  Target,
  BookOpen,
  TrendingUp,
  Shield,
  Filter,
  X,
} from "lucide-react";

interface SessionNote {
  id: string;
  appointmentId: string;
  therapistId: string;
  subjectiveFeedback?: string;
  objectiveObservations?: string;
  assessment?: string;
  planAndGoals?: string;
  sessionFocus?: string[];
  interventionsUsed?: string[];
  homeworkAssigned?: string;
  nextSessionGoals?: string;
  progressScore?: number;
  clientEngagement?: string;
  therapistNotes?: string;
  riskLevel?: string;
  riskFactors?: string[];
  safetyPlan?: string;
  isConfidential: boolean;
  createdAt: string;
  updatedAt: string;
  therapist?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  appointment?: {
    id: string;
    scheduledAt: string;
    sessionType: string;
    status: string;
    duration?: number;
  };
}

export default function AdminSessionNotesViewer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [therapistFilter, setTherapistFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedNote, setSelectedNote] = useState<SessionNote | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch all clients
  const { data: clientsData } = useQuery({
    queryKey: ["/api/admin/clients"],
    queryFn: async () => {
      const response = await fetch("/api/admin/clients");
      if (!response.ok) return [];
      const data = await response.json();
      return data.clients || [];
    },
  });

  // Fetch all therapists
  const { data: therapistsData } = useQuery({
    queryKey: ["/api/admin/therapists"],
    queryFn: async () => {
      const response = await fetch("/api/admin/therapists");
      if (!response.ok) return [];
      const data = await response.json();
      return data.therapists || [];
    },
  });

  // Fetch all session notes with filters
  const {
    data: notesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "/api/admin/session-notes",
      searchTerm,
      clientFilter,
      therapistFilter,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (clientFilter && clientFilter !== "all") params.append("clientId", clientFilter);
      if (therapistFilter && therapistFilter !== "all")
        params.append("therapistId", therapistFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/admin/session-notes?${params}`);
      if (!response.ok) throw new Error("Failed to fetch session notes");
      return response.json();
    },
  });

  const notes: SessionNote[] = notesData?.notes || [];
  const clients = clientsData || [];
  const therapists = therapistsData || [];

  const clearFilters = () => {
    setSearchTerm("");
    setClientFilter("");
    setTherapistFilter("");
    setStartDate("");
    setEndDate("");
  };

  const handleViewNote = (note: SessionNote) => {
    setSelectedNote(note);
    setDialogOpen(true);
  };

  const getRiskBadgeColor = (riskLevel?: string) => {
    switch (riskLevel) {
      case "low":
        return "bg-green-500";
      case "moderate":
        return "bg-yellow-500";
      case "high":
        return "bg-orange-500";
      case "critical":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-GB", {
      timeZone: "Europe/London",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-hive-purple/10 via-hive-blue/8 to-hive-light-blue/12 p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-primary text-hive-purple mb-2">Session Notes Viewer</h1>
          <p className="text-hive-black/70 font-secondary">
            View all therapist session notes for backup and oversight • Confidential Information
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6 border-hive-purple/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-hive-purple">
              <Filter className="w-5 h-5" />
              Filter & Search Session Notes
            </CardTitle>
            <CardDescription>
              Use filters to narrow down session notes by client, therapist, date, or search content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filter Controls Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Client Filter */}
              <div>
                <Label htmlFor="client-filter" className="text-sm font-medium mb-2 block">
                  Filter by Client
                </Label>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger id="client-filter" data-testid="select-client-filter">
                    <SelectValue placeholder="All Clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.firstName} {client.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Therapist Filter */}
              <div>
                <Label htmlFor="therapist-filter" className="text-sm font-medium mb-2 block">
                  Filter by Therapist
                </Label>
                <Select value={therapistFilter} onValueChange={setTherapistFilter}>
                  <SelectTrigger id="therapist-filter" data-testid="select-therapist-filter">
                    <SelectValue placeholder="All Therapists" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Therapists</SelectItem>
                    {therapists.map((therapist: any) => (
                      <SelectItem key={therapist.id} value={therapist.id}>
                        {therapist.firstName} {therapist.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Free Text Search */}
              <div>
                <Label htmlFor="search-input" className="text-sm font-medium mb-2 block">
                  Search Content
                </Label>
                <Input
                  id="search-input"
                  placeholder="Search notes, names..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-notes"
                />
              </div>
            </div>

            {/* Filter Controls Row 2 - Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Start Date */}
              <div>
                <Label htmlFor="start-date" className="text-sm font-medium mb-2 block">
                  From Date
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date"
                />
              </div>

              {/* End Date */}
              <div>
                <Label htmlFor="end-date" className="text-sm font-medium mb-2 block">
                  To Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-end-date"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-end gap-2">
                <Button
                  onClick={() => refetch()}
                  className="bg-hive-purple hover:bg-hive-purple/90 flex-1"
                  data-testid="button-apply-filters"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Apply Filters
                </Button>
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="border-gray-300"
                  data-testid="button-clear-filters"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Active Filters Display */}
            {(clientFilter || therapistFilter || startDate || endDate || searchTerm) && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <span className="text-sm text-gray-600">Active filters:</span>
                {clientFilter && clientFilter !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    Client: {clients.find((c: any) => c.id === clientFilter)?.firstName}{" "}
                    {clients.find((c: any) => c.id === clientFilter)?.lastName}
                  </Badge>
                )}
                {therapistFilter && therapistFilter !== "all" && (
                  <Badge variant="secondary" className="text-xs">
                    Therapist: {therapists.find((t: any) => t.id === therapistFilter)?.firstName}{" "}
                    {therapists.find((t: any) => t.id === therapistFilter)?.lastName}
                  </Badge>
                )}
                {startDate && (
                  <Badge variant="secondary" className="text-xs">
                    From: {new Date(startDate).toLocaleDateString("en-GB")}
                  </Badge>
                )}
                {endDate && (
                  <Badge variant="secondary" className="text-xs">
                    To: {new Date(endDate).toLocaleDateString("en-GB")}
                  </Badge>
                )}
                {searchTerm && (
                  <Badge variant="secondary" className="text-xs">
                    Search: "{searchTerm}"
                  </Badge>
                )}
              </div>
            )}

            <p className="text-sm text-gray-500">Total notes: {notes.length}</p>
          </CardContent>
        </Card>

        {/* Notes List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin w-10 h-10 border-4 border-gray-300 border-t-hive-purple rounded-full mx-auto mb-4"></div>
              <p className="text-hive-black/70">Loading session notes...</p>
            </CardContent>
          </Card>
        ) : notes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-hive-black/70 text-lg">No session notes found</p>
              <p className="text-sm text-gray-500 mt-2">
                Session notes will appear here once therapists upload them
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {notes.map((note) => (
              <Card
                key={note.id}
                className="hover:shadow-lg transition-shadow cursor-pointer border-l-4"
                style={{
                  borderLeftColor:
                    note.riskLevel === "high" || note.riskLevel === "critical"
                      ? "#dc3545"
                      : "#9306B1",
                }}
                onClick={() => handleViewNote(note)}
                data-testid={`card-note-${note.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-hive-purple flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          Session Note
                        </h3>
                        {note.riskLevel && (
                          <Badge className={`${getRiskBadgeColor(note.riskLevel)} text-white`}>
                            {note.riskLevel.toUpperCase()} RISK
                          </Badge>
                        )}
                        {note.isConfidential && (
                          <Badge variant="outline" className="border-hive-purple text-hive-purple">
                            <Shield className="w-3 h-3 mr-1" />
                            Confidential
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <strong>Client:</strong>{" "}
                            {note.client
                              ? `${note.client.firstName} ${note.client.lastName}`
                              : "Unknown"}
                          </p>
                          <p className="text-gray-600 flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <strong>Therapist:</strong>{" "}
                            {note.therapist
                              ? `${note.therapist.firstName} ${note.therapist.lastName}`
                              : "Unknown"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <strong>Session:</strong>{" "}
                            {note.appointment ? formatDate(note.appointment.scheduledAt) : "N/A"}
                          </p>
                          <p className="text-gray-600 flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <strong>Created:</strong> {formatDate(note.createdAt)}
                          </p>
                        </div>
                      </div>

                      {note.sessionFocus && note.sessionFocus.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Focus Areas:</strong>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {note.sessionFocus.map((focus, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {focus}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {note.progressScore !== null && note.progressScore !== undefined && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-600">
                            <strong>Progress Score:</strong> {note.progressScore}/10
                          </p>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewNote(note);
                      }}
                      className="text-hive-purple border-hive-purple hover:bg-hive-purple hover:text-white"
                      data-testid={`button-view-${note.id}`}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Detailed View Dialog */}
        {selectedNote && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-hive-purple text-2xl">
                  <FileText className="w-6 h-6" />
                  Session Note Details
                </DialogTitle>
                <DialogDescription>
                  Confidential clinical documentation - Admin access only
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Session Information */}
                <Card className="border-hive-purple/30">
                  <CardHeader className="bg-hive-purple/5">
                    <CardTitle className="text-lg">Session Information</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-semibold text-gray-700">Note ID:</p>
                        <p className="text-gray-600">{selectedNote.id}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Appointment ID:</p>
                        <p className="text-gray-600">{selectedNote.appointmentId}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Client:</p>
                        <p className="text-gray-600">
                          {selectedNote.client
                            ? `${selectedNote.client.firstName} ${selectedNote.client.lastName}`
                            : "Unknown"}
                          {selectedNote.client?.email && (
                            <span className="text-xs block text-gray-500">
                              {selectedNote.client.email}
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Therapist:</p>
                        <p className="text-gray-600">
                          {selectedNote.therapist
                            ? `${selectedNote.therapist.firstName} ${selectedNote.therapist.lastName}`
                            : "Unknown"}
                          {selectedNote.therapist?.email && (
                            <span className="text-xs block text-gray-500">
                              {selectedNote.therapist.email}
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Session Date:</p>
                        <p className="text-gray-600">
                          {selectedNote.appointment
                            ? formatDate(selectedNote.appointment.scheduledAt)
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">Session Type:</p>
                        <p className="text-gray-600">
                          {selectedNote.appointment?.sessionType || "N/A"}
                        </p>
                      </div>
                      {selectedNote.appointment?.duration && (
                        <div>
                          <p className="font-semibold text-gray-700">Duration:</p>
                          <p className="text-gray-600">
                            {selectedNote.appointment.duration} minutes
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-700">Risk Level:</p>
                        <Badge className={`${getRiskBadgeColor(selectedNote.riskLevel)}`}>
                          {selectedNote.riskLevel?.toUpperCase() || "N/A"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* SOAP Notes */}
                {selectedNote.subjectiveFeedback && (
                  <Card>
                    <CardHeader className="bg-blue-50">
                      <CardTitle className="text-base flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Subjective Feedback (Client's Experience)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {selectedNote.subjectiveFeedback}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {selectedNote.objectiveObservations && (
                  <Card>
                    <CardHeader className="bg-green-50">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Objective Observations (Therapist's Clinical Notes)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {selectedNote.objectiveObservations}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {selectedNote.assessment && (
                  <Card>
                    <CardHeader className="bg-purple-50">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Clinical Assessment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedNote.assessment}</p>
                    </CardContent>
                  </Card>
                )}

                {selectedNote.planAndGoals && (
                  <Card>
                    <CardHeader className="bg-orange-50">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Treatment Plan & Goals
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {selectedNote.planAndGoals}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Additional Information */}
                {selectedNote.sessionFocus && selectedNote.sessionFocus.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Session Focus Areas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedNote.sessionFocus.map((focus, idx) => (
                          <Badge key={idx} variant="outline">
                            {focus}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedNote.interventionsUsed && selectedNote.interventionsUsed.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Therapeutic Interventions Used
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside space-y-1">
                        {selectedNote.interventionsUsed.map((intervention, idx) => (
                          <li key={idx} className="text-gray-700">
                            {intervention}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {selectedNote.homeworkAssigned && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Homework Assigned</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {selectedNote.homeworkAssigned}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {selectedNote.nextSessionGoals && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Next Session Goals
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {selectedNote.nextSessionGoals}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Progress & Engagement */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Progress & Engagement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedNote.progressScore !== null &&
                        selectedNote.progressScore !== undefined && (
                          <div>
                            <p className="font-semibold text-gray-700">Progress Score:</p>
                            <p className="text-2xl font-bold text-hive-purple">
                              {selectedNote.progressScore}/10
                            </p>
                          </div>
                        )}
                      {selectedNote.clientEngagement && (
                        <div>
                          <p className="font-semibold text-gray-700">Client Engagement:</p>
                          <p className="text-lg capitalize">{selectedNote.clientEngagement}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Assessment */}
                {(selectedNote.riskFactors || selectedNote.safetyPlan) && (
                  <Card className="border-red-200">
                    <CardHeader className="bg-red-50">
                      <CardTitle className="text-base flex items-center gap-2 text-red-700">
                        <AlertCircle className="w-4 h-4" />
                        Risk Assessment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {selectedNote.riskFactors && selectedNote.riskFactors.length > 0 && (
                        <div className="mb-4">
                          <p className="font-semibold text-gray-700 mb-2">Risk Factors:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {selectedNote.riskFactors.map((factor, idx) => (
                              <li key={idx} className="text-gray-700">
                                {factor}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedNote.safetyPlan && (
                        <div>
                          <p className="font-semibold text-gray-700 mb-2">Safety Plan:</p>
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {selectedNote.safetyPlan}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Metadata */}
                <Card className="bg-gray-50">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                      <div>
                        <p>Created: {formatDate(selectedNote.createdAt)}</p>
                      </div>
                      <div>
                        <p>Last Updated: {formatDate(selectedNote.updatedAt)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => setDialogOpen(false)}
                  className="bg-hive-purple hover:bg-hive-purple/90"
                  data-testid="button-close-dialog"
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
