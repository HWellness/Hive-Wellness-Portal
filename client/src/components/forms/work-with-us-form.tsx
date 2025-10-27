import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, ChevronRight } from "lucide-react";

const workWithUsSchema = z.object({
  // Step 1: Personal Information
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),

  // Step 2: Location
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),

  // Step 3: Religion (optional)
  religion: z.string().optional(),

  // Step 4: Limited Company
  hasLimitedCompany: z.enum(["yes", "no"]),
  wantsSupportSettingUp: z.enum(["yes", "no"]).optional(),

  // Step 5: Qualifications
  qualificationLevel: z.string().min(1, "Qualification level is required"),

  // Step 6: Professional Body
  professionalBody: z.string().min(1, "Professional body is required"),

  // Step 7: Therapeutic Approaches
  counsellingApproaches: z.array(z.string()).optional(),
  psychologicalTherapies: z.array(z.string()).optional(),
  specialistTherapies: z.array(z.string()).optional(),

  // Step 8: Specialisations
  therapeuticSpecializations: z.array(z.string()).optional(),

  // Step 9: Personality
  personalityTraits: z.array(z.string()).max(2, "Select up to 2 personality traits").optional(),
});

type WorkWithUsFormData = z.infer<typeof workWithUsSchema>;

interface WorkWithUsFormProps {
  onComplete?: (data: WorkWithUsFormData) => void;
}

const counsellingApproaches = [
  "Counselling",
  "Emotion-Focused Therapy (EFT)",
  "Motivational Interviewing",
  "Solution-Focused Therapy",
];

const psychologicalTherapies = [
  "Acceptance and Commitment Therapy (ACT)",
  "Cognitive Analytic Therapy (CAT)",
  "Cognitive Behavioural Therapy (CBT)",
  "Compassion-Focused Therapy (CFT)",
  "Dialectical Behaviour Therapy (DBT)",
  "Mindfulness-Based Cognitive Therapy (MBCT)",
  "Psychodynamic Therapy",
  "Trauma-Focused CBT",
];

const specialistTherapies = [
  "Cognitive Analytic Therapy (CAT)",
  "Dialectical Behaviour Therapy (DBT)",
  "Eye Movement Desensitisation and Reprocessing (EMDR)",
  "Psychosexual Therapy",
  "Trauma-Focused CBT",
];

const specialisations = [
  "ADHD",
  "ASD",
  "Addiction",
  "Adoption",
  "Ageing",
  "Anger",
  "Anxiety",
  "Autism Spectrum Disorder",
  "Body Image",
  "Bullying",
  "Cancer",
  "Cultural Problems",
  "Demanding Job",
  "Depression",
  "Discrimination",
  "Domestic Violence",
  "Eating Disorder",
  "Family",
  "Bereavement",
  "Gambling",
  "Caregiving",
  "Gender Identity",
  "Health Anxiety",
  "Infertility",
  "Loneliness",
  "Loss",
  "Love Life",
  "Medical Trauma",
  "Menopause",
  "Money",
  "Mood Swings",
  "Negative Thoughts",
  "OCD",
  "PMS/PMDD",
  "Panic Attacks",
  "Parenting",
  "Past Life Events",
  "Personal Development",
  "Pet Loss",
  "Phobias",
  "Physical Disability",
  "Pregnancy",
  "Racism",
  "Relationship With Food",
  "Relationships",
  "Religion/Spirituality",
  "Self-Esteem/Confidence",
  "Self-Harm",
  "Divorce/Separation",
  "Sleeping Difficulties",
  "Smoking",
  "Stress/Burnout",
  "Sexuality",
  "Trauma",
  "Traumatic Childbirth",
  "Work",
  "World Events",
  "Other",
];

const personalityTraits = [
  "Warm",
  "Approachable",
  "Friendly",
  "Sociable",
  "Calm",
  "Grounding",
  "Reflective",
  "Thoughtful",
  "Optimistic",
  "Encouraging",
  "Practical",
  "Solution-focused",
  "Compassionate",
  "Empathetic",
  "Creative",
  "Open-minded",
  "Organised",
  "Structured",
  "Flexible",
  "Adaptable",
  "Confident",
  "Direct",
  "Gentle",
  "Reassuring",
  "Relaxed",
  "Informal",
  "Energetic",
  "Dynamic",
  "Motivational",
  "Empowering",
  "Challenging",
  "Supportive",
  "Quiet",
  "Observant",
  "Professional",
  "Boundaried",
];

