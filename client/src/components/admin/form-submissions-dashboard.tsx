import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import {
  Eye,
  Search,
  Download,
  Filter,
  Calendar,
  Mail,
  User,
  FileText,
  Trash2,
  Archive,
  AlertTriangle,
} from "lucide-react";

interface FormSubmission {
  id: string;
  form_type: string;
  user_email: string;
  form_data: any;
  created_at: string;
  processed: boolean;
  user_id?: string;
  ip_address?: string;
  status?: "active" | "archived" | "deleted";
}

export default function FormSubmissionsDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFormType, setSelectedFormType] = useState("all");
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [bulkDeleteEmail, setBulkDeleteEmail] = useState("");
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const {
    data: submissions = [],
    isLoading,
    refetch,
  } = useQuery<FormSubmission[]>({
    queryKey: ["/api/admin/form-submissions"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/form-submissions");
      return response.json();
    },
  });

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      // Call the manual refresh endpoint first
      const refreshResponse = await apiRequest("POST", "/api/admin/form-submissions/refresh");

      if (refreshResponse.ok) {
        const result = await refreshResponse.json();
        toast({
          title: "Refresh Complete",
          description: result.message,
        });

        // Then refetch the data to update the UI
        refetch();
        queryClient.invalidateQueries({ queryKey: ["/api/admin/form-submissions"] });
      } else {
        throw new Error("Refresh request failed");
      }
    } catch (error) {
      console.error("Refresh error:", error);
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh form submissions. Please try again.",
        variant: "destructive",
      });

      // Still try to refetch existing data
      refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const deleteSubmission = async (submissionId: string) => {
    try {
      const response = await apiRequest("DELETE", `/api/admin/form-submissions/${submissionId}`);
      if (response.ok) {
        toast({
          title: "Success",
          description: "Form submission deleted successfully",
        });
        refetch();
        queryClient.invalidateQueries({ queryKey: ["/api/admin/form-submissions"] });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete submission",
        variant: "destructive",
      });
    }
  };

  const archiveSubmission = async (submissionId: string) => {
    try {
      const response = await apiRequest(
        "PATCH",
        `/api/admin/form-submissions/${submissionId}/archive`
      );
      if (response.ok) {
        toast({
          title: "Success",
          description: "Form submission archived successfully",
        });
        refetch();
        queryClient.invalidateQueries({ queryKey: ["/api/admin/form-submissions"] });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to archive submission",
        variant: "destructive",
      });
    }
  };

  const bulkDeleteByEmail = async (email: string) => {
    try {
      const response = await apiRequest("DELETE", "/api/admin/form-submissions/bulk-delete-email", {
        email: email,
      });
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: `Deleted ${result.deletedCount} submissions for ${email}`,
        });
        refetch();
        queryClient.invalidateQueries({ queryKey: ["/api/admin/form-submissions"] });
        setShowBulkDeleteDialog(false);
        setBulkDeleteEmail("");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to bulk delete submissions",
        variant: "destructive",
      });
    }
  };

  const filteredSubmissions = submissions.filter((submission) => {
    const searchInFormData =
      submission.form_data && typeof submission.form_data === "object"
        ? JSON.stringify(submission.form_data).toLowerCase().includes(searchTerm.toLowerCase())
        : false;

    const matchesSearch =
      searchTerm === "" ||
      submission.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.form_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      searchInFormData;

    const matchesType = selectedFormType === "all" || submission.form_type === selectedFormType;

    return matchesSearch && matchesType;
  });

  const formTypes = Array.from(new Set(submissions.map((s) => s.form_type)));

  const getFormTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      therapist_enquiry: "bg-purple-100 text-purple-800",
      therapist_application: "bg-purple-100 text-purple-800",
      client_intake: "bg-blue-100 text-blue-800",
      therapy_interest: "bg-green-100 text-green-800",
      university_dsa: "bg-orange-100 text-orange-800",
      work_with_us: "bg-teal-100 text-teal-800",
      lead_capture: "bg-pink-100 text-pink-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const formatFormData = (data: any) => {
    if (!data || Object.keys(data).length === 0) {
      return <span className="text-gray-500 italic">No form data available</span>;
    }

    const formatValue = (value: any): string => {
      if (Array.isArray(value)) {
        return value.join(", ");
      } else if (typeof value === "object" && value !== null) {
        return JSON.stringify(value, null, 2);
      } else if (typeof value === "boolean") {
        return value ? "Yes" : "No";
      } else {
        return String(value);
      }
    };

    const formatKey = (key: string): string => {
      return key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .replace(/_/g, " ");
    };

    return (
      <div className="space-y-3">
        {Object.entries(data)
          .filter(([_, value]) => value !== null && value !== undefined && value !== "")
          .map(([key, value]) => (
            <div key={key} className="grid grid-cols-3 gap-2">
              <div className="font-medium text-gray-700 text-sm">{formatKey(key)}:</div>
              <div className="col-span-2 text-sm text-gray-900 break-words">
                {formatValue(value)}
              </div>
            </div>
          ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-hive-purple border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Form Submissions</h2>
          <p className="text-gray-600 mt-1">
            Manage and review all form submissions ({submissions.length} total)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowBulkDeleteDialog(true)}
            variant="outline"
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Bulk Delete
          </Button>
          <Button onClick={handleRefreshData} variant="outline" disabled={isRefreshing}>
            <Download className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                <p className="text-2xl font-bold text-gray-900">{submissions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <User className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Therapist Enquiries</p>
                <p className="text-2xl font-bold text-gray-900">
                  {
                    submissions.filter(
                      (s) =>
                        s.form_type === "therapist_enquiry" ||
                        s.form_type === "therapist_application"
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Mail className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Processed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {submissions.filter((s) => s.processed).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today</p>
                <p className="text-2xl font-bold text-gray-900">
                  {
                    submissions.filter((s) => {
                      const submissionDate = new Date(s.created_at);
                      const today = new Date();
                      return submissionDate.toDateString() === today.toDateString();
                    }).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by email, form type, or submission ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={selectedFormType}
                onChange={(e) => setSelectedFormType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Form Types</option>
                {formTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Submissions ({filteredSubmissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredSubmissions.length > 0 ? (
              filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="space-y-4">
                    {/* Main content row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{submission.user_email}</p>
                        <p className="text-xs text-gray-500">
                          ID: {submission.id.substring(0, 8)}...
                        </p>
                      </div>

                      <div>
                        <Badge className={`${getFormTypeColor(submission.form_type)} text-xs`}>
                          {submission.form_type
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Badge>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600">
                          {new Date(submission.created_at).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      <div>
                        <Badge variant={submission.processed ? "default" : "secondary"}>
                          {submission.processed ? "Processed" : "Pending"}
                        </Badge>
                      </div>
                    </div>

                    {/* Action buttons row */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => archiveSubmission(submission.id)}
                        className="text-yellow-600 hover:text-yellow-700"
                      >
                        <Archive className="w-4 h-4 mr-1" />
                        Archive
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowDeleteConfirm(submission.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedSubmission(submission)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Submission Details</DialogTitle>
                          </DialogHeader>
                          {selectedSubmission && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-600">Email</label>
                                  <p className="text-sm">{selectedSubmission.user_email}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-600">
                                    Form Type
                                  </label>
                                  <div className="text-sm">
                                    <Badge
                                      className={getFormTypeColor(selectedSubmission.form_type)}
                                    >
                                      {selectedSubmission.form_type
                                        .replace(/_/g, " ")
                                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                                    </Badge>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-600">
                                    Submitted
                                  </label>
                                  <p className="text-sm">
                                    {new Date(selectedSubmission.created_at).toLocaleString(
                                      "en-GB"
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-600">
                                    Status
                                  </label>
                                  <div className="text-sm">
                                    <Badge
                                      variant={
                                        selectedSubmission.processed ? "default" : "secondary"
                                      }
                                    >
                                      {selectedSubmission.processed ? "Processed" : "Pending"}
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <label className="text-sm font-medium text-gray-600">
                                  Form Data
                                </label>
                                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                                  {formatFormData(selectedSubmission.form_data)}
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No submissions found</p>
                <p className="text-sm text-gray-400 mt-2">
                  {searchTerm || selectedFormType !== "all"
                    ? "Try adjusting your filters"
                    : "Form submissions will appear here"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to delete this form submission? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (showDeleteConfirm) {
                    deleteSubmission(showDeleteConfirm);
                    setShowDeleteConfirm(null);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Bulk Delete by Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Delete all form submissions for a specific email address. This action cannot be
              undone.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address:</label>
              <Input
                value={bulkDeleteEmail}
                onChange={(e) => setBulkDeleteEmail(e.target.value)}
                placeholder="Enter email address..."
                className="w-full"
              />
            </div>
            {bulkDeleteEmail && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This will delete{" "}
                  <strong>
                    {submissions.filter((s) => s.user_email === bulkDeleteEmail).length}
                  </strong>{" "}
                  submissions for {bulkDeleteEmail}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulkDeleteDialog(false);
                  setBulkDeleteEmail("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!bulkDeleteEmail}
                onClick={() => bulkDeleteByEmail(bulkDeleteEmail)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All ({submissions.filter((s) => s.user_email === bulkDeleteEmail).length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
