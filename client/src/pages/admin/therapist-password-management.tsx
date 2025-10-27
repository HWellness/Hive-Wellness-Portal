import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Key, Mail, Clock, CheckCircle, AlertCircle, RefreshCw, Shield, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface TherapistAccount {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  profileComplete: boolean;
  forcePasswordChange: boolean;
  lastPasswordReset: string | null;
  resetToken: string | null;
  resetExpires: string | null;
}

export default function TherapistPasswordManagement() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch therapist accounts
  const {
    data: accountsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["/api/admin/therapist-accounts"],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Password reset mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (therapistId: string) => {
      return await apiRequest(
        "POST",
        `/api/admin/therapist-accounts/${therapistId}/reset-password`
      );
    },
    onSuccess: (data, therapistId) => {
      toast({
        title: "Password Reset Email Sent",
        description: "The therapist will receive a password reset link in their email.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/therapist-accounts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Reset Email",
        description: error.message || "There was an error sending the password reset email.",
        variant: "destructive",
      });
    },
  });

  const handleResetPassword = (therapist: TherapistAccount) => {
    if (confirm(`Send password reset email to ${therapist.email}?`)) {
      resetPasswordMutation.mutate(therapist.id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-hive-purple/5 via-hive-blue/5 to-hive-light-blue/5 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const accounts: TherapistAccount[] = (accountsData as any)?.accounts || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-hive-purple/5 via-hive-blue/5 to-hive-light-blue/5 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-primary text-hive-purple mb-2">
                Therapist Password Management
              </h1>
              <p className="text-hive-black/70 font-secondary">
                Manage therapist account credentials and send password reset emails
              </p>
            </div>
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="gap-2"
              data-testid="button-refresh-accounts"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-secondary text-hive-black/70">Total Accounts</p>
                  <p
                    className="text-2xl font-primary text-hive-purple"
                    data-testid="text-total-accounts"
                  >
                    {accounts.length}
                  </p>
                </div>
                <User className="w-8 h-8 text-hive-purple/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-secondary text-hive-black/70">Active Accounts</p>
                  <p
                    className="text-2xl font-primary text-hive-blue"
                    data-testid="text-active-accounts"
                  >
                    {accounts.filter((a) => a.isActive).length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-hive-blue/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-secondary text-hive-black/70">Recent Logins</p>
                  <p
                    className="text-2xl font-primary text-hive-light-blue"
                    data-testid="text-recent-logins"
                  >
                    {
                      accounts.filter(
                        (a) =>
                          a.lastLoginAt &&
                          new Date(a.lastLoginAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                      ).length
                    }
                  </p>
                  <p className="text-sm text-hive-black/50">Last 7 days</p>
                </div>
                <Clock className="w-8 h-8 text-hive-light-blue/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Therapist Accounts Table */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="font-primary text-hive-purple">Therapist Accounts</CardTitle>
            <CardDescription className="font-secondary">
              View therapist login credentials and send password reset emails
            </CardDescription>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-hive-black/30 mx-auto mb-4" />
                <p className="text-hive-black/70 font-secondary">No therapist accounts found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-hive-black/10">
                      <th className="text-left py-3 px-4 font-secondary text-sm text-hive-black/70">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 font-secondary text-sm text-hive-black/70">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 font-secondary text-sm text-hive-black/70">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-secondary text-sm text-hive-black/70">
                        Last Login
                      </th>
                      <th className="text-left py-3 px-4 font-secondary text-sm text-hive-black/70">
                        Last Reset
                      </th>
                      <th className="text-right py-3 px-4 font-secondary text-sm text-hive-black/70">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => (
                      <tr
                        key={account.id}
                        className="border-b border-hive-black/5 hover:bg-hive-purple/5 transition-colors"
                        data-testid={`row-therapist-${account.id}`}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-hive-purple/60" />
                            <span
                              className="font-secondary text-hive-black"
                              data-testid={`text-name-${account.id}`}
                            >
                              {account.firstName} {account.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-hive-blue/60" />
                            <span
                              className="font-secondary text-hive-black/80 text-sm"
                              data-testid={`text-email-${account.id}`}
                            >
                              {account.email}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={account.isActive ? "default" : "secondary"}
                              className={
                                account.isActive
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700"
                              }
                              data-testid={`badge-status-${account.id}`}
                            >
                              {account.isActive ? "Active" : "Inactive"}
                            </Badge>
                            {account.forcePasswordChange && (
                              <Badge
                                variant="outline"
                                className="text-amber-600 border-amber-600 text-xs"
                              >
                                Password Reset Required
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className="font-secondary text-hive-black/70 text-sm"
                            data-testid={`text-last-login-${account.id}`}
                          >
                            {account.lastLoginAt
                              ? formatDistanceToNow(new Date(account.lastLoginAt), {
                                  addSuffix: true,
                                })
                              : "Never"}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className="font-secondary text-hive-black/70 text-sm"
                            data-testid={`text-last-reset-${account.id}`}
                          >
                            {account.lastPasswordReset
                              ? formatDistanceToNow(new Date(account.lastPasswordReset), {
                                  addSuffix: true,
                                })
                              : "Never"}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Button
                            onClick={() => handleResetPassword(account)}
                            disabled={resetPasswordMutation.isPending}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            data-testid={`button-reset-password-${account.id}`}
                          >
                            <Key className="w-4 h-4" />
                            Reset Password
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50/80 backdrop-blur-sm border-0 shadow-lg mt-6">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-secondary text-sm text-blue-900 mb-2">
                  <strong>About Password Resets:</strong>
                </p>
                <ul className="font-secondary text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Password reset emails are sent immediately via SendGrid</li>
                  <li>Reset links are valid for 1 hour</li>
                  <li>Therapists will receive an email at their registered address</li>
                  <li>After clicking reset, therapists can set a new password</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
