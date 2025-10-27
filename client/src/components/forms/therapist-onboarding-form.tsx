import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Upload, FileText, UserCheck, Shield, CreditCard, CheckCircle } from "lucide-react";
import DocumentUploadGuidance from "@/components/services/document-upload-guidance";

const therapistOnboardingSchema = z.object({
  // Personal Information (matching main website form)
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),

  // NEW COMPREHENSIVE QUESTIONS (matching main website)
  // Current location
  location: z.string().min(1, "Current location is required"),

  // Religion
  religion: z.string().min(1, "Please specify your religion or belief system"),

  // Limited company status
  hasLimitedCompany: z.enum(["yes", "no"], {
    required_error: "Please specify if you have a limited company",
  }),

  // Highest qualification level
  highestQualification: z
    .string()
    .min(1, "Please specify your highest psychology/therapy qualification"),

  // Professional body registration
  professionalBody: z.string().min(1, "Please specify your professional body registration"),

  // Therapy specialisations/approaches
  therapySpecialisations: z
    .array(z.string())
    .min(1, "Please select at least one therapy specialisation"),

  // Personality description as therapist
  personalityDescription: z
    .string()
    .min(
      50,
      "Please provide a description of your personality as a therapist (minimum 50 characters)"
    ),

  // Professional bio
  professionalBio: z
    .string()
    .min(50, "Please provide a professional biography (minimum 50 characters)"),

  // Additional portal-specific fields
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  profilePhoto: z.string().optional(),
  streetAddress: z.string().min(1, "Street address is required"),
  postCode: z.string().min(1, "Post code is required"),

  // Emergency Contact Details
  emergencyFirstName: z.string().min(1, "Emergency contact first name is required"),
  emergencyLastName: z.string().min(1, "Emergency contact last name is required"),
  emergencyRelationship: z.string().min(1, "Relationship to emergency contact is required"),
  emergencyPhoneNumber: z.string().min(10, "Emergency contact phone number is required"),

  // Professional Details
  jobTitle: z.string().min(1, "Job title is required"),
  qualifications: z.array(z.string()).min(1, "At least one qualification is required"),
  yearsOfExperience: z.number().min(1, "Years of experience is required").max(100),
  registrationNumber: z.string().optional(),
  enhancedDbsCertificate: z.enum(["yes", "no"], { required_error: "Please select an option" }),
  workingWithOtherPlatforms: z.enum(["yes", "no"], { required_error: "Please select an option" }),

  // Availability
  availability: z.object({
    monday: z.array(z.string()).optional(),
    tuesday: z.array(z.string()).optional(),
    wednesday: z.array(z.string()).optional(),
    thursday: z.array(z.string()).optional(),
    friday: z.array(z.string()).optional(),
    saturday: z.array(z.string()).optional(),
    sunday: z.array(z.string()).optional(),
  }),
  sessionsPerWeek: z.enum(["1-5", "6-10", "11-20", "21+"], {
    required_error: "Please select an option",
  }),

  // Self-Employment & Legal Compliance
  selfEmploymentAcknowledgment: z
    .boolean()
    .refine((val) => val === true, "You must acknowledge self-employment terms"),
  taxResponsibilityAcknowledgment: z
    .boolean()
    .refine((val) => val === true, "You must acknowledge tax responsibility"),

  // Document Uploads
  cvDocument: z.string().optional(),
  dbsCertificate: z.string().optional(),
  professionalInsurance: z.string().optional(),
  membershipProof: z.string().optional(),
  rightToWorkProof: z.string().optional(),

  // Legal Agreements
  policiesAgreement: z.boolean().refine((val) => val === true, "You must agree to the policies"),
  signature: z.string().min(1, "Signature is required"),

  // Stripe Connect Consent
  stripeConnectConsent: z
    .boolean()
    .refine((val) => val === true, "You must consent to Stripe Connect setup"),
});

type TherapistOnboardingFormData = z.infer<typeof therapistOnboardingSchema>;

interface TherapistOnboardingFormProps {
  onSuccess?: (data: TherapistOnboardingFormData) => void;
}

