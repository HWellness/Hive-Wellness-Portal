import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Mail, User, FileText, Shield } from "lucide-react";
import TherapistMatchingQuestionnaire from "./therapist-matching-questionnaire";
import WorkWithUsForm from "./work-with-us-form";

// Lead Capture Form Schema
const leadCaptureSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
});

// PDF Test Form Schema
const pdfTestSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email address"),
    confirmEmail: z.string().email("Please enter a valid email address"),
    complianceCuff: z.string().optional(),
    comments: z.string().max(600, "Comments must be 600 characters or less").optional(),
  })
  .refine((data) => data.email === data.confirmEmail, {
    message: "Emails must match",
    path: ["confirmEmail"],
  });

// University DSA Form Schema
const universityDSASchema = z.object({
  organisationName: z.string().min(1, "Organisation name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  email: z.string().email("Please enter a valid email address"),
  message: z.string().min(1, "Message is required"),
});

// Work with Us Form Schema
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
  therapeuticSpecialisations: z.array(z.string()).optional(),

  // Step 9: Personality
  personalityTraits: z.array(z.string()).max(2, "Select up to 2 personality traits").optional(),
});

type LeadCaptureFormData = z.infer<typeof leadCaptureSchema>;
type PDFTestFormData = z.infer<typeof pdfTestSchema>;
type UniversityDSAFormData = z.infer<typeof universityDSASchema>;
type WorkWithUsFormData = z.infer<typeof workWithUsSchema>;

interface GravityFormProps {
  formType:
    | "lead-capture"
    | "pdf-test"
    | "therapist-matching"
    | "therapist-onboarding"
    | "university-dsa"
    | "work-with-us";
  title?: string;
  description?: string;
  onSuccess?: (data: any) => void;
}

