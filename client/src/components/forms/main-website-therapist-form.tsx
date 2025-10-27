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
import { User, CheckCircle } from "lucide-react";
import IntroductionCallBooking from "@/components/IntroductionCallBooking";

// Schema exactly matching the main website form structure
const therapistEnquirySchema = z.object({
  // 1. What is your full name?
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),

  // 2. What is your email address?
  email: z.string().email("Please enter a valid email address"),

  // 3. What are your professional qualifications?
  professionalQualifications: z
    .array(z.string())
    .min(1, "Please select at least one professional qualification"),

  // 4. How many years therapy experience do you have?
  therapyExperience: z.string().min(1, "Please select your experience level"),

  // 5. What are your areas of specialism?
  areasOfSpecialism: z.array(z.string()).min(1, "Please select at least one area of specialism"),

  // 6. What professional body are you registered with?
  professionalBody: z.string().min(1, "Please specify your professional body registration"),

  // 7. What therapeutic approaches do you use?
  therapeuticApproaches: z
    .array(z.string())
    .min(1, "Please select at least one therapeutic approach"),

  // 8. What is your preferred session schedule?
  sessionSchedule: z.string().min(1, "Please select your preferred session schedule"),

  // 9. Please provide a professional bio that clients will see?
  professionalBio: z.string().min(50, "Please provide a professional bio (minimum 50 characters)"),
});

type TherapistEnquiryData = z.infer<typeof therapistEnquirySchema>;

// Data exactly matching the main website form
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

const areasOfSpecialism = ["Anxiety and Depression", "Trauma and PTSD"];

const therapeuticApproaches = ["CBT", "DBT", "ACT"];

const sessionSchedules = ["Full time", "Part time", "Limited", "As needed basis"];

