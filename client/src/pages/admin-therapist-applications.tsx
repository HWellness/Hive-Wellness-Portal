import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Eye, Check, X, Calendar, Mail, Phone, MapPin, Award } from "lucide-react";
import { Link } from "wouter";

interface TherapistApplication {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  location?: string;
  qualifications: string[];
  yearsOfExperience: number;
  specializations: string[];
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
  profileImageUrl?: string;
}

export default function AdminTherapistApplications() {
  const { toast } = useToast();
  const [selectedApplication, setSelectedApplication] = useState<TherapistApplication | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: applications, isLoading } = useQuery({
    queryKey: ["/api/admin/therapist-applications"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/therapist-applications");
      if (!response.ok) throw new Error("Failed to fetch applications");
      return response.json();
    },
  });

  const updateApplicationMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const response = await apiRequest("PUT", `/api/admin/therapist-applications/${id}`, {
        status,
        adminNotes: notes,
      });
      if (!response.ok) throw new Error("Failed to update application");
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/therapist-applications"] });
      toast({
        title: "Application Updated",
        description: `Application ${variables.status} successfully.`,
      });
      setSelectedApplication(null);
      setAdminNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleApprove = (application: TherapistApplication) => {
    updateApplicationMutation.mutate({
      id: application.id,
      status: "approved",
      notes: adminNotes,
    });
  };

  const handleReject = (application: TherapistApplication) => {
    updateApplicationMutation.mutate({
      id: application.id,
      status: "rejected",
      notes: adminNotes,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-hive-light-blue text-hive-purple";
      case "approved":
        return "bg-purple-100 text-purple-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-hive-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-hive-purple border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-hive-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link to="/admin-dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-primary text-hive-purple font-bold">
                Therapist Applications
              </h1>
              <p className="text-hive-black/70 font-secondary">
                Review and manage therapist onboarding requests
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-secondary text-hive-black/70">Total Applications</p>
                  <p className="text-2xl font-primary text-hive-purple">
                    {applications?.length || 0}
                  </p>
                </div>
                <Award className="w-8 h-8 text-hive-purple/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-secondary text-hive-black/70">Pending Review</p>
                  <p className="text-2xl font-primary text-yellow-600">
                    {applications?.filter((app: TherapistApplication) => app.status === "pending")
                      .length || 0}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-yellow-600/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-secondary text-hive-black/70">Approved</p>
                  <p className="text-2xl font-primary text-green-600">
                    {applications?.filter((app: TherapistApplication) => app.status === "approved")
                      .length || 0}
                  </p>
                </div>
                <Check className="w-8 h-8 text-green-600/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-secondary text-hive-black/70">Rejected</p>
                  <p className="text-2xl font-primary text-red-600">
                    {applications?.filter((app: TherapistApplication) => app.status === "rejected")
                      .length || 0}
                  </p>
                </div>
                <X className="w-8 h-8 text-red-600/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Applications List */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="font-primary text-hive-purple">Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {applications?.map((application: TherapistApplication) => (
                <Card
                  key={application.id}
                  className="border border-gray-200 hover:border-hive-purple/30 transition-colors"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {application.profileImageUrl ? (
                          <img
                            src={application.profileImageUrl}
                            alt={`${application.firstName} ${application.lastName}`}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-hive-purple/10 flex items-center justify-center">
                            <span className="text-hive-purple font-semibold">
                              {application.firstName.charAt(0)}
                              {application.lastName.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div>
                          <h3 className="font-primary text-hive-black font-semibold">
                            {application.firstName} {application.lastName}
                          </h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <div className="flex items-center text-sm text-hive-black/70">
                              <Mail className="w-4 h-4 mr-1" />
                              {application.email}
                            </div>
                            {application.location && (
                              <div className="flex items-center text-sm text-hive-black/70">
                                <MapPin className="w-4 h-4 mr-1" />
                                {application.location}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge className={getStatusColor(application.status)}>
                              {application.status.charAt(0).toUpperCase() +
                                application.status.slice(1)}
                            </Badge>
                            <span className="text-sm text-hive-black/70">
                              {application.yearsOfExperience} years experience
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedApplication(application)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="font-primary text-hive-purple">
                                Review Application: {application.firstName} {application.lastName}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                              {/* Profile Photo */}
                              {application.profileImageUrl && (
                                <div className="text-center">
                                  <img
                                    src={application.profileImageUrl}
                                    alt={`${application.firstName} ${application.lastName}`}
                                    className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-hive-purple/30"
                                  />
                                </div>
                              )}

                              {/* Contact Information */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="font-secondary text-sm text-hive-black/70">
                                    Email
                                  </Label>
                                  <p className="font-secondary">{application.email}</p>
                                </div>
                                {application.phoneNumber && (
                                  <div>
                                    <Label className="font-secondary text-sm text-hive-black/70">
                                      Phone
                                    </Label>
                                    <p className="font-secondary">{application.phoneNumber}</p>
                                  </div>
                                )}
                                {application.location && (
                                  <div>
                                    <Label className="font-secondary text-sm text-hive-black/70">
                                      Location
                                    </Label>
                                    <p className="font-secondary">{application.location}</p>
                                  </div>
                                )}
                                <div>
                                  <Label className="font-secondary text-sm text-hive-black/70">
                                    Experience
                                  </Label>
                                  <p className="font-secondary">
                                    {application.yearsOfExperience} years
                                  </p>
                                </div>
                              </div>

                              {/* Qualifications */}
                              <div>
                                <Label className="font-secondary text-sm text-hive-black/70">
                                  Qualifications
                                </Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {application.qualifications?.map((qual, index) => (
                                    <Badge key={index} variant="outline" className="font-secondary">
                                      {qual}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              {/* Specialisations */}
                              <div>
                                <Label className="font-secondary text-sm text-hive-black/70">
                                  Specialisations
                                </Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {application.specializations?.map((spec, index) => (
                                    <Badge key={index} variant="outline" className="font-secondary">
                                      {spec}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              {/* Admin Notes */}
                              <div>
                                <Label
                                  htmlFor="adminNotes"
                                  className="font-secondary text-sm text-hive-black/70"
                                >
                                  Admin Notes
                                </Label>
                                <Textarea
                                  id="adminNotes"
                                  value={adminNotes}
                                  onChange={(e) => setAdminNotes(e.target.value)}
                                  placeholder="Add notes about this application..."
                                  className="mt-2"
                                />
                              </div>

                              {/* Action Buttons */}
                              {application.status === "pending" && (
                                <div className="flex justify-end space-x-3 pt-4">
                                  <Button
                                    variant="outline"
                                    onClick={() => handleReject(application)}
                                    disabled={updateApplicationMutation.isPending}
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    Reject
                                  </Button>
                                  <Button
                                    onClick={() => handleApprove(application)}
                                    disabled={updateApplicationMutation.isPending}
                                    className="bg-hive-purple hover:bg-hive-purple/90"
                                  >
                                    <Check className="w-4 h-4 mr-2" />
                                    Approve
                                  </Button>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {(!applications || applications.length === 0) && (
                <div className="text-center py-12">
                  <Award className="w-16 h-16 text-hive-purple/30 mx-auto mb-4" />
                  <h3 className="font-primary text-hive-black font-semibold mb-2">
                    No Applications Yet
                  </h3>
                  <p className="text-hive-black/70 font-secondary">
                    Therapist applications will appear here once submitted.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
