import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, Clock, Award, FileText, CheckCircle, Upload, Camera } from "lucide-react";
import hiveWellnessLogo from "@assets/Hive Logo_1752073128164.png";

const therapistEnquirySchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  location: z.string().min(2, "Please enter your location"),
  qualifications: z.string().min(10, "Please provide your qualifications"),
  specializations: z.array(z.string()).min(1, "Please select at least one specialisation"),
  experience: z.string().min(1, "Please select your experience level"),
  availability: z.object({
    days: z.array(z.string()).min(1, "Please select available days"),
    hours: z.string().min(1, "Please select preferred hours"),
  }),
  currentClients: z.string(),
  aboutYou: z
    .string()
    .min(50, "Please provide more details about yourself (minimum 50 characters)"),
  motivation: z.string().min(50, "Please explain your motivation (minimum 50 characters)"),
  profilePhoto: z.string().optional(),
  gdprConsent: z.boolean().refine((val) => val === true, "You must consent to data processing"),
  marketingConsent: z.boolean().optional(),
});

type TherapistEnquiryData = z.infer<typeof therapistEnquirySchema>;

const specializations = [
  "Anxiety Disorders",
  "Depression",
  "Trauma & PTSD",
  "Relationship Issues",
  "Addiction & Substance Abuse",
  "Eating Disorders",
  "ADHD",
  "Autism Spectrum",
  "Grief & Loss",
  "LGBTQ+ Support",
  "Adolescent Therapy",
  "Family Therapy",
  "Cognitive Behavioural Therapy (CBT)",
  "Mindfulness-Based Therapy",
  "Psychodynamic Therapy",
];

const experienceLevels = [
  "Newly qualified (0-2 years)",
  "Developing therapist (2-5 years)",
  "Experienced therapist (5-10 years)",
  "Senior therapist (10+ years)",
];

const availableDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const preferredHours = [
  "Early morning (7am-10am)",
  "Morning (10am-1pm)",
  "Afternoon (1pm-5pm)",
  "Evening (5pm-8pm)",
  "Late evening (8pm+)",
];

