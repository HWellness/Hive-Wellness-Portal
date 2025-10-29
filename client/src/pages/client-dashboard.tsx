import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  MessageSquare,
  User,
  Video,
  CreditCard,
  Settings,
  LogOut,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Target,
  Heart,
  Zap,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

interface ClientDashboardProps {
  user?: any;
  onNavigateToService?: (serviceId: string) => void;
}

export default function ClientDashboard({ onNavigateToService }: ClientDashboardProps = {}) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/client/dashboard"],
    enabled: !!user,
  });

  const handleLogout = async () => {
    try {
      const response = await apiRequest("POST", "/api/auth/logout");
      const data = await response.json();

      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });

      // Use the redirect path from backend based on user role
      if (data.success && data.redirect) {
        window.location.href = data.redirect;
      } else {
        // Fallback for client role
        window.location.href = "/login";
      }
    } catch (error) {
      // Fallback for client role
      window.location.href = "/login";
    }
  };

  if (!user || user.role !== "client") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-primary text-hive-purple mb-4">Access Denied</h1>
          <p className="text-hive-black/70">You need client access to view this page.</p>
          <Link to="/portal">
            <Button className="mt-4">Return to Portal</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Mock data for demo (in production this would come from dashboardData)
  const mockDashboardData = {
    nextAppointment: { date: "2025-08-03", time: "14:00", therapist: "Dr. Sarah Thompson" },
    sessionsComplete: 4,
    overallProgress: 78,
    unreadMessages: 2,
    wellnessMetrics: {
      moodScore: 7.5,
      sleepQuality: 6.8,
      stressLevel: 4.2,
    },
    therapeuticGoals: [
      { name: "Reduce anxiety symptoms", progress: 75, target: "End of month", priority: "high" },
      { name: "Improve sleep quality", progress: 60, target: "Next 2 weeks", priority: "medium" },
      { name: "Better stress management", progress: 85, target: "Ongoing", priority: "high" },
    ],
    recentSessions: [
      { date: "2025-07-28", type: "Individual Therapy", duration: "50 min", status: "completed" },
      { date: "2025-07-21", type: "Progress Review", duration: "30 min", status: "completed" },
    ],
  };

  const data = dashboardData || mockDashboardData;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-hive-purple/5 to-purple-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-hive-purple border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-hive-black/70 font-secondary">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-hive-purple/8 via-white to-purple-50">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Modern Header */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-primary text-hive-black mb-2 tracking-tight">
                Welcome back, <span className="text-hive-purple">{user.firstName || "Demo"}</span>
              </h1>
              <p className="text-hive-black/60 font-secondary text-lg">
                {new Date().toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}{" "}
                • Track your wellness journey and session progress
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/90 hover:bg-white text-hive-purple hover:text-hive-purple border-hive-purple/20 font-secondary"
                onClick={() => window.open("https://hive-wellness.co.uk", "_blank")}
                data-testid="button-return-website"
              >
                Return to Website
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-hive-black/70 hover:text-hive-black"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Hero Progress Overview */}
        <div className="mb-10">
          <Card className="bg-gradient-to-r from-hive-purple to-purple-600 border-0 shadow-xl text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-black/10"></div>
            <CardContent className="p-8 relative z-10">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-primary mb-2">Your Progress Overview</h2>
                  <p className="text-white/90 font-secondary mb-4">
                    Track your wellness journey and session progress.
                  </p>
                  {!data.assignedTherapist && (
                    <p className="text-white/80 font-secondary text-sm">
                      Our team is working to match you with the perfect therapist based on your
                      needs and preferences.
                    </p>
                  )}
                </div>
                <div className="text-center lg:text-right">
                  <div className="text-3xl font-primary mb-1">{data.overallProgress}%</div>
                  <div className="text-white/90 font-secondary text-sm">Overall Progress</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-hive-purple/10 rounded-xl">
                  <Calendar className="w-6 h-6 text-hive-purple" />
                </div>
                <Badge variant="outline" className="text-xs">
                  Next Session
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-primary text-hive-black font-semibold">
                  {data.nextAppointment ? "Scheduled" : "Not scheduled"}
                </p>
                <p className="text-sm font-secondary text-hive-black/60">
                  {data.nextAppointment
                    ? `${new Date(data.nextAppointment.date).toLocaleDateString("en-GB")} at ${data.nextAppointment.time}`
                    : "Awaiting therapist assignment"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-hive-purple/10 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-hive-purple" />
                </div>
                <Badge variant="outline" className="text-xs">
                  Sessions Complete
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-primary text-hive-black font-semibold">
                  {data.sessionsComplete}
                </p>
                <p className="text-sm font-secondary text-hive-black/60">
                  Total completed sessions
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100/10 rounded-xl">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
                {data.unreadMessages > 0 && (
                  <Badge className="bg-hive-purple text-white text-xs">{data.unreadMessages}</Badge>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-primary text-hive-black font-semibold">
                  {data.unreadMessages}
                </p>
                <p className="text-sm font-secondary text-hive-black/60">Unread messages</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-hive-purple/10 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-hive-purple" />
                </div>
                <Badge variant="outline" className="text-xs">
                  Overall Progress
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-primary text-hive-black font-semibold">
                  {data.overallProgress}%
                </p>
                <p className="text-sm font-secondary text-hive-black/60">Wellness progress</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Progress & Goals */}
          <div className="xl:col-span-2 space-y-8">
            {/* Upcoming Appointments */}
            <Card className="bg-white border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-primary text-hive-black flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-hive-purple" />
                    Upcoming Appointments
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-hive-purple hover:text-hive-purple/80"
                  >
                    View all
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {data.nextAppointment ? (
                  <div className="p-6 bg-gradient-to-r from-hive-purple/5 to-purple-100/10 rounded-xl border border-hive-purple/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-primary text-hive-black font-semibold mb-1">
                          Individual Therapy Session
                        </h3>
                        <p className="text-sm font-secondary text-hive-black/70 mb-2">
                          with {data.nextAppointment.therapist}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-hive-black/60">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(data.nextAppointment.date).toLocaleDateString("en-GB")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {data.nextAppointment.time}
                          </span>
                        </div>
                      </div>
                      <Button className="bg-hive-purple hover:bg-hive-purple/90">
                        <Video className="w-4 h-4 mr-2" />
                        Join Session
                      </Button>
                    </div>
                  </div>
                ) : data.assignedTherapist ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-hive-purple/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-hive-purple/60" />
                    </div>
                    <h3 className="font-primary text-hive-black font-medium mb-2">
                      No upcoming appointments
                    </h3>
                    <p className="text-sm text-hive-black/60 mb-6">
                      You're assigned to {data.assignedTherapist.name}. Ready to book your next
                      session!
                    </p>
                    <Button className="bg-hive-purple hover:bg-hive-purple/90 text-white">
                      Book Session with {data.assignedTherapist.name}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-hive-purple/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-hive-purple/60" />
                    </div>
                    <h3 className="font-primary text-hive-black font-medium mb-2">
                      No upcoming appointments
                    </h3>
                    <p className="text-sm text-hive-black/60 mb-6">
                      Our admin team will assign you a therapist and schedule your first session.
                    </p>
                    <Button
                      variant="outline"
                      className="border-hive-purple text-hive-purple hover:bg-hive-purple hover:text-white"
                    >
                      Awaiting Therapist Assignment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Wellness Metrics */}
            <Card className="bg-white border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="font-primary text-hive-black flex items-center gap-2">
                  <Heart className="w-5 h-5 text-hive-purple" />
                  Wellness Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-secondary text-hive-black font-medium">Mood Score</span>
                      <span className="font-primary text-hive-black font-semibold">
                        {data.wellnessMetrics.moodScore}/10
                      </span>
                    </div>
                    <Progress value={data.wellnessMetrics.moodScore * 10} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-secondary text-hive-black font-medium">
                        Sleep Quality
                      </span>
                      <span className="font-primary text-hive-black font-semibold">
                        {data.wellnessMetrics.sleepQuality}/10
                      </span>
                    </div>
                    <Progress value={data.wellnessMetrics.sleepQuality * 10} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-secondary text-hive-black font-medium">
                        Stress Level
                      </span>
                      <span className="font-primary text-hive-black font-semibold">
                        {data.wellnessMetrics.stressLevel}/10
                      </span>
                    </div>
                    <Progress value={100 - data.wellnessMetrics.stressLevel * 10} className="h-2" />
                  </div>

                  <Button className="w-full mt-6 bg-hive-purple hover:bg-hive-purple/90 text-white">
                    <Heart className="w-4 h-4 mr-2" />
                    Update Wellness Metrics
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Therapeutic Goals */}
            <Card className="bg-white border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="font-primary text-hive-black flex items-center gap-2">
                  <Target className="w-5 h-5 text-hive-purple" />
                  Therapeutic Goals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {data.therapeuticGoals.map((goal, index) => (
                    <div key={index} className="p-4 border border-gray-100 rounded-xl">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-secondary font-semibold text-hive-black">
                            {goal.name}
                          </h4>
                          <p className="text-sm text-hive-black/60 mt-1">Target: {goal.target}</p>
                        </div>
                        <Badge
                          variant={goal.priority === "high" ? "default" : "secondary"}
                          className={goal.priority === "high" ? "bg-hive-purple text-white" : ""}
                        >
                          {goal.priority}%
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-hive-black/70">Progress</span>
                          <span className="font-semibold text-hive-purple">{goal.progress}%</span>
                        </div>
                        <Progress value={goal.progress} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Services & Recent Activity */}
          <div className="space-y-8">
            {/* Your Services */}
            <Card className="bg-white border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="font-primary text-hive-black flex items-center gap-2">
                  <Zap className="w-5 h-5 text-hive-purple" />
                  Your Services
                </CardTitle>
                <p className="text-sm text-hive-black/60 font-secondary">
                  Access all your available platform services
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    {
                      id: "client-dashboard",
                      name: "Dashboard",
                      desc: "Your personal wellness overview",
                      icon: BarChart3,
                      status: "active",
                    },
                    {
                      id: "client-profile",
                      name: "Complete Profile",
                      desc: "Complete your personal profile and therapy preferences",
                      icon: User,
                      status: "active",
                    },
                    {
                      id: "scheduling",
                      name: "Book Sessions",
                      desc: "Schedule appointments with your therapist",
                      icon: Calendar,
                      status: "enabled",
                    },
                    {
                      id: "video-sessions",
                      name: "Join Session",
                      desc: "Access your video consultation",
                      icon: Video,
                      status: "disabled",
                    },
                    {
                      id: "messaging",
                      name: "Messaging",
                      desc: "Secure messaging with your therapist",
                      icon: MessageSquare,
                      status: "disabled",
                    },
                    {
                      id: "payments",
                      name: "Payments",
                      desc: "Manage billing and payments",
                      icon: CreditCard,
                      status: "active",
                    },
                    {
                      id: "consultation",
                      name: "My Progress",
                      desc: "Track your therapy journey",
                      icon: TrendingUp,
                      status: "active",
                    },
                    {
                      id: "client-documents",
                      name: "Information Pack",
                      desc: "Access your client information pack",
                      icon: BookOpen,
                      status: "active",
                    },
                  ].map((service, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border transition-all duration-200 ${
                        service.status === "active"
                          ? "border-hive-purple/20 hover:border-hive-purple/40 cursor-pointer"
                          : service.status === "pending"
                            ? "border-hive-purple/20 bg-hive-purple/5"
                            : "border-gray-100 bg-gray-50 opacity-60"
                      }`}
                      onClick={() => {
                        if (service.status === "active") {
                          // Call onNavigateToService if available (when used within portal)
                          if (onNavigateToService) {
                            onNavigateToService(service.id);
                          } else {
                            // Fallback: Navigate to portal with the service
                            window.location.href = `/portal?service=${service.id}`;
                          }
                        } else {
                          toast({
                            title:
                              service.status === "disabled" ? "Service Unavailable" : "Coming Soon",
                            description:
                              service.status === "disabled"
                                ? "This service will be available once your therapist is assigned."
                                : "This service will be available soon.",
                            variant: service.status === "disabled" ? "destructive" : "default",
                          });
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            service.status === "active"
                              ? "bg-hive-purple/10 text-hive-purple"
                              : service.status === "pending"
                                ? "bg-hive-purple/10 text-hive-purple"
                                : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          <service.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-secondary font-medium text-hive-black text-sm">
                              {service.name}
                            </h4>
                            {service.status === "active" && (
                              <ArrowRight className="w-4 h-4 text-hive-purple/60" />
                            )}
                            {service.status === "pending" && (
                              <Badge variant="secondary" className="text-xs">
                                Awaiting Assignment
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-hive-black/60 mt-1">{service.desc}</p>
                          {service.status === "disabled" && (
                            <div className="flex items-center gap-1 mt-2">
                              <AlertCircle className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">Pending assignment</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Sessions */}
            <Card className="bg-white border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="font-primary text-hive-black flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.recentSessions.length > 0 ? (
                  <div className="space-y-4">
                    {data.recentSessions.map((session, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg"
                      >
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-secondary font-medium text-hive-black text-sm">
                            {session.type}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-hive-black/60 mt-1">
                            <span>{new Date(session.date).toLocaleDateString("en-GB")}</span>
                            <span>•</span>
                            <span>{session.duration}</span>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          {session.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-purple-100/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Clock className="w-6 h-6 text-purple-600/60" />
                    </div>
                    <p className="text-sm text-hive-black/60">No sessions yet</p>
                    <p className="text-xs text-hive-black/50 mt-1">
                      Your session history will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
