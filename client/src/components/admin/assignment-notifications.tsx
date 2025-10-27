import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Bell, CheckCircle, AlertCircle, Mail, UserPlus, Clock, Calendar } from "lucide-react";

interface AssignmentNotification {
  id: string;
  type: "assignment_needed" | "assignment_completed" | "urgent_assignment";
  clientId: string;
  clientName: string;
  priority: "low" | "medium" | "high" | "urgent";
  message: string;
  createdAt: string;
  isRead: boolean;
  daysWaiting?: number;
}

interface NotificationAction {
  notificationId: string;
  action: "mark_read" | "assign_therapist" | "send_update";
}

export function AssignmentNotifications() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedNotification, setSelectedNotification] = useState<AssignmentNotification | null>(
    null
  );

  // Fetch assignment notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["/api/admin/assignment-notifications"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/assignment-notifications");
      return response.json();
    },
    refetchInterval: 120000, // Refresh every 2 minutes
    staleTime: 60000, // Keep data fresh for 1 minute
  });

  // Handle notification actions
  const actionMutation = useMutation({
    mutationFn: async (action: NotificationAction) => {
      const response = await apiRequest("POST", "/api/admin/notification-action", action);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/assignment-notifications"] });
      toast({
        title: "Action Complete",
        description: "Notification action completed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Action Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNotificationAction = (notificationId: string, action: string) => {
    actionMutation.mutate({
      notificationId,
      action: action as "mark_read" | "assign_therapist" | "send_update",
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "assignment_needed":
        return <UserPlus className="h-4 w-4" />;
      case "assignment_completed":
        return <CheckCircle className="h-4 w-4" />;
      case "urgent_assignment":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const unreadCount = notifications.filter((n: AssignmentNotification) => !n.isRead).length;
  const urgentCount = notifications.filter(
    (n: AssignmentNotification) => n.priority === "urgent"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Assignment Notifications</h2>
          <p className="text-gray-600">Monitor client assignment status and priority alerts</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {unreadCount} unread
          </Badge>
          {urgentCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {urgentCount} urgent
            </Badge>
          )}
        </div>
      </div>

      {/* Notification Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Notifications</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unread</p>
                <p className="text-2xl font-bold text-orange-600">{unreadCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Urgent</p>
                <p className="text-2xl font-bold text-red-600">{urgentCount}</p>
              </div>
              <Clock className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold text-green-600">
                  {
                    notifications.filter(
                      (n: AssignmentNotification) =>
                        n.type === "assignment_completed" &&
                        new Date(n.createdAt).toDateString() === new Date().toDateString()
                    ).length
                  }
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notifications.map((notification: AssignmentNotification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    !notification.isRead ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
                  } ${selectedNotification?.id === notification.id ? "ring-2 ring-blue-500" : ""}`}
                  onClick={() => setSelectedNotification(notification)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                        {getTypeIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{notification.clientName}</h4>
                          <Badge className={getPriorityColor(notification.priority)}>
                            {notification.priority}
                          </Badge>
                          {notification.daysWaiting && notification.daysWaiting > 3 && (
                            <Badge variant="outline" className="text-orange-600">
                              {notification.daysWaiting} days waiting
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.isRead && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationAction(notification.id, "mark_read");
                          }}
                          disabled={actionMutation.isPending}
                        >
                          Mark Read
                        </Button>
                      )}
                      {notification.type === "assignment_needed" && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log(
                              `Redirecting to assignment for client: ${notification.clientName} (ID: ${notification.clientId})`
                            );
                            // First mark as read, then redirect to assignment interface
                            handleNotificationAction(notification.id, "mark_read");
                            setLocation(
                              `/admin-services/client-assignment?clientId=${notification.clientId}&clientName=${encodeURIComponent(notification.clientName)}`
                            );
                          }}
                          disabled={actionMutation.isPending}
                          className="bg-hive-purple hover:bg-hive-purple/90 text-white"
                        >
                          Assign Now
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotificationAction(notification.id, "send_update");
                        }}
                        disabled={actionMutation.isPending}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No assignment notifications</p>
                  <p className="text-sm">All clients have been assigned therapists</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-16 flex flex-col items-center justify-center gap-2"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["/api/admin/assignment-notifications"] })
              }
            >
              <Bell className="h-5 w-5" />
              <span className="text-sm">Refresh Notifications</span>
            </Button>

            <Button
              variant="outline"
              className="h-16 flex flex-col items-center justify-center gap-2"
              onClick={() => handleNotificationAction("all", "mark_read")}
              disabled={actionMutation.isPending || unreadCount === 0}
            >
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm">Mark All Read</span>
            </Button>

            <Button
              variant="outline"
              className="h-16 flex flex-col items-center justify-center gap-2"
              onClick={() => {
                // Navigate to assignment interface using React Router
                const event = new CustomEvent("navigate", {
                  detail: { path: "/admin/client-therapist-assignment" },
                });
                window.dispatchEvent(event);
              }}
            >
              <UserPlus className="h-5 w-5" />
              <span className="text-sm">Assignment Interface</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
