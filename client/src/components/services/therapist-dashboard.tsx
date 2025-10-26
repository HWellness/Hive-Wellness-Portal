import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Calendar, Users, Settings, Video, CalendarDays, Eye, PoundSterling, Clock, ChevronRight, BarChart3, AlertCircle, CheckCircle, Activity, MessageSquare, FileText, EyeOff, LogOut, Key, Play, ChevronLeft, ChevronUp, ExternalLink, Zap, Timer, TrendingUp, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { useLocation } from 'wouter';

interface TherapistDashboardProps {
  user: { id: string; role: string; firstName?: string; };
  onNavigateToService?: (serviceId: string) => void;
}

interface PayoutInfo {
  available: boolean;
  accountStatus?: string;
  instantPayoutEligible: boolean;
  availableBalance: string;
  instantFee?: string;
  netAmount?: string;
  stripeBalance?: string;
  nextRegularPayout?: string;
  pendingPayouts?: number;
  requirements?: any[];
}

interface PayoutHistoryItem {
  id: string;
  amount: string;
  fee: string;
  netAmount: string;
  payoutType: 'standard' | 'instant';
  status: string;
  createdAt: string;
  completedAt?: string;
  stripePayoutId?: string;
  stripeTransferId?: string;
}

interface PayoutHistory {
  payouts: PayoutHistoryItem[];
  summary?: {
    totalInstantPayouts: number;
    totalFeesPaid: string;
    averageFee: string;
  };
}

