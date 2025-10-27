import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Calendar,
  Clock,
  Video,
  Heart,
  Brain,
  TrendingUp,
  MessageCircle,
  CheckCircle,
  Activity,
  User as UserIcon,
  CreditCard,
  LogOut,
  Settings,
  RefreshCw,
  X,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import type { User } from "@shared/schema";
import { serviceRegistry } from "@/lib/serviceRegistry";
import ServiceRouter from "@/components/services/service-router";
import TherapistInfoCard from "@/components/client/therapist-info-card";

interface ClientDashboardData {
  nextAppointment?: {
    id: string;
    date: string;
    time: string;
    therapistName: string;
    therapistId?: string;
    therapistProfileImage?: string;
    type: string;
    status: string;
  };
  recentSessions: Array<{
    date: string;
    therapistName: string;
    therapistId?: string;
    therapistProfileImage?: string;
    type: string;
    duration: string;
    status: string;
  }>;
  therapeuticGoals: Array<{
    goal: string;
    progress: number;
    target: string;
  }>;
  wellnessMetrics: {
    moodScore: number;
    sleepQuality: number;
    stressLevel: number;
    overallProgress: number;
  };
  unreadMessages: number;
  completedSessions: number;
  totalSessions: number;
  assignedTherapist?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImage?: string;
    jobTitle?: string;
    professionalBio?: string;
    specializations?: string[];
    qualifications?: string;
  } | null;
}

interface ClientDashboardProps {
  user: User;
  onNavigateToService?: (serviceId: string) => void;
}

