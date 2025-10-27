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
  Brain,
  User,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  MessageSquare,
  Star,
  AlertTriangle,
  TrendingUp,
  Filter,
  Search,
  RefreshCw,
} from "lucide-react";
import type { User as UserType } from "@shared/schema";
import TherapistApplicationReview from "@/components/admin/therapist-application-review";
import AIAnalysisModal from "@/components/admin/ai-analysis-modal";

interface AdminConnectingSystemProps {
  user: UserType;
}

interface ConnectingStats {
  pendingAiReview: number;
  pendingAdminReview: number;
  approvedProfiles: number;
  totalMatches: number;
  successfulMatches: number;
  averageCompatibilityScore: number;
  processingTime: string;
}

interface MatchingProfile {
  id: string;
  userId: string;
  userType: "client" | "therapist";
  status: "pending_ai_review" | "ai_reviewed" | "admin_reviewing" | "approved" | "rejected";
  aiReviewScore: number;
  aiReviewNotes: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  userData: {
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl?: string;
  };
  profileData: any;
}

interface MatchingSuggestion {
  id: string;
  clientId: string;
  therapistId: string;
  compatibilityScore: number;
  aiReasoning: string;
  status: "pending" | "admin_approved" | "admin_rejected" | "client_accepted" | "client_declined";
  adminNotes?: string;
  createdAt: string;
  clientProfile: MatchingProfile;
  therapistProfile: MatchingProfile;
}

