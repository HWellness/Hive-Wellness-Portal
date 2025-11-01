import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Clock, PoundSterling, Info } from "lucide-react";
interface RefundPolicy {
  policy: string;
  summary: {
    hours48Plus: string;
    hours24To48: string;
    hoursUnder24: string;
    stripeFeesNote: string;
  };
}

export function RefundPolicyComponent() {
  const [policyData, setPolicyData] = useState<RefundPolicy | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const response = await fetchApi("/api/refunds/policy");
        if (response.ok) {
          const data = await response.json();
          setPolicyData(data);
        }
      } catch (error) {
        console.error("Failed to fetch refund policy:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPolicy();
  }, []);

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PoundSterling className="h-5 w-5" />
            Refund Policy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!policyData) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to load refund policy. Please contact support for assistance.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Policy Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              48+ Hours Notice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 mb-2">Full Refund</div>
            <p className="text-sm text-muted-foreground">{policyData.summary.hours48Plus}</p>
            <Badge variant="secondary" className="mt-2 bg-green-50 text-green-700 border-green-200">
              Recommended
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-700 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              24-48 Hours Notice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 mb-2">50% Refund</div>
            <p className="text-sm text-muted-foreground">{policyData.summary.hours24To48}</p>
            <Badge
              variant="secondary"
              className="mt-2 bg-yellow-50 text-yellow-700 border-yellow-200"
            >
              Partial
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Less than 24 Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 mb-2">No Refund</div>
            <p className="text-sm text-muted-foreground">{policyData.summary.hoursUnder24}</p>
            <Badge variant="destructive" className="mt-2">
              No refund
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Important Notice */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Important:</strong> {policyData.summary.stripeFeesNote}
        </AlertDescription>
      </Alert>

      {/* Full Policy Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PoundSterling className="h-5 w-5 text-[#9306B1]" />
            Complete Refund Policy
          </CardTitle>
          <CardDescription>
            Please read our complete refund terms and conditions carefully
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="prose prose-sm max-w-none text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: policyData.policy }}
          />
        </CardContent>
      </Card>

      {/* Agreement Section */}
      <Card className="border-[#9306B1]/20">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              By booking a session, you acknowledge that you have read and agree to our refund
              policy.
            </p>
            <p className="text-xs text-muted-foreground italic">
              This policy applies to all therapy sessions booked through the Hive Wellness platform.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RefundPolicyComponent;
