import { useState, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { User } from "@shared/schema";

// Lazy load service components to improve performance
const VideoSessionsService = lazy(() => import("./video-sessions-production"));
const MessagingService = lazy(() => import("./messaging-fixed"));
const SchedulingService = lazy(() => import("./appointment-booking-complete"));
const PaymentsService = lazy(() => import("./payments-simple"));
const AdminPaymentsOverview = lazy(() => import("./admin-payments-overview"));
const DocumentSessionTracking = lazy(() => import("./document-session-tracking"));
const ReportingEngine = lazy(() => import("./reporting-engine"));
const AutomatedEmailEngine = lazy(() => import("./automated-email-engine"));

const Forms = lazy(() => import("./forms"));
const TherapistEarningsManagement = lazy(() => import("./therapist-earnings-management"));
const TherapistSessionBooking = lazy(() => import("./therapist-session-booking"));
const TherapistClientManagement = lazy(() => import("./therapist-client-management-enhanced"));
const TherapistDashboard = lazy(() => import("./therapist-dashboard"));
const AdminMatchingSystem = lazy(() => import("./admin-matching-system"));
const ClientManagementComprehensive = lazy(() => import("./client-management-comprehensive"));
const AdminConsole = lazy(() => import("./admin-console"));
const InstitutionalDashboard = lazy(() => import("./institutional-dashboard-production"));
const AppointmentManagement = lazy(() => import("./appointment-management"));
const TherapistAiAssistant = lazy(() => import("./therapist-ai-assistant"));
const ClientProfileCompletion = lazy(() => import("./client-profile-completion"));
const TherapistProfileCompletion = lazy(() => import("./therapist-profile-completion"));
const AdminProfileCompletion = lazy(() => import("./admin-profile-completion"));
const AdminEmailManagement = lazy(() => import("./admin-email-management"));
const CommunicationsAndReminders = lazy(() => import("./communications-and-reminders"));
const UserManagement = lazy(() => import("./user-management"));
const SecurityDashboard = lazy(() => import("./security-dashboard"));
const MessagingAnalytics = lazy(() => import("./messaging-analytics"));
const AdminAnalytics = lazy(() => import("./admin-analytics"));
const SystemHealthDashboard = lazy(() => import("./system-health-dashboard"));
const AITherapyMatching = lazy(() => import("./ai-therapy-matching"));
const WordPressIntegration = lazy(() => import("../admin/wordpress-integration"));
const ClientDashboard = lazy(() => import("./client-dashboard"));
const ClientProgress = lazy(() => import("./client-progress"));
const ClientSessionApprovals = lazy(() => import("./client-session-approvals"));
const ClientTherapistAssignment = lazy(() =>
  import("../admin/client-therapist-assignment").then((module) => ({
    default: module.ClientTherapistAssignment,
  }))
);
const AssignmentNotifications = lazy(() =>
  import("../admin/assignment-notifications").then((module) => ({
    default: module.AssignmentNotifications,
  }))
);
const TherapistStatusManager = lazy(() => import("../admin/therapist-status-manager"));

const MessagingAutomation = lazy(() => import("./messaging-automation"));
const TherapistAvailabilityEnhanced = lazy(() => import("./therapist-availability-enhanced"));
const PaymentSetup = lazy(() => import("./payment-setup"));
const AdminCalendarManagement = lazy(() => import("../../pages/admin-calendar-management"));
const TherapistOnboardingForm = lazy(() => import("../therapist-onboarding-form"));
const MainWebsiteTherapistForm = lazy(() => import("../forms/main-website-therapist-form-new"));
const ClientDocuments = lazy(() => import("./client-documents"));
const TherapistDocuments = lazy(() => import("./therapist-documents"));
const TherapistNotesUpload = lazy(() =>
  import("./therapist-notes-upload").then((module) => ({ default: module.TherapistNotesUpload }))
);
const EmailTemplateManagement = lazy(() => import("../admin/email-template-management-simple"));
const FormSubmissionsDashboard = lazy(() => import("../admin/form-submissions-dashboard"));
const TherapistApplicationsDashboard = lazy(
  () => import("../admin/therapist-applications-dashboard")
);
const ClientQuestionnairesDashboard = lazy(
  () => import("../admin/client-questionnaires-dashboard")
);
const AdminAccountCreation = lazy(() => import("./admin-account-creation"));
const AdminTherapistAvailability = lazy(() => import("./admin-therapist-availability"));
const AdminAvailabilitySettings = lazy(() => import("./admin-availability-settings"));
const AdminRoleManagement = lazy(() => import("./admin-role-management"));
const AdminDataReset = lazy(() => import("./admin-data-reset"));
const AdminSessionNotesViewer = lazy(() => import("../admin/admin-session-notes-viewer"));

// Loading component for services
const ServiceLoading = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-hive-purple rounded-full mx-auto mb-4"></div>
      <div className="text-hive-purple font-century text-lg font-bold">Loading Service</div>
      <div className="text-gray-600 text-sm mt-2">Please wait...</div>
    </div>
  </div>
);