export default function AdminMatchingSystem({ user }: AdminMatchingSystemProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("pending-reviews");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const { data: pendingProfiles = [], isLoading: profilesLoading } = useQuery<MatchingProfile[]>({
    queryKey: ["/api/admin/matching/pending-profiles"],
    retry: false,
  });

  const { data: matchingSuggestions = [], isLoading: suggestionsLoading } = useQuery<
    MatchingSuggestion[]
  >({
    queryKey: ["/api/admin/matching/suggestions"],
    retry: false,
  });

  const { data: matchingStats } = useQuery<MatchingStats>({
    queryKey: ["/api/admin/matching/stats"],
    retry: false,
  });

  const approveProfileMutation = useMutation({
    mutationFn: async ({ profileId, notes }: { profileId: string; notes?: string }) => {
      return await apiRequest("POST", `/api/admin/matching/approve-profile/${profileId}`, {
        notes,
      });
    },
    onSuccess: () => {
      toast({
        title: "Profile Approved",
        description: "The profile has been approved for matching.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/matching/pending-profiles"] });
    },
    onError: () => {
      toast({
        title: "Approval Failed",
        description: "Unable to approve profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectProfileMutation = useMutation({
    mutationFn: async ({ profileId, notes }: { profileId: string; notes: string }) => {
      return await apiRequest("POST", `/api/admin/matching/reject-profile/${profileId}`, { notes });
    },
    onSuccess: () => {
      toast({
        title: "Profile Rejected",
        description: "The profile has been rejected with feedback sent to the user.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/matching/pending-profiles"] });
    },
    onError: () => {
      toast({
        title: "Rejection Failed",
        description: "Unable to reject profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const approveMatchMutation = useMutation({
    mutationFn: async ({ matchId, notes }: { matchId: string; notes?: string }) => {
      return await apiRequest("POST", `/api/admin/matching/approve-match/${matchId}`, { notes });
    },
    onSuccess: () => {
      toast({
        title: "Match Approved",
        description: "The matching suggestion has been approved and sent to the client.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/matching/suggestions"] });
    },
    onError: () => {
      toast({
        title: "Approval Failed",
        description: "Unable to approve match. Please try again.",
        variant: "destructive",
      });
    },
  });

  const triggerAiReviewMutation = useMutation({
    mutationFn: async () => {
      // Run real AI analysis on demo client-therapist pair
      return await apiRequest("POST", "/api/admin/matching/run-ai-analysis", {
        clientProfileId: "profile-1",
        therapistProfileId: "profile-2",
        analysisType: "compatibility",
      });
    },
    onSuccess: (data: any) => {
      const analysis = data.result?.aiAnalysis;
      if (analysis) {
        setAiAnalysisResult(analysis);
        setShowAIModal(true);
        toast({
          title: "AI Analysis Complete",
          description: `Compatibility: ${analysis.compatibilityScore}% (${analysis.confidence}% confidence)`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/matching/pending-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/matching/suggestions"] });
    },
    onError: (error) => {
      toast({
        title: "AI Analysis Failed",
        description: error.message || "Unable to run AI analysis. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ profileId, updates }: { profileId: string; updates: any }) => {
      return await apiRequest("PATCH", `/api/admin/matching/update-profile/${profileId}`, updates);
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Profile information has been successfully updated.",
      });
      setEditingProfile(null);
      setEditForm({});
      queryClient.invalidateQueries({ queryKey: ["/api/admin/matching/pending-profiles"] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Unable to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const startEditing = (profile: MatchingProfile) => {
    setEditingProfile(profile.id);
    setEditForm({
      firstName: profile.userData.firstName,
      lastName: profile.userData.lastName,
      email: profile.userData.email,
      concerns: profile.profileData.concerns?.join(", ") || "",
      sessionFormat: profile.profileData.sessionFormat || "",
      availability: profile.profileData.availability || "",
      previousTherapy: profile.profileData.previousTherapy || false,
      specialisations: Array.isArray(profile.profileData.specialisations)
        ? profile.profileData.specialisations.join(", ")
        : profile.profileData.specialisations || "",
      credentials: profile.profileData.credentials || "",
      sessionRate: profile.profileData.sessionRate || "",
      experience: profile.profileData.experience || "",
    });
  };

  const saveProfile = () => {
    if (!editingProfile) return;

    const updates = {
      userData: {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
      },
      profileData: {
        concerns: editForm.concerns
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        sessionFormat: editForm.sessionFormat,
        availability: editForm.availability,
        previousTherapy: editForm.previousTherapy,
        specialisations: editForm.specialisations
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        credentials: editForm.credentials,
        sessionRate: editForm.sessionRate,
        experience: editForm.experience,
      },
    };

    updateProfileMutation.mutate({ profileId: editingProfile, updates });
  };

  const cancelEditing = () => {
    setEditingProfile(null);
    setEditForm({});
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending_ai_review":
        return "bg-yellow-100 text-yellow-800";
      case "ai_reviewed":
        return "bg-blue-100 text-blue-800";
      case "admin_reviewing":
        return "bg-purple-100 text-purple-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const filteredProfiles = pendingProfiles.filter((profile) => {
    if (filterStatus !== "all" && profile.status !== filterStatus) return false;
    if (
      searchTerm &&
      !profile.userData.firstName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !profile.userData.lastName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !profile.userData.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
      return false;
    return true;
  });

  // Demo data for display
  const demoProfiles: MatchingProfile[] = [
    {
      id: "profile-1",
      userId: "client-1",
      userType: "client",
      status: "ai_reviewed",
      aiReviewScore: 85,
      aiReviewNotes:
        "Strong candidate with clear therapeutic goals. Anxiety and depression symptoms align well with available therapist specialisations.",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      userData: {
        firstName: "Emma",
        lastName: "Johnson",
        email: "emma.j@email.com",
      },
      profileData: {
        concerns: ["anxiety", "depression"],
        sessionFormat: "video",
        availability: "evenings",
        previousTherapy: false,
      },
    },
    {
      id: "profile-2",
      userId: "therapist-1",
      userType: "therapist",
      status: "admin_reviewing",
      aiReviewScore: 92,
      aiReviewNotes:
        "Excellent credentials and experience. Specialisations in CBT and anxiety disorders. Clear availability and professional background.",
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      userData: {
        firstName: "Dr. Sarah",
        lastName: "Martinez",
        email: "sarah.martinez@therapist.com",
      },
      profileData: {
        specialisations: ["CBT", "Anxiety Disorders", "Depression"],
        experience: 8,
        credentials: "Licensed Clinical Psychologist",
        sessionRate: "120.00",
      },
    },
    {
      id: "profile-3",
      userId: "client-2",
      userType: "client",
      status: "pending_ai_review",
      aiReviewScore: 0,
      aiReviewNotes: "",
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      userData: {
        firstName: "Michael",
        lastName: "Chen",
        email: "michael.chen@email.com",
      },
      profileData: {
        concerns: ["trauma", "PTSD"],
        sessionFormat: "video",
        availability: "flexible",
        previousTherapy: true,
      },
    },
  ];

  const demoSuggestions: MatchingSuggestion[] = [
    {
      id: "match-1",
      clientId: "client-1",
      therapistId: "therapist-1",
      compatibilityScore: 88,
      aiReasoning:
        "Strong compatibility based on therapist specialisation in anxiety and depression, matching client concerns. Session format preferences align (video), and availability windows overlap.",
      status: "pending",
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      clientProfile: demoProfiles[0],
      therapistProfile: demoProfiles[1],
    },
  ];

  const demoStats: MatchingStats = {
    pendingAiReview: 12,
    pendingAdminReview: 8,
    approvedProfiles: 23,
    totalMatches: 15,
    successfulMatches: 11,
    averageCompatibilityScore: 84,
    processingTime: "2.3 minutes",
  };

  const displayProfiles = filteredProfiles.length > 0 ? filteredProfiles : demoProfiles;
  const displaySuggestions = matchingSuggestions.length > 0 ? matchingSuggestions : demoSuggestions;
  const displayStats = matchingStats || demoStats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-century font-bold text-hive-black">
          AI-Powered Matching System
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={() => triggerAiReviewMutation.mutate()}
            disabled={triggerAiReviewMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Brain className="w-4 h-4 mr-2" />
            Run AI Analysis
          </Button>
          <Button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/admin/matching"] });
            }}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-hive-purple">Pending AI Review</p>
                <p className="text-2xl font-bold text-hive-purple">
                  {displayStats.pendingAiReview}
                </p>
              </div>
              <Brain className="w-8 h-8 text-hive-purple" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Admin Review</p>
                <p className="text-2xl font-bold text-purple-900">
                  {displayStats.pendingAdminReview}
                </p>
              </div>
              <User className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Approved Profiles</p>
                <p className="text-2xl font-bold text-green-900">{displayStats.approvedProfiles}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">Match Success Rate</p>
                <p className="text-2xl font-bold text-orange-900">
                  {Math.round((displayStats.successfulMatches / displayStats.totalMatches) * 100)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending-reviews">Profile Reviews</TabsTrigger>
          <TabsTrigger value="therapist-applications">Therapist Applications</TabsTrigger>
          <TabsTrigger value="matching-suggestions">AI Matches</TabsTrigger>
          <TabsTrigger value="system-settings">System Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="pending-reviews" className="space-y-6">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_ai_review">Pending AI Review</SelectItem>
                <SelectItem value="ai_reviewed">AI Reviewed</SelectItem>
                <SelectItem value="admin_reviewing">Admin Reviewing</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Profile Reviews */}
          <div className="space-y-4">
            {displayProfiles.map((profile) => (
              <Card key={profile.id} className="border-2">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-hive-purple/10 rounded-full flex items-center justify-center">
                        {profile.userType === "therapist" ? (
                          <User className="w-6 h-6 text-hive-purple" />
                        ) : (
                          <Users className="w-6 h-6 text-hive-purple" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {profile.userData.firstName} {profile.userData.lastName}
                        </h3>
                        <p className="text-gray-600">{profile.userData.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            className={
                              profile.userType === "therapist"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }
                          >
                            {profile.userType === "therapist" ? "Therapist" : "Client"}
                          </Badge>
                          <Badge className={getStatusColor(profile.status)}>
                            {profile.status.replace("_", " ")}
                          </Badge>
                          {profile.aiReviewScore > 0 && (
                            <Badge className="bg-gray-100 text-gray-800">
                              AI Score:{" "}
                              <span className={getScoreColor(profile.aiReviewScore)}>
                                {profile.aiReviewScore}%
                              </span>
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-500">
                        Created: {new Date(profile.createdAt).toLocaleDateString()}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(profile)}
                        className="h-7"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>

                  {profile.aiReviewNotes && (
                    <div className="bg-blue-50 p-4 rounded-lg mb-4">
                      <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        AI Analysis
                      </h4>
                      <p className="text-blue-800 text-sm">{profile.aiReviewNotes}</p>
                    </div>
                  )}

                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">Profile Information</h4>
                      {editingProfile === profile.id && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={saveProfile}
                            disabled={updateProfileMutation.isPending}
                          >
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing}>
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>

                    {editingProfile === profile.id ? (
                      <div className="grid grid-cols-1 gap-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                              id="firstName"
                              value={editForm.firstName || ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, firstName: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                              id="lastName"
                              value={editForm.lastName || ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, lastName: e.target.value })
                              }
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={editForm.email || ""}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          />
                        </div>

                        {profile.userType === "client" ? (
                          <>
                            <div>
                              <Label htmlFor="concerns">Concerns (comma-separated)</Label>
                              <Textarea
                                id="concerns"
                                value={editForm.concerns || ""}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, concerns: e.target.value })
                                }
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="sessionFormat">Session Format</Label>
                                <Select
                                  value={editForm.sessionFormat || "video"}
                                  onValueChange={(value) =>
                                    setEditForm({ ...editForm, sessionFormat: value })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Video therapy sessions" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="video">Video therapy sessions</SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-sm text-gray-600 mt-1">
                                  All sessions are video-based
                                </p>
                              </div>
                              <div>
                                <Label htmlFor="availability">Availability</Label>
                                <Select
                                  value={editForm.availability || ""}
                                  onValueChange={(value) =>
                                    setEditForm({ ...editForm, availability: value })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select availability" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="flexible">Flexible</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <Label htmlFor="specialisations">
                                Specialisations (comma-separated)
                              </Label>
                              <Textarea
                                id="specialisations"
                                value={editForm.specialisations || ""}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, specialisations: e.target.value })
                                }
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="credentials">Credentials</Label>
                                <Input
                                  id="credentials"
                                  value={editForm.credentials || ""}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, credentials: e.target.value })
                                  }
                                />
                              </div>
                              <div>
                                <Label htmlFor="sessionRate">Session Rate</Label>
                                <Input
                                  id="sessionRate"
                                  value={editForm.sessionRate || ""}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, sessionRate: e.target.value })
                                  }
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {profile.userType === "client" ? (
                          <>
                            <div>
                              <span className="font-medium">Concerns:</span>{" "}
                              {profile.profileData.concerns?.join(", ")}
                            </div>
                            <div>
                              <span className="font-medium">Session Format:</span>{" "}
                              {profile.profileData.sessionFormat}
                            </div>
                            <div>
                              <span className="font-medium">Availability:</span>{" "}
                              {profile.profileData.availability}
                            </div>
                            <div>
                              <span className="font-medium">Previous Therapy:</span>{" "}
                              {profile.profileData.previousTherapy ? "Yes" : "No"}
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <span className="font-medium">Specialisations:</span>{" "}
                              {Array.isArray(profile.profileData.specialisations)
                                ? profile.profileData.specialisations.join(", ")
                                : profile.profileData.specialisations || "Not specified"}
                            </div>
                            <div>
                              <span className="font-medium">Experience:</span>{" "}
                              {profile.profileData.experience} years
                            </div>
                            <div>
                              <span className="font-medium">Credentials:</span>{" "}
                              {typeof profile.profileData.credentials === "object"
                                ? profile.profileData.credentials?.licenses?.join(", ") ||
                                  "Licenced Clinical Psychologist"
                                : profile.profileData.credentials ||
                                  "Licenced Clinical Psychologist"}
                            </div>
                            <div>
                              <span className="font-medium">Session Rate:</span> £
                              {profile.profileData.sessionRate}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {profile.status === "ai_reviewed" && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => approveProfileMutation.mutate({ profileId: profile.id })}
                        disabled={approveProfileMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => {
                          const notes = prompt("Rejection reason:");
                          if (notes) rejectProfileMutation.mutate({ profileId: profile.id, notes });
                        }}
                        disabled={rejectProfileMutation.isPending}
                        variant="destructive"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                      <Button variant="outline">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Contact User
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="therapist-applications" className="space-y-6">
          <TherapistApplicationReview />
        </TabsContent>

        <TabsContent value="matching-suggestions" className="space-y-6">
          <div className="space-y-4">
            {displaySuggestions.map((suggestion) => (
              <Card key={suggestion.id} className="border-2">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">AI Match Suggestion</h3>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800">
                          Compatibility: {suggestion.compatibilityScore}%
                        </Badge>
                        <Badge className={getStatusColor(suggestion.status)}>
                          {suggestion.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(suggestion.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    {/* Client Info */}
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-medium text-hive-purple mb-2">Client</h4>
                      <p className="font-semibold">
                        {suggestion.clientProfile.userData.firstName}{" "}
                        {suggestion.clientProfile.userData.lastName}
                      </p>
                      <p className="text-sm text-hive-black">
                        {suggestion.clientProfile.userData.email}
                      </p>
                      <div className="mt-2 text-sm">
                        <p>
                          <strong>Concerns:</strong>{" "}
                          {suggestion.clientProfile.profileData.concerns?.join(", ")}
                        </p>
                        <p>
                          <strong>Format:</strong>{" "}
                          {suggestion.clientProfile.profileData.sessionFormat}
                        </p>
                      </div>
                    </div>

                    {/* Therapist Info */}
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-medium text-purple-900 mb-2">Therapist</h4>
                      <p className="font-semibold">
                        {suggestion.therapistProfile.userData.firstName}{" "}
                        {suggestion.therapistProfile.userData.lastName}
                      </p>
                      <p className="text-sm text-purple-700">
                        {suggestion.therapistProfile.userData.email}
                      </p>
                      <div className="mt-2 text-sm">
                        <p>
                          <strong>Specialisations:</strong>{" "}
                          {Array.isArray(suggestion.therapistProfile.profileData.specialisations)
                            ? suggestion.therapistProfile.profileData.specialisations.join(", ")
                            : suggestion.therapistProfile.profileData.specialisations ||
                              "Not specified"}
                        </p>
                        <p>
                          <strong>Experience:</strong>{" "}
                          {suggestion.therapistProfile.profileData.experience} years
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg mb-4">
                    <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      AI Matching Reasoning
                    </h4>
                    <p className="text-green-800 text-sm">{suggestion.aiReasoning}</p>
                  </div>

                  {suggestion.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => approveMatchMutation.mutate({ matchId: suggestion.id })}
                        disabled={approveMatchMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Match
                      </Button>
                      <Button
                        onClick={() => {
                          const notes = prompt("Rejection reason:");
                          if (notes) {
                            // Handle rejection
                          }
                        }}
                        variant="destructive"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Match
                      </Button>
                      <Button variant="outline">
                        <Edit className="w-4 h-4 mr-2" />
                        Modify Match
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="system-settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Matching Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minScore">Minimum AI Score for Auto-Approval</Label>
                  <Input id="minScore" type="number" defaultValue="85" min="0" max="100" />
                </div>
                <div>
                  <Label htmlFor="maxMatches">Maximum Matches per Client</Label>
                  <Input id="maxMatches" type="number" defaultValue="3" min="1" max="10" />
                </div>
              </div>

              <div>
                <Label htmlFor="reviewPrompt">AI Review Prompt Template</Label>
                <Textarea
                  id="reviewPrompt"
                  defaultValue="Analyse this user profile for therapeutic matching compatibility. Consider specialisations, experience, concerns, and availability."
                  rows={4}
                />
              </div>

              <Button className="bg-hive-purple hover:bg-hive-purple/90">Save Configuration</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Analysis Modal */}
      <AIAnalysisModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        analysisResult={aiAnalysisResult}
        clientName="Emma Thompson"
        therapistName="Dr. James Mitchell"
      />
    </div>
  );
}
