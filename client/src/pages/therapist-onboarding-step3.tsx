import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Clock, FileText, User, CreditCard } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import hiveWellnessLogo from "@assets/Hive Logo_1752073128164.png";

const personalizedOnboardingSchema = z.object({
  // Enhanced Professional Details (based on enquiry)
  specializedAreas: z.array(z.string()).min(1, "Please select at least one specialised area"),
  therapeuticApproaches: z
    .array(z.string())
    .min(1, "Please select at least one therapeutic approach"),
  clientAgeGroups: z.array(z.string()).min(1, "Please select at least one age group"),
  sessionFormats: z.array(z.string()).min(1, "Please select at least one session format"),

  // Availability Preferences
  preferredSchedule: z.object({
    mornings: z.boolean().default(false),
    afternoons: z.boolean().default(false),
    evenings: z.boolean().default(false),
    weekends: z.boolean().default(false),
  }),
  maxClientsPerWeek: z.number().min(1).max(50),
  preferredSessionLength: z.enum(["50", "60", "90"]),

  // Technology & Platform Setup
  techComfortLevel: z.enum(["beginner", "intermediate", "advanced"]),
  platformTrainingNeeded: z.boolean().default(false),
  videoCallExperience: z.enum(["none", "some", "extensive"]),

  // Business Preferences
  payoutPreference: z.enum(["daily", "weekly", "monthly"]),
  instantPayoutInterest: z.boolean().default(false),
  marketingConsent: z.boolean().default(false),
  directoryListingConsent: z.boolean().default(true),

  // Professional Development
  continuingEducationInterests: z.array(z.string()),
  supervisionNeeds: z.enum(["not_needed", "occasional", "regular"]),
  peerSupportInterest: z.boolean().default(false),

  // Client Connecting Preferences
  clientConnectingCriteria: z.object({
    genderPreference: z.enum(["no_preference", "same_gender", "different_gender"]),
    ageRangePreference: z.array(z.string()),
    issueSpecialization: z.array(z.string()),
  }),

  // Final Confirmations
  readyToStartDate: z.string().min(1, "Please provide your preferred start date"),
  additionalQuestions: z.string().optional(),
  finalConsentAgreement: z.boolean().refine((val) => val === true, "You must agree to proceed"),
});

type PersonalizedOnboardingFormData = z.infer<typeof personalizedOnboardingSchema>;

