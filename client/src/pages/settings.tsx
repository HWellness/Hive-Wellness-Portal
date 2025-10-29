import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Settings as SettingsIcon,
  ArrowLeft,
  User,
  Shield,
  Bell,
  CreditCard,
  LogOut,
  Mail,
  Download,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { MFASettings } from "@/components/mfa/MFASettings";
import PasswordChangeForm from "@/components/therapist/password-change-form";
import { ConsentManagement } from "@/components/consent/consent-management";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBackToPortal = () => {
    // Navigate to portal and ensure we show the main dashboard (not a service)
    setLocation("/portal");
    // Clear any hash or query params that might select a service
    window.history.replaceState(null, "", "/portal");
  };

  const handleLogout = async () => {
    try {
      const response = await apiRequest("POST", "/api/auth/logout");
      const data = await response.json();

      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });

      // Use the redirect path from backend based on user role
      if (data.success && data.redirect) {
        window.location.href = data.redirect;
      } else {
        // Fallback
        window.location.href = "/portal";
      }
    } catch (error) {
      window.location.href = "/portal";
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await apiRequest("POST", "/api/user/export-data");
      const data = await response.json();

      toast({
        title: "Export Requested",
        description:
          "Your data export has been prepared. You will receive an email with a download link shortly.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error processing your data export. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRequestDeletion = async () => {
    setIsDeleting(true);
    try {
      const response = await apiRequest("POST", "/api/user/request-deletion");
      const data = await response.json();

      toast({
        title: "Deletion Requested",
        description:
          "Your account deletion has been scheduled. You will receive a confirmation email with details.",
      });

      setShowDeleteDialog(false);
    } catch (error) {
      toast({
        title: "Request Failed",
        description: "There was an error processing your deletion request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-hive-light-blue to-hive-white">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-hive-black/70">Please log in to access settings.</p>
            <Link href="/portal">
              <Button className="w-full mt-4 bg-hive-purple hover:bg-hive-purple/90">Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-hive-purple/5 to-hive-blue/5">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToPortal}
              data-testid="button-back-to-portal"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Portal
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-hive-purple" />
            <div>
              <h1 className="text-3xl font-century font-bold text-hive-purple">Account Settings</h1>
              <p className="text-hive-black/70 font-secondary">
                Manage your account preferences and security
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card data-testid="card-profile-info">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="font-medium" data-testid="text-user-name">
                    {user.firstName} {user.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="font-medium" data-testid="text-user-email">
                    {user.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Role</label>
                  <Badge variant="outline" className="mt-1" data-testid="badge-user-role">
                    {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                  <p className="font-medium">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <MFASettings />

          {/* Password Change */}
          <PasswordChangeForm />

          {/* Notification Preferences */}
          <Card data-testid="card-notifications">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive appointment reminders and updates via email
                    </p>
                  </div>
                  <Badge variant="outline">Enabled</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Get text message reminders for upcoming sessions
                    </p>
                  </div>
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consent Management */}
          <ConsentManagement />

          {/* Billing Information (for clients) */}
          {user.role === "client" && (
            <Card data-testid="card-billing">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Billing & Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Payment Methods</p>
                      <p className="text-sm text-muted-foreground">
                        Manage your saved payment methods
                      </p>
                    </div>
                    <Button variant="outline" size="sm" data-testid="button-manage-payments">
                      Manage
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Billing History</p>
                      <p className="text-sm text-muted-foreground">
                        View your payment history and receipts
                      </p>
                    </div>
                    <Button variant="outline" size="sm" data-testid="button-view-billing">
                      View History
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Support & Help */}
          <Card data-testid="card-support">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Support & Help
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Contact Support</p>
                    <p className="text-sm text-muted-foreground">Get help from our support team</p>
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-contact-support">
                    Contact
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Privacy Policy</p>
                    <p className="text-sm text-muted-foreground">
                      Review our privacy policy and terms
                    </p>
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-privacy-policy">
                    View Policy
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Data Management */}
          <Card data-testid="card-privacy-data">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Download Your Data</p>
                  <p className="text-sm text-muted-foreground">
                    Export all your personal data in a portable format
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportData}
                  disabled={isExporting}
                  data-testid="button-export-data"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? "Processing..." : "Export Data"}
                </Button>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <p className="font-medium text-destructive">Delete Account</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  data-testid="button-request-deletion"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card data-testid="card-account-actions">
            <CardHeader>
              <CardTitle className="text-destructive">Account Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sign Out</p>
                  <p className="text-sm text-muted-foreground">
                    Sign out of your account on this device
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="dialog-delete-account">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Are you sure you want to delete your account? This action will:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Schedule your account for deletion in 30 days</li>
                <li>Send you a confirmation email with a cancellation link</li>
                <li>Permanently delete all your data after the 30-day grace period</li>
                <li>This includes your profile, sessions, messages, and all associated data</li>
              </ul>
              <p className="font-medium text-destructive">
                You can cancel this request within 30 days using the link in the email.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRequestDeletion}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {isDeleting ? "Processing..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
