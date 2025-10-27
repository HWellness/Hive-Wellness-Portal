import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  phoneValidation,
  postcodeValidation,
  nameValidation,
  emailValidation,
  formatPhoneNumber,
  formatPostcode,
  formatSortCode,
  VALIDATION_MESSAGES,
} from "@/lib/form-validation";
import { apiRequest } from "@/lib/queryClient";
import {
  User,
  MapPin,
  Calendar,
  Heart,
  Shield,
  Clock,
  Target,
  CheckCircle,
  AlertCircle,
  Info,
  Plus,
  X,
  Save,
  GraduationCap,
  Award,
  Users,
  Camera,
  Upload,
} from "lucide-react";
import type { User as UserType } from "@shared/schema";

interface TherapistProfileCompletionProps {
  user: UserType;
}

interface TherapistProfileData {
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
  professionalInfo: {
    qualifications: string[];
    registrationNumber: string;
    registrationBody: string;
    yearsExperience: string;
    specialisations: string[];
    therapeuticApproach: string[];
    languagesSpoken: string[];
    professionalInsurance: string;
    insuranceProvider: string;
    insuranceNumber: string;
  };
  businessInfo: {
    bankAccountName: string;
    bankSortCode: string;
    bankAccountNumber: string;
    vatNumber: string;
    businessAddress: string;
    businessPhone: string;
  };
  privacy: {
    dataProcessingConsent: boolean;
    professionalStandardsConsent: boolean;
    backgroundCheckConsent: boolean;
    marketingConsent: boolean;
  };
}

const SPECIALISATIONS = [
  "Anxiety Disorders",
  "Depression",
  "Trauma & PTSD",
  "Relationship Issues",
  "Addiction & Substance Abuse",
  "Eating Disorders",
  "Grief & Loss",
  "Stress Management",
  "OCD",
  "Bipolar Disorder",
  "Personality Disorders",
  "ADHD",
  "Autism Spectrum",
  "Family Therapy",
  "Couples Therapy",
  "Child & Adolescent",
  "LGBTQ+ Issues",
  "Career Counselling",
  "Life Transitions",
  "Anger Management",
];

const THERAPEUTIC_APPROACHES = [
  "Cognitive Behavioural Therapy (CBT)",
  "Psychodynamic Therapy",
  "Humanistic Therapy",
  "EMDR",
  "Dialectical Behaviour Therapy (DBT)",
  "Acceptance & Commitment Therapy (ACT)",
  "Mindfulness-Based Therapy",
  "Solution-Focused Therapy",
  "Systemic Family Therapy",
  "Gestalt Therapy",
  "Person-Centred Therapy",
  "Narrative Therapy",
  "Schema Therapy",
];

