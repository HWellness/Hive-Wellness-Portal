/**
 * Payments Copy Blocks - Step 07 (Amendment D)
 * Helper component with Stripe Connect setup information
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, CheckCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function PaymentsCopyHelper() {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: "Copied!",
      description: `${field} copied to clipboard`,
    });
  };

  const copyBlocks = [
    {
      label: "Industry",
      value: "Mental Health Services",
      key: "industry",
    },
    {
      label: "Website",
      value: "https://www.hive-wellness.co.uk",
      key: "website",
    },
    {
      label: "Reference Document",
      value: "Refer to the Therapist Walkthrough document emailed to you",
      key: "document",
    },
  ];

  return (
    <Card data-testid="payments-copy-helper">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-hive-purple">
          <FileText className="h-5 w-5" />
          Stripe Connect Setup Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-sm">
            Use these details when setting up your Stripe Connect account for payment processing
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {copyBlocks.map((block) => (
            <div key={block.key} className="p-3 bg-gray-50 rounded-lg border border-gray-200" data-testid={`copy-block-${block.key}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700 mb-1">{block.label}</div>
                  <div className="text-sm text-gray-900" data-testid={`copy-value-${block.key}`}>{block.value}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(block.value, block.label)}
                  className="flex-shrink-0"
                  data-testid={`button-copy-${block.key}`}
                >
                  {copiedField === block.label ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