export default function TherapistOnboardingForm({ onSuccess }: TherapistOnboardingFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [qualificationsList, setQualificationsList] = useState<string[]>([""]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<TherapistOnboardingFormData>({
    resolver: zodResolver(therapistOnboardingSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      // NEW comprehensive question defaults
      location: "",
      religion: "",
      highestQualification: "",
      professionalBody: "",
      therapySpecialisations: [],
      personalityDescription: "",
      professionalBio: "",
      // Portal-specific defaults
      dateOfBirth: "",
      streetAddress: "",
      postCode: "",
      emergencyFirstName: "",
      emergencyLastName: "",
      emergencyRelationship: "",
      emergencyPhoneNumber: "",
      jobTitle: "",
      qualifications: [""],
      yearsOfExperience: 1,
      registrationNumber: "",
      availability: {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      },
      selfEmploymentAcknowledgment: false,
      taxResponsibilityAcknowledgment: false,
      policiesAgreement: false,
      signature: "",
      stripeConnectConsent: false,
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: TherapistOnboardingFormData) => {
      // Submit to therapist enquiry endpoint with comprehensive data
      const response = await apiRequest("POST", "/api/therapist/enquiry", {
        ...data,
        // Map portal fields to enquiry format
        phoneNumber: data.phone,
        areasOfSpecialism: data.therapySpecialisations, // Legacy compatibility
      });
      return response.json();
    },
    onSuccess: (data) => {
      setIsSubmitted(true);
      onSuccess?.(data);
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: TherapistOnboardingFormData) => {
    submitMutation.mutate(data);
  };

  const addQualification = () => {
    setQualificationsList([...qualificationsList, ""]);
  };

  const updateQualification = (index: number, value: string) => {
    const updated = [...qualificationsList];
    updated[index] = value;
    setQualificationsList(updated);
    form.setValue(
      "qualifications",
      updated.filter((q) => q.trim() !== "")
    );
  };

  const removeQualification = (index: number) => {
    const updated = qualificationsList.filter((_, i) => i !== index);
    setQualificationsList(updated);
    form.setValue(
      "qualifications",
      updated.filter((q) => q.trim() !== "")
    );
  };

  const handleAvailabilityChange = (day: string, timeSlot: string, checked: boolean) => {
    const currentAvailability = form.getValues(`availability.${day}` as any) || [];
    let updated: string[];

    if (checked) {
      updated = [...currentAvailability, timeSlot];
    } else {
      updated = currentAvailability.filter((slot: string) => slot !== timeSlot);
    }

    form.setValue(`availability.${day}` as any, updated);
  };

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 6));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const steps = [
    { number: 1, title: "Personal Information", icon: <UserCheck className="w-5 h-5" /> },
    { number: 2, title: "Professional Details", icon: <FileText className="w-5 h-5" /> },
    { number: 3, title: "Self-Employment & Legal", icon: <Shield className="w-5 h-5" /> },
    { number: 4, title: "Document Uploads", icon: <Upload className="w-5 h-5" /> },
    { number: 5, title: "Legal Agreements", icon: <CheckCircle className="w-5 h-5" /> },
    { number: 6, title: "Stripe Connect Setup", icon: <CreditCard className="w-5 h-5" /> },
  ];

  // Show success screen after submission
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 mx-auto mb-6" style={{ color: "#9306B1" }} />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Application Consultation Booked!
          </h1>
          <p className="text-gray-600 mb-6">
            Thanks for completing your onboarding! We'll review your details and then send over your
            contract and login information. While you wait, feel free to go back through your
            information booklet- and if you have any questions, just email us at
            admin@hive-wellness.co.uk.
          </p>
          <div
            className="border rounded-lg p-4 mb-6"
            style={{ backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" }}
          >
            <h3 className="font-semibold mb-2" style={{ color: "#9306B1" }}>
              What to Expect:
            </h3>
            <ul className="text-sm text-gray-700 space-y-1 text-left">
              <li>• Discussion of your qualifications and experience</li>
              <li>• Overview of our platform and client matching process</li>
              <li>• Details about our 85% therapist payment structure</li>
              <li>• Next steps in the application process</li>
            </ul>
          </div>
          <p className="text-sm text-gray-500">
            Questions? Contact us at{" "}
            <span style={{ color: "#9306B1" }}>admin@hive-wellness.co.uk</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Therapist Onboarding</h1>
          <p className="text-gray-600">
            <span className="text-red-500">*</span> indicates required fields
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    currentStep >= step.number
                      ? "bg-hive-purple border-hive-purple text-white"
                      : "border-gray-300 text-gray-400"
                  }`}
                >
                  {currentStep > step.number ? <CheckCircle className="w-5 h-5" /> : step.icon}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      currentStep > step.number ? "bg-hive-purple" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">{steps[currentStep - 1].title}</h2>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-hive-purple" />
                    1. Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your first name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="profilePhoto"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profile Photo</FormLabel>
                          <FormControl>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => field.onChange(e.target.files?.[0]?.name)}
                            />
                          </FormControl>
                          <FormDescription>
                            Accepted file types: jpg, png. Max. file size: 2 MB.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* NEW COMPREHENSIVE QUESTIONS - matching main website */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Comprehensive Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Location *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your location in the UK" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="London, England">London, England</SelectItem>
                                <SelectItem value="Birmingham, England">
                                  Birmingham, England
                                </SelectItem>
                                <SelectItem value="Manchester, England">
                                  Manchester, England
                                </SelectItem>
                                <SelectItem value="Liverpool, England">
                                  Liverpool, England
                                </SelectItem>
                                <SelectItem value="Leeds, England">Leeds, England</SelectItem>
                                <SelectItem value="Sheffield, England">
                                  Sheffield, England
                                </SelectItem>
                                <SelectItem value="Bristol, England">Bristol, England</SelectItem>
                                <SelectItem value="Newcastle, England">
                                  Newcastle, England
                                </SelectItem>
                                <SelectItem value="Brighton, England">Brighton, England</SelectItem>
                                <SelectItem value="Nottingham, England">
                                  Nottingham, England
                                </SelectItem>
                                <SelectItem value="Leicester, England">
                                  Leicester, England
                                </SelectItem>
                                <SelectItem value="Coventry, England">Coventry, England</SelectItem>
                                <SelectItem value="Hull, England">Hull, England</SelectItem>
                                <SelectItem value="Plymouth, England">Plymouth, England</SelectItem>
                                <SelectItem value="Stoke-on-Trent, England">
                                  Stoke-on-Trent, England
                                </SelectItem>
                                <SelectItem value="Derby, England">Derby, England</SelectItem>
                                <SelectItem value="Portsmouth, England">
                                  Portsmouth, England
                                </SelectItem>
                                <SelectItem value="Southampton, England">
                                  Southampton, England
                                </SelectItem>
                                <SelectItem value="Reading, England">Reading, England</SelectItem>
                                <SelectItem value="Oxford, England">Oxford, England</SelectItem>
                                <SelectItem value="Cambridge, England">
                                  Cambridge, England
                                </SelectItem>
                                <SelectItem value="York, England">York, England</SelectItem>
                                <SelectItem value="Bath, England">Bath, England</SelectItem>
                                <SelectItem value="Canterbury, England">
                                  Canterbury, England
                                </SelectItem>
                                <SelectItem value="Glasgow, Scotland">Glasgow, Scotland</SelectItem>
                                <SelectItem value="Edinburgh, Scotland">
                                  Edinburgh, Scotland
                                </SelectItem>
                                <SelectItem value="Aberdeen, Scotland">
                                  Aberdeen, Scotland
                                </SelectItem>
                                <SelectItem value="Dundee, Scotland">Dundee, Scotland</SelectItem>
                                <SelectItem value="Stirling, Scotland">
                                  Stirling, Scotland
                                </SelectItem>
                                <SelectItem value="Inverness, Scotland">
                                  Inverness, Scotland
                                </SelectItem>
                                <SelectItem value="Perth, Scotland">Perth, Scotland</SelectItem>
                                <SelectItem value="Cardiff, Wales">Cardiff, Wales</SelectItem>
                                <SelectItem value="Swansea, Wales">Swansea, Wales</SelectItem>
                                <SelectItem value="Newport, Wales">Newport, Wales</SelectItem>
                                <SelectItem value="Wrexham, Wales">Wrexham, Wales</SelectItem>
                                <SelectItem value="Bangor, Wales">Bangor, Wales</SelectItem>
                                <SelectItem value="Belfast, Northern Ireland">
                                  Belfast, Northern Ireland
                                </SelectItem>
                                <SelectItem value="Derry/Londonderry, Northern Ireland">
                                  Derry/Londonderry, Northern Ireland
                                </SelectItem>
                                <SelectItem value="Lisburn, Northern Ireland">
                                  Lisburn, Northern Ireland
                                </SelectItem>
                                <SelectItem value="Newry, Northern Ireland">
                                  Newry, Northern Ireland
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="religion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Religion/Belief System *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Christian, Muslim, Atheist, etc."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="hasLimitedCompany"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Do you have a registered limited company? *</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex flex-row gap-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id="company-yes" />
                                <Label htmlFor="company-yes">Yes</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id="company-no" />
                                <Label htmlFor="company-no">No</Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="highestQualification"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Highest Psychology/Therapy Qualification Level *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Masters in Clinical Psychology, Diploma in Counselling"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="professionalBody"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Professional Body Registration *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., BACP Registered, HCPC Registered"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="therapySpecialisations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Therapy Specialisations *</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={(value) => {
                                const current = field.value || [];
                                if (!current.includes(value)) {
                                  field.onChange([...current, value]);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select specialisations" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Anxiety and Depression">
                                  Anxiety and Depression
                                </SelectItem>
                                <SelectItem value="CBT">
                                  Cognitive Behavioural Therapy (CBT)
                                </SelectItem>
                                <SelectItem value="Trauma and PTSD">Trauma and PTSD</SelectItem>
                                <SelectItem value="Relationship Issues">
                                  Relationship Issues
                                </SelectItem>
                                <SelectItem value="Eating Disorders">Eating Disorders</SelectItem>
                                <SelectItem value="Addiction">
                                  Addiction and Substance Abuse
                                </SelectItem>
                                <SelectItem value="Family Therapy">Family Therapy</SelectItem>
                                <SelectItem value="Child and Adolescent">
                                  Child and Adolescent
                                </SelectItem>
                                <SelectItem value="LGBTQ+ Issues">LGBTQ+ Issues</SelectItem>
                                <SelectItem value="Grief and Loss">Grief and Loss</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(field.value || []).map((spec: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {spec}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="ml-1 h-auto p-0"
                                  onClick={() => {
                                    const updated = field.value.filter((s: string) => s !== spec);
                                    field.onChange(updated);
                                  }}
                                >
                                  ×
                                </Button>
                              </Badge>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="personalityDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Describe your personality as a therapist *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Please describe your approach and personality as a therapist (minimum 50 characters)"
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>Minimum 50 characters</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="professionalBio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Professional Biography *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Please provide a professional biography that clients will see (minimum 50 characters)"
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            This will be displayed to potential clients
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="streetAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="postCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Post Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your postcode" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Emergency Contact Details */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Emergency Contact Details
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="emergencyFirstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter their first name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="emergencyLastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter their last name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="emergencyRelationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship To You *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your relationship to the emergency contact"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>(e.g., Partner, Parent, Friend)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emergencyPhoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Phone Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter their phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Professional Details */}
            {currentStep === 2 && (
              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-hive-purple" />
                    2. Professional Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your job title" {...field} />
                        </FormControl>
                        <FormDescription>
                          (e.g., Counsellor, Clinical Psychologist, CBT Therapist)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <Label>Qualifications *</Label>
                    <p className="text-sm text-gray-500 mb-3">
                      (List relevant degrees/certifications)
                    </p>
                    {qualificationsList.map((qualification, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <Input
                          value={qualification}
                          onChange={(e) => updateQualification(index, e.target.value)}
                          placeholder="Enter qualification"
                          className="flex-1"
                        />
                        {qualificationsList.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeQualification(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addQualification}
                      className="mt-2"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add additional fields
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name="yearsOfExperience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Years of Experience in Therapy *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            placeholder="Enter number of years"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>Please enter a number from 1 to 100.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="registrationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HCPC/BACP/UKCP Registration Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter registration number" {...field} />
                        </FormControl>
                        <FormDescription>(If applicable)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enhancedDbsCertificate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Do you hold an Enhanced DBS Certificate? *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="dbs-yes" />
                              <Label htmlFor="dbs-yes">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="dbs-no" />
                              <Label htmlFor="dbs-no">No</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="workingWithOtherPlatforms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Are you currently working with other therapy platforms or private clients?
                          *
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="platforms-yes" />
                              <Label htmlFor="platforms-yes">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="platforms-no" />
                              <Label htmlFor="platforms-no">No</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Availability Section */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Availability for Sessions (Days & Times)
                    </h3>

                    <div className="space-y-4">
                      {[
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                        "Sunday",
                      ].map((day) => (
                        <div key={day} className="flex items-center gap-4">
                          <div className="w-20 text-sm font-medium">{day}</div>
                          <div className="flex gap-4">
                            {["Morning", "Afternoon", "Evening"].map((timeSlot) => (
                              <div key={timeSlot} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${day.toLowerCase()}-${timeSlot.toLowerCase()}`}
                                  onCheckedChange={(checked) =>
                                    handleAvailabilityChange(
                                      day.toLowerCase(),
                                      timeSlot.toLowerCase(),
                                      checked as boolean
                                    )
                                  }
                                />
                                <Label
                                  htmlFor={`${day.toLowerCase()}-${timeSlot.toLowerCase()}`}
                                  className="text-sm"
                                >
                                  {timeSlot}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="sessionsPerWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          How many sessions would you like to complete each week? *
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="1-5" id="sessions-1-5" />
                              <Label htmlFor="sessions-1-5">1-5 Sessions</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="6-10" id="sessions-6-10" />
                              <Label htmlFor="sessions-6-10">6-10 Sessions</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="11-20" id="sessions-11-20" />
                              <Label htmlFor="sessions-11-20">11-20 Sessions</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="21+" id="sessions-21+" />
                              <Label htmlFor="sessions-21+">21+ Sessions</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormDescription>(This is only an estimate)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 3: Self-Employment & Legal Compliance */}
            {currentStep === 3 && (
              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-hive-purple" />
                    3. Self-Employment & Legal Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      As a self-employed therapist, you are responsible for:
                    </h3>
                    <ul className="list-disc pl-6 space-y-2 text-gray-700">
                      <li>Your own tax and National Insurance contributions.</li>
                      <li>Holding valid Professional Indemnity Insurance.</li>
                      <li>Compliance with GDPR and confidentiality regulations.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Please Confirm:</h3>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="selfEmploymentAcknowledgment"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                I acknowledge that I am applying to work as a self-employed
                                therapist and understand that Hive Wellness does not employ
                                therapists directly.
                              </FormLabel>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="taxResponsibilityAcknowledgment"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                I am responsible for my own tax, National Insurance, and pension
                                contributions.
                              </FormLabel>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Document Uploads */}
            {currentStep === 4 && (
              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-hive-purple" />
                    4. Compliance & Documentation Uploads
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Document Upload Guidance */}
                  <DocumentUploadGuidance />

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      (Upload the following documents)
                    </h3>
                    <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
                      <li>📎 CV/Resume (PDF or Word) (Required)</li>
                      <li>📎 Enhanced DBS Certificate (Required)</li>
                      <li>📎 Professional Indemnity Insurance (Required)</li>
                      <li>📎 Proof of HCPC/BACP/UKCP Membership (If applicable)</li>
                      <li>
                        📎 Proof of Right to Work in the UK (Passport, Visa, or BRP) (Required)
                      </li>
                    </ul>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Drop files here or</p>
                    <Button variant="outline" type="button">
                      Select files
                    </Button>
                    <p className="text-sm text-gray-500 mt-2">
                      Max. file size: 2 MB, Max. files: 5
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="cvDocument"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CV/Resume *</FormLabel>
                          <FormControl>
                            <Input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              onChange={(e) => field.onChange(e.target.files?.[0]?.name)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dbsCertificate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Enhanced DBS Certificate *</FormLabel>
                          <FormControl>
                            <Input
                              type="file"
                              accept=".pdf,.jpg,.png"
                              onChange={(e) => field.onChange(e.target.files?.[0]?.name)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="professionalInsurance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Professional Indemnity Insurance *</FormLabel>
                          <FormControl>
                            <Input
                              type="file"
                              accept=".pdf,.jpg,.png"
                              onChange={(e) => field.onChange(e.target.files?.[0]?.name)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="membershipProof"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Membership Proof (If applicable)</FormLabel>
                          <FormControl>
                            <Input
                              type="file"
                              accept=".pdf,.jpg,.png"
                              onChange={(e) => field.onChange(e.target.files?.[0]?.name)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="rightToWorkProof"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Right to Work Proof *</FormLabel>
                          <FormControl>
                            <Input
                              type="file"
                              accept=".pdf,.jpg,.png"
                              onChange={(e) => field.onChange(e.target.files?.[0]?.name)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 5: Legal Agreements */}
            {currentStep === 5 && (
              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-hive-purple" />
                    5. Legal Agreements & Policies
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Review and accept the following legal agreements and policies.
                    </h3>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2">
                        <Checkbox id="confidentiality" />
                        <Label htmlFor="confidentiality">
                          Confidentiality & Data Protection Policy
                          <Button variant="link" className="p-0 h-auto text-hive-purple ml-1">
                            View
                          </Button>
                        </Label>
                      </li>
                      <li className="flex items-center gap-2">
                        <Checkbox id="safeguarding" />
                        <Label htmlFor="safeguarding">
                          Safeguarding & Ethics Policy
                          <Button variant="link" className="p-0 h-auto text-hive-purple ml-1">
                            View
                          </Button>
                        </Label>
                      </li>
                      <li className="flex items-center gap-2">
                        <Checkbox id="terms" />
                        <Label htmlFor="terms">
                          Terms of Engagement
                          <Button variant="link" className="p-0 h-auto text-hive-purple ml-1">
                            View
                          </Button>
                        </Label>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Please Confirm:</h3>

                    <FormField
                      control={form.control}
                      name="policiesAgreement"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              I confirm that I have read and agree to the Hive Wellness policies,
                              terms, and conditions as a self-employed therapist.
                            </FormLabel>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="signature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Signature *</FormLabel>
                        <FormControl>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                            <p className="text-gray-600 mb-4">Please Sign</p>
                            <div className="w-full h-32 bg-gray-50 rounded border-2 border-gray-200 flex items-center justify-center">
                              <Input
                                placeholder="Type your full name as signature"
                                {...field}
                                className="text-center text-lg font-script"
                              />
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 6: Stripe Connect */}
            {currentStep === 6 && (
              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-hive-purple" />
                    6. Payment & Stripe Connect On-boarding
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <p className="text-gray-700">
                      Hive Wellness processes all therapist payments securely through Stripe
                      Connect.{" "}
                      <span className="text-hive-purple font-semibold">
                        To receive payments, you'll need to set up a Stripe Connect account.
                      </span>
                    </p>

                    <p className="text-gray-700">
                      Once you've completed your onboarding form, you'll receive an email from us
                      with a link to Stripe Connect, where you'll be asked to provide a few
                      additional details — including your personal information and bank details.
                    </p>

                    <p className="text-gray-700">
                      To support you through this process, we've also sent you an onboarding PDF
                      guide. It's designed to make the setup as clear and stress-free as possible,
                      and we recommend keeping it open while completing your Stripe registration.
                    </p>

                    <p className="text-gray-700">
                      At this stage, the only thing you'll need to have ready is your bank details.
                    </p>

                    <p className="text-gray-700">
                      Setting up Stripe Connect also gives you greater control over your invoices
                      and earnings, making it easier to manage your taxes and financial records.
                    </p>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <FormField
                      control={form.control}
                      name="stripeConnectConsent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              I consent to the collection and processing of my health and religious
                              information as part of this form, in accordance with your{" "}
                              <Button variant="link" className="p-0 h-auto text-hive-purple">
                                Privacy Policy
                              </Button>
                              .
                            </FormLabel>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <p className="text-sm text-gray-600">
                    The information you share with us through this form will be collected and
                    processed in line with our{" "}
                    <Button variant="link" className="p-0 h-auto text-hive-purple">
                      Privacy Policy
                    </Button>
                    .
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                Previous
              </Button>

              <div className="flex gap-2">
                {currentStep < 6 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="bg-hive-purple hover:bg-hive-purple/90"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="bg-hive-purple hover:bg-hive-purple/90"
                  >
                    {submitMutation.isPending ? "Submitting..." : "Submit Application"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