export default function GravityForm({ formType, title, description, onSuccess }: GravityFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lead Capture Form
  const leadCaptureForm = useForm<LeadCaptureFormData>({
    resolver: zodResolver(leadCaptureSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
    },
  });

  // PDF Test Form
  const pdfTestForm = useForm<PDFTestFormData>({
    resolver: zodResolver(pdfTestSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      confirmEmail: "",
      complianceCuff: "",
      comments: "",
    },
  });

  const submitFormMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/forms/gravity-submit", {
        formType,
        formData: data,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Form Submitted Successfully",
        description: "Thank you for your submission. We'll be in touch soon!",
      });

      if (formType === "lead-capture") {
        leadCaptureForm.reset();
      } else {
        pdfTestForm.reset();
      }

      onSuccess?.(data);
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: "Please try again or contact support if the problem persists.",
        variant: "destructive",
      });
    },
  });

  const handleLeadCaptureSubmit = (data: LeadCaptureFormData) => {
    setIsSubmitting(true);
    submitFormMutation.mutate(data);
    setIsSubmitting(false);
  };

  const handlePDFTestSubmit = (data: PDFTestFormData) => {
    setIsSubmitting(true);
    submitFormMutation.mutate(data);
    setIsSubmitting(false);
  };

  if (formType === "lead-capture") {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-hive-purple" />
            {title || "Lead Capture (Welcome Pack)"}
          </CardTitle>
          {description && <p className="text-sm text-gray-600 mt-2">{description}</p>}
          <p className="text-sm text-gray-600">
            The lead capture form displayed on bottom of homepage for "Joining the Hive Network".
          </p>
          <p className="text-sm text-gray-500 italic">"*" indicates required fields</p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={leadCaptureForm.handleSubmit(handleLeadCaptureSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Enter your first name *</Label>
                <Input
                  id="firstName"
                  placeholder="Enter your first name"
                  {...leadCaptureForm.register("firstName")}
                />
                {leadCaptureForm.formState.errors.firstName && (
                  <p className="text-sm text-red-500 mt-1">
                    {leadCaptureForm.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Enter your last name *</Label>
                <Input
                  id="lastName"
                  placeholder="Enter your last name"
                  {...leadCaptureForm.register("lastName")}
                />
                {leadCaptureForm.formState.errors.lastName && (
                  <p className="text-sm text-red-500 mt-1">
                    {leadCaptureForm.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="email">Enter your email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...leadCaptureForm.register("email")}
              />
              {leadCaptureForm.formState.errors.email && (
                <p className="text-sm text-red-500 mt-1">
                  {leadCaptureForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
              We respect your inbox and your privacy. If you ever decide you no longer wish to
              receive our newsletters, you can easily opt out at any time. Simply click the
              'unsubscribe' link at the bottom of any of our emails, or update your preferences
              through your account settings. We're committed to ensuring you have control over the
              information you receive from us.
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || submitFormMutation.isPending}
              className="w-full bg-hive-purple hover:bg-hive-purple/90"
            >
              {isSubmitting || submitFormMutation.isPending ? "Submitting..." : "Join The Hive"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (formType === "pdf-test") {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-hive-purple" />
            {title || "PDF Test"}
          </CardTitle>
          {description && <p className="text-sm text-gray-600 mt-2">{description}</p>}
          <p className="text-sm text-gray-600">Testing PDF Contract</p>
          <p className="text-sm text-gray-500 italic">"*" indicates required fields</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={pdfTestForm.handleSubmit(handlePDFTestSubmit)} className="space-y-4">
            <div>
              <Label className="text-base font-medium">Name *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <Label htmlFor="firstName" className="text-sm text-gray-600">
                    First
                  </Label>
                  <Input id="firstName" {...pdfTestForm.register("firstName")} />
                  {pdfTestForm.formState.errors.firstName && (
                    <p className="text-sm text-red-500 mt-1">
                      {pdfTestForm.formState.errors.firstName.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-sm text-gray-600">
                    Last
                  </Label>
                  <Input id="lastName" {...pdfTestForm.register("lastName")} />
                  {pdfTestForm.formState.errors.lastName && (
                    <p className="text-sm text-red-500 mt-1">
                      {pdfTestForm.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">Email *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <Label htmlFor="email" className="text-sm text-gray-600">
                    Enter Email
                  </Label>
                  <Input id="email" type="email" {...pdfTestForm.register("email")} />
                  {pdfTestForm.formState.errors.email && (
                    <p className="text-sm text-red-500 mt-1">
                      {pdfTestForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="confirmEmail" className="text-sm text-gray-600">
                    Confirm Email
                  </Label>
                  <Input id="confirmEmail" type="email" {...pdfTestForm.register("confirmEmail")} />
                  {pdfTestForm.formState.errors.confirmEmail && (
                    <p className="text-sm text-red-500 mt-1">
                      {pdfTestForm.formState.errors.confirmEmail.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="complianceCuff" className="text-base font-medium">
                Compliance Cuff
              </Label>
              <Input
                id="complianceCuff"
                className="mt-2"
                {...pdfTestForm.register("complianceCuff")}
              />
            </div>

            <div>
              <Label htmlFor="comments" className="text-base font-medium">
                Comments
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Please let us know what's on your mind. Have a question for us? Ask away.
              </p>
              <Textarea
                id="comments"
                rows={6}
                className="mt-2"
                {...pdfTestForm.register("comments")}
              />
              <p className="text-sm text-gray-500 mt-1">0 of 600 max characters</p>
              {pdfTestForm.formState.errors.comments && (
                <p className="text-sm text-red-500 mt-1">
                  {pdfTestForm.formState.errors.comments.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || submitFormMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting || submitFormMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // University DSA Form
  const universityDSAForm = useForm<UniversityDSAFormData>({
    resolver: zodResolver(universityDSASchema),
    defaultValues: {
      organisationName: "",
      contactName: "",
      email: "",
      message: "",
    },
  });

  const handleUniversityDSASubmit = async (data: UniversityDSAFormData) => {
    try {
      setIsSubmitting(true);
      await submitFormMutation.mutateAsync({
        formType: "university-dsa",
        data,
      });

      toast({
        title: "Message Sent!",
        description: "Thank you for your inquiry. We'll get back to you soon.",
      });

      universityDSAForm.reset();
      onSuccess?.(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (formType === "university-dsa") {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-hive-purple" />
            {title || "Universities And DSA"}
          </CardTitle>
          {description && <p className="text-sm text-gray-600 mt-2">{description}</p>}
          <p className="text-sm text-gray-500 italic">"*" indicates required fields</p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={universityDSAForm.handleSubmit(handleUniversityDSASubmit)}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="organisationName" className="text-sm font-medium">
                Enter organisation name *
              </Label>
              <Input
                id="organisationName"
                placeholder="Enter organisation name"
                {...universityDSAForm.register("organisationName")}
              />
              {universityDSAForm.formState.errors.organisationName && (
                <p className="text-sm text-red-500 mt-1">
                  {universityDSAForm.formState.errors.organisationName.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="contactName" className="text-sm font-medium">
                Enter contact name *
              </Label>
              <Input
                id="contactName"
                placeholder="Enter contact name"
                {...universityDSAForm.register("contactName")}
              />
              {universityDSAForm.formState.errors.contactName && (
                <p className="text-sm text-red-500 mt-1">
                  {universityDSAForm.formState.errors.contactName.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                Enter email address *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                {...universityDSAForm.register("email")}
              />
              {universityDSAForm.formState.errors.email && (
                <p className="text-sm text-red-500 mt-1">
                  {universityDSAForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="message" className="text-sm font-medium">
                Enter your message *
              </Label>
              <Textarea
                id="message"
                placeholder="Enter your message"
                rows={8}
                {...universityDSAForm.register("message")}
              />
              {universityDSAForm.formState.errors.message && (
                <p className="text-sm text-red-500 mt-1">
                  {universityDSAForm.formState.errors.message.message}
                </p>
              )}
            </div>

            <div className="text-sm text-gray-600">
              The information you share with us through this form will be collected and processed in
              line with our{" "}
              <a href="/privacy-policy" className="text-hive-purple hover:underline">
                Privacy Policy
              </a>
              .
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || submitFormMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting || submitFormMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (formType === "work-with-us") {
    return (
      <WorkWithUsForm
        onComplete={(data) => {
          toast({
            title: "Application Submitted!",
            description:
              "Thank you for your interest in working with us. We'll review your application and get back to you soon.",
          });
          onSuccess?.(data);
        }}
      />
    );
  }

  if (formType === "therapist-matching") {
    return (
      <TherapistMatchingQuestionnaire
        onComplete={(data) => {
          toast({
            title: "Questionnaire Completed",
            description: "Your responses have been submitted for AI matching and admin review.",
          });
          onSuccess?.(data);
        }}
      />
    );
  }

  return null;
}
