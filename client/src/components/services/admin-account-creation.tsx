import { useState, FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  UserPlus,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  Mail,
  User,
  RefreshCw,
  FileText,
  ArrowLeft,
} from "lucide-react";

interface AdminAccountCreationProps {
  user: { id: string; role: string; firstName?: string };
  onBack?: () => void;
}

export default function AdminAccountCreation({ user, onBack }: AdminAccountCreationProps) {
  const [showManualForm, setShowManualForm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [createdAccountInfo, setCreatedAccountInfo] = useState<any>(null);
  const [accountType, setAccountType] = useState<"client" | "therapist">("client");
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    role: "client" as "client" | "therapist",
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch pending questionnaire submissions
  const {
    data: pendingSubmissions,
    isLoading: submissionsLoading,
    refetch: refetchSubmissions,
  } = useQuery({
    queryKey: ["/api/admin/pending-account-creations"],
    staleTime: 0,
  });

  // Manual account creation mutation
  const createAccountMutation = useMutation({
    mutationFn: async (accountData: any) => {
      const response = await apiRequest("POST", "/api/admin/create-account", accountData);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.temporaryPassword) {
        setCreatedAccountInfo(data);
        setShowPasswordModal(true);
      } else {
        toast({
          title: "Account Created Successfully",
          description: `${data.role} account created for ${data.firstName} ${data.lastName}`,
        });
      }
      setFormData({ email: "", firstName: "", lastName: "", password: "", role: "client" });
      setShowManualForm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-account-creations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Account Creation Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  // Bulk account creation from submissions
  const bulkCreateMutation = useMutation({
    mutationFn: async (submissionIds: string[]) => {
      const response = await apiRequest("POST", "/api/admin/bulk-create-accounts", {
        submissionIds,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk Account Creation Complete",
        description: `Created ${data.successful} accounts successfully`,
      });
      refetchSubmissions();
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Creation Failed",
        description: error.message || "Failed to create accounts in bulk",
        variant: "destructive",
      });
    },
  });

  // Create account from specific submission
  const createFromSubmissionMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const response = await apiRequest("POST", "/api/admin/create-account-from-submission", {
        submissionId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.temporaryPassword) {
        setCreatedAccountInfo(data);
        setShowPasswordModal(true);
      } else {
        toast({
          title: "Account Created Successfully",
          description: `Account created for ${data.firstName} ${data.lastName}`,
        });
      }
      refetchSubmissions();
    },
    onError: (error: any) => {
      toast({
        title: "Account Creation Failed",
        description: error.message || "Failed to create account from submission",
        variant: "destructive",
      });
    },
  });

  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.firstName || !formData.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createAccountMutation.mutate(formData);
  };

  const submissions = pendingSubmissions?.submissions || [];
  const stats = pendingSubmissions?.stats || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {onBack && (
                <Button variant="ghost" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-hive-purple">Account Creation</h1>
                <p className="text-slate-600">Automated and manual user account management</p>
              </div>
            </div>
            <Button
              onClick={() => refetchSubmissions()}
              disabled={submissionsLoading}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${submissionsLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Pending Client Forms</p>
                  <p className="text-2xl font-bold text-hive-purple">
                    {stats.clientSubmissions || 0}
                  </p>
                </div>
                <User className="h-8 w-8 text-hive-purple/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Pending Therapist Forms</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.therapistSubmissions || 0}
                  </p>
                </div>
                <UserPlus className="h-8 w-8 text-blue-600/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Ready for Creation</p>
                  <p className="text-2xl font-bold text-green-600">{stats.readyForCreation || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Processed</p>
                  <p className="text-2xl font-bold text-slate-700">{stats.totalProcessed || 0}</p>
                </div>
                <Users className="h-8 w-8 text-slate-600/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Automated Account Creation */}
          <div className="lg:col-span-2">
            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-hive-purple">
                      Pending Questionnaire Submissions
                    </CardTitle>
                    <p className="text-sm text-slate-600 mt-1">
                      Create accounts automatically from completed questionnaires
                    </p>
                  </div>
                  {submissions.length > 0 && (
                    <Button
                      onClick={() => bulkCreateMutation.mutate(submissions.map((s) => s.id))}
                      disabled={bulkCreateMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {bulkCreateMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Create All Accounts
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {submissionsLoading ? (
                  <div className="space-y-4">
                    {Array(3)
                      .fill(0)
                      .map((_, i) => (
                        <div
                          key={i}
                          className="animate-pulse p-4 border border-slate-200 rounded-lg"
                        >
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <div className="h-4 bg-slate-200 rounded w-32"></div>
                              <div className="h-3 bg-slate-200 rounded w-48"></div>
                            </div>
                            <div className="h-8 bg-slate-200 rounded w-20"></div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">
                      No Pending Submissions
                    </h3>
                    <p className="text-slate-600">
                      All questionnaire submissions have been processed.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions.map((submission: any) => (
                      <div key={submission.id} className="border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-slate-900">
                                {submission.firstName} {submission.lastName}
                              </h4>
                              <Badge
                                variant={
                                  submission.formType === "therapist-questionnaire"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {submission.formType === "therapist-questionnaire"
                                  ? "Therapist"
                                  : "Client"}
                              </Badge>
                              {submission.hasExistingAccount && (
                                <Badge variant="outline">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Has Account
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <div className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                {submission.email}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {new Date(submission.submittedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => createFromSubmissionMutation.mutate(submission.id)}
                            disabled={
                              createFromSubmissionMutation.isPending ||
                              submission.hasExistingAccount
                            }
                            size="sm"
                            className={
                              submission.hasExistingAccount
                                ? ""
                                : "bg-hive-purple hover:bg-hive-purple/90"
                            }
                            variant={submission.hasExistingAccount ? "outline" : "default"}
                          >
                            {createFromSubmissionMutation.isPending ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : submission.hasExistingAccount ? (
                              "Account Exists"
                            ) : (
                              "Create Account"
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Manual Account Creation */}
          <div>
            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle className="text-hive-purple">Manual Account Creation</CardTitle>
                <p className="text-sm text-slate-600">
                  Create accounts manually without questionnaire submissions
                </p>
              </CardHeader>
              <CardContent>
                <Dialog open={showManualForm} onOpenChange={setShowManualForm}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-green-600 hover:bg-green-700">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create New Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Account</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleManualSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="role">Account Type</Label>
                        <Select
                          value={formData.role}
                          onValueChange={(value) =>
                            setFormData({ ...formData, role: value as "client" | "therapist" })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select account type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="client">Client Account</SelectItem>
                            <SelectItem value="therapist">Therapist Account</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(e) =>
                              setFormData({ ...formData, firstName: e.target.value })
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="password">Temporary Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="Minimum 8 characters"
                          minLength={8}
                          required
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={createAccountMutation.isPending}
                        className="w-full bg-hive-purple hover:bg-hive-purple/90"
                      >
                        {createAccountMutation.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Creating Account...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Create Account
                          </>
                        )}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-slate-200 bg-white mt-6">
              <CardHeader>
                <CardTitle className="text-hive-purple text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => (window.location.href = "/admin-therapist-applications")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Therapist Applications
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() =>
                    (window.location.href = "/admin-dashboard?service=user-management")
                  }
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Existing Users
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => refetchSubmissions()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Password Display Modal */}
        <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-green-600 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Account Created Successfully
              </DialogTitle>
            </DialogHeader>
            {createdAccountInfo && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-lg font-semibold text-slate-900">
                    {createdAccountInfo.firstName} {createdAccountInfo.lastName}
                  </p>
                  <Badge variant="outline" className="mt-1">
                    {createdAccountInfo.role}
                  </Badge>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">Temporary Login Details</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Email:</span> {createdAccountInfo.email}
                    </div>
                    <div>
                      <span className="font-medium">Temporary Password:</span>
                      <code className="ml-2 bg-white px-2 py-1 rounded border font-mono text-red-600">
                        {createdAccountInfo.temporaryPassword}
                      </code>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
                    ⚠️ <strong>Important:</strong> User must change this password on first login
                  </div>
                </div>

                <div className="text-center">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(createdAccountInfo.temporaryPassword);
                      toast({ title: "Password copied to clipboard" });
                    }}
                    variant="outline"
                    className="mr-2"
                  >
                    Copy Password
                  </Button>
                  <Button
                    onClick={() => setShowPasswordModal(false)}
                    className="bg-hive-purple hover:bg-hive-purple/90"
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
