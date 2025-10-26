import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, User, MapPin, Phone, Clock, Users, Award, FileText, CheckCircle, Upload, Camera, Calendar } from "lucide-react";
import hiveWellnessLogo from "@assets/Hive Logo_1752073128164.png";
import IntroductionCallBooking from "@/components/IntroductionCallBooking";

// Schema matching the main website structure exactly
const therapistEnquirySchema = z.object({
  // 1. What is your full name?
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  
  // 2. What is your email address?
  email: z.string().email("Please enter a valid email address"),
  
  // 3. What are your professional qualifications?
  professionalQualifications: z.array(z.string()).min(1, "Please select at least one professional qualification"),
  
  // 4. How many years therapy experience do you have?
  therapyExperience: z.string().min(1, "Please select your experience level"),
  
  // 5. What are your areas of specialism?
  areasOfSpecialism: z.array(z.string()).min(1, "Please select at least one area of specialism"),
  
  // 6. What professional body are you registered with?
  professionalBody: z.string().min(1, "Please specify your professional body registration"),
  
  // 7. What therapeutic approaches do you use?
  therapeuticApproaches: z.array(z.string()).min(1, "Please select at least one therapeutic approach"),
  
  // 8. What is your preferred session schedule?
  sessionSchedule: z.string().min(1, "Please select your preferred session schedule"),
  
  // 9. Please provide a professional bio that clients will see?
  professionalBio: z.string().min(50, "Please provide a professional bio (minimum 50 characters)"),
});

type TherapistEnquiryData = z.infer<typeof therapistEnquirySchema>;

// Data matching the main website form exactly
const professionalQualifications = [
  "Licensed Clinical Social Worker",
  "Licensed Marriage and Family Therapist", 
  "Licensed Professional Counsellor",
];

const therapyExperience = [
  "Less than a year",
  "1-3 years",
  "4-7 years", 
  "8-15 years",
  "More than 15 years",
];

const areasOfSpecialism = [
  "Anxiety and Depression",
  "Trauma and PTSD",
];

const therapeuticApproaches = [
  "CBT",
  "DBT",
  "ACT",
];

const sessionSchedules = [
  "Full time",
  "Part time",
  "Limited",
  "As needed basis",
];

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", 
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
  "20:00"
];

