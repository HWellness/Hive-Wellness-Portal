import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { formatPhoneNumber, formatPostcode } from "@/lib/form-validation";
import { apiRequest } from "@/lib/queryClient";
import { User, Shield, CheckCircle, Save, Settings, Building } from "lucide-react";
import type { User as UserType } from "@shared/schema";

interface AdminProfileCompletionProps {
  user: UserType;
}

interface AdminProfileData {
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    phone: string;
    address: string;
    city: string;
    postcode: string;
    emergencyContact: string;
    emergencyPhone: string;
  };
  adminInfo: {
    department: string;
    jobTitle: string;
    employeeId: string;
    startDate: string;
    managerName: string;
    managerEmail: string;
    responsibilities: string[];
    accessLevel: string;
    trainingCompleted: string[];
    certifications: string[];
  };
  systemAccess: {
    systemsAccess: string[];
    adminRights: string[];
    dataAccessLevel: string;
    reportingAccess: string[];
    auditTrail: boolean;
    twoFactorAuth: boolean;
    lastSecurityTraining: string;
    passwordPolicy: boolean;
  };
  privacy: {
    dataProcessingConsent: boolean;
    adminStandardsConsent: boolean;
    confidentialityAgreement: boolean;
    systemSecurityConsent: boolean;
  };
}

const DEPARTMENTS = [
  "Clinical Operations",
  "Technology",
  "Customer Support",
  "Quality Assurance",
  "Compliance",
  "Business Development",
  "Finance",
  "Human Resources",
  "Marketing",
];

const RESPONSIBILITIES = [
  "User Management",
  "System Administration",
  "Data Management",
  "Compliance Monitoring",
  "Quality Assurance",
  "Customer Support",
  "Technical Support",
  "Training & Education",
  "Report Generation",
  "Security Management",
  "Billing & Payments",
  "Therapist Onboarding",
];

const SYSTEMS_ACCESS = [
  "User Management Dashboard",
  "Therapist Portal",
  "Client Portal",
  "Payment System",
  "Messaging System",
  "Video Sessions",
  "Reporting Engine",
  "Admin Console",
  "Security Dashboard",
  "Automation Engine",
  "WordPress Integration",
  "Database Access",
];

