import { useState } from "react";
import AppointmentModal from "./appointment-management-modal";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar,
  Clock,
  User,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistance } from "date-fns";

interface Appointment {
  id: string;
  clientId: string;
  therapistId: string;
  clientName: string;
  therapistName: string;
  date: string;
  time: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  type: string;
  duration: number;
  notes: string;
  fee: number;
  createdAt: string;
  scheduledAt: string;
  endTime: string;
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archivedReason?: string;
}

interface AppointmentStats {
  totalAppointments: number;
  scheduledCount: number;
  completedCount: number;
  cancelledCount: number;
  upcomingToday: number;
}

interface AppointmentResponse {
  success: boolean;
  appointments: Appointment[];
  stats: AppointmentStats;
  message?: string;
}

export default function AppointmentManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [archiveView, setArchiveView] = useState<"upcoming" | "past" | "archived">("upcoming");
  const [selectedForArchive, setSelectedForArchive] = useState<Set<string>>(new Set());
  const [archiveReason, setArchiveReason] = useState("");

  // Determine archived parameter based on current view
  const getArchivedParam = () => {
    switch (archiveView) {
      case "upcoming":
        return false;
      case "past":
        return false;
      case "archived":
        return true;
      default:
        return false;
    }
  };

  // Fetch appointments data using the new filtered endpoint
  const {
    data: appointmentsData,
    isLoading,
    error,
  } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments/filtered", { archived: getArchivedParam() }],
    retry: 3,
    staleTime: 0,
  });

  console.log("Appointment Management Debug:", {
    isLoading,
    error,
    appointmentsData,
    hasAppointments: !!appointmentsData?.length,
  });

  const appointments: Appointment[] = appointmentsData || [];

  // Calculate stats from appointments
  const stats: AppointmentStats = {
    totalAppointments: appointments.length,
    scheduledCount: appointments.filter((a) => a.status === "scheduled").length,
    completedCount: appointments.filter((a) => a.status === "completed").length,
    cancelledCount: appointments.filter((a) => a.status === "cancelled").length,
    upcomingToday: appointments.filter((a) => {
      const today = new Date().toDateString();
      const appointmentDate = new Date(a.scheduledAt || a.date).toDateString();
      return appointmentDate === today && a.status === "scheduled";
    }).length,
  };

  // Display debug info for troubleshooting
  console.log("Raw appointment data:", appointmentsData);
  console.log("Parsed appointments:", appointments);
  console.log("Parsed stats:", stats);

  // Archive appointments mutation
  const archiveAppointmentsMutation = useMutation({
    mutationFn: async (data: { appointmentIds: string[]; reason: string }) => {
      return apiRequest(`/api/appointments/archive`, {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointments archived successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/filtered"] });
      setSelectedForArchive(new Set());
      setArchiveReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to archive appointments",
        variant: "destructive",
      });
    },
  });

  // Unarchive appointment mutation
  const unarchiveAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      return apiRequest(`/api/appointments/${appointmentId}/unarchive`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Appointment unarchived successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/filtered"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to unarchive appointment",
        variant: "destructive",
      });
    },
  });

  // Filter appointments based on search, status and time
  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch =
      searchTerm === "" ||
      appointment.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.therapistName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || appointment.status === statusFilter;

    // Time-based filtering for upcoming vs past
    const now = new Date();
    const appointmentTime = new Date(appointment.scheduledAt || appointment.date);
    const isPast = appointmentTime < now;

    const matchesTimeFilter =
      archiveView === "upcoming"
        ? !isPast && !appointment.isArchived
        : archiveView === "past"
          ? isPast && !appointment.isArchived
          : archiveView === "archived"
            ? appointment.isArchived
            : true;

    return matchesSearch && matchesStatus && matchesTimeFilter;
  });

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "no_show":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Clock className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      case "no_show":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const handleArchiveSelected = () => {
    if (selectedForArchive.size === 0) {
      toast({
        title: "No appointments selected",
        description: "Please select appointments to archive",
        variant: "destructive",
      });
      return;
    }

    if (!archiveReason.trim()) {
      toast({
        title: "Archive reason required",
        description: "Please provide a reason for archiving",
        variant: "destructive",
      });
      return;
    }

    archiveAppointmentsMutation.mutate({
      appointmentIds: Array.from(selectedForArchive),
      reason: archiveReason.trim(),
    });
  };

  const handleUnarchiveAppointment = (appointmentId: string) => {
    unarchiveAppointmentMutation.mutate(appointmentId);
  };

  const handleSelectAllForArchive = (checked: boolean) => {
    if (checked) {
      const eligibleAppointments = filteredAppointments.filter(
        (a) =>
          !a.isArchived &&
          (a.status === "completed" || a.status === "cancelled" || a.status === "no_show")
      );
      setSelectedForArchive(new Set(eligibleAppointments.map((a) => a.id)));
    } else {
      setSelectedForArchive(new Set());
    }
  };

  const canArchiveAppointment = (appointment: Appointment) => {
    return (
      !appointment.isArchived &&
      (appointment.status === "completed" ||
        appointment.status === "cancelled" ||
        appointment.status === "no_show")
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-primary text-hive-black">Appointment Management</h1>
          <p className="text-hive-black/60 font-secondary">
            Monitor and manage all therapy appointments
          </p>
        </div>
        <Button
          className="bg-hive-purple hover:bg-hive-purple/90"
          onClick={() => setShowNewAppointmentModal(true)}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Schedule New Appointment
        </Button>

        <AppointmentModal
          open={showNewAppointmentModal}
          onOpenChange={setShowNewAppointmentModal}
        />
      </div>

      {/* Archive Controls (only show for past view) */}
      {archiveView === "past" && selectedForArchive.size > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex-1">
                <Label htmlFor="archive-reason">Archive Reason</Label>
                <Input
                  id="archive-reason"
                  placeholder="Enter reason for archiving these appointments..."
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedForArchive(new Set());
                    setArchiveReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleArchiveSelected}
                  disabled={archiveAppointmentsMutation.isPending || !archiveReason.trim()}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive {selectedForArchive.size} Appointments
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabbed View */}
      <Tabs value={archiveView} onValueChange={(value: any) => setArchiveView(value)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming" className="data-[state=active]:bg-blue-100">
            <Clock className="w-4 h-4 mr-2" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="past" className="data-[state=active]:bg-gray-100">
            <CheckCircle className="w-4 h-4 mr-2" />
            Past
          </TabsTrigger>
          <TabsTrigger value="archived" className="data-[state=active]:bg-yellow-100">
            <Archive className="w-4 h-4 mr-2" />
            Archived
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <div className="space-y-6">
            {/* Appointments Table */}
            <Card className="bg-white border-0 shadow-md">
              <CardHeader>
                <CardTitle className="font-primary text-hive-black">
                  Upcoming Appointments (
                  {
                    filteredAppointments.filter((a) => {
                      const now = new Date();
                      const appointmentTime = new Date(a.scheduledAt || a.date);
                      return appointmentTime >= now && !a.isArchived;
                    }).length
                  }
                  )
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredAppointments.filter((a) => {
                  const now = new Date();
                  const appointmentTime = new Date(a.scheduledAt || a.date);
                  return appointmentTime >= now && !a.isArchived;
                }).length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                    <p className="text-hive-black/60 font-secondary">
                      {appointments.length === 0
                        ? "No upcoming appointments found"
                        : "No upcoming appointments match your search criteria"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-4 font-secondary text-hive-black/70">ID</th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">
                            Client
                          </th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">
                            Therapist
                          </th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">
                            Date & Time
                          </th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">
                            Status
                          </th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">
                            Duration
                          </th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">Fee</th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAppointments
                          .filter((a) => {
                            const now = new Date();
                            const appointmentTime = new Date(a.scheduledAt || a.date);
                            return appointmentTime >= now && !a.isArchived;
                          })
                          .map((appointment) => (
                            <tr
                              key={appointment.id}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="p-4">
                                <span
                                  className="font-secondary text-sm text-hive-black/80 font-mono"
                                  data-testid={`appointment-id-${appointment.id}`}
                                >
                                  {appointment.id.substring(0, 8)}...
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-gray-400" />
                                  <span
                                    className="font-secondary text-hive-black"
                                    data-testid={`appointment-client-${appointment.id}`}
                                  >
                                    {appointment.clientName}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4">
                                <span
                                  className="font-secondary text-hive-black"
                                  data-testid={`appointment-therapist-${appointment.id}`}
                                >
                                  {appointment.therapistName}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="space-y-1">
                                  <p
                                    className="font-secondary text-hive-black text-sm"
                                    data-testid={`appointment-date-${appointment.id}`}
                                  >
                                    {appointment.date
                                      ? new Date(appointment.date).toLocaleDateString("en-GB")
                                      : appointment.scheduledAt
                                        ? new Date(appointment.scheduledAt).toLocaleDateString(
                                            "en-GB"
                                          )
                                        : "TBD"}
                                  </p>
                                  <p
                                    className="font-secondary text-hive-black/60 text-xs"
                                    data-testid={`appointment-time-${appointment.id}`}
                                  >
                                    {appointment.time ||
                                      (appointment.scheduledAt
                                        ? new Date(appointment.scheduledAt).toLocaleTimeString(
                                            "en-GB",
                                            { hour: "2-digit", minute: "2-digit" }
                                          )
                                        : "TBD")}
                                  </p>
                                </div>
                              </td>
                              <td className="p-4">
                                <Badge
                                  className={`${getStatusColor(appointment.status)} flex items-center gap-1 w-fit`}
                                  data-testid={`appointment-status-${appointment.id}`}
                                >
                                  {getStatusIcon(appointment.status)}
                                  {appointment.status.charAt(0).toUpperCase() +
                                    appointment.status.slice(1).replace("_", " ")}
                                </Badge>
                              </td>
                              <td className="p-4">
                                <span
                                  className="font-secondary text-hive-black/80"
                                  data-testid={`appointment-duration-${appointment.id}`}
                                >
                                  {appointment.duration} min
                                </span>
                              </td>
                              <td className="p-4">
                                <span
                                  className="font-secondary text-hive-black font-medium"
                                  data-testid={`appointment-fee-${appointment.id}`}
                                >
                                  £{appointment.fee}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    data-testid={`appointment-menu-${appointment.id}`}
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="past">
          <div className="space-y-6">
            {/* Archive Selection Header */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedForArchive.size > 0}
                      onCheckedChange={handleSelectAllForArchive}
                      id="select-all-archive"
                    />
                    <Label htmlFor="select-all-archive" className="font-medium">
                      Select All Eligible for Archive
                    </Label>
                    <p className="text-sm text-gray-600">
                      (
                      {
                        filteredAppointments.filter((a) => {
                          const now = new Date();
                          const appointmentTime = new Date(a.scheduledAt || a.date);
                          return appointmentTime < now && !a.isArchived && canArchiveAppointment(a);
                        }).length
                      }{" "}
                      eligible)
                    </p>
                  </div>
                  {selectedForArchive.size > 0 && (
                    <Badge variant="secondary">{selectedForArchive.size} selected</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Appointments Table */}
            <Card className="bg-white border-0 shadow-md">
              <CardHeader>
                <CardTitle className="font-primary text-hive-black">
                  Past Appointments (
                  {
                    filteredAppointments.filter((a) => {
                      const now = new Date();
                      const appointmentTime = new Date(a.scheduledAt || a.date);
                      return appointmentTime < now && !a.isArchived;
                    }).length
                  }
                  )
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredAppointments.filter((a) => {
                  const now = new Date();
                  const appointmentTime = new Date(a.scheduledAt || a.date);
                  return appointmentTime < now && !a.isArchived;
                }).length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-hive-black/60 font-secondary">
                      {appointments.length === 0
                        ? "No past appointments found"
                        : "No past appointments match your search criteria"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-4 font-secondary text-hive-black/70 w-10">
                            <Checkbox
                              checked={
                                selectedForArchive.size ===
                                  filteredAppointments.filter((a) => {
                                    const now = new Date();
                                    const appointmentTime = new Date(a.scheduledAt || a.date);
                                    return (
                                      appointmentTime < now &&
                                      !a.isArchived &&
                                      canArchiveAppointment(a)
                                    );
                                  }).length &&
                                filteredAppointments.filter((a) => {
                                  const now = new Date();
                                  const appointmentTime = new Date(a.scheduledAt || a.date);
                                  return (
                                    appointmentTime < now &&
                                    !a.isArchived &&
                                    canArchiveAppointment(a)
                                  );
                                }).length > 0
                              }
                              onCheckedChange={handleSelectAllForArchive}
                              aria-label="Select all for archive"
                            />
                          </th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">ID</th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">
                            Client
                          </th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">
                            Therapist
                          </th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">
                            Date & Time
                          </th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">
                            Status
                          </th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">
                            Duration
                          </th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">Fee</th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAppointments
                          .filter((a) => {
                            const now = new Date();
                            const appointmentTime = new Date(a.scheduledAt || a.date);
                            return appointmentTime < now && !a.isArchived;
                          })
                          .map((appointment) => (
                            <tr
                              key={appointment.id}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="p-4">
                                <Checkbox
                                  checked={selectedForArchive.has(appointment.id)}
                                  onCheckedChange={(checked) => {
                                    const newSelected = new Set(selectedForArchive);
                                    if (checked) {
                                      newSelected.add(appointment.id);
                                    } else {
                                      newSelected.delete(appointment.id);
                                    }
                                    setSelectedForArchive(newSelected);
                                  }}
                                  disabled={!canArchiveAppointment(appointment)}
                                  aria-label={`Select appointment ${appointment.id} for archive`}
                                />
                              </td>
                              <td className="p-4">
                                <span
                                  className="font-secondary text-sm text-hive-black/80 font-mono"
                                  data-testid={`appointment-id-${appointment.id}`}
                                >
                                  {appointment.id.substring(0, 8)}...
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-gray-400" />
                                  <span
                                    className="font-secondary text-hive-black"
                                    data-testid={`appointment-client-${appointment.id}`}
                                  >
                                    {appointment.clientName}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4">
                                <span
                                  className="font-secondary text-hive-black"
                                  data-testid={`appointment-therapist-${appointment.id}`}
                                >
                                  {appointment.therapistName}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="space-y-1">
                                  <p
                                    className="font-secondary text-hive-black text-sm"
                                    data-testid={`appointment-date-${appointment.id}`}
                                  >
                                    {appointment.date
                                      ? new Date(appointment.date).toLocaleDateString("en-GB")
                                      : appointment.scheduledAt
                                        ? new Date(appointment.scheduledAt).toLocaleDateString(
                                            "en-GB"
                                          )
                                        : "TBD"}
                                  </p>
                                  <p
                                    className="font-secondary text-hive-black/60 text-xs"
                                    data-testid={`appointment-time-${appointment.id}`}
                                  >
                                    {appointment.time ||
                                      (appointment.scheduledAt
                                        ? new Date(appointment.scheduledAt).toLocaleTimeString(
                                            "en-GB",
                                            { hour: "2-digit", minute: "2-digit" }
                                          )
                                        : "TBD")}
                                  </p>
                                </div>
                              </td>
                              <td className="p-4">
                                <Badge
                                  className={`${getStatusColor(appointment.status)} flex items-center gap-1 w-fit`}
                                  data-testid={`appointment-status-${appointment.id}`}
                                >
                                  {getStatusIcon(appointment.status)}
                                  {appointment.status.charAt(0).toUpperCase() +
                                    appointment.status.slice(1).replace("_", " ")}
                                </Badge>
                              </td>
                              <td className="p-4">
                                <span
                                  className="font-secondary text-hive-black/80"
                                  data-testid={`appointment-duration-${appointment.id}`}
                                >
                                  {appointment.duration} min
                                </span>
                              </td>
                              <td className="p-4">
                                <span
                                  className="font-secondary text-hive-black font-medium"
                                  data-testid={`appointment-fee-${appointment.id}`}
                                >
                                  £{appointment.fee}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    data-testid={`appointment-menu-${appointment.id}`}
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="archived">
          <div className="space-y-6">
            {/* Appointments Table */}
            <Card className="bg-white border-0 shadow-md">
              <CardHeader>
                <CardTitle className="font-primary text-hive-black">
                  Archived Appointments ({filteredAppointments.filter((a) => a.isArchived).length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredAppointments.filter((a) => a.isArchived).length === 0 ? (
                  <div className="text-center py-8">
                    <Archive className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <p className="text-hive-black/60 font-secondary">
                      {appointments.length === 0
                        ? "No archived appointments found"
                        : "No archived appointments match your search criteria"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-4 font-secondary text-hive-black/70">ID</th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">
                            Client
                          </th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">
                            Therapist
                          </th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">
                            Date & Time
                          </th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">
                            Status
                          </th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">
                            Duration
                          </th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">Fee</th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">
                            Archive Info
                          </th>
                          <th className="text-left p-4 font-secondary text-hive-black/70">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAppointments
                          .filter((a) => a.isArchived)
                          .map((appointment) => (
                            <tr
                              key={appointment.id}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="p-4">
                                <span
                                  className="font-secondary text-sm text-hive-black/80 font-mono"
                                  data-testid={`appointment-id-${appointment.id}`}
                                >
                                  {appointment.id.substring(0, 8)}...
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-gray-400" />
                                  <span
                                    className="font-secondary text-hive-black"
                                    data-testid={`appointment-client-${appointment.id}`}
                                  >
                                    {appointment.clientName}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4">
                                <span
                                  className="font-secondary text-hive-black"
                                  data-testid={`appointment-therapist-${appointment.id}`}
                                >
                                  {appointment.therapistName}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="space-y-1">
                                  <p
                                    className="font-secondary text-hive-black text-sm"
                                    data-testid={`appointment-date-${appointment.id}`}
                                  >
                                    {appointment.date
                                      ? new Date(appointment.date).toLocaleDateString("en-GB")
                                      : appointment.scheduledAt
                                        ? new Date(appointment.scheduledAt).toLocaleDateString(
                                            "en-GB"
                                          )
                                        : "TBD"}
                                  </p>
                                  <p
                                    className="font-secondary text-hive-black/60 text-xs"
                                    data-testid={`appointment-time-${appointment.id}`}
                                  >
                                    {appointment.time ||
                                      (appointment.scheduledAt
                                        ? new Date(appointment.scheduledAt).toLocaleTimeString(
                                            "en-GB",
                                            { hour: "2-digit", minute: "2-digit" }
                                          )
                                        : "TBD")}
                                  </p>
                                </div>
                              </td>
                              <td className="p-4">
                                <Badge
                                  className={`${getStatusColor(appointment.status)} flex items-center gap-1 w-fit`}
                                  data-testid={`appointment-status-${appointment.id}`}
                                >
                                  {getStatusIcon(appointment.status)}
                                  {appointment.status.charAt(0).toUpperCase() +
                                    appointment.status.slice(1).replace("_", " ")}
                                </Badge>
                              </td>
                              <td className="p-4">
                                <span
                                  className="font-secondary text-hive-black/80"
                                  data-testid={`appointment-duration-${appointment.id}`}
                                >
                                  {appointment.duration} min
                                </span>
                              </td>
                              <td className="p-4">
                                <span
                                  className="font-secondary text-hive-black font-medium"
                                  data-testid={`appointment-fee-${appointment.id}`}
                                >
                                  £{appointment.fee}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="space-y-1">
                                  <p className="text-xs text-gray-500">
                                    {appointment.archivedAt
                                      ? `Archived ${formatDistance(new Date(appointment.archivedAt), new Date(), { addSuffix: true })}`
                                      : "N/A"}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    By: {appointment.archivedBy || "Unknown"}
                                  </p>
                                  {appointment.archivedReason && (
                                    <p
                                      className="text-xs text-gray-500"
                                      title={appointment.archivedReason}
                                    >
                                      Reason:{" "}
                                      {appointment.archivedReason.length > 30
                                        ? `${appointment.archivedReason.substring(0, 30)}...`
                                        : appointment.archivedReason}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUnarchiveAppointment(appointment.id)}
                                    disabled={unarchiveAppointmentMutation.isPending}
                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                    data-testid={`unarchive-appointment-${appointment.id}`}
                                  >
                                    <ArchiveRestore className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
