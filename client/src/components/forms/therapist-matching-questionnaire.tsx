import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const questionnaireSchema = z.object({
  step1Age: z.string().min(1, "Please select an option"),
  step2FirstName: z.string().min(1, "First name is required"),
  step2LastName: z.string().min(1, "Last name is required"),
  step2Email: z.string().email("Valid email is required"),
  step3AgeRange: z.string().min(1, "Please select an age range"),
  step4Gender: z.string().min(1, "Please select your gender"),
  step5Pronouns: z.string().min(1, "Please select your pronouns"),
  step6WellbeingRating: z.number().min(0).max(10),
  step7MentalHealthSymptoms: z.array(z.string()).min(1, "Please select at least one option"),
  step8SupportAreas: z.array(z.string()).min(1, "Please select at least one area"),
  step9TherapyTypes: z.array(z.string()).min(1, "Please select at least one therapy type"),
  step10PreviousTherapy: z.string().min(1, "Please select an option"),
});

type QuestionnaireData = z.infer<typeof questionnaireSchema>;

const mentalHealthSymptoms = [
  // Overwhelmed and stressed
  {
    category: "Overwhelmed and stressed",
    items: ["Never", "Rarely", "Sometimes", "Often", "Always"],
  },
  // Anxious or worried
  { category: "Anxious or worried", items: ["Never", "Rarely", "Sometimes", "Often", "Always"] },
  // Sad or hopeless
  { category: "Sad or hopeless", items: ["Never", "Rarely", "Sometimes", "Often", "Always"] },
  // Disconnected from others
  {
    category: "Disconnected from others",
    items: ["Never", "Rarely", "Sometimes", "Often", "Always"],
  },
  // Struggling with motivation
  {
    category: "Struggling with motivation",
    items: ["Never", "Rarely", "Sometimes", "Often", "Always"],
  },
];

const supportAreas = [
  "Abuse recovery",
  "Addiction & recovery",
  "Adoption & fostering",
  "Anger management",
  "Anxiety",
  "Autism",
  "Bipolar disorder",
  "Bullying",
  "Chronic illness",
  "Codependency",
  "Coping skills",
  "Depression",
  "Domestic violence",
  "Eating disorders",
  "Emotional regulation",
  "Family conflict",
  "Grief & loss",
  "Infertility",
  "Life transitions",
  "Marital & premarital counselling",
  "Meditation & mindfulness",
  "Narcissistic abuse",
  "Obsessive-compulsive disorder",
  "Panic disorders",
  "Parenting support",
  "Phobias",
  "Psychosis",
  "PTSD",
  "Racial trauma",
  "Relationship issues",
  "Religious trauma",
  "School issues",
  "Self-esteem",
  "Self-harm",
  "Sexual abuse",
  "Sleep disorders",
  "Stress management",
  "Suicidal ideation",
  "Trauma & PTSD",
  "Weight management",
  "Work-related stress",
];

const therapyTypes = [
  "Counselling",
  "Emotion-Focused Therapy (EFT)",
  "Motivational Interviewing",
  "Solution-Focused Therapy",
  "Acceptance and Commitment Therapy (ACT)",
  "Cognitive Analytic Therapy (CAT)",
  "Cognitive Behavioural Therapy (CBT)",
  "Compassion-Focused Therapy (CFT)",
  "Dialectical Behaviour Therapy (DBT)",
  "Psychodynamic Therapy",
  "Trauma-Focused CBT",
  "Eye Movement Desensitisation and Reprocessing (EMDR)",
  "Psychosexual Therapy",
  "I don't know, this is too much choice!",
  "Other (please specify)",
];

interface TherapistMatchingQuestionnaireProps {
  onComplete?: (data: QuestionnaireData) => void;
}