export default function AdminProfileCompletion({ user }: AdminProfileCompletionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [currentSection, setCurrentSection] = useState(0);
  const [profileData, setProfileData] = useState<AdminProfileData>({
    personalInfo: {
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      dateOfBirth: "",
      gender: "",
      phone: "",
      address: "",
      city: "",
      postcode: "",
      emergencyContact: "",
      emergencyPhone: "",
    },
    adminInfo: {
      department: "",
      jobTitle: "",
      employeeId: "",
      startDate: "",
      managerName: "",
      managerEmail: "",
      responsibilities: [],
      accessLevel: "",
      trainingCompleted: [],
      certifications: [],
    },
    systemAccess: {
      systemsAccess: [],
      adminRights: [],
      dataAccessLevel: "",
      reportingAccess: [],
      auditTrail: true,
      twoFactorAuth: false,
      lastSecurityTraining: "",
      passwordPolicy: true,
    },
    privacy: {
      dataProcessingConsent: false,
      adminStandardsConsent: false,
      confidentialityAgreement: false,
      systemSecurityConsent: false,
    },
  });

  const sections = [
    { id: "personal", title: "Personal Information", icon: User, color: "bg-blue-500" },
    { id: "admin", title: "Administrative Details", icon: Building, color: "bg-green-500" },
    { id: "system", title: "System Access", icon: Settings, color: "bg-purple-500" },
    { id: "privacy", title: "Privacy & Compliance", icon: Shield, color: "bg-red-500" },
  ];

  const calculateProgress = () => {
    let completedFields = 0;
    let totalFields = 0;

    // Personal Info (10 required fields)
    const personalFields = Object.values(profileData.personalInfo);
    totalFields += personalFields.length;
    completedFields += personalFields.filter((field) => field.trim() !== "").length;

    // Admin Info (10 required fields)
    totalFields += 10;
    if (profileData.adminInfo.department) completedFields++;
    if (profileData.adminInfo.jobTitle) completedFields++;
    if (profileData.adminInfo.employeeId) completedFields++;
    if (profileData.adminInfo.startDate) completedFields++;
    if (profileData.adminInfo.managerName) completedFields++;
    if (profileData.adminInfo.managerEmail) completedFields++;
    if (profileData.adminInfo.responsibilities.length > 0) completedFields++;
    if (profileData.adminInfo.accessLevel) completedFields++;
    if (profileData.adminInfo.trainingCompleted.length > 0) completedFields++;
    if (profileData.adminInfo.certifications.length > 0) completedFields++;

    // System Access (8 required fields)
    totalFields += 8;
    if (profileData.systemAccess.systemsAccess.length > 0) completedFields++;
    if (profileData.systemAccess.adminRights.length > 0) completedFields++;
    if (profileData.systemAccess.dataAccessLevel) completedFields++;
    if (profileData.systemAccess.reportingAccess.length > 0) completedFields++;
    if (profileData.systemAccess.auditTrail) completedFields++;
    if (profileData.systemAccess.twoFactorAuth) completedFields++;
    if (profileData.systemAccess.lastSecurityTraining) completedFields++;
    if (profileData.systemAccess.passwordPolicy) completedFields++;

    // Privacy (4 required fields)
    totalFields += 4;
    if (profileData.privacy.dataProcessingConsent) completedFields++;
    if (profileData.privacy.adminStandardsConsent) completedFields++;
    if (profileData.privacy.confidentialityAgreement) completedFields++;
    if (profileData.privacy.systemSecurityConsent) completedFields++;

    return Math.round((completedFields / totalFields) * 100);
  };

  const saveProfileMutation = useMutation({
    mutationFn: async (data: AdminProfileData) => {
      const response = await apiRequest("POST", `/api/admin/profile/${user.id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Saved",
        description: "Your administrative profile has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/profile/${user.id}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCompleteProfile = () => {
    const progressPercentage = calculateProgress();

    if (
      !profileData.privacy.dataProcessingConsent ||
      !profileData.privacy.adminStandardsConsent ||
      !profileData.privacy.confidentialityAgreement ||
      !profileData.privacy.systemSecurityConsent
    ) {
      toast({
        title: "Consent Required",
        description: "All compliance consents are required for administrative access.",
        variant: "destructive",
      });
      return;
    }

    if (progressPercentage < 95) {
      toast({
        title: "Profile Incomplete",
        description: `Your profile is ${progressPercentage}% complete. Please complete all sections to proceed.`,
        variant: "destructive",
      });
      return;
    }

    saveProfileMutation.mutate(profileData);

    // Auto-redirect after completion
    setTimeout(() => {
      setLocation("/portal");
    }, 2000);
  };

  const progress = calculateProgress();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-century font-bold text-hive-black">
            Complete Your Administrative Profile
          </h2>
          <p className="text-gray-600 mt-2">
            Set up your administrative access and system permissions
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600 mb-2">Profile Progress</div>
          <div className="flex items-center gap-2">
            <Progress value={progress} className="w-32" />
            <span className="text-sm font-medium">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {sections.map((section, index) => {
          const Icon = section.icon;
          const isActive = index === currentSection;
          const isCompleted = index < currentSection;

          return (
            <button
              key={section.id}
              onClick={() => setCurrentSection(index)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors min-w-fit ${
                isActive
                  ? "bg-hive-purple text-white"
                  : isCompleted
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{section.title}</span>
              {isCompleted && <CheckCircle className="w-4 h-4" />}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {React.createElement(sections[currentSection].icon, { className: "w-5 h-5" })}
            {sections[currentSection].title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentSection === 0 && (
            <div className="space-y-4">
              {/* Same personal information fields as therapist profile */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={profileData.personalInfo.firstName}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, firstName: e.target.value },
                      }))
                    }
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={profileData.personalInfo.lastName}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, lastName: e.target.value },
                      }))
                    }
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={profileData.personalInfo.dateOfBirth}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, dateOfBirth: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender *</Label>
                  <Select
                    value={profileData.personalInfo.gender}
                    onValueChange={(value) =>
                      setProfileData((prev) => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, gender: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Rest of personal information fields... */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={profileData.personalInfo.phone}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          phone: formatPhoneNumber(e.target.value),
                        },
                      }))
                    }
                    placeholder="+44 7XXX XXXXXX"
                  />
                </div>
                <div>
                  <Label htmlFor="postcode">Postcode *</Label>
                  <Input
                    id="postcode"
                    value={profileData.personalInfo.postcode}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          postcode: formatPostcode(e.target.value),
                        },
                      }))
                    }
                    placeholder="SW1A 1AA"
                  />
                </div>
              </div>
            </div>
          )}

          {currentSection === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department">Department *</Label>
                  <Select
                    value={profileData.adminInfo.department}
                    onValueChange={(value) =>
                      setProfileData((prev) => ({
                        ...prev,
                        adminInfo: { ...prev.adminInfo, department: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="jobTitle">Job Title *</Label>
                  <Input
                    id="jobTitle"
                    value={profileData.adminInfo.jobTitle}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        adminInfo: { ...prev.adminInfo, jobTitle: e.target.value },
                      }))
                    }
                    placeholder="e.g., Clinical Operations Manager"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employeeId">Employee ID *</Label>
                  <Input
                    id="employeeId"
                    value={profileData.adminInfo.employeeId}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        adminInfo: { ...prev.adminInfo, employeeId: e.target.value },
                      }))
                    }
                    placeholder="HW001"
                  />
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={profileData.adminInfo.startDate}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        adminInfo: { ...prev.adminInfo, startDate: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="responsibilities">Responsibilities *</Label>
                <div className="mt-2 space-y-2">
                  {RESPONSIBILITIES.map((responsibility) => (
                    <div key={responsibility} className="flex items-center space-x-2">
                      <Checkbox
                        id={responsibility}
                        checked={profileData.adminInfo.responsibilities.includes(responsibility)}
                        onCheckedChange={(checked) => {
                          setProfileData((prev) => ({
                            ...prev,
                            adminInfo: {
                              ...prev.adminInfo,
                              responsibilities: checked
                                ? [...prev.adminInfo.responsibilities, responsibility]
                                : prev.adminInfo.responsibilities.filter(
                                    (r) => r !== responsibility
                                  ),
                            },
                          }));
                        }}
                      />
                      <label
                        htmlFor={responsibility}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {responsibility}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentSection((prev) => Math.max(0, prev - 1))}
              disabled={currentSection === 0}
            >
              Previous
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => saveProfileMutation.mutate(profileData)}
                disabled={saveProfileMutation.isPending}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Progress
              </Button>

              {currentSection === sections.length - 1 ? (
                <Button
                  onClick={handleCompleteProfile}
                  disabled={
                    saveProfileMutation.isPending ||
                    !profileData.privacy.dataProcessingConsent ||
                    !profileData.privacy.adminStandardsConsent ||
                    !profileData.privacy.confidentialityAgreement ||
                    !profileData.privacy.systemSecurityConsent
                  }
                  className="bg-hive-purple hover:bg-hive-purple/90"
                >
                  Complete Profile
                </Button>
              ) : (
                <Button
                  onClick={() =>
                    setCurrentSection((prev) => Math.min(sections.length - 1, prev + 1))
                  }
                  className="bg-hive-purple hover:bg-hive-purple/90"
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