export default function MainWebsiteTherapistForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEnquiry, setSubmittedEnquiry] = useState<any>(null);
  const { toast } = useToast();

  const form = useForm<TherapistEnquiryData>({
    resolver: zodResolver(therapistEnquirySchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      professionalQualifications: [],
      therapyExperience: "",
      areasOfSpecialism: [],
      professionalBody: "",
      therapeuticApproaches: [],
      sessionSchedule: "",
      professionalBio: "",
    },
  });

  const onSubmit = async (data: TherapistEnquiryData) => {
    setIsSubmitting(true);

    try {
      const response = await apiRequest("POST", "/api/therapist-applications", data);
      const result = await response.json();

      toast({
        title: "Application Submitted Successfully!",
        description: "Thank you for your interest. We'll be in touch within 2 business days.",
      });

      setIsSubmitted(true);
      setSubmittedEnquiry(result);
    } catch (error: any) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle multi-select checkboxes
  const handleArrayFieldChange = (
    fieldName: keyof TherapistEnquiryData,
    value: string,
    checked: boolean
  ) => {
    const currentValues = form.getValues(fieldName) as string[];
    if (checked) {
      form.setValue(fieldName, [...currentValues, value] as any);
    } else {
      form.setValue(fieldName, currentValues.filter((v) => v !== value) as any);
    }
  };

  // Show success state with introduction call booking
  if (isSubmitted && submittedEnquiry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-hive-light-purple/20 to-white p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-century text-hive-purple">
                Application Submitted Successfully!
              </CardTitle>
              <p className="text-hive-gray font-secondary">
                Thank you for your interest in joining the Hive Wellness therapy team.
              </p>
            </CardHeader>
            <CardContent>
              <IntroductionCallBooking
                enquiryId={submittedEnquiry.id}
                therapistEmail=""
                therapistName=""
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-8 border-b border-gray-100">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-hive-purple rounded-full mb-4">
                <User className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Join Hive Wellness</h1>
              <p className="text-gray-600">Help clients find their perfect therapeutic match</p>
            </div>
          </div>

          <div className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Personal Information */}
                <div className="space-y-6">
                  <div className="container">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6">
                      Personal Information
                    </h2>

                    {/* Name Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700 mb-2 block">
                              First Name *
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-hive-purple focus:border-transparent"
                                placeholder="Your first name"
                              />
                            </FormControl>
                            <FormMessage className="text-sm text-red-600 mt-1" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700 mb-2 block">
                              Last Name *
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-hive-purple focus:border-transparent"
                                placeholder="Your last name"
                              />
                            </FormControl>
                            <FormMessage className="text-sm text-red-600 mt-1" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Email Address */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700 mb-2 block">
                            Email Address *
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-hive-purple focus:border-transparent"
                              placeholder="your.email@example.com"
                            />
                          </FormControl>
                          <FormMessage className="text-sm text-red-600 mt-1" />
                        </FormItem>
                      )}
                    />

                    {/* Phone Number */}
                    <FormField
                      control={form.control}
                      name="professionalBody"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700 mb-2 block">
                            Phone Number *
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="tel"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-hive-purple focus:border-transparent"
                              placeholder="07123 456789"
                            />
                          </FormControl>
                          <FormMessage className="text-sm text-red-600 mt-1" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Therapy Specialisations */}
                  <div className="space-y-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Therapy Specialisations *
                    </h2>
                    <p className="text-sm text-gray-600 mb-6">
                      Select all areas you specialise in:
                    </p>

                    <FormField
                      control={form.control}
                      name="areasOfSpecialism"
                      render={() => (
                        <FormItem>
                          <FormLabel className="text-hive-black font-secondary font-semibold">
                            What are your professional qualifications? *
                          </FormLabel>
                          <div className="space-y-3">
                            {professionalQualifications.map((qualification) => (
                              <div key={qualification} className="flex items-center space-x-2">
                                <Checkbox
                                  id={qualification}
                                  onCheckedChange={(checked) =>
                                    handleArrayFieldChange(
                                      "professionalQualifications",
                                      qualification,
                                      checked as boolean
                                    )
                                  }
                                  className="border-hive-light-purple data-[state=checked]:bg-hive-purple"
                                />
                                <Label
                                  htmlFor={qualification}
                                  className="text-hive-black font-secondary cursor-pointer"
                                >
                                  {qualification}
                                </Label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 4. How many years therapy experience do you have? */}
                    <FormField
                      control={form.control}
                      name="therapyExperience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-hive-black font-secondary font-semibold">
                            How many years therapy experience do you have? *
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="border-hive-light-purple/30 focus:border-hive-purple">
                                <SelectValue placeholder="Select your experience level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {therapyExperience.map((level) => (
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
                  </div>

                  {/* Therapy Specialisations */}
                  <div className="space-y-6">
                    <h3 className="font-century text-xl font-bold text-hive-purple border-b border-hive-light-purple/30 pb-2">
                      Therapy Specialisations
                    </h3>

                    {/* 5. What are your areas of specialism? */}
                    <FormField
                      control={form.control}
                      name="areasOfSpecialism"
                      render={() => (
                        <FormItem>
                          <FormLabel className="text-hive-black font-secondary font-semibold">
                            What are your areas of specialism? *
                          </FormLabel>
                          <p className="text-sm text-hive-gray font-secondary">
                            Select all areas you specialise in:
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {areasOfSpecialism.map((area) => (
                              <div key={area} className="flex items-center space-x-2">
                                <Checkbox
                                  id={area}
                                  onCheckedChange={(checked) =>
                                    handleArrayFieldChange(
                                      "areasOfSpecialism",
                                      area,
                                      checked as boolean
                                    )
                                  }
                                  className="border-hive-light-purple data-[state=checked]:bg-hive-purple"
                                />
                                <Label
                                  htmlFor={area}
                                  className="text-hive-black font-secondary cursor-pointer"
                                >
                                  {area}
                                </Label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 6. What professional body are you registered with? */}
                    <FormField
                      control={form.control}
                      name="professionalBody"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-hive-black font-secondary font-semibold">
                            What professional body are you registered with? *
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="border-hive-light-purple/30 focus:border-hive-purple"
                              placeholder="e.g. BACP, UKCP, BPS, etc."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 7. What therapeutic approaches do you use? */}
                    <FormField
                      control={form.control}
                      name="therapeuticApproaches"
                      render={() => (
                        <FormItem>
                          <FormLabel className="text-hive-black font-secondary font-semibold">
                            What therapeutic approaches do you use? *
                          </FormLabel>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {therapeuticApproaches.map((approach) => (
                              <div key={approach} className="flex items-center space-x-2">
                                <Checkbox
                                  id={approach}
                                  onCheckedChange={(checked) =>
                                    handleArrayFieldChange(
                                      "therapeuticApproaches",
                                      approach,
                                      checked as boolean
                                    )
                                  }
                                  className="border-hive-light-purple data-[state=checked]:bg-hive-purple"
                                />
                                <Label
                                  htmlFor={approach}
                                  className="text-hive-black font-secondary cursor-pointer"
                                >
                                  {approach}
                                </Label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Schedule & Bio */}
                  <div className="space-y-6">
                    <h3 className="font-century text-xl font-bold text-hive-purple border-b border-hive-light-purple/30 pb-2">
                      Schedule & Professional Bio
                    </h3>

                    {/* 8. What is your preferred session schedule? */}
                    <FormField
                      control={form.control}
                      name="sessionSchedule"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-hive-black font-secondary font-semibold">
                            What is your preferred session schedule? *
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="border-hive-light-purple/30 focus:border-hive-purple">
                                <SelectValue placeholder="Select your preferred schedule" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {sessionSchedules.map((schedule) => (
                                <SelectItem key={schedule} value={schedule}>
                                  {schedule}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 9. Please provide a professional bio that clients will see? */}
                    <FormField
                      control={form.control}
                      name="professionalBio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-hive-black font-secondary font-semibold">
                            Please provide a professional bio that clients will see? *
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              className="border-hive-light-purple/30 focus:border-hive-purple min-h-[120px]"
                              placeholder="Please describe your therapy training, qualifications, years of experience, and any relevant certifications..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6 border-t border-hive-light-purple/20">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-hive-purple hover:bg-hive-purple/90 text-white font-secondary font-semibold py-3 rounded-lg transition-all duration-300 hover:shadow-lg disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                          Submitting Application...
                        </div>
                      ) : (
                        "Submit Application"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