export default function TherapistEnquiryForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");

  const form = useForm<TherapistEnquiryData>({
    resolver: zodResolver(therapistEnquirySchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      location: "",
      qualifications: "",
      specializations: [],
      experience: "",
      availability: {
        days: [],
        hours: "",
      },
      currentClients: "",
      aboutYou: "",
      motivation: "",
      profilePhoto: "",
      gdprConsent: false,
      marketingConsent: false,
    },
  });

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Upload profile photo
      const formData = new FormData();
      formData.append("profilePhoto", file);

      const response = await apiRequest("POST", "/api/upload-profile-photo", formData);

      if (response.ok) {
        const result = await response.json();
        setProfilePhotoUrl(result.fileUrl);
        form.setValue("profilePhoto", result.fileUrl);

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
      // Submit therapist enquiry to the new API endpoint
      const response = await apiRequest("POST", "/api/therapist-applications", {
        ...data,
        profilePhoto: profilePhotoUrl,
      });

      toast({
        title: "Application Submitted Successfully!",
        description:
          "Thank you for your interest. We'll be in touch within 2 business days to schedule your introduction call.",
      });

      setIsSubmitted(true);
    } catch (error: any) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="flex items-center justify-center mb-8">
              <img src={hiveWellnessLogo} alt="Hive Wellness Logo" className="h-20 w-auto" />
            </div>
            <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-6" />
            <h1 className="text-3xl font-primary text-hive-purple mb-4 font-bold">
              Application Submitted!
            </h1>
            <p className="text-lg font-secondary text-hive-black/80 mb-8">
              Thank you for your interest in joining Hive Wellness. We've received your application
              and will be in touch within 2 business days to schedule your introduction call.
            </p>
            <div className="bg-hive-light-blue/30 rounded-lg p-6 mb-8">
              <h3 className="font-primary font-semibold text-hive-black mb-4">
                What happens next?
              </h3>
              <div className="space-y-3 text-left">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-hive-purple rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p className="font-secondary text-sm text-hive-black/70">
                    You'll receive a branded email with a calendar link to book your introduction
                    call
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-hive-purple rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p className="font-secondary text-sm text-hive-black/70">
                    After the call, you'll get a unique onboarding link to complete your profile
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-hive-purple rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p className="font-secondary text-sm text-hive-black/70">
                    Set up Stripe Connect to receive 85% of session fees instantly
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <img src={hiveWellnessLogo} alt="Hive Wellness Logo" className="h-16 w-auto" />
          </div>
          <h1 className="text-4xl font-primary text-hive-purple mb-4 font-bold">
            Join Hive Wellness
          </h1>
          <p className="text-xl font-secondary text-hive-black/80 max-w-2xl mx-auto">
            Help us connect clients with the right therapist for their unique needs. Start your
            journey with us today.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="font-primary text-hive-purple flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-secondary">First Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="font-secondary" />
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
                        <FormLabel className="font-secondary">Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="font-secondary" />
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
                        <FormLabel className="font-secondary">Email Address</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" className="font-secondary" />
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
                        <FormLabel className="font-secondary">Phone Number</FormLabel>
                        <FormControl>
                          <Input {...field} className="font-secondary" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-secondary">Location (City, Country)</FormLabel>
                      <FormControl>
                        <Input {...field} className="font-secondary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Profile Photo Upload */}
                <div className="space-y-3">
                  <Label className="font-secondary">Profile Photo (Optional)</Label>
                  <div className="flex items-center space-x-4">
                    {profilePhotoUrl ? (
                      <div className="relative">
                        <img
                          src={profilePhotoUrl}
                          alt="Profile preview"
                          className="w-20 h-20 rounded-full object-cover border-2 border-hive-purple/30"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                          onClick={() => {
                            setProfilePhotoUrl("");
                            form.setValue("profilePhoto", "");
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-hive-purple/10 flex items-center justify-center border-2 border-dashed border-hive-purple/30">
                        <Camera className="w-8 h-8 text-hive-purple/60" />
                      </div>
                    )}
                    <div className="flex-1">
                      <label htmlFor="photo-upload" className="cursor-pointer">
                        <div className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                          <Upload className="w-4 h-4" />
                          <span className="font-secondary text-sm">
                            {profilePhotoUrl ? "Change Photo" : "Upload Photo"}
                          </span>
                        </div>
                        <input
                          id="photo-upload"
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1 font-secondary">
                        Professional headshot recommended (JPG, PNG, max 5MB)
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="font-primary text-hive-purple flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  Professional Background
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="qualifications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-secondary">Qualifications & Credentials</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="font-secondary min-h-24"
                          placeholder="Please list your relevant qualifications, certifications, and professional memberships..."
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
                      <FormLabel className="font-secondary">Experience Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="font-secondary">
                            <SelectValue placeholder="Select your experience level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {experienceLevels.map((level) => (
                            <SelectItem key={level} value={level} className="font-secondary">
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specializations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-secondary">Areas of Specialisation</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                        {specializations.map((specialization) => (
                          <div key={specialization} className="flex items-center space-x-2">
                            <Checkbox
                              id={specialization}
                              checked={field.value?.includes(specialization)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, specialization]);
                                } else {
                                  field.onChange(current.filter((item) => item !== specialization));
                                }
                              }}
                            />
                            <label
                              htmlFor={specialization}
                              className="text-sm font-secondary cursor-pointer"
                            >
                              {specialization}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currentClients"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-secondary">Current Client Load</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="font-secondary"
                          placeholder="e.g., 15 clients per week"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="font-primary text-hive-purple flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Availability
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="availability.days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-secondary">Available Days</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                        {availableDays.map((day) => (
                          <div key={day} className="flex items-center space-x-2">
                            <Checkbox
                              id={day}
                              checked={field.value?.includes(day)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, day]);
                                } else {
                                  field.onChange(current.filter((item) => item !== day));
                                }
                              }}
                            />
                            <label htmlFor={day} className="text-sm font-secondary cursor-pointer">
                              {day}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="availability.hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-secondary">Preferred Hours</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="font-secondary">
                            <SelectValue placeholder="Select your preferred working hours" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {preferredHours.map((hours) => (
                            <SelectItem key={hours} value={hours} className="font-secondary">
                              {hours}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="font-primary text-hive-purple flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  About You
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="aboutYou"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-secondary">
                        Tell us about yourself and your therapeutic approach
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="font-secondary min-h-32"
                          placeholder="Share your therapeutic philosophy, approach to working with clients, and what makes you passionate about therapy..."
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
                      <FormLabel className="font-secondary">
                        Why do you want to join Hive Wellness?
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="font-secondary min-h-32"
                          placeholder="What attracts you to our platform and how do you see yourself contributing to our mission..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="pt-6 space-y-4">
                <FormField
                  control={form.control}
                  name="gdprConsent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-secondary text-sm">
                          I consent to Hive Wellness processing my personal data in accordance with
                          the UK Data Protection Act 2018 and GDPR for the purpose of evaluating my
                          application and potential onboarding. *
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
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-secondary text-sm">
                          I would like to receive updates about Hive Wellness platform developments
                          and opportunities via email.
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-12 py-3 bg-hive-purple hover:bg-hive-purple/90 text-white font-secondary font-medium text-lg rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Submitting Application...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
