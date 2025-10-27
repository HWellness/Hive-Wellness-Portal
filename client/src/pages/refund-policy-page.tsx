import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import RefundPolicyComponent from "@/components/refund-policy";

export default function RefundPolicyPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set page title
    document.title = "Refund Policy - Hive Wellness";
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Navigation */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Portal
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Refund Policy</h1>
              <p className="text-muted-foreground">
                Transparent terms for therapy session cancellations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-[#9306B1] text-white px-4 py-2 rounded-full font-bold text-sm">
              HIVE WELLNESS
            </div>
          </div>
        </div>

        {/* Refund Policy Component */}
        <RefundPolicyComponent />

        {/* Footer Navigation */}
        <div className="mt-12 text-center">
          <Link href="/">
            <Button className="gap-2 bg-[#9306B1] hover:bg-[#7a0591]">
              <Home className="h-4 w-4" />
              Return to Portal
            </Button>
          </Link>
        </div>

        {/* Additional Information */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Questions about our refund policy? Contact us at{" "}
            <a href="mailto:support@hivewellness.nl" className="text-[#9306B1] hover:underline">
              support@hivewellness.nl
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