export default function TherapistDashboard({ user, onNavigateToService }: TherapistDashboardProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState('week');
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Instant payout state
  const [isInstantPayoutDialogOpen, setIsInstantPayoutDialogOpen] = useState(false);
  const [instantPayoutAmount, setInstantPayoutAmount] = useState('');
  const [showPayoutDetails, setShowPayoutDetails] = useState(false);
  
  // Cancel appointment state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<any>(null);
  
  // Reschedule appointment state
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

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
        window.location.href = '/therapist-login'; // Default fallback for therapists
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if API fails
      window.location.href = '/therapist-login';
    }
  };

  // Configuration for sessions display - Enhanced for full calendar view
  const [viewMode, setViewMode] = useState<'overview' | 'calendar'>('overview');
  const MAX_OVERVIEW_SESSIONS = 3; // Show only first 3 sessions in overview mode
  
  // Transform API data to match frontend structure
  const transformDashboardData = (apiData: any) => {
    if (!apiData) return demoData;
    
    // Filter and deduplicate appointments based on ID to prevent duplicates
    const uniqueAppointments = apiData.upcomingAppointments
      ? apiData.upcomingAppointments
          .filter((apt: any, index: number, array: any[]) => {
            // Remove duplicates by ID and ensure valid appointment data
            return apt.id && 
                   apt.scheduledAt && 
                   array.findIndex((a: any) => a.id === apt.id) === index;
          })
      : [];
    
    return {
      overview: {
        totalClients: apiData.clientMetrics?.totalClients || 0,
        activeClients: apiData.clientMetrics?.activeClients || 0,
        sessionsThisWeek: apiData.quickStats?.thisWeekSessions || 0,
        sessionsThisMonth: apiData.quickStats?.totalSessionsThisMonth || 0,
        totalEarnings: 0, // Will be calculated from earnings string
        responseTime: '0 hours',
        completionRate: apiData.quickStats?.averageSessionRating || 0
      },
      upcomingSessions: uniqueAppointments.map((apt: any) => ({
        id: apt.id,
        scheduledAt: apt.scheduledAt, // Keep original scheduledAt for proper time handling
        clientName: apt.clientName || 'Client',
        type: apt.sessionType || 'therapy',
        status: apt.status || 'confirmed',
        notes: apt.sessionNotes || '',
        time: new Date(apt.scheduledAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        date: new Date(apt.scheduledAt).toLocaleDateString('en-GB'),
        duration: apt.duration || 50
      })),
      recentActivity: apiData.recentSessions || [],
      clientAlerts: [],
      weeklyStats: {
        sessionsCompleted: apiData.quickStats?.thisWeekSessions || 0,
        newClients: apiData.clientMetrics?.newThisWeek || 0,
        averageSessionRating: apiData.quickStats?.averageSessionRating || 0,
        totalHours: (apiData.quickStats?.thisWeekSessions || 0) * 0.83 // 50min sessions
      }
    };
  };

  // Demo data fallback
  const demoData = {
    overview: {
      totalClients: 0,
      activeClients: 0,
      sessionsThisWeek: 0,
      sessionsThisMonth: 0,
      totalEarnings: 0,
      responseTime: '0 hours',
      completionRate: 0
    },
    upcomingSessions: [],
    recentActivity: [],
    clientAlerts: [],
    weeklyStats: {
      sessionsCompleted: 0,
      newClients: 0,
      averageSessionRating: 0,
      totalHours: 0
    }
  };

  // Fetch real therapist dashboard data
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['/api/therapist/dashboard'],
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch assigned clients for this therapist
  const { data: assignedClients, isLoading: clientsLoading } = useQuery({
    queryKey: [`/api/therapist/assigned-clients/${user.id}`],
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch payout information for instant payouts
  const { data: payoutInfo, isLoading: payoutInfoLoading } = useQuery<PayoutInfo>({
    queryKey: ['/api/therapist/payout-info'],
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Fetch instant payout history
  const { data: payoutHistory, isLoading: historyLoading } = useQuery<PayoutHistory>({
    queryKey: ['/api/therapist/instant-payout/history'],
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
  
  // Calculate sessions to display based on view mode
  const actualData = transformDashboardData(dashboardData);
  const allSessions = actualData.upcomingSessions || [];
  const displayedSessions = viewMode === 'overview' 
    ? allSessions.slice(0, MAX_OVERVIEW_SESSIONS) 
    : allSessions;
  const hasMoreSessions = viewMode === 'overview' && allSessions.length > MAX_OVERVIEW_SESSIONS;

  // Helper function to check if session can be joined (15 minutes before to 15 minutes after start time)
  const canJoinSession = (scheduledAt: string) => {
    const sessionTime = new Date(scheduledAt);
    const now = new Date();
    const timeDiff = sessionTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    return minutesDiff <= 15 && minutesDiff >= -15; // 15 minutes before to 15 minutes after
  };

  // Helper function to format time for display
  const formatSessionTime = (scheduledAt: string) => {
    return new Date(scheduledAt).toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Helper function to format date for display
  const formatSessionDate = (scheduledAt: string) => {
    return new Date(scheduledAt).toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  };
  
  // Use demo profile status
  const profileStatus = { 
    profileDeactivated: false,
    deactivationReason: null,
    deactivatedAt: null
  };
  const isProfileLoading = false;

  // Profile deactivation/reactivation mutation
  const profileStatusMutation = useMutation({
    mutationFn: async ({ action, reason }: { action: 'deactivate' | 'reactivate', reason?: string }) => {
      return await apiRequest('POST', `/api/therapist/profile-status/${user.id}`, {
        action,
        reason: reason || undefined
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/therapist/profile-status/${user.id}`] });
      toast({
        title: data.message || "Profile updated successfully",
        description: data.profileDeactivated 
          ? "Your profile is now hidden from client matching and visibility."
          : "Your profile is now visible to clients and available for matching.",
        variant: data.profileDeactivated ? 'destructive' : 'default',
      });
      setIsProfileSettingsOpen(false);
      setDeactivationReason('');
    },
    onError: (error) => {
      toast({
        title: "Error updating profile",
        description: error.message || "Failed to update profile status",
        variant: "destructive",
      });
    }
  });

  const handleProfileDeactivation = () => {
    if (!deactivationReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for deactivating your profile",
        variant: "destructive",
      });
      return;
    }
    
    profileStatusMutation.mutate({ action: 'deactivate', reason: deactivationReason });
  };

  const handleProfileReactivation = () => {
    profileStatusMutation.mutate({ action: 'reactivate' });
  };

  // Password change mutation
  const passwordChangeMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/auth/change-password", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Password Updated",
        description: data.message || "Your password has been updated successfully.",
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Password Update Failed",
        description: error.message || "Failed to update password. Please try again.",
      });
    }
  });

  // Mutation for canceling appointments
  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      await apiRequest('PATCH', `/api/appointments/${appointmentId}/cancel`, {
        reason: 'Cancelled by therapist from dashboard'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/dashboard'] });
      setShowCancelDialog(false);
      setAppointmentToCancel(null);
      toast({
        title: "Appointment Cancelled",
        description: "The appointment has been cancelled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Unable to cancel appointment. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mutation for rescheduling appointments
  const rescheduleAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId, newDate, newTime }: { appointmentId: string; newDate: string; newTime: string }) => {
      await apiRequest('PUT', `/api/appointments/${appointmentId}/reschedule`, {
        newDate,
        newTime,
        reason: 'Rescheduled by therapist from dashboard'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/dashboard'] });
      setShowRescheduleDialog(false);
      setAppointmentToReschedule(null);
      setRescheduleDate("");
      setRescheduleTime("");
      toast({
        title: "Appointment Rescheduled",
        description: "The appointment has been rescheduled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Rescheduling Failed",
        description: error.message || "Unable to reschedule appointment. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Join video session mutation for therapists
  const joinVideoSessionMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      return await apiRequest('POST', `/api/appointments/${appointmentId}/join-video`);
    },
    onSuccess: (data: any) => {
      if (data.meetingLink) {
        // Open Google Meet link in new tab
        window.open(data.meetingLink, '_blank');
        toast({
          title: "Joining Session",
          description: "Opening video session in new tab...",
        });
      } else {
        toast({
          title: "Session Ready",
          description: "Video session is starting...",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Unable to Join",
        description: error.message || "Video session not ready yet.",
        variant: "destructive",
      });
    }
  });

  // Instant payout preview mutation
  const instantPayoutPreviewMutation = useMutation({
    mutationFn: async (amount: number) => {
      return await apiRequest('POST', '/api/therapist/instant-payout/preview', { amount });
    },
    onSuccess: (data: any) => {
      setShowPayoutDetails(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to calculate instant payout fees",
        variant: "destructive",
      });
    }
  });

  // Process instant payout mutation
  const processInstantPayoutMutation = useMutation({
    mutationFn: async (amount: number) => {
      return await apiRequest('POST', '/api/therapist/instant-payout', { amount });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/payout-info'] });
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/instant-payout/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/therapist/dashboard'] });
      
      toast({
        title: "Instant Payout Successful!",
        description: `£${data.netAmount} is being transferred to your account. Funds typically arrive within 30 minutes.`,
      });
      
      setIsInstantPayoutDialogOpen(false);
      setInstantPayoutAmount('');
      setShowPayoutDetails(false);
    },
    onError: (error: any) => {
      toast({
        title: "Instant Payout Failed",
        description: error.message || "Failed to process instant payout. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handlePasswordChange = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all password fields.",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        variant: "destructive", 
        title: "Password Mismatch",
        description: "New password and confirmation password do not match.",
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "Password Too Short",
        description: "New password must be at least 8 characters long.",
      });
      return;
    }

    passwordChangeMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    });
  };



  if (isLoading || isProfileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-hive-purple rounded-full"></div>
      </div>
    );
  }

  const data = actualData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Enhanced Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-primary font-bold text-hive-black">
                  Welcome back, Dr. {user?.firstName || 'Therapist'}
                </h1>
                {profileStatus?.profileDeactivated && (
                  <Badge variant="destructive" className="flex items-center space-x-1">
                    <EyeOff className="w-3 h-3" />
                    <span>Profile Hidden</span>
                  </Badge>
                )}
              </div>
              <p className="text-sm text-hive-black/70 font-secondary">
                {new Date().toLocaleDateString('en-GB', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div className="flex space-x-3">
              <Dialog open={isProfileSettingsOpen} onOpenChange={setIsProfileSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Profile Settings
                  </Button>
                </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Profile Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      {profileStatus?.profileDeactivated ? (
                        <EyeOff className="w-5 h-5 mr-2 text-red-500" />
                      ) : (
                        <Eye className="w-5 h-5 mr-2 text-green-500" />
                      )}
                      Profile Visibility
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Profile Status</p>
                          <p className="text-sm text-gray-600">
                            {profileStatus?.profileDeactivated 
                              ? "Your profile is currently hidden from client matching and visibility"
                              : "Your profile is visible to clients and available for matching"
                            }
                          </p>
                        </div>
                        <Switch 
                          checked={!profileStatus?.profileDeactivated}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleProfileReactivation();
                            } else {
                              // Need to collect reason for deactivation
                              setDeactivationReason('');
                            }
                          }}
                        />
                      </div>
                      
                      {profileStatus?.profileDeactivated && (
                        <div className="p-4 bg-red-50 rounded-lg">
                          <p className="text-sm font-medium text-red-800">Profile Deactivated</p>
                          <p className="text-sm text-red-600 mt-1">
                            Reason: {profileStatus.deactivationReason || 'No reason provided'}
                          </p>
                          <p className="text-sm text-red-600">
                            Deactivated: {profileStatus.deactivatedAt ? new Date(profileStatus.deactivatedAt).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                      )}
                      
                      {!profileStatus?.profileDeactivated && (
                        <div className="space-y-3">
                          <Label htmlFor="deactivationReason">
                            To temporarily hide your profile, please provide a reason:
                          </Label>
                          <Textarea
                            id="deactivationReason"
                            placeholder="e.g., Taking a break, on holiday, temporary unavailability..."
                            value={deactivationReason}
                            onChange={(e) => setDeactivationReason(e.target.value)}
                            className="min-h-[80px]"
                          />
                          <Button 
                            onClick={handleProfileDeactivation}
                            disabled={!deactivationReason.trim() || profileStatusMutation.isPending}
                            variant="destructive"
                            className="w-full"
                          >
                            {profileStatusMutation.isPending ? 'Deactivating...' : 'Deactivate Profile'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Password Update Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Key className="w-5 h-5 mr-2 text-blue-500" />
                      Change Password
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                          placeholder="Enter your current password"
                        />
                      </div>
                      <div>
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                          placeholder="Enter your new password (min 8 characters)"
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                          placeholder="Confirm your new password"
                        />
                      </div>
                      <Button 
                        onClick={handlePasswordChange}
                        disabled={passwordChangeMutation.isPending}
                        className="w-full"
                      >
                        {passwordChangeMutation.isPending ? 'Updating Password...' : 'Update Password'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </DialogContent>
          </Dialog>
          <Button 
            variant="outline" 
            onClick={handleLogout} 
            className="flex items-center"
            data-testid="button-therapist-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>

    {/* Main Content Container */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">

        {/* Enhanced Progress Overview Card */}
        <div className="bg-gradient-to-r from-hive-purple to-hive-blue text-white p-8 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-primary font-bold mb-3">Practice Overview</h2>
              <p className="font-secondary text-hive-light-blue text-lg">
                Manage your practice and connect with clients
              </p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{data.overview.activeClients}</div>
                <div className="text-sm opacity-90">Active Clients</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{data.overview.sessionsThisWeek}</div>
                <div className="text-sm opacity-90">This Week</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">£{data.overview.totalEarnings.toLocaleString()}</div>
                <div className="text-sm opacity-90">Total Earnings</div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-secondary font-medium text-hive-black/70">Total Clients</p>
                  <p className="text-2xl font-primary font-bold text-hive-black">{data.overview.totalClients}</p>
                  <p className="text-xs font-secondary text-hive-black/50">{data.overview.activeClients} active</p>
                </div>
                <div className="p-3 bg-hive-purple/10 rounded-full">
                  <Users className="h-6 w-6 text-hive-purple" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-secondary font-medium text-hive-black/70">This Week</p>
                  <p className="text-2xl font-primary font-bold text-hive-black">{data.overview.sessionsThisWeek}</p>
                  <p className="text-xs font-secondary text-hive-black/50">sessions completed</p>
                </div>
                <div className="p-3 bg-hive-purple/10 rounded-full">
                  <Calendar className="h-6 w-6 text-hive-purple" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-secondary font-medium text-hive-black/70">Response Time</p>
                  <p className="text-2xl font-primary font-bold text-hive-black">{data.overview.responseTime}</p>
                  <p className="text-xs font-secondary text-hive-black/50">average</p>
                </div>
                <div className="p-3 bg-hive-purple/10 rounded-full">
                  <Clock className="h-6 w-6 text-hive-purple" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-secondary font-medium text-hive-black/70">Total Earnings</p>
                  <p className="text-2xl font-primary font-bold text-hive-black">£{data.overview.totalEarnings.toLocaleString()}</p>
                  <p className="text-xs font-secondary text-hive-black/50">total this month</p>
                </div>
                <div className="p-3 bg-hive-purple/10 rounded-full">
                  <PoundSterling className="h-6 w-6 text-hive-purple" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instant Payout Card */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-green-700">
              <Zap className="h-5 w-5 mr-2" />
              Instant Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Available Balance */}
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">
                  {payoutInfo?.availableBalance || '£0.00'}
                </div>
                <div className="text-sm text-green-600">Available for instant payout</div>
                {payoutInfo?.pendingPayouts > 0 && (
                  <div className="text-xs text-green-500 mt-1">
                    {payoutInfo.pendingPayouts} payment{payoutInfo.pendingPayouts > 1 ? 's' : ''} ready
                  </div>
                )}
              </div>

              {/* Instant Payout Benefits */}
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <Timer className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-sm font-medium text-green-700">Within 30 minutes</div>
                <div className="text-xs text-green-600">Available 24/7</div>
              </div>

              {/* Action Button */}
              <div className="text-center">
                <Dialog open={isInstantPayoutDialogOpen} onOpenChange={setIsInstantPayoutDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      disabled={!payoutInfo?.instantPayoutEligible || parseFloat(payoutInfo?.availableBalance?.replace('£', '') || '0') <= 0}
                      data-testid="button-instant-payout"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Get Instant Payout
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center">
                        <Zap className="h-5 w-5 mr-2 text-green-600" />
                        Instant Payout
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {!payoutInfo?.instantPayoutEligible ? (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center text-yellow-700">
                            <AlertCircle className="h-5 w-5 mr-2" />
                            Account Setup Required
                          </div>
                          <p className="text-sm text-yellow-600 mt-1">
                            Complete your Stripe account setup to enable instant payouts.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg">
                            <div>
                              <div className="text-sm text-green-600">Available Amount</div>
                              <div className="text-lg font-bold text-green-700">
                                {payoutInfo?.availableBalance || '£0.00'}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-green-600">Processing Fee (1%)</div>
                              <div className="text-lg font-bold text-green-700">
                                {payoutInfo?.instantFee || '£0.00'}
                              </div>
                            </div>
                          </div>

                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="text-lg font-bold text-blue-700">
                              You'll receive: {payoutInfo?.netAmount || '£0.00'}
                            </div>
                            <div className="text-sm text-blue-600 mt-1">
                              Funds typically arrive within 30 minutes
                            </div>
                          </div>

                          <div className="text-center space-y-2">
                            <Button 
                              onClick={() => {
                                const amount = parseFloat(payoutInfo?.availableBalance?.replace('£', '') || '0');
                                if (amount > 0) {
                                  processInstantPayoutMutation.mutate(amount);
                                }
                              }}
                              disabled={processInstantPayoutMutation.isPending}
                              className="w-full bg-green-600 hover:bg-green-700"
                              data-testid="button-confirm-instant-payout"
                            >
                              {processInstantPayoutMutation.isPending ? (
                                <>Processing...</>
                              ) : (
                                <>
                                  <Zap className="h-4 w-4 mr-2" />
                                  Confirm Instant Payout
                                </>
                              )}
                            </Button>
                            <p className="text-xs text-gray-500">
                              By confirming, you agree to the 1% processing fee for instant access.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Regular Payout Information */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-600">
                  Regular payout (free): {payoutInfo?.nextRegularPayout ? 
                    new Date(payoutInfo.nextRegularPayout).toLocaleDateString() : 
                    '3 business days'
                  }
                </div>
                <div className="text-gray-500">No fees</div>
              </div>
            </div>

            {/* Recent Instant Payouts */}
            {payoutHistory && payoutHistory.payouts && payoutHistory.payouts.filter((p: any) => p.payoutType === 'instant').length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Instant Payouts</h4>
                <div className="space-y-2">
                  {payoutHistory.payouts
                    .filter((p: any) => p.payoutType === 'instant')
                    .slice(0, 3)
                    .map((payout: any) => (
                      <div key={payout.id} className="flex items-center justify-between text-sm p-2 bg-green-50 rounded">
                        <div>
                          <div className="font-medium">£{payout.netAmount}</div>
                          <div className="text-gray-500 text-xs">
                            {new Date(payout.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-green-600">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enhanced Upcoming Sessions with Calendar View */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-hive-black">
                <Clock className="h-5 w-5 mr-2 text-hive-purple" />
                {viewMode === 'overview' ? 'Upcoming Sessions' : 'Weekly Calendar'}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'overview' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('overview')}
                  className="text-xs"
                >
                  Overview
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                  className="text-xs"
                >
                  <CalendarDays className="h-4 w-4 mr-1" />
                  Full Calendar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayedSessions.length === 0 ? (
                <div className="text-center py-8 text-hive-black/70">
                  <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No upcoming sessions scheduled</p>
                </div>
              ) : (
                displayedSessions
                  .filter((session: any) => session && session.id) // Additional filter to ensure valid sessions
                  .map((session: any) => {
                  // Safely construct session time - check for scheduledAt first, fallback to date/time
                  let sessionTime: Date;
                  if (session.scheduledAt) {
                    sessionTime = new Date(session.scheduledAt);
                  } else if (session.date && session.time) {
                    sessionTime = new Date(`${session.date} ${session.time}`);
                  } else {
                    // Invalid date - skip this session
                    console.warn('Session missing valid date/time:', session);
                    return null;
                  }
                  
                  // Validate the constructed date
                  if (isNaN(sessionTime.getTime())) {
                    console.warn('Invalid session time constructed:', { session, sessionTime });
                    return null;
                  }
                  
                  const canJoin = canJoinSession(sessionTime.toISOString());
                  
                  return (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-hive-light-blue/10 rounded-lg border border-hive-purple/10">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium cursor-pointer hover:text-hive-purple transition-colors text-hive-black"
                                  onClick={() => onNavigateToService?.('client-matching')}
                              >
                                {session.clientName}
                              </h4>
                              {canJoin && (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  Ready to Join
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-hive-black/70">
                              <span className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {formatSessionDate(sessionTime.toISOString())}
                              </span>
                              <span className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {session.time} ({session.duration}min)
                              </span>
                              <span className="capitalize">{session.type}</span>
                            </div>
                            <p className="text-xs text-hive-purple mt-1">Click name for client management</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <div className="flex items-center space-x-2">
                          {canJoin ? (
                            <Button
                              onClick={() => joinVideoSessionMutation.mutate(session.id)}
                              disabled={joinVideoSessionMutation.isPending}
                              className="bg-green-600 hover:bg-green-700 text-white"
                              size="sm"
                              data-testid="button-therapist-join-session"
                            >
                              <Video className="h-4 w-4 mr-1" />
                              {joinVideoSessionMutation.isPending ? 'Joining...' : 'Join Session'}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="text-hive-black/50"
                            >
                              <Clock className="h-4 w-4 mr-1" />
                              Not Ready
                            </Button>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {session.status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-hive-purple text-hive-purple hover:bg-hive-purple/5"
                            onClick={() => {
                              setAppointmentToReschedule(session);
                              setShowRescheduleDialog(true);
                            }}
                            data-testid="button-therapist-reschedule-appointment"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Reschedule
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-500 text-red-500 hover:bg-red-50"
                            onClick={() => {
                              setAppointmentToCancel(session);
                              setShowCancelDialog(true);
                            }}
                            data-testid="button-therapist-cancel-appointment"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                }).filter(Boolean) // Remove null items from invalid sessions
              )}
            </div>
            {hasMoreSessions && (
                <Button
                  variant="ghost"
                  className="w-full text-hive-purple hover:text-hive-purple/80"
                  onClick={() => setViewMode('calendar')}
                >
                  View All Sessions ({allSessions.length} total)
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
          </CardContent>
        </Card>

        {/* Client Alerts & Quick Stats */}
        <div className="space-y-6">
          {/* Client Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-hive-black">
                <AlertCircle className="h-5 w-5 mr-2 text-hive-purple" />
                Client Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.clientAlerts.map((alert: any) => (
                  <div key={alert.id} className={`p-3 rounded-lg border ${
                    alert.type === 'urgent' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-hive-black cursor-pointer hover:text-hive-purple transition-colors"
                           onClick={() => onNavigateToService?.('client-matching')}
                        >
                          {alert.client}
                        </p>
                        <p className="text-sm text-hive-black/70 mt-1">{alert.message}</p>
                      </div>
                      {alert.type === 'urgent' && (
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                      )}
                    </div>
                    <p className="text-xs text-hive-black/50 mt-2">{alert.time}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-hive-black">
                <BarChart3 className="h-5 w-5 mr-2 text-hive-purple" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-hive-black/70">Sessions</span>
                  <span className="font-medium text-hive-black">{data.weeklyStats.sessionsCompleted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-hive-black/70">New Clients</span>
                  <span className="font-medium text-hive-black">{data.weeklyStats.newClients}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-hive-black/70">Monthly Billing</span>
                  <span className="font-medium text-hive-black">£{(data.overview.totalEarnings * 0.85).toFixed(0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-hive-black/70">Total Hours</span>
                  <span className="font-medium text-hive-black">{data.weeklyStats.totalHours}h</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assigned Clients Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-hive-black">
            <Users className="h-5 w-5 mr-2 text-hive-purple" />
            My Assigned Clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientsLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin w-6 h-6 border-4 border-gray-300 border-t-hive-purple rounded-full"></div>
            </div>
          ) : assignedClients && Array.isArray(assignedClients) && assignedClients.length > 0 ? (
            <div className="space-y-4">
              {assignedClients.map((client: any) => (
                <div key={client.id} className="flex items-center justify-between p-4 bg-hive-light-blue/10 rounded-lg border border-hive-light-blue/20">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <h4 className="font-medium text-hive-black cursor-pointer hover:text-hive-purple transition-colors"
                            onClick={() => onNavigateToService?.('client-matching')}
                        >
                          {client.firstName} {client.lastName}
                        </h4>
                        <p className="text-sm text-hive-black/70">{client.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            Assigned Client
                          </Badge>
                          {client.assignedDate && (
                            <span className="text-xs text-hive-black/50">
                              Since {new Date(client.assignedDate).toLocaleDateString('en-GB')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {client.profileData && (
                      <div className="mt-2 text-sm text-hive-black/60">
                        {client.profileData.preferredGender && (
                          <span className="mr-4">Preferred Gender: {client.profileData.preferredGender}</span>
                        )}
                        {client.profileData.religion && (
                          <span className="mr-4">Religion: {client.profileData.religion}</span>
                        )}
                        {client.profileData.supportAreas && (
                          <span>Support Areas: {client.profileData.supportAreas.join(', ')}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => onNavigateToService?.('client-matching')}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => onNavigateToService?.('client-matching')}
              >
                Manage All Clients
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-hive-black/30 mx-auto mb-4" />
              <p className="text-hive-black/70 font-secondary">No clients assigned yet</p>
              <p className="text-sm text-hive-black/50 font-secondary mt-1">
                Clients will appear here once they've been matched to you
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-hive-black">
            <Activity className="h-5 w-5 mr-2 text-hive-purple" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.recentActivity.map((activity: any) => (
              <div key={activity.id} className="flex items-center space-x-4 p-3 hover:bg-hive-light-blue/20 rounded-lg">
                <div className={`p-2 rounded-full ${
                  activity.type === 'session_completed' ? 'bg-green-100' :
                  activity.type === 'message_received' ? 'bg-hive-blue/10' : 'bg-hive-purple/10'
                }`}>
                  {activity.type === 'session_completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {activity.type === 'message_received' && <MessageSquare className="h-4 w-4 text-hive-blue" />}
                  {activity.type === 'note_added' && <FileText className="h-4 w-4 text-hive-purple" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-hive-black cursor-pointer hover:text-hive-purple transition-colors"
                     onClick={() => onNavigateToService?.('client-matching')}
                  >
                    {activity.client}
                  </p>
                  <p className="text-sm text-hive-black/70">{activity.description}</p>
                </div>
                <p className="text-xs text-hive-black/50">{activity.time}</p>
              </div>
            ))}
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
              Are you sure you want to cancel the appointment{appointmentToCancel ? ` with ${appointmentToCancel.clientName} on ${appointmentToCancel.date} at ${appointmentToCancel.time}` : ''}? 
              This action cannot be undone. Your client will be notified of the cancellation.
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
                if (appointmentToCancel?.id) {
                  cancelAppointmentMutation.mutate(appointmentToCancel.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={cancelAppointmentMutation.isPending}
            >
              {cancelAppointmentMutation.isPending ? 'Cancelling...' : 'Yes, Cancel Appointment'}
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
              Select a new date and time for the appointment{appointmentToReschedule ? ` with ${appointmentToReschedule.clientName}` : ''}.
              No additional charge will be applied to your client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="therapist-reschedule-date">New Date</Label>
              <Input
                id="therapist-reschedule-date"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                data-testid="input-therapist-reschedule-date"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="therapist-reschedule-time">New Time</Label>
              <Input
                id="therapist-reschedule-time"
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                data-testid="input-therapist-reschedule-time"
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
                    newTime: rescheduleTime
                  });
                }
              }}
              className="bg-hive-purple hover:bg-hive-purple/90"
              disabled={rescheduleAppointmentMutation.isPending || !rescheduleDate || !rescheduleTime}
              data-testid="button-therapist-confirm-reschedule"
            >
              {rescheduleAppointmentMutation.isPending ? 'Rescheduling...' : 'Confirm Reschedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}