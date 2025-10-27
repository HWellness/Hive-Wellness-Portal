import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Users,
  Calendar,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Mail,
  Phone,
  Clock,
  Search,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface FormSubmission {
  id: string;
  formId: string;
  formName: string;
  submittedAt: string;
  status: "pending" | "processed" | "contacted" | "assigned";
  data: {
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
    therapyType?: string;
    urgency?: string;
    preferredContact?: string;
    [key: string]: any;
  };
  source: "gravity_forms" | "contact_form" | "therapist_application";
  processedBy?: string;
  assignedTherapist?: string;
  notes?: string;
}

interface GravityFormsDashboardProps {
  user: User;
}

const GravityFormsDashboard: React.FC<GravityFormsDashboardProps> = ({ user }) => {
  const [filter, setFilter] = useState<"all" | "pending" | "processed">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedForm, setSelectedForm] = useState<FormSubmission | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch form submissions
  const {
    data: submissions = [],
    isLoading,
    error,
  } = useQuery<FormSubmission[]>({
    queryKey: ["/api/admin/gravity-forms-submissions"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update submission status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      return apiRequest(`/api/admin/gravity-forms-submissions/${id}`, "PATCH", {
        status,
        notes,
        processedBy: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gravity-forms-submissions"] });
      toast({
        title: "Status updated",
        description: "Form submission status has been updated successfully.",
      });
      setSelectedForm(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Unable to update submission status. Please try again.",
      });
    },
  });

  // Sync with WordPress
  const syncMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/admin/sync-gravity-forms", "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gravity-forms-submissions"] });
      toast({
        title: "Sync completed",
        description: "WordPress Gravity Forms have been synchronized.",
      });
    },
  });

  // Export submissions
  const exportSubmissions = () => {
    const csvData = submissions.map((sub) => ({
      "Submission ID": sub.id,
      "Form Name": sub.formName,
      Name: sub.data.name || "",
      Email: sub.data.email || "",
      Phone: sub.data.phone || "",
      Status: sub.status,
      Submitted: new Date(sub.submittedAt).toLocaleDateString(),
      "Therapy Type": sub.data.therapyType || "",
      Urgency: sub.data.urgency || "",
      Message: sub.data.message || "",
    }));

    const csv = [
      Object.keys(csvData[0]).join(","),
      ...csvData.map((row) =>
        Object.values(row)
          .map((val) => `"${val}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hive-wellness-submissions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter submissions
  const filteredSubmissions = submissions.filter((sub) => {
    if (filter !== "all" && sub.status !== filter) return false;
    if (
      searchTerm &&
      !sub.data.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !sub.data.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
      return false;
    return true;
  });

  // Stats
  const stats = {
    total: submissions.length,
    pending: submissions.filter((s) => s.status === "pending").length,
    processed: submissions.filter((s) => s.status === "processed").length,
    contacted: submissions.filter((s) => s.status === "contacted").length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "processed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "contacted":
        return "bg-green-100 text-green-800 border-green-200";
      case "assigned":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityColor = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
      case "urgent":
        return "text-red-600";
      case "high":
        return "text-orange-600";
      case "medium":
        return "text-yellow-600";
      default:
        return "text-green-600";
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to load form submissions. Please check your WordPress connection.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">
            WordPress Forms Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Manage Gravity Forms submissions from your WordPress site
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            Sync Forms
          </Button>

          <Button onClick={exportSubmissions} variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-hive-purple" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Processed</p>
                <p className="text-2xl font-bold text-blue-600">{stats.processed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Contacted</p>
                <p className="text-2xl font-bold text-green-600">{stats.contacted}</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
                size="sm"
              >
                All ({stats.total})
              </Button>
              <Button
                variant={filter === "pending" ? "default" : "outline"}
                onClick={() => setFilter("pending")}
                size="sm"
              >
                Pending ({stats.pending})
              </Button>
              <Button
                variant={filter === "processed" ? "default" : "outline"}
                onClick={() => setFilter("processed")}
                size="sm"
              >
                Processed ({stats.processed})
              </Button>
            </div>

            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-hive-purple focus:border-hive-purple"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-hive-purple border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading form submissions...</p>
          </CardContent>
        </Card>
      ) : filteredSubmissions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No form submissions found matching your criteria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredSubmissions.map((submission) => (
            <Card key={submission.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {submission.data.name || "Anonymous Submission"}
                      </h3>
                      <Badge className={getStatusColor(submission.status)}>
                        {submission.status}
                      </Badge>
                      {submission.data.urgency && (
                        <Badge
                          variant="outline"
                          className={getPriorityColor(submission.data.urgency)}
                        >
                          {submission.data.urgency}
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{submission.formName}</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {submission.data.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{submission.data.email}</span>
                        </div>
                      )}

                      {submission.data.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{submission.data.phone}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">
                          {new Date(submission.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {submission.data.message && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {submission.data.message}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button variant="outline" size="sm" onClick={() => setSelectedForm(submission)}>
                      View Details
                    </Button>

                    {submission.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: submission.id,
                            status: "processed",
                          })
                        }
                        disabled={updateStatusMutation.isPending}
                        className="bg-hive-purple hover:bg-hive-purple/90"
                      >
                        Mark Processed
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Detail Modal */}
      {selectedForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Form Submission Details
                <Button variant="outline" size="sm" onClick={() => setSelectedForm(null)}>
                  Close
                </Button>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium text-gray-700">Form Name</p>
                  <p className="text-gray-600">{selectedForm.formName}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Status</p>
                  <Badge className={getStatusColor(selectedForm.status)}>
                    {selectedForm.status}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Submission Data</h4>
                {Object.entries(selectedForm.data).map(([key, value]) => (
                  <div key={key}>
                    <p className="font-medium text-gray-700 capitalize">
                      {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                    </p>
                    <p className="text-gray-600">{String(value)}</p>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button
                  onClick={() =>
                    updateStatusMutation.mutate({
                      id: selectedForm.id,
                      status: "contacted",
                    })
                  }
                  disabled={updateStatusMutation.isPending}
                  className="flex-1"
                >
                  Mark as Contacted
                </Button>

                <Button
                  onClick={() =>
                    updateStatusMutation.mutate({
                      id: selectedForm.id,
                      status: "assigned",
                    })
                  }
                  disabled={updateStatusMutation.isPending}
                  variant="outline"
                  className="flex-1"
                >
                  Mark as Assigned
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GravityFormsDashboard;
