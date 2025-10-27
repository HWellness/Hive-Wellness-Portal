import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Heart,
  Brain,
  Activity,
  Award,
  BarChart3,
  CheckCircle,
  Clock,
  Star,
  LineChart,
  Save,
} from "lucide-react";
import type { User, WellnessMetric } from "@shared/schema";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ClientProgressProps {
  user: User;
}

interface ProgressMetrics {
  overallProgress: number;
  weeklyImprovement: number;
  goalsAchieved: number;
  totalGoals: number;
  sessionAttendance: number;
  moodScore: number;
  stressLevel: number;
  sleepQuality: number;
}

interface TherapyGoal {
  id: string;
  title: string;
  description: string;
  progress: number;
  targetDate: string;
  category: "anxiety" | "depression" | "stress" | "sleep" | "relationships" | "coping";
  status: "active" | "completed" | "paused";
}

interface SessionRecord {
  id: string;
  date: string;
  therapistName: string;
  type: "video";
  duration: number;
  notes: string;
  moodBefore: number;
  moodAfter: number;
  rating: number;
}

export default function ClientProgress({ user }: ClientProgressProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<"week" | "month" | "quarter">("month");
  const [showWellnessMetrics, setShowWellnessMetrics] = useState(true);
  const [moodScore, setMoodScore] = useState<number>(5);
  const [sleepQuality, setSleepQuality] = useState<number>(5);
  const [stressLevel, setStressLevel] = useState<number>(5);
  const [wellnessNotes, setWellnessNotes] = useState<string>("");
  const { toast } = useToast();

  // Fetch user preferences including wellness metrics setting
  const { data: userPreferences } = useQuery({
    queryKey: ["/api/client/profile", user.id],
    enabled: !!user.id,
  });

  // Fetch wellness metrics history
  const { data: wellnessMetrics = [], isLoading: isLoadingMetrics } = useQuery<WellnessMetric[]>({
    queryKey: ["/api/wellness-metrics/:userId", user.id],
    enabled: !!user.id,
  });

  // Mock data for progress metrics (replace with real API calls)
  const progressMetrics: ProgressMetrics = {
    overallProgress: 78,
    weeklyImprovement: 12,
    goalsAchieved: 4,
    totalGoals: 6,
    sessionAttendance: 85,
    moodScore: 7.2,
    stressLevel: 4.1,
    sleepQuality: 6.8,
  };

  const therapyGoals: TherapyGoal[] = [
    {
      id: "1",
      title: "Managing Anxiety",
      description: "Learn coping strategies for daily anxiety",
      progress: 85,
      targetDate: "2025-09-01",
      category: "anxiety",
      status: "active",
    },
    {
      id: "2",
      title: "Improve Sleep Quality",
      description: "Establish healthy sleep routines",
      progress: 60,
      targetDate: "2025-08-15",
      category: "sleep",
      status: "active",
    },
    {
      id: "3",
      title: "Stress Management",
      description: "Develop mindfulness practices",
      progress: 100,
      targetDate: "2025-07-30",
      category: "stress",
      status: "completed",
    },
  ];

  const sessionHistory: SessionRecord[] = [
    {
      id: "1",
      date: "2025-07-28",
      therapistName: "Dr. Sarah Wilson",
      type: "video",
      duration: 50,
      notes: "Discussed anxiety management techniques",
      moodBefore: 4,
      moodAfter: 7,
      rating: 5,
    },
    {
      id: "2",
      date: "2025-07-21",
      therapistName: "Dr. Sarah Wilson",
      type: "video",
      duration: 50,
      notes: "Worked on sleep hygiene practices",
      moodBefore: 5,
      moodAfter: 6,
      rating: 4,
    },
  ];

  // Update wellness metrics preference
  const updateWellnessMetricsMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return await apiRequest("POST", "/api/client/wellness-metrics", { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/profile"] });
      toast({
        title: "Preferences Updated",
        description: `Wellness metrics ${showWellnessMetrics ? "enabled" : "disabled"} successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Unable to update preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Submit daily wellness metrics
  const submitWellnessMetricsMutation = useMutation({
    mutationFn: async (data: {
      moodScore: number;
      sleepQuality: number;
      stressLevel: number;
      notes?: string;
    }) => {
      return await apiRequest("POST", "/api/wellness-metrics", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wellness-metrics", user.id] });
      toast({
        title: "Wellness Metrics Saved",
        description: "Your daily wellness metrics have been recorded successfully.",
      });
      // Reset form
      setMoodScore(5);
      setSleepQuality(5);
      setStressLevel(5);
      setWellnessNotes("");
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Unable to save wellness metrics. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitWellnessMetrics = () => {
    submitWellnessMetricsMutation.mutate({
      moodScore,
      sleepQuality,
      stressLevel,
      notes: wellnessNotes || undefined,
    });
  };

  // Prepare chart data from wellness metrics
  const chartData = wellnessMetrics
    .slice(0, 14)
    .reverse()
    .map((metric) => ({
      date: new Date(metric.recordedAt || "").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      mood: parseFloat(metric.moodScore || "0"),
      sleep: parseFloat(metric.sleepQuality || "0"),
      stress: parseFloat(metric.stressLevel || "0"),
    }));

  const handleWellnessMetricsToggle = (enabled: boolean) => {
    setShowWellnessMetrics(enabled);
    updateWellnessMetricsMutation.mutate(enabled);
  };

  const getCategoryColor = (category: TherapyGoal["category"]) => {
    const colors = {
      anxiety: "bg-purple-100 text-purple-800",
      depression: "bg-purple-100 text-purple-800",
      stress: "bg-purple-100 text-purple-800",
      sleep: "bg-purple-100 text-purple-800",
      relationships: "bg-purple-100 text-purple-800",
      coping: "bg-purple-100 text-purple-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-r from-hive-purple via-purple-600 to-hive-purple shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold font-century">
                  Your Progress Overview
                </h1>
              </div>
              <p className="text-purple-100 text-lg leading-relaxed max-w-2xl">
                Track your wellness journey and session progress with detailed insights and
                personalised metrics
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div
                className="group flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20 
                           hover:bg-white/30 hover:border-white/50 transition-all duration-200 cursor-pointer
                           hover:shadow-lg hover:scale-105 active:scale-95 hover:ring-2 hover:ring-white/30"
                data-testid="toggle-wellness-metrics"
              >
                <Switch
                  id="wellness-metrics"
                  checked={showWellnessMetrics}
                  onCheckedChange={handleWellnessMetricsToggle}
                  disabled={updateWellnessMetricsMutation.isPending}
                  className="data-[state=checked]:bg-white data-[state=unchecked]:bg-white/30 
                           data-[state=checked]:border-white data-[state=unchecked]:border-white/50"
                />
                <Label
                  htmlFor="wellness-metrics"
                  className="text-white font-medium cursor-pointer group-hover:text-white/90 transition-colors duration-200
                           select-none"
                >
                  Show Wellness Metrics
                </Label>
                <div className="text-white/60 group-hover:text-white/80 transition-colors duration-200">
                  <Activity className="h-4 w-4" />
                </div>
              </div>

              <div className="flex items-center gap-2 text-white/80 text-sm">
                <Clock className="h-4 w-4" />
                <span>Last updated: {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Enhanced Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-purple-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Overall Progress</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {progressMetrics.overallProgress}%
                  </p>
                </div>
                <div className="h-14 w-14 bg-gradient-to-br from-purple-500 to-hive-purple rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Progress value={progressMetrics.overallProgress} className="h-3 bg-purple-100" />
                <p className="text-xs text-purple-600 font-medium">Excellent progress this month</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-purple-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Goals Achieved</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {progressMetrics.goalsAchieved}/{progressMetrics.totalGoals}
                  </p>
                </div>
                <div className="h-14 w-14 bg-gradient-to-br from-hive-purple to-hive-purple/80 rounded-xl flex items-center justify-center shadow-lg">
                  <Target className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Progress
                  value={(progressMetrics.goalsAchieved / progressMetrics.totalGoals) * 100}
                  className="h-3 bg-purple-100"
                />
                <p className="text-xs text-purple-600 font-medium">4 of 6 goals completed</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-purple-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Session Attendance</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {progressMetrics.sessionAttendance}%
                  </p>
                </div>
                <div className="h-14 w-14 bg-gradient-to-br from-hive-purple to-hive-purple/80 rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Progress value={progressMetrics.sessionAttendance} className="h-3 bg-purple-100" />
                <p className="text-xs text-purple-600 font-medium">Consistent attendance record</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-purple-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Weekly Improvement</p>
                  <p className="text-3xl font-bold text-hive-purple">
                    +{progressMetrics.weeklyImprovement}%
                  </p>
                </div>
                <div className="h-14 w-14 bg-gradient-to-br from-hive-purple to-hive-purple/80 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <div className="h-2 w-2 bg-hive-purple rounded-full animate-pulse"></div>
                <p className="text-xs text-purple-600 font-medium">Trending upward this week</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Wellness Metrics */}
        {showWellnessMetrics && (
          <Card className="border-0 shadow-lg bg-gradient-to-r from-white to-gray-50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                Wellness Metrics Dashboard
              </CardTitle>
              <p className="text-gray-600">Your current wellness indicators and trends</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="group text-center p-6 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-100 hover:shadow-lg transition-all duration-300">
                  <div className="h-20 w-20 bg-gradient-to-br from-hive-purple to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Heart className="h-10 w-10 text-white" />
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Mood Score</p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    {progressMetrics.moodScore}/10
                  </p>
                  <div className="w-full bg-purple-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-gradient-to-r from-hive-purple to-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progressMetrics.moodScore * 10}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-purple-700 font-medium">Good range</p>
                </div>

                <div className="group text-center p-6 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-100 hover:shadow-lg transition-all duration-300">
                  <div className="h-20 w-20 bg-gradient-to-br from-hive-purple to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Brain className="h-10 w-10 text-white" />
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Stress Level</p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    {progressMetrics.stressLevel}/10
                  </p>
                  <div className="w-full bg-purple-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-gradient-to-r from-hive-purple to-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progressMetrics.stressLevel * 10}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-purple-700 font-medium">Manageable level</p>
                </div>

                <div className="group text-center p-6 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-100 hover:shadow-lg transition-all duration-300">
                  <div className="h-20 w-20 bg-gradient-to-br from-hive-purple to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Clock className="h-10 w-10 text-white" />
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Sleep Quality</p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    {progressMetrics.sleepQuality}/10
                  </p>
                  <div className="w-full bg-purple-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-gradient-to-r from-hive-purple to-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progressMetrics.sleepQuality * 10}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-purple-700 font-medium">Good quality</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="wellness" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="wellness">Daily Wellness</TabsTrigger>
            <TabsTrigger value="goals">Therapy Goals</TabsTrigger>
            <TabsTrigger value="sessions">Session History</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="wellness" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Update Form */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-purple-600" />
                    Update Daily Wellness
                  </CardTitle>
                  <CardDescription>
                    Track how you're feeling today. This helps monitor your progress over time.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Mood Score</Label>
                      <span className="text-2xl font-bold text-purple-600">{moodScore}/10</span>
                    </div>
                    <Slider
                      data-testid="mood-score-slider"
                      value={[moodScore]}
                      onValueChange={(values) => setMoodScore(values[0])}
                      max={10}
                      min={0}
                      step={0.5}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      How would you rate your overall mood today?
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Sleep Quality</Label>
                      <span className="text-2xl font-bold text-purple-600">{sleepQuality}/10</span>
                    </div>
                    <Slider
                      data-testid="sleep-quality-slider"
                      value={[sleepQuality]}
                      onValueChange={(values) => setSleepQuality(values[0])}
                      max={10}
                      min={0}
                      step={0.5}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">How well did you sleep last night?</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Stress Level</Label>
                      <span className="text-2xl font-bold text-purple-600">{stressLevel}/10</span>
                    </div>
                    <Slider
                      data-testid="stress-level-slider"
                      value={[stressLevel]}
                      onValueChange={(values) => setStressLevel(values[0])}
                      max={10}
                      min={0}
                      step={0.5}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">How stressed are you feeling today?</p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Notes (Optional)</Label>
                    <Textarea
                      data-testid="wellness-notes-textarea"
                      placeholder="Any thoughts or observations about your wellness today..."
                      value={wellnessNotes}
                      onChange={(e) => setWellnessNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Button
                    data-testid="save-wellness-metrics-btn"
                    onClick={handleSubmitWellnessMetrics}
                    disabled={submitWellnessMetricsMutation.isPending}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                  >
                    {submitWellnessMetricsMutation.isPending ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Today's Wellness
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Historical Data Visualization */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5 text-purple-600" />
                    Wellness Trends (Last 14 Days)
                  </CardTitle>
                  <CardDescription>Visualize your wellness journey over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingMetrics ? (
                    <div className="flex items-center justify-center h-64">
                      <p className="text-gray-500">Loading wellness data...</p>
                    </div>
                  ) : chartData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <Activity className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">No wellness data yet</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Start tracking your daily wellness to see trends
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsLineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: "12px" }} />
                        <YAxis domain={[0, 10]} stroke="#6b7280" style={{ fontSize: "12px" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "8px",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="mood"
                          stroke="#9333ea"
                          strokeWidth={2}
                          name="Mood Score"
                          dot={{ fill: "#9333ea", r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="sleep"
                          stroke="#a855f7"
                          strokeWidth={2}
                          name="Sleep Quality"
                          dot={{ fill: "#a855f7", r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="stress"
                          stroke="#c084fc"
                          strokeWidth={2}
                          name="Stress Level"
                          dot={{ fill: "#c084fc", r: 4 }}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Therapy Goals</CardTitle>
                <p className="text-gray-600">Track progress towards your therapy objectives</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {therapyGoals.map((goal) => (
                    <div key={goal.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold">{goal.title}</h4>
                          <Badge className={getCategoryColor(goal.category)}>{goal.category}</Badge>
                          {goal.status === "completed" && (
                            <CheckCircle className="h-5 w-5 text-purple-600" />
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-gray-600 mb-3">{goal.description}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex-1 mr-4">
                          <Progress value={goal.progress} className="h-2" />
                        </div>
                        <span className="text-sm font-medium">{goal.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Session History</CardTitle>
                <p className="text-gray-600">Review your past therapy sessions</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sessionHistory.map((session) => (
                    <div key={session.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold">
                            {new Date(session.date).toLocaleDateString()}
                          </h4>
                          <Badge variant="outline">{session.type}</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < session.rating
                                  ? "text-purple-400 fill-current"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-2">
                        with {session.therapistName} • {session.duration} minutes
                      </p>

                      <p className="text-gray-700 mb-3">{session.notes}</p>

                      <div className="flex items-center gap-4 text-sm">
                        <span>
                          Mood: {session.moodBefore} → {session.moodAfter}
                        </span>
                        <span
                          className={`${
                            session.moodAfter > session.moodBefore
                              ? "text-purple-600"
                              : session.moodAfter < session.moodBefore
                                ? "text-purple-400"
                                : "text-gray-600"
                          }`}
                        >
                          {session.moodAfter > session.moodBefore
                            ? `+${session.moodAfter - session.moodBefore}`
                            : session.moodAfter - session.moodBefore}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Progress Insights</CardTitle>
                <p className="text-gray-600">AI-powered insights about your therapy journey</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Award className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-purple-900">Excellent Progress!</h4>
                        <p className="text-purple-800 text-sm mt-1">
                          You've shown consistent improvement in anxiety management over the past
                          month. Your coping strategies are working well.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <BarChart3 className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-purple-900">Session Attendance</h4>
                        <p className="text-purple-800 text-sm mt-1">
                          You've maintained an 85% attendance rate, which is excellent for therapy
                          outcomes. Keep up the consistency!
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-purple-900">Sleep Pattern Focus</h4>
                        <p className="text-purple-800 text-sm mt-1">
                          Consider discussing sleep hygiene in your next session. Better sleep
                          quality could enhance your overall progress.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