export default function TherapistMatchingQuestionnaire({
  onComplete,
}: TherapistMatchingQuestionnaireProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [wellbeingRating, setWellbeingRating] = useState(5);
  const [mentalHealthResponses, setMentalHealthResponses] = useState<Record<string, string>>({});
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedSupportAreas, setSelectedSupportAreas] = useState<string[]>([]);
  const [selectedTherapyTypes, setSelectedTherapyTypes] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<QuestionnaireData>({
    resolver: zodResolver(questionnaireSchema),
    defaultValues: {
      step1Age: "",
      step2FirstName: "",
      step2LastName: "",
      step2Email: "",
      step3AgeRange: "",
      step4Gender: "",
      step5Pronouns: "",
      step6WellbeingRating: 5,
      step7MentalHealthSymptoms: [],
      step8SupportAreas: [],
      step9TherapyTypes: [],
      step10PreviousTherapy: "",
    },
  });

  const nextStep = () => {
    // Validate step 7 (mental health symptoms)
    if (currentStep === 7) {
      const allCategoriesAnswered = mentalHealthSymptoms.every(
        (symptom) =>
          mentalHealthResponses[symptom.category] &&
          mentalHealthResponses[symptom.category].trim() !== ""
      );

      if (!allCategoriesAnswered) {
        toast({
          title: "Please Complete All Questions",
          description: "Please answer all mental health frequency questions before continuing.",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep < 10) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (data: QuestionnaireData) => {
    try {
      const submissionData = {
        ...data,
        step6WellbeingRating: wellbeingRating,
        step7MentalHealthSymptoms: Object.keys(mentalHealthResponses).map(
          (key) => `${key}: ${mentalHealthResponses[key]}`
        ),
        step8SupportAreas: selectedSupportAreas,
        step9TherapyTypes: selectedTherapyTypes,
      };

      await apiRequest("POST", "/api/therapist-matching-questionnaire", submissionData);

      toast({
        title: "Questionnaire Submitted",
        description:
          "Your responses have been saved. Our AI will analyse your preferences and our admin team will review your matches.",
      });

      if (onComplete) {
        onComplete(submissionData);
      }
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your questionnaire. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Are you 18 years old or over?
              </h2>
              <p className="text-gray-600 mb-4">
                You must be 18 or older to complete this questionnaire.
              </p>
              <p className="text-gray-600 mb-6">
                If you are under 18, you will be redirected to resources appropriate for your age.
              </p>
            </div>

            <RadioGroup
              value={form.watch("step1Age")}
              onValueChange={(value) => form.setValue("step1Age", value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="yes" />
                <Label htmlFor="yes">Yes, I am 18 or over</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="no" />
                <Label htmlFor="no">No, I am under 18</Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">What is your full name?</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="Enter your first name"
                  {...form.register("step2FirstName")}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Enter your last name"
                  {...form.register("step2LastName")}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your Email address"
                {...form.register("step2Email")}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">How old are you?</h2>
              <p className="text-gray-600 mb-6">Select one</p>
            </div>

            <RadioGroup
              value={form.watch("step3AgeRange")}
              onValueChange={(value) => form.setValue("step3AgeRange", value)}
            >
              {["18-25", "26-35", "36-45", "46-55", "56-65", "Over 65"].map((range) => (
                <div key={range} className="flex items-center space-x-2">
                  <RadioGroupItem value={range} id={range} />
                  <Label htmlFor={range}>{range}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                How do you describe your gender?
              </h2>
            </div>

            <RadioGroup
              value={form.watch("step4Gender")}
              onValueChange={(value) => form.setValue("step4Gender", value)}
            >
              {["Female", "Male", "Non-binary"].map((gender) => (
                <div key={gender} className="flex items-center space-x-2">
                  <RadioGroupItem value={gender} id={gender} />
                  <Label htmlFor={gender}>{gender}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                What are your preferred pronouns?
              </h2>
            </div>

            <RadioGroup
              value={form.watch("step5Pronouns")}
              onValueChange={(value) => form.setValue("step5Pronouns", value)}
            >
              {[
                "She/Her/Hers",
                "He/Him/His",
                "They/Them/Theirs",
                "Any pronouns",
                "Prefer not to say",
              ].map((pronoun) => (
                <div key={pronoun} className="flex items-center space-x-2">
                  <RadioGroupItem value={pronoun} id={pronoun} />
                  <Label htmlFor={pronoun}>{pronoun}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Current well-being and mental health
              </h2>
              <p className="text-gray-600 mb-6">
                On a scale of 1-10 how would you rate your overall well-being right now?
              </p>
              <p className="text-sm text-gray-500 mb-6">(1 = very low, 10 = excellent)</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>0</span>
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
                <span>6</span>
                <span>7</span>
                <span>8</span>
                <span>9</span>
                <span>10</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={wellbeingRating}
                onChange={(e) => setWellbeingRating(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="text-center text-lg font-semibold text-hive-purple">
                {wellbeingRating}
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">In the past two weeks,</h2>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">how often have you felt:</h2>
            </div>

            <div className="space-y-6">
              {mentalHealthSymptoms.map((symptom) => (
                <div key={symptom.category} className="space-y-3">
                  <h3 className="font-semibold text-gray-900">{symptom.category}</h3>
                  <div className="space-y-2">
                    {symptom.items.map((item) => (
                      <div
                        key={`${symptom.category}-${item}`}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="radio"
                          id={`${symptom.category}-${item}`}
                          name={symptom.category}
                          value={item}
                          checked={mentalHealthResponses[symptom.category] === item}
                          onChange={(e) => {
                            const newResponses = { ...mentalHealthResponses };
                            newResponses[symptom.category] = e.target.value;
                            setMentalHealthResponses(newResponses);
                          }}
                          className="w-4 h-4 text-hive-purple border-gray-300 focus:ring-hive-purple"
                        />
                        <Label htmlFor={`${symptom.category}-${item}`}>{item}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                What areas do you need support with?
              </h2>
              <p className="text-gray-600 mb-6">Please select all that apply</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {supportAreas.map((area) => (
                <div key={area} className="flex items-center space-x-2">
                  <Checkbox
                    id={area}
                    checked={selectedSupportAreas.includes(area)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedSupportAreas([...selectedSupportAreas, area]);
                      } else {
                        setSelectedSupportAreas(
                          selectedSupportAreas.filter((item) => item !== area)
                        );
                      }
                    }}
                  />
                  <Label htmlFor={area} className="text-sm">
                    {area}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );

      case 9:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Are there any therapies you are interested in exploring?
              </h2>
              <p className="text-gray-600 mb-6">(It's okay if you're unsure)</p>
            </div>

            <div className="space-y-3">
              {therapyTypes.map((therapy) => (
                <div key={therapy} className="flex items-center space-x-2">
                  <Checkbox
                    id={therapy}
                    checked={selectedTherapyTypes.includes(therapy)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTherapyTypes([...selectedTherapyTypes, therapy]);
                      } else {
                        setSelectedTherapyTypes(
                          selectedTherapyTypes.filter((item) => item !== therapy)
                        );
                      }
                    }}
                  />
                  <Label htmlFor={therapy} className="text-sm">
                    {therapy}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );

      case 10:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Have you ever sought support for these difficulties before?
              </h2>
            </div>

            <RadioGroup
              value={form.watch("step10PreviousTherapy")}
              onValueChange={(value) => form.setValue("step10PreviousTherapy", value)}
            >
              {[
                "I've spoken to friends/family",
                "I have had therapy in the past",
                "I have never had therapy",
              ].map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={option} />
                  <Label htmlFor={option}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">Questionnaire</CardTitle>
            <div className="text-sm text-gray-600">Step {currentStep} of 10</div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-hive-purple h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 10) * 100}%` }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="min-h-[400px]">{renderStep()}</div>

          <div className="flex justify-between mt-8">
            <Button type="button" variant="outline" onClick={prevStep} disabled={currentStep === 1}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep < 10 ? (
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
                type="button"
                onClick={form.handleSubmit(handleSubmit)}
                className="bg-green-600 hover:bg-green-700"
              >
                Submit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