export default function TherapistOnboardingStep3() {
  const [token] = useLocation().split("?token=");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [therapistData, setTherapistData] = useState<any>(null);
  const [progress, setProgress] = useState(75); // Step 3 of 4

  const form = useForm<PersonalizedOnboardingFormData>({
    resolver: zodResolver(personalizedOnboardingSchema),
    defaultValues: {
      specializedAreas: [],
      therapeuticApproaches: [],
      clientAgeGroups: [],
      sessionFormats: [],
      preferredSchedule: {
        mornings: false,
        afternoons: false,
        evenings: false,
        weekends: false,
      },
      maxClientsPerWeek: 10,
      preferredSessionLength: "50",
      techComfortLevel: "intermediate",
      platformTrainingNeeded: false,
      videoCallExperience: "some",
      payoutPreference: "weekly",
      instantPayoutInterest: false,
      marketingConsent: false,
      directoryListingConsent: true,
      continuingEducationInterests: [],
      supervisionNeeds: "not_needed",
      peerSupportInterest: false,
      clientConnectingCriteria: {
        genderPreference: "no_preference",
        ageRangePreference: [],
        issueSpecialization: [],
      },
      readyToStartDate: "",
      additionalQuestions: "",
      finalConsentAgreement: false,
    },
  });

  // Load therapist onboarding data
  const { data: onboardingData, isError } = useQuery({
    queryKey: ["/api/therapist-onboarding/step3", token],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/therapist-onboarding/step3?token=${token}`);
      return response.json();
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (onboardingData) {
      setTherapistData(onboardingData.therapist);
      setIsLoading(false);

      // Pre-populate form with existing data if available
      if (onboardingData.existingFormData) {
        form.reset(onboardingData.existingFormData);
      }
    }
  }, [onboardingData, form]);

  const submitMutation = useMutation({
    mutationFn: async (data: PersonalizedOnboardingFormData) => {
      const response = await apiRequest("POST", "/api/therapist-onboarding/step3/submit", {
        token,
        formData: data,
      });
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Onboarding Form Completed! 🎉",
        description:
          "Thank you for completing your personalised onboarding. We'll be in touch within 24 hours with your next steps.",
      });
      setProgress(100);
      // Redirect to success page or dashboard
      setTimeout(() => {
        window.location.href = "/therapist-onboarding/success";
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "There was an error submitting your form. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Clock className="w-8 h-8 text-purple-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-lg font-semibold mb-2">Loading Your Personalised Form</h2>
            <p className="text-gray-600">
              Please wait while we prepare your onboarding experience...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !therapistData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Alert>
              <AlertDescription>
                Invalid or expired onboarding link. Please contact support@hive-wellness.co.uk for
                assistance.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-6">
            <img src={hiveWellnessLogo} alt="Hive Wellness Logo" className="h-16 mx-auto mb-4" />
          </div>
          <h1 className="text-3xl font-bold text-purple-900 mb-2">
            Welcome, {therapistData.firstName}! 🐝
          </h1>
          <p className="text-lg text-purple-700 mb-4">
            Step 3: Complete Your Personalised Onboarding
          </p>
          <div className="max-w-md mx-auto">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-gray-600 mt-2">{progress}% Complete</p>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => submitMutation.mutate(data))}
            className="space-y-8"
          >
            {/* Professional Specialisation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" />
                  Professional Specialisation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="specializedAreas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What areas do you specialise in?</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          "Anxiety & Stress",
                          "Depression",
                          "Trauma & PTSD",
                          "Relationships",
                          "Addiction",
                          "Eating Disorders",
                          "Grief & Loss",
                          "LGBTQ+ Issues",
                          "Family Therapy",
                          "Child & Adolescent",
                          "Career Counselling",
                          "Life Transitions",
                        ].map((area) => (
                          <div key={area} className="flex items-center space-x-2">
                            <Checkbox
                              checked={field.value?.includes(area)}
                              onCheckedChange={(checked) => {
                                const updatedValue = checked
                                  ? [...(field.value || []), area]
                                  : field.value?.filter((item) => item !== area) || [];
                                field.onChange(updatedValue);
                              }}
                            />
                            <Label className="text-sm font-normal">{area}</Label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="therapeuticApproaches"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Which therapeutic approaches do you use?</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          "CBT",
                          "DBT",
                          "Psychodynamic",
                          "Humanistic",
                          "Solution-Focused",
                          "Mindfulness-Based",
                          "EMDR",
                          "Systemic",
                        ].map((approach) => (
                          <div key={approach} className="flex items-center space-x-2">
                            <Checkbox
                              checked={field.value?.includes(approach)}
                              onCheckedChange={(checked) => {
                                const updatedValue = checked
                                  ? [...(field.value || []), approach]
                                  : field.value?.filter((item) => item !== approach) || [];
                                field.onChange(updatedValue);
                              }}
                            />
                            <Label className="text-sm font-normal">{approach}</Label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Availability & Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  Availability & Schedule Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="preferredSchedule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>When do you prefer to work? (Select all that apply)</FormLabel>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { key: "mornings", label: "Mornings (9AM-12PM)" },
                          { key: "afternoons", label: "Afternoons (12PM-5PM)" },
                          { key: "evenings", label: "Evenings (5PM-8PM)" },
                          { key: "weekends", label: "Weekends" },
                        ].map((time) => (
                          <div key={time.key} className="flex items-center space-x-2">
                            <Checkbox
                              checked={field.value?.[time.key as keyof typeof field.value]}
                              onCheckedChange={(checked) => {
                                field.onChange({
                                  ...field.value,
                                  [time.key]: checked,
                                });
                              }}
                            />
                            <Label>{time.label}</Label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxClientsPerWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum clients per week</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        How many therapy sessions would you like to conduct per week?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Technology & Platform */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Technology & Platform Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="techComfortLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How comfortable are you with technology?</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your comfort level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner - I need guidance</SelectItem>
                          <SelectItem value="intermediate">
                            Intermediate - I can learn quickly
                          </SelectItem>
                          <SelectItem value="advanced">Advanced - I'm very comfortable</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="platformTrainingNeeded"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Would you like one-on-one platform training?
                        </FormLabel>
                        <FormDescription>
                          We offer complimentary training sessions to help you get started
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Payment & Business Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                  Payment & Business Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="payoutPreference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How often would you like to receive payouts?</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payout frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Daily (1-3 business days)</SelectItem>
                          <SelectItem value="weekly">Weekly (Every Friday)</SelectItem>
                          <SelectItem value="monthly">Monthly (End of month)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        You receive 85% of each session fee. Hive Wellness covers all Stripe
                        processing fees.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instantPayoutInterest"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Interested in instant payouts?</FormLabel>
                        <FormDescription>
                          Get paid within minutes after each session (small fee applies)
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Final Step */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                  Ready to Start?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="readyToStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>When would you like to start seeing clients?</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>
                        We'll work with you to ensure you're fully prepared by this date
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalQuestions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Any questions or additional information?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Let us know if you have any questions or anything else you'd like to share..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="finalConsentAgreement"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          I confirm that all information provided is accurate and I'm ready to
                          proceed with onboarding
                        </FormLabel>
                        <FormDescription>
                          By checking this box, you agree to move forward with the next steps in
                          your Hive Wellness journey
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="text-center">
              <Button
                type="submit"
                size="lg"
                disabled={submitMutation.isPending}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-3 text-lg font-semibold rounded-lg shadow-lg"
              >
                {submitMutation.isPending ? (
                  <>
                    <Clock className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Complete Onboarding
                  </>
                )}
              </Button>
              <p className="text-sm text-gray-600 mt-2">
                You'll receive confirmation within 24 hours
              </p>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