const daysOfWeek = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export default function UnifiedTherapistEnquiryForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEnquiry, setSubmittedEnquiry] = useState<any>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  const form = useForm<TherapistEnquiryData>({
    resolver: zodResolver(therapistEnquirySchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      streetAddress: "",
      postCode: "",
      emergencyFirstName: "",
      emergencyLastName: "",
      emergencyRelationship: "",
      emergencyPhoneNumber: "",
      qualifications: "",
      specializations: [],
      experience: "",
      registrationBodies: [],
      registrationNumber: "",
      enhancedDbsCertificate: undefined,
      workingWithOtherPlatforms: undefined,
      professionalInsurance: "",
      availability: {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      },
      maxClientsPerWeek: 10,
      therapeuticApproach: "",
      aboutYou: "",
      motivation: "",
      profilePhoto: "",
      bankAccountName: "",
      bankSortCode: "",
      bankAccountNumber: "",
      gdprConsent: false,
      termsConsent: false,
      marketingConsent: false,
    },
  });

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('profilePhoto', file);
      
      const response = await apiRequest("POST", "/api/upload-profile-photo", formData);
      
      if (response.ok) {
        const result = await response.json();
        setProfilePhotoUrl(result.fileUrl);
        form.setValue('profilePhoto', result.fileUrl);
        
        toast({
          title: "Photo uploaded successfully",
          description: "Your profile photo has been uploaded.",
        });
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

  const onSubmit = async (data: TherapistEnquiryData) => {
    setIsSubmitting(true);
    
    try {
      const response = await apiRequest("POST", "/api/therapist-applications", {
        ...data,
        profilePhoto: profilePhotoUrl
      });
      
      const result = await response.json();
      
      toast({
        title: "Application Submitted Successfully!",
        description: "Thank you for your interest. We'll be in touch within 2 business days to schedule your introduction call.",
      });
      
      setIsSubmitted(true);
      setSubmittedEnquiry(result);
    } catch (error: any) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your application. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSpecialisationChange = (specialisation: string, checked: boolean) => {
    const currentSpecs = form.getValues("areasOfSpecialism");
    if (checked) {
      form.setValue("areasOfSpecialism", [...currentSpecs, specialisation]);
    } else {
      form.setValue("areasOfSpecialism", currentSpecs.filter(s => s !== specialisation));
    }
  };

  const handleRegistrationBodyChange = (body: string, checked: boolean) => {
    const currentBodies = form.getValues("registrationBodies");
    if (checked) {
      form.setValue("registrationBodies", [...currentBodies, body]);
    } else {
      form.setValue("registrationBodies", currentBodies.filter(b => b !== body));
    }
  };

  const handleAvailabilityChange = (day: string, timeSlot: string, checked: boolean) => {
    const currentAvailability = form.getValues("availability") as any;
    const daySlots = currentAvailability[day] || [];
    
    if (checked) {
      form.setValue("availability", {
        ...currentAvailability,
        [day]: [...daySlots, timeSlot]
      });
    } else {
      form.setValue("availability", {
        ...currentAvailability,
        [day]: daySlots.filter((slot: string) => slot !== timeSlot)
      });
    }
  };

  // Show success state with introduction call booking
  if (isSubmitted && submittedEnquiry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-hive-light-purple/20 to-white dark:from-hive-light-purple/10 dark:to-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800">
            <CardHeader className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl font-century text-hive-purple dark:text-hive-light-purple">
                Application Submitted Successfully!
              </CardTitle>
              <p className="text-hive-gray dark:text-gray-300 font-secondary">
                Thank you for your interest in joining the Hive Wellness therapy team.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-white dark:bg-gray-800/50 rounded-lg p-6 border border-hive-light-purple/20">
                <h3 className="font-century text-lg font-bold text-hive-purple dark:text-hive-light-purple mb-4">What happens next?</h3>
                <div className="space-y-3 font-secondary text-sm text-hive-black dark:text-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-hive-purple text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                    <div>
                      <p className="font-semibold">Application Review (1-2 business days)</p>
                      <p className="text-hive-gray dark:text-gray-400">Our team will review your application and qualifications.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-hive-purple text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                    <div>
                      <p className="font-semibold">Introduction Call Invitation</p>
                      <p className="text-hive-gray dark:text-gray-400">You'll receive an email with a link to book your 15-minute introduction call.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-hive-purple text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                    <div>
                      <p className="font-semibold">Complete Onboarding</p>
                      <p className="text-hive-gray dark:text-gray-400">After your call, we'll send your complete onboarding package and platform access.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Introduction Call Booking Section */}
              <div className="bg-gradient-to-r from-hive-purple/5 to-hive-light-purple/5 dark:from-hive-purple/10 dark:to-hive-light-purple/10 rounded-lg p-6 border border-hive-purple/20">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="h-6 w-6 text-hive-purple" />
                  <h3 className="font-century text-lg font-bold text-hive-purple dark:text-hive-light-purple">
                    Book Your Introduction Call
                  </h3>
                </div>
                
                <IntroductionCallBooking 
                  enquiryId={submittedEnquiry.id}
                  therapistEmail={submittedEnquiry.email}
                  therapistName={`${submittedEnquiry.firstName} ${submittedEnquiry.lastName}`}
                  onBookingComplete={(callId) => {
                    toast({
                      title: "Call Booked!",
                      description: "Your introduction call has been scheduled successfully.",
                    });
                  }}
                />
              </div>

              <div className="text-center pt-4">
                <p className="text-sm text-hive-gray dark:text-gray-400 font-secondary">
                  Questions? Contact us at{" "}
                  <a 
                    href="mailto:support@hive-wellness.co.uk" 
                    className="text-hive-purple hover:underline font-semibold"
                  >
                    support@hive-wellness.co.uk
                  </a>
                  {" "}or call{" "}
                  <a 
                    href="tel:02079460958" 
                    className="text-hive-purple hover:underline font-semibold"
                  >
                    020 7946 0958
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="font-century text-2xl font-bold text-hive-purple dark:text-hive-light-purple mb-2">Personal Information</h2>
              <p className="text-hive-gray dark:text-gray-400 font-secondary">Tell us about yourself</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">First Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-hive-light-purple/30 focus:border-hive-purple"
                        placeholder="Enter your first name"
                      />
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
                    <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Last Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-hive-light-purple/30 focus:border-hive-purple"
                        placeholder="Enter your last name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Email Address *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        className="border-hive-light-purple/30 focus:border-hive-purple"
                        placeholder="your.email@example.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Phone Number *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        className="border-hive-light-purple/30 focus:border-hive-purple"
                        placeholder="07XXX XXXXXX"
                      />
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
                    <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Date of Birth *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="border-hive-light-purple/30 focus:border-hive-purple"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="streetAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Street Address *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-hive-light-purple/30 focus:border-hive-purple"
                        placeholder="123 High Street"
                      />
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
                    <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Post Code *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-hive-light-purple/30 focus:border-hive-purple"
                        placeholder="SW1A 1AA"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="border-t border-hive-light-purple/20 pt-6">
              <h3 className="font-century text-lg font-bold text-hive-purple dark:text-hive-light-purple mb-4">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="emergencyFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Emergency Contact First Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="border-hive-light-purple/30 focus:border-hive-purple"
                          placeholder="First name"
                        />
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
                      <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Emergency Contact Last Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="border-hive-light-purple/30 focus:border-hive-purple"
                          placeholder="Last name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="emergencyRelationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Relationship *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="border-hive-light-purple/30 focus:border-hive-purple"
                          placeholder="e.g., Spouse, Parent, Sibling"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="emergencyPhoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Emergency Contact Phone *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          className="border-hive-light-purple/30 focus:border-hive-purple"
                          placeholder="07XXX XXXXXX"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="border-t border-hive-light-purple/20 pt-6">
              <h3 className="font-century text-lg font-bold text-hive-purple dark:text-hive-light-purple mb-4">Profile Photo (Optional)</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="profile-photo"
                    />
                    <Label
                      htmlFor="profile-photo"
                      className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-hive-purple hover:bg-hive-purple/90 text-white rounded-md transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Photo
                    </Label>
                  </div>
                  {profilePhotoUrl && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-secondary">Photo uploaded successfully</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-hive-gray dark:text-gray-400 font-secondary">
                  Upload a professional headshot (optional). This will be used in your therapist profile.
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="font-century text-2xl font-bold text-hive-purple dark:text-hive-light-purple mb-2">Professional Qualifications</h2>
              <p className="text-hive-gray dark:text-gray-400 font-secondary">Tell us about your professional background</p>
            </div>
            
            <FormField
              control={form.control}
              name="qualifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Qualifications & Training *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      className="border-hive-light-purple/30 focus:border-hive-purple"
                      placeholder="Please list your relevant qualifications, degrees, and training (e.g., MSc Counselling Psychology, Diploma in CBT, etc.)"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="experience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Experience Level *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-hive-light-purple/30 focus:border-hive-purple">
                        <SelectValue placeholder="Select your experience level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {experienceLevels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <Label className="text-hive-black dark:text-gray-200 font-secondary">Professional Registration Bodies *</Label>
              <p className="text-sm text-hive-gray dark:text-gray-400 font-secondary">
                Select all professional bodies you are registered with
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {registrationBodies.map((body) => (
                  <div key={body} className="flex items-center space-x-2">
                    <Checkbox
                      id={body}
                      checked={form.watch("registrationBodies").includes(body)}
                      onCheckedChange={(checked) => handleRegistrationBodyChange(body, !!checked)}
                      className="border-hive-purple data-[state=checked]:bg-hive-purple"
                    />
                    <Label htmlFor={body} className="text-sm font-secondary text-hive-black dark:text-gray-200">
                      {body}
                    </Label>
                  </div>
                ))}
              </div>
              {form.formState.errors.registrationBodies && (
                <p className="text-sm text-red-500">{form.formState.errors.registrationBodies.message}</p>
              )}
            </div>

            <FormField
              control={form.control}
              name="registrationNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Registration Number (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="border-hive-light-purple/30 focus:border-hive-purple"
                      placeholder="Your professional registration number"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enhancedDbsCertificate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Do you have an Enhanced DBS Certificate? *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-hive-light-purple/30 focus:border-hive-purple">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="yes">Yes, I have an Enhanced DBS Certificate</SelectItem>
                      <SelectItem value="no">No, but I can obtain one</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="workingWithOtherPlatforms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Are you currently working with other online therapy platforms? *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-hive-light-purple/30 focus:border-hive-purple">
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="professionalInsurance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Professional Insurance Details *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      className="border-hive-light-purple/30 focus:border-hive-purple"
                      placeholder="Please provide details of your professional indemnity and public liability insurance"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="font-century text-2xl font-bold text-hive-purple dark:text-hive-light-purple mb-2">Specialisations & Approach</h2>
              <p className="text-hive-gray dark:text-gray-400 font-secondary">Tell us about your therapeutic specialisations</p>
            </div>
            
            <div className="space-y-3">
              <Label className="text-hive-black dark:text-gray-200 font-secondary">Therapy Specialisations *</Label>
              <p className="text-sm text-hive-gray dark:text-gray-400 font-secondary">
                Select all areas you specialise in or have experience with
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto border border-hive-light-purple/20 rounded-lg p-4">
                {specializations.map((spec) => (
                  <div key={spec} className="flex items-center space-x-2">
                    <Checkbox
                      id={spec}
                      checked={form.watch("specializations").includes(spec)}
                      onCheckedChange={(checked) => handleSpecialisationChange(spec, !!checked)}
                      className="border-hive-purple data-[state=checked]:bg-hive-purple"
                    />
                    <Label htmlFor={spec} className="text-sm font-secondary text-hive-black dark:text-gray-200">
                      {spec}
                    </Label>
                  </div>
                ))}
              </div>
              {form.formState.errors.specializations && (
                <p className="text-sm text-red-500">{form.formState.errors.specializations.message}</p>
              )}
            </div>

            <FormField
              control={form.control}
              name="therapeuticApproach"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Therapeutic Approach *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      className="border-hive-light-purple/30 focus:border-hive-purple"
                      placeholder="Describe your therapeutic approach, methods you use, and how you work with clients"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxClientsPerWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Maximum Clients Per Week *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="1"
                      max="50"
                      className="border-hive-light-purple/30 focus:border-hive-purple"
                      placeholder="10"
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="font-century text-2xl font-bold text-hive-purple dark:text-hive-light-purple mb-2">Availability</h2>
              <p className="text-hive-gray dark:text-gray-400 font-secondary">Let us know when you're available to work with clients</p>
            </div>

            <div className="space-y-4">
              <Label className="text-hive-black dark:text-gray-200 font-secondary">Weekly Availability</Label>
              <p className="text-sm text-hive-gray dark:text-gray-400 font-secondary">
                Select the days and times you're available for client sessions
              </p>
              
              {daysOfWeek.map((day) => (
                <div key={day.key} className="border border-hive-light-purple/20 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-hive-purple dark:text-hive-light-purple">{day.label}</h3>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {timeSlots.map((time) => {
                      const availabilityData = form.watch("availability") as any;
                      const isSelected = availabilityData[day.key]?.includes(time);
                      return (
                        <div key={time} className="flex items-center space-x-1">
                          <Checkbox
                            id={`${day.key}-${time}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => handleAvailabilityChange(day.key, time, !!checked)}
                            className="border-hive-purple data-[state=checked]:bg-hive-purple"
                          />
                          <Label 
                            htmlFor={`${day.key}-${time}`} 
                            className="text-xs font-secondary text-hive-black dark:text-gray-200 cursor-pointer"
                          >
                            {time}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="font-century text-2xl font-bold text-hive-purple dark:text-hive-light-purple mb-2">Personal Statement</h2>
              <p className="text-hive-gray dark:text-gray-400 font-secondary">Tell us more about yourself and your motivation</p>
            </div>

            <FormField
              control={form.control}
              name="aboutYou"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">About You *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={5}
                      className="border-hive-light-purple/30 focus:border-hive-purple"
                      placeholder="Tell us about yourself, your background, interests, and what makes you passionate about therapy (minimum 50 characters)"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="motivation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Why Hive Wellness? *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={5}
                      className="border-hive-light-purple/30 focus:border-hive-purple"
                      placeholder="What motivates you to join Hive Wellness? How do you see yourself contributing to our mission of connecting people with quality therapy? (minimum 50 characters)"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="font-century text-2xl font-bold text-hive-purple dark:text-hive-light-purple mb-2">Banking & Legal</h2>
              <p className="text-hive-gray dark:text-gray-400 font-secondary">Payment details and legal consents</p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Payment Information</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                At Hive Wellness, therapists receive exactly 85% of all session fees. We handle all payment processing, client billing, and administrative tasks.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="bankAccountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Account Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-hive-light-purple/30 focus:border-hive-purple"
                        placeholder="Account holder name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankSortCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Sort Code *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-hive-light-purple/30 focus:border-hive-purple"
                        placeholder="123456"
                        maxLength={6}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankAccountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-hive-black dark:text-gray-200 font-secondary">Account Number *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-hive-light-purple/30 focus:border-hive-purple"
                        placeholder="12345678"
                        maxLength={8}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 border-t border-hive-light-purple/20 pt-6">
              <h3 className="font-century text-lg font-bold text-hive-purple dark:text-hive-light-purple">Legal Consents</h3>
              
              <FormField
                control={form.control}
                name="gdprConsent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-hive-purple data-[state=checked]:bg-hive-purple"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-secondary text-hive-black dark:text-gray-200">
                        I consent to the processing of my personal data in accordance with Hive Wellness's{" "}
                        <a href="/privacy-policy" target="_blank" className="text-hive-purple hover:underline">
                          Privacy Policy
                        </a>{" "}
                        and UK GDPR requirements. *
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="termsConsent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-hive-purple data-[state=checked]:bg-hive-purple"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-secondary text-hive-black dark:text-gray-200">
                        I accept Hive Wellness's{" "}
                        <a href="/terms-and-conditions" target="_blank" className="text-hive-purple hover:underline">
                          Terms and Conditions
                        </a>{" "}
                        and{" "}
                        <a href="/therapist-agreement" target="_blank" className="text-hive-purple hover:underline">
                          Therapist Agreement
                        </a>
                        . *
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="marketingConsent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-hive-purple data-[state=checked]:bg-hive-purple"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-secondary text-hive-black dark:text-gray-200">
                        I would like to receive marketing communications and updates from Hive Wellness (optional)
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-hive-light-purple/20 to-white dark:from-hive-light-purple/10 dark:to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src={hiveWellnessLogo} 
            alt="Hive Wellness" 
            className="h-16 mx-auto mb-6"
          />
          <h1 className="font-century text-3xl font-bold text-hive-purple dark:text-hive-light-purple mb-2">
            Join Our Therapy Team
          </h1>
          <p className="text-hive-gray dark:text-gray-400 font-secondary">
            Complete your application to become a Hive Wellness therapist
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-secondary text-hive-black dark:text-gray-200">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm font-secondary text-hive-gray dark:text-gray-400">
              {Math.round((currentStep / totalSteps) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-hive-purple h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card className="border-hive-light-purple/20">
              <CardContent className="p-8">
                {renderStepContent()}
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="border-hive-purple text-hive-purple hover:bg-hive-purple hover:text-white"
              >
                Previous
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="bg-hive-purple hover:bg-hive-purple/90 text-white"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-hive-purple hover:bg-hive-purple/90 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}