import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface TherapyCategory {
  id: string;
  name: string;
  description: string;
  price: string;
  availableTherapistTypes: string[];
}

interface TherapistCategoriesResponse {
  therapistName: string;
  therapistId: string;
  categories: TherapyCategory[];
}

interface TherapyOption {
  id: string;
  title: string;
  price: number;
  description: string;
  therapistTypes: string[];
  tier: string;
  color: string;
}

// Fallback hardcoded options for non-authenticated users or when no therapist is assigned
const defaultTherapyOptions: TherapyOption[] = [
  {
    id: "default-1",
    title: "Counselling Approaches",
    price: 65,
    description:
      "Gentle, supportive therapy to help you navigate life's challenges, improve emotional resilience, and build healthier coping strategies.",
    therapistTypes: ["Counsellor", "Psychosexual Therapist"],
    tier: "counsellor",
    color: "from-purple-500 to-purple-600",
  },
  {
    id: "default-2",
    title: "CBT & Psychotherapy",
    price: 80,
    description:
      "Evidence-based therapies to help manage your thoughts, feelings, and behaviours. Suitable for adults seeking help with issues such as stress, low mood, anxiety, or relationship difficulties.",
    therapistTypes: ["Cognitive Behavioural Therapist", "Psychotherapist"],
    tier: "psychotherapist",
    color: "from-blue-500 to-blue-600",
  },
  {
    id: "default-3",
    title: "Psychological Therapies",
    price: 90,
    description:
      "Targeted support for adult mental health concerns like anxiety disorders, depression, or trauma. These therapies use advanced, evidence-based techniques to shift thought patterns and behaviours.",
    therapistTypes: ["Clinical Psychologist", "Counselling Psychologist"],
    tier: "psychologist",
    color: "from-green-500 to-green-600",
  },
  {
    id: "default-4",
    title: "Specialist Therapies",
    price: 120,
    description:
      "Specialist support for complex, longstanding, or severe psychological difficulties, drawing on advanced therapeutic approaches and expert clinical insight. Evidence-based techniques to shift thought.",
    therapistTypes: ["Clinical Psychologist", "Clinical Psychologist & Director"],
    tier: "specialist",
    color: "from-orange-500 to-orange-600",
  },
];

// Map therapy category names to colors and tiers
const getCategoryColorAndTier = (name: string): { color: string; tier: string } => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("counselling")) {
    return { color: "from-purple-500 to-purple-600", tier: "counsellor" };
  } else if (lowerName.includes("cbt") || lowerName.includes("psychotherapy")) {
    return { color: "from-blue-500 to-blue-600", tier: "psychotherapist" };
  } else if (lowerName.includes("psychological")) {
    return { color: "from-green-500 to-green-600", tier: "psychologist" };
  } else if (lowerName.includes("specialist")) {
    return { color: "from-orange-500 to-orange-600", tier: "specialist" };
  }
  return { color: "from-gray-500 to-gray-600", tier: "general" };
};

interface TherapyPricingDisplayProps {
  onSelectTherapy?: (tier: string, price: number, categoryId?: string) => void;
  showBookingButtons?: boolean;
  isAuthenticated?: boolean;
}

export function TherapyPricingDisplay({
  onSelectTherapy,
  showBookingButtons = true,
  isAuthenticated = false,
}: TherapyPricingDisplayProps) {
  // Fetch therapist categories only if authenticated
  const { data: therapistData, isLoading: isLoadingCategories } =
    useQuery<TherapistCategoriesResponse>({
      queryKey: ["/api/client/therapist-categories"],
      enabled: isAuthenticated, // Only fetch if user is authenticated
      retry: false, // Don't retry if no therapist assigned
    });

  // Determine which options to display
  let therapyOptions: TherapyOption[] = defaultTherapyOptions;

  if (isAuthenticated && therapistData?.categories) {
    // Use therapist's categories with correct pricing
    therapyOptions = therapistData.categories.map((cat, index) => {
      const { color, tier } = getCategoryColorAndTier(cat.name);
      return {
        id: cat.id,
        title: cat.name,
        price: parseFloat(cat.price),
        description: cat.description,
        therapistTypes: cat.availableTherapistTypes || [],
        tier,
        color,
      };
    });
  }

  // Show loading state while fetching categories
  if (isAuthenticated && isLoadingCategories) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-hive-purple" />
        <span className="ml-3 text-gray-600">Loading therapy options...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Introduction Call Banner */}
      <Card className="bg-gradient-to-r from-hive-purple to-purple-600 text-white border-0">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6" />
            Free Introduction Call
          </CardTitle>
          <CardDescription className="text-white/90 text-base">
            Start your journey with a complimentary 20-minute consultation to discuss your needs and
            find the right therapist for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">£0</p>
              <p className="text-sm text-white/80">No account required</p>
            </div>
            <Link to="/book-admin-call-widget">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-hive-purple hover:bg-white/90"
                data-testid="button-book-intro-call"
              >
                Book Introduction Call
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Therapy Session Options */}
      <div className="grid gap-6 md:grid-cols-2">
        {therapyOptions.map((option) => (
          <Card
            key={option.id}
            className="hover:shadow-lg transition-shadow duration-300 border-2 border-gray-200 hover:border-hive-purple"
            data-testid={`card-therapy-${option.tier}`}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl text-hive-dark mb-2">
                    {option.id}. {option.title}
                  </CardTitle>
                  <div
                    className={`inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gradient-to-r ${option.color} text-white font-bold text-2xl mb-3`}
                  >
                    £{option.price}
                  </div>
                </div>
              </div>
              <CardDescription className="text-base text-gray-700 leading-relaxed">
                {option.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-hive-dark mb-2">Therapists available:</h4>
                <div className="space-y-2">
                  {option.therapistTypes.map((type, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-hive-purple rounded-full" />
                      <span className="text-sm text-gray-700">{type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {showBookingButtons && (
                <div className="pt-4">
                  {isAuthenticated ? (
                    <Button
                      className="w-full bg-hive-purple hover:bg-hive-purple/90"
                      onClick={() => onSelectTherapy?.(option.tier, option.price, option.id)}
                      data-testid={`button-book-${option.tier}`}
                    >
                      Book {option.title}
                    </Button>
                  ) : (
                    <Link to="/portal">
                      <Button
                        className="w-full bg-hive-purple hover:bg-hive-purple/90"
                        data-testid={`button-book-${option.tier}`}
                      >
                        Sign In to Book
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Information Note */}
      <Card className="bg-hive-background border-hive-purple/20">
        <CardContent className="pt-6">
          <p className="text-sm text-gray-600 text-center">
            <strong>Note:</strong> All therapy sessions are 50 minutes in duration. Pricing is based
            on therapist qualifications and experience. All therapists provide exceptional care
            regardless of tier.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
