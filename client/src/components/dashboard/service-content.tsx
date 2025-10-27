import ClientDashboard from "@/components/services/client-dashboard";
import TherapistDashboard from "@/components/services/therapist-dashboard";
import AdminConsole from "@/components/services/admin-console";
import Scheduling from "@/components/services/scheduling";
import VideoSessions from "@/components/services/video-sessions";
import Payments from "@/components/services/payments";
import InstitutionalDashboard from "@/components/services/institutional-dashboard-production";
import UserManagement from "@/components/services/user-management";
import AnalyticsReports from "@/components/services/analytics-reports";
import BillingBudget from "@/components/services/billing-budget";
import { Card, CardContent } from "@/components/ui/card";
import type { User } from "@shared/schema";

interface ServiceContentProps {
  serviceId: string | null;
  user: User;
}

export default function ServiceContent({ serviceId, user }: ServiceContentProps) {
  if (!serviceId) {
    return (
      <Card className="bg-hive-white">
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-10 h-10 border-4 border-gray-300 border-t-hive-purple rounded-full mx-auto mb-4"></div>
          <h3 className="font-century font-bold text-hive-black text-xl mb-2">Select Service</h3>
          <p className="text-gray-600">Choose a service from the sidebar to get started.</p>
        </CardContent>
      </Card>
    );
  }

  // Render specific service components
  switch (serviceId) {
    case "client-dashboard":
      return <ClientDashboard user={user} />;
    case "therapist-dashboard":
      return <TherapistDashboard user={user} />;
    case "admin-console":
      return <AdminConsole user={user} />;
    case "institutional-dashboard":
      return <InstitutionalDashboard user={user} />;
    case "user-management":
      return <UserManagement user={user} />;
    case "analytics-reports":
      return <AnalyticsReports user={user} />;
    case "billing-budget":
      return <BillingBudget user={user} />;
    case "scheduling":
      return <Scheduling user={user} />;
    case "video-sessions":
      return <VideoSessions user={user} />;
    case "payments":
      return <Payments user={user} />;
    default:
      return (
        <Card className="bg-hive-white">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-10 h-10 border-4 border-gray-300 border-t-hive-purple rounded-full mx-auto mb-4"></div>
            <h3 className="font-century font-bold text-hive-black text-xl mb-2">
              Service Coming Soon
            </h3>
            <p className="text-gray-600 mb-6">We're working on bringing you this feature.</p>
            <div className="bg-hive-light-blue p-4 rounded-lg">
              <div className="text-sm text-hive-black">
                <strong>Implementation Note:</strong> This service ({serviceId}) is part of the
                unified platform architecture and will be fully integrated with shared
                authentication and data management.
              </div>
            </div>
          </CardContent>
        </Card>
      );
  }
}
