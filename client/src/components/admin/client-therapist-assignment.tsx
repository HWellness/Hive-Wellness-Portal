import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Brain,
  CheckCircle,
  Clock,
  Search,
  Filter,
  User,
  Star,
  ArrowLeft,
  Info,
  FileText,
  Award,
  DollarSign,
  Calendar,
} from "lucide-react";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: "awaiting_assignment" | "assigned" | "active";
  assignedTherapist?: string;
  profileCompleted: boolean;
  createdAt: string;
  concerns?: string[];
  preferences?: {
    gender?: string;
    approach?: string;
    availability?: string;
  };
}

interface TherapistRecommendation {
  therapistId: string;
  name: string;
  specialisations: string[];
  matchScore: number;
  reasoning: string;
  availability: string;
  rate: number;
  experience: string;
}

interface AssignmentData {
  clientId: string;
  therapistId: string;
  notes?: string;
  aiRecommendationUsed: boolean;
}

export function ClientTherapistAssignment() {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Parse URL parameters for direct client assignment
  const urlParams = new URLSearchParams(window.location.search);
  const urlClientId = urlParams.get("clientId");
  const urlClientName = urlParams.get("clientName");

  // Institution dashboard disables client-therapist assignment functionality
  const isInstitutionDashboard = window.location.pathname.includes("institutional-dashboard");

  if (isInstitutionDashboard) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Client-Therapist Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Assignment Functionality Disabled
              </h3>
              <p className="text-gray-600 mb-4">
                Client-therapist assignment functionality has been disabled in the institutional
                dashboard. This feature is managed through the main admin portal.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> For security and compliance reasons, client-therapist
                  assignments are handled through dedicated admin workflows outside of institutional
                  management.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  const [searchTerm, setSearchTerm] = useState("");

  console.log("Client Assignment URL params:", { urlClientId, urlClientName, location });
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [viewingTherapist, setViewingTherapist] = useState<any | null>(null);

  // Fetch unassigned clients
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/admin/clients", statusFilter],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/admin/clients?status=${statusFilter}`);
      return response.json();
    },
  });

  // Auto-select client if coming from notification
  useEffect(() => {
    if (urlClientId && clients && clients.length > 0 && !selectedClient) {
      const targetClient = clients.find((client: Client) => client.id === urlClientId);
      if (targetClient) {
        console.log("Auto-selecting client from URL:", targetClient);
        setSelectedClient(targetClient);
      }
    }
  }, [urlClientId, clients, selectedClient]);

  // Fetch AI recommendations for selected client
  const { data: aiRecommendations = [], isLoading: aiLoading } = useQuery({
    queryKey: ["/api/admin/ai-recommendations", selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient) return [];
      const response = await apiRequest("POST", "/api/admin/ai-recommendations", {
        clientId: selectedClient.id,
      });
      return response.json();
    },
    enabled: !!selectedClient && showAIRecommendations,
  });

  // Fetch available therapists
  const { data: therapists = [] } = useQuery({
    queryKey: ["/api/admin/therapists", "available"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/therapists?status=available");
      return response.json();
    },
  });

  // Assignment mutation
  const assignTherapistMutation = useMutation({
    mutationFn: async (data: AssignmentData) => {
      const response = await apiRequest("POST", "/api/admin/assign-therapist", data);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "✅ Assignment Complete",
        description: `Therapist successfully assigned to client. ${result.emailSent ? "Notification emails sent to both parties." : ""}`,
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/therapists"] });
      setSelectedClient(null);
      setShowAIRecommendations(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Assignment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAssignTherapist = (therapistId: string, aiRecommendationUsed = false) => {
    if (!selectedClient) return;

    assignTherapistMutation.mutate({
      clientId: selectedClient.id,
      therapistId,
      aiRecommendationUsed,
    });
  };

  const filteredClients = clients.filter((client: Client) => {
    const matchesSearch = `${client.firstName} ${client.lastName} ${client.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || client.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "awaiting_assignment":
        return "bg-yellow-100 text-yellow-800";
      case "assigned":
        return "bg-blue-100 text-blue-800";
      case "active":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Hive Branding */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-hive-purple font-century">
            Client-Therapist Assignment
          </h2>
          <p className="text-gray-600">
            AI-powered personality matching for optimal therapy outcomes
          </p>
          {urlClientName && (
            <div className="mt-2 p-3 bg-gradient-to-r from-hive-purple/10 to-purple-100 border border-hive-purple/30 rounded-md">
              <p className="text-sm text-hive-purple font-medium">
                <strong>🎯 Assignment Request:</strong> Showing personality-matched therapist
                options for {decodeURIComponent(urlClientName)}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm text-hive-purple border-hive-purple/30">
            {filteredClients.length} clients
          </Badge>
          <div className="px-3 py-1 bg-hive-purple/10 rounded-full">
            <span className="text-xs font-medium text-hive-purple">AI Matching Active</span>
          </div>
        </div>
      </div>

      {/* Enhanced Search and Filter with Hive Branding */}
      <Card className="border-hive-purple/20 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-hive-purple" />
              <Input
                placeholder="Search clients by name, email, or concerns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-hive-purple/30 focus:border-hive-purple focus:ring-hive-purple/20"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 border-hive-purple/30 focus:border-hive-purple">
                  <Filter className="h-4 w-4 mr-2 text-hive-purple" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  <SelectItem value="awaiting_assignment">🟡 Awaiting Assignment</SelectItem>
                  <SelectItem value="assigned">🔵 Assigned</SelectItem>
                  <SelectItem value="active">🟢 Active</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="border-hive-purple/30 text-hive-purple hover:bg-hive-purple/10"
                onClick={() => setShowAIRecommendations(!showAIRecommendations)}
              >
                <Brain className="h-4 w-4 mr-2" />
                {showAIRecommendations ? "Hide" : "Show"} AI Insights
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Client List with Personality Details */}
        <Card className="border-hive-purple/20">
          <CardHeader className="bg-gradient-to-r from-hive-purple/5 to-purple-50">
            <CardTitle className="flex items-center gap-2 text-hive-purple font-century">
              <Users className="h-5 w-5" />
              Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredClients.map((client: Client) => (
                  <div
                    key={client.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      selectedClient?.id === client.id
                        ? "border-hive-purple bg-gradient-to-r from-hive-purple/10 to-purple-50 shadow-md"
                        : "border-gray-200 hover:border-hive-purple/30"
                    }`}
                    onClick={() => setSelectedClient(client)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {client.firstName} {client.lastName}
                        </div>
                        <div className="text-sm text-gray-600">{client.email}</div>

                        {/* Client Concerns & Preferences */}
                        {client.concerns && client.concerns.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">Concerns:</p>
                            <div className="flex flex-wrap gap-1">
                              {client.concerns.slice(0, 3).map((concern, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full"
                                >
                                  {concern}
                                </span>
                              ))}
                              {client.concerns.length > 3 && (
                                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                  +{client.concerns.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Client Preferences */}
                        {client.preferences && (
                          <div className="mt-2 text-xs text-gray-600">
                            {client.preferences.gender && (
                              <span className="mr-3">
                                👥 Prefers {client.preferences.gender} therapist
                              </span>
                            )}
                            {client.preferences.approach && (
                              <span>🧠 {client.preferences.approach} approach</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={getStatusColor(client.status)}>
                          {client.status.replace("_", " ")}
                        </Badge>
                        {client.profileCompleted && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-xs text-green-600">Complete</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredClients.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No clients found</p>
                    <p className="text-sm">Try adjusting your search or filter</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Assignment Panel with Hive Branding */}
        <Card className="border-hive-purple/20">
          <CardHeader className="bg-gradient-to-r from-hive-purple/5 to-purple-50">
            <CardTitle className="flex items-center gap-2 text-hive-purple font-century">
              <Brain className="h-5 w-5" />
              Assignment Panel
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {selectedClient ? (
              <div className="space-y-4">
                {/* Enhanced Client Details */}
                <div className="p-4 bg-gradient-to-r from-hive-purple/10 to-purple-50 rounded-lg border border-hive-purple/20">
                  <h3 className="font-medium mb-3 text-hive-purple font-century">
                    {selectedClient.firstName} {selectedClient.lastName}
                  </h3>
                  <div className="text-sm space-y-2 text-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-hive-purple rounded-full"></span>
                      <span className="font-medium">Email:</span> {selectedClient.email}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-hive-purple rounded-full"></span>
                      <span className="font-medium">Status:</span>
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                        {selectedClient.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-hive-purple rounded-full"></span>
                      <span className="font-medium">Profile:</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${selectedClient.profileCompleted ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                      >
                        {selectedClient.profileCompleted ? "Complete" : "Incomplete"}
                      </span>
                    </div>
                    {selectedClient.concerns && selectedClient.concerns.length > 0 && (
                      <div className="mt-3">
                        <span className="font-medium text-hive-purple">Concerns:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {selectedClient.concerns.map((concern, idx) => (
                            <span
                              key={idx}
                              className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full"
                            >
                              {concern}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Enhanced AI Recommendations */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-hive-purple font-century">
                      AI Recommendations
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAIRecommendations(!showAIRecommendations)}
                      disabled={aiLoading}
                      className="border-hive-purple/30 text-hive-purple hover:bg-hive-purple/10"
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      {showAIRecommendations ? "Hide" : "Generate"}
                    </Button>
                  </div>

                  {showAIRecommendations && (
                    <div className="space-y-3">
                      {aiLoading ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="h-20 bg-gradient-to-r from-hive-purple/5 to-purple-50 rounded-lg animate-pulse border border-hive-purple/20"
                            />
                          ))}
                        </div>
                      ) : (
                        <>
                          {aiRecommendations.map((rec: TherapistRecommendation) => (
                            <div
                              key={rec.therapistId}
                              className="p-3 border border-hive-purple/20 rounded-lg bg-gradient-to-r from-hive-purple/5 to-purple-50 hover:shadow-md transition-all"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="font-medium text-hive-purple">{rec.name}</div>
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-hive-purple text-white">
                                    <Star className="h-3 w-3 mr-1" />
                                    {typeof rec.matchScore === "number"
                                      ? `${rec.matchScore}% match`
                                      : `${rec.matchScore} match`}
                                  </Badge>
                                  <Button
                                    size="sm"
                                    onClick={() => handleAssignTherapist(rec.therapistId, true)}
                                    disabled={assignTherapistMutation.isPending}
                                    className="bg-hive-purple hover:bg-hive-purple/90 text-white"
                                  >
                                    Assign
                                  </Button>
                                </div>
                              </div>
                              <div className="text-sm text-gray-700 mb-2 flex flex-wrap gap-1">
                                {(rec.specialisations || []).map((spec, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                                  >
                                    {spec}
                                  </span>
                                ))}
                              </div>
                              <div className="text-sm text-gray-600 italic">{rec.reasoning}</div>
                            </div>
                          ))}
                          {aiRecommendations.length === 0 && (
                            <div className="text-center py-6 text-hive-purple/70 bg-gradient-to-r from-hive-purple/5 to-purple-50 rounded-lg border border-hive-purple/20">
                              <Brain className="h-8 w-8 mx-auto mb-2 text-hive-purple/50" />
                              <p className="font-medium">No AI recommendations available</p>
                              <p className="text-sm text-gray-500 mt-1">
                                Try generating recommendations for this client
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Enhanced Manual Assignment */}
                <div className="space-y-3">
                  <h4 className="font-medium text-hive-purple font-century">Manual Assignment</h4>
                  <div className="space-y-2">
                    {(therapists?.users || []).map((therapist: any) => (
                      <div
                        key={therapist.id}
                        className="flex items-center justify-between p-3 border border-hive-purple/20 rounded-lg bg-gradient-to-r from-hive-purple/5 to-purple-50 hover:shadow-md transition-all"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-hive-purple">
                            {therapist.name ||
                              `${therapist.firstName || ""} ${therapist.lastName || ""}`.trim() ||
                              therapist.email ||
                              therapist.id}
                            {therapist.sessionsPerWeek && (
                              <span className="ml-2 text-sm font-normal text-purple-600">
                                ({therapist.sessionsPerWeek} clients/week capacity)
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {therapist.specialisations?.join(", ") || "General Therapy"}
                          </div>
                          {therapist.experience && (
                            <div className="text-xs text-gray-500 mt-1">
                              <span className="inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-hive-purple rounded-full"></span>
                                {therapist.experience} experience
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-hive-purple hover:bg-hive-purple/10"
                            onClick={() => setViewingTherapist(therapist)}
                            data-testid={`button-view-details-${therapist.id}`}
                          >
                            <Info className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-hive-purple/30 text-hive-purple hover:bg-hive-purple hover:text-white transition-colors"
                            onClick={() => handleAssignTherapist(therapist.id, false)}
                            disabled={assignTherapistMutation.isPending}
                            data-testid={`button-assign-${therapist.id}`}
                          >
                            Assign
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gradient-to-r from-hive-purple/5 to-purple-50 rounded-lg border border-hive-purple/20">
                <User className="h-16 w-16 mx-auto text-hive-purple/50 mb-4" />
                <p className="text-hive-purple font-medium font-century text-lg mb-2">
                  Select a client to manage assignment
                </p>
                <p className="text-gray-500 text-sm">
                  Choose a client from the list to begin the assignment process
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Therapist Details Dialog */}
      <Dialog open={!!viewingTherapist} onOpenChange={() => setViewingTherapist(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-century text-hive-purple">
              {viewingTherapist?.name ||
                `${viewingTherapist?.firstName || ""} ${viewingTherapist?.lastName || ""}`.trim() ||
                "Therapist Profile"}
            </DialogTitle>
            <DialogDescription>Complete therapist profile and credentials</DialogDescription>
          </DialogHeader>

          {viewingTherapist && (
            <div className="space-y-6 mt-4">
              {/* Bio Section */}
              {viewingTherapist.bio && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-hive-purple font-medium">
                    <FileText className="h-5 w-5" />
                    <h3>About</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed pl-7">{viewingTherapist.bio}</p>
                </div>
              )}

              {/* Credentials & Tier */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {viewingTherapist.credentials && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-hive-purple font-medium">
                      <Award className="h-5 w-5" />
                      <h3>Credentials</h3>
                    </div>
                    <div className="pl-7 space-y-1">
                      {Array.isArray(viewingTherapist.credentials) ? (
                        viewingTherapist.credentials.map((cred: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-hive-purple rounded-full"></span>
                            <span className="text-gray-700">{cred}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-gray-700">{viewingTherapist.credentials}</span>
                      )}
                    </div>
                  </div>
                )}

                {viewingTherapist.therapistTier && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-hive-purple font-medium">
                      <Star className="h-5 w-5" />
                      <h3>Professional Level</h3>
                    </div>
                    <div className="pl-7">
                      <Badge className="bg-hive-purple text-white capitalize">
                        {viewingTherapist.therapistTier}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* Specialisations */}
              {viewingTherapist.specialisations && viewingTherapist.specialisations.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-hive-purple font-medium">
                    <Brain className="h-5 w-5" />
                    <h3>Specialisations</h3>
                  </div>
                  <div className="pl-7 flex flex-wrap gap-2">
                    {viewingTherapist.specialisations.map((spec: string, idx: number) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="border-hive-purple/30 text-hive-purple"
                      >
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Therapy Categories */}
              {viewingTherapist.therapyCategories &&
                viewingTherapist.therapyCategories.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-hive-purple font-medium">
                      <CheckCircle className="h-5 w-5" />
                      <h3>Therapy Categories</h3>
                    </div>
                    <div className="pl-7 flex flex-wrap gap-2">
                      {viewingTherapist.therapyCategories.map((cat: string, idx: number) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="bg-purple-100 text-purple-700"
                        >
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {/* Rate & Experience */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {viewingTherapist.hourlyRate && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-hive-purple font-medium">
                      <DollarSign className="h-5 w-5" />
                      <h3>Hourly Rate</h3>
                    </div>
                    <div className="pl-7">
                      <span className="text-2xl font-bold text-hive-purple">
                        £{viewingTherapist.hourlyRate}
                      </span>
                      <span className="text-gray-600 text-sm ml-1">per session</span>
                    </div>
                  </div>
                )}

                {viewingTherapist.experience && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-hive-purple font-medium">
                      <Clock className="h-5 w-5" />
                      <h3>Experience</h3>
                    </div>
                    <div className="pl-7">
                      <span className="text-gray-700 font-medium">
                        {viewingTherapist.experience}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Availability */}
              {viewingTherapist.availability && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-hive-purple font-medium">
                    <Calendar className="h-5 w-5" />
                    <h3>Availability</h3>
                  </div>
                  <div className="pl-7">
                    {typeof viewingTherapist.availability === "string" ? (
                      <p className="text-gray-700">{viewingTherapist.availability}</p>
                    ) : (
                      <pre className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg overflow-auto">
                        {JSON.stringify(viewingTherapist.availability, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center gap-2 text-hive-purple font-medium">
                  <User className="h-5 w-5" />
                  <h3>Contact Details</h3>
                </div>
                <div className="pl-7 space-y-1 text-gray-700">
                  <div>
                    Email: <span className="font-medium">{viewingTherapist.email}</span>
                  </div>
                  {viewingTherapist.googleWorkspaceEmail && (
                    <div>
                      Workspace Email:{" "}
                      <span className="font-medium">{viewingTherapist.googleWorkspaceEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t flex justify-end">
                <Button
                  className="bg-hive-purple hover:bg-hive-purple/90 text-white"
                  onClick={() => {
                    handleAssignTherapist(viewingTherapist.id, false);
                    setViewingTherapist(null);
                  }}
                  disabled={assignTherapistMutation.isPending}
                  data-testid="button-assign-from-details"
                >
                  Assign to {selectedClient?.firstName}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
