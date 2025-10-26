import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Calendar, 
  Clock, 
  Users, 
  Video, 
  Plus, 
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  User as UserIcon,
  MessageCircle,
  PoundSterling
} from "lucide-react";
import type { User } from "@shared/schema";

interface TherapistSessionBookingProps {
  user: User;
}

interface SessionSlot {
  id: string;
  date: string;
  time: string;
  duration: number;
  sessionType: 'video-therapy';
  clientId?: string;
  clientName?: string;
  status: 'available' | 'booked' | 'completed' | 'cancelled';
  notes?: string;
  sessionRate: number;
}

interface BookingRequest {
  date: string;
  time: string;
  duration: number;
  sessionType: string;
  clientId?: string;
  notes?: string;
  sessionRate: number;
}

interface AssignedClient {
  id: string;
  name: string;
  email: string;
  assignedDate: string;
  sessionCount: number;
  lastSession?: string;
  status: 'active' | 'pending' | 'paused';
  hasPaymentMethod: boolean;
}

export default function TherapistSessionBooking({ user }: TherapistSessionBookingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSession, setNewSession] = useState<Partial<BookingRequest>>({
    duration: 60, // 1 hour (50 minutes + 10-minute buffer)
    sessionType: 'video-therapy', // Only video therapy sessions allowed
    sessionRate: 60 // Default session rate £60
  });

  const { data: sessions = [], isLoading } = useQuery<SessionSlot[]>({
    queryKey: ["/api/therapist/sessions", user.id],
    retry: false,
  });

  const { data: assignedClients = [] } = useQuery<AssignedClient[]>({
    queryKey: [`/api/therapist/assigned-clients/${user.id}`],
    retry: false,
  });

  const { data: availableSlots = [] } = useQuery({
    queryKey: ["/api/therapist/available-slots", user.id, selectedDate],
    retry: false,
  });

  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: BookingRequest) => {
      return await apiRequest('POST', '/api/therapist/create-session-with-approval', sessionData);
    },
    onSuccess: (data: any) => {
      if (data.requiresPaymentApproval) {
        toast({
          title: "Session Created - Client Approval Required",
          description: `Session sent to ${data.clientName} for payment approval. They will receive an email notification.`,
        });
      } else {
        toast({
          title: "Session Created",
          description: "Your session has been scheduled successfully.",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/assigned-clients"] });
      setIsCreatingSession(false);
      setNewSession({ duration: 60, sessionType: 'video-therapy', sessionRate: 60 });
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Unable to create session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: async ({ sessionId, updates }: { sessionId: string; updates: Partial<SessionSlot> }) => {
      return await apiRequest('PATCH', `/api/therapist/sessions/${sessionId}`, updates);
    },
    onSuccess: () => {
      toast({
        title: "Session Updated",
        description: "Session details have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/sessions"] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Unable to update session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest('DELETE', `/api/therapist/sessions/${sessionId}`);
    },
    onSuccess: () => {
      toast({
        title: "Session Cancelled",
        description: "The session has been cancelled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/therapist/sessions"] });
    },
    onError: () => {
      toast({
        title: "Cancellation Failed",
        description: "Unable to cancel session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateSession = () => {
    if (!newSession.date || !newSession.time) {
      toast({
        title: "Missing Information",
        description: "Please select a date and time for the session.",
        variant: "destructive",
      });
      return;
    }

    if (!newSession.sessionRate) {
      setNewSession({...newSession, sessionRate: 60});
    }

    const sessionData = {
      ...newSession,
      sessionRate: newSession.sessionRate || 60,
      therapistId: user.id
    } as BookingRequest;

    createSessionMutation.mutate(sessionData);
  };

  const todaySessions = sessions.filter(session => 
    new Date(session.date).toDateString() === new Date().toDateString()
  );

  const upcomingSessions = sessions.filter(session => 
    new Date(session.date) > new Date() && 
    new Date(session.date).toDateString() !== new Date().toDateString()
  ).slice(0, 5);

  const getSessionTypeColor = (type: string) => {
    switch (type) {
      case 'individual': return 'bg-blue-100 text-blue-800';
      case 'group': return 'bg-purple-100 text-purple-800';
      case 'consultation': return 'bg-green-100 text-green-800';
      case 'peer-session': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'booked': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-century font-bold text-hive-black">Session Management</h2>
        <Button 
          onClick={(e) => {
            e.preventDefault();
            console.log('Main Create Session button clicked');
            setIsCreatingSession(true);
            console.log('isCreatingSession set to true (main button)');
          }}
          className="bg-hive-purple hover:bg-hive-purple/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Session
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Today's Sessions</p>
                <p className="text-2xl font-bold text-blue-900">{todaySessions.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">This Week</p>
                <p className="text-2xl font-bold text-purple-900">{sessions.length}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Active Clients</p>
                <p className="text-2xl font-bold text-green-900">{assignedClients.length}</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">Monthly Earnings</p>
                <p className="text-2xl font-bold text-orange-900">
                  £{sessions.filter(s => s.status === 'completed').reduce((total, s) => total + s.sessionRate, 0).toFixed(2)}
                </p>
              </div>
              <PoundSterling className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Clients Section */}
      <Card className="border-2 border-hive-purple/20">
        <CardHeader>
          <CardTitle className="text-hive-purple flex items-center gap-2">
            <Users className="w-5 h-5" />
            Assigned Clients ({assignedClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignedClients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No clients assigned yet</p>
              <p className="text-sm">Contact admin to have clients assigned to you</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedClients.map((client) => (
                <div key={client.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {client.name}
                      </h4>
                      <p className="text-sm text-gray-500">{client.email}</p>
                      <p className="text-xs text-gray-400 mt-1">Client profile access coming soon</p>
                    </div>
                    <Badge variant={client.hasPaymentMethod ? 'default' : 'destructive'} className="text-xs">
                      {client.hasPaymentMethod ? 'Payment Ready' : 'No Payment Method'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Sessions:</span>
                      <span className="font-medium">{client.sessionCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Assigned:</span>
                      <span>{new Date(client.assignedDate).toLocaleDateString()}</span>
                    </div>
                    {client.lastSession && (
                      <div className="flex justify-between">
                        <span>Last Session:</span>
                        <span>{new Date(client.lastSession).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-2">
                    <Button 
                      size="sm" 
                      className="w-full bg-hive-purple hover:bg-hive-purple/90"
                      onClick={(e) => {
                        e.preventDefault();
                        console.log('Create Session button clicked for client:', client.name);
                        setNewSession({
                          ...newSession,
                          clientId: client.id,
                          sessionRate: 60 // Default rate £60, can be adjusted
                        });
                        setIsCreatingSession(true);
                        console.log('isCreatingSession set to true');
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Session
                    </Button>
                    {!client.hasPaymentMethod && (
                      <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                        ⚠️ Client needs to add payment method before booking sessions
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Session Form */}
      {isCreatingSession && (
        <Card className="border-2 border-hive-purple/20">
          <CardHeader>
            <CardTitle className="text-hive-purple">Create New Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sessionDate">Date</Label>
                <Input
                  id="sessionDate"
                  type="date"
                  value={newSession.date || ''}
                  onChange={(e) => setNewSession({...newSession, date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label htmlFor="sessionTime">Time</Label>
                <Input
                  id="sessionTime"
                  type="time"
                  value={newSession.time || ''}
                  onChange={(e) => setNewSession({...newSession, time: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sessionType">Session Type</Label>
                <Select value={newSession.sessionType} onValueChange={(value) => setNewSession({...newSession, sessionType: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Video Therapy Session" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video-therapy">Video Therapy Session</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="duration">Duration</Label>
                <Select value={newSession.duration?.toString()} onValueChange={(value) => setNewSession({...newSession, duration: parseInt(value)})}>
                  <SelectTrigger>
                    <SelectValue placeholder="1 hour (recommended)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">1 hour (50 minutes + 10-minute buffer)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-600 mt-1">Standard therapy sessions are 1 hour with built-in buffer time</p>
              </div>
            </div>

            <div>
              <Label htmlFor="client">Assigned Client (Optional)</Label>
              <Select value={newSession.clientId} onValueChange={(value) => setNewSession({...newSession, clientId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client (leave empty for open slot)" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(assignedClients) && assignedClients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center gap-2">
                        <span>{client.name}</span>
                        <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                          {client.sessionCount} sessions
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600 mt-1">Select a client to schedule a session with them, or leave empty for an open appointment slot</p>
            </div>

            <div>
              <Label htmlFor="sessionRate">Session Rate (£)</Label>
              <Input
                id="sessionRate"
                type="number"
                min="30"
                max="200"
                step="5"
                placeholder="60"
                value={newSession.sessionRate || 60}
                onChange={(e) => setNewSession({...newSession, sessionRate: parseInt(e.target.value) || 60})}
              />
              <p className="text-sm text-gray-600 mt-1">You will receive 85% (£{((newSession.sessionRate || 60) * 0.85).toFixed(2)}) after platform fees</p>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this session..."
                value={newSession.notes || ''}
                onChange={(e) => setNewSession({...newSession, notes: e.target.value})}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleCreateSession}
                disabled={createSessionMutation.isPending}
                className="bg-hive-purple hover:bg-hive-purple/90"
              >
                {createSessionMutation.isPending ? 'Creating...' : 'Create Session'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsCreatingSession(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-hive-purple" />
            Today's Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaySessions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No sessions scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todaySessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-hive-light-blue rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-hive-black">{session.time}</span>
                      <span className="text-sm text-gray-600">{session.duration} min</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <Badge className={getSessionTypeColor(session.sessionType)}>
                          {session.sessionType}
                        </Badge>
                        <Badge className={getStatusColor(session.status)}>
                          {session.status}
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-600 mt-1">
                        {session.clientName || 'Available slot'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-green-600">
                      £{session.sessionRate}
                    </span>
                    <Button size="sm" variant="outline">
                      <Video className="w-4 h-4 mr-1" />
                      Join
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-hive-purple" />
            Upcoming Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingSessions.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No upcoming sessions scheduled</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-sm">
                      <div className="font-medium">{new Date(session.date).toLocaleDateString()}</div>
                      <div className="text-gray-600">{session.time} - {session.duration} min</div>
                    </div>
                    <Badge className={getSessionTypeColor(session.sessionType)}>
                      {session.sessionType}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {session.clientName || 'Available'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-green-600">£{session.sessionRate}</span>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}