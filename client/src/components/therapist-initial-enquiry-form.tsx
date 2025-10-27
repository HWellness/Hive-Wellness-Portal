import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UserPlus, Send, CheckCircle, Calendar, Phone } from "lucide-react";

interface TherapistInitialEnquiryFormProps {
  onSubmissionSuccess?: (enquiry: any) => void;
}

export default function TherapistInitialEnquiryForm({
  onSubmissionSuccess,
}: TherapistInitialEnquiryFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEnquiry, setSubmittedEnquiry] = useState<any>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    experience: "",
    motivation: "",
    agreedToTerms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Simple validation for enquiry form
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields to express your interest.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.agreedToTerms) {
      toast({
        title: "Terms Agreement Required",
        description: "Please agree to our terms and conditions to continue.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const enquiry = await apiRequest("POST", "/api/therapist-onboarding/enquiry", {
        ...formData,
        type: "initial_enquiry",
        status: "enquiry_submitted",
      });

      const response = await enquiry.json();
      setSubmittedEnquiry(response.enquiry);
      setSubmitted(true);
      onSubmissionSuccess?.(response.enquiry);

      toast({
        title: "Enquiry Submitted Successfully!",
        description:
          "We'll send you an email invitation to book your introduction call within 24 hours.",
        variant: "default",
      });
    } catch (error) {
      console.error("Enquiry submission error:", error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your enquiry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-3xl font-century text-hive-purple tracking-tight">
              Thank You for Your Interest!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-xl font-secondary text-hive-black/80 leading-relaxed">
              Your initial enquiry has been received successfully. We're excited to potentially
              welcome you to our therapy team.
            </p>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-century font-semibold text-hive-purple flex items-center justify-center gap-2">
                <Calendar className="h-5 w-5" />
                What Happens Next?
              </h3>

              <div className="space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-hive-purple text-white rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-semibold font-secondary text-hive-black">
                      Introduction Call Invitation
                    </p>
                    <p className="text-sm font-secondary text-gray-600">
                      You'll receive an email within 24 hours with a link to book a 15-minute
                      introduction call with our team.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-hive-blue text-white rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-semibold font-secondary text-hive-black">
                      Personal Introduction Call
                    </p>
                    <p className="text-sm font-secondary text-gray-600">
                      Meet with our team to discuss your experience, our platform, and answer any
                      questions you may have.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-hive-light-blue text-white rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-semibold font-secondary text-hive-black">
                      Complete Onboarding
                    </p>
                    <p className="text-sm font-secondary text-gray-600">
                      After the call, you'll receive detailed onboarding information to complete
                      your therapist profile.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-hive-light-purple/10 rounded-lg p-4">
              <p className="text-sm font-secondary text-hive-black">
                <strong>Questions?</strong> Contact our support team at{" "}
                <a
                  href="mailto:support@hive-wellness.co.uk"
                  className="text-hive-purple hover:underline"
                >
                  support@hive-wellness.co.uk
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold font-century text-hive-purple tracking-tight">
          Join Hive Wellness as a Therapist
        </h1>
        <p className="text-xl font-secondary text-hive-black/80 leading-relaxed">
          Express your interest in becoming part of our professional therapy network. We connect
          therapists with clients seamlessly and stress-free.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-century text-hive-purple flex items-center gap-2">
            <UserPlus className="h-6 w-6" />
            Initial Enquiry
          </CardTitle>
          <p className="font-secondary text-hive-black">
            Please provide your basic information to begin the onboarding process.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="font-secondary text-hive-purple">
                  First Name *
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                  className="border-hive-light-blue focus:border-hive-purple"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="font-secondary text-hive-purple">
                  Last Name *
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                  className="border-hive-light-blue focus:border-hive-purple"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="font-secondary text-hive-purple">
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className="border-hive-light-blue focus:border-hive-purple"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="font-secondary text-hive-purple">
                Phone Number *
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className="border-hive-light-blue focus:border-hive-purple"
                placeholder="+44 7XXX XXXXXX"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience" className="font-secondary text-hive-purple">
                Years of Therapy Experience
              </Label>
              <Input
                id="experience"
                type="text"
                value={formData.experience}
                onChange={(e) => setFormData((prev) => ({ ...prev, experience: e.target.value }))}
                className="border-hive-light-blue focus:border-hive-purple"
                placeholder="e.g. 3 years, 10+ years"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivation" className="font-secondary text-hive-purple">
                Why would you like to join Hive Wellness?
              </Label>
              <Textarea
                id="motivation"
                value={formData.motivation}
                onChange={(e) => setFormData((prev) => ({ ...prev, motivation: e.target.value }))}
                className="border-hive-light-blue focus:border-hive-purple min-h-[100px]"
                placeholder="Tell us what interests you about our platform..."
              />
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="agreedToTerms"
                checked={formData.agreedToTerms}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, agreedToTerms: checked === true }))
                }
                className="border-hive-purple data-[state=checked]:bg-hive-purple mt-1"
              />
              <Label
                htmlFor="agreedToTerms"
                className="text-sm font-secondary text-hive-black leading-relaxed"
              >
                I agree to Hive Wellness' Terms and Conditions and Privacy Policy. I understand this
                is an initial enquiry and further information will be required during the onboarding
                process. *
              </Label>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-hive-purple hover:bg-hive-purple/90 text-white font-secondary py-6 text-lg"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Submitting Enquiry...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Submit Initial Enquiry
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-hive-light-purple/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Phone className="h-6 w-6 text-hive-purple mt-1" />
            <div>
              <h3 className="font-semibold font-century text-hive-purple mb-2">Questions?</h3>
              <p className="text-sm font-secondary text-hive-black">
                If you have any questions about joining our platform, please contact us at{" "}
                <a
                  href="mailto:support@hive-wellness.co.uk"
                  className="text-hive-purple hover:underline"
                >
                  support@hive-wellness.co.uk
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
