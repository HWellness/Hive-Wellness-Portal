import * as React from "react";
import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/lib/errorBoundary";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RedirectToLogin } from "@/components/auth/RedirectToLogin";
import { ConsentBanner } from "@/components/consent/consent-banner";
import { useConsentBanner } from "@/hooks/useConsentBanner";

// Optimized lazy loading - load core components immediately, defer less critical ones
import NotFound from "@/pages/not-found";
import SimplePortal from "@/pages/simple-portal";
import LoginPage from "@/pages/login";

// Critical dashboard components - lazy load but prioritize
const ClientDashboard = lazy(() => import("@/pages/client-dashboard-wrapper"));
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard-wrapper"));
const Portal = lazy(() => import("@/pages/portal"));
const InstitutionDashboard = lazy(() => import("@/pages/institution-dashboard"));

// Secondary components - lazy load
const Landing = lazy(() => import("@/pages/landing"));
const Home = lazy(() => import("@/pages/home"));
const AuthPage = lazy(() => import("@/pages/auth-page"));
const Intake = lazy(() => import("@/pages/intake"));
const FormsPage = lazy(() => import("@/pages/forms"));
const TherapistOnboardingPage = lazy(() => import("@/pages/therapist-onboarding"));
const TherapistEnquiryPage = lazy(() => import("@/pages/therapist-enquiry"));
const PublicTherapistQuestionnairePage = lazy(
  () => import("@/pages/public-therapist-questionnaire")
);
// Removed demo pages for production
const ChatbotEmbedPage = lazy(() => import("@/pages/chatbot-embed"));
const BookAdminCall = lazy(() => import("@/pages/BookAdminCall"));
const BookAdminCallWidget = lazy(() => import("@/pages/book-admin-call-widget"));
const BookAdminCallClient = lazy(() => import("@/pages/book-admin-call-client-new"));
const BookAdminCallTherapist = lazy(() => import("@/pages/book-admin-call-therapist"));
// Removed admin calendar demo for production
const AdminCalendarManagement = lazy(() => import("@/pages/admin-calendar-management"));
const VideoSessionPage = lazy(() => import("@/pages/video-session"));
const VideoMeetingPage = lazy(() => import("@/pages/video-meeting"));
const TherapistLogin = lazy(() => import("@/pages/therapist-login"));
const AdminLogin = lazy(() => import("@/pages/admin-login"));
const SignupPage = lazy(() => import("@/pages/signup"));
const ProfileCompletionPage = lazy(() => import("@/pages/profile-completion"));
// Removed demo session pages for production
const TherapistStatusManager = lazy(() => import("@/components/admin/therapist-status-manager"));
const AdminEmailTemplates = lazy(() => import("@/pages/admin-email-templates"));
const AdminVideoSessions = lazy(() => import("@/pages/admin-video-sessions"));
const AdminReports = lazy(() => import("@/pages/admin-reports"));
const TherapistPasswordManagement = lazy(
  () => import("@/pages/admin/therapist-password-management")
);
const ClientTherapistAssignment = lazy(() =>
  import("@/components/admin/client-therapist-assignment").then((module) => ({
    default: module.ClientTherapistAssignment,
  }))
);
const AssignmentNotifications = lazy(() =>
  import("@/components/admin/assignment-notifications").then((module) => ({
    default: module.AssignmentNotifications,
  }))
);
const ClientProfile = lazy(() => import("@/pages/client-profile"));
const Settings = lazy(() => import("@/pages/settings"));
const IntegratedBookingPage = lazy(() => import("@/pages/integrated-booking-page"));
const RefundPolicyPage = lazy(() => import("@/pages/refund-policy-page"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const ChangePasswordPage = lazy(() => import("@/pages/change-password"));
const BookVideoSessionPage = lazy(() => import("@/pages/book-video-session"));
const BookSessionPage = lazy(() => import("@/pages/book-session"));
const VideoSessionsProductionPage = lazy(
  () => import("@/components/services/video-sessions-production")
);
const MFAVerifyPage = lazy(() => import("@/pages/mfa-verify"));

// Loading spinner component
import { LoadingSpinner } from "@/components/ui/loading-spinner";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();
  const { showBanner, isFirstTime, handleClose, markConsentAsGiven } = useConsentBanner();

  // Prefetch critical routes based on user role for faster navigation
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const prefetchTimeout = setTimeout(() => {
      // Prefetch role-specific dashboard data
      if (user.role === "client") {
        queryClient.prefetchQuery({ queryKey: ["/api/client/real-progress/" + user.id] });
        queryClient.prefetchQuery({ queryKey: ["/api/client-therapist/" + user.id] });
      } else if (user.role === "therapist") {
        queryClient.prefetchQuery({ queryKey: ["/api/therapist/clients"] });
      } else if (user.role === "admin") {
        queryClient.prefetchQuery({ queryKey: ["/api/admin/stats"] });
      }
    }, 1000); // Prefetch after 1 second to avoid blocking initial render

    return () => clearTimeout(prefetchTimeout);
  }, [isAuthenticated, user]);

  // Simple loading state - only show for a brief moment
  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Suspense fallback={<LoadingSpinner />}>
        <Switch>
          {!isAuthenticated ? (
            <>
              <Route path="/therapist-portal" component={TherapistLogin} />
              <Route path="/therapist-login" component={TherapistLogin} />
              <Route path="/admin-login" component={AdminLogin} />
              <Route path="/auth" component={AuthPage} />
              <Route path="/landing" component={Landing} />
              <Route path="/intake" component={Intake} />
              <Route path="/forms" component={FormsPage} />
              <Route path="/therapist-enquiry" component={TherapistEnquiryPage} />
              <Route path="/therapist-questionnaire" component={PublicTherapistQuestionnairePage} />
              <Route
                path="/public-therapist-questionnaire"
                component={PublicTherapistQuestionnairePage}
              />
              <Route path="/therapist-onboarding" component={TherapistOnboardingPage} />
              <Route path="/mfa-verify" component={MFAVerifyPage} />
              {/* Demo routes removed for production */}
              <Route path="/chatbot-embed" component={ChatbotEmbedPage} />
              <Route path="/book-admin-call" component={BookAdminCall} />
              <Route path="/book-admin-call-widget" component={BookAdminCallWidget} />
              <Route path="/wordpress-booking-widget" component={BookAdminCallWidget} />
              <Route path="/book-admin-call-client" component={BookAdminCallClient} />
              <Route path="/book-admin-call-client-new" component={BookAdminCallClient} />
              <Route path="/book-admin-call-therapist" component={BookAdminCallTherapist} />
              <Route path="/video-session/:sessionId?" component={VideoSessionPage} />
              <Route path="/video-meeting" component={VideoMeetingPage} />
              {/* Demo session routes removed for production */}
              <Route path="/client-profile/:clientId" component={ClientProfile} />
              <Route path="/signup" component={SignupPage} />
              <Route path="/forgot-password" component={ForgotPasswordPage} />
              <Route path="/reset-password" component={ResetPasswordPage} />
              <Route path="/change-password" component={ChangePasswordPage} />
              <Route path="/login" component={LoginPage} />
              <Route path="/profile-completion" component={ProfileCompletionPage} />
              {/* Admin calendar demo removed for production */}
              <Route path="/book-introduction" component={IntegratedBookingPage} />
              <Route path="/book-video" component={BookVideoSessionPage} />
              <Route path="/book-session" component={BookSessionPage} />
              <Route path="/refund-policy" component={RefundPolicyPage} />
              <Route path="/settings" component={Settings} />
              <Route path="/simple-portal" component={SimplePortal} />
              <Route path="/" component={SimplePortal} />
              {/* Protected routes - redirect to login when not authenticated */}
              <Route path="/dashboard" component={() => <RedirectToLogin />} />
              <Route path="/admin-dashboard" component={() => <RedirectToLogin />} />
              <Route path="/client-dashboard" component={() => <RedirectToLogin />} />
              <Route path="/institution-dashboard" component={() => <RedirectToLogin />} />
              <Route path="/portal" component={() => <RedirectToLogin />} />
            </>
          ) : (
            <>
              {/* Force redirect to role-specific dashboard based on user role */}
              <Route path="/">
                {() => {
                  const userRole = user?.role;
                  if (userRole === "client") {
                    return <ClientDashboard />;
                  } else if (userRole === "therapist") {
                    return <Portal />;
                  } else if (userRole === "admin") {
                    return <AdminDashboard />;
                  } else if (userRole === "institution") {
                    return <InstitutionDashboard />;
                  } else {
                    return <Home />;
                  }
                }}
              </Route>

              {/* Generic dashboard route - redirect to role-specific dashboard */}
              <Route path="/dashboard">
                {() => {
                  const userRole = user?.role;
                  if (userRole === "client") {
                    return <ClientDashboard />;
                  } else if (userRole === "therapist") {
                    return <Portal />;
                  } else if (userRole === "admin") {
                    return <AdminDashboard />;
                  } else if (userRole === "institution") {
                    return <InstitutionDashboard />;
                  } else {
                    return <Home />;
                  }
                }}
              </Route>

              {/* Specific role dashboard routes - protected */}
              <Route path="/client-dashboard">
                {() => (
                  <ProtectedRoute>
                    <ClientDashboard />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/therapist-dashboard">
                {() => (
                  <ProtectedRoute fallbackPath="/therapist-login">
                    <Portal />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/therapist">
                {() => (
                  <ProtectedRoute fallbackPath="/therapist-login">
                    <Portal />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/therapist-login" component={TherapistLogin} />
              <Route path="/portal">
                {() => (
                  <ProtectedRoute>
                    <Portal />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/admin">
                {() => (
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/admin-dashboard">
                {() => (
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/admin/dashboard">
                {() => (
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/admin-therapist-applications" component={TherapistStatusManager} />
              <Route path="/admin-email-templates" component={AdminEmailTemplates} />
              <Route path="/admin/email-templates" component={AdminEmailTemplates} />
              <Route path="/admin/calendar" component={AdminCalendarManagement} />
              <Route path="/admin/calendar-management" component={AdminCalendarManagement} />
              <Route path="/admin-calendar-management" component={AdminCalendarManagement} />
              <Route path="/admin/video-sessions" component={AdminVideoSessions} />
              <Route path="/admin/reports" component={AdminReports} />
              <Route
                path="/admin/therapist-password-management"
                component={TherapistPasswordManagement}
              />
              <Route path="/video-sessions">
                {() => <VideoSessionsProductionPage user={user as any} />}
              </Route>
              <Route path="/admin-services" component={AdminDashboard} />
              <Route
                path="/admin-services/client-therapist-assignment"
                component={ClientTherapistAssignment}
              />
              <Route
                path="/admin-services/client-assignment"
                component={ClientTherapistAssignment}
              />
              <Route
                path="/admin-services/assignment-notifications"
                component={AssignmentNotifications}
              />
              <Route path="/admin-services/therapist-status" component={TherapistStatusManager} />
              <Route path="/institution-dashboard">
                {() => (
                  <ProtectedRoute>
                    <InstitutionDashboard />
                  </ProtectedRoute>
                )}
              </Route>
              <Route path="/home" component={Home} />
              <Route path="/intake" component={Intake} />
              <Route path="/forms" component={FormsPage} />
              <Route path="/therapist-enquiry" component={TherapistEnquiryPage} />
              <Route path="/therapist-questionnaire" component={PublicTherapistQuestionnairePage} />
              <Route
                path="/public-therapist-questionnaire"
                component={PublicTherapistQuestionnairePage}
              />
              <Route path="/therapist-onboarding" component={TherapistOnboardingPage} />
              <Route path="/mfa-verify" component={MFAVerifyPage} />
              {/* Demo routes removed for production */}
              <Route path="/chatbot-embed" component={ChatbotEmbedPage} />
              <Route path="/book-admin-call" component={BookAdminCall} />
              <Route path="/book-admin-call-widget" component={BookAdminCallWidget} />
              <Route path="/wordpress-booking-widget" component={BookAdminCallWidget} />
              <Route path="/book-admin-call-client" component={BookAdminCallClient} />
              <Route path="/book-admin-call-client-new" component={BookAdminCallClient} />
              <Route path="/book-admin-call-therapist" component={BookAdminCallTherapist} />
              <Route path="/video-session/:sessionId?" component={VideoSessionPage} />
              <Route path="/video-meeting" component={VideoMeetingPage} />
              {/* Demo session routes removed for production */}
              <Route path="/therapist-portal" component={TherapistLogin} />
              <Route path="/therapist-login" component={TherapistLogin} />
              <Route path="/client-profile/:clientId" component={ClientProfile} />
              <Route path="/settings" component={Settings} />
              <Route path="/simple-portal" component={SimplePortal} />
              <Route path="/signup" component={SignupPage} />
              <Route path="/forgot-password" component={ForgotPasswordPage} />
              <Route path="/reset-password" component={ResetPasswordPage} />
              <Route path="/change-password" component={ChangePasswordPage} />
              <Route path="/login" component={LoginPage} />
              <Route path="/profile-completion" component={ProfileCompletionPage} />
              {/* Admin calendar demo removed for production */}
              <Route path="/book-video" component={BookVideoSessionPage} />
              <Route path="/book-session" component={BookSessionPage} />
              <Route path="/book-introduction" component={IntegratedBookingPage} />
              <Route path="/refund-policy" component={RefundPolicyPage} />
            </>
          )}
          <Route component={NotFound} />
        </Switch>
      </Suspense>
      <ConsentBanner
        open={showBanner}
        onClose={handleClose}
        onSave={markConsentAsGiven}
        isFirstTime={isFirstTime}
      />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
