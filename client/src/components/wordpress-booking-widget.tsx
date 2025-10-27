import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Code, ExternalLink, Settings, CheckCircle, AlertCircle, Copy } from "lucide-react";

interface WordPressBookingWidgetProps {
  therapistId?: string;
  isAdmin?: boolean;
}

export function WordPressBookingWidget({
  therapistId,
  isAdmin = false,
}: WordPressBookingWidgetProps) {
  const { toast } = useToast();
  const [embedCode, setEmbedCode] = useState("");
  const [widgetSettings, setWidgetSettings] = useState({
    width: "100%",
    height: "600px",
    theme: "hive-purple",
    showLogo: true,
    autoResize: true,
  });

  // Generate booking widget
  const generateWidgetMutation = useMutation({
    mutationFn: async (settings) => {
      const response = await apiRequest("POST", "/api/wordpress/booking-widget/generate", {
        therapistId,
        settings,
      });
      return response.json();
    },
    onSuccess: (result) => {
      setEmbedCode(result.embedCode);
      toast({
        title: "Booking Widget Generated! 🎉",
        description: "Your WordPress embed code is ready to use.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate booking widget.",
        variant: "destructive",
      });
    },
  });

  // Get existing widget
  const { data: existingWidget } = useQuery({
    queryKey: ["/api/wordpress/booking-widget", therapistId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/wordpress/booking-widget/${therapistId}`);
      return response.json();
    },
    enabled: !!therapistId,
  });

  useEffect(() => {
    if (existingWidget) {
      setEmbedCode(existingWidget.embedCode);
      setWidgetSettings(existingWidget.settings || widgetSettings);
    }
  }, [existingWidget]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard!",
      description: "The embed code has been copied to your clipboard.",
    });
  };

  const testWidget = () => {
    if (embedCode) {
      // Show embedded preview directly on the page instead of popup
      const testContainer = document.getElementById("widget-test-preview");
      if (testContainer) {
        testContainer.innerHTML = `
          <div style="border: 2px solid #9306B1; border-radius: 12px; padding: 20px; background: #f8f9fa;">
            <h3 style="color: #9306B1; margin-bottom: 15px;">📱 Embedded Widget Preview</h3>
            <p style="color: #666; margin-bottom: 15px; font-size: 14px;">This is exactly how your booking widget will appear embedded on your WordPress page:</p>
            ${embedCode}
          </div>
        `;
        testContainer.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5 text-purple-600" />
            WordPress Booking Widget
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Critical Launch Requirement:</strong> This booking widget enables seamless
              integration between your WordPress website and the Hive Wellness platform. Clients can
              book directly from your site while all appointments sync with your therapist
              dashboard.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Widget Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-600" />
            Widget Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="width">Widget Width</Label>
              <Select
                value={widgetSettings.width}
                onValueChange={(value) => setWidgetSettings({ ...widgetSettings, width: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100%">Full Width (100%)</SelectItem>
                  <SelectItem value="800px">Fixed Width (800px)</SelectItem>
                  <SelectItem value="600px">Compact (600px)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="height">Widget Height</Label>
              <Select
                value={widgetSettings.height}
                onValueChange={(value) => setWidgetSettings({ ...widgetSettings, height: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="600px">Standard (600px)</SelectItem>
                  <SelectItem value="800px">Tall (800px)</SelectItem>
                  <SelectItem value="auto">Auto Height</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="theme">Color Theme</Label>
              <Select
                value={widgetSettings.theme}
                onValueChange={(value) => setWidgetSettings({ ...widgetSettings, theme: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hive-purple">Hive Purple (Recommended)</SelectItem>
                  <SelectItem value="light">Light Theme</SelectItem>
                  <SelectItem value="dark">Dark Theme</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showLogo"
                checked={widgetSettings.showLogo}
                onChange={(e) =>
                  setWidgetSettings({ ...widgetSettings, showLogo: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="showLogo">Show Hive Wellness Logo</Label>
            </div>
          </div>

          <Button
            onClick={() =>
              generateWidgetMutation.mutate({
                therapistId: therapistId || "default",
                settings: widgetSettings,
              })
            }
            disabled={generateWidgetMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {generateWidgetMutation.isPending ? "Generating..." : "Generate Widget Code"}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Embed Code */}
      {embedCode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              WordPress Embed Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Widget Generated Successfully!</strong> Copy and paste this code into any
                WordPress page or post where you want the booking widget to appear.
              </AlertDescription>
            </Alert>

            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-sm font-semibold">Embed Code:</Label>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(embedCode)}>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={testWidget}>
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                </div>
              </div>
              <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
                <code>{embedCode}</code>
              </pre>
            </div>

            {/* Installation Instructions */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">
                WordPress Installation Instructions:
              </h4>
              <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
                <li>Copy the embed code above</li>
                <li>Log into your WordPress admin dashboard</li>
                <li>Navigate to the page or post where you want the booking widget</li>
                <li>Switch to "Text" or "HTML" editor mode</li>
                <li>Paste the embed code where you want the widget to appear</li>
                <li>Save/Update your page</li>
                <li>Preview your page to confirm the widget is working</li>
              </ol>
            </div>

            {/* Features List */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2">Widget Features:</h4>
              <ul className="text-sm text-purple-800 space-y-1 ml-4 list-disc">
                <li>Real-time availability sync with your Hive Wellness calendar</li>
                <li>Secure client information collection and GDPR compliance</li>
                <li>Automatic appointment confirmations via email and SMS</li>
                <li>85% revenue split automatically processed via Stripe</li>
                <li>Mobile-responsive design for all devices</li>
                <li>Seamless integration with your existing WordPress theme</li>
                <li>Built-in cancellation and rescheduling functionality</li>
                <li>Client intake forms and preferences collection</li>
              </ul>
            </div>

            {/* Support Information */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Need Help?</strong> If you experience any issues with the widget
                installation, our technical support team is available at{" "}
                <a href="mailto:support@hive-wellness.co.uk" className="text-purple-600 underline">
                  support@hive-wellness.co.uk
                </a>{" "}
                or call 020 7946 0958.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Embedded Widget Test Preview */}
      <div id="widget-test-preview" className="mt-6">
        {/* Dynamic preview will be inserted here */}
      </div>
    </div>
  );
}

export default WordPressBookingWidget;