export default function WorkWithUsForm({ onComplete }: WorkWithUsFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const totalSteps = 9;
  const progress = (currentStep / totalSteps) * 100;

  const form = useForm<WorkWithUsFormData>({
    resolver: zodResolver(workWithUsSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      city: "",
      country: "",
      religion: "",
      hasLimitedCompany: "no",
      wantsSupportSettingUp: "no",
      qualificationLevel: "",
      professionalBody: "",
      counsellingApproaches: [],
      psychologicalTherapies: [],
      specialistTherapies: [],
      therapeuticSpecializations: [],
      personalityTraits: [],
    },
  });

  const submitFormMutation = useMutation({
    mutationFn: async (data: { formType: string; data: any }) => {
      const response = await apiRequest("POST", "/api/forms/gravity-submit", {
        formType: data.formType,
        formData: data.data,
      });
      return response;
    },
  });

  const handleNext = async () => {
    const fields = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fields);

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const getFieldsForStep = (step: number): (keyof WorkWithUsFormData)[] => {
    switch (step) {
      case 1:
        return ["firstName", "lastName", "email"];
      case 2:
        return ["city", "country"];
      case 3:
        return ["religion"];
      case 4:
        return ["hasLimitedCompany", "wantsSupportSettingUp"];
      case 5:
        return ["qualificationLevel"];
      case 6:
        return ["professionalBody"];
      case 7:
        return ["counsellingApproaches", "psychologicalTherapies", "specialistTherapies"];
      case 8:
        return ["therapeuticSpecializations"];
      case 9:
        return ["personalityTraits"];
      default:
        return [];
    }
  };

  const handleSubmit = async (data: WorkWithUsFormData) => {
    try {
      setIsSubmitting(true);
      await submitFormMutation.mutateAsync({
        formType: "work-with-us",
        data,
      });

      toast({
        title: "Application Submitted!",
        description:
          "Thank you for your interest in working with us. We'll review your application and get back to you soon.",
      });

      onComplete?.(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-4">What is your full name?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="First Name" {...form.register("firstName")} />
                  {form.formState.errors.firstName && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.firstName.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Last Name" {...form.register("lastName")} />
                  {form.formState.errors.lastName && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.email.message}</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">What is your current location?</h2>
            <p className="text-sm text-gray-600 mb-4">City & Country</p>
            <div>
              <Label htmlFor="city">City *</Label>
              <Input id="city" placeholder="Enter your city" {...form.register("city")} />
              {form.formState.errors.city && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.city.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="country">Country *</Label>
              <Input id="country" placeholder="Enter your country" {...form.register("country")} />
              {form.formState.errors.country && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.country.message}</p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">What is your religion?</h2>
            <p className="text-sm text-gray-600 mb-4">Optional</p>
            <div>
              <Label htmlFor="religion">Religion</Label>
              <Input
                id="religion"
                placeholder="Enter your religion (optional)"
                {...form.register("religion")}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">
              Do you have a registered limited company?
            </h2>
            <div>
              <Label className="text-sm font-medium mb-2 block">Limited Company *</Label>
              <RadioGroup
                value={form.watch("hasLimitedCompany")}
                onValueChange={(value: "yes" | "no") => form.setValue("hasLimitedCompany", value)}
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
              {form.formState.errors.hasLimitedCompany && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.hasLimitedCompany.message}
                </p>
              )}
            </div>

            {form.watch("hasLimitedCompany") === "no" && (
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Would you like support setting this up? *
                </Label>
                <RadioGroup
                  value={form.watch("wantsSupportSettingUp")}
                  onValueChange={(value: "yes" | "no") =>
                    form.setValue("wantsSupportSettingUp", value)
                  }
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
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">
              What is your highest level of qualification in psychology or therapy?
            </h2>
            <div>
              <Label htmlFor="qualificationLevel">Qualification Level *</Label>
              <Input
                id="qualificationLevel"
                placeholder="Enter your qualification level"
                {...form.register("qualificationLevel")}
              />
              {form.formState.errors.qualificationLevel && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.qualificationLevel.message}
                </p>
              )}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">
              What professional body are you registered with?
            </h2>
            <p className="text-sm text-gray-600 mb-4">(e.g. BACP, HCPC, UKCP)</p>
            <div>
              <Label htmlFor="professionalBody">Professional Body *</Label>
              <Input
                id="professionalBody"
                placeholder="Enter your professional body"
                {...form.register("professionalBody")}
              />
              {form.formState.errors.professionalBody && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.professionalBody.message}
                </p>
              )}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">Therapeutic Approach & Specialisms</h2>
            <p className="text-sm text-gray-600 mb-4">
              Which types of therapy do you provide? (Tick all that apply)
            </p>

            <div>
              <Label className="text-base font-medium mb-3 block">Counselling Approaches</Label>
              <div className="grid grid-cols-1 gap-2">
                {counsellingApproaches.map((approach) => (
                  <div key={approach} className="flex items-center space-x-2">
                    <Checkbox
                      id={`counselling-${approach}`}
                      checked={form.watch("counsellingApproaches")?.includes(approach)}
                      onCheckedChange={(checked) => {
                        const current = form.watch("counsellingApproaches") || [];
                        if (checked) {
                          form.setValue("counsellingApproaches", [...current, approach]);
                        } else {
                          form.setValue(
                            "counsellingApproaches",
                            current.filter((a) => a !== approach)
                          );
                        }
                      }}
                    />
                    <Label htmlFor={`counselling-${approach}`} className="text-sm">
                      {approach}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium mb-3 block">Psychological Therapies</Label>
              <div className="grid grid-cols-1 gap-2">
                {psychologicalTherapies.map((therapy) => (
                  <div key={therapy} className="flex items-center space-x-2">
                    <Checkbox
                      id={`psychological-${therapy}`}
                      checked={form.watch("psychologicalTherapies")?.includes(therapy)}
                      onCheckedChange={(checked) => {
                        const current = form.watch("psychologicalTherapies") || [];
                        if (checked) {
                          form.setValue("psychologicalTherapies", [...current, therapy]);
                        } else {
                          form.setValue(
                            "psychologicalTherapies",
                            current.filter((t) => t !== therapy)
                          );
                        }
                      }}
                    />
                    <Label htmlFor={`psychological-${therapy}`} className="text-sm">
                      {therapy}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium mb-3 block">Specialist Therapies</Label>
              <div className="grid grid-cols-1 gap-2">
                {specialistTherapies.map((therapy) => (
                  <div key={therapy} className="flex items-center space-x-2">
                    <Checkbox
                      id={`specialist-${therapy}`}
                      checked={form.watch("specialistTherapies")?.includes(therapy)}
                      onCheckedChange={(checked) => {
                        const current = form.watch("specialistTherapies") || [];
                        if (checked) {
                          form.setValue("specialistTherapies", [...current, therapy]);
                        } else {
                          form.setValue(
                            "specialistTherapies",
                            current.filter((t) => t !== therapy)
                          );
                        }
                      }}
                    />
                    <Label htmlFor={`specialist-${therapy}`} className="text-sm">
                      {therapy}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">
              What areas do you specialise or have experience in?
            </h2>
            <p className="text-sm text-gray-600 mb-4">(Tick all that apply)</p>

            <div>
              <Label className="text-base font-medium mb-3 block">Therapy Specialisation *</Label>
              <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {specialisations.map((spec) => (
                  <div key={spec} className="flex items-center space-x-2">
                    <Checkbox
                      id={`spec-${spec}`}
                      checked={form.watch("therapeuticSpecializations")?.includes(spec)}
                      onCheckedChange={(checked) => {
                        const current = form.watch("therapeuticSpecializations") || [];
                        if (checked) {
                          form.setValue("therapeuticSpecializations", [...current, spec]);
                        } else {
                          form.setValue(
                            "therapeuticSpecializations",
                            current.filter((s) => s !== spec)
                          );
                        }
                      }}
                    />
                    <Label htmlFor={`spec-${spec}`} className="text-sm">
                      {spec}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">
              How would you describe your personality as a therapist?
            </h2>
            <p className="text-sm text-gray-600 mb-4">Select Up To Two</p>
            <p className="text-sm text-gray-500 mb-4">Select between 1 and 2 choices:</p>

            <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
              {personalityTraits.map((trait) => (
                <div key={trait} className="flex items-center space-x-2">
                  <Checkbox
                    id={`trait-${trait}`}
                    checked={form.watch("personalityTraits")?.includes(trait)}
                    onCheckedChange={(checked) => {
                      const current = form.watch("personalityTraits") || [];
                      if (checked && current.length < 2) {
                        form.setValue("personalityTraits", [...current, trait]);
                      } else if (!checked) {
                        form.setValue(
                          "personalityTraits",
                          current.filter((t) => t !== trait)
                        );
                      }
                    }}
                    disabled={
                      !form.watch("personalityTraits")?.includes(trait) &&
                      (form.watch("personalityTraits")?.length || 0) >= 2
                    }
                  />
                  <Label htmlFor={`trait-${trait}`} className="text-sm">
                    {trait}
                  </Label>
                </div>
              ))}
            </div>
            {form.formState.errors.personalityTraits && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.personalityTraits.message}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900">Work With Us</CardTitle>
            <p className="text-sm text-gray-500 italic">"*" indicates required fields</p>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Step {currentStep} of {totalSteps}
                </span>
                <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {renderStep()}

              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="bg-hive-purple hover:bg-hive-purple/90"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting || submitFormMutation.isPending}
                    className="bg-hive-purple hover:bg-hive-purple/90"
                  >
                    {isSubmitting || submitFormMutation.isPending ? "Submitting..." : "Submit"}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