export default function ClientDashboard({ user, onNavigateToService }: ClientDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isWellnessDialogOpen, setIsWellnessDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [moodScore, setMoodScore] = useState([7.5]);
  const [sleepQuality, setSleepQuality] = useState([6.8]);
  const [stressLevel, setStressLevel] = useState([4.2]);
  const [wellnessNotes, setWellnessNotes] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<any>(null);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  // Fetch client dashboard data
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useQuery<ClientDashboardData>({
    queryKey: ["/api/client/dashboard"],
    retry: false,
    refetchOnWindowFocus: true, // Allow refetch on window focus for fresh data
    staleTime: 0, // Always fetch fresh data to show current appointments
  });

  // Mutation for canceling appointments
  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      await apiRequest("PATCH", `/api/appointments/${appointmentId}/cancel`, {
        reason: "Cancelled by client from dashboard",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/dashboard"] });
      setShowCancelDialog(false);
      setAppointmentToCancel(null);
      toast({
        title: "Appointment Cancelled",
        description: "Your appointment has been cancelled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Unable to cancel appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for rescheduling appointments
  const rescheduleAppointmentMutation = useMutation({
    mutationFn: async ({
      appointmentId,
      newDate,
      newTime,
    }: {
      appointmentId: string;
      newDate: string;
      newTime: string;
    }) => {
      await apiRequest("PUT", `/api/appointments/${appointmentId}/reschedule`, {
        newDate,
        newTime,
        reason: "Rescheduled by client from dashboard",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/dashboard"] });
      setShowRescheduleDialog(false);
      setAppointmentToReschedule(null);
      setRescheduleDate("");
      setRescheduleTime("");
      toast({
        title: "Appointment Rescheduled",
        description: "Your appointment has been rescheduled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Rescheduling Failed",
        description: error.message || "Unable to reschedule appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating wellness metrics with real database storage
  const updateWellnessMutation = useMutation({
    mutationFn: async (wellnessData: {
      moodScore: number;
      sleepQuality: number;
      stressLevel: number;
      notes?: string;
      therapeuticGoals?: Array<{ goal: string; progress: number; target: string }>;
    }) => {
      const response = await fetch("/api/client/update-wellness", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(wellnessData),
      });

      if (!response.ok) {
        throw new Error("Failed to update wellness metrics");
      }

      return response.json();
    },
    onSuccess: (updatedData) => {
      // Force refresh of dashboard data to show updated metrics
      queryClient.invalidateQueries({ queryKey: ["/api/client/dashboard"] });
      queryClient.refetchQueries({ queryKey: ["/api/client/dashboard"] });

      // Update local state immediately for better UX
      if (updatedData?.wellnessMetrics) {
        setMoodScore([updatedData.wellnessMetrics.moodScore]);
        setSleepQuality([updatedData.wellnessMetrics.sleepQuality]);
        setStressLevel([updatedData.wellnessMetrics.stressLevel]);
      }

      setIsWellnessDialogOpen(false);
      toast({
        title: "Wellness Updated",
        description: "Your wellness metrics have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Unable to save wellness metrics. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handler for joining video session
  const handleJoinSession = () => {
    // Check if there's an active session to join
    if (data.nextAppointment && data.nextAppointment.status === "confirmed") {
      // Navigate to video-sessions service where user can join their scheduled session
      handleServiceNavigation("video-sessions");
      toast({
        title: "Navigating to Sessions",
        description: "Taking you to your video sessions...",
      });
    } else {
      // No active session, navigate to video-sessions to view all sessions
      handleServiceNavigation("video-sessions");
      toast({
        title: "No Active Session",
        description: "View your scheduled sessions and join when they're ready.",
        variant: "default",
      });
    }
  };

  // Demo data for immediate functionality
  const demoData: ClientDashboardData = {
    nextAppointment: undefined,
    recentSessions: [],
    therapeuticGoals: [],
    wellnessMetrics: {
      moodScore: 0,
      sleepQuality: 0,
      stressLevel: 0,
      overallProgress: 0,
    },
    unreadMessages: 0,
    completedSessions: 0,
    totalSessions: 0,
  };

  // Use real API data when available, fallback to demo data
  const data: ClientDashboardData = dashboardData || demoData;

  // Handler for updating wellness metrics
  const handleWellnessUpdate = () => {
    updateWellnessMutation.mutate({
      moodScore: moodScore[0],
      sleepQuality: sleepQuality[0],
      stressLevel: stressLevel[0],
      notes: wellnessNotes,
      therapeuticGoals: data.therapeuticGoals,
    });
    setIsWellnessDialogOpen(false);
  };

  const handleServiceNavigation = (serviceId: string) => {
    if (onNavigateToService) {
      onNavigateToService(serviceId);
    } else {
      setSelectedService(serviceId);
    }
  };

  // If a service is selected, render it instead of the dashboard
  if (selectedService) {
    return (
      <ServiceRouter
        user={user}
        selectedService={selectedService}
        onBack={() => setSelectedService(null)}
        onNavigateToService={handleServiceNavigation}
      />
    );
  }

  // Loading is handled by the wrapper component to avoid duplicate spinners

  if (error) {
    console.error("Dashboard error:", error);
    // Continue with demo data instead of blocking the UI
  }

  const clientServices = serviceRegistry.client;

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
        window.location.href = "/login"; // Default fallback for clients
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout Failed",
        description: "There was an issue logging out. Please try again.",
        variant: "destructive",
      });
      // Force logout even if API fails - clients go to main login
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Enhanced Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-primary font-bold text-hive-black">
                Welcome back, {user?.firstName || "Client"}
              </h1>
              <p className="text-sm text-hive-black/70 font-secondary">
                {new Date().toLocaleDateString("en-GB", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="flex items-center">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-8">
          {/* Enhanced Progress Overview Card */}
          <div className="bg-gradient-to-r from-hive-purple to-purple-600 text-white p-8 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-primary font-bold mb-3">Your Progress Overview</h2>
                <p className="font-secondary text-purple-100 text-lg">
                  Track your wellness journey and session progress
                </p>
                {!data.assignedTherapist && (
                  <div className="mt-4 p-4 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                    <p className="text-white/90 font-secondary">
                      Our team is working to match you with the perfect therapist based on your
                      needs and preferences.
                    </p>
                  </div>
                )}
              </div>
              <div className="hidden md:block">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                  <Heart className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-shadow border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-secondary text-gray-600 mb-1">Next Session</p>
                    <p className="text-2xl font-primary font-bold text-hive-purple">
                      {data.nextAppointment ? "Tomorrow" : "Not scheduled"}
                    </p>
                    {data.nextAppointment && (
                      <p className="text-xs text-gray-500 mt-1">
                        {data.nextAppointment.time} with {data.nextAppointment.therapistName}
                      </p>
                    )}
                  </div>
                  <div className="bg-hive-purple/10 p-3 rounded-xl">
                    <Calendar className="w-6 h-6 text-hive-purple" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-secondary text-gray-600 mb-1">Sessions Complete</p>
                    <p className="text-2xl font-primary font-bold text-hive-purple">
                      {data.completedSessions}
                    </p>
                  </div>
                  <div className="bg-hive-purple/10 p-3 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-hive-purple" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-secondary text-gray-600 mb-1">Overall Progress</p>
                    <p className="text-2xl font-primary font-bold text-hive-purple">
                      {data.wellnessMetrics.overallProgress}%
                    </p>
                    <Progress
                      value={data.wellnessMetrics.overallProgress}
                      className="w-full mt-2 h-2"
                    />
                  </div>
                  <div className="bg-hive-purple/10 p-3 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-hive-purple" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow border-0 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-secondary text-gray-600 mb-1">Unread Messages</p>
                    <p className="text-2xl font-primary font-bold text-hive-purple">
                      {data.unreadMessages}
                    </p>
                    {data.unreadMessages > 0 && (
                      <p className="text-xs text-purple-600 mt-1">New messages available</p>
                    )}
                  </div>
                  <div className="bg-purple-100 p-3 rounded-xl">
                    <MessageCircle className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Therapist Information Section - Step 45 Enhanced Display */}
          <TherapistInfoCard />

          {/* Quick Action Navigation */}
          <div className="bg-white rounded-2xl shadow-md border-0 p-6">
            <h3 className="text-xl font-primary font-bold text-hive-black mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                onClick={() => handleServiceNavigation("video-sessions")}
                className="bg-gradient-to-r from-hive-purple to-purple-600 hover:shadow-lg transition-all p-4 h-auto flex-col space-y-2"
              >
                <Video className="w-6 h-6" />
                <span className="text-sm font-medium">Join Session</span>
              </Button>

              <Button
                onClick={() => handleServiceNavigation("messaging")}
                variant="outline"
                className="border-hive-purple/20 hover:bg-hive-purple/5 hover:shadow-lg transition-all p-4 h-auto flex-col space-y-2"
              >
                <MessageCircle className="w-6 h-6 text-hive-purple" />
                <span className="text-sm font-medium text-hive-purple">Messages</span>
              </Button>

              <Button
                onClick={() => handleServiceNavigation("scheduling")}
                variant="outline"
                className="border-hive-purple/20 hover:bg-hive-purple/5 hover:shadow-lg transition-all p-4 h-auto flex-col space-y-2"
              >
                <Calendar className="w-6 h-6 text-hive-purple" />
                <span className="text-sm font-medium text-hive-purple">Book Session</span>
              </Button>

              <Button
                onClick={() => handleServiceNavigation("my-progress")}
                variant="outline"
                className="border-hive-purple/20 hover:bg-hive-purple/5 hover:shadow-lg transition-all p-4 h-auto flex-col space-y-2"
              >
                <Activity className="w-6 h-6 text-hive-purple" />
                <span className="text-sm font-medium text-hive-purple">My Progress</span>
              </Button>

              <Button
                onClick={() => (window.location.href = "/settings")}
                variant="outline"
                className="border-hive-purple/20 hover:bg-hive-purple/5 hover:shadow-lg transition-all p-4 h-auto flex-col space-y-2"
                data-testid="button-settings-quick-action"
              >
                <Settings className="w-6 h-6 text-hive-purple" />
                <span className="text-sm font-medium text-hive-purple">Settings</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upcoming Appointments */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-hive-purple" />
                    Upcoming Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.nextAppointment ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-purple-100 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md">
                            {data.nextAppointment.therapistProfileImage ? (
                              <img
                                src={data.nextAppointment.therapistProfileImage}
                                alt={`${data.nextAppointment.therapistName} profile`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to placeholder if image fails to load
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.parentNode
                                    ?.querySelector(".therapist-fallback")
                                    ?.classList.remove("hidden");
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-full h-full bg-hive-purple/10 flex items-center justify-center therapist-fallback ${data.nextAppointment.therapistProfileImage ? "hidden" : ""}`}
                            >
                              <UserIcon className="w-6 h-6 text-hive-purple" />
                            </div>
                          </div>
                          <div>
                            <h3 className="font-semibold text-hive-black">
                              {data.nextAppointment.therapistName}
                            </h3>
                            <p className="text-sm text-hive-black">{data.nextAppointment.type}</p>
                            <p className="text-sm text-hive-black">
                              {data.nextAppointment.date} at {data.nextAppointment.time}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-purple-100 text-hive-purple">
                          {data.nextAppointment.status === "confirmed"
                            ? "Confirmed"
                            : data.nextAppointment.status === "in_progress"
                              ? "In Progress"
                              : data.nextAppointment.status === "completed"
                                ? "Completed"
                                : "Scheduled"}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <Button
                          className="w-full bg-hive-purple hover:bg-hive-purple/90"
                          onClick={handleJoinSession}
                          data-testid="button-join-session"
                        >
                          <Video className="w-4 h-4 mr-2" />
                          Join Session
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            className="w-full border-hive-purple text-hive-purple hover:bg-hive-purple/5"
                            onClick={() => {
                              setAppointmentToReschedule(data.nextAppointment);
                              setShowRescheduleDialog(true);
                            }}
                            data-testid="button-reschedule-appointment"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reschedule
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full border-red-500 text-red-500 hover:bg-red-50"
                            onClick={() => {
                              setAppointmentToCancel(data.nextAppointment);
                              setShowCancelDialog(true);
                            }}
                            data-testid="button-cancel-appointment"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : data.assignedTherapist ? (
                    <div className="text-center py-6">
                      <Calendar className="w-12 h-12 mx-auto text-hive-purple mb-4" />
                      <p className="text-hive-black mb-2">No upcoming appointments</p>
                      <p className="text-sm text-hive-black mb-4">
                        You're assigned to {data.assignedTherapist.firstName}{" "}
                        {data.assignedTherapist.lastName}. Ready to book your next session!
                      </p>
                      <Button
                        className="mt-4 bg-hive-purple text-white hover:bg-hive-purple/90"
                        onClick={() => setSelectedService("scheduling")}
                      >
                        Book Session with {data.assignedTherapist.firstName}{" "}
                        {data.assignedTherapist.lastName}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Calendar className="w-12 h-12 mx-auto text-hive-purple mb-4" />
                      <p className="text-hive-black mb-2">No upcoming appointments</p>
                      <p className="text-sm text-hive-black mb-4">
                        Our admin team will assign you a therapist and schedule your first session.
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4 border-hive-purple text-hive-purple"
                        disabled
                      >
                        Awaiting Therapist Assignment
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Wellness Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="w-5 h-5 mr-2 text-hive-purple" />
                  Wellness Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-hive-black">Mood Score</span>
                    <span className="text-hive-purple font-semibold">
                      {data.wellnessMetrics.moodScore}/10
                    </span>
                  </div>
                  <Progress value={data.wellnessMetrics.moodScore * 10} className="mt-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-hive-black">Sleep Quality</span>
                    <span className="text-hive-purple font-semibold">
                      {data.wellnessMetrics.sleepQuality}/10
                    </span>
                  </div>
                  <Progress value={data.wellnessMetrics.sleepQuality * 10} className="mt-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-hive-black">Stress Level</span>
                    <span className="text-hive-purple font-semibold">
                      {data.wellnessMetrics.stressLevel}/10
                    </span>
                  </div>
                  <Progress value={data.wellnessMetrics.stressLevel * 10} className="mt-2" />
                </div>

                <Dialog open={isWellnessDialogOpen} onOpenChange={setIsWellnessDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full mt-4 bg-hive-purple hover:bg-hive-purple/90 text-white">
                      Update Wellness Metrics
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="text-hive-purple font-primary">
                        Update Your Wellness Metrics
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="mood-score" className="text-sm font-medium text-hive-black">
                          Mood Score: {moodScore[0]}/10
                        </Label>
                        <Slider
                          id="mood-score"
                          min={0}
                          max={10}
                          step={0.1}
                          value={moodScore}
                          onValueChange={setMoodScore}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="sleep-quality"
                          className="text-sm font-medium text-hive-black"
                        >
                          Sleep Quality: {sleepQuality[0]}/10
                        </Label>
                        <Slider
                          id="sleep-quality"
                          min={0}
                          max={10}
                          step={0.1}
                          value={sleepQuality}
                          onValueChange={setSleepQuality}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="stress-level"
                          className="text-sm font-medium text-hive-black"
                        >
                          Stress Level: {stressLevel[0]}/10
                        </Label>
                        <Slider
                          id="stress-level"
                          min={0}
                          max={10}
                          step={0.1}
                          value={stressLevel}
                          onValueChange={setStressLevel}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="wellness-notes"
                          className="text-sm font-medium text-hive-black"
                        >
                          Additional Notes
                        </Label>
                        <Textarea
                          id="wellness-notes"
                          placeholder="How are you feeling today? Any specific concerns or improvements?"
                          value={wellnessNotes}
                          onChange={(e) => setWellnessNotes(e.target.value)}
                          className="min-h-[80px]"
                        />
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setIsWellnessDialogOpen(false)}
                          className="border-hive-purple text-hive-purple hover:bg-hive-purple hover:text-white"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleWellnessUpdate}
                          disabled={updateWellnessMutation.isPending}
                          className="bg-hive-purple hover:bg-hive-purple/90 text-white"
                        >
                          {updateWellnessMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Therapeutic Goals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-hive-purple" />
                  Therapeutic Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.therapeuticGoals.map((goal, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-hive-black">{goal.goal}</span>
                      <span className="text-sm text-hive-purple font-semibold">
                        {goal.progress}%
                      </span>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                    <p className="text-xs text-hive-black">Target: {goal.target}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-hive-purple" />
                  Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.recentSessions.map((session, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-purple-100 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
                          {session.therapistProfileImage ? (
                            <img
                              src={session.therapistProfileImage}
                              alt={`${session.therapistName} profile`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                e.currentTarget.parentNode
                                  ?.querySelector(".therapist-fallback")
                                  ?.classList.remove("hidden");
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-full h-full bg-hive-purple/10 flex items-center justify-center therapist-fallback ${session.therapistProfileImage ? "hidden" : ""}`}
                          >
                            <UserIcon className="w-5 h-5 text-hive-purple" />
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-hive-black">{session.therapistName}</p>
                          <p className="text-sm text-hive-black">
                            {session.date} • {session.duration}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-purple-100 text-hive-purple">{session.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Services Access - Updated UI */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2 text-hive-purple" />
                Your Services
              </CardTitle>
              <CardDescription>Access all your available platform services</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
                key="enhanced-services-grid"
              >
                {clientServices.map((service) => {
                  const IconComponent =
                    service.icon === "Home"
                      ? Activity
                      : service.icon === "User"
                        ? UserIcon
                        : service.icon === "Calendar"
                          ? Calendar
                          : service.icon === "Video"
                            ? Video
                            : service.icon === "MessageSquare"
                              ? MessageCircle
                              : service.icon === "CreditCard"
                                ? CreditCard
                                : service.icon === "TrendingUp"
                                  ? TrendingUp
                                  : Activity;

                  const isBookingService = service.id === "scheduling";
                  const hasAssignedTherapist = data?.assignedTherapist || data.nextAppointment;

                  return (
                    <div
                      key={`service-${service.id}-enhanced`}
                      onClick={() =>
                        isBookingService && !hasAssignedTherapist
                          ? toast({
                              title: "Therapist Assignment Pending",
                              description:
                                "Our admin team will assign you a therapist shortly. You'll be notified once your therapist is ready.",
                              variant: "default",
                            })
                          : handleServiceNavigation(service.id)
                      }
                      className={`group p-6 border-2 rounded-xl cursor-pointer transition-all duration-300 shadow-sm ${
                        isBookingService && !hasAssignedTherapist
                          ? "border-gray-300 bg-gray-50 opacity-70 cursor-not-allowed"
                          : "border-hive-purple/20 hover:border-hive-purple hover:bg-gradient-to-br hover:from-hive-purple/5 hover:to-hive-purple/10 hover:shadow-lg transform hover:-translate-y-2 hover:scale-[1.02]"
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <div
                          className={`p-4 rounded-xl ${
                            isBookingService && !hasAssignedTherapist
                              ? "bg-gray-200"
                              : "bg-gradient-to-br from-hive-purple/10 to-hive-purple/20"
                          }`}
                        >
                          <IconComponent
                            className={`w-7 h-7 ${
                              isBookingService && !hasAssignedTherapist
                                ? "text-gray-400"
                                : "text-hive-purple"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-primary font-bold text-xl text-hive-black">
                              {service.name}
                            </h3>
                            {isBookingService && !hasAssignedTherapist && (
                              <Badge
                                variant="outline"
                                className="ml-2 text-xs bg-hive-purple/10 text-hive-purple border-hive-purple/20 animate-pulse"
                              >
                                Awaiting Assignment
                              </Badge>
                            )}
                          </div>
                          <p className="text-base text-hive-black/70 font-secondary leading-relaxed">
                            {isBookingService && !hasAssignedTherapist
                              ? "Available once your therapist is assigned by our admin team"
                              : isBookingService && hasAssignedTherapist && data?.assignedTherapist
                                ? `Schedule appointments with your assigned therapist, ${data.assignedTherapist.firstName} ${data.assignedTherapist.lastName}`
                                : service.description}
                          </p>
                          {!isBookingService || hasAssignedTherapist ? (
                            <div className="mt-3 flex items-center text-hive-purple text-sm font-medium">
                              <span>Access now</span>
                              <svg
                                className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </div>
                          ) : (
                            <div className="mt-3 flex items-center text-gray-500 text-sm">
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                              <span>Pending assignment</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Appointment Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Cancel Appointment?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your appointment
              {appointmentToCancel
                ? ` with ${appointmentToCancel.therapistName} on ${appointmentToCancel.date} at ${appointmentToCancel.time}`
                : ""}
              ? This action cannot be undone. Please note our cancellation policy may apply
              depending on when you cancel.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={cancelAppointmentMutation.isPending}
            >
              Keep Appointment
            </Button>
            <Button
              onClick={() => {
                console.log("Cancel button clicked", { appointmentToCancel });
                if (appointmentToCancel?.id) {
                  console.log("Calling mutation with id:", appointmentToCancel.id);
                  cancelAppointmentMutation.mutate(appointmentToCancel.id);
                } else {
                  console.error("No appointment ID found!", appointmentToCancel);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={cancelAppointmentMutation.isPending}
            >
              {cancelAppointmentMutation.isPending ? "Cancelling..." : "Yes, Cancel Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Appointment Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-hive-purple">
              <RefreshCw className="w-5 h-5 mr-2" />
              Reschedule Appointment
            </DialogTitle>
            <DialogDescription>
              Select a new date and time for your appointment
              {appointmentToReschedule ? ` with ${appointmentToReschedule.therapistName}` : ""}. No
              additional charge will be applied.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reschedule-date">New Date</Label>
              <Input
                id="reschedule-date"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                data-testid="input-reschedule-date"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reschedule-time">New Time</Label>
              <Input
                id="reschedule-time"
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                data-testid="input-reschedule-time"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowRescheduleDialog(false);
                setRescheduleDate("");
                setRescheduleTime("");
              }}
              disabled={rescheduleAppointmentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (appointmentToReschedule?.id && rescheduleDate && rescheduleTime) {
                  rescheduleAppointmentMutation.mutate({
                    appointmentId: appointmentToReschedule.id,
                    newDate: rescheduleDate,
                    newTime: rescheduleTime,
                  });
                }
              }}
              className="bg-hive-purple hover:bg-hive-purple/90"
              disabled={
                rescheduleAppointmentMutation.isPending || !rescheduleDate || !rescheduleTime
              }
              data-testid="button-confirm-reschedule"
            >
              {rescheduleAppointmentMutation.isPending ? "Rescheduling..." : "Confirm Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
