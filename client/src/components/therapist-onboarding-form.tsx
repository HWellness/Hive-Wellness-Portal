import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UserPlus, Send, CheckCircle, Calendar, FileText, Heart } from "lucide-react";
import IntroductionCallBooking from "./IntroductionCallBooking";

interface TherapistOnboardingFormProps {
  user?: any;
  onBackToDashboard?: () => void;
  onSubmissionSuccess?: (enquiry: any) => void;
}

export default function TherapistOnboardingForm({
  user,
  onBackToDashboard,
  onSubmissionSuccess,
}: TherapistOnboardingFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEnquiry, setSubmittedEnquiry] = useState<any>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    qualifications: "",
    registrationBodies: [] as string[],
    specialisations: [] as string[],
    experience: "",
    currentPractice: "",
    caseloadCapacity: "",
    preferredClientTypes: "",
    therapeuticApproach: "",
    availability: "",
    bankDetails: "",
    emergencyContact: "",
    professionalInsurance: "",
    agreedToTerms: false,
  });

  const specialisationOptions = [
    "Anxiety and Depression",
    "Trauma and PTSD",
    "Relationship Counselling",
    "Family Therapy",
    "Cognitive Behavioural Therapy (CBT)",
    "Mindfulness-Based Therapy",
    "Child and Adolescent Therapy",
    "Addiction Counselling",
    "Grief and Loss",
    "Eating Disorders",
    "LGBTQ+ Therapy",
    "Couples Therapy",
    "Career Counselling",
    "Stress Management",
    "Other",
  ];

  const registrationBodyOptions = [
    "HCPC (Health and Care Professions Council)",
    "BPS (British Psychological Society)",
    "BACP (British Association for Counselling and Psychotherapy)",
    "UKCP (United Kingdom Council for Psychotherapy)",
    "BPC (British Psychoanalytic Council)",
    "NCS (National Counselling Society)",
    "Other Professional Body",
  ];

  const handleSpecialisationChange = (specialisation: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      specialisations: checked
        ? [...prev.specialisations, specialisation]
        : prev.specialisations.filter((s) => s !== specialisation),
    }));
  };

  const handleRegistrationBodyChange = (body: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      registrationBodies: checked
        ? [...prev.registrationBodies, body]
        : prev.registrationBodies.filter((b) => b !== body),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Comprehensive validation for complete onboarding form
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.phone ||
      !formData.address
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required personal information fields.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.qualifications || !formData.experience || !formData.currentPractice) {
      toast({
        title: "Professional Information Required",
        description: "Please complete all professional qualification and experience fields.",
        variant: "destructive",
      });
      return;
    }

    if (formData.specialisations.length === 0) {
      toast({
        title: "Specialisations Required",
        description: "Please select at least one therapy specialisation.",
        variant: "destructive",
      });
      return;
    }

    if (formData.registrationBodies.length === 0) {
      toast({
        title: "Professional Registration Required",
        description: "Please select at least one professional registration body.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.agreedToTerms) {
      toast({
        title: "Terms Agreement Required",
        description: "Please agree to the terms and conditions.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest({
        url: "/api/therapist-onboarding/enquiry",
        method: "POST",
        body: {
          ...formData,
          type: "complete_onboarding",
          status: "onboarding_completed",
        },
      });

      if (response.success) {
        setSubmittedEnquiry(response.enquiry);
        setSubmitted(true);
        toast({
          title: "Application Submitted!",
          description: "Thank you for your interest. You can now book your introduction call.",
        });

        if (onSubmissionSuccess) {
          onSubmissionSuccess(response.enquiry);
        }
      } else {
        throw new Error(response.error || "Failed to submit application");
      }
    } catch (error) {
      console.error("Error submitting therapist enquiry:", error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted && submittedEnquiry) {
    // Show booking interface if not yet booked
    if (!showBooking) {
      return (
        <div className="space-y-6">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-display font-bold text-hive-dark mb-2">
                  Application Submitted Successfully!
                </h2>
                <p className="text-hive-gray font-body text-lg">
                  Thank you for your interest in joining Hive Wellness.
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-6 mb-6">
                <Calendar className="w-12 h-12 text-hive-purple mx-auto mb-4" />
                <h3 className="text-xl font-primary font-semibold text-hive-dark mb-2">
                  Ready to Book Your Introduction Call?
                </h3>
                <p className="text-hive-gray mb-4">
                  Skip the email back-and-forth - book your 50-minute introduction call directly
                  below.
                </p>
                <Button
                  onClick={() => setShowBooking(true)}
                  className="bg-hive-purple hover:bg-hive-purple/90 text-white font-semibold px-6 py-3"
                >
                  Book Introduction Call Now
                </Button>
              </div>

              <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-hive-dark mb-2">
                  During your call, we'll discuss:
                </h4>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• Your therapy experience and approach</li>
                  <li>• Hive Wellness platform overview</li>
                  <li>• Client matching process</li>
                  <li>• Earnings and payment structure</li>
                  <li>• Next steps in onboarding</li>
                </ul>
              </div>

              <p className="text-sm text-hive-gray">
                Questions? Email us at{" "}
                <a
                  href="mailto:support@hive-wellness.co.uk"
                  className="text-hive-purple hover:underline"
                >
                  support@hive-wellness.co.uk
                </a>{" "}
                or call 020 7946 0958
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Show booking interface
    return (
      <div className="space-y-6">
        <div className="text-center mb-4">
          <Button
            variant="outline"
            onClick={() => setShowBooking(false)}
            className="text-hive-purple border-hive-purple hover:bg-purple-50"
          >
            ← Back to Success Message
          </Button>
        </div>

        <IntroductionCallBooking
          enquiryId={submittedEnquiry.id}
          therapistEmail={submittedEnquiry.email}
          therapistName={`${submittedEnquiry.firstName} ${submittedEnquiry.lastName}`}
          onBookingComplete={(callId) => {
            toast({
              title: "Introduction Call Booked!",
              description:
                "Check your email for meeting details. We look forward to speaking with you!",
            });
          }}
        />
      </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-hive-purple rounded-full flex items-center justify-center mr-3">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-hive-dark">Join Hive Wellness</h1>
              <p className="text-hive-gray font-body">
                Help clients find their perfect therapeutic match
              </p>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-primary font-semibold text-hive-dark">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-hive-dark">
                  First Name *
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Your first name"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-hive-dark">
                  Last Name *
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Your last name"
                  className="mt-1"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email" className="text-hive-dark">
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="your.email@example.com"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-hive-dark">
                Phone Number *
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="07123 456789"
                className="mt-1"
                required
              />
            </div>
          </div>

          {/* Specializations */}
          <div className="space-y-4">
            <h3 className="text-lg font-primary font-semibold text-hive-dark">
              Therapy Specialisations *
            </h3>
            <p className="text-sm text-hive-gray">Select all areas you specialise in:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {specialisationOptions.map((specialisation) => (
                <div key={specialisation} className="flex items-center space-x-2">
                  <Checkbox
                    id={specialisation}
                    checked={formData.specialisations.includes(specialisation)}
                    onCheckedChange={(checked) =>
                      handleSpecialisationChange(specialisation, checked as boolean)
                    }
                  />
                  <Label htmlFor={specialisation} className="text-sm text-hive-dark cursor-pointer">
                    {specialisation}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div className="space-y-4">
            <h3 className="text-lg font-primary font-semibold text-hive-dark">
              Experience & Qualifications
            </h3>
            <div>
              <Label htmlFor="experience" className="text-hive-dark">
                Tell us about your therapy experience, qualifications, and training
              </Label>
              <Textarea
                id="experience"
                value={formData.experience}
                onChange={(e) => setFormData((prev) => ({ ...prev, experience: e.target.value }))}
                placeholder="Please describe your therapy training, qualifications, years of experience, and any relevant certifications..."
                className="mt-1 min-h-[100px]"
                rows={4}
              />
            </div>
          </div>

          {/* Motivation */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="motivation" className="text-hive-dark">
                Why do you want to join Hive Wellness?
              </Label>
              <Textarea
                id="motivation"
                value={formData.motivation}
                onChange={(e) => setFormData((prev) => ({ ...prev, motivation: e.target.value }))}
                placeholder="Tell us what drew you to Hive Wellness and how you'd like to help our clients..."
                className="mt-1 min-h-[100px]"
                rows={4}
              />
            </div>
          </div>

          {/* Availability */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="availability" className="text-hive-dark">
                Current Availability
              </Label>
              <Textarea
                id="availability"
                value={formData.availability}
                onChange={(e) => setFormData((prev) => ({ ...prev, availability: e.target.value }))}
                placeholder="Please describe your current availability for taking on new clients (days/times, capacity, etc.)"
                className="mt-1 min-h-[80px]"
                rows={3}
              />
            </div>
          </div>

          {/* Terms Agreement */}
          <div className="space-y-4">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={formData.agreedToTerms}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, agreedToTerms: checked as boolean }))
                }
              />
              <Label
                htmlFor="terms"
                className="text-sm text-hive-dark cursor-pointer leading-relaxed"
              >
                I agree to Hive Wellness's terms and conditions, privacy policy, and professional
                standards. I understand that this is an initial enquiry and further verification of
                qualifications and registration will be required before joining the platform.
              </Label>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-hive-purple hover:bg-hive-purple/90 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting Application...
              </>
            ) : (
              <>
                <Heart className="w-4 h-4 mr-2" />
                Submit Application
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