export default function TherapistProfileCompletion({ user }: TherapistProfileCompletionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [currentSection, setCurrentSection] = useState(0);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>(user.profileImageUrl || "");

  // Fetch existing therapist application data for auto-population
  const { data: existingApplication, isLoading: isLoadingApplication } = useQuery({
    queryKey: [`/api/therapist-applications/check/${encodeURIComponent(user.email || "")}`],
    enabled: !!user.email,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-populate from HubSpot data
  const autoPopulateFromHubSpot = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/therapist/profile/auto-populate");
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.hasData) {
        const hubspotData = data.profileData;
        console.log("HubSpot Auto-Fill Response:", data);
        console.log("HubSpot Profile Data:", hubspotData);

        let changedFields: string[] = [];

        setProfileData((prevData) => {
          // Track changes for user feedback
          const newData = {
            personalInfo: {
              ...prevData.personalInfo,
              firstName: hubspotData.firstName || prevData.personalInfo.firstName,
              lastName: hubspotData.lastName || prevData.personalInfo.lastName,
              phone: hubspotData.phone || prevData.personalInfo.phone,
              address: hubspotData.location || prevData.personalInfo.address,
            },
            professionalInfo: {
              ...prevData.professionalInfo,
              qualifications: Array.isArray(hubspotData.qualifications)
                ? hubspotData.qualifications
                : hubspotData.qualifications
                  ? [hubspotData.qualifications]
                  : hubspotData.highestQualification
                    ? [hubspotData.highestQualification]
                    : prevData.professionalInfo.qualifications,
              yearsExperience: hubspotData.experience || prevData.professionalInfo.yearsExperience,
              specialisations:
                hubspotData.specializations && hubspotData.specializations.length > 0
                  ? hubspotData.specializations
                  : prevData.professionalInfo.specialisations,
              therapeuticApproach:
                hubspotData.specializations && hubspotData.specializations.length > 0
                  ? hubspotData.specializations
                  : prevData.professionalInfo.therapeuticApproach,
              registrationBody:
                hubspotData.professionalBody || prevData.professionalInfo.registrationBody,
            },
            businessInfo: {
              ...prevData.businessInfo,
              businessAddress: hubspotData.location || prevData.businessInfo.businessAddress,
              businessPhone: hubspotData.phone || prevData.businessInfo.businessPhone,
            },
            privacy: prevData.privacy,
          };

          // Check what actually changed
          if (hubspotData.firstName && hubspotData.firstName !== prevData.personalInfo.firstName)
            changedFields.push("First Name");
          if (hubspotData.lastName && hubspotData.lastName !== prevData.personalInfo.lastName)
            changedFields.push("Last Name");
          if (hubspotData.phone && hubspotData.phone !== prevData.personalInfo.phone)
            changedFields.push("Phone");
          if (hubspotData.location && hubspotData.location !== prevData.personalInfo.address)
            changedFields.push("Address");
          if (
            hubspotData.experience &&
            hubspotData.experience !== prevData.professionalInfo.yearsExperience
          )
            changedFields.push("Experience");
          if (
            hubspotData.qualifications &&
            hubspotData.qualifications !== prevData.professionalInfo.qualifications.join(",")
          )
            changedFields.push("Qualifications");
          if (
            hubspotData.specializations &&
            JSON.stringify(hubspotData.specializations) !==
              JSON.stringify(prevData.professionalInfo.specialisations)
          )
            changedFields.push("Specialisations");
          if (
            hubspotData.professionalBody &&
            hubspotData.professionalBody !== prevData.professionalInfo.registrationBody
          )
            changedFields.push("Professional Body");

          return newData;
        });

        if (changedFields.length > 0) {
          toast({
            title: "Profile Updated from HubSpot Application Data",
            description: `Updated ${changedFields.length} fields: ${changedFields.join(", ")}. Please review the changes and save your profile.`,
          });
        } else {
          toast({
            title: "Profile Already Up to Date",
            description:
              "Your profile already contains all the available information from your application. No changes were needed.",
          });
        }
      } else {
        toast({
          title: "No Additional Application Data Found",
          description:
            data.message || "No additional application data was found for auto-population.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Auto-Population Failed",
        description: "Could not retrieve your application data for auto-population.",
        variant: "destructive",
      });
    },
  });

  console.log("Therapist Profile Component - existingApplication:", existingApplication);
  // Initialize profile data with auto-population from existing application
  const getInitialProfileData = (): TherapistProfileData => {
    const application = (existingApplication as any)?.exists
      ? (existingApplication as any).application
      : null;

    return {
      personalInfo: {
        firstName: application?.firstName || user.firstName || "",
        lastName: application?.lastName || user.lastName || "",
        dateOfBirth: application?.dateOfBirth || "",
        gender: application?.gender || "",
        phone: application?.phone || application?.phoneNumber || "",
        address: application?.address || "",
        city: application?.city || "",
        postcode: application?.postcode || "",
        emergencyContact: application?.emergencyContact || "",
        emergencyPhone: application?.emergencyPhone || "",
      },
      professionalInfo: {
        qualifications: application?.qualifications || [],
        registrationNumber: application?.registrationNumber || "",
        registrationBody: application?.registrationBody || "",
        yearsExperience:
          application?.experience || application?.yearsOfExperience?.toString() || "",
        specialisations: application?.specialisations || application?.specializations || [],
        therapeuticApproach: application?.therapeuticApproach || [],
        languagesSpoken: application?.languagesSpoken || ["English"],
        professionalInsurance: application?.professionalInsurance || "",
        insuranceProvider: application?.insuranceProvider || "",
        insuranceNumber: application?.insuranceNumber || "",
      },
      businessInfo: {
        bankAccountName: application?.bankAccountName || "",
        bankSortCode: application?.bankSortCode || "",
        bankAccountNumber: application?.bankAccountNumber || "",
        vatNumber: application?.vatNumber || "",
        businessAddress: application?.businessAddress || application?.location || "",
        businessPhone: application?.businessPhone || application?.phone || "",
      },
      privacy: {
        dataProcessingConsent: application?.dataProcessingConsent || false,
        professionalStandardsConsent: application?.professionalStandardsConsent || false,
        backgroundCheckConsent: application?.backgroundCheckConsent || false,
        marketingConsent: application?.marketingConsent || false,
      },
    };
  };

  const [profileData, setProfileData] = useState<TherapistProfileData>(() => {
    // Initialize with empty data first, will be populated by useEffect
    return {
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
      professionalInfo: {
        qualifications: [],
        registrationNumber: "",
        registrationBody: "",
        yearsExperience: "",
        specialisations: [],
        therapeuticApproach: [],
        languagesSpoken: ["English"],
        professionalInsurance: "",
        insuranceProvider: "",
        insuranceNumber: "",
      },
      businessInfo: {
        bankAccountName: "",
        bankSortCode: "",
        bankAccountNumber: "",
        vatNumber: "",
        businessAddress: "",
        businessPhone: "",
      },
      privacy: {
        dataProcessingConsent: false,
        professionalStandardsConsent: false,
        backgroundCheckConsent: false,
        marketingConsent: false,
      },
    };
  });
  const [newQualification, setNewQualification] = useState("");
  const [newSpecialisation, setNewSpecialisation] = useState("");
  const [newApproach, setNewApproach] = useState("");
  const [newLanguage, setNewLanguage] = useState("");

  // Update profile data when existing application loads
  React.useEffect(() => {
    if ((existingApplication as any)?.exists && (existingApplication as any).application) {
      const app = (existingApplication as any).application;
      console.log("Auto-populating profile from existing application:", app);

      setProfileData((prevData) => ({
        personalInfo: {
          ...prevData.personalInfo,
          firstName: app.firstName || user.firstName || prevData.personalInfo.firstName,
          lastName: app.lastName || user.lastName || prevData.personalInfo.lastName,
          phone: app.phone || app.phoneNumber || prevData.personalInfo.phone,
          address: app.location || prevData.personalInfo.address,
        },
        professionalInfo: {
          ...prevData.professionalInfo,
          specialisations:
            app.specializations || app.therapy_specialisations || app.specialisations || [],
          registrationBody:
            app.professionalBody ||
            app.professional_body ||
            prevData.professionalInfo.registrationBody,
          qualifications: app.qualifications
            ? Array.isArray(app.qualifications)
              ? app.qualifications
              : [app.qualifications]
            : app.highestQualification
              ? [app.highestQualification]
              : [],
          yearsExperience:
            app.experience ||
            app.yearsOfExperience?.toString() ||
            prevData.professionalInfo.yearsExperience,
          therapeuticApproach: app.therapy_specialisations || app.specializations || [],
        },
        businessInfo: {
          ...prevData.businessInfo,
          businessAddress: app.location || prevData.businessInfo.businessAddress,
          businessPhone: app.phone || app.phoneNumber || prevData.businessInfo.businessPhone,
        },
        privacy: prevData.privacy,
      }));

      // Show toast notification about auto-population
      toast({
        title: "Profile Auto-Populated",
        description:
          "Your profile has been pre-filled with information from your initial application. Please review and complete any missing details.",
      });
    }
  }, [existingApplication, user.firstName, user.lastName, toast]);

  const sections = [
    { id: "personal", title: "Personal Information", icon: User, color: "bg-blue-500" },
    {
      id: "professional",
      title: "Professional Qualifications",
      icon: GraduationCap,
      color: "bg-green-500",
    },
    { id: "business", title: "Business Information", icon: Target, color: "bg-orange-500" },
    { id: "privacy", title: "Privacy & Consent", icon: Shield, color: "bg-red-500" },
  ];

  const calculateProgress = () => {
    let completedFields = 0;
    let totalFields = 0;

    // Personal Info (10 required fields)
    const personalFields = Object.values(profileData.personalInfo);
    totalFields += personalFields.length;
    completedFields += personalFields.filter((field) => field.trim() !== "").length;

    // Professional Info (10 required fields)
    totalFields += 10;
    if (profileData.professionalInfo.qualifications.length > 0) completedFields++;
    if (profileData.professionalInfo.registrationNumber) completedFields++;
    if (profileData.professionalInfo.registrationBody) completedFields++;
    if (profileData.professionalInfo.yearsExperience) completedFields++;
    if (profileData.professionalInfo.specialisations.length > 0) completedFields++;
    if (profileData.professionalInfo.therapeuticApproach.length > 0) completedFields++;
    if (profileData.professionalInfo.languagesSpoken.length > 0) completedFields++;
    if (profileData.professionalInfo.professionalInsurance) completedFields++;
    if (profileData.professionalInfo.insuranceProvider) completedFields++;
    if (profileData.professionalInfo.insuranceNumber) completedFields++;

    // Business Info (6 required fields)
    totalFields += 6;
    if (profileData.businessInfo.bankAccountName.trim() !== "") completedFields++;
    if (profileData.businessInfo.bankSortCode.trim() !== "") completedFields++;
    if (profileData.businessInfo.bankAccountNumber.trim() !== "") completedFields++;
    if (profileData.businessInfo.vatNumber.trim() !== "") completedFields++;
    if (profileData.businessInfo.businessAddress.trim() !== "") completedFields++;
    if (profileData.businessInfo.businessPhone.trim() !== "") completedFields++;

    // Privacy (3 required fields)
    totalFields += 3;
    if (profileData.privacy.dataProcessingConsent) completedFields++;
    if (profileData.privacy.professionalStandardsConsent) completedFields++;
    if (profileData.privacy.backgroundCheckConsent) completedFields++;

    return Math.round((completedFields / totalFields) * 100);
  };

  const saveProfileMutation = useMutation({
    mutationFn: async (data: TherapistProfileData) => {
      const response = await apiRequest("POST", `/api/therapist/profile/${user.id}`, data);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Profile Saved",
        description: "Your profile has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/therapist/profile/${user.id}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Upload profile photo
      const formData = new FormData();
      formData.append("profilePhoto", file);

      const response = await apiRequest("POST", "/api/upload-profile-photo", formData);

      if (response.ok) {
        const result = await response.json();
        setProfilePhotoUrl(result.fileUrl);

        toast({
          title: "Photo uploaded successfully",
          description: "Your profile photo has been updated.",
        });

        // Invalidate user query to refresh profile data
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Photo upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCompleteProfile = () => {
    const progressPercentage = calculateProgress();

    if (
      !profileData.privacy.dataProcessingConsent ||
      !profileData.privacy.professionalStandardsConsent ||
      !profileData.privacy.backgroundCheckConsent
    ) {
      toast({
        title: "Consent Required",
        description: "All professional consents are required to complete your therapist profile.",
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

  // Show loading indicator while fetching existing application data
  if (isLoadingApplication) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hive-purple mx-auto"></div>
          <p className="text-gray-600">Loading your profile data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auto-population notification */}
      {(existingApplication as any)?.exists && (
        <Alert className="border-green-200 bg-green-50">
          <Info className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Your profile has been pre-filled with information from your initial application. Please
            review and complete any missing details.
          </AlertDescription>
        </Alert>
      )}

      {/* HubSpot Auto-Population Button */}
      <Card className="border-hive-purple/20 bg-gradient-to-r from-hive-purple/5 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-hive-purple">Auto-Fill from Application</h3>
              <p className="text-gray-600 text-sm">
                Save time by importing professional details from your therapist application form.
              </p>
            </div>
            <Button
              onClick={() => autoPopulateFromHubSpot.mutate()}
              disabled={autoPopulateFromHubSpot.isPending}
              className="bg-hive-purple hover:bg-hive-purple/90 text-white"
            >
              {autoPopulateFromHubSpot.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Loading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Auto-Fill Profile
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-century font-bold text-hive-black">
            Complete Your Professional Profile
          </h2>
          <p className="text-gray-600 mt-2">
            Help us verify your qualifications and match you with suitable clients
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
              {/* Profile Photo Section */}
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <Label className="text-base font-semibold text-hive-purple">Profile Photo</Label>
                <div className="flex items-center space-x-6">
                  {profilePhotoUrl ? (
                    <div className="relative">
                      <img
                        src={profilePhotoUrl}
                        alt="Profile preview"
                        className="w-24 h-24 rounded-full object-cover border-4 border-hive-purple/30 shadow-lg"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0 bg-white hover:bg-gray-50"
                        onClick={() => setProfilePhotoUrl("")}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-hive-purple/10 flex items-center justify-center border-4 border-dashed border-hive-purple/30">
                      <Camera className="w-10 h-10 text-hive-purple/60" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <label htmlFor="profile-photo-upload" className="cursor-pointer">
                      <div className="flex items-center space-x-3 px-6 py-3 border-2 border-hive-purple/30 rounded-lg hover:bg-hive-purple/5 transition-colors">
                        <Upload className="w-5 h-5 text-hive-purple" />
                        <span className="font-medium text-hive-purple">
                          {profilePhotoUrl ? "Change Photo" : "Upload Photo"}
                        </span>
                      </div>
                      <input
                        id="profile-photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-sm text-gray-600">(JPG, PNG, max 10MB)</p>
                  </div>
                </div>
              </div>

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

              <div>
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={profileData.personalInfo.address}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, address: e.target.value },
                    }))
                  }
                  placeholder="Enter your full address"
                />
              </div>

              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={profileData.personalInfo.city}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, city: e.target.value },
                    }))
                  }
                  placeholder="Enter your city"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergencyContact">Emergency Contact Name *</Label>
                  <Input
                    id="emergencyContact"
                    value={profileData.personalInfo.emergencyContact}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, emergencyContact: e.target.value },
                      }))
                    }
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyPhone">Emergency Contact Phone *</Label>
                  <Input
                    id="emergencyPhone"
                    value={profileData.personalInfo.emergencyPhone}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          emergencyPhone: formatPhoneNumber(e.target.value),
                        },
                      }))
                    }
                    placeholder="+44 7XXX XXXXXX"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Professional Qualifications Section */}
          {currentSection === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-hive-dark mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Professional Qualifications
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Please provide details about your professional qualifications and registration.
                </p>
              </div>

              <div>
                <Label htmlFor="qualifications">Qualifications *</Label>
                <div className="space-y-2 mt-2">
                  {profileData.professionalInfo.qualifications.map((qual, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={qual}
                        onChange={(e) => {
                          const newQuals = [...profileData.professionalInfo.qualifications];
                          newQuals[index] = e.target.value;
                          setProfileData((prev) => ({
                            ...prev,
                            professionalInfo: {
                              ...prev.professionalInfo,
                              qualifications: newQuals,
                            },
                          }));
                        }}
                        placeholder="e.g. MSc Psychology, PGDip Counselling"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newQuals = profileData.professionalInfo.qualifications.filter(
                            (_, i) => i !== index
                          );
                          setProfileData((prev) => ({
                            ...prev,
                            professionalInfo: {
                              ...prev.professionalInfo,
                              qualifications: newQuals,
                            },
                          }));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() =>
                      setProfileData((prev) => ({
                        ...prev,
                        professionalInfo: {
                          ...prev.professionalInfo,
                          qualifications: [...prev.professionalInfo.qualifications, ""],
                        },
                      }))
                    }
                  >
                    Add Qualification
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="registrationNumber">Registration Number</Label>
                  <Input
                    id="registrationNumber"
                    value={profileData.professionalInfo.registrationNumber}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        professionalInfo: {
                          ...prev.professionalInfo,
                          registrationNumber: e.target.value,
                        },
                      }))
                    }
                    placeholder="Enter your registration number"
                  />
                </div>
                <div>
                  <Label htmlFor="registrationBody">Registration Body *</Label>
                  <Select
                    value={profileData.professionalInfo.registrationBody}
                    onValueChange={(value) =>
                      setProfileData((prev) => ({
                        ...prev,
                        professionalInfo: { ...prev.professionalInfo, registrationBody: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select registration body" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BACP">
                        BACP - British Association for Counselling and Psychotherapy
                      </SelectItem>
                      <SelectItem value="UKCP">UKCP - UK Council for Psychotherapy</SelectItem>
                      <SelectItem value="BPS">BPS - British Psychological Society</SelectItem>
                      <SelectItem value="HCPC">
                        HCPC - Health and Care Professions Council
                      </SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="yearsExperience">Years of Experience *</Label>
                <Input
                  id="yearsExperience"
                  type="number"
                  min="0"
                  value={profileData.professionalInfo.yearsExperience}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      professionalInfo: {
                        ...prev.professionalInfo,
                        yearsExperience: e.target.value,
                      },
                    }))
                  }
                  placeholder="e.g. 5"
                />
              </div>

              <div>
                <Label htmlFor="specialisations">Areas of Specialisation *</Label>
                <div className="space-y-2 mt-2">
                  {profileData.professionalInfo.specialisations.map((spec, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={spec}
                        onChange={(e) => {
                          const newSpecs = [...profileData.professionalInfo.specialisations];
                          newSpecs[index] = e.target.value;
                          setProfileData((prev) => ({
                            ...prev,
                            professionalInfo: {
                              ...prev.professionalInfo,
                              specialisations: newSpecs,
                            },
                          }));
                        }}
                        placeholder="e.g. Anxiety, Depression, Trauma"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newSpecs = profileData.professionalInfo.specialisations.filter(
                            (_, i) => i !== index
                          );
                          setProfileData((prev) => ({
                            ...prev,
                            professionalInfo: {
                              ...prev.professionalInfo,
                              specialisations: newSpecs,
                            },
                          }));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() =>
                      setProfileData((prev) => ({
                        ...prev,
                        professionalInfo: {
                          ...prev.professionalInfo,
                          specialisations: [...prev.professionalInfo.specialisations, ""],
                        },
                      }))
                    }
                  >
                    Add Specialisation
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="therapeuticApproach">Therapeutic Approach</Label>
                <div className="space-y-2 mt-2">
                  {profileData.professionalInfo.therapeuticApproach.map((approach, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={approach}
                        onChange={(e) => {
                          const newApproaches = [
                            ...profileData.professionalInfo.therapeuticApproach,
                          ];
                          newApproaches[index] = e.target.value;
                          setProfileData((prev) => ({
                            ...prev,
                            professionalInfo: {
                              ...prev.professionalInfo,
                              therapeuticApproach: newApproaches,
                            },
                          }));
                        }}
                        placeholder="e.g. CBT, Psychodynamic, Humanistic"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newApproaches =
                            profileData.professionalInfo.therapeuticApproach.filter(
                              (_, i) => i !== index
                            );
                          setProfileData((prev) => ({
                            ...prev,
                            professionalInfo: {
                              ...prev.professionalInfo,
                              therapeuticApproach: newApproaches,
                            },
                          }));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() =>
                      setProfileData((prev) => ({
                        ...prev,
                        professionalInfo: {
                          ...prev.professionalInfo,
                          therapeuticApproach: [...prev.professionalInfo.therapeuticApproach, ""],
                        },
                      }))
                    }
                  >
                    Add Approach
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="languagesSpoken">Languages Spoken *</Label>
                <div className="space-y-2 mt-2">
                  {profileData.professionalInfo.languagesSpoken.map((lang, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={lang}
                        onChange={(e) => {
                          const newLangs = [...profileData.professionalInfo.languagesSpoken];
                          newLangs[index] = e.target.value;
                          setProfileData((prev) => ({
                            ...prev,
                            professionalInfo: {
                              ...prev.professionalInfo,
                              languagesSpoken: newLangs,
                            },
                          }));
                        }}
                        placeholder="e.g. English, Spanish, French"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newLangs = profileData.professionalInfo.languagesSpoken.filter(
                            (_, i) => i !== index
                          );
                          setProfileData((prev) => ({
                            ...prev,
                            professionalInfo: {
                              ...prev.professionalInfo,
                              languagesSpoken: newLangs,
                            },
                          }));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() =>
                      setProfileData((prev) => ({
                        ...prev,
                        professionalInfo: {
                          ...prev.professionalInfo,
                          languagesSpoken: [...prev.professionalInfo.languagesSpoken, ""],
                        },
                      }))
                    }
                  >
                    Add Language
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="professionalInsurance">Professional Insurance *</Label>
                  <Select
                    value={profileData.professionalInfo.professionalInsurance}
                    onValueChange={(value) =>
                      setProfileData((prev) => ({
                        ...prev,
                        professionalInfo: {
                          ...prev.professionalInfo,
                          professionalInsurance: value,
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Do you have professional insurance?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                  <Input
                    id="insuranceProvider"
                    value={profileData.professionalInfo.insuranceProvider}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        professionalInfo: {
                          ...prev.professionalInfo,
                          insuranceProvider: e.target.value,
                        },
                      }))
                    }
                    placeholder="e.g. Balens, Simply Business"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="insuranceNumber">Insurance Policy Number</Label>
                <Input
                  id="insuranceNumber"
                  value={profileData.professionalInfo.insuranceNumber}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      professionalInfo: {
                        ...prev.professionalInfo,
                        insuranceNumber: e.target.value,
                      },
                    }))
                  }
                  placeholder="Enter your policy number"
                />
              </div>
            </div>
          )}

          {/* Business Information Section */}
          {currentSection === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-hive-dark mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Business Information
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Financial and business details for payment processing.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bankAccountName">Bank Account Name *</Label>
                  <Input
                    id="bankAccountName"
                    value={profileData.businessInfo.bankAccountName}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        businessInfo: { ...prev.businessInfo, bankAccountName: e.target.value },
                      }))
                    }
                    placeholder="Account holder name"
                  />
                </div>
                <div>
                  <Label htmlFor="bankSortCode">Bank Sort Code *</Label>
                  <Input
                    id="bankSortCode"
                    value={profileData.businessInfo.bankSortCode}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        businessInfo: {
                          ...prev.businessInfo,
                          bankSortCode: formatSortCode(e.target.value),
                        },
                      }))
                    }
                    placeholder="XX-XX-XX"
                    maxLength={8}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bankAccountNumber">Bank Account Number *</Label>
                <Input
                  id="bankAccountNumber"
                  value={profileData.businessInfo.bankAccountNumber}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      businessInfo: { ...prev.businessInfo, bankAccountNumber: e.target.value },
                    }))
                  }
                  placeholder="XXXXXXXX"
                  maxLength={8}
                />
              </div>

              <div>
                <Label htmlFor="vatNumber">VAT Number (if applicable)</Label>
                <Input
                  id="vatNumber"
                  value={profileData.businessInfo.vatNumber}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      businessInfo: { ...prev.businessInfo, vatNumber: e.target.value },
                    }))
                  }
                  placeholder="GB XXXXXXXXX"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessAddress">Business Address</Label>
                  <Input
                    id="businessAddress"
                    value={profileData.businessInfo.businessAddress}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        businessInfo: { ...prev.businessInfo, businessAddress: e.target.value },
                      }))
                    }
                    placeholder="Enter business address"
                  />
                </div>
                <div>
                  <Label htmlFor="businessPhone">Business Phone</Label>
                  <Input
                    id="businessPhone"
                    value={profileData.businessInfo.businessPhone}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        businessInfo: {
                          ...prev.businessInfo,
                          businessPhone: formatPhoneNumber(e.target.value),
                        },
                      }))
                    }
                    placeholder="+44 7XXX XXXXXX"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Privacy & Consent Section */}
          {currentSection === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-hive-dark mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Privacy & Consent
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Please review and provide consent for the following terms.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="dataProcessingConsent"
                    checked={profileData.privacy.dataProcessingConsent}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        privacy: { ...prev.privacy, dataProcessingConsent: e.target.checked },
                      }))
                    }
                    className="mt-1"
                  />
                  <div>
                    <Label htmlFor="dataProcessingConsent" className="text-sm font-medium">
                      Data Processing Consent *
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      I consent to Hive Wellness processing my personal data in accordance with
                      their Privacy Policy for the purpose of providing therapy services and
                      platform functionality.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="professionalStandardsConsent"
                    checked={profileData.privacy.professionalStandardsConsent}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        privacy: {
                          ...prev.privacy,
                          professionalStandardsConsent: e.target.checked,
                        },
                      }))
                    }
                    className="mt-1"
                  />
                  <div>
                    <Label htmlFor="professionalStandardsConsent" className="text-sm font-medium">
                      Professional Standards Agreement *
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      I agree to maintain professional standards as outlined by my registration body
                      and Hive Wellness's Terms of Service for therapists.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="backgroundCheckConsent"
                    checked={profileData.privacy.backgroundCheckConsent}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        privacy: { ...prev.privacy, backgroundCheckConsent: e.target.checked },
                      }))
                    }
                    className="mt-1"
                  />
                  <div>
                    <Label htmlFor="backgroundCheckConsent" className="text-sm font-medium">
                      Background Check Consent *
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      I consent to Hive Wellness conducting necessary background checks and
                      verifying my professional qualifications as required for therapist
                      verification.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="marketingConsent"
                    checked={profileData.privacy.marketingConsent}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        privacy: { ...prev.privacy, marketingConsent: e.target.checked },
                      }))
                    }
                    className="mt-1"
                  />
                  <div>
                    <Label htmlFor="marketingConsent" className="text-sm font-medium">
                      Marketing Communications (Optional)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      I would like to receive updates about new features, training opportunities,
                      and relevant news from Hive Wellness.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Important:</strong> All required consent items must be checked to complete
                  your profile and begin accepting clients through the Hive Wellness platform.
                </p>
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
                    !profileData.privacy.professionalStandardsConsent ||
                    !profileData.privacy.backgroundCheckConsent
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
