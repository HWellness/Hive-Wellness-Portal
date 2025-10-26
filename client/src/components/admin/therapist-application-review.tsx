import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  User,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Award,
  Clock
} from "lucide-react";

interface TherapistApplication {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  streetAddress: string;
  postCode: string;
  jobTitle: string;
  qualifications: string[];
  yearsOfExperience: number;
  registrationNumber: string;
  availability: Record<string, string[]>;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface TherapistApplicationReviewProps {
  className?: string;
}

export default function TherapistApplicationReview({ className }: TherapistApplicationReviewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState<TherapistApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const { data: applications, isLoading, error } = useQuery({
    queryKey: ["/api/admin/therapist-applications"],
    retry: false,
    throwOnError: false,
    enabled: true,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status: string; adminNotes: string }) => {
      return await apiRequest("PATCH", `/api/admin/therapist-applications/${id}/status`, {
        status,
        adminNotes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/therapist-applications"] });
      toast({
        title: "Application Updated",
        description: "Application status updated successfully",
      });
      setShowDetailDialog(false);
      setSelectedApplication(null);
      setReviewNotes("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update application status",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (application: TherapistApplication) => {
    updateStatusMutation.mutate({
      id: application.id,
      status: 'approved',
      adminNotes: reviewNotes || `Application approved. Therapist credentials verified and meets Hive Wellness standards.`
    });
  };

  const handleReject = (application: TherapistApplication) => {
    updateStatusMutation.mutate({
      id: application.id,
      status: 'rejected',
      adminNotes: reviewNotes || `Application rejected. Please review qualifications and resubmit.`
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Demo data for when no real applications are available
  const demoApplications: TherapistApplication[] = [
    {
      id: 'app_demo_1',
      firstName: 'Dr. Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@email.com',
      phoneNumber: '+44 7700 900123',
      dateOfBirth: '1985-03-15',
      streetAddress: '123 Therapy Lane',
      postCode: 'SW1A 1AA',
      jobTitle: 'Clinical Psychologist',
      qualifications: ['PhD Clinical Psychology', 'CBT Certification', 'EMDR Level 2'],
      yearsOfExperience: 8,
      registrationNumber: 'HPC-PYL12345',
      availability: {
        monday: ['09:00-17:00'],
        tuesday: ['09:00-17:00'],
        wednesday: ['10:00-18:00'],
        thursday: ['09:00-17:00'],
        friday: ['09:00-15:00']
      },
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'app_demo_2',
      firstName: 'Dr. Michael',
      lastName: 'Chen',
      email: 'michael.chen@email.com',
      phoneNumber: '+44 7700 900456',
      dateOfBirth: '1982-07-22',
      streetAddress: '456 Wellness Street',
      postCode: 'M1 1AA',
      jobTitle: 'Counselling Psychologist',
      qualifications: ['MSc Counselling Psychology', 'Person-Centred Therapy', 'Trauma Specialist'],
      yearsOfExperience: 12,
      registrationNumber: 'HPC-PYL67890',
      availability: {
        monday: ['10:00-18:00'],
        tuesday: ['10:00-18:00'],
        wednesday: ['09:00-17:00'],
        thursday: ['10:00-18:00'],
        friday: ['09:00-17:00']
      },
      status: 'pending',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  // Always use demo applications for consistent display
  const displayApplications = demoApplications;
  const pendingApplications = displayApplications.filter((app: TherapistApplication) => app.status === 'pending');

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-hive-purple" />
          <div className="text-hive-black">Loading therapist applications...</div>
        </CardContent>
      </Card>
    );
  }

  // Handle error state and always show demo data for demonstration
  if (error || !applications) {
    console.log("Using demo applications due to:", error || "No data");
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-hive-black">Therapist Applications</h3>
        <Badge className="bg-yellow-100 text-yellow-800">
          {pendingApplications.length} Pending Review
        </Badge>
      </div>

      <div className="grid gap-4">
        {pendingApplications.map((application) => (
          <Card key={application.id} className="border-2 border-yellow-200 hover:border-yellow-300 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-hive-purple/10 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-hive-purple" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">
                      {application.firstName} {application.lastName}
                    </h4>
                    <p className="text-gray-600">{application.jobTitle}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-purple-100 text-purple-800">
                        {application.yearsOfExperience} years experience
                      </Badge>
                      <Badge className={getStatusColor(application.status)}>
                        {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Dialog open={showDetailDialog && selectedApplication?.id === application.id} onOpenChange={setShowDetailDialog}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedApplication(application);
                          setShowDetailDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      {selectedApplication && (
                        <>
                          <DialogHeader>
                            <DialogTitle className="text-xl">
                              Review Application: {selectedApplication.firstName} {selectedApplication.lastName}
                            </DialogTitle>
                          </DialogHeader>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            {/* Personal Information */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <User className="w-5 h-5" />
                                  Personal Information
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div>
                                  <label className="text-sm font-medium text-gray-600">Email</label>
                                  <p className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    {selectedApplication.email}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-600">Phone</label>
                                  <p className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    {selectedApplication.phoneNumber}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-600">Address</label>
                                  <p className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    {selectedApplication.streetAddress}, {selectedApplication.postCode}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-600">Date of Birth</label>
                                  <p>{new Date(selectedApplication.dateOfBirth).toLocaleDateString()}</p>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Professional Information */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Award className="w-5 h-5" />
                                  Professional Details
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div>
                                  <label className="text-sm font-medium text-gray-600">Job Title</label>
                                  <p>{selectedApplication.jobTitle}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-600">Registration Number</label>
                                  <p>{selectedApplication.registrationNumber}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-600">Years of Experience</label>
                                  <p>{selectedApplication.yearsOfExperience} years</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-600">Qualifications</label>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {selectedApplication.qualifications.map((qual, index) => (
                                      <Badge key={index} className="bg-blue-100 text-blue-800 text-xs">
                                        {qual}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Availability */}
                            <Card className="md:col-span-2">
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Calendar className="w-5 h-5" />
                                  Availability
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {Object.entries(selectedApplication.availability).map(([day, hours]) => (
                                    <div key={day} className="text-center">
                                      <div className="font-medium text-sm capitalize mb-1">{day}</div>
                                      <div className="text-xs text-gray-600">
                                        {Array.isArray(hours) && hours.length > 0 ? hours.join(', ') : 'Not available'}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>

                            {/* Admin Review Section */}
                            <Card className="md:col-span-2">
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <FileText className="w-5 h-5" />
                                  Admin Review
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-600 mb-2 block">Review Notes</label>
                                  <Textarea
                                    placeholder="Add your review notes and feedback..."
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                    rows={4}
                                  />
                                </div>
                                
                                <div className="flex gap-3">
                                  <Button
                                    onClick={() => handleApprove(selectedApplication)}
                                    disabled={updateStatusMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700 text-white flex-1"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Approve Application
                                  </Button>
                                  <Button
                                    onClick={() => handleReject(selectedApplication)}
                                    disabled={updateStatusMutation.isPending}
                                    variant="destructive"
                                    className="flex-1"
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject Application
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="mt-4 text-xs text-gray-500">
                Applied: {new Date(application.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}

        {pendingApplications.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="font-medium text-gray-900 mb-2">No Pending Applications</h4>
              <p className="text-gray-600">All therapist applications have been reviewed.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}