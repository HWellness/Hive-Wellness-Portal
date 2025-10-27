import { useState } from "react";
import { HiveFormSystem } from "@/components/unified-forms/hive-form-system";
import {
  therapyMatchingConfig,
  therapistOnboardingConfig,
  contactFormConfig,
  universityDSAConfig,
} from "@/components/unified-forms/form-configs";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Brain,
  Heart,
  Users,
  GraduationCap,
  Puzzle,
  Mail,
  HandHeart,
  ArrowLeft,
} from "lucide-react";
import { Link } from "wouter";

export default function IntakePage() {
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFormComplete = (data: Record<string, any>) => {
    console.log("Form completed:", data);
    toast({
      title: "Success!",
      description: "Your form has been submitted and processed.",
    });

    // Reset to form selection after completion
    setTimeout(() => {
      setSelectedForm(null);
    }, 2000);
  };

  const formOptions = [
    {
      id: "therapy-matching",
      title: "Therapy Matching Questionnaire",
      description: "Find the perfect therapist match for your unique needs",
      icon: () => <Puzzle className="w-8 h-8" />,
      config: therapyMatchingConfig,
      triggerDescription: "Automatically triggers AI-powered therapist matching algorithm",
      color: "bg-hive-light-blue hover:bg-hive-light-blue/80 border-hive-light-blue",
    },
    {
      id: "therapist-onboarding",
      title: "Join Our Therapist Network",
      description: "Apply to become a therapist in our professional network",
      icon: () => <HandHeart className="w-8 h-8" />,
      config: therapistOnboardingConfig,
      triggerDescription: "Initiates therapist onboarding and credentialing workflow",
      color: "bg-hive-light-blue hover:bg-hive-light-blue/80 border-hive-light-blue",
    },
    {
      id: "contact-form",
      title: "Contact Us",
      description: "Get in touch with our support team",
      icon: () => <Mail className="w-8 h-8" />,
      config: contactFormConfig,
      triggerDescription: "Routes inquiry to appropriate admin team for review",
      color: "bg-hive-blue hover:bg-hive-blue/80 border-hive-blue",
    },
    {
      id: "university-dsa",
      title: "University Partnership",
      description: "Explore DSA partnership opportunities for your institution",
      icon: () => <HandHeart className="w-8 h-8" />,
      config: universityDSAConfig,
      triggerDescription: "Creates partnership proposal for institutional review",
      color: "bg-hive-light-blue hover:bg-hive-light-blue/80 border-hive-light-blue",
    },
  ];

  if (selectedForm) {
    const formConfig = formOptions.find((f) => f.id === selectedForm)?.config;
    if (!formConfig) return null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <Button variant="outline" onClick={() => setSelectedForm(null)} className="mb-6">
            ← Back to Form Selection
          </Button>

          <HiveFormSystem config={formConfig} onComplete={handleFormComplete} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-hive-neutral to-white py-12 relative">
      <div className="hexagon-pattern"></div>
      <div className="container mx-auto px-4 relative">
        {/* Back to Portal Navigation */}
        <div className="mb-8">
          <Link href="/portal">
            <Button
              variant="ghost"
              className="text-hive-purple hover:text-hive-purple hover:bg-hive-purple/10 font-secondary"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Portal
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-primary text-4xl md:text-5xl text-hive-purple mb-4 relative">
            <span className="inline-flex items-center">
              Unified Forms System
              <div className="w-6 h-6 hexagon-accent opacity-30 ml-4"></div>
            </span>
          </h1>
          <p className="text-lg text-hive-black max-w-2xl mx-auto font-secondary">
            Experience our intelligent form system with automated workflow triggers and AI-powered
            processing. Select a form below to see the unified system in action.
          </p>
        </div>

        {/* Form Selection Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {formOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <Card
                key={option.id}
                className={`${option.color} transition-all duration-200 hover:shadow-lg cursor-pointer transform hover:-translate-y-1 relative overflow-hidden`}
                onClick={() => setSelectedForm(option.id)}
              >
                <div className="absolute top-2 right-2 w-8 h-8 hexagon-accent opacity-10"></div>
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 bg-hive-purple rounded-full flex items-center justify-center mb-4 relative">
                    <div className="text-white">
                      <IconComponent />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 hexagon-accent opacity-40"></div>
                  </div>
                  <CardTitle className="font-primary text-xl text-hive-purple">
                    {option.title}
                  </CardTitle>
                  <CardDescription className="text-hive-black font-secondary">
                    {option.description}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="bg-white rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-hive-purple mb-2 font-primary">
                      Automated Workflow:
                    </h4>
                    <p className="text-sm text-hive-black font-secondary">
                      {option.triggerDescription}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-semibold text-hive-purple mb-2 font-primary">
                      Form Features:
                    </h4>
                    <ul className="text-sm text-hive-black space-y-1 font-secondary">
                      <li>• Multi-step wizard interface</li>
                      <li>• Smart validation and error handling</li>
                      <li>• Progress tracking and navigation</li>
                      <li>• Professional Hive Wellness styling</li>
                    </ul>
                  </div>

                  <Button
                    className="w-full mt-4 bg-hive-purple hover:bg-hive-purple/90 text-white font-secondary"
                    onClick={() => setSelectedForm(option.id)}
                  >
                    Start {option.title}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
