import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, CheckCircle2, MapPin } from "lucide-react";
import hiveWellnessLogo from "@assets/Hive Logo_1752073128164.png";

// Complete schema based on all 9 steps from screenshots
const publicTherapistQuestionnaireSchema = z.object({
  // Step 1: Full name and email
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  
  // Step 2: Location (UK only)
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  
  // Step 3: Religion (optional)
  religion: z.string().optional(),
  
  // Step 4: Limited company
  hasLimitedCompany: z.enum(["yes", "no"]),
  supportSettingUp: z.enum(["yes", "no"]).optional(),
  hasAccountant: z.enum(["yes", "no"]).optional(),
  wantsTaxStatsReferral: z.enum(["yes", "no"]).optional(),
  
  // Step 5: Qualification level
  qualificationLevel: z.string().min(1, "Please specify your qualification level"),
  
  // Step 6: Professional body
  professionalBody: z.string().min(1, "Please specify your professional body"),
  
  // Step 7: Therapeutic approaches
  counsellingApproaches: z.array(z.string()).optional(),
  psychologicalTherapies: z.array(z.string()).optional(),
  specialistTherapies: z.array(z.string()).optional(),
  
  // Step 8: Areas of specialisation
  specialisationAreas: z.array(z.string()).min(1, "Please select at least one area of specialisation"),
  
  // Step 9: Personality traits (max 2)
  personalityTraits: z.array(z.string()).min(1, "Please select at least one trait").max(2, "Please select up to two traits"),
});

type QuestionnaireData = z.infer<typeof publicTherapistQuestionnaireSchema>;

// UK Cities list for geographic restriction
const ukCities = [
  "London", "Birmingham", "Manchester", "Liverpool", "Leeds", "Sheffield", "Bristol", "Newcastle", 
  "Cardiff", "Edinburgh", "Glasgow", "Aberdeen", "Dundee", "Stirling", "Inverness", "Perth",
  "Belfast", "Derry", "Lisburn", "Newry", "Bangor", "Armagh", "Coleraine", "Ballymena",
  "Swansea", "Newport", "Bangor", "Wrexham", "Rhyl", "Llandudno", "Aberystwyth", "Carmarthen",
  "Nottingham", "Leicester", "Coventry", "Hull", "Plymouth", "Stoke-on-Trent", "Wolverhampton",
  "Derby", "Southampton", "Portsmouth", "Brighton", "Bournemouth", "Swindon", "Reading",
  "Northampton", "Luton", "Warrington", "Southend-on-Sea", "Preston", "Blackpool", "Oldham"
];

// Counselling Approaches from Step 7
const counsellingApproaches = [
  "Counselling",
  "Emotion-Focused Therapy (EFT)",
  "Motivational Interviewing",
  "Solution-Focused Therapy"
];

// Psychological Therapies from Step 7
const psychologicalTherapies = [
  "Acceptance and Commitment Therapy (ACT)",
  "Cognitive Analytic Therapy (CAT)",
  "Cognitive Behavioural Therapy (CBT)",
  "Compassion-Focused Therapy (CFT)",
  "Dialectical Behaviour Therapy (DBT)",
  "Mindfulness-Based Cognitive Therapy (MBCT)",
  "Psychodynamic Therapy"
];

// Specialist Therapies from Step 7
const specialistTherapies = [
  "Cognitive Analytic Therapy (CAT)",
  "Dialectical Behaviour Therapy (DBT)",
  "Eye Movement Desensitisation and Reprocessing (EMDR)",
  "Psychosexual Therapy"
];

// Complete areas of specialisation from Step 8
const specialisationAreas = [
  "ADHD", "ASD", "Addiction", "Adoption", "Ageing", "Anger", "Anxiety", "Attachment Disorder",
  "Body Image", "Bullying", "Cancer", "Cultural Problems", "Demanding Job", "Depression",
  "Discrimination", "Domestic Violence", "Eating Disorder", "Family", "Bereavement", "Gambling",
  "Gaslighting", "Gender Identity", "Health Anxiety", "Infertility", "Leadership", "Loneliness",
  "Love Life", "Medical Trauma", "Menopause", "Money", "Mood Swings", "Negative Thoughts",
  "OCD", "PMS/PMDD", "Panic Attacks", "Paranoia", "Past Life Events", "Personal Development",
  "Pet Loss", "Phobias", "Physical Disability", "PTSD", "Racism", "Relationship With Food",
  "Relationships", "Religion/Spirituality", "Self-Esteem/Confidence", "Self-Harm",
  "Divorce/Separation", "Sleeping Difficulties", "Smoking", "Stress/Burnout", "Sexuality",
  "Trauma", "Traumatic Childbirth", "Work", "World Events", "Other"
];

