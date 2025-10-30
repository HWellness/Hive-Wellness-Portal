import { useState, useMemo, useEffect } from "react";
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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  phoneValidation,
  postcodeValidation,
  formatPhoneNumber,
  formatPostcode,
  VALIDATION_MESSAGES,
} from "@/lib/form-validation";
import { apiRequest } from "@/lib/queryClient";
import { User, Heart, Shield, CheckCircle, Info, Save, ArrowLeft } from "lucide-react";
import type { User as UserType } from "@shared/schema";

interface ClientProfileCompletionProps {
  user: UserType;
  onBackToDashboard?: () => void;
}

interface ProfileData {
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    phone: string;
    emergencyContact: string;
    emergencyPhone: string;
    address: string;
    city: string;
    postcode: string;
  };
  therapyPreferences: {
    preferredTherapyType: string[];
    sessionFormat: string;
    timePreferences: string[];
    languagePreferences: string[];
    genderPreference: string;
    religionPreference: string;
    concerns: string[];
    previousTherapy: boolean;
    previousTherapyDetails: string;
  };
  healthAndWellbeing: {
    currentMedications: string;
    medicalConditions: string;
    currentSymptoms: string[];
    symptomsDescription: string;
    goalsPriorities: string;
  };
  privacy: {
    dataProcessingConsent: boolean;
    communicationConsent: boolean;
    researchParticipation: boolean;
    marketingConsent: boolean;
  };
}

