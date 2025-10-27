import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Brain,
  Search,
  Settings,
  RefreshCw,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Star,
  TrendingUp,
  MessageCircle,
  Calendar,
  Activity,
  Award,
  MapPin,
  User,
} from "lucide-react";

interface TherapistMatch {
  id: string;
  name: string;
  title: string;
  specialisations: string[];
  approaches: string[];
  experience: number;
  rating: number;
  location: string;
  availability: string;
  profileImage: string;
  matchScore: number;
  matchReasons: string[];
  hourlyRate: number;
  nextAvailable: string;
  languages: string[];
  verified: boolean;
}

interface ConnectingRequest {
  id: string;
  clientId: string;
  questionnaire: any;
  matches: TherapistMatch[];
  status: "pending" | "analysing" | "complete" | "approved";
  aiAnalysis: string;
  createdAt: string;
  adminNotes?: string;
}

export default function AITherapyMatching() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMatch, setSelectedMatch] = useState<TherapistMatch | null>(null);
  const [activeTab, setActiveTab] = useState("questionnaire");

  // Get user's connection request status
  const { data: connectingRequest, isLoading } = useQuery<ConnectingRequest>({
    queryKey: ["/api/connecting/request"],
    retry: false,
  });

  // Start new AI connection process
  const startConnecting = useMutation({
    mutationFn: async (questionnaireData: any) => {
      return await apiRequest("POST", "/api/connecting/start", questionnaireData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connecting/request"] });
      setActiveTab("results");
      toast({
        title: "AI Analysis Complete",
        description: "Your personalised therapist connections are ready for review.",
      });
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: "Unable to generate connections. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Request consultation with selected therapist
  const requestConsultation = useMutation({
    mutationFn: async (therapistId: string) => {
      return await apiRequest("POST", "/api/connecting/request-consultation", { therapistId });
    },
    onSuccess: () => {
      toast({
        title: "Consultation Requested",
        description: "Your consultation request has been sent to the therapist.",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-hive-purple" />
          <p className="text-gray-600">Loading your connecting status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Brain className="w-8 h-8 text-hive-purple" />
          <h2 className="text-2xl font-bold text-hive-black">AI-Powered Therapy Connecting</h2>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Our advanced AI analyses your responses and preferences to connect you with the most
          compatible therapists tailored specifically to your needs and goals.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="questionnaire">
            <MessageCircle className="w-4 h-4 mr-2" />
            Questionnaire
          </TabsTrigger>
          <TabsTrigger value="analysis" disabled={!(connectingRequest as any)?.aiAnalysis}>
            <Brain className="w-4 h-4 mr-2" />
            AI Analysis
          </TabsTrigger>
          <TabsTrigger value="results" disabled={!(connectingRequest as any)?.matches?.length}>
            <Users className="w-4 h-4 mr-2" />
            Your Connections
          </TabsTrigger>
        </TabsList>

        {/* Questionnaire Tab */}
        <TabsContent value="questionnaire" className="space-y-6">
          {!connectingRequest ? (
            <QuestionnaireForm
              onSubmit={startConnecting.mutate}
              isLoading={startConnecting.isPending}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Questionnaire Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  You've already completed the connecting questionnaire. Check your AI analysis and
                  connections!
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setActiveTab("analysis")}
                    className="bg-hive-purple text-white"
                  >
                    View AI Analysis
                  </Button>
                  <Button onClick={() => setActiveTab("results")} variant="outline">
                    View Connections
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          {(connectingRequest as any)?.aiAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-hive-purple" />
                  AI Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-gray-700 leading-relaxed">
                    {(connectingRequest as any).aiAnalysis}
                  </p>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={() => setActiveTab("results")}
                    className="bg-hive-purple text-white"
                  >
                    View Your Connections
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          {(connectingRequest as any)?.matches && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-hive-black mb-2">
                  Your Personalised Therapist Connections
                </h3>
                <p className="text-gray-600">
                  Based on AI analysis of your responses, here are your top compatible therapists
                </p>
              </div>

              <div className="grid gap-6">
                {(connectingRequest as any).matches.map((match: TherapistMatch, index: number) => (
                  <TherapistMatchCard
                    key={match.id}
                    match={match}
                    rank={index + 1}
                    onSelect={() => setSelectedMatch(match)}
                    onRequestConsultation={() => requestConsultation.mutate(match.id)}
                    isLoading={requestConsultation.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Questionnaire Form Component
function QuestionnaireForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [responses, setResponses] = useState({
    primaryConcerns: "",
    therapyGoals: "",
    preferredApproach: "",
    communicationStyle: "",
    previousTherapy: "",
    preferences: {
      gender: "",
      ageRange: "",
      experience: "",
      specialisations: [],
    },
    availability: "",
    budget: "",
    additionalNotes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(responses);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Therapy Matching Questionnaire</CardTitle>
        <p className="text-gray-600">
          Help us understand your needs to find the perfect therapist match
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sample questionnaire fields - would be expanded */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                What are your primary concerns or reasons for seeking therapy?
              </label>
              <textarea
                className="w-full p-3 border rounded-lg"
                rows={4}
                value={responses.primaryConcerns}
                onChange={(e) =>
                  setResponses((prev) => ({ ...prev, primaryConcerns: e.target.value }))
                }
                placeholder="Describe what brings you to therapy today..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                What would you like to achieve through therapy?
              </label>
              <textarea
                className="w-full p-3 border rounded-lg"
                rows={3}
                value={responses.therapyGoals}
                onChange={(e) =>
                  setResponses((prev) => ({ ...prev, therapyGoals: e.target.value }))
                }
                placeholder="Your goals and desired outcomes..."
                required
              />
            </div>

            {/* More questionnaire fields would go here */}
          </div>

          <Button type="submit" className="w-full bg-hive-purple text-white" disabled={isLoading}>
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                AI is analysing your responses...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Start AI Matching Process
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Therapist Match Card Component
function TherapistMatchCard({
  match,
  rank,
  onSelect,
  onRequestConsultation,
  isLoading,
}: {
  match: TherapistMatch;
  rank: number;
  onSelect: () => void;
  onRequestConsultation: () => void;
  isLoading: boolean;
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
      {/* Rank Badge */}
      <div className="absolute top-4 left-4 z-10">
        <Badge
          className={`text-white ${
            rank === 1
              ? "bg-yellow-500"
              : rank === 2
                ? "bg-gray-400"
                : rank === 3
                  ? "bg-amber-600"
                  : "bg-hive-purple"
          }`}
        >
          #{rank} Match
        </Badge>
      </div>

      {/* Match Score */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-hive-purple text-white px-3 py-1 rounded-full text-sm font-medium">
          {match.matchScore}% Match
        </div>
      </div>

      <CardContent className="p-6 pt-16">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 bg-hive-purple rounded-full flex items-center justify-center text-white font-bold text-xl">
            {match.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-hive-black">{match.name}</h3>
              {match.verified && <CheckCircle className="w-4 h-4 text-green-600" />}
            </div>
            <p className="text-gray-600 mb-2">{match.title}</p>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500" />
                <span>{match.rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <Award className="w-4 h-4" />
                <span>{match.experience}+ years</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{match.location}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Specialisations */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Specialisations:</p>
          <div className="flex flex-wrap gap-2">
            {match.specialisations.map((spec, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {spec}
              </Badge>
            ))}
          </div>
        </div>

        {/* Match Reasons */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Why this therapist matches you:</p>
          <ul className="space-y-1">
            {match.matchReasons.map((reason, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* Availability and Rate */}
        <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Next: {match.nextAvailable}</span>
            </div>
            <div className="text-sm text-gray-600">{formatCurrency(match.hourlyRate)}/hour</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={onSelect} variant="outline" className="flex-1">
            <User className="w-4 h-4 mr-2" />
            View Profile
          </Button>
          <Button
            onClick={onRequestConsultation}
            className="flex-1 bg-hive-purple text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Calendar className="w-4 h-4 mr-2" />
            )}
            Request Consultation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
