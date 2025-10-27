import { TherapyPricingDisplay } from "@/components/booking/therapy-pricing-display";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import hiveWellnessLogo from "@assets/Hive Logo_1752073128164.png";

export default function BookSessionPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  const handleSelectTherapy = (tier: string, price: number, categoryId?: string) => {
    // Navigate to booking form with selected therapy type and category
    const queryParams = new URLSearchParams({
      bookSession: tier,
      price: price.toString(),
      ...(categoryId && { categoryId }),
    });
    setLocation(`/client-dashboard?${queryParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="w-full py-4 px-6 bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/">
            <div className="flex items-center space-x-3 cursor-pointer">
              <img src={hiveWellnessLogo} alt="Hive Wellness" className="h-10 w-auto" />
              <span className="text-xl font-display font-bold text-hive-dark">Hive Wellness</span>
            </div>
          </Link>
          <div className="flex items-center space-x-4">
            {!isAuthenticated && (
              <Link to="/portal">
                <Button className="bg-hive-purple hover:bg-hive-purple/90 text-white">
                  Client Portal
                </Button>
              </Link>
            )}
            {isAuthenticated && (
              <Link to="/client-dashboard">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-display font-bold text-hive-dark mb-4">
              Book a Therapy Session
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose the therapy approach that best suits your needs. All sessions are delivered by
              qualified, experienced therapists through our secure platform.
            </p>
          </div>

          {/* Pricing Display */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hive-purple mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          ) : (
            <TherapyPricingDisplay
              onSelectTherapy={handleSelectTherapy}
              showBookingButtons={true}
              isAuthenticated={isAuthenticated}
            />
          )}

          {/* Additional Information */}
          <div className="mt-12 text-center">
            <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold text-hive-dark mb-4">
                Not sure which therapy is right for you?
              </h2>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Book a free introduction call with our team. We'll discuss your needs and help match
                you with the perfect therapist for your journey.
              </p>
              <Link to="/book-admin-call-widget">
                <Button
                  size="lg"
                  className="bg-hive-purple hover:bg-hive-purple/90"
                  data-testid="button-book-intro-call-bottom"
                >
                  Book Free Introduction Call
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-600 text-sm">
            <p>© 2025 Hive Wellness. All rights reserved.</p>
            <p className="mt-2">
              GDPR & UK Data Protection Act compliant • Secure video sessions • Professional care
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