// Personality traits from Step 9
const personalityTraits = [
  "Warm", "Approachable", "Friendly", "Sociable", "Calm", "Grounding", "Reflective",
  "Thoughtful", "Optimistic", "Encouraging", "Practical", "Solution-focused", "Compassionate",
  "Empathetic", "Creative", "Open-minded", "Organised", "Structured", "Flexible", "Adaptable",
  "Confident", "Direct", "Gentle", "Reassuring", "Relaxed", "Informal", "Energetic", "Dynamic",
  "Motivational", "Empowering", "Challenging", "Supportive", "Quiet", "Observant",
  "Professional", "Boundaried"
];

export default function PublicTherapistQuestionnaire() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const totalSteps = 9;

  const form = useForm<QuestionnaireData>({
    resolver: zodResolver(publicTherapistQuestionnaireSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      city: "",
      country: "United Kingdom",
      religion: "",
      hasLimitedCompany: "no",
      supportSettingUp: "no",
      qualificationLevel: "",
      professionalBody: "",
      counsellingApproaches: [],
      psychologicalTherapies: [],
      specialistTherapies: [],
      specialisationAreas: [],
      personalityTraits: [],
    },
  });

  const { watch, setValue, trigger } = form;
  const watchedValues = watch();

  const progress = (currentStep / totalSteps) * 100;

  const onSubmit = async (data: QuestionnaireData) => {
    try {
      setIsSubmitting(true);
      
      await apiRequest("POST", "/api/public-therapist-questionnaire", data);
      
      toast({
        title: "Questionnaire Submitted Successfully",
        description: "Thank you for your interest in joining Hive Wellness. We'll be in touch soon.",
      });
      
      setIsSubmitted(true);
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "There was an error submitting your questionnaire. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await trigger(fieldsToValidate);
    
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const getFieldsForStep = (step: number): (keyof QuestionnaireData)[] => {
    switch (step) {
      case 1: return ["firstName", "lastName", "email"];
      case 2: return ["city", "country"];
      case 3: return []; // Religion is optional
      case 4: return ["hasLimitedCompany"];
      case 5: return ["qualificationLevel"];
      case 6: return ["professionalBody"];
      case 7: return []; // At least one approach will be validated separately
      case 8: return ["specialisationAreas"];
      case 9: return ["personalityTraits"];
      default: return [];
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-hive-light-purple/20 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center shadow-xl border-0 bg-white">
          <CardContent className="p-12">
            <div className="w-16 h-16 bg-hive-purple rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-semibold text-hive-purple mb-4">
              Thank you for completing the questionnaire!
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              We appreciate you taking the time to share your details. Please schedule a 
              call with a member of our team to discuss the next steps and explore whether 
              Hive Wellness is the right fit for you.
            </p>
            <Button 
              onClick={() => {
                const email = encodeURIComponent(watchedValues.email || '');
                const firstName = encodeURIComponent(watchedValues.firstName || '');
                const lastName = encodeURIComponent(watchedValues.lastName || '');
                window.location.href = `/book-admin-call-therapist?email=${email}&firstName=${firstName}&lastName=${lastName}`;
              }}
              className="bg-hive-purple hover:bg-hive-purple/90 text-white px-8 py-3 text-lg font-semibold rounded-lg mb-4"
            >
              Book Therapist Introduction Call
            </Button>
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Hive Wellness
                <br />
                <span className="font-medium text-hive-purple">Therapy Tailored to You.</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-hive-light-purple/20 to-white">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src={hiveWellnessLogo} 
            alt="Hive Wellness" 
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-hive-purple mb-2">
            Therapist Application Questionnaire
          </h1>
          <p className="text-gray-600">
            Join our network of qualified therapists across the UK
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-hive-purple">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8">
                {/* Step 1: Full Name and Email */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-semibold text-hive-purple mb-2">
                        What is your full name?
                      </h2>
                    </div>

                    <div className="bg-hive-light-purple/10 p-6 rounded-lg space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-hive-purple font-medium">
                                First Name*
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="First Name" 
                                  {...field}
                                  className="border-hive-purple/20 focus:border-hive-purple"
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
                              <FormLabel className="text-hive-purple font-medium">
                                Last Name*
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Last Name" 
                                  {...field}
                                  className="border-hive-purple/20 focus:border-hive-purple"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="bg-hive-light-purple/10 p-6 rounded-lg">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-hive-purple font-medium">
                              Email*
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="Enter your email address" 
                                {...field}
                                className="border-hive-purple/20 focus:border-hive-purple"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Location */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-semibold text-hive-purple mb-2">
                        What is your current location?
                      </h2>
                      <p className="text-gray-600">City & Country</p>
                    </div>

                    <div className="bg-hive-light-purple/10 p-6 rounded-lg space-y-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-hive-purple font-medium">
                              City*
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="border-hive-purple/20 focus:border-hive-purple">
                                  <SelectValue placeholder="Select your city" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ukCities.map((city) => (
                                  <SelectItem key={city} value={city}>
                                    {city}
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
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-hive-purple font-medium">
                              Country*
                            </FormLabel>
                            <FormControl>
                              <Input 
                                {...field}
                                value="United Kingdom"
                                disabled
                                className="border-hive-purple/20 bg-gray-50"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Religion */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-semibold text-hive-purple mb-2">
                        What is your religion?
                      </h2>
                      <p className="text-gray-600">Optional</p>
                    </div>

                    <div className="bg-hive-light-purple/10 p-6 rounded-lg">
                      <FormField
                        control={form.control}
                        name="religion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-hive-purple font-medium">
                              Religion
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your religion (optional)" 
                                {...field}
                                className="border-hive-purple/20 focus:border-hive-purple"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Step 4: Limited Company */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-semibold text-hive-purple mb-2">
                        Do you have a registered limited company?
                      </h2>
                    </div>

                    <div className="bg-hive-light-purple/10 p-6 rounded-lg space-y-6">
                      <FormField
                        control={form.control}
                        name="hasLimitedCompany"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-hive-purple font-medium">
                              Limited Company*
                            </FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="space-y-2"
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

                      {watchedValues.hasLimitedCompany === "no" && (
                        <FormField
                          control={form.control}
                          name="supportSettingUp"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-hive-purple font-medium">
                                Would you like support setting this up?*
                              </FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  className="space-y-2"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="yes" id="support-yes" />
                                    <Label htmlFor="support-yes">Yes</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="no" id="support-no" />
                                    <Label htmlFor="support-no">No</Label>
                                  </div>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={form.control}
                        name="hasAccountant"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-hive-purple font-medium">
                              Do you currently have an accountant?*
                            </FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="space-y-2"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="yes" id="accountant-yes" />
                                  <Label htmlFor="accountant-yes">Yes</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="no" id="accountant-no" />
                                  <Label htmlFor="accountant-no">No</Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {watchedValues.hasAccountant === "no" && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-white text-sm font-bold">!</span>
                            </div>
                            <div className="flex-1">
                              <h4 className="text-blue-800 font-medium mb-2">TaxStats Accountancy Partnership</h4>
                              <p className="text-blue-700 text-sm mb-3">
                                We can connect you with TaxStats, a specialist accountancy firm that works exclusively with therapists and healthcare professionals. 
                                They understand the unique tax requirements of therapy practices and can help with company setup, tax returns, and ongoing financial management.
                              </p>
                              <FormField
                                control={form.control}
                                name="wantsTaxStatsReferral"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-blue-800 font-medium">
                                      Would you like us to connect you with TaxStats?*
                                    </FormLabel>
                                    <FormControl>
                                      <RadioGroup
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        className="space-y-2 mt-2"
                                      >
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="yes" id="taxstats-yes" />
                                          <Label htmlFor="taxstats-yes" className="text-blue-700">Yes, please connect me with TaxStats</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="no" id="taxstats-no" />
                                          <Label htmlFor="taxstats-no" className="text-blue-700">No, thank you</Label>
                                        </div>
                                      </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 5: Qualification Level */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-semibold text-hive-purple mb-2">
                        What is your highest level of qualification in psychology or therapy?
                      </h2>
                    </div>

                    <div className="bg-hive-light-purple/10 p-6 rounded-lg">
                      <FormField
                        control={form.control}
                        name="qualificationLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-hive-purple font-medium">
                              Qualification Level*
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. Masters, Doctorate, etc." 
                                {...field}
                                className="border-hive-purple/20 focus:border-hive-purple"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Step 6: Professional Body */}
                {currentStep === 6 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-semibold text-hive-purple mb-2">
                        What professional body are you registered with?
                      </h2>
                      <p className="text-gray-600">(e.g. BACP, HCPC, UKCP)</p>
                    </div>

                    <div className="bg-hive-light-purple/10 p-6 rounded-lg">
                      <FormField
                        control={form.control}
                        name="professionalBody"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-hive-purple font-medium">
                              Professional Body*
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. UKCP, BACP, HCPC" 
                                {...field}
                                className="border-hive-purple/20 focus:border-hive-purple"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Step 7: Therapeutic Approaches */}
                {currentStep === 7 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-semibold text-hive-purple mb-2">
                        Therapeutic Approach & Specialisms
                      </h2>
                      <p className="text-gray-600">Which types of therapy do you provide? (Tick all that apply)</p>
                    </div>

                    <div className="space-y-6">
                      {/* Counselling Approaches */}
                      <div className="bg-hive-light-purple/10 p-6 rounded-lg">
                        <h3 className="text-hive-purple font-medium mb-4">Counselling Approaches</h3>
                        <div className="space-y-3">
                          {counsellingApproaches.map((approach) => (
                            <FormField
                              key={approach}
                              control={form.control}
                              name="counsellingApproaches"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(approach)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value || [], approach])
                                          : field.onChange(
                                              field.value?.filter((value) => value !== approach)
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">
                                    {approach}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Psychological Therapies */}
                      <div className="bg-hive-light-purple/10 p-6 rounded-lg">
                        <h3 className="text-hive-purple font-medium mb-4">Psychological Therapies</h3>
                        <div className="space-y-3">
                          {psychologicalTherapies.map((therapy) => (
                            <FormField
                              key={therapy}
                              control={form.control}
                              name="psychologicalTherapies"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(therapy)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value || [], therapy])
                                          : field.onChange(
                                              field.value?.filter((value) => value !== therapy)
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">
                                    {therapy}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Specialist Therapies */}
                      <div className="bg-hive-light-purple/10 p-6 rounded-lg">
                        <h3 className="text-hive-purple font-medium mb-4">Specialist Therapies</h3>
                        <div className="space-y-3">
                          {specialistTherapies.map((therapy) => (
                            <FormField
                              key={therapy}
                              control={form.control}
                              name="specialistTherapies"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(therapy)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value || [], therapy])
                                          : field.onChange(
                                              field.value?.filter((value) => value !== therapy)
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">
                                    {therapy}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 8: Areas of Specialisation */}
                {currentStep === 8 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-semibold text-hive-purple mb-2">
                        What areas do you specialise or have experience in?
                      </h2>
                      <p className="text-gray-600">(Tick all that apply)</p>
                    </div>

                    <div className="bg-hive-light-purple/10 p-6 rounded-lg">
                      <h3 className="text-hive-purple font-medium mb-4">Therapist Specialisation*</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                        {specialisationAreas.map((area) => (
                          <FormField
                            key={area}
                            control={form.control}
                            name="specialisationAreas"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(area)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value || [], area])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== area)
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {area}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </div>
                  </div>
                )}

                {/* Step 9: Personality Traits */}
                {currentStep === 9 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-semibold text-hive-purple mb-2">
                        How would you describe your personality as a therapist?
                      </h2>
                      <p className="text-gray-600">Select Up To Two</p>
                    </div>

                    <div className="bg-hive-light-purple/10 p-6 rounded-lg">
                      <p className="text-sm text-gray-600 mb-4">
                        Select between 1 and 2 choices.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                        {personalityTraits.map((trait) => (
                          <FormField
                            key={trait}
                            control={form.control}
                            name="personalityTraits"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(trait)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        if ((field.value || []).length < 2) {
                                          field.onChange([...field.value || [], trait]);
                                        }
                                      } else {
                                        field.onChange(
                                          field.value?.filter((value) => value !== trait)
                                        );
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {trait}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center mt-8 pt-6 border-t">
                  {currentStep > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                      className="border-hive-purple text-hive-purple hover:bg-hive-purple hover:text-white"
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                  ) : (
                    <div></div>
                  )}

                  {currentStep < totalSteps ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      className="bg-hive-purple hover:bg-hive-purple/90"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-hive-purple hover:bg-hive-purple/90"
                    >
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  );
}