import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Globe,
  FileText,
  BarChart3,
  Download,
  TestTube,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Settings,
  Users,
  Calendar,
  Phone,
  Mail,
  Filter,
  Search,
} from "lucide-react";
import ServiceNavigation from "@/components/ui/service-navigation";
import type { User } from "@shared/schema";

interface WordPressFormSubmission {
  id: string;
  formId: string;
  formTitle: string;
  entryId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  data: Record<string, any>;
  submittedAt: string;
  processed: boolean;
  action: string;
}

interface WordPressFormsStats {
  totalSubmissions: number;
  todaySubmissions: number;
  weekSubmissions: number;
  monthSubmissions: number;
  activeFormsCount: number;
  processingStatus: {
    processed: number;
    pending: number;
    errors: number;
  };
}

interface WordPressFormsDashboardProps {
  onBackToDashboard?: () => void;
  user?: User;
}

export default function WordPressFormsDashboard({
  onBackToDashboard,
  user,
}: WordPressFormsDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterForm, setFilterForm] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [testSubmission, setTestSubmission] = useState({
    form_id: "1",
    form_title: "Test Form",
    entry_id: "123",
    entry_data: {
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
    },
  });

  // Get WordPress forms statistics
  const { data: stats, isLoading: statsLoading } = useQuery<WordPressFormsStats>({
    queryKey: ["/api/admin/wordpress-forms/stats"],
    refetchInterval: 30000,
  });

  // Get form submissions
  const { data: submissions, isLoading: submissionsLoading } = useQuery<WordPressFormSubmission[]>({
    queryKey: ["/api/admin/wordpress-forms/submissions", searchTerm, filterForm, filterStatus],
    refetchInterval: 15000,
  });

  // Test WordPress webhook mutation
  const testWebhookMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/external/gravity-forms", data);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Test Successful",
        description: `Form submission processed: ${data.action} (User ID: ${data.userId})`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wordpress-forms/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wordpress-forms/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to process test submission.",
        variant: "destructive",
      });
    },
  });

  // Export submissions mutation
  const exportMutation = useMutation({
    mutationFn: async (format: "csv" | "json") => {
      const response = await fetch(`/api/admin/wordpress-forms/export?format=${format}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `wordpress-forms-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Export Successful",
        description: "Form submissions have been exported successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export form submissions.",
        variant: "destructive",
      });
    },
  });

  const handleTestWebhook = () => {
    testWebhookMutation.mutate(testSubmission);
  };

  const handleExport = (format: "csv" | "json") => {
    exportMutation.mutate(format);
  };

  const filteredSubmissions = submissions?.filter((submission) => {
    const matchesSearch =
      !searchTerm ||
      submission.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.formTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${submission.firstName} ${submission.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesForm = filterForm === "all" || submission.formId === filterForm;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "processed" && submission.processed) ||
      (filterStatus === "pending" && !submission.processed);

    return matchesSearch && matchesForm && matchesStatus;
  });

  const uniqueForms = submissions ? Array.from(new Set(submissions.map((s) => s.formId))) : [];

  return (
    <>
      {/* Navigation Bar */}
      {onBackToDashboard && user && (
        <ServiceNavigation
          serviceName="WordPress Forms Integration Dashboard"
          onBackToDashboard={onBackToDashboard}
          user={user}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-hive-black">
              WordPress Forms Dashboard
            </h1>
            <p className="text-gray-600 font-secondary">
              Manage Gravity Forms integration and submissions
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => handleExport("csv")}
              disabled={exportMutation.isPending}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("json")}
              disabled={exportMutation.isPending}
            >
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="submissions" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Submissions</span>
            </TabsTrigger>
            <TabsTrigger value="testing" className="flex items-center space-x-2">
              <TestTube className="w-4 h-4" />
              <span>Testing</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                      <p className="text-2xl font-bold text-hive-purple">
                        {statsLoading ? "..." : stats?.totalSubmissions || 0}
                      </p>
                    </div>
                    <FileText className="w-8 h-8 text-hive-purple opacity-60" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Today</p>
                      <p className="text-2xl font-bold text-green-600">
                        {statsLoading ? "..." : stats?.todaySubmissions || 0}
                      </p>
                    </div>
                    <Calendar className="w-8 h-8 text-green-600 opacity-60" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">This Week</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {statsLoading ? "..." : stats?.weekSubmissions || 0}
                      </p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-blue-600 opacity-60" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Forms</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {statsLoading ? "..." : stats?.activeFormsCount || 0}
                      </p>
                    </div>
                    <Globe className="w-8 h-8 text-orange-600 opacity-60" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Processing Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-hive-purple" />
                  <span>Processing Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {stats?.processingStatus?.processed || 0}
                    </p>
                    <p className="text-sm text-gray-600">Processed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      {stats?.processingStatus?.pending || 0}
                    </p>
                    <p className="text-sm text-gray-600">Pending</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {stats?.processingStatus?.errors || 0}
                    </p>
                    <p className="text-sm text-gray-600">Errors</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Submissions Tab */}
          <TabsContent value="submissions">
            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search by email, name, or form..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Select value={filterForm} onValueChange={setFilterForm}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Forms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Forms</SelectItem>
                      {uniqueForms.map((formId) => (
                        <SelectItem key={formId} value={formId}>
                          Form {formId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="processed">Processed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterForm("all");
                      setFilterStatus("all");
                    }}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Submissions List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Form Submissions</span>
                  <Badge variant="secondary">{filteredSubmissions?.length || 0} results</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {submissionsLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-hive-purple" />
                    <p className="text-gray-600">Loading submissions...</p>
                  </div>
                ) : filteredSubmissions && filteredSubmissions.length > 0 ? (
                  <div className="space-y-4">
                    {filteredSubmissions.map((submission) => (
                      <div key={submission.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{submission.formTitle}</h3>
                            <Badge variant={submission.processed ? "default" : "secondary"}>
                              {submission.processed ? "Processed" : "Pending"}
                            </Badge>
                            <Badge variant="outline">Form {submission.formId}</Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            {new Date(submission.submittedAt).toLocaleString("en-GB")}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span>{submission.email}</span>
                          </div>
                          {submission.firstName && submission.lastName && (
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span>
                                {submission.firstName} {submission.lastName}
                              </span>
                            </div>
                          )}
                          {submission.phone && (
                            <div className="flex items-center space-x-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{submission.phone}</span>
                            </div>
                          )}
                        </div>

                        {submission.action && (
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs">
                              Action: {submission.action}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions found</h3>
                    <p className="text-gray-600">
                      {searchTerm || filterForm !== "all" || filterStatus !== "all"
                        ? "Try adjusting your filters to see more results."
                        : "Form submissions will appear here once they are received from WordPress."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Testing Tab */}
          <TabsContent value="testing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TestTube className="w-5 h-5 text-hive-purple" />
                  <span>Test WordPress Integration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    Use this tool to test the WordPress Gravity Forms webhook integration. This will
                    simulate a form submission from your WordPress site.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="test-form-id">Form ID</Label>
                    <Input
                      id="test-form-id"
                      value={testSubmission.form_id}
                      onChange={(e) =>
                        setTestSubmission({
                          ...testSubmission,
                          form_id: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="test-form-title">Form Title</Label>
                    <Input
                      id="test-form-title"
                      value={testSubmission.form_title}
                      onChange={(e) =>
                        setTestSubmission({
                          ...testSubmission,
                          form_title: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="test-entry-id">Entry ID</Label>
                    <Input
                      id="test-entry-id"
                      value={testSubmission.entry_id}
                      onChange={(e) =>
                        setTestSubmission({
                          ...testSubmission,
                          entry_id: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="test-email">Email</Label>
                    <Input
                      id="test-email"
                      type="email"
                      value={testSubmission.entry_data.email}
                      onChange={(e) =>
                        setTestSubmission({
                          ...testSubmission,
                          entry_data: {
                            ...testSubmission.entry_data,
                            email: e.target.value,
                          },
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="test-first-name">First Name</Label>
                    <Input
                      id="test-first-name"
                      value={testSubmission.entry_data.first_name}
                      onChange={(e) =>
                        setTestSubmission({
                          ...testSubmission,
                          entry_data: {
                            ...testSubmission.entry_data,
                            first_name: e.target.value,
                          },
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="test-last-name">Last Name</Label>
                    <Input
                      id="test-last-name"
                      value={testSubmission.entry_data.last_name}
                      onChange={(e) =>
                        setTestSubmission({
                          ...testSubmission,
                          entry_data: {
                            ...testSubmission.entry_data,
                            last_name: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setTestSubmission({
                        form_id: "1",
                        form_title: "Test Form",
                        entry_id: Math.random().toString(36).substring(7),
                        entry_data: {
                          email: "test@example.com",
                          first_name: "Test",
                          last_name: "User",
                        },
                      })
                    }
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    onClick={handleTestWebhook}
                    disabled={testWebhookMutation.isPending}
                    className="bg-hive-purple hover:bg-hive-purple/90"
                  >
                    {testWebhookMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <TestTube className="w-4 h-4 mr-2" />
                    )}
                    Test Webhook
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Integration Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ExternalLink className="w-5 h-5 text-hive-purple" />
                  <span>WordPress Integration Guide</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium">1. Install Gravity Forms</h4>
                    <p className="text-sm text-gray-600">
                      Ensure Gravity Forms plugin is installed and activated on your WordPress site.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium">2. Configure Webhooks</h4>
                    <p className="text-sm text-gray-600">
                      In your form settings, add a webhook pointing to:
                    </p>
                    <code className="block mt-1 p-2 bg-gray-100 rounded text-xs">
                      {window.location.origin}/api/external/gravity-forms
                    </code>
                  </div>

                  <div>
                    <h4 className="font-medium">3. Test Integration</h4>
                    <p className="text-sm text-gray-600">
                      Use the test form above to verify the webhook is working correctly.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium">4. Monitor Submissions</h4>
                    <p className="text-sm text-gray-600">
                      Check the Submissions tab to see incoming form data and processing status.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-hive-purple" />
                  <span>Integration Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    WordPress Forms integration is managed through the main WordPress Integration
                    service. Use the WordPress Integration service from the admin dashboard to
                    configure API keys and connection settings.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Webhook Endpoint</h4>
                    <code className="block p-3 bg-gray-100 rounded text-sm">
                      {window.location.origin}/api/external/gravity-forms
                    </code>
                    <p className="text-xs text-gray-600 mt-1">
                      Use this URL in your Gravity Forms webhook settings
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Test Endpoint</h4>
                    <code className="block p-3 bg-gray-100 rounded text-sm">
                      {window.location.origin}/api/external/test-wp-integration
                    </code>
                    <p className="text-xs text-gray-600 mt-1">
                      Use this to test connection from your WordPress site
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Supported Form Fields</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>email (required)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span>first_name</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span>last_name</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>phone</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span>company</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span>custom fields</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
