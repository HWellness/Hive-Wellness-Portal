import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TIER_PRICING } from "@shared/constants";
import { CheckCircle, UserCheck, Users, Clock, AlertTriangle, Key, Copy } from "lucide-react";

interface TherapistEnquiry {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  account_created?: boolean;
  created_at: string;
  therapist_tier?: "counsellor" | "psychotherapist" | "psychologist" | "specialist";
}

export default function TherapistStatusManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [passwordModal, setPasswordModal] = useState<{
    isOpen: boolean;
    email: string;
    password: string;
    isNewAccount: boolean;
  }>({
    isOpen: false,
    email: "",
    password: "",
    isNewAccount: false,
  });
  const [isAnyTierUpdating, setIsAnyTierUpdating] = useState(false);

  const {
    data: enquiries = [],
    isLoading,
    refetch,
  } = useQuery<TherapistEnquiry[]>({
    queryKey: ["/api/admin/therapist-enquiries"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/therapist-enquiries");
      return response.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PUT", `/api/admin/therapist-enquiries/${id}/status`, {
        status: status,
      });
      return response.json();
    },
    onMutate: async ({ id, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/admin/therapist-enquiries"] });

      // Snapshot the previous value
      const previousEnquiries = queryClient.getQueryData(["/api/admin/therapist-enquiries"]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        ["/api/admin/therapist-enquiries"],
        (old: TherapistEnquiry[] | undefined) => {
          if (!old) return old;
          return old.map((enquiry) => (enquiry.id === id ? { ...enquiry, status } : enquiry));
        }
      );

      // Return a context object with the snapshotted value
      return { previousEnquiries };
    },
    onSuccess: (data, variables) => {
      // Force immediate cache invalidation and refetch for the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/therapist-enquiries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/client-therapist-assignments"] });

      // Add a small delay to ensure backend is fully updated
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ["/api/admin/therapist-enquiries"] });
      }, 100);

      toast({
        title: "Status Updated",
        description: `Therapist status changed to "${variables.status}". ${variables.status === "approved" ? "Therapist is now available for client assignment." : ""}`,
      });
    },
    onError: (error, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousEnquiries) {
        queryClient.setQueryData(["/api/admin/therapist-enquiries"], context.previousEnquiries);
      }

      toast({
        title: "Error",
        description: "Failed to update therapist status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTierMutation = useMutation({
    mutationFn: async ({ id, tier }: { id: string; tier: string }) => {
      setIsAnyTierUpdating(true);
      const response = await apiRequest("PUT", `/api/admin/therapist-enquiries/${id}/tier`, {
        therapist_tier: tier,
      });
      return response.json();
    },
    onSuccess: async (data, { id, tier }) => {
      // Force immediate data refresh
      await refetch();
      setIsAnyTierUpdating(false);

      toast({
        title: "Tier Updated",
        description: `Therapist tier successfully updated to ${tier}`,
      });
    },
    onError: (error: any, variables, context) => {
      setIsAnyTierUpdating(false);
      console.error("Tier update error:", error);

      const errorMessage =
        error?.message?.includes("429") || error?.status === 429
          ? "Too many requests. Please wait a moment before trying again."
          : "Failed to update therapist tier. Please try again.";

      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: async (enquiry: TherapistEnquiry) => {
      console.log(`API call: Creating account for ${enquiry.email} only (ID: ${enquiry.id})`);
      const response = await apiRequest("POST", "/api/admin/create-therapist-account", {
        enquiry_id: enquiry.id,
        email: enquiry.email,
        first_name: enquiry.first_name,
        last_name: enquiry.last_name,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Force immediate and aggressive cache invalidation
      queryClient.invalidateQueries({ queryKey: ["/api/admin/therapist-enquiries"] });
      queryClient.refetchQueries({ queryKey: ["/api/admin/therapist-enquiries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/client-therapist-assignments"] });

      // Force immediate re-render after a short delay to ensure DB update is complete
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/therapist-enquiries"] });
        queryClient.refetchQueries({ queryKey: ["/api/admin/therapist-enquiries"] });
      }, 100);

      if (data.tempPassword) {
        // Show persistent modal for new accounts with password
        setPasswordModal({
          isOpen: true,
          email: variables.email,
          password: data.tempPassword,
          isNewAccount: true,
        });
      } else {
        // Simple toast for account activation
        toast({
          title: "Account Activated",
          description: data.message || "Therapist is now available for client assignment",
        });
      }
    },
    onError: (error) => {
      console.error("Account creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create therapist account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      console.log(`Resetting password for single therapist: ${email}`);
      const response = await apiRequest("POST", "/api/admin/reset-therapist-password", { email });
      return response.json();
    },
    onSuccess: (data, email) => {
      console.log(`✓ Password reset successful for ${email}`);
      setPasswordModal({
        isOpen: true,
        email,
        password: data.tempPassword,
        isNewAccount: false,
      });

      // Success toast
      toast({
        title: "Password Reset",
        description: `New temporary password generated for ${email}`,
        variant: "default",
      });
    },
    onError: (error, email) => {
      console.error(`Password reset failed for ${email}:`, error);
      toast({
        title: "Password Reset Failed",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Password copied to clipboard",
      duration: 2000,
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      enquiry_received: "bg-yellow-100 text-yellow-800",
      under_review: "bg-blue-100 text-blue-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      pending_documents: "bg-orange-100 text-orange-800",
      pending: "bg-yellow-100 text-yellow-800",
      in_progress: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "enquiry_received":
        return <Clock className="w-4 h-4" />;
      case "under_review":
        return <AlertTriangle className="w-4 h-4" />;
      case "approved":
        return <CheckCircle className="w-4 h-4" />;
      case "rejected":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Therapist Status Management</h2>
          <p className="text-gray-600">
            Manage therapist application statuses and account creation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-blue-600" />
          <span className="text-sm text-gray-600">{enquiries.length} Applications</span>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            status: "enquiry_received",
            label: "Enquiry Received",
            count: enquiries.filter((e) => e.status === "enquiry_received").length,
          },
          {
            status: "under_review",
            label: "Under Review",
            count: enquiries.filter((e) => e.status === "under_review").length,
          },
          {
            status: "approved",
            label: "Approved",
            count: enquiries.filter((e) => e.status === "approved").length,
          },
          {
            status: "rejected",
            label: "Rejected",
            count: enquiries.filter((e) => e.status === "rejected").length,
          },
        ].map(({ status, label, count }) => (
          <Card key={status} className="p-4">
            <div className="flex items-center gap-2">
              {getStatusIcon(status)}
              <div>
                <p className="text-sm text-gray-600">{label}</p>
                <p className="text-2xl font-bold">{count}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Therapist Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Therapist Applications</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {enquiries.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Found</h3>
              <p className="text-gray-600">No therapist applications have been submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {enquiries.map((enquiry) => (
                <div key={enquiry.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-lg">
                          {enquiry.first_name} {enquiry.last_name}
                        </span>
                        <Badge className={getStatusColor(enquiry.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(enquiry.status)}
                            {enquiry.status.replace("_", " ")}
                          </div>
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">{enquiry.email}</div>

                      {/* Enhanced Personality & Professional Information */}
                      <div className="space-y-2 my-3">
                        {enquiry.personality_description && (
                          <div className="bg-blue-50 p-3 rounded-md">
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                              <div>
                                <span className="text-sm font-medium text-blue-800">
                                  Personality:{" "}
                                </span>
                                <span className="text-sm text-blue-700">
                                  {enquiry.personality_description}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {enquiry.motivation && (
                          <div className="bg-green-50 p-3 rounded-md">
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                              <div>
                                <span className="text-sm font-medium text-green-800">
                                  Motivation:{" "}
                                </span>
                                <span className="text-sm text-green-700">{enquiry.motivation}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {enquiry.therapy_specialisations &&
                          enquiry.therapy_specialisations.length > 0 && (
                            <div className="bg-purple-50 p-3 rounded-md">
                              <div className="flex items-start gap-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                                <div>
                                  <span className="text-sm font-medium text-purple-800">
                                    Specialisations:{" "}
                                  </span>
                                  <span className="text-sm text-purple-700">
                                    {Array.isArray(enquiry.therapy_specialisations)
                                      ? enquiry.therapy_specialisations.join(", ")
                                      : enquiry.therapy_specialisations}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                        {(enquiry.location || enquiry.religion) && (
                          <div className="flex gap-4 text-xs text-gray-600">
                            {enquiry.location && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Location:</span>
                                <span>{enquiry.location}</span>
                              </div>
                            )}
                            {enquiry.religion && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Background:</span>
                                <span>{enquiry.religion}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Account:</span>
                          <Badge variant={enquiry.account_created ? "default" : "outline"}>
                            {enquiry.account_created ? "Created" : "Pending"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Applied:</span>
                          <span>
                            {enquiry.created_at
                              ? (() => {
                                  const date = new Date(enquiry.created_at);
                                  return isNaN(date.getTime())
                                    ? "Unknown"
                                    : date.toLocaleDateString();
                                })()
                              : "Unknown"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:min-w-0">
                      <Select
                        value={enquiry.status}
                        onValueChange={(value) =>
                          updateStatusMutation.mutate({ id: enquiry.id, status: value })
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        <SelectTrigger
                          className={`w-full sm:w-48 ${updateStatusMutation.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="enquiry_received">Enquiry Received</SelectItem>
                          <SelectItem value="under_review">Under Review</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="pending_documents">Pending Documents</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Therapist Tier Selection */}
                      <div className="w-full sm:w-52">
                        <Select
                          value={enquiry.therapistTier || ""}
                          onValueChange={(value) => {
                            // Prevent multiple rapid calls globally
                            if (updateTierMutation.isPending || isAnyTierUpdating) return;
                            updateTierMutation.mutate({ id: enquiry.id, tier: value });
                          }}
                          disabled={updateTierMutation.isPending || isAnyTierUpdating}
                        >
                          <SelectTrigger
                            className={`w-full ${updateTierMutation.isPending || isAnyTierUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <SelectValue placeholder="Select tier..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="counsellor">
                              Counsellor (£{TIER_PRICING.counsellor})
                            </SelectItem>
                            <SelectItem value="psychotherapist">
                              Psychotherapist (£{TIER_PRICING.psychotherapist})
                            </SelectItem>
                            <SelectItem value="psychologist">
                              Psychologist (£{TIER_PRICING.psychologist})
                            </SelectItem>
                            <SelectItem value="specialist">
                              Specialist (£{TIER_PRICING.specialist})
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2">
                        {enquiry.status === "approved" && !enquiry.account_created && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              console.log(
                                `Creating account for single therapist: ${enquiry.email} (ID: ${enquiry.id})`
                              );
                              createAccountMutation.mutate(enquiry);
                            }}
                            disabled={createAccountMutation.isPending}
                            className="w-full sm:w-auto whitespace-nowrap bg-hive-purple hover:bg-hive-purple/90 text-white px-4 py-2 disabled:opacity-50"
                          >
                            <UserCheck className="w-4 h-4 mr-2" />
                            {createAccountMutation.isPending ? "Creating..." : "Create Account"}
                          </Button>
                        )}

                        {enquiry.account_created && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log(
                                `Reset button clicked for ${enquiry.email} (ID: ${enquiry.id})`
                              );
                              if (!resetPasswordMutation.isPending) {
                                resetPasswordMutation.mutate(enquiry.email);
                              }
                            }}
                            disabled={resetPasswordMutation.isPending}
                            className="w-full sm:w-auto whitespace-nowrap"
                          >
                            <Key className="w-4 h-4 mr-2" />
                            {resetPasswordMutation.isPending ? "Generating..." : "Reset Password"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={passwordModal.isOpen}
        onOpenChange={(open) => setPasswordModal((prev) => ({ ...prev, isOpen: open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              {passwordModal.isNewAccount ? "New Account Created" : "Password Reset"}
            </DialogTitle>
            <DialogDescription>
              {passwordModal.isNewAccount
                ? "A new therapist account has been created. Please share these login credentials:"
                : "A new temporary password has been generated for this therapist:"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Email:</label>
              <div className="mt-1 p-3 bg-gray-50 border rounded-md font-mono text-sm">
                {passwordModal.email}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Temporary Password:</label>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 p-3 bg-green-50 border border-green-200 rounded-md font-mono text-sm font-bold text-green-800">
                  {passwordModal.password}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(passwordModal.password)}
                  className="px-3"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
              <strong>Note:</strong> The therapist should log in at the main portal and change this
              password immediately for security.
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() =>
                setPasswordModal({ isOpen: false, email: "", password: "", isNewAccount: false })
              }
              className="w-full"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