interface ServiceRouterProps {
  user: User;
  selectedService: string | null;
  onBack: () => void;
  onNavigateToService?: (serviceId: string) => void;
}

export default function ServiceRouter({
  user,
  selectedService,
  onBack,
  onNavigateToService,
}: ServiceRouterProps) {
  const renderService = () => {
    switch (selectedService) {
      case "client-dashboard":
        return <ClientDashboard user={user} />;
      case "client-progress":
        return <ClientProgress user={user} />;
      case "client-documents":
        return <ClientDocuments />;
      case "ai-therapy-matching":
        return <AITherapyMatching />;
      case "video-sessions":
        return <VideoSessionsService user={user} onBackToDashboard={onBack} />;
      case "messaging":
        return <MessagingService user={user} />;
      case "messaging-automation":
        return <MessagingAutomation onBackToDashboard={onBack} user={user} />;
      case "therapist-availability":
        return <TherapistAvailabilityEnhanced user={user} />;
      case "scheduling":
        return <SchedulingService user={user} />;
      // Removed multi-participant scheduling case - enforcing 1:1 therapist-client sessions
      case "payments":
        if (user.role === "admin") {
          return <AdminPaymentsOverview user={user} />;
        }
        return <PaymentsService user={user} />;
      case "documents":
        if (user.role === "therapist") {
          return <TherapistDocuments user={user} />;
        }
        return <DocumentSessionTracking />;
      case "reports":
        return <ReportingEngine user={user} />;
      case "forms":
        if (user.role === "therapist") {
          return <TherapistOnboardingForm user={user} onBackToDashboard={onBack} />;
        }
        return <Forms user={user} />;
      case "onboarding":
        if (user.role === "therapist") {
          return <TherapistOnboardingForm user={user} onBackToDashboard={onBack} />;
        }
        return <TherapistStatusManager />;
      case "therapist-earnings":
        return <TherapistEarningsManagement user={user} />;
      case "therapist-sessions":
        return <TherapistSessionBooking user={user} />;
      case "client-matching":
        return <TherapistClientManagement user={user} onNavigateToService={onNavigateToService} />;
      case "client-management":
        return (
          <ClientManagementComprehensive user={user} onNavigateToService={onNavigateToService} />
        );
      case "therapist-profile-completion":
      case "therapist-profile":
        return <TherapistProfileCompletion user={user} />;
      case "therapist-dashboard":
        return <TherapistDashboard user={user} />;
      case "therapist-ai":
        return <TherapistAiAssistant user={user} />;
      case "admin-matching":
        return <AdminMatchingSystem user={user} />;
      case "admin-console":
        return <AdminConsole user={user} />;
      case "admin-role-management":
        return <AdminRoleManagement />;
      case "admin-data-reset":
        return <AdminDataReset />;
      case "admin-calendar":
        return <AdminCalendarManagement />;
      case "security":
        return <SecurityDashboard user={user} />;
      case "messaging-analytics":
        return <MessagingAnalytics user={user} />;
      case "email-template-management":
        return <EmailTemplateManagement />;
      case "automated-email-engine":
        return <AutomatedEmailEngine />;
      case "communications-reminders":
        return <CommunicationsAndReminders user={user} />;
      case "wordpress-integration":
        return <WordPressIntegration user={user} onBackToDashboard={onBack} />;

      case "account-creation":
        return <AdminAccountCreation user={user} onBack={onBack} />;
      case "admin-therapist-availability":
        return <AdminTherapistAvailability user={user} />;
      case "admin-availability-settings":
        return <AdminAvailabilitySettings user={user} />;
      case "user-management":
        return <UserManagement user={user} />;
      case "appointment-management":
        return <AppointmentManagement />;
      case "institutional-dashboard":
        return <InstitutionalDashboard user={user} />;
      case "institutional-users":
        return <UserManagement user={user} />;
      case "payment-setup":
        return <PaymentSetup user={user} onNavigateToService={onNavigateToService} />;

      case "client-profile":
        if (user.role === "therapist") {
          return <TherapistProfileCompletion user={user} />;
        } else if (user.role === "admin") {
          return <AdminProfileCompletion user={user} />;
        }
        return <ClientProfileCompletion user={user} />;
      case "client-therapist-assignment":
        return <ClientTherapistAssignment />;
      case "real-data-import":
        const RealDataImportManager = lazy(() =>
          import("../admin/real-data-import-manager").then((module) => ({
            default: module.RealDataImportManager,
          }))
        );
        return <RealDataImportManager />;
      case "therapist-status-manager":
        return <TherapistStatusManager />;
      case "assignment-notifications":
        return <AssignmentNotifications />;
      case "consultation":
      case "my-progress":
        return <ClientProgress user={user} />;
      case "client-session-approvals":
        return <ClientSessionApprovals user={user} />;
      case "organisation-document-tracking":
        return <DocumentSessionTracking />;
      case "system-health":
        return <SystemHealthDashboard user={user} />;
      case "form-submissions-dashboard":
        return <FormSubmissionsDashboard />;
      case "therapist-applications-dashboard":
        return <TherapistStatusManager />;
      case "client-questionnaires-dashboard":
        return <ClientQuestionnairesDashboard />;
      case "admin-session-notes-viewer":
        return <AdminSessionNotesViewer />;
      case "gravity-forms-dashboard":
      case "wordpress-forms-dashboard":
      case "system-health-checker":
      case "mobile-responsive-checker":
      case "mobile-testing":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-4">Service Removed</h2>
            <p className="text-gray-600">This service has been removed from the admin dashboard.</p>
          </div>
        );
      case "analytics-reports":
        return <AdminAnalytics user={user} />;
      case "institutional-analytics":
        return <ReportingEngine user={user} />;
      case "institutional-billing":
        return <TherapistEarningsManagement user={user} />;
      case "therapist-documents":
        return <TherapistDocuments user={user} />;
      case "therapist-notes-upload":
        return <TherapistNotesUpload />;
      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-4">
              Service Not Found
            </h2>
            <p className="text-gray-600">The requested service could not be loaded.</p>
          </div>
        );
    }
  };

  if (!selectedService) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Back Navigation - Improved Visual Hierarchy - Hide for profile completion */}
      {selectedService !== "client-profile" && (
        <div className="border-b border-gray-200 bg-hive-purple shadow-sm">
          <div className="container mx-auto px-6 py-3">
            <Button
              variant="ghost"
              onClick={() => {
                try {
                  onBack();
                } catch (error) {
                  console.error("Navigation error:", error);
                  // Fallback navigation
                  window.history.back();
                }
              }}
              className="flex items-center gap-2 text-white hover:bg-white/20 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      )}

      {/* Service Content */}
      <div className="container mx-auto px-6 py-8">
        <Suspense fallback={<ServiceLoading />}>{renderService()}</Suspense>
      </div>
    </div>
  );
}
