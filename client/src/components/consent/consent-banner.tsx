import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

interface ConsentPreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  medical_data_processing: boolean;
}

interface ConsentBannerProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  isFirstTime?: boolean;
}

const CONSENT_DESCRIPTIONS = {
  essential: {
    title: "Essential Services",
    description:
      "Required for the platform to function properly. This includes authentication, security features, and core therapy booking functionality. These cannot be disabled.",
    required: true,
  },
  functional: {
    title: "Functional Features",
    description:
      "Enhanced features such as your preferences, settings, and personalised content. Helps improve your user experience.",
    required: false,
  },
  analytics: {
    title: "Analytics & Performance",
    description:
      "Helps us understand how users interact with our platform so we can improve services and fix issues. All data is anonymised.",
    required: false,
  },
  marketing: {
    title: "Marketing Communications",
    description:
      "Receive updates about new services, therapy resources, wellness tips, and occasional promotional offers via email.",
    required: false,
  },
  medical_data_processing: {
    title: "AI-Powered Therapy Tools",
    description:
      "Enables AI-powered features such as the therapy chatbot, therapist matching algorithm, and AI assistant for session analysis. Your data remains confidential and HIPAA-compliant.",
    required: false,
  },
};

export function ConsentBanner({ open, onClose, onSave, isFirstTime = false }: ConsentBannerProps) {
  const { toast } = useToast();
  const [showCustomize, setShowCustomize] = useState(false);
  const [consents, setConsents] = useState<ConsentPreferences>({
    essential: true,
    functional: false,
    analytics: false,
    marketing: false,
    medical_data_processing: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch current consents if not first time
  const { data: currentConsents } = useQuery<{ success: boolean; consents: ConsentPreferences }>({
    queryKey: ["/api/user/consent"],
    enabled: !isFirstTime && open,
  });

  useEffect(() => {
    if (currentConsents?.consents && !isFirstTime) {
      setConsents(currentConsents.consents);
    }
  }, [currentConsents, isFirstTime]);

  const handleToggle = (key: keyof ConsentPreferences) => {
    if (key === "essential") return; // Cannot toggle essential
    setConsents((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAcceptAll = async () => {
    console.log("Accept All button clicked");
    const acceptAllPreferences = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
      medical_data_processing: true,
    };
    setConsents(acceptAllPreferences);
    await submitConsents(acceptAllPreferences);
  };

  const handleRejectAll = async () => {
    console.log("Reject Optional button clicked");
    const rejectOptionalPreferences = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
      medical_data_processing: false,
    };
    setConsents(rejectOptionalPreferences);
    await submitConsents(rejectOptionalPreferences);
  };

  const handleSaveCustom = () => {
    submitConsents(consents);
  };

  const submitConsents = async (preferences: ConsentPreferences) => {
    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/user/consent", { consents: preferences });

      // Invalidate consent query to refresh
      queryClient.invalidateQueries({ queryKey: ["/api/user/consent"] });

      toast({
        title: "Preferences saved",
        description: "Your consent preferences have been updated successfully.",
      });

      // Mark consent as given and close dialog
      onSave();
    } catch (error) {
      console.error("Error saving consents:", error);
      toast({
        title: "Error",
        description: "Failed to save consent preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        /* Prevent closing without explicit choice */
      }}
    >
      <DialogContent
        className="max-w-2xl max-h-[90vh]"
        data-testid="consent-banner-dialog"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl" data-testid="consent-banner-title">
                Your Privacy Matters
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                We respect your privacy and data protection rights
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        {!showCustomize ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We use cookies and similar technologies to provide essential services, improve
                  your experience, and analyse platform usage. You can customise your preferences or
                  accept all to continue.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                By clicking "Accept All", you consent to our use of cookies and data processing as
                described in our{" "}
                <a
                  href="https://hive-wellness.co.uk/privacy-policy/"
                  className="text-primary hover:underline font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(
                      "https://hive-wellness.co.uk/privacy-policy/",
                      "_blank",
                      "noopener,noreferrer"
                    );
                  }}
                  data-testid="link-privacy-policy"
                >
                  Privacy Policy
                </a>
                . You can change your preferences at any time in your account settings.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-sm">What we'll use:</h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li className="list-disc">Essential cookies for platform functionality</li>
                <li className="list-disc">Analytics to improve our services (if consented)</li>
                <li className="list-disc">AI-powered therapy tools (if consented)</li>
                <li className="list-disc">Marketing communications (if consented)</li>
              </ul>
            </div>
          </div>
        ) : (
          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Choose which services you'd like to enable. Essential services are required and
                cannot be disabled.
              </p>

              {(Object.keys(CONSENT_DESCRIPTIONS) as Array<keyof ConsentPreferences>).map((key) => {
                const consent = CONSENT_DESCRIPTIONS[key];
                return (
                  <div key={key} className="space-y-2" data-testid={`consent-option-${key}`}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
                            {consent.title}
                          </Label>
                          {consent.required && (
                            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{consent.description}</p>
                      </div>
                      <Switch
                        id={key}
                        checked={consents[key]}
                        onCheckedChange={() => handleToggle(key)}
                        disabled={consent.required}
                        data-testid={`consent-switch-${key}`}
                      />
                    </div>
                    {key !== "medical_data_processing" && <Separator />}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <Separator />

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!showCustomize ? (
            <>
              <Button
                variant="outline"
                onClick={() => setShowCustomize(true)}
                disabled={isSubmitting}
                data-testid="button-customize"
                className="w-full sm:w-auto"
              >
                Customise Preferences
              </Button>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={handleRejectAll}
                  disabled={isSubmitting}
                  data-testid="button-reject-all"
                  className="flex-1 sm:flex-none"
                >
                  Reject Optional
                </Button>
                <Button
                  onClick={handleAcceptAll}
                  disabled={isSubmitting}
                  data-testid="button-accept-all"
                  className="flex-1 sm:flex-none"
                >
                  Accept All
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setShowCustomize(false)}
                disabled={isSubmitting}
                data-testid="button-back"
                className="w-full sm:w-auto"
              >
                Back
              </Button>
              <Button
                onClick={handleSaveCustom}
                disabled={isSubmitting}
                data-testid="button-save-preferences"
                className="w-full sm:w-auto"
              >
                {isSubmitting ? "Saving..." : "Save Preferences"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
