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
  Lightbulb,
  TrendingUp,
  FileText,
  MessageSquare,
  BarChart3,
  Clock,
  Target,
  AlertCircle,
  CheckCircle,
  Star,
  Zap,
  BookOpen,
  Users,
  PieChart,
  Activity,
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  X,
  PrinterIcon,
} from "lucide-react";
import type { User } from "@shared/schema";

interface TherapistAiAssistantProps {
  user: User;
}

interface SessionAnalysis {
  sessionId: string;
  clientName: string;
  date: string;
  duration: number;
  aiInsights: {
    emotionalState: string;
    keyThemes: string[];
    progressMarkers: string[];
    concerningPatterns: string[];
    recommendations: string[];
    disclaimer: string;
  };
  sessionNotes: string;
  actionItems: string[];
}

interface TherapyRecommendation {
  id: string;
  clientId: string;
  clientName: string;
  condition: string;
  severity: "mild" | "moderate" | "severe";
  aiRecommendations: {
    primaryApproach: string;
    techniques: string[];
    sessionFrequency: string;
    expectedOutcomes: string[];
    timeframe: string;
    additionalResources: string[];
    warningSignsToWatch: string[];
  };
  disclaimer: string;
  lastUpdated: string;
}

interface ProgressInsight {
  clientId: string;
  clientName: string;
  overallProgress: number;
  trendDirection: "improving" | "stable" | "declining";
  keyMetrics: {
    sessionAttendance: number;
    homeworkCompletion: number;
    goalAchievement: number;
    symptomReduction: number;
  };
  aiAnalysis: {
    strengths: string[];
    challenges: string[];
    nextSteps: string[];
    riskFactors: string[];
  };
  lastAssessment: string;
}

interface AiChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: string;
  context?: string;
}

