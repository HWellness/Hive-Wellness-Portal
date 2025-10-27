import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  MessageSquare,
  Video,
  ArrowLeft,
  Shield,
  Brain,
  Cake,
  Briefcase,
  Heart,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Link } from "wouter";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function ClientProfile() {
  const { clientId } = useParams();

  // Query for auth user first
  const { data: authUser, isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const isAuthenticated = !!authUser;

  // Query for client profile data
  const {
    data: clientProfile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId && isAuthenticated,
  });

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-hive-light-blue to-hive-white">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-hive-black/70">Please log in to view client profiles.</p>
            <Link href="/auth">
              <Button className="w-full mt-4 bg-hive-purple hover:bg-hive-purple/90">Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !clientProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-hive-light-blue to-hive-white">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-century font-bold text-hive-purple mb-4">
              Profile Not Found
            </h2>
            <p className="text-hive-black/70 mb-4">
              The client profile you're looking for could not be found.
            </p>
            <Link href="/portal">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Portal
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Log what we're getting
  console.log("Client profile data:", clientProfile);

  const client = clientProfile as any;
  const userRole = (authUser as any)?.role;
  const canViewDetails =
    userRole === "admin" || userRole === "therapist" || userRole === "institution";

  return (
    <div className="min-h-screen bg-gradient-to-br from-hive-light-blue to-hive-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/portal">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Portal
            </Button>
          </Link>
        </div>

        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage
                  src={client.profileImageUrl}
                  alt={`${client.firstName} ${client.lastName}`}
                />
                <AvatarFallback className="bg-hive-purple/20 text-hive-purple text-xl">
                  {client.firstName?.[0]}
                  {client.lastName?.[0]}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-century font-bold text-hive-purple">
                  {client.firstName} {client.lastName}
                </h1>
                <p className="text-hive-black/70 mt-1">{client.email}</p>

                {canViewDetails && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Badge variant="secondary">Client ID: {client.id}</Badge>
                    <Badge
                      variant={client.status === "active" ? "default" : "secondary"}
                      className={client.status === "active" ? "bg-green-100 text-green-800" : ""}
                    >
                      {client.status || "Active"}
                    </Badge>
                  </div>
                )}

                {canViewDetails && (
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" className="bg-hive-purple hover:bg-hive-purple/90">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                    <Button size="sm" variant="outline">
                      <Video className="w-4 h-4 mr-2" />
                      Video Call
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          {/* Contact Information */}
          {canViewDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-hive-purple">
                  <User className="w-5 h-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-hive-purple" />
                  <div>
                    <p className="text-xs text-hive-black/50 uppercase tracking-wide">Email</p>
                    <p className="text-sm font-medium">{client.email}</p>
                  </div>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-hive-purple" />
                    <div>
                      <p className="text-xs text-hive-black/50 uppercase tracking-wide">Phone</p>
                      <p className="text-sm font-medium">{client.phone}</p>
                    </div>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-hive-purple" />
                    <div>
                      <p className="text-xs text-hive-black/50 uppercase tracking-wide">Address</p>
                      <p className="text-sm font-medium">{client.address}</p>
                    </div>
                  </div>
                )}
                {client.dateOfBirth && (
                  <div className="flex items-center gap-3">
                    <Cake className="w-4 h-4 text-hive-purple" />
                    <div>
                      <p className="text-xs text-hive-black/50 uppercase tracking-wide">
                        Date of Birth
                      </p>
                      <p className="text-sm font-medium">
                        {new Date(client.dateOfBirth).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}{" "}
                        (Age {new Date().getFullYear() - new Date(client.dateOfBirth).getFullYear()}
                        )
                      </p>
                    </div>
                  </div>
                )}
                {client.occupation && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-4 h-4 text-hive-purple" />
                    <div>
                      <p className="text-xs text-hive-black/50 uppercase tracking-wide">
                        Occupation
                      </p>
                      <p className="text-sm font-medium">{client.occupation}</p>
                    </div>
                  </div>
                )}
                {client.maritalStatus && (
                  <div className="flex items-center gap-3">
                    <Heart className="w-4 h-4 text-hive-purple" />
                    <div>
                      <p className="text-xs text-hive-black/50 uppercase tracking-wide">
                        Marital Status
                      </p>
                      <p className="text-sm font-medium">{client.maritalStatus}</p>
                    </div>
                  </div>
                )}
                {client.assignedTherapist && (
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-hive-purple" />
                    <div>
                      <p className="text-xs text-hive-black/50 uppercase tracking-wide">
                        Assigned Therapist
                      </p>
                      <p className="text-sm font-medium">
                        {client.assignedTherapist === "dr-sarah-thompson"
                          ? "Dr. Sarah Thompson"
                          : client.assignedTherapist === "demo-therapist-1"
                            ? "Dr. Sarah Thompson"
                            : client.assignedTherapist}
                      </p>
                    </div>
                  </div>
                )}
                {client.createdAt && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-hive-purple" />
                    <div>
                      <p className="text-xs text-hive-black/50 uppercase tracking-wide">
                        Joined Platform
                      </p>
                      <p className="text-sm font-medium">
                        {new Date(client.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Profile Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-hive-purple">
                <FileText className="w-5 h-5" />
                Profile Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {canViewDetails ? (
                <div className="space-y-6">
                  {client.bio && (
                    <div>
                      <h4 className="font-semibold text-sm text-hive-purple mb-2">
                        About {client.firstName}
                      </h4>
                      <p className="text-sm text-hive-black/70 leading-relaxed bg-gray-50 p-3 rounded border">
                        {client.bio}
                      </p>
                    </div>
                  )}
                  {client.goals && (
                    <div>
                      <h4 className="font-semibold text-sm text-hive-purple mb-2">Therapy Goals</h4>
                      <p className="text-sm text-hive-black/70 leading-relaxed bg-blue-50 p-3 rounded border">
                        {client.goals}
                      </p>
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-4">
                    {client.therapyType && (
                      <div>
                        <h4 className="font-semibold text-sm text-hive-purple mb-2">
                          Preferred Therapy Type
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-hive-purple border-hive-purple bg-purple-50"
                        >
                          {client.therapyType}
                        </Badge>
                      </div>
                    )}
                    {client.progressStatus && (
                      <div>
                        <h4 className="font-semibold text-sm text-hive-purple mb-2">
                          Current Progress
                        </h4>
                        <Badge
                          variant="default"
                          className="bg-green-100 text-green-800 border-green-200"
                        >
                          {client.progressStatus}
                        </Badge>
                      </div>
                    )}
                  </div>
                  {client.preferences && client.preferences.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm text-hive-purple mb-2">
                        Session Preferences
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {client.preferences.map((pref: string, idx: number) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs bg-blue-100 text-blue-800"
                          >
                            {pref}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {userRole === "therapist" && client.latestNote && (
                    <div>
                      <h4 className="font-semibold text-sm text-hive-purple mb-2">
                        Latest Progress Note
                      </h4>
                      <p className="text-sm text-gray-700 bg-green-50 p-3 rounded border italic">
                        "{client.latestNote}"
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-hive-black/70">
                  Limited profile information available for your role.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Therapy History & Progress */}
          {canViewDetails && (
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-hive-purple">
                    <Calendar className="w-5 h-5" />
                    Session History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-hive-black/70">Total Sessions</span>
                      <Badge variant="default" className="bg-hive-purple">
                        {client.sessionCount || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-hive-black/70">Last Session</span>
                      <span className="text-sm font-medium">
                        {client.lastSession
                          ? new Date(client.lastSession).toLocaleDateString("en-GB")
                          : "No sessions yet"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-hive-black/70">Next Session</span>
                      <span className="text-sm font-medium">
                        {client.nextSession
                          ? new Date(client.nextSession).toLocaleDateString("en-GB")
                          : "Not scheduled"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-hive-purple">
                    <Brain className="w-5 h-5" />
                    Wellness Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {client.wellnessScore && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-hive-black/70">Wellness Score</span>
                          <span className="text-sm font-bold text-hive-purple">
                            {client.wellnessScore}/10
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-hive-purple h-2 rounded-full"
                            style={{ width: `${(client.wellnessScore / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-hive-black/70">Progress Notes</span>
                        <Badge variant="outline" className="text-xs">
                          {client.progressStatus || "In Progress"}
                        </Badge>
                      </div>
                      {client.latestNote && (
                        <p className="text-xs text-hive-black/60 italic">"{client.latestNote}"</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Initial Questionnaire - Therapist Only */}
          {canViewDetails && userRole === "therapist" && client.initialQuestionnaire && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <FileText className="w-5 h-5" />
                  Initial Assessment Questionnaire
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Submitted{" "}
                    {new Date(client.initialQuestionnaire.submittedAt).toLocaleDateString("en-GB")}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-sm text-blue-700 mb-2">Primary Concerns</h4>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                      {client.initialQuestionnaire.responses.primaryConcerns}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-blue-700 mb-2">
                      Symptoms Description
                    </h4>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                      {client.initialQuestionnaire.responses.symptomsDescription}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-blue-700 mb-2">Triggers</h4>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                      {client.initialQuestionnaire.responses.triggers}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-blue-700 mb-2">
                      Current Coping Mechanisms
                    </h4>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                      {client.initialQuestionnaire.responses.copingMechanisms}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-blue-700 mb-2">
                      Previous Therapy Experience
                    </h4>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                      {client.initialQuestionnaire.responses.previousTherapy}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-blue-700 mb-2">
                      Current Medications
                    </h4>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                      {client.initialQuestionnaire.responses.medications}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-blue-700 mb-2">Support System</h4>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                      {client.initialQuestionnaire.responses.supportSystem}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-blue-700 mb-2">
                      Therapy Expectations
                    </h4>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                      {client.initialQuestionnaire.responses.expectations}
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-blue-700 mb-2">Lifestyle Factors</h4>
                  <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                    {client.initialQuestionnaire.responses.lifestyleFactors}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Medical History - Therapist Only */}
          {canViewDetails && userRole === "therapist" && client.medicalHistory && (
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <Shield className="w-5 h-5" />
                  Medical History
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Therapist Only
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm text-green-700 mb-2">General Health</h4>
                    <p className="text-sm text-gray-700">{client.medicalHistory.generalHealth}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-green-700 mb-2">
                      Mental Health History
                    </h4>
                    <p className="text-sm text-gray-700">
                      {client.medicalHistory.mentalHealthHistory}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-green-700 mb-2">Allergies</h4>
                    <p className="text-sm text-gray-700">{client.medicalHistory.allergies}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-green-700 mb-2">
                      Current Medications
                    </h4>
                    <p className="text-sm text-gray-700">
                      {client.medicalHistory.currentMedications}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Emergency Contacts & Clinical Notes */}
          {canViewDetails && userRole === "therapist" && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="w-5 h-5" />
                  Clinical Information & Emergency Contacts
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Therapist Only
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {client.emergencyContact && (
                    <div>
                      <h4 className="font-semibold text-sm text-orange-700 mb-2">
                        Emergency Contact
                      </h4>
                      <div className="space-y-2 bg-white p-3 rounded border">
                        <p className="text-sm font-medium">{client.emergencyContact.name}</p>
                        <p className="text-sm text-gray-600">
                          {client.emergencyContact.relationship}
                        </p>
                        <p className="text-sm text-gray-600">{client.emergencyContact.phone}</p>
                        {client.emergencyContact.email && (
                          <p className="text-sm text-gray-600">{client.emergencyContact.email}</p>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-sm text-orange-700 mb-2">Risk Assessment</h4>
                    <div className="bg-white p-3 rounded border">
                      {client.riskAssessment && (
                        <Badge
                          variant={client.riskAssessment === "Low" ? "default" : "destructive"}
                          className={
                            client.riskAssessment === "Low" ? "bg-green-100 text-green-800" : ""
                          }
                        >
                          {client.riskAssessment} Risk
                        </Badge>
                      )}
                      {client.assignedDate && (
                        <p className="text-sm text-gray-600 mt-2">
                          Assigned to therapist:{" "}
                          {new Date(client.assignedDate).toLocaleDateString("en-GB")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {client.clinicalNotes && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-sm text-orange-700 mb-2">Clinical Notes</h4>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                      {client.clinicalNotes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