export default function ClientProfileCompletion({
  user,
  onBackToDashboard,
}: ClientProfileCompletionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [currentSection, setCurrentSection] = useState(0);
  const [profileData, setProfileData] = useState<ProfileData>({
    personalInfo: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "",
      phone: "",
      emergencyContact: "",
      emergencyPhone: "",
      address: "",
      city: "",
      postcode: "",
    },
    therapyPreferences: {
      preferredTherapyType: [],
      sessionFormat: "",
      timePreferences: [],
      languagePreferences: [],
      genderPreference: "",
      religionPreference: "",
      concerns: [],
      previousTherapy: false,
      previousTherapyDetails: "",
    },
    healthAndWellbeing: {
      currentMedications: "",
      medicalConditions: "",
      currentSymptoms: [],
      symptomsDescription: "",
      goalsPriorities: "",
    },
    privacy: {
      dataProcessingConsent: false,
      communicationConsent: false,
      researchParticipation: false,
      marketingConsent: false,
    },
  });

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  const { data: existingProfile } = useQuery({
    queryKey: ["/api/client/profile", user.id],
    retry: false,
  });

  // Check for existing client questionnaire data for auto-population
  const { data: questionnaireData } = useQuery<{
    exists: boolean;
    clientData?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      ageRange?: string;
      gender?: string;
      pronouns?: string;
      wellbeingRating?: number;
      mentalHealthSymptoms?: string[];
      supportAreas?: string[];
      therapyTypes?: string[];
      previousTherapy?: boolean;
      assignedTherapistId?: string;
    };
    dataSource?: string;
  }>({
    queryKey: ["/api/client-questionnaire/check", user.email],
    enabled: !!user.email,
    retry: false,
  });

  // Manual auto-fill function
  const handleAutoFill = () => {
    if (questionnaireData?.exists && questionnaireData.clientData) {
      autoFillFromQuestionnaire(questionnaireData.clientData);
    } else {
      toast({
        title: "No Questionnaire Found",
        description:
          "We couldn't find any questionnaire data for your email address to auto-fill your profile.",
        variant: "destructive",
      });
    }
  };

  // Auto-fill logic (shared between useEffect and manual trigger)
  const autoFillFromQuestionnaire = (clientData: any) => {
    let changedFields: string[] = [];

    setProfileData((prevData) => {
      const newData = {
        personalInfo: {
          ...prevData.personalInfo,
          firstName: clientData.firstName || prevData.personalInfo.firstName,
          lastName: clientData.lastName || prevData.personalInfo.lastName,
          gender: clientData.gender || prevData.personalInfo.gender,
        },
        therapyPreferences: {
          ...prevData.therapyPreferences,
          preferredTherapyType:
            clientData.therapyTypes && clientData.therapyTypes.length > 0
              ? clientData.therapyTypes
              : prevData.therapyPreferences.preferredTherapyType,
          concerns:
            clientData.supportAreas && clientData.supportAreas.length > 0
              ? clientData.supportAreas
              : clientData.mentalHealthSymptoms && clientData.mentalHealthSymptoms.length > 0
                ? clientData.mentalHealthSymptoms
                : prevData.therapyPreferences.concerns,
          previousTherapy:
            clientData.previousTherapy !== undefined
              ? clientData.previousTherapy
              : prevData.therapyPreferences.previousTherapy,
        },
        healthAndWellbeing: {
          ...prevData.healthAndWellbeing,
          currentSymptoms:
            clientData.mentalHealthSymptoms && clientData.mentalHealthSymptoms.length > 0
              ? clientData.mentalHealthSymptoms
              : prevData.healthAndWellbeing.currentSymptoms,
        },
        privacy: prevData.privacy,
      };

      // Track what actually changed
      if (clientData.firstName && clientData.firstName !== prevData.personalInfo.firstName)
        changedFields.push("First Name");
      if (clientData.lastName && clientData.lastName !== prevData.personalInfo.lastName)
        changedFields.push("Last Name");
      if (clientData.gender && clientData.gender !== prevData.personalInfo.gender)
        changedFields.push("Gender");
      if (clientData.therapyTypes && clientData.therapyTypes.length > 0)
        changedFields.push("Therapy Preferences");
      if (clientData.supportAreas && clientData.supportAreas.length > 0)
        changedFields.push("Support Areas");
      if (clientData.mentalHealthSymptoms && clientData.mentalHealthSymptoms.length > 0)
        changedFields.push("Symptoms");
      if (
        clientData.previousTherapy !== undefined &&
        clientData.previousTherapy !== prevData.therapyPreferences.previousTherapy
      )
        changedFields.push("Previous Therapy");

      return newData;
    });

    // Show user feedback about auto-population
    if (changedFields.length > 0) {
      toast({
        title: "Profile Auto-Filled! ⚡",
        description: `We've pre-filled ${changedFields.length} field${changedFields.length > 1 ? "s" : ""} from your questionnaire: ${changedFields.join(", ")}. You can review and update any information before saving.`,
        duration: 6000,
      });
    }
  };

  // Auto-populate form from questionnaire data on load
  useEffect(() => {
    if (questionnaireData?.exists && questionnaireData.clientData) {
      autoFillFromQuestionnaire(questionnaireData.clientData);
    }
  }, [questionnaireData, toast]);

  // Validation functions
  const validateCurrentSection = () => {
    const errors: { [key: string]: string } = {};

    if (currentSection === 0) {
      // Personal Information validation
      if (!profileData.personalInfo.firstName.trim()) {
        errors.firstName = "First name is required";
      }
      if (!profileData.personalInfo.lastName.trim()) {
        errors.lastName = "Last name is required";
      }
      if (!profileData.personalInfo.dateOfBirth) {
        errors.dateOfBirth = "Date of birth is required";
      }
      if (!profileData.personalInfo.gender) {
        errors.gender = "Gender is required";
      }
      if (!profileData.personalInfo.phone.trim()) {
        errors.phone = "Phone number is required";
      } else if (!phoneValidation.safeParse(profileData.personalInfo.phone).success) {
        errors.phone = VALIDATION_MESSAGES.PHONE.FORMAT;
      }
      if (!profileData.personalInfo.emergencyContact.trim()) {
        errors.emergencyContact = "Emergency contact name is required";
      }
      if (!profileData.personalInfo.emergencyPhone.trim()) {
        errors.emergencyPhone = "Emergency contact phone is required";
      } else if (!phoneValidation.safeParse(profileData.personalInfo.emergencyPhone).success) {
        errors.emergencyPhone = VALIDATION_MESSAGES.PHONE.FORMAT;
      }
      if (!profileData.personalInfo.postcode.trim()) {
        errors.postcode = "Postcode is required";
      } else if (!postcodeValidation.safeParse(profileData.personalInfo.postcode).success) {
        errors.postcode = VALIDATION_MESSAGES.POSTCODE.FORMAT;
      }
    } else if (currentSection === 1) {
      // Therapy Preferences validation
      if (profileData.therapyPreferences.preferredTherapyType.length === 0) {
        errors.preferredTherapyType =
          "Please select at least one therapy type or choose 'I'm not sure'";
      }
      if (!profileData.therapyPreferences.sessionFormat) {
        errors.sessionFormat = "Please select a session format or choose 'I'm not sure'";
      }
      if (!profileData.therapyPreferences.genderPreference) {
        errors.genderPreference =
          "Please select a therapist gender preference or choose 'I'm not sure'";
      }
      if (profileData.therapyPreferences.concerns.length === 0) {
        errors.concerns = "Please select your main concerns or choose 'I'm not sure'";
      }
    } else if (currentSection === 2) {
      // Health and Wellbeing validation (optional but encourage completion)
      // These are not strictly required but we show gentle encouragement
    } else if (currentSection === 3) {
      // Privacy consent validation
      if (!profileData.privacy.dataProcessingConsent) {
        errors.dataProcessingConsent = "Data processing consent is required to use our services";
      }
      if (!profileData.privacy.communicationConsent) {
        errors.communicationConsent = "Communication consent is required for therapy services";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Memoized validation to prevent re-render loops
  const canProceedToNext = useMemo(() => {
    const errors: { [key: string]: string } = {};

    if (currentSection === 0) {
      // Personal Information validation
      if (!profileData.personalInfo.firstName.trim()) {
        errors.firstName = "First name is required";
      }
      if (!profileData.personalInfo.lastName.trim()) {
        errors.lastName = "Last name is required";
      }
      if (!profileData.personalInfo.dateOfBirth) {
        errors.dateOfBirth = "Date of birth is required";
      }
      if (!profileData.personalInfo.gender) {
        errors.gender = "Gender is required";
      }
      if (!profileData.personalInfo.phone.trim()) {
        errors.phone = "Phone number is required";
      } else if (!phoneValidation.safeParse(profileData.personalInfo.phone).success) {
        errors.phone = VALIDATION_MESSAGES.PHONE.FORMAT;
      }
      if (!profileData.personalInfo.emergencyContact.trim()) {
        errors.emergencyContact = "Emergency contact name is required";
      }
      if (!profileData.personalInfo.emergencyPhone.trim()) {
        errors.emergencyPhone = "Emergency contact phone is required";
      } else if (!phoneValidation.safeParse(profileData.personalInfo.emergencyPhone).success) {
        errors.emergencyPhone = VALIDATION_MESSAGES.PHONE.FORMAT;
      }
      if (!profileData.personalInfo.postcode.trim()) {
        errors.postcode = "Postcode is required";
      } else if (!postcodeValidation.safeParse(profileData.personalInfo.postcode).success) {
        errors.postcode = VALIDATION_MESSAGES.POSTCODE.FORMAT;
      }
    } else if (currentSection === 1) {
      // Therapy Preferences validation
      if (profileData.therapyPreferences.preferredTherapyType.length === 0) {
        errors.preferredTherapyType =
          "Please select at least one therapy type or choose 'I'm not sure'";
      }
      if (!profileData.therapyPreferences.sessionFormat) {
        errors.sessionFormat = "Please select a session format or choose 'I'm not sure'";
      }
      if (!profileData.therapyPreferences.genderPreference) {
        errors.genderPreference =
          "Please select a therapist gender preference or choose 'I'm not sure'";
      }
      if (profileData.therapyPreferences.concerns.length === 0) {
        errors.concerns = "Please select your main concerns or choose 'I'm not sure'";
      }
    } else if (currentSection === 2) {
      // Health and Wellbeing validation (optional but encourage completion)
      // These are not strictly required but we show gentle encouragement
    } else if (currentSection === 3) {
      // Privacy consent validation
      if (!profileData.privacy.dataProcessingConsent) {
        errors.dataProcessingConsent = "Data processing consent is required to use our services";
      }
      if (!profileData.privacy.communicationConsent) {
        errors.communicationConsent = "Communication consent is required for therapy services";
      }
    }

    return Object.keys(errors).length === 0;
  }, [currentSection, profileData]);

  const nextSection = () => {
    if (validateCurrentSection()) {
      setCurrentSection(currentSection + 1);
    }
  };

  const prevSection = () => {
    setCurrentSection(currentSection - 1);
  };

  const handleSave = () => {
    saveProfileMutation.mutate(profileData);
  };

  const handleCompleteProfile = async () => {
    if (!validateCurrentSection()) {
      toast({
        title: "Validation Error",
        description: "Please complete all required fields before continuing.",
        variant: "destructive",
      });
      return;
    }

    try {
      await saveProfileMutation.mutateAsync(profileData);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleInputChange = (section: keyof ProfileData, field: string, value: any) => {
    setProfileData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const saveProfileMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      // Format phone numbers before sending
      if (data.personalInfo.phone) {
        data.personalInfo.phone = formatPhoneNumber(data.personalInfo.phone);
      }
      if (data.personalInfo.emergencyPhone) {
        data.personalInfo.emergencyPhone = formatPhoneNumber(data.personalInfo.emergencyPhone);
      }
      // Format postcode
      if (data.personalInfo.postcode) {
        data.personalInfo.postcode = formatPostcode(data.personalInfo.postcode);
      }

      return await apiRequest("POST", "/api/client/profile", data);
    },
    onSuccess: () => {
      const missingFields = getMissingRequiredFields();
      const progressPercentage = calculateProgress();
      const isProfileComplete = missingFields.length === 0;

      if (isProfileComplete) {
        toast({
          title: "Profile Complete!",
          description:
            "Welcome to Hive Wellness! You can now book therapy sessions and access all services.",
        });

        queryClient.invalidateQueries({ queryKey: ["/api/client/profile"] });
        queryClient.invalidateQueries({ queryKey: ["/api/client/completion-status"] });

        setTimeout(() => {
          window.location.replace("/");
        }, 2000);
      } else {
        const fieldsList =
          missingFields.slice(0, 5).join(", ") +
          (missingFields.length > 5 ? ` and ${missingFields.length - 5} more` : "");

        toast({
          title: "Profile Saved Successfully",
          description: `Profile saved (${progressPercentage}% complete). Still needed: ${fieldsList}`,
          variant: "default",
        });

        queryClient.invalidateQueries({ queryKey: ["/api/client/profile"] });
        queryClient.invalidateQueries({ queryKey: ["/api/client/completion-status"] });
      }
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Unable to save profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sections = [
    {
      title: "Personal Information",
      icon: User,
      description: "Basic details and contact information",
    },
    {
      title: "Therapy Preferences",
      icon: Heart,
      description: "Your therapy goals and preferences",
    },
    {
      title: "Health & Wellbeing",
      icon: Shield,
      description: "Medical information and current concerns",
    },
    {
      title: "Privacy & Consent",
      icon: CheckCircle,
      description: "Data processing and communication preferences",
    },
  ];

  const therapyTypes = [
    "Cognitive Behavioural Therapy (CBT)",
    "Dialectical Behaviour Therapy (DBT)",
    "Psychodynamic Therapy",
    "Humanistic Therapy",
    "EMDR",
    "Mindfulness-Based Therapy",
    "Family Therapy",
    "Couples Therapy",
  ];

  const concernsList = [
    "Anxiety",
    "Depression",
    "Stress Management",
    "Relationship Issues",
    "Work-Life Balance",
    "Grief and Loss",
    "Trauma",
    "Self-Esteem",
    "Life Transitions",
    "Academic Pressure",
    "Social Anxiety",
    "Panic Attacks",
    "Sleep Issues",
    "Anger Management",
  ];

  const symptoms = [
    "Feeling overwhelmed",
    "Difficulty concentrating",
    "Sleep problems",
    "Loss of appetite",
    "Mood swings",
    "Social withdrawal",
    "Panic attacks",
    "Persistent sadness",
    "Irritability",
    "Fatigue",
    "Racing thoughts",
    "Physical tension",
  ];

  const getMissingRequiredFields = () => {
    const missing: string[] = [];

    // Personal Info (all required)
    if (!profileData.personalInfo.firstName.trim()) missing.push("First Name");
    if (!profileData.personalInfo.lastName.trim()) missing.push("Last Name");
    if (!profileData.personalInfo.dateOfBirth) missing.push("Date of Birth");
    if (!profileData.personalInfo.gender) missing.push("Gender");
    if (!profileData.personalInfo.phone.trim()) missing.push("Phone Number");
    if (!profileData.personalInfo.emergencyContact.trim()) missing.push("Emergency Contact");
    if (!profileData.personalInfo.emergencyPhone.trim()) missing.push("Emergency Phone");
    if (!profileData.personalInfo.address.trim()) missing.push("Address");
    if (!profileData.personalInfo.city.trim()) missing.push("City");
    if (!profileData.personalInfo.postcode.trim()) missing.push("Postcode");

    // Therapy Preferences (required)
    if (profileData.therapyPreferences.preferredTherapyType.length === 0)
      missing.push("Preferred Therapy Type");
    if (!profileData.therapyPreferences.sessionFormat) missing.push("Session Format");
    if (!profileData.therapyPreferences.genderPreference)
      missing.push("Therapist Gender Preference");
    if (profileData.therapyPreferences.concerns.length === 0) missing.push("Main Concerns");

    // Previous therapy details only required if previousTherapy is true
    if (
      profileData.therapyPreferences.previousTherapy &&
      !profileData.therapyPreferences.previousTherapyDetails.trim()
    ) {
      missing.push("Previous Therapy Details");
    }

    // Health & Wellbeing (required for completion)
    if (!profileData.healthAndWellbeing.currentMedications.trim())
      missing.push("Current Medications");
    if (!profileData.healthAndWellbeing.medicalConditions.trim())
      missing.push("Medical Conditions");
    if (profileData.healthAndWellbeing.currentSymptoms.length === 0)
      missing.push("Current Symptoms");
    if (!profileData.healthAndWellbeing.goalsPriorities.trim()) missing.push("Goals & Priorities");

    // Privacy (required)
    if (!profileData.privacy.dataProcessingConsent) missing.push("Data Processing Consent");
    if (!profileData.privacy.communicationConsent) missing.push("Communication Consent");

    return missing;
  };

  const calculateProgress = () => {
    const missing = getMissingRequiredFields();
    const totalRequired = 20; // Total required fields
    const completed = totalRequired - missing.length;
    return Math.round((completed / totalRequired) * 100);
  };

  const handleArrayToggle = (section: keyof ProfileData, field: string, value: string) => {
    setProfileData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: (prev[section] as any)[field].includes(value)
          ? (prev[section] as any)[field].filter((item: string) => item !== value)
          : [...(prev[section] as any)[field], value],
      },
    }));
  };

  const progress = calculateProgress();

  return (
    <div className="space-y-6">
      {/* Back to Dashboard Button */}
      <div className="border-b border-gray-200 bg-hive-purple shadow-sm rounded-t-lg">
        <div className="container mx-auto px-6 py-3">
          <Button
            variant="ghost"
            onClick={() => {
              // Fast navigation - go directly to dashboard root
              window.location.href = "/";
            }}
            className="flex items-center gap-2 text-white hover:bg-white/20 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-century font-bold text-hive-black">Complete Your Profile</h2>
          <p className="text-gray-600 mt-2">
            Help us provide you with the best possible therapy experience
          </p>
          {questionnaireData?.exists && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoFill}
              className="text-hive-purple border-hive-purple hover:bg-hive-purple hover:text-white mt-3"
            >
              ⚡ Auto-Fill from Questionnaire
            </Button>
          )}
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
      <div className="grid grid-cols-4 gap-4">
        {sections.map((section, index) => {
          const Icon = section.icon;
          return (
            <Card
              key={index}
              className={`cursor-pointer transition-all ${
                currentSection === index
                  ? "border-hive-purple bg-purple-50"
                  : "hover:border-gray-300"
              }`}
              onClick={() => setCurrentSection(index)}
            >
              <CardContent className="p-4 text-center">
                <Icon
                  className={`w-6 h-6 mx-auto mb-2 ${
                    currentSection === index ? "text-hive-purple" : "text-gray-600"
                  }`}
                />
                <h3 className="font-medium text-sm">{section.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{section.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Section Content */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const Icon = sections[currentSection].icon;
              return <Icon className="w-5 h-5 text-hive-purple" />;
            })()}
            {sections[currentSection].title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentSection === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Enter your first name"
                    value={profileData.personalInfo.firstName}
                    onChange={(e) => handleInputChange("personalInfo", "firstName", e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Enter your last name"
                    value={profileData.personalInfo.lastName}
                    onChange={(e) => handleInputChange("personalInfo", "lastName", e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={profileData.personalInfo.dateOfBirth}
                    onChange={(e) =>
                      handleInputChange("personalInfo", "dateOfBirth", e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={profileData.personalInfo.gender}
                    onValueChange={(value) => handleInputChange("personalInfo", "gender", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+44 7XXX XXXXXX"
                    value={profileData.personalInfo.phone}
                    onChange={(e) => handleInputChange("personalInfo", "phone", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="Street address"
                    value={profileData.personalInfo.address}
                    onChange={(e) => handleInputChange("personalInfo", "address", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="emergencyContact">Emergency Contact Name *</Label>
                  <Input
                    id="emergencyContact"
                    placeholder="Full name"
                    value={profileData.personalInfo.emergencyContact}
                    onChange={(e) =>
                      handleInputChange("personalInfo", "emergencyContact", e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="emergencyPhone">Emergency Contact Phone *</Label>
                  <Input
                    id="emergencyPhone"
                    type="tel"
                    placeholder="+44 7XXX XXXXXX"
                    value={profileData.personalInfo.emergencyPhone}
                    onChange={(e) =>
                      handleInputChange("personalInfo", "emergencyPhone", e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    value={profileData.personalInfo.city}
                    onChange={(e) => handleInputChange("personalInfo", "city", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input
                    id="postcode"
                    placeholder="SW1A 1AA"
                    value={profileData.personalInfo.postcode}
                    onChange={(e) => handleInputChange("personalInfo", "postcode", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {currentSection === 1 && (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium">Preferred Therapy Types</Label>
                <p className="text-sm text-gray-600 mb-3">Select all that interest you</p>
                <div className="grid grid-cols-2 gap-2">
                  {therapyTypes.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={type}
                        checked={profileData.therapyPreferences.preferredTherapyType.includes(type)}
                        onCheckedChange={() =>
                          handleArrayToggle("therapyPreferences", "preferredTherapyType", type)
                        }
                      />
                      <Label htmlFor={type} className="text-sm">
                        {type}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="sessionFormat">Session Format Preference</Label>
                  <Select
                    value={profileData.therapyPreferences.sessionFormat}
                    onValueChange={(value) =>
                      handleInputChange("therapyPreferences", "sessionFormat", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Video therapy sessions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video therapy sessions</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-600 mt-1">
                    All therapy sessions are conducted via secure video calls
                  </p>
                </div>

                <div>
                  <Label htmlFor="genderPreference">Therapist Gender Preference</Label>
                  <Select
                    value={profileData.therapyPreferences.genderPreference}
                    onValueChange={(value) =>
                      handleInputChange("therapyPreferences", "genderPreference", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-preference">No preference</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="religionPreference">Religion Preference</Label>
                  <Select
                    value={profileData.therapyPreferences.religionPreference}
                    onValueChange={(value) =>
                      handleInputChange("therapyPreferences", "religionPreference", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-preference">No preference</SelectItem>
                      <SelectItem value="christian">Christian</SelectItem>
                      <SelectItem value="muslim">Muslim</SelectItem>
                      <SelectItem value="jewish">Jewish</SelectItem>
                      <SelectItem value="hindu">Hindu</SelectItem>
                      <SelectItem value="buddhist">Buddhist</SelectItem>
                      <SelectItem value="sikh">Sikh</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="non-religious">Non-religious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-base font-medium">Primary Concerns</Label>
                <p className="text-sm text-gray-600 mb-3">What would you like to work on?</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {concernsList.map((concern) => (
                    <div key={concern} className="flex items-center space-x-2">
                      <Checkbox
                        id={concern}
                        checked={profileData.therapyPreferences.concerns.includes(concern)}
                        onCheckedChange={() =>
                          handleArrayToggle("therapyPreferences", "concerns", concern)
                        }
                      />
                      <Label htmlFor={concern} className="text-sm">
                        {concern}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="previousTherapy" className="flex items-center space-x-2">
                  <Checkbox
                    id="previousTherapy"
                    checked={profileData.therapyPreferences.previousTherapy}
                    onCheckedChange={(checked) =>
                      handleInputChange("therapyPreferences", "previousTherapy", checked)
                    }
                  />
                  <span>I have had therapy before</span>
                </Label>
                {profileData.therapyPreferences.previousTherapy && (
                  <Textarea
                    className="mt-2"
                    placeholder="Please describe your previous therapy experience..."
                    value={profileData.therapyPreferences.previousTherapyDetails}
                    onChange={(e) =>
                      handleInputChange(
                        "therapyPreferences",
                        "previousTherapyDetails",
                        e.target.value
                      )
                    }
                  />
                )}
              </div>
            </div>
          )}

          {currentSection === 2 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="currentMedications">Current Medications</Label>
                <Textarea
                  id="currentMedications"
                  placeholder="List any medications you're currently taking..."
                  value={profileData.healthAndWellbeing.currentMedications}
                  onChange={(e) =>
                    handleInputChange("healthAndWellbeing", "currentMedications", e.target.value)
                  }
                />
              </div>

              <div>
                <Label htmlFor="medicalConditions">Medical Conditions</Label>
                <Textarea
                  id="medicalConditions"
                  placeholder="List any relevant medical conditions..."
                  value={profileData.healthAndWellbeing.medicalConditions}
                  onChange={(e) =>
                    handleInputChange("healthAndWellbeing", "medicalConditions", e.target.value)
                  }
                />
              </div>

              <div>
                <Label className="text-base font-medium">Current Symptoms</Label>
                <p className="text-sm text-gray-600 mb-3">What are you experiencing right now?</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {symptoms.map((symptom) => (
                    <div key={symptom} className="flex items-center space-x-2">
                      <Checkbox
                        id={symptom}
                        checked={profileData.healthAndWellbeing.currentSymptoms.includes(symptom)}
                        onCheckedChange={() =>
                          handleArrayToggle("healthAndWellbeing", "currentSymptoms", symptom)
                        }
                      />
                      <Label htmlFor={symptom} className="text-sm">
                        {symptom}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="symptomsDescription">Additional Symptom Details</Label>
                <Textarea
                  id="symptomsDescription"
                  placeholder="Describe any additional symptoms or provide more detail..."
                  value={profileData.healthAndWellbeing.symptomsDescription}
                  onChange={(e) =>
                    handleInputChange("healthAndWellbeing", "symptomsDescription", e.target.value)
                  }
                />
              </div>

              <div>
                <Label htmlFor="goalsPriorities">Therapy Goals & Priorities</Label>
                <Textarea
                  id="goalsPriorities"
                  placeholder="What do you hope to achieve through therapy?"
                  value={profileData.healthAndWellbeing.goalsPriorities}
                  onChange={(e) =>
                    handleInputChange("healthAndWellbeing", "goalsPriorities", e.target.value)
                  }
                />
              </div>
            </div>
          )}

          {currentSection === 3 && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Privacy & Data Protection</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      We take your privacy seriously. Please review and consent to how we use your
                      data.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <Label htmlFor="dataProcessingConsent" className="flex items-start space-x-3">
                    <Checkbox
                      id="dataProcessingConsent"
                      checked={profileData.privacy.dataProcessingConsent}
                      onCheckedChange={(checked) =>
                        handleInputChange("privacy", "dataProcessingConsent", checked)
                      }
                      className="mt-1"
                    />
                    <div>
                      <span className="font-medium">Data Processing Consent *</span>
                      <p className="text-sm text-gray-600 mt-1">
                        I consent to the processing of my personal data for therapy services,
                        including session notes and therapy planning.
                      </p>
                    </div>
                  </Label>
                </div>

                <div className="border rounded-lg p-4">
                  <Label htmlFor="communicationConsent" className="flex items-start space-x-3">
                    <Checkbox
                      id="communicationConsent"
                      checked={profileData.privacy.communicationConsent}
                      onCheckedChange={(checked) =>
                        handleInputChange("privacy", "communicationConsent", checked)
                      }
                      className="mt-1"
                    />
                    <div>
                      <span className="font-medium">Communication Consent</span>
                      <p className="text-sm text-gray-600 mt-1">
                        I consent to receive appointment reminders, session feedback requests, and
                        important updates via email and SMS.
                      </p>
                    </div>
                  </Label>
                </div>

                <div className="border rounded-lg p-4">
                  <Label htmlFor="researchParticipation" className="flex items-start space-x-3">
                    <Checkbox
                      id="researchParticipation"
                      checked={profileData.privacy.researchParticipation}
                      onCheckedChange={(checked) =>
                        handleInputChange("privacy", "researchParticipation", checked)
                      }
                      className="mt-1"
                    />
                    <div>
                      <span className="font-medium">Research Participation</span>
                      <p className="text-sm text-gray-600 mt-1">
                        I consent to anonymized data being used for therapy effectiveness research
                        and platform improvement.
                      </p>
                    </div>
                  </Label>
                </div>

                <div className="border rounded-lg p-4">
                  <Label htmlFor="marketingConsent" className="flex items-start space-x-3">
                    <Checkbox
                      id="marketingConsent"
                      checked={profileData.privacy.marketingConsent}
                      onCheckedChange={(checked) =>
                        handleInputChange("privacy", "marketingConsent", checked)
                      }
                      className="mt-1"
                    />
                    <div>
                      <span className="font-medium">Marketing Communications</span>
                      <p className="text-sm text-gray-600 mt-1">
                        I consent to receive information about new services, wellness resources, and
                        special offers.
                      </p>
                    </div>
                  </Label>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600">
                  You can withdraw your consent at any time by contacting our support team. For more
                  information, please review our{" "}
                  <a href="#" className="text-hive-purple underline">
                    Privacy Policy
                  </a>{" "}
                  and
                  <a href="#" className="text-hive-purple underline ml-1">
                    Terms of Service
                  </a>
                  .
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button variant="outline" onClick={prevSection} disabled={currentSection === 0}>
              Previous
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSave}
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
                    saveProfileMutation.isPending || !profileData.privacy.dataProcessingConsent
                  }
                  className="bg-hive-purple hover:bg-hive-purple/90"
                >
                  Complete Profile
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    if (canProceedToNext) {
                      setCurrentSection(currentSection + 1);
                    }
                  }}
                  disabled={!canProceedToNext}
                  className="bg-hive-purple hover:bg-hive-purple/90 disabled:opacity-50 disabled:cursor-not-allowed"
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