export default function TherapistAiAssistant({ user }: TherapistAiAssistantProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("session-analysis");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [chatInput, setChatInput] = useState("");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);

  const { data: sessionAnalyses = [] } = useQuery<SessionAnalysis[]>({
    queryKey: ["/api/therapist/ai/session-analyses"],
    retry: false,
  });

  const { data: treatmentRecommendations = [] } = useQuery<TherapyRecommendation[]>({
    queryKey: ["/api/therapist/ai/treatment-recommendations"],
    retry: false,
  });

  const { data: progressInsights = [] } = useQuery<ProgressInsight[]>({
    queryKey: ["/api/therapist/ai/progress-insights"],
    retry: false,
  });

  const { data: chatHistory = [] } = useQuery<AiChatMessage[]>({
    queryKey: ["/api/therapist/ai/chat-history"],
    retry: false,
  });

  // State for showing new analysis results on page
  const [newAnalysisResults, setNewAnalysisResults] = useState<SessionAnalysis | null>(null);

  // State for showing newly generated therapy plan on same page
  const [generatedPlan, setGeneratedPlan] = useState<TherapyRecommendation | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const generateAnalysisMutation = useMutation({
    mutationFn: async (sessionData: any) => {
      return await apiRequest("POST", "/api/therapist/ai/analyse-session", sessionData);
    },
    onSuccess: (newAnalysis) => {
      // Show new analysis results on the page
      setNewAnalysisResults(newAnalysis);

      // Add the new analysis to the existing list
      queryClient.setQueryData(["/api/therapist/ai/session-analyses"], (old: any) => {
        return old ? [newAnalysis, ...old] : [newAnalysis];
      });

      toast({
        title: "AI Analysis Complete",
        description: "Session analysis has been generated with insights and recommendations.",
      });
    },
    onError: () => {
      toast({
        title: "Analysis Failed",
        description: "Unable to generate AI analysis. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateRecommendationsMutation = useMutation({
    mutationFn: async (clientData: any) => {
      return await apiRequest("POST", "/api/therapist/ai/generate-recommendations", clientData);
    },
    onSuccess: (newRecommendation) => {
      // Add the new recommendation to the existing list
      queryClient.setQueryData(["/api/therapist/ai/treatment-recommendations"], (old: any) => {
        return old ? [newRecommendation, ...old] : [newRecommendation];
      });

      toast({
        title: "Recommendations Generated",
        description: "AI-powered therapy recommendations have been created.",
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Unable to generate recommendations. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sendChatMessageMutation = useMutation({
    mutationFn: async (data: { message: string; userMessage: AiChatMessage }) => {
      const res = await apiRequest("POST", "/api/therapist/ai/chat", {
        message: data.message,
        context: selectedClient,
      });
      const response = await res.json();
      return { response, userMessage: data.userMessage };
    },
    onSuccess: ({ response, userMessage }) => {
      // Add both user message and AI response to chat history
      queryClient.setQueryData(["/api/therapist/ai/chat-history"], (old: any) => {
        const aiMessage = {
          id: response.id,
          type: "ai" as const,
          content: response.content,
          timestamp: response.timestamp,
          context: response.context,
        };
        return old ? [...old, userMessage, aiMessage] : [userMessage, aiMessage];
      });

      toast({
        title: "Message Sent",
        description: "AI response received successfully.",
      });
    },
    onError: (error: any) => {
      // Check for privacy violation
      if (error.message?.includes("Privacy violation detected")) {
        toast({
          title: "Privacy Violation Detected",
          description: "Please remove identifying information and use anonymised scenarios only.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Chat Failed",
          description:
            "Unable to send message to Chat assistant. Please ensure professional language is used.",
          variant: "destructive",
        });
      }
    },
  });

  // Generate therapy plan mutation for same-page display
  const generatePlanMutation = useMutation({
    mutationFn: async (planData: { clientId: string; condition: string; severity: string }) => {
      return await apiRequest("POST", "/api/therapist/ai/generate-therapy-plan", planData);
    },
    onSuccess: (newPlan) => {
      setGeneratedPlan(newPlan);
      setShowPlanModal(true);

      // Also add to the recommendations list
      queryClient.setQueryData(["/api/therapist/ai/treatment-recommendations"], (old: any) => {
        return old ? [newPlan, ...old] : [newPlan];
      });

      toast({
        title: "Therapy Plan Generated",
        description: `New therapy plan created for ${newPlan.clientName}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate therapy plan",
        variant: "destructive",
      });
    },
  });

  const generateInsightsMutation = useMutation({
    mutationFn: async (analysisType: string) => {
      return await apiRequest("POST", "/api/therapist/ai/generate-insights", { analysisType });
    },
    onSuccess: (result) => {
      toast({
        title: "Insights Generated",
        description: `New ${result.analysisType} analysis completed successfully`,
      });

      // Invalidate and refetch all AI data
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/ai/session-analyses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/ai/treatment-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/ai/progress-insights"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate insights",
        variant: "destructive",
      });
    },
  });

  // PDF Export function
  const exportToPDF = (plan: TherapyRecommendation) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const recommendations = plan.aiRecommendations || {};

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Therapy Plan - ${plan.clientName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #8E00B2; padding-bottom: 20px; }
            .header h1 { color: #8E00B2; margin-bottom: 10px; }
            .plan-section { margin-bottom: 25px; page-break-inside: avoid; }
            .plan-section h3 { color: #8E00B2; border-bottom: 2px solid #8E00B2; padding-bottom: 5px; margin-bottom: 10px; }
            .technique-list { margin-left: 20px; }
            .technique-list li { margin-bottom: 8px; }
            .severity-badge { 
              display: inline-block; 
              padding: 4px 12px; 
              border-radius: 20px; 
              font-weight: bold;
              ${
                plan.severity === "mild"
                  ? "background: #d4edda; color: #155724;"
                  : plan.severity === "moderate"
                    ? "background: #fff3cd; color: #856404;"
                    : "background: #f8d7da; color: #721c24;"
              }
            }
            .confidence-bar { 
              background: #e9ecef; 
              height: 10px; 
              border-radius: 5px; 
              margin-top: 5px;
            }
            .confidence-fill { 
              background: #8E00B2; 
              height: 100%; 
              border-radius: 5px; 
              width: ${plan.confidence || 0}%;
            }
            .footer { 
              margin-top: 40px; 
              padding-top: 20px;
              border-top: 1px solid #dee2e6;
              font-size: 12px; 
              color: #666; 
            }
            @media print { 
              body { margin: 0; } 
              .header { page-break-after: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Therapy Plan</h1>
            <h2>${plan.clientName}</h2>
            <p><strong>Generated:</strong> ${new Date(plan.lastUpdated).toLocaleDateString("en-GB")}</p>
            <p><strong>Plan ID:</strong> ${plan.id}</p>
          </div>
          
          <div class="plan-section">
            <h3>Condition & Severity Assessment</h3>
            <p><strong>Primary Condition:</strong> ${plan.condition}</p>
            <p><strong>Severity Level:</strong> <span class="severity-badge">${plan.severity?.toUpperCase() || "NOT SPECIFIED"}</span></p>
          </div>
          
          <div class="plan-section">
            <h3>Primary Therapeutic Approach</h3>
            <p>${recommendations.primaryApproach || "Approach details will be provided"}</p>
          </div>
          
          <div class="plan-section">
            <h3>Recommended Therapeutic Techniques</h3>
            <ul class="technique-list">
              ${(recommendations.techniques || []).map((tech) => `<li>${tech}</li>`).join("")}
            </ul>
          </div>
          
          <div class="plan-section">
            <h3>Session Frequency & Structure</h3>
            <p>${recommendations.sessionFrequency || "Frequency to be determined"}</p>
          </div>
          
          <div class="plan-section">
            <h3>Expected Treatment Outcomes</h3>
            <ul class="technique-list">
              ${(recommendations.expectedOutcomes || []).map((outcome) => `<li>${outcome}</li>`).join("")}
            </ul>
          </div>
          
          <div class="plan-section">
            <h3>Treatment Timeframe</h3>
            <p>${recommendations.timeframe || "Timeframe to be determined"}</p>
          </div>
          
          <div class="plan-section">
            <h3>Additional Resources & Support</h3>
            <ul class="technique-list">
              ${(recommendations.additionalResources || []).map((resource) => `<li>${resource}</li>`).join("")}
            </ul>
          </div>
          
          <div class="plan-section">
            <h3>Warning Signs & Risk Factors</h3>
            <ul class="technique-list">
              ${(recommendations.warningSignsToWatch || []).map((sign) => `<li>${sign}</li>`).join("")}
            </ul>
          </div>
          
          <div class="plan-section">
            <h3>Plan Confidence Assessment</h3>
            <div class="disclaimer-section">
              <p style="background: #fff3cd; padding: 10px; border-radius: 5px;">
                <strong>⚠️ Important Disclaimer:</strong> This therapy plan was generated using AI assistance and must be reviewed, validated, and personalised by a qualified therapist before implementation.
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Important:</strong> This therapy plan was generated using AI assistance and must be reviewed, validated, and personalised by a qualified therapist before implementation.</p>
            <p><strong>Generated by:</strong> Hive Wellness Chat Assistant | <strong>Date:</strong> ${new Date().toLocaleDateString("en-GB")}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "mild":
        return "bg-green-100 text-green-800";
      case "moderate":
        return "bg-yellow-100 text-yellow-800";
      case "severe":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "improving":
        return "text-green-600";
      case "stable":
        return "text-blue-600";
      case "declining":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  // Demo data for Chat assistant
  const demoSessionAnalyses: SessionAnalysis[] = [
    {
      sessionId: "session-1",
      clientName: "Emma J.",
      date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      duration: 55,
      aiInsights: {
        emotionalState: "Anxious but engaged",
        keyThemes: ["Work stress", "Relationship concerns", "Sleep difficulties"],
        progressMarkers: ["Better emotional awareness", "Using coping strategies"],
        concerningPatterns: ["Increased rumination", "Avoidance behaviours"],
        recommendations: [
          "Focus on mindfulness techniques for rumination",
          "Explore relationship communication patterns",
          "Introduce sleep hygiene psychoeducation",
        ],
        disclaimer: "AI analysis for reference only - requires clinical validation",
      },
      sessionNotes:
        "Client presented with moderate anxiety levels. Demonstrated good insight into triggers.",
      actionItems: [
        "Practice mindfulness daily",
        "Complete thought record",
        "Sleep diary for one week",
      ],
    },
    {
      sessionId: "session-2",
      clientName: "Michael C.",
      date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      duration: 60,
      aiInsights: {
        emotionalState: "Depressed mood improving",
        keyThemes: ["Career transitions", "Self-worth", "Social connections"],
        progressMarkers: ["Increased activity level", "Improved mood tracking"],
        concerningPatterns: ["Social isolation", "Negative self-talk"],
        recommendations: [
          "Continue behavioural activation strategies",
          "Work on cognitive restructuring for self-worth",
          "Gradually increase social activities",
        ],
        disclaimer: "AI suggestions require professional evaluation",
      },
      sessionNotes:
        "Notable improvement in mood and energy. Client completing homework assignments.",
      actionItems: [
        "Schedule one social activity",
        "Continue mood tracking",
        "Practice positive self-talk",
      ],
    },
  ];

  const demoTherapyRecommendations: TherapyRecommendation[] = [
    {
      id: "rec-1",
      clientId: "client-1",
      clientName: "Emma J.",
      condition: "Generalized Anxiety Disorder",
      severity: "moderate",
      aiRecommendations: {
        primaryApproach: "Cognitive Behavioural Therapy (CBT)",
        techniques: [
          "Cognitive restructuring",
          "Exposure therapy",
          "Mindfulness-based interventions",
        ],
        sessionFrequency: "Weekly for 12-16 sessions",
        expectedOutcomes: [
          "Reduced anxiety symptoms",
          "Improved coping skills",
          "Better sleep quality",
        ],
        timeframe: "3-4 months",
        additionalResources: ["CBT workbook", "Meditation app", "Anxiety support group"],
        warningSignsToWatch: [
          "Panic attacks",
          "Avoidance escalation",
          "Sleep disturbance worsening",
        ],
      },
      disclaimer: "AI recommendations require clinical validation",
      lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const demoProgressInsights: ProgressInsight[] = [
    {
      clientId: "client-1",
      clientName: "Emma J.",
      overallProgress: 78,
      trendDirection: "improving",
      keyMetrics: {
        sessionAttendance: 95,
        homeworkCompletion: 85,
        goalAchievement: 70,
        symptomReduction: 65,
      },
      aiAnalysis: {
        strengths: ["High engagement", "Consistent attendance", "Good insight"],
        challenges: ["Perfectionist tendencies", "Work stress management"],
        nextSteps: ["Advanced CBT techniques", "Stress management skills", "Relapse prevention"],
        riskFactors: ["Work pressure", "Seasonal changes", "Relationship stress"],
      },
      lastAssessment: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const demoChatHistory: AiChatMessage[] = [
    {
      id: "msg-1",
      type: "user",
      content: "What are the best techniques for working with anxiety in teenagers?",
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: "msg-2",
      type: "ai",
      content:
        "For teenage anxiety, I recommend a combination of CBT techniques adapted for adolescents: 1) Psychoeducation about anxiety and development, 2) Cognitive restructuring with age-appropriate language, 3) Behavioural experiments and exposure therapy, 4) Mindfulness and relaxation techniques, 5) Family involvement when appropriate. Consider their developmental stage and use collaborative approaches.",
      timestamp: new Date(Date.now() - 29 * 60 * 1000).toISOString(),
      context: "General clinical guidance",
    },
  ];

  const displayAnalyses = sessionAnalyses.length > 0 ? sessionAnalyses : demoSessionAnalyses;
  const displayRecommendations =
    treatmentRecommendations.length > 0 ? treatmentRecommendations : demoTherapyRecommendations;
  const displayInsights = progressInsights.length > 0 ? progressInsights : demoProgressInsights;
  const displayChat = chatHistory.length > 0 ? chatHistory : demoChatHistory;

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      const message = chatInput.trim();

      // Create user message with proper timestamp
      const userMessage = {
        id: `user-${Date.now()}`,
        type: "user" as const,
        content: message,
        timestamp: new Date().toISOString(),
      };

      setChatInput("");
      sendChatMessageMutation.mutate({ message, userMessage });
    }
  };

  const handleExportReport = () => {
    const reportData = {
      reportType: "AI Therapy Assistant Analysis",
      platformName: "Hive Wellness Therapy Portal",
      generatedAt: new Date().toISOString(),
      therapistName: user.firstName + " " + user.lastName,
      therapistId: user.id,
      summary: {
        totalAnalyses: displayAnalyses.length,
        totalRecommendations: displayRecommendations.length,
        totalInsights: displayInsights.length,
        reportGenerated: new Date().toLocaleDateString("en-GB"),
      },
      sessionAnalyses: displayAnalyses.map((analysis) => ({
        sessionId: analysis.sessionId,
        clientName: analysis.clientName,
        date: analysis.date,
        duration: analysis.duration,
        insights: analysis.aiInsights,
        notes: analysis.sessionNotes,
        actionItems: analysis.actionItems,
      })),
      therapyRecommendations: displayRecommendations.map((rec) => ({
        id: rec.id,
        clientName: rec.clientName,
        condition: rec.condition,
        severity: rec.severity,
        disclaimer: rec.disclaimer,
        lastUpdated: rec.lastUpdated,
      })),
      progressInsights: displayInsights.map((insight) => ({
        clientId: insight.clientId,
        clientName: insight.clientName,
        overallProgress: insight.overallProgress,
        strengths: insight.strengths,
        areasForImprovement: insight.areasForImprovement,
        riskFactors: insight.riskFactors,
        lastAssessment: insight.lastAssessment,
      })),
    };

    // Create properly formatted JSON with safe content
    const jsonContent = JSON.stringify(reportData, null, 2);

    // Create blob with explicit JSON MIME type and charset
    const blob = new Blob([jsonContent], {
      type: "application/json;charset=utf-8;",
    });

    // Generate secure filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
    const filename = `hive-wellness-ai-report-${timestamp}.json`;

    // Create download link with security attributes
    const url = window.URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = filename;
    downloadLink.style.display = "none";
    downloadLink.setAttribute("rel", "noopener");
    downloadLink.setAttribute("target", "_self");

    // Perform secure download
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Clean up immediately
    setTimeout(() => {
      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(url);
    }, 100);

    toast({
      title: "AI Report Exported Successfully",
      description: `Therapy analysis report "${filename}" has been downloaded safely.`,
    });
  };

  const handleGenerateInsights = () => {
    generateInsightsMutation.mutate("comprehensive");
  };

  return (
    <div className="space-y-6">
      {/* Privacy and AI Disclaimer Banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-yellow-800 mb-2">
              ⚠️ Important: AI Clinical Support Guidelines
            </h3>
            <div className="space-y-1 text-sm text-yellow-700">
              <p>
                <strong>Privacy:</strong> This tool is not for sharing confidential or identifying
                personal health information. All interactions are logged and monitored.
              </p>
              <p>
                <strong>AI Limitations:</strong> All AI recommendations and analyses require
                professional clinical validation and must be reviewed by qualified therapists before
                implementation.
              </p>
              <p>
                <strong>Professional Judgement:</strong> AI suggestions are for reference only and
                do not replace clinical expertise, professional assessment, or therapeutic
                judgement.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-century font-bold text-hive-black">
            Chat Therapy Assistant
          </h2>
          <p className="text-gray-600 mt-2">
            Chat-powered insights and recommendations for your therapy practice
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button
            className="bg-hive-purple hover:bg-hive-purple/90"
            onClick={handleGenerateInsights}
            disabled={generateInsightsMutation.isPending}
          >
            <Zap className="w-4 h-4 mr-2" />
            {generateInsightsMutation.isPending ? "Generating..." : "Generate Insights"}
          </Button>
        </div>
      </div>

      {/* Chat Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Sessions Analysed</p>
                <p className="text-2xl font-bold text-purple-900">{displayAnalyses.length}</p>
                <p className="text-xs text-purple-600">This month</p>
              </div>
              <Brain className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Chat Confidence</p>
                <p className="text-2xl font-bold text-green-900">
                  {displayAnalyses.length > 0
                    ? Math.round(
                        displayAnalyses.reduce(
                          (acc, a) => acc + (a.aiInsights?.confidenceScore || 0),
                          0
                        ) / displayAnalyses.length
                      )
                    : 0}
                  %
                </p>
                <p className="text-xs text-green-600">Average score</p>
              </div>
              <Target className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Recommendations</p>
                <p className="text-2xl font-bold text-purple-900">
                  {displayRecommendations.length}
                </p>
                <p className="text-xs text-purple-600">Active plans</p>
              </div>
              <Lightbulb className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Client Progress</p>
                <p className="text-2xl font-bold text-orange-900">
                  {displayInsights.length > 0
                    ? Math.round(
                        displayInsights.reduce((acc, i) => acc + (i.overallProgress || 0), 0) /
                          displayInsights.length
                      )
                    : 0}
                  %
                </p>
                <p className="text-xs text-orange-600">Average improvement</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Analysis Results Container */}
      {newAnalysisResults && (
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              New Session Analysis Generated
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-green-700">Client</p>
                <p className="text-lg font-semibold text-green-900">
                  {newAnalysisResults.clientName}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Session Duration</p>
                <p className="text-lg font-semibold text-green-900">
                  {newAnalysisResults.duration} minutes
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-green-700">Emotional State</p>
                <p className="text-gray-800">
                  {newAnalysisResults.aiInsights?.emotionalState || "Not available"}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-green-700">Key Themes</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(newAnalysisResults.aiInsights?.keyThemes || []).map((theme, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-green-100 text-green-800">
                      {theme}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-green-700">AI Recommendations</p>
                <ul className="list-disc list-inside text-gray-800 mt-1 space-y-1">
                  {(newAnalysisResults.aiInsights?.recommendations || []).map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-green-200">
                <div>
                  <p className="text-sm font-medium text-green-700">Confidence Score</p>
                  <p className="text-2xl font-bold text-green-900">
                    {newAnalysisResults.aiInsights?.confidenceScore || 0}%
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewAnalysisResults(null)}
                  className="text-green-700 border-green-300 hover:bg-green-50"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="session-analysis">Session Analysis</TabsTrigger>
          <TabsTrigger value="therapy-plans">Therapy Plans</TabsTrigger>
          <TabsTrigger value="progress-tracking">Progress Tracking</TabsTrigger>
          <TabsTrigger value="ai-chat">AI Chat Assistant</TabsTrigger>
          <TabsTrigger value="insights">Clinical Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="session-analysis" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Recent Session Analyses</h3>
            <Button
              onClick={() => generateAnalysisMutation.mutate({})}
              disabled={generateAnalysisMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Brain className="w-4 h-4 mr-2" />
              Analyse Session
            </Button>
          </div>

          <div className="space-y-4">
            {displayAnalyses.map((analysis) => (
              <Card key={analysis.sessionId} className="border-2">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-lg">{analysis.clientName}</h4>
                      <p className="text-gray-600">
                        {analysis.date && !isNaN(new Date(analysis.date).getTime())
                          ? new Date(analysis.date).toLocaleDateString("en-GB")
                          : "Recently"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary">{analysis.duration} minutes</Badge>
                        <Badge className="bg-blue-100 text-blue-800">
                          AI Confidence: {analysis.aiInsights?.confidenceScore || 0}%
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-100 text-green-800">
                        {analysis.aiInsights?.emotionalState || "Not available"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Key Themes</h5>
                        <div className="flex flex-wrap gap-2">
                          {(analysis.aiInsights?.keyThemes || []).map((theme) => (
                            <Badge key={theme} variant="outline">
                              {theme}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-green-800 mb-2">Progress Markers</h5>
                        <ul className="text-sm space-y-1">
                          {(analysis.aiInsights?.progressMarkers || []).map((marker, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              {marker}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {(analysis.aiInsights?.concerningPatterns || []).length > 0 && (
                        <div>
                          <h5 className="font-medium text-red-800 mb-2">Areas of Concern</h5>
                          <ul className="text-sm space-y-1">
                            {(analysis.aiInsights?.concerningPatterns || []).map((pattern, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                                {pattern}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-purple-800 mb-2">AI Recommendations</h5>
                        <ul className="text-sm space-y-1">
                          {(analysis.aiInsights?.recommendations || []).map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Lightbulb className="w-4 h-4 text-purple-600 mt-0.5" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Action Items</h5>
                        <ul className="text-sm space-y-1">
                          {(analysis.actionItems || []).map((item, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-gray-600" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-1">Session Notes</h5>
                    <p className="text-sm text-gray-700">
                      {analysis.sessionNotes || "No session notes available"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="therapy-plans" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">AI Therapy Recommendations</h3>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  generatePlanMutation.mutate({
                    clientId: "client-1",
                    condition: "Generalised Anxiety Disorder",
                    severity: "moderate",
                  });
                }}
                disabled={generatePlanMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {generatePlanMutation.isPending ? "Generating..." : "Generate Plan"}
              </Button>
            </div>
          </div>

          {/* Show newly generated plan modal */}
          {showPlanModal && generatedPlan && (
            <Card className="border-2 border-purple-500 bg-purple-50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-purple-900">✨ New Therapy Plan Generated</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToPDF(generatedPlan)}
                      className="text-purple-700 border-purple-300 hover:bg-purple-100"
                    >
                      <PrinterIcon className="w-4 h-4 mr-1" />
                      Print PDF
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPlanModal(false)}
                      className="text-purple-600 hover:bg-purple-100"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-lg text-purple-900">
                        {generatedPlan.clientName}
                      </h4>
                      <p className="text-purple-700">{generatedPlan.condition}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getSeverityColor(generatedPlan.severity)}>
                          {generatedPlan.severity}
                        </Badge>
                        <Badge className="bg-purple-200 text-purple-800">
                          Confidence: {generatedPlan.confidence}%
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-purple-900 mb-2">Primary Approach</h5>
                      <p className="text-sm text-purple-800 bg-white p-3 rounded border">
                        {generatedPlan.aiRecommendations?.primaryApproach ||
                          "Approach details will be available shortly"}
                      </p>
                    </div>

                    <div>
                      <h5 className="font-medium text-purple-900 mb-2">Session Frequency</h5>
                      <p className="text-sm text-purple-800 bg-white p-3 rounded border">
                        {generatedPlan.aiRecommendations?.sessionFrequency ||
                          "Frequency details will be available shortly"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-purple-900 mb-2">Key Techniques</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(generatedPlan.aiRecommendations?.techniques || [])
                        .slice(0, 4)
                        .map((technique, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-sm text-purple-800 bg-white p-2 rounded border"
                          >
                            <CheckCircle className="w-4 h-4 text-purple-600" />
                            {technique}
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-center pt-3 border-t border-purple-200">
                    <Button
                      onClick={() => exportToPDF(generatedPlan)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Complete Plan as PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {displayRecommendations.map((recommendation) => (
              <Card key={recommendation.id} className="border-2">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-lg">{recommendation.clientName}</h4>
                      <p className="text-gray-600">{recommendation.condition}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getSeverityColor(recommendation.severity)}>
                          {recommendation.severity}
                        </Badge>
                        <Badge className="bg-purple-100 text-purple-800">
                          Confidence: {recommendation.confidence}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToPDF(recommendation)}
                        className="text-purple-700 border-purple-300 hover:bg-purple-50"
                      >
                        <PrinterIcon className="w-4 h-4 mr-1" />
                        Print PDF
                      </Button>
                      <div className="text-sm text-gray-500">
                        Updated:{" "}
                        {recommendation.lastUpdated &&
                        !isNaN(new Date(recommendation.lastUpdated).getTime())
                          ? new Date(recommendation.lastUpdated).toLocaleDateString("en-GB")
                          : "Recently"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Primary Approach</h5>
                        <p className="text-sm font-medium text-blue-700">
                          {recommendation.aiRecommendations?.primaryApproach ||
                            "Approach details available"}
                        </p>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Recommended Techniques</h5>
                        <div className="space-y-1">
                          {(recommendation.aiRecommendations?.techniques || []).map(
                            (technique, idx) => (
                              <Badge key={idx} variant="outline" className="mr-2 mb-1">
                                {technique}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Session Plan</h5>
                        <p className="text-sm text-gray-700">
                          <strong>Frequency:</strong>{" "}
                          {recommendation.aiRecommendations?.sessionFrequency || "To be determined"}
                        </p>
                        <p className="text-sm text-gray-700">
                          <strong>Timeframe:</strong>{" "}
                          {recommendation.aiRecommendations?.timeframe || "To be determined"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-green-800 mb-2">Expected Outcomes</h5>
                        <ul className="text-sm space-y-1">
                          {(recommendation.aiRecommendations?.expectedOutcomes || []).map(
                            (outcome, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                {outcome}
                              </li>
                            )
                          )}
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-medium text-orange-800 mb-2">Warning Signs</h5>
                        <ul className="text-sm space-y-1">
                          {(recommendation.aiRecommendations?.warningSignsToWatch || []).map(
                            (sign, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-orange-600" />
                                {sign}
                              </li>
                            )
                          )}
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Additional Resources</h5>
                        <ul className="text-sm space-y-1">
                          {(recommendation.aiRecommendations?.additionalResources || []).map(
                            (resource, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-gray-600" />
                                {resource}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="progress-tracking" className="space-y-6">
          <h3 className="text-xl font-semibold">Client Progress Insights</h3>

          <div className="space-y-4">
            {displayInsights.map((insight) => (
              <Card key={insight.clientId} className="border-2">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-lg">{insight.clientName}</h4>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-blue-100 text-blue-800">
                          Overall Progress: {insight.overallProgress}%
                        </Badge>
                        <Badge
                          className={
                            insight.trendDirection === "improving"
                              ? "bg-green-100 text-green-800"
                              : insight.trendDirection === "stable"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-red-100 text-red-800"
                          }
                        >
                          {insight.trendDirection}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      Last Assessment:{" "}
                      {insight.lastAssessment && !isNaN(new Date(insight.lastAssessment).getTime())
                        ? new Date(insight.lastAssessment).toLocaleDateString("en-GB")
                        : "Recently"}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-3">Key Metrics</h5>
                      <div className="space-y-3">
                        {Object.entries(insight.keyMetrics).map(([metric, value]) => (
                          <div key={metric} className="flex items-center justify-between">
                            <span className="text-sm capitalize">
                              {metric.replace(/([A-Z])/g, " $1").trim()}:
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-purple-600 h-2 rounded-full"
                                  style={{ width: `${value}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium w-10">{value}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-green-800 mb-2">Strengths</h5>
                        <ul className="text-sm space-y-1">
                          {insight.aiAnalysis.strengths.map((strength, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-green-600" />
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-medium text-orange-800 mb-2">Challenges</h5>
                        <ul className="text-sm space-y-1">
                          {insight.aiAnalysis.challenges.map((challenge, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-orange-600" />
                              {challenge}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-medium text-blue-800 mb-2">Next Steps</h5>
                        <ul className="text-sm space-y-1">
                          {insight.aiAnalysis.nextSteps.map((step, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-blue-600" />
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ai-chat" className="space-y-6">
          {/* Privacy Reminder for Chat */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-800">
                <strong>Privacy Reminder:</strong> This tool is not for sharing confidential or
                identifying personal health information. Use anonymised scenarios and general
                clinical questions only.
              </p>
            </div>
          </div>

          <Card className="h-96">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                AI Clinical Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {displayChat.map((message, index) => (
                  <div
                    key={message.id || `message-${index}`}
                    className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-sm p-3 rounded-lg ${
                        message.type === "user"
                          ? "bg-hive-purple text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp && !isNaN(new Date(message.timestamp).getTime())
                          ? new Date(message.timestamp).toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Just now"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about clinical techniques using anonymised scenarios only..."
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || sendChatMessageMutation.isPending}
                >
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Practice Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Most Common Conditions:</span>
                  </div>
                  <div className="space-y-2">
                    {["Anxiety Disorders", "Depression", "ADHD", "Trauma/PTSD"].map(
                      (condition, idx) => (
                        <div key={condition} className="flex items-center justify-between">
                          <span className="text-sm">{condition}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-hive-purple h-2 rounded-full"
                                style={{ width: `${100 - idx * 20}%` }}
                              ></div>
                            </div>
                            <span className="text-sm w-8">{100 - idx * 20}%</span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Therapy Effectiveness
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">84%</div>
                    <div className="text-sm text-gray-600">Average Improvement Rate</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>CBT Effectiveness:</span>
                      <span className="font-medium">92%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Mindfulness-Based:</span>
                      <span className="font-medium">87%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>EMDR:</span>
                      <span className="font-medium">89%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>AI Recommendations for Your Practice</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Clinical Efficiency</h4>
                  <p className="text-sm text-blue-800">
                    Consider incorporating more structured homework assignments. Clients with
                    regular homework completion show 23% better outcomes.
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Session Scheduling</h4>
                  <p className="text-sm text-green-800">
                    Evening sessions (6-8 PM) show highest attendance rates (96%) and client
                    engagement scores.
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">Professional Development</h4>
                  <p className="text-sm text-purple-800">
                    Based on your client demographics, consider training in adolescent DBT
                    techniques for improved outcomes with younger clients.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
