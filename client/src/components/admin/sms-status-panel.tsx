/**
 * SMS Implementation Status Panel - Step 49
 * Shows SMS provider configuration status for admin
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface TwilioConfig {
  initialized: boolean;
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  whatsappNumber: string;
}

export default function SMSStatusPanel() {
  const {
    data: twilioStatus,
    isLoading,
    error,
  } = useQuery<{ config: TwilioConfig }>({
    queryKey: ["/api/admin/twilio/status"],
  });

  const twilioConfigured = twilioStatus?.config?.initialized || false;
  const isUnauthorized = (error as any)?.response?.status === 403;

  // SMS/WhatsApp channels disabled for therapists by default (Step 46)
  const therapistSMSEnabled = false;
  const therapistWhatsAppEnabled = false;

  // Admin/Client channels
  const clientSMSEnabled = true;
  const clientWhatsAppEnabled = true;

  const StatusIcon = ({ enabled }: { enabled: boolean }) =>
    enabled ? (
      <CheckCircle2 className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-gray-400" />
    );

  return (
    <Card data-testid="sms-status-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-hive-purple" />
          Communications Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center p-8" data-testid="loading-spinner">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hive-purple"></div>
          </div>
        )}

        {/* Authorization Error */}
        {isUnauthorized && (
          <div
            className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
            data-testid="unauthorized-message"
          >
            <p className="text-sm text-yellow-800">
              Admin access required to view communications status.
            </p>
          </div>
        )}

        {/* Content */}
        {!isLoading && !isUnauthorized && (
          <>
            {/* SMS Provider Configuration */}
            <div className="space-y-2" data-testid="sms-provider-section">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                SMS Provider Configuration
              </h4>
              <div
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                data-testid="twilio-status"
              >
                <span className="text-sm">Twilio Integration</span>
                {twilioConfigured ? (
                  <Badge
                    className="bg-green-100 text-green-800 border-green-200"
                    data-testid="twilio-configured"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Configured
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-gray-300"
                    data-testid="twilio-not-configured"
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Configured
                  </Badge>
                )}
              </div>
            </div>

            {/* Channel Status by Role */}
            <div className="space-y-2" data-testid="channel-availability-section">
              <h4 className="font-semibold text-sm">Channel Availability</h4>

              {/* Therapist Channels */}
              <div
                className="space-y-2 p-3 bg-purple-50 border border-purple-100 rounded-lg"
                data-testid="therapist-channels"
              >
                <div className="font-medium text-sm text-hive-purple">Therapist Portal</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2" data-testid="therapist-sms-status">
                    <StatusIcon enabled={therapistSMSEnabled} />
                    <span className={therapistSMSEnabled ? "" : "text-gray-500"}>SMS</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      Off
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2" data-testid="therapist-whatsapp-status">
                    <StatusIcon enabled={therapistWhatsAppEnabled} />
                    <span className={therapistWhatsAppEnabled ? "" : "text-gray-500"}>
                      WhatsApp
                    </span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      Off
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Note: SMS/WhatsApp disabled for therapists per Step 46. Portal messages use email
                  notifications instead.
                </p>
              </div>

              {/* Client Channels */}
              <div
                className="space-y-2 p-3 bg-blue-50 border border-blue-100 rounded-lg"
                data-testid="client-channels"
              >
                <div className="font-medium text-sm text-blue-700">Client Portal</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2" data-testid="client-sms-status">
                    <StatusIcon enabled={clientSMSEnabled} />
                    <span>SMS</span>
                    <Badge className="ml-auto bg-green-100 text-green-800 border-green-200 text-xs">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2" data-testid="client-whatsapp-status">
                    <StatusIcon enabled={clientWhatsAppEnabled} />
                    <span>WhatsApp</span>
                    <Badge className="ml-auto bg-green-100 text-green-800 border-green-200 text-xs">
                      Active
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Implementation Note */}
            <div className="text-xs text-gray-500 pt-2 border-t" data-testid="implementation-note">
              <strong>Implementation Status:</strong> Twilio-powered messaging system operational.
              Therapist SMS/WhatsApp channels disabled; portal messages trigger email notifications
              instead.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
