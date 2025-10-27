import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, Users, Video, Search, Filter } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface VideoSession {
  id: string;
  clientName: string;
  therapistName: string;
  sessionDate: string;
  sessionTime: string;
  duration: number;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  meetingUrl: string;
  sessionType: string;
  notes?: string;
}

export default function AdminVideoSessions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const {
    data: sessions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/admin/video-sessions"],
    queryFn: async () => {
      const response = await fetch("/api/admin/video-sessions");
      if (!response.ok) {
        throw new Error("Failed to fetch video sessions");
      }
      return response.json();
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in-progress":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredSessions = sessions.filter((session: VideoSession) => {
    const matchesSearch =
      searchTerm === "" ||
      session.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.therapistName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || session.status === statusFilter;

    const matchesDate =
      dateFilter === "all" ||
      (() => {
        const sessionDate = new Date(session.sessionDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (dateFilter) {
          case "today":
            return sessionDate.toDateString() === today.toDateString();
          case "this-week":
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            return sessionDate >= weekStart && sessionDate <= weekEnd;
          case "this-month":
            return (
              sessionDate.getMonth() === today.getMonth() &&
              sessionDate.getFullYear() === today.getFullYear()
            );
          default:
            return true;
        }
      })();

    return matchesSearch && matchesStatus && matchesDate;
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Unable to load video sessions
          </h3>
          <p className="text-gray-600 mb-4">There was an error loading the video sessions data.</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Video Sessions</h1>
          <p className="text-gray-600 mt-2">Manage and monitor all therapy video sessions</p>
        </div>
        <div className="flex items-center space-x-2">
          <Video className="h-8 w-8 text-purple-600" />
          <Badge variant="secondary" className="text-sm">
            {filteredSessions.length} sessions
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Sessions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {
                    sessions.filter(
                      (s: VideoSession) =>
                        new Date(s.sessionDate).toDateString() === new Date().toDateString()
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sessions.filter((s: VideoSession) => s.status === "in-progress").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold text-gray-900">
                  {
                    sessions.filter(
                      (s: VideoSession) =>
                        s.status === "completed" &&
                        new Date(s.sessionDate).toDateString() === new Date().toDateString()
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Video className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sessions.filter((s: VideoSession) => s.status === "scheduled").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by client or therapist name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No video sessions found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                  ? "Try adjusting your filters to see more sessions."
                  : "No video sessions have been scheduled yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSessions.map((session: VideoSession) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {session.clientName} ↔ {session.therapistName}
                      </h3>
                      <Badge className={getStatusColor(session.status)}>
                        {session.status.replace("-", " ")}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(session.sessionDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {session.sessionTime} ({session.duration} min)
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Video className="h-4 w-4" />
                        <span>{session.sessionType}</span>
                      </div>
                    </div>

                    {session.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{session.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {session.meetingUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(session.meetingUrl, "_blank")}
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Join Meeting
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
